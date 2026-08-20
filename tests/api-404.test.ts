import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * Var olmayan API rotaları 404 döner, 200 değil.
 *
 * REGRESYON KAYNAĞI: `setNotFoundHandler` bilinmeyen HER yol için
 * `index.html` gönderiyordu. Sonuç: eksik bir API uç noktası hata gibi
 * değil BAŞARI gibi görünüyordu — istemci 200 alıyor, gövdeyi JSON sanıp
 * ayrıştıramıyor ya da sessizce hiçbir şey yapmıyordu.
 *
 * Geliştirme sırasında iki kez buna yakalandık: bir kez rota hiç
 * eklenmemişti, bir kez de sunucu süreci bayattı. İkisinde de "istek 200
 * dönüyor ama veritabanında hiçbir şey olmuyor" görüntüsü vardı.
 */

let app: FastifyInstance

beforeAll(async () => {
  process.env.JWT_SECRET = 'api-404-test-secret-min-32-bytes-long'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => { await app.close() })

/* Her biri gerçek bir ön ek; sonuna var olmayan bir parça ekleniyor. */
const OLMAYAN_API_YOLLARI = [
  '/auth/boyle-bir-uc-nokta-yok',
  '/admin/users/1/olmayan-eylem',
  '/api/v2/olmayan',
  '/courses/999/olmayan',
  '/enrollments/olmayan',
  '/community/olmayan-uc',
  '/knowledge/olmayan/alt-yol',
  '/business/olmayan'
]

/*
 * DALI AYIRT ETME NOTU
 *
 * Test ortamında SPA yedeği zaten devre dışı (`NODE_ENV === 'test'`), bu
 * yüzden "404 döndü" demek tek başına hiçbir şey kanıtlamaz — düzeltme
 * kaldırılsa da 404 dönerdi.
 *
 * İki dalı ayıran şey yanıtın ŞEKLİ: API dalı `path` alanını da döndürür,
 * genel dal yalnız `error` döndürür. Testler bu yüzden `path` alanına
 * bakıyor; asıl kanıt bu.
 */
describe('bilinmeyen API yolları', () => {
  it.each(OLMAYAN_API_YOLLARI)('%s → API dalından 404', async yol => {
    const r = await app.inject({ method: 'GET', url: yol })
    expect(r.statusCode).toBe(404)
    /* `path` yalnız API dalında dolu — SPA yedeğine düşseydi olmazdı. */
    expect(r.json().path).toBe(yol.split('?')[0])
  })

  it('POST için de 404 döner', async () => {
    const r = await app.inject({
      method: 'POST', url: '/admin/users/1/olmayan-eylem',
      payload: {}
    })
    expect(r.statusCode).toBe(404)
  })

  it('yanıt JSON, HTML değil', async () => {
    /* HTML dönerse istemci onu JSON sanıp ayrıştırmaya çalışır. */
    const r = await app.inject({ method: 'GET', url: '/auth/olmayan' })
    expect(r.headers['content-type']).toContain('application/json')
    expect(r.json().error).toBe('Route not found')
    expect(r.body).not.toContain('<!doctype html')
  })

  it('sorgu dizesi ön ek eşleşmesini bozmaz', async () => {
    const r = await app.inject({ method: 'GET', url: '/auth/olmayan?x=1&y=2' })
    expect(r.statusCode).toBe(404)
    expect(r.json().path).toBe('/auth/olmayan')
  })
})

describe('gerçek uç noktalar etkilenmez', () => {
  it('/health hâlâ çalışır', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' })
    expect(r.statusCode).toBe(200)
  })

  it('korumalı uç nokta 404 değil 401 döner', async () => {
    /* Rota VAR; yalnız kimlik doğrulaması eksik. Ön ek kuralı bunu
       yanlışlıkla 404'e çevirmemeli. */
    const r = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(r.statusCode).toBe(401)
  })
})

describe('SPA rotaları etkilenmez', () => {
  it('uygulama yolu API sayılmaz', async () => {
    /* `/app/...` bir SPA rotası — testte public dizin olmadığı için yine
       404 döner, ama ÖNEMLİ olan API dalına girmemesi: girseydi üretimde
       de index.html yerine JSON alırdı. */
    const r = await app.inject({ method: 'GET', url: '/app/dashboard' })
    expect(r.json().path).toBeUndefined()
  })

  it('kök yol API sayılmaz', async () => {
    const r = await app.inject({ method: 'GET', url: '/giris' })
    expect(r.json().path).toBeUndefined()
  })
})
