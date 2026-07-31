import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getGlobalMentorTelemetryCollector,
  setGlobalMentorTelemetryCollector,
  MentorTelemetryCollector,
  type MentorTelemetryRecord,
} from '../src/services/mentor-telemetry'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Benchmark requires telemetry; enable it without touching the user's .env file.
process.env.AI_MENTOR_TELEMETRY_ENABLED = 'true'

const FIXTURE_PATH = path.resolve(__dirname, '..', 'tests', 'fixtures', 'mentor-baseline-prompts.json')
const REPORT_DIR = path.resolve(__dirname, '..', 'reports', 'phase7')

function getMaxPromptsArg(): number | null {
  const arg = process.argv.find(a => a.startsWith('--max-prompts='))
  if (!arg) return null
  const n = Number(arg.split('=')[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

function getOutputPathArg(): string {
  const arg = process.argv.find(a => a.startsWith('--output='))
  if (arg) return arg.split('=')[1]
  return path.join(REPORT_DIR, 'mentor-baseline-results.json')
}

const prisma = new PrismaClient()

interface FixturePrompt {
  id: string
  category: string
  text: string
}

function getOllamaBaseUrl(): string {
  const configured = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434/v1/chat/completions'
  try {
    return new URL(configured).origin
  } catch {
    console.error('OLLAMA_API_URL geçersiz:', configured)
    process.exit(1)
  }
}

async function checkOllama(): Promise<{ ok: boolean; message: string }> {
  const base = getOllamaBaseUrl()
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) {
      return { ok: false, message: `Ollama sağlık kontrolü başarısız: HTTP ${res.status}` }
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> }
    const modelNames = (data.models || []).map(m => m.name).filter(Boolean)
    const target = process.env.OLLAMA_MODEL || 'qwen3:4b-instruct'
    if (!modelNames.some(n => n === target)) {
      return { ok: false, message: `Ollama çalışıyor ama model '${target}' bulunamadı. Mevcut modeller: ${modelNames.join(', ')}` }
    }
    return { ok: true, message: `Ollama çalışıyor ve model '${target}' mevcut.` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Ollama'ya bağlanılamadı: ${msg}` }
  }
}

async function createApp() {
  const app = Fastify({ logger: false })
  await app.register(jwt, { secret: 'benchmark-secret-key-min-32-bytes-long!!' })
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
  return app
}

async function createTestUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing
  return prisma.user.create({
    data: { email, password: 'benchmark_hashed', name, role: 'learner' },
  })
}

async function runNonStreamPrompt(
  app: any,
  token: string,
  prompt: FixturePrompt,
): Promise<MentorTelemetryRecord | null> {
  const conv = await app.inject({
    method: 'POST',
    url: '/mentor/conversations',
    headers: { authorization: `Bearer ${token}` },
    body: { title: `Benchmark ${prompt.id}` },
  })
  const convId = (conv.json() as any).conversation.id as number

  await app.inject({
    method: 'POST',
    url: `/mentor/conversations/${convId}/messages`,
    headers: { authorization: `Bearer ${token}` },
    body: { message: prompt.text },
  })

  const collector = getGlobalMentorTelemetryCollector()
  const records = collector.getRecords()
  const match = records.findLast(r => r.conversationId === convId)
  return match ?? null
}

async function runStreamPrompt(
  app: any,
  token: string,
  prompt: FixturePrompt,
): Promise<MentorTelemetryRecord | null> {
  const conv = await app.inject({
    method: 'POST',
    url: '/mentor/conversations',
    headers: { authorization: `Bearer ${token}` },
    body: { title: `Benchmark ${prompt.id}` },
  })
  const convId = (conv.json() as any).conversation.id as number

  await app.inject({
    method: 'POST',
    url: `/mentor/conversations/${convId}/messages/stream`,
    headers: { authorization: `Bearer ${token}` },
    body: { message: prompt.text },
  })

  const collector = getGlobalMentorTelemetryCollector()
  const records = collector.getRecords()
  const match = records.findLast(r => r.conversationId === convId)
  return match ?? null
}

async function runMemoryConversation(
  app: any,
  token: string,
): Promise<MentorTelemetryRecord | null> {
  const conv = await app.inject({
    method: 'POST',
    url: '/mentor/conversations',
    headers: { authorization: `Bearer ${token}` },
    body: { title: 'Memory Conversation' },
  })
  const convId = (conv.json() as any).conversation.id as number

  const prompts = [
    "Benim işletmem İstanbul'da küçük bir kafe.",
    'Aylık cirom yaklaşık 80.000 TL.',
    'Bu işletme için önceki bilgileri hatırla.',
  ]

  for (const text of prompts) {
    await app.inject({
      method: 'POST',
      url: `/mentor/conversations/${convId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      body: { message: text },
    })
  }

  const collector = getGlobalMentorTelemetryCollector()
  const records = collector.getRecords()
  return records.findLast(r => r.conversationId === convId) ?? null
}

function safeObservationLabel(text: string): string {
  const lowered = text.toLocaleLowerCase('tr-TR')
  if (lowered.includes('gelir modeli') || lowered.includes('iş modeli') || lowered.includes('canvas')) return 'business_model'
  if (lowered.includes('vergi') || lowered.includes('mali müşavir') || lowered.includes('kdv')) return 'tax_legal'
  if (lowered.includes('model') || lowered.includes('ollama') || lowered.includes('nvidia')) return 'system_or_model'
  return 'general'
}

function buildResultRecord(
  prompt: FixturePrompt,
  record: MentorTelemetryRecord | null,
): Record<string, unknown> {
  if (!record) {
    return {
      promptId: prompt.id,
      category: prompt.category,
      provider: process.env.AI_PROVIDER || 'ollama',
      model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
      stream: false,
      error: 'NO_TELEMETRY_RECORD',
    }
  }
  return {
    promptId: prompt.id,
    category: prompt.category,
    provider: record.provider,
    model: record.model,
    stream: record.stream,
    totalDurationMs: record.totalDurationMs,
    retrievalDurationMs: record.retrievalDurationMs,
    memoryDurationMs: record.memoryDurationMs,
    contextBuildDurationMs: record.contextBuildDurationMs,
    providerDurationMs: record.providerDurationMs,
    firstTokenMs: record.firstTokenMs,
    persistenceDurationMs: record.persistenceDurationMs,
    reviewerDurationMs: record.reviewerDurationMs,
    promptCharacterCount: record.promptCharacterCount,
    estimatedPromptTokens: record.estimatedPromptTokens,
    responseCharacterCount: record.responseCharacterCount,
    estimatedResponseTokens: record.estimatedResponseTokens,
    retrievedKnowledgeObjectCount: record.retrievedKnowledgeObjectCount,
    selectedKnowledgeObjectPresent: record.selectedKnowledgeObjectPresent,
    memoryItemCount: record.memoryItemCount,
    citationCount: record.citationCount,
    errorCode: record.errorCode,
    timeout: record.timeout,
    aborted: record.aborted,
    observation: safeObservationLabel(prompt.text),
  }
}

async function main() {
  const health = await checkOllama()
  if (!health.ok) {
    console.error('BENCHMARK_ABORTED:', health.message)
    console.error(`Lütfen Ollama'yi başlatın ve modeli indirin, ardından tekrar deneyin.`)
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(REPORT_DIR, 'mentor-baseline-results.json'),
      JSON.stringify({
        status: 'OLLAMA_UNAVAILABLE',
        message: health.message,
        timestamp: new Date().toISOString(),
      }, null, 2),
    )
    process.exit(1)
  }
  console.log(health.message)

  const allPrompts: FixturePrompt[] = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))
  if (allPrompts.length < 30) {
    console.warn(`Uyarı: fixture yalnızca ${allPrompts.length} soru içeriyor. Beklenen en az 30.`)
  }
  const maxPrompts = getMaxPromptsArg()
  const prompts = maxPrompts ? allPrompts.slice(0, maxPrompts) : allPrompts
  if (maxPrompts) {
    console.log(`Benchmark: fixture'daki ${maxPrompts} soru çalıştırılıyor (toplam ${allPrompts.length}).`)
  }

  const collector = new MentorTelemetryCollector(true)
  setGlobalMentorTelemetryCollector(collector)

  const app = await createApp()
  const email = `benchmark-${Date.now()}@localakademi.test`
  const user = await createTestUser(email, 'Benchmark User')
  const token = app.jwt.sign({ id: user.id, email: user.email, role: 'learner' })

  const results: Record<string, unknown>[] = []

  console.log('Benchmark başlıyor: non-stream 30 soru')
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    console.log(`[${i + 1}/${prompts.length}] ${prompt.id}: ${prompt.text}`)
    try {
      const record = await runNonStreamPrompt(app, token, prompt)
      results.push(buildResultRecord(prompt, record))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  HATA: ${msg}`)
      results.push({
        promptId: prompt.id,
        category: prompt.category,
        provider: process.env.AI_PROVIDER || 'ollama',
        model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
        stream: false,
        error: msg,
      })
    }
    // Kısa duraklama: Ollama CPU'ya ve kuyruğa yük bindirmesin.
    await new Promise(r => setTimeout(r, 250))
  }

  console.log('Benchmark: streaming ölçümü')
  const streamPrompts = prompts.filter(p => p.category === 'technical' || p.category === 'business').slice(0, 3)
  for (const prompt of streamPrompts) {
    try {
      const record = await runStreamPrompt(app, token, prompt)
      results.push(buildResultRecord(prompt, record))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  HATA (stream): ${msg}`)
      results.push({
        promptId: `${prompt.id}-stream`,
        category: prompt.category,
        provider: process.env.AI_PROVIDER || 'ollama',
        model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
        stream: true,
        error: msg,
      })
    }
    await new Promise(r => setTimeout(r, 250))
  }

  console.log('Benchmark: memory içeren conversation')
  try {
    const record = await runMemoryConversation(app, token)
    if (record) {
      results.push({
        promptId: 'memory-conversation',
        category: 'memory',
        provider: record.provider,
        model: record.model,
        stream: record.stream,
        totalDurationMs: record.totalDurationMs,
        retrievalDurationMs: record.retrievalDurationMs,
        memoryDurationMs: record.memoryDurationMs,
        contextBuildDurationMs: record.contextBuildDurationMs,
        providerDurationMs: record.providerDurationMs,
        firstTokenMs: record.firstTokenMs,
        persistenceDurationMs: record.persistenceDurationMs,
        reviewerDurationMs: record.reviewerDurationMs,
        promptCharacterCount: record.promptCharacterCount,
        estimatedPromptTokens: record.estimatedPromptTokens,
        responseCharacterCount: record.responseCharacterCount,
        estimatedResponseTokens: record.estimatedResponseTokens,
        retrievedKnowledgeObjectCount: record.retrievedKnowledgeObjectCount,
        selectedKnowledgeObjectPresent: record.selectedKnowledgeObjectPresent,
        memoryItemCount: record.memoryItemCount,
        citationCount: record.citationCount,
        errorCode: record.errorCode,
        timeout: record.timeout,
        aborted: record.aborted,
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  HATA: ${msg}`)
  }

  await app.close()

  const summary = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: {
      provider: process.env.AI_PROVIDER || 'ollama',
      model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
      ollamaApiUrl: process.env.OLLAMA_API_URL,
    },
    fixtureCount: allPrompts.length,
    runCount: prompts.length,
    sampleCount: results.length,
    results,
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const jsonPath = getOutputPathArg()
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2))
  console.log(`Sonuçlar: ${jsonPath}`)
  console.log('Benchmark tamamlandı.')
}

main().catch(err => {
  console.error('Benchmark başarısız:', err)
  process.exit(1)
})
