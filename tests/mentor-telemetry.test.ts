import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { streamSlotManager } from '../src/services/stream-manager'
import {
  MentorTelemetryCollector,
  getGlobalMentorTelemetryCollector,
  setGlobalMentorTelemetryCollector,
  resetGlobalMentorTelemetryCollector,
} from '../src/services/mentor-telemetry'

process.env.AI_REQUEST_TIMEOUT_MS = '100'
process.env.AI_PROVIDER = 'nvidia'
process.env.NVIDIA_API_KEY = 'test-invalid-key'
process.env.NVIDIA_API_URL = 'http://127.0.0.1:1/v1/chat/completions'

const { mockCallAiProviderWithRetry, mockStreamAiResponse, mockResolveContext, mockNeedsClarification } = vi.hoisted(() => ({
  mockCallAiProviderWithRetry: vi.fn(),
  mockStreamAiResponse: vi.fn(),
  mockResolveContext: vi.fn(),
  mockNeedsClarification: vi.fn(),
}))

vi.mock('../src/services/ai-provider', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    callAiProviderWithRetry: mockCallAiProviderWithRetry,
    streamAiResponse: mockStreamAiResponse,
    resolveKnowledgeContext: mockResolveContext,
    needsClarification: mockNeedsClarification,
  }
})

function makeMockKO(id: number, title: string, code: string) {
  return {
    id, title, code, content: 'Test content',
    category: { name: 'Test Kategori' },
    score: 10, matchedTerms: ['title:test'],
    sourceRefs: [{ sourceId: 'src-1', title: 'Test Source', url: null, authorityLevel: 'high' }],
  }
}

function makeResolveResult(knowledgeObjects: any[], selected: any = null) {
  return {
    selected, knowledgeObjects, knowledgeContext: 'context',
    koTitle: selected ? selected.title : knowledgeObjects[0]?.title,
    selectedKOTitle: selected ? selected.title : undefined,
  }
}

const prisma = new PrismaClient()
let app: FastifyInstance
let userToken: string
let userId: number

async function createTestUser(email: string, name: string) {
  return prisma.user.create({ data: { email, password: 'hashed_test', name, role: 'learner' } })
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
  const user = await createTestUser(`tel-${Date.now()}@test.com`, 'Telemetry Test')
  userId = user.id
  userToken = app.jwt.sign({ id: user.id, email: user.email, role: 'learner' })
})

afterAll(async () => {
  try { if (app) await app.close() } finally {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  }
})

beforeEach(() => {
  mockCallAiProviderWithRetry.mockReset()
  mockStreamAiResponse.mockReset()
  mockResolveContext.mockReset()
  mockNeedsClarification.mockReset()
  streamSlotManager.reset()
  resetGlobalMentorTelemetryCollector()
  mockResolveContext.mockResolvedValue(makeResolveResult([makeMockKO(1, 'Test KO', 'KO-TEST')]))
  mockNeedsClarification.mockReturnValue(false)
})

async function createConversation(): Promise<number> {
  const conv = await app.inject({
    method: 'POST', url: '/mentor/conversations',
    headers: { authorization: `Bearer ${userToken}` },
    body: { title: 'Telemetry' },
  })
  return (conv.json() as any).conversation.id as number
}

describe('Mentor telemetry defaults', () => {
  it('varsayılan olarak telemetry kapalıdır', async () => {
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const collector = getGlobalMentorTelemetryCollector()
    expect(collector.isEnabled()).toBe(false)
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    expect(collector.getRecords()).toHaveLength(0)
  })

  it('AI_MENTOR_TELEMETRY_ENABLED=true olduğunda metrik kaydı oluşur', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    const res = await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    expect(res.statusCode).toBe(200)
    expect(collector.getRecords()).toHaveLength(1)
    const record = collector.getRecords()[0]
    expect(record.conversationId).toBe(convId)
    expect(record.stream).toBe(false)
    expect(record.provider).toBe('nvidia')
    expect(record.model).toBe('test')
    expect(record.retrievedKnowledgeObjectCount).toBe(1)
    expect(record.citationCount).toBe(1)
    expect(record.totalDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.retrievalDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.providerDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.persistenceDurationMs).toBeGreaterThanOrEqual(0)
  })
})

describe('Mentor telemetry security', () => {
  it('kayıt kullanıcı mesajı içermez', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    const userMessage = 'Gizli kullanıcı sorusu 12345'
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: userMessage } })
    const serialized = JSON.stringify(collector.getRecords())
    expect(serialized).not.toContain(userMessage)
  })

  it('kayıt asistan cevabı içermez', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    const assistantContent = 'Gizli asistan içeriği 67890'
    mockCallAiProviderWithRetry.mockResolvedValue({ content: assistantContent, usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const serialized = JSON.stringify(collector.getRecords())
    expect(serialized).not.toContain(assistantContent)
  })

  it('kayıt API key veya Authorization header içermez', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    process.env.NVIDIA_API_KEY = 'sk-super-secret-key-xyz'
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const serialized = JSON.stringify(collector.getRecords())
    expect(serialized).not.toContain('sk-super-secret-key-xyz')
    expect(serialized).not.toContain(userToken)
  })
})

describe('Mentor telemetry field accuracy', () => {
  it('retrieval süresi ayrı kaydedilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const record = collector.getRecords()[0]
    expect(record.retrievalDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.contextBuildDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.memoryDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.providerDurationMs).toBeGreaterThanOrEqual(0)
    expect(record.persistenceDurationMs).toBeGreaterThanOrEqual(0)
  })

  it('citation sayısı doğru kaydedilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    const kos = [makeMockKO(1, 'Birinci KO', 'KO-1'), makeMockKO(2, 'İkinci KO', 'KO-2')]
    mockResolveContext.mockResolvedValue(makeResolveResult(kos))
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const record = collector.getRecords()[0]
    expect(record.retrievedKnowledgeObjectCount).toBe(2)
    expect(record.citationCount).toBe(2)
  })

  it('selected knowledge object varlığı kaydedilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    const selected = makeMockKO(99, 'Selected KO', 'KO-SELECTED')
    mockResolveContext.mockResolvedValue(makeResolveResult([selected], selected))
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba', knowledgeObjectCode: 'KO-SELECTED' } })
    const record = collector.getRecords()[0]
    expect(record.selectedKnowledgeObjectPresent).toBe(true)
  })

  it('memory sayısı doğru kaydedilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    const memory = await prisma.userMemory.create({
      data: {
        userId,
        type: 'fact',
        key: 'monthly_revenue',
        value: 'Aylık ciro 50000 TL',
        importance: 0.8,
        confidence: 0.9,
        sourceType: 'user_manual',
        validationStatus: 'user_entered',
        status: 'active',
      }
    })
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Aylık cirom nedir?' } })
    const record = collector.getRecords()[0]
    expect(record.memoryItemCount).toBeGreaterThanOrEqual(1)
    await prisma.userMemory.delete({ where: { id: memory.id } })
  })

  it('hata durumunda errorCode kaydedilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    mockCallAiProviderWithRetry.mockRejectedValue(new Error('MENTOR_PROVIDER_ERROR:TIMEOUT'))
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const record = collector.getRecords()[0]
    expect(record.errorCode).toBe('AI_PROVIDER_ERROR')
    expect(record.timeout).toBe(true)
  })

  it('abort ve timeout ayrı sınıflandırılır', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    mockCallAiProviderWithRetry.mockRejectedValue(new Error('MENTOR_PROVIDER_ERROR:ABORTED'))
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    const record = collector.getRecords()[0]
    expect(record.errorCode).toBe('AI_PROVIDER_ERROR')
    expect(record.timeout).toBe(false)
  })
})

describe('Mentor telemetry stream fields', () => {
  it('stream firstTokenMs yalnızca ilk content geldiğinde set edilir', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    async function* mockGen() {
      yield { type: 'provider' as const, provider: 'ollama', model: 'test-model' }
      yield { type: 'delta' as const, delta: 'Merhaba ' }
      yield { type: 'delta' as const, delta: 'dünya!' }
      yield { type: 'done' as const, tokenUsage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }
    }
    mockStreamAiResponse.mockReturnValue(mockGen())
    const convId = await createConversation()
    await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages/stream`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'stream test' } })
    const record = collector.getRecords()[0]
    expect(record.stream).toBe(true)
    expect(record.firstTokenMs).toBeGreaterThanOrEqual(0)
    expect(record.providerDurationMs).toBeGreaterThanOrEqual(0)
  })
})

describe('Mentor telemetry response contract', () => {
  it('telemetry kapalıyken response sözleşmesi değişmez', async () => {
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    const res = await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.reply).toBe('AI')
    expect(body.provider).toBe('nvidia')
    expect(body.model).toBe('test')
    expect(body.usage.totalTokens).toBe(2)
  })

  it('telemetry açıkken response sözleşmesi değişmez', async () => {
    const collector = new MentorTelemetryCollector(true)
    setGlobalMentorTelemetryCollector(collector)
    mockCallAiProviderWithRetry.mockResolvedValue({ content: 'AI', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, provider: 'nvidia', model: 'test' })
    const convId = await createConversation()
    const res = await app.inject({ method: 'POST', url: `/mentor/conversations/${convId}/messages`, headers: { authorization: `Bearer ${userToken}` }, body: { message: 'Merhaba' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.reply).toBe('AI')
    expect(body.provider).toBe('nvidia')
    expect(body.model).toBe('test')
    expect(body.usage.totalTokens).toBe(2)
  })
})
