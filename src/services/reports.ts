import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createZip } from './zipHelper'
import { keyValueToPdf, keyValueToXlsx, type KeyValueSection } from './report-formats.js'

const REPORT_DIR = join(process.cwd(), 'reports')

/**
 * Kullanıcı özeti raporları (legacy, per-user `BusinessProfile` tabanlı).
 *
 * NOT: İşletme takibi dışa aktarımı burada DEĞİL — `workspace-exports.ts`
 * içinde ve workspace kapsamlıdır. Bu dosya yalnız eski kullanıcı özeti
 * ile admin yedeğini taşıyor.
 *
 * Rota yolları bilerek öneksiz: bu eklenti `index.ts` içinde
 * `{ prefix: '/reports' }` ile kaydediliyor. Handler'lar da `/reports/...`
 * dediği için yollar `/reports/reports/...` oluyordu ve hiçbir rotaya
 * erişilemiyordu; dönen `download_url` de var olmayan bir yolu gösteriyordu.
 */
export async function reportRoutes(fastify: FastifyInstance) {
  mkdirSync(REPORT_DIR, { recursive: true })

  fastify.post('/generate/:fmt', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { fmt } = request.params as { fmt: string }
    const format = fmt.toLowerCase()

    if (!['pdf', 'xlsx'].includes(format)) {
      return reply.status(422).send({ error: 'Format must be pdf or xlsx' })
    }

    const reportId = randomUUID()
    const filename = `LocalKarar_Rapor_${reportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    const filepath = join(REPORT_DIR, filename)

    const profile = await (prisma as any).businessProfile?.findFirst({
      where: { userId: user.id }
    }).catch(() => null)

    const sections = buildReportSections(user, profile)
    const title = 'LocalKarar Kullanıcı Raporu'

    /* Gerçek dosya baytı. Önceki sürüm burada düz metin yazıp gerçek
       PDF/OOXML MIME tipiyle sunuyordu; hiçbir uygulama açamıyordu. */
    const bytes = format === 'xlsx'
      ? await keyValueToXlsx(title, sections)
      : await keyValueToPdf(title, sections)
    writeFileSync(filepath, bytes)

    await (prisma as any).generatedReport?.create({
      data: {
        id: reportId,
        userId: user.id,
        reportType: 'user_summary',
        title: 'LocalKarar Kullanıcı Raporu',
        format,
        storedName: filename
      }
    }).catch(() => {})

    return {
      id: reportId,
      title: 'LocalKarar Kullanıcı Raporu',
      format,
      download_url: `/reports/${reportId}/download`
    }
  })

  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const user = request.user
    const reports = await (prisma as any).generatedReport?.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    }).catch(() => [])

    return reports.map((r: any) => ({
      id: r.id,
      title: r.title,
      format: r.format,
      download_url: `/reports/${r.id}/download`,
      created_at: r.createdAt
    }))
  })

  fastify.get('/:reportId/download', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { reportId } = request.params as { reportId: string }

    const report = await (prisma as any).generatedReport?.findFirst({
      where: { id: reportId, userId: user.id }
    }).catch(() => null)

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' })
    }

    const filepath = join(REPORT_DIR, report.storedName)
    if (!existsSync(filepath)) {
      return reply.status(404).send({ error: 'Report file not found' })
    }

    const fileContent = readFileSync(filepath)
    /* `zip` (admin yedeği) eskiden XLSX MIME tipiyle sunuluyordu. */
    const media = MEDIA_TYPES[report.format as keyof typeof MEDIA_TYPES]
      ?? 'application/octet-stream'

    return reply
      .header('Content-Type', media)
      .header('Content-Disposition', `attachment; filename="${report.storedName}"`)
      .header('Content-Length', fileContent.length)
      .send(fileContent)
  })

  fastify.post('/admin/backup', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const backupId = randomUUID()
    const backupName = `LocalKarar_Backup_${new Date().toISOString().split('T')[0]}_${backupId}.zip`
    const backupPath = join(REPORT_DIR, backupName)

    try {
      await createZip(REPORT_DIR, backupPath, backupId)
    } catch (err) {
      console.error('Backup error:', err)
      return reply.status(500).send({ error: 'Backup failed' })
    }

    await (prisma as any).generatedReport?.create({
      data: {
        id: backupId,
        userId: user.id,
        reportType: 'system_backup',
        title: 'LocalKarar Sistem Yedeği',
        format: 'zip',
        storedName: backupName
      }
    }).catch(() => {})

    return {
      id: backupId,
      format: 'zip',
      download_url: `/reports/${backupId}/download`
    }
  })
}

const MEDIA_TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  zip: 'application/zip'
} as const

function buildReportSections(user: any, profile: any): KeyValueSection[] {
  const sales = profile?.monthlySales ?? 0
  const expenses = profile?.monthlyExpenses ?? 0
  return [
    {
      heading: 'Rapor Bilgisi',
      rows: [
        ['Kullanıcı', user.name || user.email],
        ['Tarih', new Date().toLocaleString('tr-TR')]
      ]
    },
    {
      heading: 'İşletme Bilgileri',
      rows: [
        ['İşletme', profile?.name || '—'],
        ['Sektör', profile?.sector || '—'],
        ['Şehir', profile?.city || '—']
      ]
    },
    {
      heading: 'Finansal Özet',
      rows: [
        ['Aylık satış', sales],
        ['Aylık gider', expenses],
        ['Tahmini kâr', sales - expenses],
        ['Nakit', profile?.cashBalance ?? 0],
        ['Borç', profile?.debtBalance ?? 0]
      ]
    }
  ]
}