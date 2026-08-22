import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

/*
 * BOLA — ÇAPRAZ ERİŞİM DENETİMİ (22.08.2026)
 *
 * BOLA = Broken Object Level Authorization. En sık ve en sessiz web
 * açığı: uç nokta "giriş yapmış mısın" diye sorar ama "bu nesne SENİN
 * mi" diye sormaz. Kullanıcı adres çubuğundaki kimliği değiştirir ve
 * başkasının verisini okur.
 *
 * NEDEN BU DOSYA YAZILDI:
 * Statik denetim yapıldı — `src` altında 105 parametreli rota var ve
 * hepsinde bir yetki kontrolü İZİ bulundu. Ama iz, kontrolün DOĞRU
 * olduğunu kanıtlamaz; yalnız bir yerde bir `userId` geçtiğini söyler.
 * Tüm takımda çapraz erişimi gerçekten deneyen test sayısı dokuzdu.
 *
 * Buradaki testler tahmin etmiyor: iki gerçek kullanıcı kuruluyor,
 * biri nesneyi yaratıyor, diğeri erişmeyi deniyor.
 *
 * 🔴 EN ÖNEMLİ SENARYO — "geçerli üyelik, yabancı nesne":
 * Kullanıcı KENDİ çalışma alanının kimliğini verir ama BAŞKA alanın
 * nesne kimliğini geçirir. Üyelik kontrolü geçer; nesnenin o alana ait
 * olup olmadığı denetlenmezse veri sızar. Klasik tuzak budur.
 */

const prisma = new PrismaClient()
let app: FastifyInstance

let aliId: number
let ayseId: number
let aliToken: string
let ayseToken: string

let aliAlani: string
let ayseAlani: string
let aliKaydi: string
let aliBelgesi: string
let aliBildirimi: string
let aliOneri: string
let aliSohbeti: number

const isaret = `bola-${Date.now()}`

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'bola-capraz-erisim-test-secret-32-bayt' })
  app.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  const { businessTrackerRoutes } = await import('../src/services/business-tracker')
  const { documentRoutes } = await import('../src/services/documents')
  const { conversationRoutes } = await import('../src/services/conversation')
  await app.register(businessTrackerRoutes, { prefix: '/workspaces', prisma })
  await app.register(documentRoutes, { prefix: '/documents', prisma })
  await app.register(conversationRoutes, { prefix: '/conversations', prisma })
  await app.ready()

  const [ali, ayse] = await Promise.all([
    prisma.user.create({ data: { email: `${isaret}-ali@test.local`, password: 'hash', name: 'Ali' } }),
    prisma.user.create({ data: { email: `${isaret}-ayse@test.local`, password: 'hash', name: 'Ayşe' } }),
  ])
  aliId = ali.id
  ayseId = ayse.id
  aliToken = app.jwt.sign({ id: aliId, email: ali.email, role: 'learner' })
  ayseToken = app.jwt.sign({ id: ayseId, email: ayse.email, role: 'learner' })

  /*
   * İKİ AYRI ÇALIŞMA ALANI, HER BİRİNİN MEŞRU SAHİBİ VAR.
   *
   * Ayşe'nin kendi alanı olması ŞART: testin anlamı "üyeliği olmayan
   * biri giremiyor" değil, "GEÇERLİ üyeliği olan biri o üyelikle
   * yabancı nesneye uzanamıyor". Ayşe'nin hiç alanı olmasaydı, üyelik
   * kontrolüne takılır ve asıl açık hiç sınanmamış olurdu.
   */
  const [a1, a2] = await Promise.all([
    prisma.businessWorkspace.create({ data: { name: `${isaret}-ali`, createdById: aliId } }),
    prisma.businessWorkspace.create({ data: { name: `${isaret}-ayse`, createdById: ayseId } }),
  ])
  aliAlani = a1.id
  ayseAlani = a2.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId: aliAlani, userId: aliId, role: 'owner' },
      { workspaceId: ayseAlani, userId: ayseId, role: 'owner' },
    ],
  })

  const kayit = await prisma.businessRecord.create({
    data: { workspaceId: aliAlani, type: 'task', title: `${isaret} gizli kayıt`, createdById: aliId },
  })
  aliKaydi = kayit.id

  const belge = await prisma.uploadedDocument.create({
    data: {
      userId: aliId, workspaceId: aliAlani,
      originalName: 'ali-fatura.pdf', storedName: `${isaret}-ali.pdf`,
      mimeType: 'application/pdf', sizeBytes: 1024, status: 'ready',
      extractedText: 'ALİNİN GİZLİ FATURA METNİ',
    },
  })
  aliBelgesi = belge.id

  const bildirim = await prisma.businessNotification.create({
    data: {
      workspaceId: aliAlani, userId: aliId, type: 'reminder',
      title: `${isaret} bildirim`, body: 'Ali için hatırlatma',
    },
  })
  aliBildirimi = bildirim.id

  const oneri = await prisma.documentSuggestion.create({
    data: {
      documentId: aliBelgesi, workspaceId: aliAlani,
      suggestionType: 'expense', payload: JSON.stringify({ title: `${isaret} öneri` }),
      confidence: 0.9, status: 'proposed',
    },
  })
  aliOneri = oneri.id

  const sohbet = await prisma.conversation.create({
    data: { userId: aliId, title: `${isaret} özel sohbet` },
  })
  aliSohbeti = sohbet.id
  await prisma.conversationMessage.create({
    data: { conversationId: aliSohbeti, role: 'user', content: 'ALİNİN GİZLİ MESAJI' },
  })
})

afterAll(async () => {
  const alanlar = [aliAlani, ayseAlani].filter(Boolean)
  await prisma.conversationMessage.deleteMany({ where: { conversationId: aliSohbeti } }).catch(() => {})
  await prisma.conversation.deleteMany({ where: { userId: { in: [aliId, ayseId] } } }).catch(() => {})
  await prisma.documentSuggestion.deleteMany({ where: { workspaceId: { in: alanlar } } }).catch(() => {})
  await prisma.businessNotification.deleteMany({ where: { workspaceId: { in: alanlar } } }).catch(() => {})
  await prisma.businessRecordHistory.deleteMany({ where: { workspaceId: { in: alanlar } } }).catch(() => {})
  await prisma.businessRecord.deleteMany({ where: { workspaceId: { in: alanlar } } }).catch(() => {})
  await prisma.uploadedDocument.deleteMany({ where: { userId: { in: [aliId, ayseId] } } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: alanlar } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: alanlar } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [aliId, ayseId] } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

function ayseCagirir(metot: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown) {
  return app.inject({
    method: metot,
    url,
    headers: { authorization: `Bearer ${ayseToken}` },
    ...(payload ? { payload } : {}),
  })
}

/* Sızıntı iki türlü olur: ya erişim başarılı olur, ya hata mesajı
   içeriği ele verir. İkisi de kontrol ediliyor. */
function reddedildi(yanit: { statusCode: number; body: string }, gizliMetin?: string) {
  expect([403, 404]).toContain(yanit.statusCode)
  if (gizliMetin) expect(yanit.body).not.toContain(gizliMetin)
}

describe('🔴 geçerli üyelik + yabancı nesne (asıl BOLA tuzağı)', () => {
  /*
   * Ayşe KENDİ alanının kimliğini veriyor — üyelik kontrolü GEÇİYOR.
   * Ama nesne kimliği Ali'nin. Nesnenin o alana ait olduğu ayrıca
   * denetlenmezse veri sızar.
   */
  it('kendi alan kimliğiyle BAŞKASININ kaydına uzanamaz', async () => {
    const yanit = await ayseCagirir('GET', `/workspaces/${ayseAlani}/records/${aliKaydi}`)
    reddedildi(yanit, 'gizli kayıt')
  })

  it('kendi alan kimliğiyle başkasının kaydını DEĞİŞTİREMEZ', async () => {
    const yanit = await ayseCagirir('PATCH', `/workspaces/${ayseAlani}/records/${aliKaydi}`, { title: 'ele geçirildi' })
    reddedildi(yanit)

    /* Reddedilmiş olması yetmez — kaydın gerçekten değişmediği
       görülmeli. 403 dönüp yine de yazan bir uç nokta mümkündür. */
    const kayit = await prisma.businessRecord.findUnique({ where: { id: aliKaydi } })
    expect(kayit?.title).toContain('gizli kayıt')
  })

  it('kendi alan kimliğiyle başkasının kaydını SİLEMEZ', async () => {
    reddedildi(await ayseCagirir('DELETE', `/workspaces/${ayseAlani}/records/${aliKaydi}`))
    expect(await prisma.businessRecord.findUnique({ where: { id: aliKaydi } })).not.toBeNull()
  })

  it('kendi alan kimliğiyle başkasının belgesine uzanamaz', async () => {
    reddedildi(await ayseCagirir('PATCH', `/workspaces/${ayseAlani}/documents/${aliBelgesi}`, { title: 'x' }))
    reddedildi(await ayseCagirir('DELETE', `/workspaces/${ayseAlani}/documents/${aliBelgesi}`))

    const belge = await prisma.uploadedDocument.findUnique({ where: { id: aliBelgesi } })
    expect(belge?.archivedAt).toBeNull()
  })

  it('🔴 kendi alan kimliğiyle başkasının belge önerisini ONAYLAYAMAZ', async () => {
    /*
     * Bu en ağırı: öneri onaylandığında `BusinessRecord` YAZILIYOR.
     * Açık olsaydı saldırgan yalnız veri okumaz, kurbanın işletme
     * defterine kayıt düşürürdü.
     */
    reddedildi(await ayseCagirir('POST', `/workspaces/${ayseAlani}/document-suggestions/${aliOneri}/accept`))

    const oneri = await prisma.documentSuggestion.findUnique({ where: { id: aliOneri } })
    expect(oneri?.status).toBe('proposed')
  })
})

describe('aynı alan, BAŞKA kullanıcı', () => {
  it('bildirim başka kullanıcıya aitse okundu işaretlenemez', async () => {
    /*
     * Ayşe burada Ali'nin alanına ÜYE DEĞİL, ama senaryonun asıl
     * öğrettiği şey şu: bildirim hem alana hem KULLANICIYA bağlı.
     * Yalnız alan kontrolü yapılsaydı, aynı alandaki iki üye
     * birbirinin bildirimlerini yönetebilirdi.
     */
    reddedildi(await ayseCagirir('PATCH', `/workspaces/${aliAlani}/notifications/${aliBildirimi}/read`))

    const bildirim = await prisma.businessNotification.findUnique({ where: { id: aliBildirimi } })
    expect(bildirim?.readAt).toBeNull()
  })
})

describe('üyeliği olmayan alan', () => {
  it('başkasının alanındaki kayıtları listeleyemez', async () => {
    reddedildi(await ayseCagirir('GET', `/workspaces/${aliAlani}/records`), 'gizli kayıt')
  })

  it('başkasının alanına kayıt EKLEYEMEZ', async () => {
    reddedildi(await ayseCagirir('POST', `/workspaces/${aliAlani}/records`, { type: 'task', title: 'sızma' }))

    const sayi = await prisma.businessRecord.count({ where: { workspaceId: aliAlani } })
    expect(sayi).toBe(1)
  })

  it('başkasının alanındaki belgeleri listeleyemez', async () => {
    reddedildi(await ayseCagirir('GET', `/workspaces/${aliAlani}/documents`), 'ali-fatura.pdf')
  })
})

describe('kişisel belgeler', () => {
  it('başkasının belgesini okuyamaz — metin sızmamalı', async () => {
    reddedildi(await ayseCagirir('GET', `/documents/${aliBelgesi}`), 'ALİNİN GİZLİ FATURA METNİ')
  })

  it('başkasının belgesini silemez', async () => {
    reddedildi(await ayseCagirir('DELETE', `/documents/${aliBelgesi}`))
    expect(await prisma.uploadedDocument.findUnique({ where: { id: aliBelgesi } })).not.toBeNull()
  })
})

describe('mentor sohbetleri', () => {
  /*
   * Sohbetler kullanıcının işletmesi hakkında yazdığı her şeyi
   * taşıyor; sızması en ağır sonuçlardan biri.
   */
  it('başkasının sohbetini açamaz', async () => {
    reddedildi(await ayseCagirir('GET', `/conversations/${aliSohbeti}`), 'ALİNİN GİZLİ MESAJI')
  })

  it('başkasının sohbetini silemez', async () => {
    reddedildi(await ayseCagirir('DELETE', `/conversations/${aliSohbeti}`))
    const sohbet = await prisma.conversation.findUnique({ where: { id: aliSohbeti } })
    expect(sohbet?.deletedAt ?? null).toBeNull()
  })

  it('başkasının sohbetine mesaj yazamaz', async () => {
    /*
     * Alan adı `message` — ilk yazımda `content` demiştim ve istek
     * yetkilendirmeye HİÇ ULAŞMADAN "mesaj boş olamaz" ile 422
     * dönüyordu. Test yeşil görünse yanlış sebeple yeşil olurdu;
     * güvenlik testinde bu, testin hiç olmamasından kötüdür.
     */
    reddedildi(await ayseCagirir('POST', `/conversations/${aliSohbeti}/messages`, { message: 'sızma denemesi' }))

    const sayi = await prisma.conversationMessage.count({ where: { conversationId: aliSohbeti } })
    expect(sayi).toBe(1)
  })

  it('kendi listesinde başkasının sohbeti görünmez', async () => {
    const yanit = await ayseCagirir('GET', '/conversations')
    expect(yanit.statusCode).toBe(200)
    expect(yanit.body).not.toContain('özel sohbet')
  })
})
