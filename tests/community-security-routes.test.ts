import { afterEach, describe, expect, it, vi } from 'vitest'
import Fastify from 'fastify'
import { prisma } from '../src/lib/prisma'
import { communityRoutes } from '../src/services/community'
import { communitySocialRoutes } from '../src/services/community-social'

vi.mock('../src/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }))
afterEach(() => vi.clearAllMocks())

describe('community security route bindings', () => {
  it.each(['/community/posts', '/community/media', '/social/threads', '/social/threads/example/messages'])(
    'blocks unverified authors at %s before processing the write', async url => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ emailVerifiedAt: null, deletedAt: null } as never)
      const app = Fastify()
      app.decorate('authenticate', async request => {
        request.user = { id: 17, email: 'test@example.invalid', role: 'learner' }
      })
      await app.register(communityRoutes, { prefix: '/community' })
      await app.register(communitySocialRoutes, { prefix: '/social' })
      try {
        const response = await app.inject({ method: 'POST', url, payload: {} })
        expect(response.statusCode).toBe(403)
        expect(response.json().code).toBe('EMAIL_VERIFICATION_REQUIRED')
      } finally { await app.close() }
    }
  )
  it('does not put the verification gate on reporting abuse', async () => {
    const app = Fastify()
    app.decorate('authenticate', async request => {
      request.user = { id: 17, email: 'test@example.invalid', role: 'learner' }
    })
    await app.register(communityRoutes, { prefix: '/community' })
    try {
      const response = await app.inject({ method: 'POST', url: '/community/example/reports', payload: {} })
      expect(response.statusCode).toBe(422)
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    } finally { await app.close() }
  })
})
