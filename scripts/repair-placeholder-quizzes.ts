import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

type MetadataQuestion = {
  question?: string
  questionText?: string
  options?: unknown
  correct_answer?: string
  correctAnswer?: string
  explanation?: string
}

function isPlaceholder(code: string, question: { questionText: string; options: string }) {
  let options: unknown = []
  try { options = JSON.parse(question.options) } catch { return true }
  const genericQuestion = question.questionText.trim().toLocaleLowerCase('tr-TR')
    .match(new RegExp(`^${code.toLocaleLowerCase('tr-TR').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+sorusu\\s+\\d+$`))
  const genericOptions = Array.isArray(options) && options.length >= 2 && options.every(value => /^[A-D]$/i.test(String(value).trim()))
  return Boolean(genericQuestion || genericOptions)
}

function normalize(question: MetadataQuestion) {
  const questionText = String(question.question || question.questionText || '').trim()
  const options = Array.isArray(question.options) ? question.options.map(value => String(value).trim()) : []
  const correctAnswer = String(question.correct_answer || question.correctAnswer || '').trim()
  const explanation = String(question.explanation || '').trim()
  if (!questionText || options.length < 2 || options.some(option => !option) || !options.includes(correctAnswer) || !explanation) {
    return null
  }
  return { questionText, options, correctAnswer, explanation }
}

async function main() {
  const kos = await prisma.knowledgeObject.findMany({
    where: { status: 'published', isDemo: false },
    select: {
      id: true,
      code: true,
      metadata: true,
      quizzes: { select: { id: true, questions: { orderBy: { order: 'asc' } } } },
    },
  })

  let affectedKos = 0
  let affectedQuestions = 0
  let linkedAttempts = 0
  const invalidMetadata: string[] = []

  for (const ko of kos) {
    if (ko.quizzes.length !== 1 || ko.quizzes[0].questions.length !== 3) continue
    const quiz = ko.quizzes[0]
    if (!quiz.questions.some(question => isPlaceholder(ko.code, question))) continue

    let metadataQuiz: MetadataQuestion[] = []
    try {
      const parsed = JSON.parse(ko.metadata || '{}')
      metadataQuiz = Array.isArray(parsed.quiz) ? parsed.quiz : []
    } catch { /* reported below */ }
    const replacements = metadataQuiz.slice(0, 3).map(normalize)
    if (replacements.length !== 3 || replacements.some(value => !value)) {
      invalidMetadata.push(ko.code)
      continue
    }

    affectedKos++
    affectedQuestions += 3
    linkedAttempts += await prisma.quizAttempt.count({ where: { quizId: quiz.id } })

    if (apply) {
      await prisma.$transaction(quiz.questions.map((question, index) => {
        const replacement = replacements[index]!
        return prisma.quizQuestion.update({
          where: { id: question.id },
          data: {
            questionText: replacement!.questionText,
            options: JSON.stringify(replacement!.options),
            correctAnswer: replacement!.correctAnswer,
            explanation: replacement!.explanation,
          },
        })
      }))
    }
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', affectedKos, affectedQuestions, linkedAttempts, invalidMetadata }, null, 2))
  if (invalidMetadata.length > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
