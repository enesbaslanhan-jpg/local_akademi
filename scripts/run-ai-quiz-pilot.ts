import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { generateQuizDraft } from '../src/services/quiz-generator'
import { evaluateGeneratedQuizQuality } from '../src/services/quiz-pilot-quality'

const prisma = new PrismaClient()
const root = resolve(import.meta.dirname, '..')
const reportPath = join(root, 'outputs', 'ai-quiz-pilot.json')
const pilotCodes = [
  'CUR-001-01',
  'KBX-OPS-001-B',
  'KBX-CYB-001-B',
]

type PilotItem = {
  koId: number
  code: string
  status: 'created' | 'skipped' | 'rejected' | 'failed'
  quizId?: string
  qualityScore?: number
  errorCode?: string
  validationIssues?: string[]
}

type PilotReport = {
  startedAt: string
  updatedAt: string
  completedAt?: string
  requested: number
  items: PilotItem[]
  contentStoredInReport: false
  allCreatedQuizzesRemainDraft: boolean
  pass: boolean
}

function readCheckpoint(): PilotReport {
  if (existsSync(reportPath)) {
    try {
      const parsed = JSON.parse(readFileSync(reportPath, 'utf8')) as PilotReport
      if (Array.isArray(parsed.items)) {
        parsed.requested = pilotCodes.length
        parsed.items = parsed.items.filter(item =>
          pilotCodes.includes(item.code)
        )
        return parsed
      }
    } catch {
      // A corrupt report is replaced; it never contains generated content.
    }
  }
  const now = new Date().toISOString()
  return {
    startedAt: now,
    updatedAt: now,
    requested: pilotCodes.length,
    items: [],
    contentStoredInReport: false,
    allCreatedQuizzesRemainDraft: true,
    pass: false,
  }
}

function save(report: PilotReport): void {
  report.updatedAt = new Date().toISOString()
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({
    processed: report.items.length,
    requested: report.requested,
    latest: report.items.at(-1),
    contentStoredInLog: false,
  }))
}

async function main(): Promise<void> {
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      requested: pilotCodes.length,
      codes: pilotCodes,
      createsOnlyDrafts: true,
    }))
    return
  }
  if (process.env.AI_QUIZ_GENERATOR_ENABLED !== 'true') {
    throw new Error('AI_QUIZ_GENERATOR_DISABLED')
  }
  const actor = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true },
    orderBy: { id: 'asc' },
  })
  if (!actor) throw new Error('PILOT_ADMIN_NOT_FOUND')

  const report = readCheckpoint()
  if (process.argv.includes('--retry-failed')) {
    report.items = report.items.filter(item =>
      item.status === 'created' || item.status === 'skipped'
    )
  }
  const completedCodes = new Set(report.items.map(item => item.code))
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
  const parsedLimit = Number(limitArg?.split('=')[1])
  const runLimit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(Math.floor(parsedLimit), pilotCodes.length))
    : pilotCodes.length
  let processedThisRun = 0
  for (const code of pilotCodes) {
    if (completedCodes.has(code)) continue
    if (processedThisRun >= runLimit) break
    processedThisRun++
    const ko = await prisma.knowledgeObject.findFirst({
      where: { code, status: 'published', isDemo: false },
      select: { id: true, code: true, title: true, content: true },
    })
    if (!ko || !ko.code) {
      report.items.push({
        koId: ko?.id || 0,
        code,
        status: 'failed',
        errorCode: 'PILOT_KO_NOT_FOUND',
      })
      save(report)
      continue
    }
    const existing = await prisma.quiz.findFirst({
      where: {
        koId: ko.id,
        status: 'draft',
        title: { startsWith: '[AI Pilot]' },
      },
      select: { id: true },
    })
    if (existing) {
      report.items.push({
        koId: ko.id,
        code,
        status: 'skipped',
        quizId: existing.id,
      })
      save(report)
      continue
    }

    try {
      const generated = await generateQuizDraft(ko)
      const quality = evaluateGeneratedQuizQuality(ko, generated)
      if (!quality.pass) {
        report.items.push({
          koId: ko.id,
          code,
          status: 'rejected',
          qualityScore: quality.score,
          errorCode: 'QUIZ_QUALITY_GATE_FAILED',
        })
        save(report)
        continue
      }
      const quiz = await prisma.$transaction(async tx => {
        const created = await tx.quiz.create({
          data: {
            koId: ko.id,
            title: `[AI Pilot] ${generated.title}`.slice(0, 200),
            passScore: generated.passScore,
            status: 'draft',
            questions: {
              create: generated.questions.map((question, index) => ({
                questionText: question.questionText,
                options: JSON.stringify(question.options),
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
                order: index + 1,
              })),
            },
          },
        })
        await tx.auditLog.create({
          data: {
            action: 'ai_quiz_pilot_draft_created',
            entityType: 'quiz',
            entityId: created.id,
            actorId: actor.id,
            actorName: actor.email,
            metadata: JSON.stringify({
              entityCode: ko.code,
              provider: 'ollama',
              qualityScore: quality.score,
            }),
          },
        })
        return created
      })
      report.items.push({
        koId: ko.id,
        code,
        status: 'created',
        quizId: quiz.id,
        qualityScore: quality.score,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const safeProviderCodes = new Set([
        'QUIZ_GENERATOR_PROVIDER_ERROR',
        'QUIZ_GENERATOR_EMPTY_RESPONSE',
        'QUIZ_GENERATOR_INVALID_JSON',
      ])
      const errorCode = safeProviderCodes.has(message)
        ? message
        : error instanceof Error && error.name === 'ZodError'
          ? 'QUIZ_SCHEMA_INVALID'
          : error instanceof Error && error.name === 'AbortError'
            ? 'QUIZ_GENERATOR_TIMEOUT'
            : 'QUIZ_GENERATION_FAILED'
      const validationIssues = Array.isArray(
        (error as { issues?: unknown }).issues,
      )
        ? (error as {
            issues: Array<{ path?: Array<string | number>; code?: string }>
          }).issues.slice(0, 10).map(issue =>
            `${issue.path?.join('.') || 'root'}:${issue.code || 'invalid'}`
          )
        : undefined
      report.items.push({
        koId: ko.id,
        code,
        status: 'failed',
        errorCode,
        validationIssues,
      })
    }
    save(report)
  }

  if (report.items.length < pilotCodes.length) {
    save(report)
    return
  }

  const createdIds = report.items
    .filter(item => item.quizId)
    .map(item => item.quizId!)
  const nonDraftCount = createdIds.length === 0
    ? 0
    : await prisma.quiz.count({
        where: { id: { in: createdIds }, status: { not: 'draft' } },
      })
  report.allCreatedQuizzesRemainDraft = nonDraftCount === 0
  report.completedAt = new Date().toISOString()
  report.pass =
    report.items.length === pilotCodes.length &&
    report.items.every(item =>
      item.status === 'created' || item.status === 'skipped'
    ) &&
    report.allCreatedQuizzesRemainDraft
  save(report)
  if (!report.pass) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(JSON.stringify({
      pass: false,
      errorCode: error instanceof Error ? error.message : 'QUIZ_PILOT_FAILED',
    }))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
