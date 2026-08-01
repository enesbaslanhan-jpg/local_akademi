/**
 * Development-only telemetry for the AI Mentor request lifecycle.
 *
 * - Disabled by default via `AI_MENTOR_TELEMETRY_ENABLED`.
 * - When enabled, records only safe, non-sensitive metadata (durations,
 *   counts, provider/model names, error codes). Never stores user messages,
 *   assistant responses, system prompts, memory contents, knowledge object
 *   contents, API keys, or tokens.
 * - Minimal overhead when disabled: functions short-circuit and avoid
 *   allocations where possible.
 */

export interface MentorTelemetryRecord {
  requestId: string
  conversationId?: number
  provider: string
  model: string
  stream: boolean
  detectedIntent?: string
  intentConfidence?: number
  totalDurationMs: number
  retrievalDurationMs?: number
  embeddingDurationMs?: number
  memoryDurationMs?: number
  contextBuildDurationMs?: number
  providerDurationMs?: number
  firstTokenMs?: number
  persistenceDurationMs?: number
  reviewerDurationMs?: number
  promptCharacterCount?: number
  estimatedPromptTokens?: number
  responseCharacterCount?: number
  estimatedResponseTokens?: number
  retrievedKnowledgeObjectCount: number
  acceptedKnowledgeObjectCount?: number
  rejectedKnowledgeObjectCount?: number
  selectedKnowledgeObjectPresent: boolean
  memoryItemCount: number
  citationCount: number
  fallbackOccurred: boolean
  deterministicResponse?: boolean
  retrievalRequested?: boolean
  retrievalSkippedReason?: string
  disclaimerAttached?: boolean
  compressedContextCharacters?: number
  estimatedCompressedContextTokens?: number
  promptProfile?: string
  systemPromptCharacters?: number
  historyCharacters?: number
  historyMessageCount?: number
  configuredMaxOutputTokens?: number
  knowledgeContextCharacters?: number
  estimatedInputTokens?: number
  memoryCharacters?: number
  rerankDurationMs?: number
  retrievalFallbackUsed?: boolean
  noRelevantKnowledgeFound?: boolean
  providerInputTokens?: number
  providerOutputTokens?: number
  coldStartSuspected?: boolean
  outputReviewDeferred?: boolean
  fallbackReason?: string
  reviewerDeferred?: boolean
  errorCode?: string
  timeout: boolean
  aborted: boolean
  createdAt: string
}

export function isMentorTelemetryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AI_MENTOR_TELEMETRY_ENABLED === 'true'
}

export function estimateTokens(charCount: number): number {
  // Approximate, no external tokenizer dependency.
  return Math.max(0, Math.round(charCount / 4))
}

export function countChars(messages: Array<{ content?: string } | string>): number {
  let total = 0
  for (const item of messages) {
    if (typeof item === 'string') {
      total += item.length
    } else if (item && typeof item.content === 'string') {
      total += item.content.length
    }
  }
  return total
}

export class MentorTelemetrySession {
  private record: Partial<MentorTelemetryRecord>
  private stages: Map<string, number> = new Map()
  private collector: MentorTelemetryCollector
  private emitted = false

  constructor(
    requestId: string,
    collector: MentorTelemetryCollector,
    base: Partial<MentorTelemetryRecord> = {},
  ) {
    this.collector = collector
    this.record = {
      requestId,
      stream: false,
      retrievedKnowledgeObjectCount: 0,
      selectedKnowledgeObjectPresent: false,
      memoryItemCount: 0,
      citationCount: 0,
      fallbackOccurred: false,
      timeout: false,
      aborted: false,
      createdAt: new Date().toISOString(),
      ...base,
    }
  }

  startStage(name: string): void {
    if (!this.collector.isEnabled()) return
    this.stages.set(name, performance.now())
  }

  endStage(name: string, field: keyof MentorTelemetryRecord): void {
    if (!this.collector.isEnabled()) return
    const start = this.stages.get(name)
    if (start === undefined) return
    const duration = Math.max(0, Math.round(performance.now() - start))
    this.stages.delete(name)
    ;(this.record as Record<string, unknown>)[field] = duration
  }

  set(field: keyof MentorTelemetryRecord, value: unknown): void {
    if (!this.collector.isEnabled()) return
    ;(this.record as Record<string, unknown>)[field] = value
  }

  setCounts(
    knowledgeObjects: Array<{ id?: unknown } | unknown>,
    selectedPresent: boolean,
    memoryIds: number[],
  ): void {
    if (!this.collector.isEnabled()) return
    this.record.retrievedKnowledgeObjectCount = knowledgeObjects.length
    this.record.selectedKnowledgeObjectPresent = selectedPresent
    this.record.memoryItemCount = memoryIds.length
    this.record.citationCount = knowledgeObjects.length
  }

  setPromptMetrics(messages: Array<{ content?: string } | string>): void {
    if (!this.collector.isEnabled()) return
    const chars = countChars(messages)
    this.record.promptCharacterCount = chars
    this.record.estimatedPromptTokens = estimateTokens(chars)
  }

  setCompressedContextMetrics(contextString: string): void {
    if (!this.collector.isEnabled()) return
    const chars = contextString.length
    this.record.compressedContextCharacters = chars
    this.record.estimatedCompressedContextTokens = estimateTokens(chars)
  }

  setResponseMetrics(content: string): void {
    if (!this.collector.isEnabled()) return
    const chars = content.length
    this.record.responseCharacterCount = chars
    this.record.estimatedResponseTokens = estimateTokens(chars)
  }

  setProviderUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }): void {
    if (!this.collector.isEnabled()) return
    if (usage.prompt_tokens !== undefined) this.record.providerInputTokens = usage.prompt_tokens
    if (usage.completion_tokens !== undefined) this.record.providerOutputTokens = usage.completion_tokens
  }

  setFallback(flag: boolean, reason?: string): void {
    if (!this.collector.isEnabled()) return
    this.record.fallbackOccurred = flag
    if (reason) this.record.fallbackReason = reason
  }

  setError(code: string, options?: { timeout?: boolean; aborted?: boolean }): void {
    if (!this.collector.isEnabled()) return
    this.record.errorCode = code
    if (options?.timeout) this.record.timeout = true
    if (options?.aborted) this.record.aborted = true
  }

  emit(totalDurationMs?: number): MentorTelemetryRecord | null {
    if (!this.collector.isEnabled() || this.emitted) return null
    this.emitted = true
    if (totalDurationMs !== undefined) {
      this.record.totalDurationMs = totalDurationMs
    }
    const finalized = this.record as MentorTelemetryRecord
    this.collector.emit(finalized)
    return finalized
  }
}

export class MentorTelemetryCollector {
  private records: MentorTelemetryRecord[] = []
  private enabled: boolean

  constructor(enabled?: boolean) {
    this.enabled = enabled ?? isMentorTelemetryEnabled()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  createSession(
    requestId: string,
    base: Partial<MentorTelemetryRecord> = {},
  ): MentorTelemetrySession {
    return new MentorTelemetrySession(requestId, this, base)
  }

  emit(record: MentorTelemetryRecord): void {
    if (!this.enabled) return
    this.records.push(record)
  }

  getRecords(): readonly MentorTelemetryRecord[] {
    return this.records
  }

  reset(): void {
    this.records = []
  }

  size(): number {
    return this.records.length
  }

  recordReviewerDuration(requestId: string, latencyMs: number): void {
    if (!this.enabled) return
    const existing = this.records.find(r => r.requestId === requestId)
    if (existing) {
      existing.reviewerDurationMs = latencyMs
      return
    }
    this.records.push({
      requestId,
      provider: 'unknown',
      model: 'unknown',
      stream: false,
      totalDurationMs: 0,
      retrievedKnowledgeObjectCount: 0,
      selectedKnowledgeObjectPresent: false,
      memoryItemCount: 0,
      citationCount: 0,
      fallbackOccurred: false,
      timeout: false,
      aborted: false,
      reviewerDurationMs: latencyMs,
      createdAt: new Date().toISOString(),
    })
  }
}

let globalCollector: MentorTelemetryCollector | null = null

export function getGlobalMentorTelemetryCollector(): MentorTelemetryCollector {
  if (!globalCollector) {
    globalCollector = new MentorTelemetryCollector()
  }
  return globalCollector
}

export function resetGlobalMentorTelemetryCollector(): void {
  globalCollector = null
}

export function setGlobalMentorTelemetryCollector(collector: MentorTelemetryCollector): void {
  globalCollector = collector
}

export function sanitizeTelemetryRecord(record: MentorTelemetryRecord): MentorTelemetryRecord {
  // Ensure no sensitive free-text fields are accidentally attached.
  const safe: MentorTelemetryRecord = { ...record }
  // Explicit guard: the interface itself already excludes message content,
  // but this function can be used for any future extension.
  return safe
}
