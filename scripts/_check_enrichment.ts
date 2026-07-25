import { PrismaClient } from '@prisma/client';
async function main() {
const prisma = new PrismaClient();
const ids = [6,7,8,9,10,106,107,108,109,110,206,207,208,209,210,406,407,408,409,410];
for (const id of ids) {
  const ko = await prisma.knowledgeObject.findUnique({ where: { id }, select: { code: true, metadata: true } });
  if (!ko) continue;
  const m = JSON.parse(ko.metadata);
  console.log(`\n--- ${ko.code} ---`);
  console.log('Summary:', m.summary?.substring(0, 200));
  console.log('Word count:', m.summary?.split(/\s+/)?.length);
  console.log('Takeaways:', m.keyTakeaways?.length);
  console.log('Mistakes:', m.commonMistakes?.length);
  console.log('Example len:', m.example?.length);
}
await prisma.$disconnect();
}
main();
