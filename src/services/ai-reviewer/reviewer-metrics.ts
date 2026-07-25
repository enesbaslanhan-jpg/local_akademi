import type { RiskLevel } from '../review-gate'
import type {
  AiReviewerDecision,
  AiReviewerFailureCode,
  AiReviewerIssueCode,
  AiReviewerOutcome,
} from './types'

const MAX_LATENCY_SAMPLES = 500

interface ReviewerMetricState {
  windowStartedAt: string
  eligible: number
  sampled: number
  skipped: number
  reviewed: number
  unavailable: number
  requiresHumanReview: number
  decisions: Record<AiReviewerDecision, number>
  failures: Partial<Record<AiReviewerFailureCode, number>>
  riskLevels: Record<RiskLevel, number>
  issueCodes: Partial<Record<AiReviewerIssueCode, number>>
  groundednessSum: number
  pedagogicalSum: number
  confidenceSum: number
  latencySum: number
  latencyMax: number
  latencySamples: number[]
}

function createState(): ReviewerMetricState {
  return {
    windowStartedAt: new Date().toISOString(),
    eligible: 0,
    sampled: 0,
    skipped: 0,
    reviewed: 0,
    unavailable: 0,
    requiresHumanReview: 0,
    decisions: {
      allow: 0,
      allow_with_disclaimer: 0,
      block: 0,
    },
    failures: {},
    riskLevels: { low: 0, medium: 0, high: 0 },
    issueCodes: {},
    groundednessSum: 0,
    pedagogicalSum: 0,
    confidenceSum: 0,
    latencySum: 0,
    latencyMax: 0,
    latencySamples: [],
  }
}

let state = createState()

function increment<T extends string>(
  record: Partial<Record<T, number>>,
  key: T,
): void {
  record[key] = (record[key] || 0) + 1
}

function addLatency(latencyMs: number): void {
  const safeLatency = Math.max(0, Math.floor(latencyMs))
  state.latencySum += safeLatency
  state.latencyMax = Math.max(state.latencyMax, safeLatency)
  state.latencySamples.push(safeLatency)
  if (state.latencySamples.length > MAX_LATENCY_SAMPLES) {
    state.latencySamples.shift()
  }
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  )
  return sorted[index]
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Number((numerator / denominator).toFixed(4))
}

export function shouldSampleAiReview(
  requestId: string,
  sampleRate: number,
): boolean {
  if (sampleRate <= 0) return false
  if (sampleRate >= 1) return true

  let hash = 2166136261
  for (let index = 0; index < requestId.length; index++) {
    hash ^= requestId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const bucket = (hash >>> 0) / 0x100000000
  return bucket < sampleRate
}

export function recordAiReviewerSkipped(riskLevel: RiskLevel): void {
  state.eligible++
  state.skipped++
  state.riskLevels[riskLevel]++
}

export function recordAiReviewerOutcome(
  outcome: Exclude<AiReviewerOutcome, { status: 'disabled' }>,
  riskLevel: RiskLevel,
): void {
  state.eligible++
  state.sampled++
  state.riskLevels[riskLevel]++
  addLatency(outcome.latencyMs)

  if (outcome.status === 'unavailable') {
    state.unavailable++
    increment(state.failures, outcome.failureCode)
    return
  }

  state.reviewed++
  state.decisions[outcome.result.decision]++
  state.groundednessSum += outcome.result.groundednessScore
  state.pedagogicalSum += outcome.result.pedagogicalScore
  state.confidenceSum += outcome.result.confidence
  if (outcome.result.requiresHumanReview) state.requiresHumanReview++
  for (const issueCode of outcome.result.issueCodes) {
    increment(state.issueCodes, issueCode)
  }
}

export function getAiReviewerMetricsSnapshot() {
  const sampledWithLatency = state.reviewed + state.unavailable
  return {
    windowStartedAt: state.windowStartedAt,
    generatedAt: new Date().toISOString(),
    retention: {
      storage: 'in_memory_aggregate',
      latencySampleLimit: MAX_LATENCY_SAMPLES,
      contentStored: false,
    },
    totals: {
      eligible: state.eligible,
      sampled: state.sampled,
      skipped: state.skipped,
      reviewed: state.reviewed,
      unavailable: state.unavailable,
      requiresHumanReview: state.requiresHumanReview,
    },
    rates: {
      sampling: rate(state.sampled, state.eligible),
      availability: rate(state.reviewed, state.sampled),
      allow: rate(state.decisions.allow, state.reviewed),
      allowWithDisclaimer: rate(
        state.decisions.allow_with_disclaimer,
        state.reviewed,
      ),
      block: rate(state.decisions.block, state.reviewed),
    },
    decisions: { ...state.decisions },
    failures: { ...state.failures },
    riskLevels: { ...state.riskLevels },
    issueCodes: { ...state.issueCodes },
    averageScores: {
      groundedness:
        state.reviewed === 0
          ? null
          : Number((state.groundednessSum / state.reviewed).toFixed(4)),
      pedagogical:
        state.reviewed === 0
          ? null
          : Number((state.pedagogicalSum / state.reviewed).toFixed(4)),
      confidence:
        state.reviewed === 0
          ? null
          : Number((state.confidenceSum / state.reviewed).toFixed(4)),
    },
    latencyMs: {
      average:
        sampledWithLatency === 0
          ? null
          : Number((state.latencySum / sampledWithLatency).toFixed(2)),
      p50: percentile(state.latencySamples, 0.5),
      p95: percentile(state.latencySamples, 0.95),
      max: sampledWithLatency === 0 ? null : state.latencyMax,
      sampleCount: state.latencySamples.length,
    },
  }
}

export function resetAiReviewerMetricsForTests(): void {
  state = createState()
}

export const reviewerMetricsLimits = {
  maxLatencySamples: MAX_LATENCY_SAMPLES,
} as const
