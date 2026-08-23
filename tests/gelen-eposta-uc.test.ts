import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { gelenEpostaRotalari } from '../src/services/gelen-eposta.js'

/*
 * UCUN KENDİSİ — kayıt koşulu ve anahtar kontrolü.
 *
 * 🔴 EN ÖNEMLİ DAVRANIŞ: `INBOUND_MAIL_SECRET` yoksa uç HİÇ
 * KAYDEDİLMİYOR. "Yapılandırılmamış" durumu, kapının VAR OLMAMASI
 * demek -- 401 dönen ama var olan bir kapı değil. Boş anahtarla açık
 * bırakmak, internete kimliksiz bir belge yükleme kapısı açardı.
 */

const ANAHTAR = 'x'.repeat(48)

async function sunucuKur(anahtar?: string) {
  const onceki = process.env.INBOUND_MAIL_SECRET
  if (anahtar === undefined) delete process.env.INBOUND_MAIL_SECRET
  else process.env.INBOUND_MAIL_SECRET = anahtar

  const app = Fastify({ logger: false })
  await app.register(gelenEpostaRotalari, { prefix: '/inbound' })
  await app.ready()

  if (onceki === undefined) delete process.env.INBOUND_MAIL_SECRET
  else process.env.INBOUND_MAIL_SECRET = onceki
  return app
}

const yuk = {
  inboxKey: 'fatura-' + 'a'.repeat(32),
  from: 'biri@ornek.test',
  dkim: 'pass',
  spf: 'pass',
  ekler: []
}

describe('anahtar yapılandırılmamışsa', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur(undefined) })
  afterAll(async () => { await app.close() })

  it('uç hiç kaydedilmez (404, 401 değil)', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(404)
  })
})

/* Kısa anahtar da yapılandırılmamış sayılıyor: 8 karakterlik bir
   "gizli" değer, gizli değildir. */
describe('anahtar çok kısaysa', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur('kisa') })
  afterAll(async () => { await app.close() })

  it('uç yine kaydedilmez', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(404)
  })
})

describe('anahtar varken', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur(ANAHTAR) })
  afterAll(async () => { await app.close() })

  it('anahtarsız istek 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(401)
  })

  it('yanlış anahtar 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': 'y'.repeat(48) }, payload: yuk
    })
    expect(res.statusCode).toBe(401)
  })

  it('geçersiz yük 422', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': ANAHTAR },
      payload: { inboxKey: 'x' }
    })
    expect(res.statusCode).toBe(422)
  })

  /*
   * Bilinmeyen kutu SESSİZCE atılıyor: 202 dönüyor, 404 değil.
   * Farklı yanıt kodu, adres deneyerek çalışma alanı keşfetmeyi
   * mümkün kılardı.
   */
  it('bilinmeyen kutu 202 döner, 404 değil', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': ANAHTAR }, payload: yuk
    })
    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).durum).toBe('atildi')
  })
})
