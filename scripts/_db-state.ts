import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const published = await p.knowledgeObject.count({ where: { status: 'published' } });
  const verified = await p.knowledgeObject.count({ where: { verificationStatus: 'verified' } });
  const hasPublishedAt = await p.knowledgeObject.count({ where: { publishedAt: { not: null } } });
  const curPub = await p.knowledgeObject.count({ where: { code: { startsWith: 'CUR-' }, status: 'published' } });
  const kbxPub = await p.knowledgeObject.count({ where: { code: { startsWith: 'KBX-' }, status: 'published' } });
  const curRev = await p.knowledgeObject.count({ where: { code: { startsWith: 'CUR-' }, reviews: { some: { status: 'approved' } } } });
  const kbxRev = await p.knowledgeObject.count({ where: { code: { startsWith: 'KBX-' }, reviews: { some: { status: 'approved' } } } });
  const curPubEv = await p.knowledgeObject.count({ where: { code: { startsWith: 'CUR-' }, publicationEvents: { some: { action: 'published' } } } });
  const kbxPubEv = await p.knowledgeObject.count({ where: { code: { startsWith: 'KBX-' }, publicationEvents: { some: { action: 'published' } } } });
  console.log(JSON.stringify({ published, verified, hasPublishedAt, curPub, kbxPub, curRev, kbxRev, curPubEv, kbxPubEv }));
  await p.$disconnect();
})();
