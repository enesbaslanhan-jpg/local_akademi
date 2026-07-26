import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { createAuditLog } from './audit.js'

const ALLOWED_ROLES = ['admin', 'content_editor']

const VALID_AUTHORITY_LEVELS = ['high', 'medium', 'low']

export function normalizeSourceUrl(value: string): string {
  const parsed = new URL(value.trim())

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http and https URLs are allowed')
  }

  parsed.hash = ''
  if (parsed.pathname !== '/') {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  }

  const normalized = parsed.toString()
  return parsed.pathname === '/' && !parsed.search ? normalized.replace(/\/$/, '') : normalized
}

export async function sourceRoutes(fastify: FastifyInstance) {

  // POST /api/v2/admin/sources
  fastify.post('/api/v2/admin/sources', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const body = request.body as any
    const { title, url, authorityLevel, sourceType, publisher, publicationDate, notes } = body

    if (!title || !title.trim()) {
      return reply.status(422).send({ error: 'title is required' })
    }

    if (authorityLevel && !VALID_AUTHORITY_LEVELS.includes(authorityLevel)) {
      return reply.status(422).send({ error: `Invalid authorityLevel. Allowed: ${VALID_AUTHORITY_LEVELS.join(', ')}` })
    }

    let normalizedUrl: string | null = null
    if (url) {
      try {
        normalizedUrl = normalizeSourceUrl(url)
      } catch {
        return reply.status(422).send({ error: 'url must be a valid http or https URL' })
      }
      const existing = await prisma.source.findFirst({ where: { url: normalizedUrl } })
      if (existing) {
        return reply.status(409).send({ error: 'Source with this URL already exists', existingSourceId: existing.id })
      }
    }

    const source = await prisma.source.create({
      data: {
        title: title.trim(),
        url: normalizedUrl,
        authorityLevel: authorityLevel || 'medium',
        lastChecked: new Date()
      }
    })

    await createAuditLog({
      action: 'source.created',
      entityType: 'source',
      entityId: source.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { sourceTitle: source.title, sourceId: source.id }
    })

    return {
      id: source.id,
      title: source.title,
      url: source.url,
      authorityLevel: source.authorityLevel,
      lastChecked: source.lastChecked?.toISOString() || null,
      createdAt: source.createdAt.toISOString()
    }
  })

  // GET /api/v2/admin/sources
  fastify.get('/api/v2/admin/sources', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const query = request.query as any
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))
    const skip = (page - 1) * limit
    const search = query.search?.trim() || ''
    const authorityFilter = query.authorityLevel || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (authorityFilter && VALID_AUTHORITY_LEVELS.includes(authorityFilter)) {
      where.authorityLevel = authorityFilter
    }

    const [sources, total] = await Promise.all([
      prisma.source.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.source.count({ where })
    ])

    return {
      sources: sources.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url,
        authorityLevel: s.authorityLevel,
        lastChecked: s.lastChecked?.toISOString() || null,
        createdAt: s.createdAt.toISOString()
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  })

  // GET /api/v2/admin/sources/:id
  fastify.get('/api/v2/admin/sources/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const { id } = request.params as { id: string }
    const source = await prisma.source.findUnique({
      where: { id },
      include: { koSources: { take: 5, orderBy: { createdAt: 'desc' } } }
    })

    if (!source) {
      return reply.status(404).send({ error: 'Source not found' })
    }

    return {
      id: source.id,
      title: source.title,
      url: source.url,
      authorityLevel: source.authorityLevel,
      lastChecked: source.lastChecked?.toISOString() || null,
      createdAt: source.createdAt.toISOString(),
      linkedKOCount: source.koSources.length
    }
  })

  // PATCH /api/v2/admin/sources/:id
  fastify.patch('/api/v2/admin/sources/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    const { id } = request.params as { id: string }
    const body = request.body as any

    const existing = await prisma.source.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ error: 'Source not found' })
    }

    const data: any = {}

    if (body.title !== undefined) {
      if (!body.title.trim()) return reply.status(422).send({ error: 'title cannot be empty' })
      data.title = body.title.trim()
    }
    if (body.url !== undefined) {
      if (body.url) {
        let normalizedUrl: string
        try {
          normalizedUrl = normalizeSourceUrl(body.url)
        } catch {
          return reply.status(422).send({ error: 'url must be a valid http or https URL' })
        }
        const dup = await prisma.source.findFirst({ where: { url: normalizedUrl, NOT: { id } } })
        if (dup) return reply.status(409).send({ error: 'Another source with this URL already exists', existingSourceId: dup.id })
        data.url = normalizedUrl
      } else {
        data.url = null
      }
    }
    if (body.authorityLevel !== undefined) {
      if (!VALID_AUTHORITY_LEVELS.includes(body.authorityLevel)) {
        return reply.status(422).send({ error: `Invalid authorityLevel. Allowed: ${VALID_AUTHORITY_LEVELS.join(', ')}` })
      }
      data.authorityLevel = body.authorityLevel
    }
    if (body.lastChecked !== undefined) {
      data.lastChecked = body.lastChecked ? new Date(body.lastChecked) : null
    }

    const updated = await prisma.source.update({
      where: { id },
      data
    })

    await createAuditLog({
      action: 'source.updated',
      entityType: 'source',
      entityId: updated.id,
      actorId: user.id,
      actorName: user.email,
      metadata: { sourceTitle: updated.title, sourceId: updated.id }
    })

    return {
      id: updated.id,
      title: updated.title,
      url: updated.url,
      authorityLevel: updated.authorityLevel,
      lastChecked: updated.lastChecked?.toISOString() || null,
      createdAt: updated.createdAt.toISOString()
    }
  })
}
