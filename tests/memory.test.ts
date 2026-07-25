import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

process.env.OLLAMA_TIMEOUT = '100'

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let otherUserToken: string
let userId: number
let otherUserId: number

async function createTestUser(email: string, name: string) {
  const user = await prisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
  return user
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

  const { memoryRoutes } = await import('../src/services/memory/memory-routes')
  await app.register(memoryRoutes, { prefix: '/memory' })

  await app.ready()

  const user1 = await createTestUser(`mem-test-${Date.now()}@test.com`, 'Memory Test User')
  const user2 = await createTestUser(`mem-other-${Date.now()}@test.com`, 'Memory Other User')
  userId = user1.id
  otherUserId = user2.id

  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })
})

afterAll(async () => {
  await app.close()
})

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('Memory CRUD', () => {
  let memoryId: number

  it('kullanıcı oturumu yoksa 401 döner', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory' })
    expect(res.statusCode).toBe(401)
  })

  it('boş liste döner', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memories).toEqual([])
  })

  it('memory oluşturabilir', async () => {
    const res = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'fact', key: 'monthly_revenue', value: 'Aylık ciro 50.000 TL', importance: 0.8, confidence: 0.9 }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().memory.type).toBe('fact')
    expect(res.json().memory.key).toBe('monthly_revenue')
    expect(res.json().memory.userId).toBe(userId)
    expect(res.json().memory.importance).toBe(0.8)
    expect(res.json().memory.confidence).toBe(0.9)
    expect(res.json().memory.sourceType).toBe('user_manual')
    expect(res.json().memory.validationStatus).toBe('user_entered')
    expect(res.json().memory.status).toBe('active')
    expect(res.json().memory.id).toBeGreaterThan(0)
    memoryId = res.json().memory.id
  })

  it('oluşturulan memory listelenir', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memories.length).toBeGreaterThanOrEqual(1)
    expect(res.json().memories.find((m: any) => m.id === memoryId)).toBeTruthy()
  })

  it('memory ID ile getirilebilir', async () => {
    const res = await app.inject({ method: 'GET', url: `/memory/${memoryId}`, headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memory.id).toBe(memoryId)
  })

  it('olmayan memory 404 döner', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory/999999', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(404)
  })

  it('geçersiz ID ile 400 döner', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory/abc', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(400)
  })

  it('başka kullanıcının memory\'sine erişemez', async () => {
    const res = await app.inject({ method: 'GET', url: `/memory/${memoryId}`, headers: authHeader(otherUserToken) })
    expect(res.statusCode).toBe(404)
  })

  it('memory güncellenebilir', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/memory/${memoryId}`,
      headers: authHeader(userToken),
      payload: { value: 'Aylık ciro 60.000 TL', confidence: 0.95 }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().memory.value).toBe('Aylık ciro 60.000 TL')
    expect(res.json().memory.confidence).toBe(0.95)
  })

  it('başka kullanıcının memory\'sini güncelleyemez', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/memory/${memoryId}`,
      headers: authHeader(otherUserToken),
      payload: { value: 'hack' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('memory silinebilir (soft delete)', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/memory/${memoryId}`, headers: authHeader(userToken) })
    expect(res.statusCode).toBe(204)
  })

  it('silinen memory listelenmez', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory', headers: authHeader(userToken) })
    expect(res.json().memories.find((m: any) => m.id === memoryId)).toBeFalsy()
  })

  it('silinen memory doğrudan 404 döner', async () => {
    const res = await app.inject({ method: 'GET', url: `/memory/${memoryId}`, headers: authHeader(userToken) })
    expect(res.statusCode).toBe(404)
  })

  it('başka kullanıcının memory\'sini silemez', async () => {
    const newMem = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'goal', key: 'test_goal', value: 'test' }
    })
    const newId = newMem.json().memory.id
    const res = await app.inject({ method: 'DELETE', url: `/memory/${newId}`, headers: authHeader(otherUserToken) })
    expect(res.statusCode).toBe(404)
  })
})

describe('Memory validation', () => {
  it('boş değer ile 422 döner', async () => {
    const res = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'fact', value: '' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('geçersiz tür ile 422 döner', async () => {
    const res = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'invalid_type', value: 'test' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('hassas veri ile 422 döner', async () => {
    const res = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'fact', value: 'API_KEY=sk-1234567890abcdef' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('kredi kartı numarası ile 422 döner', async () => {
    const res = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'fact', value: 'Kart no: 4111-1111-1111-1111' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('geçerli tüm türler kabul edilir', async () => {
    const types = ['profile', 'fact', 'problem', 'goal', 'preference', 'decision']
    for (const t of types) {
      const res = await app.inject({
        method: 'POST', url: '/memory',
        headers: authHeader(userToken),
        payload: { type: t, value: `test value for ${t}` }
      })
      expect(res.statusCode).toBe(201)
    }
  })
})

describe('Memory dispute and confirm', () => {
  let memId: number

  it('dispute işlemi güven ve önemi sıfırlar', async () => {
    const created = await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(userToken),
      payload: { type: 'fact', value: 'Tartışmalı bilgi', importance: 0.8, confidence: 0.8 }
    })
    memId = created.json().memory.id

    const res = await app.inject({ method: 'POST', url: `/memory/${memId}/dispute`, headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memory.confidence).toBe(0)
    expect(res.json().memory.importance).toBe(0)
    expect(res.json().memory.status).toBe('disputed')
  })

  it('confirm işlemi güveni yükseltir', async () => {
    const res = await app.inject({ method: 'POST', url: `/memory/${memId}/confirm`, headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memory.confidence).toBe(0.95)
    expect(res.json().memory.importance).toBe(0.9)
  })
})

describe('Memory list filtering', () => {
  it('türe göre filtreler', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory?type=profile', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    for (const m of res.json().memories) {
      expect(m.type).toBe('profile')
    }
  })

  it('duruma göre filtreler', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory?status=active', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    for (const m of res.json().memories) {
      expect(m.status).toBe('active')
    }
  })

  it('arama yapılabilir', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory?search=test', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
  })

  it('sayfalama çalışır', async () => {
    const res = await app.inject({ method: 'GET', url: '/memory?page=1&pageSize=10', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(200)
    expect(res.json().memories.length).toBeLessThanOrEqual(10)
  })
})

describe('Clear all memories', () => {
  it('onay olmadan silmez', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/memory/', headers: authHeader(userToken) })
    expect(res.statusCode).toBe(422)
  })

  it('yanlış onay ile 422 döner', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/memory/',
      headers: authHeader(userToken),
      payload: { confirmation: 'WRONG' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('tüm memory\'leri temizler', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/memory/',
      headers: authHeader(userToken),
      payload: { confirmation: 'DELETE_ALL_MEMORIES' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().deletedCount).toBeGreaterThan(0)

    const listRes = await app.inject({ method: 'GET', url: '/memory', headers: authHeader(userToken) })
    expect(listRes.json().memories.length).toBe(0)
  })

  it('diğer kullanıcının memory\'leri etkilenmez', async () => {
    await app.inject({
      method: 'POST', url: '/memory',
      headers: authHeader(otherUserToken),
      payload: { type: 'fact', value: 'other user memory' }
    })
    const listRes = await app.inject({ method: 'GET', url: '/memory', headers: authHeader(otherUserToken) })
    expect(listRes.json().memories.length).toBeGreaterThan(0)
  })
})
