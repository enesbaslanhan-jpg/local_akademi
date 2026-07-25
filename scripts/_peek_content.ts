import { PrismaClient } from '@prisma/client';
async function main() {
const prisma = new PrismaClient();
const kos = [6, 7, 8, 106, 107, 206, 207, 406, 846, 816, 726, 696];
for (const id of kos) {
  const ko = await prisma.knowledgeObject.findUnique({ where: { id }, select: { code: true, title: true, content: true } });
  if (ko) {
    const snippet = (ko.content || '').substring(0, 200).replace(/\n/g, ' ').trim();
    console.log(`${ko.code}: ${snippet.substring(0, 150)}...`);
  }
}
await prisma.$disconnect();
}
main();
