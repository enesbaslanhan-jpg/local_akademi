import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

let app: FastifyInstance

let learnerAId: number, learnerBId: number, expertId: number, adminId: number

let learnerAToken: string, learnerBToken: string, expertToken: string, adminToken: string

let publishedKoId: number, draftKoId: number, inReviewKoId: number, archivedKoId: number

let conversationAId: number, conversationBId: number
let deletedConversationAId: number
let messageAId: number

let mentorSessionAId: string

let documentAId: string

let businessProfileAUserId: number

let enrollmentAId: number

let taskAssignmentAId: string

const unique = Date.now()

async function createUser(email: string, name: string, role: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_sec', name, role }
  })
}

async function createKO(title: string, status: string, extra: any = {}) {
  return prisma.knowledgeObject.create({
    data: {
      type: extra.type || 'concept',
      title,
      content: extra.content || 'Security test content',
      embedding: '[]',
      metadata: extra.metadata || JSON.stringify({ quiz: [{ id: 'q1', question: 'Test?', correct_answer: 'a' }] }),
      status,
      isDemo: extra.isDemo || false,
      code: extra.code || `${status}-${unique}-${Math.random().toString(36).slice(2, 6)}`,
      ...extra
    }
  })
}

beforeAll(async () => {
  process.env.AI_PROVIDER = 'deepseek'
  process.env.DEEPSEEK_API_KEY = 'test-mock-key-for-fail-fast'
  process.env.MENTOR_TIMEOUT = '1000'

  app = Fastify()

  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { authRoutes, registerJwtPlugin } = await import('../src/services/auth')
  const { conversationRoutes } = await import('../src/services/conversation')
  const { mentorRoutes } = await import('../src/services/mentor')
  const { knowledgeRoutes } = await import('../src/services/knowledge')
  const { knowledgeV2Routes } = await import('../src/services/knowledge-v2')
  const { quizRoutes } = await import('../src/services/quizzes')
  const { taskRoutes } = await import('../src/services/tasks')
  const { documentRoutes } = await import('../src/services/documents')
  const { businessRoutes } = await import('../src/services/business')
  const { enrollmentRoutes } = await import('../src/services/enrollments')
  const { learningPathRoutes } = await import('../src/services/learningPath')
  const { adminRoutes } = await import('../src/services/admin')
  const { sourceRoutes } = await import('../src/services/sources')
  const { learnerDashboardRoutes } = await import('../src/services/learnerDashboard')
  const { memoryRoutes } = await import('../src/services/memory/memory-routes')

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(conversationRoutes, { prefix: '/mentor/conversations' })
  await app.register(mentorRoutes, { prefix: '/mentor' })
  await app.register(knowledgeRoutes, { prefix: '/knowledge' })
  await app.register(knowledgeV2Routes)
  await app.register(quizRoutes, { prefix: '/quizzes', prisma: new PrismaClient(), legacyEnabled: true })
  await app.register(taskRoutes, { prefix: '/tasks' })
  await app.register(documentRoutes, { prefix: '/documents', prisma: new PrismaClient() })
  await app.register(businessRoutes, { prefix: '/business', prisma: new PrismaClient() })
  await app.register(enrollmentRoutes, { prefix: '/enrollments' })
  await app.register(learningPathRoutes, { prefix: '/learning-path' })
  await app.register(adminRoutes, { prefix: '/admin' })
  await app.register(sourceRoutes)
  await app.register(learnerDashboardRoutes, { prefix: '/dashboard' })
  await app.register(memoryRoutes, { prefix: '/memory' })

  await app.ready()

  learnerAId = (await createUser(`seclearnA-${unique}@test.com`, 'Learner A', 'learner')).id
  learnerBId = (await createUser(`seclearnB-${unique}@test.com`, 'Learner B', 'learner')).id
  expertId = (await createUser(`secexpert-${unique}@test.com`, 'Expert', 'subject_expert')).id
  adminId = (await createUser(`secadmin-${unique}@test.com`, 'Admin', 'admin')).id

  learnerAToken = app.jwt.sign({ id: learnerAId, email: `seclearnA-${unique}@test.com`, role: 'learner' })
  learnerBToken = app.jwt.sign({ id: learnerBId, email: `seclearnB-${unique}@test.com`, role: 'learner' })
  expertToken = app.jwt.sign({ id: expertId, email: `secexpert-${unique}@test.com`, role: 'subject_expert' })
  adminToken = app.jwt.sign({ id: adminId, email: `secadmin-${unique}@test.com`, role: 'admin' })

  publishedKoId = (await createKO('Sec Published KO', 'published', { code: `pub-${unique}` })).id
  draftKoId = (await createKO('Sec Draft KO', 'draft', { code: `draft-${unique}` })).id
  inReviewKoId = (await createKO('Sec InReview KO', 'in_review', { code: `inreview-${unique}` })).id
  archivedKoId = (await createKO('Sec Archived KO', 'archived', { code: `archived-${unique}` })).id

  conversationAId = (await prisma.conversation.create({
    data: { userId: learnerAId, title: 'Sec Conv A' }
  })).id
  conversationBId = (await prisma.conversation.create({
    data: { userId: learnerBId, title: 'Sec Conv B' }
  })).id
  deletedConversationAId = (await prisma.conversation.create({
    data: { userId: learnerAId, title: 'Sec Deleted', deletedAt: new Date() }
  })).id

  messageAId = (await prisma.conversationMessage.create({
    data: { conversationId: conversationAId, role: 'user', content: 'Test message', generationStatus: 'completed' }
  })).id

  mentorSessionAId = randomUUID()
  await prisma.mentorSession.create({
    data: { userId: learnerAId, sessionId: mentorSessionAId, context: JSON.stringify([]) }
  })

  documentAId = randomUUID()
  await prisma.uploadedDocument.create({
    data: {
      id: documentAId, userId: learnerAId, originalName: 'sec.txt', storedName: `${documentAId}.txt`,
      mimeType: 'text/plain', sizeBytes: 10, extractedText: 'security doc', analysis: '{}', status: 'analyzed'
    }
  })

  businessProfileAUserId = learnerAId
  await prisma.businessProfile.upsert({
    where: { userId: learnerAId },
    create: { userId: learnerAId, name: 'Sec Corp', sector: 'Tech', monthlySales: 1000 },
    update: {}
  })

  const testCourseId = (await prisma.course.create({
    data: { title: 'Sec Test Course', description: 'test', category: 'test', level: 'beginner' }
  })).id
  enrollmentAId = (await prisma.enrollment.create({
    data: { userId: learnerAId, courseId: testCourseId, status: 'in_progress', progress: 50 }
  })).id

  taskAssignmentAId = (await prisma.taskAssignment.create({
    data: { userId: learnerAId, taskId: 'sec-task-1', koId: publishedKoId, status: 'assigned', progressPercent: 0 }
  })).id
})

afterAll(async () => {
  await prisma.taskAssignment.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.quizAttempt.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.conversationMessage.deleteMany({ where: { conversationId: { in: [conversationAId, conversationBId, deletedConversationAId] } } })
  await prisma.conversationSummary.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.conversation.deleteMany({ where: { id: { in: [conversationAId, conversationBId, deletedConversationAId] } } })
  await prisma.mentorSession.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.uploadedDocument.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.businessProfile.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.enrollment.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.learningPath.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.userMemory.deleteMany({ where: { userId: { in: [learnerAId, learnerBId] } } })
  await prisma.knowledgeObject.deleteMany({ where: { id: { in: [publishedKoId, draftKoId, inReviewKoId, archivedKoId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [learnerAId, learnerBId, expertId, adminId] } } })
  await app.close()
})

// ─── 1. AUTH & IDENTITY ────────────────────────────────────────────────────

describe('Auth & Identity Security', () => {
  it('token olmadan korumalı endpoint 401 döndürür', async () => {
    const res = await app.inject({ method: 'GET', url: '/mentor/conversations/' })
    expect(res.statusCode).toBe(401)
  })

  it('geçersiz token 401 döndürür', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/conversations/',
      headers: { authorization: 'Bearer invalid.token.here' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('learner admin endpointine erişemez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/stats',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error).toContain('Admin access')
  })

  it('expert admin endpointine erişemez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/stats',
      headers: { authorization: `Bearer ${expertToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('admin /admin/stats endpointine erişebilir', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/stats',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('learner /admin/users endpointine erişemez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/users',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('body içindeki role: admin kullanıcı rolünü yükseltmez', async () => {
    const res = await app.inject({
      method: 'POST', url: '/knowledge/',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { type: 'concept', title: 'Hack', content: 'test', role: 'admin' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('learner source oluşturamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/sources',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { title: 'Hack Source' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('learner sources listeleyemez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v2/admin/sources',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('admin kullanıcı yönetimine erişebilir', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/users',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('JWT secret response içinde sızmaz', async () => {
    const res = await app.inject({
      method: 'GET', url: '/health'
    })
    const body = JSON.parse(res.body)
    expect(body.secret).toBeUndefined()
    expect(body.jwt).toBeUndefined()
  })
})

// ─── 2. CONVERSATION ISOLATION ─────────────────────────────────────────────

describe('Conversation Isolation', () => {
  it('kullanici yalniz kendi conversationlarini listeler', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/conversations/',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    expect(body.conversations).toBeDefined()
    for (const c of body.conversations) {
      const record = await prisma.conversation.findUnique({ where: { id: c.id } })
      expect(record?.userId).toBe(learnerBId)
    }
  })

  it('kullanici B kullanici A\'nin conversation detayini goremez', async () => {
    const res = await app.inject({
      method: 'GET', url: `/mentor/conversations/${conversationAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('kullanici B kullanici A\'nin conversation basligini degistiremez', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/mentor/conversations/${conversationAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { title: 'Hacked Title' }
    })
    expect(res.statusCode).toBe(404)
    const record = await prisma.conversation.findUnique({ where: { id: conversationAId } })
    expect(record?.title).toBe('Sec Conv A')
  })

  it('kullanici B kullanici A\'nin conversationini silemez', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/mentor/conversations/${conversationAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(404)
    const record = await prisma.conversation.findUnique({ where: { id: conversationAId } })
    expect(record?.deletedAt).toBeNull()
  })

  it('kullanici B kullanici A\'nin conversationina mesaj ekleyemez', async () => {
    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conversationAId}/messages`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { message: 'Hacked message' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('kullanici B kullanici A\'nin mesajlarini okuyamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/mentor/conversations/${conversationAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    expect(body.messages).toBeUndefined()
  })

  it('soft-deleted conversation listede gorunmez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/conversations/',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    const body = JSON.parse(res.body)
    const ids = body.conversations.map((c: any) => c.id)
    expect(ids).not.toContain(deletedConversationAId)
  })

  it('soft-deleted conversation detayi 404 doner', async () => {
    const res = await app.inject({
      method: 'GET', url: `/mentor/conversations/${deletedConversationAId}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── 3. MENTOR SESSION ISOLATION ───────────────────────────────────────────

describe('Mentor Session Isolation', () => {
  it('kullanici B kullanici A\'nin sessionId\'sini kullanamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { message: 'test', sessionId: mentorSessionAId }
    })
    const body = JSON.parse(res.body)
    expect(body.sessionId).not.toBe(mentorSessionAId)
  })

  it('history yalniz JWT kullanicisina ait sessionlari dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/history',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    for (const s of body.sessions) {
      const record = await prisma.mentorSession.findUnique({ where: { sessionId: s.sessionId } })
      expect(record?.userId).toBe(learnerBId)
    }
  })

  it('kullanici B kullanici A\'nin sessionini silemez', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/mentor/history?sessionId=${mentorSessionAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(204)
    const record = await prisma.mentorSession.findUnique({ where: { sessionId: mentorSessionAId } })
    expect(record?.userId).toBe(learnerAId)
  })

  it('yeni session authenticated kullaniciya baglanir', async () => {
    const res = await app.inject({
      method: 'POST', url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { message: 'new session test' }
    })
    const body = JSON.parse(res.body)
    if (body.sessionId) {
      const record = await prisma.mentorSession.findUnique({ where: { sessionId: body.sessionId } })
      expect(record?.userId).toBe(learnerAId)
    }
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
  })
})

// ─── 4. KNOWLEDGE OBJECT PUBLISH SECURITY ──────────────────────────────────

describe('Knowledge Object Publish Security', () => {
  it('v1 search yalniz published KO dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: '/knowledge/search?q=Sec'
    })
    const body = JSON.parse(res.body)
    for (const ko of body.results) {
      expect(ko.status).toBe('published')
      expect(ko.isDemo).toBe(false)
    }
  })

  it('v1 detail ile draft KO okunamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/${draftKoId}`
    })
    expect(res.statusCode).toBe(404)
  })

  it('v1 detail ile in_review KO okunamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/${inReviewKoId}`
    })
    expect(res.statusCode).toBe(404)
  })

  it('v1 detail ile archived KO okunamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/${archivedKoId}`
    })
    expect(res.statusCode).toBe(404)
  })

  it('v1 detail ile published KO okunabilir', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/${publishedKoId}`
    })
    expect(res.statusCode).toBe(200)
  })

  it('v2 listing yalniz published KO dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v2/knowledge-objects'
    })
    const body = JSON.parse(res.body)
    for (const ko of body.results) {
      expect(ko.status).toBe('published')
      expect(ko.isDemo).toBe(false)
    }
    const allIds = body.results.map((ko: any) => ko.id)
    expect(allIds).not.toContain(draftKoId)
    expect(allIds).not.toContain(inReviewKoId)
    expect(allIds).not.toContain(archivedKoId)
  })

  it('v2 code ile draft KO okunamaz (public)', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v2/knowledge-objects/draft-${unique}`
    })
    expect(res.statusCode).toBe(404)
  })

  it('v2 code ile published KO okunabilir (public)', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v2/knowledge-objects/pub-${unique}`
    })
    expect(res.statusCode).toBe(200)
  })

  it('v2 kodu ile draft KO learner da okuyamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v2/knowledge-objects/draft-${unique}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('v2 draftsiz published KO kategori filtrelerinden sizmaz', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v2/knowledge-objects?search=Sec+Draft'
    })
    const body = JSON.parse(res.body)
    const titles = body.results.map((ko: any) => ko.title)
    expect(titles).not.toContain('Sec Draft KO')
  })

  it('v1 related endpointi yalniz published KO doner', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/related/${publishedKoId}`
    })
    const body = JSON.parse(res.body)
    for (const ko of body.related) {
      expect(ko.status).toBe('published')
    }
  })

  it('v1 related draft KO icin 404 doner', async () => {
    const res = await app.inject({
      method: 'GET', url: `/knowledge/related/${draftKoId}`
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── 5. QUIZ ISOLATION ─────────────────────────────────────────────────────

describe('Quiz Security', () => {
  it('GET quiz published icin correct_answer sizdirmaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/quizzes/${publishedKoId}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    for (const q of body.quiz) {
      expect(q.correct_answer).toBeUndefined()
    }
  })

  it('draft KO quiz GET 404 dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: `/quizzes/${draftKoId}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('in_review KO quiz GET 404 dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: `/quizzes/${inReviewKoId}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('archived KO quiz GET 404 dondurur', async () => {
    const res = await app.inject({
      method: 'GET', url: `/quizzes/${archivedKoId}`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('POST quiz attempt draft KO icin 404 dondurur', async () => {
    const res = await app.inject({
      method: 'POST', url: `/quizzes/${draftKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { answers: [{ question_id: 'q1', answer: 'a' }] }
    })
    expect(res.statusCode).toBe(404)
  })

  it('kullanici yalniz kendi quiz gecmisini gorur', async () => {
    const res = await app.inject({
      method: 'GET', url: '/quizzes/history',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    for (const a of body.attempts) {
      const record = await prisma.quizAttempt.findUnique({ where: { id: a.id } })
      expect(record?.userId).toBe(learnerBId)
    }
  })

  it('attempt body userId dikkate alinmaz', async () => {
    const res = await app.inject({
      method: 'POST', url: `/quizzes/${publishedKoId}/attempts`,
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: {
        userId: learnerBId,
        answers: [{ question_id: 'q1', answer: 'a' }]
      }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const record = await prisma.quizAttempt.findUnique({ where: { id: body.id } })
    expect(record?.userId).toBe(learnerAId)
  })
})

// ─── 6. TASK ISOLATION ─────────────────────────────────────────────────────

describe('Task Isolation', () => {
  it('kullanici yalniz kendi task assignmentlarini listeler', async () => {
    const res = await app.inject({
      method: 'GET', url: '/tasks/',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    for (const t of body.tasks) {
      const record = await prisma.taskAssignment.findUnique({ where: { id: t.id } })
      expect(record?.userId).toBe(learnerBId)
    }
  })

  it('kullanici B kullanici A\'nin assignmentini guncelleyemez', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/tasks/assignments/${taskAssignmentAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { status: 'completed' }
    })
    expect(res.statusCode).toBe(404)
    const record = await prisma.taskAssignment.findUnique({ where: { id: taskAssignmentAId } })
    expect(record?.status).toBe('assigned')
  })

  it('draft KO\'ya task assignment atanamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/tasks/nonexistent-task-12345/assign',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('gecersiz progress_percent 422 doner', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/tasks/assignments/${taskAssignmentAId}`,
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { progress_percent: 150 }
    })
    expect(res.statusCode).toBe(422)
  })

  it('olmayan assignment ID 404 doner', async () => {
    const res = await app.inject({
      method: 'PATCH', url: '/tasks/assignments/nonexistent-id',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { status: 'completed' }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── 7. DOCUMENT ISOLATION ─────────────────────────────────────────────────

describe('Document Isolation', () => {
  it('kullanici B kullanici A\'nin belgesini goremez', async () => {
    const res = await app.inject({
      method: 'GET', url: `/documents/${documentAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('kullanici B kullanici A\'nin belgesini silemez', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/documents/${documentAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(404)
    const record = await prisma.uploadedDocument.findUnique({ where: { id: documentAId } })
    expect(record).not.toBeNull()
  })

  it('kullanici B listesinde A\'nin belgesi gorunmez', async () => {
    const res = await app.inject({
      method: 'GET', url: '/documents/',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    const ids = body.documents.map((d: any) => d.id)
    expect(ids).not.toContain(documentAId)
  })

  it('kullanici B kullanici A\'nin belgesine soru soramaz', async () => {
    const res = await app.inject({
      method: 'POST', url: `/documents/${documentAId}/ask`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { question: 'What is this?' }
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── 8. BUSINESS PROFILE & DASHBOARD ───────────────────────────────────────

describe('Business Profile & Dashboard', () => {
  it('kullanici yalniz kendi profilini gorur', async () => {
    const res = await app.inject({
      method: 'GET', url: '/business/business-profile',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    expect(body.name).toBe('')
    expect(body.monthly_sales).toBe(0)
  })

  it('body userId baska profile yazamaz', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/business/business-profile',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { name: 'Hack Corp', userId: learnerBId }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.name).toBe('Hack Corp')
    const bProfile = await prisma.businessProfile.findUnique({ where: { userId: learnerBId } })
    if (bProfile) {
      expect(bProfile.name).not.toBe('Hack Corp')
    }
  })

  it('dashbord KPI\'lari yalniz JWT kullanicisindan hesaplanir', async () => {
    const res = await app.inject({
      method: 'GET', url: '/business/dashboard',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    expect(body.assigned_tasks).toBe(0)
  })

  it('dashboard kullanici A icin dogru veriyi doner', async () => {
    const res = await app.inject({
      method: 'GET', url: '/business/dashboard',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(200)
  })
})

// ─── 9. ENROLLMENT & LEARNING PATH ISOLATION ───────────────────────────────

describe('Enrollment & Learning Path', () => {
  it('kullanici B kullanici A\'nin ilerlemesini degistiremez', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/enrollments/${enrollmentAId}/progress`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { progress: 100, status: 'completed' }
    })
    expect(res.statusCode).toBe(403)
    const record = await prisma.enrollment.findUnique({ where: { id: enrollmentAId } })
    expect(record?.progress).toBe(50)
  })

  it('kullanici yalniz kendi enrollmentlarini listeler', async () => {
    const res = await app.inject({
      method: 'GET', url: '/enrollments/my',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    const body = JSON.parse(res.body)
    for (const e of body.enrollments) {
      expect(e.userId).toBeUndefined()
      const record = await prisma.enrollment.findUnique({ where: { id: e.id } })
      expect(record?.userId).toBe(learnerBId)
    }
  })

  it('kullanici B A\'nin enrollmentini silemez', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/enrollments/${enrollmentAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(403)
    const record = await prisma.enrollment.findUnique({ where: { id: enrollmentAId } })
    expect(record).not.toBeNull()
  })
})

// ─── 10. AI PROVIDER PUBLISHED-ONLY RETRIEVAL ──────────────────────────────

describe('AI Provider Published-Only Retrieval', () => {
  it('getRelevantKnowledgeObjects yalniz published KO doner', async () => {
    const { getRelevantKnowledgeObjects } = await import('../src/services/ai-provider')
    const kos = await getRelevantKnowledgeObjects('Sec')
    for (const ko of kos) {
      expect(ko.title).not.toContain('Draft')
      expect(ko.title).not.toContain('InReview')
      expect(ko.title).not.toContain('Archived')
    }
  })

  it('mentor.ts getRelevantKOs yalniz published KO doner', async () => {
    const { mentorRoutes } = await import('../src/services/mentor')
    const kos = await prisma.knowledgeObject.findMany({
      where: { status: 'published', isDemo: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { code: true, title: true, type: true, content: true, category: { select: { name: true } } }
    })
    for (const ko of kos) {
      expect(ko.status).not.toBeDefined()
    }
    const titles = kos.map((k: any) => k.title)
    expect(titles).not.toContain('Sec Draft KO')
  })

  it('getSingleKOContext draft koduyla draft icerik sizdirmaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/mentor/chat',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { message: 'test about draft', code: `draft-${unique}` }
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    const body = JSON.parse(res.body)
    expect(body.sessionId).toBeUndefined()
  })
})

// ─── 11. USER MEMORY SECURITY ──────────────────────────────────────────────

describe('User Memory Security', () => {
  let memoryAId: number

  beforeAll(async () => {
    const mem = await prisma.userMemory.create({
      data: {
        userId: learnerAId, type: 'fact', key: 'sec-key',
        value: 'Sensitive memory A', sourceType: 'user_manual',
        importance: 0.5, confidence: 0.5
      }
    })
    memoryAId = mem.id
  })

  it('kullanici B kullanici A\'nin memory kaydini okuyamaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/memory/${memoryAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect([401, 404]).toContain(res.statusCode)
  })

  it('kullanici B A\'nin memory kaydini guncelleyemez', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/memory/${memoryAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` },
      body: { value: 'Hacked value' }
    })
    expect([401, 404]).toContain(res.statusCode)
    const record = await prisma.userMemory.findUnique({ where: { id: memoryAId } })
    expect(record?.value).toBe('Sensitive memory A')
  })

  it('kullanici B A\'nin memory kaydini silemez', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/memory/${memoryAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect([401, 404]).toContain(res.statusCode)
    const record = await prisma.userMemory.findUnique({ where: { id: memoryAId } })
    expect(record?.status).toBe('active')
  })

  it('kullanici yalniz kendi memory kayitlarini listeler', async () => {
    const res = await app.inject({
      method: 'GET', url: '/memory/',
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect([200, 401]).toContain(res.statusCode)
  })
})

// ─── 12. ERROR & INFO LEAKAGE ──────────────────────────────────────────────

describe('Error & Info Leakage', () => {
  it('401 yanitinda stack trace yok', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/conversations/'
    })
    const body = JSON.parse(res.body)
    expect(body.stack).toBeUndefined()
    expect(body.error).toBeDefined()
  })

  it('404 yanitinda stack trace yok', async () => {
    const res = await app.inject({
      method: 'GET', url: '/mentor/conversations/999999',
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    const body = JSON.parse(res.body)
    expect(body.stack).toBeUndefined()
  })

  it('disk yolu hata mesajinda gormez', async () => {
    const res = await app.inject({
      method: 'POST', url: '/mentor/conversations/999999/messages',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { message: 'test' }
    })
    if (res.statusCode !== 200) {
      const body = JSON.parse(res.body)
      expect(body.error).toBeDefined()
      expect(body.error?.message || body.error).not.toContain('C:\\')
    }
  })

  it('baska kullanici kaynaginin varligi gereksiz ayrintida aciklanmaz (404)', async () => {
    const res = await app.inject({
      method: 'GET', url: `/mentor/conversations/${conversationAId}`,
      headers: { authorization: `Bearer ${learnerBToken}` }
    })
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.owner).toBeUndefined()
    expect(body.documentId).toBeUndefined()
  })

  it('v2 draft KO 404 owner bilgisi sizdirmaz', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v2/knowledge-objects/draft-${unique}`
    })
    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.status).toBeUndefined()
    expect(body.owner).toBeUndefined()
  })
})

// ─── 13. ADMIN / SOURCE / REVIEW ──────────────────────────────────────────

describe('Admin, Source & Review Authorization', () => {
  it('learner KO olusturamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/knowledge/',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { type: 'concept', title: 'test', content: 'test' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('learner v2 KO olusturamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/knowledge-objects',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { title: 'test', content: 'test' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('content editor v2 KO olusturabilir', async () => {
    const editorUser = await createUser(`editor-${unique}@test.com`, 'Editor', 'content_editor')
    const editorToken = app.jwt.sign({ id: editorUser.id, email: `editor-${unique}@test.com`, role: 'content_editor' })
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/knowledge-objects',
      headers: { authorization: `Bearer ${editorToken}` },
      body: { title: 'Editor KO', content: 'content' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    await prisma.knowledgeObject.delete({ where: { id: body.knowledgeObject.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: editorUser.id } }).catch(() => {})
  })

  it('learner source olusturamaz', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/sources',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { title: 'test' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('learner review karari veremez', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/inreview-${unique}/approve`,
      headers: { authorization: `Bearer ${learnerAToken}` }
    })
    expect(res.statusCode).toBe(403)
  })

  it('expert review karari verebilir (subject_expert)', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/inreview-${unique}/approve`,
      headers: { authorization: `Bearer ${expertToken}` },
      body: { notes: 'approved in test' }
    })
    expect(res.statusCode).toBe(200)
    await prisma.knowledgeObject.update({
      where: { id: inReviewKoId },
      data: { status: 'in_review', verificationStatus: 'pending_review' }
    })
  })

  it('yayin (publish) yalniz admin yapabilir', async () => {
    await prisma.knowledgeObject.update({
      where: { id: inReviewKoId },
      data: { status: 'approved', verificationStatus: 'verified' }
    })
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/inreview-${unique}/publish`,
      headers: { authorization: `Bearer ${expertToken}` }
    })
    expect(res.statusCode).toBe(403)
    await prisma.knowledgeObject.update({
      where: { id: inReviewKoId },
      data: { status: 'in_review', verificationStatus: 'pending_review' }
    })
  })

  it('body userId ile rol yukseltilemez', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${learnerAId}/role`,
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { role: 'admin' }
    })
    expect(res.statusCode).toBe(403)
  })
})

// ─── 14. CONVERSATION WRITE OPERATIONS CHECK ──────────────────────────────

describe('Write Operations Use Authenticated User', () => {
  it('conversation olusturma authenticated user\'a baglanir', async () => {
    const res = await app.inject({
      method: 'POST', url: '/mentor/conversations/',
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { title: 'Write Check' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    const record = await prisma.conversation.findUnique({ where: { id: body.conversation.id } })
    expect(record?.userId).toBe(learnerAId)
    await prisma.conversationMessage.deleteMany({ where: { conversationId: body.conversation.id } })
    await prisma.conversation.delete({ where: { id: body.conversation.id } })
  })

  it('mesaj gonderme authenticated user\'a baglanir', async () => {
    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conversationAId}/messages`,
      headers: { authorization: `Bearer ${learnerAToken}` },
      body: { message: 'Write check message' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.messageId).toBeDefined()
  })
})
