import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateName(name: string): string | null {
  if (name.length < 2 || name.length > 100) return 'Name must be 2–100 characters'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < 14) return 'Password must be at least 14 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character'
  return null
}

export type BootstrapResult =
  | { ok: false; reason: string }
  | { ok: true; reason: 'created'; email: string; id: number }

export async function bootstrap(prisma: PrismaClient): Promise<BootstrapResult> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const name = process.env.BOOTSTRAP_ADMIN_NAME
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

  if (!email || !name || !password) {
    console.error('[ADMIN_BOOTSTRAP] Missing required env vars: BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_PASSWORD')
    return { ok: false, reason: 'missing_vars' }
  }

  if (!validateEmail(email)) {
    console.error('[ADMIN_BOOTSTRAP] Invalid email format')
    return { ok: false, reason: 'invalid_email' }
  }

  const nameErr = validateName(name)
  if (nameErr) {
    console.error('[ADMIN_BOOTSTRAP] Name error:', nameErr)
    return { ok: false, reason: nameErr }
  }

  const pwErr = validatePassword(password)
  if (pwErr) {
    console.error('[ADMIN_BOOTSTRAP] Password error:', pwErr)
    return { ok: false, reason: pwErr }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    console.error('[ADMIN_BOOTSTRAP] A user with this email already exists')
    return { ok: false, reason: 'email_exists' }
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (existingAdmin) {
    console.error('[ADMIN_BOOTSTRAP] Admin already exists — second admin creation is not allowed via bootstrap')
    return { ok: false, reason: 'admin_exists' }
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, name, password: hashed, role: 'admin' }
  })

  // Only log email and ID — never password or hash
  console.log(`[ADMIN_BOOTSTRAP] Admin created: ${user.email} (ID: ${user.id})`)
  return { ok: true, reason: 'created', email: user.email, id: user.id }
}

async function main() {
  const prisma = new PrismaClient()
  let exitCode = 0
  try {
    const result = await bootstrap(prisma)
    exitCode = result.ok ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
  process.exitCode = exitCode
}

const isMain = (() => {
  const arg = process.argv[1]
  if (!arg) return false
  const n = arg.replace(/\\/g, '/')
  return n.endsWith('admin-bootstrap.ts') ||
         n.endsWith('admin-bootstrap.js') ||
         n.endsWith('admin-bootstrap.mjs')
})()

if (isMain) {
  main().catch((err) => {
    console.error('[ADMIN_BOOTSTRAP] Fatal:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
}
