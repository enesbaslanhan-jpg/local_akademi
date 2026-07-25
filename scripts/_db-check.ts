import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const cur = await p.knowledgeObject.findMany({ where: { code: { startsWith: 'CUR-' } }, select: { id: true } });
  const kbx = await p.knowledgeObject.findMany({ where: { code: { startsWith: 'KBX-' } }, select: { id: true } });
  const quizzes = await p.quiz.findMany({ include: { _count: { select: { questions: true } } } });
  const curQ = quizzes.filter(q => cur.some(c => c.id === q.koId));
  const kbxQ = quizzes.filter(q => kbx.some(k => k.id === q.koId));
  const tasks = await p.taskTemplate.findMany();
  const curT = tasks.filter(t => cur.some(c => c.id === t.koId));
  const kbxT = tasks.filter(t => kbx.some(k => k.id === t.koId));
  const fcs = await p.flashcard.count();
  console.log(JSON.stringify({
    curKOs: cur.length, kbxKOs: kbx.length,
    curQuiz: curQ.length, curQn: curQ.reduce((s, q) => s + q._count.questions, 0),
    kbxQuiz: kbxQ.length, kbxQn: kbxQ.reduce((s, q) => s + q._count.questions, 0),
    totalQuiz: curQ.length + kbxQ.length,
    totalQn: curQ.reduce((s, q) => s + q._count.questions, 0) + kbxQ.reduce((s, q) => s + q._count.questions, 0),
    totalTask: curT.length + kbxT.length, curTask: curT.length, kbxTask: kbxT.length,
    flashcards: fcs,
  }));
  await p.$disconnect();
})();
