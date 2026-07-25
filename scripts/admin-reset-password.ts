import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { validateEmail, validatePassword } from './admin-bootstrap'

export type ResetResult =
  | { ok: false; reason: string }
  | { ok: true; reason: 'reset'; email: string; id: number }

export async function resetPassword(prisma: PrismaClient): Promise<ResetResult> {
  const email = process.env.ADMIN_RESET_EMAIL
  const password = process.env.ADMIN_RESET_PASSWORD
  const confirm = process.env.ADMIN_RESET_CONFIRM

  if (!email || !password || !confirm) {
    console.error('[ADMIN_RESET] Missing required env vars: ADMIN_RESET_EMAIL, ADMIN_RESET_PASSWORD, ADMIN_RESET_CONFIRM')
    return { ok: false, reason: 'missing_vars' }
  }

  if (confirm !== 'RESET_EXISTING_ADMIN') {
    console.error('[ADMIN_RESET] Confirmation mismatch — ADMIN_RESET_CONFIRM must be exactly RESET_EXISTING_ADMIN')
    return { ok: false, reason: 'confirm_mismatch' }
  }

  if (!validateEmail(email)) {
    console.error('[ADMIN_RESET] Invalid email format')
    return { ok: false, reason: 'invalid_email' }
  }

  const pwErr = validatePassword(password)
  if (pwErr) {
    console.error('[ADMIN_RESET] Password error:', pwErr)
    return { ok: false, reason: pwErr }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error('[ADMIN_RESET] No user found with this email')
    return { ok: false, reason: 'user_not_found' }
  }

  if (user.role !== 'admin') {
    console.error('[ADMIN_RESET] User is not an admin — password reset denied')
    return { ok: false, reason: 'not_admin' }
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { email },
    data: { password: hashed }
  })

  console.log(`[ADMIN_RESET] Password reset for admin: ${user.email} (ID: ${user.id})`)
  return { ok: true, reason: 'reset', email: user.email, id: user.id }
}

async function main() {
  const prisma = new PrismaClient()
  let exitCode = 0
  try {
    const result = await resetPassword(prisma)
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
  return n.endsWith('admin-reset-password.ts') ||
         n.endsWith('admin-reset-password.js') ||
         n.endsWith('admin-reset-password.mjs')
})()

if (isMain) {
  main().catch((err) => {
    console.error('[ADMIN_RESET] Fatal:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
}
