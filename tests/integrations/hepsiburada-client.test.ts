import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HepsiburadaClient, redactBasicToken } from '../../src/services/integrations/marketplaces/hepsiburada/HepsiburadaClient.js'
import { HepsiburadaClientError } from '../../src/services/integrations/marketplaces/hepsiburada/HepsiburadaErrors.js'

/*
 * HEPSIBURADA CLIENT unit testleri — resmi auth modeli + hata siniflama.
 * Gercek ag cagrisi YOK: global fetch mock'lanir.
 */

const CONFIG = {
  merchantId: 'b24f1a2c-1111-4a5b-9c6d-000000000001',
  username: 'api-user@merchant.com',
  password: 'hb-secret-pass'
}

const originalFetch = global.fetch

function mockFetchOnce(status: number, body: string | object, headers?: Record<string, string>) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  global.fetch = vi.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    if (status >= 200 && status < 300) {
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers
      })
    }
    return new Response('error-body', { status, headers })
  }) as any
  return calls
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  global.fetch = originalFetch
})

describe('HepsiburadaClient — auth & headers', () => {
  it('sends Basic auth with base64(username:password) and bare integrator User-Agent', async () => {
    const calls = mockFetchOnce(200, { ok: true })
    const client = new HepsiburadaClient(CONFIG)
    await client.request('listing', 'GET', `/listings/merchantid/${CONFIG.merchantId}`, { offset: 0, limit: 1 })

    const expectedToken = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Basic ${expectedToken}`)
    // Resmi gereksinim: bare entegrator adi (merchantId-on-ekli DEGIL).
    expect(headers['User-Agent']).toBe('LocalKarar')
    expect(calls[0].url).toContain(`listings/merchantid/${encodeURIComponent(CONFIG.merchantId)}`)
  })

  it('targets production host by default and SIT when env is set', async () => {
    let calls = mockFetchOnce(200, { ok: true })
    await new HepsiburadaClient({ ...CONFIG }).request('oms', 'GET', '/ping')
    expect(calls[0].url).toContain('https://oms-external.hepsiburada.com')

    process.env.HEPSIBURADA_ENV = 'sit'
    calls = mockFetchOnce(200, { ok: true })
    const sitClient = new HepsiburadaClient({ ...CONFIG })
    await sitClient.request('listing', 'GET', '/ping')
    expect(calls[0].url).toContain('https://listing-external-sit.hepsiburada.com')
    delete process.env.HEPSIBURADA_ENV
  })

  it('serializes query params', async () => {
    const calls = mockFetchOnce(200, { ok: true })
    const client = new HepsiburadaClient(CONFIG)
    await client.request('listing', 'GET', '/x', { offset: 20, limit: 50, empty: '' })
    expect(calls[0].url).toContain('offset=20')
    expect(calls[0].url).toContain('limit=50')
    expect(calls[0].url).not.toContain('empty=')
  })
})

describe('HepsiburadaClient — error mapping', () => {
  it('401 -> AUTH without retry', async () => {
    mockFetchOnce(401, '')
    const client = new HepsiburadaClient(CONFIG)
    await expect(client.request('listing', 'GET', '/x')).rejects.toMatchObject({ kind: 'AUTH' })
  })

  it('403 -> FORBIDDEN', async () => {
    mockFetchOnce(403, '')
    const client = new HepsiburadaClient(CONFIG)
    await expect(client.request('listing', 'GET', '/x')).rejects.toMatchObject({ kind: 'FORBIDDEN' })
  })

  it('malformed JSON -> MALFORMED_RESPONSE', async () => {
    mockFetchOnce(200, 'not-json{')
    const client = new HepsiburadaClient(CONFIG)
    await expect(client.request('listing', 'GET', '/x')).rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })
  })

  it('timeout -> TIMEOUT kind', async () => {
    global.fetch = vi.fn(async () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    }) as any
    const client = new HepsiburadaClient(CONFIG)
    await expect(client.request('listing', 'GET', '/x')).rejects.toMatchObject({ kind: 'TIMEOUT' })
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
      const client = new HepsiburadaClient(CONFIG)
      const promise = client.request<{ ok: boolean }>('listing', 'GET', '/x')
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
      const client = new HepsiburadaClient(CONFIG)
      const promise = client.request('listing', 'GET', '/x')
      const expectation = expect(promise).rejects.toMatchObject({ kind: 'PROVIDER_ERROR' })
      await vi.advanceTimersByTimeAsync(10_000)
      await expectation
      expect(calls).toBe(3) // 1 ilk deneme + 2 retry
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('redactBasicToken', () => {
  it('removes the raw Basic token and password from messages', () => {
    const token = Buffer.from(`${CONFIG.username}:${CONFIG.password}`).toString('base64')
    const message = `Authorization=Basic ${token} pass=${CONFIG.password} ok`
    const safe = redactBasicToken(message, CONFIG)
    expect(safe).not.toContain(token)
    expect(safe).not.toContain(CONFIG.password)
    expect(safe).toContain('[REDACTED]')
  })

  it('is a no-op for unrelated messages', () => {
    expect(redactBasicToken('plain failure', CONFIG)).toBe('plain failure')
  })

  it('client errors carry safeMessage only (no credential material)', () => {
    const error = new HepsiburadaClientError('AUTH', 'Hepsiburada listing error (401)')
    expect(error.safeMessage).toBe('Hepsiburada listing error (401)')
    expect(error.message).not.toContain(CONFIG.password)
  })
})
