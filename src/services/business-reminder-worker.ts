import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { pushService } from './push/index.js'

const DAY_MS = 24 * 60 * 60 * 1000

type ReminderTransaction = Prisma.TransactionClient

export async function syncAutomaticReminder(
  tx: ReminderTransaction,
  record: { id: string; workspaceId: string; createdById: number; assignedToId: number | null; dueAt: Date | null; status: string },
  now = new Date()
) {
  const prefix = `auto:${record.id}:`
  await tx.businessReminder.updateMany({
    where: { recordId: record.id, status: 'pending', dedupeKey: { startsWith: prefix } },
    data: { status: 'cancelled' }
  })

  if (!record.dueAt || ['completed', 'cancelled'].includes(record.status)) return null
  const recipientId = record.assignedToId ?? record.createdById
  const scheduledAt = new Date(Math.max(now.getTime(), record.dueAt.getTime() - DAY_MS))
  const dedupeKey = `${prefix}${recipientId}:${record.dueAt.toISOString()}`
  return tx.businessReminder.upsert({
    where: { dedupeKey },
    update: { scheduledAt, status: 'pending', sentAt: null },
    create: {
      workspaceId: record.workspaceId,
      recordId: record.id,
      recipientId,
      scheduledAt,
      channel: 'in_app',
      dedupeKey
    }
  })
}

/*
 * BİLDİRİM GÖVDESİ.
 *
 * Eskiden yalnız `"<başlık> için tarih: <tarih>"` yazıyordu. Ürün
 * sahibinin tespiti: "bildirim yerinde gözüküyor ne olduğu yazmıyor".
 * Haklıydı -- bildirime bakan kişi TUTARI ve bunun borç mu alacak mı
 * olduğunu göremiyordu, yani asıl karar verdirecek iki bilgiyi.
 *
 * Yön belirsizse UYDURULMUYOR: "yön belirsiz" yazıyor. Bir alacağı
 * "ödenecek" diye bildirmek, hiç bildirmemekten kötüdür.
 */
function bildirimGovdesi(
  record: { title: string; amount: unknown; currency: string; direction: string },
  dueLabel: string
): string {
  const parcalar: string[] = [record.title]

  const tutar = record.amount === null || record.amount === undefined
    ? null
    : Number(record.amount)
  if (tutar !== null && Number.isFinite(tutar)) {
    parcalar.push(`${tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${record.currency}`)
  }

  const yonMetni: Record<string, string> = {
    payable: 'ödenecek',
    receivable: 'tahsil edilecek',
    neutral: 'yön belirsiz'
  }
  parcalar.push(yonMetni[record.direction] || 'yön belirsiz')
  parcalar.push(`tarih: ${dueLabel}`)

  return parcalar.join(' · ')
}

export async function processDueBusinessReminders(
  prisma: PrismaClient = sharedPrisma,
  now = new Date()
) {
  const due = await prisma.businessReminder.findMany({
    where: { status: 'pending', scheduledAt: { lte: now } },
    include: {
      record: { select: { id: true, title: true, dueAt: true, status: true, archivedAt: true, amount: true, currency: true, direction: true } },
      workspace: { select: { status: true, settings: { select: { notificationPrefs: true } } } }
    },
    orderBy: { scheduledAt: 'asc' },
    take: 200
  })

  let sent = 0
  for (const reminder of due) {
    await prisma.$transaction(async tx => {
      const current = await tx.businessReminder.findUnique({ where: { id: reminder.id } })
      if (!current || current.status !== 'pending') return
      if (
        reminder.workspace.status !== 'active' ||
        reminder.record.archivedAt ||
        ['completed', 'cancelled'].includes(reminder.record.status)
      ) {
        await tx.businessReminder.update({
          where: { id: reminder.id },
          data: { status: 'cancelled' }
        })
        return
      }

      let reminderNotificationsEnabled = true
      try {
        const preferences = JSON.parse(reminder.workspace.settings?.notificationPrefs || '{}')
        reminderNotificationsEnabled = preferences.dueReminders !== false
      } catch {
        reminderNotificationsEnabled = true
      }
      if (!reminderNotificationsEnabled) {
        await tx.businessReminder.update({
          where: { id: reminder.id },
          data: { status: 'cancelled' }
        })
        return
      }

      const dueLabel = reminder.record.dueAt
        ? reminder.record.dueAt.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
        : 'belirlenen tarih'
      await tx.businessNotification.upsert({
        where: { dedupeKey: `reminder:${reminder.id}` },
        update: {},
        create: {
          workspaceId: reminder.workspaceId,
          userId: reminder.recipientId,
          recordId: reminder.recordId,
          dedupeKey: `reminder:${reminder.id}`,
          type: 'record_due',
          title: 'Yaklaşan işletme kaydı',
          body: bildirimGovdesi(reminder.record, dueLabel)
        }
      })
      await tx.businessReminder.update({
        where: { id: reminder.id },
        data: { status: 'sent', sentAt: now }
      })
      sent += 1
    })

    // Transaction tamamlandiktan sonra asenkron ve yalitilmis push iletimi
    await pushService.sendToUser(reminder.recipientId, {
      title: 'Yaklaşan işletme kaydı',
      body: bildirimGovdesi(
        reminder.record,
        reminder.record.dueAt
          ? reminder.record.dueAt.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
          : 'belirlenen tarih'
      ),
      data: {
        target: 'workspace_record',
        workspaceId: reminder.workspaceId,
        recordId: reminder.recordId
      }
    }).catch(() => {})
  }
  return { processed: due.length, sent }
}

export function startBusinessReminderWorker(
  prisma: PrismaClient = sharedPrisma,
  options: { intervalMs?: number; onError?: (error: unknown) => void } = {}
) {
  const run = () => {
    void processDueBusinessReminders(prisma).catch(error => options.onError?.(error))
  }
  run()
  const timer = setInterval(run, options.intervalMs ?? 60_000)
  timer.unref()
  return () => clearInterval(timer)
}
