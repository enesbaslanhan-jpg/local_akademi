import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const realPrisma = new PrismaClient()

const dbErrors: Record<string, boolean> = {}

function createMockPrisma(): PrismaClient {
  return new Proxy({} as any, {
    get(_, modelName: string) {
      const realModel = (realPrisma as any)[modelName]
      if (!realModel) return undefined
      return new Proxy(realModel, {
        get(modelTarget: any, methodName: string) {
          if (typeof methodName !== 'string' || methodName === 'constructor' || methodName === 'then') {
            return modelTarget[methodName]
          }
          const key = `${modelName}.${methodName}`
          if (dbErrors[key]) {
            return (...args: any[]) => Promise.reject(new Error(`Simulated DB error: ${key}`))
          }
          const method = modelTarget[methodName]
          return typeof method === 'function' ? method.bind(modelTarget) : method
        }
      })
    }
  }) as PrismaClient
}

let app: FastifyInstance
let userToken: string
let otherUserToken: string
let userId: number
let otherUserId: number

async function createTestUser(email: string, name: string) {
  return realPrisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
}

async function cleanupUser(id: number) {
  await realPrisma.businessProfile.deleteMany({ where: { userId: id } })
  await realPrisma.user.delete({ where: { id } }).catch(() => {})
}

beforeAll(async () => {
  app = Fastify()

  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  const { businessRoutes } = await import('../src/services/business')
  await app.register(businessRoutes, { prefix: '/business', prisma: createMockPrisma() })

  await app.ready()

  const user1 = await createTestUser(`biz-test-${Date.now()}@test.com`, 'Test User')
  const user2 = await createTestUser(`biz-other-${Date.now()}@test.com`, 'Other User')
  userId = user1.id
  otherUserId = user2.id

  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })
})

beforeEach(() => {
  for (const key of Object.keys(dbErrors)) {
    delete dbErrors[key]
  }
})

afterAll(async () => {
  await cleanupUser(userId)
  await cleanupUser(otherUserId)
  await app.close()
})

describe('Business Profile API', () => {
  it('kullanıcı kendi işletme profilini oluşturabilir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        name: 'Test Şirket',
        sector: 'Teknoloji',
        city: 'İstanbul',
        currency: 'TRY',
        monthly_sales: 100000,
        monthly_expenses: 50000,
        cash_balance: 20000,
        debt_balance: 10000
      }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('Test Şirket')
    expect(body.sector).toBe('Teknoloji')
    expect(body.monthly_sales).toBe(100000)
  })

  it('kullanıcı kendi profilini güncelleyebilir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { name: 'Güncellenmiş Şirket', monthly_sales: 200000 }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('Güncellenmiş Şirket')
    expect(body.monthly_sales).toBe(200000)
    expect(body.sector).toBe('Teknoloji')
  })

  it('başka kullanıcının verisine erişilemez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('')
    expect(body.monthly_sales).toBe(0)
  })

  it('geçersiz finansal alanlar 422 döndürür', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { monthly_sales: -100 }
    })
    expect(res.statusCode).toBe(422)
  })

  it('NaN finansal alanlar 422 döndürür', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { monthly_sales: NaN }
    })
    expect(res.statusCode).toBe(422)
  })

  it('Infinity finansal alanlar 422 döndürür', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { monthly_sales: Infinity }
    })
    expect(res.statusCode).toBe(422)
  })

  it('bilinmeyen alan adları temizlenir', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { name: 'Test', malicious_field: 'hack' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('Test')
    expect((body as any).malicious_field).toBeUndefined()
  })

  it('Business profile find hatası 500 döndürür', async () => {
    dbErrors['businessProfile.findFirst'] = true
    const res = await app.inject({
      method: 'GET',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
  })

  it('Business profile upsert hatası 500 döndürür', async () => {
    dbErrors['businessProfile.upsert'] = true
    const res = await app.inject({
      method: 'PUT',
      url: '/business/business-profile',
      headers: { authorization: `Bearer ${userToken}` },
      body: { name: 'Hata Testi' }
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
  })

  it('Dashboard sorgu hatası 500 döndürür', async () => {
    dbErrors['enrollment.findMany'] = true
    const res = await app.inject({
      method: 'GET',
      url: '/business/dashboard',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
  })
})
