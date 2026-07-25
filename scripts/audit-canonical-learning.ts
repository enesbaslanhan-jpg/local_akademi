import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.knowledgeObject.findMany({
    where: { OR: [{ code: { startsWith: 'CUR-' } }, { code: { startsWith: 'KBX-' } }] },
    include: { quizzes: { include: { questions: true } }, taskTemplates: true },
    orderBy: { code: 'asc' },
  })

  const problems = rows.flatMap(row => {
    const quizTitle = row.code?.startsWith('CUR-') ? 'Kazanım Kontrolü V1' : 'Yeni Alan Kazanım Testi V1'
    const taskTitle = row.code?.startsWith('CUR-') ? 'İşletmene Uygula V1' : 'Yeni Alan Uygulaması V1'
    const canonicalQuiz = row.quizzes.find(quiz => quiz.title === quizTitle)
    const canonicalTask = row.taskTemplates.find(task => task.title === taskTitle)
    const issues: string[] = []
    if (row.quizzes.length !== 1) issues.push(`quizCount=${row.quizzes.length}`)
    if (!canonicalQuiz) issues.push('canonicalQuiz=missing')
    else if (canonicalQuiz.questions.length !== 3) issues.push(`questionCount=${canonicalQuiz.questions.length}`)
    if (row.taskTemplates.length !== 1) issues.push(`taskCount=${row.taskTemplates.length}`)
    if (!canonicalTask) issues.push('canonicalTask=missing')
    return issues.length ? [{ code: row.code, koId: row.id, issues, quizzes: row.quizzes.map(q => ({ id: q.id, title: q.title, questions: q.questions.length })), tasks: row.taskTemplates.map(t => ({ id: t.id, title: t.title })) }] : []
  })

  const affectedIds = problems.map(problem => problem.koId)
  const [attempts, assignments] = affectedIds.length ? await Promise.all([
    prisma.quizAttempt.findMany({ where: { koId: { in: affectedIds } }, select: { id: true, koId: true, quizId: true } }),
    prisma.taskAssignment.findMany({ where: { koId: { in: affectedIds } }, select: { id: true, koId: true, taskTemplateId: true, taskId: true } }),
  ]) : [[], []]

  console.log(JSON.stringify({
    total: rows.length,
    affected: problems.length,
    problems,
    affectedQuizAttempts: attempts,
    affectedTaskAssignments: assignments,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
