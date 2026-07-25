import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import {
  generateOfficialSummary,
  officialSummaryRequestSchema,
} from './official-update-summarizer'
import {
  localAiGenerationQueue,
  LocalAiQueueFullError,
} from './local-ai-job-queue'

export const communityPostSchema = z.object({
  title: z.string().trim().min(5).max(180),
  summary: z.string().trim().min(20).max(1200),
})

export const officialPostSchema = communityPostSchema.extend({
  sourceUrl: z.string().url().max(1000),
  sourceTitle: z.string().trim().min(2).max(200),
  sourcePublishedAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  let protocol = ''
  try {
    protocol = new URL(value.sourceUrl).protocol
  } catch {
    return
  }
  if (protocol !== 'https:' && protocol !== 'http:') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceUrl'],
      message: 'Yalnız HTTP(S) kaynak bağlantıları kabul edilir',
    })
  }
})

const moderationSchema = z.object({
  action: z.enum(['publish', 'reject']),
  reason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.action === 'reject' && !value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'Ret nedeni zorunludur',
    })
  }
})

const reportSchema = z.object({
  reason: z.enum([
    'spam',
    'misinformation',
    'harassment',
    'unsafe',
    'copyright',
    'other',
  ]),
  details: z.string().trim().min(5).max(500).optional(),
}).superRefine((value, context) => {
  if (value.reason === 'other' && !value.details) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['details'],
      message: 'Diğer nedeni için açıklama zorunludur',
    })
  }
})

const reportResolutionSchema = z.object({
  action: z.enum(['dismiss', 'hide_post']),
  note: z.string().trim().max(500).optional(),
})

export async function communityRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient },
) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async request => {
    const query = request.query as {
      type?: string
      cursor?: string
    }
    const type =
      query.type === 'official' || query.type === 'user'
        ? query.type
        : undefined
    const cursorId = query.cursor?.slice(0, 100)
    const posts = await prisma.communityPost.findMany({
      where: {
        status: 'published',
        ...(type ? { postType: type } : {}),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { id: 'desc' },
      ],
      take: 21,
      ...(cursorId
        ? { cursor: { id: cursorId }, skip: 1 }
        : {}),
    })
    const hasMore = posts.length > 20
    const visible = posts.slice(0, 20)
    return {
      posts: visible,
      nextCursor: hasMore
        ? visible.at(-1)?.id || null
        : null,
    }
  })

  fastify.post('/posts', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 5, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    const parsed = communityPostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: request.user.id,
        postType: 'user',
        title: parsed.data.title,
        summary: parsed.data.summary,
        status: 'pending',
      },
    })
    return reply.status(201).send({
      post: {
        id: post.id,
        title: post.title,
        summary: post.summary,
        status: post.status,
        createdAt: post.createdAt,
      },
      message: 'Paylaşım moderasyon kuyruğuna alındı.',
    })
  })

  fastify.post('/:postId/reports', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 10, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const postId = String(
      (request.params as { postId?: string }).postId || '',
    )
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, status: 'published' },
      select: { id: true },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    const existing = await prisma.communityReport.findUnique({
      where: {
        postId_reporterId: {
          postId,
          reporterId: request.user.id,
        },
      },
      select: { id: true },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Post already reported',
        code: 'COMMUNITY_REPORT_DUPLICATE',
      })
    }
    const report = await prisma.communityReport.create({
      data: {
        postId,
        reporterId: request.user.id,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
      select: { id: true, status: true, createdAt: true },
    })
    return reply.status(201).send({ report })
  })

  fastify.post('/official', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 20, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const parsed = officialPostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: request.user.id,
        postType: 'official',
        title: parsed.data.title,
        summary: parsed.data.summary,
        sourceUrl: parsed.data.sourceUrl,
        sourceTitle: parsed.data.sourceTitle,
        sourcePublishedAt: parsed.data.sourcePublishedAt
          ? new Date(parsed.data.sourcePublishedAt)
          : null,
        status: 'draft',
      },
    })
    return reply.status(201).send({
      post,
      requiresModeration: true,
    })
  })

  fastify.post('/official/ai-draft', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 10, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    if (process.env.AI_OFFICIAL_SUMMARIZER_ENABLED !== 'true') {
      return reply.status(503).send({
        error: 'Official summarizer is disabled',
        code: 'AI_OFFICIAL_SUMMARIZER_DISABLED',
      })
    }
    const parsed = officialSummaryRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    try {
      const generated = await localAiGenerationQueue.run(
        'official_summary',
        () => generateOfficialSummary(parsed.data),
      )
      const post = await prisma.communityPost.create({
        data: {
          authorId: request.user.id,
          postType: 'official',
          title: generated.title,
          summary: generated.summary,
          sourceUrl: parsed.data.sourceUrl,
          sourceTitle: parsed.data.sourceTitle,
          sourcePublishedAt: parsed.data.sourcePublishedAt
            ? new Date(parsed.data.sourcePublishedAt)
            : null,
          status: 'draft',
        },
      })
      return reply.status(201).send({
        post,
        sourceTextStored: false,
        requiresModeration: true,
      })
    } catch (error) {
      if (error instanceof LocalAiQueueFullError) {
        return reply.status(429).send({
          error: 'Local AI queue is full',
          code: 'LOCAL_AI_QUEUE_FULL',
        })
      }
      request.log.error(
        { errorCode: 'AI_OFFICIAL_SUMMARY_FAILED' },
        'Official update summary failed',
      )
      return reply.status(502).send({
        error: 'Official update summary could not be generated',
        code: 'AI_OFFICIAL_SUMMARY_FAILED',
      })
    }
  })

  fastify.get('/moderation', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const posts = await prisma.communityPost.findMany({
      where: { status: { in: ['draft', 'pending'] } },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return { posts }
  })

  fastify.get('/reports', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const reports = await prisma.communityReport.findMany({
      where: { status: 'open' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            summary: true,
            postType: true,
            status: true,
          },
        },
        reporter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return { reports }
  })

  fastify.post('/reports/:reportId/resolve', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 60, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const parsed = reportResolutionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const reportId = String(
      (request.params as { reportId?: string }).reportId || '',
    )
    const existing = await prisma.communityReport.findFirst({
      where: { id: reportId, status: 'open' },
      select: { id: true, postId: true },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Report not found' })
    }
    const result = await prisma.$transaction(async tx => {
      if (parsed.data.action === 'hide_post') {
        await tx.communityPost.update({
          where: { id: existing.postId },
          data: {
            status: 'rejected',
            moderationReason:
              parsed.data.note || 'Kullanıcı raporu sonrası gizlendi',
            moderatedById: request.user.id,
            moderatedAt: new Date(),
            publishedAt: null,
          },
        })
      }
      return tx.communityReport.update({
        where: { id: existing.id },
        data: {
          status: 'resolved',
          resolution: parsed.data.action,
          resolvedById: request.user.id,
          resolvedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          resolution: true,
          resolvedAt: true,
        },
      })
    })
    return { report: result }
  })

  fastify.post('/:postId/moderate', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: { max: 60, timeWindow: '1 hour' },
    },
  }, async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      })
    }
    const parsed = moderationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.errors,
      })
    }
    const postId = String(
      (request.params as { postId?: string }).postId || '',
    )
    const existing = await prisma.communityPost.findFirst({
      where: {
        id: postId,
        status: { in: ['draft', 'pending'] },
      },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Post not found' })
    }
    const post = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        status:
          parsed.data.action === 'publish'
            ? 'published'
            : 'rejected',
        moderationReason: parsed.data.reason || null,
        moderatedById: request.user.id,
        moderatedAt: new Date(),
        publishedAt:
          parsed.data.action === 'publish'
            ? new Date()
            : null,
      },
    })
    return { post }
  })
}
