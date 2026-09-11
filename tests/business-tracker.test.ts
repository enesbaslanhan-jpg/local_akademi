import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

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

/* İçe aktarım testlerinin disk/belge artıkları -- afterAll temizliyor. */
const icAktarmaDosyalari: string[] = []
const icAktarmaBelgeleri: string[] = []

const IC_AKTARMA_ESLEME = { type: 'tur', title: 'baslik', direction: 'yon', amount: 'tutar', dueAt: 'vade', contactId: 'cari' }

/*
 * İçe aktarım ucu dosyayı DISKTEN okuduğu için test de gerçek bir CSV
 * yazıyor ve `uploadedDocument` kaydını ona bağlıyor.
 * `extractedText` bilerek boş/kısa bırakılabiliyor: uç `extractedText`
 * okuyorsa test bunu YUTMAYACAK (bkz. uzun CSV testi).
 */
async function csvDosyasiHazirla(ad: string, icerik: string): Promise<string> {
  const storedName = `${randomUUID()}.csv`
  await mkdir(join(process.cwd(), 'uploads'), { recursive: true })
  await writeFile(join(process.cwd(), 'uploads', storedName), icerik, 'utf8')
  icAktarmaDosyalari.push(storedName)
  const doc = await prisma.uploadedDocument.create({
    data: {
      userId: ownerId,
      originalName: ad,
      storedName,
      mimeType: 'text/csv',
      sizeBytes: Buffer.byteLength(icerik),
      extractedText: '',
      status: 'analyzed',
      workspaceId
    }
  })
  icAktarmaBelgeleri.push(doc.id)
  return doc.id
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
  const workspaceIds = [workspaceId, otherWorkspaceId].filter(Boolean)
  /* İçe aktarım testlerinin diske yazdığı geçici CSV'ler. */
  for (const storedName of icAktarmaDosyalari) {
    await unlink(join(process.cwd(), 'uploads', storedName)).catch(() => {})
  }
  await prisma.uploadedDocument.deleteMany({ where: { id: { in: icAktarmaBelgeleri } } }).catch(() => {})
  await prisma.documentConversation.deleteMany({ where: { documentId } }).catch(() => {})
  await prisma.businessRecordDocument.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.businessReminder.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.businessNotification.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.businessRecordHistory.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.businessRecord.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.businessContact.deleteMany({ where: { workspaceId: { in: workspaceIds } } }).catch(() => {})
  await prisma.uploadedDocument.deleteMany({ where: { id: documentId } }).catch(() => {})
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, viewerId] } } }).catch(() => {})
  await app.close()
  await prisma.$disconnect()
})

describe('Business tracker API', () => {
  it('scopes decision follow-ups to the selected workspace and preserves outcome notes', async () => {
    const sessionId = randomUUID()
    const created = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'task', title: 'Decision follow-up', metadata: { decisionSessionId: sessionId, decisionFollowUp: { expectedOutcome: 'Ten interviews' } }
    })
    expect(created.statusCode).toBe(201)
    const record = created.json()
    try {
      const list = await inject('GET', `/workspaces/${workspaceId}/records?decisionSessionId=${sessionId}`, ownerToken)
      expect(list.json().records.map((r: any) => r.id)).toEqual([record.id])
      const unrelated = await inject('GET', `/workspaces/${workspaceId}/records?decisionSessionId=${randomUUID()}`, ownerToken)
      expect(unrelated.json().total).toBe(0)
      expect((await inject('GET', `/workspaces/${otherWorkspaceId}/records?decisionSessionId=${sessionId}`, ownerToken)).statusCode).toBe(403)
      expect((await inject('GET', `/workspaces/${workspaceId}/records?decisionSessionId=invalid`, ownerToken)).statusCode).toBe(422)
      expect((await inject('PATCH', `/workspaces/${workspaceId}/records/${record.id}`, viewerToken, { status: 'completed' })).statusCode).toBe(403)
      const updated = await inject('PATCH', `/workspaces/${workspaceId}/records/${record.id}`, ownerToken, {
        status: 'completed', metadata: { ...record.metadata, decisionFollowUp: { ...record.metadata.decisionFollowUp, actualOutcome: 'Eight interviews' } }
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json().metadata.decisionFollowUp).toEqual({ expectedOutcome: 'Ten interviews', actualOutcome: 'Eight interviews' })
      expect(updated.json().completedAt).toBeTruthy()
    } finally {
      await inject('DELETE', `/workspaces/${workspaceId}/records/${record.id}`, ownerToken)
    }
  })
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
    const marker = randomUUID()
    const [own, privateRecord] = await Promise.all([
      prisma.businessRecord.create({
        data: { workspaceId, type: 'task', title: `Workspace record ${marker}`, createdById: ownerId }
      }),
      prisma.businessRecord.create({
        data: { workspaceId: otherWorkspaceId, type: 'task', title: `Private record ${marker}`, createdById: otherId }
      })
    ])
    try {
      const response = await inject('GET', `/workspaces/${workspaceId}/records`, ownerToken)
      expect(response.statusCode).toBe(200)
      const titles = response.json().records.map((record: any) => record.title)
      expect(titles).toContain(own.title)
      expect(titles).not.toContain(privateRecord.title)
    } finally {
      await prisma.businessRecord.deleteMany({ where: { id: { in: [own.id, privateRecord.id] } } })
    }
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

  /*
   * 🔴 EKLEME VARDI, KALDIRMA YOKTU. Yanlis belgeyi bir kayda baglayan
   * kullanicinin bunu geri almasinin hicbir yolu yoktu.
   *
   * ⚠️ Yalniz BAG kopuyor, BELGE duruyor: belge calisma alaninda kalmali
   * ve baska kayitlarda kullanilabilmeli.
   */
  it('detaches a document from a record without deleting the document', async () => {
    const bagliMi = () => prisma.businessRecordDocument.count({
      where: { recordId, documentId }
    })
    expect(await bagliMi()).toBe(1)

    /* Baska calisma alanindan kopariliamaz. */
    expect(
      (await inject('DELETE', `/workspaces/${otherWorkspaceId}/records/${recordId}/documents/${documentId}`, otherToken)).statusCode
    ).toBe(404)
    expect(await bagliMi()).toBe(1)

    /* Salt okuyan uye kopariliamaz. */
    expect(
      (await inject('DELETE', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, viewerToken)).statusCode
    ).toBe(403)
    expect(await bagliMi()).toBe(1)

    const kopar = await inject('DELETE', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, ownerToken)
    expect(kopar.statusCode).toBe(204)
    expect(await bagliMi()).toBe(0)

    /* Belge SILINMEDI ve calisma alanindan da dusmedi. */
    const belge = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    expect(belge?.archivedAt ?? null).toBeNull()
    expect(belge?.workspaceId).toBe(workspaceId)

    /* Olmayan bagi koparmak 404. */
    expect(
      (await inject('DELETE', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, ownerToken)).statusCode
    ).toBe(404)

    /* Sonraki testler bagli belge bekliyor: geri baglaniyor. */
    expect(
      (await inject('POST', `/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, ownerToken)).statusCode
    ).toBe(201)
  })

  /*
   * 🔴 "BUGÜN NE DURUMDAYIM?" ARTIK TUTAR SÖYLÜYOR.
   *
   * Ürün sahibi adetlerin anlamsız olduğunu söyledi (11.09.2026): "3
   * geciken" karar verdirmez, "₺18.400 gecikmiş" verdirir. Geciken bu
   * haftaya GİRMİYOR; ikisini toplamak gecikeni saklardı.
   */
  it('özet bu hafta ve geciken tutarlarını ayrı veriyor, kasa yoksa null', async () => {
    const gun = 86400000
    const ws = await prisma.businessWorkspace.create({
      data: { name: 'Özet Testi', status: 'active', createdById: ownerId,
        members: { create: { userId: ownerId, role: 'owner', status: 'active' } } }
    })
    const kayitlar = [
      { direction: 'payable', amount: 1000, dueAt: new Date(Date.now() + 2 * gun) },
      { direction: 'payable', amount: 500, dueAt: new Date(Date.now() + 6 * gun) },
      { direction: 'receivable', amount: 300, dueAt: new Date(Date.now() + 3 * gun) },
      /* Geciken: haftaya girmemeli. */
      { direction: 'payable', amount: 7000, dueAt: new Date(Date.now() - 2 * gun) },
      /* 7 günden sonrası: haftaya girmemeli. */
      { direction: 'payable', amount: 9999, dueAt: new Date(Date.now() + 20 * gun) }
    ]
    for (const k of kayitlar) {
      await prisma.businessRecord.create({
        data: { workspaceId: ws.id, type: 'payment', title: 'k', status: 'open',
          currency: 'TRY', createdById: ownerId, ...k }
      })
    }
    const res = await inject('GET', `/workspaces/${ws.id}/tracker/summary`, ownerToken)
    expect(res.statusCode).toBe(200)
    const ozet = res.json()
    expect(ozet.thisWeek.payable).toBe(1500)
    expect(ozet.thisWeek.payableCount).toBe(2)
    expect(ozet.thisWeek.receivable).toBe(300)
    expect(ozet.overdueTotals.amount).toBe(7000)
    expect(ozet.overdueTotals.count).toBe(1)
    /* Hesap yoksa sıfır değil null: sıfır "kasa boş" demek olurdu. */
    expect(ozet.cash).toBeNull()
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
  /*
   * 🔴 ÖDENMİŞ BELGE AÇIK BORÇ OLARAK AÇILMAMALI.
   *
   * Dekont ve fiş zaten yapılmış ödemelerdir. Öneri 'completed'
   * durumunda geldiğinde kayıt da tamamlanmış doğmalı; aksi hâlde
   * kullanıcı ödediği parayı ana sayfada bir daha borç olarak görür.
   */
  it('geçmiş işlem önerisi tamamlanmış kayıt açıyor', async () => {
    const oneri = await prisma.documentSuggestion.create({
      data: {
        workspaceId,
        documentId,
        suggestionType: 'business_record',
        confidence: 0.6,
        status: 'proposed',
        evidence: JSON.stringify(['Tutar: 3.250,00 TL']),
        payload: JSON.stringify({
          status: 'completed',
          type: 'payment',
          title: 'Havale dekontu',
          direction: 'payable',
          amount: 3250,
          currency: 'TRY',
          dueAt: null,
          priority: 'normal'
        })
      }
    })

    const kabul = await inject('POST', `/workspaces/${workspaceId}/document-suggestions/${oneri.id}/accept`, ownerToken, {})
    expect(kabul.statusCode).toBe(201)
    expect(kabul.json().status).toBe('completed')

    /* Tarih de tutarlı kurulmalı: "tamamlandı" deyip tamamlanma
       tarihini boş bırakmak raporları bozardı. */
    const kayit = await prisma.businessRecord.findUnique({ where: { id: kabul.json().id } })
    expect(kayit?.completedAt).not.toBeNull()
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

/*
 * TOPLU İÇE AKTARIM.
 *
 * Bu üç test önceki turun üç açıkını koruyor: satır sınırı yoktu,
 * cari yetki kontrolü atlanıyordu (BOLA), büyük CSV `extractedText`
 * kırpılmasına takılıp sessizce satır yutuyordu. Diş kontrolleri
 * sırasıyla: sınır sabiti / referans doğrulaması çağrısı / diskten
 * okuma geri alınınca İLGİLİ TEST düşer (raporda tek tek listeli).
 */
describe('Toplu içe aktarım', () => {
  it('sınırın üstündeki dosya 422 alır ve hiç kayıt yazmaz', async () => {
    const satirlar = ['tur,baslik,yon,tutar']
    for (let i = 0; i < 5001; i++) satirlar.push(`payment,Sınır satırı ${i},payable,10`)
    const fileId = await csvDosyasiHazirla('sinir-ustu.csv', satirlar.join('\n'))

    const once = await prisma.businessRecord.count({ where: { workspaceId } })

    /* Önizleme de onay da reddedilir -- sınır, yazma aşamasından ÖNCE. */
    const onizleme = await inject('POST', `/workspaces/${workspaceId}/records/import`, ownerToken, {
      fileId, columnMapping: IC_AKTARMA_ESLEME, previewOnly: true
    })
    expect(onizleme.statusCode).toBe(422)
    expect(onizleme.json().error).toContain('5000')

    const onay = await inject('POST', `/workspaces/${workspaceId}/records/import`, ownerToken, {
      fileId, columnMapping: IC_AKTARMA_ESLEME, previewOnly: false
    })
    expect(onay.statusCode).toBe(422)

    expect(await prisma.businessRecord.count({ where: { workspaceId } })).toBe(once)
  }, 30000)

  it('başka çalışma alanının carisiyle gelen satır reddedilir, kalanlar içeri girer', async () => {
    const yabanciCari = await prisma.businessContact.create({
      data: { workspaceId: otherWorkspaceId, name: 'Yabancı Cari', createdById: otherId }
    })
    const fileId = await csvDosyasiHazirla('carili.csv', [
      'tur,baslik,yon,tutar,cari',
      `payment,Yabancılı satır,payable,50,${yabanciCari.id}`,
      'payment,Temiz satır,payable,75,'
    ].join('\n'))

    const once = await prisma.businessRecord.count({ where: { workspaceId } })
    const res = await inject('POST', `/workspaces/${workspaceId}/records/import`, ownerToken, {
      fileId, columnMapping: IC_AKTARMA_ESLEME, previewOnly: false
    })
    expect(res.statusCode).toBe(200)

    /* Kötü satır atlandı ama isteği düşürmedi; iyi satır içeri girdi. */
    expect(res.json().imported).toBe(1)
    expect(res.json().failed).toBe(0)
    const hata = (res.json().errors || []).find((e: any) => e.row === 1)
    expect(hata?.field).toBe('contactId')

    /* Veritabanında yabancı cariye bağlanan kayıt YOK -- BOLA kapandı. */
    expect(await prisma.businessRecord.count({ where: { workspaceId, contactId: yabanciCari.id } })).toBe(0)
    expect(await prisma.businessRecord.count({ where: { workspaceId } })).toBe(once + 1)
  }, 30000)

  it('100.000 karakterden uzun CSVnin tüm satırları okunur', async () => {
    const TOPLAM = 1500
    const satirlar = ['tur,baslik,yon,tutar']
    for (let i = 0; i < TOPLAM; i++) {
      satirlar.push(`payment,Uzun dosya satiri ${i} basligi kisa kesilmesin diye bilerek uzatilmis alan,payable,12`)
    }
    const icerik = satirlar.join('\n')
    /* Testin gerçekten kırpılma senaryosunu kurduğundan emin olunuyor:
       yükleme hattının 100.000 karakter sınırının ÜSTÜNDE. */
    expect(icerik.length).toBeGreaterThan(100_000)

    const fileId = await csvDosyasiHazirla('uzun.csv', icerik)
    /* extractedText'e yalnız ilk 10 satır konuyor: uç diskten okumazsa
       imported tam olarak 10 çıkar ve test düşer. */
    await prisma.uploadedDocument.update({
      where: { id: fileId },
      data: { extractedText: satirlar.slice(0, 11).join('\n') }
    })

    const once = await prisma.businessRecord.count({ where: { workspaceId } })
    const res = await inject('POST', `/workspaces/${workspaceId}/records/import`, ownerToken, {
      fileId, columnMapping: IC_AKTARMA_ESLEME, previewOnly: false
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().imported).toBe(TOPLAM)
    expect(await prisma.businessRecord.count({ where: { workspaceId } })).toBe(once + TOPLAM)
  }, 60000)
})

/*
 * Düzenlemenin iki koruması: vade değişince hatırlatmanın taşınması
 * (taşınmazsa kullanıcı uyarıyı ESKİ günde alır) ve kaydın başka
 * çalışma alanından düzenlenememesi/silememesi (IDOR).
 */
describe('Düzenleme: hatırlatma taşıması ve çalışma alanı sınırı', () => {
  it('vade düzenlenince otomatik hatırlatma yeni tarihe taşınır', async () => {
    const eskiVade = new Date(Date.now() + 3 * 86400000)
    const olustur = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'payment', title: 'Hatırlatma taşıma testi', direction: 'payable',
      amount: 10, currency: 'TRY', dueAt: eskiVade.toISOString()
    })
    expect(olustur.statusCode).toBe(201)
    const kayitId = olustur.json().id

    const yeniVade = new Date(Date.now() + 10 * 86400000)
    const duzenle = await inject('PATCH', `/workspaces/${workspaceId}/records/${kayitId}`, ownerToken, {
      dueAt: yeniVade.toISOString()
    })
    expect(duzenle.statusCode).toBe(200)

    /* Yalnız bekleyen OTOMATİK hatırlatmaya bakılıyor; elle kurulanlar
       karışmasın. Bekleyen tam BİR tane var ve anahtarı YENİ vadede. */
    const bekleyenler = await prisma.businessReminder.findMany({
      where: { recordId: kayitId, status: 'pending', dedupeKey: { startsWith: `auto:${kayitId}:` } }
    })
    expect(bekleyenler).toHaveLength(1)
    expect(bekleyenler[0].dedupeKey).toContain(new Date(yeniVade.toISOString()).toISOString())
    expect(bekleyenler[0].dedupeKey).not.toContain(eskiVade.toISOString())
  }, 30000)

  it('başka çalışma alanının kaydı düzenlenemez ve silinemez', async () => {
    const olustur = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'task', title: 'Korumalı kayıt'
    })
    expect(olustur.statusCode).toBe(201)
    const kayitId = olustur.json().id

    /* otherToken kullanıcısı otherWorkspace'in SAHİBİ: erişim ucu geçer,
       kayıt kapsamı (scopedRecord) engellemeli -- 404. */
    expect((await inject('PATCH', `/workspaces/${otherWorkspaceId}/records/${kayitId}`, otherToken, {
      title: 'ele geçirildi'
    })).statusCode).toBe(404)
    expect((await inject('DELETE', `/workspaces/${otherWorkspaceId}/records/${kayitId}`, otherToken)).statusCode).toBe(404)

    /* Gerçekten değişmediğini ve silinmediğini veritabanı söylüyor. */
    const detay = await inject('GET', `/workspaces/${workspaceId}/records/${kayitId}`, ownerToken)
    expect(detay.statusCode).toBe(200)
    expect(detay.json().title).toBe('Korumalı kayıt')
  }, 30000)
})

/*
 * Mentor bağlamı — özet GİDER, kimlik GİTMEZ (ürün kararı).
 * Dışarıya (Mistral AI) aktarılan veri asgaride kalmalı; başlık veya
 * müşteri adı isteme sızarsa bu test onu yakalar.
 *
 * Kendi çalışma alanını kuruyor: paylaşılan alanda diğer testlerin
 * kayıtları toplamlara karışır ve sayı iddiası sıra bağımlısı olur.
 */
describe('Mentor işletme özeti', () => {
  it('isteme kayıt başlığı sızmaz, sayılar ise gerçekten gider', async () => {
    const damga = Date.now()
    const yalnizKullanici = await prisma.user.create({
      data: { email: `mentor-ozet-${damga}@test.local`, password: 'hash', name: 'Özet Sahibi' }
    })
    const yalnizAlan = await prisma.businessWorkspace.create({
      data: { name: 'Özet Yalnız Alan', createdById: yalnizKullanici.id }
    })
    await prisma.businessMember.create({
      data: { workspaceId: yalnizAlan.id, userId: yalnizKullanici.id, role: 'owner' }
    })
    await prisma.businessRecord.create({
      data: {
        workspaceId: yalnizAlan.id, type: 'payment', status: 'open',
        title: 'GIZLI Musteri Kira Sozlesmesi XYZ',
        direction: 'payable', amount: 777.55, currency: 'TRY',
        dueAt: new Date(Date.now() - 86400000), createdById: yalnizKullanici.id
      }
    })

    try {
      const { resolveContext } = await import('../src/services/mentor-context.js')
      const sonuc = await resolveContext(
        { contextType: 'workspace_tracker', entityId: yalnizAlan.id },
        yalnizKullanici.id
      )
      expect(sonuc.valid).toBe(true)

      const metin = sonuc.systemPromptAdditions || ''
      /* Kimlik sızması YOK. */
      expect(metin).not.toContain('GIZLI')
      expect(metin).not.toContain('Sozlesmesi')
      /* Sayılar boş şablonla değil, GERÇEK hesapla gidiyor:
         alanın TEK kaydı 777,55 TL -- toplam da tam olarak o. */
      expect(metin).toContain('777,55')
      expect(metin).toContain('- Açık kayıt: 1')
      expect(metin).toContain('- Vadesi geçmiş: 1')
    } finally {
      await prisma.businessRecord.deleteMany({ where: { workspaceId: yalnizAlan.id } }).catch(() => {})
      await prisma.businessMember.deleteMany({ where: { workspaceId: yalnizAlan.id } }).catch(() => {})
      await prisma.businessWorkspace.delete({ where: { id: yalnizAlan.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: yalnizKullanici.id } }).catch(() => {})
    }
  })

  /*
   * YÖNETİCİ ANALİZİ.
   *
   * 🔴 En kritik iddia: "karar başarısı" ORANI YOK ve olmamalı.
   * Beklenen/gerçekleşen serbest metin; farkı programla ölçülemez.
   * Uydurma bir yüzde, yöneticinin ona bakıp karar vermesi demek.
   */
  it('yönetici analizi görev tamamlamayı kişi kişi veriyor', async () => {
    const gorev = await inject('POST', `/workspaces/${workspaceId}/records`, ownerToken, {
      type: 'task', title: 'Analiz görevi', direction: 'neutral',
      assignedToId: viewerId, dueAt: new Date(Date.now() + 86400000).toISOString()
    })
    expect(gorev.statusCode).toBe(201)

    const response = await inject('GET', `/workspaces/${workspaceId}/tracker/analysis`, ownerToken)
    expect(response.statusCode).toBe(200)
    const govde = response.json()
    const satir = govde.gorevler.kisiler.find((kisi: any) => kisi.userId === viewerId)
    expect(satir, 'sorumluya ait satır yok').toBeTruthy()
    expect(satir.toplam).toBeGreaterThanOrEqual(1)
  })

  it('uydurma bir karar başarısı oranı üretmiyor', async () => {
    const govde = (await inject('GET', `/workspaces/${workspaceId}/tracker/analysis`, ownerToken)).json()
    /* Ölçülebilen: takip edilmiş mi. Ölçülemeyen: başarılı mı. */
    expect(govde.kararlar).toHaveProperty('takipEdilen')
    expect(govde.kararlar).not.toHaveProperty('basariOrani')
    expect(govde.kararlar).not.toHaveProperty('successRate')
  })

  it('görüntüleyici kişi kişi tamamlama oranını göremiyor', async () => {
    /* Kişi kişi oran bir performans ölçüsü; ekipteki herkese açık değil. */
    const response = await inject('GET', `/workspaces/${workspaceId}/tracker/analysis`, viewerToken)
    expect(response.statusCode).toBe(403)
  })

  it('başka işletmenin analizini vermiyor', async () => {
    const response = await inject('GET', `/workspaces/${workspaceId}/tracker/analysis`, otherToken)
    expect(response.statusCode).toBe(403)
  })

  /*
   * 🔴 BELGE İNDİRME UCU YOKTU.
   *
   * Esnaf faturasının fotoğrafını yüklüyor, dosya diskte duruyor, ama
   * dışarı çıkaran hiçbir yol yoktu; belge detayı yalnız OCR metnini
   * dönüyordu. Veri içeri girip çıkamıyordu.
   */
  describe('belge indirme', () => {
    it('yüklenen dosyayı olduğu gibi geri veriyor', async () => {
      const icerik = 'satir1;satir2\n'
      const belgeId = await csvDosyasiHazirla('Fatura Özeti.csv', icerik)

      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${belgeId}/download`, ownerToken)
      expect(yanit.statusCode).toBe(200)
      /* Bayt bayt aynı olmalı: sıkıştırma ya da kırpma yok. */
      expect(yanit.body).toBe(icerik)
    })

    it('dosya adı kullanıcının verdiği ad', async () => {
      const belgeId = await csvDosyasiHazirla('Fatura Özeti.csv', 'a;b\n')
      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${belgeId}/download`, ownerToken)
      const baslik = yanit.headers['content-disposition'] as string
      /* `storedName` bir uuid; kullanıcı onu değil kendi adını görmeli. */
      expect(baslik).toContain("filename*=UTF-8''")
      expect(baslik).toContain(encodeURIComponent('Fatura Özeti.csv'))
      expect(baslik.startsWith('attachment;')).toBe(true)
    })

    it('görüntüleyici de indirebiliyor', async () => {
      /* Belgeyi okumak, değiştirmek değil. */
      const belgeId = await csvDosyasiHazirla('Rapor.csv', 'x;y\n')
      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${belgeId}/download`, viewerToken)
      expect(yanit.statusCode).toBe(200)
    })

    it('başka işletmenin belgesini vermiyor', async () => {
      const belgeId = await csvDosyasiHazirla('Gizli.csv', 'gizli\n')
      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${belgeId}/download`, otherToken)
      expect(yanit.statusCode).toBe(403)
    })

    it('olmayan belge için 404', async () => {
      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${randomUUID()}/download`, ownerToken)
      expect(yanit.statusCode).toBe(404)
    })

    it('kayıt var ama dosya diskte yoksa 404, 500 değil', async () => {
      /* Silinmiş ya da taşınmış dosya sunucu arızası değil. */
      const belgeId = await csvDosyasiHazirla('Kayip.csv', 'z\n')
      const belge = await prisma.uploadedDocument.findUnique({
        where: { id: belgeId }, select: { storedName: true }
      })
      await unlink(join(process.cwd(), 'uploads', belge!.storedName))

      const yanit = await inject('GET', `/workspaces/${workspaceId}/documents/${belgeId}/download`, ownerToken)
      expect(yanit.statusCode).toBe(404)
    })
  })
})
