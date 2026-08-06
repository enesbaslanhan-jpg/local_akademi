import { PrismaClient } from '@prisma/client'
import fs from 'fs'
const prisma = new PrismaClient()

async function run() {
  const kos = await prisma.knowledgeObject.findMany({
    select: { code: true, title: true, status: true, isDemo: true }
  });
  fs.writeFileSync('scripts/all-kos.json', JSON.stringify(kos, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
