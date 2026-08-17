import { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import { recomputeLessonAndEnrollment } from './course-progress'

const startSchema = z.object({
  koId: z.number().int().positive()
})

const progressSchema = z.object({
  koId: z.number().int().positive(),
  progressPercent: z.number().int().min(0).max(100)
})

export async function learningRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.post('/learning/start', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let validated: z.infer<typeof startSchema>
    try {
      validated = startSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const ko = await prisma.knowledgeObject.findUnique({ where: { id: validated.koId } })
    if (!ko) return reply.status(404).send({ error: 'Knowledge object not found' })

    const progress = await prisma.knowledgeProgress.upsert({
      where: { userId_koId: { userId: user.id, koId: validated.koId } },
      create: {
        userId: user.id,
        koId: validated.koId,
        status: 'in_progress',
        progressPercent: 0,
        startedAt: new Date(),
        lastViewedAt: new Date()
      },
      update: {
        status: 'in_progress',
        lastViewedAt: new Date(),
        ...(ko.status === 'published' ? {} : {})
      }
    })

    return progress
  })

  fastify.post('/learning/progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let validated: z.infer<typeof progressSchema>
    try {
      validated = progressSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const progress = await prisma.knowledgeProgress.upsert({
      where: { userId_koId: { userId: user.id, koId: validated.koId } },
      create: {
        userId: user.id,
        koId: validated.koId,
        status: validated.progressPercent >= 100 ? 'completed' : 'in_progress',
        progressPercent: validated.progressPercent,
        startedAt: validated.progressPercent > 0 ? new Date() : undefined,
        lastViewedAt: new Date(),
        completedAt: validated.progressPercent >= 100 ? new Date() : undefined
      },
      update: {
        progressPercent: validated.progressPercent,
        lastViewedAt: new Date(),
        status: validated.progressPercent >= 100 ? 'completed' : 'in_progress',
        ...(validated.progressPercent >= 100 ? { completedAt: new Date() } : {}),
        ...(validated.progressPercent > 0 && { startedAt: undefined })
      }
    })

    if (validated.progressPercent >= 100) {
      await prisma.activityEvent.create({
        data: {
          userId: user.id,
          eventType: 'ko_completed',
          title: `KO tamamlandı: ${progress.id}`,
          detail: JSON.stringify({ koId: validated.koId, progressPercent: validated.progressPercent })
        }
      }).catch(() => {})
    }

    return progress
  })

  fastify.post('/learning/complete', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let validated: z.infer<typeof startSchema>
    try {
      validated = startSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const progress = await prisma.knowledgeProgress.upsert({
      where: { userId_koId: { userId: user.id, koId: validated.koId } },
      create: {
        userId: user.id,
        koId: validated.koId,
        status: 'completed',
        progressPercent: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        lastViewedAt: new Date()
      },
      update: {
        status: 'completed',
        progressPercent: 100,
        completedAt: new Date(),
        lastViewedAt: new Date()
      }
    })

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        eventType: 'ko_completed',
        title: `KO tamamlandı: ${progress.id}`,
        detail: JSON.stringify({ koId: validated.koId })
      }
    }).catch(() => {})

    return progress
  })

  fastify.get('/learning/progress/:koId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { koId } = request.params as { koId: string }

    const progress = await prisma.knowledgeProgress.findUnique({
      where: { userId_koId: { userId: user.id, koId: parseInt(koId) } }
    })

    if (!progress) {
      return { status: 'not_started', progressPercent: 0 }
    }

    return progress
  })

  fastify.get('/learning/progress', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user as { id: number }
    const progress = await prisma.knowledgeProgress.findMany({
      where: { userId: user.id },
      orderBy: { lastViewedAt: 'desc' }
    })
    return { results: progress, total: progress.length }
  })

  // Reading complete for lesson
  const readingCompleteSchema = z.object({
    lessonId: z.number().int().positive(),
    courseId: z.number().int().positive(),
  })

  fastify.post('/learning/reading-complete', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    let validated: z.infer<typeof readingCompleteSchema>
    try {
      validated = readingCompleteSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const lesson = await prisma.lesson.findFirst({ where: { id: validated.lessonId, courseId: validated.courseId } })
    if (!lesson) return reply.status(404).send({ error: 'Lesson not found' })
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: validated.courseId } },
    })
    if (!enrollment) return reply.status(403).send({ error: 'Not enrolled' })
    return recomputeLessonAndEnrollment(prisma, user.id, validated.lessonId, { readingPercent: 100 })
  })

  /* Ders açıldığında "kaldığın yer" işaretini yazar.
   *
   * İLERLEME YÜZDESİNE DOKUNMAZ — bir dersi açmak onu okumuş saymaz.
   * Yalnız `lastViewedAt` güncellenir; Course Player ders id'si olmadan
   * açıldığında ve Ana Sayfa'daki "devam et" kartı bunu kullanır.
   * Bu kayıt olmadan ikisi de her zaman ilk dersi/aynı kursu gösterir.
   */
  const lessonViewSchema = z.object({
    lessonId: z.number().int().positive()
  })

  fastify.post('/learning/lesson-view', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    let validated: z.infer<typeof lessonViewSchema>
    try {
      validated = lessonViewSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: validated.lessonId } })
    if (!lesson) return reply.status(404).send({ error: 'Lesson not found' })
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    })
    if (!enrollment) return reply.status(403).send({ error: 'Not enrolled' })

    const now = new Date()
    await prisma.$transaction([
      prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: validated.lessonId } },
        create: {
          userId: user.id,
          lessonId: validated.lessonId,
          status: 'in_progress',
          startedAt: now,
          lastViewedAt: now
        },
        /* Tamamlanmış dersin durumunu geri almıyoruz. */
        update: { lastViewedAt: now }
      }),
      /* Kayıt "başlamadı" ise ilk görüntülemede "devam ediyor" olur.
         Ayrıca `@updatedAt` tetiklenir; Ana Sayfa sıralaması için gerekli. */
      prisma.enrollment.update({
        where: { id: enrollment.id },
        data: enrollment.status === 'not_started'
          ? { status: 'in_progress' }
          : { status: enrollment.status }
      })
    ])

    return { ok: true, lessonId: validated.lessonId, lastViewedAt: now }
  })

  // Update lesson overall progress (called from quiz/task completion)
  const lessonProgressSchema = z.object({
    lessonId: z.number().int().positive(),
    quizPercent: z.number().int().min(0).max(100).optional(),
    taskPercent: z.number().int().min(0).max(100).optional(),
  })

  fastify.post('/learning/lesson-progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    let validated: z.infer<typeof lessonProgressSchema>
    try {
      validated = lessonProgressSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: validated.lessonId } })
    if (!lesson) return reply.status(404).send({ error: 'Lesson not found' })
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    })
    if (!enrollment) return reply.status(403).send({ error: 'Not enrolled' })
    return recomputeLessonAndEnrollment(prisma, user.id, validated.lessonId, {
      quizPercent: validated.quizPercent,
      taskPercent: validated.taskPercent,
    })
  })
}
