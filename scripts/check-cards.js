const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cards = await prisma.practicalCard.findMany({
    include: {
      knowledgeObjects: { include: { knowledgeObject: true } },
      versions: true
    }
  });
  console.log(JSON.stringify(cards, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
