import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

process.env.AI_REQUEST_TIMEOUT_MS = '100'
process.env.AI_PROVIDER = 'nvidia'
process.env.NVIDIA_API_KEY = 'test-invalid-key'
process.env.NVIDIA_API_URL = 'http://127.0.0.1:1/v1/chat/completions'

const { mockCallAiProviderWithRetry, mockStreamAiResponse, mockGetKO, mockNeedsClarification } = vi.hoisted(() => ({
  mockCallAiProviderWithRetry: vi.fn(),
  mockStreamAiResponse: vi.fn(),
  mockGetKO: vi.fn(),
  mockNeedsClarification: vi.fn(),
}))

vi.mock('../src/services/ai-provider', () => ({
  callAiProviderWithRetry: mockCallAiProviderWithRetry,
  streamAiResponse: mockStreamAiResponse,
  buildSystemPrompt: vi.fn(() => 'System prompt'),
  getRelevantKnowledgeObjects: mockGetKO,
  formatKnowledgeContext: vi.fn(() => '\n\n--- GÜVENİLMEYEN REFERANS VERİSİ ---\ncontext'),
  needsClarification: mockNeedsClarification,
}))

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let userId: number

async function createTestUser(email: string, name: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' },
  })
}

function makeMockKO() {
  return {
    id: 1, title: 'Test KO', code: 'KO-TEST',
    content: 'Test content', category: { name: 'Test Kategori' },
    score: 100, matchedTerms: ['title:test'],
    sourceRefs: [{ sourceId: 'src-1', title: 'Test Source', url: null, authorityLevel: 'high' }],
  }
}

function makeMockCitation() {
  return {
    id: 1, title: 'Test KO', code: 'KO-TEST',
    category: { name: 'Test Kategori' },
    sourceRefs: [{ sourceId: 'src-1', title: 'Test Source', url: null, authorityLevel: 'high' }],
  }
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (this: any, request: any, reply: any) {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { conversationRoutes } = await import('../src/services/conversation')
  await app.register(conversationRoutes, { prefix: '/mentor/conversations' })
  await app.ready()

  const user = await createTestUser(`cit-${Date.now()}@test.com`, 'Citation Test')
  userId = user.id
  userToken = app.jwt.sign({ id: userId, email: user.email, role: 'learner' })
})

afterAll(async () => {
  try {
    if (app) await app.close()
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } })
    }
    await prisma.$disconnect()
  }
})

describe('Normal chat — callAiProviderWithRetry receives knowledgeObjects', () => {
  it('passes citation with sourceRefs as second argument', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'AI yanıtı',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      provider: 'nvidia', model: 'test',
      citations: [makeMockCitation()],
    })
    mockGetKO.mockResolvedValue([makeMockKO()])

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Citation Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba' },
    })

    expect(msgRes.statusCode).toBe(200)
    expect(mockCallAiProviderWithRetry).toHaveBeenCalled()
    const calls = mockCallAiProviderWithRetry.mock.calls
    const koCall = calls.find(c => c.length >= 2 && Array.isArray(c[1]))
    expect(koCall).toBeDefined()
    expect(koCall![1][0]).toHaveProperty('id', 1)
    expect(koCall![1][0]).toHaveProperty('sourceRefs')
    expect(koCall![1][0].sourceRefs[0].authorityLevel).toBe('high')

    const body = msgRes.json()
    expect(body.sources[0].sourceRefs[0]).toMatchObject({
      sourceId: 'src-1',
      authorityLevel: 'high',
    })

    const storedAssistant = await prisma.conversationMessage.findFirst({
      where: { conversationId: conv.id, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    })
    const storedCitations = JSON.parse(storedAssistant?.knowledgeObjects || '[]')
    expect(storedCitations[0].sourceRefs[0].sourceId).toBe('src-1')
  })
})

describe('Streaming chat — streamAiResponse receives knowledgeObjects', () => {
  it('passes citation as third argument', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockGetKO.mockResolvedValue([makeMockKO()])

    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'nvidia', model: 'test' }
      yield { type: 'delta' as const, delta: 'Merhaba' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, citations: [makeMockCitation()], knowledgeObjects: [makeMockCitation()] }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Stream Test' },
    })).body).conversation

    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'stream test' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockStreamAiResponse).toHaveBeenCalled()
    const thirdArg = mockStreamAiResponse.mock.calls[0]?.[2]
    expect(thirdArg).toBeDefined()
    expect(thirdArg[0]).toHaveProperty('id', 1)
    expect(res.body).toContain('Merhaba')
    expect(res.body).toContain('"sourceRefs"')
  })
})

describe('Regenerate — streamAiResponse receives knowledgeObjects', () => {
  it('passes citation via streamAiResponse', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'İlk yanıt', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      provider: 'nvidia', model: 'test', citations: [makeMockCitation()],
    })
    mockGetKO.mockResolvedValue([makeMockKO()])

    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'nvidia', model: 'test' }
      yield { type: 'delta' as const, delta: 'Yeniden' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, citations: [makeMockCitation()], knowledgeObjects: [makeMockCitation()] }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Regen Test' },
    })).body).conversation

    await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'test' },
    })

    const assistantMsg = await prisma.conversationMessage.findFirst({
      where: { conversationId: conv.id, role: 'assistant' },
      orderBy: { createdAt: 'asc' },
    })
    expect(assistantMsg).toBeDefined()

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg!.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg).toBeDefined()
    expect(regenRes.body).toContain('"sourceRefs"')
  })
})

describe('Edit-and-regenerate — streamAiResponse receives knowledgeObjects', () => {
  it('passes citation via streamAiResponse', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'İlk yanıt', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      provider: 'nvidia', model: 'test', citations: [makeMockCitation()],
    })
    mockGetKO.mockResolvedValue([makeMockKO()])

    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'nvidia', model: 'test' }
      yield { type: 'delta' as const, delta: 'Düzenlenmiş' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, citations: [makeMockCitation()], knowledgeObjects: [makeMockCitation()] }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Edit Test' },
    })).body).conversation

    await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'özgün' },
    })

    const userMsg = await prisma.conversationMessage.findFirst({
      where: { conversationId: conv.id, role: 'user' },
      orderBy: { createdAt: 'asc' },
    })
    expect(userMsg).toBeDefined()

    const editRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${userMsg!.id}/edit-and-regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'düzenlenmiş' },
    })

    expect(editRes.statusCode).toBe(200)
    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg).toBeDefined()
    expect(editRes.body).toContain('"sourceRefs"')
  })
})
