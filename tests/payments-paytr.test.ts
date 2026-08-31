import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { paymentRoutes } from '../src/services/payments/routes.js'
import {
  callbackHashDogrula,
  kurusaCevir,
  paytrYapilandirmasi,
  siparisNumarasiUret,
  tokenImzaMetni,
  type PaytrConfig,
} from '../src/services/payments/paytr.js'

/*
 * PAYTR ÖDEME AKIŞI.
 *
 * Korunan sözleşme dört maddede toplanıyor ve dördü de bu turda
 * ölçülmüş gerçek arıza sınıflarına karşılık geliyor:
 *
 *   1. urlencoded gövde AYRIŞTIRILIYOR. Depoda hiç ayrıştırıcı yoktu;
 *      olmadan Fastify 415 döner ve PayTR sonsuza kadar tekrar dener —
 *      para çekilir, abonelik hiç açılmaz.
 *   2. Hash DOĞRULANIYOR. Tek güvenlik kapısı bu; düşerse sahte bir
 *      POST'la herkes kendine abonelik açar.
 *   3. IDEMPOTENCY. PayTR "OK" alana kadar tekrar gönderiyor.
 *   4. Yanıt DÜZ METİN `OK`. JSON dönmek PayTR için başarısızlıktır.
 */

const CFG: PaytrConfig = {
  merchantId: '123456',
  merchantKey: 'test-merchant-key',
  merchantSalt: 'test-merchant-salt',
  testMode: true,
}

function gecerliHash(merchantOid: string, status: string, tutar: string): string {
  return createHmac('sha256', CFG.merchantKey)
    .update(merchantOid + CFG.merchantSalt + status + tutar)
    .digest('base64')
}

/*
 * Dolu bir fatura kimliği — checkout'un varsayılan hâli.
 *
 * Modül kapsamında, çünkü hem paylaşılan sahte prisma hem de test
 * beklentileri (PayTR'ye giden adres ve telefon) aynı değerleri
 * okuyor.
 */
const FATURA_KIMLIGI = {
  userId: 7,
  type: 'INDIVIDUAL' as const,
  title: 'Ayşe Yılmaz',
  tckn: null,
  vkn: null,
  taxOffice: null,
  phone: '5321112233',
  address: 'Atatürk Caddesi No 12',
  city: 'İstanbul',
  district: 'Kadıköy',
}

/** Tek bir ödeme satırı tutan, durumu gerçekten değişen sahte prisma. */
function sahtePrisma(baslangicDurumu: 'PENDING' | 'SUCCEEDED' = 'PENDING') {
  const durum = { deger: baslangicDurumu }
  const cagrilar = { paymentUpdate: 0, subscriptionUpdate: 0, bildirim: 0 }

  const prisma = {
    payment: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.merchantOid === 'BILINMEYEN'
          ? null
          : {
              id: 'odeme-1',
              status: durum.deger,
              subscriptionId: 'abonelik-1',
              subscription: { userId: 7 },
            }
      ),
      update: vi.fn(async ({ data }: any) => {
        cagrilar.paymentUpdate++
        durum.deger = data.status
        return {}
      }),
    },
    subscription: {
      update: vi.fn(async () => { cagrilar.subscriptionUpdate++; return {} }),
    },
    accountNotification: {
      create: vi.fn(async () => { cagrilar.bildirim++; return {} }),
    },
    auditLog: { create: vi.fn(async () => ({})) },
    /*
     * Fatura kimliği varsayılan olarak DOLU.
     *
     * ⚠️ Boş bırakmak, bu dosyadaki bütün checkout testlerini
     * 422 BILLING_PROFILE_REQUIRED'a düşürür ve onların neyi
     * koruduğunu yitirirdi. Kapının kendisi kendi testinde
     * `null` geçilerek sınanıyor.
     */
    billingProfile: {
      findUnique: vi.fn(async () => FATURA_KIMLIGI),
      upsert: vi.fn(async () => ({})),
    },
  }
  return { prisma: prisma as never, cagrilar, durum }
}

async function sunucuKur(prisma: never) {
  const app = Fastify()
  await app.register(paymentRoutes, { prefix: '/payments', prisma })
  return app
}

/** PayTR'nin gerçekte gönderdiği biçim: urlencoded, JSON DEĞİL. */
function urlencoded(alanlar: Record<string, string>): string {
  return new URLSearchParams(alanlar).toString()
}

beforeEach(() => {
  process.env.PAYTR_MERCHANT_ID = CFG.merchantId
  process.env.PAYTR_MERCHANT_KEY = CFG.merchantKey
  process.env.PAYTR_MERCHANT_SALT = CFG.merchantSalt
  process.env.PAYTR_TEST_MODE = 'true'
})

afterEach(() => {
  delete process.env.PAYTR_MERCHANT_ID
  delete process.env.PAYTR_MERCHANT_KEY
  delete process.env.PAYTR_MERCHANT_SALT
  delete process.env.PAYTR_TEST_MODE
})

describe('PayTR yapılandırması', () => {
  it('eksik yapılandırmada ödeme KAPALI sayılıyor', () => {
    delete process.env.PAYTR_MERCHANT_KEY
    expect(paytrYapilandirmasi()).toBeNull()
  })

  it('test kipi varsayılan AÇIK — üretimde bilinçli kapatılmalı', () => {
    delete process.env.PAYTR_TEST_MODE
    expect(paytrYapilandirmasi()?.testMode).toBe(true)
    process.env.PAYTR_TEST_MODE = 'false'
    expect(paytrYapilandirmasi()?.testMode).toBe(false)
  })

  it('sipariş numarası yalnız harf ve rakam taşıyor', () => {
    /* PayTR tire ve alt çizgi kabul etmiyor; uuid doğrudan kullanılamaz. */
    const oid = siparisNumarasiUret(() => '3f2b8c1a-9d4e-4f77-8a12-bc9de0123456')
    expect(oid).toMatch(/^[a-zA-Z0-9]+$/)
    expect(oid.length).toBeLessThanOrEqual(32)
  })

  it('tutar kuruşa çevriliyor — PayTR ondalık kabul etmiyor', () => {
    expect(kurusaCevir(299)).toBe(29900)
    expect(kurusaCevir(149.5)).toBe(14950)
    /* 299.4 gibi yuvarlama artığı tam sayıya inmeli, aksi hâlde
       PayTR isteği reddeder. */
    expect(Number.isInteger(kurusaCevir(299.4))).toBe(true)
  })

  it('imza metninde alan sırası sabit', () => {
    const metin = tokenImzaMetni(CFG, {
      merchantOid: 'ABC123', email: 'a@b.com', tutar: 299,
      kullaniciIp: '1.2.3.4', urunAdi: 'Uyelik',
      basariliUrl: '', basarisizUrl: '',
      kullaniciAdi: 'X', kullaniciAdres: 'Y', kullaniciTelefon: 'Z',
    })
    /* Sıra PayTR tarafından sabit; bozulursa hash tutmaz ve hata
       mesajı sebebi SÖYLEMEZ. Bu yüzden başı ve sonu sınanıyor. */
    expect(metin.startsWith('123456' + '1.2.3.4' + 'ABC123' + 'a@b.com' + '29900')).toBe(true)
    expect(metin.endsWith('TL' + '1')).toBe(true)
  })
})

describe('callback hash doğrulaması', () => {
  it('geçerli hash kabul ediliyor', () => {
    expect(callbackHashDogrula(CFG, {
      merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
      hash: gecerliHash('ABC123', 'success', '29900'),
    })).toBe(true)
  })

  it('🦷 bozuk hash REDDEDİLİYOR', () => {
    expect(callbackHashDogrula(CFG, {
      merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
      hash: gecerliHash('ABC123', 'success', '29900').slice(0, -2) + 'XX',
    })).toBe(false)
  })

  it('tutarı değiştirilmiş callback reddediliyor', () => {
    /* Hash tutara bağlı: saldırgan 1 kuruş ödeyip 299 TL'lik abonelik
       açamaz. */
    expect(callbackHashDogrula(CFG, {
      merchant_oid: 'ABC123', status: 'success', total_amount: '1',
      hash: gecerliHash('ABC123', 'success', '29900'),
    })).toBe(false)
  })

  it('eksik alanlarda reddediliyor', () => {
    expect(callbackHashDogrula(CFG, { merchant_oid: 'ABC123' })).toBe(false)
    expect(callbackHashDogrula(CFG, {})).toBe(false)
  })
})

describe('callback rotası', () => {
  it('🔴 urlencoded gövde ayrıştırılıyor — 415 DÖNMÜYOR', async () => {
    const { prisma } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST',
      url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
        hash: gecerliHash('ABC123', 'success', '29900'),
      }),
    })

    expect(yanit.statusCode, 'ayrıştırıcı yoksa Fastify 415 döner').not.toBe(415)
    expect(yanit.statusCode).toBe(200)
  })

  it('başarılı ödeme aboneliği aktive ediyor ve düz metin OK dönüyor', async () => {
    const { prisma, cagrilar } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST', url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
        hash: gecerliHash('ABC123', 'success', '29900'),
      }),
    })

    expect(yanit.body, 'PayTR tam olarak OK bekliyor').toBe('OK')
    expect(yanit.headers['content-type'], 'JSON dönmek başarısızlık sayılır')
      .not.toContain('application/json')
    expect(cagrilar.subscriptionUpdate).toBe(1)
    expect(cagrilar.bildirim).toBe(1)
  })

  it('🦷 bozuk hash 401 alıyor ve HİÇBİR ŞEY değişmiyor', async () => {
    const { prisma, cagrilar } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST', url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
        hash: 'sahte-hash',
      }),
    })

    expect(yanit.statusCode).toBe(401)
    expect(cagrilar.paymentUpdate, 'doğrulanmamış callback yazma yapmamalı').toBe(0)
    expect(cagrilar.subscriptionUpdate).toBe(0)
  })

  it('🦷 IDEMPOTENCY: aynı callback iki kez gelince ikincisi yok sayılıyor', async () => {
    const { prisma, cagrilar } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const istek = {
      method: 'POST' as const, url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'ABC123', status: 'success', total_amount: '29900',
        hash: gecerliHash('ABC123', 'success', '29900'),
      }),
    }

    const ilk = await app.inject(istek)
    const ikinci = await app.inject(istek)

    /* İkisi de OK: PayTR hata görürse sonsuza kadar tekrar dener. */
    expect(ilk.body).toBe('OK')
    expect(ikinci.body).toBe('OK')
    /* Ama iş YALNIZ BİR KEZ yapılmış olmalı. */
    expect(cagrilar.paymentUpdate, 'ödeme bir kez güncellenmeli').toBe(1)
    expect(cagrilar.subscriptionUpdate, 'abonelik bir kez aktive edilmeli').toBe(1)
    expect(cagrilar.bildirim, 'tek bildirim üretilmeli').toBe(1)
  })

  it('başarısız ödeme aboneliği aktive ETMİYOR', async () => {
    const { prisma, cagrilar } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST', url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'ABC123', status: 'failed', total_amount: '29900',
        failed_reason_msg: 'Yetersiz bakiye',
        hash: gecerliHash('ABC123', 'failed', '29900'),
      }),
    })

    expect(yanit.body).toBe('OK')
    expect(cagrilar.subscriptionUpdate).toBe(0)
    expect(cagrilar.bildirim).toBe(1)
  })

  it('bilinmeyen sipariş numarasına da OK dönülüyor', async () => {
    const { prisma, cagrilar } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST', url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({
        merchant_oid: 'BILINMEYEN', status: 'success', total_amount: '29900',
        hash: gecerliHash('BILINMEYEN', 'success', '29900'),
      }),
    })

    /* Hata dönmek PayTR'yi sonsuz denemeye sokar ve düzelecek bir şey
       yok — kayıt bizde gerçekten yok. */
    expect(yanit.body).toBe('OK')
    expect(cagrilar.paymentUpdate).toBe(0)
  })

  it('yapılandırma yokken ödeme kapalı', async () => {
    delete process.env.PAYTR_MERCHANT_KEY
    const { prisma } = sahtePrisma()
    const app = await sunucuKur(prisma)

    const yanit = await app.inject({
      method: 'POST', url: '/payments/paytr/callback',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: urlencoded({ merchant_oid: 'ABC123', status: 'success', total_amount: '1', hash: 'x' }),
    })

    expect(yanit.statusCode).toBe(424)
  })
})

/*
 * SATIN ALMA BAŞLATMA.
 *
 * 🔴 Bugün `BILLING_STARTS_AT = null`, yani bu uç HER İSTEĞİ 409 ile
 * reddediyor. Testler bunu bir kusur olarak değil, KORUNAN DAVRANIŞ
 * olarak sınıyor: ön yüzün ödeme ekranını gizlemesine güvenmek yeterli
 * değil, kapı sunucuda olmalı.
 */
describe('satın alma başlatma', () => {
  /**
   * @param ucretlendirmeBaslangici `null` = bugünkü hâl (kapalı).
   *   Bir tarih verildiğinde ücretlendirme AÇIKMIŞ gibi kurulur ve
   *   arkadaki onay kapısı gerçekten çalıştırılabilir.
   */
  /** Token çağrısını taklit eder — testler gerçek PayTR'ye çıkmamalı. */
  function sahteFetch(sonuc: Record<string, unknown> = { status: 'success', token: 'TOKEN123' }) {
    return vi.fn(async () => new Response(JSON.stringify(sonuc), {
      status: 200, headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
  }

  async function checkoutSunucusu(
    ucretlendirmeBaslangici: string | null = null,
    rol = 'learner',
    fetchIslevi: typeof fetch = sahteFetch(),
    faturaKimligi: unknown = FATURA_KIMLIGI,
  ) {
    const app = Fastify()
    /* `authenticate` gerçek JWT eklentisi yerine sahtelendi: sınanan
       şey yetkilendirme değil, onay ve ücretlendirme kapıları. */
    app.decorate('authenticate', async (istek: any) => { istek.user = { id: 7, role: rol } })
    const { prisma } = sahtePrisma()
    const p = prisma as any
    p.user = { findUnique: vi.fn(async () => ({ id: 7, email: 'a@b.com', name: 'X' })) }
    p.userConsent = { createMany: vi.fn(async () => ({ count: 6 })) }
    p.subscription.upsert = vi.fn(async () => ({ id: 'abonelik-1' }))
    p.payment.create = vi.fn(async () => ({}))
    p.billingProfile = {
      findUnique: vi.fn(async () => faturaKimligi),
      upsert: vi.fn(async () => ({})),
    }
    await app.register(paymentRoutes, { prefix: '/payments', prisma, ucretlendirmeBaslangici, fetchIslevi })
    return { app, p }
  }

  const TAM_ONAY = { period: 'monthly', sozlesmeOnayi: true, caymaFeragati: true, otomatikTahsilat: true }

  it('🔴 ücretlendirme kapalıyken satın alma REDDEDİLİYOR', async () => {
    const { app, p } = await checkoutSunucusu()
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM_ONAY })

    expect(yanit.statusCode).toBe(409)
    expect(yanit.json().code).toBe('BILLING_NOT_STARTED')
    expect(p.payment.create, 'kapalıyken sipariş oluşmamalı').not.toHaveBeenCalled()
    expect(p.userConsent.createMany, 'kapalıyken onay yazılmamalı').not.toHaveBeenCalled()
  })

  it('🦷 ücretlendirme AÇIKKEN üç onaydan biri eksikse reddediliyor', async () => {
    /* Ücretlendirme açılmış gibi kuruluyor; kapalıyken ilk kapı her
       isteği 409 ile döndürdüğü için onay kapısına hiç sıra gelmez ve
       test hiçbir şeyi korumazdı. */
    const { app, p } = await checkoutSunucusu('2026-01-01')

    for (const eksik of ['sozlesmeOnayi', 'caymaFeragati', 'otomatikTahsilat']) {
      const yuk: Record<string, unknown> = { ...TAM_ONAY }
      yuk[eksik] = false
      const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: yuk })
      expect(yanit.statusCode, `${eksik} eksikken kabul edilmemeli`).toBe(422)
      expect(yanit.json().code).toBe('CONSENTS_REQUIRED')
    }
    expect(p.payment.create, 'onaysız sipariş oluşmamalı').not.toHaveBeenCalled()
    expect(p.userConsent.createMany, 'onaysız onay yazılmamalı').not.toHaveBeenCalled()
  })

  it('ücretlendirme açıkken ve onaylar tamken sipariş ile onaylar birlikte yazılıyor', async () => {
    const { app, p } = await checkoutSunucusu('2026-01-01')
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM_ONAY })

    expect(yanit.statusCode).toBe(201)
    expect(p.payment.create).toHaveBeenCalledTimes(1)

    /* 🔴 Onaylar ödemeden ÖNCE ve ALTI kalem: dört ticari belge, cayma
       feragati ve otomatik tahsilat izni. */
    const yazilan = p.userConsent.createMany.mock.calls[0][0].data
    expect(yazilan).toHaveLength(6)
    expect(yazilan.map((o: any) => o.documentType)).toEqual(
      expect.arrayContaining(['mesafeli-satis', 'on-bilgilendirme', 'teslimat-iade',
        'abonelik', 'cayma-feragati', 'otomatik-tahsilat-izni'])
    )
    /* Sürüm elle yazılmıyor, LEGAL_DOCUMENTS'ten okunuyor. */
    for (const o of yazilan) expect(o.version).not.toBe('bilinmiyor')
  })

  it('yapılandırma yokken satın alma kapalı', async () => {
    delete process.env.PAYTR_MERCHANT_KEY
    const { app } = await checkoutSunucusu()
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM_ONAY })
    expect(yanit.statusCode).toBe(424)
  })
})

/*
 * TEST KİPİ KAPISI.
 *
 * Ödeme akışının uçtan uca denenmesi gerekiyor, ama bunun için
 * `BILLING_STARTS_AT`i açmak doğrulanmamış bir ödeme ekranını BÜTÜN
 * kullanıcılara göstermek olurdu. Çözüm: test kipi VE admin.
 *
 * 🦷 Aşağıdaki üç test o kapının gerçekten kapı olduğunu koruyor.
 * İkincisi ve üçüncüsü olmadan "test için açtık" diye üretimde bir
 * delik bırakılmış olurdu.
 */
describe('test kipi kapısı', () => {
  function sahteFetch2() {
    return vi.fn(async () => new Response(JSON.stringify({ status: 'success', token: 'TOKEN123' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
  }

  async function kur(rol: string, testKipi: boolean, fetchIslevi: typeof fetch = sahteFetch2()) {
    if (testKipi) process.env.PAYTR_TEST_MODE = 'true'
    else process.env.PAYTR_TEST_MODE = 'false'
    const app = Fastify()
    app.decorate('authenticate', async (istek: any) => { istek.user = { id: 7, role: rol } })
    const { prisma } = sahtePrisma()
    const p = prisma as any
    p.user = { findUnique: vi.fn(async () => ({ id: 7, email: 'a@b.com', name: 'X' })) }
    p.userConsent = { createMany: vi.fn(async () => ({ count: 6 })) }
    p.subscription.upsert = vi.fn(async () => ({ id: 'abonelik-1' }))
    p.payment.create = vi.fn(async () => ({}))
    /* Ücretlendirme KAPALI — bugünkü üretim hâli. */
    await app.register(paymentRoutes, { prefix: '/payments', prisma, ucretlendirmeBaslangici: null, fetchIslevi })
    return { app, p }
  }

  const TAM = { period: 'monthly', sozlesmeOnayi: true, caymaFeragati: true, otomatikTahsilat: true }

  it('test kipi + admin GEÇER', async () => {
    const { app, p } = await kur('admin', true)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })
    expect(yanit.statusCode).toBe(201)
    expect(yanit.json().iframeToken).toBe('TOKEN123')
    expect(yanit.json().iframeUrl).toContain('paytr.com/odeme/guvenli/')
    expect(p.payment.create).toHaveBeenCalledTimes(1)
  })

  it('🦷 test kipi + NORMAL kullanıcı 409 alır', async () => {
    const { app, p } = await kur('learner', true)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })
    expect(yanit.statusCode, 'test kipi herkese kapı açmamalı').toBe(409)
    expect(p.payment.create).not.toHaveBeenCalled()
  })

  it('🦷 test kipi KAPALI + admin de 409 alır', async () => {
    const { app, p } = await kur('admin', false)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })
    expect(yanit.statusCode, 'canlı kipte admin gerçek para çekmemeli').toBe(409)
    expect(p.payment.create).not.toHaveBeenCalled()
  })

  it('token alınamazsa 502 döner ve sipariş PENDING kalır', async () => {
    const basarisiz = vi.fn(async () => new Response(
      JSON.stringify({ status: 'failed', reason: 'invalid merchant_id' }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )) as unknown as typeof fetch

    const { app, p } = await kur('admin', true, basarisiz)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })

    expect(yanit.statusCode).toBe(424)
    expect(yanit.json().code).toBe('PAYMENT_INIT_FAILED')
    /* Sipariş satırı SİLİNMİYOR: PayTR isteği almış olabilir ve
       callback gelebilir. */
    expect(p.payment.create).toHaveBeenCalledTimes(1)
  })
})

/*
 * CSP — ÖDEME ÇERÇEVESİNE İZİN.
 *
 * 🔴 Bu tek satır silinirse ödeme ekranı sessizce çalışmaz: PayTR'nin
 * kart formu yüklenmez, kullanıcı boş bir kutu görür, sunucu
 * günlüğünde HİÇBİR iz kalmaz ve sebep yalnız tarayıcı konsolunda
 * görünür.
 *
 * Kaynak dosya doğrudan okunuyor — CSP bir dize sabiti ve sunucuyu
 * ayağa kaldırmadan sınanabiliyor.
 */
describe('CSP ödeme çerçevesi', () => {
  const kaynak = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')

  it('frame-src PayTR alan adına izin veriyor', () => {
    expect(kaynak).toContain("frame-src 'self' https://www.paytr.com")
  })

  it('🦷 frame-src JOKER içermiyor', () => {
    /* `frame-src *` ya da `https:` yazmak, herhangi bir siteyi
       uygulamanın içine gömülebilir hâle getirirdi. */
    const satir = kaynak.split('\n').find(l => l.includes('frame-src')) ?? ''
    expect(satir).not.toMatch(/frame-src[^"']*\*/)
    expect(satir).not.toMatch(/frame-src\s+[^"']*\bhttps:(?!\/\/)/)
  })
})

/*
 * 🔴 CLOUDFLARE 5xx'İ MASKELİYOR.
 *
 * 31.08.2026'da canlıda yaşandı: PayTR imzayı reddediyordu, sunucu
 * doğru JSON'u üretiyordu, ama tarayıcıya Cloudflare'ın "Bad gateway"
 * HTML'i ulaşıyordu. Sebep ancak sunucu günlüğünden görülebildi.
 *
 * 🦷 Bu test hata yollarının 5xx'e geri dönmesini engelliyor. Kod
 * 502/503'e çevrilirse düşer.
 */
describe('ödeme hata kodları Cloudflare tarafından maskelenmiyor', () => {
  const kaynak = readFileSync(new URL('../src/services/payments/routes.ts', import.meta.url), 'utf8')

  it('checkout ve callback 502/503 DÖNMÜYOR', () => {
    expect(kaynak).not.toMatch(/status\(50[23]\)/)
  })

  it('hata yolları 424 kullanıyor', () => {
    expect(kaynak).toContain('status(424)')
  })
})

/*
 * FATURA KİMLİK BİLGİSİ — SUNUCU KAPISI.
 *
 * 🔴 ÖLÇÜLEN EKSİK: ödeme çalışıyordu ama fatura kesilebilecek hiçbir
 * bilgi toplanmıyordu. PayTR token'ına `user_address` ve `user_phone`
 * olarak "Belirtilmedi" gidiyordu.
 *
 * Ürün sahibi formu ödeme panelinin İÇİNE koymayı seçti, ama bu
 * testlerin konusu ön yüzün sırası DEĞİL: `/checkout` doğrudan da
 * çağrılabilir. Kapı sunucuda değilse, ön yüzü atlayan bir istek yine
 * fatura kesilemeyen bir tahsilat başlatır.
 */
/*
 * FATURA KİMLİK BİLGİSİ — SUNUCU KAPISI.
 *
 * 🔴 ÖLÇÜLEN EKSİK: ödeme çalışıyordu ama fatura kesilebilecek hiçbir
 * bilgi toplanmıyordu. PayTR token'ına `user_address` ve `user_phone`
 * olarak "Belirtilmedi" gidiyordu.
 *
 * Ürün sahibi formu ödeme panelinin İÇİNE koymayı seçti, ama bu
 * testlerin konusu ön yüzün sırası DEĞİL: `/checkout` doğrudan da
 * çağrılabilir. Kapı sunucuda değilse, ön yüzü atlayan bir istek yine
 * fatura kesilemeyen bir tahsilat başlatır.
 */
describe('fatura kimliği', () => {
  const TAM = { period: 'monthly', sozlesmeOnayi: true, caymaFeragati: true, otomatikTahsilat: true }

  function basariliFetch() {
    return vi.fn(async () => new Response(JSON.stringify({ status: 'success', token: 'TOKEN123' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch
  }

  async function kur(faturaKimligi: unknown = FATURA_KIMLIGI, fetchIslevi: typeof fetch = basariliFetch()) {
    process.env.PAYTR_TEST_MODE = 'true'
    const app = Fastify()
    app.decorate('authenticate', async (istek: any) => { istek.user = { id: 7, role: 'learner' } })
    const { prisma } = sahtePrisma()
    const p = prisma as any
    p.user = { findUnique: vi.fn(async () => ({ id: 7, email: 'a@b.com', name: 'X' })) }
    p.userConsent = { createMany: vi.fn(async () => ({ count: 6 })) }
    p.subscription.upsert = vi.fn(async () => ({ id: 'abonelik-1' }))
    p.payment.create = vi.fn(async () => ({}))
    p.billingProfile.findUnique = vi.fn(async () => faturaKimligi)
    await app.register(paymentRoutes, {
      prefix: '/payments', prisma, ucretlendirmeBaslangici: '2026-01-01', fetchIslevi,
    })
    return { app, p }
  }

  it('🦷 fatura bilgisi YOKKEN satın alma REDDEDİLİYOR', async () => {
    /* Ön yüzü atlayıp doğrudan çağıran istek. */
    const { app, p } = await kur(null)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })

    expect(yanit.statusCode).toBe(422)
    expect(yanit.json().code).toBe('BILLING_PROFILE_REQUIRED')
    expect(p.payment.create, 'fatura bilgisi yokken sipariş oluşmamalı').not.toHaveBeenCalled()
  })

  it('🔴 PayTR"ye "Belirtilmedi" DEĞİL gerçek adres ve telefon gidiyor', async () => {
    const govdeler: string[] = []
    const izleyen = (async (_url: string, secenek: any) => {
      govdeler.push(String(secenek?.body ?? ''))
      return new Response(JSON.stringify({ status: 'success', token: 'TOKEN123' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const { app } = await kur(FATURA_KIMLIGI, izleyen)
    const yanit = await app.inject({ method: 'POST', url: '/payments/checkout', payload: TAM })

    expect(yanit.statusCode).toBe(201)
    /* urlencoded gövdede boşluk `+` olarak kodlanıyor; okunur hâle
       getirmeden `İstanbul` ve adres aramak hep başarısız olurdu. */
    const govde = decodeURIComponent(govdeler[0].split('+').join(' '))

    expect(govde, 'yer tutucu kalmamalı').not.toContain('Belirtilmedi')
    expect(govde).toContain('5321112233')
    /* Adres tek satırda: adres, ilçe, il. */
    expect(govde).toContain('Atatürk Caddesi No 12, Kadıköy, İstanbul')
    /* Ad hesap adından DEĞİL fatura kimliğinden geliyor: fatura kime
       kesilecekse PayTR'ye giden ad da o olmalı. Kurumsalda bu,
       kişinin adı değil ticari unvan. */
    expect(govde).toContain('Ayşe Yılmaz')
  })

  it('kayıt yokken 404 DEĞİL, boş dönüyor', async () => {
    /* "Henüz doldurmadın" bir hata değil, formun ilk hâli. 404
       dönmek arayüzü hata gösterip formu gizlemeye iterdi. */
    const { app } = await kur(null)
    const yanit = await app.inject({ method: 'GET', url: '/payments/fatura-kimligi' })

    expect(yanit.statusCode).toBe(200)
    expect(yanit.json().faturaKimligi).toBeNull()
  })

  it('geçersiz gövde ALAN ALAN hata dönüyor', async () => {
    const { app } = await kur()
    const yanit = await app.inject({
      method: 'PUT',
      url: '/payments/fatura-kimligi',
      payload: { tip: 'INDIVIDUAL', unvan: 'A' },
    })

    expect(yanit.statusCode).toBe(422)
    expect(yanit.json().code).toBe('BILLING_PROFILE_INVALID')
    /* Tek bir "form hatalı" mesajı hangi kutunun düzeltileceğini
       söylemez. */
    expect(Object.keys(yanit.json().hatalar)).toContain('adres')
  })

  it('🔴 hata yanıtı gönderilen KİMLİK NUMARASINI yankılamıyor', async () => {
    /* Yankılamak, o değerin proxy günlüklerine ve hata izlemesine
       düşmesi demek olurdu. */
    const { app } = await kur()
    const yanit = await app.inject({
      method: 'PUT',
      url: '/payments/fatura-kimligi',
      payload: { tip: 'INDIVIDUAL', unvan: 'A', tckn: '12345678901' },
    })

    expect(yanit.body).not.toContain('12345678901')
  })

  it('geçerli kurumsal gövde kaydediliyor', async () => {
    const { app, p } = await kur()
    const yanit = await app.inject({
      method: 'PUT',
      url: '/payments/fatura-kimligi',
      payload: {
        tip: 'CORPORATE',
        unvan: 'Örnek Ticaret Limited Şirketi',
        vkn: '1234567890',
        vergiDairesi: 'Kadıköy',
        telefon: '0532 111 22 33',
        adres: 'Atatürk Caddesi No 12',
        il: 'İstanbul',
        ilce: 'Kadıköy',
      },
    })

    expect(yanit.statusCode).toBe(200)
    expect(p.billingProfile.upsert).toHaveBeenCalledTimes(1)
    const yazilan = p.billingProfile.upsert.mock.calls[0][0].update
    expect(yazilan.vkn).toBe('1234567890')
    expect(yazilan.phone, '+90 ve baştaki 0 atılmalı').toBe('5321112233')
  })
})
