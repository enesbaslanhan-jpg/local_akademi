import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/**
 * Karşılama turu bayrağı.
 *
 * Turun bayrağı ANKETİNKİNDEN AYRI. Bu ayrımın kendisi test ediliyor:
 * ikisi tek alana bağlanırsa anketi sıfırlayan kullanıcı turu göremez
 * (ya da tersi) ve bunu fark etmek zordur — ekranda hiçbir hata çıkmaz,
 * sadece beklenen ekran gelmez.
 */

const prisma = new PrismaClient()
const marker = `tour-${Date.now()}`
let app: FastifyInstance
const temizlenecek: number[] = []

beforeAll(async () => {
  process.env.JWT_SECRET = 'welcome-tour-test-secret-min-32-byte!'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await prisma.userPreference.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.businessProfile.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.userConsent.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: temizlenecek } } })
  await prisma.user.deleteMany({ where: { email: { contains: marker } } })
  await app.close()
  await prisma.$disconnect()
})

/*
 * Kullanici DOGRUDAN veritabaninda aciliyor, /auth/register uzerinden
 * DEGIL: kayit ucunda saatte 5 istek siniri var ve bu dosya sekiz
 * kullanici gerektiriyor. Depodaki mevcut desen bu (bkz.
 * session-revocation.test.ts) - token app.jwt.sign ile uretiliyor.
 */
async function kullanici(ek: string) {
  const email = `${marker}-${ek}@test.local`
  const created = await prisma.user.create({
    data: { email, password: 'test-hash-kullanilmiyor', name: 'Tur Testi' }
  })
  temizlenecek.push(created.id)
  const token = app.jwt.sign({ id: created.id, email, role: created.role, tv: created.tokenVersion })
  return { id: created.id, token }
}

const yetki = (token: string) => ({ authorization: `Bearer ${token}` })

async function durum(token: string) {
  const res = await app.inject({ method: 'GET', url: '/onboarding/status', headers: yetki(token) })
  return res.json()
}

describe('karşılama turu', () => {
  it('yeni kullanıcıda tur tamamlanmamış görünür', async () => {
    const u = await kullanici('yeni')
    expect((await durum(u.token)).tourCompleted).toBe(false)
  })

  it('tamamlanınca true döner ve kalıcıdır', async () => {
    const u = await kullanici('tamam')
    const res = await app.inject({ method: 'POST', url: '/onboarding/tour/complete', headers: yetki(u.token) })
    expect(res.statusCode).toBe(200)
    expect(res.json().tourCompleted).toBe(true)
    expect((await durum(u.token)).tourCompleted).toBe(true)
  })

  it('sıfırlanınca yeniden false olur', async () => {
    const u = await kullanici('sifirla')
    await app.inject({ method: 'POST', url: '/onboarding/tour/complete', headers: yetki(u.token) })
    const res = await app.inject({ method: 'POST', url: '/onboarding/tour/reset', headers: yetki(u.token) })
    expect(res.statusCode).toBe(200)
    expect((await durum(u.token)).tourCompleted).toBe(false)
  })

  it('🔴 turu tamamlamak ANKETİ etkilemez', async () => {
    const u = await kullanici('anket-korunur')
    await prisma.userPreference.upsert({
      where: { userId: u.id },
      create: { userId: u.id, onboardingCompleted: true },
      update: { onboardingCompleted: true }
    })
    await app.inject({ method: 'POST', url: '/onboarding/tour/complete', headers: yetki(u.token) })
    const d = await durum(u.token)
    expect(d.tourCompleted).toBe(true)
    expect(d.onboardingCompleted).toBe(true)
  })

  it('🔴 ANKETİ sıfırlamak turu geri getirmez', async () => {
    const u = await kullanici('anket-sifir')
    await app.inject({ method: 'POST', url: '/onboarding/tour/complete', headers: yetki(u.token) })
    await app.inject({ method: 'POST', url: '/onboarding/reset', payload: {}, headers: yetki(u.token) })
    const d = await durum(u.token)
    expect(d.onboardingCompleted).toBe(false)
    /* Tur BİTMİŞ kalmalı: kullanıcı anketi tekrar doldurmak istedi diye
       ürün tanıtımını yeniden izlemek zorunda değil. */
    expect(d.tourCompleted).toBe(true)
  })

  it('🔴 TURU sıfırlamak anketi geri getirmez', async () => {
    const u = await kullanici('tur-sifir')
    await prisma.userPreference.upsert({
      where: { userId: u.id },
      create: { userId: u.id, onboardingCompleted: true },
      update: { onboardingCompleted: true }
    })
    await app.inject({ method: 'POST', url: '/onboarding/tour/reset', headers: yetki(u.token) })
    const d = await durum(u.token)
    expect(d.tourCompleted).toBe(false)
    expect(d.onboardingCompleted).toBe(true)
  })

  it('oturumsuz erişilemez', async () => {
    for (const url of ['/onboarding/tour/complete', '/onboarding/tour/reset']) {
      const res = await app.inject({ method: 'POST', url })
      expect(res.statusCode).toBe(401)
    }
  })

  it('tercih satırı yokken de çalışır (upsert)', async () => {
    const u = await kullanici('tercihsiz')
    const yok = await prisma.userPreference.findUnique({ where: { userId: u.id } })
    expect(yok).toBeNull()
    const res = await app.inject({ method: 'POST', url: '/onboarding/tour/complete', headers: yetki(u.token) })
    expect(res.statusCode).toBe(200)
  })
})
