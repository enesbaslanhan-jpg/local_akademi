import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

// Public browsing and safety actions (report/block/delete) remain available.
// No review-account or admin email-based bypass: verification is a DB fact.
export function requireVerifiedCommunityWriter(db: PrismaClient = prisma) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await db.user.findUnique({
      where: { id: request.user.id },
      select: { emailVerifiedAt: true, deletedAt: true }
    })
    if (!user || user.deletedAt) return reply.status(401).send({ error: 'Unauthorized' })
    if (!user.emailVerifiedAt) {
      return reply.status(403).send({
        error: 'Paylaşım veya mesaj göndermeden önce e-posta adresinizi doğrulayın.',
        code: 'EMAIL_VERIFICATION_REQUIRED'
      })
    }
  }
}
