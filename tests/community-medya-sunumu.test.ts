import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { communityRoutes } from '../src/services/community'

/*
 * MEDYA SUNUMU — güvenlik incelemesinde çıkan iki bulguyu koruyor.
 *
 * 1. ÖNBELLEK. Medya `public, max-age=86400, immutable` ile sunuluyordu.
 *    Önünde Cloudflare var; `public` kenar sunucusunun dosyayı kendi
 *    diskine alması demek. Yazar/yönetici uygunsuz bir videoyu
 *    kaldırdığında gönderi akıştan düşüyor ama DOSYA kenar önbelleğinden
 *    24 saat daha servis edilmeye devam ederdi. Kaldırma yetkisini
 *    fiilen 24 saat geciktiren bir davranış.
 *
 * 2. RANGE. `parseInt(hamBas) || 0` yüzünden `bytes=-500` ("son 500
 *    bayt") isteği İLK 501 baytı döndürüyor ve `Content-Range` bunu
 *    doğru sanıyordu. Aynı satır, bozuk başlıkları 416 yerine sessizce
 *    baştan okumaya çeviriyordu.
 *
 * İkisi de sessizce geri gelebilir: biri tek kelimelik bir başlık
 * değişikliği, diğeri tek satırlık bir "sadeleştirme".
 */

const prisma = new PrismaClient()
let app: FastifyInstance
let token: string
let kullaniciId: number
let mediaId: string
let postId: string
let boyut: number
const isaret = `medya-${Date.now()}`

/* Gerçek bir PNG: 1x1 saydam. Sihirli bayt doğrulamasından geçmeli,
   yoksa yükleme 415 döner ve test yükleme hatasını ölçer. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'medya-sunumu-test-secret-min-32-bytes' })
  /* multipart KAYDEDILMIYOR: communityRoutes kendisi kaydediyor,
     ikinci kayit FST_ERR_CTP_ALREADY_PRESENT veriyor. */
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  await app.register(communityRoutes, { prefix: '/community', prisma })
  await app.ready()

  const kullanici = await prisma.user.create({
    data: { email: `${isaret}@test.local`, password: 'test', name: 'Medya', role: 'learner' },
  })
  kullaniciId = kullanici.id
  token = app.jwt.sign({ id: kullanici.id, email: kullanici.email, role: kullanici.role })

  /* Dosyayı gerçekten yükle — sahte bir veritabanı satırı diskte dosya
     bırakmaz ve sunum rotası 404 döner. */
  const sinir = '----medyaTest'
  const govde = Buffer.concat([
    Buffer.from(
      `--${sinir}\r\nContent-Disposition: form-data; name="file"; filename="kare.png"\r\n` +
      'Content-Type: image/png\r\n\r\n',
    ),
    PNG_1X1,
    Buffer.from(`\r\n--${sinir}--\r\n`),
  ])
  const yukleme = await app.inject({
    method: 'POST',
    url: '/community/media',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': `multipart/form-data; boundary=${sinir}`,
    },
    payload: govde,
  })
  if (yukleme.statusCode !== 201) {
    throw new Error(`medya yüklenemedi: ${yukleme.statusCode} ${yukleme.body}`)
  }
  mediaId = JSON.parse(yukleme.body).media.id
  boyut = PNG_1X1.length

  const paylasim = await app.inject({
    method: 'POST',
    url: '/community/posts',
    headers: { authorization: `Bearer ${token}` },
    payload: { metin: `Medya sunumu testi ${isaret}`, mediaId },
  })
  postId = JSON.parse(paylasim.body).post.id
})

afterAll(async () => {
  await prisma.communityPost.deleteMany({ where: { authorId: kullaniciId } })
  await prisma.communityMedia.deleteMany({ where: { uploaderId: kullaniciId } })
  await prisma.user.deleteMany({ where: { id: kullaniciId } })
  await app.close()
  await prisma.$disconnect()
})

const getir = (basliklar: Record<string, string> = {}) =>
  app.inject({ method: 'GET', url: `/community/media/${mediaId}`, headers: basliklar })

describe('önbellek kaldırma yetkisini geciktirmemeli', () => {
  it('ara sunucular (Cloudflare) medyayı saklamaz', async () => {
    const yanit = await getir()
    const cache = yanit.headers['cache-control'] as string

    expect(yanit.statusCode).toBe(200)
    /* `public` kenar önbelleğine izin verirdi; `immutable` tarayıcıya
       "bir daha sorma" derdi. İkisi de kaldırılabilir içerik için yanlış. */
    expect(cache).not.toContain('public')
    expect(cache).not.toContain('immutable')
    expect(cache).toContain('private')
  })

  it('gönderi kaldırılınca medya da 404 olur', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/community/${postId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect((await getir()).statusCode).toBe(404)

    /* Sonraki testler için gönderiyi geri yayımla. */
    await prisma.communityPost.update({
      where: { id: postId },
      data: { status: 'published', moderatedAt: null, moderationReason: null },
    })
    expect((await getir()).statusCode).toBe(200)
  })
})

describe('Range ayrıştırması', () => {
  it('sonek aralığı SON baytları döndürür — baştakileri değil', async () => {
    const yanit = await getir({ range: 'bytes=-5' })
    const beklenenBas = boyut - 5

    expect(yanit.statusCode).toBe(206)
    expect(yanit.headers['content-range']).toBe(`bytes ${beklenenBas}-${boyut - 1}/${boyut}`)
    expect(Number(yanit.headers['content-length'])).toBe(5)
    /* Asıl mesele: içerik gerçekten dosyanın SONU mu. Eski kod burada
       ilk 6 baytı (PNG imzasını) döndürüyordu. */
    expect(yanit.rawPayload.equals(PNG_1X1.subarray(beklenenBas))).toBe(true)
  })

  it('bozuk başlangıç 416 döner — sessizce baştan okumaz', async () => {
    const yanit = await getir({ range: 'bytes=abc-10' })

    expect(yanit.statusCode).toBe(416)
    expect(yanit.headers['content-range']).toBe(`bytes */${boyut}`)
  })

  it('sıfır uzunluklu sonek aralığı 416 döner', async () => {
    expect((await getir({ range: 'bytes=-0' })).statusCode).toBe(416)
  })

  it('normal aralık çalışmayı sürdürür', async () => {
    const yanit = await getir({ range: 'bytes=0-3' })

    expect(yanit.statusCode).toBe(206)
    expect(yanit.headers['content-range']).toBe(`bytes 0-3/${boyut}`)
    expect(yanit.rawPayload.equals(PNG_1X1.subarray(0, 4))).toBe(true)
  })

  it('dosya sonunu aşan aralık 416 döner', async () => {
    expect((await getir({ range: `bytes=${boyut}-${boyut + 10}` })).statusCode).toBe(416)
  })

  it('Range yokken tam dosya 200 ile gelir', async () => {
    const yanit = await getir()

    expect(yanit.statusCode).toBe(200)
    expect(yanit.headers['accept-ranges']).toBe('bytes')
    expect(Number(yanit.headers['content-length'])).toBe(boyut)
  })
})
