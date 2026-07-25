import { PrismaClient } from '@prisma/client';
import manifest from '../content/learning-pilot-v1.json';

const prisma = new PrismaClient();
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) { passed++; }
  else { console.error(`${RED}FAIL${RESET}: ${label}`); failed++; }
}

async function main() {
  const manifestData = manifest as any;
  const entries = manifestData.kos as Array<{ koId: number; code: string; title: string }>;

  // 1. Total flashcard count
  const total = await prisma.flashcard.count();
  check(total === 150, `Total flashcards: expected 150, got ${total}`);

  // 2. Per-KO count
  for (const ko of entries) {
    const count = await prisma.flashcard.count({ where: { koId: ko.koId } });
    check(count === 5, `  ${ko.code}: expected 5 cards, got ${count}`);
  }

  // 3. All published
  const drafts = await prisma.flashcard.count({ where: { status: { not: 'published' } } });
  check(drafts === 0, `All flashcards must be published: found ${drafts} non-published`);

  // 4. Unique front + koId
  const cards = await prisma.flashcard.findMany({ orderBy: [{ koId: 'asc' }, { order: 'asc' }] });
  const seen = new Set<string>();
  for (const c of cards) {
    const key = `${c.koId}::${c.front}`;
    check(!seen.has(key), `Duplicate front for KO ${c.koId}: "${c.front.slice(0, 40)}"`);
    seen.add(key);
  }

  // 5. Order sequence per KO
  const koIds = [...new Set(cards.map(c => c.koId))].sort((a, b) => a - b);
  for (const koId of koIds) {
    const koCards = cards.filter(c => c.koId === koId);
    for (let i = 0; i < koCards.length; i++) {
      check(koCards[i].order === i + 1, `  KO ${koId} card ${i}: expected order ${i + 1}, got ${koCards[i].order}`);
    }
  }

  // 6. Non-empty fields
  for (const c of cards) {
    check(c.front.trim().length >= 20, `Short/empty front on KO ${c.koId} order ${c.order}`);
    check(c.back.trim().length >= 30, `Short/empty back on KO ${c.koId} order ${c.order}`);
    check((c.hint || '').trim().length >= 15, `Short/empty hint on KO ${c.koId} order ${c.order}`);
    check(!c.back.trim().startsWith('#'), `Raw Markdown heading in back on KO ${c.koId} order ${c.order}`);
  }

  // 7. Each card must teach a distinct point within its KO.
  for (const koId of koIds) {
    const backs = cards.filter(c => c.koId === koId).map(c => c.back.trim());
    check(new Set(backs).size === backs.length, `Duplicate backs found for KO ${koId}`);
  }

  console.log(`\n${GREEN}${passed} passed${RESET}, ${failed ? `${RED}${failed} failed${RESET}` : '0 failed'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
