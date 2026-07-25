import { readdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations')

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
  console.log('=== Migration Chain Validator ===\n')

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

  // ── Step 2: Scan each migration.sql for UP/DOWN ──
  for (const entry of entries) {
    const migrationDir = join(MIGRATIONS_DIR, entry)
    const migrationFile = join(migrationDir, 'migration.sql')
    const readmeFile = join(migrationDir, 'README.md')

    if (existsSync(migrationFile)) {
      const content = readFileSync(migrationFile, 'utf8')
      const downIdx = content.indexOf('-- DOWN')
      const hasDown = downIdx !== -1
      const hasUp = content.indexOf('-- UP') !== -1 || downIdx === -1 || content.trim().length > 0
      const hasCreateTable = content.includes('CREATE TABLE')
      const hasAlterTable = content.includes('ALTER TABLE')
      const hasDropTable = content.includes('DROP TABLE')

      pass(`${entry}: migration.sql ${content.length}B ${hasUp ? 'UP' : ''} ${hasDown ? 'DOWN' : ''}${hasCreateTable ? ' CREATE' : ''}${hasAlterTable ? ' ALTER' : ''}${hasDropTable ? ' DROP' : ''}`)

      if (hasCreateTable && !hasDown) {
        warn(`${entry}: CREATE TABLE without DOWN migration — rollback not possible`)
      }
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

  // ── Step 4: Create temp DB and run prisma migrate deploy ──
  const prevDbUrl = process.env.DATABASE_URL

  const tempDbName = `migrate-validate-${process.pid}-${Date.now()}.db`
  const tempDbPath = join(ROOT, 'prisma', tempDbName)
  // SQLite URLs are resolved relative to schema.prisma. A relative URL also
  // avoids Windows drive-letter parsing differences in Prisma's schema engine.
  const tempDbUrl = `file:./${tempDbName}`
  // Prisma 5's Windows schema engine can fail to create a brand-new SQLite
  // file itself; an empty file is a valid SQLite starting point.
  writeFileSync(tempDbPath, '')
  process.env.DATABASE_URL = tempDbUrl

  try {
    execSync('npx prisma migrate deploy', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: tempDbUrl },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('prisma migrate deploy: all migrations applied successfully')
  } catch (e: any) {
    fail(`prisma migrate deploy failed (${tempDbUrl}):\n${e.stdout || ''}\n${e.stderr || ''}\n${e.message || ''}`)
    process.env.DATABASE_URL = prevDbUrl || ''
    cleanup(tempDbPath)
    process.exit(EXIT_CODE)
    return
  }

  // ── Step 5: Verify _prisma_migrations table ──
  const prisma = new PrismaClient({
    datasources: { db: { url: tempDbUrl } }
  })
  await prisma.$connect()

  try {
    const result: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM _prisma_migrations`
    )
    const count = Number(result[0]?.count || 0)
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
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma_%' AND name NOT LIKE 'sqlite_%' ORDER BY name`
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
      'GeneratedReport', 'UserPreference', 'Formula', 'AuditLog']

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
      env: { ...process.env, DATABASE_URL: tempDbUrl },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('Seed (1st run) completed')

    const prisma2 = new PrismaClient({
      datasources: { db: { url: tempDbUrl } }
    })
    await prisma2.$connect()

    const [usersBefore, kosBefore] = await Promise.all([
      prisma2.user.count(),
      prisma2.knowledgeObject.count()
    ])
    await prisma2.$disconnect()

    execSync('npx tsx prisma/seed.ts', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: tempDbUrl },
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    })
    pass('Seed (2nd run) completed — no duplicate errors')

    const prisma3 = new PrismaClient({
      datasources: { db: { url: tempDbUrl } }
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

  // ── Restore env ──
  if (prevDbUrl) process.env.DATABASE_URL = prevDbUrl
  else delete process.env.DATABASE_URL

  // ── Cleanup ──
  cleanup(tempDbPath)

  console.log(`\n=== Migration validation ${EXIT_CODE === 0 ? 'PASSED' : 'FAILED'} ===`)
  process.exit(EXIT_CODE)
}

function cleanup(tempDbPath: string) {
  try {
    for (const path of [tempDbPath, `${tempDbPath}-journal`, `${tempDbPath}-shm`, `${tempDbPath}-wal`]) {
      if (existsSync(path)) rmSync(path, { force: true })
    }
  } catch {}
}

main()
