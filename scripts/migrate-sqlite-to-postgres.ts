import { PrismaClient as SQLiteClient } from '@prisma/client'
import { PrismaClient as PGClient } from '@prisma/client'
import { existsSync } from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')

interface ModelConfig {
  name: string
  sourceQuery: (p: SQLiteClient) => Promise<any[]>
  upsertTarget: (p: PGClient, rows: any[]) => Promise<void>
  order: number
}

const SQLITE_URL = process.env.SQLITE_SOURCE_URL || `file:${join(root, 'prisma', 'dev.db').replace(/\\/g, '/')}`
const PG_URL = process.env.DATABASE_URL || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi?schema=public'

const TABLE_ORDER: ModelConfig[] = [
  { name: 'User', order: 1, sourceQuery: p => p.user.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.user.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Course', order: 2, sourceQuery: p => p.course.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.course.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Category', order: 3, sourceQuery: p => p.category.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.category.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Source', order: 4, sourceQuery: p => p.source.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.source.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Formula', order: 5, sourceQuery: p => p.formula.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.formula.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ImportJob', order: 6, sourceQuery: p => p.importJob.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.importJob.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'KnowledgeObject', order: 7, sourceQuery: p => p.knowledgeObject.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.knowledgeObject.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'KnowledgeObjectVersion', order: 8, sourceQuery: p => p.knowledgeObjectVersion.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.knowledgeObjectVersion.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Lesson', order: 9, sourceQuery: p => p.lesson.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.lesson.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'KnowledgeObjectSource', order: 10, sourceQuery: p => p.knowledgeObjectSource.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.knowledgeObjectSource.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ReviewRecord', order: 11, sourceQuery: p => p.reviewRecord.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.reviewRecord.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Quiz', order: 12, sourceQuery: p => p.quiz.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.quiz.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'QuizQuestion', order: 13, sourceQuery: p => p.quizQuestion.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.quizQuestion.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'QuizAttempt', order: 14, sourceQuery: p => p.quizAttempt.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.quizAttempt.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'TaskTemplate', order: 15, sourceQuery: p => p.taskTemplate.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.taskTemplate.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'TaskAssignment', order: 16, sourceQuery: p => p.taskAssignment.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.taskAssignment.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'UploadedDocument', order: 17, sourceQuery: p => p.uploadedDocument.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.uploadedDocument.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Flashcard', order: 18, sourceQuery: p => p.flashcard.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.flashcard.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'LearningVideo', order: 19, sourceQuery: p => p.learningVideo.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.learningVideo.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'VideoProductionJob', order: 20, sourceQuery: p => p.videoProductionJob.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.videoProductionJob.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'VideoProgress', order: 21, sourceQuery: p => p.videoProgress.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.videoProgress.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'FlashcardProgress', order: 22, sourceQuery: p => p.flashcardProgress.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.flashcardProgress.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'FlashcardReview', order: 23, sourceQuery: p => p.flashcardReview.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.flashcardReview.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Enrollment', order: 24, sourceQuery: p => p.enrollment.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.enrollment.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'LessonProgress', order: 25, sourceQuery: p => p.lessonProgress.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.lessonProgress.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'Conversation', order: 26, sourceQuery: p => p.conversation.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.conversation.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ConversationMessage', order: 27, sourceQuery: p => p.conversationMessage.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.conversationMessage.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ConversationSummary', order: 28, sourceQuery: p => p.conversationSummary.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.conversationSummary.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'UserMemory', order: 29, sourceQuery: p => p.userMemory.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.userMemory.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'UserPreference', order: 30, sourceQuery: p => p.userPreference.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.userPreference.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'LearningPath', order: 31, sourceQuery: p => p.learningPath.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.learningPath.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'MentorSession', order: 32, sourceQuery: p => p.mentorSession.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.mentorSession.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'BusinessProfile', order: 33, sourceQuery: p => p.businessProfile.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.businessProfile.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'BusinessAssessment', order: 34, sourceQuery: p => p.businessAssessment.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.businessAssessment.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'KnowledgeProgress', order: 35, sourceQuery: p => p.knowledgeProgress.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.knowledgeProgress.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'FormulaCalculation', order: 36, sourceQuery: p => p.formulaCalculation.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.formulaCalculation.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ActivityEvent', order: 37, sourceQuery: p => p.activityEvent.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.activityEvent.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'GeneratedReport', order: 38, sourceQuery: p => p.generatedReport.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.generatedReport.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'DocumentConversation', order: 39, sourceQuery: p => p.documentConversation.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.documentConversation.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'PublicationEvent', order: 40, sourceQuery: p => p.publicationEvent.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.publicationEvent.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'ImportJobError', order: 41, sourceQuery: p => p.importJobError.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.importJobError.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'AiReviewerTelemetry', order: 42, sourceQuery: p => p.aiReviewerTelemetry.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.aiReviewerTelemetry.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'AiReviewerHumanAudit', order: 43, sourceQuery: p => p.aiReviewerHumanAudit.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.aiReviewerHumanAudit.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'CommunityPost', order: 44, sourceQuery: p => p.communityPost.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.communityPost.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'CommunityReport', order: 45, sourceQuery: p => p.communityReport.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.communityReport.upsert({ where: { id: r.id }, update: r, create: r }) } } },
  { name: 'AuditLog', order: 46, sourceQuery: p => p.auditLog.findMany(), upsertTarget: async (p, rows) => { for (const r of rows) { await p.auditLog.upsert({ where: { id: r.id }, update: r, create: r }) } } },
]

async function main() {
  console.log('=== SQLite → PostgreSQL Migration Script ===\n')

  if (!existsSync(join(root, 'prisma', 'dev.db'))) {
    console.error('SQLite source database not found at prisma/dev.db')
    process.exit(1)
  }

  const sqlite = new SQLiteClient({
    datasources: { db: { url: SQLITE_URL } },
  })
  const pg = new PGClient({
    datasources: { db: { url: PG_URL } },
  })

  await sqlite.$connect()
  await pg.$connect()

  // Check target database state
  const pgUserCount = await pg.user.count()
  if (pgUserCount > 0) {
    console.warn(`WARNING: Target PostgreSQL database has ${pgUserCount} existing users.`)
    console.warn('Migration may create duplicate records if upserts fail.')
    console.warn('Run with FORCE_MIGRATION=true to proceed or clear the target database first.\n')
    if (process.env.FORCE_MIGRATION !== 'true') {
      console.log('Aborting. Set FORCE_MIGRATION=true to override.')
      await sqlite.$disconnect()
      await pg.$disconnect()
      process.exit(0)
    }
  }

  const sortedTables = [...TABLE_ORDER].sort((a, b) => a.order - b.order)
  const results: Array<{ table: string; sourceCount: number; targetCount: number; ok: boolean }> = []

  for (const table of sortedTables) {
    process.stdout.write(`Migrating ${table.name}... `)
    try {
      const rows = await table.sourceQuery(sqlite)
      if (rows.length > 0) {
        await table.upsertTarget(pg, rows)
      }
      const targetCount = await (pg as any)[table.name.toLowerCase()].count()
      results.push({ table: table.name, sourceCount: rows.length, targetCount, ok: rows.length === targetCount })
      console.log(`${rows.length} rows → ${targetCount} in PG ${rows.length === targetCount ? '✓' : '✗'}`)
    } catch (e: any) {
      console.error(`ERROR: ${e.message}`)
      results.push({ table: table.name, sourceCount: -1, targetCount: -1, ok: false })
    }
  }

  // Summary
  console.log('\n=== Migration Summary ===')
  let failed = 0
  let totalSource = 0
  let totalTarget = 0
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗'
    console.log(`  ${icon} ${r.table}: ${r.sourceCount} → ${r.targetCount}`)
    if (!r.ok) failed++
    if (r.sourceCount >= 0) totalSource += r.sourceCount
    if (r.targetCount >= 0) totalTarget += r.targetCount
  }
  console.log(`\nTotal: ${totalSource} source rows → ${totalTarget} target rows`)
  console.log(`Tables: ${results.length} total, ${failed} failed`)

  await sqlite.$disconnect()
  await pg.$disconnect()

  if (failed > 0) {
    console.error('\nMigration completed with errors.')
    process.exit(1)
  }
  console.log('\nMigration completed successfully.')
}

main().catch(e => {
  console.error('Migration failed:', e.message)
  process.exit(1)
})
