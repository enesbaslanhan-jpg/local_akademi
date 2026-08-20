import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, oturumTokenleriniSil } from '../services/api'

/*
 * 401 → yenile → isteği tekrarla.
 *
 * En kritik davranış TEK UÇUŞ: sayfa açılışında birden çok istek aynı
 * anda 401 alabiliyor. Her biri ayrı yenileme başlatsaydı ilki tokeni
 * harcar, diğerleri "tekrar kullanım" sayılır ve sunucu AİLEYİ İPTAL
 * EDERDİ — yani otomatik yenileme, kullanıcıyı atmanın yeni bir yolu
 * olurdu. Aşağıdaki test tam olarak bunu koruyor.
 */

function yanit({ ok, status, body = {}, contentType = 'application/json' }) {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  return { ok, status, headers, body: true, json: async () => body }
}

const YETKISIZ = () => yanit({ ok: false, status: 401, body: { error: 'Unauthorized' } })
const TAMAM = (body = { veri: 1 }) => yanit({ ok: true, status: 200, body })

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('token', 'eski-token')
  localStorage.setItem('refreshToken', 'r'.repeat(96))
})

describe('401 sonrası otomatik yenileme', () => {
  it('yeniler ve isteği TEKRARLAR', async () => {
    const cagrilar = []
    global.fetch = vi.fn(async (url) => {
      cagrilar.push(String(url))
      if (String(url).includes('/auth/refresh')) {
        return TAMAM({ token: 'yeni-token', refreshToken: 'y'.repeat(96) })
      }
      /* İlk deneme 401, tekrar denemede başarı. */
      return cagrilar.filter(c => c.includes('/knowledge')).length === 1 ? YETKISIZ() : TAMAM({ ok: 1 })
    })

    const sonuc = await api.request('/knowledge/x')
    expect(sonuc).toEqual({ ok: 1 })
    expect(cagrilar.filter(c => c.includes('/auth/refresh'))).toHaveLength(1)
    expect(localStorage.getItem('token')).toBe('yeni-token')
  })

  it('🔴 eşzamanlı 401 istekleri TEK yenileme yapar', async () => {
    let yenilemeSayisi = 0
    const gorulen = {}
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/auth/refresh')) {
        yenilemeSayisi++
        await new Promise(r => setTimeout(r, 10))
        return TAMAM({ token: 'yeni-token', refreshToken: 'y'.repeat(96) })
      }
      gorulen[u] = (gorulen[u] || 0) + 1
      return gorulen[u] === 1 ? YETKISIZ() : TAMAM({ ok: u })
    })

    await Promise.all([
      api.request('/a'), api.request('/b'), api.request('/c'), api.request('/d')
    ])
    expect(yenilemeSayisi).toBe(1)
  })

  it('yenileme başarısızsa tokenler silinir ve hata atılır', async () => {
    global.fetch = vi.fn(async (url) =>
      String(url).includes('/auth/refresh')
        ? yanit({ ok: false, status: 401, body: { error: 'Oturum süresi doldu' } })
        : YETKISIZ()
    )
    await expect(api.request('/knowledge/x')).rejects.toThrow()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('🔴 sonsuz döngüye girmez — tekrar da 401 alırsa durur', async () => {
    let istek = 0
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/auth/refresh')) {
        return TAMAM({ token: 'yeni-token', refreshToken: 'y'.repeat(96) })
      }
      istek++
      return YETKISIZ()
    })
    await expect(api.request('/knowledge/x')).rejects.toThrow()
    /* Bir asıl istek + bir tekrar = 2. Daha fazlası döngü demektir. */
    expect(istek).toBe(2)
  })

  it('yenileme tokeni yoksa denemez', async () => {
    localStorage.removeItem('refreshToken')
    const cagrilar = []
    global.fetch = vi.fn(async (url) => { cagrilar.push(String(url)); return YETKISIZ() })
    await expect(api.request('/knowledge/x')).rejects.toThrow()
    expect(cagrilar.some(c => c.includes('/auth/refresh'))).toBe(false)
  })

  it('🔴 giriş 401 alınca yenileme DENENMEZ', async () => {
    /* Burada 401 "şifre yanlış" demek; yenileme anlamsız ve kullanıcının
       geçerli oturumunu boşuna riske atardı. */
    const cagrilar = []
    global.fetch = vi.fn(async (url) => { cagrilar.push(String(url)); return YETKISIZ() })
    await expect(api.auth.login('a@b.test', 'yanlis')).rejects.toThrow()
    expect(cagrilar.some(c => c.includes('/auth/refresh'))).toBe(false)
  })

  it('yenileme uç noktasının kendisi döngü başlatmaz', async () => {
    const cagrilar = []
    global.fetch = vi.fn(async (url) => { cagrilar.push(String(url)); return YETKISIZ() })
    await expect(api.request('/auth/refresh', { method: 'POST', body: '{}' })).rejects.toThrow()
    expect(cagrilar.filter(c => c.includes('/auth/refresh'))).toHaveLength(1)
  })
})

describe('token yardımcıları', () => {
  it('oturumTokenleriniSil ikisini de temizler', () => {
    oturumTokenleriniSil()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
