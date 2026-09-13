import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { communityRoutes } from '../src/services/community'

const ffmpegDescribe = process.env.FFMPEG_E2E === '1' ? describe : describe.skip

ffmpegDescribe('topluluk videosu HTTP -> ffmpeg -> sunum', () => {
  const prisma = new PrismaClient()
  const marker = `video-e2e-${Date.now()}`
  let app: FastifyInstance
  let userId = 0
  let token = ''
  let mediaId = ''
  let postId = ''

  beforeAll(async () => {
    if (process.env.FFMPEG_E2E !== '1') return
    app = Fastify()
    await app.register(jwt, { secret: 'video-e2e-secret-minimum-32-bytes' })
    app.decorate('authenticate', async (request: any, reply: any) => {
      try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
    })
    await app.register(communityRoutes, { prefix: '/community', prisma })
    await app.ready()
    const user = await prisma.user.create({
      data: { email: `${marker}@test.local`, password: 'test', name: 'Video E2E', role: 'learner' },
    })
    userId = user.id
    token = app.jwt.sign({ id: user.id, email: user.email, role: user.role })
  })

  afterAll(async () => {
    if (process.env.FFMPEG_E2E !== '1') return
    const media = mediaId ? await prisma.communityMedia.findUnique({ where: { id: mediaId } }) : null
    if (postId) await prisma.communityPost.deleteMany({ where: { id: postId } })
    if (mediaId) await prisma.communityMedia.deleteMany({ where: { id: mediaId } })
    if (userId) await prisma.user.deleteMany({ where: { id: userId } })
    if (media) {
      const base = join(process.cwd(), 'uploads', 'community')
      await unlink(join(base, media.storedName)).catch(() => {})
      if (media.posterStoredName) await unlink(join(base, media.posterStoredName)).catch(() => {})
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('isleniyor durumundan hazir video ve kapak adresine gecer', async () => {
    const fixture = await readFile(join(process.cwd(), 'tests', 'community-video-fixture.mp4'))
    const boundary = '----localkararVideoE2E'
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="kisa.mp4"\r\nContent-Type: video/mp4\r\n\r\n`),
      fixture,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const upload = await app.inject({
      method: 'POST',
      url: '/community/media',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    })
    expect(upload.statusCode).toBe(201)
    const uploaded = JSON.parse(upload.body).media
    mediaId = uploaded.id
    expect(uploaded.status).toBe('processing')
    expect(uploaded.url).toBeNull()

    const post = await app.inject({
      method: 'POST',
      url: '/community/posts',
      headers: { authorization: `Bearer ${token}` },
      payload: { metin: marker, mediaId },
    })
    expect(post.statusCode).toBe(201)
    postId = JSON.parse(post.body).post.id

    await vi.waitFor(async () => {
      const current = await prisma.communityMedia.findUnique({ where: { id: mediaId } })
      expect(current?.status).toBe('ready')
    }, { timeout: 60_000, interval: 150 })

    const feed = await app.inject({
      method: 'GET', url: '/community?type=user', headers: { authorization: `Bearer ${token}` },
    })
    const media = JSON.parse(feed.body).posts.find((item: any) => item.id === postId)?.media
    expect(media.url).toMatch(new RegExp(`^/community/media/${mediaId}\\?`))
    expect(media.posterUrl).toMatch(new RegExp(`^/community/media/${mediaId}/poster\\?`))

    const video = await app.inject({ method: 'GET', url: media.url, headers: { range: 'bytes=0-31' } })
    expect(video.statusCode).toBe(206)
    expect(video.headers['content-type']).toContain('video/mp4')
    const poster = await app.inject({ method: 'GET', url: media.posterUrl })
    expect(poster.statusCode).toBe(200)
    expect(poster.headers['content-type']).toContain('image/jpeg')
  }, 70_000)
})
