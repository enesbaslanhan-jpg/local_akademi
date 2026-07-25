import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function knowledgeRoutes(fastify: FastifyInstance) {
  // @deprecated — use /api/v2/knowledge-objects instead
  fastify.get('/search', async (request, reply) => {
    const { q, type, limit } = request.query as {
      q?: string
      type?: string
      limit?: string
    }

    const where: any = { status: 'published', isDemo: false }
    if (type) where.type = type
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } }
      ]
    }

    const knowledgeObjects = await prisma.knowledgeObject.findMany({
      where,
      take: limit ? parseInt(limit) : 10,
      orderBy: { createdAt: 'desc' }
    })

    return { results: knowledgeObjects, total: knowledgeObjects.length, query: q }
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const knowledgeObject = await prisma.knowledgeObject.findFirst({
      where: { id: parseInt(id), status: 'published', isDemo: false }
    })
    if (!knowledgeObject) {
      return reply.status(404).send({ error: 'Knowledge object not found' })
    }
    return { knowledgeObject }
  })

  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { type, title, content, metadata } = request.body as {
      type: string
      title: string
      content: string
      metadata?: string
    }
    const knowledgeObject = await prisma.knowledgeObject.create({
      data: {
        type,
        title,
        content,
        embedding: '[]',
        metadata: metadata || '{}'
      }
    })
    return reply.status(201).send({ knowledgeObject })
  })

  fastify.get('/related/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const knowledgeObject = await prisma.knowledgeObject.findFirst({
      where: { id: parseInt(id), status: 'published', isDemo: false }
    })
    if (!knowledgeObject) {
      return reply.status(404).send({ error: 'Knowledge object not found' })
    }

    const related = await prisma.knowledgeObject.findMany({
      where: {
        id: { not: parseInt(id) },
        type: knowledgeObject.type,
        status: 'published',
        isDemo: false
      },
      take: 5
    })

    return { related }
  })
}