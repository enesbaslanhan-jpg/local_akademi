import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: 'browser-test' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, email: true, role: true, createdAt: true }
  })
  console.log(JSON.stringify(users, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
