import type { PrismaClient } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { RiskLevel } from '../review-gate'
import type {
  AiReviewerDecision,
  AiReviewerFailureCode,
  AiReviewerIssueCode,
  AiReviewerOutcome,
} from './types'
const MAX_QUERY_EVENTS = 10000

export interface ReviewerTelemetryEvent {
  status: 'skipped' | 'reviewed' | 'unavailable'
  riskLevel: RiskLevel
  decision?: AiReviewerDecision
  failureCode?: AiReviewerFailureCode
  issueCodes?: AiReviewerIssueCode[]
  requiresHumanReview?: boolean
  groundednessScore?: number
  pedagogicalScore?: number
  confidence?: number
  latencyMs?: number
  model?: string
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(Math.floor(parsed), max))
}

export function getReviewerTelemetryConfig(
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    enabled: env.AI_REVIEWER_PERSIST_METRICS === 'true',
    retentionDays: boundedInteger(
      env.AI_REVIEWER_METRICS_RETENTION_DAYS,
      30,
      1,
      365,
    ),
  }
}

export async function persistReviewerTelemetry(
  event: ReviewerTelemetryEvent,
  client: PrismaClient = prisma,
): Promise<void> {
  if (!getReviewerTelemetryConfig().enabled) return
  await client.aiReviewerTelemetry.create({
    data: {
      status: event.status,
      riskLevel: event.riskLevel,
      decision: event.decision,
      failureCode: event.failureCode,
      issueCodes: JSON.stringify(event.issueCodes || []),
      requiresHumanReview: event.requiresHumanReview || false,
      groundednessScore: event.groundednessScore,
      pedagogicalScore: event.pedagogicalScore,
      confidence: event.confidence,
      latencyMs:
        event.latencyMs === undefined
          ? undefined
          : Math.max(0, Math.floor(event.latencyMs)),
      model: event.model?.slice(0, 200),
    },
  })
}

export function telemetryEventFromOutcome(
  outcome: Exclude<AiReviewerOutcome, { status: 'disabled' }>,
  riskLevel: RiskLevel,
  model?: string,
): ReviewerTelemetryEvent {
  if (outcome.status === 'unavailable') {
    return {
      status: 'unavailable',
      riskLevel,
      failureCode: outcome.failureCode,
      latencyMs: outcome.latencyMs,
      model,
    }
  }
  return {
    status: 'reviewed',
    riskLevel,
    decision: outcome.result.decision,
    issueCodes: outcome.result.issueCodes,
    requiresHumanReview: outcome.result.requiresHumanReview,
    groundednessScore: outcome.result.groundednessScore,
    pedagogicalScore: outcome.result.pedagogicalScore,
    confidence: outcome.result.confidence,
    latencyMs: outcome.latencyMs,
    model,
  }
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Number((numerator / denominator).toFixed(4))
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
      4,
    ),
  )
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

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] || 0) + 1
}

export async function getPersistentReviewerMetricsSnapshot(
  client: PrismaClient = prisma,
) {
  const config = getReviewerTelemetryConfig()
  if (!config.enabled) {
    return {
      enabled: false,
      retention: {
        storage: 'sqlite_content_free_events',
        retentionDays: config.retentionDays,
        contentStored: false,
      },
    }
  }

  const since = new Date(
    Date.now() - config.retentionDays * 24 * 60 * 60 * 1000,
  )
  const rows = await client.aiReviewerTelemetry.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: MAX_QUERY_EVENTS,
  })

  const decisions: Record<string, number> = {}
  const failures: Record<string, number> = {}
  const riskLevels: Record<string, number> = {}
  const issueCodes: Record<string, number> = {}
  const models: Record<string, number> = {}
  const reviewed = rows.filter(row => row.status === 'reviewed')
  const unavailable = rows.filter(row => row.status === 'unavailable')
  const skipped = rows.filter(row => row.status === 'skipped')

  for (const row of rows) {
    increment(riskLevels, row.riskLevel)
    if (row.decision) increment(decisions, row.decision)
    if (row.failureCode) increment(failures, row.failureCode)
    if (row.model) increment(models, row.model)
    try {
      const parsed = JSON.parse(row.issueCodes)
      if (Array.isArray(parsed)) {
        for (const issue of parsed) {
          if (typeof issue === 'string') increment(issueCodes, issue)
        }
      }
    } catch {
      increment(failures, 'invalid_stored_issue_codes')
    }
  }

  const latency = rows
    .map(row => row.latencyMs)
    .filter((value): value is number => value !== null)
  const scores = {
    groundedness: reviewed
      .map(row => row.groundednessScore)
      .filter((value): value is number => value !== null),
    pedagogical: reviewed
      .map(row => row.pedagogicalScore)
      .filter((value): value is number => value !== null),
    confidence: reviewed
      .map(row => row.confidence)
      .filter((value): value is number => value !== null),
  }

  return {
    enabled: true,
    generatedAt: new Date().toISOString(),
    windowStartedAt: since.toISOString(),
    retention: {
      storage: 'sqlite_content_free_events',
      retentionDays: config.retentionDays,
      queryEventLimit: MAX_QUERY_EVENTS,
      contentStored: false,
    },
    totals: {
      eligible: rows.length,
      sampled: reviewed.length + unavailable.length,
      skipped: skipped.length,
      reviewed: reviewed.length,
      unavailable: unavailable.length,
      requiresHumanReview: reviewed.filter(
        row => row.requiresHumanReview,
      ).length,
    },
    rates: {
      sampling: rate(
        reviewed.length + unavailable.length,
        rows.length,
      ),
      availability: rate(
        reviewed.length,
        reviewed.length + unavailable.length,
      ),
    },
    decisions,
    failures,
    riskLevels,
    issueCodes,
    models,
    averageScores: {
      groundedness: average(scores.groundedness),
      pedagogical: average(scores.pedagogical),
      confidence: average(scores.confidence),
    },
    latencyMs: {
      average: average(latency),
      p50: percentile(latency, 0.5),
      p95: percentile(latency, 0.95),
      max: latency.length === 0 ? null : Math.max(...latency),
      sampleCount: latency.length,
    },
  }
}

export async function deleteExpiredReviewerTelemetry(
  client: PrismaClient = prisma,
): Promise<number> {
  const config = getReviewerTelemetryConfig()
  if (!config.enabled) return 0
  const before = new Date(
    Date.now() - config.retentionDays * 24 * 60 * 60 * 1000,
  )
  const result = await client.aiReviewerTelemetry.deleteMany({
    where: { createdAt: { lt: before } },
  })
  return result.count
}
