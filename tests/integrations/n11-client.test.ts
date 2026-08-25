import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { N11Client, redactN11Credentials } from '../../src/services/integrations/marketplaces/n11/N11Client.js'
import { N11ClientError } from '../../src/services/integrations/marketplaces/n11/N11Errors.js'

/*
 * N11 CLIENT unit testleri — resmi auth modeli (header appkey/appsecret)
 * + hata siniflama. Gercek ag cagrisi YOK: global fetch mock'lanir.
 */

const CONFIG = {
  appKey: 'n11-app-key-12345678',
  appSecret: 'n11-app-secret-87654321'
}

const originalFetch = global.fetch

function mockFetchOnce(status: number, body: string | object, headers?: Record<string, string>) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  global.fetch = vi.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    if (status >= 200 && status < 300) {
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })
    }
    return new Response('error-body', { status, headers })
  }) as any
  return calls
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  global.fetch = originalFetch
  delete process.env.N11_BASE_URL
})

describe('N11Client — auth & headers', () => {
  it('sends appkey + appsecret as headers (resmi auth modeli)', async () => {
    const calls = mockFetchOnce(200, { content: [] })
    const client = new N11Client(CONFIG)
    await client.request('GET', '/ms/product-query', { page: 0, size: 1 })

    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.appkey).toBe(CONFIG.appKey)
    expect(headers.appsecret).toBe(CONFIG.appSecret)
    expect(calls[0].url).toContain('https://api.n11.com/ms/product-query')
    expect(calls[0].url).toContain('page=0')
    expect(calls[0].url).toContain('size=1')
  })

  it('targets the official production host by default', async () => {
    const calls = mockFetchOnce(200, { content: [] })
    const client = new N11Client(CONFIG)
    await client.request('GET', '/rest/delivery/v1/shipmentPackages')
    expect(calls[0].url).toContain('https://api.n11.com/rest/delivery/v1/shipmentPackages')
  })

  it('serializes query params and drops empty values', async () => {
    const calls = mockFetchOnce(200, { content: [] })
    const client = new N11Client(CONFIG)
    await client.request('GET', '/x', { page: 2, size: 100, status: 'Created', empty: '' })
    expect(calls[0].url).toContain('page=2')
    expect(calls[0].url).toContain('size=100')
    expect(calls[0].url).toContain('status=Created')
    expect(calls[0].url).not.toContain('empty=')
  })
})

describe('N11Client — error mapping', () => {
  it('401 -> AUTH without retry', async () => {
    mockFetchOnce(401, '')
    const client = new N11Client(CONFIG)
    await expect(client.request('GET', '/x')).rejects.toMatchObject({ kind: 'AUTH' })
  })

  it('403 -> FORBIDDEN', async () => {
    mockFetchOnce(403, '')
    const client = new N11Client(CONFIG)
    await expect(client.request('GET', '/x')).rejects.toMatchObject({ kind: 'FORBIDDEN' })
  })

  it('malformed JSON -> MALFORMED_RESPONSE', async () => {
    mockFetchOnce(200, 'not-json{')
    const client = new N11Client(CONFIG)
    await expect(client.request('GET', '/x')).rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })
  })

  it('timeout -> TIMEOUT kind', async () => {
    global.fetch = vi.fn(async () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    }) as any
    const client = new N11Client(CONFIG)
    await expect(client.request('GET', '/x')).rejects.toMatchObject({ kind: 'TIMEOUT' })
  })

  it('network failure -> NETWORK kind', async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as any
    const client = new N11Client(CONFIG)
    await expect(client.request('GET', '/x')).rejects.toMatchObject({ kind: 'NETWORK' })
  })

  it('retries 429 then succeeds (Retry-After respected)', async () => {
    let calls = 0
    global.fetch = vi.fn(async () => {
      calls += 1
      if (calls < 3) return new Response('', { status: 429, headers: { 'retry-after': '1' } })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as any
    vi.useFakeTimers()
    try {
      const client = new N11Client(CONFIG)
      const promise = client.request<{ ok: boolean }>('GET', '/x')
      await vi.advanceTimersByTimeAsync(1500)
      await vi.advanceTimersByTimeAsync(1500)
      const result = await promise
      expect(result.ok).toBe(true)
      expect(calls).toBe(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('exhausted retries on 5xx -> PROVIDER_ERROR', async () => {
    let calls = 0
    global.fetch = vi.fn(async () => {
      calls += 1
      return new Response('', { status: 500 })
    }) as any
    vi.useFakeTimers()
    try {
      const client = new N11Client(CONFIG)
      const promise = client.request('GET', '/x')
      const expectation = expect(promise).rejects.toMatchObject({ kind: 'PROVIDER_ERROR' })
      await vi.advanceTimersByTimeAsync(10_000)
      await expectation
      expect(calls).toBe(3) // 1 ilk deneme + 2 retry
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('redactN11Credentials', () => {
  it('removes appKey and appSecret from messages', () => {
    const message = `headers appkey=${CONFIG.appKey} appsecret=${CONFIG.appSecret} failed`
    const safe = redactN11Credentials(message, CONFIG)
    expect(safe).not.toContain(CONFIG.appKey)
    expect(safe).not.toContain(CONFIG.appSecret)
    expect(safe).toContain('[REDACTED]')
  })

  it('is a no-op for unrelated messages', () => {
    expect(redactN11Credentials('plain failure', CONFIG)).toBe('plain failure')
  })

  it('client errors carry safeMessage only (no credential material)', () => {
    const error = new N11ClientError('AUTH', 'N11 error (401) (/ms/product-query)')
    expect(error.safeMessage).toBe('N11 error (401) (/ms/product-query)')
    expect(error.message).not.toContain(CONFIG.appSecret)
  })
})
