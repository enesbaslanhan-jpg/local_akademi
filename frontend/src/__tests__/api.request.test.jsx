import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../services/api'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('token', 'test-token')
})

function mockFetch(response) {
  global.fetch = vi.fn().mockResolvedValue(response)
}

function makeResponse({ ok, status, contentType, body, json = null }) {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  return {
    ok,
    status,
    headers,
    body: status === 204 ? null : true,
    json: json || (async () => body)
  }
}

describe('api.request content-type handling', () => {
  it('parses application/json success response', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: { models: [{ code: 'M1' }] } }))
    const data = await api.financialModels.list()
    expect(data).toEqual({ models: [{ code: 'M1' }] })
  })

  it('returns {} for 204 No Content', async () => {
    mockFetch(makeResponse({ ok: true, status: 204, contentType: 'application/json' }))
    const data = await api.request('/empty', { method: 'DELETE' })
    expect(data).toEqual({})
  })

  it('throws safe API error for text/html response', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'text/html', body: '<html><body>SPA fallback</body></html>' }))
    await expect(api.financialModels.list()).rejects.toThrow('API sunucusuna ulaşılamadı veya beklenmeyen bir yanıt alındı.')
  })

  it('does not leak html content in error', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'text/html', body: '<html><body>SPA fallback</body></html>' }))
    try {
      await api.financialModels.list()
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.message).not.toContain('<html')
      expect(err.message).not.toContain('SPA fallback')
    }
  })

  it('preserves backend json error message', async () => {
    mockFetch(makeResponse({ ok: false, status: 422, contentType: 'application/json', body: { error: 'Girdi geçersiz' } }))
    await expect(api.financialModels.list()).rejects.toThrow('Girdi geçersiz')
  })

  it('throws generic error for non-json error response', async () => {
    mockFetch(makeResponse({ ok: false, status: 503, contentType: 'text/html', body: '<html>error</html>' }))
    await expect(api.financialModels.list()).rejects.toThrow('İşlem başarısız')
  })
})
