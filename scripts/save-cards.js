const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const cards = await prisma.practicalCard.findMany({ include: { versions: true, knowledgeObjects: { include: { knowledgeObject: true } } } });
  fs.writeFileSync('reports/cards-full.json', JSON.stringify(cards, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
