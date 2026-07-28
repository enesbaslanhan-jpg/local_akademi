import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
let app: FastifyInstance
let ownerId: number
let otherId: number
let viewerId: number
let ownerToken: string
let otherToken: string
let viewerToken: string
let workspaceId: string
let otherWorkspaceId: string
let recordId: string
let documentId: string

function inject(method: string, url: string, token?: string, payload?: any) {
  return app.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload === undefined ? {} : { payload })
  })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { businessTrackerRoutes } = await import('../src/services/business-tracker')
  await app.register(businessTrackerRoutes, { prefix: '/workspaces', prisma })
  await app.ready()

  const stamp = Date.now()
  const [owner, other, viewer] = await Promise.all([
    prisma.user.create({ data: { email: `tracker-owner-${stamp}@test.local`, password: 'hash', name: 'Owner' } }),
    prisma.user.create({ data: { email: `tracker-other-${stamp}@test.local`, password: 'hash', name: 'Other' } }),
    prisma.user.create({ data: { email: `tracker-viewer-${stamp}@test.local`, password: 'hash', name: 'Viewer' } })
  ])
  ownerId = owner.id
  otherId = other.id
  viewerId = viewer.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email })
  otherToken = app.jwt.sign({ id: otherId, email: other.email })
  viewerToken = app.jwt.sign({ id: viewerId, email: viewer.email })

  const [workspace, otherWorkspace] = await Promise.all([
    prisma.businessWorkspace.create({ data: { name: 'Tracker Test', createdById: ownerId } }),
    prisma.businessWorkspace.create({ data: { name: 'Other Tracker', createdById: otherId } })
  ])
  workspaceId = workspace.id
  otherWorkspaceId = otherWorkspace.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: ownerId, role: 'owner' },
      { workspaceId, userId: viewerId, role: 'viewer' },
      { workspaceId: otherWorkspaceId, userId: otherId, role: 'owner' }
    ]
  })
})

afterAll(async () => {
  await prisma.documentConversation.deleteMany({ where: { documentId } }).catch(() => {})
  await prisma.businessRecordDocument.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessReminder.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessNotification.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessRecordHistory.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessRecord.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.uploadedDocument.deleteMany({ where: { id: documentId } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, viewerId] } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

describe('Business tracker API', () => {
  it('requires authentication', async () => {
    const response = await inject('GET', `/workspaces/${workspaceId}/records`)
    expect(response.statusCode).toBe(401)
  })

  it('creates a payable record with a due date', async () => {
    const response = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment',
      title: 'Kira ödemesi',
      direction: 'payable',
      amount: 12500,
      currency: 'TRY',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 'high'
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().amount).toBe(12500)
    recordId = response.json().id
  })

  it('lists only workspace records', async () => {
    await prisma.businessRecord.create({
      data: { workspaceId: otherWorkspaceId, type: 'task', title: 'Private record', createdById: otherId }
    })
    const response = await inject('GET', `/workspaces/${workspaceId}/records`, ownerToken)
    expect(response.statusCode).toBe(200)
    expect(response.json().records.map((record: any) => record.title)).toEqual(['Kira ödemesi'])
  })

  it('blocks cross-workspace record IDOR', async () => {
    const response = await inject('GET', `/workspaces/${otherWorkspaceId}/records/${recordId}`, otherToken)
    expect(response.statusCode).toBe(404)
  })

  it('allows viewers to read but not mutate', async () => {
    expect((await inject('GET', `/workspaces/${workspaceId}/records`, viewerToken)).statusCode).toBe(200)
    const response = await inject('POST', `/workspaces/${workspaceId}/records`, viewerToken, {
      type: 'task', title: 'Forbidden'
    })
    expect(response.statusCode).toBe(403)
  })

  it('rejects contacts from another workspace', async () => {
    const contact = await prisma.businessContact.create({
      data: { workspaceId: otherWorkspaceId, name: 'Other Supplier', createdById: otherId }
    })
    const response = await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      contactId: contact.id
    })
    expect(response.statusCode).toBe(422)
  })

  it('creates a deduplicated reminder', async () => {
    const payload = { scheduledAt: new Date(Date.now() + 3600000).toISOString() }
    const first = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/reminders`, ownerToken, payload)
    const second = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/reminders`, ownerToken, payload)
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(await prisma.businessReminder.count({ where: { recordId } })).toBe(1)
  })

  it('attaches a legacy personal document without empty-string foreign keys', async () => {
    const document = await prisma.uploadedDocument.create({
      data: {
        userId: ownerId,
        originalName: 'senet.pdf',
        storedName: 'tracker-test-senet.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100
      }
    })
    documentId = document.id
    const response = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, ownerToken)
    expect(response.statusCode).toBe(201)
    expect((await prisma.uploadedDocument.findUnique({ where: { id: documentId } }))?.workspaceId).toBe(workspaceId)
  })

  it('defers a record and keeps an audit reason', async () => {
    const dueAt = new Date(Date.now() + 7 * 86400000).toISOString()
    const response = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/defer`, ownerToken, {
      dueAt,
      reason: 'Tedarikçi ile yeni tarih kararlaştırıldı'
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe('deferred')
    const history = await prisma.businessRecordHistory.findFirst({ where: { recordId, action: 'deferred' } })
    expect(history?.reason).toContain('Tedarikçi')
  })

  it('completes a record and exposes it in history', async () => {
    const response = await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      status: 'completed'
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().completedAt).toBeTruthy()
    const detail = await inject('GET', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken)
    expect(detail.json().history.some((item: any) => item.action === 'status.completed')).toBe(true)
  })

  it('returns workspace summary and archives records softly', async () => {
    const summary = await inject('GET', `/workspaces/${workspaceId}/tracker/summary`, ownerToken)
    expect(summary.statusCode).toBe(200)
    expect(summary.json().nextThirtyDays).toBeDefined()

    expect((await inject('DELETE', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken)).statusCode).toBe(200)
    const list = await inject('GET', `/workspaces/${workspaceId}/records`, ownerToken)
    expect(list.json().records).toHaveLength(0)
  })
})
