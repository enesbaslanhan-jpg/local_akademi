import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function run() {
  const [kos, courses, categories, lessons] = await Promise.all([
    prisma.knowledgeObject.findMany({
      select: { id: true, code: true, title: true, type: true, status: true, isDemo: true, categoryId: true },
      orderBy: { code: 'asc' }
    }),
    prisma.course.findMany({
      select: { id: true, title: true, category: true, level: true, published: true },
      orderBy: { id: 'asc' }
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.lesson.findMany({
      select: { id: true, courseId: true, knowledgeObjectId: true, title: true, order: true },
      orderBy: [{ courseId: 'asc' }, { order: 'asc' }]
    })
  ])

  const result = { kos, courses, categories, lessons }
  fs.writeFileSync('scripts/_inspect-content.json', JSON.stringify(result, null, 2))
  console.log(`KO count: ${kos.length}, Courses: ${courses.length}, Categories: ${categories.length}, Lessons: ${lessons.length}`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
