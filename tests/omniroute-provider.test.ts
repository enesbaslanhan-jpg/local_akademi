import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateCompletion,
  generateStream,
  getActiveAiRuntimeInfo,
} from '../src/services/ai-gateway'
import { callAiProviderWithRetry } from '../src/services/ai-provider'

const ORIGINAL_ENV_KEYS = [
  'AI_PROVIDER',
  'OMNIROUTE_BASE_URL',
  'OMNIROUTE_API_KEY',
  'OMNIROUTE_MODEL',
  'OLLAMA_API_URL',
  'OLLAMA_MODEL',
  'OLLAMA_TIMEOUT',
  'NVIDIA_API_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'MENTOR_AI_PROVIDER',
  'MENTOR_AI_MODEL',
] as const

const originalEnv: Record<string, string | undefined> = {}
for (const key of ORIGINAL_ENV_KEYS) originalEnv[key] = process.env[key]

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function setUpOmniRouteEnv(): void {
  process.env.AI_PROVIDER = 'auto'
  process.env.OMNIROUTE_BASE_URL = 'http://localhost:20128/v1'
  process.env.OMNIROUTE_API_KEY = 'omni-test-key'
  process.env.OMNIROUTE_MODEL = 'auto/best-free'
  delete process.env.OLLAMA_API_URL
  delete process.env.OLLAMA_MODEL
  delete process.env.NVIDIA_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.MENTOR_AI_PROVIDER
  delete process.env.MENTOR_AI_MODEL
}

function safeRequest(extra: Record<string, unknown> = {}) {
  return {
    messages: [{ role: 'user' as const, content: "Türkiye'deki KOBİ'ler için nakit akışı önemlidir. Girişimci ödeme planını düzenlemelidir." }],
    skipOutputReview: true,
    ...extra,
  }
}

describe('OmniRoute AI provider', () => {
  beforeEach(() => {
    setUpOmniRouteEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreEnv()
  })

  it('Bearer anahtarı ve non-stream body ile completion üretir, UTF-8 korunur', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('http://localhost:20128/v1/chat/completions')
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('Bearer omni-test-key')
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('auto/best-free')
      expect(body.stream).toBe(false)
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'KOBİ ve Girişimci için nakit akışı planı.' } }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest())

    expect(response.content).toBe('KOBİ ve Girişimci için nakit akışı planı.')
    expect(response.provider).toBe('omniroute')
    expect(response.model).toBe('auto/best-free')
    expect(response.usage.total_tokens).toBe(20)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('AI_PROVIDER=auto iken OMNIROUTE_API_KEY ile omniroute seçilir', async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: 'auto omniroute' } }], usage: {} }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest())
    expect(response.provider).toBe('omniroute')
    expect(response.model).toBe('auto/best-free')
  })

  it('isten bazına göre provider/model override edilir (news/mentor ayrımı)', async () => {
    process.env.AI_PROVIDER = 'ollama'
    process.env.OLLAMA_API_URL = 'http://127.0.0.1:11434/v1/chat/completions'
    process.env.OLLAMA_MODEL = 'qwen3:4b-instruct'
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe('http://localhost:20128/v1/chat/completions')
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('auto/best-free')
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'override çalıştı' } }], usage: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest({ provider: 'omniroute', model: 'auto/best-free' }))
    expect(response.provider).toBe('omniroute')
    expect(response.model).toBe('auto/best-free')
  })

  it('MENTOR_AI_PROVIDER/MENTOR_AI_MODEL env değerlerini callAiProviderWithRetry kullanır', async () => {
    process.env.MENTOR_AI_PROVIDER = 'omniroute'
    process.env.MENTOR_AI_MODEL = 'auto/best-free'
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('auto/best-free')
      expect(body.stream).toBe(false)
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Mock mentor yanıtı' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await callAiProviderWithRetry(
      [{ role: 'user', content: 'Nakit akışı nedir?' }],
      undefined,
      { skipOutputReview: true },
    )
    expect(result.provider).toBe('omniroute')
    expect(result.model).toBe('auto/best-free')
  })

  it('OmniRoute SSE akışını Türkçe karakterlerle eksiksiz iletir', async () => {
    const utf8Chunks = [
      'data: {"choices":[{"delta":{"content":"KOBİ "},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{"content":"akışı ve "},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{"content":"Girişimci planı"},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":4,"total_tokens":9}}',
      'data: [DONE]',
      '',
    ].join('\n')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(utf8Chunks, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })))

    const events: Array<{ type: string; delta?: string; provider?: string; model?: string }> = []
    for await (const event of generateStream(safeRequest())) {
      events.push(event as never)
    }
    expect(events[0]).toMatchObject({ type: 'provider', provider: 'omniroute', model: 'auto/best-free' })
    const content = events
      .filter(event => event.type === 'delta')
      .map(event => event.delta ?? '')
      .join('')
    expect(content).toBe('KOBİ akışı ve Girişimci planı')
    expect(
      events.filter(event => event.type === 'done'),
    ).toHaveLength(1)
  })

  it('OMNIROUTE_API_KEY yoksa istek göndermeden yapılandırma hatası döner', async () => {
    delete process.env.OMNIROUTE_API_KEY
    process.env.AI_PROVIDER = 'omniroute'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateCompletion(safeRequest())).rejects.toMatchObject({
      name: 'GatewayConfigError',
      message: 'MENTOR_API_KEY_MISSING:omniroute',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allowlist dışı provider override reddedilir', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateCompletion(safeRequest({ provider: 'olmayan-provider' })),
    ).rejects.toMatchObject({
      name: 'GatewayConfigError',
      message: expect.stringContaining('allowlist dışı'),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('OMNIROUTE_BASE_URL trailing slash ile de birleştirilir ve runtime bilgisi bulut döner', async () => {
    process.env.OMNIROUTE_BASE_URL = 'http://localhost:20128/v1/'
    const fetchMock = vi.fn(async (url: string | URL) => new Response(
      JSON.stringify({ choices: [{ message: { content: 'url' } }], usage: {} }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest())
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://localhost:20128/v1/chat/completions')
    expect(response.provider).toBe('omniroute')
    expect(getActiveAiRuntimeInfo()).toMatchObject({ provider: 'omniroute', executionType: 'cloud' })
  })

  it('OLLAMA env olsa bile MENTOR_AI_PROVIDER=omniroute runtime bilgisi OmniRoute/bulut döner', () => {
    process.env.MENTOR_AI_PROVIDER = 'omniroute'
    process.env.MENTOR_AI_MODEL = 'auto/best-free'
    process.env.OLLAMA_API_URL = 'http://127.0.0.1:11434/v1/chat/completions'
    process.env.OLLAMA_MODEL = 'qwen3:4b-instruct'

    expect(getActiveAiRuntimeInfo()).toMatchObject({
      provider: 'omniroute',
      model: 'auto/best-free',
      executionType: 'cloud',
    })
  })
})