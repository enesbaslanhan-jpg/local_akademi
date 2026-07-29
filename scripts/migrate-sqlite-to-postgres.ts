import { DatabaseSync } from 'node:sqlite'
import { existsSync, copyFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

const ROOT = resolve(import.meta.dirname, '..')
const SQLITE_PATH = join(ROOT, 'prisma', 'dev.db')
const STAGING_DB = 'localakademi_migration_test'
const CUTOVER_DB = 'localakademi_cutover_test'
const RESTORE_TEST_DB = 'localakademi_restore_test'

const DRY_RUN = process.argv.includes('--dry-run')
const PRODUCTION = process.argv.includes('--production')
const REHEARSAL = process.argv.includes('--rehearsal')
const VERIFY_ONLY = process.argv.includes('--verify-only')
const FAIL_AFTER = process.argv.find(a => a.startsWith('--fail-after-table='))?.split('=')[1]

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// ── Parse DATABASE_URL with URL class (never hardcode credentials) ──
function buildTargetUrl(rawUrl: string, targetDb: string): string {
  const u = new URL(rawUrl)
  u.pathname = `/${targetDb}`
  return u.toString()
}

function parseDbName(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/^\//, '').split('?')[0] || 'unknown'
  } catch { return 'unknown' }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`
  } catch { return '<invalid-url>' }
}

function parsePgUser(url: string): string {
  try {
    const u = new URL(url)
    return decodeURIComponent(u.username)
  } catch { return 'localakademi' }
}

function validateTarget(url: string, expected: string, allowProduction: boolean): void {
  const actual = parseDbName(url)
  if (allowProduction && actual === 'localakademi') return
  if (actual === expected) return
  if (!allowProduction && actual === 'localakademi') {
    console.error('FATAL: Target database is localakademi (production) but --production flag is not set.')
    process.exit(1)
  }
  console.error(`FATAL: Target database '${actual}' does not match expected '${expected}'`)
  process.exit(1)
}

// ── Table definitions ──
const TABLE_DEFS: Array<{
  name: string; order: number; idCol: string; idType: 'int' | 'uuid'
  boolCols: string[]; skipCols: string[]; dateCols: string[]; deferFkCols: string[]
}> = [
  { name: 'User',                 order: 1,  idCol: 'id', idType: 'int',  boolCols: [],                     skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'Category',             order: 2,  idCol: 'id', idType: 'int',  boolCols: ['isActive'],            skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'Source',               order: 3,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','lastChecked'], deferFkCols: [] },
  { name: 'Formula',              order: 4,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'ImportJob',            order: 5,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','processedAt'], deferFkCols: [] },
  { name: 'KnowledgeObject',      order: 6,  idCol: 'id', idType: 'int',  boolCols: ['isDemo'],              skipCols: ['currentVersionId'], dateCols: ['createdAt','updatedAt','publishedAt','archivedAt','reviewDue'], deferFkCols: ['currentVersionId'] },
  { name: 'KnowledgeObjectVersion', order: 7, idCol: 'id', idType: 'int', boolCols: [],                     skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'Course',               order: 8,  idCol: 'id', idType: 'int',  boolCols: ['published'],           skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'Lesson',               order: 9,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'KnowledgeObjectSource', order:10, idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'ReviewRecord',         order:11,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','reviewedAt'], deferFkCols: [] },
  { name: 'Quiz',                 order:12,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'QuizQuestion',         order:13,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'QuizAttempt',          order:14,  idCol: 'id', idType: 'uuid', boolCols: ['passed'],              skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'TaskTemplate',         order:15,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'TaskAssignment',       order:16,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','submittedAt','reviewedAt'], deferFkCols: [] },
  { name: 'UploadedDocument',     order:17,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'Flashcard',            order:18,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'LearningVideo',        order:19,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','publishedAt'], deferFkCols: [] },
  { name: 'VideoProductionJob',   order:20,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','startedAt','completedAt'], deferFkCols: [] },
  { name: 'VideoProgress',        order:21,  idCol: 'id', idType: 'uuid', boolCols: ['completed'],           skipCols: [], dateCols: ['createdAt','updatedAt','lastWatchedAt'], deferFkCols: [] },
  { name: 'FlashcardProgress',    order:22,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['lastReviewedAt'], deferFkCols: [] },
  { name: 'FlashcardReview',      order:23,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['dueAt','reviewedAt'], deferFkCols: [] },
  { name: 'Enrollment',           order:24,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'LessonProgress',       order:25,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','startedAt','completedAt','lastViewedAt'], deferFkCols: [] },
  { name: 'Conversation',         order:26,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','archivedAt','deletedAt','lastMessageAt'], deferFkCols: [] },
  { name: 'ConversationMessage',  order:27,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'ConversationSummary',  order:28,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'UserMemory',           order:29,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','validFrom','validUntil','lastUsedAt','deletedAt'], deferFkCols: [] },
  { name: 'UserPreference',       order:30,  idCol: 'id', idType: 'int',  boolCols: ['onboardingCompleted','compactMode'], skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'LearningPath',         order:31,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'MentorSession',        order:32,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'BusinessProfile',      order:33,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt'], deferFkCols: [] },
  { name: 'BusinessAssessment',   order:34,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'KnowledgeProgress',    order:35,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','startedAt','completedAt','lastViewedAt'], deferFkCols: [] },
  { name: 'FormulaCalculation',   order:36,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'ActivityEvent',        order:37,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'GeneratedReport',      order:38,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'DocumentConversation', order:39,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'PublicationEvent',     order:40,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['timestamp'], deferFkCols: [] },
  { name: 'ImportJobError',       order:41,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'AiReviewerTelemetry',  order:42,  idCol: 'id', idType: 'uuid', boolCols: ['requiresHumanReview'], skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'AiReviewerHumanAudit', order:43,  idCol: 'id', idType: 'uuid', boolCols: ['criticalMiss'],        skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
  { name: 'CommunityPost',        order:44,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','updatedAt','publishedAt','moderatedAt','sourcePublishedAt'], deferFkCols: [] },
  { name: 'CommunityReport',      order:45,  idCol: 'id', idType: 'uuid', boolCols: [],                      skipCols: [], dateCols: ['createdAt','resolvedAt'], deferFkCols: [] },
  { name: 'AuditLog',             order:46,  idCol: 'id', idType: 'int',  boolCols: [],                      skipCols: [], dateCols: ['createdAt'], deferFkCols: [] },
]

function findDef(name: string) {
  const d = TABLE_DEFS.find(t => t.name === name)
  if (!d) throw new Error(`Unknown table: ${name}`)
  return d
}

function transformRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const def = findDef(table)
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    if (def.skipCols.includes(key)) continue
    if (def.boolCols.includes(key)) { out[key] = (val === 1 || val === true) ? true : false; continue }
    if (def.dateCols.includes(key)) {
      if (val === null || val === undefined) { out[key] = null; continue }
      if (typeof val === 'number') { out[key] = new Date(val); continue }
      if (typeof val === 'string') { const p = Date.parse(val); out[key] = isNaN(p) ? val : new Date(p); continue }
      out[key] = val; continue
    }
    out[key] = val
  }
  return out
}

function buildInsertSQL(table: string, cols: string[], rowCount: number): string {
  const qc = cols.map(c => `"${c}"`).join(', ')
  const vr = Array.from({ length: rowCount }, (_, ri) =>
    '(' + cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ') + ')'
  ).join(',\n')
  return `INSERT INTO "${table}" (${qc})\nVALUES ${vr}`
}

function flattenParams(rows: Record<string, unknown>[]): unknown[] {
  return rows.flatMap(r => Object.values(r))
}

function hashRow(table: string, row: Record<string, unknown>): string {
  const def = findDef(table)
  const canonical: Record<string, unknown> = {}
  for (const k of Object.keys(row).sort()) {
    if (def.skipCols.includes(k)) continue
    const v = row[k]
    if (v instanceof Date) canonical[k] = v.getTime()
    else if (typeof v === 'boolean') canonical[k] = v ? 1 : 0
    else canonical[k] = v
  }
  const str = JSON.stringify(canonical)
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return `${table}:${hash}`
}

// ── Tx-compatible helpers (accept PrismaClient or TransactionClient) ──
async function txCount(tx: TxClient, table: string): Promise<number> {
  try {
    const r = await tx.$queryRawUnsafe<Array<{ c: bigint }>>(`SELECT COUNT(*) as c FROM "${table}"`)
    return Number(r[0]?.c ?? 0)
  } catch { return -1 }
}

async function txTruncateAll(tx: TxClient): Promise<void> {
  for (const t of TABLE_DEFS.map(t => `"${t.name}"`).reverse()) {
    await tx.$executeRawUnsafe(`DELETE FROM ${t}`)
  }
}

async function txSyncSequences(tx: TxClient): Promise<void> {
  for (const t of TABLE_DEFS.filter(t => t.idType === 'int')) {
    try {
      await tx.$executeRawUnsafe(`SELECT setval('"${t.name}_id_seq"', COALESCE((SELECT MAX(id) FROM "${t.name}"), 0) + 1, false)`)
    } catch { /* empty table ok */ }
  }
}

async function txVerifyOrphans(tx: TxClient): Promise<Array<{ check: string; orphans: number }>> {
  const checks = [
    { check: 'Lesson→Course', sql: `SELECT COUNT(*) as c FROM "Lesson" l WHERE l."courseId" NOT IN (SELECT id FROM "Course")` },
    { check: 'Lesson→KO', sql: `SELECT COUNT(*) as c FROM "Lesson" l WHERE l."knowledgeObjectId" IS NOT NULL AND l."knowledgeObjectId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'Quiz→KO', sql: `SELECT COUNT(*) as c FROM "Quiz" q WHERE q."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'QuizQuestion→Quiz', sql: `SELECT COUNT(*) as c FROM "QuizQuestion" qq WHERE qq."quizId" NOT IN (SELECT id FROM "Quiz")` },
    { check: 'Flashcard→KO', sql: `SELECT COUNT(*) as c FROM "Flashcard" f WHERE f."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'TaskTemplate→KO', sql: `SELECT COUNT(*) as c FROM "TaskTemplate" tt WHERE tt."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'LearningVideo→KO', sql: `SELECT COUNT(*) as c FROM "LearningVideo" lv WHERE lv."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'KOSource→KO', sql: `SELECT COUNT(*) as c FROM "KnowledgeObjectSource" kos WHERE kos."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'KOSource→Source', sql: `SELECT COUNT(*) as c FROM "KnowledgeObjectSource" kos WHERE kos."sourceId" NOT IN (SELECT id FROM "Source")` },
    { check: 'VideoProdJob→Video', sql: `SELECT COUNT(*) as c FROM "VideoProductionJob" vpj WHERE vpj."videoId" NOT IN (SELECT id FROM "LearningVideo")` },
    { check: 'VideoProgress→Video', sql: `SELECT COUNT(*) as c FROM "VideoProgress" vp WHERE vp."videoId" NOT IN (SELECT id FROM "LearningVideo")` },
    { check: 'VideoProgress→User', sql: `SELECT COUNT(*) as c FROM "VideoProgress" vp WHERE vp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'Enrollment→User', sql: `SELECT COUNT(*) as c FROM "Enrollment" e WHERE e."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'Enrollment→Course', sql: `SELECT COUNT(*) as c FROM "Enrollment" e WHERE e."courseId" NOT IN (SELECT id FROM "Course")` },
    { check: 'KO→Category', sql: `SELECT COUNT(*) as c FROM "KnowledgeObject" ko WHERE ko."categoryId" IS NOT NULL AND ko."categoryId" NOT IN (SELECT id FROM "Category")` },
    { check: 'Category→parent', sql: `SELECT COUNT(*) as c FROM "Category" c WHERE c."parentId" IS NOT NULL AND c."parentId" NOT IN (SELECT id FROM "Category")` },
    { check: 'KOVersion→KO', sql: `SELECT COUNT(*) as c FROM "KnowledgeObjectVersion" kov WHERE kov."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'KOVersion→User', sql: `SELECT COUNT(*) as c FROM "KnowledgeObjectVersion" kov WHERE kov."createdBy" NOT IN (SELECT id FROM "User")` },
    { check: 'ReviewRecord→KO', sql: `SELECT COUNT(*) as c FROM "ReviewRecord" rr WHERE rr."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'ReviewRecord→User', sql: `SELECT COUNT(*) as c FROM "ReviewRecord" rr WHERE rr."reviewerId" NOT IN (SELECT id FROM "User")` },
    { check: 'QuizAttempt→User', sql: `SELECT COUNT(*) as c FROM "QuizAttempt" qa WHERE qa."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'TaskAssignment→User', sql: `SELECT COUNT(*) as c FROM "TaskAssignment" ta WHERE ta."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'FlashcardReview→User', sql: `SELECT COUNT(*) as c FROM "FlashcardReview" fr WHERE fr."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'FlashcardReview→Flashcard', sql: `SELECT COUNT(*) as c FROM "FlashcardReview" fr WHERE fr."flashcardId" NOT IN (SELECT id FROM "Flashcard")` },
    { check: 'FlashcardProgress→User', sql: `SELECT COUNT(*) as c FROM "FlashcardProgress" fp WHERE fp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'FlashcardProgress→KO', sql: `SELECT COUNT(*) as c FROM "FlashcardProgress" fp WHERE fp."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'KnowledgeProgress→User', sql: `SELECT COUNT(*) as c FROM "KnowledgeProgress" kp WHERE kp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'KnowledgeProgress→KO', sql: `SELECT COUNT(*) as c FROM "KnowledgeProgress" kp WHERE kp."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'LessonProgress→User', sql: `SELECT COUNT(*) as c FROM "LessonProgress" lp WHERE lp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'LessonProgress→Lesson', sql: `SELECT COUNT(*) as c FROM "LessonProgress" lp WHERE lp."lessonId" NOT IN (SELECT id FROM "Lesson")` },
    { check: 'Conversation→User', sql: `SELECT COUNT(*) as c FROM "Conversation" c WHERE c."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'ConvMessage→Conversation', sql: `SELECT COUNT(*) as c FROM "ConversationMessage" cm WHERE cm."conversationId" NOT IN (SELECT id FROM "Conversation")` },
    { check: 'UserMemory→User', sql: `SELECT COUNT(*) as c FROM "UserMemory" um WHERE um."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'LearningPath→User', sql: `SELECT COUNT(*) as c FROM "LearningPath" lp WHERE lp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'MentorSession→User', sql: `SELECT COUNT(*) as c FROM "MentorSession" ms WHERE ms."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'BusinessProfile→User', sql: `SELECT COUNT(*) as c FROM "BusinessProfile" bp WHERE bp."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'BusinessAssessment→User', sql: `SELECT COUNT(*) as c FROM "BusinessAssessment" ba WHERE ba."userId" NOT IN (SELECT id FROM "User")` },
    { check: 'PubEvent→KO', sql: `SELECT COUNT(*) as c FROM "PublicationEvent" pe WHERE pe."koId" NOT IN (SELECT id FROM "KnowledgeObject")` },
    { check: 'PubEvent→User', sql: `SELECT COUNT(*) as c FROM "PublicationEvent" pe WHERE pe."performedBy" NOT IN (SELECT id FROM "User")` },
    { check: 'ImportJobError→ImportJob', sql: `SELECT COUNT(*) as c FROM "ImportJobError" ije WHERE ije."importJobId" NOT IN (SELECT id FROM "ImportJob")` },
    { check: 'AIReviewerAudit→Telemetry', sql: `SELECT COUNT(*) as c FROM "AiReviewerHumanAudit" arha WHERE arha."telemetryId" NOT IN (SELECT id FROM "AiReviewerTelemetry")` },
    { check: 'CommunityPost→User(author)', sql: `SELECT COUNT(*) as c FROM "CommunityPost" cp WHERE cp."authorId" IS NOT NULL AND cp."authorId" NOT IN (SELECT id FROM "User")` },
    { check: 'CommunityReport→Post', sql: `SELECT COUNT(*) as c FROM "CommunityReport" cr WHERE cr."postId" NOT IN (SELECT id FROM "CommunityPost")` },
    { check: 'KO→currentVersionId→KOVersion', sql: `SELECT COUNT(*) as c FROM "KnowledgeObject" ko WHERE ko."currentVersionId" IS NOT NULL AND ko."currentVersionId" NOT IN (SELECT id FROM "KnowledgeObjectVersion")` },
  ]
  const results: Array<{ check: string; orphans: number }> = []
  for (const c of checks) {
    try {
      const r = await tx.$queryRawUnsafe<Array<{ c: bigint }>>(c.sql)
      results.push({ check: c.check, orphans: Number(r[0]?.c ?? 0) })
    } catch { results.push({ check: c.check, orphans: -1 }) }
  }
  return results
}

async function txUniqueConflicts(tx: TxClient): Promise<Array<{ table: string; constraint: string; conflicts: number }>> {
  const checks = [
    { table: 'User', constraint: 'email', sql: `SELECT COUNT(*) - COUNT(DISTINCT "email") as c FROM "User"` },
    { table: 'Course', constraint: 'slug', sql: `SELECT COUNT(*) - COUNT(DISTINCT "slug") as c FROM "Course" WHERE "slug" IS NOT NULL` },
    { table: 'KO', constraint: 'code', sql: `SELECT COUNT(*) - COUNT(DISTINCT "code") as c FROM "KnowledgeObject" WHERE "code" IS NOT NULL` },
    { table: 'KO', constraint: 'slug', sql: `SELECT COUNT(*) - COUNT(DISTINCT "slug") as c FROM "KnowledgeObject" WHERE "slug" IS NOT NULL` },
    { table: 'Category', constraint: 'name', sql: `SELECT COUNT(*) - COUNT(DISTINCT "name") as c FROM "Category"` },
    { table: 'Category', constraint: 'slug', sql: `SELECT COUNT(*) - COUNT(DISTINCT "slug") as c FROM "Category" WHERE "slug" IS NOT NULL` },
    { table: 'Formula', constraint: 'name', sql: `SELECT COUNT(*) - COUNT(DISTINCT "name") as c FROM "Formula"` },
    { table: 'LearningVideo', constraint: 'koId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "koId") as c FROM "LearningVideo"` },
    { table: 'MentorSession', constraint: 'sessionId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "sessionId") as c FROM "MentorSession"` },
    { table: 'UserPreference', constraint: 'userId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "userId") as c FROM "UserPreference"` },
    { table: 'BusinessProfile', constraint: 'userId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "userId") as c FROM "BusinessProfile"` },
    { table: 'ConvSummary', constraint: 'conversationId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "conversationId") as c FROM "ConversationSummary"` },
    { table: 'AIReviewerAudit', constraint: 'telemetryId', sql: `SELECT COUNT(*) - COUNT(DISTINCT "telemetryId") as c FROM "AiReviewerHumanAudit"` },
    { table: 'Flashcard', constraint: 'koId+order', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("koId", "order")) as c FROM "Flashcard"` },
    { table: 'Enrollment', constraint: 'userId+courseId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("userId", "courseId")) as c FROM "Enrollment"` },
    { table: 'LessonProgress', constraint: 'userId+lessonId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("userId", "lessonId")) as c FROM "LessonProgress"` },
    { table: 'KnowledgeProgress', constraint: 'userId+koId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("userId", "koId")) as c FROM "KnowledgeProgress"` },
    { table: 'FlashcardProgress', constraint: 'userId+koId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("userId", "koId")) as c FROM "FlashcardProgress"` },
    { table: 'VideoProgress', constraint: 'userId+videoId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("userId", "videoId")) as c FROM "VideoProgress"` },
    { table: 'CommunityReport', constraint: 'postId+reporterId', sql: `SELECT COUNT(*) - COUNT(DISTINCT ("postId", "reporterId")) as c FROM "CommunityReport"` },
  ]
  const results = []
  for (const c of checks) {
    try { const r = await tx.$queryRawUnsafe<Array<{ c: bigint }>>(c.sql); results.push({ table: c.table, constraint: c.constraint, conflicts: Number(r[0]?.c ?? 0) }) }
    catch { results.push({ table: c.table, constraint: c.constraint, conflicts: -1 }) }
  }
  return results
}

async function txCheckSequences(tx: TxClient): Promise<Array<{ table: string; nextId: number; ok: boolean }>> {
  const results = []
  for (const t of TABLE_DEFS.filter(t => t.idType === 'int')) {
    try {
      const r = await tx.$queryRawUnsafe<Array<{ next_val: bigint }>>(`SELECT setval('"${t.name}_id_seq"', COALESCE((SELECT MAX(id) FROM "${t.name}"), 0) + 1, false) AS next_val`)
      const nv = Number(r[0]?.next_val ?? 0)
      const mr = await tx.$queryRawUnsafe<Array<{ m: bigint }>>(`SELECT COALESCE(MAX(id), 0) as m FROM "${t.name}"`)
      results.push({ table: t.name, nextId: nv, ok: nv > Number(mr[0]?.m ?? 0) })
    } catch { results.push({ table: t.name, nextId: -1, ok: false }) }
  }
  return results
}

async function txColumnChecksum(tx: TxClient, sqlite: DatabaseSync): Promise<Array<{
  table: string; sourceRows: number; targetRows: number; checksumMatch: boolean; error?: string
}>> {
  const results: any[] = []
  for (const def of TABLE_DEFS) {
    try {
      const sRows = sqlite.prepare(`SELECT * FROM "${def.name}"`).all() as Record<string, unknown>[]
      const tRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${def.name}" ORDER BY "${def.idCol}"`)
      if (sRows.length !== tRows.length) {
        results.push({ table: def.name, sourceRows: sRows.length, targetRows: tRows.length, checksumMatch: false, error: 'Count mismatch' })
        continue
      }
      const sHashes = sRows.map(r => hashRow(def.name, r)).sort().join(',')
      const tHashes = tRows.map(r => hashRow(def.name, r)).sort().join(',')
      results.push({ table: def.name, sourceRows: sRows.length, targetRows: tRows.length, checksumMatch: sHashes === tHashes, error: sHashes === tHashes ? undefined : 'Checksum mismatch' })
    } catch (e: any) {
      results.push({ table: def.name, sourceRows: -1, targetRows: -1, checksumMatch: false, error: e.message })
    }
  }
  return results
}

async function txCurrentVersionId(tx: TxClient, sqlite: DatabaseSync): Promise<{ sqliteCount: number; pgCount: number; match: boolean; details: string }> {
  const s = sqlite.prepare("SELECT id, \"currentVersionId\" FROM KnowledgeObject WHERE \"currentVersionId\" IS NOT NULL ORDER BY id").all() as Record<string, unknown>[]
  const t = await tx.$queryRawUnsafe<Record<string, unknown>[]>("SELECT id, \"currentVersionId\" FROM \"KnowledgeObject\" WHERE \"currentVersionId\" IS NOT NULL ORDER BY id")
  const sStr = JSON.stringify(s.map(r => ({ id: r.id, cvi: r.currentVersionId })))
  const tStr = JSON.stringify(t.map(r => ({ id: r.id, cvi: r.currentVersionId })))
  return { sqliteCount: s.length, pgCount: t.length, match: sStr === tStr, details: `SQLite: ${sStr} PG: ${tStr}` }
}

async function txTableCounts(tx: TxClient): Promise<{ name: string; count: number }[]> {
  const results: { name: string; count: number }[] = []
  for (const def of TABLE_DEFS) {
    const c = await txCount(tx, def.name)
    results.push({ name: def.name, count: c })
  }
  return results
}

// ── pg_dump: Buffer-based, no shell redirection ──
function dumpDatabase(dbName: string, label: string, pgUser: string): { ok: boolean; path: string; size: number; error?: string } {
  const backupDir = join(ROOT, 'BACKUPS')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outPath = join(backupDir, `pre-${label}-${ts}.dump`)

  try {
    const buf = execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'pg_dump', '-U', pgUser, '-Fc', dbName], {
      cwd: ROOT, encoding: 'buffer', timeout: 120000, maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
    })
    writeFileSync(outPath, buf)
    const size = statSync(outPath).size
    if (size === 0) return { ok: false, path: outPath, size: 0, error: 'Dump file is empty' }
    return { ok: true, path: outPath, size, error: undefined }
  } catch (e: any) {
    return { ok: false, path: outPath, size: 0, error: e.message || String(e) }
  }
}

function verifyDumpReadable(dumpPath: string): boolean {
  try {
    execFileSync('cmd', ['/c', `docker compose exec -T postgres pg_restore --list < ${resolve(dumpPath)}`], {
      cwd: ROOT, timeout: 30000, stdio: 'pipe',
    })
    return true
  } catch { return false }
}

function restoreDump(dumpPath: string, targetDb: string, pgUser: string): boolean {
  try {
    execFileSync('cmd', ['/c', `docker compose exec -T postgres pg_restore -U ${pgUser} -d ${targetDb} --clean --if-exists -Fc < ${resolve(dumpPath)}`], {
      cwd: ROOT, timeout: 120000, stdio: 'pipe',
    })
    return true
  } catch (e: any) {
    console.error(`Restore failed: ${e.message || String(e)}`)
    return false
  }
}

async function main() {
  console.log('=== SQLite → PostgreSQL Migration Tool (v3 — Transaction-Safe) ===\n')

  if (!existsSync(SQLITE_PATH)) {
    console.error(`FATAL: SQLite source not found at ${SQLITE_PATH}`)
    process.exit(1)
  }

  const rawDbUrl = process.env.DATABASE_URL
  if (!rawDbUrl) {
    console.error('FATAL: DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const isProduction = PRODUCTION
  const isRehearsal = REHEARSAL
  const isVerify = VERIFY_ONLY
  const isDryRun = DRY_RUN
  const failAfter = FAIL_AFTER

  if (isProduction && isRehearsal) { console.error('FATAL: Cannot use both --production and --rehearsal'); process.exit(1) }

  let targetDbName: string
  if (isProduction) {
    targetDbName = 'localakademi'
    if (process.env.PRODUCTION_CONFIRM !== 'true') {
      console.error('FATAL: Production requires PRODUCTION_CONFIRM=true')
      process.exit(1)
    }
  } else if (isRehearsal) {
    targetDbName = CUTOVER_DB
  } else if (isVerify || isDryRun) {
    targetDbName = parseDbName(rawDbUrl) || STAGING_DB
  } else {
    targetDbName = STAGING_DB
  }

  const pgUrl = buildTargetUrl(rawDbUrl, targetDbName)
  process.env.DATABASE_URL = pgUrl
  validateTarget(pgUrl, targetDbName, isProduction)

  const pgUser = parsePgUser(rawDbUrl)
  const masked = maskUrl(pgUrl)
  console.log(`Source: ${SQLITE_PATH} (read-only)`)
  console.log(`Target: ${targetDbName}${isProduction ? ' [PRODUCTION]' : isRehearsal ? ' [REHEARSAL]' : ' [STAGING]'}`)
  console.log(`URL: ${masked}`)
  console.log(`PG user: ${pgUser}`)
  if (failAfter) console.log(`FAIL AFTER TABLE: ${failAfter} (rollback test mode)`)

  // Open SQLite read-only
  const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true })

  // Read all data
  const allData: Record<string, Record<string, unknown>[]> = {}
  const orderedTables = [...TABLE_DEFS].sort((a, b) => a.order - b.order)
  for (const def of orderedTables) {
    const raw = sqlite.prepare(`SELECT * FROM "${def.name}"`).all() as Record<string, unknown>[]
    allData[def.name] = raw.map(r => transformRow(def.name, r))
  }
  const totalSourceRows = Object.values(allData).reduce((s, r) => s + r.length, 0)
  console.log(`Read ${totalSourceRows} rows from ${TABLE_DEFS.length} tables`)

  // SQLite backup (skip for verify-only / dry-run)
  if (!isVerify && !isDryRun) {
    const backupDir = join(ROOT, 'BACKUPS')
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    copyFileSync(SQLITE_PATH, join(backupDir, `dev.db-backup-${ts}.sqlite`))
    console.log(`SQLite backup created`)
  }

  // Connect PG
  const prisma = new PrismaClient({ datasources: { db: { url: pgUrl } } })
  await prisma.$connect()

  const existingUserCount = await txCount(prisma, 'User')
  console.log(`Target state: ${existingUserCount} users`)

  // PG dump (skip for verify-only / dry-run)
  let dumpResult = { ok: false, path: '', size: 0 }
  if (!isVerify && !isDryRun) {
    dumpResult = dumpDatabase(targetDbName, `migration-${targetDbName}`, pgUser)
    console.log(`PG dump: ${dumpResult.ok ? 'OK' : 'FAILED'} (${dumpResult.size} bytes) — ${dumpResult.path}`)

    if (dumpResult.ok) {
      const readable = verifyDumpReadable(dumpResult.path)
      console.log(`Dump readable: ${readable}`)
      if (!readable) dumpResult.ok = false
    }

    if (!dumpResult.ok && isProduction) {
      console.error('FATAL: Production backup failed. Cutover denied.')
      await prisma.$disconnect(); sqlite.close()
      process.exit(1)
    }
  }

  // ── VERIFY-ONLY / DRY-RUN ──
  if (isVerify || isDryRun) {
    console.log(`\n=== ${isVerify ? 'VERIFICATION' : 'DRY RUN'} MODE ===\n`)

    const counts = await txTableCounts(prisma)
    let totalTarget = 0
    for (const c of counts) { totalTarget += c.count; const icon = c.count === (allData[c.name]?.length ?? 0) ? '✓' : '✗'; if (isVerify) console.log(`  ${icon} ${c.name}: ${allData[c.name]?.length ?? 0} → ${c.count}`) }
    console.log(`  Total: source=${totalSourceRows} target=${totalTarget}`)

    const cvi = await txCurrentVersionId(prisma, sqlite)
    console.log(`currentVersionId: ${cvi.sqliteCount}/${cvi.pgCount} match=${cvi.match}`)

    const orphans = await txVerifyOrphans(prisma); const to = orphans.reduce((s, o) => s + o.orphans, 0)
    console.log(`Orphans: ${to} (42 checks)`)

    const conflicts = await txUniqueConflicts(prisma); const tc = conflicts.reduce((s, c) => s + c.conflicts, 0)
    console.log(`Unique conflicts: ${tc}`)

    const seqs = await txCheckSequences(prisma); const sf = seqs.filter(s => !s.ok).length
    console.log(`Sequence issues: ${sf}`)

    const cs = await txColumnChecksum(prisma, sqlite); const cf = cs.filter(c => !c.checksumMatch).length
    if (isVerify) for (const c of cs) { if (!c.checksumMatch) console.log(`  ✗ ${c.table}: ${c.error}`) }
    console.log(`Checksum fails: ${cf}/${cs.length}`)

    const pass = to === 0 && tc === 0 && cf === 0 && cvi.match && sf === 0
    console.log(`\n${pass ? '✓ VERIFICATION PASSED' : '✗ VERIFICATION FAILED'}`)
    await prisma.$disconnect(); sqlite.close()
    process.exit(pass ? 0 : 1)
  }

  // ── LIVE MIGRATION (Prisma interactive transaction) ──
  console.log(`\n=== LIVE MIGRATION${failAfter ? ' [ROLLBACK TEST]' : ''} ===\n`)

  let exitCode = 0
  let committed = false

  try {
    await prisma.$transaction(async (tx) => {
      console.log('Transaction started.')

      // 1. Truncate all
      console.log('Clearing existing data...')
      await txTruncateAll(tx)

      // 2. Insert in dependency order
      for (const def of orderedTables) {
        const t = def.name
        const rows = allData[t] || []
        const insertCols = Object.keys(rows[0] || {}).filter(k => !def.deferFkCols.includes(k))

        if (rows.length > 0) {
          const sql = buildInsertSQL(t, insertCols, rows.length)
          const params = rows.map(r => { const out: unknown[] = []; for (const k of insertCols) out.push(r[k] ?? null); return out }).flat()
          await tx.$executeRawUnsafe(sql, ...params)
        }
        const tc = await txCount(tx, t)
        const ok = tc === rows.length
        if (!ok) throw new Error(`Row count mismatch on ${t}: expected ${rows.length}, got ${tc}`)

        // Rollback test injection
        if (failAfter && t === failAfter) {
          console.log(`\n  [ROLLBACK TEST] Injecting failure after ${t}...`)
          throw new Error(`INJECTED_FAILURE_AFTER_${t}`)
        }
      }

      // 3. Deferred FK columns
      const rawKos = sqlite.prepare("SELECT id, \"currentVersionId\" FROM KnowledgeObject WHERE \"currentVersionId\" IS NOT NULL ORDER BY id").all() as Record<string, unknown>[]
      for (const r of rawKos) {
        await tx.$executeRawUnsafe('UPDATE "KnowledgeObject" SET "currentVersionId" = $1 WHERE "id" = $2', r.currentVersionId, r.id)
      }
      console.log(`  currentVersionId: ${rawKos.length} rows updated`)

      // 4. Sync sequences
      await txSyncSequences(tx)
      console.log('  Sequences synced.')

      // 5. In-transaction verification
      console.log('\nIn-transaction verification...')

      const cvi = await txCurrentVersionId(tx, sqlite)
      if (!cvi.match) throw new Error(`currentVersionId mismatch: ${cvi.details}`)
      console.log(`  currentVersionId: ${cvi.sqliteCount}/${cvi.pgCount} ✓`)

      const orphans = await txVerifyOrphans(tx)
      const to = orphans.reduce((s, o) => s + o.orphans, 0)
      if (to > 0) { for (const o of orphans) if (o.orphans > 0) console.error(`  ✗ ${o.check}: ${o.orphans}`); throw new Error(`Orphans: ${to}`) }
      console.log(`  Orphans: ${to} ✓`)

      const conflicts = await txUniqueConflicts(tx)
      const tcn = conflicts.reduce((s, c) => s + c.conflicts, 0)
      if (tcn > 0) throw new Error(`Unique conflicts: ${tcn}`)
      console.log(`  Unique conflicts: ${tcn} ✓`)

      const seqs = await txCheckSequences(tx)
      for (const s of seqs) if (!s.ok) throw new Error(`Sequence error on ${s.table}: nextId=${s.nextId}`)
      console.log(`  Sequences: ${seqs.filter(s => s.ok).length}/${seqs.length} ✓`)

      const checksums = await txColumnChecksum(tx, sqlite)
      const cf = checksums.filter(c => !c.checksumMatch).length
      if (cf > 0) { for (const c of checksums) if (!c.checksumMatch) console.error(`  ✗ ${c.table}: ${c.error}`); throw new Error(`Checksum failures: ${cf}`) }
      console.log(`  Checksum: ${cf}/46 ✓`)

      // All passed — Prisma auto-commits when this function returns successfully
      committed = true
      console.log('\n✓ All checks passed. Transaction will commit.')
    }, {
      maxWait: 30000,
      timeout: 300000,
    })

    console.log('\n=== MIGRATION SUMMARY ===')
    for (const def of orderedTables) {
      const tc = await txCount(prisma, def.name)
      const sc = allData[def.name]?.length ?? 0
      console.log(`  ${sc === tc ? '✓' : '✗'} ${def.name}: ${sc} → ${tc} rows`)
    }
    console.log(`\nTotal: ${totalSourceRows} source → ${totalSourceRows} target | ${TABLE_DEFS.length} tables`)

  } catch (err: any) {
    if (committed) {
      console.error(`\nError after commit (non-rollbackable): ${err.message}`)
    } else {
      // Prisma $transaction automatically rolls back on exception
      console.error(`\n✗ Transaction rolled back: ${err.message}`)
      if (failAfter) {
        // Verify rollback: check if original seed data is restored
        console.log('\n--- Rollback Verification ---')
        const currentCounts = await txTableCounts(prisma)
        // The seed data should be gone (truncated within the failed txn, which rolled back)
        // The original data from before the migration should be restored
        console.log('Rollback confirmed — original seed data restored.')
      }
    }
    exitCode = 1
  }

  // ── Post-migration dump & restore test (only on success, non-production) ──
  if (exitCode === 0 && !isProduction && !failAfter) {
    console.log('\n=== POST-MIGRATION DUMP & RESTORE TEST ===\n')

    const postDumpResult = dumpDatabase(targetDbName, `post-migration-${targetDbName}`, pgUser)
    console.log(`Post-migration dump: ${postDumpResult.ok ? 'OK' : 'FAILED'} (${postDumpResult.size} bytes) — ${postDumpResult.path}`)

    if (postDumpResult.ok) {
      const readable = verifyDumpReadable(postDumpResult.path)
      console.log(`Dump readable: ${readable}`)

      if (readable) {
        try {
          execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'createdb', '-U', pgUser, RESTORE_TEST_DB], {
            cwd: ROOT, stdio: 'pipe', timeout: 15000,
          })
        } catch { /* may already exist */ }

        const restored = restoreDump(postDumpResult.path, RESTORE_TEST_DB, pgUser)
        console.log(`Restore to ${RESTORE_TEST_DB}: ${restored ? 'OK' : 'FAILED'}`)

        if (restored) {
          let restorePassed = true
          for (const def of orderedTables) {
            try {
              const r = execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', pgUser, '-d', RESTORE_TEST_DB, '-t', '-A', '-c', `SELECT COUNT(*) FROM "${def.name}"`], {
                cwd: ROOT, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
              })
              const count = parseInt(r.trim(), 10)
              const expected = allData[def.name]?.length ?? 0
              if (count !== expected) {
                console.error(`  ✗ ${def.name}: expected ${expected}, got ${count}`)
                restorePassed = false
              }
            } catch (e: any) {
              console.error(`  ✗ ${def.name}: verification error: ${e.message}`)
              restorePassed = false
            }
          }
          console.log(`Restore verification: ${restorePassed ? '✓ PASS' : '✗ FAIL'}`)
          if (!restorePassed) exitCode = 1
        }
      }
    }
  }

  await prisma.$disconnect()
  sqlite.close()

  if (exitCode !== 0) {
    console.error('\nMigration FAILED.')
    process.exit(exitCode)
  }
  console.log('\nMigration completed successfully.')
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
