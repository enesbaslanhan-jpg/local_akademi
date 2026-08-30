import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, RATE_LIMIT_EVENT, ERROR_CODES } from '../services/api'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('token', 'test-token')
})

function mockFetch(response) {
  global.fetch = vi.fn().mockResolvedValue(response)
}

function makeResponse({ ok, status, contentType, body, json = null, retryAfter = null }) {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  if (retryAfter) headers.set('retry-after', retryAfter)
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
    await expect(api.financialModels.list()).rejects.toThrow(ERROR_CODES.API_ERROR)
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
    try {
      await api.financialModels.list()
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.apiMessage).toBe('Girdi geçersiz')
    }
  })

  it('throws generic error for non-json error response', async () => {
    mockFetch(makeResponse({ ok: false, status: 503, contentType: 'text/html', body: '<html>error</html>' }))
    await expect(api.financialModels.list()).rejects.toThrow(ERROR_CODES.API_ERROR)
  })

  it('429 yanıtını kontrollü mesaja çevirir ve Retry-After süresini taşır', async () => {
    const eventHandler = vi.fn()
    window.addEventListener(RATE_LIMIT_EVENT, eventHandler)
    mockFetch(makeResponse({
      ok: false,
      status: 429,
      contentType: 'application/json',
      body: { error: 'Rate limit exceeded, retry in 7 minutes' },
      retryAfter: '420'
    }))

    try {
      await api.request('/courses')
      expect.fail('429 hata vermeliydi')
    } catch (error) {
      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT)
      expect(error.status).toBe(429)
      expect(error.retryAfterSeconds).toBe(420)
    }
    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect(eventHandler.mock.calls[0][0].detail.retryAfterSeconds).toBe(420)
    window.removeEventListener(RATE_LIMIT_EVENT, eventHandler)
  })

  it('eşzamanlı aynı GET çağrılarını tek ağ isteğinde birleştirir', async () => {
    let resolveFetch
    global.fetch = vi.fn(() => new Promise(resolve => { resolveFetch = resolve }))

    const first = api.request('/dashboard/summary')
    const second = api.request('/dashboard/summary')
    expect(global.fetch).toHaveBeenCalledTimes(1)

    resolveFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: { ok: true } }))
    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }])
  })
})

describe('learning progress API contract', () => {
  it('requests completed progress with the expected query', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: { items: [] } }))

    await expect(api.learningProgress.getCompleted(3)).resolves.toEqual({ items: [] })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/learning-progress?status=completed&limit=3',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    )
  })

  it('updates progress through the PATCH endpoint', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: { status: 'in_progress' } }))

    await api.learningProgress.update('decision_check', 'DC 01', {
      status: 'in_progress',
      continueLater: true
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/learning-progress/decision_check/DC%2001',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress', continueLater: true })
      })
    )
  })
})

/*
 * GÖVDESİZ İSTEKLERDE CONTENT-TYPE.
 *
 * `getHeaders` her isteğe `Content-Type: application/json` koyuyordu.
 * Gövdesiz bir POST/PATCH/DELETE'te bu, Fastify'ın JSON ayrıştırıcısını
 * tetikliyor ve istek daha ROTAYA VARMADAN 400 ile reddediliyor.
 *
 * Ölçüldü (20.08.2026): yedi uç nokta bu yüzden arayüzden hiç
 * çalışmıyordu — sohbet arşivleme/geri alma, mentor hafızası itiraz ve
 * doğrulama, değerlendirme yeniden başlatma, anket sıfırlama, eski
 * profil eşitleme.
 *
 * Bu testler kök sebebi bekliyor: gövde yoksa başlık da gönderilmemeli.
 */
describe('api.request gövdesiz isteklerde Content-Type göndermez', () => {
  function gonderilenBaslik() {
    return global.fetch.mock.calls[0][1].headers
  }

  it('gövdesiz POST Content-Type göndermez', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: {} }))
    await api.request('/onboarding/tour/complete', { method: 'POST' })
    expect(gonderilenBaslik()['Content-Type']).toBeUndefined()
  })

  it('gövdesiz PATCH Content-Type göndermez', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: {} }))
    await api.request('/conversations/abc/archive', { method: 'PATCH' })
    expect(gonderilenBaslik()['Content-Type']).toBeUndefined()
  })

  it('gövdesiz DELETE Content-Type göndermez', async () => {
    mockFetch(makeResponse({ ok: true, status: 204, contentType: 'application/json' }))
    await api.request('/auth/avatar', { method: 'DELETE' })
    expect(gonderilenBaslik()['Content-Type']).toBeUndefined()
  })

  it('GÖVDE VARSA Content-Type gönderilir', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: {} }))
    await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ a: 1 }) }, false)
    expect(gonderilenBaslik()['Content-Type']).toBe('application/json')
  })

  it('yetki başlığı gövdesiz istekte de korunur', async () => {
    mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: {} }))
    await api.request('/onboarding/tour/reset', { method: 'POST' })
    expect(gonderilenBaslik()['Authorization']).toBe('Bearer test-token')
  })

  it('gerçek çağrılar da gövdesiz gidiyor: logoutAll, resetTour, archive', async () => {
    for (const cagri of [
      () => api.auth.logoutAll(),
      () => api.onboarding.resetTour(),
      () => api.conversation.archive('abc')
    ]) {
      mockFetch(makeResponse({ ok: true, status: 200, contentType: 'application/json', body: {} }))
      await cagri()
      expect(gonderilenBaslik()['Content-Type']).toBeUndefined()
    }
  })
})

/*
 * SALT OKUNUR MOD — 403 + MEMBERSHIP_EXPIRED.
 *
 * 🔴 Bu testlerin koruduğu asıl şey, sunucunun neden 401 DEĞİL 403
 * kullandığı: 401 sessiz token yenilemesini tetikliyor ve başarısız
 * olunca `oturumTokenleriniSil()` çağrılıyor. Süresi dolan kullanıcı
 * 401 alsaydı uygulamadan ATILIRDI ve ödeme yapacağı ekrana bile
 * ulaşamazdı.
 */
describe('üyelik süresi doldu yanıtı', () => {
  function uyelikDolduYaniti() {
    return makeResponse({
      ok: false,
      status: 403,
      contentType: 'application/json',
      body: { error: 'Ücretsiz kullanım süreniz doldu.', code: 'MEMBERSHIP_EXPIRED' }
    })
  }

  it('kendi hata kodunu taşıyor', async () => {
    mockFetch(uyelikDolduYaniti())
    await expect(api.request('/workspaces/1/records', { method: 'POST' }))
      .rejects.toMatchObject({ code: ERROR_CODES.MEMBERSHIP_EXPIRED, status: 403 })
  })

  it('🦷 OTURUMU SİLMİYOR — 403 seçmemizin bütün sebebi bu', async () => {
    mockFetch(uyelikDolduYaniti())
    await api.request('/workspaces/1/records', { method: 'POST' }).catch(() => {})

    expect(localStorage.getItem('token'), 'kullanıcı uygulamadan atılmamalı').toBe('test-token')
    expect(global.fetch, 'token yenileme denenmemeli').toHaveBeenCalledTimes(1)
  })

  it('kullanıcıya gösterilmek üzere olay yayıyor', async () => {
    const dinleyici = vi.fn()
    window.addEventListener('localkarar:membership-expired', dinleyici)
    mockFetch(uyelikDolduYaniti())

    await api.request('/workspaces/1/records', { method: 'POST' }).catch(() => {})

    expect(dinleyici).toHaveBeenCalledTimes(1)
    /* Sunucunun metni taşınıyor; ön yüzde ikinci bir metin yazılmıyor. */
    expect(dinleyici.mock.calls[0][0].detail.mesaj).toContain('süreniz doldu')
    window.removeEventListener('localkarar:membership-expired', dinleyici)
  })

  it('kodsuz 403 normal hata olarak geçiyor', async () => {
    /* 403 başka sebeplerle de geliyor (yetki yok, engellenmiş kullanıcı).
       Yalnız durum koduna bakmak, onları da üyelik uyarısına çevirirdi. */
    const dinleyici = vi.fn()
    window.addEventListener('localkarar:membership-expired', dinleyici)
    mockFetch(makeResponse({
      ok: false, status: 403, contentType: 'application/json',
      body: { error: 'Access denied' }
    }))

    await expect(api.request('/workspaces/1/records', { method: 'POST' }))
      .rejects.toMatchObject({ code: ERROR_CODES.API_ERROR })
    expect(dinleyici).not.toHaveBeenCalled()
    window.removeEventListener('localkarar:membership-expired', dinleyici)
  })
})
