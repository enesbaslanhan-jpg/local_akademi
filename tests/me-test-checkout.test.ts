import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/*
 * `/me` ÜYELİK YÜKÜ, GİRİŞİNKİYLE AYNI OLMALI.
 *
 * 🔴 ÖLÇÜLEN ARIZA (31.08.2026). `testCheckout` bayrağı giriş ve
 * kayıt yanıtlarında vardı ama `/me`de YOKTU. Arayüz oturumu her
 * sayfa yüklemesinde `/me`den tazelediği için yönetici test kutusu
 * SAYFA YENİLENİR YENİLENMEZ kayboluyordu — düğme yalnız girişten
 * hemen sonraki ekranda vardı.
 *
 * Ürün sahibi "üye ol senaryosunu nerden başlatacağım" diye sorduğunda
 * eklenen tek giriş noktası buydu; yenilemede kaybolması onu neredeyse
 * yok saymaktı. Hiçbir test bu alanı sınamıyordu, bu yüzden sessizce
 * yaşadı.
 *
 * ⚠️ Bu test bayrağın DEĞERİNİ değil, ALANLARIN AYNI OLMASINI
 * koruyor. Değer ortama bağlı (PayTR test kipi + admin); asıl
 * korunması gereken şey iki ucun ayrışmaması.
 */

const prisma = new PrismaClient()
const isaret = `me-checkout-${Date.now()}`
const sifre = 'StrongTestPassword!42'
let app: FastifyInstance
let userId: number
let token: string

beforeAll(async () => {
  process.env.JWT_SECRET = 'me-checkout-test-secret-key-min-32-bytes'
  process.env.NODE_ENV = 'test'
  /* Test kipi AÇIK ve kullanıcı admin: bayrağın gerçekten `true`
     olabildiği tek senaryo. Kapalı bırakılsaydı her iki uç da
     `false` döner ve test ayrışmayı yakalayamazdı. */
  process.env.PAYTR_MERCHANT_ID = '123456'
  process.env.PAYTR_MERCHANT_KEY = 'anahtar'
  process.env.PAYTR_MERCHANT_SALT = 'tuz'
  process.env.PAYTR_TEST_MODE = 'true'

  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()

  const kullanici = await prisma.user.create({
    data: {
      email: `${isaret}@test.local`,
      password: await bcrypt.hash(sifre, 10),
      name: 'Me Checkout',
      role: 'admin',
    },
  })
  userId = kullanici.id
  token = app.jwt.sign({ id: kullanici.id, email: kullanici.email, role: kullanici.role })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
  delete process.env.PAYTR_MERCHANT_ID
  delete process.env.PAYTR_MERCHANT_KEY
  delete process.env.PAYTR_MERCHANT_SALT
  delete process.env.PAYTR_TEST_MODE
})

describe('/me üyelik yükü', () => {
  it('🦷 `testCheckout` alanını TAŞIYOR — yenilemede kaybolmuyor', async () => {
    const yanit = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(yanit.statusCode).toBe(200)
    const uyelik = yanit.json().membership
    expect(uyelik, '/me üyelik göndermeli').toBeTruthy()
    expect(uyelik.testCheckout, 'yönetici + test kipinde açık olmalı').toBe(true)
  })

  it('🦷 `/me` ile GİRİŞ aynı alanları gönderiyor', async () => {
    const girisYaniti = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `${isaret}@test.local`, password: sifre },
    })
    expect(girisYaniti.statusCode).toBe(200)

    const meYaniti = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })

    /*
     * Alan ADLARI karşılaştırılıyor, değerleri değil: `trialDaysLeft`
     * gibi alanlar zamana bağlı. Ayrışma her zaman "bir uçta var,
     * ötekinde yok" biçiminde oluyor — bu testin yakaladığı da o.
     */
    const girisAlanlari = Object.keys(girisYaniti.json().user.membership).sort()
    const meAlanlari = Object.keys(meYaniti.json().membership).sort()

    expect(meAlanlari).toEqual(girisAlanlari)
  })
})
