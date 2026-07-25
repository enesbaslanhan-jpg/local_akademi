import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  getAiReviewerMetricsSnapshot,
  recordAiReviewerOutcome,
  recordAiReviewerSkipped,
  resetAiReviewerMetricsForTests,
  reviewerMetricsLimits,
  shouldSampleAiReview,
} from '../src/services/ai-reviewer'

const reviewedOutcome = {
  status: 'reviewed' as const,
  latencyMs: 40,
  result: {
    decision: 'block' as const,
    issueCodes: ['unsupported_claim' as const],
    groundednessScore: 0.4,
    pedagogicalScore: 0.8,
    confidence: 0.9,
    evidenceIds: [1],
    requiresHumanReview: true,
    safeReasonCode: 'unsupported_claim',
  },
}

describe('AI reviewer deterministic pilot sampling', () => {
  it('handles zero and full sampling boundaries', () => {
    expect(shouldSampleAiReview('request-1', 0)).toBe(false)
    expect(shouldSampleAiReview('request-1', 1)).toBe(true)
  })

  it('returns the same decision for the same request ID', () => {
    const first = shouldSampleAiReview('stable-request-id', 0.1)
    for (let index = 0; index < 20; index++) {
      expect(shouldSampleAiReview('stable-request-id', 0.1)).toBe(first)
    }
  })

  it('distributes a ten percent sample across deterministic IDs', () => {
    const sampled = Array.from({ length: 1000 }, (_, index) =>
      shouldSampleAiReview(`request-${index}`, 0.1),
    ).filter(Boolean).length
    expect(sampled).toBeGreaterThanOrEqual(70)
    expect(sampled).toBeLessThanOrEqual(130)
  })
})

describe('AI reviewer bounded aggregate metrics', () => {
  beforeEach(() => {
    resetAiReviewerMetricsForTests()
  })

  it('aggregates decisions, failures, risks and scores without content', () => {
    recordAiReviewerSkipped('low')
    recordAiReviewerOutcome(reviewedOutcome, 'high')
    recordAiReviewerOutcome(
      {
        status: 'unavailable',
        failureCode: 'reviewer_timeout',
        latencyMs: 100,
      },
      'medium',
    )

    const snapshot = getAiReviewerMetricsSnapshot()
    expect(snapshot.totals).toEqual({
      eligible: 3,
      sampled: 2,
      skipped: 1,
      reviewed: 1,
      unavailable: 1,
      requiresHumanReview: 1,
    })
    expect(snapshot.decisions.block).toBe(1)
    expect(snapshot.failures.reviewer_timeout).toBe(1)
    expect(snapshot.riskLevels).toEqual({ low: 1, medium: 1, high: 1 })
    expect(snapshot.issueCodes.unsupported_claim).toBe(1)
    expect(snapshot.averageScores).toEqual({
      groundedness: 0.4,
      pedagogical: 0.8,
      confidence: 0.9,
    })
    expect(snapshot.retention.contentStored).toBe(false)
    expect(JSON.stringify(snapshot)).not.toContain('userMessage')
    expect(JSON.stringify(snapshot)).not.toContain('draft')
  })

  it('keeps only the bounded latency sample window', () => {
    for (
      let index = 0;
      index < reviewerMetricsLimits.maxLatencySamples + 25;
      index++
    ) {
      recordAiReviewerOutcome(
        { ...reviewedOutcome, latencyMs: index },
        'low',
      )
    }
    const snapshot = getAiReviewerMetricsSnapshot()
    expect(snapshot.totals.reviewed).toBe(
      reviewerMetricsLimits.maxLatencySamples + 25,
    )
    expect(snapshot.latencyMs.sampleCount).toBe(
      reviewerMetricsLimits.maxLatencySamples,
    )
  })
})

describe('GET /admin/ai-reviewer/metrics', () => {
  let app: FastifyInstance
  let adminToken: string
  let learnerToken: string
  const originalSampleRate = process.env.AI_REVIEWER_SAMPLE_RATE

  beforeAll(async () => {
    process.env.AI_REVIEWER_SAMPLE_RATE = '0.25'
    app = Fastify({ logger: false })
    await app.register(jwt, {
      secret: 'test-secret-key-min-32-bytes-long!!',
    })
    app.decorate(
      'authenticate',
      async function authenticate(request: any): Promise<void> {
        await request.jwtVerify()
      },
    )
    const { adminRoutes } = await import('../src/services/admin')
    await app.register(adminRoutes, { prefix: '/admin' })
    await app.ready()
    adminToken = app.jwt.sign({
      id: 1,
      email: 'admin@test.local',
      role: 'admin',
    })
    learnerToken = app.jwt.sign({
      id: 2,
      email: 'learner@test.local',
      role: 'learner',
    })
  })

  beforeEach(() => {
    resetAiReviewerMetricsForTests()
    recordAiReviewerOutcome(reviewedOutcome, 'high')
  })

  afterAll(async () => {
    if (originalSampleRate === undefined) {
      delete process.env.AI_REVIEWER_SAMPLE_RATE
    } else {
      process.env.AI_REVIEWER_SAMPLE_RATE = originalSampleRate
    }
    await app.close()
  })

  it('requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/ai-reviewer/metrics',
    })
    expect(response.statusCode).toBe(401)
  })

  it('rejects non-admin users', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/ai-reviewer/metrics',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    expect(response.statusCode).toBe(403)
  })

  it('returns content-free pilot metrics to admins', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/ai-reviewer/metrics',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.reviewer).toMatchObject({
      effectiveMode: 'shadow',
      sampleRate: 0.25,
    })
    expect(body.metrics.totals.reviewed).toBe(1)
    expect(body.metrics.retention.contentStored).toBe(false)
    expect(JSON.stringify(body)).not.toContain('userMessage')
    expect(JSON.stringify(body)).not.toContain('draft')
  })

  it('protects the reviewer health endpoint', async () => {
    const unauthenticated = await app.inject({
      method: 'GET',
      url: '/admin/ai-reviewer/health',
    })
    expect(unauthenticated.statusCode).toBe(401)

    const forbidden = await app.inject({
      method: 'GET',
      url: '/admin/ai-reviewer/health',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    expect(forbidden.statusCode).toBe(403)

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      models: [{ name: 'qwen3:4b-instruct' }],
    }), { status: 200 }))
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/ai-reviewer/health',
        headers: { authorization: `Bearer ${adminToken}` },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveProperty('queue')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
