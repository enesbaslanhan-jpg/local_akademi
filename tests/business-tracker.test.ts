import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
let app: FastifyInstance
let ownerId: number
let otherId: number
let viewerId: number
let ownerToken: string
let otherToken: string
let viewerToken: string
let workspaceId: string
let otherWorkspaceId: string
let recordId: string
let documentId: string

function inject(method: string, url: string, token?: string, payload?: any) {
  return app.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload === undefined ? {} : { payload })
  })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { businessTrackerRoutes } = await import('../src/services/business-tracker')
  await app.register(businessTrackerRoutes, { prefix: '/workspaces', prisma })
  await app.ready()

  const stamp = Date.now()
  const [owner, other, viewer] = await Promise.all([
    prisma.user.create({ data: { email: `tracker-owner-${stamp}@test.local`, password: 'hash', name: 'Owner' } }),
    prisma.user.create({ data: { email: `tracker-other-${stamp}@test.local`, password: 'hash', name: 'Other' } }),
    prisma.user.create({ data: { email: `tracker-viewer-${stamp}@test.local`, password: 'hash', name: 'Viewer' } })
  ])
  ownerId = owner.id
  otherId = other.id
  viewerId = viewer.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email })
  otherToken = app.jwt.sign({ id: otherId, email: other.email })
  viewerToken = app.jwt.sign({ id: viewerId, email: viewer.email })

  const [workspace, otherWorkspace] = await Promise.all([
    prisma.businessWorkspace.create({ data: { name: 'Tracker Test', createdById: ownerId } }),
    prisma.businessWorkspace.create({ data: { name: 'Other Tracker', createdById: otherId } })
  ])
  workspaceId = workspace.id
  otherWorkspaceId = otherWorkspace.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: ownerId, role: 'owner' },
      { workspaceId, userId: viewerId, role: 'viewer' },
      { workspaceId: otherWorkspaceId, userId: otherId, role: 'owner' }
    ]
  })
})

afterAll(async () => {
  await prisma.documentConversation.deleteMany({ where: { documentId } }).catch(() => {})
  await prisma.businessRecordDocument.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessReminder.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessNotification.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessRecordHistory.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.businessRecord.deleteMany({ where: { workspaceId } }).catch(() => {})
  await prisma.uploadedDocument.deleteMany({ where: { id: documentId } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, viewerId] } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

describe('Business tracker API', () => {
  it('requires authentication', async () => {
    const response = await inject('GET', `/workspaces/${workspaceId}/records`)
    expect(response.statusCode).toBe(401)
  })

  it('creates a payable record with a due date', async () => {
    const response = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment',
      title: 'Kira ödemesi',
      direction: 'payable',
      amount: 12500,
      currency: 'TRY',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      priority: 'high'
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().amount).toBe(12500)
    recordId = response.json().id
    expect(await prisma.businessReminder.count({
      where: { recordId, dedupeKey: { startsWith: `auto:${recordId}:` } }
    })).toBe(1)
  })

  it('turns due reminders into deduplicated, user-scoped notifications', async () => {
    const first = await inject('GET', `/workspaces/${workspaceId}/notifications`, ownerToken)
    expect(first.statusCode).toBe(200)
    expect(first.json().unreadCount).toBe(1)
    const notification = first.json().notifications[0]

    const second = await inject('GET', `/workspaces/${workspaceId}/notifications`, ownerToken)
    expect(second.json().notifications).toHaveLength(1)
    expect((await inject('PATCH', `/workspaces/${workspaceId}/notifications/${notification.id}/read`, viewerToken)).statusCode).toBe(404)
    expect((await inject('PATCH', `/workspaces/${workspaceId}/notifications/${notification.id}/read`, ownerToken)).statusCode).toBe(200)
    expect((await inject('POST', `/workspaces/${workspaceId}/notifications/read-all`, ownerToken)).statusCode).toBe(200)
  })

  it('lists only workspace records', async () => {
    await prisma.businessRecord.create({
      data: { workspaceId: otherWorkspaceId, type: 'task', title: 'Private record', createdById: otherId }
    })
    const response = await inject('GET', `/workspaces/${workspaceId}/records`, ownerToken)
    expect(response.statusCode).toBe(200)
    expect(response.json().records.map((record: any) => record.title)).toEqual(['Kira ödemesi'])
  })

  it('blocks cross-workspace record IDOR', async () => {
    const response = await inject('GET', `/workspaces/${otherWorkspaceId}/records/${recordId}`, otherToken)
    expect(response.statusCode).toBe(404)
  })

  it('allows viewers to read but not mutate', async () => {
    expect((await inject('GET', `/workspaces/${workspaceId}/records`, viewerToken)).statusCode).toBe(200)
    const response = await inject('POST', `/workspaces/${workspaceId}/records`, viewerToken, {
      type: 'task', title: 'Forbidden'
    })
    expect(response.statusCode).toBe(403)
  })

  it('rejects contacts from another workspace', async () => {
    const contact = await prisma.businessContact.create({
      data: { workspaceId: otherWorkspaceId, name: 'Other Supplier', createdById: otherId }
    })
    const response = await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      contactId: contact.id
    })
    expect(response.statusCode).toBe(422)
  })

  it('creates a deduplicated reminder', async () => {
    const payload = { scheduledAt: new Date(Date.now() + 3600000).toISOString() }
    const first = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/reminders`, ownerToken, payload)
    const second = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/reminders`, ownerToken, payload)
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(await prisma.businessReminder.count({ where: { dedupeKey: `${recordId}:${ownerId}:${payload.scheduledAt}:in_app` } })).toBe(1)
  })

  it('attaches a legacy personal document without empty-string foreign keys', async () => {
    const document = await prisma.uploadedDocument.create({
      data: {
        userId: ownerId,
        originalName: 'senet.pdf',
        storedName: 'tracker-test-senet.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
        extractedText: 'Senet tutarı 12.500,00 TL. Vade tarihi 15.09.2026.'
      }
    })
    documentId = document.id
    const response = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, ownerToken)
    expect(response.statusCode).toBe(201)
    expect((await prisma.uploadedDocument.findUnique({ where: { id: documentId } }))?.workspaceId).toBe(workspaceId)
  })

  it('proposes a record from a document but creates it only after explicit approval', async () => {
    const before = await prisma.businessRecord.count({ where: { workspaceId } })
    const update = await inject('PATCH', `/workspaces/${workspaceId}/documents/${documentId}`, ownerToken, {
      category: 'promissory_note'
    })
    expect(update.statusCode).toBe(200)
    expect(await prisma.businessRecord.count({ where: { workspaceId } })).toBe(before)

    const list = await inject('GET', `/workspaces/${workspaceId}/documents/${documentId}/suggestions`, ownerToken)
    expect(list.statusCode).toBe(200)
    const suggestion = list.json().suggestions[0]
    expect(suggestion.payload.amount).toBe(12500)
    expect(suggestion.status).toBe('proposed')
    expect((await inject('POST', `/workspaces/${otherWorkspaceId}/document-suggestions/${suggestion.id}/accept`, otherToken, {})).statusCode).toBe(404)

    const accepted = await inject('POST', `/workspaces/${workspaceId}/document-suggestions/${suggestion.id}/accept`, ownerToken, {})
    expect(accepted.statusCode).toBe(201)
    expect(accepted.json().type).toBe('promissory_note')
    expect(await prisma.businessRecord.count({ where: { workspaceId } })).toBe(before + 1)
    expect((await inject('POST', `/workspaces/${workspaceId}/document-suggestions/${suggestion.id}/accept`, ownerToken, {})).statusCode).toBe(409)
  })

  it('defers a record and keeps an audit reason', async () => {
    const dueAt = new Date(Date.now() + 7 * 86400000).toISOString()
    const response = await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/defer`, ownerToken, {
      dueAt,
      reason: 'Tedarikçi ile yeni tarih kararlaştırıldı'
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe('deferred')
    const history = await prisma.businessRecordHistory.findFirst({ where: { recordId, action: 'deferred' } })
    expect(history?.reason).toContain('Tedarikçi')
  })

  it('returns workspace-scoped records in a valid calendar range', async () => {
    const from = new Date(Date.now() - 86400000).toISOString()
    const tooFar = new Date(Date.now() + 400 * 86400000).toISOString()
    expect((await inject('GET', `/workspaces/${workspaceId}/tracker/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(tooFar)}`, ownerToken)).statusCode).toBe(422)

    const to = new Date(Date.now() + 30 * 86400000).toISOString()
    const response = await inject('GET', `/workspaces/${workspaceId}/tracker/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, ownerToken)
    expect(response.statusCode).toBe(200)
    expect(response.json().totals.records).toBeGreaterThan(0)
    expect(response.json().totals.payable).toBeGreaterThan(0)
    expect((await inject('GET', `/workspaces/${otherWorkspaceId}/tracker/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, ownerToken)).statusCode).toBe(403)
  })

  it('completes a recurring record, creates the next period once and exposes history', async () => {
    expect((await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      recurrenceRule: 'monthly'
    })).statusCode).toBe(200)
    const response = await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      status: 'completed'
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().completedAt).toBeTruthy()
    const detail = await inject('GET', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken)
    expect(detail.json().history.some((item: any) => item.action === 'status.completed')).toBe(true)
    const children = await prisma.businessRecord.findMany({ where: { parentRecordId: recordId } })
    expect(children).toHaveLength(1)
    expect(children[0].recurrenceRule).toBe('monthly')
    expect(children[0].status).toBe('open')
    expect((await inject('PATCH', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken, {
      status: 'completed'
    })).statusCode).toBe(200)
    expect(await prisma.businessRecord.count({ where: { parentRecordId: recordId } })).toBe(1)
  })

  it('returns workspace summary and archives records softly', async () => {
    const summary = await inject('GET', `/workspaces/${workspaceId}/tracker/summary`, ownerToken)
    expect(summary.statusCode).toBe(200)
    expect(summary.json().nextThirtyDays).toBeDefined()

    expect((await inject('DELETE', `/workspaces/${workspaceId}/records/${recordId}`, ownerToken)).statusCode).toBe(200)
    const list = await inject('GET', `/workspaces/${workspaceId}/records`, ownerToken)
    expect(list.json().records.some((record: any) => record.id === recordId)).toBe(false)
  })
})

/*
 * ÜRÜN SAHİBİNİN BİLDİRDİĞİ EKSİKLER (23.08.2026).
 *
 * Dördü de e-Fatura yüklendikten SONRA ortaya çıktı; kayıt oluşuyordu
 * ama kullanıcı ne olduğunu göremiyordu. Buradaki testler o davranışları
 * koruyor.
 */
describe('Geçmiş vade ve yön bekleyenler', () => {
  /*
   * 🔴 `overdue` SUNUCUDA hesaplanıyor.
   *
   * e-Fatura yüklenince kayıt faturanın KENDİ vadesini alıyor. Eski
   * tarihli bir fatura yüklendiğinde kayıt geçmişe düşüp kullanıcının
   * bakmadığı bir yere sessizce gidiyordu -- "takvime hiç eklenmiyor"
   * diye bildirildi; ölçüldüğünde kayıt aslında takvimdeydi, ama 2009'da.
   */
  it('vadesi geçmiş kayıt overdue olarak işaretlenir', async () => {
    const olustur = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment',
      title: 'Eski tarihli fatura',
      direction: 'payable',
      amount: 500,
      currency: 'TRY',
      dueAt: new Date('2009-01-20T00:00:00.000Z').toISOString()
    })
    expect(olustur.statusCode).toBe(201)
    expect(olustur.json().overdue).toBe(true)

    const detay = await inject('GET', `/workspaces/${workspaceId}/records/${olustur.json().id}`, ownerToken)
    expect(detay.json().overdue).toBe(true)
  })

  it('geleceğe dönük kayıt overdue değildir', async () => {
    const olustur = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment',
      title: 'Gelecek vadeli',
      direction: 'payable',
      amount: 100,
      currency: 'TRY',
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString()
    })
    expect(olustur.json().overdue).toBe(false)
  })

  it('vadesiz kayıt overdue değildir', async () => {
    const olustur = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'task', title: 'Vadesiz görev', direction: 'neutral'
    })
    expect(olustur.json().overdue).toBe(false)
  })

  /*
   * 🔴 EN ÖNEMLİSİ. `payable`/`receivable` toplamları yalnız yönü BELLİ
   * kayıtları sayıyor. Yönü belirsiz bir e-Fatura hiçbir toplama
   * girmiyor ve ekranda HİÇ görünmüyordu. Artık kendi sayacı var.
   */
  it('yönü belirsiz tutarlı kayıt awaitingDirection içinde sayılır', async () => {
    await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment',
      title: 'Yönü belirsiz fatura',
      direction: 'neutral',
      amount: 1234.5,
      currency: 'TRY'
    })

    const ozet = await inject('GET', `/workspaces/${workspaceId}/tracker/summary`, ownerToken)
    expect(ozet.statusCode).toBe(200)
    const g = ozet.json()
    expect(g.awaitingDirection.count).toBeGreaterThan(0)
    expect(g.awaitingDirection.amount).toBeGreaterThanOrEqual(1234.5)
  })

  /* Tutarsız kayıt sayılmıyor: "yön bekliyor ₺0" bilgi taşımaz. */
  it('tutarsız belirsiz kayıt awaitingDirection tutarını şişirmez', async () => {
    const once = (await inject('GET', `/workspaces/${workspaceId}/tracker/summary`, ownerToken)).json()
    await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'task', title: 'Tutarsız belirsiz', direction: 'neutral'
    })
    const sonra = (await inject('GET', `/workspaces/${workspaceId}/tracker/summary`, ownerToken)).json()
    expect(sonra.awaitingDirection.amount).toBe(once.awaitingDirection.amount)
  })

  /*
   * Detay yanıtı belgenin TAMAMINI taşımamalı: `extractedText` belge
   * başına 100.000 karaktere kadar çıkabiliyor ve detay ekranı onu hiç
   * göstermiyor.
   */
  it('detay yanıtı belgenin ham metnini taşımaz', async () => {
    /* Kendi kaydını kuruyor: paylaşılan `recordId` başka testlerde
       silinebiliyor ve test o yüzden 404 alıyordu. */
    const kayit = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment', title: 'Belgeli kayıt', direction: 'payable', amount: 10, currency: 'TRY'
    })
    expect(kayit.statusCode).toBe(201)
    const bagla = await inject('POST', `/workspaces/${workspaceId}/records/${kayit.json().id}/documents/${documentId}`, ownerToken)
    expect(bagla.statusCode).toBeLessThan(300)

    const detay = await inject('GET', `/workspaces/${workspaceId}/records/${kayit.json().id}`, ownerToken)
    expect(detay.statusCode).toBe(200)
    /* Boş dizide döngü çalışmaz; testin gerçekten bir şey denediğinden
       emin olmak için ek sayısı da doğrulanıyor. */
    expect(detay.json().documents.length).toBeGreaterThan(0)
    for (const bag of detay.json().documents || []) {
      expect(bag.document.extractedText).toBeUndefined()
      /* `analysis` GEREKLİ: e-Faturanın yapılandırılmış hâli orada. */
      expect(bag.document).toHaveProperty('analysis')
    }
  })
})
