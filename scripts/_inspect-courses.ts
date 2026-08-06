import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function run() {
  const courses = await prisma.course.findMany({
    select: { id: true, title: true, category: true, level: true, published: true },
    orderBy: { title: 'asc' }
  })
  fs.writeFileSync('scripts/_courses.json', JSON.stringify(courses, null, 2))
  console.log('courses written', courses.length)
}

run().catch(console.error).finally(() => prisma.$disconnect())
