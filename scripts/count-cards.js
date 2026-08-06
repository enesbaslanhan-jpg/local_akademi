const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cards = await prisma.practicalCard.findMany({ include: { versions: true } });
  console.log('Total cards:', cards.length);
  console.log('Total versions:', cards.reduce((acc, c) => acc + c.versions.length, 0));
}
main().catch(console.error).finally(() => prisma.$disconnect());
