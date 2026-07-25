import { describe, expect, it, vi } from 'vitest'
import {
  AiReviewerQueue,
  formatAiReviewerDisclaimerContent,
  getAiReviewerConfig,
} from '../src/services/ai-reviewer'
import type { AiReviewerOutcome } from '../src/services/ai-reviewer'

const reviewed = (
  decision: 'allow' | 'allow_with_disclaimer' | 'block',
): AiReviewerOutcome => ({
  status: 'reviewed',
  latencyMs: 10,
  result: {
    decision,
    issueCodes: [],
    groundednessScore: 1,
    pedagogicalScore: 1,
    confidence: 1,
    evidenceIds: [],
    requiresHumanReview: decision !== 'allow',
    safeReasonCode: 'test',
  },
})

describe('AI reviewer disclaimer-only rollout', () => {
  it('requires the explicit human approval flag', () => {
    expect(
      getAiReviewerConfig({
        AI_REVIEWER_MODE: 'disclaimer_only',
      }).mode,
    ).toBe('shadow')
    expect(
      getAiReviewerConfig({
        AI_REVIEWER_MODE: 'disclaimer_only',
        AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED: 'true',
      }).mode,
    ).toBe('disclaimer_only')
  })

  it('does not change allowed or unavailable output', () => {
    expect(
      formatAiReviewerDisclaimerContent('Yanıt', reviewed('allow')),
    ).toBe('Yanıt')
    expect(
      formatAiReviewerDisclaimerContent('Yanıt', {
        status: 'unavailable',
        failureCode: 'reviewer_timeout',
        latencyMs: 10,
      }),
    ).toBe('Yanıt')
  })

  it('adds bounded standard and high-risk disclaimers without leaking reasons', () => {
    const standard = formatAiReviewerDisclaimerContent(
      'Yanıt',
      reviewed('allow_with_disclaimer'),
    )
    const blocked = formatAiReviewerDisclaimerContent(
      'Yanıt',
      reviewed('block'),
    )
    expect(standard).toContain('resmî kaynağı kontrol edin')
    expect(blocked).toContain('Bu bilgiye dayanarak işlem yapmayın')
    expect(blocked).not.toContain('test')
  })

  it('supports bounded awaitable queue execution', async () => {
    const queue = new AiReviewerQueue()
    const result = await queue.execute(async () => 42)
    expect(result).toEqual({ accepted: true, result: 42 })
    await vi.waitFor(() => {
      expect(queue.snapshot()).toMatchObject({
        active: 0,
        completed: 1,
      })
    })
  })
})
