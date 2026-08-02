import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import {
  practicalCardFeedbackSchema,
  getPracticalCardsQuerySchema
} from '../schemas/practical-cards'
import { z } from 'zod'
import { LearningProgressService } from './learning-progress'

const featureFlag = process.env.FEATURE_PRACTICAL_CARDS_ENABLED === 'true'
const lpService = new LearningProgressService(prisma)

export async function practicalCardRoutes(server: FastifyInstance) {
  // Pre-handler for Feature Flag
  server.addHook('onRequest', async (request, reply) => {
    if (!featureFlag) {
      return reply.code(404).send({ error: 'Not Found' })
    }
  })

  // 1. List Published Cards
  server.get('/', async (request, reply) => {
    const query = getPracticalCardsQuerySchema.parse(request.query)
    const { type, category } = query

    const whereClause: any = { published: true }
    if (type) whereClause.type = type
    if (category) whereClause.category = category

    const cards = await prisma.practicalCard.findMany({
      where: whereClause,
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        shortDescription: true,
        category: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return { data: cards }
  })

  // 1.5. Get Saved Cards
  server.get('/saved', { onRequest: [server.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const saved = await prisma.practicalCardSave.findMany({
      where: { userId },
      include: {
        practicalCard: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            shortDescription: true,
            category: true,
            published: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const cards = saved
      .filter(s => s.practicalCard.published)
      .map(s => s.practicalCard);

    return { data: cards };
  })

  // 2. Get Detail By Code
  server.get('/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const card = await prisma.practicalCard.findUnique({
      where: { code },
      include: {
        versions: {
          where: { status: 'published' },
          orderBy: { version: 'desc' },
          take: 1
        },
        knowledgeObjects: {
          orderBy: { order: 'asc' },
          include: { knowledgeObject: true }
        }
      }
    })

    if (!card || !card.published) {
      return reply.code(404).send({ error: 'Card not found or not published' })
    }

    const version = card.versions[0]
    if (!version) {
      return reply.code(404).send({ error: 'No published version found for card' })
    }

    // Format knowledge objects
    const sources = card.knowledgeObjects.map(ko => ({
      id: ko.knowledgeObject.id,
      title: ko.knowledgeObject.title,
      code: ko.knowledgeObject.code
    }))

    const response = {
      data: {
        id: card.id,
        code: card.code,
        title: card.title,
        type: card.type,
        shortDescription: card.shortDescription,
        category: card.category,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        content: version.contentJson,
        sources
      }
    }
    
    // Async hook for learning progress
    if (request.user?.id) {
      lpService.updateProgress(request.user.id, 'practical_card', card.id, {
        status: 'started',
        contentCode: card.code
      }).catch(console.error)
    }

    return response
  })

  // 3. Save a Card
  server.post('/:id/save', { onRequest: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.id

    const card = await prisma.practicalCard.findUnique({ where: { id } })
    if (!card || !card.published) {
      return reply.code(404).send({ error: 'Card not found' })
    }

    const existing = await prisma.practicalCardSave.findUnique({
      where: { userId_practicalCardId: { userId, practicalCardId: id } }
    })

    if (!existing) {
      await prisma.practicalCardSave.create({
        data: { userId, practicalCardId: id }
      })
    }

    return { success: true, saved: true }
  })

  // 4. Unsave a Card
  server.delete('/:id/save', { onRequest: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.id

    const existing = await prisma.practicalCardSave.findUnique({
      where: { userId_practicalCardId: { userId, practicalCardId: id } }
    })

    if (existing) {
      await prisma.practicalCardSave.delete({
        where: { userId_practicalCardId: { userId, practicalCardId: id } }
      })
    }

    return { success: true, saved: false }
  })

  // 5. Submit Feedback
  server.post('/:id/feedback', { onRequest: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.id
    const body = practicalCardFeedbackSchema.parse(request.body)

    const card = await prisma.practicalCard.findUnique({ where: { id } })
    if (!card || !card.published) {
      return reply.code(404).send({ error: 'Card not found' })
    }

    await prisma.practicalCardFeedback.upsert({
      where: { userId_practicalCardId: { userId, practicalCardId: id } },
      create: { userId, practicalCardId: id, value: body.value },
      update: { value: body.value }
    })

    return { success: true, feedback: body.value }
  })
}
