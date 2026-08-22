import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { communityRoutes } from '../src/services/community'

/*
 * TOPLULUK: X benzeri serbest paylaşım (22.08.2026 ürün kararı).
 *
 * Önceden her paylaşım `pending` doğuyor, moderasyon onayı bekliyordu ve
 * yayımlandıktan sonra KALDIRILAMIYORDU. Ön moderasyonu kaldırmak, ancak
 * kaldırma yolu gerçekten çalışıyorsa sorumlu bir karar — bu dosya işte
 * onu koruyor.
 *
 * Sessizce bozulabilecek ve bozulursa pahalıya patlayacak şeyler:
 *   - Paylaşım yeniden `pending` doğarsa kimse bir şey göremez.
 *   - Kaldırma yetkisi gevşerse herkes herkesin gönderisini silebilir.
 *   - Kaldırma yetkisi sıkışırsa uygunsuz içeriğe müdahale edilemez.
 */

const prisma = new PrismaClient()
let app: FastifyInstance
let yazarToken: string
let baskasiToken: string
let yoneticiToken: string
let kimlikler: number[] = []
const isaret = `serbest-${Date.now()}`

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'serbest-paylasim-test-secret-min-32-bytes' })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  await app.register(communityRoutes, { prefix: '/community', prisma })
  await app.ready()

  const olustur = async (ad: string, rol: string) => prisma.user.create({
    data: { email: `${isaret}-${ad}@test.local`, password: 'test', name: ad, role: rol },
  })

  const yazar = await olustur('yazar', 'learner')
  const baskasi = await olustur('baskasi', 'learner')
  const yonetici = await olustur('yonetici', 'admin')
  kimlikler = [yazar.id, baskasi.id, yonetici.id]

  const imzala = (u: { id: number; email: string; role: string }) =>
    app.jwt.sign({ id: u.id, email: u.email, role: u.role })

  yazarToken = imzala(yazar)
  baskasiToken = imzala(baskasi)
  yoneticiToken = imzala(yonetici)
})

afterAll(async () => {
  await prisma.communityPost.deleteMany({ where: { authorId: { in: kimlikler } } })
  await prisma.user.deleteMany({ where: { id: { in: kimlikler } } })
  await app.close()
  await prisma.$disconnect()
})

/* Liste rotasi giris gerektiriyor (fastify.authenticate). Ilk yazista
   jetonu unutmustum; testler 401 govdesini ayristirip cokuyordu. */
function listele() {
  return app.inject({
    method: 'GET',
    url: '/community?type=user',
    headers: { authorization: `Bearer ${yazarToken}` },
  })
}

async function paylas(token: string, metin: string) {
  return app.inject({
    method: 'POST',
    url: '/community/posts',
    headers: { authorization: `Bearer ${token}` },
    payload: { metin },
  })
}

describe('paylaşım anında yayımlanır', () => {
  it('durum published ve publishedAt dolu — moderasyon beklemiyor', async () => {
    const yanit = await paylas(yazarToken, 'Kargo firmasını değiştirince teslim süresi kısaldı.')

    expect(yanit.statusCode).toBe(201)
    const govde = JSON.parse(yanit.body)
    expect(govde.post.status).toBe('published')
    expect(govde.post.publishedAt).toBeTruthy()
  })

  it('başlık gerekmiyor — kayıt başlıksız oluşuyor', async () => {
    const yanit = await paylas(yazarToken, 'Başlıksız kısa bir paylaşım denemesi.')
    const { post } = JSON.parse(yanit.body)

    const kayit = await prisma.communityPost.findUnique({ where: { id: post.id } })
    expect(kayit?.title).toBeNull()
    expect(kayit?.summary).toBe('Başlıksız kısa bir paylaşım denemesi.')
  })

  it('metin de görsel de yoksa reddedilir', async () => {
    const yanit = await paylas(yazarToken, '')
    expect(yanit.statusCode).toBe(422)
  })

  it('yayımlanan paylaşım listede görünür', async () => {
    const metin = `Listede görünme testi ${isaret}`
    await paylas(yazarToken, metin)

    const liste = await listele()
    const govde = JSON.parse(liste.body)
    expect(govde.posts.some((p: any) => p.summary === metin)).toBe(true)
  })
})

describe('kaldırma yetkisi', () => {
  async function yeniPaylasim() {
    const yanit = await paylas(yazarToken, `Kaldırma testi ${Math.random()}`)
    return JSON.parse(yanit.body).post.id as string
  }

  const kaldir = (id: string, token: string) => app.inject({
    method: 'DELETE',
    url: `/community/${id}`,
    headers: { authorization: `Bearer ${token}` },
  })

  it('YAZAR kendi paylaşımını kaldırabilir', async () => {
    const id = await yeniPaylasim()
    expect((await kaldir(id, yazarToken)).statusCode).toBe(200)

    const kayit = await prisma.communityPost.findUnique({ where: { id } })
    expect(kayit?.status).toBe('removed')
  })

  it('BAŞKASI kaldıramaz — 403 ve paylaşım yerinde kalır', async () => {
    const id = await yeniPaylasim()
    expect((await kaldir(id, baskasiToken)).statusCode).toBe(403)

    const kayit = await prisma.communityPost.findUnique({ where: { id } })
    expect(kayit?.status).toBe('published')
  })

  it('YÖNETİCİ başkasının paylaşımını kaldırabilir', async () => {
    const id = await yeniPaylasim()
    expect((await kaldir(id, yoneticiToken)).statusCode).toBe(200)

    const kayit = await prisma.communityPost.findUnique({ where: { id } })
    expect(kayit?.status).toBe('removed')
  })

  it('kaldırılan paylaşım listeden düşer', async () => {
    const metin = `Listeden düşme testi ${Math.random()}`
    const olustur = await paylas(yazarToken, metin)
    const id = JSON.parse(olustur.body).post.id

    await kaldir(id, yazarToken)

    const liste = await listele()
    expect(JSON.parse(liste.body).posts.some((p: any) => p.summary === metin)).toBe(false)
  })

  it('kaldırma GERÇEK SİLME değil — kayıt ve iz duruyor', async () => {
    const id = await yeniPaylasim()
    await kaldir(id, yoneticiToken)

    /* Şikâyet kayıtları gönderiye bağlı; satır silinseydi onlar da
       giderdi. Kimin ne zaman kaldırdığı da kayıtlı kalmalı. */
    const kayit = await prisma.communityPost.findUnique({ where: { id } })
    expect(kayit).not.toBeNull()
    expect(kayit?.moderatedAt).toBeTruthy()
    expect(kayit?.moderationReason).toContain('kaldırdı')
  })

  it('zaten kaldırılmış paylaşım 404 döner', async () => {
    const id = await yeniPaylasim()
    await kaldir(id, yazarToken)
    expect((await kaldir(id, yazarToken)).statusCode).toBe(404)
  })

  it('giriş yapmamış kullanıcı kaldıramaz', async () => {
    const id = await yeniPaylasim()
    const yanit = await app.inject({ method: 'DELETE', url: `/community/${id}` })
    expect(yanit.statusCode).toBe(401)
  })
})
