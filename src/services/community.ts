import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import fastifyMultipart from '@fastify/multipart'
import { createReadStream } from 'fs'
import { mkdir, stat, unlink, writeFile } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import { randomUUID } from 'crypto'
import {
  ALLOWED_MIME_MAP,
  MAX_FILE_SIZE,
  detectFileType,
  inspectZip,
  validateImageFile,
  validatePdfFile,
  FileValidationError,
} from './documentSecurity'
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
  mediaId: z.string().uuid().optional(),
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
  const mediaDirectory = join(process.cwd(), 'uploads', 'community')

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  })
  await mkdir(mediaDirectory, { recursive: true })

  const mediaSelect = {
    id: true,
    originalName: true,
    mimeType: true,
    sizeBytes: true,
    kind: true,
  } as const

  function safeMediaPath(storedName: string) {
    const base = resolve(mediaDirectory)
    const target = resolve(join(mediaDirectory, storedName))
    const pathFromBase = relative(base, target)
    if (!pathFromBase || pathFromBase.startsWith('..') || isAbsolute(pathFromBase)) {
      throw new FileValidationError('Geçersiz dosya yolu', 400)
    }
    return target
  }

  async function ownedMedia(mediaId: string | undefined, userId: number) {
    if (!mediaId) return null
    return prisma.communityMedia.findFirst({
      where: { id: mediaId, uploaderId: userId, postId: null },
      select: { id: true },
    })
  }

  fastify.post('/media', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 12, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    let upload
    try {
      upload = await request.file()
    } catch (error: any) {
      const tooLarge = error?.statusCode === 413 || error?.message?.includes('file size limit')
      return reply.status(tooLarge ? 413 : 400).send({
        error: tooLarge ? 'Dosya en fazla 10 MB olabilir.' : 'Dosya okunamadı.',
      })
    }
    if (!upload) return reply.status(400).send({ error: 'Dosya seçilmedi.' })

    const originalName = upload.filename.slice(0, 255)
    const extension = (originalName.split('.').pop() || '').toLowerCase()
    const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'pdf', 'docx'])
    if (!allowedExtensions.has(extension) || ALLOWED_MIME_MAP[extension] !== upload.mimetype) {
      return reply.status(415).send({ error: 'PNG, JPEG, PDF veya DOCX dosyası yükleyin.' })
    }

    let buffer: Buffer
    try {
      buffer = await upload.toBuffer()
    } catch {
      return reply.status(400).send({ error: 'Dosya okunamadı.' })
    }
    if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
      return reply.status(buffer.length > MAX_FILE_SIZE ? 413 : 422).send({ error: 'Dosya boş veya çok büyük.' })
    }

    try {
      const detected = detectFileType(buffer)
      if (!detected.valid) throw new FileValidationError(detected.error || 'Dosya türü doğrulanamadı', 415)
      if (extension === 'png' && detected.detectedType !== 'png') throw new FileValidationError('Görsel içeriği uzantıyla uyuşmuyor', 415)
      if (['jpg', 'jpeg'].includes(extension) && detected.detectedType !== 'jpeg') throw new FileValidationError('Görsel içeriği uzantıyla uyuşmuyor', 415)
      if (extension === 'pdf') validatePdfFile(buffer)
      if (extension === 'png') validateImageFile(buffer, 'png')
      if (['jpg', 'jpeg'].includes(extension)) validateImageFile(buffer, 'jpeg')
      if (extension === 'docx') {
        const zip = inspectZip(buffer)
        if (!zip.valid || !zip.hasContentTypesXml || !zip.hasWordDocumentXml) {
          throw new FileValidationError(zip.error || 'Geçersiz DOCX dosyası', 422)
        }
      }
    } catch (error) {
      if (error instanceof FileValidationError) return reply.status(error.statusCode).send({ error: error.message })
      throw error
    }

    const id = randomUUID()
    const storedName = `${id}.${extension}`
    const path = safeMediaPath(storedName)
    try {
      await writeFile(path, buffer, { flag: 'wx' })
      const media = await prisma.communityMedia.create({
        data: {
          id,
          uploaderId: request.user.id,
          originalName,
          storedName,
          mimeType: upload.mimetype,
          sizeBytes: buffer.length,
          kind: upload.mimetype.startsWith('image/') ? 'image' : 'file',
        },
        select: mediaSelect,
      })
      return reply.status(201).send({ media: { ...media, url: `/community/media/${media.id}` } })
    } catch (error) {
      await unlink(path).catch(() => {})
      request.log.error({ error }, 'Community media upload failed')
      return reply.status(500).send({ error: 'Dosya kaydedilemedi.' })
    }
  })

  fastify.get('/media/:mediaId', async (request, reply) => {
    const mediaId = String((request.params as { mediaId?: string }).mediaId || '')
    const media = await prisma.communityMedia.findFirst({
      where: { id: mediaId, post: { status: 'published' } },
      select: { storedName: true, mimeType: true, originalName: true },
    })
    if (!media) return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    try {
      const path = safeMediaPath(media.storedName)
      await stat(path)
      reply.header('Content-Type', media.mimeType)
      reply.header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(media.originalName)}`)
      reply.header('Cache-Control', 'public, max-age=86400, immutable')
      return reply.send(createReadStream(path))
    } catch {
      return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    }
  })

  fastify.delete('/media/:mediaId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const mediaId = String((request.params as { mediaId?: string }).mediaId || '')
    const media = await prisma.communityMedia.findFirst({
      where: { id: mediaId, uploaderId: request.user.id, postId: null },
    })
    if (!media) return reply.status(404).send({ error: 'Dosya bulunamadı.' })
    await prisma.communityMedia.delete({ where: { id: media.id } })
    await unlink(safeMediaPath(media.storedName)).catch(() => {})
    return { deleted: true }
  })

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
        media: { select: mediaSelect },
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
    const media = await ownedMedia(parsed.data.mediaId, request.user.id)
    if (parsed.data.mediaId && !media) {
      return reply.status(422).send({ error: 'Yüklenen dosya bulunamadı veya başka bir paylaşıma bağlı.' })
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: request.user.id,
        postType: 'user',
        title: parsed.data.title,
        summary: parsed.data.summary,
        status: 'pending',
        ...(media ? { media: { connect: { id: media.id } } } : {}),
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
    const media = await ownedMedia(parsed.data.mediaId, request.user.id)
    if (parsed.data.mediaId && !media) {
      return reply.status(422).send({ error: 'Yüklenen dosya bulunamadı veya başka bir paylaşıma bağlı.' })
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
        ...(media ? { media: { connect: { id: media.id } } } : {}),
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
        media: { select: mediaSelect },
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
