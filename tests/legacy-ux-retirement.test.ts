import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { quizRoutes } from '../src/services/quizzes'
import { flashcardRoutes } from '../src/services/flashcard-routes'

async function buildLegacyGuardApp() {
  const app = Fastify()
  await app.register(jwt, { secret: 'legacy-transition-test-secret-32-bytes' })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const prisma = new Proxy({}, {
    get() { return new Proxy({}, { get() { return vi.fn(() => { throw new Error('database must not be called') }) } }) },
  }) as any
  await app.register(quizRoutes, { prefix: '/quizzes', prisma, legacyEnabled: false })
  await app.register(flashcardRoutes, { prefix: '/flashcards', legacyEnabled: false })
  await app.ready()
  return app
}

describe('Phase 8.0F legacy UX retirement guards', () => {
  afterEach(() => vi.restoreAllMocks())

  it('blocks quiz reads and new attempts with a controlled code before database access', async () => {
    const app = await buildLegacyGuardApp()
    const token = app.jwt.sign({ id: 1, role: 'learner' })
    const read = await app.inject({ method: 'GET', url: '/quizzes/1', headers: { authorization: `Bearer ${token}` } })
    const write = await app.inject({ method: 'POST', url: '/quizzes/1/attempts', headers: { authorization: `Bearer ${token}` }, payload: { answers: [{ question_id: 'q1', answer: 'a' }] } })
    expect(read.statusCode).toBe(410)
    expect(read.json().code).toBe('LEGACY_QUIZ_DISABLED')
    expect(write.statusCode).toBe(410)
    expect(write.json().code).toBe('LEGACY_QUIZ_DISABLED')
    await app.close()
  })

  it('blocks flashcard reads and reviews with a controlled code before mutation', async () => {
    const app = await buildLegacyGuardApp()
    const token = app.jwt.sign({ id: 1, role: 'learner' })
    const read = await app.inject({ method: 'GET', url: '/flashcards/due', headers: { authorization: `Bearer ${token}` } })
    const write = await app.inject({ method: 'POST', url: '/flashcards/card-1/reviews', headers: { authorization: `Bearer ${token}` }, payload: { rating: 'good' } })
    expect(read.statusCode).toBe(410)
    expect(read.json().code).toBe('LEGACY_FLASHCARDS_DISABLED')
    expect(write.statusCode).toBe(410)
    expect(write.json().code).toBe('LEGACY_FLASHCARDS_DISABLED')
    await app.close()
  })
})
