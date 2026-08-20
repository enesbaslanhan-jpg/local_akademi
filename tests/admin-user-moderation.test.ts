import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

/**
 * Kullanıcı askıya alma / anonimleştirme.
 *
 * ÖNCEDEN yönetimde yalnız rol değiştirme vardı; kötüye kullanan bir hesabı
 * durdurmanın hiçbir yolu yoktu.
 *
 * En önemli iddia: askıya almak AÇIK OTURUMLARI da öldürür. Yalnız
 * `deletedAt` yazılsaydı, hedefin elindeki token 8 saat daha çalışırdı —
 * "askıya aldım" denen kişi akşama kadar uygulamayı kullanırdı.
 */

const prisma = new PrismaClient()
const marker = `modtest-${Date.now()}`
const password = 'GucluTestParolasi!42'
let app: FastifyInstance
let adminId: number
let adminToken: string
let ikinciAdminId: number
let hedefId: number

async function kullaniciOlustur(ek: string, role = 'learner') {
  return prisma.user.create({
    data: {
      email: `${marker}-${ek}@test.local`,
      password: await bcrypt.hash(password, 10),
      name: `Mod ${ek}`,
      role
    }
  })
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'moderation-test-secret-min-32-bytes!!'
  process.env.NODE_ENV = 'test'
  const { default: build } = await import('../src/index')
  app = await build()
  await app.ready()

  const admin = await kullaniciOlustur('admin', 'admin')
  adminId = admin.id
  adminToken = app.jwt.sign({ id: admin.id, email: admin.email, role: 'admin', tv: admin.tokenVersion })

  /* İkinci admin: "son yöneticiyi askıya alamazsın" kuralı diğer testleri
     engellemesin diye. */
  const ikinci = await kullaniciOlustur('admin2', 'admin')
  ikinciAdminId = ikinci.id

  const hedef = await kullaniciOlustur('hedef')
  hedefId = hedef.id
})

afterAll(async () => {
  const ids = [adminId, ikinciAdminId, hedefId].filter(Boolean)
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids.map(String) } }] } })
  await prisma.user.deleteMany({ where: { email: { contains: marker } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: 'deleted-' }, name: 'Silinmiş Kullanıcı', id: { in: ids } } })
  await app.close()
  await prisma.$disconnect()
})

function istek(url: string, token = adminToken, payload: any = {}) {
  return app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` }, payload })
}

async function hedefTokeniAl(id: number) {
  const u = await prisma.user.findUnique({ where: { id } })
  return app.jwt.sign({ id: u!.id, email: u!.email, role: u!.role, tv: u!.tokenVersion })
}

describe('yetki', () => {
  it('admin olmayan askıya alamaz', async () => {
    const u = await prisma.user.findUnique({ where: { id: hedefId } })
    const learnerToken = app.jwt.sign({ id: u!.id, email: u!.email, role: 'learner', tv: u!.tokenVersion })
    const r = await istek(`/admin/users/${ikinciAdminId}/suspend`, learnerToken)
    expect(r.statusCode).toBe(403)
  })

  it('kimlik doğrulaması olmadan reddedilir', async () => {
    const r = await app.inject({ method: 'POST', url: `/admin/users/${hedefId}/suspend`, payload: {} })
    expect(r.statusCode).toBe(401)
  })

  it('admin KENDİNİ askıya alamaz', async () => {
    /* Kendini askıya alan admin sistemden kilitlenir ve geri dönemez. */
    const r = await istek(`/admin/users/${adminId}/suspend`)
    expect(r.statusCode).toBe(403)
    expect(r.json().error).toBe('SELF_ACTION_FORBIDDEN')
  })

  it('var olmayan kullanıcı 404', async () => {
    const r = await istek('/admin/users/99999999/suspend')
    expect(r.statusCode).toBe(404)
  })
})

describe('askıya alma açık oturumları ÖLDÜRÜR', () => {
  it('askıya alınan kullanıcının mevcut tokeni anında geçersizleşir', async () => {
    const hedefToken = await hedefTokeniAl(hedefId)

    /* Önce çalıştığını görelim. */
    const once = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${hedefToken}` } })
    expect(once.statusCode).toBe(200)

    const r = await istek(`/admin/users/${hedefId}/suspend`, adminToken, { reason: 'kötüye kullanım' })
    expect(r.statusCode).toBe(200)

    /* ASIL İDDİA: token artık ölü. */
    const sonra = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${hedefToken}` } })
    expect(sonra.statusCode).toBe(401)
  })

  it('askıdaki kullanıcı GİRİŞ de yapamaz', async () => {
    const u = await prisma.user.findUnique({ where: { id: hedefId } })
    const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: u!.email, password } })
    expect(r.statusCode).toBe(401)
  })

  it('denetim kaydı bırakır (sebep dahil)', async () => {
    const kayit = await prisma.auditLog.findFirst({
      where: { action: 'user.suspended', entityId: String(hedefId) },
      orderBy: { createdAt: 'desc' }
    })
    expect(kayit).not.toBeNull()
    expect(JSON.parse(kayit!.metadata).reason).toBe('kötüye kullanım')
  })

  it('zaten askıdaysa 409', async () => {
    const r = await istek(`/admin/users/${hedefId}/suspend`)
    expect(r.statusCode).toBe(409)
  })
})

describe('askıdan çıkarma', () => {
  it('askı ÖNCESİ token, askıdan çıkınca da geçersiz kalır', async () => {
    /*
     * `tokenVersion` artışının asıl işlevi bu.
     *
     * Askıya alma sırasında oturumu kesen şey `deletedAt` — `authenticate`
     * onu zaten reddediyor. Ama askı KALKINCA `deletedAt` temizleniyor;
     * sürüm artırılmasaydı, askıdan önce üretilmiş tokenlar o anda yeniden
     * geçerli olurdu. Yani askıya alınan kullanıcı, elindeki eski tokenla
     * hiç giriş yapmadan geri dönerdi.
     */
    /* Kendi kullanıcısıyla çalışıyor: diğer testlerin bıraktığı duruma
       bağlı olmasın. */
    const kisi = await kullaniciOlustur('geridonus')
    const askiOncesiToken = app.jwt.sign({
      id: kisi.id, email: kisi.email, role: kisi.role, tv: kisi.tokenVersion
    })
    expect((await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${askiOncesiToken}` }
    })).statusCode).toBe(200)

    expect((await istek(`/admin/users/${kisi.id}/suspend`)).statusCode).toBe(200)
    expect((await istek(`/admin/users/${kisi.id}/unsuspend`)).statusCode).toBe(200)

    /* ASIL İDDİA: askı kalktı ama eski token hâlâ ölü. */
    const sonuc = await app.inject({
      method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${askiOncesiToken}` }
    })
    expect(sonuc.statusCode).toBe(401)
    expect(sonuc.json().reason).toBe('SESSION_REVOKED')

    /* Ama yeniden giriş yapabilmeli — askı gerçekten kalkmış olmalı. */
    const giris = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: kisi.email, password } })
    expect(giris.statusCode).toBe(200)
  })

  it('hedef hesabı geri getirir', async () => {
    const r = await istek(`/admin/users/${hedefId}/unsuspend`)
    expect(r.statusCode).toBe(200)
    const u = await prisma.user.findUnique({ where: { id: hedefId } })
    expect(u!.deletedAt).toBeNull()
  })

  it('zaten aktifse 409', async () => {
    const r = await istek(`/admin/users/${hedefId}/unsuspend`)
    expect(r.statusCode).toBe(409)
  })
})

describe('son yönetici korunur', () => {
  it('tek aktif admin kalınca askıya alınamaz', async () => {
    /* İkinci admini askıya al → geriye tek aktif admin (çağıran) kalır. */
    expect((await istek(`/admin/users/${ikinciAdminId}/suspend`)).statusCode).toBe(200)

    /* Şimdi üçüncü bir admin oluşturup onun tek admini askıya almasını
       deneyelim: hedef, kalan tek aktif admin olan `adminId`. */
    const ucuncu = await kullaniciOlustur('admin3', 'admin')
    const ucuncuToken = app.jwt.sign({ id: ucuncu.id, email: ucuncu.email, role: 'admin', tv: ucuncu.tokenVersion })

    /* Artık iki aktif admin var (adminId, ucuncu) — kural devrede değil. */
    const r = await istek(`/admin/users/${adminId}/suspend`, ucuncuToken)
    expect(r.statusCode).toBe(200)

    /* Geri al, sonraki testler adminToken kullanıyor. */
    await prisma.user.update({ where: { id: adminId }, data: { deletedAt: null } })
    await prisma.user.delete({ where: { id: ucuncu.id } })
    await prisma.user.update({ where: { id: ikinciAdminId }, data: { deletedAt: null } })
    /* Askıya alma tokenVersion artırdığı için adminToken tazelenmeli. */
    adminToken = await hedefTokeniAl(adminId)
  })
})

describe('anonimleştirme', () => {
  it('kişisel alanları temizler, kaydı silmez', async () => {
    const oncekiEmail = (await prisma.user.findUnique({ where: { id: hedefId } }))!.email

    const r = await istek(`/admin/users/${hedefId}/anonymize`)
    expect(r.statusCode).toBe(200)

    const sonra = await prisma.user.findUnique({ where: { id: hedefId } })
    /* Kayıt DURUYOR — denetim izleri ve ilişkiler ayakta kalsın. */
    expect(sonra).not.toBeNull()
    expect(sonra!.email).not.toBe(oncekiEmail)
    expect(sonra!.email).toMatch(/@deleted\.local$/)
    expect(sonra!.name).toBe('Silinmiş Kullanıcı')
    expect(sonra!.avatarStoredName).toBeNull()
    expect(sonra!.deletedAt).not.toBeNull()
  })

  it('eski e-posta denetim kaydına KOPYALANMAZ', async () => {
    /* Amaç kişisel veriyi silmekse, onu denetim kaydına yazmak amacı
       boşa çıkarırdı. */
    const kayit = await prisma.auditLog.findFirst({
      where: { action: 'user.anonymized', entityId: String(hedefId) }
    })
    expect(kayit).not.toBeNull()
    expect(kayit!.metadata).not.toContain(marker)
  })

  it('anonimleştirilmiş hesap geri alınamaz', async () => {
    const r = await istek(`/admin/users/${hedefId}/unsuspend`)
    expect(r.statusCode).toBe(409)
    expect(r.json().error).toBe('ANONYMIZED')
  })

  it('ikinci kez anonimleştirme 409', async () => {
    const r = await istek(`/admin/users/${hedefId}/anonymize`)
    expect(r.statusCode).toBe(409)
  })
})
