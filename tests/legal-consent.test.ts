import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { LEGAL_DOCUMENTS, requiredDocuments } from '../src/config/legal-documents'

/**
 * Yasal onay kaydı.
 *
 * KVKK açısından önemli olan onayı KANITLAYABİLMEK: kim, ne zaman, metnin
 * hangi sürümünü kabul etti. Arayüzdeki kutu tek başına kanıt değil —
 * kayıt uç noktası doğrudan da çağrılabilir.
 */

const prisma = new PrismaClient()
const marker = `consent-${Date.now()}`
let app: FastifyInstance
const temizlenecek: number[] = []

beforeAll(async () => {
  process.env.JWT_SECRET = 'legal-consent-test-secret-min-32-byte'
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

async function kayitOl(ek: string, payload: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST', url: '/auth/register',
    payload: {
      email: `${marker}-${ek}@test.local`,
      password: 'GucluTestParolasi!42',
      name: `Onay ${ek}`,
      ...payload
    }
  })
}

describe('kayıtta onay zorunlu', () => {
  it('acceptedLegal olmadan kayıt REDDEDİLİR', async () => {
    const r = await kayitOl('yok')
    expect(r.statusCode).toBe(422)
  })

  it('acceptedLegal false ise reddedilir', async () => {
    const r = await kayitOl('false', { acceptedLegal: false })
    expect(r.statusCode).toBe(422)
  })

  it('reddedilen kayıtta KULLANICI OLUŞMAZ', async () => {
    /* Doğrulama hatası kullanıcıyı yaratıp sonra geri almamalı. */
    const kalan = await prisma.user.count({ where: { email: { contains: `${marker}-yok` } } })
    expect(kalan).toBe(0)
  })

  it('onaylı kayıt başarılı olur', async () => {
    const r = await kayitOl('ok', { acceptedLegal: true })
    expect(r.statusCode).toBe(200)
    temizlenecek.push(r.json().user.id)
  })
})

describe('onay kaydı veritabanına yazılır', () => {
  it('zorunlu her metin için bir kayıt oluşur', async () => {
    const kullanici = await prisma.user.findUnique({
      where: { email: `${marker}-ok@test.local` }
    })
    const kabuller = await prisma.userConsent.findMany({ where: { userId: kullanici!.id } })

    expect(kabuller).toHaveLength(requiredDocuments().length)
    for (const doc of requiredDocuments()) {
      const k = kabuller.find(x => x.documentType === doc.type)
      expect(k).toBeDefined()
      /* SÜRÜM kaydediliyor — metin değişince eski onay yeni metni kapsamaz. */
      expect(k!.version).toBe(doc.version)
      expect(k!.acceptedAt).toBeInstanceOf(Date)
    }
  })

  it('kullanıcı ve onay AYNI işlemde yazılır', async () => {
    /* Ayrı yazılsaydı ikinci adım düştüğünde onaysız hesap kalırdı.
       Her başarılı kayıtta onay sayısı kullanıcı sayısıyla orantılı. */
    const kullanicilar = await prisma.user.findMany({
      where: { email: { contains: marker } }, select: { id: true }
    })
    for (const u of kullanicilar) {
      const adet = await prisma.userConsent.count({ where: { userId: u.id } })
      expect(adet).toBe(requiredDocuments().length)
    }
  })
})

describe('GET /auth/legal-documents', () => {
  it('metinleri ve sürümleri döner (oturum gerekmez)', async () => {
    const r = await app.inject({ method: 'GET', url: '/auth/legal-documents' })
    expect(r.statusCode).toBe(200)
    expect(r.json().documents).toHaveLength(LEGAL_DOCUMENTS.length)
    for (const d of r.json().documents) {
      expect(d.version).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('GET /auth/consents', () => {
  it('güncel kullanıcıda eksik onay YOK', async () => {
    const kullanici = await prisma.user.findUnique({ where: { email: `${marker}-ok@test.local` } })
    const token = app.jwt.sign({
      id: kullanici!.id, email: kullanici!.email, role: kullanici!.role, tv: kullanici!.tokenVersion
    })
    const r = await app.inject({
      method: 'GET', url: '/auth/consents', headers: { authorization: `Bearer ${token}` }
    })
    expect(r.statusCode).toBe(200)
    expect(r.json().missing).toHaveLength(0)
    expect(r.json().accepted.length).toBe(requiredDocuments().length)
  })

  it('kimlik doğrulaması olmadan reddedilir', async () => {
    const r = await app.inject({ method: 'GET', url: '/auth/consents' })
    expect(r.statusCode).toBe(401)
  })
})

describe('metin sürümü artınca yeniden onay istenir', () => {
  it('eski sürümlü onay EKSİK sayılır ve POST ile kapatılır', async () => {
    const kullanici = await prisma.user.findUnique({ where: { email: `${marker}-ok@test.local` } })
    const token = app.jwt.sign({
      id: kullanici!.id, email: kullanici!.email, role: kullanici!.role, tv: kullanici!.tokenVersion
    })

    /* Onayları eski bir sürüme çevirerek "metin güncellendi" durumunu
       taklit ediyoruz. */
    await prisma.userConsent.deleteMany({ where: { userId: kullanici!.id } })
    await prisma.userConsent.createMany({
      data: requiredDocuments().map(d => ({
        userId: kullanici!.id, documentType: d.type, version: '2020-01-01'
      }))
    })

    const once = await app.inject({
      method: 'GET', url: '/auth/consents', headers: { authorization: `Bearer ${token}` }
    })
    expect(once.json().missing).toHaveLength(requiredDocuments().length)

    const kabul = await app.inject({
      method: 'POST', url: '/auth/consents',
      headers: { authorization: `Bearer ${token}` }, payload: {}
    })
    expect(kabul.statusCode).toBe(200)
    expect(kabul.json().added).toBe(requiredDocuments().length)

    const sonra = await app.inject({
      method: 'GET', url: '/auth/consents', headers: { authorization: `Bearer ${token}` }
    })
    expect(sonra.json().missing).toHaveLength(0)

    /* Eski onay SİLİNMEZ — geçmiş kayıt kanıt değeri taşır. */
    const hepsi = await prisma.userConsent.findMany({ where: { userId: kullanici!.id } })
    expect(hepsi.some(k => k.version === '2020-01-01')).toBe(true)
  })

  it('tekrar çağrılması zararsız', async () => {
    const kullanici = await prisma.user.findUnique({ where: { email: `${marker}-ok@test.local` } })
    const token = app.jwt.sign({
      id: kullanici!.id, email: kullanici!.email, role: kullanici!.role, tv: kullanici!.tokenVersion
    })
    const r = await app.inject({
      method: 'POST', url: '/auth/consents',
      headers: { authorization: `Bearer ${token}` }, payload: {}
    })
    expect(r.statusCode).toBe(200)
    expect(r.json().added).toBe(0)
  })
})
