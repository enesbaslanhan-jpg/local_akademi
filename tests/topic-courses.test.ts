import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Courses DB structure', () => {
  it('Course model has new fields', async () => {
    // Check by creating a raw query
    const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM pragma_table_info('Course')"
    )
    const names = cols.map(c => c.name)
    expect(names).toContain('slug')
    expect(names).toContain('estimatedMinutes')
    expect(names).toContain('outcomes')
    expect(names).toContain('sourceType')
  })

  it('Lesson model has new fields', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM pragma_table_info('Lesson')"
    )
    const names = cols.map(c => c.name)
    expect(names).toContain('knowledgeObjectId')
    expect(names).toContain('estimatedMinutes')
  })

  it('LessonProgress model exists', async () => {
    const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='LessonProgress'"
    )
    expect(tables.length).toBe(1)
  })

  it('QuizAttempt has quizId field', async () => {
    const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM pragma_table_info('QuizAttempt')"
    )
    const names = cols.map(c => c.name)
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
      },
    })
    expect(course.id).toBeGreaterThan(0)
    expect(course.slug).toContain('test-slug')
    expect(course.sourceType).toBe('test')

    await prisma.course.delete({ where: { id: course.id } })
  })
})

describe('Formula service', () => {
  it('read operations work on existing data', async () => {
    const count = await prisma.formulaCalculation.count()
    expect(typeof count).toBe('number')
  })

  it('Course queries return expected shape', async () => {
    const courses = await prisma.course.findMany({ take: 5 })
    expect(Array.isArray(courses)).toBe(true)
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
