import { PrismaClient } from '@prisma/client'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const backupDirectory = join(root, 'BACKUPS')

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function retentionCount(): number {
  const parsed = Number(process.env.DATABASE_BACKUP_RETENTION_COUNT)
  if (!Number.isFinite(parsed)) return 10
  return Math.max(3, Math.min(Math.floor(parsed), 100))
}

async function main(): Promise<void> {
  mkdirSync(backupDirectory, { recursive: true })
  const backupPath = join(
    backupDirectory,
    `auto_dev_${timestamp()}.db`,
  )
  if (
    !backupPath.startsWith(
      `${backupDirectory}\\`,
    ) ||
    existsSync(backupPath)
  ) {
    throw new Error('UNSAFE_BACKUP_PATH')
  }
  const prisma = new PrismaClient()
  const sqlPath = backupPath.replaceAll('\\', '/').replaceAll("'", "''")
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`)
  } finally {
    await prisma.$disconnect()
  }

  const restored = new PrismaClient({
    datasources: {
      db: { url: `file:${backupPath.replaceAll('\\', '/')}` },
    },
  })
  let integrity = ''
  try {
    const rows = await restored.$queryRawUnsafe<
      Array<{ integrity_check: string }>
    >('PRAGMA integrity_check')
    integrity = rows[0]?.integrity_check || ''
  } finally {
    await restored.$disconnect()
  }
  if (integrity !== 'ok') {
    rmSync(backupPath, { force: true })
    throw new Error('BACKUP_INTEGRITY_FAILED')
  }

  const candidates = readdirSync(backupDirectory)
    .filter(name => /^auto_dev_\d{4}-\d{2}-\d{2}T.*\.db$/.test(name))
    .map(name => ({
      name,
      path: join(backupDirectory, name),
      modifiedAt: statSync(join(backupDirectory, name)).mtimeMs,
    }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
  const removed = candidates.slice(retentionCount())
  for (const item of removed) {
    if (item.path.startsWith(`${backupDirectory}\\`)) {
      rmSync(item.path, { force: true })
    }
  }
  console.log(JSON.stringify({
    ok: true,
    backup: `BACKUPS/${backupPath.split('\\').at(-1)}`,
    bytes: statSync(backupPath).size,
    integrity,
    retained: candidates.length - removed.length,
    removed: removed.map(item => item.name),
    sourceModified: false,
  }))
}

main().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    errorCode: error instanceof Error
      ? error.message
      : 'DATABASE_BACKUP_FAILED',
  }))
  process.exitCode = 1
})

