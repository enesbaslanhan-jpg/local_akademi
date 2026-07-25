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
  const m = manifest as any;
  const entries = m.kos as Array<{ koId: number; code: string; title: string }>;
  const pilotKoIds = entries.map(e => e.koId);

  // 1. Pilot KOs have exactly 1 quiz each (canonical: 3 questions)
  const pilotQuizzes = await prisma.quiz.findMany({
    where: { koId: { in: pilotKoIds } },
    include: { _count: { select: { questions: true } } },
  });
  check(pilotQuizzes.length === 30, `Pilot quizzes: expected 30, got ${pilotQuizzes.length}`);

  // 2. Pilot KO total questions = 90 (30 x 3)
  const pilotQuestions = pilotQuizzes.reduce((sum, q) => sum + q._count.questions, 0);
  check(pilotQuestions === 90, `Pilot questions: expected 90, got ${pilotQuestions}`);

  // 3. Per-KO checks
  for (const entry of entries) {
    const quiz = pilotQuizzes.find(q => q.koId === entry.koId);
    check(!!quiz, `  ${entry.code}: quiz exists`);
    if (!quiz) continue;

    const questions = await prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
      orderBy: { order: 'asc' },
    });
    check(questions.length === 3, `  ${entry.code}: expected 3 questions, got ${questions.length}`);

    // 4. Each question has 4 options
    for (const q of questions) {
      const opts = JSON.parse(q.options);
      check(opts.length === 4, `  Q${q.order} ${entry.code}: expected 4 options, got ${opts.length}`);
    }

    // 5. Non-empty fields
    for (const q of questions) {
      check(q.questionText.length > 0, `  Q${q.order} ${entry.code}: empty questionText`);
      check(q.correctAnswer.length > 0, `  Q${q.order} ${entry.code}: empty correctAnswer`);
    }

    // 6. Correct answer is in options
    for (const q of questions) {
      const opts: string[] = JSON.parse(q.options);
      check(opts.includes(q.correctAnswer), `  Q${q.order} ${entry.code}: correctAnswer in options`);
    }
  }

  // 7. All pilot quiz titles are canonical
  const canonicalTitles = new Set(['Kazanım Kontrolü V1', 'Yeni Alan Kazanım Testi V1']);
  const nonCanonical = pilotQuizzes.filter(q => !canonicalTitles.has(q.title));
  check(nonCanonical.length === 0, `All pilot quiz titles are canonical`);

  // 8. passScore default 70
  const noPassScore = pilotQuizzes.filter(q => q.passScore == null || q.passScore !== 70);
  check(noPassScore.length === 0, `All pilot quizzes have passScore=70`);

  console.log(`\n${GREEN}${passed} passed${RESET}, ${failed ? `${RED}${failed} failed${RESET}` : '0 failed'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
