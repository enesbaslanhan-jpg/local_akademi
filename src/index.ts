import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { authRoutes, registerJwtPlugin } from './services/auth'
import { decisionCheckRoutes } from './services/decision-checks'
import { courseRoutes } from './services/courses'
import { lessonRoutes } from './services/lessons'
import { enrollmentRoutes } from './services/enrollments'
import { knowledgeRoutes } from './services/knowledge'
import { mentorRoutes } from './services/mentor'
import { conversationRoutes } from './services/conversation'
import { learningPathRoutes } from './services/learningPath'
import { quizRoutes } from './services/quizzes'
import { taskRoutes } from './services/tasks'
import { documentRoutes } from './services/documents'
import { businessRoutes } from './services/business'
import { workspaceRoutes } from './services/workspace'
import { businessTrackerRoutes } from './services/business-tracker'
import { startBusinessReminderWorker } from './services/business-reminder-worker'
import { formulaRoutes } from './services/formulas'
import { adminRoutes } from './services/admin'
import { practicalCardRoutes } from './services/practical-cards'
import { reportRoutes } from './services/reports'
import { knowledgeV2Routes } from './services/knowledge-v2'
import { onboardingRoutes } from './services/onboarding'
import { assessmentRoutes } from './services/assessment'
import { learningRoutes } from './services/learning'
import { importRoutes } from './services/import'
import { companionContentRoutes } from './services/companion-content'
import { learnerDashboardRoutes } from './services/learnerDashboard'
import { pilotDashboardRoutes } from './services/pilotDashboard'
import { sourceRoutes } from './services/sources'
import { memoryRoutes } from './services/memory/memory-routes'
import { flashcardRoutes } from './services/flashcard-routes'
import { videoRoutes } from './services/videos'
import { communityRoutes } from './services/community'
import { financialModelRoutes } from './services/financial-models/routes'
import { ensureFinancialModelCatalog } from './services/financial-models/catalog'
import { deleteExpiredReviewerTelemetry } from './services/ai-reviewer'
import { disconnectPrisma, prisma } from './lib/prisma'
import { RELEASE_INFO } from './config/release'
import { existsSync } from 'fs'
import { join } from 'path'

const isProduction = process.env.NODE_ENV === 'production'
  || process.env.BETA_MODE === 'true'
  || process.env.BETA_MODE === 'invite_only'

const UNSAFE_JWT_SECRETS = [
  'secret', 'password', 'changeme', 'jwt_secret',
  'your-secret-key', 'default', '12345678901234567890123456789012',
]

export function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET

  if (!secret || typeof secret !== 'string') {
    throw new Error(
      'JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }

  if (secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET must not be empty or whitespace-only. Generate a strong random value.'
    )
  }

  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 bytes (256 bits). Use a strong random value.'
    )
  }

  if (UNSAFE_JWT_SECRETS.includes(secret.toLowerCase().trim())) {
    throw new Error(
      'JWT_SECRET contains an insecure default value. Generate a strong random secret.'
    )
  }
}

async function build() {
  validateJwtSecret()

  const server = Fastify({
    logger: {
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token', 'body.apiKey', 'body.secret'],
        censor: '[REDACTED]'
      }
    },
    bodyLimit: 1048576,
    trustProxy: true
  })

  const corsOriginRaw = process.env.CORS_ORIGIN || (isProduction ? 'http://localhost:5173' : true)
  const corsOrigin = typeof corsOriginRaw === 'string'
    ? corsOriginRaw.split(',').map(s => s.trim()).filter(Boolean)
    : corsOriginRaw
  console.log('[CORS] raw:', corsOriginRaw, '| parsed:', JSON.stringify(corsOrigin))
  await server.register(cors, { origin: corsOrigin, credentials: true })

  server.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }
    return payload
  })

  await server.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '15 minutes'
  })

  registerJwtPlugin(server)

  const publicPath = join(__dirname, 'public')
  const hasPublicDir = existsSync(publicPath)
  if (hasPublicDir) {
    await server.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      index: 'index.html'
    })
  }

  server.get('/health', { config: { rateLimit: false } }, async (_request, reply) => {
    try {
      const [publishedCourses, publishedLessons, publishedKnowledgeObjects] = await Promise.all([
        prisma.course.count({ where: { published: true } }),
        prisma.lesson.count({ where: { course: { published: true } } }),
        prisma.knowledgeObject.count({ where: { status: 'published' } }),
      ])
      return {
        status: 'ok',
        version: RELEASE_INFO.version,
        release: RELEASE_INFO,
        database: {
          provider: RELEASE_INFO.databaseProvider,
          label: 'PostgreSQL + Prisma',
          connected: true,
          schema: 'public',
        },
        curriculum: {
          standard: RELEASE_INFO.curriculumStandard,
          publishedCourses,
          publishedLessons,
          publishedKnowledgeObjects,
        },
        timestamp: new Date().toISOString(),
      }
    } catch {
      return reply.status(503).send({
        status: 'degraded',
        version: RELEASE_INFO.version,
        release: RELEASE_INFO,
        database: {
          provider: RELEASE_INFO.databaseProvider,
          label: 'PostgreSQL + Prisma',
          connected: false,
          schema: 'public',
        },
        timestamp: new Date().toISOString(),
      })
    }
  })

  server.register(authRoutes, { prefix: '/auth' })
  server.register(courseRoutes, { prefix: '/courses' })
  server.register(lessonRoutes, { prefix: '/lessons' })
  server.register(enrollmentRoutes, { prefix: '/enrollments' })
  server.register(knowledgeRoutes, { prefix: '/knowledge' })
  server.register(mentorRoutes, { prefix: '/mentor' })
  server.register(conversationRoutes, { prefix: '/mentor/conversations' })
  server.register(learningPathRoutes, { prefix: '/learning-path' })
  server.register(quizRoutes, { prefix: '/quizzes' })
  server.register(taskRoutes, { prefix: '/tasks' })
  server.register(documentRoutes, { prefix: '/documents' })
  server.register(businessRoutes, { prefix: '/business' })
  server.register(workspaceRoutes, { prefix: '/workspaces' })
  server.register(businessTrackerRoutes, { prefix: '/workspaces' })
  server.register(formulaRoutes)
  server.register(adminRoutes, { prefix: '/admin' })
  server.register(reportRoutes, { prefix: '/reports' })
  server.register(knowledgeV2Routes)
  server.register(learnerDashboardRoutes, { prefix: '/dashboard' })
  server.register(pilotDashboardRoutes, { prefix: '/dashboard' })
  server.register(onboardingRoutes)
  server.register(assessmentRoutes)
  server.register(learningRoutes)
  server.register(importRoutes)
  server.register(companionContentRoutes)
  server.register(sourceRoutes)
  server.register(flashcardRoutes, { prefix: '/flashcards' })
  server.register(videoRoutes, { prefix: '/videos' })
  server.register(communityRoutes, { prefix: '/community' })
  server.register(financialModelRoutes)
  const memoryApiEnabled = process.env.ENABLE_MEMORY_API !== 'false'
  if (memoryApiEnabled) {
    server.register(memoryRoutes, { prefix: '/api/memory' })
  }

  server.setNotFoundHandler(async (request, reply) => {
    if (hasPublicDir && process.env.NODE_ENV !== 'test') {
      return reply.sendFile('index.html', publicPath)
    }
    return reply.status(404).send({ error: 'Route not found' })
  })

  server.setErrorHandler((error: Error, request, reply) => {
    request.log.error(error)
    const err = error as any
    const statusCode = err.statusCode || 500
    const message = isProduction && statusCode === 500
      ? 'Internal server error'
      : error.message ?? 'Internal server error'
    reply.status(statusCode).send({ error: message })
  })

  return server
}

export function parseShutdownTimeout(): number {
  const raw = process.env.SHUTDOWN_TIMEOUT_MS
  if (!raw) return 10000
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1000 || n > 120000) return 10000
  return n
}

export function createShutdownHandler(server: FastifyInstance) {
  const shuttingDown = { current: false }
  return async (signal: string) => {
    if (shuttingDown.current) return
    shuttingDown.current = true

    const timeoutMs = parseShutdownTimeout()
    server.log.info({ signal, timeoutMs }, 'Shutdown initiated')

    const timer = setTimeout(() => {
      server.log.error('Shutdown timeout reached — forcing exit')
      process.exit(1)
    }, timeoutMs)
    timer.unref()

    try {
      await server.close()
      server.log.info({ signal }, 'Server closed gracefully')
      await disconnectPrisma()
      server.log.info('Prisma disconnected')
      process.exit(0)
    } catch (err) {
      server.log.error({ err, signal }, 'Server close failed')
      await disconnectPrisma()
      process.exit(1)
    }
  }
}

export async function start() {
  const server = await build()
  const port = Number.parseInt(process.env.PORT || '3000', 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  await ensureFinancialModelCatalog(prisma)
  let stopReminderWorker = () => {}
  server.addHook('onClose', async () => {
    stopReminderWorker()
  })
  try {
    await server.listen({ port, host: process.env.HOST || '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  stopReminderWorker = startBusinessReminderWorker(undefined, {
    onError: error => server.log.error({ error }, 'Business reminder worker failed')
  })

  void deleteExpiredReviewerTelemetry().catch(() => {
    server.log.warn(
      { errorCode: 'REVIEWER_METRICS_RETENTION_FAILED' },
      'AI reviewer telemetry retention cleanup failed',
    )
  })

  const handler = createShutdownHandler(server)
  process.on('SIGTERM', handler)
  process.on('SIGINT', handler)
}

export default build
