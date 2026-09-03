import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/*
 * HESAP BAZLI GİRİŞ KİLİDİ.
 *
 * Korunan sözleşme: aynı hesaba yapılan başarısız denemeler SAYILIYOR ve eşiği
 * aşınca hesap geçici olarak kilitleniyor.
 *
 * Neden gerekliydi: giriş sınırlaması yalnız IP başınaydı (10/dakika). IP
 * döndüren bir saldırgan aynı hesaba yüzlerce IP'den deneme dağıtabiliyordu;
 * hesap başına TOPLAM bir sınır yoktu.
 *
 * 🔴 HER İSTEK FARKLI BİR IP'DEN GÖNDERİLİYOR (`remoteAddress`).
 *
 * Bu, testi çalıştırmak için bulunmuş bir kolaylık DEĞİL; korumanın var oluş
 * sebebinin ta kendisi. Aynı IP'den denendiğinde rota bazlı sınır (10/dakika)
 * zaten devreye giriyor ve `RATE_LIMITED` dönüyor — yani hesap kilidi hiç
 * sınanmamış oluyor.
 *
 * İlk yazımda bu gözden kaçtı: "NODE_ENV=test IP sınırını 100_000'e çıkarıyor"
 * varsayılmıştı. O yükseltme yalnız GENEL sınır için geçerli; `/auth/login`
 * üzerindeki `config: { rateLimit: { max: 10 } }` test kipinde de yürürlükte.
 * Testler bunu `RATE_LIMITED` alarak gösterdi.
 *
 * IP değiştirerek test etmek, gerçek tehdit modelini modelliyor: tek IP'den
 * gelen saldırıyı zaten hız sınırı kesiyor, hesap kilidi ise IP DÖNDÜREN
 * saldırgana karşı var.
 */

const prisma = new PrismaClient()
const marker = `lockout-${Date.now()}`
const email = `${marker}@test.local`
const password = 'StrongTestPassword!42'
let app: FastifyInstance
let userId: number

beforeAll(async () => {
  process.env.JWT_SECRET = 'lockout-test-secret-key-min-32-bytes-long'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
  const user = await prisma.user.create({
    data: { email, password: await bcrypt.hash(password, 10), name: 'Lockout Test', role: 'learner' }
  })
  userId = user.id
})

beforeEach(async () => {
  // Her test kendi sayacıyla başlıyor; aksi halde testlerin sırası sonucu
  // belirlerdi ve düşen testin sebebi anlaşılmazdı.
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null }
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorId: userId } })
  await prisma.refreshToken.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await app.close()
  await prisma.$disconnect()
})

/*
 * Her çağrı BAŞKA bir kaynak adresten geliyor.
 *
 * `TRUST_PROXY` testte tanımsız olduğu için `hizSiniriAnahtari` soket adresini
 * (`request.ip`) kullanıyor; `remoteAddress` doğrudan onu belirliyor. Böylece
 * IP başına 10/dakika sınırı hiç dolmuyor ve ölçülen şey yalnızca HESAP
 * sayacı oluyor.
 */
let ipSayaci = 0
function girisDene(sifre: string, ip?: string) {
  ipSayaci += 1
  return app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: sifre },
    remoteAddress: ip ?? `203.0.113.${ipSayaci % 250}`
  })
}

describe('hesap bazlı giriş kilidi', () => {
  it('yanlış parolada sayacı artırır ama eşiğin altında 401 döner', async () => {
    const yanit = await girisDene('yanlis-parola-1')

    expect(yanit.statusCode).toBe(401)
    // Kullanıcı sayımını önlemek için mesaj değişmiyor.
    expect(yanit.json().error).toBe('Invalid credentials')

    const kullanici = await prisma.user.findUnique({ where: { id: userId } })
    expect(kullanici?.failedLoginCount).toBe(1)
    expect(kullanici?.lockedUntil).toBeNull()
  })

  it('IP DEĞİŞTİRİLSE BİLE eşiğe gelince hesabı kilitler', async () => {
    /*
     * Korumanın asıl sınandığı test: her deneme farklı bir IP'den geliyor,
     * yani hız sınırı hiçbir zaman devreye girmiyor. Eskiden bu senaryoda
     * saldırgan sınırsız deneme yapabiliyordu.
     */
    let sonYanit
    for (let i = 0; i < 10; i++) {
      sonYanit = await girisDene(`yanlis-parola-${i}`, `198.51.100.${i + 1}`)
    }

    expect(sonYanit!.statusCode).toBe(429)
    const govde = sonYanit!.json()
    // Mobil istemci MESAJA değil KODA bakıyor.
    expect(govde.code).toBe('ACCOUNT_LOCKED')
    expect(govde.retryAfterSeconds).toBeGreaterThan(0)

    const kullanici = await prisma.user.findUnique({ where: { id: userId } })
    expect(kullanici?.lockedUntil).not.toBeNull()
    expect(kullanici!.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
  })

  it('kilitliyken DOĞRU parola bile kabul edilmiyor', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + 5 * 60 * 1000) }
    })

    const yanit = await girisDene(password)

    expect(yanit.statusCode).toBe(429)
    expect(yanit.json().code).toBe('ACCOUNT_LOCKED')
  })

  it('süresi GEÇMİŞ kilit girişi engellemiyor', async () => {
    // Aylar önceki bir kilit bugünkü girişi durdurmamalı; kilit bir ceza
    // değil, geçici hız kesme.
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 9, lockedUntil: new Date(Date.now() - 60 * 1000) }
    })

    const yanit = await girisDene(password)

    expect(yanit.statusCode).toBe(200)
  })

  it('süresi geçmiş kilitten sonra sayaç SIFIRDAN başlıyor', async () => {
    /*
     * Bu, sessiz bir arıza olurdu: eski 9 hatalı deneme saklı kalsaydı,
     * kilit kalktıktan sonraki TEK yazım hatası kullanıcıyı yeniden
     * kilitlerdi ve sebebi hiçbir yerde görünmezdi.
     */
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 9, lockedUntil: new Date(Date.now() - 60 * 1000) }
    })

    const yanit = await girisDene('yine-yanlis')

    expect(yanit.statusCode).toBe(401)
    const kullanici = await prisma.user.findUnique({ where: { id: userId } })
    expect(kullanici?.failedLoginCount).toBe(1)
    expect(kullanici?.lockedUntil).toBeNull()
  })

  it('başarılı giriş sayacı sıfırlıyor', async () => {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 4 } })

    const yanit = await girisDene(password)

    expect(yanit.statusCode).toBe(200)
    const kullanici = await prisma.user.findUnique({ where: { id: userId } })
    expect(kullanici?.failedLoginCount).toBe(0)
    expect(kullanici?.lockedUntil).toBeNull()
  })

  it('başarısız girişi denetim kaydına yazıyor', async () => {
    /*
     * Önceden başarısız giriş HİÇBİR YERE yazılmıyordu: bir hesaba yönelik
     * saldırı olup olmadığı sonradan anlaşılamıyordu.
     */
    await prisma.auditLog.deleteMany({ where: { actorId: userId } })

    await girisDene('yanlis-parola')

    const kayitlar = await prisma.auditLog.findMany({ where: { actorId: userId } })
    expect(kayitlar.some(k => k.action === 'auth.login_failed')).toBe(true)
  })

  it('var olmayan hesap için kilit kaydı tutmuyor ve ayırt edilemiyor', async () => {
    // Kullanıcı sayımı riski: bilinmeyen e-posta ile yanlış parola AYNI
    // yanıtı vermeli.
    const yanit = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `${marker}-yok@test.local`, password: 'herhangi-bir-parola' },
      remoteAddress: '192.0.2.77'
    })

    expect(yanit.statusCode).toBe(401)
    expect(yanit.json().error).toBe('Invalid credentials')
  })
})
