import { PrismaClient } from '@prisma/client';
async function main() {
const p = new PrismaClient();
const k = await p.knowledgeObject.findUnique({ where: { id: 6 }, select: { metadata: true } });
const m = JSON.parse(k!.metadata);
console.log('enrichmentVersion:', m.enrichmentVersion);
console.log('SUMMARY:', m.summary?.substring(0, 100));
console.log('TAKEAWAYS:', JSON.stringify(m.keyTakeaways?.slice(0, 2)));
console.log('MISTAKES:', JSON.stringify(m.commonMistakes?.slice(0, 2)));
await p.$disconnect();
}
main();
