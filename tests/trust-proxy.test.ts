import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * `X-Forwarded-For` ile hız sınırı aşımı.
 *
 * BULGU: `src/index.ts` içinde `trustProxy: true` sabitti. Bu, gelen
 * `X-Forwarded-For` başlığına KOŞULSUZ güvenmek demek. Uygulamaya doğrudan
 * erişilebildiğinde saldırgan her istekte başlığı değiştirerek IP tabanlı
 * hız sınırlarının tamamını aşabiliyordu — giriş (10/dk), kayıt (5/saat),
 * şifre sıfırlama (3/saat) dahil 22 uç nokta. Kaba kuvvet korumasının
 * tamamı tek bir başlıkla devre dışı kalıyordu.
 *
 * Bu testler varsayılanın artık güvenli olduğunu, açık yapılandırmayla
 * gerçek vekil kurulumunun hâlâ çalıştığını doğruluyor.
 */

const HEDEF = '/auth/password-reset/request' /* saatte 3 istek */
let app: FastifyInstance | null = null

afterEach(async () => {
  if (app) { await app.close(); app = null }
  delete process.env.TRUST_PROXY
})

async function sunucuKur(trustProxy?: string): Promise<FastifyInstance> {
  process.env.JWT_SECRET = 'trust-proxy-test-secret-min-32-bytes!!'
  process.env.NODE_ENV = 'test'
  if (trustProxy === undefined) delete process.env.TRUST_PROXY
  else process.env.TRUST_PROXY = trustProxy

  /* Modül önbelleği build() içindeki env okumasını etkilemiyor; her seferinde
     taze bir örnek kuruluyor. */
  const { default: build } = await import('../src/index')
  const instance = await build()
  await instance.ready()
  return instance
}

/** Her istekte FARKLI bir sahte IP göndererek sınırı aşmayı dener. */
async function sahteIplerleDene(instance: FastifyInstance, adet: number): Promise<number[]> {
  const kodlar: number[] = []
  for (let i = 0; i < adet; i++) {
    const r = await instance.inject({
      method: 'POST', url: HEDEF,
      headers: { 'x-forwarded-for': `198.51.100.${i + 1}` },
      payload: { email: `yok-${i}@test.local` }
    })
    kodlar.push(r.statusCode)
  }
  return kodlar
}

describe('varsayılan yapılandırma (TRUST_PROXY tanımsız)', () => {
  it('sahte X-Forwarded-For ile hız sınırı AŞILAMAZ', async () => {
    app = await sunucuKur(undefined)
    const kodlar = await sahteIplerleDene(app, 6)

    /* Başlık yok sayıldığı için hepsi AYNI soket adresinden sayılır:
       ilk 3 geçer, kalanı 429. Zafiyet varken 6'sı da 200 olurdu. */
    expect(kodlar.filter(k => k === 200).length).toBe(3)
    expect(kodlar.filter(k => k === 429).length).toBe(3)
  }, 30_000)
})

describe('açık vekil yapılandırması (TRUST_PROXY=1)', () => {
  it('gerçek vekil arkasında istemci IP’si dikkate alınır', async () => {
    app = await sunucuKur('1')
    const kodlar = await sahteIplerleDene(app, 6)

    /* Ters vekil arkasında bu DOĞRU davranış: farklı istemciler ayrı
       kotaya sahip olmalı. Güvenliği sağlayan şey, vekilin başlığı
       yeniden yazıyor olması. */
    expect(kodlar.every(k => k === 200)).toBe(true)
  }, 30_000)
})

describe('TRUST_PROXY=false açıkça verilebilir', () => {
  it('tanımsız olmakla aynı davranır', async () => {
    app = await sunucuKur('false')
    const kodlar = await sahteIplerleDene(app, 4)
    expect(kodlar.filter(k => k === 429).length).toBeGreaterThan(0)
  }, 30_000)
})
