import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const all = await prisma.decisionCheck.findMany({
    where: { title: { contains: 'karl', mode: 'insensitive' } },
    select: { code: true, title: true, description: true }
  })
  console.log(JSON.stringify(all, null, 2))
  const all2 = await prisma.decisionCheck.findMany({
    where: { description: { contains: 'urun', mode: 'insensitive' } },
    select: { code: true, title: true, description: true }
  })
  console.log('DESC', JSON.stringify(all2, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
