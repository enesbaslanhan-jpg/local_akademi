import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { gelenEpostaRotalari } from '../src/services/gelen-eposta.js'
import { readFileSync } from 'fs'
import { join } from 'path'

/*
 * UCUN KENDİSİ — kayıt koşulu ve anahtar kontrolü.
 *
 * 🔴 EN ÖNEMLİ DAVRANIŞ: `INBOUND_MAIL_SECRET` yoksa uç HİÇ
 * KAYDEDİLMİYOR. "Yapılandırılmamış" durumu, kapının VAR OLMAMASI
 * demek -- 401 dönen ama var olan bir kapı değil. Boş anahtarla açık
 * bırakmak, internete kimliksiz bir belge yükleme kapısı açardı.
 */

const ANAHTAR = 'x'.repeat(48)

async function sunucuKur(anahtar?: string) {
  const onceki = process.env.INBOUND_MAIL_SECRET
  if (anahtar === undefined) delete process.env.INBOUND_MAIL_SECRET
  else process.env.INBOUND_MAIL_SECRET = anahtar

  const app = Fastify({ logger: false })
  await app.register(gelenEpostaRotalari, { prefix: '/inbound' })
  await app.ready()

  if (onceki === undefined) delete process.env.INBOUND_MAIL_SECRET
  else process.env.INBOUND_MAIL_SECRET = onceki
  return app
}

const yuk = {
  inboxKey: 'fatura-' + 'a'.repeat(32),
  from: 'biri@ornek.test',
  dkim: 'pass',
  spf: 'pass',
  ekler: []
}

describe('anahtar yapılandırılmamışsa', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur(undefined) })
  afterAll(async () => { await app.close() })

  it('uç hiç kaydedilmez (404, 401 değil)', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(404)
  })
})

/* Kısa anahtar da yapılandırılmamış sayılıyor: 8 karakterlik bir
   "gizli" değer, gizli değildir. */
describe('anahtar çok kısaysa', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur('kisa') })
  afterAll(async () => { await app.close() })

  it('uç yine kaydedilmez', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(404)
  })
})

describe('anahtar varken', () => {
  let app: FastifyInstance
  beforeAll(async () => { app = await sunucuKur(ANAHTAR) })
  afterAll(async () => { await app.close() })

  it('anahtarsız istek 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/inbound/email', payload: yuk })
    expect(res.statusCode).toBe(401)
  })

  it('yanlış anahtar 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': 'y'.repeat(48) }, payload: yuk
    })
    expect(res.statusCode).toBe(401)
  })

  it('geçersiz yük 422', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': ANAHTAR },
      payload: { inboxKey: 'x' }
    })
    expect(res.statusCode).toBe(422)
  })

  /*
   * Bilinmeyen kutu SESSİZCE atılıyor: 202 dönüyor, 404 değil.
   * Farklı yanıt kodu, adres deneyerek çalışma alanı keşfetmeyi
   * mümkün kılardı.
   */
  it('bilinmeyen kutu 202 döner, 404 değil', async () => {
    const res = await app.inject({
      method: 'POST', url: '/inbound/email',
      headers: { 'x-inbound-secret': ANAHTAR }, payload: yuk
    })
    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).durum).toBe('atildi')
  })
})

/*
 * UÇTAN UCA: e-postayla gelen e-Fatura belgeye dönüşüyor mu.
 *
 * Bu blok kanalın ASIL VAADİNİ test ediyor: kullanıcı muhasebe
 * programından faturayı gönderiyor, uygulamada onay bekleyen bir belge
 * oluyor. Güvenlik testleri "kimin gönderebileceğini", bu blok
 * "gönderilince ne olduğunu" koruyor.
 */
describe('uçtan uca: ek işleme', () => {
  let app: FastifyInstance
  let prisma: any
  let workspaceId: string
  let inboxKey: string
  let uyeEposta: string
  let userId: number

  const fatura = () => readFileSync(join(__dirname, 'fixtures', 'ubl', 'TemelFaturaOrnegi.xml'))

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
    const { gelenKutusuAnahtariUret } = await import('../src/services/gelen-eposta.js')

    uyeEposta = `uctan-${Date.now()}@ornek.test`
    const u = await prisma.user.create({
      data: { email: uyeEposta, password: 'x', name: 'Uçtan Uca', role: 'learner', emailVerifiedAt: new Date() }
    })
    userId = u.id
    inboxKey = gelenKutusuAnahtariUret()
    const ws = await prisma.businessWorkspace.create({
      data: { name: 'Uçtan Uca Alan', createdById: u.id, status: 'active', inboxKey }
    })
    workspaceId = ws.id
    await prisma.businessMember.create({
      data: { workspaceId, userId: u.id, role: 'owner', status: 'active' }
    })

    app = await sunucuKur(ANAHTAR)
  })

  afterAll(async () => {
    await app.close()
    /* Öneriler belgeye bağlı: önce onlar silinmezse belge temizliği
       kısıt hatasıyla düşer ve TÜM bloğun kapanışı bozulur. */
    await prisma.documentSuggestion.deleteMany({ where: { document: { userId } } }).catch(() => {})
    await prisma.uploadedDocument.deleteMany({ where: { userId } })
    await prisma.businessWorkspace.delete({ where: { id: workspaceId } }).catch(() => {})
    await prisma.user.delete({ where: { id: userId } }).catch(() => {})
    await prisma.$disconnect()
  })

  const gonder = (ekler: any[]) => app.inject({
    method: 'POST', url: '/inbound/email',
    headers: { 'x-inbound-secret': ANAHTAR },
    payload: { inboxKey, from: uyeEposta, dkim: 'pass', spf: 'pass', ekler }
  })

  it('e-Fatura eki belge olarak kaydedilir ve yapılandırılmış okunur', async () => {
    const res = await gonder([{
      filename: 'fatura.xml',
      mimeType: 'application/xml',
      content: fatura().toString('base64')
    }])

    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).belgeSayisi).toBe(1)

    const belge = await prisma.uploadedDocument.findFirst({
      where: { userId, originalName: 'fatura.xml' },
      orderBy: { createdAt: 'desc' }
    })
    expect(belge).not.toBeNull()
    /* Belge doğrudan çalışma alanına bağlanmalı -- e-posta yolunda
       kullanıcının ayrıca eşleştirme yapması beklenmiyor. */
    expect(belge.workspaceId).toBe(workspaceId)

    const analiz = JSON.parse(belge.analysis)
    expect(analiz.eFatura?.id).toBe('GIB20090000000001')
    expect(analiz.eFatura?.odenecekTutar).toBe(17.88)
  })

  /*
   * 🔴 KANALIN VAAT ETTİĞİ "OTOMATİK" KISIM.
   *
   * Öneri üretimi yalnız belge güncelleme ucunda yapılıyordu; e-postayla
   * gelen fatura "Belgeler"e düşüyor ama kullanıcı elle kategori
   * atayana kadar kayıt önerisi ÇIKMIYORDU. Artık ek işlenir işlenmez
   * `proposed` öneri bekliyor -- ve BusinessRecord yine yalnız insan
   * onayıyla oluşuyor.
   */
  it('e-Fatura eki onay bekleyen ÖNERİ üretir', async () => {
    const res = await gonder([{
      filename: 'oneri-fatura.xml',
      mimeType: 'application/xml',
      content: fatura().toString('base64')
    }])
    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).belgeSayisi).toBe(1)

    const belge = await prisma.uploadedDocument.findFirst({
      where: { userId, originalName: 'oneri-fatura.xml' },
      orderBy: { createdAt: 'desc' }
    })
    expect(belge).not.toBeNull()

    const oneriler = await prisma.documentSuggestion.findMany({
      where: { documentId: belge!.id }
    })
    expect(oneriler).toHaveLength(1)
    expect(oneriler[0].status).toBe('proposed')
    /* Belge durumu da "inceleme bekliyor"a çekilmiş olmalı. */
    expect((await prisma.uploadedDocument.findUnique({ where: { id: belge!.id } }))?.analysisStatus).toBe('review_required')

    const payload = JSON.parse(oneriler[0].payload)
    expect(payload.amount).toBe(17.88)
    /* Çalışma alanının vergi numarası girilmemiş: yön TAHMİN EDİLMİYOR,
       neutral kalıyor ve karar kullanıcıya kalıyor. */
    expect(payload.direction).toBe('neutral')
  })

  /*
   * 🔴 EKLER MEVCUT KAPIDAN GEÇİYOR. DTD taşıyan XML (XXE / varlık
   * şişmesi) e-postayla da giremiyor -- tarayıcıdan geçemeyeceği bir
   * dosya buradan da geçmemeli.
   */
  it('DTD içeren XML eki reddedilir', async () => {
    const kotu = Buffer.from(
      '<?xml version="1.0"?>\n<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<r>&x;</r>',
      'utf-8'
    )
    const res = await gonder([{ filename: 'kotu.xml', mimeType: 'application/xml', content: kotu.toString('base64') }])
    expect(res.statusCode).toBe(202)
    expect(JSON.parse(res.body).belgeSayisi).toBe(0)
  })

  it('desteklenmeyen tür reddedilir', async () => {
    const res = await gonder([{
      filename: 'betik.exe', mimeType: 'application/octet-stream',
      content: Buffer.from('MZ').toString('base64')
    }])
    expect(JSON.parse(res.body).belgeSayisi).toBe(0)
  })

  /*
   * Bir ek bozuksa diğerleri KAYBOLMAMALI. Tek postada üç fatura
   * varsa, birinin bozuk olması diğer ikisini düşürmemeli.
   */
  it('bozuk ek diğerlerini düşürmez', async () => {
    const res = await gonder([
      { filename: 'kotu.xml', mimeType: 'application/xml', content: Buffer.from('<a><b></a>').toString('base64') },
      { filename: 'iyi.xml', mimeType: 'application/xml', content: fatura().toString('base64') }
    ])
    expect(JSON.parse(res.body).belgeSayisi).toBe(1)
  })
})
