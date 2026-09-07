import { randomUUID } from 'node:crypto'
import type { ChatMessage, TokenUsage } from './ai-provider'

export const UNAVAILABLE = 'AI_MENTOR_TEMPORARILY_UNAVAILABLE'
export const UNAVAILABLE_MESSAGE = 'AI Mentor şu anda yanıt veremiyor. Birkaç dakika sonra tekrar deneyebilirsin.'
export const PROFILES = ['MENTOR_FAST', 'MENTOR_STANDARD', 'MENTOR_REASONING', 'MENTOR_FALLBACK'] as const
export type LogicalProfile = typeof PROFILES[number]
export interface Candidate {
  enabled: boolean; providerId: string; model: string; priority: number
  timeoutMs: number; maxRetries: number; supportsReasoning?: boolean
}
export interface ProviderResult { content: string; usage: TokenUsage; provider: string; model: string }
export interface GenerateOptions { temperature?: number; maxOutputTokens?: number; keepAlive?: string | null }
export interface AIProvider {
  id: string
  // V1 uses complete, reviewed responses before emitting any client delta.
  supportsStreaming: boolean
  generate(messages: ChatMessage[], candidate: Candidate, signal: AbortSignal, options: GenerateOptions): Promise<ProviderResult>
}
export class ProviderFailure extends Error {
  constructor(public code: string, public status?: number, public retryAfterMs = 0) { super(code) }
}
export interface Health {
  failures: number; rateLimits: number; attempts: number; totalLatencyMs: number
  lastSuccess: number | null; lastFailure: number | null; openUntil: number; probing: boolean; configError: boolean
}
export interface AttemptMetric {
  requestId: string; provider: string; profile: LogicalProfile; model: string
  latencyMs: number; success: boolean; errorCode?: string; status?: number
  retryCount: number; fallbackPosition: number; usage?: TokenUsage
}
export class ProviderRegistry {
  private providers = new Map<string, AIProvider>()
  register(provider: AIProvider) { this.providers.set(provider.id, provider); return this }
  get(id: string) { return this.providers.get(id) }
}
export class ProviderRouter {
  private health = new Map<string, Health>()
  constructor(private registry: ProviderRegistry, private dependencies = {
    now: () => Date.now(), random: () => Math.random(),
    sleep: (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new ProviderFailure('ABORTED')) }
      const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, ms)
      signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort()
    }),
    record: (metric: AttemptMetric) => { console.info('[AI_ATTEMPT]', JSON.stringify(metric)) },
  }) {}
  private state(c: Candidate) {
    const key = `${c.providerId}:${c.model}`
    if (!this.health.has(key)) this.health.set(key, { failures: 0, rateLimits: 0, attempts: 0, totalLatencyMs: 0, lastSuccess: null, lastFailure: null, openUntil: 0, probing: false, configError: false })
    return this.health.get(key)!
  }
  snapshot(candidates: Candidate[]) {
    return candidates.map(c => {
      const h = this.state(c)
      return { providerId: c.providerId, priority: c.priority,
        status: !c.enabled ? 'DISABLED' : h.openUntil > this.dependencies.now() ? 'OPEN' : h.failures ? 'DEGRADED' : 'HEALTHY',
        circuit: h.probing ? 'HALF_OPEN' : h.openUntil ? 'OPEN' : 'CLOSED',
        lastSuccess: h.lastSuccess, lastFailure: h.lastFailure,
        consecutiveFailures: h.failures, rateLimitCount: h.rateLimits,
        avgLatencyMs: h.attempts ? Math.round(h.totalLatencyMs / h.attempts) : null,
        configError: h.configError, cooldownUntil: h.openUntil || null }
    })
  }
  async generate(messages: ChatMessage[], candidates: Candidate[], profile: LogicalProfile, options: GenerateOptions = {}, signal?: AbortSignal): Promise<ProviderResult> {
    const requestId = randomUUID()
    const ordered = [...candidates].sort((a, b) => a.priority - b.priority)
    for (const [position, c] of ordered.entries()) {
      if (signal?.aborted) throw new ProviderFailure('ABORTED')
      if (!c.enabled || (profile === 'MENTOR_REASONING' && !c.supportsReasoning)) continue
      const h = this.state(c)
      if (h.probing || h.openUntil > this.dependencies.now()) continue
      const probe = h.openUntil > 0
      if (probe) h.probing = true
      try {
        for (let retry = 0; retry <= (probe ? 0 : Math.min(3, Math.max(0, c.maxRetries))); retry++) {
          const start = this.dependencies.now()
          const controller = new AbortController()
          const abort = () => controller.abort()
          signal?.addEventListener('abort', abort, { once: true })
          if (signal?.aborted) controller.abort()
          let timer: ReturnType<typeof setTimeout> | undefined
          let onAbort: (() => void) | undefined
          try {
            const result = await Promise.race([
              Promise.resolve().then(() => {
                const provider = this.registry.get(c.providerId)
                if (!provider) throw new ProviderFailure('CONFIG')
                return provider.generate(messages, c, controller.signal, options)
              }),
              new Promise<never>((_, reject) => {
                onAbort = () => reject(new ProviderFailure('ABORTED'))
                signal?.addEventListener('abort', onAbort, { once: true })
                if (signal?.aborted) onAbort()
                timer = setTimeout(() => { reject(new ProviderFailure('TIMEOUT')); controller.abort() }, Math.min(120000, Math.max(1, c.timeoutMs)))
              }),
            ])
            h.failures = 0; h.openUntil = 0; h.configError = false; h.lastSuccess = this.dependencies.now()
            this.record(h, { requestId, provider: c.providerId, model: c.model, profile, latencyMs: this.dependencies.now() - start, success: true, retryCount: retry, fallbackPosition: position, usage: result.usage })
            return result
          } catch (error) {
            clearTimeout(timer)
            const e = error instanceof ProviderFailure ? error : new ProviderFailure('NETWORK')
            if (signal?.aborted || e.code === 'ABORTED') throw new ProviderFailure('ABORTED')
            const requestProblem = e.code === 'INVALID_REQUEST' || e.code === 'SAFETY'
            if (!requestProblem) {
              h.failures++; h.lastFailure = this.dependencies.now()
              h.configError = e.code === 'CONFIG'
            }
            if (e.code === 'RATE_LIMITED') h.rateLimits++
            this.record(h, { requestId, provider: c.providerId, model: c.model, profile, latencyMs: this.dependencies.now() - start, success: false, errorCode: e.code, status: e.status, retryCount: retry, fallbackPosition: position })
            // Invalid prompts and safety refusals must not be retried on another provider.
            if (requestProblem) throw new ProviderFailure(UNAVAILABLE)
            const retryable = ['RATE_LIMITED', 'TIMEOUT', 'SERVER_ERROR', 'NETWORK', 'EMPTY_RESPONSE'].includes(e.code)
            const cooldown = Math.max(30000, Math.min(300000, e.retryAfterMs))
            if (h.configError || h.failures >= 3 || probe) h.openUntil = this.dependencies.now() + cooldown
            if (!retryable || retry >= c.maxRetries || retry >= 3 || probe || h.openUntil > this.dependencies.now()) break
            // Respect long Retry-After by cooling down and moving to the next provider.
            if (e.retryAfterMs > 2000) { h.openUntil = this.dependencies.now() + cooldown; break }
            await this.dependencies.sleep(Math.max(e.retryAfterMs, Math.min(2000, 250 * 2 ** retry + this.dependencies.random() * 250)), signal)
          } finally {
            clearTimeout(timer); signal?.removeEventListener('abort', abort)
            if (onAbort) signal?.removeEventListener('abort', onAbort)
          }
        }
      } finally { h.probing = false }
    }
    throw new ProviderFailure(UNAVAILABLE)
  }
  private record(h: Health, metric: AttemptMetric) {
    h.attempts++; h.totalLatencyMs += metric.latencyMs
    try { this.dependencies.record(metric) } catch { /* Telemetry must never change routing. */ }
  }
}
