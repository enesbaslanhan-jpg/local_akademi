import { describe, it, expect, afterEach, vi } from 'vitest'
import { TrendyolClient, TrendyolClientError } from '../../src/services/integrations/marketplaces/trendyol/TrendyolClient'

/*
 * Provider HTTP davranis testleri. Gercek Trendyol'a istek ATILMAZ:
 * globalThis.fetch mock'lanir.
 */

const client = new TrendyolClient({
  supplierId: '1234',
  apiKey: 'test-api-key-value',
  apiSecret: 'test-api-secret-value',
  baseUrl: 'https://fake.trendyol.invalid',
  timeoutMs: 200,
  maxRetries: 1
})

type FetchLike = (url: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })
}

function setFetch(impl: FetchLike) {
  vi.stubGlobal('fetch', vi.fn(impl as any))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TrendyolClient request construction', () => {
  it('sends Basic auth, required User-Agent and storeFrontCode', async () => {
    let captured: RequestInit | undefined
    setFetch(async (_url, init) => {
      captured = init
      return jsonResponse({ content: [], totalPages: 0, totalElements: 0 })
    })

    await client.getShipmentPackages({ startDateMs: 1, endDateMs: 2, page: 0, size: 50 })

    const headers = captured?.headers as Record<string, string>
    expect(headers.Authorization).toMatch(/^Basic /)
    expect(headers['User-Agent']).toBe('1234 - SelfIntegration')
    expect(headers.storeFrontCode).toBe('1')

    // Basic auth degeri apiKey:apiSecret base64'u olmali.
    const expected = Buffer.from('test-api-key-value:test-api-secret-value').toString('base64')
    expect(headers.Authorization).toBe(`Basic ${expected}`)
  })

  it('builds orders URL with V2 path and epoch-ms query params', async () => {
    let calledUrl = ''
    setFetch(async (url) => {
      calledUrl = String(url)
      return jsonResponse({ content: [] })
    })
    await client.getShipmentPackages({ startDateMs: 1700000000000, endDateMs: 1700086400000, page: 2, size: 100 })
    // Order V2 — resmi dokumanda Ekim 2026 sonrasi zorunlu endpoint:
    expect(calledUrl).toContain('/integration/order/sellers/1234/v2/orders')
    expect(calledUrl).toContain('startDate=1700000000000')
    expect(calledUrl).toContain('endDate=1700086400000')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('size=100')
  })

  it('v1 override is explicit, temporary and loudly marked', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    process.env.TRENDYOL_ORDER_API_VERSION = 'v1'
    try {
      const v1Client = new TrendyolClient({
        supplierId: '1234',
        apiKey: 'test-api-key-value',
        apiSecret: 'test-api-secret-value',
        baseUrl: 'https://fake.trendyol.invalid',
        maxRetries: 0
      })
      setFetch(async () => jsonResponse({ content: [] }))
      await v1Client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 })

      const { resolveOrderApiVersion } = await import('../../src/services/integrations/marketplaces/trendyol/TrendyolClient')
      expect(resolveOrderApiVersion()).toBe('v1')
      // Kullanilmasiz uyari net sekilde yazilir (bir kez):
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('KULLANIM DISI'))
    } finally {
      delete process.env.TRENDYOL_ORDER_API_VERSION
      warnSpy.mockRestore()
    }
  })

  it('builds approved-products V2 URL', async () => {
    let calledUrl = ''
    setFetch(async (url) => {
      calledUrl = String(url)
      return jsonResponse({ content: [] })
    })
    await client.getApprovedProducts({ page: 0, size: 100 })
    expect(calledUrl).toContain('/integration/product/sellers/1234/products/approved')
  })
})

describe('TrendyolClient provider error handling', () => {
  it('maps 401 to AUTH error without leaking credentials', async () => {
    setFetch(async () => new Response('{"exception":"ClientApiAuthenticationException"}', { status: 401 }))
    const promise = client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 })
    await expect(promise).rejects.toMatchObject({ kind: 'AUTH' })
    await promise.catch(error => {
      expect((error as Error).message).not.toContain('test-api-key-value')
      expect((error as Error).message).not.toContain('test-api-secret-value')
    })
  })

  it('maps 403 to AUTH error (missing User-Agent scenario)', async () => {
    setFetch(async () => new Response('', { status: 403 }))
    await expect(client.getApprovedProducts({})).rejects.toMatchObject({ kind: 'AUTH' })
  })

  it('retries on 429 then succeeds', async () => {
    let calls = 0
    setFetch(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ error: 'rate limited' }, 429, { 'retry-after': '0' })
      return jsonResponse({ content: [{ id: 1 }] })
    })
    const result = await client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 })
    expect(result.content).toHaveLength(1)
    expect(calls).toBe(2)
  })

  it('exhausts retries on persistent 429 and reports RATE_LIMITED', async () => {
    let calls = 0
    setFetch(async () => {
      calls += 1
      return jsonResponse({}, 429, { 'retry-after': '0' })
    })
    try {
      await client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 })
      expect.unreachable()
    } catch (error) {
      expect((error as TrendyolClientError).kind).toBe('RATE_LIMITED')
    }
    expect(calls).toBe(2) // maxRetries=1 -> toplam 2 deneme
  })

  it('retries on 5xx then gives up with PROVIDER_ERROR', async () => {
    let calls = 0
    setFetch(async () => {
      calls += 1
      return jsonResponse({ error: 'boom' }, 500)
    })
    await expect(client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 }))
      .rejects.toMatchObject({ kind: 'PROVIDER_ERROR' })
    expect(calls).toBe(2)
  })

  it('does not retry on 400 BAD_REQUEST', async () => {
    let calls = 0
    setFetch(async () => {
      calls += 1
      return jsonResponse({ error: 'bad' }, 400)
    })
    await expect(client.getShipmentPackages({ startDateMs: 1, endDateMs: 2 }))
      .rejects.toMatchObject({ kind: 'BAD_REQUEST' })
    expect(calls).toBe(1)
  })

  it('reports TIMEOUT on hanging responses', async () => {
    setFetch((_url, init) => new Promise((_resolve, reject) => {
      // AbortController tetiklendiginde fetch AbortError firlatir.
      init?.signal?.addEventListener?.('abort', () => reject(new Error('AbortError')))
      setTimeout(() => { /* askida kalir */ }, 5000)
    }) as any)

    try {
      await client.getApprovedProducts({})
      expect.unreachable()
    } catch (error) {
      expect(['TIMEOUT', 'NETWORK']).toContain((error as TrendyolClientError)?.kind)
    }
  })

  it('reports MALFORMED_RESPONSE for invalid JSON body', async () => {
    setFetch(async () => new Response('<html>gateway error</html>', { status: 200 }))
    await expect(client.getApprovedProducts({}))
      .rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })
  })

  it('reports MALFORMED_RESPONSE for empty body', async () => {
    setFetch(async () => new Response('', { status: 200 }))
    await expect(client.getApprovedProducts({}))
      .rejects.toMatchObject({ kind: 'MALFORMED_RESPONSE' })
  })

  it('paginates via nextPageToken awareness at adapter level', async () => {
    setFetch(async () => jsonResponse({
      totalElements: 250,
      totalPages: 3,
      page: 0,
      size: 100,
      nextPageToken: 'token-abc',
      content: [{
        contentId: 9511264,
        title: 'White Dress',
        brand: { id: 1, name: 'TYBR' },
        category: { id: 2, name: 'Dress' },
        variants: [{ barcode: 'BC1', stockCode: 'SC1', onSale: true }]
      }]
    }))

    const response = await client.getApprovedProducts({ page: 0, size: 100 })
    expect(response.nextPageToken).toBe('token-abc')
    expect(response.content?.[0]?.variants?.[0]?.barcode).toBe('BC1')
  })
})
