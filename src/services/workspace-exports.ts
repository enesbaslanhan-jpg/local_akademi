/**
 * İşletme takibi dışa aktarımı — CSV / XLSX / PDF.
 *
 * `/workspaces` öneki altına kaydedilir, böylece yollar `business-tracker.ts`
 * ile aynı desende olur ve yetki aynı `access()` yardımcısından geçer.
 *
 * Tasarım kararı: dosya DİSKE YAZILMAZ, yanıt doğrudan akıtılır. Eski
 * `reports.ts` dosyayı `reports/` klasörüne yazıp ayrı bir indirme
 * rotasından sunuyordu; bu hem kırık `download_url`'ün hem de temizlik
 * sorununun kaynağıydı. `GeneratedReport` satırı artık dosya değil
 * DENETİM KAYDI tutuyor: kim, ne zaman, hangi kapsamı dışa aktardı.
 */
import type { FastifyInstance } from 'fastify'
import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { access } from './business-tracker.js'
import {
  recordsToCsv,
  recordsToXlsx,
  recordsToPdf,
  RECORD_TYPE_LABELS,
  RECORD_STATUS_LABELS,
  type ExportRecord,
  type ExportMeta,
  type ExportSummary
} from './report-formats.js'

const RECORD_TYPES = [
  'payment', 'receivable', 'promissory_note', 'purchase',
  'shipment', 'task', 'deferred', 'other'
] as const
const RECORD_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'deferred'] as const

const FORMATS = ['csv', 'xlsx', 'pdf'] as const
type ExportFormat = typeof FORMATS[number]

const MEDIA_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf'
}

/* Dışa aktarım tek istekte tamamlanıyor ve tamamı belleğe alınıyor;
   sınırsız bırakmak büyük workspace'te belleği tüketir. */
const MAX_EXPORT_ROWS = 5000

const filterQuery = z.object({
  type: z.enum(RECORD_TYPES).optional(),
  status: z.enum(RECORD_STATUSES).optional(),
  direction: z.enum(['payable', 'receivable', 'neutral']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().max(200).optional()
})

type Filters = z.infer<typeof filterQuery>

function buildWhere(workspaceId: string, f: Filters): Prisma.BusinessRecordWhereInput {
  return {
    workspaceId,
    archivedAt: null,
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.direction ? { direction: f.direction } : {}),
    ...(f.from || f.to
      ? { dueAt: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) } }
      : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: 'insensitive' as const } },
            { description: { contains: f.q, mode: 'insensitive' as const } }
          ]
        }
      : {})
  }
}

/** Raporun neyi kapsadığı dosyanın içinden okunabilsin. */
function describeFilters(f: Filters): string | undefined {
  const parts: string[] = []
  if (f.type) parts.push(`Kategori: ${RECORD_TYPE_LABELS[f.type] ?? f.type}`)
  if (f.status) parts.push(`Durum: ${RECORD_STATUS_LABELS[f.status] ?? f.status}`)
  if (f.direction) {
    parts.push(`Yön: ${({ payable: 'Borç', receivable: 'Alacak', neutral: 'Nötr' })[f.direction]}`)
  }
  if (f.from) parts.push(`Başlangıç: ${new Date(f.from).toLocaleDateString('tr-TR')}`)
  if (f.to) parts.push(`Bitiş: ${new Date(f.to).toLocaleDateString('tr-TR')}`)
  if (f.q) parts.push(`Arama: "${f.q}"`)
  return parts.length ? parts.join(' · ') : undefined
}

/** Dosya adında Türkçe/özel karakter bırakmıyoruz: Content-Disposition
 *  başlığı latin1 taşır, aksi halde ad bozulur. */
function safeFileSlug(name: string) {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U'
  }
  return name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, ch => map[ch] ?? ch)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'isletme'
}

/** `tracker/summary` ile aynı 30 günlük pencere mantığı. */
function buildSummary(records: ExportRecord[], currency: string): ExportSummary {
  const now = new Date()
  const horizon = new Date(now.getTime() + 30 * 86400000)
  const openish = records.filter(r => ['open', 'in_progress', 'deferred'].includes(r.status))
  const payable = openish
    .filter(r => r.direction === 'payable' && r.dueAt && r.dueAt <= horizon)
    .reduce((s, r) => s + (r.amount ?? 0), 0)
  const receivable = openish
    .filter(r => r.direction === 'receivable' && r.dueAt && r.dueAt <= horizon)
    .reduce((s, r) => s + (r.amount ?? 0), 0)
  return {
    open: openish.length,
    overdue: openish.filter(r => r.dueAt && r.dueAt < now).length,
    dueToday: openish.filter(r => r.dueAt && r.dueAt.toDateString() === now.toDateString()).length,
    payable,
    receivable,
    net: receivable - payable,
    currency
  }
}

export async function workspaceExportRoutes(
  fastify: FastifyInstance,
  opts?: { prisma?: PrismaClient }
) {
  const prisma = opts?.prisma ?? sharedPrisma

  fastify.addHook('preHandler', async (request, reply) => {
    try { await fastify.authenticate(request as any, reply as any) }
    catch { return reply.status(401).send({ error: 'Unauthorized' }) }
  })

  fastify.get('/:workspaceId/exports/records.:fmt', async (request, reply) => {
    const user = request.user as { id: number; name?: string; email: string }
    const { workspaceId, fmt } = request.params as { workspaceId: string; fmt: string }

    const format = fmt.toLowerCase() as ExportFormat
    if (!FORMATS.includes(format)) {
      return reply.status(422).send({ error: 'Format csv, xlsx veya pdf olmalı' })
    }

    /* Okuma dışa aktarımı tüm rollere açık — `accountant` ve `viewer` dahil.
       Yazma yetkisi istenmiyor, veri değişmiyor. */
    const member = await access(prisma, user.id, workspaceId, reply)
    if (!member) return

    const parsed = filterQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(422).send({ error: 'Geçersiz filtre', details: parsed.error.errors })
    }
    const filters = parsed.data

    const workspace = await prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, currency: true }
    })
    if (!workspace) return reply.status(404).send({ error: 'Workspace not found' })

    const rows = await prisma.businessRecord.findMany({
      where: buildWhere(workspaceId, filters),
      include: {
        contact: { select: { name: true } },
        _count: { select: { documents: true } }
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: MAX_EXPORT_ROWS
    })

    const records: ExportRecord[] = rows.map(r => ({
      id: r.id,
      type: r.type,
      status: r.status,
      direction: r.direction,
      title: r.title,
      contactName: r.contact?.name ?? null,
      amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
      currency: r.currency,
      dueAt: r.dueAt,
      completedAt: r.completedAt,
      documentCount: r._count.documents,
      createdAt: r.createdAt
    }))

    const meta: ExportMeta = {
      workspaceName: workspace.name,
      generatedAt: new Date(),
      generatedBy: user.name || user.email,
      filterSummary: describeFilters(filters)
    }
    const summary = buildSummary(records, workspace.currency)

    let body: Buffer
    if (format === 'csv') {
      body = Buffer.from(recordsToCsv(records), 'utf8')
    } else if (format === 'xlsx') {
      body = await recordsToXlsx(records, meta, summary)
    } else {
      body = await recordsToPdf(records, meta, summary)
    }

    const stamp = meta.generatedAt.toISOString().slice(0, 10)
    const filename = `${safeFileSlug(workspace.name)}-kayitlar-${stamp}.${format}`

    /* Denetim kaydı. Dosya diskte tutulmadığı için `storedName` yalnız
       önerilen indirme adıdır. Başarısızlığı isteği düşürmesin. */
    try {
      await prisma.generatedReport.create({
        data: {
          userId: user.id,
          reportType: `workspace_records_export:${workspaceId}`,
          title: meta.filterSummary
            ? `${workspace.name} — kayıtlar (${meta.filterSummary})`
            : `${workspace.name} — kayıtlar`,
          format,
          storedName: filename
        }
      })
    } catch (err) {
      fastify.log.warn({ err, workspaceId }, 'export denetim kaydı yazılamadı')
    }

    return reply
      .header('Content-Type', MEDIA_TYPES[format])
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Content-Length', body.length)
      .header('Cache-Control', 'no-store')
      .header('X-Export-Row-Count', String(records.length))
      .header('X-Export-Truncated', records.length >= MAX_EXPORT_ROWS ? 'true' : 'false')
      .send(body)
  })
}
