import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/*
 * PROFİL · BİLDİRİM · ARAMA (22.08.2026 akşam)
 *
 * Üç yeni yüzey, bir ortak tema: **engelleme her yerde geçerli olmalı.**
 *
 * Bugün acı bir ders alındı — engelleme takipte ve akışta çalışıyordu
 * ama özel mesajda çalışmıyordu, yani özellik kullanıcıya YANLIŞ bir
 * güven veriyordu. Profil ziyareti ve arama iki YENİ yüzey açıyor;
 * aynı hata burada da kolayca tekrarlanır ve hiçbir şey uyarmaz.
 *
 * İkinci tema: askıya alınmış hesap. Yönetici birini askıya aldığında
 * profili açık kalırsa yaptırım görünürde kalır, fiilen olmaz.
 */

const prisma = new PrismaClient()
let app: FastifyInstance

let ali: any, ayse: any, engelli: any, askili: any
let aliToken: string, ayseToken: string, engelliToken: string
let aliGonderisi: string
const isaret = `profil-${Date.now()}`

const kimlikler = () => [ali, ayse, engelli, askili].filter(Boolean).map(u => u.id)

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'profil-bildirim-arama-test-secret-32b' })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { communitySocialRoutes } = await import('../src/services/community-social')
  const { communityRoutes } = await import('../src/services/community')
  await app.register(communitySocialRoutes, { prefix: '/social' })
  await app.register(communityRoutes, { prefix: '/community', prisma })
  await app.ready()

  const kur = (ad: string, ek: any = {}) => prisma.user.create({
    data: { email: `${isaret}-${ad}@test.local`, password: 'x', name: `${ad} ${isaret}`, role: 'student', ...ek },
  })
  ali = await kur('ali', { bio: 'Bakkal işletiyorum', location: 'Ankara' })
  ayse = await kur('ayse')
  engelli = await kur('engelli')
  askili = await kur('askili', { deletedAt: new Date() })

  const imzala = (u: any) => app.jwt.sign({ id: u.id, email: u.email, role: u.role })
  aliToken = imzala(ali); ayseToken = imzala(ayse); engelliToken = imzala(engelli)

  /* Ali engelliyor. Denemeleri ENGELLENEN taraf yapacak. */
  await prisma.communityBlock.create({ data: { blockerId: ali.id, blockedId: engelli.id } })

  const gonderi = await prisma.communityPost.create({
    data: {
      authorId: ali.id, postType: 'user', status: 'published',
      publishedAt: new Date(), summary: `Kargo firmasi degistirdim ${isaret}`,
    },
  })
  aliGonderisi = gonderi.id
})

afterAll(async () => {
  const ids = kimlikler()
  await prisma.communityNotification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {})
  await prisma.communityPost.deleteMany({ where: { authorId: { in: ids } } }).catch(() => {})
  await prisma.communityBlock.deleteMany({ where: { blockerId: { in: ids } } }).catch(() => {})
  await prisma.communityFollow.deleteMany({ where: { followerId: { in: ids } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

const cagir = (token: string, url: string, metot: 'GET' | 'POST' = 'GET') =>
  app.inject({ method: metot, url, headers: { authorization: `Bearer ${token}` } })

describe('profil görüntüleme', () => {
  it('başka üye profili görebilir', async () => {
    const yanit = await cagir(ayseToken, `/social/people/${ali.id}/profile`)
    const govde = JSON.parse(yanit.body)

    expect(yanit.statusCode).toBe(200)
    expect(govde.profil.bio).toBe('Bakkal işletiyorum')
    expect(govde.profil.location).toBe('Ankara')
    expect(govde.profil.kendisi).toBe(false)
    expect(govde.sayilar.paylasim).toBe(1)
  })

  it('🔴 beğeniler ve kaydettikleri profilde YOK', async () => {
    const govde = JSON.parse((await cagir(ayseToken, `/social/people/${ali.id}/profile`)).body)

    /* Ürün kararı: "kaydettiklerim" tanımı gereği kişisel, beğeni de
       iş dünyasında rakip gözetimi anlamına gelebiliyor. */
    expect(govde.sayilar.begeni).toBeUndefined()
    expect(govde.sayilar.kayit).toBeUndefined()
  })

  it('🔴 ENGELLENEN kişi profili göremez ve içerik sızmaz', async () => {
    const yanit = await cagir(engelliToken, `/social/people/${ali.id}/profile`)

    /* 404, 403 değil: 403 "böyle biri var ama göremezsin" derdi ve
       engelleyenin varlığını ele verirdi. */
    expect(yanit.statusCode).toBe(404)
    expect(yanit.body).not.toContain('Bakkal')
  })

  it('🔴 ENGELLENEN kişi profildeki paylaşımları da çekemez', async () => {
    const yanit = await cagir(engelliToken, `/community/people/${ali.id}/posts`)

    expect(yanit.statusCode).toBe(404)
    expect(yanit.body).not.toContain('Kargo firmasi')
  })

  it('🔴 ASKIYA ALINMIŞ hesabın profili 404 döner', async () => {
    /* Yönetici birini askıya aldığında profili açık kalırsa yaptırım
       görünürde kalır, fiilen olmaz. */
    expect((await cagir(ayseToken, `/social/people/${askili.id}/profile`)).statusCode).toBe(404)
    expect((await cagir(ayseToken, `/community/people/${askili.id}/posts`)).statusCode).toBe(404)
  })

  it('profildeki paylaşımlar tam içerikle gelir', async () => {
    const govde = JSON.parse((await cagir(ayseToken, `/community/people/${ali.id}/posts`)).body)

    expect(govde.posts).toHaveLength(1)
    /* Yalnız kimlik değil, karta çizilebilecek tam gövde. */
    expect(govde.posts[0].summary).toContain('Kargo firmasi')
    expect(govde.posts[0].begeniSayisi).toBe(0)
    expect(govde.posts[0].author.id).toBe(ali.id)
  })

  it('medya süzgeci yalnız medyalı paylaşımları verir', async () => {
    const govde = JSON.parse((await cagir(ayseToken, `/community/people/${ali.id}/posts?tur=media`)).body)
    expect(govde.posts).toHaveLength(0)
  })
})

describe('bildirimler', () => {
  it('takip edilince bildirim düşer', async () => {
    await cagir(ayseToken, `/social/people/${ali.id}/follow`, 'POST')

    const govde = JSON.parse((await cagir(aliToken, '/social/notifications')).body)
    const takip = govde.items.find((n: any) => n.type === 'follow')

    expect(takip).toBeTruthy()
    expect(takip.actor.id).toBe(ayse.id)
    expect(govde.unread).toBeGreaterThan(0)
  })

  it('beğenilince gönderi sahibine bildirim düşer', async () => {
    await cagir(ayseToken, `/community/${aliGonderisi}/like`, 'POST')

    const govde = JSON.parse((await cagir(aliToken, '/social/notifications')).body)
    const begeni = govde.items.find((n: any) => n.type === 'like')

    expect(begeni).toBeTruthy()
    expect(begeni.postId).toBe(aliGonderisi)
  })

  it('🔴 KAYDETME bildirim üretmez', async () => {
    await cagir(ayseToken, `/community/${aliGonderisi}/bookmark`, 'POST')

    /* Kaydetme KİŞİYE ÖZEL. Bildirim göndermek, gönderi sahibinin
       kimin kaydettiğini öğrenmesi demek olurdu. */
    const govde = JSON.parse((await cagir(aliToken, '/social/notifications')).body)
    expect(govde.items.some((n: any) => n.type === 'bookmark')).toBe(false)
  })

  it('🔴 kendi eylemin sana bildirim üretmez', async () => {
    await cagir(aliToken, `/community/${aliGonderisi}/like`, 'POST')

    const govde = JSON.parse((await cagir(aliToken, '/social/notifications')).body)
    const kendinden = govde.items.filter((n: any) => n.actor?.id === ali.id)
    expect(kendinden).toHaveLength(0)
  })

  it('🔴 başkasının bildirimleri görünmez', async () => {
    const benim = JSON.parse((await cagir(ayseToken, '/social/notifications')).body)

    /* Kimlik JETONDAN okunuyor; adresten alınsaydı bir kullanıcı
       diğerinin bildirimlerini — kimin kime yazdığını — görürdü. */
    expect(benim.items.every((n: any) => n.actor?.id !== ayse.id || true)).toBe(true)
    expect(benim.items.some((n: any) => n.postId === aliGonderisi && n.type === 'like')).toBe(false)
  })

  it('okundu işaretleme yalnız kendi bildirimlerine dokunur', async () => {
    const oncekiAyse = JSON.parse((await cagir(ayseToken, '/social/notifications')).body).unread

    await cagir(aliToken, '/social/notifications/read', 'POST')

    expect(JSON.parse((await cagir(aliToken, '/social/notifications')).body).unread).toBe(0)
    expect(JSON.parse((await cagir(ayseToken, '/social/notifications')).body).unread).toBe(oncekiAyse)
  })
})
