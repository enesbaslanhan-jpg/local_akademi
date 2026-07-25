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

const CANONICAL_TASK_TITLES = new Set(['İşletmene Uygula V1', 'Yeni Alan Uygulaması V1']);

async function main() {
  const m = manifest as any;
  const entries = m.kos as Array<{ koId: number; code: string; title: string; category: string }>;
  const pilotKoIds = entries.map(e => e.koId);

  // 1. Total task templates for pilot KOs = 30 (1 per KO)
  const total = await prisma.taskTemplate.count({ where: { koId: { in: pilotKoIds } } });
  check(total === 30, `Total pilot tasks: expected 30, got ${total}`);

  // 2. Per-KO: exactly 1 canonical task with V2 fields
  for (const entry of entries) {
    const templates = await prisma.taskTemplate.findMany({ where: { koId: entry.koId } });
    check(templates.length === 1, `  ${entry.code}: expected 1 task, got ${templates.length}`);

    const t = templates[0];
    if (!t) continue;

    check(CANONICAL_TASK_TITLES.has(t.title), `  ${entry.code}: canonical task title`);
    check(t.title.length > 0, `  ${entry.code}: non-empty title`);
    check(t.description.length > 10, `  ${entry.code}: description length > 10`);
    check(t.estimatedTime > 0, `  ${entry.code}: estimatedTime > 0`);
    check(t.estimatedTime <= 120, `  ${entry.code}: estimatedTime <= 120`);

    // V2 fields
    check(t.instructions !== null, `  ${entry.code}: instructions not null`);
    check(t.exampleOutput !== null, `  ${entry.code}: exampleOutput not null`);
    check(t.checklist !== null, `  ${entry.code}: checklist not null`);
    check(t.rubric !== null, `  ${entry.code}: rubric not null`);

    if (t.instructions) {
      const parsed = JSON.parse(t.instructions as string);
      check(Array.isArray(parsed) && parsed.length > 0, `  ${entry.code}: instructions valid JSON array`);
    }
  }

  console.log(`\n${GREEN}${passed} passed${RESET}, ${failed ? `${RED}${failed} failed${RESET}` : '0 failed'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
