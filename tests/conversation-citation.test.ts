import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import type { KnowledgeObjectResult } from '../src/services/retrieval/types'
import { streamSlotManager } from '../src/services/stream-manager'

process.env.AI_REQUEST_TIMEOUT_MS = '100'
process.env.AI_PROVIDER = 'nvidia'
process.env.NVIDIA_API_KEY = 'test-invalid-key'
process.env.NVIDIA_API_URL = 'http://127.0.0.1:1/v1/chat/completions'

const { mockCallAiProviderWithRetry, mockStreamAiResponse, mockGetKO, mockResolveContext, mockNeedsClarification } = vi.hoisted(() => ({
  mockCallAiProviderWithRetry: vi.fn(),
  mockStreamAiResponse: vi.fn(),
  mockGetKO: vi.fn(),
  mockResolveContext: vi.fn(),
  mockNeedsClarification: vi.fn(),
}))

vi.mock('../src/services/ai-provider', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    callAiProviderWithRetry: mockCallAiProviderWithRetry,
    streamAiResponse: mockStreamAiResponse,
    buildSystemPrompt: vi.fn(() => 'System prompt'),
    getRelevantKnowledgeObjects: mockGetKO,
    formatKnowledgeContext: vi.fn(() => '\n\n--- GÜVENİLMEYEN REFERANS VERİSİ ---\ncontext'),
    needsClarification: mockNeedsClarification,
    resolveKnowledgeContext: mockResolveContext,
  }
})

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let userId: number

async function createTestUser(email: string, name: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' },
  })
}

function makeMockKO(): KnowledgeObjectResult {
  return {
    id: 1, title: 'Test KO', code: 'KO-TEST',
    content: 'Test content', category: { name: 'Test Kategori' },
    score: 100, confidence: 1, matchedTerms: ['title:test'],
    sourceRefs: [{ sourceId: 'src-1', title: 'Test Source', url: null, authorityLevel: 'high' }],
  }
}

function makeSelectedKO(): KnowledgeObjectResult {
  return {
    id: 2, title: 'Selected KO', code: 'KO-SELECTED',
    content: 'Selected content', category: { name: 'Selected Kategori' },
    score: 0, confidence: 1, matchedTerms: ['selected:explicit'],
    sourceRefs: [{ sourceId: 'src-2', title: 'Selected Source', url: null, authorityLevel: 'medium' }],
  }
}

function makeMockCitation() {
  return {
    id: 1, title: 'Test KO', code: 'KO-TEST',
    category: { name: 'Test Kategori' },
    sourceRefs: [{ sourceId: 'src-1', title: 'Test Source', url: null, authorityLevel: 'high' }],
  }
}

function makeSelectedCitation() {
  return {
    id: 2, title: 'Selected KO', code: 'KO-SELECTED',
    category: { name: 'Selected Kategori' },
    sourceRefs: [{ sourceId: 'src-2', title: 'Selected Source', url: null, authorityLevel: 'medium' }],
  }
}

beforeEach(() => {
  mockCallAiProviderWithRetry.mockReset()
  mockStreamAiResponse.mockReset()
  mockGetKO.mockReset()
  mockResolveContext.mockReset()
  mockNeedsClarification.mockReset()
  streamSlotManager.reset()

  mockResolveContext.mockImplementation(async (_message: string, code?: string, _intent?: string) => {
    const selected = code === 'KO-SELECTED' ? makeSelectedKO() : null
    const retrieved = [makeMockKO()]
    const knowledgeObjects: KnowledgeObjectResult[] = []
    const seen = new Set<number>()
    if (selected) {
      knowledgeObjects.push(selected)
      seen.add(selected.id)
    }
    for (const ko of retrieved) {
      if (!seen.has(ko.id)) {
        knowledgeObjects.push(ko)
        seen.add(ko.id)
      }
    }
    return {
      selected,
      knowledgeObjects,
      knowledgeContext: 'context',
      koTitle: selected ? selected.title : retrieved[0]?.title,
      selectedKOTitle: selected ? selected.title : undefined,
    }
  })
})

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
      body: { message: 'Gelir modeli nasıl oluşturulur?' },
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
      body: { message: 'Gelir modeli nasıl oluşturulur?' },
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
      body: { message: 'Gelir modeli nasıl oluşturulur?' },
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

describe('Selected knowledge object code — non-stream', () => {
  it('includes selected KO as first citation when valid code is provided', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'AI yanıtı',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      provider: 'nvidia', model: 'test',
      citations: [makeMockCitation()],
    })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Selected KO Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba', knowledgeObjectCode: 'KO-SELECTED' },
    })

    expect(msgRes.statusCode).toBe(200)
    const body = msgRes.json()
    expect(body.sources[0].code).toBe('KO-SELECTED')
    expect(body.sources[1].code).toBe('KO-TEST')

    expect(mockResolveContext).toHaveBeenCalledTimes(1)
    expect(mockResolveContext).toHaveBeenCalledWith('merhaba', 'KO-SELECTED', expect.any(String))

    const koCall = mockCallAiProviderWithRetry.mock.calls.find(c => c.length >= 2 && Array.isArray(c[1]))
    expect(koCall![1][0].code).toBe('KO-SELECTED')
  })

  it('deduplicates selected KO when it also appears in retrieval results', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockResolveContext.mockImplementation(async (_message: string, code?: string, _intent?: string) => {
      const selected = code === 'KO-SELECTED' ? makeSelectedKO() : null
      const retrieved = [makeSelectedKO()]
      const knowledgeObjects: KnowledgeObjectResult[] = []
      const seen = new Set<number>()
      if (selected) {
        knowledgeObjects.push(selected)
        seen.add(selected.id)
      }
      for (const ko of retrieved) {
        if (!seen.has(ko.id)) {
          knowledgeObjects.push(ko)
          seen.add(ko.id)
        }
      }
      return {
        selected,
        knowledgeObjects,
        knowledgeContext: 'context',
        koTitle: selected ? selected.title : retrieved[0]?.title,
        selectedKOTitle: selected ? selected.title : undefined,
      }
    })
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'AI yanıtı',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      provider: 'nvidia', model: 'test',
      citations: [makeMockCitation()],
    })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Duplicate KO Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba', knowledgeObjectCode: 'KO-SELECTED' },
    })

    expect(msgRes.statusCode).toBe(200)
    const body = msgRes.json()
    expect(body.sources.length).toBe(1)
    expect(body.sources[0].code).toBe('KO-SELECTED')
  })

  it('falls back to normal retrieval when no code is provided', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockCallAiProviderWithRetry.mockResolvedValue({
      content: 'AI yanıtı',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      provider: 'nvidia', model: 'test',
      citations: [makeMockCitation()],
    })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'No Code Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'Gelir modeli nasıl oluşturulur?' },
    })

    expect(msgRes.statusCode).toBe(200)
    const body = msgRes.json()
    expect(body.sources[0].code).toBe('KO-TEST')
    expect(mockResolveContext).toHaveBeenCalledWith('Gelir modeli nasıl oluşturulur?', undefined, expect.any(String))
  })

  it('returns 404 for missing code without leaking existence', async () => {
    mockResolveContext.mockImplementation(async (_message: string, code?: string, _intent?: string) => {
      const selected = code === 'KO-SELECTED' ? makeSelectedKO() : null
      const retrieved = [makeMockKO()]
      return {
        selected,
        knowledgeObjects: selected ? [selected] : retrieved,
        knowledgeContext: 'context',
        koTitle: selected ? selected.title : retrieved[0]?.title,
        selectedKOTitle: selected ? selected.title : undefined,
      }
    })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Missing Code Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba', knowledgeObjectCode: 'KO-MISSING' },
    })

    expect(msgRes.statusCode).toBe(404)
    expect(mockResolveContext).toHaveBeenCalledWith('merhaba', 'KO-MISSING', expect.any(String))

    const userMessageCount = await prisma.conversationMessage.count({ where: { conversationId: conv.id, role: 'user' } })
    expect(userMessageCount).toBe(1)
  })

  it('returns 422 for invalid code format', async () => {
    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Invalid Code Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba', knowledgeObjectCode: 'KO-SELECTED<script>' },
    })

    expect(msgRes.statusCode).toBe(422)
    expect(mockResolveContext).not.toHaveBeenCalled()
  })

  it('returns 404 for another user\'s conversation even with a valid code', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `cit-other-${Date.now()}@test.com`, password: 'hashed_test', name: 'Other', role: 'learner' },
    })
    const otherToken = app.jwt.sign({ id: otherUser.id, email: otherUser.email, role: 'learner' })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${otherToken}` },
      body: { title: 'Ownership Test' },
    })).body).conversation

    const msgRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'merhaba', knowledgeObjectCode: 'KO-SELECTED' },
    })

    expect(msgRes.statusCode).toBe(404)
    expect(mockResolveContext).not.toHaveBeenCalled()

    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})

describe('Selected knowledge object code — stream', () => {
  it('includes selected KO as first citation when valid code is provided', async () => {
    mockNeedsClarification.mockReturnValue(false)

    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'nvidia', model: 'test' }
      yield { type: 'delta' as const, delta: 'Merhaba' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, citations: [makeMockCitation()], knowledgeObjects: [makeMockCitation()] }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Stream Selected Test' },
    })).body).conversation

    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'stream test', knowledgeObjectCode: 'KO-SELECTED' },
    })

    expect(res.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledTimes(1)
    expect(mockResolveContext).toHaveBeenCalledWith('stream test', 'KO-SELECTED', expect.any(String))
    expect(mockStreamAiResponse).toHaveBeenCalled()
    const thirdArg = mockStreamAiResponse.mock.calls[0]?.[2]
    expect(thirdArg).toBeDefined()
    expect(thirdArg.length).toBe(2)
    expect(thirdArg[0].code).toBe('KO-SELECTED')
    expect(thirdArg[1].code).toBe('KO-TEST')
    expect(res.body).toContain('"sourceRefs"')
  })

  it('returns 404 for missing code without leaking existence', async () => {
    mockResolveContext.mockImplementation(async (_message: string, code?: string, _intent?: string) => {
      const selected = code === 'KO-SELECTED' ? makeSelectedKO() : null
      const retrieved = [makeMockKO()]
      return {
        selected,
        knowledgeObjects: selected ? [selected] : retrieved,
        knowledgeContext: 'context',
        koTitle: selected ? selected.title : retrieved[0]?.title,
        selectedKOTitle: selected ? selected.title : undefined,
      }
    })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Stream Missing Code Test' },
    })).body).conversation

    const res = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/stream`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'stream test', knowledgeObjectCode: 'KO-MISSING' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('event: error')
    expect(mockResolveContext).toHaveBeenCalledWith('stream test', 'KO-MISSING', expect.any(String))

    const userMessageCount = await prisma.conversationMessage.count({ where: { conversationId: conv.id, role: 'user' } })
    expect(userMessageCount).toBe(1)
  })
})

describe('Regenerate — preserves selected knowledge object context', () => {
  it('restores selected KO code from previous assistant message', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Regenerate Preserve Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'test', generationStatus: 'completed' }
    })
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: JSON.stringify([makeSelectedCitation()])
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledTimes(1)
    expect(mockResolveContext).toHaveBeenCalledWith('test', 'KO-SELECTED', expect.any(String))

    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg).toBeDefined()
    expect(thirdArg.length).toBe(2)
    expect(thirdArg[0].code).toBe('KO-SELECTED')
    expect(thirdArg[1].code).toBe('KO-TEST')
  })

  it('deduplicates selected KO when it also appears in retrieval results', async () => {
    mockNeedsClarification.mockReturnValue(false)
    mockResolveContext.mockImplementation(async (_message: string, code?: string, _intent?: string) => {
      const selected = code === 'KO-SELECTED' ? makeSelectedKO() : null
      const retrieved = [makeSelectedKO()]
      const knowledgeObjects: KnowledgeObjectResult[] = []
      const seen = new Set<number>()
      if (selected) {
        knowledgeObjects.push(selected)
        seen.add(selected.id)
      }
      for (const ko of retrieved) {
        if (!seen.has(ko.id)) {
          knowledgeObjects.push(ko)
          seen.add(ko.id)
        }
      }
      return {
        selected,
        knowledgeObjects,
        knowledgeContext: 'context',
        koTitle: selected ? selected.title : retrieved[0]?.title,
        selectedKOTitle: selected ? selected.title : undefined,
      }
    })

    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'nvidia', model: 'test' }
      yield { type: 'delta' as const, delta: 'Yeniden' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, citations: [makeSelectedCitation()], knowledgeObjects: [makeSelectedCitation()] }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${userToken}` },
      body: { title: 'Regenerate Dedup Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'test', generationStatus: 'completed' }
    })
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: JSON.stringify([makeSelectedCitation()])
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledWith('test', 'KO-SELECTED', expect.any(String))
    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg.length).toBe(1)
    expect(thirdArg[0].code).toBe('KO-SELECTED')
  })

  it('falls back to normal retrieval when previous knowledgeObjects is null', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Regenerate Null Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'Gelir modeli nasıl oluşturulur?', generationStatus: 'completed' }
    })
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: null
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledWith('Gelir modeli nasıl oluşturulur?', undefined, expect.any(String))
    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg[0].code).toBe('KO-TEST')
  })

  it('falls back to normal retrieval when previous knowledgeObjects is malformed JSON', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Regenerate Malformed Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'Gelir modeli nasıl oluşturulur?', generationStatus: 'completed' }
    })
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: '{invalid json'
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledWith('Gelir modeli nasıl oluşturulur?', undefined, expect.any(String))
  })

  it('ignores invalid code format in previous knowledgeObjects', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Regenerate Invalid Code Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'Gelir modeli nasıl oluşturulur?', generationStatus: 'completed' }
    })
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: JSON.stringify([{ code: 'KO-INVALID<script>' }])
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledWith('Gelir modeli nasıl oluşturulur?', undefined, expect.any(String))
  })

  it('returns 404 for another user\'s assistant message', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `cit-other-regen-${Date.now()}@test.com`, password: 'hashed_test', name: 'Other', role: 'learner' },
    })
    const otherToken = app.jwt.sign({ id: otherUser.id, email: otherUser.email, role: 'learner' })

    const conv = JSON.parse((await app.inject({
      method: 'POST', url: '/mentor/conversations',
      headers: { authorization: `Bearer ${otherToken}` },
      body: { title: 'Ownership Regen Test' },
    })).body).conversation

    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: JSON.stringify([makeSelectedCitation()])
      }
    })

    const regenRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(regenRes.statusCode).toBe(404)
    expect(mockResolveContext).not.toHaveBeenCalled()

    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})

describe('Edit-and-regenerate — preserves selected knowledge object context', () => {
  it('restores selected KO from the following assistant message', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Edit Regenerate Preserve Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'özgün', generationStatus: 'completed' }
    })
    await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: JSON.stringify([makeSelectedCitation()])
      }
    })

    const editRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${userMsg.id}/edit-and-regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'düzenlenmiş' },
    })

    expect(editRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledTimes(1)
    expect(mockResolveContext).toHaveBeenCalledWith('düzenlenmiş', 'KO-SELECTED', expect.any(String))

    const lastCall = mockStreamAiResponse.mock.calls.length - 1
    const thirdArg = mockStreamAiResponse.mock.calls[lastCall]?.[2]
    expect(thirdArg).toBeDefined()
    expect(thirdArg.length).toBe(2)
    expect(thirdArg[0].code).toBe('KO-SELECTED')
    expect(thirdArg[1].code).toBe('KO-TEST')
  })

  it('falls back to normal retrieval when following assistant has no knowledgeObjects', async () => {
    mockNeedsClarification.mockReturnValue(false)
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
      body: { title: 'Edit Regenerate Fallback Test' },
    })).body).conversation

    const userMsg = await prisma.conversationMessage.create({
      data: { conversationId: conv.id, role: 'user', content: 'özgün', generationStatus: 'completed' }
    })
    await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id, role: 'assistant', content: 'İlk yanıt',
        generationStatus: 'completed',
        knowledgeObjects: null
      }
    })

    const editRes = await app.inject({
      method: 'POST', url: `/mentor/conversations/${conv.id}/messages/${userMsg.id}/edit-and-regenerate`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { message: 'Gelir modeli nasıl oluşturulur?' },
    })

    expect(editRes.statusCode).toBe(200)
    expect(mockResolveContext).toHaveBeenCalledWith('Gelir modeli nasıl oluşturulur?', undefined, expect.any(String))
  })
})
