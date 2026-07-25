import { aiReviewerResultSchema } from './reviewer-schema'
import { buildReviewerMessages } from './reviewer-prompt'
import type { AiReviewerProvider } from './reviewer-provider'
import { applyReviewerRiskFloor } from './reviewer-risk-floor'
import type {
  AiReviewerConfig,
  AiReviewerFailureCode,
  AiReviewerOutcome,
  AiReviewerRequest,
  ReviewerEvidence,
} from './types'

const MAX_PROVIDER_RESPONSE_CHARS = 10000
const MAX_USER_MESSAGE_CHARS = 8000
const MAX_EVIDENCE_COUNT = 3
const MAX_EVIDENCE_ITEM_CHARS = 1800

class ReviewerTimeoutError extends Error {}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : value.slice(0, maxChars)
}

function boundEvidence(
  evidence: ReviewerEvidence[],
  maxTotalChars: number,
): ReviewerEvidence[] {
  const bounded: ReviewerEvidence[] = []
  let usedChars = 0

  for (const item of evidence) {
    if (bounded.length >= MAX_EVIDENCE_COUNT) break
    if (item.status !== 'published' || item.isDemo !== false) continue

    const remaining = maxTotalChars - usedChars
    if (remaining <= 0) break

    const excerpt = truncate(
      item.excerpt,
      Math.min(MAX_EVIDENCE_ITEM_CHARS, remaining),
    )
    if (!excerpt) continue

    bounded.push({
      ...item,
      excerpt,
      sourceRefs: item.sourceRefs.slice(0, 5).map(source => ({
        sourceId: truncate(source.sourceId, 120),
        title: truncate(source.title, 300),
        url: source.url ? truncate(source.url, 2000) : null,
        authorityLevel: truncate(source.authorityLevel, 40),
      })),
    })
    usedChars += excerpt.length
  }

  return bounded
}

function unavailable(
  failureCode: AiReviewerFailureCode,
  startedAt: number,
): AiReviewerOutcome {
  return {
    status: 'unavailable',
    failureCode,
    latencyMs: Date.now() - startedAt,
  }
}

export async function runAiReview(
  request: AiReviewerRequest,
  provider: AiReviewerProvider,
  config: AiReviewerConfig,
): Promise<AiReviewerOutcome> {
  if (!config.enabled) return { status: 'disabled' }

  const startedAt = Date.now()
  const boundedRequest: AiReviewerRequest = {
    userMessage: truncate(request.userMessage, MAX_USER_MESSAGE_CHARS),
    draft: truncate(request.draft, config.maxDraftChars),
    evidence: boundEvidence(request.evidence, config.maxEvidenceChars),
    riskLevel: request.riskLevel,
  }
  const allowedEvidenceIds = new Set(
    boundedRequest.evidence.map(item => item.id),
  )

  const abortController = new AbortController()
  let timeoutId: NodeJS.Timeout | undefined

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort()
        reject(new ReviewerTimeoutError('AI reviewer timed out'))
      }, config.timeoutMs)
    })

    const providerResult = await Promise.race([
      provider.review({
        messages: buildReviewerMessages(boundedRequest),
        model: config.model,
        timeoutMs: config.timeoutMs,
        abortSignal: abortController.signal,
      }),
      timeoutPromise,
    ])

    if (providerResult.content.length > MAX_PROVIDER_RESPONSE_CHARS) {
      return unavailable('reviewer_response_too_large', startedAt)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(providerResult.content)
    } catch {
      return unavailable('reviewer_invalid_json', startedAt)
    }

    const validated = aiReviewerResultSchema.safeParse(parsed)
    if (!validated.success) {
      return unavailable('reviewer_invalid_schema', startedAt)
    }

    if (
      validated.data.evidenceIds.some(id => !allowedEvidenceIds.has(id))
    ) {
      return unavailable('reviewer_invalid_evidence', startedAt)
    }

    return {
      status: 'reviewed',
      result: applyReviewerRiskFloor(boundedRequest, validated.data),
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    if (error instanceof ReviewerTimeoutError) {
      return unavailable('reviewer_timeout', startedAt)
    }
    return unavailable('reviewer_provider_error', startedAt)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export const reviewerLimits = {
  maxProviderResponseChars: MAX_PROVIDER_RESPONSE_CHARS,
  maxUserMessageChars: MAX_USER_MESSAGE_CHARS,
  maxEvidenceCount: MAX_EVIDENCE_COUNT,
  maxEvidenceItemChars: MAX_EVIDENCE_ITEM_CHARS,
} as const
