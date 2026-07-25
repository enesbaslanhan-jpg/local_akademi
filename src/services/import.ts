import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { randomUUID } from 'crypto'
import { createAuditLog } from './audit.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_KO_COUNT = 1000

const ALLOWED_ROLES = ['admin', 'content_editor']

const VALID_STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected', 'archived'] as const
const VALID_VERIFICATION_STATUSES = ['unverified', 'source_verified', 'expert_verified', 'expired', 'demo_unverified'] as const
const VALID_REVIEW_GATES = ['standard', 'demo_only', 'requires_professional_approval', 'requires_current_official_source_and_legal_approval'] as const

interface ImportSource {
  sourceId?: string
  title?: string
  url?: string
  authorityLevel?: string
  sourceType?: string
}

interface ImportKO {
  code?: string
  type?: string
  title?: string
  summary?: string
  problem?: string
  quickAnswer?: string
  learnSteps?: unknown[]
  applySteps?: unknown[]
  warning?: string
  task?: string
  seeAlso?: unknown[]
  content?: string
  metadata?: Record<string, any>
  slug?: string
  reviewGate?: string
  category?: string
  categorySlug?: string
  categoryCode?: string
  sources?: ImportSource[]
  version?: number
  status?: string
  isDemo?: boolean
  verificationStatus?: string
  reviewDue?: string
  publishedAt?: string | null
}

interface ValidationError {
  index: number
  koCode?: string
  field: string
  errorCode: string
  message: string
}

function parseImportJSON(body: any): { kos: ImportKO[]; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  let kos: ImportKO[]

  if (Array.isArray(body)) {
    kos = body
  } else if (body.knowledgeObjects && Array.isArray(body.knowledgeObjects)) {
    kos = body.knowledgeObjects
  } else if (body.data && Array.isArray(body.data)) {
    kos = body.data
  } else {
    errors.push({ index: -1, field: 'root', errorCode: 'INVALID_FORMAT', message: 'JSON must be an array of KO objects or { knowledgeObjects: [...] } or { data: [...] }' })
    return { kos: [], errors }
  }

  if (kos.length > MAX_KO_COUNT) {
    errors.push({ index: -1, field: 'root', errorCode: 'TOO_MANY_KOS', message: `Maximum ${MAX_KO_COUNT} KO per import, got ${kos.length}` })
    return { kos: [], errors }
  }

  kos.forEach((ko, i) => {
    if (ko.sources && !Array.isArray(ko.sources)) {
      errors.push({ index: i, koCode: ko.code, field: 'sources', errorCode: 'INVALID_TYPE', message: 'sources must be an array' })
    }
  })

  return { kos, errors }
}

async function validateKOs(
  kos: ImportKO[],
  existingCodes: Set<string>,
  existingSlugs: Set<string>,
  dbSources: Map<string, { id: string; title: string; url: string | null }>,
  categories: Map<string, { id: number; name: string; slug: string | null }>
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  for (let i = 0; i < kos.length; i++) {
    const ko = kos[i]
    const isExplicitDemo = ko.isDemo === true
    const code = ko.code
    const slug = ko.slug

    // title required
    if (!ko.title) {
      errors.push({ index: i, koCode: code, field: 'title', errorCode: 'REQUIRED', message: 'title is required' })
    }

    // type required
    if (!ko.type) {
      errors.push({ index: i, koCode: code, field: 'type', errorCode: 'REQUIRED', message: 'type is required' })
    }

    // code required for non-demo KO
    if (!isExplicitDemo && !code) {
      errors.push({ index: i, field: 'code', errorCode: 'REQUIRED', message: 'code is required for professional KO (isDemo=false). AUTO code only allowed for demo/test imports.' })
    }

    // if code provided, check duplicates within batch
    if (code) {
      const batchDups = kos.filter((k, j) => j < i && k.code === code)
      if (batchDups.length > 0) {
        errors.push({ index: i, koCode: code, field: 'code', errorCode: 'DUPLICATE_IN_BATCH', message: `Duplicate code '${code}' appears multiple times in import file` })
      }

      // already exists in DB
      if (existingCodes.has(code)) {
        if (ko.version !== undefined) {
          errors.push({ index: i, koCode: code, field: 'code', errorCode: 'DUPLICATE_CODE', message: `Code '${code}' already exists. Importing new KO requires a unique code. Version-based update not supported in this import.` })
        } else {
          errors.push({ index: i, koCode: code, field: 'code', errorCode: 'DUPLICATE_CODE', message: `Code '${code}' already exists. Code must be unique.` })
        }
      }
    }

    // slug: if provided, check uniqueness within batch and DB
    if (slug) {
      const batchSlugDups = kos.filter((k, j) => j < i && k.slug === slug)
      if (batchSlugDups.length > 0) {
        errors.push({ index: i, koCode: code, field: 'slug', errorCode: 'DUPLICATE_SLUG_IN_BATCH', message: `Duplicate slug '${slug}' appears multiple times in import file` })
      }
      if (existingSlugs.has(slug)) {
        errors.push({ index: i, koCode: code, field: 'slug', errorCode: 'DUPLICATE_SLUG', message: `Slug '${slug}' already exists.` })
      }
    }

    // status validation
    if (ko.status !== undefined && ko.status !== null) {
      if (!VALID_STATUSES.includes(ko.status as any)) {
        errors.push({ index: i, koCode: code, field: 'status', errorCode: 'INVALID_VALUE', message: `Invalid status '${ko.status}'. Allowed: ${VALID_STATUSES.join(', ')}` })
      }
      if (ko.status === 'published') {
        errors.push({ index: i, koCode: code, field: 'status', errorCode: 'IMPORT_CANNOT_PUBLISH', message: 'Cannot import with status=published. Professional KO must be created as draft and go through workflow.' })
      }
    }

    // verificationStatus validation
    if (ko.verificationStatus !== undefined && ko.verificationStatus !== null) {
      if (!VALID_VERIFICATION_STATUSES.includes(ko.verificationStatus as any)) {
        errors.push({ index: i, koCode: code, field: 'verificationStatus', errorCode: 'INVALID_VALUE', message: `Invalid verificationStatus '${ko.verificationStatus}'. Allowed: ${VALID_VERIFICATION_STATUSES.join(', ')}` })
      }
    }

    // isDemo validation
    if (ko.isDemo !== undefined && typeof ko.isDemo !== 'boolean') {
      errors.push({ index: i, koCode: code, field: 'isDemo', errorCode: 'INVALID_TYPE', message: 'isDemo must be a boolean' })
    }

    // reviewGate validation
    if (ko.reviewGate !== undefined && ko.reviewGate !== null) {
      if (!VALID_REVIEW_GATES.includes(ko.reviewGate as any)) {
        errors.push({ index: i, koCode: code, field: 'reviewGate', errorCode: 'INVALID_VALUE', message: `Invalid reviewGate '${ko.reviewGate}'. Allowed: ${VALID_REVIEW_GATES.join(', ')}` })
      }
    }

    // isDemo=false + reviewGate=demo_only → reject
    if (ko.isDemo === false && ko.reviewGate === 'demo_only') {
      errors.push({ index: i, koCode: code, field: 'reviewGate', errorCode: 'INVALID_COMBINATION', message: 'reviewGate=demo_only is not allowed when isDemo=false' })
    }

    // type required
    if (!ko.type) {
      errors.push({ index: i, koCode: code, field: 'type', errorCode: 'REQUIRED', message: 'type is required' })
    }

    // reviewDue format if provided
    if (ko.reviewDue) {
      const parsed = new Date(ko.reviewDue)
      if (isNaN(parsed.getTime())) {
        errors.push({ index: i, koCode: code, field: 'reviewDue', errorCode: 'INVALID_DATE', message: `reviewDue '${ko.reviewDue}' is not a valid ISO date string` })
      }
    }

    // publishedAt must be null for import
    if (ko.publishedAt !== undefined && ko.publishedAt !== null && ko.publishedAt !== '') {
      errors.push({ index: i, koCode: code, field: 'publishedAt', errorCode: 'IMPORT_CANNOT_PUBLISH', message: 'publishedAt must be null on import. KO cannot be pre-published.' })
    }

    // category resolution: categorySlug > categoryCode > category (name)
    const categorySlug = ko.categorySlug || ko.categoryCode || ko.category
    if (categorySlug) {
      let found = false
      for (const cat of categories.values()) {
        if (cat.slug === categorySlug || cat.name === categorySlug) {
          found = true
          break
        }
      }
      if (!found) {
        errors.push({ index: i, koCode: code, field: 'categorySlug', errorCode: 'CATEGORY_NOT_FOUND', message: `Category '${categorySlug}' not found. Create it first or check the slug/name.` })
      }
    }

    // source validation
    if (ko.sources && ko.sources.length > 0) {
      for (let j = 0; j < ko.sources.length; j++) {
        const src = ko.sources[j]
        let found = false

        if (src.sourceId) {
          const byId = Array.from(dbSources.values()).find(s => s.id === src.sourceId)
          if (byId) found = true
        }

        if (!found && src.url) {
          const normalizedUrl = src.url.replace(/\/+$/, '').toLowerCase()
          const byUrl = Array.from(dbSources.values()).find(s => s.url && s.url.replace(/\/+$/, '').toLowerCase() === normalizedUrl)
          if (byUrl) found = true
        }

        if (!found && src.title) {
          const byTitle = Array.from(dbSources.values()).find(s => s.title === src.title)
          if (byTitle) found = true
        }

        if (!found) {
          const identifier = src.sourceId || src.title || src.url || `source[${j}]`
          errors.push({ index: i, koCode: code, field: `sources[${j}]`, errorCode: 'SOURCE_NOT_FOUND', message: `Source '${identifier}' not found. Create it first via Source Registry or check identifier.` })
        }
      }
    }
  }

  return errors
}

function generateSlug(code: string, title: string, index: number): string {
  if (code) return `${code.toLowerCase()}-imported`
  const base = title.toLowerCase().replace(/[^a-z0-9çşğıüö]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `ko-${index}`
  return `${base}-${Date.now()}`
}

export async function importRoutes(fastify: FastifyInstance) {

  // POST /api/v2/admin/knowledge-objects/import/preview
  fastify.post('/api/v2/admin/knowledge-objects/import/preview', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    let body: any
    const contentType = request.headers['content-type'] || ''
    try {
      if (contentType.includes('application/json')) {
        body = request.body
      } else {
        body = JSON.parse(String(request.body))
      }
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' })
    }

    const rawSize = JSON.stringify(body).length
    if (rawSize > MAX_FILE_SIZE) {
      return reply.status(413).send({ error: `File too large. Max ${MAX_FILE_SIZE} bytes.` })
    }

    const { kos, errors } = parseImportJSON(body)
    if (errors.length > 0) {
      return reply.status(422).send({
        valid: false,
        totalRows: kos.length,
        errors,
        message: 'Validation failed'
      })
    }

    // fetch existing codes and slugs
    const existingKOs = await prisma.knowledgeObject.findMany({ select: { code: true, slug: true } })
    const existingCodes = new Set(existingKOs.map(k => k.code!).filter(Boolean))
    const existingSlugs = new Set(existingKOs.map(k => k.slug!).filter(Boolean))

    // fetch existing sources (id, title, url)
    const allSources = await prisma.source.findMany()
    const dbSources = new Map<string, { id: string; title: string; url: string | null }>()
    allSources.forEach(s => dbSources.set(s.id, { id: s.id, title: s.title, url: s.url }))

    // fetch categories
    const allCategories = await prisma.category.findMany()
    const categories = new Map<string, { id: number; name: string; slug: string | null }>()
    allCategories.forEach(c => {
      // index by slug and name for lookup
      categories.set(c.name, { id: c.id, name: c.name, slug: c.slug || null })
    })

    const validationErrors = await validateKOs(kos, existingCodes, existingSlugs, dbSources, categories)

    // compute wouldCreate slugs for display
    const wouldCreateSlugs = kos.map((ko, i) => {
      return ko.slug || generateSlug(ko.code || '', ko.title || '', i)
    })

    // source match summary
    const sourceMatches: { index: number; code: string | undefined; sources: { identifier: string; matched: boolean }[] }[] = kos.map((ko, i) => ({
      index: i,
      code: ko.code,
      sources: (ko.sources || []).map(src => {
        const identifier = src.sourceId || src.title || src.url || 'unknown'
        let matched = false
        if (src.sourceId) { matched = Array.from(dbSources.values()).some(s => s.id === src.sourceId) }
        if (!matched && src.url) { const nu = src.url.replace(/\/+$/, '').toLowerCase(); matched = Array.from(dbSources.values()).some(s => s.url && s.url.replace(/\/+$/, '').toLowerCase() === nu) }
        if (!matched && src.title) { matched = Array.from(dbSources.values()).some(s => s.title === src.title) }
        return { identifier, matched }
      })
    }))

    // category match summary
    const categoryMatches: { index: number; code: string | undefined; categoryIdentifier: string | undefined; matched: boolean }[] = kos.map((ko, i) => {
      const catId = ko.categorySlug || ko.categoryCode || ko.category
      let matched = false
      if (catId) {
        matched = Array.from(categories.values()).some(c => c.slug === catId || c.name === catId)
      }
      return { index: i, code: ko.code, categoryIdentifier: catId, matched }
    })

    return {
      valid: validationErrors.length === 0,
      totalRows: kos.length,
      errors: validationErrors,
      warnings: [],
      summary: {
        wouldCreate: validationErrors.length === 0 ? kos.length : 0,
        wouldUpdate: 0,
        skipped: validationErrors.length
      },
      details: {
        slugs: wouldCreateSlugs,
        sourceMatches,
        categoryMatches
      }
    }
  })

  // POST /api/v2/admin/knowledge-objects/import/commit
  fastify.post('/api/v2/admin/knowledge-objects/import/commit', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    let body: any
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' })
    }

    const rawSize = JSON.stringify(body).length
    if (rawSize > MAX_FILE_SIZE) {
      return reply.status(413).send({ error: `File too large. Max ${MAX_FILE_SIZE} bytes.` })
    }

    const contentType = request.headers['content-type'] || ''
    if (!contentType.includes('application/json')) {
      return reply.status(415).send({ error: 'Only application/json content type allowed' })
    }

    const { kos, errors: parseErrors } = parseImportJSON(body)
    if (parseErrors.length > 0) {
      return reply.status(422).send({ valid: false, totalRows: kos.length, errors: parseErrors })
    }

    // fetch existing data
    const existingKOs = await prisma.knowledgeObject.findMany({ select: { code: true, slug: true } })
    const existingCodes = new Set(existingKOs.map(k => k.code!).filter(Boolean))
    const existingSlugs = new Set(existingKOs.map(k => k.slug!).filter(Boolean))

    const allSources = await prisma.source.findMany()
    const dbSources = new Map<string, { id: string; title: string; url: string | null }>()
    allSources.forEach(s => dbSources.set(s.id, { id: s.id, title: s.title, url: s.url }))

    const allCategories = await prisma.category.findMany()
    const categories = new Map<string, { id: number; name: string; slug: string | null }>()
    allCategories.forEach(c => categories.set(c.name, { id: c.id, name: c.name, slug: c.slug || null }))

    const validationErrors = await validateKOs(kos, existingCodes, existingSlugs, dbSources, categories)
    if (validationErrors.length > 0) {
      return reply.status(422).send({ valid: false, totalRows: kos.length, errors: validationErrors })
    }

    // Create ImportJob
    const job = await prisma.importJob.create({
      data: { id: randomUUID(), status: 'running', totalRows: kos.length }
    })

    try {
      await prisma.$transaction(async (tx) => {
        let processed = 0
        for (let i = 0; i < kos.length; i++) {
          const ko = kos[i]
          const code = ko.code || `AUTO-${Date.now()}-${i}`
          const slug = ko.slug || generateSlug(code, ko.title || '', i)

          // resolve category
          let categoryId: number | null = null
          const catId = ko.categorySlug || ko.categoryCode || ko.category
          if (catId) {
            for (const cat of categories.values()) {
              if (cat.slug === catId || cat.name === catId) {
                categoryId = cat.id
                break
              }
            }
          }

          // resolve sources
          const resolvedSources: { sourceId: string; relation: string }[] = []
          if (ko.sources) {
            for (const src of ko.sources) {
              let found: { id: string; title: string; url: string | null } | undefined
              if (src.sourceId) { found = dbSources.get(src.sourceId) }
              if (!found && src.url) { const nu = src.url.replace(/\/+$/, '').toLowerCase(); found = Array.from(dbSources.values()).find(s => s.url && s.url.replace(/\/+$/, '').toLowerCase() === nu) }
              if (!found && src.title) { found = Array.from(dbSources.values()).find(s => s.title === src.title) }
              if (found) {
                resolvedSources.push({ sourceId: found.id, relation: 'references' })
              }
            }
          }

          // compute defaults
          const isDemo = ko.isDemo === true
          const status = ko.status || 'draft'
          const verificationStatus = isDemo
            ? (ko.verificationStatus || 'demo_unverified')
            : (ko.verificationStatus || 'source_verified')
          const reviewDue = ko.reviewDue ? new Date(ko.reviewDue) : null

          const existing = await tx.knowledgeObject.findUnique({ where: { code } })
          if (existing) {
            // update existing
            await tx.knowledgeObject.update({
              where: { id: existing.id },
              data: {
                title: ko.title || existing.title,
                summary: ko.summary !== undefined ? ko.summary : existing.summary,
                problem: ko.problem !== undefined ? ko.problem : existing.problem,
                quickAnswer: ko.quickAnswer !== undefined ? ko.quickAnswer : existing.quickAnswer,
                learnSteps: ko.learnSteps !== undefined ? JSON.stringify(ko.learnSteps) : existing.learnSteps,
                applySteps: ko.applySteps !== undefined ? JSON.stringify(ko.applySteps) : existing.applySteps,
                warning: ko.warning !== undefined ? ko.warning : existing.warning,
                task: ko.task !== undefined ? ko.task : existing.task,
                seeAlso: ko.seeAlso !== undefined ? JSON.stringify(ko.seeAlso) : existing.seeAlso,
                content: ko.content || existing.content,
                type: ko.type || existing.type,
                metadata: ko.metadata ? JSON.stringify(ko.metadata) : existing.metadata,
                slug,
                status: ko.status || existing.status,
                verificationStatus: isDemo ? (ko.verificationStatus || 'demo_unverified') : (ko.verificationStatus || 'source_verified'),
                reviewGate: ko.reviewGate || existing.reviewGate,
                isDemo,
                reviewDue,
                categoryId: categoryId || existing.categoryId,
                updatedAt: new Date()
              }
            })
          } else {
            // create new KO
            const newKo = await tx.knowledgeObject.create({
              data: {
                code,
                slug,
                title: ko.title!,
                summary: ko.summary || null,
                problem: ko.problem || null,
                quickAnswer: ko.quickAnswer || null,
                learnSteps: ko.learnSteps ? JSON.stringify(ko.learnSteps) : null,
                applySteps: ko.applySteps ? JSON.stringify(ko.applySteps) : null,
                warning: ko.warning || null,
                task: ko.task || null,
                seeAlso: ko.seeAlso ? JSON.stringify(ko.seeAlso) : null,
                content: ko.content || '',
                type: ko.type!,
                embedding: '[]',
                metadata: ko.metadata ? JSON.stringify(ko.metadata) : '{}',
                status,
                verificationStatus,
                reviewGate: ko.reviewGate || 'standard',
                isDemo,
                reviewDue,
                categoryId
              }
            })

            // create initial version
            const ver = await tx.knowledgeObjectVersion.create({
              data: {
                koId: newKo.id,
                versionNumber: ko.version || 1,
                changes: `Initial import via job ${job.id}`,
                createdBy: user.id
              }
            })
            await tx.knowledgeObject.update({
              where: { id: newKo.id },
              data: { currentVersionId: ver.id }
            })

            // link sources
            for (const rs of resolvedSources) {
              await tx.knowledgeObjectSource.create({
                data: { koId: newKo.id, sourceId: rs.sourceId, relation: rs.relation }
              })
            }
          }

          processed++
        }

        await tx.importJob.update({
          where: { id: job.id },
          data: { status: 'completed', processedAt: new Date() }
        })
      })
    } catch (e: any) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'failed', processedAt: new Date() }
      }).catch(() => {})

      const errMsg = e.message || String(e)
      await prisma.importJobError.create({
        data: { importJobId: job.id, row: -1, field: 'transaction', message: `Transaction rolled back: ${errMsg}` }
      }).catch(() => {})

      return reply.status(422).send({
        valid: false,
        totalRows: kos.length,
        errors: [{ index: -1, field: 'transaction', errorCode: 'ROLLBACK', message: errMsg }],
        importJobId: job.id
      })
    }

    await createAuditLog({
      action: 'import.completed',
      entityType: 'import_job',
      entityId: job.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { importJobId: job.id, rowsImported: kos.length }
    })

    return {
      valid: true,
      totalRows: kos.length,
      importJobId: job.id,
      message: 'Import completed successfully',
      summary: { created: kos.length, updated: 0, failed: 0 }
    }
  })

  // GET /api/v2/admin/import-jobs/:id
  fastify.get('/api/v2/admin/import-jobs/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const { id } = request.params as { id: string }
    const job = await prisma.importJob.findUnique({
      where: { id },
      include: { errors: true }
    })
    if (!job) return reply.status(404).send({ error: 'Import job not found' })

    return {
      id: job.id,
      status: job.status,
      totalRows: job.totalRows,
      processedAt: job.processedAt,
      createdAt: job.createdAt,
      errors: job.errors.map(e => ({
        row: e.row,
        field: e.field,
        message: e.message
      }))
    }
  })

  // GET /api/v2/admin/import-jobs – list recent jobs
  fastify.get('/api/v2/admin/import-jobs', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const jobs = await prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { _count: { select: { errors: true } } }
    })

    return {
      jobs: jobs.map(j => ({
        id: j.id,
        status: j.status,
        totalRows: j.totalRows,
        processedAt: j.processedAt,
        createdAt: j.createdAt,
        errorCount: j._count.errors
      }))
    }
  })
}
