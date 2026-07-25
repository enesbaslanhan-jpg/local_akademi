import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const kos = await prisma.knowledgeObject.findMany({
    where: { status: 'published', isDemo: false },
    select: { code: true, quizzes: { select: { questions: true } } },
  })
  const problems: string[] = []

  for (const ko of kos) {
    for (const quiz of ko.quizzes) {
      for (const question of quiz.questions) {
        let options: unknown = []
        try { options = JSON.parse(question.options) } catch { /* reported below */ }
        const genericQuestion = new RegExp(`^${ko.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+sorusu\\s+\\d+$`, 'i').test(question.questionText.trim())
        const genericOptions = Array.isArray(options) && options.length >= 2 && options.every(value => /^[A-D]$/i.test(String(value).trim()))
        if (genericQuestion || genericOptions) problems.push(`${ko.code} Q${question.order}: placeholder content`)
        if (!Array.isArray(options) || options.length < 2 || !options.includes(question.correctAnswer)) {
          problems.push(`${ko.code} Q${question.order}: invalid options/correct answer`)
        }
      }
    }
  }

  if (problems.length) {
    console.error(problems.slice(0, 50).join('\n'))
    console.error(`FAIL: ${problems.length} quiz quality problem(s)`)
    process.exit(1)
  }
  console.log(`PASS: ${kos.length} published knowledge objects contain no placeholder quiz content`)
}

main().catch(error => { console.error(error); process.exit(1) }).finally(() => prisma.$disconnect())
