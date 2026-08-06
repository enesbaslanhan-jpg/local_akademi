import { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { z } from 'zod'
import { recomputeLessonAndEnrollment } from './course-progress'
import { isLegacyQuizEnabled, LEGACY_QUIZ_DISABLED } from '../config/feature-flags'

const answersSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().min(1),
    answer: z.string().max(500, 'Cevap en fazla 500 karakter olabilir')
  })).min(1, 'En az bir cevap gerekli')
})

const koIdSchema = z.coerce.number().int().positive()

const VALID_ROLES = ['user', 'assistant']

function parseSessionContext(raw: string): { role: string; content: string }[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m: any) => m && typeof m.content === 'string' && VALID_ROLES.includes(m.role))
      .map((m: any) => ({
        role: m.role,
        content: m.content.slice(0, 10000),
      }))
      .slice(-200)
  } catch {
    return []
  }
}

export async function quizRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient; legacyEnabled?: boolean }) {
  const prisma = opts?.prisma ?? sharedPrisma
  const legacyEnabled = () => opts?.legacyEnabled ?? isLegacyQuizEnabled()

  // GET /quizzes/history — user's attempt history (must be before /:koId to avoid capture)
  fastify.get('/history', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    try {
      const attempts = await prisma.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return { attempts }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Failed to fetch quiz history')
      return reply.status(500).send({ error: 'Failed to load quiz history' })
    }
  })

  // GET /quizzes/:koId — return quiz questions without correct answers
  fastify.get('/:koId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (!legacyEnabled()) return reply.status(410).send(LEGACY_QUIZ_DISABLED)
    const { koId } = request.params as { koId: string }
    const parsed = koIdSchema.safeParse(koId)
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid knowledge object ID' })

    const ko = await prisma.knowledgeObject.findUnique({
      where: { id: parsed.data },
      include: {
        quizzes: {
          where: { status: 'published' },
          include: {
            questions: {
              select: { id: true, questionText: true, options: true, explanation: true, order: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!ko || ko.status !== 'published' || ko.isDemo) {
      return reply.status(404).send({ error: 'Knowledge object not found' })
    }

    // ADAPTER: Legacy metadata quiz fallback — clearly marked for future removal
    const legacyAdapter = buildLegacyQuizAdapter(ko.metadata)

    const relationalQuizzes = ko.quizzes.map(q => ({
      id: q.id,
      title: q.title,
      passScore: q.passScore,
      questions: q.questions.map(qq => {
        let options: any[] = []
        try { options = JSON.parse(qq.options) } catch { options = [] }
        return {
          id: qq.id,
          questionText: qq.questionText,
          options,
          explanation: qq.explanation,
          order: qq.order,
        }
      }),
    }))

    const allQuestions = relationalQuizzes.length > 0
      ? relationalQuizzes.flatMap(q => q.questions)
      : legacyAdapter.questions

    return {
      koId: parsed.data,
      title: ko.title,
      quiz: allQuestions,
      quizzes: relationalQuizzes,
      legacyQuiz: relationalQuizzes.length === 0 && legacyAdapter.questions.length > 0 ? legacyAdapter.questions : undefined,
    }
  })

  // POST /quizzes/:koId/attempts — submit and grade
  fastify.post('/:koId/attempts', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    if (!legacyEnabled()) return reply.status(410).send(LEGACY_QUIZ_DISABLED)
    const user = request.user as { id: number }
    const { koId } = request.params as { koId: string }

    let validated: z.infer<typeof answersSchema>
    try {
      validated = answersSchema.parse(request.body)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Validation failed', details: err.errors })
      }
      return reply.status(422).send({ error: 'Invalid request body' })
    }

    const parsedKoId = koIdSchema.safeParse(koId)
    if (!parsedKoId.success) return reply.status(400).send({ error: 'Invalid knowledge object ID' })

    const ko = await prisma.knowledgeObject.findUnique({
      where: { id: parsedKoId.data },
      include: {
        quizzes: {
          where: { status: 'published' },
          include: { questions: true },
        },
      },
    })

    if (!ko || ko.status !== 'published' || ko.isDemo) {
      return reply.status(404).send({ error: 'Knowledge object not found' })
    }

    const questionIds = validated.answers.map(a => a.question_id)
    const uniqueIds = new Set(questionIds)
    if (uniqueIds.size !== questionIds.length) {
      return reply.status(422).send({ error: 'Duplicate question IDs are not allowed' })
    }

    // Build correct answer map — primary: Quiz/QuizQuestion tables, fallback: legacy adapter
    const correctMap: Record<string, string> = {}
    const explanationMap: Record<string, string | null> = {}

    for (const quiz of ko.quizzes) {
      for (const q of quiz.questions) {
        correctMap[q.id] = String(q.correctAnswer || '').toLowerCase().trim()
        explanationMap[q.id] = q.explanation
      }
    }

    const legacyAdapter = buildLegacyQuizAdapter(ko.metadata)
    if (ko.quizzes.length === 0) {
      for (const [id, answer] of Object.entries(legacyAdapter.correctAnswers)) {
        correctMap[id] = String(answer || '').toLowerCase().trim()
      }
    }

    const unknownIds = validated.answers.filter(a => correctMap[a.question_id] === undefined)
    if (unknownIds.length > 0) {
      return reply.status(422).send({
        error: `Unknown question IDs: ${unknownIds.map(a => a.question_id).join(', ')}`,
      })
    }
    const missingIds = Object.keys(correctMap).filter(id => !uniqueIds.has(id))
    if (missingIds.length > 0) {
      return reply.status(422).send({ error: 'Tüm sorular cevaplanmalıdır', missingQuestionIds: missingIds })
    }

    let correct = 0
    const feedback = validated.answers.map(a => {
      const given = String(a.answer || '').toLowerCase().trim()
      const expected = correctMap[a.question_id]
      const isCorrect = expected !== undefined && given === expected
      if (isCorrect) correct++
      return {
        question_id: a.question_id,
        is_correct: isCorrect,
        correct_answer: expected,
        explanation: explanationMap[a.question_id] || null,
      }
    })

    const totalQuestions = Object.keys(correctMap).length
    const score = Math.round((correct / Math.max(1, totalQuestions)) * 100)
    const passScore = ko.quizzes[0]?.passScore ?? 70
    const passed = score >= passScore

    const quizId: string | null = ko.quizzes.length > 0 ? ko.quizzes[0].id : null

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        koId: parsedKoId.data,
        quizId,
        score,
        passed,
        feedback: JSON.stringify(feedback),
      },
    })

    try {
      const lesson = await prisma.lesson.findFirst({
        where: { knowledgeObjectId: parsedKoId.data },
      })
      if (lesson) {
        const existing = await prisma.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        })
        await recomputeLessonAndEnrollment(prisma, user.id, lesson.id, {
          quizPercent: Math.max(existing?.quizPercent ?? 0, passed ? 100 : score),
        })
      }
    } catch (err) {
      request.log.warn({ err, userId: user.id, koId: parsedKoId.data }, 'Lesson progress update failed')
    }

    const responseFeedback = feedback.map(f => ({
      question_id: f.question_id,
      is_correct: f.is_correct,
    }))

    return {
      id: attempt.id,
      score,
      passed,
      feedback: responseFeedback,
      total: totalQuestions,
      correct,
    }
  })
}

function buildLegacyQuizAdapter(metadata: string): { questions: any[]; correctAnswers: Record<string, string> } {
  const questions: any[] = []
  const correctAnswers: Record<string, string> = {}
  try {
    const meta = JSON.parse(metadata || '{}')
    if (meta.quiz && Array.isArray(meta.quiz)) {
      for (const [index, q] of meta.quiz.entries()) {
        const id = String(q.id || `legacy-${index + 1}`)
        const { correct_answer, ...safe } = q
        questions.push({ ...safe, id })
        correctAnswers[id] = String(correct_answer || '').toLowerCase().trim()
      }
    }
  } catch {
    /* malformed metadata — skip legacy adapter */
  }
  return { questions, correctAnswers }
}
