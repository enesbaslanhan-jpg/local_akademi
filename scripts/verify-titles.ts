const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const legacy = await prisma.knowledgeObject.findMany({
    where: { metadata: { contains: 'LocalAkademi Faz 5' } },
    select: { id: true, title: true, code: true, status: true, metadata: true },
    orderBy: { id: 'asc' },
    take: 10
  });
  console.log('Sample updated KOs:');
  for (const ko of legacy) {
    const meta = JSON.parse(ko.metadata || '{}');
    console.log(`  ${ko.code}: "${ko.title}" [${ko.status}] level=${meta.level || 'N/A'}`);
  }
  console.log('\nVerifying unique titles...');
  const all = await prisma.knowledgeObject.findMany({
    where: { metadata: { contains: 'LocalAkademi Faz 5' } },
    select: { title: true }
  });
  const uniqueTitles = new Set(all.map(ko => ko.title.trim()));
  console.log(`Total: ${all.length}, Unique titles: ${uniqueTitles.size}`);
  if (uniqueTitles.size === all.length) {
    console.log('✓ All titles are unique!');
  } else {
    const dupes = new Map();
    for (const t of all) {
      dupes.set(t.title.trim(), (dupes.get(t.title.trim()) || 0) + 1);
    }
    const dups = [...dupes].filter(([, c]) => c > 1);
    console.log(`✗ ${dups.length} duplicate titles found`);
  }
}
main().finally(() => prisma.$disconnect());