import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { recomputeLessonAndEnrollment } from './course-progress'

export async function taskRoutes(fastify: FastifyInstance) {
  // List user's task assignments
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user as any
    const tasks = await prisma.taskAssignment.findMany({
      where: { userId: user.id },
      include: { taskTemplate: true },
      orderBy: { updatedAt: 'desc' },
    })
    return { tasks }
  })

  // Assign a task template to the current user
  fastify.post('/:taskIdParam/assign', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as any
    const { taskIdParam } = request.params as { taskIdParam: string }

    const template = await prisma.taskTemplate.findUnique({
      where: { id: taskIdParam },
      include: { knowledgeObject: true },
    })
    if (!template || template.knowledgeObject.status !== 'published' || template.knowledgeObject.isDemo) {
      return reply.status(404).send({ error: 'Task content not found' })
    }

    // Idempotent: return existing assignment
    const existing = await prisma.taskAssignment.findFirst({
      where: { userId: user.id, taskId: taskIdParam },
    })
    if (existing) return existing

    const task = await prisma.taskAssignment.create({
      data: {
        userId: user.id,
        taskId: taskIdParam,
        koId: template.koId,
        taskTemplateId: template.id,
        status: 'assigned',
        progressPercent: 0,
      },
    })
    return task
  })

  // Update assignment (save draft, complete)
  fastify.patch('/assignments/:assignmentId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as any
    const { assignmentId } = request.params as { assignmentId: string }
    const { progress_percent, status, answers } = request.body as {
      progress_percent?: number
      status?: string
      answers?: any
    }

    if (progress_percent !== undefined && (!Number.isInteger(progress_percent) || progress_percent < 0 || progress_percent > 100)) {
      return reply.status(422).send({ error: 'progress_percent must be an integer between 0 and 100' })
    }
    if (status !== undefined && !['assigned', 'in_progress', 'completed'].includes(status)) {
      return reply.status(422).send({ error: 'Invalid task status' })
    }

    const task = await prisma.taskAssignment.findFirst({
      where: { id: assignmentId, userId: user.id },
      include: { taskTemplate: true },
    })
    if (!task) return reply.status(404).send({ error: 'Task not found' })

    const completing = status === 'completed' || progress_percent === 100
    if (completing) {
      let storedAnswers: any = {}
      try { storedAnswers = JSON.parse(task.answers || '{}') } catch { /* validated below */ }
      const nextAnswers = answers === undefined ? storedAnswers : answers
      const answerText = String(nextAnswers?.text || nextAnswers?.answer || '').trim()
      let minimumWords = 10
      try {
        const example = JSON.parse(task.taskTemplate?.exampleOutput || '{}')
        if (Number.isInteger(example.minWords) && example.minWords > 0) minimumWords = example.minWords
      } catch { /* use safe default */ }
      const wordCount = answerText ? answerText.split(/\s+/).length : 0
      if (wordCount < minimumWords) {
        return reply.status(422).send({
          error: `Görevi tamamlamak için en az ${minimumWords} kelimelik anlamlı bir yanıt yazın`,
          minimumWords,
          wordCount,
        })
      }
    }

    const updated = await prisma.taskAssignment.update({
      where: { id: assignmentId },
      data: {
        progressPercent: progress_percent ?? task.progressPercent,
        status: status ?? (progress_percent && progress_percent > 0 ? 'in_progress' : task.status),
        answers: answers === undefined ? task.answers : JSON.stringify(answers),
        reviewStatus: completing ? 'submitted' : task.reviewStatus,
        submittedAt: completing ? (task.submittedAt ?? new Date()) : task.submittedAt,
      },
    })

    // If completed, update lesson progress
    if (completing) {
      try {
        const lesson = await prisma.lesson.findFirst({
          where: { knowledgeObjectId: task.koId },
        })
        if (lesson) {
          await recomputeLessonAndEnrollment(prisma, user.id, lesson.id, { taskPercent: 100 })
        }
      } catch { /* non-critical */ }
    }

    return updated
  })
}
