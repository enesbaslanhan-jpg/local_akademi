import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { validateEmail, validateName, validatePassword } from '../scripts/admin-bootstrap'
import { bootstrap } from '../scripts/admin-bootstrap'

const BASE_DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi?schema=public'

// Isolate admin-bootstrap tests in a unique Postgres schema so that other tests'
// leftover admin records never cause `admin_exists` failures.
const SCHEMA_NAME = `bootstrap_test_${process.pid}_${Date.now().toString(36)}`
const BOOTSTRAP_DB_URL = (() => {
  const url = new URL(BASE_DATABASE_URL)
  url.searchParams.set('schema', SCHEMA_NAME)
  return url.toString()
})()

const prisma = new PrismaClient({
  datasources: { db: { url: BOOTSTRAP_DB_URL } }
})
const TEST_PREFIX = 'bootstrap-test'

beforeAll(async () => {
  // Create the isolated schema using a connection to the base database.
  const tempPrisma = new PrismaClient({
    datasources: { db: { url: BASE_DATABASE_URL } }
  })
  await tempPrisma.$connect()
  await tempPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_NAME}"`)
  await tempPrisma.$disconnect()

  // Apply migrations to the isolated schema.
  const { execSync } = await import('child_process')
  try {
    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: BOOTSTRAP_DB_URL },
      stdio: 'pipe',
      timeout: 30000
    })
  } catch {
    // db push fallback for testing environments without migration history
    execSync('npx prisma db push --schema prisma/schema.prisma --force-reset', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: BOOTSTRAP_DB_URL },
      stdio: 'pipe',
      timeout: 30000
    })
  }
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()

  const tempPrisma = new PrismaClient({
    datasources: { db: { url: BASE_DATABASE_URL } }
  })
  await tempPrisma.$connect()
  await tempPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${SCHEMA_NAME}" CASCADE`)
  await tempPrisma.$disconnect()
})

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: TEST_PREFIX } } })
  delete process.env.BOOTSTRAP_ADMIN_EMAIL
  delete process.env.BOOTSTRAP_ADMIN_NAME
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: TEST_PREFIX } } })
  delete process.env.BOOTSTRAP_ADMIN_EMAIL
  delete process.env.BOOTSTRAP_ADMIN_NAME
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD
})

function e(name: string): string {
  return `${TEST_PREFIX}-${name}@example.com`
}

describe('validateEmail', () => {
  it('gecerli email true doner', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('etiketsiz email false doner', () => {
    expect(validateEmail('invalid')).toBe(false)
  })

  it('bos email false doner', () => {
    expect(validateEmail('')).toBe(false)
  })

  it('domain siz email false doner', () => {
    expect(validateEmail('user@')).toBe(false)
  })
})

describe('validateName', () => {
  it('gecerli isim null doner', () => {
    expect(validateName('Admin User')).toBeNull()
  })

  it('tek karakterli isim hata doner', () => {
    expect(validateName('A')).toBe('Name must be 2–100 characters')
  })

  it('101 karakterli isim hata doner', () => {
    expect(validateName('A'.repeat(101))).toBe('Name must be 2–100 characters')
  })

  it('100 karakterli isim null doner', () => {
    expect(validateName('A'.repeat(100))).toBeNull()
  })
})

describe('validatePassword', () => {
  it('guclu parola null doner', () => {
    expect(validatePassword('StrongPass123!')).toBeNull()
  })

  it('13 karakter hata doner', () => {
    expect(validatePassword('Weak1Pass!')).toBe('Password must be at least 14 characters')
  })

  it('buyuk harf eksik hata doner', () => {
    expect(validatePassword('strongpass123!')).toBe('Password must contain at least one uppercase letter')
  })

  it('kucuk harf eksik hata doner', () => {
    expect(validatePassword('STRONGPASS123!')).toBe('Password must contain at least one lowercase letter')
  })

  it('rakam eksik hata doner', () => {
    expect(validatePassword('StrongPassNoDigit!')).toBe('Password must contain at least one digit')
  })

  it('ozel karakter eksik hata doner', () => {
    expect(validatePassword('StrongPassNoSpec123')).toBe('Password must contain at least one special character')
  })
})

describe('bootstrap', () => {
  it('eksik env vars hata doner DB degismez', async () => {
    const before = await prisma.user.count()
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('missing_vars')
    const after = await prisma.user.count()
    expect(after).toBe(before)
  })

  it('gecersiz email hata doner DB degismez', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'not-an-email'
    process.env.BOOTSTRAP_ADMIN_NAME = 'Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const before = await prisma.user.count()
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('invalid_email')
    expect(await prisma.user.count()).toBe(before)
  })

  it('kisa isim hata doner DB degismez', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('short-name')
    process.env.BOOTSTRAP_ADMIN_NAME = 'A'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const before = await prisma.user.count()
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('2–100')
    expect(await prisma.user.count()).toBe(before)
  })

  it('zayif parola hata doner DB degismez', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('weak-pw')
    process.env.BOOTSTRAP_ADMIN_NAME = 'Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'weak'
    const before = await prisma.user.count()
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('14 characters')
    expect(await prisma.user.count()).toBe(before)
  })

  it('ilk admin basariyla olusturur', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('first')
    process.env.BOOTSTRAP_ADMIN_NAME = 'First Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('created')
    expect(result.email).toBe(e('first'))
    expect(result.id).toBeGreaterThan(0)
    const user = await prisma.user.findUnique({ where: { email: e('first') } })
    expect(user).not.toBeNull()
    expect(user!.role).toBe('admin')
    expect(user!.name).toBe('First Admin')
  })

  it('bcrypt hash uretir duz metin saklanmaz', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('hashed')
    process.env.BOOTSTRAP_ADMIN_NAME = 'Hashed Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const result = await bootstrap(prisma)
    expect(result.reason).toBe('created')
    const user = await prisma.user.findUnique({ where: { email: e('hashed') } })
    expect(user!.password).not.toBe('StrongPass123!')
    expect(user!.password).toMatch(/^\$2[ab]\$/)
    const matches = await bcrypt.compare('StrongPass123!', user!.password)
    expect(matches).toBe(true)
  })

  it('admin olustuktan sonra tekrar calistirilirsa hata doner', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('once')
    process.env.BOOTSTRAP_ADMIN_NAME = 'Once Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const first = await bootstrap(prisma)
    expect(first.reason).toBe('created')
    const second = await bootstrap(prisma)
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('email_exists')
  })

  it('ikinci admin olusturmaz exit 1 doner', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('second-attempt')
    process.env.BOOTSTRAP_ADMIN_NAME = 'First Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    await bootstrap(prisma)
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('second-attempt-other')
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('admin_exists')
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    expect(adminCount).toBe(1)
  })

  it('mevcut email rol yukseltmez ve alan degistirmez', async () => {
    const email = e('no-upgrade')
    await prisma.user.create({
      data: { email, name: 'Original Name', password: 'original-hash', role: 'student' }
    })
    process.env.BOOTSTRAP_ADMIN_EMAIL = email
    process.env.BOOTSTRAP_ADMIN_NAME = 'New Name'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('email_exists')
    const user = await prisma.user.findUnique({ where: { email } })
    expect(user!.role).toBe('student')
    expect(user!.name).toBe('Original Name')
    expect(user!.password).toBe('original-hash')
  })

  it('mevcut admin email tekrar dener email_exists doner', async () => {
    const email = e('existing-admin')
    await prisma.user.create({
      data: { email, name: 'Existing Admin', password: 'hash', role: 'admin' }
    })
    process.env.BOOTSTRAP_ADMIN_EMAIL = email
    process.env.BOOTSTRAP_ADMIN_NAME = 'New Name'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    const result = await bootstrap(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('email_exists')
    const user = await prisma.user.findUnique({ where: { email } })
    expect(user!.role).toBe('admin')
    expect(user!.name).toBe('Existing Admin')
    expect(user!.password).toBe('hash')
  })

  it('parola log mesajinda gorunmez', async () => {
    const logs: string[] = []
    const origLog = console.log
    const origErr = console.error
    console.log = (msg: string) => logs.push(msg)
    console.error = (msg: string) => logs.push(msg)
    process.env.BOOTSTRAP_ADMIN_EMAIL = e('pw-leak')
    process.env.BOOTSTRAP_ADMIN_NAME = 'Admin'
    process.env.BOOTSTRAP_ADMIN_PASSWORD = 'StrongPass123!'
    await bootstrap(prisma)
    console.log = origLog
    console.error = origErr
    for (const line of logs) {
      expect(line).not.toContain('StrongPass123!')
    }
  })
})

describe('CLI subprocess', () => {
  const scriptName = 'admin:bootstrap'
  const cliPrefix = 'cli-bootstrap'

  async function runCLI(extraEnv: Record<string, string> = {}) {
    const { execSync } = await import('child_process')
    return execSync(`npm.cmd run ${scriptName}`, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...extraEnv,
        DATABASE_URL: BOOTSTRAP_DB_URL
      },
      stdio: 'pipe',
      timeout: 30000,
      encoding: 'utf8'
    })
  }

  it('eksik env ile exit 1 doner ve hata mesaji yazar', async () => {
    try {
      await runCLI({ BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_NAME: '', BOOTSTRAP_ADMIN_PASSWORD: '' })
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.status).toBe(1)
      expect(e.stderr).toContain('[ADMIN_BOOTSTRAP]')
      expect(e.stderr).toContain('Missing required env vars')
    }
  })

  it('basili kalmaz (20s timeout yeterlidir)', async () => {
    const start = Date.now()
    try {
      await runCLI({ BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_NAME: '', BOOTSTRAP_ADMIN_PASSWORD: '' })
      expect.unreachable('should have thrown')
    } catch {
      expect(Date.now() - start).toBeLessThan(25000)
    }
  })

  it('cikti bos degildir (sessiz kapanmaz)', async () => {
    try {
      await runCLI({ BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_NAME: '', BOOTSTRAP_ADMIN_PASSWORD: '' })
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.stdout || e.stderr).toBeTruthy()
    }
  })

  it('parola ciktida gorunmez', async () => {
    const pw = 'CLI_StrongPass1!'
    const email = `${cliPrefix}-pwtest@example.com`
    try {
      await runCLI({
        BOOTSTRAP_ADMIN_EMAIL: email,
        BOOTSTRAP_ADMIN_NAME: 'CLI Pw Test',
        BOOTSTRAP_ADMIN_PASSWORD: pw
      })
    } catch (e: any) {
      const out = (e.stdout || '') + (e.stderr || '')
      expect(out).not.toContain(pw)
    } finally {
      await prisma.user.deleteMany({ where: { email: { contains: cliPrefix } } })
    }
  })

  it('npm script uzerinden basarili admin olusturur', async () => {
    const email = `${cliPrefix}-success@example.com`
    try {
      const out = await runCLI({
        BOOTSTRAP_ADMIN_EMAIL: email,
        BOOTSTRAP_ADMIN_NAME: 'CLI Success',
        BOOTSTRAP_ADMIN_PASSWORD: 'CLI_SuccessPw1!'
      })
      expect(out).toContain('[ADMIN_BOOTSTRAP]')
      expect(out).toContain('Admin created')
      const user = await prisma.user.findUnique({ where: { email } })
      expect(user).not.toBeNull()
      expect(user!.role).toBe('admin')
    } finally {
      await prisma.user.deleteMany({ where: { email: { contains: cliPrefix } } })
    }
  })
})
