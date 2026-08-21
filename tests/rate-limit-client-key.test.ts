import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { hizSiniriAnahtari } from '../src/index.js'

/*
 * HIZ SINIRI KİMİ SINIRLIYOR?
 *
 * Cloudflare arkasında `request.ip` gerçek kullanıcı değil, isteği taşıyan
 * KENAR SUNUCUSU oluyordu. O sunucu istekten isteğe değiştiği için sınır
 * kovaları dağılıyor ve giriş / kayıt / şifre sıfırlama sınırları fiilen
 * çalışmıyordu. Üretimde ölçüldü (22.08.2026): aynı istemciden iki istek,
 * iki farklı adres — 172.71.164.99 ve 104.23.239.60.
 *
 * Bu dosya iki şeyi koruyor:
 *   1. Vekil arkasındayken gerçek istemci `CF-Connecting-IP`'den okunuyor,
 *      yani kenar sunucusu değişse de aynı kovaya düşülüyor.
 *   2. Vekil YOKKEN başlığa güvenilmiyor — aksi hâlde sunucuya doğrudan
 *      ulaşabilen biri başlığı uydurup sınırı sonsuza kadar aşabilirdi.
 */

/*
 * YALNIZ tek değişken geri alınıyor; `process.env` nesnesinin tamamı
 * DEĞİŞTİRİLMİYOR. Nesneyi baştan atamak, aynı süreçteki başka modüllerin
 * daha önce yakaladığı referansı kopardığı için alakasız testleri
 * bozabiliyor.
 */
let oncekiTrustProxy: string | undefined

beforeEach(() => { oncekiTrustProxy = process.env.TRUST_PROXY })
afterEach(() => {
  if (oncekiTrustProxy === undefined) delete process.env.TRUST_PROXY
  else process.env.TRUST_PROXY = oncekiTrustProxy
})

function istek(ip: string, basliklar: Record<string, unknown> = {}) {
  return { ip, headers: basliklar }
}

describe('hizSiniriAnahtari', () => {
  it('vekil arkasında CF-Connecting-IP kullanır — kenar sunucusu değişse de aynı anahtar', () => {
    process.env.TRUST_PROXY = '2'

    /* Cloudflare her isteği başka bir kenardan geçirebilir; `ip` değişiyor
       ama gerçek kullanıcı aynı. Anahtar da aynı kalmalı. */
    const birinci = hizSiniriAnahtari(istek('172.71.164.99', { 'cf-connecting-ip': '85.100.7.42' }))
    const ikinci = hizSiniriAnahtari(istek('104.23.239.60', { 'cf-connecting-ip': '85.100.7.42' }))

    expect(birinci).toBe('85.100.7.42')
    expect(ikinci).toBe('85.100.7.42')
    expect(birinci).toBe(ikinci)
  })

  it('vekil YOKKEN başlığa güvenmez', () => {
    delete process.env.TRUST_PROXY

    const anahtar = hizSiniriAnahtari(istek('203.0.113.9', { 'cf-connecting-ip': '1.2.3.4' }))

    /* Uydurulan değer değil, soketin gerçek adresi. */
    expect(anahtar).toBe('203.0.113.9')
  })

  it('TRUST_PROXY=false iken de başlığa güvenmez', () => {
    process.env.TRUST_PROXY = 'false'
    expect(hizSiniriAnahtari(istek('203.0.113.9', { 'cf-connecting-ip': '1.2.3.4' }))).toBe('203.0.113.9')
  })

  it('başlık yoksa request.ip kullanılır', () => {
    process.env.TRUST_PROXY = '2'
    expect(hizSiniriAnahtari(istek('198.51.100.7'))).toBe('198.51.100.7')
  })

  it('boş başlık yok sayılır', () => {
    process.env.TRUST_PROXY = '2'
    expect(hizSiniriAnahtari(istek('198.51.100.7', { 'cf-connecting-ip': '   ' }))).toBe('198.51.100.7')
  })
})

describe('sınır gerçekten uygulanıyor mu', () => {
  /*
   * Fonksiyonu tek başına test etmek yetmez: eklentiye BAĞLANDIĞI da
   * kanıtlanmalı. Aşağıdaki senaryo, hatanın üretimde göründüğü hâlin
   * birebir kopyası — her istek başka bir kenar IP'sinden geliyor.
   */
  it('kenar IP her istekte değişse bile aynı kullanıcı sınıra takılır', async () => {
    process.env.TRUST_PROXY = '2'
    const app = Fastify({ trustProxy: 2 })
    await app.register(rateLimit, {
      global: true,
      max: 3,
      timeWindow: '1 minute',
      keyGenerator: hizSiniriAnahtari as never
    })
    app.get('/dene', async () => ({ ok: true }))
    await app.ready()

    const kodlar: number[] = []
    for (let i = 0; i < 6; i++) {
      const yanit = await app.inject({
        method: 'GET',
        url: '/dene',
        headers: {
          /* Her istek FARKLI bir kenar sunucusundan geliyormuş gibi. */
          'x-forwarded-for': `104.23.239.${i}`,
          'cf-connecting-ip': '85.100.7.42'
        }
      })
      kodlar.push(yanit.statusCode)
    }

    expect(kodlar.slice(0, 3)).toEqual([200, 200, 200])
    expect(kodlar.slice(3)).toEqual([429, 429, 429])
    await app.close()
  })

  it('FARKLI kullanıcılar birbirinin kovasını doldurmaz', async () => {
    process.env.TRUST_PROXY = '2'
    const app = Fastify({ trustProxy: 2 })
    await app.register(rateLimit, {
      global: true, max: 2, timeWindow: '1 minute',
      keyGenerator: hizSiniriAnahtari as never
    })
    app.get('/dene', async () => ({ ok: true }))
    await app.ready()

    const cagir = (kullanici: string) => app.inject({
      method: 'GET', url: '/dene', headers: { 'cf-connecting-ip': kullanici }
    })

    await cagir('85.100.7.42')
    await cagir('85.100.7.42')
    /* Birinci kullanıcı sınırı doldurdu. */
    expect((await cagir('85.100.7.42')).statusCode).toBe(429)
    /* İkincisi etkilenmemeli. */
    expect((await cagir('88.20.1.5')).statusCode).toBe(200)

    await app.close()
  })
})
