import { z } from 'zod'
import { maskChatMessages } from './sensitive-data-masker'
import type { ChatMessage } from './ai-provider'
import { ProviderRegistry, ProviderRouter, ProviderFailure, PROFILES, type Candidate, type AIProvider, type GenerateOptions, type LogicalProfile, type ProviderResult } from './provider-router'

export interface TransportConfig { provider: string; apiUrl: string; apiKey?: string; model: string; timeout: number; maxTokens: number }
type ResolveConfig = (options: { provider?: string; model?: string }) => TransportConfig
type BodyBuilder = (messages: ChatMessage[], config: any, stream: boolean, options: GenerateOptions) => Record<string, unknown>

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, redirect: 'error' })
  if (!response.ok) {
    const status = response.status
    const raw = response.headers.get('retry-after') || ''
    const retryAfter = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) * 1000 : Math.max(0, Date.parse(raw) - Date.now()) || 0
    // Only inspect bounded machine-readable classification on 400; never retain/log text.
    let modelConfigError = false
    if (status === 400 && response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      try {
        while (text.length <= 4096) {
          const chunk = await reader.read()
          if (chunk.done) break
          text += decoder.decode(chunk.value.subarray(0, 4097), { stream: true })
        }
        if (text.length <= 4096) {
          const error = JSON.parse(text)?.error
          modelConfigError = error?.param === 'model' || ['model_not_found', 'invalid_model', 'unsupported_model'].includes(error?.code)
        }
      } catch { /* Unknown invalid requests must not be retried elsewhere. */ }
      finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
    }
    await response.body?.cancel()
    throw new ProviderFailure(status === 429 ? 'RATE_LIMITED' : status === 408 ? 'TIMEOUT' : status >= 500 ? 'SERVER_ERROR' : modelConfigError || [401, 403, 404, 405].includes(status) ? 'CONFIG' : 'INVALID_REQUEST', status, retryAfter)
  }
  try { return await response.json() as any } catch { throw new ProviderFailure('EMPTY_RESPONSE') }
}
function validateEndpoint(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw new ProviderFailure('CONFIG') }
  // Docker Desktop exposes services running on the same workstation through
  // this stable hostname. Treat it like loopback so the server container can
  // reach a host-side OmniRoute daemon without enabling arbitrary HTTP URLs.
  const local = ['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash || (!local && url.protocol !== 'https:') || (local && !['http:', 'https:'].includes(url.protocol))) throw new ProviderFailure('CONFIG')
  return url.toString()
}
function configFor(resolve: ResolveConfig, c: Candidate) {
  try { return resolve({ provider: c.providerId, model: c.model }) } catch { throw new ProviderFailure('CONFIG') }
}
function token(n: unknown) { return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0 }
function geminiGenerationConfig(model: string, options: GenerateOptions) {
  const requested = options.maxOutputTokens ?? 2048
  if (!/^gemini-3(?:[.\-]|$)/i.test(model.replace(/^models\//, ''))) {
    return { temperature: options.temperature ?? 0.5, maxOutputTokens: requested }
  }
  const level = process.env.GEMINI_THINKING_LEVEL || 'low'
  if (!['minimal', 'low', 'medium', 'high'].includes(level)) throw new ProviderFailure('CONFIG')
  const configuredFloor = Number(process.env.GEMINI_MIN_OUTPUT_TOKENS || 2048)
  if (!Number.isInteger(configuredFloor) || configuredFloor < 256 || configuredFloor > 8192) throw new ProviderFailure('CONFIG')
  // Gemini 3 thinking tokens share maxOutputTokens with visible answer tokens.
  // Keep enough headroom so a concise Mentor profile cannot end after its preamble.
  return { maxOutputTokens: Math.max(requested, configuredFloor), thinkingConfig: { thinkingLevel: level } }
}

/** Existing provider URL/policy and request-body behavior are reused, not duplicated. */
export class OpenAICompatibleProvider implements AIProvider {
  supportsStreaming = false
  constructor(public id: string, private resolve: ResolveConfig, private body: BodyBuilder) {}
  async generate(messages: ChatMessage[], c: Candidate, signal: AbortSignal, options: GenerateOptions): Promise<ProviderResult> {
    const config = configFor(this.resolve, c)
    const data = await jsonRequest(validateEndpoint(config.apiUrl), {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
      body: JSON.stringify(this.body(messages, config, false, options)),
    })
    const choice = data?.choices?.[0]
    if (choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new ProviderFailure('SAFETY')
    const content = choice?.message?.content ?? data?.message?.content
    if (typeof content !== 'string' || !content.trim()) throw new ProviderFailure('EMPTY_RESPONSE')
    const usage = data?.usage || {}
    return { content, provider: this.id, model: c.model, usage: { prompt_tokens: token(usage.prompt_tokens ?? data.prompt_eval_count), completion_tokens: token(usage.completion_tokens ?? data.eval_count), total_tokens: token(usage.total_tokens ?? (token(data.prompt_eval_count) + token(data.eval_count))) } }
  }
}
export class GeminiProvider implements AIProvider {
  id = 'gemini'; supportsStreaming = false
  async generate(messages: ChatMessage[], c: Candidate, signal: AbortSignal, options: GenerateOptions): Promise<ProviderResult> {
    if (process.env.AI_ALLOW_EXTERNAL_PROVIDERS !== 'true' || !process.env.GEMINI_API_KEY || !c.model) throw new ProviderFailure('CONFIG')
    const systemParts = messages.filter(m => m.role === 'system').map(m => ({ text: m.content }))
    let data: any
    try {
      data = await jsonRequest(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model.replace(/^models\//, ''))}:generateContent`, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          ...(systemParts.length ? { systemInstruction: { parts: systemParts } } : {}),
          contents: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: geminiGenerationConfig(c.model, options),
        }),
      })
    } catch (error) {
      // The adapter owns the Gemini request shape. A 400 therefore indicates
      // incompatible model/config rather than a user prompt to replay nowhere.
      if (error instanceof ProviderFailure && error.status === 400) throw new ProviderFailure('CONFIG', 400)
      throw error
    }
    const candidate = data?.candidates?.[0]
    if (data?.promptFeedback?.blockReason || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(candidate?.finishReason)) throw new ProviderFailure('SAFETY')
    if (candidate?.finishReason === 'MAX_TOKENS') throw new ProviderFailure('TRUNCATED_RESPONSE')
    const content = candidate?.content?.parts?.filter((p: any) => !p.thought && typeof p.text === 'string').map((p: any) => p.text).join('')
    if (!content?.trim()) throw new ProviderFailure('EMPTY_RESPONSE')
    const u = data?.usageMetadata || {}
    return { content, provider: this.id, model: c.model, usage: { prompt_tokens: token(u.promptTokenCount), completion_tokens: token(u.candidatesTokenCount), total_tokens: token(u.totalTokenCount) } }
  }
}

const schema = z.object({
  enabled: z.boolean().default(true), providerId: z.enum(['gemini', 'nvidia', 'omniroute', 'openai', 'deepseek', 'ollama']),
  model: z.string().min(1).max(160).regex(/^[a-zA-Z0-9_.:/-]+$/), priority: z.number().int().min(0).max(1000),
  timeoutMs: z.number().int().min(1).max(120000).default(15000), maxRetries: z.number().int().min(0).max(3).default(1), supportsReasoning: z.boolean().default(false),
})
export function resolveCandidates(resolve: ResolveConfig, profile: LogicalProfile): Candidate[] {
  if (process.env.AI_PROVIDER_CANDIDATES_JSON) {
    try {
      const mapping = z.record(z.enum(PROFILES), z.array(schema).max(12)).parse(JSON.parse(process.env.AI_PROVIDER_CANDIDATES_JSON))
      if (!mapping[profile]) throw new Error()
      return mapping[profile]!
    } catch { throw new ProviderFailure('CONFIG') }
  }
  const ids = ['gemini', 'omniroute', 'nvidia', process.env.MENTOR_AI_PROVIDER || process.env.AI_PROVIDER || '', 'openai', 'deepseek', 'ollama']
  return [...new Set(ids)].filter(id => ['gemini', 'omniroute', 'nvidia', 'openai', 'deepseek', 'ollama'].includes(id)).map((id, priority) => {
    let model = process.env[`${id.toUpperCase()}_MODEL`] || ''
    let enabled = !!process.env[`${id.toUpperCase()}_API_KEY`]
    if (id === 'ollama') enabled = !!(process.env.OLLAMA_MODEL || process.env.OLLAMA_API_URL)
    if (id !== 'gemini') { try { const c = resolve({ provider: id }); model ||= c.model } catch { enabled = false } }
    if (['gemini', 'nvidia', 'openai', 'deepseek'].includes(id) && process.env.AI_ALLOW_EXTERNAL_PROVIDERS !== 'true') enabled = false
    return { enabled: enabled && !!model, providerId: id, model, priority, timeoutMs: 15000, maxRetries: 1, supportsReasoning: false }
  })
}
let router: ProviderRouter | undefined
export function getProviderRouter(resolve: ResolveConfig, body: BodyBuilder) {
  if (!router) {
    const registry = new ProviderRegistry().register(new GeminiProvider())
    for (const id of ['nvidia', 'omniroute', 'openai', 'deepseek', 'ollama']) registry.register(new OpenAICompatibleProvider(id, resolve, body))
    router = new ProviderRouter(registry)
  }
  return router
}
export function mentorProfile(): LogicalProfile {
  const profile = process.env.AI_MENTOR_PROFILE || 'MENTOR_STANDARD'
  if (!(PROFILES as readonly string[]).includes(profile)) throw new ProviderFailure('CONFIG')
  return profile as LogicalProfile
}
export function prepareProviderMessages(messages: ChatMessage[]) {
  return maskChatMessages(messages)
}
