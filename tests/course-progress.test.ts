import { afterAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { recomputeLessonAndEnrollment } from '../src/services/course-progress'

const prisma = new PrismaClient()
const createdUserIds: number[] = []
const createdCourseIds: number[] = []

describe('Course progress engine', () => {
  it('quiz ve görevi olmayan legacy dersi yalnızca okumayla tamamlar', async () => {
    const user = await prisma.user.create({
      data: { email: `progress-${Date.now()}@test.local`, password: 'test-hash', name: 'Progress Test', role: 'learner' },
    })
    createdUserIds.push(user.id)
    const course = await prisma.course.create({
      data: { title: 'Legacy Progress Test', description: 'Test', category: 'test', published: true },
    })
    createdCourseIds.push(course.id)
    const lesson = await prisma.lesson.create({
      data: { courseId: course.id, title: 'Legacy lesson', content: 'Content', order: 1 },
    })
    await prisma.enrollment.create({ data: { userId: user.id, courseId: course.id } })

    const progress = await recomputeLessonAndEnrollment(prisma, user.id, lesson.id, { readingPercent: 100 })
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    })

    expect(progress.overallPercent).toBe(100)
    expect(progress.status).toBe('completed')
    expect(enrollment.progress).toBe(100)
    expect(enrollment.status).toBe('completed')
  })
})

afterAll(async () => {
  for (const id of createdUserIds) await prisma.user.delete({ where: { id } }).catch(() => {})
  for (const id of createdCourseIds) await prisma.course.delete({ where: { id } }).catch(() => {})
  await prisma.$disconnect()
})
