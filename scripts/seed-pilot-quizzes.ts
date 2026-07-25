import { PrismaClient } from '@prisma/client'
import manifest from '../content/learning-pilot-v1.json'

const prisma = new PrismaClient()

type MetadataQuestion = {
  question?: string
  questionText?: string
  options?: string[]
  correct_answer?: string
  correctAnswer?: string
  explanation?: string
}

async function main() {
  const entries = (manifest as any).kos as Array<{ koId: number; code: string }>
  let verified = 0
  let created = 0

  for (const entry of entries) {
    const title = entry.code.startsWith('CUR-') ? 'Kazanım Kontrolü V1' : 'Yeni Alan Kazanım Testi V1'
    const ko = await prisma.knowledgeObject.findUnique({
      where: { id: entry.koId },
      select: { metadata: true, quizzes: { include: { questions: true } } },
    })
    if (!ko) throw new Error(`${entry.code}: KO not found`)

    const canonical = ko.quizzes.find(quiz => quiz.title === title)
    if (canonical) {
      if (ko.quizzes.length !== 1 || canonical.questions.length !== 3) {
        throw new Error(`${entry.code}: canonical quiz contract is not 1 quiz × 3 questions; refusing destructive repair`)
      }
      verified++
      continue
    }

    if (ko.quizzes.length > 0) {
      throw new Error(`${entry.code}: non-canonical quiz exists; refusing to rename or delete it`)
    }

    let metadata: any = {}
    try { metadata = JSON.parse(ko.metadata || '{}') } catch { /* validated below */ }
    const questions = (Array.isArray(metadata.quiz) ? metadata.quiz : []) as MetadataQuestion[]
    if (questions.length !== 3) {
      throw new Error(`${entry.code}: canonical quiz metadata missing; run the canonical curriculum repair`)
    }

    await prisma.quiz.create({
      data: {
        koId: entry.koId,
        title,
        passScore: 70,
        questions: {
          create: questions.map((question, index) => ({
            questionText: question.question || question.questionText || '',
            options: JSON.stringify(question.options || []),
            correctAnswer: question.correct_answer || question.correctAnswer || '',
            explanation: question.explanation || null,
            order: index + 1,
          })),
        },
      },
    })
    created++
  }

  console.log(`Pilot canonical quizzes: ${verified} preserved, ${created} created from trusted metadata`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
