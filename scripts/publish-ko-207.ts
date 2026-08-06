import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ko = await prisma.knowledgeObject.update({
    where: { id: 207 },
    data: {
      status: 'archived',
      archivedAt: new Date()
    }
  })
  console.log('KO 207 status:', ko.status)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
