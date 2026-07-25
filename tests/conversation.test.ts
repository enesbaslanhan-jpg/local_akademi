import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

// Short timeouts for tests
process.env.AI_REQUEST_TIMEOUT_MS = '100'
process.env.AI_PROVIDER = 'nvidia'
process.env.NVIDIA_API_KEY = 'test-invalid-key'
process.env.NVIDIA_API_URL = 'http://127.0.0.1:1/v1/chat/completions'

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let otherUserToken: string
let userId: number
let otherUserId: number

async function createTestUser(email: string, name: string) {
  const user = await prisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
  return user
}

beforeAll(async () => {
  app = Fastify()

  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  const { conversationRoutes } = await import('../src/services/conversation')
  await app.register(conversationRoutes, { prefix: '/mentor/conversations' })

  await app.ready()

  const user1 = await createTestUser(`test-${Date.now()}@test.com`, 'Test User')
  const user2 = await createTestUser(`other-${Date.now()}@test.com`, 'Other User')
  userId = user1.id
  otherUserId = user2.id

  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })
})

afterAll(async () => {
  await app.close()
})

describe('Conversation API', () => {
  let convId: number

  it('kullanıcı boş conversation listesini görebilir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.conversations).toEqual([])
  })

  it('yeni conversation oluşturulabilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Test Sohbet' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.conversation.title).toBe('Test Sohbet')
    expect(body.conversation.id).toBeDefined()
    convId = body.conversation.id
  })

  it('kullanıcı kendi conversation listesini görebilir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.conversations.length).toBe(1)
    expect(body.conversations[0].id).toBe(convId)
  })

  it('başka kullanıcının conversationına erişemez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('conversation başlığı güncellenebilir', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Güncellenmiş Başlık' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.conversation.title).toBe('Güncellenmiş Başlık')
  })

  it('başka kullanıcı başlığı değiştiremez', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${otherUserToken}` },
      body: { title: 'Hack' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('soft delete çalışır', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(204)
  })

  it('silinen conversation listede görünmez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.conversations.length).toBe(0)
  })

  it('başka kullanıcının conversationını silemez', async () => {
    const newConvRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Silinecek' }
    })
    const newId = JSON.parse(newConvRes.body).conversation.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/mentor/conversations/${newId}`,
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('mesaj gönderildiğinde user ve assistant mesajları kaydedilir', { timeout: 15000 }, async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Mesaj Testi' }
    })
    const cId = JSON.parse(convRes.body).conversation.id

    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${cId}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'Merhaba, nasıl iş kurabilirim?' }
    })
    expect(res.statusCode).toBe(200)

    const messagesRes = await app.inject({
      method: 'GET',
      url: `/mentor/conversations/${cId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const body = JSON.parse(messagesRes.body)
    expect(body.messages.length).toBeGreaterThanOrEqual(2)
    expect(body.messages[0].role).toBe('user')
  })

  it('başka kullanıcı mesaj ekleyemez', async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Güvenlik Testi' }
    })
    const cId = JSON.parse(convRes.body).conversation.id

    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${cId}/messages`,
      headers: { authorization: `Bearer ${otherUserToken}` },
      body: { message: 'Hack girişimi' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('başlık otomatik güncellenir', { timeout: 15000 }, async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Yeni Sohbet' }
    })
    const cId = JSON.parse(convRes.body).conversation.id

    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${cId}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'E-ticaret sitesi nasıl kurulur?' }
    })

    const convDetail = await app.inject({
      method: 'GET',
      url: `/mentor/conversations/${cId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const body = JSON.parse(convDetail.body)
    expect(body.conversation.title).not.toBe('Yeni Sohbet')
  })

  it('boş başlık validasyon hatası döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: '' }
    })
    expect(res.statusCode).toBe(201)
  })

  it('çok uzun başlık validasyon hatası döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'A'.repeat(121) }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('boş mesaj validasyon hatası döndürür', async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: {}
    })
    const cId = JSON.parse(convRes.body).conversation.id

    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${cId}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: '' }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('geçersiz ID validasyon hatası döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations/abc',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('kullanıcı başka kullanıcının conversationını listede görmez', async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${otherUserToken}` },
      body: { title: 'Gizli Sohbet' }
    })
    expect(JSON.parse(convRes.body).conversation.id).toBeDefined()

    const res = await app.inject({
      method: 'GET',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` }
    })
    const body = JSON.parse(res.body)
    for (const c of body.conversations) {
      expect(c.title).not.toBe('Gizli Sohbet')
    }
  })

  it('tüm AI providerlar başarısız olunca hata mesajı döner', { timeout: 10000 }, async () => {
    const convRes = await app.inject({
      method: 'POST',
      url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'AI Hata Testi' }
    })
    const cId = JSON.parse(convRes.body).conversation.id

    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${cId}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'bana bir iş fikri ver' }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.error).toBeDefined()
    expect(typeof body.error).toBe('string')
  })
})
