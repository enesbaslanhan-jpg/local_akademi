import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'

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

export async function processDueBusinessReminders(
  prisma: PrismaClient = sharedPrisma,
  now = new Date()
) {
  const due = await prisma.businessReminder.findMany({
    where: { status: 'pending', scheduledAt: { lte: now } },
    include: {
      record: { select: { id: true, title: true, dueAt: true, status: true, archivedAt: true } },
      workspace: { select: { status: true } }
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
          body: `${reminder.record.title} için tarih: ${dueLabel}`
        }
      })
      await tx.businessReminder.update({
        where: { id: reminder.id },
        data: { status: 'sent', sentAt: now }
      })
      sent += 1
    })
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
