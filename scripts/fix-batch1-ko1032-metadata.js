// KO1036/1037/1038 already have real PracticalCard links (PC-RETAIL-002/003/004),
// so the metadata.embeddedPracticeBlocks I wrote earlier for them is dead weight
// (getEmbeddedPracticeBlocksForKnowledgeObject prefers the PracticalCard path and
// never reaches the metadata fallback when a link exists). Remove it there.
// KO1032 (Ders 17) has NO PracticalCard link, so its cards will be added as real
// PracticalCard rows in a separate script; drop the invalid metadata fallback here too
// (wrong block types were used: 'comparison' is not a valid embedded block type).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  for (const koId of [1036, 1037, 1038, 1032]) {
    const ko = await prisma.knowledgeObject.findUnique({ where: { id: koId } });
    const meta = JSON.parse(ko.metadata || '{}');
    delete meta.embeddedPracticeBlocks;
    delete meta.embeddedPracticeBlocksVersion;
    console.log(`KO ${koId}: removing dead embeddedPracticeBlocks metadata`);
    if (apply) {
      await prisma.knowledgeObject.update({ where: { id: koId }, data: { metadata: JSON.stringify(meta) } });
      console.log('  ✓ applied');
    }
  }
}
main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
