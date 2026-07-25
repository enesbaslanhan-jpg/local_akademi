import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateCompletion,
  generateStream,
} from '../src/services/ai-gateway'

const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  OLLAMA_API_URL: process.env.OLLAMA_API_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  OLLAMA_TIMEOUT: process.env.OLLAMA_TIMEOUT,
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function safeRequest() {
  return {
    messages: [{ role: 'user' as const, content: 'Nakit akışı nedir?' }],
    skipOutputReview: true,
  }
}

describe('Ollama primary AI provider', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'ollama'
    process.env.OLLAMA_API_URL =
      'http://127.0.0.1:11434/v1/chat/completions'
    process.env.OLLAMA_MODEL = 'qwen3:4b-instruct'
    process.env.OLLAMA_TIMEOUT = '120000'
    delete process.env.NVIDIA_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreEnv()
  })

  it('API anahtarı olmadan yerel completion üretir', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.has('Authorization')).toBe(false)
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('qwen3:4b-instruct')
      expect(body.stream).toBe(false)

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Yerel Ollama yanıtı' } }],
          usage: {
            prompt_tokens: 4,
            completion_tokens: 3,
            total_tokens: 7,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest())

    expect(response.content).toBe('Yerel Ollama yanıtı')
    expect(response.provider).toBe('ollama')
    expect(response.model).toBe('qwen3:4b-instruct')
    expect(response.usage.total_tokens).toBe(7)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('yerel OpenAI uyumlu SSE akışını iletir', async () => {
    const streamBody = [
      'data: {"choices":[{"delta":{"content":"Yerel "},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{"content":"yanıt"},"finish_reason":null}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":2,"total_tokens":4}}',
      'data: [DONE]',
      '',
    ].join('\n')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(streamBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )

    const events = []
    for await (const event of generateStream(safeRequest())) {
      events.push(event)
    }

    expect(events[0]).toEqual({
      type: 'provider',
      provider: 'ollama',
      model: 'qwen3:4b-instruct',
    })
    expect(
      events
        .filter((event) => event.type === 'delta')
        .map((event) => (event.type === 'delta' ? event.delta : ''))
        .join(''),
    ).toBe('Yerel yanıt')
    expect(events.filter((event) => event.type === 'done')).toHaveLength(1)
  })

  it('auto modda yapılandırılmış Ollama bulut anahtarlarından önce seçilir', async () => {
    process.env.AI_PROVIDER = 'auto'
    process.env.NVIDIA_API_KEY = 'test-nvidia-key'
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.has('Authorization')).toBe(false)
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Auto Ollama' } }],
          usage: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateCompletion(safeRequest())

    expect(response.provider).toBe('ollama')
  })

  it('uzak Ollama adresini istek göndermeden reddeder', async () => {
    process.env.OLLAMA_API_URL =
      'https://ollama.example.com/v1/chat/completions'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateCompletion(safeRequest())).rejects.toMatchObject({
      name: 'GatewayConfigError',
      message: 'OLLAMA_NON_LOOPBACK_URL',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('geçersiz Ollama adresini güvenli yapılandırma hatasıyla reddeder', async () => {
    process.env.OLLAMA_API_URL = 'not-a-url'

    await expect(generateCompletion(safeRequest())).rejects.toMatchObject({
      name: 'GatewayConfigError',
      message: 'OLLAMA_INVALID_URL',
    })
  })
})
