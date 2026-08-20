import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/**
 * `emailVerified` alanının istemciye ULAŞMASI.
 *
 * Doğrulama şeridi bu alana bakıyor. Alan yanıtta yoksa şerit hiç
 * görünmez — yani doğrulanmamış kullanıcı hiç uyarılmaz ve eksiklik
 * sessizce kaybolur. Bu yüzden üç uç noktanın (register, login, me)
 * üçü de ayrı ayrı ölçülüyor: biri unutulursa test çökmeli.
 */

const prisma = new PrismaClient()
const marker = `verifyflag-${Date.now()}`
let app: FastifyInstance
const temizlenecek: number[] = []

beforeAll(async () => {
  process.env.JWT_SECRET = 'email-verified-flag-test-secret-32b!'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await prisma.userConsent.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: temizlenecek } } })
  await prisma.user.deleteMany({ where: { email: { contains: marker } } })
  await app.close()
  await prisma.$disconnect()
})

async function kayitOl(ek: string) {
  const res = await app.inject({
    method: 'POST', url: '/auth/register',
    payload: {
      email: `${marker}-${ek}@test.local`,
      password: 'GucluTestParolasi!42',
      name: 'Dogrulama Testi',
      acceptedLegal: true
    }
  })
  const body = res.json()
  if (body?.user?.id) temizlenecek.push(body.user.id)
  return { res, body }
}

describe('emailVerified alanı yanıtlarda', () => {
  it('register yanıtında bulunur ve yeni hesapta false olur', async () => {
    const { res, body } = await kayitOl('reg')
    expect(res.statusCode).toBe(200)
    expect(body.user).toHaveProperty('emailVerified')
    expect(body.user.emailVerified).toBe(false)
  })

  it('login yanıtında bulunur', async () => {
    await kayitOl('login')
    const res = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `${marker}-login@test.local`, password: 'GucluTestParolasi!42' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user).toHaveProperty('emailVerified')
    expect(res.json().user.emailVerified).toBe(false)
  })

  it('/auth/me yanıtında bulunur', async () => {
    const { body } = await kayitOl('me')
    const res = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${body.token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('emailVerified')
    expect(res.json().emailVerified).toBe(false)
  })

  it('emailVerifiedAt dolunca true döner', async () => {
    const { body } = await kayitOl('dolu')
    await prisma.user.update({
      where: { id: body.user.id },
      data: { emailVerifiedAt: new Date() }
    })
    const res = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${body.token}` }
    })
    expect(res.json().emailVerified).toBe(true)
  })

  it('doğrulama sonrası /auth/me true döner (uçtan uca)', async () => {
    const { body } = await kayitOl('uctan')
    const oncesi = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${body.token}` }
    })
    expect(oncesi.json().emailVerified).toBe(false)

    await prisma.user.update({
      where: { id: body.user.id },
      data: { emailVerifiedAt: new Date() }
    })

    const sonrasi = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { authorization: `Bearer ${body.token}` }
    })
    expect(sonrasi.json().emailVerified).toBe(true)
  })
})
