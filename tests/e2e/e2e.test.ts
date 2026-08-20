import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcryptjs'
import { createFullTestContext, cleanupTestContext, TestContext } from './helpers'

let ctx: TestContext
let adminToken: string
let studentToken: string

function post(url: string, payload: any, token?: string) {
  return ctx.app!.inject({
    method: 'POST',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

function get(url: string, token?: string) {
  return ctx.app!.inject({
    method: 'GET',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  })
}

function put(url: string, payload: any, token?: string) {
  return ctx.app!.inject({
    method: 'PUT',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

function del(url: string, token?: string) {
  return ctx.app!.inject({
    method: 'DELETE',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  })
}

function patch(url: string, payload: any, token?: string) {
  return ctx.app!.inject({
    method: 'PATCH',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload
  })
}

beforeAll(async () => {
  ctx = await createFullTestContext(process.cwd())

  process.env.DATABASE_URL = ctx.dbUrl
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'e2e-test-secret-key-min-32-bytes-long!!'
  process.env.JWT_EXPIRES_IN = '1h'
  process.env.AI_PROVIDER = 'nvidia'
  process.env.NVIDIA_API_URL = `http://127.0.0.1:${ctx.fakeProviderPort}/v1/chat/completions`
  process.env.NVIDIA_API_KEY = 'e2e-mock-key'
  process.env.NVIDIA_MODEL = 'e2e-mock-model'
  process.env.AI_REVIEW_GATE_ENABLED = 'false'
  process.env.AI_REQUEST_TIMEOUT_MS = '5000'
  process.env.BETA_MODE = 'true'
  process.env.ENABLE_MEMORY_API = 'false'
  process.env.FEATURE_LEGACY_QUIZ_ENABLED = 'true'
  process.env.FEATURE_LEGACY_FLASHCARDS_ENABLED = 'true'

  const { default: build } = await import('../../src/index')
  const app = await build()
  ctx.app = app

  const pwHash = await bcrypt.hash('StrongPass123!', 10)

  await ctx.prisma.user.create({
    data: {
      email: 'e2e-admin@test.local',
      password: pwHash,
      name: 'E2E Admin',
      role: 'admin'
    }
  })
  await ctx.prisma.user.create({
    data: {
      email: 'e2e-student@test.local',
      password: pwHash,
      name: 'E2E Student',
      role: 'student'
    }
  })

  const adminLogin = await post('/auth/login', { email: 'e2e-admin@test.local', password: 'StrongPass123!' })
  adminToken = adminLogin.json().token

  const studentLogin = await post('/auth/login', { email: 'e2e-student@test.local', password: 'StrongPass123!' })
  studentToken = studentLogin.json().token
}, 60000)

afterAll(async () => {
  if (ctx) {
    await cleanupTestContext(ctx)
  }
}, 30000)

describe('E2E: Health & API Contract', () => {
  it('GET /health returns ok', async () => {
    const res = await get('/health')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('2.0.0')
    expect(body.database).toMatchObject({
      provider: 'postgresql',
      label: 'PostgreSQL + Prisma',
      connected: true,
    })
    expect(body.curriculum.publishedCourses).toBeGreaterThanOrEqual(0)
  })

  it('Unknown routes return 404', async () => {
    const res = await get('/non-existent-route-12345')
    expect(res.statusCode).toBe(404)
  })
})

describe('E2E: Auth & Registration', () => {
  const email = `e2e-auth-${Date.now()}@test.local`

  it('POST /auth/register creates user and returns token', async () => {
    const res = await post('/auth/register', { email, password: 'StrongPass123!', name: 'Auth Test', acceptedLegal: true })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeDefined()
  })

  it('POST /auth/register rejects duplicate email', async () => {
    const res = await post('/auth/register', { email, password: 'StrongPass123!', name: 'Duplicate', acceptedLegal: true })
    expect(res.statusCode).toBe(400)
  })

  it('POST /auth/register rejects weak password', async () => {
    const res = await post('/auth/register', { email: `weak-${Date.now()}@test.local`, password: 'short', name: 'Weak' })
    expect(res.statusCode).toBe(422)
  })

  it('POST /auth/register rejects missing fields', async () => {
    const res = await post('/auth/register', {})
    expect(res.statusCode).toBe(422)
  })

  it('POST /auth/register rejects SQL injection', async () => {
    const res = await post('/auth/register', { email: "' OR 1=1; --", password: 'StrongPass123!', name: 'SQLi' })
    expect(res.statusCode).toBe(422)
  })

  it('POST /auth/login with valid credentials', async () => {
    const res = await post('/auth/login', { email, password: 'StrongPass123!' })
    expect(res.statusCode).toBe(200)
    expect(res.json().token).toBeDefined()
  })

  it('POST /auth/login rejects invalid password', async () => {
    const res = await post('/auth/login', { email, password: 'wrong-password' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /auth/me with valid token', async () => {
    const res = await get('/auth/me', studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe('e2e-student@test.local')
  })

  it('GET /auth/me rejects missing token', async () => {
    const res = await get('/auth/me')
    expect(res.statusCode).toBe(401)
  })

  it('GET /auth/me rejects invalid token', async () => {
    const res = await get('/auth/me', 'invalid-token-here')
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Business Profile', () => {
  it('GET /business/business-profile returns defaults (no profile yet)', async () => {
    const res = await get('/business/business-profile', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('')
    expect(body.sector).toBe('')
    expect(body.currency).toBe('TRY')
  })

  it('GET /business/business-profile rejects unauthenticated', async () => {
    const res = await get('/business/business-profile')
    expect(res.statusCode).toBe(401)
  })

  it('PUT /business/business-profile creates profile via upsert', async () => {
    const res = await put('/business/business-profile', {
      name: 'E2E Test Co',
      sector: 'TEKNOLOJI',
      city: 'Istanbul',
      currency: 'TRY',
      monthly_sales: 50000,
      monthly_expenses: 30000,
      cash_balance: 100000,
      debt_balance: 20000
    }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('E2E Test Co')
    expect(body.sector).toBe('TEKNOLOJI')
    expect(body.monthly_sales).toBe(50000)
  })

  it('GET /business/business-profile returns saved profile', async () => {
    const res = await get('/business/business-profile', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('E2E Test Co')
    expect(body.monthly_sales).toBe(50000)
  })

  it('PUT /business/business-profile updates existing profile', async () => {
    const res = await put('/business/business-profile', {
      monthly_sales: 75000
    }, studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().monthly_sales).toBe(75000)
  })

  it('Business profiles are isolated between users', async () => {
    const adminRes = await get('/business/business-profile', adminToken)
    expect(adminRes.statusCode).toBe(200)
    expect(adminRes.json().name).toBe('')
  })
})

describe('E2E: Learner Dashboard', () => {
  it('GET /dashboard returns stats KPI data', async () => {
    const res = await get('/dashboard', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe('e2e-student@test.local')
    expect(body.stats).toBeDefined()
    expect(body.stats.totalEnrollments).toBeDefined()
    expect(body.stats.avgProgress).toBeDefined()
    expect(body.stats.completedCourses).toBeDefined()
    expect(body.stats.activeCourses).toBeDefined()
    expect(body.stats.weeklyProgress).toBeDefined()
  })

  it('GET /dashboard includes upcoming tasks', async () => {
    const res = await get('/dashboard', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.upcomingTasks).toBeDefined()
    expect(Array.isArray(body.upcomingTasks)).toBe(true)
  })

  it('GET /dashboard rejects unauthenticated', async () => {
    const res = await get('/dashboard')
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Knowledge Objects', () => {
  let koId: number | null = null

  it('GET /knowledge/search returns results', async () => {
    const res = await get('/knowledge/search?q=test')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.results).toBeDefined()
  })

  it('POST /knowledge creates KO (admin)', async () => {
    const res = await post('/knowledge/', {
      type: 'generic',
      title: 'SGK Nedir?',
      content: 'Sosyal Güvenlik Kurumu',
      metadata: '{"category":"SGK"}'
    }, adminToken)
    expect([200, 201]).toContain(res.statusCode)
    koId = res.json().knowledgeObject?.id
    expect(koId).toBeDefined()

    await ctx.prisma.knowledgeObject.update({
      where: { id: koId },
      data: { status: 'published' }
    })
  })

  it('POST /knowledge rejects non-admin', async () => {
    const res = await post('/knowledge/', {
      type: 'generic',
      title: 'Test',
      content: 'Test'
    }, studentToken)
    expect(res.statusCode).toBe(403)
  })

  it('GET /knowledge/:id returns KO', async () => {
    if (!koId) return
    const res = await get(`/knowledge/${koId}`)
    expect(res.statusCode).toBe(200)
    expect(res.json().knowledgeObject.id).toBe(koId)
  })

  it('GET /knowledge/:id returns 404 for missing', async () => {
    const res = await get('/knowledge/999999')
    expect(res.statusCode).toBe(404)
  })
})

describe('E2E: AI Mentor', () => {
  it('POST /mentor/chat non-streaming returns response', async () => {
    const res = await post('/mentor/chat', { message: 'SGK nedir?', stream: false }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.reply).toBeDefined()
    expect(body.reply.length).toBeGreaterThan(0)
    expect(body.sessionId).toBeDefined()
    expect(body.usage).toBeDefined()
  })

  it('POST /mentor/chat streaming returns 200', async () => {
    const res = await post('/mentor/chat', { message: 'İş Kanunu nedir?', stream: true }, studentToken)
    expect(res.statusCode).toBe(200)
  })

  it('POST /mentor/chat rejects empty message', async () => {
    const res = await post('/mentor/chat', { message: '', stream: false }, studentToken)
    expect(res.statusCode).toBe(400)
  })

  it('POST /mentor/chat rejects unauthenticated', async () => {
    const res = await post('/mentor/chat', { message: 'test', stream: false })
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Tasks', () => {
  it('GET /tasks returns task list (student)', async () => {
    const res = await get('/tasks', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.tasks).toBeDefined()
  })

  it('GET /tasks rejects unauthenticated', async () => {
    const res = await get('/tasks')
    expect(res.statusCode).toBe(401)
  })

  it('POST /tasks/:taskId/assign assigns a task', async () => {
    // Create a published KO first so task assignment can reference it
    const ko = await ctx.prisma.knowledgeObject.create({
      data: {
        type: 'concept',
        title: 'Task Target KO',
        content: 'Content',
        embedding: '[]',
        metadata: JSON.stringify({ taskId: 'e2e-task-001' }),
        status: 'published',
        code: `KO-E2E-TASK-${Date.now()}`,
        slug: `ko-e2e-task-${Date.now()}`,
        isDemo: false,
        taskTemplates: {
          create: { id: 'e2e-task-001', title: 'E2E Task', description: 'Complete the E2E task' }
        }
      }
    })

    const res = await post('/tasks/e2e-task-001/assign', {}, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.taskId).toBe('e2e-task-001')
    expect(body.status).toBe('assigned')
  })

  it('PATCH /tasks/assignments/:assignmentId updates task progress', async () => {
    const tasks = await get('/tasks', studentToken)
    const assignment = tasks.json().tasks.find((t: any) => t.taskId === 'e2e-task-001')
    if (!assignment) return

    const res = await patch(`/tasks/assignments/${assignment.id}`, { progress_percent: 50 }, studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().progressPercent).toBe(50)
  })
})

describe('E2E: Tasks reflect in dashboard', () => {
  it('GET /dashboard shows task progress after task assignments', async () => {
    const res = await get('/dashboard', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.upcomingTasks).toBeDefined()
    expect(Array.isArray(body.upcomingTasks)).toBe(true)
  })

  it('GET /dashboard reflects task completion', async () => {
    // Find the e2e task and mark it complete
    const tasks = await get('/tasks', studentToken)
    const assignment = tasks.json().tasks.find((t: any) => t.taskId === 'e2e-task-001')
    if (!assignment) return

    await patch(`/tasks/assignments/${assignment.id}`, {
      progress_percent: 100,
      status: 'completed',
      answers: { text: Array(130).fill('uygulanabilir').join(' ') },
    }, studentToken)

    const dash = await get('/dashboard', studentToken)
    expect(dash.statusCode).toBe(200)
    // Completed task should now appear in completed task count or disappear from upcoming
    const hasUpcoming = dash.json().upcomingTasks || []
    const matchingStillUpcoming = hasUpcoming.filter((t: any) => t.taskId === 'e2e-task-001' || t.id === assignment.id)
    expect(matchingStillUpcoming.length).toBe(0)
  })
})

describe('E2E: Quizzes', () => {
  let publishedKoId: number
  let quizKoId: number

  beforeAll(async () => {
    // Create a published KO with quiz metadata
    const ko = await ctx.prisma.knowledgeObject.create({
      data: {
        type: 'concept',
        title: 'Quiz Test KO',
        content: 'Test content for quiz.',
        embedding: '[]',
        metadata: JSON.stringify({
          quiz: [
            {
              id: 'q1',
              question: 'Test sorusu 1?',
              options: ['A', 'B', 'C'],
              correct_answer: 'A',
              explanation: 'Açıklama 1'
            },
            {
              id: 'q2',
              question: 'Test sorusu 2?',
              options: ['X', 'Y', 'Z'],
              correct_answer: 'Y',
              explanation: 'Açıklama 2'
            }
          ]
        }),
        status: 'published',
        code: `KO-QUIZ-${Date.now()}`,
        slug: `ko-quiz-${Date.now()}`,
        isDemo: false
      }
    })
    publishedKoId = ko.id
    quizKoId = ko.id
  })

  it('GET /quizzes/:koId returns quiz questions (without answers)', async () => {
    const res = await get(`/quizzes/${quizKoId}`, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.koId).toBe(quizKoId)
    expect(body.quiz).toBeDefined()
    expect(Array.isArray(body.quiz)).toBe(true)
    expect(body.quiz.length).toBeGreaterThan(0)
    // Correct answers should be stripped
    expect(body.quiz[0].correct_answer).toBeUndefined()
  })

  it('GET /quizzes/:koId returns 404 for unpublished KO', async () => {
    const draft = await ctx.prisma.knowledgeObject.create({
      data: {
        type: 'concept',
        title: 'Draft KO',
        content: 'Draft',
        embedding: '[]',
        metadata: '{}',
        status: 'draft',
        code: `KO-DRAFT-${Date.now()}`,
        slug: `ko-draft-${Date.now()}`,
        isDemo: false
      }
    })
    const res = await get(`/quizzes/${draft.id}`, studentToken)
    expect(res.statusCode).toBe(404)
  })

  it('GET /quizzes/:koId rejects unauthenticated', async () => {
    const res = await get(`/quizzes/${quizKoId}`)
    expect(res.statusCode).toBe(401)
  })

  it('POST /quizzes/:koId/attempts creates quiz attempt', async () => {
    const res = await post(`/quizzes/${quizKoId}/attempts`, {
      answers: [
        { question_id: 'q1', answer: 'A' },
        { question_id: 'q2', answer: 'Y' }
      ]
    }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.score).toBe(100)
    expect(body.passed).toBe(true)
    expect(body.total).toBe(2)
    expect(body.correct).toBe(2)
  })

  it('POST /quizzes/:koId/attempts with wrong answers', async () => {
    const res = await post(`/quizzes/${quizKoId}/attempts`, {
      answers: [
        { question_id: 'q1', answer: 'B' },
        { question_id: 'q2', answer: 'Z' }
      ]
    }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.score).toBe(0)
    expect(body.passed).toBe(false)
  })

  it('GET /quizzes/history returns attempt history for authenticated user', async () => {
    const res = await get('/quizzes/history', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.attempts).toBeDefined()
    expect(Array.isArray(body.attempts)).toBe(true)
    expect(body.attempts.length).toBeGreaterThanOrEqual(2)
  })

  it('GET /quizzes/history rejects unauthenticated', async () => {
    const res = await get('/quizzes/history')
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Documents', () => {
  it('GET /documents returns document list', async () => {
    const res = await get('/documents', studentToken)
    expect(res.statusCode).toBe(200)
  })

  it('GET /documents rejects unauthenticated', async () => {
    const res = await get('/documents')
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Admin KO Lifecycle (V2 API)', () => {
  let koCode: string

  it('POST /api/v2/admin/knowledge-objects creates KO in draft', async () => {
    const res = await post('/api/v2/admin/knowledge-objects', {
      type: 'concept',
      title: 'E2E Lifecycle Test KO',
      content: 'Test content for lifecycle verification.',
      code: `KO-LIFECYCLE-${Date.now()}`
    }, adminToken)
    expect(res.statusCode).toBe(201)
    koCode = res.json().knowledgeObject.code
    expect(koCode).toBeDefined()
  })

  it('Create source and link to KO for submit-review', async () => {
    // Create source
    const sourceRes = await post('/api/v2/admin/sources', {
      title: 'E2E Test Source',
      url: `https://e2e-test-${Date.now()}.local/source`
    }, adminToken)
    expect(sourceRes.statusCode).toBe(200)
    const sourceId = sourceRes.json().id

    // Link source to KO via Prisma
    const ko = await ctx.prisma.knowledgeObject.findUnique({ where: { code: koCode } })
    await ctx.prisma.knowledgeObjectSource.create({
      data: {
        koId: ko!.id,
        sourceId: sourceId,
        relation: 'references'
      }
    })
  })

  it('POST /api/v2/admin/knowledge-objects/:code/submit-review transitions to in_review', async () => {
    const res = await post(`/api/v2/admin/knowledge-objects/${koCode}/submit-review`, {}, adminToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().knowledgeObject.status).toBe('in_review')
  })

  it('POST /api/v2/admin/knowledge-objects/:code/approve transitions to approved', async () => {
    const res = await post(`/api/v2/admin/knowledge-objects/${koCode}/approve`, {}, adminToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().knowledgeObject.status).toBe('approved')
  })

  it('POST /api/v2/admin/knowledge-objects/:code/publish transitions to published', async () => {
    const res = await post(`/api/v2/admin/knowledge-objects/${koCode}/publish`, {}, adminToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().knowledgeObject.status).toBe('published')
    expect(res.json().knowledgeObject.publishedAt).toBeDefined()
  })

  it('Learner can access published KO via public endpoint', async () => {
    const res = await get(`/api/v2/knowledge-objects/${koCode}`, studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().knowledgeObject).toBeDefined()
    expect(res.json().knowledgeObject.title).toBe('E2E Lifecycle Test KO')
    expect(res.json().knowledgeObject.status).toBe('published')
  })

  it('Admin can see lifecycle events in audit log', async () => {
    const res = await get('/admin/audit-logs', adminToken)
    expect(res.statusCode).toBe(200)
    const logs = Array.isArray(res.json()) ? res.json() : res.json().logs || []
    const lifecycleActions = logs.filter((l: any) =>
      ['knowledge_object.created', 'knowledge_object.submitted_for_review',
       'knowledge_object.approved', 'knowledge_object.published'].includes(l.action)
    )
    expect(lifecycleActions.length).toBeGreaterThanOrEqual(4)
  })
})

describe('E2E: Admin & Audit', () => {
  it('GET /admin/stats returns stats (admin)', async () => {
    const res = await get('/admin/stats', adminToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.kpi).toBeDefined()
    expect(body.kpi.totalUsers).toBeDefined()
    expect(body.kpi.totalKOs).toBeDefined()
  })

  it('GET /admin/stats rejects non-admin', async () => {
    const res = await get('/admin/stats', studentToken)
    expect(res.statusCode).toBe(403)
  })

  it('GET /admin/users lists users (admin)', async () => {
    const res = await get('/admin/users', adminToken)
    expect(res.statusCode).toBe(200)
    const users = Array.isArray(res.json()) ? res.json() : res.json().users || res.json().data || []
    expect(users.length).toBeGreaterThan(0)
  })

  it('GET /admin/users rejects unauthenticated', async () => {
    const res = await get('/admin/users')
    expect(res.statusCode).toBe(401)
  })

  it('GET /admin/audit-logs returns logs (admin)', async () => {
    const res = await get('/admin/audit-logs', adminToken)
    expect(res.statusCode).toBe(200)
  })

  it('GET /admin/audit-logs supports pagination', async () => {
    const res = await get('/admin/audit-logs?page=1&limit=10', adminToken)
    expect(res.statusCode).toBe(200)
  })

  it('GET /admin/audit-logs filters by action', async () => {
    const res = await get('/admin/audit-logs?action=knowledge_object.created', adminToken)
    expect(res.statusCode).toBe(200)
  })
})

describe('E2E: Flashcards', () => {
  let koId: number
  let cardIds: string[] = []

  it('creates KO and flashcards for testing', async () => {
    const res = await post('/knowledge/', {
      type: 'generic',
      title: 'Flashcard Test KO',
      content: 'Test içeriği',
      metadata: '{"category":"test"}'
    }, adminToken)
    expect([200, 201]).toContain(res.statusCode)
    koId = res.json().knowledgeObject?.id
    expect(koId).toBeDefined()

    await ctx.prisma.knowledgeObject.update({
      where: { id: koId },
      data: { status: 'published' }
    })

    const now = new Date()
    for (let i = 1; i <= 3; i++) {
      const card = await ctx.prisma.flashcard.create({
        data: { koId, front: `Soru ${i}`, back: `Cevap ${i}`, order: i, status: 'published', updatedAt: now }
      })
      cardIds.push(card.id)
    }
  })

  it('GET /flashcards/knowledge/:koId returns cards', async () => {
    const res = await get(`/flashcards/knowledge/${koId}`, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.totalCards).toBe(3)
    expect(body.cards).toHaveLength(3)
    expect(body.cards[0].front).toBe('Soru 1')
  })

  it('GET /flashcards/due includes never-reviewed cards for a new learner', async () => {
    const res = await get('/flashcards/due?limit=20', studentToken)
    expect(res.statusCode).toBe(200)
    const group = res.json().groups.find((item: any) => item.koId === koId)
    expect(group).toBeDefined()
    expect(group.cards).toHaveLength(3)
  })

  it('GET /flashcards/knowledge/:koId rejects unauthenticated', async () => {
    const res = await get(`/flashcards/knowledge/${koId}`)
    expect(res.statusCode).toBe(401)
  })

  it('GET /flashcards/knowledge/:koId returns 404 for missing KO', async () => {
    const res = await get('/flashcards/knowledge/999999', studentToken)
    expect(res.statusCode).toBe(404)
  })

  it('POST /flashcards/:flashcardId/reviews submits review', async () => {
    const res = await post(`/flashcards/${cardIds[0]}/reviews`, { rating: 'good' }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.rating).toBe('good')
    expect(body.intervalDays).toBe(1)
    expect(body.repetition).toBe(1)
    expect(body.progress.seen).toBe(1)
  })

  it('POST /flashcards/:flashcardId/reviews with again resets interval', async () => {
    const res = await post(`/flashcards/${cardIds[0]}/reviews`, { rating: 'again' }, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.rating).toBe('again')
    expect(body.intervalDays).toBe(0)
    expect(body.repetition).toBe(0)
  })

  it('POST /flashcards/:flashcardId/reviews rejects unauthenticated', async () => {
    const res = await post(`/flashcards/${cardIds[0]}/reviews`, { rating: 'good' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /flashcards/:flashcardId/reviews rejects invalid rating', async () => {
    const res = await post(`/flashcards/${cardIds[0]}/reviews`, { rating: 'invalid' }, studentToken)
    expect(res.statusCode).toBe(422)
  })

  it('GET /flashcards/due returns due cards', async () => {
    const res = await get('/flashcards/due?limit=10', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.groups.length).toBeGreaterThanOrEqual(1)
    expect(body.groups[0].koId).toBe(koId)
  })

  it('GET /flashcards/due rejects unauthenticated', async () => {
    const res = await get('/flashcards/due')
    expect(res.statusCode).toBe(401)
  })
})

describe('E2E: Learning Path (Pilot)', () => {
  let pathId: number

  it('POST /learning-path/generate-pilot creates pilot path', async () => {
    const res = await post('/learning-path/generate-pilot', { title: 'Test Pilot Path' }, studentToken)
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.learningPath).toBeDefined()
    expect(body.steps).toHaveLength(6)
    expect(body.steps[0].category).toBe('Temel Finans')
    expect(body.steps[0].kos).toHaveLength(5)
    pathId = body.learningPath.id
  })

  it('POST /learning-path/generate-pilot rejects unauthenticated', async () => {
    const res = await post('/learning-path/generate-pilot', {})
    expect(res.statusCode).toBe(401)
  })

  it('GET /learning-path/current returns latest path', async () => {
    const res = await get('/learning-path/current', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.learningPath).toBeDefined()
    expect(body.learningPath.id).toBe(pathId)
  })

  it('GET /learning-path/:id/progress returns enriched steps', async () => {
    const res = await get(`/learning-path/${pathId}/progress`, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.steps).toHaveLength(6)
    expect(body.overallProgress).toBeDefined()
    expect(body.steps[0].kos[0].progress).toBeDefined()
    expect(body.steps[0].kos[0].quizPassed).toBeDefined()
    expect(body.steps[0].kos[0].fcMasteredCount).toBeDefined()
  })

  it('GET /learning-path/:id/progress rejects other user', async () => {
    const res = await get(`/learning-path/${pathId}/progress`, adminToken)
    expect(res.statusCode).toBe(403)
  })

  it('GET /learning-path/:id/progress returns 404 for missing', async () => {
    const res = await get('/learning-path/99999/progress', studentToken)
    expect(res.statusCode).toBe(404)
  })
})

describe('E2E: Pilot Tasks', () => {
  let pilotTaskId: string

  it('creates task template and assigns it', async () => {
    const ko = await ctx.prisma.knowledgeObject.create({
      data: {
        type: 'concept',
        title: 'Pilot Task KO',
        content: 'Test content',
        embedding: '[]',
        metadata: '{}',
        status: 'published',
        code: `KO-PILOT-TASK-${Date.now()}`,
        slug: `ko-pilot-task-${Date.now()}`,
        isDemo: false,
        taskTemplates: {
          create: { id: `pilot-task-${Date.now()}`, title: 'Pilot Task', description: 'Complete this pilot task', estimatedTime: 20 }
        }
      }
    })
    pilotTaskId = (await ctx.prisma.taskTemplate.findFirst({ where: { koId: ko.id } }))!.id

    const res = await post(`/tasks/${pilotTaskId}/assign`, {}, studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.taskId).toBe(pilotTaskId)
    expect(body.status).toBe('assigned')
  })

  it('GET /tasks includes pilot task', async () => {
    const res = await get('/tasks', studentToken)
    expect(res.statusCode).toBe(200)
    const tasks = res.json().tasks as any[]
    const pilotTask = tasks.find((t: any) => t.taskId === pilotTaskId)
    expect(pilotTask).toBeDefined()
  })

  it('PATCH /tasks/assignments/:id marks progress to 50%', async () => {
    const tasks = await get('/tasks', studentToken)
    const assignment = tasks.json().tasks.find((t: any) => t.taskId === pilotTaskId)
    if (!assignment) return
    const res = await patch(`/tasks/assignments/${assignment.id}`, { progress_percent: 50, status: 'in_progress' }, studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().progressPercent).toBe(50)
  })

  it('PATCH /tasks/assignments/:id completes task', async () => {
    const tasks = await get('/tasks', studentToken)
    const assignment = tasks.json().tasks.find((t: any) => t.taskId === pilotTaskId)
    if (!assignment) return
    const res = await patch(`/tasks/assignments/${assignment.id}`, {
      progress_percent: 100,
      status: 'completed',
      answers: { text: Array(130).fill('uygulanabilir').join(' ') },
    }, studentToken)
    expect(res.statusCode).toBe(200)
    expect(res.json().progressPercent).toBe(100)
    expect(res.json().status).toBe('completed')
  })
})

describe('E2E: Pilot Progress Dashboard', () => {
  it('GET /dashboard/pilot returns pilot stats', async () => {
    const res = await get('/dashboard/pilot', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.pilot).toBeDefined()
    expect(body.pilot.totalKOs).toBe(30)
    expect(body.pilot.completedKOs).toBeDefined()
    expect(body.pilot.inProgressKOs).toBeDefined()
    expect(body.pilot.notStartedKOs).toBeDefined()
    expect(body.pilot.overallProgressPercent).toBeDefined()
    expect(body.flashcards).toBeDefined()
    expect(body.flashcards.totalCards).toBeGreaterThanOrEqual(0)
    expect(body.flashcards.dueCards).toBeGreaterThanOrEqual(0)
    expect(body.flashcards.masteryPercent).toBeGreaterThanOrEqual(0)
    expect(body.quizzes).toBeDefined()
    expect(body.quizzes.totalAttempts).toBeGreaterThanOrEqual(0)
    expect(body.quizzes.averageScore).toBeGreaterThanOrEqual(0)
    expect(body.quizzes.passRate).toBeGreaterThanOrEqual(0)
    expect(body.tasks).toBeDefined()
    expect(body.tasks.totalAssigned).toBeGreaterThanOrEqual(0)
    expect(body.tasks.completionRate).toBeGreaterThanOrEqual(0)
    expect(body.koProgress).toBeDefined()
    expect(Array.isArray(body.koProgress)).toBe(true)
    expect(body.koProgress.length).toBe(30)
    expect(body.weeklyTrend).toBeDefined()
    expect(Array.isArray(body.weeklyTrend)).toBe(true)
    expect(body.weeklyTrend.length).toBe(4)
  })

  it('GET /dashboard/pilot returns per-KO progress entries', async () => {
    const res = await get('/dashboard/pilot', studentToken)
    expect(res.statusCode).toBe(200)
    const kos = res.json().koProgress as any[]
    for (const ko of kos) {
      expect(ko.koId).toBeGreaterThan(0)
      expect(ko.knowledgeStatus).toMatch(/^(not_started|in_progress|completed)$/)
      expect(typeof ko.flashcardPercent).toBe('number')
      expect(typeof ko.quizAttempts).toBe('number')
      expect(typeof ko.taskCount).toBe('number')
    }
  })

  it('GET /dashboard/pilot returns weekly trend data', async () => {
    const res = await get('/dashboard/pilot', studentToken)
    expect(res.statusCode).toBe(200)
    const trend = res.json().weeklyTrend as any[]
    for (const week of trend) {
      expect(week.week).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(typeof week.flashcardReviews).toBe('number')
      expect(typeof week.quizAttempts).toBe('number')
      expect(typeof week.taskCompletions).toBe('number')
      expect(typeof week.activityCount).toBe('number')
    }
  })

  it('GET /dashboard/pilot includes learningPath', async () => {
    const res = await get('/dashboard/pilot', studentToken)
    expect(res.statusCode).toBe(200)
    const lp = res.json().learningPath
    expect(lp).toBeDefined()
    expect(typeof lp.hasPath).toBe('boolean')
    expect(typeof lp.totalSteps).toBe('number')
  })

  it('GET /dashboard/pilot rejects unauthenticated', async () => {
    const res = await get('/dashboard/pilot')
    expect(res.statusCode).toBe(401)
  })

  it('GET /dashboard/pilot user info correct', async () => {
    const res = await get('/dashboard/pilot', studentToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.email).toBe('e2e-student@test.local')
    expect(body.user.name).toBe('E2E Student')
    expect(body.user.role).toBe('student')
  })
})
