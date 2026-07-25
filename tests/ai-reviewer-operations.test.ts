import { PrismaClient } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AiReviewerQueue,
  getPersistentReviewerMetricsSnapshot,
  getReviewerOllamaHealth,
  getReviewerQueueConfig,
  persistReviewerTelemetry,
} from '../src/services/ai-reviewer'

const originalEnv = {
  AI_REVIEWER_QUEUE_CONCURRENCY:
    process.env.AI_REVIEWER_QUEUE_CONCURRENCY,
  AI_REVIEWER_QUEUE_MAX_PENDING:
    process.env.AI_REVIEWER_QUEUE_MAX_PENDING,
  AI_REVIEWER_PROVIDER: process.env.AI_REVIEWER_PROVIDER,
  AI_REVIEWER_MODEL: process.env.AI_REVIEWER_MODEL,
  OLLAMA_API_URL: process.env.OLLAMA_API_URL,
  AI_REVIEWER_PERSIST_METRICS:
    process.env.AI_REVIEWER_PERSIST_METRICS,
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  restoreEnv()
  vi.restoreAllMocks()
})

describe('AI reviewer bounded queue', () => {
  it('bounds configuration values', () => {
    expect(getReviewerQueueConfig({
      AI_REVIEWER_QUEUE_CONCURRENCY: '99',
      AI_REVIEWER_QUEUE_MAX_PENDING: '-2',
    })).toEqual({
      concurrency: 4,
      maxPending: 0,
    })
  })

  it('rejects overflow and drains pending work', async () => {
    process.env.AI_REVIEWER_QUEUE_CONCURRENCY = '1'
    process.env.AI_REVIEWER_QUEUE_MAX_PENDING = '1'
    const queue = new AiReviewerQueue()
    let releaseFirst!: () => void
    const first = new Promise<void>(resolve => {
      releaseFirst = resolve
    })
    const completed: string[] = []

    expect(queue.enqueue(async () => {
      await first
      completed.push('first')
    })).toBe(true)
    expect(queue.enqueue(async () => {
      completed.push('second')
    })).toBe(true)
    expect(queue.enqueue(async () => {
      completed.push('overflow')
    })).toBe(false)
    expect(queue.snapshot()).toMatchObject({
      active: 1,
      pending: 1,
      rejected: 1,
    })

    releaseFirst()
    await vi.waitFor(() => {
      expect(completed).toEqual(['first', 'second'])
    })
    expect(queue.snapshot()).toMatchObject({
      active: 0,
      pending: 0,
      completed: 2,
    })
  })
})

describe('AI reviewer Ollama health', () => {
  it('reports a configured local model without exposing API content', async () => {
    process.env.AI_REVIEWER_PROVIDER = 'ollama'
    process.env.AI_REVIEWER_MODEL = 'qwen3:4b-instruct'
    process.env.OLLAMA_API_URL =
      'http://127.0.0.1:11434/v1/chat/completions'
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      models: [{ name: 'qwen3:4b-instruct' }],
    }), { status: 200 }))

    const health = await getReviewerOllamaHealth()
    expect(health).toMatchObject({
      configured: true,
      reachable: true,
      model: 'qwen3:4b-instruct',
      modelAvailable: true,
    })
    expect(JSON.stringify(health)).not.toContain('messages')
  })

  it('refuses a non-loopback Ollama health URL', async () => {
    process.env.AI_REVIEWER_PROVIDER = 'ollama'
    process.env.OLLAMA_API_URL =
      'https://untrusted.example/v1/chat/completions'
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const health = await getReviewerOllamaHealth()
    expect(health).toMatchObject({
      reachable: false,
      errorCode: 'OLLAMA_NON_LOOPBACK_URL',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('AI reviewer persistent content-free telemetry', () => {
  it('stores only bounded operational fields', async () => {
    process.env.AI_REVIEWER_PERSIST_METRICS = 'true'
    const prisma = new PrismaClient()
    const model = `telemetry-test-${Date.now()}`
    try {
      await persistReviewerTelemetry({
        status: 'reviewed',
        riskLevel: 'high',
        decision: 'block',
        issueCodes: ['prompt_injection'],
        requiresHumanReview: true,
        groundednessScore: 0.4,
        pedagogicalScore: 0.8,
        confidence: 0.95,
        latencyMs: 42,
        model,
      }, prisma)

      const row = await prisma.aiReviewerTelemetry.findFirstOrThrow({
        where: { model },
      })
      expect(row).toMatchObject({
        status: 'reviewed',
        riskLevel: 'high',
        decision: 'block',
        model,
      })
      expect(Object.keys(row)).not.toEqual(
        expect.arrayContaining([
          'userId',
          'requestId',
          'userMessage',
          'draft',
          'evidence',
        ]),
      )

      const snapshot = await getPersistentReviewerMetricsSnapshot(prisma)
      expect(snapshot.retention.contentStored).toBe(false)
      expect(JSON.stringify(snapshot)).not.toContain('userMessage')
      expect(JSON.stringify(snapshot)).not.toContain('draft')
    } finally {
      await prisma.aiReviewerTelemetry.deleteMany({ where: { model } })
      await prisma.$disconnect()
    }
  })
})
