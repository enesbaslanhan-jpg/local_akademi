import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import { authRoutes, registerJwtPlugin } from './services/auth'
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
import { formulaRoutes } from './services/formulas'
import { adminRoutes } from './services/admin'
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
import { deleteExpiredReviewerTelemetry } from './services/ai-reviewer'
import { disconnectPrisma } from './lib/prisma'
import { existsSync } from 'fs'
import { join } from 'path'

const isProduction = process.env.NODE_ENV === 'production'
  || process.env.BETA_MODE === 'true'
  || process.env.BETA_MODE === 'invite_only'

async function build() {
  const server = Fastify({
    logger: {
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token', 'body.apiKey', 'body.secret'],
        censor: '[REDACTED]'
      }
    }
  })

  const corsOriginRaw = process.env.CORS_ORIGIN || (isProduction ? 'http://localhost:5173' : true)
  const corsOrigin = typeof corsOriginRaw === 'string'
    ? corsOriginRaw.split(',').map(s => s.trim()).filter(Boolean)
    : corsOriginRaw
  console.log('[CORS] raw:', corsOriginRaw, '| parsed:', JSON.stringify(corsOrigin))
  await server.register(cors, { origin: corsOrigin, credentials: true })

  await server.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute'
  })

  registerJwtPlugin(server)

  const publicPath = join(__dirname, 'public')
  if (existsSync(publicPath)) {
    await server.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      index: 'index.html'
    })
  }

  server.get('/health', async () => ({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }))

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
  if (process.env.ENABLE_MEMORY_API === 'true') {
    server.register(memoryRoutes, { prefix: '/api/memory' })
  }

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
  try {
    await server.listen({ port, host: process.env.HOST || '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

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
