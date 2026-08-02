import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { LearningProgressService, UpdateProgressSchema } from '../services/learning-progress'

const featureFlag = process.env.FEATURE_LEARNING_PROGRESS_ENABLED === 'true'

export async function learningProgressRoutes(server: FastifyInstance) {
  const lpService = new LearningProgressService(prisma as any)

  server.addHook('preHandler', async (request, reply) => {
    if (!featureFlag) {
      reply.status(404).send({ error: 'FEATURE_DISABLED', message: 'Learning Progress feature is not enabled.' })
    }
  })

  // 1. GET /api/v1/users/me/learning-progress
  server.get('/', { preValidation: [server.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id
    const query = request.query as { contentType?: string, status?: string, limit?: string }
    const limit = query.limit ? parseInt(query.limit, 10) : 50

    const records = await lpService.listProgress(userId, {
      contentType: query.contentType,
      status: query.status,
      limit
    })

    return reply.send({ items: records, pagination: { limit, total: records.length } })
  })

  // 2. PATCH /api/v1/learning-progress/:contentType/:contentId
  server.patch('/:contentType/:contentId', { preValidation: [server.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id
    const { contentType, contentId } = request.params as { contentType: string, contentId: string }
    
    try {
      const result = await lpService.updateProgress(userId, contentType, contentId, request.body as any, 'api')
      return reply.send(result)
    } catch (e: any) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', message: e.message || 'Validation failed' })
    }
  })

  // 3. GET /api/v1/users/me/recent-content
  server.get('/recent', { preValidation: [server.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id
    const query = request.query as { limit?: string }
    const limit = query.limit ? parseInt(query.limit, 10) : 10

    const records = await lpService.getRecentContent(userId, limit)
    return reply.send({ items: records })
  })

  // 4. GET /api/v1/users/me/continue-learning
  server.get('/continue', { preValidation: [server.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id
    const query = request.query as { limit?: string }
    const limit = query.limit ? parseInt(query.limit, 10) : 10

    const records = await lpService.getContinueLearning(userId, limit)
    return reply.send({ items: records })
  })
}
