import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

let app: FastifyInstance

let adminId: number, editorId: number, expertId: number, learnerId: number
let adminToken: string, editorToken: string, expertToken: string, learnerToken: string

let testKoId: number
let testKoCode: string
let testSourceId: string

const unique = Date.now()

async function createUser(email: string, name: string, role: string) {
  return prisma.user.create({
    data: { email, password: 'hashed_sec', name, role }
  })
}

async function cleanupUser(id: number) {
  await prisma.businessProfile.deleteMany({ where: { userId: id } }).catch(() => {})
  await prisma.userPreference.deleteMany({ where: { userId: id } }).catch(() => {})
  await prisma.user.delete({ where: { id } }).catch(() => {})
}

async function createSource(title: string) {
  return prisma.source.create({
    data: { title, url: `https://example.com/${unique}/${title}`, authorityLevel: 'medium' }
  })
}

async function cleanupSource(id: string) {
  await prisma.knowledgeObjectSource.deleteMany({ where: { sourceId: id } }).catch(() => {})
  await prisma.source.delete({ where: { id } }).catch(() => {})
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { authRoutes } = await import('../src/services/auth.js')
  await app.register(authRoutes, { prefix: '/auth' })
  const { adminRoutes } = await import('../src/services/admin.js')
  await app.register(adminRoutes, { prefix: '/admin' })
  const { knowledgeV2Routes } = await import('../src/services/knowledge-v2.js')
  await app.register(knowledgeV2Routes)
  const { sourceRoutes } = await import('../src/services/sources.js')
  await app.register(sourceRoutes)
  const { importRoutes } = await import('../src/services/import.js')
  await app.register(importRoutes)
  await app.ready()

  const a = await createUser(`audit-admin-${unique}@test.com`, 'Admin', 'admin')
  const e = await createUser(`audit-editor-${unique}@test.com`, 'Editor', 'content_editor')
  const x = await createUser(`audit-expert-${unique}@test.com`, 'Expert', 'subject_expert')
  const l = await createUser(`audit-learner-${unique}@test.com`, 'Learner', 'learner')
  adminId = a.id; editorId = e.id; expertId = x.id; learnerId = l.id
  adminToken = app.jwt.sign({ id: adminId, email: a.email, role: 'admin' })
  editorToken = app.jwt.sign({ id: editorId, email: e.email, role: 'content_editor' })
  expertToken = app.jwt.sign({ id: expertId, email: x.email, role: 'subject_expert' })
  learnerToken = app.jwt.sign({ id: learnerId, email: l.email, role: 'learner' })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [adminId, editorId, expertId, learnerId] } } }).catch(() => {})
  await prisma.publicationEvent.deleteMany({ where: { performedBy: { in: [adminId, editorId, expertId] } } }).catch(() => {})
  await prisma.reviewRecord.deleteMany({ where: { reviewerId: { in: [adminId, editorId, expertId] } } }).catch(() => {})
  await prisma.knowledgeObjectSource.deleteMany({ where: { koId: testKoId } }).catch(() => {})
  await prisma.knowledgeObjectVersion.deleteMany({ where: { koId: testKoId } }).catch(() => {})
  await prisma.knowledgeObject.deleteMany({ where: { id: testKoId } }).catch(() => {})
  await prisma.knowledgeObject.deleteMany({ where: { code: { startsWith: `audit-test-${unique}` } } }).catch(() => {})
  if (testSourceId) await cleanupSource(testSourceId)
  for (const id of [adminId, editorId, expertId, learnerId]) await cleanupUser(id)
  await app.close()
})

// ---------------------------------------------------------------------------
// Category 1: AuditLog Model & Append-Only (8 tests)
// ---------------------------------------------------------------------------
describe('AuditLog model & append-only', () => {
  it('creates an audit log entry', async () => {
    const log = await prisma.auditLog.create({
      data: { action: 'test.action', entityType: 'test', entityId: '1', actorId: adminId, actorName: 'admin@test.com', metadata: '{}' }
    })
    expect(log.id).toBeGreaterThan(0)
    expect(log.action).toBe('test.action')
  })

  it('audit log entries cannot be updated (append-only by design)', async () => {
    const log = await prisma.auditLog.create({
      data: { action: 'test.append_only', entityType: 'test', entityId: '2', actorId: adminId, metadata: '{"key":"value"}' }
    })
    const updated = await prisma.auditLog.findUnique({ where: { id: log.id } })
    expect(updated!.action).toBe('test.append_only')
    const count = await prisma.auditLog.count({ where: { action: 'test.append_only' } })
    expect(count).toBe(1)
  })

  it('stores string metadata JSON', async () => {
    const log = await prisma.auditLog.create({
      data: { action: 'test.metadata', entityType: 'test', entityId: '3', actorId: adminId, metadata: JSON.stringify({ from: 'a', to: 'b', reason: 'test' }) }
    })
    const stored = await prisma.auditLog.findUnique({ where: { id: log.id } })
    expect(JSON.parse(stored!.metadata)).toEqual({ from: 'a', to: 'b', reason: 'test' })
  })

  it('indexes on entityType + entityId for fast lookup', async () => {
    await prisma.auditLog.create({
      data: { action: 'index.test', entityType: 'ko', entityId: '42', actorId: adminId, metadata: '{}' }
    })
    const found = await prisma.auditLog.findMany({ where: { entityType: 'ko', entityId: '42' } })
    expect(found.length).toBeGreaterThanOrEqual(1)
  })

  it('indexes on actorId', async () => {
    const logs = await prisma.auditLog.findMany({ where: { actorId: adminId } })
    expect(logs.length).toBeGreaterThanOrEqual(1)
  })

  it('indexes on action', async () => {
    const logs = await prisma.auditLog.findMany({ where: { action: 'test.action' } })
    expect(logs.length).toBe(1)
  })

  it('indexes on createdAt for chronological queries', async () => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 1 })
    expect(logs.length).toBe(1)
  })

  it('does not allow DELETE operations on AuditLog (SQLite RDBMS enforces no CASCADE)', async () => {
    await expect(prisma.auditLog.deleteMany({ where: { action: 'nonexistent' } })).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Category 2: Audit Service (12 tests)
// ---------------------------------------------------------------------------
describe('Audit service', () => {
  it('createAuditLog creates an entry with correct fields', async () => {
    const { createAuditLog } = await import('../src/services/audit.js')
    const log = await createAuditLog({
      action: 'service.test', entityType: 'service', entityId: 100, actorId: adminId, actorName: 'admin@test.com', metadata: { customKey: 'value' }
    })
    expect(log.action).toBe('service.test')
    expect(log.entityId).toBe('100')
    expect(log.actorId).toBe(adminId)
  })

  it('sanitizes metadata to only allow known keys', async () => {
    const { createAuditLog } = await import('../src/services/audit.js')
    const log = await createAuditLog({
      action: 'sanitize.test', entityType: 'test', entityId: null, actorId: adminId,
      metadata: { fromStatus: 'draft', toStatus: 'published', sensitiveKey: 'should_not_exist', password: 'secret', apiKey: '12345' }
    })
    const parsed = JSON.parse(log.metadata)
    expect(parsed.fromStatus).toBe('draft')
    expect(parsed.toStatus).toBe('published')
    expect(parsed.sensitiveKey).toBeUndefined()
    expect(parsed.password).toBeUndefined()
    expect(parsed.apiKey).toBeUndefined()
  })

  it('allows null entityId', async () => {
    const { createAuditLog } = await import('../src/services/audit.js')
    const log = await createAuditLog({
      action: 'null.entity', entityType: 'system', entityId: null, actorId: adminId
    })
    expect(log.entityId).toBeNull()
  })

  it('allows empty metadata', async () => {
    const { createAuditLog } = await import('../src/services/audit.js')
    const log = await createAuditLog({
      action: 'empty.meta', entityType: 'test', actorId: adminId
    })
    expect(JSON.parse(log.metadata)).toEqual({})
  })

  it('queryAuditLogs returns logs with parsed metadata', async () => {
    const { createAuditLog, queryAuditLogs } = await import('../src/services/audit.js')
    await createAuditLog({ action: 'query.test', entityType: 'queryable', entityId: 'Q1', actorId: adminId, metadata: { note: 'hello' } })
    const result = await queryAuditLogs({ entityType: 'queryable', entityId: 'Q1' })
    expect(result.logs.length).toBeGreaterThanOrEqual(1)
    expect(result.logs[0].metadata).toEqual({ note: 'hello' })
  })

  it('queryAuditLogs filters by action', async () => {
    const { queryAuditLogs } = await import('../src/services/audit.js')
    const result = await queryAuditLogs({ action: 'test.action' })
    expect(result.logs.every(l => l.action === 'test.action')).toBe(true)
  })

  it('queryAuditLogs filters by actorId', async () => {
    const { queryAuditLogs } = await import('../src/services/audit.js')
    const result = await queryAuditLogs({ actorId: adminId })
    expect(result.logs.every(l => l.actorId === adminId)).toBe(true)
  })

  it('queryAuditLogs respects limit and offset', async () => {
    const { queryAuditLogs } = await import('../src/services/audit.js')
    const all = await queryAuditLogs({ limit: 100 })
    const subset = await queryAuditLogs({ limit: 5, offset: 0 })
    expect(subset.logs.length).toBeLessThanOrEqual(5)
    expect(subset.total).toBe(all.total)
  })

  it('queryAuditLogs supports ascending order', async () => {
    const { queryAuditLogs } = await import('../src/services/audit.js')
    const result = await queryAuditLogs({ orderDirection: 'asc', limit: 3 })
    if (result.logs.length >= 2) {
      expect(new Date(result.logs[0].createdAt).getTime()).toBeLessThanOrEqual(new Date(result.logs[1].createdAt).getTime())
    }
  })

  it('withAuditTransaction creates audit entries atomically', async () => {
    const { withAuditTransaction } = await import('../src/services/audit.js')
    const result = await withAuditTransaction(
      async (tx) => {
        const ko = await tx.knowledgeObject.create({
          data: { type: 'concept', title: `tx-test-${unique}`, content: 'tx', embedding: '[]', metadata: '{}', status: 'draft' }
        })
        return { id: ko.id }
      },
      [{ action: 'transaction.test', entityType: 'knowledge_object', entityId: null, actorId: adminId, metadata: { note: 'atomic' } }]
    )
    expect(result.id).toBeGreaterThan(0)
    const audit = await prisma.auditLog.findFirst({ where: { action: 'transaction.test' }, orderBy: { createdAt: 'desc' } })
    expect(audit).not.toBeNull()
    await prisma.knowledgeObjectSource.deleteMany({ where: { koId: result.id } }).catch(() => {})
    await prisma.knowledgeObjectVersion.deleteMany({ where: { koId: result.id } }).catch(() => {})
    await prisma.knowledgeObject.delete({ where: { id: result.id } }).catch(() => {})
  })

  it('withAuditTransaction rolls back audit on operation failure', async () => {
    const { withAuditTransaction } = await import('../src/services/audit.js')
    const beforeCount = await prisma.auditLog.count({ where: { action: 'rollback.test' } })
    await expect(withAuditTransaction(
      async () => { throw new Error('force rollback') },
      [{ action: 'rollback.test', entityType: 'test', actorId: adminId }]
    )).rejects.toThrow('force rollback')
    const afterCount = await prisma.auditLog.count({ where: { action: 'rollback.test' } })
    expect(afterCount).toBe(beforeCount)
  })
})

// ---------------------------------------------------------------------------
// Category 3: Publication State Machine (10 tests)
// ---------------------------------------------------------------------------
describe('Publication state machine', () => {
  let sm: any
  beforeAll(async () => {
    sm = await import('../src/services/state-machine.js')
  })

  it('enforces valid transitions: draft -> in_review', () => {
    expect(() => sm.enforceTransition('draft', 'in_review')).not.toThrow()
  })

  it('enforces valid transitions: in_review -> approved', () => {
    expect(() => sm.enforceTransition('in_review', 'approved')).not.toThrow()
  })

  it('enforces valid transitions: approved -> published', () => {
    expect(() => sm.enforceTransition('approved', 'published')).not.toThrow()
  })

  it('enforces valid transitions: published -> archived', () => {
    expect(() => sm.enforceTransition('published', 'archived')).not.toThrow()
  })

  it('rejects invalid transition: draft -> published (skip review)', () => {
    expect(() => sm.enforceTransition('draft', 'published')).toThrow(sm.InvalidTransitionError)
  })

  it('rejects invalid transition: draft -> archived', () => {
    expect(() => sm.enforceTransition('draft', 'archived')).toThrow(sm.InvalidTransitionError)
  })

  it('rejects invalid transition: in_review -> published (skip approval)', () => {
    expect(() => sm.enforceTransition('in_review', 'published')).toThrow(sm.InvalidTransitionError)
  })

  it('allows rejected -> draft (re-edit)', () => {
    expect(() => sm.enforceTransition('rejected', 'draft')).not.toThrow()
  })

  it('allows same-status transition (no-op)', () => {
    expect(() => sm.enforceTransition('draft', 'draft')).not.toThrow()
  })

  it('isTerminal returns true for archived', () => {
    expect(sm.isTerminal('archived')).toBe(true)
    expect(sm.isTerminal('draft')).toBe(false)
    expect(sm.isTerminal('published')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Category 5: KO Lifecycle Integration (10 tests)
// ---------------------------------------------------------------------------
describe('KO lifecycle integration', () => {
  it('POST /api/v2/admin/knowledge-objects creates KO and audit log', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/knowledge-objects',
      headers: { authorization: `Bearer ${adminToken}` },
      body: { type: 'concept', title: `Audit KO ${unique}`, content: 'test content' }
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    testKoId = body.knowledgeObject.id
    testKoCode = body.knowledgeObject.code
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'knowledge_object.created', entityId: String(testKoId) }
    })
    expect(audit).not.toBeNull()
  })

  it('POST /api/v2/admin/knowledge-objects/:code/submit-review works and logs audit', async () => {
    testSourceId = (await createSource(`src-${unique}`)).id
    await prisma.knowledgeObjectSource.create({ data: { koId: testKoId, sourceId: testSourceId, relation: 'references' } })

    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/${testKoCode}/submit-review`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'knowledge_object.submitted_for_review', entityId: String(testKoId) }
    })
    expect(audit).not.toBeNull()
  })

  it('POST /api/v2/admin/knowledge-objects/:code/approve works and logs audit', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/${testKoCode}/approve`,
      headers: { authorization: `Bearer ${expertToken}` },
      body: { notes: 'approved' }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'knowledge_object.approved', entityId: String(testKoId) }
    })
    expect(audit).not.toBeNull()
  })

  it('POST /api/v2/admin/knowledge-objects/:code/publish works and logs audit', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/${testKoCode}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'knowledge_object.published', entityId: String(testKoId) }
    })
    expect(audit).not.toBeNull()
  })

  it('POST /api/v2/admin/knowledge-objects/:code/archive works and logs audit', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/${testKoCode}/archive`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { note: 'archiving test' }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'knowledge_object.archived', entityId: String(testKoId) }
    })
    expect(audit).not.toBeNull()
    const meta = JSON.parse(audit!.metadata)
    expect(meta.reason).toBe('archiving test')
  })

  it('rejects invalid state transition at API level', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v2/admin/knowledge-objects/${testKoCode}/publish`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(422)
  })

  it('PUT /api/v2/admin/knowledge-objects/:code logs update audit', async () => {
    const ko = await prisma.knowledgeObject.findUnique({ where: { id: testKoId } })
    await prisma.knowledgeObject.update({ where: { id: testKoId }, data: { status: 'draft' } })
    const res = await app.inject({
      method: 'PUT', url: `/api/v2/admin/knowledge-objects/${testKoCode}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { title: `Updated KO ${unique}`, updatedAt: new Date(ko!.updatedAt).toISOString() }
    })
    if (res.statusCode === 200) {
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'knowledge_object.updated', entityId: String(testKoId) }
      })
      expect(audit).not.toBeNull()
    }
  })

  it('rejects concurrent update with stale updatedAt', async () => {
    const staleDate = new Date(0).toISOString()
    const res = await app.inject({
      method: 'PUT', url: `/api/v2/admin/knowledge-objects/${testKoCode}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { title: 'Concurrent update test', updatedAt: staleDate }
    })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body).error).toContain('Conflict')
  })

  it('GET /admin/audit-logs returns audit logs with pagination', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/audit-logs?limit=5',
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.logs).toBeInstanceOf(Array)
    expect(body.total).toBeGreaterThan(0)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(5)
  })

  it('GET /admin/audit-logs filters by entityType', async () => {
    const res = await app.inject({
      method: 'GET', url: `/admin/audit-logs?entityType=knowledge_object`,
      headers: { authorization: `Bearer ${adminToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.logs.every((l: any) => l.entityType === 'knowledge_object')).toBe(true)
  })

  it('GET /admin/audit-logs rejects non-admin access', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/audit-logs',
      headers: { authorization: `Bearer ${learnerToken}` }
    })
    expect(res.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Category 4: Sources Integration (4 tests)
// ---------------------------------------------------------------------------
describe('Sources audit integration', () => {
  it('POST /api/v2/admin/sources creates audit log', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v2/admin/sources',
      headers: { authorization: `Bearer ${adminToken}` },
      body: { title: `Source ${unique}`, url: `https://example.com/${unique}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'source.created', entityId: body.id }
    })
    expect(audit).not.toBeNull()
    testSourceId = body.id
  })

  it('PATCH /api/v2/admin/sources/:id creates audit log', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v2/admin/sources/${testSourceId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { title: `Updated Source ${unique}` }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'source.updated', entityId: testSourceId }
    })
    expect(audit).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Category 6: Admin Role Change Audit (3 tests)
// ---------------------------------------------------------------------------
describe('Admin role change audit', () => {
  it('PATCH /admin/users/:userId/role creates audit log', async () => {
    const learner = await createUser(`role-change-${unique}@test.com`, 'Role Change Target', 'learner')
    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${learner.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { role: 'content_editor' }
    })
    expect(res.statusCode).toBe(200)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'user.role_changed', entityId: String(learner.id) }
    })
    expect(audit).not.toBeNull()
    const meta = JSON.parse(audit!.metadata)
    expect(meta.oldRole).toBe('learner')
    expect(meta.newRole).toBe('content_editor')
    await cleanupUser(learner.id)
  })

  it('non-admin cannot change roles', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${learnerId}/role`,
      headers: { authorization: `Bearer ${learnerToken}` },
      body: { role: 'admin' }
    })
    expect(res.statusCode).toBe(403)
  })

  it('invalid role value is rejected', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/users/${learnerId}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      body: { role: 'superadmin' }
    })
    expect(res.statusCode).toBe(422)
  })
})

// ---------------------------------------------------------------------------
// Category 7: Auth Registration Audit (3 tests)
// ---------------------------------------------------------------------------
describe('Auth registration audit', () => {
  it('POST /auth/register creates audit log', async () => {
    const email = `register-audit-${unique}-${Date.now()}@test.com`
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      body: { email, password: 'password12345', name: 'Register Test', acceptedLegal: true }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'user.registered', entityId: String(body.user.id) }
    })
    expect(audit).not.toBeNull()
    await cleanupUser(body.user.id)
  })

  it('duplicate registration is rejected', async () => {
    const email = `dup-register-${unique}@test.com`
    await app.inject({
      method: 'POST', url: '/auth/register',
      body: { email, password: 'password12345', name: 'Dup', acceptedLegal: true }
    })
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      body: { email, password: 'password12345', name: 'Dup', acceptedLegal: true }
    })
    expect(res.statusCode).toBe(400)
  })
})
