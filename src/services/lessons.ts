import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function lessonRoutes(fastify: FastifyInstance) {
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const lesson = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: { course: true }
    })
    if (!lesson) {
      return reply.status(404).send({ error: 'Lesson not found' })
    }
    return { lesson }
  })

  fastify.post('/courses/:courseId/lessons', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { courseId } = request.params as { courseId: string }
    const { title, content, order } = request.body as {
      title: string
      content: string
      order: number
    }
    const course = await prisma.course.findUnique({ where: { id: parseInt(courseId) } })
    if (!course) {
      return reply.status(404).send({ error: 'Course not found' })
    }
    const lesson = await prisma.lesson.create({
      data: { courseId: parseInt(courseId), title, content, order }
    })
    return reply.status(201).send({ lesson })
  })

  fastify.put('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { id } = request.params as { id: string }
    const { title, content, order } = request.body as {
      title?: string
      content?: string
      order?: number
    }
    const lesson = await prisma.lesson.update({
      where: { id: parseInt(id) },
      data: { title, content, order }
    })
    return { lesson }
  })

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }
    const { id } = request.params as { id: string }
    await prisma.lesson.delete({ where: { id: parseInt(id) } })
    return reply.status(204).send()
  })
}