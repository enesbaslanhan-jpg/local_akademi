import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createZip } from './zipHelper'

const prisma = new PrismaClient()
const REPORT_DIR = join(process.cwd(), 'reports')

export async function reportRoutes(fastify: FastifyInstance) {
  mkdirSync(REPORT_DIR, { recursive: true })

  fastify.post('/reports/generate/:fmt', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    const { fmt } = request.params as { fmt: string }
    const format = fmt.toLowerCase()

    if (!['pdf', 'xlsx'].includes(format)) {
      return reply.status(422).send({ error: 'Format must be pdf or xlsx' })
    }

    const reportId = randomUUID()
    const filename = `LocalAkademi_Rapor_${reportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    const filepath = join(REPORT_DIR, filename)

    const profile = await (prisma as any).businessProfile?.findFirst({
      where: { userId: user.id }
    }).catch(() => null)

    const content = generateReportContent(user, profile)

    if (format === 'xlsx') {
      writeFileSync(filepath, generateSimpleXlsx(content))
    } else {
      writeFileSync(filepath, generateSimplePdf(content))
    }

    await (prisma as any).generatedReport?.create({
      data: {
        id: reportId,
        userId: user.id,
        reportType: 'user_summary',
        title: 'LocalAkademi Kullanıcı Raporu',
        format,
        storedName: filename
      }
    }).catch(() => {})

    return {
      id: reportId,
      title: 'LocalAkademi Kullanıcı Raporu',
      format,
      download_url: `/reports/${reportId}/download`
    }
  })

  fastify.get('/reports', {
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

  fastify.get('/reports/:reportId/download', {
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
    const media = report.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    return reply.header('Content-Type', media).send(fileContent)
  })

  fastify.post('/admin/backup', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' })
    }

    const backupId = randomUUID()
    const backupName = `LocalAkademi_Backup_${new Date().toISOString().split('T')[0]}_${backupId}.zip`
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
        title: 'LocalAkademi Sistem Yedeği',
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

function generateReportContent(user: any, profile: any) {
  return {
    kullanici: user.name || user.email,
    isletme: profile?.name || '',
    sektor: profile?.sector || '',
    sehir: profile?.city || '',
    aylik_satis: profile?.monthlySales || 0,
    aylik_gider: profile?.monthlyExpenses || 0,
    tahmini_kar: (profile?.monthlySales || 0) - (profile?.monthlyExpenses || 0),
    nakit: profile?.cashBalance || 0,
    borc: profile?.debtBalance || 0,
    tarih: new Date().toLocaleString('tr-TR')
  }
}

function generateSimplePdf(content: any) {
  const lines = [
    'LocalAkademi Rapor',
    '═'.repeat(50),
    '',
    `Kullanıcı: ${content.kullanici}`,
    `Tarih: ${content.tarih}`,
    '',
    '─'.repeat(50),
    'İşletme Bilgileri',
    '─'.repeat(50),
    `İşletme: ${content.isletme}`,
    `Sektör: ${content.sektor}`,
    `Şehir: ${content.sehir}`,
    '',
    '─'.repeat(50),
    'Finansal Özet',
    '─'.repeat(50),
    `Aylık Satış: ${content.aylik_satis} ₺`,
    `Aylık Gider: ${content.aylik_gider} ₺`,
    `Tahmini Kar: ${content.tahmini_kar} ₺`,
    `Nakit: ${content.nakit} ₺`,
    `Borç: ${content.borc} ₺`,
    '',
    '═'.repeat(50)
  ]
  return lines.join('\n')
}

function generateSimpleXlsx(content: any) {
  const header = 'Kullanıcı\tİşletme\tSektör\tŞehir\tAylık Satış\tAylık Gider\tTahmini Kar\tNakit\tBorç\tTarih'
  const row = `${content.kullanici}\t${content.isletme}\t${content.sektor}\t${content.sehir}\t${content.aylik_satis}\t${content.aylik_gider}\t${content.tahmini_kar}\t${content.nakit}\t${content.borc}\t${content.tarih}`
  return `${header}\n${row}\n`
}