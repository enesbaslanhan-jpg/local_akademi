import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import manifest from '../content/learning-pilot-v1.json';

const prisma = new PrismaClient();

const FRONT_TEMPLATES = [
  '{{TERM}} nedir?',
  '{{TERM}} kavramını açıklayın.',
  '{{TERM}} ne anlama gelir?',
  '{{TERM}} için bir örnek verin.',
  '{{TERM}} ile ilgili temel bilgi',
];

function mulberry32(a: number): () => number {
  let state = a;
  return () => {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededPick<T>(arr: T[], seed: number): T {
  const rng = mulberry32(seed);
  const idx = Math.floor(rng() * arr.length);
  return arr[idx];
}

async function main() {
  const manifestData = manifest as any;
  const pilotEntry = manifestData.kos as Array<{ koId: number; code: string; title: string; category: string }>;

  const koIds = pilotEntry.map(e => e.koId);
  const kos = await prisma.knowledgeObject.findMany({
    where: { id: { in: koIds } },
    select: { id: true, title: true, content: true, metadata: true },
  });
  const koMap = new Map(kos.map(k => [k.id, k]));

  let total = 0;
  for (const entry of pilotEntry) {
    const dbKo = koMap.get(entry.koId);
    if (!dbKo) { console.warn(`  KO ${entry.koId} not found in DB, skipping`); continue; }

    const seed = crypto.createHash('md5').update(`flashcard-${entry.koId}`).digest().readUInt32BE(0);
    const contentText = (dbKo.content || dbKo.title).slice(0, 150);

    for (let i = 0; i < 5; i++) {
      const term = seededPick([entry.title, entry.code, `${entry.title} - ${entry.category}`], seed + i);
      const front = FRONT_TEMPLATES[i % FRONT_TEMPLATES.length].replace('{{TERM}}', term);
      const existing = await prisma.flashcard.findUnique({
        where: { koId_order: { koId: entry.koId, order: i + 1 } },
        select: { id: true },
      });
      if (!existing) {
        await prisma.flashcard.create({
          data: {
          koId: entry.koId,
          front,
          back: contentText,
          order: i + 1,
          status: 'published',
          },
        });
      }
      total++;
    }
    console.log(`  ${entry.code}: 5 canonical cards present`);
  }
  console.log(`Total: ${total} flashcards for ${pilotEntry.length} KOs`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
