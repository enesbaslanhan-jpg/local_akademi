import { FastifyInstance } from 'fastify'
import { PersonalizedFeedService } from '../services/personalized-feed.js'

export async function feedRoutes(fastify: FastifyInstance) {
  // Check backend feature flag
  const isFeedEnabled = process.env.FEATURE_PERSONALIZED_FEED_ENABLED === 'true';

  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (!isFeedEnabled) {
      return reply.status(403).send({ error: 'Personalized feed is currently disabled' })
    }

    const userId = request.user.id
    const items = await PersonalizedFeedService.getFeed(userId, 10)

    return {
      items,
      generatedAt: new Date().toISOString(),
      version: '1.0'
    }
  })

  fastify.post('/items/view', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (!isFeedEnabled) {
      return reply.status(403).send({ error: 'Personalized feed is currently disabled' })
    }

    const { itemKey } = request.body as { itemKey: string }
    if (!itemKey) return reply.status(400).send({ error: 'itemKey is required' })

    const userId = request.user.id
    await PersonalizedFeedService.recordInteraction(userId, itemKey, 'view')

    return { success: true }
  })

  fastify.post('/items/dismiss', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (!isFeedEnabled) {
      return reply.status(403).send({ error: 'Personalized feed is currently disabled' })
    }

    const { itemKey } = request.body as { itemKey: string }
    if (!itemKey) return reply.status(400).send({ error: 'itemKey is required' })

    const userId = request.user.id
    await PersonalizedFeedService.recordInteraction(userId, itemKey, 'dismiss')

    return { success: true }
  })
}
