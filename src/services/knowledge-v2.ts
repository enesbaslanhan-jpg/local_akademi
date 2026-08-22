import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { createAuditLog } from './audit.js'
import { enforceTransition, InvalidTransitionError } from './state-machine.js'
import { scheduleKnowledgeObjectEmbedding } from './retrieval/knowledge-embedding-indexer.js'
import { getEmbeddedPracticeBlocksForKnowledgeObject } from './embedded-practice-blocks.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFilters(query: any) {
  const filters: any = {}
  if (query.category) {
    if (query.subcategory) {
      filters.AND = [
        { category: { name: query.category } },
        { category: { parent: { name: query.subcategory } } }
      ]
    } else {
      filters.category = { name: query.category }
    }
  }
  if (query.level) {
    filters.metadata = { contains: query.level, mode: 'insensitive' }
  }
  if (query.type) filters.type = query.type
  if (query.status) filters.status = query.status
  if (query.verificationStatus) filters.verificationStatus = query.verificationStatus
  if (query.reviewGate) filters.reviewGate = query.reviewGate
  if (query.isDemo !== undefined) filters.isDemo = query.isDemo === 'true'
  if (query.search) {
    filters.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { summary: { contains: query.search, mode: 'insensitive' } },
      { problem: { contains: query.search, mode: 'insensitive' } },
      { quickAnswer: { contains: query.search, mode: 'insensitive' } },
      { content: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } }
    ]
  }
  return filters
}

function buildContent(fields: {
  summary?: string | null
  problem?: string | null
  quickAnswer?: string | null
  learnSteps?: string | null
  applySteps?: string | null
  warning?: string | null
  task?: string | null
  seeAlso?: string | null
}): string {
  const parts: string[] = []

  if (fields.summary) parts.push(`## Özet\n\n${fields.summary}`)
  if (fields.problem) parts.push(`## Çözdüğü Sorun\n\n${fields.problem}`)
  if (fields.quickAnswer) parts.push(`## Kısa Cevap\n\n${fields.quickAnswer}`)

  if (fields.learnSteps) {
    try {
      const steps = JSON.parse(fields.learnSteps)
      if (Array.isArray(steps)) {
        for (const s of steps) {
          if (s.type === 'concept' && s.body) parts.push(`## ${s.title || 'Kavram'}\n\n${s.body}`)
          else if (s.type === 'steps' && Array.isArray(s.steps)) parts.push(`## ${s.title || 'Adımlar'}\n\n${s.steps.join('\n')}`)
          else if (s.type === 'example') parts.push(`## ${s.title || 'Örnek'}\n\n${s.scenario || ''}${s.table ? '\n' + JSON.stringify(s.table) : ''}`)
        }
      }
    } catch { /* skip */ }
  }

  if (fields.applySteps) {
    try {
      const steps = JSON.parse(fields.applySteps)
      if (Array.isArray(steps)) {
        for (const a of steps) {
          if (a.type === 'checklist' && Array.isArray(a.items)) parts.push(`## Kontrol Listesi\n\n${a.items.map((i: string) => `- ${i}`).join('\n')}`)
          else if (a.type === 'practice' && a.prompt) parts.push(`## Uygulama\n\n${a.prompt}`)
        }
      }
    } catch { /* skip */ }
  }

  if (fields.warning) parts.push(`## Uyarı\n\n${fields.warning}`)
  if (fields.task) parts.push(`## Görev\n\n${fields.task}`)
  if (fields.seeAlso) {
    try {
      const list = JSON.parse(fields.seeAlso)
      if (Array.isArray(list) && list.length > 0) parts.push(`## İlişkili Konular\n\n${list.map((t: string) => `- ${t}`).join('\n')}`)
    } catch { /* skip */ }
  }

  return parts.join('\n\n')
}

function parseSort(query: any): any {
  const sortBy = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
  const sortFieldMap: Record<string, string> = {
    createdAt: 'createdAt',
    title: 'title',
    type: 'type',
    updatedAt: 'updatedAt'
  }
  const field = sortFieldMap[sortBy] || 'createdAt'
  return { [field]: sortOrder }
}

async function getKoByCode(code: string) {
  const byCode = await prisma.knowledgeObject.findUnique({
    where: { code },
    include: {
      category: true,
      currentVersion: true,
      sources: { include: { source: true } },
      reviews: true
    }
  })
  if (byCode) return byCode
  // fallback: find by numeric id
  const num = parseInt(code)
  if (!isNaN(num)) {
    return prisma.knowledgeObject.findUnique({
      where: { id: num },
      include: {
        category: true,
        currentVersion: true,
        sources: { include: { source: true } },
        reviews: true
      }
    })
  }
  return null
}

async function logPublicationEvent(koId: number, action: string, userId: number, note?: string) {
  await prisma.publicationEvent.create({
    data: { koId, action, performedBy: userId, note: note || null }
  })
}

async function logReviewRecord(koId: number, reviewerId: number, status: string, notes?: string) {
  await prisma.reviewRecord.create({
    data: { koId, reviewerId, status, notes: notes || null, reviewedAt: new Date() }
  })
}

function parsePagination(query: any): { skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20))
  return { skip: (page - 1) * pageSize, take: pageSize }
}

const ALLOWED_ROLES_EDITOR = ['admin', 'content_editor']
const ALLOWED_ROLES_EXPERT = ['admin', 'subject_expert']
const ALLOWED_ROLES_ADMIN = ['admin']
const HIGH_GATES = ['requires_professional_approval', 'requires_current_official_source_and_legal_approval']

// Select all scalar fields except embedding for list queries
const KO_LIST_SELECT = {
  id: true, code: true, slug: true, type: true, title: true,
  content: true,
  metadata: true, status: true, verificationStatus: true, reviewGate: true, isDemo: true,
  publishedAt: true, archivedAt: true, reviewDue: true,
  categoryId: true, currentVersionId: true,
  createdAt: true, updatedAt: true,
  applySteps: true, learnSteps: true, problem: true, quickAnswer: true,
  seeAlso: true, summary: true, task: true, warning: true,
  category: true
}

const KO_TOPIC_SELECT = {
  ...KO_LIST_SELECT,
  sources: { include: { source: true } }
}

// ---------------------------------------------------------------------------
// v2 Knowledge Routes
// ---------------------------------------------------------------------------

export async function knowledgeV2Routes(fastify: FastifyInstance) {
  // GET /api/v2/knowledge-objects – filtered listing (public)
  fastify.get('/api/v2/knowledge-objects', async (request, reply) => {
    const query = request.query as any
    const where: any = parseFilters(query)
    // public endpoint: only published + !isDemo unless admin
    const authHeader = request.headers.authorization
    let isAdmin = false
    if (authHeader) {
      try {
        const decoded = fastify.jwt.verify(authHeader.replace('Bearer ', '')) as any
        isAdmin = decoded.role === 'admin'
      } catch { /* stay public */ }
    }
    if (!isAdmin) {
      where.status = 'published'
      where.isDemo = false
      /* Canonical KO'lar Bilgi katalogunda LISTELENMEZ. Bunlarin ogrenme
         deneyimi Course Player'dir; katalogda gorunmeleri kullaniciyi
         KnowledgeDetail'e yonlendiriyordu. Kayit silinmez, yalniz listeden
         duser — KO detayi, mentor atifi ve ders bagi calismaya devam eder.
         Admin icin gorunur kalir. */
      where.NOT = { ...(where.NOT ?? {}), code: { startsWith: 'CANON-' } }
    }

    const { skip, take } = parsePagination(query)
    const orderBy = parseSort(query)

    const [results, total] = await Promise.all([
      prisma.knowledgeObject.findMany({ where, skip, take, orderBy, select: KO_LIST_SELECT }),
      prisma.knowledgeObject.count({ where })
    ])
    return {
      results,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take)
    }
  })

  // GET /api/v2/knowledge-objects/:code – detail by code
  fastify.get('/api/v2/knowledge-objects/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    // public users see only published + non-demo
    const authHeader = request.headers.authorization
    let userRole = ''
    if (authHeader) {
      try {
        const decoded = fastify.jwt.verify(authHeader.replace('Bearer ', '')) as any
        userRole = decoded.role
      } catch { /* stay public */ }
    }
    const isEditor = ['admin', 'content_editor', 'subject_expert'].includes(userRole)
    if (!isEditor) {
      if (ko.status !== 'published' || ko.isDemo) {
        return reply.status(404).send({ error: 'Knowledge object not found' })
      }
    }

    // Fetch quizzes, task templates, and related KOs in parallel
    const publicQuestionSelect = { id: true, questionText: true, options: true, order: true }
    const adminQuestionSelect = { id: true, questionText: true, options: true, correctAnswer: true, explanation: true, order: true }

    const [rawQuizzes, taskTemplates, relatedKOs] = await Promise.all([
      prisma.quiz.findMany({
        where: { koId: ko.id },
        include: {
          questions: {
            select: isEditor ? adminQuestionSelect : publicQuestionSelect,
            orderBy: { order: 'asc' }
          }
        }
      }),
      prisma.taskTemplate.findMany({ where: { koId: ko.id } }),
      prisma.knowledgeObject.findMany({
        where: {
          id: { not: ko.id },
          status: 'published',
          isDemo: false,
          categoryId: ko.categoryId || undefined
        },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } } }
      })
    ])

    const quizzes = rawQuizzes.map(quiz => ({
      ...quiz,
      questions: quiz.questions.map(question => ({
        ...question,
        options: (() => {
          try {
            const parsed = JSON.parse(question.options)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      }))
    }))

    const embeddedPracticeBlocks = await getEmbeddedPracticeBlocksForKnowledgeObject(ko.id)

    /* Canonical KO'nun ogrenme deneyimi Course Player'dir. Detay ekrani
       referans olarak acilabilir; istemci bu bagla "Dersi Ac" CTA'si
       gosterir. Bag yoksa alan null doner ve CTA cikmaz. */
    let canonicalLesson: { courseId: number; lessonId: number; courseTitle: string } | null = null
    if (ko.code?.startsWith('CANON-')) {
      const lesson = await prisma.lesson.findFirst({
        where: { knowledgeObjectId: ko.id, course: { sourceType: 'canonical-v1' } },
        select: { id: true, courseId: true, course: { select: { title: true } } }
      })
      if (lesson) {
        canonicalLesson = {
          courseId: lesson.courseId,
          lessonId: lesson.id,
          courseTitle: lesson.course.title
        }
      }
    }

    return {
      knowledgeObject: ko,
      quizzes,
      taskTemplates,
      relatedKOs,
      embeddedPracticeBlocks,
      canonicalLesson
    }
  })

  // GET /api/v2/knowledge-topics – grouped topic listing (public)
  fastify.get('/api/v2/knowledge-topics', async (request) => {
    const query = request.query as any
    const { skip, take } = parsePagination(query)

    const where: any = { status: 'published', isDemo: false, archivedAt: null }
    if (query.category) where.category = { name: query.category }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    const kos = await prisma.knowledgeObject.findMany({
      where,
      select: KO_TOPIC_SELECT,
      orderBy: { createdAt: 'desc' }
    })

    const groups = new Map<string, {
      topicKey: string
      title: string
      category: string | null
      availableLevels: { level: string; code: string; koId: number }[]
      estimatedTime: number
      sourceCount: number
      updatedAt: string
    }>()

    for (const ko of kos) {
      const meta = JSON.parse(ko.metadata || '{}')
      const topicId = meta.curriculumTopicId || ko.code
      const topicKey = String(topicId).toLowerCase().replace(/\s+/g, '-')

      const level = meta.level || 'baslangic'
      const duration = meta.duration ? parseInt(meta.duration) : 0

      if (!groups.has(topicKey)) {
        groups.set(topicKey, {
          topicKey,
          title: ko.title,
          category: ko.category?.name || null,
          availableLevels: [],
          estimatedTime: 0,
          sourceCount: 0,
          updatedAt: ko.updatedAt.toISOString()
        })
      }

      const g = groups.get(topicKey)!
      g.availableLevels.push({ level, code: ko.code!, koId: ko.id })
      g.estimatedTime = Math.max(g.estimatedTime, duration)
      g.sourceCount += ko.sources?.length || 0
      if (ko.updatedAt.toISOString() > g.updatedAt) g.updatedAt = ko.updatedAt.toISOString()
      if (ko.title && g.title !== ko.title) {
        g.title = g.title.length >= ko.title.length ? g.title : ko.title
      }
    }

    let topics = Array.from(groups.values())

    if (query.sortBy === 'title') {
      topics.sort((a, b) => query.sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title))
    } else {
      topics.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }

    const total = topics.length
    topics = topics.slice(skip, skip + take)

    return { results: topics, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) }
  })

  // GET /api/v2/knowledge-topics/:topicKey – single topic detail
  fastify.get('/api/v2/knowledge-topics/:topicKey', async (request, reply) => {
    const { topicKey } = request.params as { topicKey: string }
    const level = (request.query as any).level

    const kos = await prisma.knowledgeObject.findMany({
      where: { status: 'published', isDemo: false, archivedAt: null },
      select: KO_TOPIC_SELECT,
      orderBy: { createdAt: 'desc' }
    })

    const matched: typeof kos = []
    for (const ko of kos) {
      const meta = JSON.parse(ko.metadata || '{}')
      const topicId = meta.curriculumTopicId || ko.code
      const ktKey = String(topicId).toLowerCase().replace(/\s+/g, '-')
      if (ktKey === topicKey) matched.push(ko)
    }

    if (matched.length === 0) return reply.status(404).send({ error: 'Topic not found' })

    let target = matched
    if (level) target = matched.filter(ko => {
      const meta = JSON.parse(ko.metadata || '{}')
      return meta.level === level
    })

    return {
      topicKey,
      kos: target.map(ko => {
        const meta = JSON.parse(ko.metadata || '{}')
        return { ...ko, metadata: meta }
      }),
      availableLevels: matched.map(ko => {
        const meta = JSON.parse(ko.metadata || '{}')
        return { level: meta.level || 'baslangic', code: ko.code }
      }).filter((v, i, a) => a.findIndex(t => t.level === v.level) === i)
    }
  })

  // GET /api/v2/categories – public category list
  fastify.get('/api/v2/categories', async () => {
    const categories = await prisma.category.findMany({
      where: { knowledgeObjects: { some: { isDemo: false, status: 'published' } } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { knowledgeObjects: { where: { isDemo: false, status: 'published' } } } } }
    })
    return { categories: categories.map(c => ({ id: c.id, name: c.name, count: c._count.knowledgeObjects })) }
  })

  // POST /api/v2/admin/knowledge-objects – create (content_editor / admin)
  fastify.post('/api/v2/admin/knowledge-objects', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EDITOR.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }
    const {
      type, title,
      summary, problem, quickAnswer, learnSteps, applySteps, warning, task, seeAlso,
      content, metadata,
      code: reqCode, slug: reqSlug, reviewGate, categoryId
    } = request.body as any

    const newCode = reqCode || `KO-${Date.now()}`
    const existingCode = await prisma.knowledgeObject.findUnique({ where: { code: newCode } })
    if (existingCode) return reply.status(409).send({ error: 'Code already exists' })

    const structuredFields = { summary, problem, quickAnswer, learnSteps, applySteps, warning, task, seeAlso }
    const autoContent = buildContent(structuredFields)

    const ko = await prisma.knowledgeObject.create({
      data: {
        type: type || 'concept',
        title,
        summary: summary || null,
        problem: problem || null,
        quickAnswer: quickAnswer || null,
        learnSteps: learnSteps || null,
        applySteps: applySteps || null,
        warning: warning || null,
        task: task || null,
        seeAlso: seeAlso || null,
        content: content || autoContent,
        embedding: '[]',
        metadata: metadata || '{}',
        code: newCode,
        slug: reqSlug || newCode.toLowerCase(),
        status: 'draft',
        verificationStatus: 'unverified',
        reviewGate: reviewGate || 'standard',
        isDemo: false,
        categoryId: categoryId || null
      }
    })

    await createAuditLog({
      action: 'knowledge_object.created',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { entityCode: ko.code, entityTitle: ko.title, gate: ko.reviewGate }
    })

    return reply.status(201).send({ knowledgeObject: ko })
  })

  // PUT /api/v2/admin/knowledge-objects/:code – update (content_editor)
  fastify.put('/api/v2/admin/knowledge-objects/:code', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EDITOR.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    // only draft KOs can be edited freely
    if (ko.status !== 'draft' && ko.status !== 'rejected') {
      return reply.status(422).send({ error: 'Only draft or rejected objects can be edited' })
    }

    const {
      title,
      summary, problem, quickAnswer, learnSteps, applySteps, warning, task, seeAlso,
      content, type, metadata, slug, reviewGate, categoryId, updatedAt
    } = request.body as any

    if (updatedAt) {
      const expectedVersion = new Date(updatedAt).getTime()
      const actualVersion = new Date(ko.updatedAt).getTime()
      if (actualVersion !== expectedVersion) {
        return reply.status(409).send({ error: 'Conflict: knowledge object was modified by another operation' })
      }
    }

    const hasStructured =
      summary !== undefined || problem !== undefined || quickAnswer !== undefined ||
      learnSteps !== undefined || applySteps !== undefined ||
      warning !== undefined || task !== undefined || seeAlso !== undefined

    let autoContent: string | undefined
    if (hasStructured) {
      autoContent = buildContent({
        summary: summary ?? ko.summary,
        problem: problem ?? ko.problem,
        quickAnswer: quickAnswer ?? ko.quickAnswer,
        learnSteps: learnSteps ?? ko.learnSteps,
        applySteps: applySteps ?? ko.applySteps,
        warning: warning ?? ko.warning,
        task: task ?? ko.task,
        seeAlso: seeAlso ?? ko.seeAlso,
      })
    }

    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: {
        title: title ?? ko.title,
        summary: summary !== undefined ? summary : ko.summary,
        problem: problem !== undefined ? problem : ko.problem,
        quickAnswer: quickAnswer !== undefined ? quickAnswer : ko.quickAnswer,
        learnSteps: learnSteps !== undefined ? learnSteps : ko.learnSteps,
        applySteps: applySteps !== undefined ? applySteps : ko.applySteps,
        warning: warning !== undefined ? warning : ko.warning,
        task: task !== undefined ? task : ko.task,
        seeAlso: seeAlso !== undefined ? seeAlso : ko.seeAlso,
        content: content ?? (autoContent ?? ko.content),
        type: type ?? ko.type,
        metadata: metadata ?? ko.metadata,
        slug: slug ?? ko.slug,
        reviewGate: reviewGate ?? ko.reviewGate,
        categoryId: categoryId ?? ko.categoryId,
        status: 'draft',
        verificationStatus: 'unverified'
      }
    })

    await createAuditLog({
      action: 'knowledge_object.updated',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { entityCode: ko.code, entityTitle: ko.title }
    })

    return { knowledgeObject: updated }
  })

  // /api/v2/admin/knowledge-objects/:code/submit-review – submit for review
  fastify.post('/api/v2/admin/knowledge-objects/:code/submit-review', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EDITOR.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    if (ko.status !== 'draft' && ko.status !== 'rejected') {
      return reply.status(422).send({ error: 'Only draft or rejected objects can be submitted for review' })
    }

    if (!ko.sources || ko.sources.length === 0) {
      return reply.status(422).send({ error: 'Cannot submit review: no sources attached' })
    }

    enforceTransition(ko.status, 'in_review')

    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { status: 'in_review', verificationStatus: 'pending_review', reviewDue: new Date() }
    })

    await logReviewRecord(ko.id, user.id, 'submitted_for_review')

    await createAuditLog({
      action: 'knowledge_object.submitted_for_review',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { fromStatus: ko.status, toStatus: 'in_review', entityCode: ko.code }
    })

    return { knowledgeObject: updated }
  })

  // POST /api/v2/admin/knowledge-objects/:code/approve – approve (subject_expert)
  fastify.post('/api/v2/admin/knowledge-objects/:code/approve', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EXPERT.includes(user.role)) {
      return reply.status(403).send({ error: 'Subject expert or admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    if (ko.status !== 'in_review') {
      return reply.status(422).send({ error: 'Only objects in review can be approved' })
    }

    enforceTransition(ko.status, 'approved')

    const { notes } = request.body as any
    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { status: 'approved', verificationStatus: 'verified' }
    })
    await logReviewRecord(ko.id, user.id, 'approved', notes)
    await logP(ko.id, 'approved', user.id, notes)

    await createAuditLog({
      action: 'knowledge_object.approved',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { fromStatus: ko.status, toStatus: 'approved', notes, entityCode: ko.code }
    })

    return { knowledgeObject: updated }
  })

  // POST /api/v2/admin/knowledge-objects/:code/reject – reject (subject_expert)
  fastify.post('/api/v2/admin/knowledge-objects/:code/reject', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EXPERT.includes(user.role)) {
      return reply.status(403).send({ error: 'Subject expert or admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    if (ko.status !== 'in_review') {
      return reply.status(422).send({ error: 'Only objects in review can be rejected' })
    }

    enforceTransition(ko.status, 'rejected')

    const { notes } = request.body as any
    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { status: 'rejected', verificationStatus: 'unverified' }
    })
    await logReviewRecord(ko.id, user.id, 'rejected', notes)
    await logP(ko.id, 'rejected', user.id, notes)

    await createAuditLog({
      action: 'knowledge_object.rejected',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { fromStatus: ko.status, toStatus: 'rejected', notes, entityCode: ko.code }
    })

    return { knowledgeObject: updated }
  })

  // POST /api/v2/admin/knowledge-objects/:code publish – publish (admin only)
  fastify.post('/api/v2/admin/knowledge-objects/:code/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_ADMIN.includes(user.role)) {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    if (ko.status !== 'approved') {
      return reply.status(422).send({ error: 'Only approved objects can be published' })
    }

    // source must exist
    if (!ko.sources || ko.sources.length === 0) {
      return reply.status(422).send({ error: 'Cannot publish: no sources attached' })
    }
    // gate check
    if (HIGH_GATES.includes(ko.reviewGate) && ko.verificationStatus !== 'verified') {
      return reply.status(422).send({ error: `Cannot publish: gate '${ko.reviewGate}' requires verified status` })
    }

    enforceTransition(ko.status, 'published')

    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { status: 'published', publishedAt: new Date() }
    })
    const embeddingStatus = scheduleKnowledgeObjectEmbedding({
      prisma,
      koId: ko.id,
      logger: request.log,
    })
    if (embeddingStatus === 'queue_full') {
      request.log.warn(
        { koId: ko.id, errorCode: 'KNOWLEDGE_EMBEDDING_QUEUE_FULL' },
        'knowledge embedding queue is full',
      )
    }
    await logP(ko.id, 'published', user.id)

    await createAuditLog({
      action: 'knowledge_object.published',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { fromStatus: ko.status, toStatus: 'published', gate: ko.reviewGate, entityCode: ko.code }
    })

    return { knowledgeObject: updated }
  })

  // POST /api/v2/admin/knowledge-objects/:code/archive – archive (admin only)
  fastify.post('/api/v2/admin/knowledge-objects/:code/archive', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_ADMIN.includes(user.role)) {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { code } = request.params as { code: string }
    const ko = await getKoByCode(code)
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    enforceTransition(ko.status, 'archived')

    const { note } = request.body as any
    const updated = await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { status: 'archived', archivedAt: new Date() }
    })
    await logP(ko.id, 'archived', user.id, note)

    await createAuditLog({
      action: 'knowledge_object.archived',
      entityType: 'knowledge_object',
      entityId: ko.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { fromStatus: ko.status, toStatus: 'archived', reason: note, entityCode: ko.code }
    })

    return { knowledgeObject: updated }
  })

  // GET /api/v2/admin/knowledge-objects – admin listing (all, with filters)
  fastify.get('/api/v2/admin/knowledge-objects', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES_EDITOR.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }
    const query = request.query as any
    const where: any = parseFilters(query)
    const { skip, take } = parsePagination(query)

    const [results, total] = await Promise.all([
      prisma.knowledgeObject.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: KO_LIST_SELECT }),
      prisma.knowledgeObject.count({ where })
    ])
    return {
      results,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      pages: Math.ceil(total / take)
    }
  })

  // GET /api/v2/search – global cross-content search (public, authenticated users)
  // Kurslar, bilgi nesneleri, karar araçları ve haberler TEK sorguda taranır.
  // Görünürlük kuralları: yayında, demo değil, arşivlenmemiş; canonical içerik
  // (CANON- kodu) legacy bilgi nesnelerinden ayrı tutulur.
  fastify.get('/api/v2/search', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 60, timeWindow: '1 minute' },
    },
  }, async (request) => {
    const term = String((request.query as any).q || '').trim().slice(0, 100)
    if (!term) {
      return { courses: [], knowledge: [], decisionChecks: [], news: [], people: [], posts: [] }
    }
    const arayanId = (request.user as { id: number }).id

    /*
     * KISI ARAMASINDA ENGEL UYGULANIYOR.
     *
     * Engellediklerim ve BENI engelleyenler sonuclarda cikmamali.
     * Ciksaydi engelleme yine yarim kalirdi: profil ziyaretini
     * engelleyip aramada gostermek, kisiyi bir tik uzakta birakirdi.
     *
     * Iki yon de tek sorguda toplaniyor; iki ayri sorgu acmak bu is
     * icin gereksiz.
     */
    const engeller = await prisma.communityBlock.findMany({
      where: { OR: [{ blockerId: arayanId }, { blockedId: arayanId }] },
      select: { blockerId: true, blockedId: true },
    })
    const engelliKimlikler = new Set<number>()
    for (const e of engeller) {
      engelliKimlikler.add(e.blockerId === arayanId ? e.blockedId : e.blockerId)
    }
    const contains = { contains: term, mode: 'insensitive' as const }

    const [courses, knowledge, decisionChecks, news] = await Promise.all([
      prisma.course.findMany({
        where: {
          published: true,
          archivedAt: null,
          OR: [{ title: contains }, { description: contains }],
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          level: true,
          slug: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        take: 5,
      }),
      prisma.knowledgeObject.findMany({
        where: {
          status: 'published',
          isDemo: false,
          archivedAt: null,
          NOT: { code: { startsWith: 'CANON-' } },
          OR: [
            { title: contains },
            { summary: contains },
            { quickAnswer: contains },
            { content: contains },
            { code: contains },
          ],
        },
        select: {
          id: true,
          code: true,
          title: true,
          summary: true,
          category: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.decisionCheck.findMany({
        where: {
          published: true,
          deletedAt: null,
          OR: [{ title: contains }, { description: contains }, { code: contains }],
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          category: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [{ title: contains }, { summary: contains }],
        },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          sourcePublishedAt: true,
        },
        orderBy: { sourcePublishedAt: 'desc' },
        take: 5,
      }),
    ])

    /*
     * KISI ve PAYLASIM aramasi.
     *
     * Ayri bir `Promise.all` icinde cunku ikisi de yukaridaki engel
     * listesine bagli ve o liste await edilmis olmali.
     */
    const [people, posts] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          id: { notIn: [...engelliKimlikler] },
          OR: [{ name: contains }, { bio: contains }],
        },
        select: { id: true, name: true, bio: true, avatarStoredName: true },
        orderBy: { name: 'asc' },
        take: 5,
      }),
      prisma.communityPost.findMany({
        where: {
          status: 'published',
          /* Yanitlar arama sonucunda ayri kart olarak cikmasin --
             baglamindan kopuk gorunurler. */
          parentId: null,
          authorId: { notIn: [...engelliKimlikler] },
          OR: [{ summary: contains }, { title: contains }],
        },
        select: {
          id: true, summary: true, publishedAt: true,
          author: { select: { id: true, name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),
    ])

    return {
      courses,
      knowledge,
      decisionChecks,
      news,
      people: people.map(k => ({
        id: k.id,
        name: k.name,
        bio: k.bio,
        avatarUrl: k.avatarStoredName ? `/auth/avatar/${k.avatarStoredName}` : null,
      })),
      posts: posts.map(g => ({
        id: g.id,
        ozet: (g.summary || '').slice(0, 120),
        publishedAt: g.publishedAt,
        author: g.author,
      })),
    }
  })
}

// Shortcut for logP function
function logP(koId: number, action: string, userId: number, note?: string) {
  return logPublicationEvent(koId, action, userId, note)
}
