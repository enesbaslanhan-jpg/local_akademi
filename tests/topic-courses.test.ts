import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Courses DB structure', () => {
  it('Course model has new fields', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Course' AND table_schema = 'public'"
    )
    const names = cols.map(c => c.column_name)
    expect(names).toContain('slug')
    expect(names).toContain('estimatedMinutes')
    expect(names).toContain('outcomes')
    expect(names).toContain('sourceType')
    expect(names).toContain('sortOrder')
    expect(names).toContain('metadata')
  })

  it('Lesson model has new fields', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Lesson' AND table_schema = 'public'"
    )
    const names = cols.map(c => c.column_name)
    expect(names).toContain('knowledgeObjectId')
    expect(names).toContain('estimatedMinutes')
  })

  it('LessonProgress model exists', async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = 'LessonProgress'"
    )
    expect(tables.length).toBe(1)
  })

  it('QuizAttempt has quizId field', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'QuizAttempt' AND table_schema = 'public'"
    )
    const names = cols.map(c => c.column_name)
    expect(names).toContain('quizId')
  })

  it('Course create/read works', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Test Course',
        description: 'Test',
        category: 'test',
        slug: `test-slug-${Date.now()}`,
        sourceType: 'test',
        sortOrder: 99,
        metadata: JSON.stringify({ standard: 'test' }),
        outcomes: '[]',
      },
    })
    expect(course.id).toBeTruthy()
    expect(course.title).toBe('Test Course')
    expect(course.sourceType).toBe('test')
    expect(course.sortOrder).toBe(99)
    expect(JSON.parse(course.metadata).standard).toBe('test')
    await prisma.course.delete({ where: { id: course.id } })
  })

  it('Lesson create/read works', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Lesson Test Course',
        description: 'Test',
        category: 'test',
        slug: `lesson-test-${Date.now()}`,
        outcomes: '[]',
      },
    })
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: 'Test Lesson',
        content: 'Test content',
        order: 1,
      },
    })
    expect(lesson.id).toBeTruthy()
    expect(lesson.title).toBe('Test Lesson')
    expect(lesson.order).toBe(1)
    await prisma.lesson.delete({ where: { id: lesson.id } })
    await prisma.course.delete({ where: { id: course.id } })
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
