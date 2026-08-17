import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/**
 * POST /learning/lesson-view — "kaldığın yer" işareti.
 *
 * Bu uç olmadan Course Player kursa dönen kullanıcıyı hep ilk derse
 * atıyordu ve Ana Sayfa'daki "devam et" kartı hep aynı kursta takılı
 * kalıyordu. Buradaki testler o davranışın geri gelmesini engelliyor.
 */
const prisma = new PrismaClient()
let app: FastifyInstance
let userId: number
let token: string
let courseId: number
let otherCourseId: number
let lessonA: number
let lessonB: number
let unenrolledLesson: number

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { learningRoutes } = await import('../src/services/learning')
  await app.register(learningRoutes)
  await app.ready()

  const stamp = Date.now()
  const user = await prisma.user.create({
    data: { email: `lesson-view-${stamp}@test.local`, password: 'hash', name: 'View Test' }
  })
  userId = user.id
  token = app.jwt.sign({ id: userId, email: user.email })

  const course = await prisma.course.create({
    data: { title: `Lesson View Test ${stamp}`, description: 'T', category: 'test', published: true }
  })
  courseId = course.id
  const other = await prisma.course.create({
    data: { title: `Unenrolled ${stamp}`, description: 'T', category: 'test', published: true }
  })
  otherCourseId = other.id

  const [a, b, u] = await Promise.all([
    prisma.lesson.create({ data: { courseId, title: '1. Ders', content: 'C', order: 1 } }),
    prisma.lesson.create({ data: { courseId, title: '2. Ders', content: 'C', order: 2 } }),
    prisma.lesson.create({ data: { courseId: otherCourseId, title: 'Yabancı', content: 'C', order: 1 } })
  ])
  lessonA = a.id
  lessonB = b.id
  unenrolledLesson = u.id

  await prisma.enrollment.create({ data: { userId, courseId, status: 'not_started' } })
})

afterAll(async () => {
  await prisma.lessonProgress.deleteMany({ where: { userId } })
  await prisma.enrollment.deleteMany({ where: { userId } })
  await prisma.lesson.deleteMany({ where: { courseId: { in: [courseId, otherCourseId] } } })
  await prisma.course.deleteMany({ where: { id: { in: [courseId, otherCourseId] } } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
  await app.close()
})

function view(lessonId: unknown, withToken = true) {
  return app.inject({
    method: 'POST',
    url: '/learning/lesson-view',
    headers: withToken ? { authorization: `Bearer ${token}` } : {},
    payload: { lessonId }
  })
}

describe('POST /learning/lesson-view', () => {
  it('lastViewedAt yazar', async () => {
    const res = await view(lessonA)
    expect(res.statusCode).toBe(200)
    const row = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lessonA } }
    })
    expect(row?.lastViewedAt).toBeInstanceOf(Date)
  })

  it('İLERLEME YÜZDESİNİ ŞİŞİRMEZ — ders açmak okumak değildir', async () => {
    const row = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lessonA } }
    })
    expect(row?.readingPercent).toBe(0)
    expect(row?.overallPercent).toBe(0)
    expect(row?.quizPercent).toBe(0)
  })

  it('kaydı not_started iken in_progress yapar', async () => {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    })
    expect(enrollment?.status).toBe('in_progress')
  })

  it('ikinci çağrı lastViewedAt değerini ileri taşır', async () => {
    const before = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lessonA } }
    })
    await new Promise(resolve => setTimeout(resolve, 15))
    await view(lessonA)
    const after = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lessonA } }
    })
    expect(after!.lastViewedAt!.getTime()).toBeGreaterThan(before!.lastViewedAt!.getTime())
  })

  it('farklı dersler ayrı ayrı işaretlenir; en yenisi sonradan görüntülenen olur', async () => {
    await view(lessonB)
    const rows = await prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: [lessonA, lessonB] } },
      orderBy: { lastViewedAt: 'desc' }
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].lessonId).toBe(lessonB)
  })

  it('tamamlanmış dersin durumunu geri almaz', async () => {
    await prisma.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId: lessonB } },
      data: { status: 'completed', readingPercent: 100, overallPercent: 100 }
    })
    await view(lessonB)
    const row = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lessonB } }
    })
    expect(row?.status).toBe('completed')
    expect(row?.overallPercent).toBe(100)
  })

  it('kayıtlı olunmayan kursun dersinde 403 döner', async () => {
    const res = await view(unenrolledLesson)
    expect(res.statusCode).toBe(403)
  })

  it('olmayan derste 404 döner', async () => {
    const res = await view(2147483000)
    expect(res.statusCode).toBe(404)
  })

  it('geçersiz gövdede 422 döner', async () => {
    expect((await view('abc')).statusCode).toBe(422)
    expect((await view(-1)).statusCode).toBe(422)
  })

  it('token yoksa 401 döner', async () => {
    const res = await view(lessonA, false)
    expect(res.statusCode).toBe(401)
  })
})
