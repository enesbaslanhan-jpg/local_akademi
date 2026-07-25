import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const mockState = vi.hoisted(() => ({
  events: [] as Array<{ event: string; data: any }>,
  error: null as Error | null,
  abortSignal: null as AbortSignal | null
}))

vi.mock('../src/services/ai-provider', async (importOriginal) => {
  const actual = await importOriginal()
  const mod = { ...actual as any }

  mod.streamAiResponse = async function* (_messages: any[], signal?: AbortSignal) {
    if (signal) mockState.abortSignal = signal
    if (mockState.error) throw mockState.error
    for (const evt of mockState.events) {
      if (signal?.aborted) throw new Error('MENTOR_STREAM_ABORTED')
      if (evt.event === 'provider') yield { type: 'provider', provider: evt.data.provider, model: evt.data.model }
      else if (evt.event === 'delta') yield { type: 'delta', delta: evt.data.delta }
      else if (evt.event === 'done') yield { type: 'done', tokenUsage: evt.data.tokenUsage }
    }
  }

  return mod
})

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let otherUserToken: string
let userId: number
let otherUserId: number

async function createTestUser(email: string, name: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { conversationRoutes } = await import('../src/services/conversation')
  await app.register(conversationRoutes, { prefix: '/mentor/conversations' })
  await app.ready()

  const user1 = await createTestUser(`stream-${Date.now()}@test.com`, 'Stream User')
  const user2 = await createTestUser(`other-stream-${Date.now()}@test.com`, 'Other User')
  userId = user1.id
  otherUserId = user2.id
  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  mockState.events = [
    { event: 'provider', data: { provider: 'ollama', model: 'test-model' } },
    { event: 'delta', data: { delta: 'Merhaba ' } },
    { event: 'delta', data: { delta: 'dünya!' } },
    { event: 'done', data: { tokenUsage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } } }
  ]
  mockState.error = null
  mockState.abortSignal = null
})

async function createConversation(token: string, title = 'Test') {
  const res = await app.inject({
    method: 'POST', url: '/mentor/conversations',
    headers: { authorization: `Bearer ${token}` },
    body: { title }
  })
  return JSON.parse(res.body).conversation.id
}

function parseSSE(body: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = []
  const lines = body.split('\n')
  let currentEvent = ''
  let currentData = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim()
    } else if (line === '') {
      if (currentEvent && currentData) {
        events.push({ event: currentEvent, data: JSON.parse(currentData) })
      }
      currentEvent = ''
      currentData = ''
    }
  }
  return events
}

describe('Streaming API', () => {
  it('JWT olmadan streaming endpoint 401 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/mentor/conversations/1/messages/stream',
      body: { message: 'test' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('başka kullanıcının conversationına stream başlatılamaz', async () => {
    const convId = await createConversation(userToken)
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${otherUserToken}` },
      body: { message: 'test' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('boş mesaj reddedilir', async () => {
    const convId = await createConversation(userToken)
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: '' }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('maksimum uzunluğu aşan mesaj reddedilir', async () => {
    const convId = await createConversation(userToken)
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'X'.repeat(8001) }
    })
    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('silinmiş conversationa stream başlatılamaz', async () => {
    const convId = await createConversation(userToken)
    await app.inject({
      method: 'DELETE', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'test' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('user mesajı kaydedilir ve SSE eventları döner', async () => {
    const convId = await createConversation(userToken, 'Stream Test')
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'test mesajı' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const events = parseSSE(res.body)
    const startEvent = events.find(e => e.event === 'start')
    expect(startEvent).toBeDefined()
    expect(startEvent!.data.type).toBe('start')
    expect(startEvent!.data.conversationId).toBe(convId)

    const providerEvent = events.find(e => e.event === 'provider')
    expect(providerEvent).toBeDefined()
    expect(providerEvent!.data.provider).toBe('ollama')

    const deltaEvents = events.filter(e => e.event === 'delta')
    expect(deltaEvents.length).toBeGreaterThanOrEqual(2)

    const doneEvent = events.find(e => e.event === 'done')
    expect(doneEvent).toBeDefined()
    expect(doneEvent!.data.assistantMessage).toBeDefined()
    expect(doneEvent!.data.assistantMessage.role).toBe('assistant')
    expect(doneEvent!.data.assistantMessage.content).toContain('Merhaba')
  })

  it('stream tamamlanınca assistant mesajı bir kez kaydedilir', async () => {
    const convId = await createConversation(userToken, 'DB Test')
    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'kayıt testi' }
    })

    const detailRes = await app.inject({
      method: 'GET', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const body = JSON.parse(detailRes.body)
    const userMsgs = body.messages.filter((m: any) => m.role === 'user')
    const assistantMsgs = body.messages.filter((m: any) => m.role === 'assistant')

    expect(userMsgs.length).toBe(1)
    expect(userMsgs[0].content).toBe('kayıt testi')

    expect(assistantMsgs.length).toBe(1)
    expect(assistantMsgs[0].generationStatus).toBe('completed')
    expect(assistantMsgs[0].tokenUsage).toBeDefined()
  })

  it('stream başarısız olunca user mesajı korunur ve error SSE döner', async () => {
    mockState.events = []
    mockState.error = new Error('MENTOR_ALL_PROVIDERS_FAILED')

    const convId = await createConversation(userToken, 'Hata Testi')
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'hata testi' }
    })
    expect(res.statusCode).toBe(200)

    const events = parseSSE(res.body)
    const errorEvent = events.find(e => e.event === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent!.data.error.code).toBe('AI_PROVIDER_ERROR')

    const detailRes = await app.inject({
      method: 'GET', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const messages = JSON.parse(detailRes.body).messages
    const userMsgs = messages.filter((m: any) => m.role === 'user')
    expect(userMsgs.length).toBe(1)
    expect(userMsgs[0].content).toBe('hata testi')
  })

  it('delta parçaları tek assistant mesajında birleşir', async () => {
    const convId = await createConversation(userToken)
    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'birleşme testi' }
    })
    const events = parseSSE(res.body)
    const doneEvent = events.find(e => e.event === 'done')
    expect(doneEvent).toBeDefined()
    expect(doneEvent!.data.assistantMessage.content).toBe('Merhaba dünya!')
  })

  it('regenerate yalnızca assistant mesajında çalışır', async () => {
    const convId = await createConversation(userToken)
    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'regenerate test' }
    })

    const detailRes = await app.inject({
      method: 'GET', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const messages = JSON.parse(detailRes.body).messages
    const userMsg = messages.find((m: any) => m.role === 'user')
    const assistantMsg = messages.find((m: any) => m.role === 'assistant')

    const userRegenRes = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/${userMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(userRegenRes.statusCode).toBe(422)

    const assistantRegenRes = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(assistantRegenRes.statusCode).toBe(200)
  })

  it('edit-and-regenerate yalnızca user mesajında çalışır', async () => {
    const convId = await createConversation(userToken)
    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'edit test' }
    })

    const detailRes = await app.inject({
      method: 'GET', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const messages = JSON.parse(detailRes.body).messages
    const userMsg = messages.find((m: any) => m.role === 'user')
    const assistantMsg = messages.find((m: any) => m.role === 'assistant')

    const assistantEditRes = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/${assistantMsg.id}/edit-and-regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'yeni içerik' }
    })
    expect(assistantEditRes.statusCode).toBe(422)

    const userEditRes = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/${userMsg.id}/edit-and-regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'düzenlenmiş mesaj' }
    })
    expect(userEditRes.statusCode).toBe(200)
  })

  it('başka kullanıcının mesajı regenerate edilemez', async () => {
    const convId = await createConversation(userToken)
    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'ownership test' }
    })

    const detailRes = await app.inject({
      method: 'GET', url: `/mentor/conversations/${convId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    const assistantMsg = JSON.parse(detailRes.body).messages.find((m: any) => m.role === 'assistant')

    const res = await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})
