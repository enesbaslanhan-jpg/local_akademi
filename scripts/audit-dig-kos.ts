import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const codes = ['DIG-MATURITY-001', 'DIG-TOOL-001', 'DIG-DATA-001', 'DIG-CYBER-001', 'DIG-AI-001']

async function main() {
  const [kos, admins] = await Promise.all([
    prisma.knowledgeObject.findMany({
      where: { code: { in: codes } },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        verificationStatus: true,
        reviewGate: true,
        reviewDue: true,
        publishedAt: true,
        updatedAt: true,
        sources: {
          select: {
            relation: true,
            note: true,
            source: { select: { id: true, title: true, url: true, authorityLevel: true, lastChecked: true } }
          }
        },
        reviews: { select: { status: true, reviewerId: true, reviewedAt: true, createdAt: true, notes: true } }
      },
      orderBy: { code: 'asc' }
    }),
    prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true } })
  ])

  console.log(JSON.stringify({ admins, knowledgeObjects: kos }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
