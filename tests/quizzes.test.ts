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
let publishedKoId: number
let draftKoId: number
let archivedKoId: number

async function createTestUser(email: string, name: string) {
  return realPrisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
}

async function createTestKO(status: string) {
  return realPrisma.knowledgeObject.create({
    data: {
      type: 'test',
      title: `Test KO ${status} ${Date.now()}`,
      content: 'Test content for quiz',
      embedding: '[]',
      metadata: JSON.stringify({
        quiz: [
          { id: 'q1', question: 'Soru 1?', correct_answer: 'cevap1' },
          { id: 'q2', question: 'Soru 2?', correct_answer: 'cevap2' }
        ]
      }),
      status
    }
  })
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

  const { quizRoutes } = await import('../src/services/quizzes')
  await app.register(quizRoutes, { prefix: '/quizzes', prisma: createMockPrisma() })

  await app.ready()

  const user1 = await createTestUser(`quiz-test-${Date.now()}@test.com`, 'Test User')
  const user2 = await createTestUser(`quiz-other-${Date.now()}@test.com`, 'Other User')
  userId = user1.id
  otherUserId = user2.id

  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })

  publishedKoId = (await createTestKO('published')).id
  draftKoId = (await createTestKO('draft')).id
  archivedKoId = (await createTestKO('archived')).id
})

beforeEach(() => {
  for (const key of Object.keys(dbErrors)) {
    delete dbErrors[key]
  }
})

afterAll(async () => {
  await realPrisma.quizAttempt.deleteMany({ where: { userId } })
  await realPrisma.quizAttempt.deleteMany({ where: { userId: otherUserId } })
  await realPrisma.knowledgeObject.deleteMany({ where: { id: publishedKoId } })
  await realPrisma.knowledgeObject.deleteMany({ where: { id: draftKoId } })
  await realPrisma.knowledgeObject.deleteMany({ where: { id: archivedKoId } })
  await realPrisma.user.delete({ where: { id: userId } }).catch(() => {})
  await realPrisma.user.delete({ where: { id: otherUserId } }).catch(() => {})
  await app.close()
})

describe('Quiz GET security', () => {
  it('published KO quiz GET başarılı', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${publishedKoId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.koId).toBe(publishedKoId)
    expect(body.quiz).toBeDefined()
    expect(body.quiz).toHaveLength(2)
  })

  it('draft KO quiz GET 404 döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${draftKoId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('archived KO quiz GET 404 döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${archivedKoId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('geçersiz koId 400 döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/gecersiz-id',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(400)
  })

  it('negatif koId 400 döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/-1',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(400)
  })

  it('authenticate gerektirir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${publishedKoId}`
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('Quiz Attempt API', () => {
  it('geçerli quiz attempt gerçek veritabanı ID\'siyle kaydedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'q1', answer: 'cevap1' },
          { question_id: 'q2', answer: 'cevap2' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.id).toBeDefined()
    expect(typeof body.id).toBe('string')
    expect(body.id).not.toMatch(/^\d+$/)
    expect(body.score).toBe(100)
    expect(body.passed).toBe(true)

    const dbAttempt = await realPrisma.quizAttempt.findUnique({ where: { id: body.id } })
    expect(dbAttempt).not.toBeNull()
    expect(dbAttempt!.userId).toBe(userId)
  })

  it('draft KO attempt 404 döndürür (varlık gizleme)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${draftKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'q1', answer: 'cevap1' },
          { question_id: 'q2', answer: 'cevap2' }
        ]
      }
    })
    expect(res.statusCode).toBe(404)
  })

  it('geçersiz question ID reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'unknown_q', answer: 'test' }
        ]
      }
    })
    expect(res.statusCode).toBe(422)
  })

  it('yinelenen question ID reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'q1', answer: 'cevap1' },
          { question_id: 'q1', answer: 'cevap1' }
        ]
      }
    })
    expect(res.statusCode).toBe(422)
  })

  it('boş cevap listesi reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { answers: [] }
    })
    expect(res.statusCode).toBe(422)
  })

  it('geçersiz body tipi reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { answers: 'not-an-array' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('kullanıcı yalnızca kendi quiz geçmişini görür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/history',
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.attempts).toEqual([])
  })

  it('Quiz attempt create hatası 500 döndürür (mock ile)', async () => {
    dbErrors['quizAttempt.create'] = true
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'q1', answer: 'cevap1' },
          { question_id: 'q2', answer: 'cevap2' }
        ]
      }
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.id).toBeUndefined()
    expect(body.error).toBeDefined()
  })

  it('Quiz history findMany hatası 500 döndürür', async () => {
    dbErrors['quizAttempt.findMany'] = true
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/history',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(500)
  })

  it('geçersiz koId attempt 400 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quizzes/gecersiz/attempts',
      headers: { authorization: `Bearer ${userToken}` },
      body: {
        answers: [
          { question_id: 'q1', answer: 'test' }
        ]
      }
    })
    expect(res.statusCode).toBe(400)
  })
})
