import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import {
  communityRoutes,
  officialPostSchema,
} from '../src/services/community'

const prisma = new PrismaClient()
let app: FastifyInstance
let learnerToken: string
let adminToken: string
let learnerId: number
let adminId: number
let publishedPostId: string
const marker = `community-${Date.now()}`

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, {
    secret: 'community-test-secret-key-min-32-bytes',
  })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })
  await app.register(communityRoutes, {
    prefix: '/community',
    prisma,
  })
  await app.ready()

  const learner = await prisma.user.create({
    data: {
      email: `${marker}-learner@test.local`,
      password: 'test',
      name: 'Learner',
      role: 'learner',
    },
  })
  const admin = await prisma.user.create({
    data: {
      email: `${marker}-admin@test.local`,
      password: 'test',
      name: 'Admin',
      role: 'admin',
    },
  })
  learnerId = learner.id
  adminId = admin.id
  learnerToken = app.jwt.sign({
    id: learner.id,
    email: learner.email,
    role: learner.role,
  })
  adminToken = app.jwt.sign({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  })
})

afterAll(async () => {
  const media = await prisma.communityMedia.findMany({
    where: { uploaderId: { in: [learnerId, adminId] } },
    select: { storedName: true },
  })
  await prisma.communityPost.deleteMany({
    where: {
      OR: [
        { authorId: learnerId },
        { authorId: adminId },
      ],
    },
  })
  for (const item of media) {
    await unlink(join(process.cwd(), 'uploads', 'community', item.storedName)).catch(() => {})
  }
  await prisma.user.deleteMany({
    where: { id: { in: [learnerId, adminId] } },
  })
  await app.close()
  await prisma.$disconnect()
})

describe('community moderation flow', () => {
  it('requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/community',
    })
    expect(response.statusCode).toBe(401)
  })

  /*
   * BU TEST 22.08.2026'DA TERSİNE ÇEVRİLDİ.
   *
   * Eskiden kullanıcı paylaşımı `pending` doğuyor, akışta görünmüyordu.
   * Ürün kararı değişti: paylaşım X'teki gibi anında yayımlanıyor,
   * denetim sonradan — kaldırma yoluyla — yapılıyor. Yani buradaki
   * beklentinin tersine dönmesi bir gerileme DEĞİL, kararın kendisi.
   * Kaldırma yetkisini koruyan testler:
   * tests/community-serbest-paylasim.test.ts
   */
  it('kullanıcı paylaşımı anında yayımlanır ve akışta görünür', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/community/posts',
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: {
        metin: `${marker} deneyimi — moderasyon beklemeden yayımlanmalı.`,
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().post.status).toBe('published')

    const feed = await app.inject({
      method: 'GET',
      url: '/community',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    expect(
      feed.json().posts.some(
        (post: { summary: string | null }) =>
          (post.summary || '').includes(marker),
      ),
    ).toBe(true)
  })

  it('prevents learners from creating official posts or moderating', async () => {
    const official = await app.inject({
      method: 'POST',
      url: '/community/official',
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: {
        title: `${marker} resmî güncelleme`,
        summary:
          'Bu resmî güncelleme özeti yalnız admin tarafından oluşturulabilir.',
        sourceTitle: 'Resmî kurum',
        sourceUrl: 'https://example.gov.tr/duyuru',
      },
    })
    expect(official.statusCode).toBe(403)

    const moderation = await app.inject({
      method: 'GET',
      url: '/community/moderation',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    expect(moderation.statusCode).toBe(403)
  })

  it('publishes an admin-created sourced official summary after moderation', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/community/official',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: `${marker} resmî destek güncellemesi`,
        summary:
          'Resmî destek duyurusunun kısa, özgün ve kaynak bağlantılı test özetidir.',
        sourceTitle: 'Resmî kurum',
        sourceUrl: 'https://example.gov.tr/duyuru',
      },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().post.status).toBe('draft')

    const published = await app.inject({
      method: 'POST',
      url: `/community/${created.json().post.id}/moderate`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { action: 'publish' },
    })
    expect(published.statusCode).toBe(200)
    expect(published.json().post.status).toBe('published')
    publishedPostId = published.json().post.id

    const feed = await app.inject({
      method: 'GET',
      url: '/community?type=official',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    const post = feed
      .json()
      .posts.find(
        (item: { title: string }) => item.title.includes(marker),
      )
    expect(post.sourceUrl).toBe('https://example.gov.tr/duyuru')
  })

  it('rejects non-http source protocols', () => {
    const result = officialPostSchema.safeParse({
      title: 'Geçerli görünen resmî başlık',
      summary:
        'Bu özet bağlantı protokolü güvenli olmadığı için reddedilmelidir.',
      sourceTitle: 'Kaynak',
      sourceUrl: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('attaches a validated image and serves it only after moderation', async () => {
    const boundary = `community-boundary-${Date.now()}`
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zr2AAAAAASUVORK5CYII=',
      'base64',
    )
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample.png"\r\nContent-Type: image/png\r\n\r\n`),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    const uploaded = await app.inject({
      method: 'POST',
      url: '/community/media',
      headers: {
        authorization: `Bearer ${learnerToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    })
    expect(uploaded.statusCode).toBe(201)
    const mediaId = uploaded.json().media.id

    const unpublished = await app.inject({ method: 'GET', url: `/community/media/${mediaId}` })
    expect(unpublished.statusCode).toBe(404)

    const created = await app.inject({
      method: 'POST',
      url: '/community/posts',
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: {
        title: `${marker} görselli paylaşım`,
        summary: 'Güvenli biçimde yüklenen görsel moderasyon sonrasında topluluk akışında gösterilmelidir.',
        mediaId,
      },
    })
    expect(created.statusCode).toBe(201)
    await app.inject({
      method: 'POST',
      url: `/community/${created.json().post.id}/moderate`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { action: 'publish' },
    })

    const published = await app.inject({ method: 'GET', url: `/community/media/${mediaId}` })
    expect(published.statusCode).toBe(200)
    expect(published.headers['content-type']).toContain('image/png')
  })

  it('accepts one learner report per published post', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/community/${publishedPostId}/reports`,
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: { reason: 'misinformation' },
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().report.status).toBe('open')

    const duplicate = await app.inject({
      method: 'POST',
      url: `/community/${publishedPostId}/reports`,
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: { reason: 'spam' },
    })
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json().code).toBe('COMMUNITY_REPORT_DUPLICATE')
  })

  it('allows only an admin to resolve reports', async () => {
    const learnerList = await app.inject({
      method: 'GET',
      url: '/community/reports',
      headers: { authorization: `Bearer ${learnerToken}` },
    })
    expect(learnerList.statusCode).toBe(403)

    const list = await app.inject({
      method: 'GET',
      url: '/community/reports',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(list.statusCode).toBe(200)
    const report = list.json().reports.find(
      (item: { postId: string }) => item.postId === publishedPostId,
    )
    expect(report).toBeTruthy()

    const resolved = await app.inject({
      method: 'POST',
      url: `/community/reports/${report.id}/resolve`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { action: 'dismiss' },
    })
    expect(resolved.statusCode).toBe(200)
    expect(resolved.json().report.status).toBe('resolved')
  })
})
