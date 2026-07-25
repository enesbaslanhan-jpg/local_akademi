import { PrismaClient } from '@prisma/client'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

const root = resolve(import.meta.dirname, '..')

async function main(): Promise<void> {
  const source = join(root, 'prisma', 'dev.db')
  if (!existsSync(source)) throw new Error('BACKUP_SOURCE_NOT_FOUND')
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'localakademi-restore-'),
  )
  const restored = join(temporaryDirectory, 'restored.db')
  copyFileSync(source, restored)
  const url = `file:${restored.replaceAll('\\', '/')}`
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  try {
    const integrity = await prisma.$queryRawUnsafe<
      Array<{ integrity_check: string }>
    >('PRAGMA integrity_check')
    const [
      users,
      knowledgeObjects,
      publishedKnowledgeObjects,
      embeddedKnowledgeObjects,
      quizzes,
      communityPosts,
      reviewerEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.knowledgeObject.count(),
      prisma.knowledgeObject.count({
        where: { status: 'published', isDemo: false },
      }),
      prisma.knowledgeObject.count({
        where: {
          status: 'published',
          isDemo: false,
          embedding: { notIn: ['', '[]'] },
        },
      }),
      prisma.quiz.count(),
      prisma.communityPost.count(),
      prisma.aiReviewerTelemetry.count(),
    ])
    const report = {
      ok:
        integrity[0]?.integrity_check === 'ok' &&
        users >= 0 &&
        knowledgeObjects > 0 &&
        embeddedKnowledgeObjects === publishedKnowledgeObjects,
      source: 'prisma/dev.db',
      restoredToTemporaryDirectory: true,
      integrity: integrity[0]?.integrity_check,
      counts: {
        users,
        knowledgeObjects,
        publishedKnowledgeObjects,
        embeddedKnowledgeObjects,
        quizzes,
        communityPosts,
        reviewerEvents,
      },
      sourceDatabaseModified: false,
    }
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(
    JSON.stringify({
      ok: false,
      errorCode:
        error instanceof Error
          ? error.message
          : 'BACKUP_RESTORE_VERIFY_FAILED',
    }),
  )
  process.exitCode = 1
})
