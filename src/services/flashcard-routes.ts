import { type FastifyInstance } from 'fastify'
import { getFlashcardsByKoId, submitReview, getDueFlashcards } from './flashcards'
import { isLegacyFlashcardsEnabled, LEGACY_FLASHCARDS_DISABLED } from '../config/feature-flags'

export async function flashcardRoutes(fastify: FastifyInstance, opts?: { legacyEnabled?: boolean }) {
  const legacyEnabled = () => opts?.legacyEnabled ?? isLegacyFlashcardsEnabled()

  fastify.get('/knowledge/:koId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!legacyEnabled()) return reply.status(410).send(LEGACY_FLASHCARDS_DISABLED)
    const user = request.user as { id: number }
    const koId = Number.parseInt((request.params as any).koId, 10)
    if (!Number.isInteger(koId) || koId < 1) {
      return reply.status(400).send({ error: 'Geçersiz KO ID' })
    }
    const result = await getFlashcardsByKoId(koId, user.id)
    if (!result) {
      return reply.status(404).send({ error: 'KO bulunamadı veya yayında değil' })
    }
    return reply.send(result)
  })

  fastify.post('/:flashcardId/reviews', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!legacyEnabled()) return reply.status(410).send(LEGACY_FLASHCARDS_DISABLED)
    const user = request.user as { id: number }
    const { flashcardId } = request.params as any
    const { rating } = request.body as any

    if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
      return reply.status(422).send({ error: 'Geçersiz rating. again|hard|good|easy kullanın' })
    }

    const result = await submitReview(flashcardId, user.id, rating)
    if ('error' in result) {
      return reply.status((result as any).status).send({ error: (result as any).error })
    }
    return reply.send(result)
  })

  fastify.get('/due', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    if (!legacyEnabled()) return reply.status(410).send(LEGACY_FLASHCARDS_DISABLED)
    const user = request.user as { id: number }
    const query = request.query as any
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100)

    const result = await getDueFlashcards(user.id, limit)
    return reply.send({ dueCount: result.length, groups: result })
  })
}
