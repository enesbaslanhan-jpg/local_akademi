import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

async function computeEnrollmentProgress(courseId: number, userId: number) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
  })

  if (lessons.length === 0) return { progress: 0, status: 'not_started' as string }

  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessons.map(l => l.id) } },
  })

  if (progressRows.length === 0) return { progress: 0, status: 'not_started' as string }

  const totalPercent = progressRows.reduce((sum, p) => sum + p.overallPercent, 0)
  const avgPercent = Math.round(totalPercent / lessons.length)

  const completedCount = progressRows.filter(p => p.status === 'completed').length
  const allCompleted = completedCount === lessons.length

  let status: string
  if (allCompleted) {
    status = 'completed'
  } else if (progressRows.some(p => p.status === 'in_progress')) {
    status = 'in_progress'
  } else {
    status = 'not_started'
  }

  return { progress: avgPercent, status }
}

export async function enrollmentRoutes(fastify: FastifyInstance) {
  fastify.get('/my', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const user = request.user as any
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: { _count: { select: { lessons: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = await Promise.all(enrollments.map(async e => {
      const computed = await computeEnrollmentProgress(e.courseId, user.id)
      // Update if changed
      if (computed.progress !== e.progress || computed.status !== e.status) {
        await prisma.enrollment.update({
          where: { id: e.id },
          data: { progress: computed.progress, status: computed.status },
        })
      }
      return {
        id: e.id,
        courseId: e.courseId,
        courseTitle: e.course.title,
        courseCategory: e.course.category,
        courseLevel: e.course.level,
        courseLessonCount: e.course._count.lessons,
        progress: computed.progress,
        status: computed.status,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }
    }))

    return { enrollments: result }
  })

  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    const { courseId } = request.body as { courseId: number }

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return reply.status(404).send({ error: 'Course not found' })

    // Idempotent: return existing enrollment instead of 400
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      include: { course: true },
    })
    if (existing) {
      return { enrollment: existing }
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId: user.id, courseId, status: 'not_started' },
      include: { course: true },
    })
    return reply.status(201).send({ enrollment })
  })

  // Server-computed progress only - ignore client-supplied progress
  fastify.put('/:id/progress', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id) },
    })
    if (!enrollment) return reply.status(404).send({ error: 'Enrollment not found' })
    if (enrollment.userId !== user.id) return reply.status(403).send({ error: 'Not your enrollment' })

    const computed = await computeEnrollmentProgress(enrollment.courseId, user.id)
    const updated = await prisma.enrollment.update({
      where: { id: parseInt(id) },
      data: { progress: computed.progress, status: computed.status },
      include: { course: true },
    })
    return { enrollment: updated }
  })

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id) },
    })
    if (!enrollment) return reply.status(404).send({ error: 'Enrollment not found' })
    if (enrollment.userId !== user.id && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Not your enrollment' })
    }
    await prisma.enrollment.delete({ where: { id: parseInt(id) } })
    return reply.status(204).send()
  })
}
