import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { evaluateDecisionCheck, calculateDecisionCheckProfitability, type Finding } from './decision-check-rule-engine'
import { LearningProgressService } from './learning-progress'

const featureFlag = process.env.FEATURE_DECISION_CHECKS_ENABLED === 'true'
const lpService = new LearningProgressService(prisma)

const profitabilityAnswerSchema = z.object({
  salePrice: z.coerce.number().positive(),
  productCost: z.coerce.number().min(0),
  commissionRate: z.coerce.number().min(0).max(100),
  shippingCost: z.coerce.number().min(0),
  packagingCost: z.coerce.number().min(0),
  returnLossAllowance: z.coerce.number().min(0),
  otherVariableCost: z.coerce.number().min(0),
  discountRate: z.coerce.number().min(0).max(100)
})

export async function decisionCheckRoutes(server: FastifyInstance) {
  // Pre-handler for Feature Flag
  server.addHook('preHandler', async (request, reply) => {
    if (!featureFlag) {
      reply.status(404).send({ error: 'FEATURE_DISABLED', message: 'Decision Checks feature is not enabled.' })
    }
  })

  // 8. GET /api/v1/decision-checks/sessions/me
  server.get('/sessions/me', { preValidation: [server.authenticate] }, async (request, reply) => {
    const sessions = await prisma.decisionCheckSession.findMany({
      where: { userId: (request.user as any).id, archivedAt: null },
      include: { decisionCheck: true },
      orderBy: { updatedAt: 'desc' }
    })
    return reply.send(sessions.map(s => ({
      id: s.id,
      decisionCheckCode: s.decisionCheck.code,
      decisionCheckTitle: s.decisionCheck.title,
      status: s.status,
      startedAt: s.startedAt,
      updatedAt: s.updatedAt,
      completedAt: s.completedAt
    })))
  })

  // 1. GET /api/v1/decision-checks
  server.get('/', async (request, reply) => {
    const publishedChecks = await prisma.decisionCheck.findMany({
      where: { published: true, deletedAt: null },
      select: {
        code: true,
        title: true,
        description: true,
        category: true,
        targetRoles: true,
        currentVersion: true
      }
    })
    return reply.send(publishedChecks)
  })

  // 2. GET /api/v1/decision-checks/:code
  server.get('/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const check = await prisma.decisionCheck.findUnique({
      where: { code, published: true, deletedAt: null }
    })
    if (!check) return reply.status(404).send({ error: 'DECISION_CHECK_NOT_FOUND' })

    const version = await prisma.decisionCheckVersion.findFirst({
      where: { decisionCheckId: check.id, version: check.currentVersion || '1.0' }
    })
    
    if (!version) return reply.status(404).send({ error: 'DECISION_CHECK_NOT_PUBLISHED' })

    return reply.send({
      code: check.code,
      title: check.title,
      description: check.description,
      version: version.version,
      definition: (version.definitionJson as any)?.questions || []
    })
  })

  // 3. POST /api/v1/decision-checks/:code/start
  server.post('/:code/start', { preValidation: [server.authenticate] }, async (request, reply) => {
    const { code } = request.params as { code: string }
    const userId = (request.user as any).id

    const check = await prisma.decisionCheck.findUnique({
      where: { code, published: true, deletedAt: null }
    })
    if (!check) return reply.status(404).send({ error: 'DECISION_CHECK_NOT_FOUND' })

    const version = await prisma.decisionCheckVersion.findFirst({
      where: { decisionCheckId: check.id, version: check.currentVersion || '1.0' }
    })
    if (!version) return reply.status(404).send({ error: 'DECISION_CHECK_NOT_PUBLISHED' })

    // Check existing incomplete session
    const existing = await prisma.decisionCheckSession.findFirst({
      where: { userId, decisionCheckId: check.id, completedAt: null, archivedAt: null }
    })

    if (existing) return reply.send({ sessionId: existing.id, status: existing.status })

    const session = await prisma.decisionCheckSession.create({
      data: {
        userId,
        decisionCheckId: check.id,
        versionId: version.id,
        status: 'in_progress'
      }
    })

    await lpService.updateProgress(userId, 'decision_check', check.id, {
      status: 'started',
      contentCode: check.code
    }).catch(console.error)

    return reply.send({ sessionId: session.id, status: session.status })
  })

  // 4. GET /api/v1/decision-check-sessions/:id
  server.get('/sessions/:id', { preValidation: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await prisma.decisionCheckSession.findUnique({
      where: { id },
      include: { 
        answers: true, 
        decisionCheck: true 
      }
    })

    if (!session) return reply.status(404).send({ error: 'SESSION_NOT_FOUND' })
    if (session.userId !== (request.user as any).id) return reply.status(403).send({ error: 'FORBIDDEN' })

    const version = await prisma.decisionCheckVersion.findUnique({
      where: { id: session.versionId! }
    })

    return reply.send({
      id: session.id,
      status: session.status,
      decisionCheckCode: session.decisionCheck.code,
      decisionCheckTitle: session.decisionCheck.title,
      decisionCheckDescription: session.decisionCheck.description,
      definition: (version?.definitionJson as any)?.questions || [],
      answers: session.answers
    })
  })

  // 5. PATCH /api/v1/decision-check-sessions/:id/answers
  server.patch('/sessions/:id/answers', { preValidation: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      questionCode: z.string(),
      value: z.any().nullable(),
      isUnknown: z.boolean().default(false)
    })
    
    const parseRes = schema.safeParse(request.body)
    if (!parseRes.success) return reply.status(400).send({ error: 'INVALID_ANSWER', details: parseRes.error.format() })

    const session = await prisma.decisionCheckSession.findUnique({ where: { id } })
    if (!session) return reply.status(404).send({ error: 'SESSION_NOT_FOUND' })
    if (session.userId !== (request.user as any).id) return reply.status(403).send({ error: 'FORBIDDEN' })
    if (session.status !== 'in_progress') return reply.status(400).send({ error: 'SESSION_ALREADY_COMPLETED' })

    await prisma.decisionCheckAnswer.upsert({
      where: { sessionId_questionCode: { sessionId: id, questionCode: parseRes.data.questionCode } },
      create: {
        sessionId: id,
        questionCode: parseRes.data.questionCode,
        valueJson: parseRes.data.value ?? null,
        isUnknown: parseRes.data.isUnknown
      },
      update: {
        valueJson: parseRes.data.value ?? null,
        isUnknown: parseRes.data.isUnknown
      }
    })

    await lpService.updateProgress(session.userId, 'decision_check', session.decisionCheckId, {
      status: 'in_progress'
    }).catch(console.error)

    return reply.send({ success: true })
  })

  // 6. POST /api/v1/decision-check-sessions/:id/complete
  server.post('/sessions/:id/complete', { preValidation: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const session = await prisma.decisionCheckSession.findUnique({
      where: { id },
      include: { answers: true, decisionCheck: true }
    })

    if (!session) return reply.status(404).send({ error: 'SESSION_NOT_FOUND' })
    if (session.userId !== (request.user as any).id) return reply.status(403).send({ error: 'FORBIDDEN' })

    if (session.completedAt) {
      // Idempotency: return existing result
      const existingRes = await prisma.decisionCheckResult.findUnique({ where: { sessionId: id } })
      if (existingRes) return reply.send({ resultId: existingRes.id, snapshot: existingRes.snapshotJson })
      return reply.status(400).send({ error: 'SESSION_ALREADY_COMPLETED' })
    }

    const version = await prisma.decisionCheckVersion.findUnique({ where: { id: session.versionId! } })
    if (!version) return reply.status(500).send({ error: 'INTERNAL_ERROR' })

    const rules = (version.definitionJson as any).rules || []
    
    const answersObj: Record<string, any> = {}
    const unknownsObj: Record<string, boolean> = {}
    
    session.answers.forEach(a => {
      answersObj[a.questionCode] = a.valueJson
      unknownsObj[a.questionCode] = a.isUnknown
    })

    let calculationOutput: ReturnType<typeof calculateDecisionCheckProfitability> | null = null
    let domainResult: ReturnType<typeof evaluateDecisionCheck> | null = null

    if (session.decisionCheck.code === 'DC-PROFIT-001') {
      const candidate = Object.fromEntries(
        Object.keys(profitabilityAnswerSchema.shape).map(code => [
          code,
          unknownsObj[code] ? undefined : answersObj[code]
        ])
      )
      const parsedInputs = profitabilityAnswerSchema.safeParse(candidate)
      if (!parsedInputs.success) {
        return reply.status(400).send({
          error: 'PROFITABILITY_INPUTS_INCOMPLETE',
          message: 'Hesaplama için tüm alanları geçerli değerlerle doldurun.',
          fields: parsedInputs.error.issues.map(issue => String(issue.path[0]))
        })
      }
      calculationOutput = calculateDecisionCheckProfitability(parsedInputs.data)
      
      const discountCreatesLoss = calculationOutput.discountedScenario?.profitable === false
      const contributionIsNegative = calculationOutput.contribution <= 0
      const marginIsFragile = calculationOutput.contributionMarginPercent < 10
      const riskLevel = contributionIsNegative ? 'critical' : discountCreatesLoss ? 'high' : marginIsFragile ? 'medium' : 'low'
      const status = contributionIsNegative ? 'not_recommended' : discountCreatesLoss ? 'high_risk' : marginIsFragile ? 'caution' : 'generally_suitable'
      const severity = riskLevel === 'low' ? 'low' : riskLevel
      const findings: Finding[] = calculationOutput.riskWarnings.map((message, index) => ({
        code: `profitability_warning_${index + 1}`,
        severity,
        message,
        isBlocking: contributionIsNegative,
        priority: 100 - index
      }))
      domainResult = {
        findings,
        missingInformation: [],
        criticalIssues: contributionIsNegative ? ['non_positive_contribution'] : [],
        recommendedActions: calculationOutput.safeNextSteps,
        status,
        riskLevel
      }
    }

    const result = domainResult ?? evaluateDecisionCheck({
      answers: answersObj,
      unknowns: unknownsObj,
      rules
    })

    const snapshotJson = {
      decisionCheckCode: session.decisionCheck.code,
      definitionVersion: version.version,
      ruleVersion: version.ruleVersion,
      completedAt: new Date(),
      normalizedAnswers: answersObj,
      calculationOutput,
      ...result
    }

    // Transaction
    const [finalRes] = await prisma.$transaction([
      prisma.decisionCheckResult.create({
        data: {
          sessionId: id,
          status: result.status,
          riskLevel: result.riskLevel,
          snapshotJson: snapshotJson as any,
          ruleVersion: version.ruleVersion
        }
      }),
      prisma.decisionCheckSession.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date() }
      })
    ])

    await lpService.updateProgress(session.userId, 'decision_check', session.decisionCheckId, {
      status: 'completed',
      contentCode: session.decisionCheck.code
    }).catch(console.error)

    return reply.send({ resultId: finalRes.id, snapshot: snapshotJson })
  })

  // 7. GET /api/v1/decision-check-sessions/:id/result
  server.get('/sessions/:id/result', { preValidation: [server.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await prisma.decisionCheckSession.findUnique({
      where: { id },
      include: { result: true }
    })

    if (!session) return reply.status(404).send({ error: 'SESSION_NOT_FOUND' })
    if (session.userId !== (request.user as any).id) return reply.status(403).send({ error: 'FORBIDDEN' })
    if (!session.result) return reply.status(404).send({ error: 'RESULT_NOT_READY' })

    return reply.send({
      id: session.result.id,
      status: session.result.status,
      riskLevel: session.result.riskLevel,
      snapshot: session.result.snapshotJson
    })
  })
}
