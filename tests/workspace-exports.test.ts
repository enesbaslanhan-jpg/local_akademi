import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
let app: FastifyInstance
let ownerId: number
let viewerId: number
let outsiderId: number
let ownerToken: string
let viewerToken: string
let outsiderToken: string
let workspaceId: string
let otherWorkspaceId: string

function inject(url: string, token?: string) {
  return app.inject({
    method: 'GET',
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  })
}

beforeAll(async () => {
  app = Fastify()
  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })
  const { workspaceExportRoutes } = await import('../src/services/workspace-exports')
  await app.register(workspaceExportRoutes, { prefix: '/workspaces', prisma })
  await app.ready()

  const stamp = Date.now()
  const [owner, viewer, outsider] = await Promise.all([
    prisma.user.create({ data: { email: `exp-owner-${stamp}@test.local`, password: 'hash', name: 'Şeyma Owner' } }),
    prisma.user.create({ data: { email: `exp-viewer-${stamp}@test.local`, password: 'hash', name: 'Viewer' } }),
    prisma.user.create({ data: { email: `exp-out-${stamp}@test.local`, password: 'hash', name: 'Outsider' } })
  ])
  ownerId = owner.id
  viewerId = viewer.id
  outsiderId = outsider.id
  ownerToken = app.jwt.sign({ id: ownerId, email: owner.email, name: owner.name })
  viewerToken = app.jwt.sign({ id: viewerId, email: viewer.email, name: viewer.name })
  outsiderToken = app.jwt.sign({ id: outsiderId, email: outsider.email, name: outsider.name })

  const [ws, otherWs] = await Promise.all([
    prisma.businessWorkspace.create({ data: { name: 'Şişli Ticaret', createdById: ownerId, currency: 'TRY' } }),
    prisma.businessWorkspace.create({ data: { name: 'Diğer İşletme', createdById: outsiderId } })
  ])
  workspaceId = ws.id
  otherWorkspaceId = otherWs.id

  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: ownerId, role: 'owner' },
      { workspaceId, userId: viewerId, role: 'viewer' },
      { workspaceId: otherWorkspaceId, userId: outsiderId, role: 'owner' }
    ]
  })

  const contact = await prisma.businessContact.create({
    data: { workspaceId, name: 'Çağrı Tedarik A.Ş.', createdById: ownerId }
  })

  await prisma.businessRecord.createMany({
    data: [
      {
        workspaceId, type: 'payment', direction: 'payable', title: 'Kırtasiye ödemesi',
        amount: '1234.56', currency: 'TRY', status: 'open', createdById: ownerId,
        contactId: contact.id, dueAt: new Date(Date.now() + 5 * 86400000)
      },
      {
        workspaceId, type: 'receivable', direction: 'receivable', title: 'Müşteri tahsilatı',
        amount: '5000.00', currency: 'TRY', status: 'open', createdById: ownerId,
        dueAt: new Date(Date.now() + 10 * 86400000)
      },
      {
        workspaceId, type: 'shipment', direction: 'neutral', title: 'Arşivlenmiş kayıt',
        amount: '99.00', currency: 'TRY', status: 'open', createdById: ownerId,
        archivedAt: new Date()
      },
      {
        workspaceId: otherWorkspaceId, type: 'payment', direction: 'payable',
        title: 'SIZMAMASI GEREKEN KAYIT', amount: '777.00', currency: 'TRY',
        status: 'open', createdById: outsiderId
      }
    ]
  })
})

afterAll(async () => {
  await prisma.generatedReport.deleteMany({ where: { userId: { in: [ownerId, viewerId, outsiderId] } } })
  await prisma.businessRecord.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } })
  await prisma.businessContact.deleteMany({ where: { workspaceId } })
  await prisma.businessMember.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } })
  await prisma.businessWorkspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, viewerId, outsiderId] } } })
  await prisma.$disconnect()
  await app.close()
})

describe('GET /workspaces/:id/exports/records.:fmt', () => {
  it('CSV üretir ve doğru MIME + dosya adı gönderir', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toContain('attachment')
    /* Dosya adı ASCII'ye indirgenmeli: Content-Disposition latin1 taşır. */
    expect(res.headers['content-disposition']).toContain('Sisli-Ticaret-kayitlar-')
    expect(res.body).toContain('Kırtasiye ödemesi')
    expect(res.body).toContain('Çağrı Tedarik A.Ş.')
    expect(res.body).toContain('1234,56')
  })

  it('arşivlenmiş kaydı dışarıda bırakır', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, ownerToken)
    expect(res.body).not.toContain('Arşivlenmiş kayıt')
  })

  it('başka workspace verisini SIZDIRMAZ', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, ownerToken)
    expect(res.body).not.toContain('SIZMAMASI GEREKEN KAYIT')
  })

  it('satır sayısını başlıkta bildirir', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, ownerToken)
    expect(res.headers['x-export-row-count']).toBe('2')
    expect(res.headers['x-export-truncated']).toBe('false')
  })

  it('XLSX üretir — gerçek zip, doğru MIME', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.xlsx`, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(res.rawPayload.subarray(0, 2).toString('latin1')).toBe('PK')
  })

  it('PDF üretir — gerçek PDF, Türkçe font gömülü', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.pdf`, ownerToken)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(res.rawPayload.toString('latin1')).toContain('DejaVuSans')
  })

  it('filtre uygular', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv?type=receivable`, ownerToken)
    expect(res.body).toContain('Müşteri tahsilatı')
    expect(res.body).not.toContain('Kırtasiye ödemesi')
    expect(res.headers['x-export-row-count']).toBe('1')
  })

  it('viewer rolü de dışa aktarabilir — okuma tüm rollere açık', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, viewerToken)
    expect(res.statusCode).toBe(200)
  })

  it('üye olmayana 403 döner', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`, outsiderToken)
    expect(res.statusCode).toBe(403)
  })

  it('başka workspace id ile denemede 403 döner', async () => {
    const res = await inject(`/workspaces/${otherWorkspaceId}/exports/records.csv`, ownerToken)
    expect(res.statusCode).toBe(403)
  })

  it('token olmadan 401 döner', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv`)
    expect(res.statusCode).toBe(401)
  })

  it('desteklenmeyen biçimde 422 döner', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.docx`, ownerToken)
    expect(res.statusCode).toBe(422)
  })

  it('geçersiz filtrede 422 döner', async () => {
    const res = await inject(`/workspaces/${workspaceId}/exports/records.csv?status=uydurma`, ownerToken)
    expect(res.statusCode).toBe(422)
  })

  it('denetim kaydı yazar', async () => {
    await inject(`/workspaces/${workspaceId}/exports/records.xlsx`, ownerToken)
    const audit = await prisma.generatedReport.findFirst({
      where: { userId: ownerId, reportType: `workspace_records_export:${workspaceId}`, format: 'xlsx' },
      orderBy: { createdAt: 'desc' }
    })
    expect(audit).not.toBeNull()
    expect(audit!.title).toContain('Şişli Ticaret')
  })
})

/*
 * TEK KAYDIN PDF'İ.
 *
 * NEDEN AYRI UÇ: toplu dışa aktarım ekrandaki filtreye uyan BÜTÜN
 * kayıtları tek belgeye koyuyor. Ürün sahibinin ihtiyacı başkaydı --
 * tek bir kaydı (çoğunlukla bir e-Faturayı) muhasebeciye göndermek.
 * Toplu belgeden tek kaydı ayıklamak kullanıcının işi olmamalı.
 */
describe('GET /workspaces/:id/records/:recordId/export.pdf', () => {
  /*
   * ⚠️ `archivedAt: null` ŞART. Veri kümesinde bilerek arşivlenmiş bir
   * kayıt var; onsuz `findFirst` bazen onu döndürüyor ve testler
   * ARALIKLI olarak 404 alıyordu. Uç doğru davranıyordu -- yanlış olan
   * testin kendisiydi.
   */
  async function ilkKayit(wsId: string) {
    const r = await prisma.businessRecord.findFirst({
      where: { workspaceId: wsId, archivedAt: null },
      orderBy: { createdAt: 'asc' }
    })
    if (!r) throw new Error('test verisi yok')
    return r
  }

  /* Arşivlenmiş kaydın dışa aktarılamaması bir DAVRANIŞ; yukarıdaki
     hatanın ortaya çıkardığı bu kuralı ayrıca koruyoruz. */
  it('arşivlenmiş kayıt indirilemez', async () => {
    const arsiv = await prisma.businessRecord.findFirst({
      where: { workspaceId, archivedAt: { not: null } }
    })
    expect(arsiv).not.toBeNull()
    const res = await inject(`/workspaces/${workspaceId}/records/${arsiv!.id}/export.pdf`, ownerToken)
    expect(res.statusCode).toBe(404)
  })

  it('geçerli PDF döndürür', async () => {
    const kayit = await ilkKayit(workspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`, ownerToken)

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    /* Boş bir PDF döndürmek sessiz bir hata olurdu; imza kontrol ediliyor. */
    expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(res.rawPayload.length).toBeGreaterThan(1000)
  })

  it('dosya adı kaydın başlığından türer', async () => {
    const kayit = await ilkKayit(workspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`, ownerToken)
    expect(res.headers['content-disposition']).toContain('.pdf')
    /* Türkçe/özel karakter dosya adında kalmamalı. */
    expect(res.headers['content-disposition']).toMatch(/filename="[A-Za-z0-9._-]+"/)
  })

  /*
   * 🔴 BOLA. Geçerli bir üyeliği olan kullanıcı, BAŞKA çalışma alanının
   * kayıt kimliğini yazarak o kaydın PDF'ini indirebilmemeli. Sorgu
   * `workspaceId`i koşula dahil ediyor; yalnız `id` ile aransaydı bu
   * sızıntı açık olurdu.
   */
  it('başka çalışma alanının kaydı bu uçtan alınamaz', async () => {
    const yabanci = await ilkKayit(otherWorkspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${yabanci.id}/export.pdf`, ownerToken)
    expect(res.statusCode).toBe(404)
  })

  it('üye olmayan kullanıcı erişemez', async () => {
    const kayit = await ilkKayit(workspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`, outsiderToken)
    expect(res.statusCode).toBe(403)
  })

  it('kimliksiz istek reddedilir', async () => {
    const kayit = await ilkKayit(workspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`)
    expect(res.statusCode).toBe(401)
  })

  /* Okuma yetkisi olan görüntüleyici de indirebilmeli: PDF salt okuma. */
  it('görüntüleyici rolü de indirebilir', async () => {
    const kayit = await ilkKayit(workspaceId)
    const res = await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`, viewerToken)
    expect(res.statusCode).toBe(200)
  })

  it('olmayan kayıt 404 döner', async () => {
    const res = await inject(
      `/workspaces/${workspaceId}/records/00000000-0000-4000-8000-000000000000/export.pdf`,
      ownerToken
    )
    expect(res.statusCode).toBe(404)
  })

  it('denetim kaydı yazılır', async () => {
    const kayit = await ilkKayit(workspaceId)
    await inject(`/workspaces/${workspaceId}/records/${kayit.id}/export.pdf`, ownerToken)
    const audit = await prisma.generatedReport.findFirst({
      where: { userId: ownerId, reportType: `workspace_record_export:${workspaceId}` },
      orderBy: { createdAt: 'desc' }
    })
    expect(audit).not.toBeNull()
    expect(audit!.format).toBe('pdf')
  })
})
