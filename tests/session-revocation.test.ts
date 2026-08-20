import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/**
 * Oturum iptali (tokenVersion).
 *
 * ÖNCEKİ DAVRANIŞ: JWT 8 saat geçerliydi ve iptal edilemiyordu. Kullanıcı
 * hesabının ele geçirildiğinden şüphelenip şifresini değiştirse bile,
 * saldırganın elindeki token 8 saat boyunca çalışmaya devam ediyordu —
 * çünkü şifre değişimi yalnızca `password` alanını güncelliyordu.
 *
 * Bu testler, sürüm artışının mevcut tokenları gerçekten öldürdüğünü ve
 * eski (tv claim'i olmayan) tokenların dağıtım anında geçerliliğini
 * koruduğunu doğruluyor.
 */

const prisma = new PrismaClient()
const marker = `revoke-${Date.now()}`
const password = 'StrongTestPassword!42'
let app: FastifyInstance
let userId: number

beforeAll(async () => {
  process.env.JWT_SECRET = 'revocation-test-secret-key-min-32-bytes'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
  const user = await prisma.user.create({
    data: { email: `${marker}@test.local`, password: await bcrypt.hash(password, 10), name: 'Revoke Test', role: 'learner' }
  })
  userId = user.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
})

/** Giriş yapıp token alır — gerçek akış, elle sign etmiyoruz. */
async function girisYap(sifre = password): Promise<string> {
  const r = await app.inject({
    method: 'POST', url: '/auth/login',
    payload: { email: `${marker}@test.local`, password: sifre }
  })
  expect(r.statusCode).toBe(200)
  return r.json().token
}

async function beniGetir(token: string) {
  return app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } })
}

describe('geriye dönük uyumluluk', () => {
  it('tv alanı OLMAYAN token, sürüm 0 iken çalışır', async () => {
    /* Bu değişiklikten önce üretilmiş tokenların şekli. Dağıtım anında
       kimsenin oturumdan atılmaması gerekiyor. */
    const eskiToken = app.jwt.sign({ id: userId, email: `${marker}@test.local`, role: 'learner' })
    const r = await beniGetir(eskiToken)
    expect(r.statusCode).toBe(200)
  })
})

describe('şifre değişimi oturumları iptal eder', () => {
  it('başka cihazın tokeni ölür, değiştiren cihaz oturumda kalır', async () => {
    const digerCihaz = await girisYap()
    const buCihaz = await girisYap()

    /* İkisi de baştan çalışıyor. */
    expect((await beniGetir(digerCihaz)).statusCode).toBe(200)
    expect((await beniGetir(buCihaz)).statusCode).toBe(200)

    const yeniSifre = 'YepyeniGucluParola!91'
    const degis = await app.inject({
      method: 'PUT', url: '/auth/password',
      headers: { authorization: `Bearer ${buCihaz}` },
      payload: { currentPassword: password, newPassword: yeniSifre }
    })
    expect(degis.statusCode).toBe(200)

    /* ASIL İDDİA: saldırganın (diğer cihazın) tokeni artık ölü. */
    const digerSonuc = await beniGetir(digerCihaz)
    expect(digerSonuc.statusCode).toBe(401)
    expect(digerSonuc.json().reason).toBe('SESSION_REVOKED')

    /* Eski token da ölü olmalı — değiştiren cihaz taze token almalı. */
    expect((await beniGetir(buCihaz)).statusCode).toBe(401)

    const tazeToken = degis.json().token
    expect(tazeToken).toBeTruthy()
    expect((await beniGetir(tazeToken)).statusCode).toBe(200)

    /* Yanıt /auth/email ile aynı şekilde — frontend replaceSession bekliyor. */
    expect(degis.json().user.email).toBe(`${marker}@test.local`)

    /* Şifreyi geri al ki sonraki testler bilinen paroladan devam etsin. */
    const geri = await app.inject({
      method: 'PUT', url: '/auth/password',
      headers: { authorization: `Bearer ${tazeToken}` },
      payload: { currentPassword: yeniSifre, newPassword: password }
    })
    expect(geri.statusCode).toBe(200)
  })

  it('sürüm artınca tv alanı olmayan ESKİ token da reddedilir', async () => {
    const eskiToken = app.jwt.sign({ id: userId, email: `${marker}@test.local`, role: 'learner' })
    /* Yukarıdaki test sürümü artırdı (>= 1), dolayısıyla örtük 0 artık tutmuyor. */
    const r = await beniGetir(eskiToken)
    expect(r.statusCode).toBe(401)
    expect(r.json().reason).toBe('SESSION_REVOKED')
  })
})

describe('POST /auth/logout-all', () => {
  it('tüm oturumları kapatır ve çağırana taze token verir', async () => {
    const cihazA = await girisYap()
    const cihazB = await girisYap()
    expect((await beniGetir(cihazA)).statusCode).toBe(200)

    const cikis = await app.inject({
      method: 'POST', url: '/auth/logout-all',
      headers: { authorization: `Bearer ${cihazB}` }
    })
    expect(cikis.statusCode).toBe(200)

    expect((await beniGetir(cihazA)).statusCode).toBe(401)
    expect((await beniGetir(cihazB)).statusCode).toBe(401)
    expect((await beniGetir(cikis.json().token)).statusCode).toBe(200)
  })

  it('kimlik doğrulaması olmadan reddedilir', async () => {
    const r = await app.inject({ method: 'POST', url: '/auth/logout-all' })
    expect(r.statusCode).toBe(401)
  })

  it('denetim kaydı bırakır', async () => {
    const kayit = await prisma.auditLog.findFirst({
      where: { actorId: userId, action: 'auth.sessions_revoked' }
    })
    expect(kayit).not.toBeNull()
  })
})

describe('parola politikası kayıt ve değiştirmede AYNI', () => {
  it('9 karakterlik yeni şifre reddedilir (önceden 8 yeterliydi)', async () => {
    const token = await girisYap()
    const r = await app.inject({
      method: 'PUT', url: '/auth/password',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentPassword: password, newPassword: 'Kisa!123x' }
    })
    /* Bu uç nokta doğrulama hatasında 400 döner (kayıt ise 422 döner —
       uç noktalar arasında tutarsız ama mevcut sözleşme bu). */
    expect(r.statusCode).toBe(400)
    expect(r.json().fields).toContain('newPassword')
  })

  it('9 karakterlik kayıt da reddedilir', async () => {
    const r = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { email: `${marker}-kisa@test.local`, password: 'Kisa!123x', name: 'Kisa Parola' }
    })
    expect(r.statusCode).toBe(422)
  })
})
