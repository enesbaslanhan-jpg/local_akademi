const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.knowledgeObject.count();
  const legacy = await prisma.knowledgeObject.findMany({
    where: { metadata: { contains: 'LocalAkademi Faz 5' } },
    select: { title: true }
  });
  const titleCounts = new Map();
  for (const ko of legacy) {
    titleCounts.set(ko.title.trim(), (titleCounts.get(ko.title.trim()) || 0) + 1);
  }
  const bad = [...titleCounts].filter(([, count]) => count !== 5);
  console.log('Total KOs:', count);
  console.log('Legacy KOs:', legacy.length);
  console.log('Unique titles:', titleCounts.size);
  console.log('Bad titles (count != 5):', bad.length);
  if (bad.length > 0) {
    console.log('Bad titles:', JSON.stringify(bad.slice(0, 10), null, 2));
  }
}
main().finally(() => prisma.$disconnect());