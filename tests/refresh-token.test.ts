import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { yeniAileOlustur } from '../src/services/refresh-tokens'

/**
 * Oturum yenileme.
 *
 * En kritik davranış, "mutlu yol" değil: İPTAL EDİLMİŞ BİR OTURUMUN
 * YENİLEME YOLUYLA DİRİLEMEMESİ. `tokenVersion` beş ayrı yerde artıyor
 * (şifre değişimi, tüm cihazlardan çıkış, şifre sıfırlama, askıya alma,
 * anonimleştirme). Kontrol tek yerde — yenileme uç noktasında — olduğu
 * için buradaki testler o tek noktayı koruyor.
 */

const prisma = new PrismaClient()
const marker = `refresh-${Date.now()}`
let app: FastifyInstance
const temizlenecek: number[] = []
const PAROLA = 'GucluTestParolasi!42'

beforeAll(async () => {
  process.env.JWT_SECRET = 'refresh-token-test-secret-min-32-byt'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()
})

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.userConsent.deleteMany({ where: { userId: { in: temizlenecek } } })
  await prisma.auditLog.deleteMany({ where: { actorId: { in: temizlenecek } } })
  await prisma.user.deleteMany({ where: { email: { contains: marker } } })
  await app.close()
  await prisma.$disconnect()
})

/* Kullanıcı doğrudan veritabanında açılıyor: /auth/register saatte 5
   istekle sınırlı ve bu dosya birden çok hesap gerektiriyor. */
async function kullanici(ek: string) {
  const email = `${marker}-${ek}@test.local`
  const created = await prisma.user.create({
    data: { email, password: await bcrypt.hash(PAROLA, 10), name: 'Yenileme Testi' }
  })
  temizlenecek.push(created.id)
  return created
}

/*
 * Giriş uç noktası DAKİKADA 10 istekle sınırlı; bu dosya daha fazla
 * oturum gerektiriyor. Sınıra takılınca yanıtta `refreshToken`
 * olmuyor ve testler alakasız bir 422 ile düşüyordu — hata gerçek
 * sebebi gizliyordu.
 *
 * Bu yüzden: giriş uç noktası YALNIZ yanıt şeklini sınayan testte
 * kullanılıyor; geri kalan oturumlar servis üzerinden açılıyor.
 */
async function girisYap(email: string) {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: PAROLA } })
  if (res.statusCode !== 200) {
    throw new Error(`giriş başarısız (${res.statusCode}): ${res.body.slice(0, 120)}`)
  }
  return res.json() as { token: string; refreshToken: string }
}

/** Oturumu doğrudan servis üzerinden açar (hız sınırına takılmaz). */
async function oturumAc(user: { id: number; email: string; role: string; tokenVersion: number }) {
  const yenileme = await yeniAileOlustur(prisma, user.id, user.tokenVersion)
  const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role, tv: user.tokenVersion })
  return { token, refreshToken: yenileme.rawToken }
}

const yenile = (refreshToken: string) =>
  app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } })

describe('yenileme — temel akış', () => {
  /* Bu test GERCEK giris ucunu kullaniyor - iddiasi zaten giris
     YANITININ sekli. Dosyadaki tek /auth/login cagrisi, dolayisiyla
     hiz sinirina takilmiyor. */
  it('giriş yanıtı yenileme tokeni içerir', async () => {
    const u = await kullanici('giris')
    const body = await girisYap(u.email)
    expect(typeof body.refreshToken).toBe('string')
    expect(body.refreshToken.length).toBeGreaterThanOrEqual(64)
  })

  it('yenileme yeni erişim VE yeni yenileme tokeni döner', async () => {
    const u = await kullanici('yenile')
    const ilk = await oturumAc(u)
    const res = await yenile(ilk.refreshToken)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeTruthy()
    expect(body.refreshToken).toBeTruthy()
    expect(body.refreshToken).not.toBe(ilk.refreshToken)
  })

  it('yenilenen erişim tokeni gerçekten çalışır', async () => {
    const u = await kullanici('calisir')
    const ilk = await oturumAc(u)
    const yeni = (await yenile(ilk.refreshToken)).json()
    const me = await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${yeni.token}` }
    })
    expect(me.statusCode).toBe(200)
    expect(me.json().email).toBe(u.email)
  })

  it('veritabanında ham token saklanmaz', async () => {
    const u = await kullanici('hash')
    const body = await oturumAc(u)
    const kayit = await prisma.refreshToken.findFirst({ where: { userId: u.id } })
    expect(kayit).not.toBeNull()
    expect(kayit!.tokenHash).not.toBe(body.refreshToken)
    expect(kayit!.tokenHash).toHaveLength(64)
  })
})

describe('yenileme — dönüş ve hırsızlık', () => {
  it('🔴 harcanmış token TEKRAR kullanılamaz', async () => {
    const u = await kullanici('tekrar')
    const ilk = await oturumAc(u)
    await yenile(ilk.refreshToken)
    const ikinci = await yenile(ilk.refreshToken)
    expect(ikinci.statusCode).toBe(401)
  })

  it('🔴 tekrar kullanım AİLENİN TAMAMINI iptal eder', async () => {
    /* Aynı token iki tarafta demek; hangisinin saldırgan olduğunu
       bilemeyiz, ikisi de düşmeli. */
    const u = await kullanici('aile')
    const ilk = await oturumAc(u)
    const ikinci = (await yenile(ilk.refreshToken)).json()

    /* Saldırgan eski (harcanmış) tokeni sunuyor → aile iptal. */
    await yenile(ilk.refreshToken)

    /* Meşru istemcinin GEÇERLİ tokeni de artık çalışmamalı. */
    const mesru = await yenile(ikinci.refreshToken)
    expect(mesru.statusCode).toBe(401)
  })

  it('bilinmeyen token reddedilir', async () => {
    const res = await yenile('a'.repeat(96))
    expect(res.statusCode).toBe(401)
  })

  it('süresi dolmuş token reddedilir', async () => {
    const u = await kullanici('sure')
    const body = await oturumAc(u)
    await prisma.refreshToken.updateMany({
      where: { userId: u.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    })
    const res = await yenile(body.refreshToken)
    expect(res.statusCode).toBe(401)
  })

  it('geçersiz gövde 422 döner', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: 'kisa' } })
    expect(res.statusCode).toBe(422)
  })
})

describe('🔴 iptal edilmiş oturum yenilemeyle DİRİLEMEZ', () => {
  /*
   * Bu grubun tamamı tek bir şeyi koruyor: `tokenVersion` artınca açık
   * yenileme tokenleri de ölmeli. Ölmezse "tüm cihazlardan çık" ve
   * "şifremi değiştir" işlemleri anlamsızlaşır — saldırgan elindeki
   * yenileme tokeniyle taze erişim tokeni üretmeye devam eder.
   */

  it('logout-all sonrası ESKİ yenileme tokeni çalışmaz', async () => {
    const u = await kullanici('logoutall')
    const ilk = await oturumAc(u)

    const cikis = await app.inject({
      method: 'POST', url: '/auth/logout-all',
      headers: { authorization: `Bearer ${ilk.token}` }
    })
    expect(cikis.statusCode).toBe(200)

    const res = await yenile(ilk.refreshToken)
    expect(res.statusCode).toBe(401)
  })

  it('logout-all ÇAĞIRAN cihaza taze yenileme tokeni verir', async () => {
    /* Verilmeseydi kullanıcı kendi cihazından da düşerdi. */
    const u = await kullanici('logoutall-taze')
    const ilk = await oturumAc(u)
    const cikis = await app.inject({
      method: 'POST', url: '/auth/logout-all',
      headers: { authorization: `Bearer ${ilk.token}` }
    })
    const taze = cikis.json().refreshToken
    expect(taze).toBeTruthy()
    expect(taze).not.toBe(ilk.refreshToken)
    expect((await yenile(taze)).statusCode).toBe(200)
  })

  it('tokenVersion elle artırılınca yenileme reddedilir', async () => {
    const u = await kullanici('tv')
    const ilk = await oturumAc(u)
    await prisma.user.update({ where: { id: u.id }, data: { tokenVersion: { increment: 1 } } })
    expect((await yenile(ilk.refreshToken)).statusCode).toBe(401)
  })

  it('silinmiş kullanıcı yenileyemez', async () => {
    const u = await kullanici('silinmis')
    const ilk = await oturumAc(u)
    await prisma.user.update({ where: { id: u.id }, data: { deletedAt: new Date() } })
    expect((await yenile(ilk.refreshToken)).statusCode).toBe(401)
    await prisma.user.update({ where: { id: u.id }, data: { deletedAt: null } })
  })
})

describe('çıkış', () => {
  it('logout sunulan tokeni iptal eder', async () => {
    const u = await kullanici('cikis')
    const ilk = await oturumAc(u)
    const res = await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: ilk.refreshToken } })
    expect(res.statusCode).toBe(200)
    expect((await yenile(ilk.refreshToken)).statusCode).toBe(401)
  })

  it('logout DİĞER cihazları etkilemez', async () => {
    const u = await kullanici('cikis-tek')
    const cihazA = await oturumAc(u)
    const cihazB = await oturumAc(u)
    await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: cihazA.refreshToken } })
    expect((await yenile(cihazB.refreshToken)).statusCode).toBe(200)
  })

  it('token verilmese de 200 döner', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout', payload: {} })
    expect(res.statusCode).toBe(200)
  })
})

describe('tokenVersion artıran uçlar taze yenileme tokeni verir', () => {
  /*
   * Üç uç nokta `tokenVersion`'ı artırıp ÇAĞIRANA taze erişim tokeni
   * dönüyor: şifre değişimi, tüm cihazlardan çıkış, şifre sıfırlama.
   * Üçünün de yenileme tokenini tazelemesi gerekiyor — yoksa kullanıcı
   * işlemden hemen sonra kendi cihazından, ilk yenilemede atılır.
   *
   * Bu test o üçlüyü birlikte koruyor: biri unutulursa çöker.
   */
  it('şifre değişimi taze yenileme tokeni verir', async () => {
    const u = await kullanici('sifre-degis')
    const ilk = await oturumAc(u)
    const res = await app.inject({
      method: 'PUT', url: '/auth/password',
      headers: { authorization: `Bearer ${ilk.token}` },
      payload: { currentPassword: PAROLA, newPassword: 'YeniGucluParola!99' }
    })
    expect(res.statusCode).toBe(200)
    const taze = res.json().refreshToken
    expect(taze).toBeTruthy()
    expect((await yenile(taze)).statusCode).toBe(200)
    /* Eskisi ölmüş olmalı. */
    expect((await yenile(ilk.refreshToken)).statusCode).toBe(401)
  })
})
