import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { MockAiChatProvider } from '../src/services/ai-chat-provider'

const prisma = new PrismaClient()

let app: FastifyInstance
let adminToken: string
let learnerToken: string
let otherLearnerToken: string
let adminId: number
let learnerId: number
let otherLearnerId: number
let publishedKoId: number
let demoKoId: number
let draftKoId: number
let publishedCode: string
let draftCode: string
let demCode: string
let quizId: string
let questionId: string
let publishedKoWithCodeId: number

async function createUser(email: string, name: string, role: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_test', name, role }
  })
}

async function createKO(status: string, isDemo: boolean = false, code?: string) {
  return prisma.knowledgeObject.create({
    data: {
      type: 'test',
      title: `Test KO ${status} ${isDemo ? '(Demo)' : ''} ${Date.now()}`,
      content: 'Test content',
      embedding: '[]',
      metadata: '{}',
      status,
      isDemo,
      ...(code ? { code } : {}),
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

  const { mentorRoutes } = await import('../src/services/mentor')
  const { quizRoutes } = await import('../src/services/quizzes')
  const { adminRoutes } = await import('../src/services/admin')

  // Register with mock AI provider to avoid real API calls
  await app.register(mentorRoutes, { prefix: '/mentor', aiProvider: new MockAiChatProvider() })
  await app.register(quizRoutes, { prefix: '/quizzes' })
  await app.register(adminRoutes, { prefix: '/admin' })

  await app.ready()

  const admin = await createUser(`admin-${Date.now()}@test.com`, 'Admin User', 'admin')
  const learner = await createUser(`learner-${Date.now()}@test.com`, 'Learner User', 'learner')
  const other = await createUser(`other-${Date.now()}@test.com`, 'Other User', 'learner')

  adminId = admin.id
  learnerId = learner.id
  otherLearnerId = other.id

  adminToken = app.jwt.sign({ id: adminId, email: admin.email, role: 'admin' })
  learnerToken = app.jwt.sign({ id: learnerId, email: learner.email, role: 'learner' })
  otherLearnerToken = app.jwt.sign({ id: otherLearnerId, email: other.email, role: 'learner' })

  publishedCode = `PUB-${Date.now()}`
  draftCode = `DRF-${Date.now()}`
  demCode = `DEM-${Date.now()}`

  publishedKoId = (await createKO('published')).id
  publishedKoWithCodeId = (await createKO('published', false, publishedCode)).id
  demoKoId = (await createKO('published', true)).id
  draftKoId = (await createKO('draft')).id
  await createKO('draft', false, draftCode)
  await createKO('published', true, demCode)

  const quiz = await prisma.quiz.create({
    data: {
      koId: publishedKoId,
      title: 'Test Quiz',
      passScore: 70,
      questions: {
        create: {
          questionText: 'Test sorusu?',
          options: JSON.stringify({ a: 'Seçenek A', b: 'Seçenek B' }),
          correctAnswer: 'a',
          explanation: 'Test açıklaması',
          order: 1,
        }
      }
    },
    include: { questions: true }
  })
  quizId = quiz.id
  questionId = quiz.questions[0].id
})

afterAll(async () => {
  await prisma.quizAttempt.deleteMany({ where: { userId: learnerId } })
  await prisma.quizAttempt.deleteMany({ where: { userId: otherLearnerId } })
  await prisma.quizQuestion.deleteMany({ where: { quizId } })
  await prisma.quiz.deleteMany({ where: { id: quizId } })
  await prisma.knowledgeObject.deleteMany({ where: { id: publishedKoId } })
  await prisma.knowledgeObject.deleteMany({ where: { id: publishedKoWithCodeId } })
  await prisma.knowledgeObject.deleteMany({ where: { id: demoKoId } })
  await prisma.knowledgeObject.deleteMany({ where: { id: draftKoId } })
  await prisma.knowledgeObject.deleteMany({ where: { code: draftCode } })
  await prisma.knowledgeObject.deleteMany({ where: { code: demCode } })
  await prisma.user.delete({ where: { id: adminId } }).catch(() => {})
  await prisma.user.delete({ where: { id: learnerId } }).catch(() => {})
  await prisma.user.delete({ where: { id: otherLearnerId } }).catch(() => {})
  await app.close()
})

describe('Mentor endpoint security', () => {
  it('JWT olmadan mentor chat 401 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      body: { message: 'test' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('Boş mentor mesajı 400 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: '' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('8000 karakter sınırını aşan mesaj 413 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'x'.repeat(8001) }
    })
    expect(res.statusCode).toBe(413)
  })

  it('Geçerli mentor chat mock provider ile 200 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'Merhaba, iş danışmanlığı almak istiyorum' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.reply).toBeDefined()
    expect(body.sessionId).toBeDefined()
  })

  it('Kullanıcı başka bir kullanıcının mentor oturumuna erişemez', async () => {
    // Create a session for learner
    const createRes = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'Merhaba' }
    })
    const { sessionId } = JSON.parse(createRes.body)

    // Other learner tries to access it -> should get 404 SESSION_NOT_FOUND
    const accessRes = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${otherLearnerToken}` },
      body: { message: 'Selam', sessionId }
    })
    expect(accessRes.statusCode).toBe(404)
    const accessBody = JSON.parse(accessRes.body)
    expect(accessBody.error).toBe('SESSION_NOT_FOUND')
  })

  it('Tam 8000 karakter mesaj kabul edilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'x'.repeat(8000) }
    })
    expect(res.statusCode).toBe(200)
  })

  it('8001 karakter mesaj 413 döner ve hata mesajı içerir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'x'.repeat(8001) }
    })
    expect(res.statusCode).toBe(413)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
    expect(body.error).toContain('8000')
  })

  it('Geçerli code ile mentor chat 200 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'test', code: publishedCode }
    })
    expect(res.statusCode).toBe(200)
  })

  it('Bulunmayan code ile mentor chat 404 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'test', code: 'KO-NONEXISTENT' }
    })
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('KO_NOT_FOUND')
  })

  it('Draft KO code ile mentor chat 404 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'test', code: draftCode }
    })
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('KO_NOT_FOUND')
  })

  it('Demo KO code ile mentor chat 404 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { message: 'test', code: demCode }
    })
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('KO_NOT_FOUND')
  })
})

describe('Quiz endpoint security', () => {
  it('Geçersiz KO ID için 400 döner (500 değil)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/gecersiz-id',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(400)
  })

  it('Var olmayan KO ID için 404 döner (500 değil)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/999999',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('Demo KO içeriği öğrenci tarafından alınamaz', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${demoKoId}`,
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('Yayınlanmamış KO içeriği öğrenci tarafından alınamaz', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/quizzes/${draftKoId}`,
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('Quiz attempt authentication gerektirir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      body: { answers: [] }
    })
    expect(res.statusCode).toBe(401)
  })

  it('Demo KO quiz attempt 404 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${demoKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { answers: [{ question_id: 'q1', answer: 'test' }] }
    })
    expect(res.statusCode).toBe(404)
  })

  it('Quiz attempt yanıtında correct_answer ve explanation bulunmaz', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { answers: [{ question_id: questionId, answer: 'a' }] }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.feedback).toBeDefined()
    expect(Array.isArray(body.feedback)).toBe(true)
    for (const fb of body.feedback) {
      expect(fb.correct_answer).toBeUndefined()
      expect(fb.explanation).toBeUndefined()
    }
  })

  it('Quiz cevabı 500 karakter sınırını aşarsa 422 döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { answers: [{ question_id: questionId, answer: 'x'.repeat(501) }] }
    })
    expect(res.statusCode).toBe(422)
  })

  it('Yinelenen question_id değerleri 422 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { answers: [{ question_id: questionId, answer: 'a' }, { question_id: questionId, answer: 'b' }] }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error).toBe('Duplicate question IDs are not allowed')
  })

    it('Quize ait olmayan question_id 422 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { answers: [{ question_id: 'non-existent-question', answer: 'test' }] }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error).toContain('Unknown question IDs')
  })

  it('QuizAttempt DB create hatası 500 döndürür (mock ile)', async () => {
    const mockApp = Fastify()
    await mockApp.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
    mockApp.decorate('authenticate', async function (request: any, reply: any) {
      try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
    })

    const realPrisma = new PrismaClient()
    const mockPrisma = new Proxy({} as any, {
      get(_, model: string) {
        const realModel = (realPrisma as any)[model]
        if (!realModel) return undefined
        return new Proxy(realModel, {
          get(target: any, method: string) {
            if (typeof method !== 'string' || method === 'constructor' || method === 'then') return target[method]
            if (`${model}.${method}` === 'quizAttempt.create') {
              return (...args: any[]) => Promise.reject(new Error('Simulated DB error'))
            }
            const m = target[method]
            return typeof m === 'function' ? m.bind(target) : m
          }
        })
      }
    })

    const { quizRoutes: qRoutes } = await import('../src/services/quizzes')
    await mockApp.register(qRoutes, { prefix: '/quizzes', prisma: mockPrisma })
    await mockApp.ready()

    const mockToken = mockApp.jwt.sign({ id: learnerId, email: 'learner@test.com', role: 'learner' })
    const res = await mockApp.inject({
      method: 'POST',
      url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${mockToken}` },
      body: { answers: [{ question_id: questionId, answer: 'a' }] }
    })
    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.id).toBeUndefined()
    expect(body.error).toBeDefined()

    await mockApp.close()
  })
})

describe('Admin endpoint security', () => {
  it('Admin olmayan kullanıcı admin istatistiklerini göremez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/stats',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('Admin kullanıcı admin istatistiklerini görebilir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/stats',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('Admin olmayan kullanıcı kullanıcı listesini göremez (gerçek admin endpoint)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    // /admin/users requires admin role
    expect(res.statusCode).toBe(403)
  })

  it('JWT olmayan admin endpoint 401 döner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/stats'
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('Quiz /history route ordering', () => {
  it('/quizzes/history /:koId tarafından yakalanmaz', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quizzes/history',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.attempts).toBeDefined()
  })
})

describe('Mentor /history contract', () => {
  it('mentor/history doğru formatta yanıt döner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/history',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.sessions).toBeDefined()
    expect(Array.isArray(body.sessions)).toBe(true)
    if (body.sessions.length > 0) {
      const session = body.sessions[0]
      expect(session.sessionId).toBeDefined()
      expect(Array.isArray(session.messages)).toBe(true)
      expect(session.createdAt).toBeDefined()
      expect(session.updatedAt).toBeDefined()
    }
  })
})
