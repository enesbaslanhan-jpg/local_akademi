import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { hashToken } from '../src/lib/tokens'

/**
 * Şifre sıfırlama.
 *
 * Kullanıcı şifresini unuttuğunda hesabına dönmesinin tek yolu, dolayısıyla
 * saldırı yüzeyi. Testlerin ağırlığı üç iddiada:
 *   1. İstek uç noktası hangi e-postaların kayıtlı olduğunu SIZDIRMAZ.
 *   2. Token tek kullanımlık ve süreli.
 *   3. Sıfırlama tüm eski oturumları öldürür (`tokenVersion`).
 */

const prisma = new PrismaClient()
const marker = `reset-${Date.now()}`
const email = `${marker}@test.local`
const password = 'EskiGucluParola!42'
let app: FastifyInstance
let userId: number

beforeAll(async () => {
  process.env.JWT_SECRET = 'reset-test-secret-key-min-32-bytes-long'
  process.env.NODE_ENV = 'test'
  delete process.env.RESEND_API_KEY /* gönderim konsola gider */
  /* Tek ters vekil arkasındaki üretim kurulumunu taklit eder; testlerin ayrı
     IP'lerden geliyormuş gibi davranabilmesi için gerekli. Varsayılan
     yapılandırmada başlık YOK SAYILIR — bkz. tests/trust-proxy.test.ts. */
  process.env.TRUST_PROXY = '1'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
  const user = await prisma.user.create({
    data: {
      email, password: await bcrypt.hash(password, 10), name: 'Reset Test', role: 'learner',
      emailVerifiedAt: new Date() /* sıfırlama yalnız doğrulanmış adrese gider */
    }
  })
  userId = user.id
})

afterAll(async () => {
  /*
   * TRUST_PROXY temizlenmeli: testler tek süreçte sırayla çalışıyor, burada
   * bırakılan değer SONRAKİ test dosyalarının sunucu yapılandırmasına
   * sızıyor ve hız sınırı anahtarlamasını değiştiriyordu.
   */
  delete process.env.TRUST_PROXY
  await prisma.passwordResetToken.deleteMany({ where: { userId } })
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
})

/*
 * İstek uç noktasında saatte 3 istek sınırı var (kasıtlı: sıfırlama e-postası
 * yağdırmayı engeller). Sunucuda `trustProxy: true` olduğu için hız sınırı
 * `x-forwarded-for` ile anahtarlanıyor; testler birbirinin kotasını
 * yemesin diye her çağrı ayrı bir IP'den geliyormuş gibi yapılıyor.
 */
let ipSayaci = 0
async function sifirlamaIste(adres: string, ip?: string) {
  ipSayaci += 1
  return app.inject({
    method: 'POST',
    url: '/auth/password-reset/request',
    headers: { 'x-forwarded-for': ip ?? `10.0.0.${ipSayaci}` },
    payload: { email: adres }
  })
}

/** Veritabanındaki en son tokenı bulup ham karşılığını üretemeyiz (özet
    saklanıyor) — bu yüzden test ham tokenı kendi üretip özetini yazıyor. */
async function tokenOlustur(saatSonra = 1): Promise<string> {
  const raw = `ham-token-${Date.now()}-${Math.random().toString(16).slice(2)}`
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + saatSonra * 60 * 60 * 1000)
    }
  })
  return raw
}

describe('istek uç noktası e-posta sızdırmaz', () => {
  it('kayıtlı adres 200 döner', async () => {
    const r = await sifirlamaIste(email)
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ success: true })
  })

  it('KAYITSIZ adres de AYNI cevabı döner', async () => {
    /* Farklı cevap vermek, hangi adreslerin sistemde olduğunu sızdırır. */
    const r = await sifirlamaIste(`yok-${Date.now()}@test.local`)
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ success: true })
  })

  it('geçersiz e-posta biçimi de aynı cevabı döner', async () => {
    const r = await sifirlamaIste('bu-bir-eposta-degil')
    expect(r.statusCode).toBe(200)
    expect(r.json()).toEqual({ success: true })
  })

  it('kayıtlı adres için gerçekten token üretilir', async () => {
    const oncesi = await prisma.passwordResetToken.count({ where: { userId } })
    await sifirlamaIste(email)
    const sonrasi = await prisma.passwordResetToken.count({ where: { userId } })
    expect(sonrasi).toBe(oncesi + 1)
  })

  it('token ham haliyle SAKLANMAZ', async () => {
    const kayit = await prisma.passwordResetToken.findFirst({
      where: { userId }, orderBy: { createdAt: 'desc' }
    })
    /* sha256 hex = 64 karakter, okunabilir bir token değil. */
    expect(kayit!.tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('aynı kaynaktan art arda istek hız sınırına takılır', async () => {
    /* Sınır olmasa, bir adrese sınırsız sıfırlama e-postası yağdırılabilirdi. */
    const ip = '203.0.113.99'
    const kodlar: number[] = []
    for (let i = 0; i < 5; i++) {
      kodlar.push((await sifirlamaIste(email, ip)).statusCode)
    }
    expect(kodlar.filter(k => k === 200).length).toBe(3)
    expect(kodlar.filter(k => k === 429).length).toBe(2)
  })
})

describe('doğrulanmamış adrese sıfırlama gönderilmez', () => {
  it('doğrulanmamış kullanıcı için token üretilmez', async () => {
    const dogrulanmamis = await prisma.user.create({
      data: {
        email: `${marker}-nv@test.local`,
        password: await bcrypt.hash(password, 10),
        name: 'Doğrulanmamış', role: 'learner'
      }
    })
    const r = await sifirlamaIste(`${marker}-nv@test.local`)
    expect(r.statusCode).toBe(200) /* cevap yine ayırt edilemez */
    const adet = await prisma.passwordResetToken.count({ where: { userId: dogrulanmamis.id } })
    expect(adet).toBe(0)
    await prisma.user.delete({ where: { id: dogrulanmamis.id } })
  })
})

describe('token doğrulama', () => {
  it('var olmayan token reddedilir', async () => {
    const r = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: 'a'.repeat(64), newPassword: 'YeniGucluParola!91' }
    })
    expect(r.statusCode).toBe(400)
    expect(r.json().error).toBe('INVALID_RESET_TOKEN')
  })

  it('süresi geçmiş token reddedilir', async () => {
    const raw = await tokenOlustur(-1) /* 1 saat ÖNCE dolmuş */
    const r = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: raw, newPassword: 'YeniGucluParola!91' }
    })
    expect(r.statusCode).toBe(400)
    expect(r.json().error).toBe('INVALID_RESET_TOKEN')
  })

  it('kısa parola reddedilir (Faz 5 kuralı geçerli)', async () => {
    const raw = await tokenOlustur()
    const r = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: raw, newPassword: 'Kisa!123x' }
    })
    expect(r.statusCode).toBe(400)
    expect(r.json().fields).toContain('newPassword')
  })
})

describe('başarılı sıfırlama', () => {
  it('şifreyi değiştirir, oturum verir ve TÜM eski oturumları öldürür', async () => {
    /* Saldırganın açık oturumunu temsil eden token. */
    const giris = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password }
    })
    expect(giris.statusCode).toBe(200)
    const eskiOturum = giris.json().token
    expect((await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${eskiOturum}` }
    })).statusCode).toBe(200)

    const raw = await tokenOlustur()
    const yeniSifre = 'SifirlanmisParola!77'
    const r = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: raw, newPassword: yeniSifre }
    })
    expect(r.statusCode).toBe(200)

    /* ASIL İDDİA: sıfırlama açık oturumları öldürür. */
    const eskiSonuc = await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${eskiOturum}` }
    })
    expect(eskiSonuc.statusCode).toBe(401)

    /* Kullanıcı doğrudan oturum açmış olur. */
    const tazeOturum = r.json().token
    expect((await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${tazeOturum}` }
    })).statusCode).toBe(200)

    /* Yeni şifre gerçekten geçerli, eskisi değil. */
    expect((await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password: yeniSifre }
    })).statusCode).toBe(200)
    expect((await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password }
    })).statusCode).toBe(401)
  })

  it('kullanılan token İKİNCİ kez çalışmaz', async () => {
    const raw = await tokenOlustur()
    const ilk = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: raw, newPassword: 'BirinciParola!88' }
    })
    expect(ilk.statusCode).toBe(200)

    const ikinci = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: raw, newPassword: 'IkinciParola!88' }
    })
    expect(ikinci.statusCode).toBe(400)
    expect(ikinci.json().error).toBe('INVALID_RESET_TOKEN')
  })

  it('bekleyen DİĞER tokenlar da geçersiz olur', async () => {
    const eski = await tokenOlustur()
    const yeni = await tokenOlustur()

    /* Yeni tokenla sıfırla. */
    expect((await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: yeni, newPassword: 'UcuncuParola!99' }
    })).statusCode).toBe(200)

    /* Önceden istenmiş token da ölmüş olmalı — aksi halde birden çok
       sıfırlama e-postası isteyen saldırgan elinde geçerli token tutardı. */
    const r = await app.inject({
      method: 'POST', url: '/auth/password-reset/confirm',
      payload: { token: eski, newPassword: 'DorduncuParola!99' }
    })
    expect(r.statusCode).toBe(400)
  })
})
