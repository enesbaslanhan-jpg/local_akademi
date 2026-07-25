import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createAuditLog, queryAuditLogs } from './audit.js'
import {
  aiReviewerQueue,
  getAiReviewerConfig,
  getAiReviewerMetricsSnapshot,
  getPersistentReviewerMetricsSnapshot,
  getReviewerOllamaHealth,
  evaluateReviewerPilotAcceptance,
  getReviewerPilotAcceptanceConfig,
} from './ai-reviewer/index.js'
import { generateQuizDraft } from './quiz-generator.js'
import {
  localAiGenerationQueue,
  LocalAiQueueFullError,
} from './local-ai-job-queue.js'

const prisma = new PrismaClient()
const reviewerHumanAuditSchema = z.object({
  telemetryId: z.string().uuid(),
  verdict: z.enum([
    'correct',
    'false_positive',
    'false_negative',
    'uncertain',
  ]),
  criticalMiss: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
})

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/quiz-generator/:koId/draft', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    if (process.env.AI_QUIZ_GENERATOR_ENABLED !== 'true') {
      return reply.status(503).send({
        error: 'Quiz generator is disabled',
        code: 'AI_QUIZ_GENERATOR_DISABLED',
      })
    }
    const koId = Number(
      (request.params as { koId?: string }).koId,
    )
    if (!Number.isInteger(koId) || koId <= 0) {
      return reply.status(400).send({ error: 'Invalid knowledge object ID' })
    }
    const ko = await prisma.knowledgeObject.findFirst({
      where: {
        id: koId,
        status: 'published',
        isDemo: false,
      },
      select: {
        id: true,
        code: true,
        title: true,
        content: true,
      },
    })
    if (!ko) {
      return reply.status(404).send({
        error: 'Knowledge object not found',
      })
    }

    try {
      const generated = await localAiGenerationQueue.run(
        'quiz',
        () => generateQuizDraft(ko),
      )
      const quiz = await prisma.quiz.create({
        data: {
          koId: ko.id,
          title: generated.title,
          passScore: generated.passScore,
          status: 'draft',
          questions: {
            create: generated.questions.map((question, index) => ({
              questionText: question.questionText,
              options: JSON.stringify(question.options),
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              order: index + 1,
            })),
          },
        },
        include: { questions: true },
      })
      await createAuditLog({
        action: 'ai_quiz_draft_created',
        entityType: 'quiz',
        entityId: quiz.id,
        actorId: request.user.id,
        actorName: request.user.email,
        metadata: {
          entityTitle: quiz.title,
          provider: 'ollama',
          model:
            process.env.AI_QUIZ_GENERATOR_MODEL ||
            process.env.OLLAMA_MODEL ||
            'qwen3:4b-instruct',
        },
      })
      return reply.status(201).send({
        quiz: {
          ...quiz,
          questions: quiz.questions.map(question => ({
            ...question,
            options: JSON.parse(question.options),
          })),
        },
        requiresAdminPublish: true,
      })
    } catch (error) {
      if (error instanceof LocalAiQueueFullError) {
        return reply.status(429).send({
          error: 'Local AI queue is full',
          code: 'LOCAL_AI_QUEUE_FULL',
        })
      }
      request.log.error(
        { koId, errorCode: 'AI_QUIZ_GENERATION_FAILED' },
        'AI quiz generation failed',
      )
      return reply.status(502).send({
        error: 'Quiz draft could not be generated',
        code: 'AI_QUIZ_GENERATION_FAILED',
      })
    }
  })

  fastify.post('/quiz-generator/:quizId/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const quizId = String(
      (request.params as { quizId?: string }).quizId || '',
    )
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, status: 'draft' },
      include: { questions: true },
    })
    if (!quiz) {
      return reply.status(404).send({ error: 'Quiz draft not found' })
    }
    if (quiz.questions.length < 3) {
      return reply.status(422).send({
        error: 'Quiz requires at least 3 questions',
      })
    }
    const published = await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: 'published' },
    })
    await createAuditLog({
      action: 'ai_quiz_published',
      entityType: 'quiz',
      entityId: quiz.id,
      actorId: request.user.id,
      actorName: request.user.email,
      metadata: { entityTitle: quiz.title },
    })
    return { quiz: published }
  })

  fastify.get('/ai-reviewer/metrics', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const config = getAiReviewerConfig()
    const persistentMetrics =
      await getPersistentReviewerMetricsSnapshot().catch(() => ({
        enabled: true,
        unavailable: true,
        errorCode: 'REVIEWER_METRICS_READ_FAILED',
        retention: {
          storage: 'sqlite_content_free_events',
          contentStored: false,
        },
      }))

    return {
      reviewer: {
        enabled: config.enabled,
        configuredMode: config.mode,
        effectiveMode:
          config.mode === 'disclaimer_only'
            ? 'disclaimer_only'
            : 'shadow',
        sampleRate: config.sampleRate,
        timeoutMs: config.timeoutMs,
      },
      metrics: getAiReviewerMetricsSnapshot(),
      persistentMetrics,
      queue: aiReviewerQueue.snapshot(),
    }
  })

  fastify.get('/ai-reviewer/health', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    return {
      ollama: await getReviewerOllamaHealth(),
      queue: aiReviewerQueue.snapshot(),
    }
  })

  fastify.get('/local-ai/queue', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    return { queue: localAiGenerationQueue.snapshot() }
  })

  fastify.get('/ai-reviewer/human-audits', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const [total, criticalMisses, verdicts, pending] = await Promise.all([
      prisma.aiReviewerHumanAudit.count(),
      prisma.aiReviewerHumanAudit.count({
        where: { criticalMiss: true },
      }),
      prisma.aiReviewerHumanAudit.groupBy({
        by: ['verdict'],
        _count: { _all: true },
      }),
      prisma.aiReviewerTelemetry.findMany({
        where: {
          decision: { in: ['block', 'allow_with_disclaimer'] },
          humanAudit: null,
        },
        select: {
          id: true,
          decision: true,
          riskLevel: true,
          issueCodes: true,
          requiresHumanReview: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ])
    const persistent = await getPersistentReviewerMetricsSnapshot()
    const acceptance = 'totals' in persistent
      ? evaluateReviewerPilotAcceptance(
          persistent,
          getReviewerPilotAcceptanceConfig(),
          { total, criticalMisses },
        )
      : null
    return {
      summary: {
        total,
        criticalMisses,
        verdicts: Object.fromEntries(
          verdicts.map(item => [item.verdict, item._count._all]),
        ),
        contentStored: false,
      },
      pending,
      acceptance,
    }
  })

  fastify.post('/ai-reviewer/human-audits', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const parsed = reviewerHumanAuditSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const telemetry = await prisma.aiReviewerTelemetry.findFirst({
      where: {
        id: parsed.data.telemetryId,
        decision: { in: ['block', 'allow_with_disclaimer'] },
      },
      select: { id: true },
    })
    if (!telemetry) {
      return reply.status(404).send({
        error: 'Reviewer telemetry not found',
      })
    }
    const existing = await prisma.aiReviewerHumanAudit.findUnique({
      where: { telemetryId: telemetry.id },
      select: { id: true },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Telemetry already audited',
        code: 'REVIEWER_AUDIT_DUPLICATE',
      })
    }
    const audit = await prisma.aiReviewerHumanAudit.create({
      data: {
        telemetryId: telemetry.id,
        reviewerId: request.user.id,
        verdict: parsed.data.verdict,
        criticalMiss: parsed.data.criticalMiss,
        notes: parsed.data.notes || null,
      },
      select: {
        id: true,
        telemetryId: true,
        verdict: true,
        criticalMiss: true,
        createdAt: true,
      },
    })
    return reply.status(201).send({
      audit,
      contentStored: false,
    })
  })

  fastify.get('/stats', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const query = request.query as any
    const period = parseInt(query.period) || 0
    const periodDate = period > 0 ? new Date(Date.now() - period * 86400000) : new Date(0)
    const now = new Date()

    const EXPERT_GATES = ['requires_professional_approval', 'requires_current_official_source_and_legal_approval']

    const [
      totalUsers,
      totalKOs,
      publishedKOs,
      inReviewKOs,
      draftKOs,
      archivedKOs,
      rejectedKOs,
      approvedKOs,
      demoKOs,
      totalCategories,
      overdueReviews,
      totalEnrollments,
      totalCourses,
      recentImportCount,
      categories,
      recentImports,
      recentReviews,
      recentPublications,
      recentUsers,
      failedImports,
      draftNoSource,
      pendingExpertReview
    ] = await Promise.all([
      prisma.user.count(),
      prisma.knowledgeObject.count(),
      prisma.knowledgeObject.count({ where: { status: 'published' } }),
      prisma.knowledgeObject.count({ where: { status: 'in_review' } }),
      prisma.knowledgeObject.count({ where: { status: 'draft' } }),
      prisma.knowledgeObject.count({ where: { status: 'archived' } }),
      prisma.knowledgeObject.count({ where: { status: 'rejected' } }),
      prisma.knowledgeObject.count({ where: { status: 'approved' } }),
      prisma.knowledgeObject.count({ where: { isDemo: true } }),
      prisma.category.count(),
      prisma.knowledgeObject.count({ where: { reviewDue: { lt: now }, status: 'in_review' } }),
      prisma.enrollment.count(),
      prisma.course.count(),
      prisma.importJob.count({ where: { createdAt: { gte: periodDate } } }),
      prisma.category.findMany({
        include: {
          knowledgeObjects: { select: { status: true } }
        }
      }),
      prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.reviewRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          knowledgeObject: { select: { title: true, code: true } },
          reviewer: { select: { name: true, email: true } }
        }
      }),
      prisma.publicationEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: {
          knowledgeObject: { select: { title: true, code: true } },
          performer: { select: { name: true, email: true } }
        }
      }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.importJob.findMany({ where: { status: 'failed' }, orderBy: { createdAt: 'desc' }, take: 5, include: { errors: { take: 3, orderBy: { createdAt: 'desc' } } } }),
      prisma.knowledgeObject.findMany({
        where: { status: 'draft', sources: { none: {} } },
        take: 5,
        select: { id: true, title: true, code: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.knowledgeObject.count({ where: { status: 'in_review', reviewGate: { in: EXPERT_GATES } } })
    ])

    const professionalKOs = totalKOs - demoKOs

    const categoryDistribution = categories.map(cat => {
      const total = cat.knowledgeObjects.length
      const published = cat.knowledgeObjects.filter(ko => ko.status === 'published').length
      const inReview = cat.knowledgeObjects.filter(ko => ko.status === 'in_review').length
      return { name: cat.name, total, published, inReview }
    }).filter(c => c.total > 0)

    const statusDistribution = [
      { status: 'draft', label: 'Taslak', count: draftKOs },
      { status: 'in_review', label: 'İncelemede', count: inReviewKOs },
      { status: 'approved', label: 'Onaylı', count: approvedKOs },
      { status: 'published', label: 'Yayında', count: publishedKOs },
      { status: 'rejected', label: 'Reddedildi', count: rejectedKOs },
      { status: 'archived', label: 'Arşivlenmiş', count: archivedKOs }
    ]

    return {
      kpi: {
        totalUsers,
        totalKOs,
        publishedKOs,
        inReviewKOs,
        draftKOs,
        archivedKOs,
        rejectedKOs,
        approvedKOs,
        demoKOs,
        professionalKOs,
        totalCategories,
        pendingExpertReview,
        overdueReviews,
        recentImportCount,
        totalEnrollments,
        totalCourses
      },
      statusDistribution,
      categoryDistribution,
      recentActivity: {
        imports: recentImports.map(j => ({
          id: j.id,
          status: j.status,
          totalRows: j.totalRows,
          createdAt: j.createdAt,
          processedAt: j.processedAt
        })),
        reviews: recentReviews.map(r => ({
          id: r.id,
          koTitle: r.knowledgeObject.title,
          koCode: r.knowledgeObject.code,
          reviewerName: r.reviewer.name || r.reviewer.email,
          status: r.status,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt
        })),
        publications: recentPublications.map(p => ({
          id: p.id,
          action: p.action,
          koTitle: p.knowledgeObject.title,
          koCode: p.knowledgeObject.code,
          performerName: p.performer.name || p.performer.email,
          note: p.note,
          timestamp: p.timestamp
        })),
        newUsers: recentUsers
      },
      alerts: {
        overdueReviews: await prisma.knowledgeObject.findMany({
          where: { reviewDue: { lt: now }, status: 'in_review' },
          take: 5,
          select: { id: true, title: true, code: true, reviewDue: true, createdAt: true }
        }),
        draftWithoutSource: draftNoSource,
        pendingHighRisk: await prisma.knowledgeObject.findMany({
          where: { status: 'in_review', reviewGate: { in: EXPERT_GATES } },
          take: 5,
          include: { category: { select: { name: true } } }
        }).then(kos => kos.map(ko => ({
          id: ko.id,
          title: ko.title,
          code: ko.code,
          categoryName: ko.category?.name || null,
          reviewGate: ko.reviewGate,
          createdAt: ko.createdAt
        }))),
        failedImports: failedImports.map(j => ({
          id: j.id,
          totalRows: j.totalRows,
          createdAt: j.createdAt,
          errors: j.errors.map(e => ({ row: e.row, field: e.field, message: e.message }))
        }))
      }
    }
  })

  fastify.get('/users', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const query = request.query as any
    const search = query.search?.trim() || ''
    const roleFilter = query.role || ''
    const sortBy = query.sortBy || 'createdAt'
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))
    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ]
    }
    if (roleFilter) {
      where.role = roleFilter
    }

    const sortFieldMap: Record<string, string> = {
      name: 'name', email: 'email', role: 'role', createdAt: 'createdAt'
    }
    const orderBy: any = {}
    orderBy[sortFieldMap[sortBy] || 'createdAt'] = sortOrder

    const [users, total, adminCount] = await Promise.all([
      prisma.user.findMany({ where, orderBy, skip, take: limit }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { role: 'admin' } })
    ])

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      adminCount
    }
  })

  fastify.patch('/users/:userId/role', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const currentUser = request.user
    if (currentUser.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const { userId } = request.params as { userId: string }
    const { role } = request.body as { role: string }
    const targetId = parseInt(userId)

    if (!['admin', 'learner', 'content_editor', 'subject_expert'].includes(role)) {
      return reply.status(422).send({ error: 'Invalid role. Allowed: admin, learner, content_editor, subject_expert' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } })
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' })
    }

    if (targetId === currentUser.id && targetUser.role === 'admin' && role !== 'admin') {
      return reply.status(403).send({ error: 'Cannot remove your own admin role' })
    }

    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return reply.status(403).send({ error: 'Cannot remove the last admin' })
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role }
    })

    await createAuditLog({
      action: 'user.role_changed',
      entityType: 'user',
      entityId: targetId,
      actorId: currentUser.id,
      actorName: currentUser.email,
      metadata: { oldRole: targetUser.role, newRole: role, userId: targetId }
    })

    return { id: updated.id, role: updated.role }
  })

  fastify.get('/activity', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user
    const events = await (prisma as any).activityEvent?.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    }).catch(() => [])

    return events.map((e: any) => ({
      id: e.id,
      event_type: e.eventType,
      title: e.title,
      detail: typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail,
      created_at: e.createdAt
    }))
  })

  fastify.get('/audit-logs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const query = request.query as any
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(query.limit) || 50))
    const offset = (page - 1) * limit

    const result = await queryAuditLogs({
      entityType: query.entityType || undefined,
      entityId: query.entityId || undefined,
      action: query.action || undefined,
      actorId: query.actorId ? parseInt(query.actorId) : undefined,
      limit,
      offset,
      orderDirection: (query.orderDirection as 'asc' | 'desc') || 'desc'
    })

    return {
      logs: result.logs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    }
  })

  fastify.get('/activity/all', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const events = await (prisma as any).activityEvent?.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    }).catch(() => [])

    const users = await prisma.user.findMany().catch(() => [])
    const userMap: any = {}
    users.forEach(u => { userMap[u.id] = u })

    return events.map((e: any) => ({
      id: e.id,
      user_id: e.userId,
      user_email: userMap[e.userId]?.email || '',
      event_type: e.eventType,
      title: e.title,
      detail: typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail,
      created_at: e.createdAt
    }))
  })
}
