import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { communitySocialRoutes } from '../src/services/community-social'

const prisma = new PrismaClient()
let app: FastifyInstance
let ali: any, ayse: any, admin: any
let aliToken: string, ayseToken: string, adminToken: string
const mark = `social-${Date.now()}`

beforeAll(async () => {
  app = Fastify(); await app.register(jwt, { secret: 'community-social-test-secret-32-byte' })
  app.decorate('authenticate', async (request: any, reply: any) => { try { await request.jwtVerify() } catch { return reply.status(401).send() } })
  await app.register(communitySocialRoutes, { prefix: '/community/social' }); await app.ready()
  ali = await prisma.user.create({ data: { email: `${mark}-ali@test.local`, password: 'x', name: 'Ali Test', role: 'student' } })
  ayse = await prisma.user.create({ data: { email: `${mark}-ayse@test.local`, password: 'x', name: 'Ayşe Test', role: 'student' } })
  admin = await prisma.user.create({ data: { email: `${mark}-admin@test.local`, password: 'x', name: 'Admin Test', role: 'admin' } })
  const sign = (u: any) => app.jwt.sign({ id: u.id, email: u.email, role: u.role })
  aliToken = sign(ali); ayseToken = sign(ayse); adminToken = sign(admin)
})

afterAll(async () => {
  await prisma.communityAd.deleteMany({ where: { createdById: admin.id } })
  await prisma.communityThread.deleteMany({ where: { createdById: ali.id } })
  await prisma.communityBlock.deleteMany({ where: { blockerId: ali.id } })
  await prisma.communityFollow.deleteMany({ where: { followerId: ali.id } })
  await prisma.user.deleteMany({ where: { id: { in: [ali.id, ayse.id, admin.id] } } })
  await app.close(); await prisma.$disconnect()
})

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

describe('topluluk sosyal katmanı', () => {
  it('takip ve engellemeyi kalıcı yönetir', async () => {
    expect((await app.inject({ method: 'POST', url: `/community/social/people/${ayse.id}/follow`, headers: auth(aliToken) })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: `/community/social/people/${ayse.id}/block`, headers: auth(aliToken) })).statusCode).toBe(200)
    const state = await app.inject({ method: 'GET', url: '/community/social/people', headers: auth(aliToken) })
    expect(state.json().blockedIds).toContain(ayse.id); expect(state.json().followingIds).not.toContain(ayse.id)
  })

  it('grup oluşturur ve yalnız üyeden mesaj kabul eder', async () => {
    /*
     * Bir önceki test Ali'nin Ayşe'yi ENGELLEMESİYLE bitiyor ve engeli
     * kaldırmıyor. Engelleme artık özel mesajda da uygulandığı için
     * (22.08.2026) bu testin sohbet açması 403 alıyordu.
     *
     * Testin niyeti grup oluşturmayı ve üyelik kontrolünü ölçmek;
     * engel ondan artakalan gizli bir bağımlılıktı. Temizleniyor.
     */
    await prisma.communityBlock.deleteMany({ where: { blockerId: ali.id, blockedId: ayse.id } })

    const made = await app.inject({ method: 'POST', url: '/community/social/threads', headers: auth(aliToken), payload: { name: 'Test grup', memberIds: [ayse.id] } })
    expect(made.statusCode).toBe(201); const threadId = made.json().thread.id
    const sent = await app.inject({ method: 'POST', url: `/community/social/threads/${threadId}/messages`, headers: auth(ayseToken), payload: { body: 'Merhaba' } })
    expect(sent.statusCode).toBe(201)
    const list = await app.inject({ method: 'GET', url: `/community/social/threads/${threadId}/messages`, headers: auth(aliToken) })
    expect(list.json().messages[0].body).toBe('Merhaba')
  })

  it('reklam oluşturmayı yalnız yöneticiye açar', async () => {
    const payload = { title: 'Yerel kampanya', body: 'Test tanıtımı' }
    expect((await app.inject({ method: 'POST', url: '/community/social/ads', headers: auth(aliToken), payload })).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: '/community/social/ads', headers: auth(adminToken), payload })).statusCode).toBe(201)
  })
})

describe('engelleme ÖZEL MESAJDA da geçerli', () => {
  /*
   * 🔴 BU DAVRANIŞ EKSİKTİ (22.08.2026 denetiminde bulundu).
   *
   * Engelleme takipte ve akışta uygulanıyordu ama özel mesajda
   * uygulanmıyordu: engellediğiniz kişi size sohbet açıp yazabiliyordu.
   * Engellemenin asıl beklenen işlevi tam olarak budur; olmayınca
   * özellik kullanıcıya YANLIŞ bir güven veriyordu.
   *
   * Engel İKİ YÖNLÜ sorulmalı: "ben onu engelledim" ve "o beni
   * engelledi" farklı kayıtlar ama sonucu aynı olmalı. Tek yönü
   * kontrol etmek, engellenen kişinin engelleyene yazmasına izin
   * verirdi.
   */
  let engelli: any
  let engelliToken: string

  beforeAll(async () => {
    engelli = await prisma.user.create({
      data: { email: `${mark}-engelli@test.local`, password: 'x', name: 'Engelli Test', role: 'student' },
    })
    engelliToken = app.jwt.sign({ id: engelli.id, email: engelli.email, role: engelli.role })
    /* Ali engelliyor; aşağıdaki denemeleri ENGELLENEN taraf yapıyor. */
    await prisma.communityBlock.create({ data: { blockerId: ali.id, blockedId: engelli.id } })
  })

  afterAll(async () => {
    await prisma.communityBlock.deleteMany({ where: { blockedId: engelli.id } })
    await prisma.communityThread.deleteMany({ where: { createdById: engelli.id } })
    await prisma.user.deleteMany({ where: { id: engelli.id } }).catch(() => {})
  })

  it('engellenen kişi engelleyene SOHBET AÇAMAZ', async () => {
    const yanit = await app.inject({
      method: 'POST', url: '/community/social/threads',
      headers: auth(engelliToken), payload: { memberIds: [ali.id] },
    })

    expect(yanit.statusCode).toBe(403)
    const sayi = await prisma.communityThread.count({ where: { createdById: engelli.id } })
    expect(sayi).toBe(0)
  })

  it('engelleyen de engellediğine sohbet açamaz', async () => {
    const yanit = await app.inject({
      method: 'POST', url: '/community/social/threads',
      headers: auth(aliToken), payload: { memberIds: [engelli.id] },
    })
    expect(yanit.statusCode).toBe(403)
  })

  it('🔴 VAR OLAN sohbette engel konunca mesaj gönderilemez', async () => {
    /*
     * Engel sohbet AÇILDIKTAN SONRA da konabilir. Üyelik kontrolü tek
     * başına yetmiyor; var olan sohbette engellenen kişinin yazmaya
     * devam edebilmesi engellemeyi baştan anlamsız kılardı.
     */
    const acilis = await app.inject({
      method: 'POST', url: '/community/social/threads',
      headers: auth(ayseToken), payload: { memberIds: [engelli.id] },
    })
    expect(acilis.statusCode).toBe(201)
    const threadId = acilis.json().thread.id

    /* Önce yazabildiği doğrulanıyor — testin sonraki adımı anlamlı olsun. */
    expect((await app.inject({
      method: 'POST', url: `/community/social/threads/${threadId}/messages`,
      headers: auth(ayseToken), payload: { body: 'merhaba' },
    })).statusCode).toBe(201)

    await prisma.communityBlock.create({ data: { blockerId: ayse.id, blockedId: engelli.id } })

    const engelSonrasi = await app.inject({
      method: 'POST', url: `/community/social/threads/${threadId}/messages`,
      headers: auth(engelliToken), payload: { body: 'yine de yazıyorum' },
    })

    expect(engelSonrasi.statusCode).toBe(403)
    const mesajSayisi = await prisma.communityMessage.count({ where: { threadId } })
    expect(mesajSayisi).toBe(1)

    await prisma.communityMessage.deleteMany({ where: { threadId } })
    await prisma.communityThread.deleteMany({ where: { id: threadId } })
    await prisma.communityBlock.deleteMany({ where: { blockerId: ayse.id } })
  })
})
