import { beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import {
  isLegacyCourseTitle,
  learnerDashboardRoutes,
  stripLegacyCourseTitle,
} from '../src/services/learnerDashboard'
import { prisma } from '../src/lib/prisma'

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    enrollment: { findMany: vi.fn() },
    learningPath: { findFirst: vi.fn() },
    activityEvent: { findMany: vi.fn() },
    knowledgeProgress: { findMany: vi.fn() },
    knowledgeObject: { findMany: vi.fn() },
    taskAssignment: { findMany: vi.fn() },
    quizAttempt: { findMany: vi.fn() },
    course: { findFirst: vi.fn() },
  },
}))

const prismaMock = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
  enrollment: { findMany: ReturnType<typeof vi.fn> }
  learningPath: { findFirst: ReturnType<typeof vi.fn> }
  activityEvent: { findMany: ReturnType<typeof vi.fn> }
  knowledgeProgress: { findMany: ReturnType<typeof vi.fn> }
  knowledgeObject: { findMany: ReturnType<typeof vi.fn> }
  taskAssignment: { findMany: ReturnType<typeof vi.fn> }
  quizAttempt: { findMany: ReturnType<typeof vi.fn> }
  course: { findFirst: ReturnType<typeof vi.fn> }
}

async function buildApp() {
  const app = Fastify()
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 7, role: 'learner' }
  })
  await app.register(learnerDashboardRoutes, { prefix: '/dashboard' })
  await app.ready()
  return app
}

const legacyEnrollment = (updatedAt: Date = new Date('2026-08-10T10:00:00Z')) => ({
  id: 11,
  userId: 7,
  courseId: 44,
  progress: 72,
  status: 'in_progress',
  createdAt: new Date('2026-08-01T09:00:00Z'),
  updatedAt,
  course: { id: 44, title: '[Eski Kopya] Pazar Yeri Seçimi', published: false },
})

const activeEnrollment = (updatedAt: Date, status = 'in_progress') => ({
  id: 22,
  userId: 7,
  courseId: 215,
  progress: 40,
  status,
  createdAt: new Date('2026-08-02T09:00:00Z'),
  updatedAt,
  course: { id: 215, title: 'Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme', published: true },
})

describe('learner dashboard course/task presentation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    prismaMock.user.findUnique.mockResolvedValue({ name: 'Test', email: 't@test.dev', role: 'learner' })
    prismaMock.learningPath.findFirst.mockResolvedValue(null)
    prismaMock.activityEvent.findMany.mockResolvedValue([])
    prismaMock.knowledgeProgress.findMany.mockResolvedValue([])
    prismaMock.knowledgeObject.findMany.mockResolvedValue([])
    prismaMock.taskAssignment.findMany.mockResolvedValue([])
    prismaMock.quizAttempt.findMany.mockResolvedValue([])
    prismaMock.course.findFirst.mockResolvedValue(null)
  })

  it('yayınlanmamış [Eski Kopya] kurs kaydı yanıttan ve istatistiklerden dışlanır', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([legacyEnrollment()])

    const app = await buildApp()
    const response = await app.inject({ method: 'GET', url: '/dashboard' })
    await app.close()

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.enrollments).toEqual([])
    expect(body.stats.totalEnrollments).toBe(0)
    expect(body.stats.avgProgress).toBe(0)
    expect(body.resumeItem).toBeNull()
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7, course: { published: true } },
    }))
  })

  it('yayındaki kurslar listelenir ve en güncel ilerleyen kayıt resume olur', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([
      activeEnrollment(new Date('2026-08-10T08:00:00Z')),
      activeEnrollment(new Date('2026-08-11T09:00:00Z')),
    ])

    const app = await buildApp()
    const body = (await app.inject({ method: 'GET', url: '/dashboard' })).json()
    await app.close()

    expect(body.enrollments).toHaveLength(2)
    expect(body.stats.totalEnrollments).toBe(2)
    expect(body.resumeItem).toMatchObject({ courseId: 215, progress: 40 })
  })

  it('yalnızca eski kopya ilerlemesi varsa aktif kursta sürdürülür, eski veri değiştirilmez', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([legacyEnrollment()])
    prismaMock.course.findFirst.mockResolvedValue({
      id: 215,
      title: 'Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme',
    })

    const app = await buildApp()
    const body = (await app.inject({ method: 'GET', url: '/dashboard' })).json()
    await app.close()

    expect(body.enrollments).toEqual([])
    expect(body.resumeItem).toMatchObject({ courseId: 215, progress: 72 })
    expect(prismaMock.course.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        published: true,
        AND: [
          { title: { not: { startsWith: '[Eski Kopya]' } } },
          { title: { contains: 'Pazar Yeri Seçimi' } },
        ],
      }),
    }))
  })

  it('görev başlıkları şablondan çözülür, UUID asla görünmez', async () => {
    prismaMock.taskAssignment.findMany.mockResolvedValue([
      {
        id: 'assign-1',
        taskId: 'uuid-task-1',
        status: 'assigned',
        progressPercent: 0,
        createdAt: new Date('2026-08-10T08:00:00Z'),
        updatedAt: new Date('2026-08-10T08:00:00Z'),
        taskTemplate: { title: 'Pazar Yeri Seçimi: İlk 30 Günlük Kanal Kararını Kaydet' },
      },
      {
        id: 'assign-2',
        taskId: 'uuid-task-2',
        status: 'assigned',
        progressPercent: 10,
        createdAt: new Date('2026-08-11T08:00:00Z'),
        updatedAt: new Date('2026-08-11T08:00:00Z'),
        taskTemplate: null,
      },
    ])
    prismaMock.enrollment.findMany.mockResolvedValue([])

    const app = await buildApp()
    const body = (await app.inject({ method: 'GET', url: '/dashboard' })).json()
    await app.close()

    expect(body.upcomingTasks).toHaveLength(2)
    expect(body.upcomingTasks[0].title).toBe('Pazar Yeri Seçimi: İlk 30 Günlük Kanal Kararını Kaydet')
    expect(body.upcomingTasks[1].title).toBe('Görevi tamamla')
    expect(JSON.stringify(body.upcomingTasks)).not.toContain('Görev #')
  })
})

describe('legacy course title helpers', () => {
  it('köşeli parantezli kopya başlıklarını tanır', () => {
    expect(isLegacyCourseTitle('[Eski Kopya] Pazar Yeri Seçimi')).toBe(true)
    expect(isLegacyCourseTitle('[ESKİ KOPYA] Vergi Planlaması')).toBe(true)
    expect(isLegacyCourseTitle('Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme')).toBe(false)
    expect(isLegacyCourseTitle('Eski Kopya Pazar Yeri Seçimi')).toBe(false)
  })

  it('başlıktan kopya ön ekini temizler', () => {
    expect(stripLegacyCourseTitle('[Eski Kopya] Pazar Yeri Seçimi')).toBe('Pazar Yeri Seçimi')
    expect(stripLegacyCourseTitle('[Eski Kopya]  Vergi Planlaması ')).toBe('Vergi Planlaması')
  })
})