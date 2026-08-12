const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kos = await prisma.knowledgeObject.findMany({ select: { id: true, content: true } });
  for (const ko of kos) {
    if (!ko.content) continue;
    let idx = ko.content.indexOf('### Uygulama Kutuları');
    if (idx === -1) idx = ko.content.indexOf('## Uygulama Kutuları');
    if (idx !== -1) {
      let clean = ko.content.slice(0, idx).trim();
      if (clean.endsWith('---')) clean = clean.slice(0, -3).trim();
      await prisma.knowledgeObject.update({
        where: { id: ko.id },
        data: { content: clean }
      });
      console.log('Cleaned KO', ko.id);
    }
  }
  console.log('Done cleaning all KOs!');
}

main().catch(console.error);
