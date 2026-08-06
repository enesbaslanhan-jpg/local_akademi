import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { title: { contains: 'E-Ticarete Başla' } },
    include: { lessons: true }
  })
  console.log('COURSE', JSON.stringify(course, null, 2))

  const lesson = await prisma.lesson.findFirst({
    where: { title: { contains: 'Pazar Yeri' } },
    include: { knowledgeObject: true, course: true }
  })
  console.log('LESSON', JSON.stringify(lesson, null, 2))

  const dcs = await prisma.decisionCheck.findMany({
    where: { title: { in: ['Pazaryeri komisyonundan sonra ne kalıyor?', 'Ürünüm gerçekten kârlı mı?', 'Nakit akışım riskli mi?'] } }
  })
  console.log('DECISION_CHECKS', JSON.stringify(dcs, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
