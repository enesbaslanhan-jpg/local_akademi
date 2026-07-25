import { maskChatMessages } from './sensitive-data-masker'
import { reviewInput, reviewOutput, type ReviewResult } from './review-gate'
import { secureLog, secureLogError } from './secure-logger'
import type { AiProvider, ChatMessage, TokenUsage } from './ai-provider'
import {
  RealAiReviewerProvider,
  aiReviewerQueue,
  aiReviewerResponseJsonSchema,
  formatAiReviewerDisclaimerContent,
  getAiReviewerConfig,
  persistReviewerTelemetry,
  recordAiReviewerOutcome,
  recordAiReviewerSkipped,
  runAiReview,
  shouldSampleAiReview,
  telemetryEventFromOutcome,
  type AiReviewerOutcome,
  type AiReviewerProvider,
  type ReviewerEvidence,
  type ReviewerProviderRequest,
  type ReviewerProviderResult,
  type ReviewerTransport,
} from './ai-reviewer'

export interface Citation {
  id: number
  title: string
  code: string | null
  category: { name: string } | null
  sourceRefs?: Array<{
    sourceId: string
    title: string
    url: string | null
    authorityLevel: string
  }>
}

export interface GatewayRequest {
  messages: ChatMessage[]
  stream?: boolean
  abortSignal?: AbortSignal
  userId?: number
  userRole?: string
  requestId?: string
  skipMasking?: boolean
  skipInputReview?: boolean
  skipOutputReview?: boolean
  knowledgeObjects?: Citation[]
  reviewerEvidence?: ReviewerEvidence[]
  reviewerProvider?: AiReviewerProvider
}

export interface GatewayResponse {
  content: string
  usage: TokenUsage
  provider: string
  model: string
  citations?: Citation[]
  reviewResult?: ReviewResult
}

export type GatewayStreamEvent =
  | { type: 'provider'; provider: string; model: string }
  | { type: 'delta'; delta: string }
  | { type: 'done'; tokenUsage?: TokenUsage; citations?: Citation[]; reviewResult?: ReviewResult }
  | { type: 'error'; code: string; message: string }

export type AiProviderName = 'ollama' | 'nvidia' | 'openai' | 'deepseek'

const ALLOWED_PROVIDERS: AiProviderName[] = [
  'ollama',
  'nvidia',
  'openai',
  'deepseek',
]

interface ProviderConfig {
  provider: AiProviderName
  apiUrl: string
  apiKey?: string
  model: string
  timeout: number
  maxTokens: number
}

type ReviewerProviderName = AiProviderName

interface ReviewerProviderConfig {
  provider: ReviewerProviderName
  apiUrl: string
  apiKey?: string
  model: string
  timeout: number
  maxTokens: number
}

const MAX_RETRIES = 2
const RETRY_BASE_DELAY = 1000
const MAX_OUTPUT_TOKENS = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048', 10)
const REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '60000', 10)
export function getReviewGateConfig(): boolean {
  return process.env.AI_REVIEW_GATE_ENABLED !== 'false'
}

export function getReviewMaxOutputChars(): number {
  const val = parseInt(process.env.AI_REVIEW_MAX_OUTPUT_CHARS || '20000', 10)
  if (Number.isNaN(val) || val < 1) return 20000
  return val
}

function selectAutoProvider(): AiProviderName {
  if (process.env.OLLAMA_API_URL || process.env.OLLAMA_MODEL) return 'ollama'
  if (process.env.NVIDIA_API_KEY) return 'nvidia'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  throw new GatewayConfigError('MENTOR_CONFIG_ERROR: AI sağlayıcısı için hiçbir API anahtarı yapılandırılmamış.')
}

function getPositiveInteger(
  rawValue: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(rawValue || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getLoopbackOllamaUrl(): string {
  const rawUrl =
    process.env.OLLAMA_API_URL ||
    'http://127.0.0.1:11434/v1/chat/completions'

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new GatewayConfigError('OLLAMA_INVALID_URL')
  }

  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !loopbackHosts.has(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new GatewayConfigError('OLLAMA_NON_LOOPBACK_URL')
  }

  return url.toString()
}

function getProviderConfig(): ProviderConfig {
  const raw = (process.env.AI_PROVIDER || 'auto').toLowerCase()

  let provider: AiProviderName
  if (raw === 'auto') {
    provider = selectAutoProvider()
  } else if (ALLOWED_PROVIDERS.includes(raw as AiProviderName)) {
    provider = raw as AiProviderName
  } else {
    throw new GatewayConfigError(`MENTOR_INVALID_PROVIDER: ${raw} allowlist dışı`)
  }

  const configs: Record<AiProviderName, ProviderConfig> = {
    ollama: {
      provider: 'ollama',
      apiUrl: getLoopbackOllamaUrl(),
      model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
      timeout: getPositiveInteger(process.env.OLLAMA_TIMEOUT, REQUEST_TIMEOUT),
      maxTokens: MAX_OUTPUT_TOKENS,
    },
    nvidia: {
      provider: 'nvidia',
      apiUrl: process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: process.env.NVIDIA_API_KEY,
      model: process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4-flash',
      timeout: REQUEST_TIMEOUT,
      maxTokens: MAX_OUTPUT_TOKENS
    },
    openai: {
      provider: 'openai',
      apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-5',
      timeout: REQUEST_TIMEOUT,
      maxTokens: MAX_OUTPUT_TOKENS
    },
    deepseek: {
      provider: 'deepseek',
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      timeout: REQUEST_TIMEOUT,
      maxTokens: MAX_OUTPUT_TOKENS
    }
  }

  const config = configs[provider]
  if (!config) throw new GatewayConfigError('MENTOR_INVALID_PROVIDER')
  if (config.provider !== 'ollama' && !config.apiKey) {
    throw new GatewayConfigError(`MENTOR_API_KEY_MISSING:${provider}`)
  }
  return config
}

function getReviewerProviderConfig(
  request: ReviewerProviderRequest,
): ReviewerProviderConfig {
  const raw = (process.env.AI_REVIEWER_PROVIDER || 'inherit')
    .trim()
    .toLowerCase()

  if (raw === 'inherit') {
    const baseConfig = getProviderConfig()
    return {
      ...baseConfig,
      model: request.model || baseConfig.model,
      timeout: request.timeoutMs,
    }
  }

  if (raw === 'ollama') {
    return {
      provider: 'ollama',
      apiUrl: getLoopbackOllamaUrl(),
      model:
        request.model ||
        process.env.OLLAMA_MODEL ||
        'qwen3:4b-instruct',
      timeout: request.timeoutMs,
      maxTokens: MAX_OUTPUT_TOKENS,
    }
  }

  throw new GatewayConfigError(
    `REVIEWER_INVALID_PROVIDER: ${raw} allowlist dışı`,
  )
}

export class GatewayConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GatewayConfigError'
  }
}

export class GatewayProviderError extends Error {
  public code: string
  public provider: string
  public statusCode?: number
  public retryable: boolean

  constructor(code: string, message: string, provider: string, statusCode?: number, retryable = false) {
    super(message)
    this.name = 'GatewayProviderError'
    this.code = code
    this.provider = provider
    this.statusCode = statusCode
    this.retryable = retryable
  }
}

function buildRequestBody(
  messages: ChatMessage[],
  config: Pick<ProviderConfig, 'model' | 'maxTokens'>,
  stream: boolean,
): Record<string, unknown> {
  return {
    model: config.model,
    messages,
    temperature: 0.5,
    max_tokens: config.maxTokens,
    stream
  }
}

class GatewayReviewerTransport implements ReviewerTransport {
  async complete(
    request: ReviewerProviderRequest & { purpose: 'reviewer' },
  ): Promise<ReviewerProviderResult> {
    const config = getReviewerProviderConfig(request)

    const requestBody = buildRequestBody(
      request.messages as ChatMessage[],
      config,
      false,
    )
    if (config.provider === 'ollama') {
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'ai_reviewer_result',
          strict: true,
          schema: aiReviewerResponseJsonSchema,
        },
      }
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal: request.abortSignal,
    })

    if (!response.ok) {
      throw new GatewayProviderError(
        'REVIEWER_PROVIDER_ERROR',
        `Reviewer provider error:${config.provider}:${response.status}`,
        config.provider,
        response.status,
        false,
      )
    }

    const data = (await response.json()) as Record<string, unknown>
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const message = choices?.[0]?.message as Record<string, unknown> | undefined
    if (typeof message?.content !== 'string') {
      throw new GatewayProviderError(
        'REVIEWER_EMPTY_RESPONSE',
        'Reviewer returned an empty response',
        config.provider,
        undefined,
        false,
      )
    }

    const usage = (data.usage || {}) as Record<string, number>
    return {
      content: message.content,
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      },
    }
  }
}

function lastUserMessage(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'user') return messages[index].content
  }
  return ''
}

async function runGatewayShadowReview(params: {
  request: GatewayRequest
  messages: ChatMessage[]
  draft: string
  riskLevel: ReviewResult['riskLevel']
  requestId: string
  reviewerConfig: ReturnType<typeof getAiReviewerConfig>
}): Promise<AiReviewerOutcome> {
  const provider =
    params.request.reviewerProvider ||
    new RealAiReviewerProvider(new GatewayReviewerTransport())
  const outcome = await runAiReview(
    {
      userMessage: lastUserMessage(params.messages),
      draft: params.draft,
      evidence: params.request.reviewerEvidence || [],
      riskLevel: params.riskLevel,
    },
    provider,
    params.reviewerConfig,
  )
  if (outcome.status !== 'disabled') {
    recordAiReviewerOutcome(outcome, params.riskLevel)
    void persistReviewerTelemetry(
      telemetryEventFromOutcome(
        outcome,
        params.riskLevel,
        params.reviewerConfig.model ||
          process.env.OLLAMA_MODEL,
      ),
    ).catch(() => {
      secureLogError({
        requestId: params.requestId,
        userId: params.request.userId,
        errorCode: 'REVIEWER_METRICS_WRITE_FAILED',
      })
    })
  }

  secureLog({
    requestId: params.requestId,
    userId: params.request.userId,
    reviewerStatus: outcome.status,
    reviewerDecision:
      outcome.status === 'reviewed' ? outcome.result.decision : undefined,
    reviewerFailureCode:
      outcome.status === 'unavailable' ? outcome.failureCode : undefined,
    reviewerLatencyMs:
      outcome.status === 'disabled' ? undefined : outcome.latencyMs,
    reviewerMode: params.reviewerConfig.mode,
    riskLevel: params.riskLevel,
  })

  return outcome
}

function scheduleGatewayShadowReview(params: {
  request: GatewayRequest
  messages: ChatMessage[]
  draft: string
  riskLevel: ReviewResult['riskLevel']
  requestId: string
}): void {
  const reviewerConfig = getAiReviewerConfig()
  if (!reviewerConfig.enabled) return

  if (
    !shouldSampleAiReview(
      params.requestId,
      reviewerConfig.sampleRate,
    )
  ) {
    recordAiReviewerSkipped(params.riskLevel)
    void persistReviewerTelemetry({
      status: 'skipped',
      riskLevel: params.riskLevel,
      model: reviewerConfig.model || process.env.OLLAMA_MODEL,
    }).catch(() => {
      secureLogError({
        requestId: params.requestId,
        userId: params.request.userId,
        errorCode: 'REVIEWER_METRICS_WRITE_FAILED',
      })
    })
    secureLog({
      requestId: params.requestId,
      userId: params.request.userId,
      reviewerStatus: 'skipped',
      reviewerMode: 'shadow',
      riskLevel: params.riskLevel,
    })
    return
  }

  const accepted = aiReviewerQueue.enqueue(async () => {
    await runGatewayShadowReview({
      ...params,
      reviewerConfig,
    })
  })

  if (!accepted) {
    const outcome: Exclude<AiReviewerOutcome, { status: 'disabled' }> = {
      status: 'unavailable',
      failureCode: 'reviewer_queue_full',
      latencyMs: 0,
    }
    recordAiReviewerOutcome(outcome, params.riskLevel)
    void persistReviewerTelemetry(
      telemetryEventFromOutcome(
        outcome,
        params.riskLevel,
        reviewerConfig.model || process.env.OLLAMA_MODEL,
      ),
    ).catch(() => {
      secureLogError({
        requestId: params.requestId,
        userId: params.request.userId,
        errorCode: 'REVIEWER_METRICS_WRITE_FAILED',
      })
    })
    secureLog({
      requestId: params.requestId,
      userId: params.request.userId,
      reviewerStatus: 'unavailable',
      reviewerFailureCode: 'reviewer_queue_full',
      reviewerMode: 'shadow',
      riskLevel: params.riskLevel,
    })
  }
}

async function runGatewayDisclaimerReview(params: {
  request: GatewayRequest
  messages: ChatMessage[]
  draft: string
  riskLevel: ReviewResult['riskLevel']
  requestId: string
}): Promise<AiReviewerOutcome | null> {
  const reviewerConfig = getAiReviewerConfig()
  if (
    !reviewerConfig.enabled ||
    reviewerConfig.mode !== 'disclaimer_only'
  ) {
    return null
  }

  const queued = await aiReviewerQueue.execute(() =>
    runGatewayShadowReview({
      ...params,
      reviewerConfig,
    }),
  )
  if (queued.accepted) return queued.result

  const outcome: Exclude<AiReviewerOutcome, { status: 'disabled' }> = {
    status: 'unavailable',
    failureCode: 'reviewer_queue_full',
    latencyMs: 0,
  }
  recordAiReviewerOutcome(outcome, params.riskLevel)
  await persistReviewerTelemetry(
    telemetryEventFromOutcome(
      outcome,
      params.riskLevel,
      reviewerConfig.model || process.env.OLLAMA_MODEL,
    ),
  ).catch(() => {
    secureLogError({
      requestId: params.requestId,
      userId: params.request.userId,
      errorCode: 'REVIEWER_METRICS_WRITE_FAILED',
    })
  })
  secureLog({
    requestId: params.requestId,
    userId: params.request.userId,
    reviewerStatus: 'unavailable',
    reviewerFailureCode: 'reviewer_queue_full',
    reviewerMode: 'disclaimer_only',
    riskLevel: params.riskLevel,
  })
  return outcome
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout: number }): Promise<Response> {
  const { timeout, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return response
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GatewayProviderError('TIMEOUT', 'Provider timeout', '', undefined, true)
    }
    throw new GatewayProviderError('NETWORK', err instanceof Error ? err.message : 'Network error', '', undefined, true)
  } finally {
    clearTimeout(timer)
  }
}

async function callProvider(messages: ChatMessage[], config: ProviderConfig): Promise<{ content: string; usage: TokenUsage; provider: string; model: string }> {
  const { provider, apiUrl, apiKey, model } = config
  let response: Response
  try {
    response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(buildRequestBody(messages, config, false)),
      timeout: config.timeout
    })
  } catch (err: unknown) {
    if (err instanceof GatewayProviderError) throw err
    throw new GatewayProviderError('NETWORK', err instanceof Error ? err.message : 'Network error', provider, undefined, true)
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_BASE_DELAY
    throw new GatewayProviderError('RATE_LIMITED', `Rate limited:${delay}`, provider, 429, true)
  }

  if (response.status >= 500) {
    throw new GatewayProviderError('SERVER_ERROR', `Server error:${response.status}`, provider, response.status, true)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    throw new GatewayProviderError('PROVIDER_ERROR', `Provider error:${provider}:${response.status}`, provider, response.status, false)
  }

  const data = await response.json() as Record<string, unknown>
  const choices = data?.choices as Array<Record<string, unknown>> | undefined
  if (!choices?.[0]?.message || typeof (choices[0].message as Record<string, unknown>).content !== 'string') {
    throw new GatewayProviderError('EMPTY_RESPONSE', 'Empty response from provider', provider, undefined, false)
  }

  const usageData = (data?.usage || {}) as Record<string, number>

  return {
    content: (choices[0].message as Record<string, unknown>).content as string,
    usage: {
      prompt_tokens: usageData.prompt_tokens || 0,
      completion_tokens: usageData.completion_tokens || 0,
      total_tokens: usageData.total_tokens || 0
    },
    provider,
    model
  }
}

async function* streamFromProvider(
  messages: ChatMessage[],
  config: ProviderConfig,
  abortSignal: AbortSignal
): AsyncGenerator<GatewayStreamEvent> {
  const { provider, apiUrl, apiKey, model } = config

  yield { type: 'provider', provider, model }

  let response: Response
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(buildRequestBody(messages, config, true)),
      signal: abortSignal
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GatewayProviderError('ABORTED', 'Stream aborted', provider, undefined, false)
    }
    throw new GatewayProviderError('NETWORK', err instanceof Error ? err.message : 'Network error', provider, undefined, true)
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : RETRY_BASE_DELAY
    throw new GatewayProviderError('RATE_LIMITED', `Rate limited:${delay}`, provider, 429, true)
  }

  if (response.status >= 500) {
    throw new GatewayProviderError('SERVER_ERROR', `Server error:${response.status}`, provider, response.status, true)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    throw new GatewayProviderError('PROVIDER_ERROR', `Provider error:${provider}:${response.status}`, provider, response.status, false)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new GatewayProviderError('EMPTY_RESPONSE', 'No response body', provider, undefined, false)
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let contentEmitted = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6).trim()
        if (!jsonStr) continue

        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(jsonStr)
        } catch {
          continue
        }

        const choices = parsed.choices as Array<Record<string, unknown>> | undefined
        if (!choices?.[0]) continue

        const delta = choices[0].delta as Record<string, unknown> | undefined
        const finishReason = choices[0].finish_reason as string | undefined
        const deltaContent = delta?.content

        if (typeof deltaContent === 'string' && deltaContent.length > 0) {
          contentEmitted = true
          yield { type: 'delta', delta: deltaContent }
        }

        if (finishReason === 'stop' || finishReason === 'length') {
          const usageData = (parsed.usage || {}) as Record<string, number>
          yield {
            type: 'done',
            tokenUsage: usageData.prompt_tokens !== undefined ? {
              prompt_tokens: usageData.prompt_tokens || 0,
              completion_tokens: usageData.completion_tokens || 0,
              total_tokens: usageData.total_tokens || 0
            } : undefined
          }
          return
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GatewayProviderError('ABORTED', 'Stream aborted', provider, undefined, false)
    }
    throw err
  } finally {
    reader.releaseLock()
  }

  if (!contentEmitted) {
    throw new GatewayProviderError('EMPTY_RESPONSE', 'No content emitted', provider, undefined, false)
  }

  yield { type: 'done' }
}

export function formatOutputContent(content: string, reviewResult: ReviewResult): string {
  return reviewResult.safeDisclaimer
    ? `${content}\n\n---\n${reviewResult.safeDisclaimer}`
    : content
}

export async function generateCompletion(req: GatewayRequest): Promise<GatewayResponse> {
  const startTime = Date.now()
  const requestId = req.requestId || `gw-${Date.now()}`
  const config = getProviderConfig()

  let messages: ChatMessage[] = req.messages
  if (!req.skipMasking) {
    messages = maskChatMessages(messages)
  }

  const inputReviewResult = getReviewGateConfig() && !req.skipInputReview
    ? reviewInput(
        messages.filter(m => m.role === 'user').map(m => m.content).join('\n'),
        messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
      )
    : null

  if (inputReviewResult?.blocked) {
    secureLog({ requestId, userId: req.userId, errorCode: 'INPUT_BLOCKED', riskLevel: 'high', durationMs: Date.now() - startTime })
    return {
      content: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      provider: 'gateway',
      model: 'review-gate',
      reviewResult: inputReviewResult
    }
  }

  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callProvider(messages as ChatMessage[], config)
      const durationMs = Date.now() - startTime

      if (result.content.length > getReviewMaxOutputChars()) {
        secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, errorCode: 'OUTPUT_TOO_LARGE', durationMs })
        return {
          content: '',
          usage: result.usage,
          provider: result.provider,
          model: result.model,
          citations: req.knowledgeObjects,
          reviewResult: {
            decision: 'block',
            riskLevel: 'high',
            categories: ['cok_uzun_yanit'],
            requiresDisclaimer: false,
            requiresHumanReview: false,
            blocked: true,
            reasons: ['Yanıt izin verilen maksimum uzunluğu aşıyor'],
            safeDisclaimer: 'Yanıt çok uzun, lütfen sorunuzu daraltın.'
          }
        }
      }

      let outputReviewResult: ReviewResult | null = null
      if (getReviewGateConfig() && !req.skipOutputReview) {
        outputReviewResult = reviewOutput(result.content, inputReviewResult?.categories || [], req.knowledgeObjects?.length || 0)
      }

      if (outputReviewResult?.decision === 'block') {
        secureLog({
          requestId, userId: req.userId, provider: config.provider, model: config.model,
          durationMs, tokenCount: result.usage.total_tokens, riskLevel: 'high', errorCode: 'OUTPUT_BLOCKED'
        })
        return {
          content: '',
          usage: result.usage,
          provider: result.provider,
          model: result.model,
          citations: req.knowledgeObjects,
          reviewResult: outputReviewResult
        }
      }

      const reviewerRiskLevel =
        outputReviewResult?.riskLevel ||
        inputReviewResult?.riskLevel ||
        'low'
      let reviewerOutcome: AiReviewerOutcome | null = null
      if (!req.skipOutputReview) {
        const reviewerConfig = getAiReviewerConfig()
        if (reviewerConfig.mode === 'disclaimer_only') {
          reviewerOutcome = await runGatewayDisclaimerReview({
            request: req,
            messages,
            draft: result.content,
            riskLevel: reviewerRiskLevel,
            requestId,
          })
        } else {
          scheduleGatewayShadowReview({
            request: req,
            messages,
            draft: result.content,
            riskLevel: reviewerRiskLevel,
            requestId,
          })
        }
      }

      secureLog({
        requestId, userId: req.userId, provider: config.provider, model: config.model,
        durationMs, tokenCount: result.usage.total_tokens, riskLevel: outputReviewResult?.riskLevel
      })

      const deterministicContent = outputReviewResult
        ? formatOutputContent(result.content, outputReviewResult)
        : result.content
      return {
        content: formatAiReviewerDisclaimerContent(
          deterministicContent,
          reviewerOutcome,
        ),
        usage: result.usage,
        provider: result.provider,
        model: result.model,
        citations: req.knowledgeObjects,
        reviewResult: outputReviewResult || undefined
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (err instanceof GatewayProviderError) {
        if (!err.retryable || attempt >= MAX_RETRIES) {
          const durationMs = Date.now() - startTime
          secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, durationMs, errorCode: err.code })
          throw err
        }
        const delay = err.code === 'RATE_LIMITED'
          ? parseInt(err.message.split(':')[1]) || RETRY_BASE_DELAY * Math.pow(2, attempt)
          : RETRY_BASE_DELAY * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }

  throw lastError || new GatewayProviderError('ALL_FAILED', 'All providers failed', config.provider, undefined, false)
}

export async function* generateStream(req: GatewayRequest): AsyncGenerator<GatewayStreamEvent> {
  const startTime = Date.now()
  const requestId = req.requestId || `gw-${Date.now()}`
  const config = getProviderConfig()

  let messages: ChatMessage[] = req.messages
  if (!req.skipMasking) {
    messages = maskChatMessages(messages)
  }

  const inputReviewResult = getReviewGateConfig() && !req.skipInputReview
    ? reviewInput(
        messages.filter(m => m.role === 'user').map(m => m.content).join('\n'),
        messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
      )
    : null

  if (inputReviewResult?.blocked) {
    secureLog({ requestId, userId: req.userId, errorCode: 'INPUT_BLOCKED', riskLevel: 'high', durationMs: Date.now() - startTime })
    yield { type: 'error', code: 'INPUT_BLOCKED', message: inputReviewResult.safeDisclaimer || 'İstek güvenlik tarafından engellendi.' }
    return
  }

  const reviewerConfig = getAiReviewerConfig()
  const reviewerEnabled =
    !req.skipOutputReview && reviewerConfig.enabled

  // FAST PATH: deterministic gate disabled — preserve immediate streaming.
  // Shadow reviewer observes a bounded copy without delaying provider events.
  if (
    req.skipOutputReview ||
    (!getReviewGateConfig() &&
      reviewerConfig.mode !== 'disclaimer_only')
  ) {
    let shadowDraft = ''
    const reviewerMaxDraftChars = reviewerEnabled
      ? getAiReviewerConfig().maxDraftChars
      : 0
    try {
      const generator = streamFromProvider(messages, config, req.abortSignal || new AbortController().signal)
      for await (const event of generator) {
        if (
          reviewerEnabled &&
          event.type === 'delta' &&
          shadowDraft.length < reviewerMaxDraftChars
        ) {
          shadowDraft += event.delta.slice(
            0,
            reviewerMaxDraftChars - shadowDraft.length,
          )
        }
        yield event
      }
      if (reviewerEnabled) {
        scheduleGatewayShadowReview({
          request: req,
          messages,
          draft: shadowDraft,
          riskLevel: inputReviewResult?.riskLevel || 'low',
          requestId,
        })
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime
      if (err instanceof GatewayProviderError) {
        secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, durationMs, errorCode: err.code })
        yield err.code === 'ABORTED'
          ? { type: 'error' as const, code: 'STREAM_ABORTED', message: 'Stream aborted' }
          : { type: 'error' as const, code: err.code, message: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' }
      } else {
        secureLogError({ requestId, userId: req.userId, durationMs, errorCode: 'UNKNOWN' })
        yield { type: 'error', code: 'UNKNOWN', message: 'Beklenmeyen bir hata oluştu.' }
      }
    }
    return
  }

  // SLOW PATH: gate enabled — buffer all deltas, review, then yield
  let contentBuffer = ''
  let finalTokenUsage: TokenUsage | undefined

  try {
    const generator = streamFromProvider(messages, config, req.abortSignal || new AbortController().signal)
    for await (const event of generator) {
      if (event.type === 'delta') {
        contentBuffer += event.delta
      } else if (event.type === 'provider') {
        yield event
      } else if (event.type === 'done') {
        finalTokenUsage = event.tokenUsage
      }
    }

    // Check output size limit — never yield raw content
    if (contentBuffer.length > getReviewMaxOutputChars()) {
      yield { type: 'error', code: 'OUTPUT_TOO_LARGE', message: 'Yanıt çok uzun, lütfen sorunuzu daraltın.' }
      const durationMs = Date.now() - startTime
      secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, durationMs, errorCode: 'OUTPUT_TOO_LARGE' })
      return
    }

    const outputReviewResult =
      getReviewGateConfig() && !req.skipOutputReview
        ? reviewOutput(
            contentBuffer,
            inputReviewResult?.categories || [],
            req.knowledgeObjects?.length || 0,
          )
        : null

    if (outputReviewResult?.decision === 'block') {
      yield { type: 'error', code: 'OUTPUT_BLOCKED', message: outputReviewResult.safeDisclaimer || 'Yanıt güvenlik tarafından engellendi.' }
      const durationMs = Date.now() - startTime
      secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, durationMs, errorCode: 'OUTPUT_BLOCKED', riskLevel: 'high' })
      return
    }

    const reviewerRiskLevel =
      outputReviewResult?.riskLevel ||
      inputReviewResult?.riskLevel ||
      'low'
    let reviewerOutcome: AiReviewerOutcome | null = null
    if (!req.skipOutputReview) {
      if (reviewerConfig.mode === 'disclaimer_only') {
        reviewerOutcome = await runGatewayDisclaimerReview({
          request: req,
          messages,
          draft: contentBuffer,
          riskLevel: reviewerRiskLevel,
          requestId,
        })
      } else {
        scheduleGatewayShadowReview({
          request: req,
          messages,
          draft: contentBuffer,
          riskLevel: reviewerRiskLevel,
          requestId,
        })
      }
    }

    const deterministicContent = outputReviewResult
      ? formatOutputContent(contentBuffer, outputReviewResult)
      : contentBuffer
    const finalContent = formatAiReviewerDisclaimerContent(
      deterministicContent,
      reviewerOutcome,
    )
    yield { type: 'delta', delta: finalContent }
    yield {
      type: 'done',
      tokenUsage: finalTokenUsage,
      citations: req.knowledgeObjects,
      reviewResult: outputReviewResult || undefined,
    }

    const durationMs = Date.now() - startTime
    secureLog({
      requestId, userId: req.userId, provider: config.provider, model: config.model,
      durationMs,
      tokenCount: finalTokenUsage?.total_tokens,
      riskLevel: outputReviewResult?.riskLevel || inputReviewResult?.riskLevel,
    })
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime
    if (err instanceof GatewayProviderError) {
      secureLogError({ requestId, userId: req.userId, provider: config.provider, model: config.model, durationMs, errorCode: err.code })
      if (err.code === 'ABORTED') {
        yield { type: 'error', code: 'STREAM_ABORTED', message: 'Stream aborted' }
      } else {
        yield { type: 'error', code: err.code, message: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' }
      }
    } else {
      secureLogError({ requestId, userId: req.userId, durationMs, errorCode: 'UNKNOWN' })
      yield { type: 'error', code: 'UNKNOWN', message: 'Beklenmeyen bir hata oluştu.' }
    }
  }
}
