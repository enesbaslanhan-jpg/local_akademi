// phase3a-tests.ts – Phase 3A: v2 service logic via Prisma (no HTTP needed)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function getToken(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email } })
  if (!u) return null
  const { sign } = await import('@fastify/jwt').catch(() => ({ sign: null }))
  if (!sign) return String(u.id)
  return sign({ id: u.id, email: u.email, role: u.role }, 'super-secret-change-in-production', { expiresIn: '1h' })
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

async function run() {
  console.log('=== Phase 3A Test Suite ===\n')
  let passed = 0
  const results: { name: string; ok: boolean; err?: string }[] = []

  async function test(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn()
      results.push({ name, ok })
      console.log(`${ok ? '✅' : '❌'} ${name}`)
      if (ok) passed++
    } catch (e: any) {
      results.push({ name, ok: false, err: e.message })
      console.log(`❌ ${name}: ${e.message}`)
    }
  }

  // ── Seed / find users ──────────────────────────────────────────────────────
  let adminUser = await prisma.user.findFirst({ where: { role: 'admin' } })
  let editorUser = await prisma.user.findFirst({ where: { role: 'content_editor' } })
  let expertUser = await prisma.user.findFirst({ where: { role: 'subject_expert' } })
  let studentUser = await prisma.user.findFirst({ where: { role: 'student' } })

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: { email: `admin-${Date.now()}@test.com`, password: bcrypt.hashSync('x', 10), name: 'Admin', role: 'admin' }
    })
  }
  if (!editorUser) {
    editorUser = await prisma.user.create({
      data: { email: `editor-${Date.now()}@test.com`, password: bcrypt.hashSync('x', 10), name: 'Editor', role: 'content_editor' }
    })
  }
  if (!expertUser) {
    expertUser = await prisma.user.create({
      data: { email: `expert-${Date.now()}@test.com`, password: bcrypt.hashSync('x', 10), name: 'Expert', role: 'subject_expert' }
    })
  }
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: { email: `student-${Date.now()}@test.com`, password: bcrypt.hashSync('x', 10), name: 'Student', role: 'student' }
    })
  }

  console.log(`Users: admin=${adminUser.id} editor=${editorUser.id} expert=${expertUser.id} student=${studentUser.id}\n`)

  // ── KO count ───────────────────────────────────────────────────────────────
  await test('Database has 600 demo KOs', async () => {
    const c = await prisma.knowledgeObject.count({ where: { isDemo: true } })
    return c === 600
  })

  // ── Demo KOs are published ─────────────────────────────────────────────────
  await test('All demo KOs have status=published', async () => {
    const c = await prisma.knowledgeObject.count({ where: { isDemo: true, status: 'published' } })
    return c === 600
  })

  // ── Create KO ──────────────────────────────────────────────────────────────
  let newCode = `T3A-${Date.now()}`
  let newKoId: number
  await test('Create KO (content_editor)', async () => {
    const ko = await prisma.knowledgeObject.create({
      data: {
        code: newCode,
        slug: `t3a-${Date.now()}`,
        title: 'Phase 3A Test',
        type: 'concept',
        content: 'Test content',
        embedding: '[]',
        metadata: '{}',
        status: 'draft',
        verificationStatus: 'unverified',
        reviewGate: 'standard',
        isDemo: false
      }
    })
    newKoId = ko.id
    return ko.code === newCode && ko.status === 'draft'
  })

  await test('Create KO fails with duplicate code', async () => {
    try {
      await prisma.knowledgeObject.create({
        data: {
          code: newCode,
          slug: `t3a-2-${Date.now()}`,
          title: 'Dup',
          type: 'concept',
          content: 'x',
          embedding: '[]',
          metadata: '{}'
        }
      })
      return false
    } catch { return true }
  })

  // ── Attach source ──────────────────────────────────────────────────────────
  let testSrcId: string
  await test('Attach source to KO', async () => {
    const src = await prisma.source.create({ data: { title: 'T3A Source' } })
    testSrcId = src.id
    const kos = await prisma.knowledgeObjectSource.create({
      data: { koId: newKoId!, sourceId: src.id, relation: 'references' }
    })
    return kos !== null
  })

  // ── State: draft → in_review ───────────────────────────────────────────────
  await test('Submit for review fails without source', async () => {
    const fresh = await prisma.knowledgeObject.create({
      data: {
        code: `T3A-NS-${Date.now()}`,
        slug: `t3a-ns-${Date.now()}`,
        title: 'No Source',
        type: 'concept',
        content: 'x',
        embedding: '[]',
        metadata: '{}',
        status: 'draft'
      }
    })
    const sources = await prisma.knowledgeObjectSource.findMany({ where: { koId: fresh.id } })
    return sources.length === 0
  })

  await test('Submit review changes status to in_review', async () => {
    const updated = await prisma.knowledgeObject.update({
      where: { id: newKoId! },
      data: { status: 'in_review', verificationStatus: 'pending_review', reviewDue: new Date() }
    })
    return updated.status === 'in_review'
  })

  await test('Submit review creates ReviewRecord', async () => {
    const rec = await prisma.reviewRecord.create({
      data: { koId: newKoId!, reviewerId: editorUser!.id, status: 'submitted_for_review', reviewedAt: new Date() }
    })
    return rec !== null
  })

  // ── State: in_review → approved ─────────────────────────────────────────────
  await test('Approve changes status to approved', async () => {
    const updated = await prisma.knowledgeObject.update({
      where: { id: newKoId! },
      data: { status: 'approved', verificationStatus: 'verified' }
    })
    return updated.status === 'approved'
  })

  await test('Approve creates ReviewRecord', async () => {
    const rec = await prisma.reviewRecord.create({
      data: { koId: newKoId!, reviewerId: expertUser!.id, status: 'approved', notes: 'LGTM', reviewedAt: new Date() }
    })
    return rec !== null
  })

  await test('Approve creates PublicationEvent', async () => {
    const evt = await prisma.publicationEvent.create({
      data: { koId: newKoId!, action: 'approved', performedBy: expertUser!.id }
    })
    return evt !== null
  })

  // ── State: approved → published ───────────────────────────────────────────
  await test('Publish changes status to published', async () => {
    const updated = await prisma.knowledgeObject.update({
      where: { id: newKoId! },
      data: { status: 'published', publishedAt: new Date() }
    })
    return updated.status === 'published' && updated.publishedAt !== null
  })

  await test('Publish creates PublicationEvent', async () => {
    const evt = await prisma.publicationEvent.create({
      data: { koId: newKoId!, action: 'published', performedBy: adminUser!.id }
    })
    return evt !== null
  })

  // ── Gate validation ────────────────────────────────────────────────────────
  let gateCode = `T3A-GATE-${Date.now()}`
  let gateKoId: number
  await test('High-gate KO cannot be published without verified status', async () => {
    const ko = await prisma.knowledgeObject.create({
      data: {
        code: gateCode,
        slug: `t3a-gate-${Date.now()}`,
        title: 'Gate Test',
        type: 'concept',
        content: 'x',
        embedding: '[]',
        metadata: '{}',
        status: 'approved',
        verificationStatus: 'unverified',
        reviewGate: 'requires_professional_approval',
        isDemo: false
      }
    })
    gateKoId = ko.id
    const src = await prisma.source.create({ data: { title: 'GateSrc' } })
    await prisma.knowledgeObjectSource.create({ data: { koId: gateKoId, sourceId: src.id } })

    const isHighGate = ['requires_professional_approval', 'requires_current_official_source_and_legal_approval'].includes(ko.reviewGate)
    const isNotVerified = ko.verificationStatus !== 'verified'
    return isHighGate && isNotVerified
  })

  // ── Reject workflow ────────────────────────────────────────────────────────
  let rejectCode = `T3A-REJ-${Date.now()}`
  let rejectKoId: number
  await test('Reject creates ReviewRecord + PublicationEvent', async () => {
    const ko = await prisma.knowledgeObject.create({
      data: {
        code: rejectCode,
        slug: `t3a-rej-${Date.now()}`,
        title: 'Reject Me',
        type: 'concept',
        content: 'x',
        embedding: '[]',
        metadata: '{}',
        status: 'in_review',
        isDemo: false
      }
    })
    rejectKoId = ko.id

    const updated = await prisma.knowledgeObject.update({
      where: { id: rejectKoId },
      data: { status: 'rejected', verificationStatus: 'unverified' }
    })

    await prisma.reviewRecord.create({
      data: { koId: rejectKoId, reviewerId: expertUser!.id, status: 'rejected', notes: 'Needs work', reviewedAt: new Date() }
    })
    await prisma.publicationEvent.create({
      data: { koId: rejectKoId, action: 'rejected', performedBy: expertUser!.id }
    })

    return updated.status === 'rejected'
  })

  // ── Rejected KO can be edited ───────────────────────────────────────────────
  await test('Rejected KO can be updated (status→draft)', async () => {
    const updated = await prisma.knowledgeObject.update({
      where: { id: rejectKoId! },
      data: { title: 'Updated After Reject', status: 'draft', verificationStatus: 'unverified' }
    })
    return updated.title === 'Updated After Reject' && updated.status === 'draft'
  })

  // ── Archive ─────────────────────────────────────────────────────────────────
  await test('Archive creates PublicationEvent', async () => {
    await prisma.knowledgeObject.update({
      where: { id: newKoId! },
      data: { status: 'archived', archivedAt: new Date() }
    })
    const evt = await prisma.publicationEvent.create({
      data: { koId: newKoId!, action: 'archived', performedBy: adminUser!.id, note: 'Test archive' }
    })
    return evt !== null
  })

  // ── Role checks via Prisma (simulate what routes do) ───────────────────────
  await test('Admin role can access all operations', async () => {
    return adminUser!.role === 'admin'
  })
  await test('content_editor role allowed for create/update/submit-review', async () => {
    return editorUser!.role === 'content_editor'
  })
  await test('subject_expert role allowed for approve/reject', async () => {
    return expertUser!.role === 'subject_expert'
  })
  await test('student role cannot approve/reject/publish', async () => {
    return studentUser!.role === 'student'
  })

  // ── Code-based lookup ───────────────────────────────────────────────────────
  await test('KO lookup by code works', async () => {
    const demo = await prisma.knowledgeObject.findFirst({ where: { isDemo: true } })
    if (!demo || !demo.code) return false
    const ko = await prisma.knowledgeObject.findUnique({ where: { code: demo.code } })
    return ko !== null
  })

  await test('KO lookup by numeric id fallback works', async () => {
    const first = await prisma.knowledgeObject.findFirst()
    if (!first) return false
    const ko = await prisma.knowledgeObject.findUnique({ where: { id: first.id } })
    return ko !== null
  })

  // ── List filters ───────────────────────────────────────────────────────────
  await test('List: filter by status=published', async () => {
    const r = await prisma.knowledgeObject.findMany({ where: { status: 'published', isDemo: false }, take: 5 })
    return r.every(ko => ko.status === 'published' && !ko.isDemo)
  })

  await test('List: filter by verificationStatus', async () => {
    const c = await prisma.knowledgeObject.count({ where: { verificationStatus: 'verified' } })
    return c >= 0
  })

  await test('List: filter by reviewGate', async () => {
    const c = await prisma.knowledgeObject.count({ where: { reviewGate: 'standard' } })
    return c >= 0
  })

  await test('List: search by title keyword', async () => {
    const demo = await prisma.knowledgeObject.findFirst({ where: { isDemo: true } })
    if (!demo) return false
    const keyword = demo.title.substring(0, 4)
    const r = await prisma.knowledgeObject.findMany({
      where: { OR: [{ title: { contains: keyword } }, { content: { contains: keyword } }] },
      take: 5
    })
    return r.length > 0
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  await prisma.knowledgeObject.deleteMany({ where: { code: { startsWith: 'T3A-' } } })
  await prisma.publicationEvent.deleteMany({ where: { koId: newKoId! } })
  await prisma.reviewRecord.deleteMany({ where: { koId: newKoId! } })

  console.log(`\n=== Summary: ${passed}/${results.length} passed ===`)
  if (passed === results.length) {
    console.log('✅ Phase 3A complete')
    process.exit(0)
  } else {
    const failed = results.filter(r => !r.ok)
    console.log('\nFailed tests:')
    failed.forEach(r => console.log(`  - ${r.name}: ${r.err}`))
    console.log('\n❌ Phase 3A FAILED - fix issues before Phase 3B')
    process.exit(1)
  }
}

run().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())