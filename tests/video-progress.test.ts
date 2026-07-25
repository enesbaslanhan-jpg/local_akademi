import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { videoRoutes } from '../src/services/videos'

const prisma = new PrismaClient()
let app: FastifyInstance
let learnerId: number
let adminId: number
let publishedKoId: number
let draftKoId: number
let videoId: string
let learnerToken: string
let adminToken: string
const unique = Date.now()

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

describe('Video learning security and progress', () => {
  beforeAll(async () => {
    app = Fastify({ logger: false })
    await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
    app.decorate('authenticate', async function (request: any, reply: any) {
      try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
    })
    await app.register(videoRoutes, { prefix: '/videos' })
    await app.ready()

    const learner = await prisma.user.create({
      data: { email: `video-learner-${unique}@test.local`, password: 'hash', name: 'Video Learner', role: 'learner' },
    })
    const admin = await prisma.user.create({
      data: { email: `video-admin-${unique}@test.local`, password: 'hash', name: 'Video Admin', role: 'admin' },
    })
    learnerId = learner.id
    adminId = admin.id
    learnerToken = app.jwt.sign({ id: learner.id, role: learner.role })
    adminToken = app.jwt.sign({ id: admin.id, role: admin.role })

    const publishedKo = await prisma.knowledgeObject.create({
      data: {
        code: `VIDEO-PUB-${unique}`, type: 'concept', title: 'Published video KO',
        content: 'content', embedding: '[]', metadata: '{}', status: 'published', isDemo: false,
      },
    })
    const draftKo = await prisma.knowledgeObject.create({
      data: {
        code: `VIDEO-DRAFT-${unique}`, type: 'concept', title: 'Draft video KO',
        content: 'content', embedding: '[]', metadata: '{}', status: 'draft', isDemo: false,
      },
    })
    publishedKoId = publishedKo.id
    draftKoId = draftKo.id

    const video = await prisma.learningVideo.create({
      data: {
        koId: publishedKo.id,
        title: 'Published video',
        durationTarget: 100,
        provider: 'local',
        playbackUrl: '/media/video.mp4',
        transcript: 'Transcript',
        webvttContent: 'WEBVTT',
        thumbnailSpec: 'Thumbnail',
        status: 'published',
        publishedAt: new Date(),
      },
    })
    videoId = video.id
    await prisma.learningVideo.create({
      data: { koId: draftKo.id, title: 'Draft package', status: 'script_ready', transcript: 'Hidden draft' },
    })
  })

  it('returns only playable, published video data to a learner', async () => {
    const response = await app.inject({ method: 'GET', url: `/videos/ko/${publishedKoId}`, headers: auth(learnerToken) })
    expect(response.statusCode).toBe(200)
    expect(response.json().available).toBe(true)
    expect(response.json().video.playbackUrl).toBe('/media/video.mp4')
  })

  it('does not leak a draft package or transcript', async () => {
    const response = await app.inject({ method: 'GET', url: `/videos/ko/${draftKoId}`, headers: auth(learnerToken) })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ video: null, available: false })
  })

  it('rejects client-authored percentage completion', async () => {
    const response = await app.inject({
      method: 'POST', url: `/videos/progress/${videoId}`, headers: auth(learnerToken),
      payload: { progressPercent: 100 },
    })
    expect(response.statusCode).toBe(422)
  })

  it('calculates progress from watched seconds on the server', async () => {
    const response = await app.inject({
      method: 'POST', url: `/videos/progress/${videoId}`, headers: auth(learnerToken),
      payload: { currentSecond: 5, watchedDelta: 5 },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().progress.watchedSeconds).toBe(5)
    expect(response.json().progress.progressPercent).toBe(5)
    expect(response.json().progress.completed).toBe(false)
  })

  it('refuses publishing without complete playable media metadata', async () => {
    const draft = await prisma.learningVideo.findUniqueOrThrow({ where: { koId: draftKoId } })
    const response = await app.inject({
      method: 'POST', url: `/videos/admin/videos/${draft.id}/publish`, headers: auth(adminToken),
      payload: { provider: 'local' },
    })
    expect(response.statusCode).toBe(422)
  })

  afterAll(async () => {
    await prisma.videoProgress.deleteMany({ where: { userId: learnerId } }).catch(() => {})
    await prisma.knowledgeObject.deleteMany({ where: { id: { in: [publishedKoId, draftKoId] } } }).catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: [learnerId, adminId] } } }).catch(() => {})
    await prisma.$disconnect()
    await app.close()
  })
})
