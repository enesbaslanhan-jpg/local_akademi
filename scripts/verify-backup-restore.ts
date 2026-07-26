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

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || ''

  if (isPostgresUrl(dbUrl)) {
    // PostgreSQL: verify via row counts only (no PRAGMA)
    const prisma = new PrismaClient()
    await prisma.$connect()
    try {
      const [users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts] = await Promise.all([
        prisma.user.count(),
        prisma.knowledgeObject.count(),
        prisma.knowledgeObject.count({ where: { status: 'published', isDemo: false } }),
        prisma.quiz.count(),
        prisma.communityPost.count(),
      ])
      console.log(JSON.stringify({
        ok: true,
        engine: 'postgresql',
        integrity: 'N/A (pg_dump)',
        users,
        knowledgeObjects,
        publishedKnowledgeObjects,
        quizzes,
        communityPosts,
      }))
    } finally {
      await prisma.$disconnect()
    }
    return
  }

  // SQLite restore verification
  const source = join(root, 'prisma', 'dev.db')
  if (!existsSync(source)) throw new Error('BACKUP_SOURCE_NOT_FOUND')
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'localakademi-restore-'))
  const restored = join(temporaryDirectory, 'restored.db')
  copyFileSync(source, restored)
  const url = `file:${restored.replaceAll('\\', '/')}`
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  try {
    const integrity = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check')
    const [users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts] = await Promise.all([
      prisma.user.count(),
      prisma.knowledgeObject.count(),
      prisma.knowledgeObject.count({ where: { status: 'published', isDemo: false } }),
      prisma.quiz.count(),
      prisma.communityPost.count(),
    ])
    console.log(JSON.stringify({
      ok: true,
      engine: 'sqlite',
      integrity: integrity[0]?.integrity_check || '',
      users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts,
    }))
  } finally {
    await prisma.$disconnect()
  }
  try { rmSync(temporaryDirectory, { recursive: true, force: true }) } catch {}
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, errorCode: error.message }))
  process.exitCode = 1
})
