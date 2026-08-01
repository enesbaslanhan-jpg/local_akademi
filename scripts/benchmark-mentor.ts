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

const DEFAULT_FIXTURE_PATH = path.resolve(__dirname, '..', 'tests', 'fixtures', 'mentor-baseline-prompts.json')
const REPORT_DIR = path.resolve(__dirname, '..', 'reports', 'phase7')

interface CliArgs {
  fixturePath: string
  outputPath: string
  maxPrompts: number | null
  startIndex: number | null
  category: string | null
  skipStream: boolean
  skipMemory: boolean
  resume: boolean
  promptTimeoutMs: number | null
}

export function parsePositiveIntArg(prefix: string): number | null {
  const arg = process.argv.find(a => a.startsWith(prefix))
  if (!arg) return null
  const n = Number(arg.split('=')[1])
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : null
}

function getMaxPromptsArg(): number | null {
  return parsePositiveIntArg('--max-prompts=')
}

function getStartIndexArg(): number | null {
  return parsePositiveIntArg('--start-index=')
}

function getPromptTimeoutMsArg(): number | null {
  return parsePositiveIntArg('--prompt-timeout-ms=')
}

function getCategoryArg(): string | null {
  const arg = process.argv.find(a => a.startsWith('--category='))
  if (!arg) return null
  const value = arg.split('=')[1]
  return value ? value.trim() : null
}

function getFixturePathArg(): string {
  const arg = process.argv.find(a => a.startsWith('--fixture='))
  if (arg) return path.resolve(arg.split('=')[1])
  return DEFAULT_FIXTURE_PATH
}

function getOutputPathArg(): string {
  const arg = process.argv.find(a => a.startsWith('--output='))
  if (arg) return arg.split('=')[1]
  return path.join(REPORT_DIR, 'mentor-baseline-results.json')
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(name) ||
    process.argv.includes(`--${name}`) ||
    process.argv.includes(`--${name}=true`)
}

function parseCliArgs(): CliArgs {
  return {
    fixturePath: getFixturePathArg(),
    outputPath: getOutputPathArg(),
    maxPrompts: getMaxPromptsArg(),
    startIndex: getStartIndexArg(),
    category: getCategoryArg(),
    skipStream: hasFlag('skip-stream'),
    skipMemory: hasFlag('skip-memory'),
    resume: hasFlag('resume'),
    promptTimeoutMs: getPromptTimeoutMsArg(),
  }
}

const prisma = new PrismaClient()

interface FixturePrompt {
  id: string
  category: string
  text: string
}

interface BenchmarkSummary {
  status: string
  timestamp: string
  environment: {
    provider: string
    model: string
    ollamaApiUrl: string | undefined
  }
  fixtureCount: number
  runCount: number
  sampleCount: number
  results: Record<string, unknown>[]
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

export function safeObservationLabel(text: string): string {
  const lowered = text.toLocaleLowerCase('tr-TR')
  if (lowered.includes('gelir modeli') || lowered.includes('iş modeli') || lowered.includes('canvas')) return 'business_model'
  if (lowered.includes('vergi') || lowered.includes('mali müşavir') || lowered.includes('kdv')) return 'tax_legal'
  if (lowered.includes('model') || lowered.includes('ollama') || lowered.includes('nvidia')) return 'system_or_model'
  return 'general'
}

export function buildResultRecord(
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
    promptProfile: record.promptProfile,
    systemPromptCharacters: record.systemPromptCharacters,
    historyCharacters: record.historyCharacters,
    historyMessageCount: record.historyMessageCount,
    configuredMaxOutputTokens: record.configuredMaxOutputTokens,
    knowledgeContextCharacters: record.knowledgeContextCharacters,
    estimatedInputTokens: record.estimatedInputTokens,
    memoryCharacters: record.memoryCharacters,
    noRelevantKnowledgeFound: record.noRelevantKnowledgeFound,
    providerInputTokens: record.providerInputTokens,
    providerOutputTokens: record.providerOutputTokens,
    outputReviewDeferred: record.outputReviewDeferred,
    errorCode: record.errorCode,
    timeout: record.timeout,
    aborted: record.aborted,
    observation: safeObservationLabel(prompt.text),
  }
}

export function buildErrorRecord(
  prompt: FixturePrompt,
  error: unknown,
  stream = false,
): Record<string, unknown> {
  const msg = error instanceof Error ? error.message : String(error)
  return {
    promptId: prompt.id,
    category: prompt.category,
    provider: process.env.AI_PROVIDER || 'ollama',
    model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
    stream,
    error: msg,
  }
}

export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmpPath, filePath)
}

export function readExistingResults(outputPath: string): Record<string, unknown>[] {
  if (!fs.existsSync(outputPath)) return []
  try {
    const summary = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as BenchmarkSummary
    if (Array.isArray(summary.results)) return summary.results
  } catch {
    // Eski format veya bozuk dosya: yeni başla.
  }
  return []
}

export function collectCompletedIds(results: Record<string, unknown>[]): Set<string> {
  const ids = new Set<string>()
  for (const r of results) {
    const promptId = r.promptId
    if (typeof promptId === 'string') {
      ids.add(promptId)
    }
  }
  return ids
}

export function mergeResults(
  existing: Record<string, unknown>[],
  newResults: Record<string, unknown>[],
): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>()
  for (const r of existing) {
    const promptId = r.promptId
    if (typeof promptId === 'string') {
      byId.set(promptId, r)
    }
  }
  for (const r of newResults) {
    const promptId = r.promptId
    if (typeof promptId === 'string') {
      byId.set(promptId, r)
    }
  }
  return Array.from(byId.values())
}

export function buildSummary(
  results: Record<string, unknown>[],
  fixtureCount: number,
  runCount: number,
  status: string,
): BenchmarkSummary {
  return {
    status,
    timestamp: new Date().toISOString(),
    environment: {
      provider: process.env.AI_PROVIDER || 'ollama',
      model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
      ollamaApiUrl: process.env.OLLAMA_API_URL,
    },
    fixtureCount,
    runCount,
    sampleCount: results.length,
    results,
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`PROMPT_TIMEOUT:${context}`)), ms)
    }),
  ])
}

async function main() {
  const args = parseCliArgs()
  const health = await checkOllama()
  if (!health.ok) {
    console.error('BENCHMARK_ABORTED:', health.message)
    console.error(`Lütfen Ollama'yi başlatın ve modeli indirin, ardından tekrar deneyin.`)
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    atomicWriteJson(
      path.join(REPORT_DIR, 'mentor-baseline-results.json'),
      {
        status: 'OLLAMA_UNAVAILABLE',
        message: health.message,
        timestamp: new Date().toISOString(),
      },
    )
    process.exit(1)
  }
  console.log(health.message)

  const allPrompts: FixturePrompt[] = JSON.parse(fs.readFileSync(args.fixturePath, 'utf8'))
  if (allPrompts.length < 30) {
    console.warn(`Uyarı: fixture yalnızca ${allPrompts.length} soru içeriyor. Beklenen en az 30.`)
  }

  let prompts = allPrompts.slice(0)
  if (args.startIndex) {
    prompts = prompts.slice(args.startIndex - 1)
  }
  if (args.category) {
    prompts = prompts.filter(p => p.category === args.category)
  }
  if (args.maxPrompts) {
    prompts = prompts.slice(0, args.maxPrompts)
  }

  if (prompts.length === 0) {
    console.warn('Filtreleme sonucunda çalıştırılacak prompt kalmadı.')
    process.exit(0)
  }

  const existingResults = args.resume ? readExistingResults(args.outputPath) : []
  const completedIds = collectCompletedIds(existingResults)
  const results: Record<string, unknown>[] = []

  let summary = buildSummary(
    mergeResults(existingResults, results),
    allPrompts.length,
    prompts.length,
    'IN_PROGRESS',
  )
  atomicWriteJson(args.outputPath, summary)

  const collector = new MentorTelemetryCollector(true)
  setGlobalMentorTelemetryCollector(collector)

  const app = await createApp()
  const email = `benchmark-${Date.now()}@localakademi.test`
  const user = await createTestUser(email, 'Benchmark User')
  const token = app.jwt.sign({ id: user.id, email: user.email, role: 'learner' })

  let interrupted = false
  const shutdown = async (signal: string) => {
    if (interrupted) return
    interrupted = true
    console.log(`\n${signal} alındı, mevcut sonuçlar kaydediliyor...`)
    summary = buildSummary(
      mergeResults(existingResults, results),
      allPrompts.length,
      prompts.length,
      'INTERRUPTED',
    )
    atomicWriteJson(args.outputPath, summary)
    try {
      await app.close()
    } catch {
      // ignore
    }
    process.exit(130)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  console.log('Benchmark başlıyor: non-stream sorular')
  if (args.resume) {
    console.log(`Resume: ${completedIds.size} prompt daha önce tamamlanmış, atlanıyor.`)
  }
  if (args.promptTimeoutMs) {
    console.log(`Prompt timeout: ${args.promptTimeoutMs}ms`)
  }

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    const label = `[${i + 1}/${prompts.length}] ${prompt.id}`

    if (completedIds.has(prompt.id)) {
      console.log(`${label} SKIPPED (resume: daha önce tamamlanmış)`)
      continue
    }

    console.log(`${label}: ${prompt.text}`)
    const promptStart = Date.now()
    let resultRecord: Record<string, unknown>
    try {
      let record: MentorTelemetryRecord | null
      if (args.promptTimeoutMs) {
        record = await withTimeout(
          runNonStreamPrompt(app, token, prompt),
          args.promptTimeoutMs,
          prompt.id,
        )
      } else {
        record = await runNonStreamPrompt(app, token, prompt)
      }
      resultRecord = buildResultRecord(prompt, record)
      const totalMs = Date.now() - promptStart
      const providerMs = typeof resultRecord.providerDurationMs === 'number' ? resultRecord.providerDurationMs : undefined
      console.log(`  SUCCESS: ${label} totalMs=${totalMs}${providerMs !== undefined ? ` providerMs=${providerMs}` : ''}`)
    } catch (err: unknown) {
      resultRecord = buildErrorRecord(prompt, err, false)
      const totalMs = Date.now() - promptStart
      console.log(`  ERROR: ${label} totalMs=${totalMs} error=${resultRecord.error}`)
    }
    results.push(resultRecord)

    summary = buildSummary(
      mergeResults(existingResults, results),
      allPrompts.length,
      prompts.length,
      'IN_PROGRESS',
    )
    atomicWriteJson(args.outputPath, summary)
    console.log(`  Yazıldı: ${args.outputPath}`)

    if (interrupted) break
    // Kısa duraklama: Ollama CPU'ya ve kuyruğa yük bindirmesin.
    await new Promise(r => setTimeout(r, 250))
  }

  if (!args.skipStream && !interrupted) {
    console.log('Benchmark: streaming ölçümü')
    const streamPrompts = prompts.filter(p => p.category === 'technical' || p.category === 'business').slice(0, 3)
    for (let i = 0; i < streamPrompts.length; i++) {
      const prompt = streamPrompts[i]
      const label = `[stream ${i + 1}/${streamPrompts.length}] ${prompt.id}`
      console.log(`${label}: ${prompt.text}`)
      const promptStart = Date.now()
      let resultRecord: Record<string, unknown>
      try {
        let record: MentorTelemetryRecord | null
        if (args.promptTimeoutMs) {
          record = await withTimeout(
            runStreamPrompt(app, token, prompt),
            args.promptTimeoutMs,
            `${prompt.id}-stream`,
          )
        } else {
          record = await runStreamPrompt(app, token, prompt)
        }
        resultRecord = buildResultRecord(prompt, record)
        resultRecord.promptId = `${prompt.id}-stream`
        resultRecord.stream = true
        const totalMs = Date.now() - promptStart
        const providerMs = typeof resultRecord.providerDurationMs === 'number' ? resultRecord.providerDurationMs : undefined
        console.log(`  SUCCESS: ${label} totalMs=${totalMs}${providerMs !== undefined ? ` providerMs=${providerMs}` : ''}`)
      } catch (err: unknown) {
        resultRecord = buildErrorRecord(prompt, err, true)
        resultRecord.promptId = `${prompt.id}-stream`
        const totalMs = Date.now() - promptStart
        console.log(`  ERROR: ${label} totalMs=${totalMs} error=${resultRecord.error}`)
      }
      results.push(resultRecord)

      summary = buildSummary(
        mergeResults(existingResults, results),
        allPrompts.length,
        prompts.length,
        'IN_PROGRESS',
      )
      atomicWriteJson(args.outputPath, summary)
      console.log(`  Yazıldı: ${args.outputPath}`)
      await new Promise(r => setTimeout(r, 250))
    }
  }

  if (!args.skipMemory && !interrupted) {
    console.log('Benchmark: memory içeren conversation')
    const promptStart = Date.now()
    let memoryRecord: Record<string, unknown> | null = null
    try {
      const record = await runMemoryConversation(app, token)
      if (record) {
        memoryRecord = {
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
          promptProfile: record.promptProfile,
          systemPromptCharacters: record.systemPromptCharacters,
          historyCharacters: record.historyCharacters,
          historyMessageCount: record.historyMessageCount,
          configuredMaxOutputTokens: record.configuredMaxOutputTokens,
          knowledgeContextCharacters: record.knowledgeContextCharacters,
          estimatedInputTokens: record.estimatedInputTokens,
          memoryCharacters: record.memoryCharacters,
          noRelevantKnowledgeFound: record.noRelevantKnowledgeFound,
          providerInputTokens: record.providerInputTokens,
          providerOutputTokens: record.providerOutputTokens,
          outputReviewDeferred: record.outputReviewDeferred,
          errorCode: record.errorCode,
          timeout: record.timeout,
          aborted: record.aborted,
        }
      } else {
        memoryRecord = {
          promptId: 'memory-conversation',
          category: 'memory',
          provider: process.env.AI_PROVIDER || 'ollama',
          model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
          stream: false,
          error: 'NO_TELEMETRY_RECORD',
        }
      }
      const totalMs = Date.now() - promptStart
      const providerMs = typeof memoryRecord.providerDurationMs === 'number' ? memoryRecord.providerDurationMs : undefined
      console.log(`  SUCCESS: memory-conversation totalMs=${totalMs}${providerMs !== undefined ? ` providerMs=${providerMs}` : ''}`)
    } catch (err: unknown) {
      memoryRecord = {
        promptId: 'memory-conversation',
        category: 'memory',
        provider: process.env.AI_PROVIDER || 'ollama',
        model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
        stream: false,
        error: err instanceof Error ? err.message : String(err),
      }
      const totalMs = Date.now() - promptStart
      console.log(`  ERROR: memory-conversation totalMs=${totalMs} error=${memoryRecord.error}`)
    }
    if (memoryRecord) {
      results.push(memoryRecord)
      summary = buildSummary(
        mergeResults(existingResults, results),
        allPrompts.length,
        prompts.length,
        'IN_PROGRESS',
      )
      atomicWriteJson(args.outputPath, summary)
      console.log(`  Yazıldı: ${args.outputPath}`)
    }
  }

  await app.close()

  summary = buildSummary(
    mergeResults(existingResults, results),
    allPrompts.length,
    prompts.length,
    interrupted ? 'INTERRUPTED' : 'OK',
  )
  atomicWriteJson(args.outputPath, summary)
  console.log(`Sonuçlar: ${args.outputPath}`)
  console.log('Benchmark tamamlandı.')
}

function isDirectExecution(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  const normalized = entry.replace(/\\/g, '/')
  return normalized.endsWith('benchmark-mentor.ts') || normalized.includes('benchmark-mentor')
}

if (isDirectExecution()) {
  main().catch(err => {
    console.error('Benchmark başarısız:', err)
    process.exit(1)
  })
}
