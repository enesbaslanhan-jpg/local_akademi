import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { readFile } from 'fs/promises'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { processDueBusinessReminders, syncAutomaticReminder } from './business-reminder-worker.js'
import { buildDocumentSuggestion, oneriKaydet } from './document-suggestions.js'
import { yuklemeYoluCoz, exceljsYukle } from './documents.js'

const RECORD_TYPES = [
  'payment', 'receivable', 'promissory_note', 'purchase',
  'shipment', 'task', 'deferred', 'other'
] as const
const RECORD_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'deferred'] as const
const RECURRENCE_RULES = ['weekly', 'monthly', 'quarterly', 'yearly'] as const
const WRITE_ROLES = new Set(['owner', 'manager', 'staff', 'accountant', 'admin'])

const nullableText = z.string().trim().max(4000).nullable().optional()
const optionalDate = z.string().datetime().nullable().optional()

const recordInput = z.object({
  type: z.enum(RECORD_TYPES),
  title: z.string().trim().min(1).max(240),
  description: nullableText,
  direction: z.enum(['payable', 'receivable', 'neutral']).default('neutral'),
  amount: z.number().finite().nonnegative().max(1e15).nullable().optional(),
  currency: z.string().trim().length(3).default('TRY'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueAt: optionalDate,
  contactId: z.string().uuid().nullable().optional(),
  assignedToId: z.number().int().positive().nullable().optional(),
  recurrenceRule: z.enum(RECURRENCE_RULES).nullable().optional(),
  metadata: z.record(z.unknown()).optional()
})

const recordUpdate = recordInput.partial().extend({
  status: z.enum(RECORD_STATUSES).optional(),
  reason: z.string().trim().max(1000).optional()
})

const deferInput = z.object({
  dueAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(1000)
})

const reminderInput = z.object({
  scheduledAt: z.string().datetime(),
  recipientId: z.number().int().positive().optional(),
  channel: z.enum(['in_app']).default('in_app')
})

const documentMetadataInput = z.object({
  category: z.enum(['invoice', 'receipt', 'contract', 'promissory_note', 'shipment', 'purchase', 'other']).nullable().optional(),
  documentDate: optionalDate,
  dueDate: optionalDate,
  contactId: z.string().uuid().nullable().optional()
})

const importRequestSchema = z.object({
  fileId: z.string().uuid(),
  columnMapping: z.record(z.string()),
  previewOnly: z.boolean().default(true)
})

/*
 * Dışa aktarım 5000 satırla sınırlandırılmıştı (workspace-exports.ts);
 * içe aktarım AYNI sayıyı alıyor. Simetri bir estetik tercihi değil:
 * kullanıcının dışa aktardığı dosyayı GERİ yükleyebilmesi şart, ve
 * sınırsız satır, dışa aktarımda bellek tüketen arızanın aynısını
 * yazma tarafında tekrarlatırdı.
 */
const MAX_IMPORT_ROWS = 5000

/*
 * Yazma döngüsü satır başına transaction AÇMIYOR: /admin/stats
 * arızasında (17 eşzamanlı sorgu → aralıklı 500) ölçülen sınıfın aynısı.
 * `partiler()` deseninin buradaki hâli: her dalga TEK işlem, içindeki
 * kayıtlar birlikte yazılıyor. Dalga boyutu küçük tutuldu ki tek bozuk
 * satır geri alsa bile kaybı sınırlı kalsın.
 */
const IMPORT_YAZMA_DALGASI = 100

/*
 * 🔴 İŞLEM ZAMAN AŞIMI AÇIKÇA VERİLİYOR — varsayılana güvenilmiyor.
 *
 * Prisma'nın etkileşimli işlem varsayılanı 5 saniye. Bir dalga
 * 100 satır × (kayıt + geçmiş + hatırlatma) = ~300 ardışık sorgu
 * çalıştırıyor; sorgu başına 15 ms bile 4,5 saniye eder ve yüklü bir
 * sunucuda varsayılan aşılır. Aşıldığında dalga geri alınıp 100 satır
 * birden "başarısız" raporlanır -- veri bozulmaz ama kullanıcı büyük
 * bir içe aktarımın ortasında anlaşılmaz bir hatayla kalır.
 *
 * Depoda başka hiçbir `$transaction` çağrısı süre vermiyor; onlar
 * birkaç sorguluk işlemler olduğu için varsayılan yetiyor. Sınırın
 * gerçekten dar geldiği tek yer toplu yazma.
 *
 * `maxWait` da artırıldı: dalgalar peş peşe geldiği için havuzdan
 * bağlantı beklemesi varsayılan 2 saniyeyi bulabilir.
 */
const IMPORT_ISLEM_SURESI = { timeout: 60_000, maxWait: 15_000 }

function dalgalaraBol<T>(liste: T[], boyut: number): T[][] {
  const dalgalar: T[][] = []
  for (let i = 0; i < liste.length; i += boyut) dalgalar.push(liste.slice(i, i + boyut))
  return dalgalar
}

/*
 * 🔴 CSV DISKTEN OKUNUR, `extractedText`ten DEĞİL.
 *
 * `extractedText` yüklemede 100.000 karakterde kırpılıyor. Büyük bir
 * tablonun SONU orada yok; kırpılan metni ayrıştırmak, kullanıcıya
 * hiçbir uyarı vermeden satır yutmak demekti -- sessiz veri kaybı,
 * gürültülü hatadan çok daha pahalı. XLSX yolu zaten diskten okuyor;
 * iki biçim de aynı kapıdan geçiyor (`yuklemeYoluCoz`).
 */
async function csvMetniniOku(storedName: string): Promise<string> {
  const buffer = await readFile(yuklemeYoluCoz(storedName))
  /*
   * Türkçe Excel'in CSV çıktısı sık sık Windows-1254'tür. `fatal`
   * çözücü geçersiz UTF-8 bayt dizisinde fırlatır; bozuk karakterleri
   * `�` ile doldurup sessizce ilerlemek yerine dosyanın tamamını
   * reddediyoruz -- kullanıcı "CSV UTF-8 olarak kaydet" diyerek
   * düzeltebilir, yarım bozuk isimleri sonradan ayıklamaz.
   */
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
}

function normalizeRole(role: string) {
  return role === 'admin' ? 'manager' : role
}

/*
 * CSV ayrıştırıcı — basit, bağımlılıksız.
 * Tırnak içine alınmış virgüller ve satır sonlarını destekler.
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
    } else if (char === '\r' && !inQuotes) {
      // Skip \r in \r\n
    } else {
      current += char
    }
  }
  if (current) lines.push(current)

  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values: string[] = []
    let val = ''
    let inQ = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      const next = line[j + 1]

      if (char === '"') {
        if (inQ && next === '"') {
          val += '"'
          j++
        } else {
          inQ = !inQ
        }
      } else if (char === ',' && !inQ) {
        values.push(val.trim())
        val = ''
      } else {
        val += char
      }
    }
    values.push(val.trim())

    if (values.length !== headers.length) continue

    const row: Record<string, string> = {}
    for (let k = 0; k < headers.length; k++) {
      row[headers[k]] = values[k].replace(/^"|"$/g, '')
    }
    rows.push(row)
  }

  return rows
}

/*
 * XLSX ayrıştırıcı — exceljs kullanıyor (zaten bağımlılıkta).
 * İlk çalışma sayfasını okur, başlık satırını varsayar.
 */
async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const ExcelJS = await exceljsYukle()
  const workbook = new ExcelJS.Workbook()
  // exceljs expects a Node.js Buffer - cast to avoid TS version conflicts
  await workbook.xlsx.load(buffer as any)
  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) return []

  const headers: string[] = []
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim()
  })

  const rows: Record<string, string>[] = []
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum)
    const rowData: Record<string, string> = {}
    let hasData = false

    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1] || `col${colNumber}`
      const value = cell.value
      if (value !== null && value !== undefined && value !== '') {
        hasData = true
        if (typeof value === 'object' && value !== null && 'result' in value) {
          // Formula result
          rowData[header] = String(value.result)
        } else if (value instanceof Date) {
          rowData[header] = value.toISOString().split('T')[0]
        } else {
          rowData[header] = String(value).trim()
        }
      } else {
        rowData[header] = ''
      }
    })

    if (hasData) rows.push(rowData)
  }

  return rows
}

function parseJson(value: string | null) {
  if (!value) return {}
  try { return JSON.parse(value) }
  catch { return {} }
}

function recordJson(record: any) {
  /*
   * `overdue` SUNUCUDA hesaplanıyor, arayüzde değil.
   *
   * Neden: aynı karar üç ayrı ekranda (takip listesi, takvim, ana
   * sayfa) tekrar edilirdi ve biri "vadesi bugün olan geçmiş sayılır
   * mı" sorusunu farklı yanıtlayınca ekranlar birbirini tutmazdı.
   *
   * NEDEN GEREKTİ: e-Fatura yüklenince kayıt faturanın KENDİ vadesini
   * alıyor. Eski tarihli bir fatura yüklendiğinde kayıt geçmişe düşüp
   * kullanıcının bakmadığı bir yere sessizce gidiyordu -- ürün sahibi
   * "takvime hiç eklenmiyor" diye bildirdi; ölçüldüğünde kayıt aslında
   * takvimdeydi, ama 2009'da. Artık geçmiş vade İŞARETLENİYOR.
   */
  const dueAt = record.dueAt ? new Date(record.dueAt) : null
  const tamamlanmis = ['completed', 'cancelled'].includes(record.status)
  return {
    ...record,
    amount: record.amount === null || record.amount === undefined ? null : Number(record.amount),
    metadata: parseJson(record.metadata),
    overdue: Boolean(dueAt && !tamamlanmis && dueAt.getTime() < Date.now())
  }
}

/*
 * Tracker özeti — TEK hesap.
 *
 * `/tracker/summary` ucu ile mentor bağlamı aynı işlevi kullanıyor.
 * Önceki turda mentor tarafı bu hesabın satır satır kopyasını taşıyordu;
 * iki kopya bugün aynı sonucu verir ama biri değişince sessizce
 * ayrışırdı -- mentor "3 geciken var" derken ekranda 5 görünebilirdi.
 *
 * 🔴 Mentor bu sonucun yalnız counts/toplamlar alanlarını kullanıyor;
 * `upcoming` içindeki müşteri adları ve başlıklar dışarı (Mistral)
 * gitmiyor. Bu ayrım tüketici tarafta bilinçli; işlevin kendisi ekran
 * için tam veriyi döndürmek zorunda.
 */
export async function trackerOzetiHesapla(prisma: PrismaClient, workspaceId: string) {
  const now = new Date()
  const nextThirtyDays = new Date(now.getTime() + 30 * 86400000)
  const records = await prisma.businessRecord.findMany({
    where: { workspaceId, archivedAt: null, status: { in: ['open', 'in_progress', 'deferred'] } },
    orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
    include: { contact: { select: { id: true, name: true } } }
  })

  const payable = records
    .filter(r => r.direction === 'payable' && r.dueAt && r.dueAt <= nextThirtyDays)
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
  const receivable = records
    .filter(r => r.direction === 'receivable' && r.dueAt && r.dueAt <= nextThirtyDays)
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  /*
   * 🔴 YÖN BEKLEYENLER — kendi şeridi.
   *
   * `payable` ve `receivable` toplamları yalnız yönü BELLİ kayıtları
   * sayıyor. e-Fatura okunduğunda yön, faturadaki VKN işletmenin
   * vergi numarasıyla eşleşmezse `neutral` kalıyor. Sonuç: tutarı
   * olan bir kayıt hiçbir toplama girmiyor ve ekranda hiç
   * görünmüyordu -- ürün sahibi bunu kullanınca fark etti.
   *
   * Borç ya da alacak sayılmıyorlar; bu bir tahmin olurdu ve yanlış
   * yön, kullanıcının alacağını borç göstermek demek. Bunun yerine
   * KENDİ sayaçlarıyla görünür oluyorlar: "N kayıt yön bekliyor".
   * Kullanıcı unutmaz, rakamlar da yalan söylemez.
   */
  const yonBekleyenler = records.filter(r => r.direction === 'neutral' && r.amount !== null)

  return {
    counts: {
      open: records.length,
      overdue: records.filter(r => r.dueAt && r.dueAt < now && r.status !== 'completed').length,
      dueToday: records.filter(r => r.dueAt && r.dueAt.toDateString() === now.toDateString()).length,
      shipments: records.filter(r => r.type === 'shipment').length,
      deferred: records.filter(r => r.status === 'deferred' || r.type === 'deferred').length,
      awaitingDirection: yonBekleyenler.length
    },
    nextThirtyDays: { payable, receivable, net: receivable - payable },
    awaitingDirection: {
      count: yonBekleyenler.length,
      amount: yonBekleyenler.reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
    },
    upcoming: records.slice(0, 10).map(recordJson)
  }
}

/** Üyelik + workspace aktifliği + (istenirse) yazma yetkisi kontrolü.
 *  Başarısızsa yanıtı kendisi gönderir ve `null` döner.
 *  `workspace-exports.ts` aynı kuralı tekrar yazmamak için bunu kullanıyor. */
export async function access(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string,
  reply: any,
  write = false
) {
  const member = await prisma.businessMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { select: { status: true } } }
  })
  if (!member || member.status !== 'active') {
    reply.status(403).send({ error: 'Access denied' })
    return null
  }
  if (member.workspace.status !== 'active') {
    reply.status(400).send({ error: 'Workspace is not active' })
    return null
  }
  if (write && !WRITE_ROLES.has(normalizeRole(member.role))) {
    reply.status(403).send({ error: 'Insufficient permissions' })
    return null
  }
  return member
}

async function scopedRecord(
  prisma: PrismaClient,
  workspaceId: string,
  recordId: string,
  reply: any
) {
  const record = await prisma.businessRecord.findUnique({ where: { id: recordId } })
  if (!record || record.workspaceId !== workspaceId || record.archivedAt) {
    reply.status(404).send({ error: 'Record not found' })
    return null
  }
  return record
}

/*
 * Yetki doğrulamasının reply'sız ÇEKİRDEĞİ.
 *
 * Toplu içe aktarım bunu satır bazında çağırıyor: tek kötü satır
 * bütün isteği düşürmemeli, hatası kendi satırına yazılmalı. Tek
 * kayıt uçları ise aşağıdaki sarmalayıcıyı kullanmaya devam ediyor --
 * davranışları (422 + aynı mesaj) değişmedi. Kural tek kaynakta:
 * cari/görevli kuralı burada, ikiye ayrışamaz.
 */
async function referanslariDogrula(
  prisma: PrismaClient,
  workspaceId: string,
  contactId: string | null | undefined,
  assignedToId: number | null | undefined
): Promise<{ ok: true } | { ok: false; field: 'contactId' | 'assignedToId'; message: string }> {
  if (contactId) {
    const contact = await prisma.businessContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.workspaceId !== workspaceId || contact.status !== 'active') {
      return { ok: false, field: 'contactId', message: 'Contact does not belong to this workspace' }
    }
  }
  if (assignedToId) {
    const member = await prisma.businessMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: assignedToId } }
    })
    if (!member || member.status !== 'active') {
      return { ok: false, field: 'assignedToId', message: 'Assignee is not an active workspace member' }
    }
  }
  return { ok: true }
}

async function validateReferences(
  prisma: PrismaClient,
  workspaceId: string,
  contactId: string | null | undefined,
  assignedToId: number | null | undefined,
  reply: any
) {
  const sonuc = await referanslariDogrula(prisma, workspaceId, contactId, assignedToId)
  if (!sonuc.ok) {
    reply.status(422).send({ error: sonuc.message })
    return false
  }
  return true
}

function updateDates(status: typeof RECORD_STATUSES[number]) {
  if (status === 'completed') return { completedAt: new Date(), cancelledAt: null }
  if (status === 'cancelled') return { cancelledAt: new Date(), completedAt: null }
  return { completedAt: null, cancelledAt: null }
}

function nextRecurringDate(current: Date, rule: typeof RECURRENCE_RULES[number]) {
  if (rule === 'weekly') return new Date(current.getTime() + 7 * 86400000)
  const months = rule === 'monthly' ? 1 : rule === 'quarterly' ? 3 : 12
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth() + months
  const day = current.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(
    new Date(Date.UTC(year, month, 1)).getUTCFullYear(),
    new Date(Date.UTC(year, month, 1)).getUTCMonth(),
    Math.min(day, lastDay),
    current.getUTCHours(),
    current.getUTCMinutes(),
    current.getUTCSeconds(),
    current.getUTCMilliseconds()
  ))
}

async function createNextRecurringRecord(
  tx: Prisma.TransactionClient,
  record: any,
  actorId: number
) {
  if (!record.dueAt || !RECURRENCE_RULES.includes(record.recurrenceRule)) return null
  const existing = await tx.businessRecord.findFirst({ where: { parentRecordId: record.id } })
  if (existing) return existing
  const dueAt = nextRecurringDate(record.dueAt, record.recurrenceRule)
  const created = await tx.businessRecord.create({
    data: {
      workspaceId: record.workspaceId,
      type: record.type,
      title: record.title,
      description: record.description,
      direction: record.direction,
      amount: record.amount,
      currency: record.currency,
      priority: record.priority,
      dueAt,
      originalDueAt: dueAt,
      contactId: record.contactId,
      assignedToId: record.assignedToId,
      createdById: actorId,
      recurrenceRule: record.recurrenceRule,
      parentRecordId: record.id,
      metadata: record.metadata
    }
  })
  await tx.businessRecordHistory.create({
    data: {
      workspaceId: record.workspaceId,
      recordId: created.id,
      actorId,
      action: 'generated.recurrence',
      newData: JSON.stringify(recordJson(created))
    }
  })
  await syncAutomaticReminder(tx, created)
  return created
}

export async function businessTrackerRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient }
) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.addHook('preHandler', async (request, reply) => {
    try { await fastify.authenticate(request as any, reply as any) }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  fastify.get('/:workspaceId/tracker/summary', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    /* Hesap tek kaynakta: `trackerOzetiHesapla` (mentor bağlamı da onu
       kullanıyor; iki kopya ayrışırsa ekran ile mentor çelişirdi). */
    return trackerOzetiHesapla(prisma, workspaceId)
  })

  fastify.get('/:workspaceId/tracker/calendar', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const parsed = z.object({
      from: z.string().datetime(),
      to: z.string().datetime()
    }).safeParse(request.query)
    if (!parsed.success) return reply.status(422).send({ error: 'Invalid calendar range', details: parsed.error.errors })
    const from = new Date(parsed.data.from)
    const to = new Date(parsed.data.to)
    if (to <= from || to.getTime() - from.getTime() > 366 * 86400000) {
      return reply.status(422).send({ error: 'Calendar range must be between 1 and 366 days' })
    }
    const records = await prisma.businessRecord.findMany({
      where: { workspaceId, archivedAt: null, dueAt: { gte: from, lte: to } },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }]
    })
    const days: Record<string, ReturnType<typeof recordJson>[]> = {}
    for (const record of records) {
      const key = record.dueAt!.toISOString().slice(0, 10)
      ;(days[key] ??= []).push(recordJson(record))
    }
    const activeFinancialRecords = records.filter(record => !['completed', 'cancelled'].includes(record.status))
    return {
      from,
      to,
      days,
      totals: {
        records: records.length,
        payable: activeFinancialRecords.filter(record => record.direction === 'payable').reduce((sum, record) => sum + Number(record.amount ?? 0), 0),
        receivable: activeFinancialRecords.filter(record => record.direction === 'receivable').reduce((sum, record) => sum + Number(record.amount ?? 0), 0)
      }
    }
  })

  fastify.get('/:workspaceId/records', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return

    const query = z.object({
      type: z.enum(RECORD_TYPES).optional(),
      status: z.enum(RECORD_STATUSES).optional(),
      direction: z.enum(['payable', 'receivable', 'neutral']).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      q: z.string().trim().max(200).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0)
    }).safeParse(request.query)
    if (!query.success) return reply.status(422).send({ error: 'Invalid filters', details: query.error.errors })

    const { type, status, direction, from, to, q, limit, offset } = query.data
    const where: Prisma.BusinessRecordWhereInput = {
      workspaceId,
      archivedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(direction ? { direction } : {}),
      ...(from || to ? { dueAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {})
    }
    const [records, total] = await prisma.$transaction([
      prisma.businessRecord.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { documents: true, reminders: true } }
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset
      }),
      prisma.businessRecord.count({ where })
    ])
    return { records: records.map(recordJson), total, limit, offset }
  })

  fastify.post('/:workspaceId/records', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const parsed = recordInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    if (!await validateReferences(prisma, workspaceId, input.contactId, input.assignedToId, reply)) return

    const record = await prisma.$transaction(async tx => {
      const created = await tx.businessRecord.create({
        data: {
          workspaceId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          direction: input.direction,
          amount: input.amount ?? null,
          currency: input.currency.toUpperCase(),
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          originalDueAt: input.dueAt ? new Date(input.dueAt) : null,
          contactId: input.contactId ?? null,
          assignedToId: input.assignedToId ?? null,
          recurrenceRule: input.recurrenceRule ?? null,
          createdById: user.id,
          metadata: JSON.stringify(input.metadata ?? {})
        }
      })
      await tx.businessRecordHistory.create({
        data: { workspaceId, recordId: created.id, actorId: user.id, action: 'created', newData: JSON.stringify(recordJson(created)) }
      })
      await tx.workspaceActivity.create({
        data: { workspaceId, actorId: user.id, action: 'record.created', entityType: 'business_record', entityId: created.id }
      })
      await syncAutomaticReminder(tx, created)
      return created
    })
    return reply.status(201).send(recordJson(record))
  })

  fastify.get('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const record = await prisma.businessRecord.findUnique({
      where: { id: recordId },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        reminders: { orderBy: { scheduledAt: 'asc' } },
        /*
         * Belgenin TAMAMI değil, gereken alanlar.
         *
         * `include: { document: true }` `extractedText`i de getiriyordu
         * -- belge başına 100.000 karaktere kadar. Detay ekranı o metni
         * hiç göstermiyor; bir kaydın üç eki varsa yanıt sebepsiz yere
         * yüz binlerce karakter taşırdı.
         *
         * `analysis` GEREKLİ: e-Faturanın yapılandırılmış hâli
         * (`analysis.eFatura`) orada duruyor ve detayda gösteriliyor.
         */
        documents: {
          select: {
            id: true,
            createdAt: true,
            document: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                category: true,
                documentDate: true,
                analysis: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    return recordJson(record)
  })

  fastify.patch('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const previous = await scopedRecord(prisma, workspaceId, recordId, reply)
    if (!previous) return
    const parsed = recordUpdate.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const input = parsed.data
    if (!await validateReferences(prisma, workspaceId, input.contactId, input.assignedToId, reply)) return

    const data: Prisma.BusinessRecordUpdateInput = {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.contactId !== undefined ? { contact: input.contactId ? { connect: { id: input.contactId } } : { disconnect: true } } : {}),
      ...(input.assignedToId !== undefined ? { assignedTo: input.assignedToId ? { connect: { id: input.assignedToId } } : { disconnect: true } } : {}),
      ...(input.recurrenceRule !== undefined ? { recurrenceRule: input.recurrenceRule } : {}),
      ...(input.metadata !== undefined ? { metadata: JSON.stringify(input.metadata) } : {}),
      ...(input.status !== undefined ? { status: input.status, ...updateDates(input.status) } : {}),
      updatedBy: { connect: { id: user.id } }
    }

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.businessRecord.update({ where: { id: recordId }, data })
      await tx.businessRecordHistory.create({
        data: {
          workspaceId,
          recordId,
          actorId: user.id,
          action: input.status && input.status !== previous.status ? `status.${input.status}` : 'updated',
          previousData: JSON.stringify(recordJson(previous)),
          newData: JSON.stringify(recordJson(result)),
          reason: input.reason
        }
      })
      await syncAutomaticReminder(tx, result)
      if (input.status === 'completed') {
        await createNextRecurringRecord(tx, result, user.id)
      }
      return result
    })
    return recordJson(updated)
  })

  fastify.post('/:workspaceId/records/:recordId/defer', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const previous = await scopedRecord(prisma, workspaceId, recordId, reply)
    if (!previous) return
    const parsed = deferInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const dueAt = new Date(parsed.data.dueAt)
    if (dueAt <= new Date()) return reply.status(422).send({ error: 'New due date must be in the future' })

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.businessRecord.update({
        where: { id: recordId },
        data: { status: 'deferred', dueAt, updatedById: user.id }
      })
      await tx.businessRecordHistory.create({
        data: {
          workspaceId, recordId, actorId: user.id, action: 'deferred',
          previousData: JSON.stringify({ dueAt: previous.dueAt, status: previous.status }),
          newData: JSON.stringify({ dueAt, status: 'deferred' }),
          reason: parsed.data.reason
        }
      })
      await syncAutomaticReminder(tx, result)
      return result
    })
    return recordJson(updated)
  })

  fastify.delete('/:workspaceId/records/:recordId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    await prisma.businessRecord.update({ where: { id: recordId }, data: { archivedAt: new Date(), updatedById: user.id } })
    return { archived: true }
  })

  fastify.post('/:workspaceId/records/:recordId/reminders', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId } = request.params as { workspaceId: string, recordId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const parsed = reminderInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    const recipientId = parsed.data.recipientId ?? user.id
    if (!await validateReferences(prisma, workspaceId, undefined, recipientId, reply)) return
    const scheduledAt = new Date(parsed.data.scheduledAt)
    const dedupeKey = `${recordId}:${recipientId}:${scheduledAt.toISOString()}:${parsed.data.channel}`
    const reminder = await prisma.businessReminder.upsert({
      where: { dedupeKey },
      update: { scheduledAt, status: 'pending' },
      create: { workspaceId, recordId, recipientId, scheduledAt, channel: parsed.data.channel, dedupeKey }
    })
    return reply.status(201).send(reminder)
  })

  fastify.get('/:workspaceId/notifications', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    await processDueBusinessReminders(prisma).catch(error => {
      request.log.error({ error }, 'Due reminder processing failed')
    })
    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.businessNotification.findMany({
        where: { workspaceId, userId: user.id },
        include: { record: { select: { id: true, title: true, type: true, dueAt: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.businessNotification.count({ where: { workspaceId, userId: user.id, readAt: null } })
    ])
    return { notifications, unreadCount }
  })

  fastify.patch('/:workspaceId/notifications/:notificationId/read', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, notificationId } = request.params as { workspaceId: string; notificationId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const notification = await prisma.businessNotification.findUnique({ where: { id: notificationId } })
    if (!notification || notification.workspaceId !== workspaceId || notification.userId !== user.id) {
      return reply.status(404).send({ error: 'Notification not found' })
    }
    return prisma.businessNotification.update({
      where: { id: notificationId },
      data: { readAt: notification.readAt ?? new Date() }
    })
  })

  fastify.post('/:workspaceId/notifications/read-all', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const result = await prisma.businessNotification.updateMany({
      where: { workspaceId, userId: user.id, readAt: null },
      data: { readAt: new Date() }
    })
    return { updated: result.count }
  })

  fastify.post('/:workspaceId/records/:recordId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, recordId, documentId } = request.params as { workspaceId: string, recordId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    if (!await scopedRecord(prisma, workspaceId, recordId, reply)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.archivedAt || (document.workspaceId && document.workspaceId !== workspaceId) || (!document.workspaceId && document.userId !== user.id)) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const link = await prisma.$transaction(async tx => {
      if (!document.workspaceId) await tx.uploadedDocument.update({ where: { id: documentId }, data: { workspaceId } })
      return tx.businessRecordDocument.upsert({
        where: { recordId_documentId: { recordId, documentId } },
        update: {},
        create: { workspaceId, recordId, documentId, attachedById: user.id }
      })
    })
    return reply.status(201).send(link)
  })

  fastify.get('/:workspaceId/documents', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const documents = await prisma.uploadedDocument.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        contact: { select: { id: true, name: true } },
        suggestions: { orderBy: { createdAt: 'desc' } },
        _count: { select: { recordDocuments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return {
      documents: documents.map(document => ({
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        category: document.category,
        documentDate: document.documentDate,
        dueDate: document.dueDate,
        analysisStatus: document.analysisStatus,
        analysis: parseJson(document.analysis),
        extractedText: document.extractedText.substring(0, 20000),
        suggestions: document.suggestions.map(suggestion => ({
          ...suggestion,
          payload: parseJson(suggestion.payload),
          evidence: parseJson(suggestion.evidence)
        })),
        contact: document.contact,
        linkedRecordCount: document._count.recordDocuments,
        createdAt: document.createdAt
      }))
    }
  })

  fastify.patch('/:workspaceId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.archivedAt || (document.workspaceId && document.workspaceId !== workspaceId) || (!document.workspaceId && document.userId !== user.id)) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const parsed = documentMetadataInput.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })
    if (!await validateReferences(prisma, workspaceId, parsed.data.contactId, undefined, reply)) return
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.uploadedDocument.update({
        where: { id: documentId },
        data: {
          workspaceId,
          ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
          ...(parsed.data.documentDate !== undefined ? { documentDate: parsed.data.documentDate ? new Date(parsed.data.documentDate) : null } : {}),
          ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
          ...(parsed.data.contactId !== undefined ? { contactId: parsed.data.contactId } : {})
        }
      })
      const existing = await tx.documentSuggestion.findFirst({
        where: { workspaceId, documentId, suggestionType: 'business_record', status: 'proposed' }
      })
      /*
       * e-Fatura yükleme anında ayrıştırılıp `analysis.eFatura` içine
       * yazılıyor (bkz. `documents.ts`). Buradan yeniden ayrıştırma
       * YAPILMIYOR: `extractedText` 100.000 karakterde kırpıldığı için
       * büyük bir fatura burada zaten yarım okunurdu.
       */
      const cozumlenmis = ((): any => {
        try { return JSON.parse(result.analysis || '{}') } catch { return {} }
      })()
      const isletme = await tx.businessWorkspace.findUnique({
        where: { id: workspaceId },
        select: { taxNumber: true }
      })
      const generated = buildDocumentSuggestion(
        { ...result, eFatura: cozumlenmis?.eFatura ?? null },
        isletme?.taxNumber ?? null
      )
      if (!existing && generated) {
        await oneriKaydet(tx, { workspaceId, documentId, generated })
      }
      await tx.uploadedDocument.update({
        where: { id: documentId },
        data: { analysisStatus: existing || generated ? 'review_required' : 'no_suggestion' }
      })
      return result
    })
    return updated
  })

  fastify.get('/:workspaceId/documents/:documentId/suggestions', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string; documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.workspaceId !== workspaceId || document.archivedAt) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    const suggestions = await prisma.documentSuggestion.findMany({
      where: { workspaceId, documentId },
      orderBy: { createdAt: 'desc' }
    })
    return {
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        payload: parseJson(suggestion.payload),
        evidence: parseJson(suggestion.evidence)
      }))
    }
  })

  fastify.post('/:workspaceId/document-suggestions/:suggestionId/accept', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, suggestionId } = request.params as { workspaceId: string; suggestionId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const suggestion = await prisma.documentSuggestion.findUnique({
      where: { id: suggestionId },
      include: { document: true }
    })
    if (!suggestion || suggestion.workspaceId !== workspaceId || suggestion.document.workspaceId !== workspaceId) {
      return reply.status(404).send({ error: 'Suggestion not found' })
    }
    if (suggestion.status !== 'proposed') {
      return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    }
    const overrides = recordInput.partial().safeParse(request.body ?? {})
    if (!overrides.success) return reply.status(422).send({ error: 'Validation failed', details: overrides.error.errors })
    const merged = recordInput.safeParse({ ...parseJson(suggestion.payload), ...overrides.data })
    if (!merged.success) return reply.status(422).send({ error: 'Suggestion is incomplete', details: merged.error.errors })
    if (!await validateReferences(prisma, workspaceId, merged.data.contactId, merged.data.assignedToId, reply)) return

    const record = await prisma.$transaction(async tx => {
      const claimed = await tx.documentSuggestion.updateMany({
        where: { id: suggestionId, workspaceId, status: 'proposed' },
        data: { status: 'accepted', reviewedById: user.id, reviewedAt: new Date() }
      })
      if (claimed.count !== 1) throw new Error('SUGGESTION_ALREADY_REVIEWED')
      const input = merged.data
      const created = await tx.businessRecord.create({
        data: {
          workspaceId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          direction: input.direction,
          amount: input.amount ?? null,
          currency: input.currency.toUpperCase(),
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          originalDueAt: input.dueAt ? new Date(input.dueAt) : null,
          contactId: input.contactId ?? null,
          assignedToId: input.assignedToId ?? null,
          createdById: user.id,
          metadata: JSON.stringify({ ...(input.metadata ?? {}), sourceSuggestionId: suggestion.id })
        }
      })
      await tx.businessRecordDocument.create({
        data: { workspaceId, recordId: created.id, documentId: suggestion.documentId, attachedById: user.id }
      })
      await tx.businessRecordHistory.create({
        data: { workspaceId, recordId: created.id, actorId: user.id, action: 'created.from_document_suggestion', newData: JSON.stringify(recordJson(created)) }
      })
      await tx.uploadedDocument.update({ where: { id: suggestion.documentId }, data: { analysisStatus: 'accepted' } })
      await syncAutomaticReminder(tx, created)
      return created
    }).catch(error => {
      if (error instanceof Error && error.message === 'SUGGESTION_ALREADY_REVIEWED') return null
      throw error
    })
    if (!record) return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    return reply.status(201).send(recordJson(record))
  })

  fastify.post('/:workspaceId/document-suggestions/:suggestionId/reject', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, suggestionId } = request.params as { workspaceId: string; suggestionId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const suggestion = await prisma.documentSuggestion.findUnique({ where: { id: suggestionId } })
    if (!suggestion || suggestion.workspaceId !== workspaceId) {
      return reply.status(404).send({ error: 'Suggestion not found' })
    }
    const result = await prisma.documentSuggestion.updateMany({
      where: { id: suggestionId, workspaceId, status: 'proposed' },
      data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date() }
    })
    if (result.count !== 1) return reply.status(409).send({ error: 'Suggestion was already reviewed' })
    await prisma.uploadedDocument.update({
      where: { id: suggestion.documentId },
      data: { analysisStatus: 'rejected' }
    })
    return { rejected: true }
  })

  fastify.delete('/:workspaceId/documents/:documentId', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId, documentId } = request.params as { workspaceId: string, documentId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return
    const document = await prisma.uploadedDocument.findUnique({ where: { id: documentId } })
    if (!document || document.workspaceId !== workspaceId || document.archivedAt) {
      return reply.status(404).send({ error: 'Document not found' })
    }
    await prisma.uploadedDocument.update({ where: { id: documentId }, data: { archivedAt: new Date() } })
    return { archived: true }
  })

  /*
   * TOPLU İÇE AKTARIM — Excel/CSV.
   *
   * Akış: dosya yükle → sütunları eşleştir → ÖNİZLEME → onayla.
   * 🔴 ÖNİZLEME ATLANMAYACAK. 200 satırı doğrudan yazmak, yanlış
   * eşleştirilmiş bir sütunu 200 hatalı kayda çevirir. Kullanıcı ne
   * oluşacağını GÖRMEDEN kaydedilmeyecek. Bu, uygulamanın her yerindeki
   * ilkeyle aynı: mevcut belge akışında da öneri `proposed` durumunda
   * bekliyor ve `BusinessRecord` ancak insan onayıyla oluşuyor.
   */
  fastify.post('/:workspaceId/records/import', async (request, reply) => {
    const user = request.user as { id: number }
    const { workspaceId } = request.params as { workspaceId: string }
    if (!await access(prisma, user.id, workspaceId, reply, true)) return

    const parsed = importRequestSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(422).send({ error: 'Validation failed', details: parsed.error.errors })

    const { fileId, columnMapping, previewOnly } = parsed.data

    // Get the uploaded file
    const document = await prisma.uploadedDocument.findUnique({
      where: { id: fileId },
      select: { id: true, workspaceId: true, userId: true, originalName: true, mimeType: true, storedName: true, archivedAt: true }
    })

    if (!document || document.archivedAt || (document.workspaceId && document.workspaceId !== workspaceId) || (!document.workspaceId && document.userId !== user.id)) {
      return reply.status(404).send({ error: 'File not found' })
    }

    // Derive extension from originalName
    const ext = (document.originalName.split('.').pop() || '').toLowerCase()

    // Parse the file content based on extension
    let rows: Record<string, string>[] = []
    if (ext === 'csv') {
      try {
        rows = parseCsv(await csvMetniniOku(document.storedName))
      } catch (hata) {
        if (hata instanceof TypeError) {
          /* TextDecoder(fatal) geçersiz UTF-8'de TypeError fırlatır:
             tipik sebep Windows-1254 CSV. Kullanıcı düzeltebilsin diye
             çözüm yolu söyleniyor. */
          return reply.status(422).send({
            error: 'Dosya UTF-8 kodlamasında okunamadı. Dosyayı Excel\'de "CSV UTF-8" biçiminde kaydedip tekrar deneyin.'
          })
        }
        throw hata
      }
    } else if (ext === 'xlsx') {
      rows = await parseXlsx(await readFile(yuklemeYoluCoz(document.storedName)))
    } else {
      return reply.status(415).send({ error: 'Only CSV and XLSX files are supported for import' })
    }

    if (rows.length === 0) {
      return reply.status(422).send({ error: 'No data rows found in file' })
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      /*
       * Sessiz kırpma YOK: 5000 satır alıp 200'ünü düşürmek, kullanıcının
       * verisinin yarısının kaybolduğunu fark etmemesi demek. Açık 422,
       * kaç satır geldiğini ve sınırı söyleyerek dosyayı bölmeyi önerir.
       */
      return reply.status(422).send({
        error: `Dosyada ${rows.length} satır var; tek seferde en fazla ${MAX_IMPORT_ROWS} satır içe aktarılabilir. Dosyayı bölerek yükleyin.`
      })
    }

    // Apply column mapping to transform rows to record input format
    const mappedRows = rows.map((row, index) => {
      const mapped: Record<string, any> = { rowIndex: index + 1 }
      for (const [targetField, sourceColumn] of Object.entries(columnMapping)) {
        mapped[targetField] = row[sourceColumn] ?? null
      }
      return mapped
    })

    // Validate each row using recordInput schema
    const validRows: any[] = []
    const errors: { row: number; field: string; message: string }[] = []

    /*
     * Yetki kontrolü istek başına önbellekleniyor: aynı cari UUID 300
     * satırda tekrar ediyorsa 300 sorgu yerine 1 atılır. Sonuç satır
     * bazında AYNI -- önbellek kararı değiştirmez, sadece maliyeti
     * düşürür.
     */
    const referansOnbellek = new Map<string, Promise<{ ok: true } | { ok: false; field: 'contactId' | 'assignedToId'; message: string }>>()
    const referansSorgula = (alan: 'contactId' | 'assignedToId', deger: string | number) => {
      const anahtar = `${alan}:${deger}`
      if (!referansOnbellek.has(anahtar)) {
        referansOnbellek.set(anahtar, alan === 'contactId'
          ? referanslariDogrula(prisma, workspaceId, String(deger), undefined)
          : referanslariDogrula(prisma, workspaceId, undefined, Number(deger)))
      }
      return referansOnbellek.get(anahtar)!
    }

    for (const mapped of mappedRows) {
      const rowIndex = mapped.rowIndex
      const { rowIndex: _, ...recordData } = mapped

      /*
       * Boş hücre = girilmedi. Eşlenen sütunda '' kalan bir değer,
       * uuid/tarih şemalarında satırı "geçersiz" diye düşürürdü --
       * kullanıcı tek boş hücre yüzünden satır kaybederdi.
       */
      for (const anahtar of Object.keys(recordData)) {
        if (recordData[anahtar] === '') recordData[anahtar] = null
      }

      // Convert types
      if (recordData.amount !== null && recordData.amount !== undefined && recordData.amount !== '') {
        const num = Number(recordData.amount)
        if (!Number.isFinite(num)) {
          errors.push({ row: rowIndex, field: 'amount', message: 'Geçersiz sayı formatı' })
        } else {
          recordData.amount = num
        }
      } else {
        recordData.amount = null
      }

      if (recordData.dueAt) {
        const date = new Date(recordData.dueAt)
        if (isNaN(date.getTime())) {
          errors.push({ row: rowIndex, field: 'dueAt', message: `Tarih okunamadı (${recordData.dueAt})` })
        } else {
          recordData.dueAt = date.toISOString()
        }
      } else {
        recordData.dueAt = null
      }

      // Set defaults
      recordData.currency = recordData.currency || 'TRY'
      recordData.priority = recordData.priority || 'normal'
      recordData.direction = recordData.direction || 'neutral'

      /*
       * 🔴 YETKI KONTROLÜ SATIR BAZINDA. Elektronik tabloya başka bir
       * işletmenin cari UUID'si yazılırsa kayıt o cariye bağlanırdı --
       * BOLA. Tek kayıt ucu bunu `validateReferences` ile zaten
       * önlüyordu; toplu yol aynı çekirdeği kullanmak ZORUNDA. Hata
       * isteği düşürmez, kendi satırına yazılır ve o satır atlanır;
       * kalan satırlar içeri girmeye devam eder.
       */
      let referansHatali = false
      if (recordData.contactId) {
        const sonuc = await referansSorgula('contactId', recordData.contactId)
        if (!sonuc.ok) {
          errors.push({ row: rowIndex, field: sonuc.field, message: sonuc.message })
          referansHatali = true
        }
      }
      if (!referansHatali && recordData.assignedToId) {
        const sonuc = await referansSorgula('assignedToId', recordData.assignedToId)
        if (!sonuc.ok) {
          errors.push({ row: rowIndex, field: sonuc.field, message: sonuc.message })
          referansHatali = true
        }
      }
      if (referansHatali) continue

      const parsedRow = recordInput.safeParse(recordData)
      if (!parsedRow.success) {
        for (const issue of parsedRow.error.errors) {
          errors.push({ row: rowIndex, field: issue.path.join('.'), message: issue.message })
        }
      } else {
        validRows.push({ ...parsedRow.data, rowIndex })
      }
    }

    if (previewOnly) {
      return {
        preview: true,
        totalRows: rows.length,
        validRows: validRows.length,
        errors: errors.slice(0, 50),
        sample: validRows.slice(0, 5).map(r => {
          const { rowIndex, ...data } = r
          return { row: rowIndex, ...data }
        })
      }
    }

    // Actually import the valid rows
    const createdRecords = []
    const failedRows: { row: number; reason: string }[] = []

    for (const dalga of dalgalaraBol(validRows, IMPORT_YAZMA_DALGASI)) {
      try {
        const yazilanlar = await prisma.$transaction(async tx => {
          const olusturulanlar = []
          for (const row of dalga) {
            const { rowIndex, ...recordData } = row
            const record = await tx.businessRecord.create({
              data: {
                workspaceId,
                type: recordData.type,
                title: recordData.title,
                description: recordData.description ?? null,
                direction: recordData.direction,
                amount: recordData.amount ?? null,
                currency: recordData.currency.toUpperCase(),
                priority: recordData.priority,
                dueAt: recordData.dueAt ? new Date(recordData.dueAt) : null,
                originalDueAt: recordData.dueAt ? new Date(recordData.dueAt) : null,
                contactId: recordData.contactId ?? null,
                assignedToId: recordData.assignedToId ?? null,
                recurrenceRule: recordData.recurrenceRule ?? null,
                createdById: user.id,
                metadata: JSON.stringify({ ...(recordData.metadata ?? {}), importRow: rowIndex })
              }
            })
            await tx.businessRecordHistory.create({
              data: { workspaceId, recordId: record.id, actorId: user.id, action: 'created.import', newData: JSON.stringify(recordJson(record)) }
            })
            /* 🔴 Hatırlatma KURULMALI: bu çağrı atlanırsa takvim boş kalır
               ve kullanıcı vade gününde uyarı almaz. */
            await syncAutomaticReminder(tx, record)
            olusturulanlar.push(record)
          }
          return olusturulanlar
        }, IMPORT_ISLEM_SURESI)
        for (const kayit of yazilanlar) createdRecords.push(recordJson(kayit))
      } catch (error) {
        /* Dalga önceden şemadan geçti; buraya düşmesi beklenmedik bir
           veritabanı durumudur. Dalga bütün olarak geri alınmıştır --
           yarım yazılı kayıt bırakmak yerine dalganın satırları nedeniyle
           birlikte raporlanıyor. */
        const sebep = error instanceof Error ? error.message : 'Bilinmeyen hata'
        for (const row of dalga) failedRows.push({ row: row.rowIndex, reason: sebep })
      }
    }

    return {
      imported: createdRecords.length,
      failed: failedRows.length,
      errors: errors.slice(0, 50),
      records: createdRecords,
      failures: failedRows
    }
  })
}
