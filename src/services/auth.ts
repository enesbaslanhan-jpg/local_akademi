import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import { createAuditLog } from './audit.js'
import { randomBytes } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import fastifyMultipart from '@fastify/multipart'
import { createReadStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { detectFileType, FileValidationError, validateImageFile } from './documentSecurity.js'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_NAME_RE = /^[0-9a-f-]{36}\.(png|jpg)$/i

const registerSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(2).max(100)
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı.')
})

const changeEmailSchema = z.object({
  newEmail: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  currentPassword: z.string().min(1).max(128)
})

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  confirmation: z.literal('HESABIMI SİL')
})

const loginSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(128)
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string; role: string }
    user: { id: number; email: string; role: string }
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  const avatarDirectory = join(process.cwd(), 'uploads', 'avatars')
  await fastify.register(fastifyMultipart, { limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } })
  await mkdir(avatarDirectory, { recursive: true })

  function avatarUrl(storedName: string | null) {
    return storedName ? `/auth/avatar/${encodeURIComponent(storedName)}` : null
  }

  function safeAvatarPath(storedName: string) {
    if (!AVATAR_NAME_RE.test(storedName)) throw new Error('Geçersiz avatar dosya adı')
    const base = resolve(avatarDirectory)
    const target = resolve(join(avatarDirectory, storedName))
    const fromBase = relative(base, target)
    if (!fromBase || fromBase.startsWith('..') || isAbsolute(fromBase)) throw new Error('Geçersiz avatar yolu')
    return target
  }
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    if (process.env.BETA_MODE === 'invite_only') {
      return reply.status(403).send({ error: 'Registration is closed. Beta is invite-only.' })
    }

    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'Geçersiz kayıt bilgileri', details: parsed.error.flatten().fieldErrors })
    }
    const { email, password, name } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(400).send({ error: 'Email already in use' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, name }
    })

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    await createAuditLog({
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      actorId: user.id,
      actorName: email
    })

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: avatarUrl(user.avatarStoredName) } }
  })

  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'Geçersiz giriş bilgileri' })
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (user?.deletedAt) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: avatarUrl(user.avatarStoredName) } }
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const found = await prisma.user.findUnique({ where: { id: user.id } })
    if (!found || found.deletedAt) {
      return reply.status(404).send({ error: 'User not found' })
    }
    const pref = await prisma.userPreference.findUnique({ where: { userId: found.id } })
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      avatarUrl: avatarUrl(found.avatarStoredName),
      onboardingCompleted: pref?.onboardingCompleted ?? false
    }
  })

  fastify.get('/avatar/:storedName', async (request, reply) => {
    const storedName = String((request.params as { storedName?: string }).storedName || '')
    if (!AVATAR_NAME_RE.test(storedName)) return reply.status(404).send({ error: 'Profil fotoğrafı bulunamadı.' })
    const owner = await prisma.user.findFirst({ where: { avatarStoredName: storedName, deletedAt: null }, select: { avatarMimeType: true } })
    if (!owner?.avatarMimeType) return reply.status(404).send({ error: 'Profil fotoğrafı bulunamadı.' })
    reply.header('Content-Type', owner.avatarMimeType)
    reply.header('Cache-Control', 'public, max-age=86400, immutable')
    reply.header('X-Content-Type-Options', 'nosniff')
    return reply.send(createReadStream(safeAvatarPath(storedName)))
  })

  fastify.post('/avatar', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    let upload
    try {
      upload = await request.file()
    } catch (error: any) {
      return reply.status(error?.statusCode === 413 ? 413 : 400).send({ error: error?.statusCode === 413 ? 'Profil fotoğrafı en fazla 5 MB olabilir.' : 'Dosya okunamadı.' })
    }
    if (!upload) return reply.status(400).send({ error: 'Fotoğraf seçilmedi.' })
    if (!['image/png', 'image/jpeg'].includes(upload.mimetype)) return reply.status(415).send({ error: 'Yalnız PNG veya JPEG fotoğraf yükleyin.' })

    const buffer = await upload.toBuffer().catch(() => Buffer.alloc(0))
    if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) return reply.status(buffer.length > AVATAR_MAX_BYTES ? 413 : 422).send({ error: 'Fotoğraf boş veya çok büyük.' })
    const detected = detectFileType(buffer)
    const expected = upload.mimetype === 'image/png' ? 'png' : 'jpeg'
    if (!detected.valid || detected.detectedType !== expected) return reply.status(415).send({ error: 'Fotoğraf içeriği dosya türüyle uyuşmuyor.' })
    try {
      validateImageFile(buffer, expected)
    } catch (error) {
      if (error instanceof FileValidationError) return reply.status(error.statusCode).send({ error: error.message })
      throw error
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id }, select: { avatarStoredName: true } })
    if (!found) return reply.status(404).send({ error: 'User not found' })
    const storedName = `${randomUUID()}.${expected === 'png' ? 'png' : 'jpg'}`
    const target = safeAvatarPath(storedName)
    await writeFile(target, buffer, { flag: 'wx' })
    try {
      await prisma.user.update({ where: { id: request.user.id }, data: { avatarStoredName: storedName, avatarMimeType: upload.mimetype } })
    } catch (error) {
      await unlink(target).catch(() => {})
      throw error
    }
    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})
    return reply.status(201).send({ avatarUrl: avatarUrl(storedName) })
  })

  fastify.delete('/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const found = await prisma.user.findUnique({ where: { id: request.user.id }, select: { avatarStoredName: true } })
    if (!found) return reply.status(404).send({ error: 'User not found' })
    await prisma.user.update({ where: { id: request.user.id }, data: { avatarStoredName: null, avatarMimeType: null } })
    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})
    return reply.status(204).send()
  })

  /*
   * PUT /auth/password — oturum açmış kullanıcının şifresini değiştirir.
   * Prisma şeması değişmez; yalnızca mevcut `password` alanı güncellenir.
   * Yanıt gövdesinde şifre veya hash döndürülmez.
   */
  fastify.put('/password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Şifre bilgileri geçersiz.',
        fields: parsed.error.issues.map(issue => String(issue.path[0]))
      })
    }

    const { currentPassword, newPassword } = parsed.data
    const user = request.user as any

    const found = await prisma.user.findUnique({ where: { id: user.id } })
    if (!found) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Mevcut şifre yanlışsa hangi alanın hatalı olduğunu sızdırmadan 401 dön.
    const valid = await bcrypt.compare(currentPassword, found.password)
    if (!valid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Şifre değiştirilemedi. Bilgileri kontrol edip tekrar deneyin.'
      })
    }

    // Yeni şifre eskisiyle aynı olamaz.
    const same = await bcrypt.compare(newPassword, found.password)
    if (same) {
      return reply.status(422).send({
        error: 'PASSWORD_UNCHANGED',
        message: 'Yeni şifre mevcut şifreyle aynı olamaz.'
      })
    }

    // Kayıt akışıyla aynı bcrypt maliyeti (10).
    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: found.id },
      data: { password: hashed }
    })

    await createAuditLog({
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: found.id,
      actorId: found.id,
      actorName: found.name
    }).catch(() => {})

    return reply.send({ success: true })
  })

  fastify.put('/email', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = changeEmailSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'E-posta bilgileri geçersiz.' })
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!found || found.deletedAt) return reply.status(404).send({ error: 'User not found' })

    const valid = await bcrypt.compare(parsed.data.currentPassword, found.password)
    if (!valid) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'E-posta değiştirilemedi. Şifrenizi kontrol edin.' })
    }
    if (parsed.data.newEmail === found.email) {
      return reply.status(422).send({ error: 'EMAIL_UNCHANGED', message: 'Yeni e-posta mevcut e-posta ile aynı.' })
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.newEmail } })
    if (existing) return reply.status(409).send({ error: 'EMAIL_IN_USE', message: 'Bu e-posta başka bir hesapta kullanılıyor.' })

    const updated = await prisma.user.update({ where: { id: found.id }, data: { email: parsed.data.newEmail } })
    await createAuditLog({
      action: 'auth.email_changed', entityType: 'user', entityId: found.id,
      actorId: found.id, actorName: found.name
    }).catch(() => {})

    const token = fastify.jwt.sign(
      { id: updated.id, email: updated.email, role: updated.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )
    return reply.send({ token, user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatarUrl: avatarUrl(updated.avatarStoredName) } })
  })

  fastify.delete('/account', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const parsed = deleteAccountSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'CONFIRMATION_REQUIRED', message: 'Hesap silme onayı geçersiz.' })
    }

    const found = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!found || found.deletedAt) return reply.status(404).send({ error: 'User not found' })
    const valid = await bcrypt.compare(parsed.data.currentPassword, found.password)
    if (!valid) return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Hesap silinemedi. Şifrenizi kontrol edin.' })

    if (found.role === 'admin') {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', deletedAt: null } })
      if (activeAdmins <= 1) return reply.status(409).send({ error: 'LAST_ADMIN', message: 'Son yönetici hesabı silinemez.' })
    }

    const soleOwnerMembership = await prisma.businessMember.findFirst({
      where: {
        userId: found.id,
        role: 'owner',
        status: 'active',
        workspace: { members: { none: { userId: { not: found.id }, role: 'owner', status: 'active' } } }
      },
      select: { workspace: { select: { name: true } } }
    })
    if (soleOwnerMembership) {
      return reply.status(409).send({
        error: 'SOLE_WORKSPACE_OWNER',
        message: `Önce “${soleOwnerMembership.workspace.name}” işletmesine başka bir sahip atayın.`
      })
    }

    const deletedEmail = `deleted-${found.id}-${Date.now()}@deleted.local`
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
    await prisma.$transaction([
      prisma.businessMember.updateMany({ where: { userId: found.id }, data: { status: 'inactive' } }),
      prisma.user.update({
        where: { id: found.id },
        data: { email: deletedEmail, name: 'Silinmiş Kullanıcı', password: unusablePassword, avatarStoredName: null, avatarMimeType: null, deletedAt: new Date() }
      })
    ])

    if (found.avatarStoredName) await unlink(safeAvatarPath(found.avatarStoredName)).catch(() => {})

    return reply.status(204).send()
  })
}

export function registerJwtPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes (256 bits) for production/beta. Use a strong random value.')
  }

  fastify.register(jwt, { secret: jwtSecret })

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, role: true, deletedAt: true }
    })
    if (!dbUser || dbUser.deletedAt) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    request.user.email = dbUser.email
    request.user.role = dbUser.role
  })
}
