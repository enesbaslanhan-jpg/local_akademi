import { prisma } from '../lib/prisma.js'
import { FastifyInstance } from 'fastify'
import { recomputeLessonAndEnrollment } from './course-progress'

const VIDEO_PROVIDERS = new Set(['local', 'youtube', 'vimeo'])

function validPlaybackUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  if (value.startsWith('/')) return !value.includes('..')
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export async function videoRoutes(fastify: FastifyInstance) {
  // Admin: list all video packages
  fastify.get('/admin/videos', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; role: string }
    if (!['admin', 'content_editor'].includes(user.role)) {
      return reply.status(403).send({ error: 'Yetkisiz erişim' })
    }
    const videos = await prisma.learningVideo.findMany({
      include: { knowledgeObject: { select: { code: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ videos })
  })

  // Admin: get single video package
  fastify.get('/admin/videos/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; role: string }
    if (!['admin', 'content_editor'].includes(user.role)) {
      return reply.status(403).send({ error: 'Yetkisiz erişim' })
    }
    const { id } = request.params as any
    const video = await prisma.learningVideo.findUnique({
      where: { id },
      include: { knowledgeObject: true, productionJobs: { orderBy: { createdAt: 'desc' } } },
    })
    if (!video) return reply.status(404).send({ error: 'Video paketi bulunamadı' })
    return reply.send({ video })
  })

  // Admin: create/update video package by KO
  fastify.put('/admin/videos/ko/:koId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; role: string }
    if (!['admin', 'content_editor'].includes(user.role)) {
      return reply.status(403).send({ error: 'Yetkisiz erişim' })
    }
    const koId = Number.parseInt((request.params as any).koId, 10)
    const body = request.body as any

    const ko = await prisma.knowledgeObject.findUnique({ where: { id: koId } })
    if (!ko) return reply.status(404).send({ error: 'KO bulunamadı' })
    const existing = await prisma.learningVideo.findUnique({ where: { koId } })
    const provider = body.provider ?? existing?.provider ?? null
    const playbackUrl = body.playbackUrl ?? existing?.playbackUrl ?? null
    const requestedStatus = body.status || existing?.status || 'script_ready'
    const transcript = body.transcript ?? existing?.transcript ?? null
    const webvttContent = body.webvttContent ?? existing?.webvttContent ?? null
    const thumbnailSpec = body.thumbnailSpec ?? existing?.thumbnailSpec ?? null
    if (provider && !VIDEO_PROVIDERS.has(provider)) {
      return reply.status(422).send({ error: 'provider local|youtube|vimeo olmalı' })
    }
    if (playbackUrl && !validPlaybackUrl(playbackUrl)) {
      return reply.status(422).send({ error: 'Geçersiz playback URL' })
    }
    if (requestedStatus === 'published' && (!playbackUrl || !provider || !transcript || !webvttContent || !thumbnailSpec)) {
      return reply.status(422).send({ error: 'Yayın için provider, playbackUrl, transcript, WebVTT ve kapak zorunludur' })
    }

    const video = await prisma.learningVideo.upsert({
      where: { koId },
      update: {
        title: body.title,
        description: body.description,
        durationTarget: body.durationTarget,
        script: body.script,
        storyboard: body.storyboard,
        transcript,
        webvttContent,
        thumbnailSpec,
        outputKey: body.outputKey,
        voiceGuidance: body.voiceGuidance,
        playbackUrl,
        provider,
        status: requestedStatus,
        checksum: body.checksum,
        publishedAt: requestedStatus === 'published' && playbackUrl ? (existing?.publishedAt || new Date()) : null,
      },
      create: {
        koId,
        title: body.title || ko.title,
        description: body.description,
        durationTarget: body.durationTarget || 300,
        script: body.script,
        storyboard: body.storyboard,
        transcript: body.transcript,
        webvttContent: body.webvttContent,
        thumbnailSpec: body.thumbnailSpec,
        outputKey: body.outputKey,
        voiceGuidance: body.voiceGuidance,
        playbackUrl,
        provider,
        status: requestedStatus,
        checksum: body.checksum,
        publishedAt: requestedStatus === 'published' && playbackUrl ? new Date() : null,
      },
    })

    return reply.send({ video })
  })

  // Admin: publish video (mark as ready with playbackUrl)
  fastify.post('/admin/videos/:id/publish', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; role: string }
    if (!['admin', 'content_editor'].includes(user.role)) {
      return reply.status(403).send({ error: 'Yetkisiz erişim' })
    }
    const { id } = request.params as any
    const body = request.body as any

    const existing = await prisma.learningVideo.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Video paketi bulunamadı' })
    const playbackUrl = body.playbackUrl || existing.playbackUrl
    const provider = body.provider || existing.provider
    if (!provider || !VIDEO_PROVIDERS.has(provider) || !validPlaybackUrl(playbackUrl) || !existing.transcript || !existing.webvttContent || !existing.thumbnailSpec) {
      return reply.status(422).send({ error: 'Yayın için provider, geçerli playback URL, transcript, WebVTT ve kapak zorunludur' })
    }

    const video = await prisma.learningVideo.update({
      where: { id },
      data: {
        playbackUrl,
        provider,
        status: 'published',
        publishedAt: new Date(),
      },
    })

    return reply.send({ video })
  })

  // Learner: get video for KO (only if published and has playbackUrl)
  fastify.get('/ko/:koId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const koId = Number.parseInt((request.params as any).koId, 10)
    const user = request.user as { id: number }

    const video = await prisma.learningVideo.findUnique({
      where: { koId },
      include: { knowledgeObject: { select: { status: true, isDemo: true } } },
    })

    if (!video || video.status !== 'published' || !video.playbackUrl ||
      video.knowledgeObject.status !== 'published' || video.knowledgeObject.isDemo) {
      return reply.send({ video: null, available: false })
    }

    const progress = await prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: user.id, videoId: video.id } },
    })

    return reply.send({
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        durationTarget: video.durationTarget,
        playbackUrl: video.playbackUrl,
        transcript: video.transcript,
        webvttContent: video.webvttContent,
        provider: video.provider,
      },
      available: true,
      progress: progress ? {
        percent: progress.progressPercent,
        completed: progress.completed,
        watchedSeconds: progress.watchedSeconds,
        furthestSecond: progress.furthestSecond,
        lastPositionSeconds: progress.lastPositionSeconds,
      } : null,
    })
  })

  // Learner: update video watch progress
  fastify.post('/progress/:videoId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { videoId } = request.params as any
    const { currentSecond, watchedDelta } = request.body as any

    const video = await prisma.learningVideo.findUnique({
      where: { id: videoId },
      include: { knowledgeObject: { select: { status: true, isDemo: true } } },
    })
    if (!video || video.status !== 'published' || !video.playbackUrl ||
      video.knowledgeObject.status !== 'published' || video.knowledgeObject.isDemo) {
      return reply.status(404).send({ error: 'Video bulunamadı' })
    }
    if (!Number.isFinite(currentSecond) || currentSecond < 0 || currentSecond > video.durationTarget + 30) {
      return reply.status(422).send({ error: 'Geçersiz video konumu' })
    }
    if (!Number.isFinite(watchedDelta) || watchedDelta <= 0 || watchedDelta > 15) {
      return reply.status(422).send({ error: 'watchedDelta 0–15 saniye arasında olmalı' })
    }

    const existingProgress = await prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: user.id, videoId } },
    })
    const watchedSeconds = Math.min(video.durationTarget, (existingProgress?.watchedSeconds || 0) + Math.round(watchedDelta))
    const furthestSecond = Math.max(existingProgress?.furthestSecond || 0, Math.round(currentSecond))
    const lastPositionSeconds = Math.round(currentSecond)
    const progressPercent = Math.min(100, Math.round((watchedSeconds / Math.max(1, video.durationTarget)) * 100))
    const completed = progressPercent >= 90

    const progress = await prisma.videoProgress.upsert({
      where: { userId_videoId: { userId: user.id, videoId } },
      update: {
        progressPercent,
        watchedSeconds,
        furthestSecond,
        lastPositionSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: user.id,
        videoId,
        progressPercent,
        watchedSeconds,
        furthestSecond,
        lastPositionSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
    })

    const lessons = await prisma.lesson.findMany({ where: { knowledgeObjectId: video.koId }, select: { id: true } })
    for (const lesson of lessons) {
      await recomputeLessonAndEnrollment(prisma, user.id, lesson.id, { videoPercent: completed ? 100 : progressPercent })
    }

    return reply.send({ progress })
  })

  // Admin: list video production jobs
  fastify.get('/admin/jobs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; role: string }
    if (!['admin', 'content_editor'].includes(user.role)) {
      return reply.status(403).send({ error: 'Yetkisiz erişim' })
    }
    const jobs = await prisma.videoProductionJob.findMany({
      include: { video: { include: { knowledgeObject: { select: { code: true, title: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send({ jobs })
  })
}
