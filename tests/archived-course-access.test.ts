import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/**
 * Arşivlenmiş kurs erişim semantiği (Phase B ön koşulu).
 *
 *   ACTIVE   published=true,  archivedAt=null  → katalog + arama + detay + ders
 *   DRAFT    published=false, archivedAt=null  → hiçbiri
 *   ARCHIVED published=false, archivedAt!=null → katalog HAYIR, arama HAYIR,
 *                                                detay EVET, ders EVET
 *
 * Phase B legacy kursları ARCHIVED yapacak. Bu testler olmadan arşivleme,
 * kayıtlı kullanıcının ilerleme geçmişini 404'e çeviriyordu.
 */
const prisma = new PrismaClient()
let app: FastifyInstance
let userId: number
let token: string
let activeCourse: number
let draftCourse: number
let archivedCourse: number
let canonicalCourse: number
let activeLesson: number
let draftLesson: number
let archivedLesson: number
let canonicalLesson: number
let koId: number
const stamp = Date.now()

function get(url: string) {
  return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { courseRoutes } = await import('../src/services/courses')
  const { knowledgeV2Routes } = await import('../src/services/knowledge-v2')
  await app.register(courseRoutes, { prefix: '/courses' })
  await app.register(knowledgeV2Routes)
  await app.ready()

  const user = await prisma.user.create({
    data: { email: `archived-access-${stamp}@test.local`, password: 'hash', name: 'Arşiv Testi' }
  })
  userId = user.id
  token = app.jwt.sign({ id: userId, email: user.email, role: 'learner' })

  /* Derslerin KO şartı var (status published + isDemo false). */
  const ko = await prisma.knowledgeObject.create({
    data: {
      code: `ARCHTEST-${stamp}`, type: 'concept', title: 'Arşiv testi KO',
      content: 'içerik', embedding: '[]', metadata: '{}',
      status: 'published', isDemo: false
    }
  })
  koId = ko.id

  const mk = async (title: string, published: boolean, archivedAt: Date | null) =>
    prisma.course.create({
      data: { title, description: 'test', category: 'test', published, archivedAt }
    })

  const [a, d, ar, c] = await Promise.all([
    mk(`ZZArsivTest AKTIF ${stamp}`, true, null),
    mk(`ZZArsivTest TASLAK ${stamp}`, false, null),
    mk(`ZZArsivTest ARSIVLI ${stamp}`, false, new Date()),
    mk(`ZZArsivTest CANONICAL ${stamp}`, true, null)
  ])
  activeCourse = a.id; draftCourse = d.id; archivedCourse = ar.id; canonicalCourse = c.id
  await prisma.course.update({ where: { id: canonicalCourse }, data: { sourceType: 'canonical-v1' } })

  const lessons = await Promise.all([activeCourse, draftCourse, archivedCourse, canonicalCourse].map(cid =>
    prisma.lesson.create({
      data: { courseId: cid, title: 'Ders 1', content: 'içerik', order: 1, knowledgeObjectId: koId }
    })
  ))
  activeLesson = lessons[0].id; draftLesson = lessons[1].id
  archivedLesson = lessons[2].id; canonicalLesson = lessons[3].id

  /* Ders ucu enrollment şartı arıyor — dördüne de kayıt. */
  await prisma.enrollment.createMany({
    data: [activeCourse, draftCourse, archivedCourse, canonicalCourse].map(courseId => ({
      userId, courseId, status: 'in_progress', progress: 40
    }))
  })
})

afterAll(async () => {
  const ids = [activeCourse, draftCourse, archivedCourse, canonicalCourse]
  await prisma.lessonProgress.deleteMany({ where: { userId } })
  await prisma.enrollment.deleteMany({ where: { userId } })
  await prisma.lesson.deleteMany({ where: { courseId: { in: ids } } })
  await prisma.course.deleteMany({ where: { id: { in: ids } } })
  await prisma.knowledgeObject.delete({ where: { id: koId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
  await app.close()
})

describe('A · ACTIVE kurs', () => {
  it('detay 200 döner', async () => {
    const res = await get(`/courses/${activeCourse}`)
    expect(res.statusCode).toBe(200)
    expect(res.json().course.archived).toBe(false)
  })

  it('ders 200 döner', async () => {
    expect((await get(`/courses/${activeCourse}/lessons/${activeLesson}`)).statusCode).toBe(200)
  })
})

describe('B · DRAFT kurs (yayınsız + arşivsiz) gizli kalmalı', () => {
  it('detay 404 döner', async () => {
    expect((await get(`/courses/${draftCourse}`)).statusCode).toBe(404)
  })

  it('ders 404 döner — taslak içerik public olmamalı', async () => {
    expect((await get(`/courses/${draftCourse}/lessons/${draftLesson}`)).statusCode).toBe(404)
  })
})

describe('C · ARCHIVED kurs doğrudan adresten okunabilir', () => {
  it('kurs gerçekten ARCHIVED durumda', async () => {
    const row = await prisma.course.findUniqueOrThrow({ where: { id: archivedCourse } })
    expect(row.published).toBe(false)
    expect(row.archivedAt).not.toBeNull()
  })

  it('detay 200 döner (404 DEĞİL)', async () => {
    const res = await get(`/courses/${archivedCourse}`)
    expect(res.statusCode).toBe(200)
  })

  it('yanıt archived bayrağını taşır', async () => {
    const body = (await get(`/courses/${archivedCourse}`)).json()
    expect(body.course.archived).toBe(true)
    expect(body.course.archivedAt).not.toBeNull()
  })

  it('enrollment ve ilerleme yanıtta korunur', async () => {
    const body = (await get(`/courses/${archivedCourse}`)).json()
    expect(body.course.enrollment).not.toBeNull()
    expect(body.course.enrollment.progress).toBe(40)
  })

  it('ders 200 döner', async () => {
    expect((await get(`/courses/${archivedCourse}/lessons/${archivedLesson}`)).statusCode).toBe(200)
  })
})

describe('D · ARCHIVED kurs katalogda görünmez', () => {
  it('kurs listesinde yok, ACTIVE var', async () => {
    const res = await get('/courses?pageSize=200')
    expect(res.statusCode).toBe(200)
    const ids = res.json().courses.map((c: any) => c.id)
    expect(ids).not.toContain(archivedCourse)
    expect(ids).not.toContain(draftCourse)
    expect(ids).toContain(activeCourse)
  })
})

describe('E · ARCHIVED kurs global aramada görünmez', () => {
  it('arama sonucunda yok, ACTIVE var', async () => {
    const res = await get(`/api/v2/search?q=ZZArsivTest`)
    expect(res.statusCode).toBe(200)
    const ids = (res.json().courses ?? []).map((c: any) => c.id)
    expect(ids).not.toContain(archivedCourse)
    expect(ids).not.toContain(draftCourse)
    expect(ids).toContain(activeCourse)
  })
})

describe('F · kullanıcı geçmişi değişmez', () => {
  it('okuma uçları enrollment satırlarını bozmaz', async () => {
    const before = await prisma.enrollment.findMany({
      where: { userId }, orderBy: { id: 'asc' },
      select: { id: true, courseId: true, progress: true, status: true }
    })
    await get(`/courses/${archivedCourse}`)
    await get(`/courses/${archivedCourse}/lessons/${archivedLesson}`)
    const after = await prisma.enrollment.findMany({
      where: { userId }, orderBy: { id: 'asc' },
      select: { id: true, courseId: true, progress: true, status: true }
    })
    expect(after).toEqual(before)
  })
})

describe('G · canonical aktif kurs regresyonu', () => {
  it('detay 200 ve archived=false', async () => {
    const res = await get(`/courses/${canonicalCourse}`)
    expect(res.statusCode).toBe(200)
    expect(res.json().course.archived).toBe(false)
    expect(res.json().course.sourceType).toBe('canonical-v1')
  })

  it('ders 200 döner', async () => {
    expect((await get(`/courses/${canonicalCourse}/lessons/${canonicalLesson}`)).statusCode).toBe(200)
  })

  it('katalogda görünür', async () => {
    const ids = (await get('/courses?pageSize=200')).json().courses.map((c: any) => c.id)
    expect(ids).toContain(canonicalCourse)
  })
})
