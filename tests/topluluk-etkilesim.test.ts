import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { communityRoutes } from '../src/services/community'

/*
 * TOPLULUK ETKİLEŞİM KATMANI (22.08.2026)
 *
 * Yanıt ve alıntı ayrı bir model DEĞİL: X'te bir yanıt kendisi de bir
 * gönderidir. `CommunityPost`a iki kendine-referans eklendi. Bu karar
 * medya, şikâyet, kaldırma ve yetki mantığını yeniden yazmaktan
 * kurtarıyor — ama bir riski var ve bu dosyanın asıl işi o riski
 * tutmak:
 *
 *   🔴 `parentId` eklendiği an yanıtlar ANA AKIŞA karışır. Besleme
 *      sorgusundaki `parentId: null` koşulu düşerse akış, bağlamından
 *      kopmuş yanıt parçalarıyla dolar ve kimse fark etmez — çünkü
 *      sayfa çalışmaya devam eder, sadece anlamsızlaşır.
 *
 * Diğer korunanlar:
 *   - Kaldırılmış bir gönderiye yanıt/alıntı eklemek, kaldırma kararını
 *     fiilen geri alırdı.
 *   - Alıntı içinde kaldırılmış içerik yaşamaya devam ederse kaldırma
 *     yetkisi alıntıyla atlatılır.
 *   - Beğeni sayımı `@@unique`e dayanıyor; çift kayıt sayıyı şişirir.
 */

const prisma = new PrismaClient()
let app: FastifyInstance
let aliToken: string
let ayseToken: string
let aliId: number
let ayseId: number
let kimlikler: number[] = []
const isaret = `etkilesim-${Date.now()}`

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'topluluk-etkilesim-test-secret-32-bayt' })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  await app.register(communityRoutes, { prefix: '/community', prisma })
  await app.ready()

  const olustur = (ad: string) => prisma.user.create({
    data: { email: `${isaret}-${ad}@test.local`, password: 'test', name: ad, role: 'learner' },
  })
  const ali = await olustur('ali')
  const ayse = await olustur('ayse')
  aliId = ali.id
  ayseId = ayse.id
  kimlikler = [ali.id, ayse.id]

  const imzala = (u: { id: number; email: string; role: string }) =>
    app.jwt.sign({ id: u.id, email: u.email, role: u.role })
  aliToken = imzala(ali)
  ayseToken = imzala(ayse)
})

afterAll(async () => {
  await prisma.communityPost.deleteMany({ where: { authorId: { in: kimlikler } } })
  await prisma.user.deleteMany({ where: { id: { in: kimlikler } } })
  await app.close()
  await prisma.$disconnect()
})

async function paylas(token: string, govde: Record<string, unknown>) {
  const yanit = await app.inject({
    method: 'POST',
    url: '/community/posts',
    headers: { authorization: `Bearer ${token}` },
    payload: govde,
  })
  return yanit
}

async function yeniGonderi(token: string, metin: string) {
  const yanit = await paylas(token, { metin })
  if (yanit.statusCode !== 201) throw new Error(`gönderi kurulamadı: ${yanit.body}`)
  return JSON.parse(yanit.body).post.id as string
}

const akis = async (token: string) => {
  const yanit = await app.inject({
    method: 'GET',
    url: '/community?type=user',
    headers: { authorization: `Bearer ${token}` },
  })
  return JSON.parse(yanit.body).posts as any[]
}

const gonderiyiAc = async (token: string, postId: string) => {
  const yanit = await app.inject({
    method: 'GET',
    url: `/community/post/${postId}`,
    headers: { authorization: `Bearer ${token}` },
  })
  return { kod: yanit.statusCode, govde: yanit.body ? JSON.parse(yanit.body) : null }
}

describe('yanıtlar ana akışı kirletmez', () => {
  it('🔴 yanıt akışta GÖRÜNMEZ, yalnız üst gönderinin altında durur', async () => {
    const ustId = await yeniGonderi(aliToken, `Üst gönderi ${isaret}`)
    const yanitMetni = `Buna verilen yanıt ${isaret}`

    const yanit = await paylas(ayseToken, { metin: yanitMetni, parentId: ustId })
    expect(yanit.statusCode).toBe(201)
    expect(JSON.parse(yanit.body).post.parentId).toBe(ustId)

    /* Akışta OLMAMALI. */
    const liste = await akis(aliToken)
    expect(liste.some(p => p.summary === yanitMetni)).toBe(false)
    /* Üst gönderi ise yerinde durmalı. */
    expect(liste.some(p => p.id === ustId)).toBe(true)

    /* Ama gönderinin kendi sayfasında görünmeli. */
    const { govde } = await gonderiyiAc(aliToken, ustId)
    expect(govde.post.replies.map((r: any) => r.summary)).toContain(yanitMetni)
    expect(govde.post.yanitSayisi).toBe(1)
  })

  it('yanıtın yanıtı yazılabilir ve doğru dala oturur', async () => {
    const kokId = await yeniGonderi(aliToken, `Kök ${isaret}-ic`)
    const birinci = JSON.parse((await paylas(ayseToken, { metin: 'birinci', parentId: kokId })).body).post.id
    await paylas(aliToken, { metin: 'ikinci', parentId: birinci })

    const { govde } = await gonderiyiAc(aliToken, kokId)
    expect(govde.post.replies).toHaveLength(1)
    expect(govde.post.replies[0].summary).toBe('birinci')
    expect(govde.post.replies[0].replies[0].summary).toBe('ikinci')
  })

  it('yanıt sayfası üst gönderiyi de verir', async () => {
    const ustId = await yeniGonderi(aliToken, `Bağlam ${isaret}`)
    const yanitId = JSON.parse((await paylas(ayseToken, { metin: 'bağlamlı', parentId: ustId })).body).post.id

    const { govde } = await gonderiyiAc(ayseToken, yanitId)
    expect(govde.parent.id).toBe(ustId)
  })

  it('var olmayan gönderiye yanıt 404 döner — 500 değil', async () => {
    const yanit = await paylas(aliToken, {
      metin: 'boşluğa yanıt',
      parentId: '11111111-1111-4111-8111-111111111111',
    })
    expect(yanit.statusCode).toBe(404)
  })

  it('KALDIRILMIŞ gönderiye yanıt yazılamaz', async () => {
    const id = await yeniGonderi(aliToken, `Kaldırılacak ${isaret}`)
    await app.inject({
      method: 'DELETE',
      url: `/community/${id}`,
      headers: { authorization: `Bearer ${aliToken}` },
    })

    /* Yazılabilseydi kaldırma kararı fiilen geri alınırdı: kaldırılmış
       içeriğin altında konuşma sürerdi. */
    expect((await paylas(ayseToken, { metin: 'yine de', parentId: id })).statusCode).toBe(404)
  })

  it('üst gönderi kaldırılınca yanıtlar SİLİNMEZ', async () => {
    /*
     * Ürün kararı: yanıt başkasının yazısıdır. Birinin kendi gönderisini
     * kaldırması, başkalarının yazdıklarını sessizce silmemeli.
     * Uygunsuz bir yanıt varsa yönetici onu tek tek kaldırır.
     */
    const ustId = await yeniGonderi(aliToken, `Kalacak yanıtlar ${isaret}`)
    const yanitId = JSON.parse((await paylas(ayseToken, { metin: 'ayakta kalmalı', parentId: ustId })).body).post.id

    await app.inject({
      method: 'DELETE',
      url: `/community/${ustId}`,
      headers: { authorization: `Bearer ${aliToken}` },
    })

    const kayit = await prisma.communityPost.findUnique({ where: { id: yanitId } })
    expect(kayit).not.toBeNull()
    expect(kayit?.status).toBe('published')
  })
})

describe('alıntı', () => {
  it('alıntılanan gönderi içeriğiyle birlikte gelir', async () => {
    const kaynakId = await yeniGonderi(aliToken, `Alıntılanacak ${isaret}`)

    const yanit = await paylas(ayseToken, { metin: 'buna katılıyorum', quotedPostId: kaynakId })
    expect(yanit.statusCode).toBe(201)

    const liste = await akis(ayseToken)
    const alinti = liste.find(p => p.id === JSON.parse(yanit.body).post.id)
    expect(alinti.quotedPost.id).toBe(kaynakId)
    expect(alinti.quotedPost.summary).toContain('Alıntılanacak')
    expect(alinti.quotedPost.kaldirildi).toBe(false)
  })

  it('metinsiz alıntı meşrudur — "şuna bakın" bir paylaşımdır', async () => {
    const kaynakId = await yeniGonderi(aliToken, `Sessiz alıntı kaynağı ${isaret}`)
    expect((await paylas(ayseToken, { quotedPostId: kaynakId })).statusCode).toBe(201)
  })

  it('🔴 kaynak kaldırılınca alıntı İÇERİĞİ göstermez', async () => {
    const kaynakId = await yeniGonderi(aliToken, `Gizlenmesi gereken metin ${isaret}`)
    const alintiId = JSON.parse((await paylas(ayseToken, { metin: 'alıntı', quotedPostId: kaynakId })).body).post.id

    await app.inject({
      method: 'DELETE',
      url: `/community/${kaynakId}`,
      headers: { authorization: `Bearer ${aliToken}` },
    })

    /* Gösterseydi kaldırma yetkisi alıntıyla atlatılabilirdi: içerik
       kaldırılmış görünürken alıntının içinde yaşamaya devam ederdi. */
    const liste = await akis(ayseToken)
    const alinti = liste.find(p => p.id === alintiId)
    expect(alinti.quotedPost.kaldirildi).toBe(true)
    expect(alinti.quotedPost.summary).toBeNull()
    expect(JSON.stringify(alinti)).not.toContain('Gizlenmesi gereken metin')
    /* Alıntının KENDİSİ ayakta kalmalı — başkasının yazısı. */
    expect(alinti.summary).toBe('alıntı')
  })

  it('kaldırılmış gönderi alıntılanamaz', async () => {
    const id = await yeniGonderi(aliToken, `Alıntılanamaz ${isaret}`)
    await app.inject({
      method: 'DELETE',
      url: `/community/${id}`,
      headers: { authorization: `Bearer ${aliToken}` },
    })
    expect((await paylas(ayseToken, { metin: 'x', quotedPostId: id })).statusCode).toBe(404)
  })
})

describe.each([
  ['like', 'begeniSayisi', 'begendim'],
  ['bookmark', null, 'kaydettim'],
] as const)('%s', (yol, sayiAlani, bayrak) => {
  const bas = (token: string, postId: string, metot: 'POST' | 'DELETE') =>
    app.inject({ method: metot, url: `/community/${postId}/${yol}`, headers: { authorization: `Bearer ${token}` } })

  it('bir kez uygulanır — çift basmak sayıyı şişirmez', async () => {
    const id = await yeniGonderi(aliToken, `${yol} testi ${isaret}-${Math.random()}`)

    const birinci = await bas(ayseToken, id, 'POST')
    const ikinci = await bas(ayseToken, id, 'POST')

    expect(birinci.statusCode).toBe(200)
    /* Çift tıklama 500 dönmemeli; `upsert` bunun için. */
    expect(ikinci.statusCode).toBe(200)
    expect(JSON.parse(ikinci.body).sayi).toBe(1)
  })

  it('geri alınabilir; hiç yokken geri almak hata değildir', async () => {
    const id = await yeniGonderi(aliToken, `${yol} geri alma ${isaret}-${Math.random()}`)

    await bas(ayseToken, id, 'POST')
    expect(JSON.parse((await bas(ayseToken, id, 'DELETE')).body).sayi).toBe(0)
    /* İkinci kaldırma boş işlem — `delete` fırlatırdı, `deleteMany` fırlatmaz. */
    expect((await bas(ayseToken, id, 'DELETE')).statusCode).toBe(200)
  })

  it('akış "ben yaptım mı" bilgisini doğru verir', async () => {
    const id = await yeniGonderi(aliToken, `${yol} bayrağı ${isaret}-${Math.random()}`)
    await bas(ayseToken, id, 'POST')

    const ayseninAkisi = await akis(ayseToken)
    const alininAkisi = await akis(aliToken)

    expect(ayseninAkisi.find(p => p.id === id)[bayrak]).toBe(true)
    /* Ayşe'nin beğenisi Ali'nin ekranında işaretli GÖRÜNMEMELİ. */
    expect(alininAkisi.find(p => p.id === id)[bayrak]).toBe(false)
  })

  if (sayiAlani) {
    it('sayı iki kullanıcıyla doğru toplanır', async () => {
      const id = await yeniGonderi(aliToken, `${yol} sayımı ${isaret}-${Math.random()}`)
      await bas(ayseToken, id, 'POST')
      await bas(aliToken, id, 'POST')

      const liste = await akis(aliToken)
      expect(liste.find(p => p.id === id)[sayiAlani]).toBe(2)
    })
  }

  it('var olmayan gönderi 404 döner', async () => {
    const yanit = await bas(aliToken, '22222222-2222-4222-8222-222222222222', 'POST')
    expect(yanit.statusCode).toBe(404)
  })

  it('giriş yapmamış kullanıcı yapamaz', async () => {
    const id = await yeniGonderi(aliToken, `${yol} yetki ${isaret}-${Math.random()}`)
    const yanit = await app.inject({ method: 'POST', url: `/community/${id}/${yol}` })
    expect(yanit.statusCode).toBe(401)
  })
})
