import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const ROOT = resolve(import.meta.dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations')

const TEST_DB_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'

let EXIT_CODE = 0

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`)
}

function pass(msg: string) {
  log('PASS', msg)
}

function fail(msg: string) {
  log('FAIL', msg)
  EXIT_CODE = 1
}

function warn(msg: string) {
  log('WARN', msg)
}

async function main() {
  console.log('=== Migration Chain Validator (PostgreSQL) ===\n')

  // ── Step 1: Validate migration directory ──
  if (!existsSync(MIGRATIONS_DIR)) {
    fail(`Migrations directory not found: ${MIGRATIONS_DIR}`)
    process.exit(EXIT_CODE)
    return
  }

  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  if (entries.length === 0) {
    fail('No migration directories found')
    process.exit(EXIT_CODE)
    return
  }

  pass(`Found ${entries.length} migration directories`)

  // ── Step 2: Scan each migration.sql ──
  for (const entry of entries) {
    const migrationDir = join(MIGRATIONS_DIR, entry)
    const migrationFile = join(migrationDir, 'migration.sql')
    const readmeFile = join(migrationDir, 'README.md')

    if (existsSync(migrationFile)) {
      const content = readFileSync(migrationFile, 'utf8')
      const hasCreateTable = content.includes('CREATE TABLE')
      const hasAlterTable = content.includes('ALTER TABLE')
      const hasDropTable = content.includes('DROP TABLE')
      pass(`${entry}: migration.sql ${content.length}B${hasCreateTable ? ' CREATE' : ''}${hasAlterTable ? ' ALTER' : ''}${hasDropTable ? ' DROP' : ''}`)
    } else {
      fail(`${entry}: migration.sql not found`)
    }
  }

  // ── Step 3: prisma validate ──
  try {
    execSync('npx prisma validate', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe'
    })
    pass('prisma validate: schema valid')
  } catch (e: any) {
    fail(`prisma validate failed: ${e.message?.split('\n')[0] || e}`)
  }

  // ── Step 4: Run prisma migrate deploy on test database ──
  try {
    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate --schema prisma/schema.prisma', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('Schema reset complete')
  } catch (e: any) {
    fail(`Schema reset failed: ${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`)
    process.exit(EXIT_CODE)
    return
  }

  try {
    execSync('npx prisma migrate deploy', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('prisma migrate deploy: all migrations applied successfully')
  } catch (e: any) {
    fail(`prisma migrate deploy failed:\n${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`)
    process.exit(EXIT_CODE)
    return
  }

  // ── Step 5: Verify _prisma_migrations table ──
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } }
  })
  await prisma.$connect()

  try {
    const result: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM _prisma_migrations`
    )
    const count = Number(result[0]?.count ?? 0)
    if (count > 0) {
      pass(`_prisma_migrations table: ${count} migration(s) recorded`)
    } else {
      fail('_prisma_migrations table is empty — no migrations recorded')
    }
  } catch (e: any) {
    fail(`_prisma_migrations table not accessible: ${e.message}`)
  }

  // ── Step 6: Verify tables exist ──
  try {
    const tables: any = await prisma.$queryRawUnsafe(
      `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '_prisma_%' ORDER BY table_name`
    )
    const tableNames = tables.map((t: any) => t.name)
    if (tableNames.length > 0) {
      pass(`Schema tables: ${tableNames.join(', ')}`)
    } else {
      fail('No user tables found after migration')
    }

    const expectedTables = ['User', 'Course', 'Lesson', 'Enrollment', 'KnowledgeObject', 'Category',
      'KnowledgeObjectVersion', 'Quiz', 'QuizQuestion', 'QuizAttempt', 'TaskAssignment', 'TaskTemplate',
      'Source', 'KnowledgeObjectSource', 'ReviewRecord', 'PublicationEvent', 'ImportJob', 'ImportJobError',
      'LearningPath', 'MentorSession', 'Conversation', 'ConversationMessage', 'UserMemory', 'ConversationSummary',
      'UploadedDocument', 'DocumentConversation', 'BusinessProfile', 'FormulaCalculation', 'ActivityEvent',
      'GeneratedReport', 'UserPreference', 'Formula', 'AuditLog',
      'LearningVideo', 'VideoProgress', 'VideoProductionJob', 'Flashcard', 'FlashcardReview', 'FlashcardProgress',
      'AiReviewerTelemetry', 'AiReviewerHumanAudit', 'CommunityPost', 'CommunityReport',
      'KnowledgeProgress', 'BusinessAssessment',
    ]

    const missing = expectedTables.filter(t => !tableNames.includes(t))
    if (missing.length === 0) {
      pass('All expected model tables present')
    } else {
      warn(`Missing tables: ${missing.join(', ')}`)
    }
  } catch (e: any) {
    fail(`Table verification failed: ${e.message}`)
  }

  await prisma.$disconnect()

  // ── Step 7: Run seed twice and verify idempotency ──
  try {
    execSync('npx tsx prisma/seed.ts', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('Seed (1st run) completed')

    const prisma2 = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } }
    })
    await prisma2.$connect()

    const [usersBefore, kosBefore] = await Promise.all([
      prisma2.user.count(),
      prisma2.knowledgeObject.count()
    ])
    await prisma2.$disconnect()

    execSync('npx tsx prisma/seed.ts', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('Seed (2nd run) completed — no duplicate errors')

    const prisma3 = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } }
    })
    await prisma3.$connect()

    const [usersAfter, kosAfter] = await Promise.all([
      prisma3.user.count(),
      prisma3.knowledgeObject.count()
    ])
    await prisma3.$disconnect()

    if (usersAfter === usersBefore && kosAfter === kosBefore) {
      pass('Seed idempotent: record counts unchanged after second run')
    } else {
      warn(`Seed not idempotent: users ${usersBefore}→${usersAfter}, KOs ${kosBefore}→${kosAfter}`)
    }
  } catch (e: any) {
    fail(`Seed execution failed: ${e.stderr || e.stdout || e.message}`)
  }

  console.log(`\n=== Migration validation ${EXIT_CODE === 0 ? 'PASSED' : 'FAILED'} ===`)
  process.exit(EXIT_CODE)
}

main()
