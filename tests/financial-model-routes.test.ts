import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { ensureFinancialModelCatalog } from '../src/services/financial-models/catalog'

const prisma = new PrismaClient()
let app: FastifyInstance
let ownerId: number
let otherId: number
let viewerId: number
let workspaceId: string
let otherWorkspaceId: string
let ownerToken: string
let otherToken: string
let viewerToken: string
let runId: string
let secondRunId: string
let decisionId: string
let documentId: string

function inject(method: string, url: string, token?: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload === undefined ? {} : { payload }),
  })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { financialModelRoutes } = await import('../src/services/financial-models/routes')
  await app.register(financialModelRoutes)
  await app.ready()
  await ensureFinancialModelCatalog(prisma)

  const stamp = Date.now()
  const [owner, other, viewer] = await Promise.all([
    prisma.user.create({ data: { email: `fm-owner-${stamp}@test.local`, password: 'hash', name: 'Owner' } }),
    prisma.user.create({ data: { email: `fm-other-${stamp}@test.local`, password: 'hash', name: 'Other' } }),
    prisma.user.create({ data: { email: `fm-viewer-${stamp}@test.local`, password: 'hash', name: 'Viewer' } }),
  ])
  ownerId = owner.id
  otherId = other.id
  viewerId = viewer.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email })
  otherToken = app.jwt.sign({ id: otherId, email: other.email })
  viewerToken = app.jwt.sign({ id: viewerId, email: viewer.email })

  const [workspace, otherWorkspace] = await Promise.all([
    prisma.businessWorkspace.create({ data: { name: 'Finance Lab', createdById: ownerId } }),
    prisma.businessWorkspace.create({ data: { name: 'Other Finance Lab', createdById: otherId } }),
  ])
  workspaceId = workspace.id
  otherWorkspaceId = otherWorkspace.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: ownerId, role: 'owner' },
      { workspaceId, userId: viewerId, role: 'viewer' },
      { workspaceId: otherWorkspaceId, userId: otherId, role: 'owner' },
    ],
  })
  const document = await prisma.uploadedDocument.create({
    data: {
      userId: ownerId,
      workspaceId,
      originalName: 'test-financial.pdf',
      storedName: `test-financial-${stamp}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 100,
      extractedText: 'Dönen varlıklar 200, kısa vadeli yükümlülükler 100',
      status: 'ready',
      analysisStatus: 'analyzed',
    },
  })
  documentId = document.id
})

afterAll(async () => {
  await prisma.decisionJournalEntry.deleteMany({ where: { businessId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.modelAssumption.deleteMany({ where: { run: { businessId: { in: [workspaceId, otherWorkspaceId] } } } }).catch(() => {})
  await prisma.financialModelRun.deleteMany({ where: { businessId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.uploadedDocument.deleteMany({ where: { id: documentId } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, viewerId] } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

describe('Phase 6 financial model routes', () => {
  it('requires authentication for the model library', async () => {
    expect((await inject('GET', '/financial-models')).statusCode).toBe(401)
  })

  it('returns all 24 versioned models', async () => {
    const response = await inject('GET', '/financial-models', ownerToken)
    expect(response.statusCode).toBe(200)
    expect(response.json().total).toBe(24)
  })

  it('does not allow a viewer to create a model run', async () => {
    const response = await inject('POST', `/workspaces/${workspaceId}/financial-models/CURRENT_RATIO/runs`, viewerToken, {
      inputs: { currentAssets: 200, currentLiabilities: 100 },
    })
    expect(response.statusCode).toBe(403)
  })

  it('prevents a user from running a model in another tenant', async () => {
    const response = await inject('POST', `/workspaces/${otherWorkspaceId}/financial-models/CURRENT_RATIO/runs`, ownerToken, {
      inputs: { currentAssets: 200, currentLiabilities: 100 },
    })
    expect(response.statusCode).toBe(403)
  })

  it('requires user verification before OCR document values can be used', async () => {
    const response = await inject('POST', `/workspaces/${workspaceId}/financial-models/CURRENT_RATIO/runs`, ownerToken, {
      inputs: { currentAssets: 200, currentLiabilities: 100 },
      sourceDocumentId: documentId,
      assumptions: [
        { key: 'currentAssets', value: 200, sourceType: 'document', sourceReference: 'test-financial.pdf', userVerified: false },
      ],
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().error).toMatch(/doğrulanmalıdır/)
  })

  it('creates a deterministic run with trace, confidence and ethics checks', async () => {
    const response = await inject('POST', `/workspaces/${workspaceId}/financial-models/CURRENT_RATIO/runs`, ownerToken, {
      inputs: { currentAssets: 200, currentLiabilities: 100 },
      sourceDocumentId: documentId,
      scenarioName: 'base',
      assumptions: [
        { key: 'currentAssets', value: 200, unit: 'TRY', sourceType: 'document', sourceReference: 'test-financial.pdf', effectiveDate: new Date().toISOString(), userVerified: true },
        { key: 'currentLiabilities', value: 100, unit: 'TRY', sourceType: 'document', sourceReference: 'test-financial.pdf', effectiveDate: new Date().toISOString(), userVerified: true },
      ],
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.outputs.currentRatio).toBe(2)
    expect(body.trace).toHaveLength(1)
    expect(body.confidence.score).toBeGreaterThanOrEqual(75)
    expect(body.ethics).toHaveLength(4)
    runId = body.id
  })

  it('creates a second scenario and compares authorized runs', async () => {
    const second = await inject('POST', `/workspaces/${workspaceId}/financial-models/CURRENT_RATIO/runs`, ownerToken, {
      inputs: { currentAssets: 150, currentLiabilities: 100 },
      scenarioName: 'stress',
    })
    expect(second.statusCode).toBe(201)
    secondRunId = second.json().id

    const comparison = await inject('POST', `/workspaces/${workspaceId}/financial-model-runs/compare`, ownerToken, {
      runIds: [runId, secondRunId],
    })
    expect(comparison.statusCode).toBe(200)
    expect(comparison.json().runs).toHaveLength(2)
  })

  it('does not leak run details across workspaces', async () => {
    const response = await inject('GET', `/workspaces/${otherWorkspaceId}/financial-model-runs/${runId}`, otherToken)
    expect(response.statusCode).toBe(404)
  })

  it('records and later reviews a decision outcome', async () => {
    const created = await inject('POST', `/workspaces/${workspaceId}/decision-journal`, ownerToken, {
      modelRunId: runId,
      decision: 'Tahsilat planını sıkılaştır.',
      expectedOutcome: 'Cari oranı üç ay içinde 2,2 seviyesine çıkar.',
    })
    expect(created.statusCode).toBe(201)
    decisionId = created.json().id

    const reviewed = await inject('PATCH', `/workspaces/${workspaceId}/decision-journal/${decisionId}/outcome`, ownerToken, {
      actualOutcome: 'Cari oran 2,1 seviyesine çıktı.',
      variance: 'Hedefin 0,1 altında.',
      lessonLearned: 'Tedarikçi vadesi de birlikte yönetilmeli.',
    })
    expect(reviewed.statusCode).toBe(200)
    expect(reviewed.json().reviewedAt).toBeTruthy()
  })
})
