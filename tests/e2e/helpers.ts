import { randomUUID } from 'crypto'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { createServer } from 'net'
import Fastify, { FastifyInstance } from 'fastify'
import { startFakeProvider } from './fake-provider'

export interface TestContext {
  tmpDir: string
  dbUrl: string
  prisma: PrismaClient
  app: FastifyInstance | null
  fakeProviderPort: number
  fakeProvider: Awaited<ReturnType<typeof startFakeProvider>> | null
}

function getRandomPort(min = 4000, max = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('Failed to get port')))
      }
    })
    server.on('error', reject)
  })
}

export function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`))
}

export function applyMigrations(dbUrl: string) {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'pipe',
      timeout: 60000
    })
  } catch (error: any) {
    const stdout = error?.stdout?.toString?.().trim() || ''
    const stderr = error?.stderr?.toString?.().trim() || ''
    throw new Error(`Prisma migrate deploy failed for ${dbUrl}\n${stdout}\n${stderr}`.trim())
  }
}

export async function cleanupTestContext(ctx: TestContext) {
  if (ctx.prisma) {
    try { await ctx.prisma.$disconnect() } catch {}
  }
  if (ctx.fakeProvider) {
    try { await ctx.fakeProvider.close() } catch {}
  }
  if (ctx.app) {
    try { await ctx.app.close() } catch {}
  }
  if (ctx.tmpDir && existsSync(ctx.tmpDir)) {
    try { rmSync(ctx.tmpDir, { recursive: true, force: true }) } catch {}
  }
}

export async function createFullTestContext(originalDir: string): Promise<TestContext> {
  const tmpDir = createTempDir('e2e-test-')
  const dbUrl = 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'
  const fakeProviderPort = await getRandomPort(4000, 5000)

  // Reset the test database schema to get a clean state
  execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate --schema prisma/schema.prisma', {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
    timeout: 60000
  })

  const fakeProvider = await startFakeProvider({
    port: fakeProviderPort,
    defaultResponse: 'Bu E2E test AI yanıtıdır.',
    streamingChunks: ['E2E ', 'test ', 'yanıt ', 'parçaları.']
  })

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  })
  await prisma.$connect()

  return {
    tmpDir,
    dbUrl,
    prisma,
    app: null,
    fakeProviderPort,
    fakeProvider
  }
}
