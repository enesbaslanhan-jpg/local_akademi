import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const kos = await prisma.knowledgeObject.findMany({
    where: { status: 'published' },
    select: { id: true, code: true, title: true, type: true, content: true, summary: true, problem: true, category: { select: { name: true } } },
    take: 15
  })
  console.log(JSON.stringify(kos, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
