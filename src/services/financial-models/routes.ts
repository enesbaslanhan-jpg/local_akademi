import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { runFinancialModel } from './engine.js'
import { FINANCIAL_MODEL_REGISTRY, getFinancialModel } from './registry.js'
import { recommendFinancialModels } from './suitability.js'
import type { ModelAssumptionInput } from './types.js'
import { mapDocumentToFinancialModels } from './document-mapping.js'

const assumptionSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  unit: z.string().max(30).optional(),
  sourceType: z.enum(['document', 'business_record', 'user', 'case', 'approved_dataset', 'market_data']),
  sourceReference: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional(),
  userVerified: z.boolean().optional(),
})

const runSchema = z.object({
  inputs: z.record(z.string(), z.unknown()),
  assumptions: z.array(assumptionSchema).max(100).default([]),
  scenarioName: z.string().min(1).max(80).default('base'),
  sourceDocumentId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
})

const recommendationSchema = z.object({
  question: z.string().min(3).max(1000),
  businessType: z.string().max(100).optional(),
  businessStage: z.string().max(100).optional(),
  availableFields: z.array(z.string().max(100)).max(100).default([]),
  intendedDecision: z.string().max(500).optional(),
})

async function membership(userId: number, workspaceId: string, write = false) {
  const member = await prisma.businessMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { select: { status: true } } },
  })
  if (!member || member.status !== 'active' || member.workspace.status !== 'active') return null
  if (write && member.role === 'viewer') return null
  return member
}

function modelResponse(model: typeof FINANCIAL_MODEL_REGISTRY[number]) {
  return {
    ...model,
    sources: model.sources,
    requirementCount: model.inputs.filter(input => input.required).length,
  }
}

export async function financialModelRoutes(fastify: FastifyInstance) {
  fastify.get('/financial-models', { preHandler: [fastify.authenticate] }, async () => {
    return { models: FINANCIAL_MODEL_REGISTRY.map(modelResponse), total: FINANCIAL_MODEL_REGISTRY.length }
  })

  fastify.get('/financial-models/:code', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { code } = request.params as { code: string }
    const model = getFinancialModel(code)
    if (!model) return reply.status(404).send({ error: 'Finansal model bulunamadı.' })
    const stored = await prisma.financialModel.findUnique({
      where: { code: model.code },
      include: {
        versions: { orderBy: { createdAt: 'desc' } },
        courses: { include: { course: { select: { id: true, title: true, slug: true, published: true } } } },
        knowledgeObjects: { include: { knowledgeObject: { select: { id: true, code: true, title: true, status: true } } } },
      },
    })
    return { ...modelResponse(model), versions: stored?.versions ?? [], linkedCourses: stored?.courses.map(item => item.course) ?? [], linkedKnowledgeObjects: stored?.knowledgeObjects.map(item => item.knowledgeObject) ?? [] }
  })

  fastify.post('/financial-models/recommend', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = recommendationSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Model önerisi girdileri geçersiz.', details: parsed.error.flatten() })
    return { recommendations: recommendFinancialModels(parsed.data) }
  })

  fastify.post('/financial-models/:code/validate', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { code } = request.params as { code: string }
    const parsed = runSchema.pick({ inputs: true, assumptions: true }).safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ valid: false, error: 'Girdi paketi geçersiz.', details: parsed.error.flatten() })
    try {
      const result = runFinancialModel(code, parsed.data.inputs, parsed.data.assumptions as ModelAssumptionInput[])
      return { valid: true, checks: result.checks, warnings: result.warnings, normalizedInputs: result.normalizedInputs }
    } catch (error: any) {
      return reply.status(422).send({ valid: false, error: error.message, checks: error.validationChecks ?? [] })
    }
  })

  fastify.post('/workspaces/:workspaceId/financial-models/:code/runs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, code } = request.params as { workspaceId: string; code: string }
    if (!await membership(user.id, workspaceId, true)) return reply.status(403).send({ error: 'Bu işletmede model çalıştırma yetkiniz yok.' })
    const parsed = runSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Model çalışma girdileri geçersiz.', details: parsed.error.flatten() })

    const definition = getFinancialModel(code)
    if (!definition) return reply.status(404).send({ error: 'Finansal model bulunamadı.' })
    const storedModel = await prisma.financialModel.findUnique({
      where: { code: definition.code },
      include: { versions: { where: { version: definition.engineVersion }, take: 1 } },
    })
    if (!storedModel || !storedModel.versions[0]) return reply.status(503).send({ error: 'Model kataloğu hazırlanmadı.' })

    if (parsed.data.sourceDocumentId) {
      const document = await prisma.uploadedDocument.findUnique({ where: { id: parsed.data.sourceDocumentId } })
      if (!document || document.workspaceId !== workspaceId || document.archivedAt) return reply.status(404).send({ error: 'Kaynak belge bulunamadı.' })
      const verifiedDocumentFields = parsed.data.assumptions.some(item => item.sourceType === 'document' && item.userVerified)
      if (!verifiedDocumentFields) return reply.status(422).send({ error: 'OCR belge verileri modelde kullanılmadan önce kullanıcı tarafından doğrulanmalıdır.' })
    }
    if (parsed.data.caseId) {
      const financialCase = await prisma.financialCase.findUnique({ where: { id: parsed.data.caseId } })
      if (!financialCase || financialCase.status !== 'published') return reply.status(404).send({ error: 'Yayınlanmış vaka bulunamadı.' })
    }

    let result
    try {
      result = runFinancialModel(definition.code, parsed.data.inputs, parsed.data.assumptions as ModelAssumptionInput[])
    } catch (error: any) {
      return reply.status(422).send({ error: error.message, checks: error.validationChecks ?? [] })
    }

    const storedRun = await prisma.$transaction(async tx => {
      const run = await tx.financialModelRun.create({
        data: {
          modelId: storedModel.id,
          modelVersionId: storedModel.versions[0].id,
          userId: user.id,
          businessId: workspaceId,
          sourceDocumentId: parsed.data.sourceDocumentId,
          caseId: parsed.data.caseId,
          scenarioName: parsed.data.scenarioName,
          inputs: parsed.data.inputs as any,
          normalizedInputs: result.normalizedInputs as any,
          assumptions: parsed.data.assumptions as any,
          outputs: result.outputs as any,
          checks: [...result.checks, ...result.ethics] as any,
          warnings: result.warnings,
          confidence: result.confidence as any,
          calculationTrace: result.trace as any,
          status: 'completed',
        },
      })
      if (parsed.data.assumptions.length) {
        await tx.modelAssumption.createMany({
          data: parsed.data.assumptions.map(item => ({
            runId: run.id,
            key: item.key,
            value: item.value as any,
            unit: item.unit,
            sourceType: item.sourceType,
            sourceReference: item.sourceReference,
            effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : null,
            confidence: item.confidence ?? 0.5,
            userVerified: item.userVerified ?? false,
          })),
        })
      }
      return run
    })

    return reply.status(201).send({
      id: storedRun.id,
      scenarioName: storedRun.scenarioName,
      createdAt: storedRun.createdAt,
      model: modelResponse(definition),
      ...result,
    })
  })

  fastify.get('/workspaces/:workspaceId/financial-model-runs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await membership(user.id, workspaceId)) return reply.status(403).send({ error: 'Bu işletmeye erişiminiz yok.' })
    const query = request.query as { modelCode?: string; limit?: string }
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30))
    const runs = await prisma.financialModelRun.findMany({
      where: { businessId: workspaceId, ...(query.modelCode ? { model: { code: query.modelCode.toUpperCase() } } : {}) },
      include: { model: { select: { code: true, name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return { runs, total: runs.length }
  })

  fastify.get('/workspaces/:workspaceId/documents/:documentId/financial-model-suggestions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string; documentId: string }
    if (!await membership(user.id, workspaceId)) return reply.status(403).send({ error: 'Bu işletmeye erişiminiz yok.' })
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.workspaceId !== workspaceId || document.archivedAt) return reply.status(404).send({ error: 'Belge bulunamadı.' })
    if (!document.extractedText.trim()) return { documentId, documentName: document.originalName, extractedFieldCount: 0, models: [], warning: 'Belgeden okunabilir finansal alan çıkarılamadı.' }
    return { documentId, documentName: document.originalName, ...mapDocumentToFinancialModels(document.extractedText, document.originalName) }
  })

  fastify.get('/workspaces/:workspaceId/financial-model-runs/:runId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, runId } = request.params as { workspaceId: string; runId: string }
    if (!await membership(user.id, workspaceId)) return reply.status(403).send({ error: 'Bu işletmeye erişiminiz yok.' })
    const run = await prisma.financialModelRun.findUnique({
      where: { id: runId },
      include: { model: true, modelVersion: true, modelAssumptions: true, decisions: true, case: true },
    })
    if (!run || run.businessId !== workspaceId) return reply.status(404).send({ error: 'Model çalışması bulunamadı.' })
    return run
  })

  fastify.post('/workspaces/:workspaceId/financial-model-runs/compare', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await membership(user.id, workspaceId)) return reply.status(403).send({ error: 'Bu işletmeye erişiminiz yok.' })
    const parsed = z.object({ runIds: z.array(z.string().uuid()).min(2).max(6) }).safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Karşılaştırma için 2-6 çalışma seçin.' })
    const runs = await prisma.financialModelRun.findMany({
      where: { id: { in: parsed.data.runIds }, businessId: workspaceId },
      include: { model: { select: { code: true, name: true } } },
    })
    if (runs.length !== parsed.data.runIds.length) return reply.status(404).send({ error: 'Bir veya daha fazla çalışma bulunamadı.' })
    return { runs: parsed.data.runIds.map(id => runs.find(run => run.id === id)) }
  })

  fastify.post('/workspaces/:workspaceId/decision-journal', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await membership(user.id, workspaceId, true)) return reply.status(403).send({ error: 'Bu işletmede karar kaydetme yetkiniz yok.' })
    const parsed = z.object({
      modelRunId: z.string().uuid(),
      decision: z.string().min(3).max(5000),
      expectedOutcome: z.string().min(3).max(5000),
    }).safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Karar günlüğü girdileri geçersiz.' })
    const run = await prisma.financialModelRun.findUnique({ where: { id: parsed.data.modelRunId } })
    if (!run || run.businessId !== workspaceId) return reply.status(404).send({ error: 'Model çalışması bulunamadı.' })
    const entry = await prisma.decisionJournalEntry.create({ data: { ...parsed.data, userId: user.id, businessId: workspaceId } })
    return reply.status(201).send(entry)
  })

  fastify.patch('/workspaces/:workspaceId/decision-journal/:entryId/outcome', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, entryId } = request.params as { workspaceId: string; entryId: string }
    if (!await membership(user.id, workspaceId, true)) return reply.status(403).send({ error: 'Bu işletmede karar güncelleme yetkiniz yok.' })
    const parsed = z.object({
      actualOutcome: z.string().min(3).max(5000),
      variance: z.string().max(5000).optional(),
      lessonLearned: z.string().max(5000).optional(),
    }).safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Sonuç değerlendirmesi geçersiz.' })
    const existing = await prisma.decisionJournalEntry.findUnique({ where: { id: entryId } })
    if (!existing || existing.businessId !== workspaceId) return reply.status(404).send({ error: 'Karar kaydı bulunamadı.' })
    return prisma.decisionJournalEntry.update({ where: { id: entryId }, data: { ...parsed.data, reviewedAt: new Date() } })
  })

  fastify.get('/financial-cases', { preHandler: [fastify.authenticate] }, async () => {
    return prisma.financialCase.findMany({
      where: { status: 'published' },
      include: { course: { select: { id: true, title: true, slug: true } }, models: { include: { model: { select: { code: true, name: true } } } } },
      orderBy: { code: 'asc' },
    })
  })
}
