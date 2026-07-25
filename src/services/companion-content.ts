import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

interface CompanionQuestion {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation?: string
  order: number
}

interface CompanionQuiz {
  title: string
  passScore: number
  questions: CompanionQuestion[]
}

interface CompanionTaskTemplate {
  title: string
  description: string
  estimatedTime: number
}

interface CompanionFormula {
  name: string
  expression: string
  description?: string
  variables?: string[]
}

interface CompanionItem {
  koCode: string
  quizzes: CompanionQuiz[]
  taskTemplates: CompanionTaskTemplate[]
  formulas: CompanionFormula[]
}

interface CompanionPayload {
  items: CompanionItem[]
}

interface ValidationError {
  index: number
  koCode?: string
  field: string
  errorCode: string
  message: string
}

const ALLOWED_ROLES = ['admin', 'content_editor']

function validateCompanionItems(
  items: CompanionItem[],
  existingKOs: Map<string, { id: number; isDemo: boolean; code: string }>
): ValidationError[] {
  const errors: ValidationError[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (!item.koCode) {
      errors.push({ index: i, field: 'koCode', errorCode: 'REQUIRED', message: 'koCode is required' })
      continue
    }

    const ko = existingKOs.get(item.koCode)
    if (!ko) {
      errors.push({ index: i, koCode: item.koCode, field: 'koCode', errorCode: 'KO_NOT_FOUND', message: `Knowledge object with code '${item.koCode}' not found` })
      continue
    }

    if (ko.isDemo) {
      errors.push({ index: i, koCode: item.koCode, field: 'koCode', errorCode: 'DEMO_KO_NOT_ALLOWED', message: `Companion content cannot be added to demo KO '${item.koCode}'` })
      continue
    }

    const quizTitleSet = new Set<string>()
    const taskTitleSet = new Set<string>()

    if (item.quizzes) {
      for (let q = 0; q < item.quizzes.length; q++) {
        const quiz = item.quizzes[q]
        const quizField = `quizzes[${q}]`

        if (!quiz.title) {
          errors.push({ index: i, koCode: item.koCode, field: `${quizField}.title`, errorCode: 'REQUIRED', message: 'quiz title is required' })
        } else if (quizTitleSet.has(quiz.title)) {
          errors.push({ index: i, koCode: item.koCode, field: `${quizField}.title`, errorCode: 'DUPLICATE_QUIZ_TITLE', message: `Duplicate quiz title '${quiz.title}' within the same KO` })
        } else {
          quizTitleSet.add(quiz.title)
        }

        if (quiz.passScore === undefined || quiz.passScore === null) {
          errors.push({ index: i, koCode: item.koCode, field: `${quizField}.passScore`, errorCode: 'REQUIRED', message: 'passScore is required' })
        } else if (typeof quiz.passScore !== 'number' || quiz.passScore < 0 || quiz.passScore > 100) {
          errors.push({ index: i, koCode: item.koCode, field: `${quizField}.passScore`, errorCode: 'INVALID_PASS_SCORE', message: 'passScore must be between 0 and 100' })
        }

        if (quiz.questions) {
          const orderSet = new Set<number>()
          const questionTextSet = new Set<string>()

          for (let r = 0; r < quiz.questions.length; r++) {
            const qst = quiz.questions[r]
            const qstField = `${quizField}.questions[${r}]`

            if (!qst.questionText) {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.questionText`, errorCode: 'REQUIRED', message: 'questionText is required' })
            } else if (questionTextSet.has(qst.questionText)) {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.questionText`, errorCode: 'DUPLICATE_QUESTION_TEXT', message: `Duplicate questionText within the same quiz` })
            } else {
              questionTextSet.add(qst.questionText)
            }

            if (qst.order === undefined || qst.order === null) {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.order`, errorCode: 'REQUIRED', message: 'order is required' })
            } else if (orderSet.has(qst.order)) {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.order`, errorCode: 'DUPLICATE_ORDER', message: `Duplicate order value '${qst.order}' within the same quiz` })
            } else {
              orderSet.add(qst.order)
            }

            if (!qst.options || !Array.isArray(qst.options) || qst.options.length === 0) {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.options`, errorCode: 'INVALID_OPTIONS', message: 'options must be a non-empty array' })
            }

            if (qst.correctAnswer) {
              if (!qst.options || !Array.isArray(qst.options) || !qst.options.includes(qst.correctAnswer)) {
                errors.push({ index: i, koCode: item.koCode, field: `${qstField}.correctAnswer`, errorCode: 'INVALID_CORRECT_ANSWER', message: 'correctAnswer must match one of the options' })
              }
            } else {
              errors.push({ index: i, koCode: item.koCode, field: `${qstField}.correctAnswer`, errorCode: 'REQUIRED', message: 'correctAnswer is required' })
            }
          }
        }
      }
    }

    if (item.taskTemplates) {
      for (let t = 0; t < item.taskTemplates.length; t++) {
        const task = item.taskTemplates[t]
        const taskField = `taskTemplates[${t}]`

        if (!task.title) {
          errors.push({ index: i, koCode: item.koCode, field: `${taskField}.title`, errorCode: 'REQUIRED', message: 'task title is required' })
        } else if (taskTitleSet.has(task.title)) {
          errors.push({ index: i, koCode: item.koCode, field: `${taskField}.title`, errorCode: 'DUPLICATE_TASK_TITLE', message: `Duplicate task title '${task.title}' within the same KO` })
        } else {
          taskTitleSet.add(task.title)
        }

        if (!task.description) {
          errors.push({ index: i, koCode: item.koCode, field: `${taskField}.description`, errorCode: 'REQUIRED', message: 'task description is required' })
        }

        if (task.estimatedTime === undefined || task.estimatedTime === null) {
          errors.push({ index: i, koCode: item.koCode, field: `${taskField}.estimatedTime`, errorCode: 'REQUIRED', message: 'estimatedTime is required' })
        } else if (typeof task.estimatedTime !== 'number' || task.estimatedTime <= 0) {
          errors.push({ index: i, koCode: item.koCode, field: `${taskField}.estimatedTime`, errorCode: 'INVALID_ESTIMATED_TIME', message: 'estimatedTime must be a positive number' })
        }
      }
    }

    if (item.formulas) {
      for (let f = 0; f < item.formulas.length; f++) {
        const formula = item.formulas[f]
        const formulaField = `formulas[${f}]`

        if (!formula.name) {
          errors.push({ index: i, koCode: item.koCode, field: `${formulaField}.name`, errorCode: 'REQUIRED', message: 'formula name is required' })
        }

        if (!formula.expression) {
          errors.push({ index: i, koCode: item.koCode, field: `${formulaField}.expression`, errorCode: 'REQUIRED', message: 'formula expression is required' })
        }
      }
    }
  }

  return errors
}

async function checkExistingCompanionData(
  items: CompanionItem[],
  existingKOs: Map<string, { id: number; isDemo: boolean; code: string }>
): Promise<{ errors: ValidationError[]; existingQuizzes: Map<string, Set<string>> }> {
  const errors: ValidationError[] = []
  const existingQuizzes = new Map<string, Set<string>>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const ko = existingKOs.get(item.koCode)
    if (!ko) continue

    const dbQuizzes = await prisma.quiz.findMany({
      where: { koId: ko.id },
      select: { title: true }
    })
    const existingQuizTitles = new Set(dbQuizzes.map(q => q.title))
    existingQuizzes.set(item.koCode, existingQuizTitles)

    const dbTasks = await prisma.taskTemplate.findMany({
      where: { koId: ko.id },
      select: { title: true }
    })
    const existingTaskTitles = new Set(dbTasks.map(t => t.title))

    if (item.quizzes) {
      for (let q = 0; q < item.quizzes.length; q++) {
        const quiz = item.quizzes[q]
        if (existingQuizTitles.has(quiz.title)) {
          errors.push({
            index: i, koCode: item.koCode,
            field: `quizzes[${q}].title`,
            errorCode: 'DUPLICATE_EXISTING_QUIZ',
            message: `Quiz with title '${quiz.title}' already exists for KO '${item.koCode}'. Use a different title or increment version.`
          })
        }
      }
    }

    if (item.taskTemplates) {
      for (let t = 0; t < item.taskTemplates.length; t++) {
        const task = item.taskTemplates[t]
        if (existingTaskTitles.has(task.title)) {
          errors.push({
            index: i, koCode: item.koCode,
            field: `taskTemplates[${t}].title`,
            errorCode: 'DUPLICATE_EXISTING_TASK',
            message: `TaskTemplate with title '${task.title}' already exists for KO '${item.koCode}'. Use a different title or increment version.`
          })
        }
      }
    }
  }

  return { errors, existingQuizzes }
}

export async function companionContentRoutes(fastify: FastifyInstance) {

  // POST /api/v2/admin/knowledge-objects/companion-content/preview
  fastify.post('/api/v2/admin/knowledge-objects/companion-content/preview', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    let body: CompanionPayload
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body as CompanionPayload
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' })
    }

    function parseCompanionPayload(body: any): CompanionItem[] | null {
      if (body.items && Array.isArray(body.items)) return body.items
      if (body.companionData && Array.isArray(body.companionData)) return body.companionData
      if (Array.isArray(body)) return body
      return null
    }

    const items = parseCompanionPayload(body)
    if (!items || items.length === 0) {
      return reply.status(422).send({
        valid: false,
        totalItems: 0,
        errors: [{ index: -1, field: 'items', errorCode: 'INVALID_FORMAT', message: 'Request must contain { items: [...] }, { companionData: [...] }, or be an array' }]
      })
    }

    const koCodes = items.map(i => i.koCode).filter(Boolean)
    const dbKOs = await prisma.knowledgeObject.findMany({
      where: { code: { in: koCodes } },
      select: { id: true, code: true, isDemo: true }
    })
    const existingKOs = new Map<string, { id: number; isDemo: boolean; code: string }>()
    dbKOs.forEach(ko => { if (ko.code) existingKOs.set(ko.code, { id: ko.id, isDemo: ko.isDemo, code: ko.code }) })

    const validationErrors = validateCompanionItems(items, existingKOs)
    if (validationErrors.length > 0) {
      return reply.status(422).send({
        valid: false,
        totalItems: items.length,
        errors: validationErrors
      })
    }

    const { errors: duplicateErrors } = await checkExistingCompanionData(items, existingKOs)
    const allErrors = [...validationErrors, ...duplicateErrors]

    if (allErrors.length > 0) {
      return reply.status(422).send({
        valid: false,
        totalItems: items.length,
        errors: allErrors
      })
    }

    const summary = items.map(item => {
      const ko = existingKOs.get(item.koCode)
      return {
        koCode: item.koCode,
        koId: ko?.id,
        quizCount: item.quizzes?.length || 0,
        questionCount: item.quizzes?.reduce((sum, q) => sum + (q.questions?.length || 0), 0) || 0,
        taskTemplateCount: item.taskTemplates?.length || 0,
        formulaCount: item.formulas?.length || 0
      }
    })

    return {
      valid: true,
      totalItems: items.length,
      errors: [],
      summary
    }
  })

  // POST /api/v2/admin/knowledge-objects/companion-content/commit
  fastify.post('/api/v2/admin/knowledge-objects/companion-content/commit', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (!ALLOWED_ROLES.includes(user.role)) {
      return reply.status(403).send({ error: 'Content editor or admin access required' })
    }

    let body: CompanionPayload
    try {
      body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body as CompanionPayload
    } catch {
      return reply.status(400).send({ error: 'Invalid JSON body' })
    }

    function parseCompanionPayload(body: any): CompanionItem[] | null {
      if (body.items && Array.isArray(body.items)) return body.items
      if (body.companionData && Array.isArray(body.companionData)) return body.companionData
      if (Array.isArray(body)) return body
      return null
    }

    const items = parseCompanionPayload(body)
    if (!items || items.length === 0) {
      return reply.status(422).send({
        valid: false,
        totalItems: 0,
        errors: [{ index: -1, field: 'items', errorCode: 'INVALID_FORMAT', message: 'Request must contain { items: [...] }, { companionData: [...] }, or be an array' }]
      })
    }

    const koCodes = items.map(i => i.koCode).filter(Boolean)
    const dbKOs = await prisma.knowledgeObject.findMany({
      where: { code: { in: koCodes } },
      select: { id: true, code: true, isDemo: true }
    })
    const existingKOs = new Map<string, { id: number; isDemo: boolean; code: string }>()
    dbKOs.forEach(ko => { if (ko.code) existingKOs.set(ko.code, { id: ko.id, isDemo: ko.isDemo, code: ko.code }) })

    const validationErrors = validateCompanionItems(items, existingKOs)
    if (validationErrors.length > 0) {
      return reply.status(422).send({ valid: false, totalItems: items.length, errors: validationErrors })
    }

    const { errors: duplicateErrors } = await checkExistingCompanionData(items, existingKOs)
    if (duplicateErrors.length > 0) {
      return reply.status(422).send({ valid: false, totalItems: items.length, errors: duplicateErrors })
    }

    const job = await prisma.importJob.create({
      data: { id: randomUUID(), type: 'companion_import', status: 'running', totalRows: items.length }
    })

    try {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const ko = existingKOs.get(item.koCode)!

          if (item.quizzes) {
            for (const quiz of item.quizzes) {
              const createdQuiz = await tx.quiz.create({
                data: {
                  koId: ko.id,
                  title: quiz.title,
                  passScore: quiz.passScore
                }
              })

              if (quiz.questions) {
                for (const qst of quiz.questions) {
                  await tx.quizQuestion.create({
                    data: {
                      quizId: createdQuiz.id,
                      questionText: qst.questionText,
                      options: JSON.stringify(qst.options),
                      correctAnswer: qst.correctAnswer,
                      explanation: qst.explanation || null,
                      order: qst.order
                    }
                  })
                }
              }
            }
          }

          if (item.taskTemplates) {
            for (const task of item.taskTemplates) {
              await tx.taskTemplate.create({
                data: {
                  koId: ko.id,
                  title: task.title,
                  description: task.description,
                  estimatedTime: task.estimatedTime
                }
              })
            }
          }

          if (item.formulas) {
            for (const formula of item.formulas) {
              const existingFormula = await tx.formula.findUnique({
                where: { name: formula.name }
              })
              if (!existingFormula) {
                await tx.formula.create({
                  data: {
                    name: formula.name,
                    formulaText: formula.expression,
                    inputs: JSON.stringify(formula.variables || []),
                    assumptions: formula.description || null
                  }
                })
              }
            }
          }
        }

        await tx.importJob.update({
          where: { id: job.id },
          data: { status: 'completed', processedAt: new Date() }
        })
      })
    } catch (e: any) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'failed', processedAt: new Date() }
      }).catch(() => {})

      await prisma.importJobError.create({
        data: { importJobId: job.id, row: -1, field: 'transaction', message: `Transaction rolled back: ${e.message || String(e)}` }
      }).catch(() => {})

      return reply.status(422).send({
        valid: false,
        totalItems: items.length,
        errors: [{ index: -1, field: 'transaction', errorCode: 'ROLLBACK', message: e.message || String(e) }],
        importJobId: job.id
      })
    }

    const quizCount = items.reduce((sum, item) => sum + (item.quizzes?.length || 0), 0)
    const taskCount = items.reduce((sum, item) => sum + (item.taskTemplates?.length || 0), 0)
    const formulaCount = items.reduce((sum, item) => sum + (item.formulas?.length || 0), 0)

    return {
      valid: true,
      totalItems: items.length,
      importJobId: job.id,
      message: 'Companion content import completed successfully',
      summary: {
        quizzesCreated: quizCount,
        taskTemplatesCreated: taskCount,
        formulasCreated: formulaCount
      }
    }
  })
}
