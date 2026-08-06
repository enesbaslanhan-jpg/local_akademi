import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'browser-test-1785793432857@localakademi.com' }, select: { id: true, email: true, role: true, password: true } })
  console.log(user)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
