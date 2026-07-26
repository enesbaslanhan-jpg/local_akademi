import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { resetPassword } from '../scripts/admin-reset-password'

const RESET_DB_URL = process.env.DATABASE_URL
  || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'

const prisma = new PrismaClient({
  datasources: { db: { url: RESET_DB_URL } }
})
const TEST_PREFIX = 'reset-test'

beforeAll(async () => {
  const { execSync } = await import('child_process')
  try {
    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: RESET_DB_URL },
      stdio: 'pipe',
      timeout: 30000
    })
  } catch {
    execSync('npx prisma db push --schema prisma/schema.prisma --force-reset', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: RESET_DB_URL },
      stdio: 'pipe',
      timeout: 30000
    })
  }
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: TEST_PREFIX } } })
  delete process.env.ADMIN_RESET_EMAIL
  delete process.env.ADMIN_RESET_PASSWORD
  delete process.env.ADMIN_RESET_CONFIRM
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: TEST_PREFIX } } })
  delete process.env.ADMIN_RESET_EMAIL
  delete process.env.ADMIN_RESET_PASSWORD
  delete process.env.ADMIN_RESET_CONFIRM
})

function e(name: string): string {
  return `${TEST_PREFIX}-${name}@example.com`
}

async function createAdmin(email: string, role = 'admin') {
  return prisma.user.create({
    data: { email, name: 'Test User', password: await bcrypt.hash('OldPass123!', 10), role }
  })
}

describe('resetPassword', () => {
  it('eksik env vars hata doner DB degismez', async () => {
    const before = await prisma.user.count()
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('missing_vars')
    expect(await prisma.user.count()).toBe(before)
  })

  it('yanlis confirmation reddeder DB degismez', async () => {
    process.env.ADMIN_RESET_EMAIL = e('wrong-confirm')
    process.env.ADMIN_RESET_PASSWORD = 'NewStrongPass123!'
    process.env.ADMIN_RESET_CONFIRM = 'wrong'
    const before = await prisma.user.count()
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('confirm_mismatch')
    expect(await prisma.user.count()).toBe(before)
  })

  it('gecersiz email hata doner', async () => {
    process.env.ADMIN_RESET_EMAIL = 'not-an-email'
    process.env.ADMIN_RESET_PASSWORD = 'NewStrongPass123!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('invalid_email')
  })

  it('zayif parola hata doner', async () => {
    process.env.ADMIN_RESET_EMAIL = e('weak-pw')
    process.env.ADMIN_RESET_PASSWORD = 'weak'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('14 characters')
  })

  it('var olmayan kullanici hata doner DB degismez', async () => {
    process.env.ADMIN_RESET_EMAIL = e('nonexistent')
    process.env.ADMIN_RESET_PASSWORD = 'NewStrongPass123!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    const before = await prisma.user.count()
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('user_not_found')
    expect(await prisma.user.count()).toBe(before)
  })

  it('admin olmayan kullanici reddedilir DB degismez', async () => {
    await createAdmin(e('non-admin'), 'student')
    process.env.ADMIN_RESET_EMAIL = e('non-admin')
    process.env.ADMIN_RESET_PASSWORD = 'NewStrongPass123!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_admin')
    const user = await prisma.user.findUnique({ where: { email: e('non-admin') } })
    // parola degismedi
    const oldMatch = await bcrypt.compare('OldPass123!', user!.password)
    expect(oldMatch).toBe(true)
  })

  it('admin parolasini basariyla degistirir', async () => {
    await createAdmin(e('success'))
    const oldUser = await prisma.user.findUnique({ where: { email: e('success') } })
    const oldHash = oldUser!.password
    process.env.ADMIN_RESET_EMAIL = e('success')
    process.env.ADMIN_RESET_PASSWORD = 'NewStrongPass123!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    const result = await resetPassword(prisma)
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('reset')
    expect(result.email).toBe(e('success'))
    expect(result.id).toBe(oldUser!.id)
    const user = await prisma.user.findUnique({ where: { email: e('success') } })
    // hash degisti
    expect(user!.password).not.toBe(oldHash)
    // yeni sifre dogrulaniyor
    const newMatch = await bcrypt.compare('NewStrongPass123!', user!.password)
    expect(newMatch).toBe(true)
    // rol, email, name degismedi
    expect(user!.role).toBe('admin')
    expect(user!.name).toBe('Test User')
    expect(user!.email).toBe(e('success'))
  })

  it('admin parola degisiminde diger alanlar degismez', async () => {
    await createAdmin(e('fields-unchanged'))
    const oldUser = await prisma.user.findUnique({ where: { email: e('fields-unchanged') } })
    process.env.ADMIN_RESET_EMAIL = e('fields-unchanged')
    process.env.ADMIN_RESET_PASSWORD = 'AnotherStrong1!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    await resetPassword(prisma)
    const user = await prisma.user.findUnique({ where: { email: e('fields-unchanged') } })
    expect(user!.name).toBe('Test User')
    expect(user!.role).toBe('admin')
    expect(user!.email).toBe(e('fields-unchanged'))
  })

  it('parola log mesajinda gorunmez', async () => {
    await createAdmin(e('pw-leak'))
    const logs: string[] = []
    const origLog = console.log
    const origErr = console.error
    console.log = (msg: string) => logs.push(msg)
    console.error = (msg: string) => logs.push(msg)
    process.env.ADMIN_RESET_EMAIL = e('pw-leak')
    process.env.ADMIN_RESET_PASSWORD = 'SafePwLeak123!'
    process.env.ADMIN_RESET_CONFIRM = 'RESET_EXISTING_ADMIN'
    await resetPassword(prisma)
    console.log = origLog
    console.error = origErr
    for (const line of logs) {
      expect(line).not.toContain('SafePwLeak123!')
    }
  })
})

describe('CLI subprocess', () => {
  const scriptName = 'admin:reset-password'
  const cliPrefix = 'cli-reset'

  async function runCLI(extraEnv: Record<string, string> = {}) {
    const { execSync } = await import('child_process')
    return execSync(`npm.cmd run ${scriptName}`, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...extraEnv,
        DATABASE_URL: RESET_DB_URL
      },
      stdio: 'pipe',
      timeout: 30000,
      encoding: 'utf8'
    })
  }

  it('eksik env ile exit 1 doner ve hata mesaji yazar', async () => {
    try {
      await runCLI({ ADMIN_RESET_EMAIL: '', ADMIN_RESET_PASSWORD: '', ADMIN_RESET_CONFIRM: '' })
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.status).toBe(1)
      expect(e.stderr).toContain('[ADMIN_RESET]')
      expect(e.stderr).toContain('Missing required env vars')
    }
  })

  it('basili kalmaz (20s timeout yeterlidir)', async () => {
    const start = Date.now()
    try {
      await runCLI({ ADMIN_RESET_EMAIL: '', ADMIN_RESET_PASSWORD: '', ADMIN_RESET_CONFIRM: '' })
      expect.unreachable('should have thrown')
    } catch {
      expect(Date.now() - start).toBeLessThan(25000)
    }
  })

  it('cikti bos degildir (sessiz kapanmaz)', async () => {
    try {
      await runCLI({ ADMIN_RESET_EMAIL: '', ADMIN_RESET_PASSWORD: '', ADMIN_RESET_CONFIRM: '' })
      expect.unreachable('should have thrown')
    } catch (e: any) {
      expect(e.stdout || e.stderr).toBeTruthy()
    }
  })

  it('parola ciktida gorunmez', async () => {
    const pw = 'CLI_ResetPw1!'
    const email = `${cliPrefix}-pwtest@example.com`
    const oldHash = await bcrypt.hash('OldAdminPw1!', 10)
    await prisma.user.create({ data: { email, name: 'CLI User', password: oldHash, role: 'admin' } })
    try {
      await runCLI({
        ADMIN_RESET_EMAIL: email,
        ADMIN_RESET_PASSWORD: pw,
        ADMIN_RESET_CONFIRM: 'RESET_EXISTING_ADMIN'
      })
    } catch (e: any) {
      const out = (e.stdout || '') + (e.stderr || '')
      expect(out).not.toContain(pw)
    } finally {
      await prisma.user.deleteMany({ where: { email: { contains: cliPrefix } } })
    }
  })

  it('npm script uzerinden basarili sifre sifirlama', async () => {
    const email = `${cliPrefix}-success@example.com`
    const oldHash = await bcrypt.hash('OldAdminPw1!', 10)
    await prisma.user.create({ data: { email, name: 'CLI User', password: oldHash, role: 'admin' } })
    try {
      const out = await runCLI({
        ADMIN_RESET_EMAIL: email,
        ADMIN_RESET_PASSWORD: 'New_CLI_Pass1!',
        ADMIN_RESET_CONFIRM: 'RESET_EXISTING_ADMIN'
      })
      expect(out).toContain('[ADMIN_RESET]')
      expect(out).toContain('Password reset for admin')
      expect(out).toContain(email)
      const user = await prisma.user.findUnique({ where: { email } })
      expect(user!.password).not.toBe(oldHash)
      const match = await bcrypt.compare('New_CLI_Pass1!', user!.password)
      expect(match).toBe(true)
    } finally {
      await prisma.user.deleteMany({ where: { email: { contains: cliPrefix } } })
    }
  })
})
