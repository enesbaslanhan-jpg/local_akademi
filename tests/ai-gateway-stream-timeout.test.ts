import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateStream } from '../src/services/ai-gateway'

const BASE_ENV = {
  AI_PROVIDER: 'ollama',
  OLLAMA_API_URL: 'http://127.0.0.1:11434/v1/chat/completions',
  OLLAMA_MODEL: 'test-model',
  AI_REQUEST_TIMEOUT_MS: '100',
  AI_REVIEW_GATE_ENABLED: 'false',
  AI_REVIEWER_ENABLED: 'false',
}

function createAbortError(): Error {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  return err
}

function createHangingFetch() {
  return vi.fn((_url: string, options: RequestInit) => {
    return new Promise<Response>((_, reject) => {
      const signal = options.signal as AbortSignal | undefined
      if (signal?.aborted) {
        reject(createAbortError())
        return
      }
      const onAbort = () => reject(createAbortError())
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  })
}

function createStreamingFetch(events: string[]) {
  return vi.fn((_url: string, _options: RequestInit) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`))
        }
        controller.close()
      }
    })
    return Promise.resolve(new Response(stream, { status: 200 }))
  })
}

async function collectStream(stream: AsyncGenerator<any>) {
  const events = []
  for await (const event of stream) {
    events.push(event)
  }
  return events
}

describe('AI Gateway streaming timeout', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ...BASE_ENV }
    vi.useFakeTimers()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('provider belirlenen süre boyunca cevap vermezse timeout olur ve error eventi döner', async () => {
    vi.stubGlobal('fetch', createHangingFetch())

    const stream = generateStream({
      messages: [{ role: 'user', content: 'test' }],
      abortSignal: new AbortController().signal,
      skipOutputReview: true,
    })

    const resultPromise = collectStream(stream)
    await vi.runOnlyPendingTimersAsync()

    const events = await resultPromise
    const errorEvent = events.find((e: any) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent.code).toBe('TIMEOUT')
  })

  it('kullanıcı AbortSignal ile isteği iptal ederse timeout olarak sınıflandırılmaz', async () => {
    vi.stubGlobal('fetch', createHangingFetch())

    const abortController = new AbortController()
    const stream = generateStream({
      messages: [{ role: 'user', content: 'test' }],
      abortSignal: abortController.signal,
      skipOutputReview: true,
    })

    const resultPromise = collectStream(stream)
    await Promise.resolve()
    abortController.abort()
    await vi.runOnlyPendingTimersAsync()

    const events = await resultPromise
    const errorEvent = events.find((e: any) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent.code).toBe('STREAM_ABORTED')
  })

  it('normal stream delta eventleri göndermeye devam eder ve timeout bozulmaz', async () => {
    vi.stubGlobal('fetch', createStreamingFetch([
      JSON.stringify({ choices: [{ delta: { content: 'Merhaba ' } }] }),
      JSON.stringify({ choices: [{ delta: { content: 'dünya!' } }] }),
      JSON.stringify({ choices: [{ finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }),
    ]))

    const stream = generateStream({
      messages: [{ role: 'user', content: 'test' }],
      abortSignal: new AbortController().signal,
      skipOutputReview: true,
    })

    const events = await collectStream(stream)
    const deltas = events.filter((e: any) => e.type === 'delta')
    const doneEvent = events.find((e: any) => e.type === 'done')

    expect(deltas.map((e: any) => e.delta)).toEqual(['Merhaba ', 'dünya!'])
    expect(doneEvent).toBeDefined()
    expect(doneEvent.tokenUsage).toEqual({ prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 })
  })

  it('timeout timerı başarılı stream sonrasında temizlenir ve sonraki istekler takılmaz', async () => {
    vi.stubGlobal('fetch', createStreamingFetch([
      JSON.stringify({ choices: [{ delta: { content: 'ok' } }] }),
      JSON.stringify({ choices: [{ finish_reason: 'stop' }] }),
    ]))

    const firstStream = generateStream({
      messages: [{ role: 'user', content: 'test' }],
      abortSignal: new AbortController().signal,
      skipOutputReview: true,
    })
    const firstEvents = await collectStream(firstStream)
    expect(firstEvents.some((e: any) => e.type === 'error')).toBe(false)

    // Run any leftover timers; a stale inactivity timer would fire here and could affect the next request.
    await vi.runOnlyPendingTimersAsync()

    const secondStream = generateStream({
      messages: [{ role: 'user', content: 'test' }],
      abortSignal: new AbortController().signal,
      skipOutputReview: true,
    })
    const secondEvents = await collectStream(secondStream)
    expect(secondEvents.some((e: any) => e.type === 'error')).toBe(false)
    expect(secondEvents.filter((e: any) => e.type === 'delta').length).toBeGreaterThan(0)
  })
})
