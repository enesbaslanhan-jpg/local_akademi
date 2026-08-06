const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.knowledgeObject.updateMany({
    where: {
      code: { in: ['CUR-021-01', 'CUR-039-01', 'CUR-019-04', 'CUR-035-01', 'CUR-026-04', 'CUR-025-01', 'CUR-013-02', 'CUR-014-02', 'CUR-001-01', 'FIN-CASHFLOW-001', 'CUR-002-03', 'FIN-REVENUE-001', 'CUR-038-01'] }
    },
    data: { status: 'published', isDemo: false }
  });
  console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
