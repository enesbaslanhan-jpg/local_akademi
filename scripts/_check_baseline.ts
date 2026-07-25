import { PrismaClient } from '@prisma/client';
async function main() {
const prisma = new PrismaClient();
const total = await prisma.knowledgeObject.count({ where: { status: 'published', isDemo: false } });
console.log('Total published non-demo KOs:', total);
const samples = await prisma.knowledgeObject.findMany({
  where: { status: 'published', isDemo: false },
  take: 3,
  select: { code: true, title: true, metadata: true,
    _count: { select: { sources: true, quizzes: true, taskTemplates: true, courseLessons: true } }
  }
});
for (const ko of samples) {
  const m = JSON.parse(ko.metadata || '{}');
  console.log(ko.code, ko.title, 'cat:', m.category, 'sub:', m.subcategory, 'counts:', JSON.stringify(ko._count));
}
// Count KOs with all requirements
const withAll = await prisma.knowledgeObject.findMany({
  where: {
    status: 'published', isDemo: false,
    sources: { some: {} },
    quizzes: { some: {} },
    taskTemplates: { some: {} },
    courseLessons: { some: {} }
  },
  select: { code: true, metadata: true }
});
console.log('KOs with source+quiz+task+lesson:', withAll.length);
// Categorize
const byCat: Record<string,number> = {};
for (const ko of withAll) {
  try {
    const m = JSON.parse(ko.metadata || '{}');
    const c = m.category || 'unknown';
    byCat[c] = (byCat[c] || 0) + 1;
  } catch {}
}
console.log('By category:', JSON.stringify(byCat, null, 2));
await prisma.$disconnect();
}
main();
