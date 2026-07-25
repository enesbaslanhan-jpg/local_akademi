import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AiReviewerProvider,
  AiReviewerResult,
} from '../src/services/ai-reviewer'
import {
  aiReviewerQueue,
  getAiReviewerMetricsSnapshot,
  resetAiReviewerMetricsForTests,
} from '../src/services/ai-reviewer'
import type { KnowledgeObjectResult } from '../src/services/retrieval'

const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_API_URL: process.env.OPENAI_API_URL,
  AI_REVIEW_GATE_ENABLED: process.env.AI_REVIEW_GATE_ENABLED,
  AI_REVIEWER_ENABLED: process.env.AI_REVIEWER_ENABLED,
  AI_REVIEWER_MODE: process.env.AI_REVIEWER_MODE,
  AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED:
    process.env.AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED,
  AI_REVIEWER_SAMPLE_RATE: process.env.AI_REVIEWER_SAMPLE_RATE,
  AI_REVIEWER_TIMEOUT_MS: process.env.AI_REVIEWER_TIMEOUT_MS,
  AI_REVIEWER_PROVIDER: process.env.AI_REVIEWER_PROVIDER,
  AI_REVIEWER_MODEL: process.env.AI_REVIEWER_MODEL,
  OLLAMA_API_URL: process.env.OLLAMA_API_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  AI_REVIEWER_PERSIST_METRICS:
    process.env.AI_REVIEWER_PERSIST_METRICS,
}

const allowResult: AiReviewerResult = {
  decision: 'allow',
  issueCodes: [],
  groundednessScore: 0.9,
  pedagogicalScore: 0.85,
  confidence: 0.9,
  evidenceIds: [],
  requiresHumanReview: false,
  safeReasonCode: 'grounded_answer',
}

function completionResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 2,
        completion_tokens: 3,
        total_tokens: 5,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function reviewerResponse(result: AiReviewerResult): Response {
  return completionResponse(JSON.stringify(result))
}

function streamResponse(parts: string[]): Response {
  const body =
    parts
      .map(
        (part, index) =>
          `data: ${JSON.stringify({
            choices: [
              {
                delta: { content: part },
                finish_reason: index === parts.length - 1 ? 'stop' : null,
              },
            ],
            ...(index === parts.length - 1
              ? {
                  usage: {
                    prompt_tokens: 1,
                    completion_tokens: parts.length,
                    total_tokens: parts.length + 1,
                  },
                }
              : {}),
          })}\n\n`,
      )
      .join('') + 'data: [DONE]\n\n'
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

function mockReviewer(
  result: AiReviewerResult | Error,
): AiReviewerProvider & { review: ReturnType<typeof vi.fn> } {
  const review = vi.fn(async () => {
    if (result instanceof Error) throw result
    return { content: JSON.stringify(result) }
  })
  return { review }
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('AI reviewer gateway shadow integration', () => {
  beforeEach(() => {
    aiReviewerQueue.resetForTests()
    resetAiReviewerMetricsForTests()
    process.env.AI_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_API_URL = 'https://reviewer.test/v1/chat/completions'
    process.env.AI_REVIEW_GATE_ENABLED = 'true'
    process.env.AI_REVIEWER_ENABLED = 'true'
    process.env.AI_REVIEWER_MODE = 'shadow'
    process.env.AI_REVIEWER_SAMPLE_RATE = '1'
    process.env.AI_REVIEWER_TIMEOUT_MS = '1000'
    process.env.AI_REVIEWER_PERSIST_METRICS = 'false'
  })

  afterEach(() => {
    restoreEnv()
    vi.restoreAllMocks()
  })

  it('keeps non-streaming content unchanged when shadow reviewer blocks', async () => {
    globalThis.fetch = vi.fn(async () => completionResponse('Güvenli taslak'))
    const reviewer = mockReviewer({
      ...allowResult,
      decision: 'block',
      issueCodes: ['unsupported_claim'],
      safeReasonCode: 'unsupported_claim',
    })
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Sorumu yanıtla' }],
      requestId: 'shadow-block',
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('Güvenli taslak')
    expect(reviewer.review).toHaveBeenCalledOnce()
    await vi.waitFor(() => {
      expect(
        info.mock.calls.some(
          call =>
            String(call[1]).includes('"reviewerDecision":"block"') &&
            String(call[1]).includes('"reviewerMode":"shadow"'),
        ),
      ).toBe(true)
    })
  })

  it('does not delay the non-streaming response while reviewer is pending', async () => {
    globalThis.fetch = vi.fn(async () => completionResponse('Hızlı ana yanıt'))
    const reviewer: AiReviewerProvider = {
      review: vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return { content: JSON.stringify(allowResult) }
      }),
    }
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const result = await Promise.race([
      generateCompletion({
        messages: [{ role: 'user', content: 'Normal soru' }],
        reviewerProvider: reviewer,
      }),
      new Promise<'timed-out'>(resolve =>
        setTimeout(() => resolve('timed-out'), 100),
      ),
    ])

    expect(result).not.toBe('timed-out')
    expect(typeof result === 'string' ? result : result.content).toBe(
      'Hızlı ana yanıt',
    )
    await vi.waitFor(
      () => {
        expect(getAiReviewerMetricsSnapshot().totals.reviewed).toBe(1)
      },
      { timeout: 1000 },
    )
  })

  it('keeps content unchanged when the shadow reviewer is unavailable', async () => {
    globalThis.fetch = vi.fn(async () => completionResponse('Normal yanıt'))
    const reviewer = mockReviewer(new Error('private provider failure'))
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      requestId: 'shadow-unavailable',
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('Normal yanıt')
    await vi.waitFor(() => {
      expect(JSON.stringify(info.mock.calls)).toContain(
        'reviewer_provider_error',
      )
    })
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      'private provider failure',
    )
  })

  it('does not invoke the reviewer after deterministic output blocking', async () => {
    globalThis.fetch = vi.fn(async () => completionResponse('Bana şifreni ver'))
    const reviewer = mockReviewer(allowResult)
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('')
    expect(response.reviewResult?.decision).toBe('block')
    expect(reviewer.review).not.toHaveBeenCalled()
  })

  it('does not invoke the reviewer when output review is explicitly skipped', async () => {
    globalThis.fetch = vi.fn(async () => completionResponse('Doğrudan yanıt'))
    const reviewer = mockReviewer(allowResult)
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      skipOutputReview: true,
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('Doğrudan yanıt')
    expect(reviewer.review).not.toHaveBeenCalled()
  })

  it('remains observation-only even if enforce is requested in stage 2', async () => {
    process.env.AI_REVIEWER_MODE = 'enforce'
    globalThis.fetch = vi.fn(async () => completionResponse('Korunan taslak'))
    const reviewer = mockReviewer({
      ...allowResult,
      decision: 'block',
      issueCodes: ['poor_pedagogy'],
      safeReasonCode: 'poor_pedagogy',
    })
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('Korunan taslak')
  })

  it('adds a warning in explicitly approved disclaimer-only mode', async () => {
    process.env.AI_REVIEWER_MODE = 'disclaimer_only'
    process.env.AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED = 'true'
    globalThis.fetch = vi.fn(async () => completionResponse('Korunan taslak'))
    const reviewer = mockReviewer({
      ...allowResult,
      decision: 'allow_with_disclaimer',
      issueCodes: ['financial_advice'],
      requiresHumanReview: true,
      safeReasonCode: 'financial_advice',
    })
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      reviewerProvider: reviewer,
    })

    expect(response.content).toContain('Korunan taslak')
    expect(response.content).toContain('resmî kaynağı kontrol edin')
    expect(reviewer.review).toHaveBeenCalledOnce()
  })

  it('warns instead of exposing reviewer internals when disclaimer-only blocks a stream', async () => {
    process.env.AI_REVIEWER_MODE = 'disclaimer_only'
    process.env.AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED = 'true'
    globalThis.fetch = vi.fn(async () => streamResponse(['Taslak ', 'yanıt']))
    const reviewer = mockReviewer({
      ...allowResult,
      decision: 'block',
      issueCodes: ['unsupported_claim'],
      requiresHumanReview: true,
      safeReasonCode: 'unsupported_claim',
    })
    const { generateStream } = await import('../src/services/ai-gateway')

    const events: Array<Record<string, unknown>> = []
    for await (const event of generateStream({
      messages: [{ role: 'user', content: 'Normal soru' }],
      reviewerProvider: reviewer,
    })) {
      events.push(event as unknown as Record<string, unknown>)
    }

    const content = events
      .filter(event => event.type === 'delta')
      .map(event => event.delta)
      .join('')
    expect(content).toContain('Taslak yanıt')
    expect(content).toContain('Bu bilgiye dayanarak işlem yapmayın')
    expect(content).not.toContain('unsupported_claim')
    expect(events.filter(event => event.type === 'done')).toHaveLength(1)
    expect(events.filter(event => event.type === 'error')).toHaveLength(0)
  })

  it('reviews the complete streaming draft without changing the output', async () => {
    globalThis.fetch = vi.fn(async () => streamResponse(['Merhaba ', 'dünya']))
    const reviewer = mockReviewer({
      ...allowResult,
      decision: 'block',
      issueCodes: ['irrelevant_answer'],
      safeReasonCode: 'irrelevant_answer',
    })
    const { generateStream } = await import('../src/services/ai-gateway')

    const events: Array<Record<string, unknown>> = []
    for await (const event of generateStream({
      messages: [{ role: 'user', content: 'Selam' }],
      requestId: 'shadow-stream',
      reviewerProvider: reviewer,
    })) {
      events.push(event as unknown as Record<string, unknown>)
    }

    const deltas = events.filter(event => event.type === 'delta')
    expect(deltas.map(event => event.delta).join('')).toBe('Merhaba dünya')
    expect(events.filter(event => event.type === 'done')).toHaveLength(1)
    expect(reviewer.review).toHaveBeenCalledOnce()
    const providerRequest = reviewer.review.mock.calls[0][0]
    const reviewerPayload = JSON.parse(
      providerRequest.messages[1].content.split('\n')[1],
    )
    expect(reviewerPayload.draft).toBe('Merhaba dünya')
  })

  it('preserves immediate streaming chunks when deterministic gate is disabled', async () => {
    process.env.AI_REVIEW_GATE_ENABLED = 'false'
    globalThis.fetch = vi.fn(async () => streamResponse(['A', 'B']))
    const reviewer = mockReviewer(allowResult)
    const { generateStream } = await import('../src/services/ai-gateway')

    const events: Array<Record<string, unknown>> = []
    for await (const event of generateStream({
      messages: [{ role: 'user', content: 'Selam' }],
      reviewerProvider: reviewer,
    })) {
      events.push(event as unknown as Record<string, unknown>)
    }

    const deltas = events.filter(event => event.type === 'delta')
    expect(deltas.map(event => event.delta)).toEqual(['A', 'B'])
    expect(events.filter(event => event.type === 'done')).toHaveLength(1)
    expect(reviewer.review).toHaveBeenCalledOnce()
  })

  it('uses the isolated direct transport and passes bounded KO evidence', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completionResponse('KDV hakkında güvenli yanıt'))
      .mockResolvedValueOnce(
        reviewerResponse({
          ...allowResult,
          evidenceIds: [10],
        }),
      )
    globalThis.fetch = fetchMock
    const { callAiProviderWithRetry } = await import('../src/services/ai-provider')
    const knowledgeObject: KnowledgeObjectResult = {
      id: 10,
      title: 'KDV Rehberi',
      code: 'KO-010',
      content: 'Resmî KDV açıklaması',
      category: { name: 'Vergi' },
      score: 100,
      matchedTerms: ['kdv'],
      sourceRefs: [
        {
          sourceId: 'gib',
          title: 'Gelir İdaresi Başkanlığı',
          url: 'https://gib.gov.tr',
          authorityLevel: 'official',
        },
      ],
    }

    const response = await callAiProviderWithRetry(
      [{ role: 'user', content: 'KDV nedir?' }],
      [knowledgeObject],
    )

    expect(response.content).toContain('KDV hakkında güvenli yanıt')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const reviewerBody = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    )
    expect(reviewerBody.messages[0].content).toContain('kalite denetçisisin')
    const reviewerPayload = JSON.parse(
      reviewerBody.messages[1].content.split('\n')[1],
    )
    expect(reviewerPayload.evidence[0]).toMatchObject({
      id: 10,
      excerpt: 'Resmî KDV açıklaması',
    })
  })

  it('routes only the reviewer call to local Ollama without an API key', async () => {
    process.env.AI_REVIEWER_PROVIDER = 'ollama'
    process.env.AI_REVIEWER_MODEL = 'qwen3:4b-instruct'
    process.env.OLLAMA_API_URL =
      'http://127.0.0.1:11434/v1/chat/completions'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completionResponse('Main provider response'))
      .mockResolvedValueOnce(reviewerResponse(allowResult))
    globalThis.fetch = fetchMock
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal question' }],
      requestId: 'ollama-reviewer',
    })

    expect(response.content).toBe('Main provider response')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://reviewer.test/v1/chat/completions',
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://127.0.0.1:11434/v1/chat/completions',
    )
    const reviewerOptions = fetchMock.mock.calls[1][1] as RequestInit
    expect(reviewerOptions.headers).toEqual({
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(reviewerOptions.body)).model).toBe(
      'qwen3:4b-instruct',
    )
  })

  it('does not make a second provider call while reviewer is disabled', async () => {
    process.env.AI_REVIEWER_ENABLED = 'false'
    const fetchMock = vi.fn(async () => completionResponse('Tek çağrı yanıtı'))
    globalThis.fetch = fetchMock
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
    })

    expect(response.content).toBe('Tek çağrı yanıtı')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('skips provider cost and records an aggregate when sample rate is zero', async () => {
    process.env.AI_REVIEWER_SAMPLE_RATE = '0'
    globalThis.fetch = vi.fn(async () => completionResponse('Örnekleme yanıtı'))
    const reviewer = mockReviewer(allowResult)
    const { generateCompletion } = await import('../src/services/ai-gateway')

    const response = await generateCompletion({
      messages: [{ role: 'user', content: 'Normal soru' }],
      requestId: 'not-sampled',
      reviewerProvider: reviewer,
    })

    expect(response.content).toBe('Örnekleme yanıtı')
    expect(reviewer.review).not.toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(getAiReviewerMetricsSnapshot().totals.skipped).toBe(1)
    })
  })
})
