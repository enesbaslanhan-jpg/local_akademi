import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.update({
    where: { id: 44 },
    data: {
      published: false,
      title: '[Eski Kopya] Pazar Yeri Seçimi'
    }
  })
  console.log('Course 44 deprecated:', course.published, course.title)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
