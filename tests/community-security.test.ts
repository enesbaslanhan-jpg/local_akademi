import { describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { requireVerifiedCommunityWriter } from '../src/services/community-security'

describe('community verified writer', () => {
  it.each([
    [null, 401],
    [{ emailVerifiedAt: null, deletedAt: null }, 403],
    [{ emailVerifiedAt: new Date(), deletedAt: new Date() }, 401],
    [{ emailVerifiedAt: new Date(), deletedAt: null }, 201]
  ])('checks live DB verification and suspension: %j', async (user, status) => {
    const app = Fastify()
    const db = { user: { findUnique: vi.fn().mockResolvedValue(user) } } as unknown as PrismaClient
    app.post('/write', { preHandler: [
      async request => { request.user = { id: 1, email: 'test@example.invalid', role: 'learner' } },
      requireVerifiedCommunityWriter(db)
    ] }, async (_request, reply) => reply.status(201).send({ ok: true }))
    try {
      const response = await app.inject({ method: 'POST', url: '/write' })
      expect(response.statusCode).toBe(status)
      if (status === 403) expect(response.json().code).toBe('EMAIL_VERIFICATION_REQUIRED')
    } finally { await app.close() }
  })
})
