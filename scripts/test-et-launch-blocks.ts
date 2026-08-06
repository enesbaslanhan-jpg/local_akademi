import { PrismaClient } from '@prisma/client'
import { getEmbeddedPracticeBlocksForLesson } from '../src/services/embedded-practice-blocks'

const prisma = new PrismaClient()

async function main() {
  const blocks = await getEmbeddedPracticeBlocksForLesson(919)
  console.log(JSON.stringify(blocks, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
