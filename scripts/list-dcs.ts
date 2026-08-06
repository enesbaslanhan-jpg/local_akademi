import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const all = await prisma.decisionCheck.findMany({
    where: { published: true },
    select: { code: true, title: true, category: true },
    orderBy: { title: 'asc' }
  })
  console.log(JSON.stringify(all, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
