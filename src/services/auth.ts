import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import jwt from '@fastify/jwt'
import { z } from 'zod'
import { createAuditLog } from './audit.js'

const prisma = new PrismaClient()

const registerSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(2).max(100)
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

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
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

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  })

  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const found = await prisma.user.findUnique({ where: { id: user.id } })
    if (!found) {
      return reply.status(404).send({ error: 'User not found' })
    }
    const pref = await prisma.userPreference.findUnique({ where: { userId: found.id } })
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      onboardingCompleted: pref?.onboardingCompleted ?? false
    }
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
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}
