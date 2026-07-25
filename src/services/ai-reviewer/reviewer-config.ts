import type { AiReviewerConfig, AiReviewerMode } from './types'

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(Math.floor(parsed), max))
}

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(parsed, max))
}

export function getAiReviewerConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiReviewerConfig {
  const requestedMode = env.AI_REVIEWER_MODE
  const disclaimerRolloutApproved =
    env.AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED === 'true'
  const mode: AiReviewerMode =
    requestedMode === 'disclaimer_only'
      ? disclaimerRolloutApproved
        ? 'disclaimer_only'
        : 'shadow'
      : requestedMode === 'enforce' || requestedMode === 'shadow'
        ? requestedMode
        : 'shadow'

  const model = env.AI_REVIEWER_MODEL?.trim()

  return {
    enabled: env.AI_REVIEWER_ENABLED === 'true',
    mode,
    disclaimerRolloutApproved,
    sampleRate: boundedNumber(env.AI_REVIEWER_SAMPLE_RATE, 0.1, 0, 1),
    timeoutMs: boundedInteger(env.AI_REVIEWER_TIMEOUT_MS, 8000, 250, 60000),
    maxDraftChars: boundedInteger(
      env.AI_REVIEWER_MAX_DRAFT_CHARS,
      20000,
      1000,
      40000,
    ),
    maxEvidenceChars: boundedInteger(
      env.AI_REVIEWER_MAX_EVIDENCE_CHARS,
      5400,
      500,
      12000,
    ),
    ...(model ? { model } : {}),
  }
}
