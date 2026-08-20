import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/**
 * Arşivlenmiş kursların "kayıtlı olduğun kurslar" listesinden düşmesi.
 *
 * REGRESYON KAYNAĞI: Phase B'de 288 eski kurs arşivlendi ama
 * `GET /enrollments/my` kursun durumuna hiç bakmıyordu. Kullanıcılar
 * arşivdeki kursları listede görmeye ve açmaya devam etti (69 kaydın 49'u).
 *
 * Kritik ikinci iddia: kayıt SİLİNMİYOR. İlerlemeyi yok etmek geri
 * alınamaz; kurs arşivden çıkarsa kayıt geri gelmeli.
 */

const prisma = new PrismaClient()
const marker = `enr-${Date.now()}`
let app: FastifyInstance
let userId: number
let token: string
let aktifKursId: number
let arsivKursId: number

beforeAll(async () => {
  process.env.JWT_SECRET = 'enrollment-filter-secret-min-32-bytes!'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()

  const user = await prisma.user.create({
    data: { email: `${marker}@test.local`, password: await bcrypt.hash('GucluParola!42', 10), name: 'Kayit Test', role: 'learner' }
  })
  userId = user.id
  token = app.jwt.sign({ id: user.id, email: user.email, role: user.role, tv: user.tokenVersion })

  const aktif = await prisma.course.create({
    data: { title: `${marker} Aktif Kurs`, slug: `${marker}-aktif`, description: 'test', category: 'Test', level: 'beginner', published: true }
  })
  aktifKursId = aktif.id

  const arsiv = await prisma.course.create({
    /* Arşiv semantiği: published:false + archivedAt dolu. */
    data: { title: `${marker} Arşiv Kurs`, slug: `${marker}-arsiv`, description: 'test', category: 'Test', level: 'beginner', published: false, archivedAt: new Date() }
  })
  arsivKursId = arsiv.id

  await prisma.enrollment.createMany({
    data: [
      { userId, courseId: aktifKursId, status: 'in_progress', progress: 40 },
      { userId, courseId: arsivKursId, status: 'in_progress', progress: 70 }
    ]
  })
})

afterAll(async () => {
  await prisma.enrollment.deleteMany({ where: { userId } })
  await prisma.course.deleteMany({ where: { id: { in: [aktifKursId, arsivKursId] } } })
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
})

async function kayitlariGetir(sorgu = '') {
  const r = await app.inject({
    method: 'GET', url: `/enrollments/my${sorgu}`,
    headers: { authorization: `Bearer ${token}` }
  })
  expect(r.statusCode).toBe(200)
  return r.json().enrollments as Array<{ courseId: number; courseTitle: string }>
}

describe('arşivlenmiş kurslar listelenmez', () => {
  it('yalnız aktif kurs döner', async () => {
    const liste = await kayitlariGetir()
    const idler = liste.map(e => e.courseId)
    expect(idler).toContain(aktifKursId)
    /* ASIL İDDİA. */
    expect(idler).not.toContain(arsivKursId)
  })

  it('kayıt veritabanında DURUYOR — silinmedi', async () => {
    const kayit = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: arsivKursId } }
    })
    expect(kayit).not.toBeNull()
    /* İlerleme de korunmuş olmalı. */
    expect(kayit!.progress).toBe(70)
  })

  it('includeArchived=true ile teşhis için görülebilir', async () => {
    const liste = await kayitlariGetir('?includeArchived=true')
    expect(liste.map(e => e.courseId)).toContain(arsivKursId)
  })

  it('kurs arşivden çıkınca kayıt kendiliğinden geri gelir', async () => {
    await prisma.course.update({
      where: { id: arsivKursId },
      data: { published: true, archivedAt: null }
    })
    const liste = await kayitlariGetir()
    expect(liste.map(e => e.courseId)).toContain(arsivKursId)

    /* Sonraki testler etkilenmesin diye geri arşivle. */
    await prisma.course.update({
      where: { id: arsivKursId },
      data: { published: false, archivedAt: new Date() }
    })
  })
})
