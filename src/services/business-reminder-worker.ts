import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { DEADLINE_SOURCES } from '../config/business-deadlines.js'

const DAY_MS = 24 * 60 * 60 * 1000

/*
 * Hatırlatmanın türü dedupeKey ÖNEKİNDEN okunuyor, ayrı bir sütundan
 * değil. Şema zaten iptal etmeyi bu önekle yapıyordu; tür için yeni
 * sütun açmak üretimde geçiş (migration) gerektirirdi ve kazancı yok.
 */
const YAKLASAN_ONEK = 'auto:'
const GECIKEN_ONEK = 'overdue:'

type ReminderTransaction = Prisma.TransactionClient

export async function syncAutomaticReminder(
  tx: ReminderTransaction,
  record: { id: string; workspaceId: string; createdById: number; assignedToId: number | null; dueAt: Date | null; status: string },
  now = new Date()
) {
  const yaklasanOnek = `${YAKLASAN_ONEK}${record.id}:`
  const gecikenOnek = `${GECIKEN_ONEK}${record.id}:`
  await tx.businessReminder.updateMany({
    where: {
      recordId: record.id,
      status: 'pending',
      OR: [{ dedupeKey: { startsWith: yaklasanOnek } }, { dedupeKey: { startsWith: gecikenOnek } }]
    },
    data: { status: 'cancelled' }
  })

  if (!record.dueAt || ['completed', 'cancelled'].includes(record.status)) return null
  const recipientId = record.assignedToId ?? record.createdById

  async function kur(onek: string, scheduledAt: Date) {
    const dedupeKey = `${onek}${recipientId}:${record.dueAt!.toISOString()}`
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

  const yaklasan = await kur(yaklasanOnek, new Date(Math.max(now.getTime(), record.dueAt.getTime() - DAY_MS)))
  /*
   * 🔴 GECİKME HATIRLATMASI — daha önce YOKTU.
   *
   * Tek hatırlatma vardı, o da vadeden bir gün önce. Vade geçtikten
   * sonra hiçbir şey üretilmiyordu: görev sessizce gecikiyor, sorumlu
   * listeye kendisi bakmadıkça haberi olmuyordu. Listedeki `overdue`
   * rozeti ekranda duruyordu ama kimseye gitmiyordu.
   *
   * ⚠️ Kayıt tamamlanır ya da iptal edilirse bu hatırlatma da
   * yukarıdaki iptal sorgusuyla düşüyor (`syncAutomaticReminder` her
   * güncellemede yeniden çağrılıyor). Yani zamanında biten bir görev
   * için "gecikti" bildirimi ÇIKMIYOR.
   */
  const geciken = await kur(gecikenOnek, new Date(record.dueAt.getTime() + DAY_MS))
  return { yaklasan, geciken }
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
  record: { title: string; amount: unknown; currency: string; direction: string; category?: string | null },
  dueLabel: string,
  geciken = false
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
  /* Geciken bildirimde tarih TEK BAŞINA yanıltıcı: geçmiş bir tarih
     görüp "daha var" diye okunabiliyor. Durum açıkça yazılıyor. */
  parcalar.push(geciken ? `vadesi geçti: ${dueLabel}` : `tarih: ${dueLabel}`)

  if (record.category === 'tax' || record.category === 'sgk') parcalar.push(DEADLINE_SOURCES.notice)
  return parcalar.join(' · ')
}

/*
 * ATAMA BİLDİRİMİ.
 *
 * 🔴 Bu YOKTU. `assignedToId` yazılıyordu ama sorumluya hiçbir şey
 * gitmiyordu: birine görev atıyorsun, o kişi listeye kendisi bakmadıkça
 * haberi olmuyor. Vadesi olmayan bir görevde hiç haberi olmuyordu,
 * vadesi olanda da ancak vadeye bir gün kala.
 *
 * ⚠️ KENDİNE ATAYANA BİLDİRİM GİTMİYOR. Kendi yazdığı görevi kendine
 * atamak en sık kullanım; ona bildirim göndermek bildirim kutusunu
 * kullanıcının kendi hareketleriyle doldurup asıl bildirimleri
 * görünmez yapardı.
 *
 * ⚠️ `dedupeKey` YOK (null). Tekilleştirme burada yanlış olurdu: aynı
 * görev birine atanıp geri alınıp yeniden atanırsa ikinci atama da
 * duyurulmalı. Çift bildirim riski yok, çünkü bu işlev yalnızca sorumlu
 * GERÇEKTEN DEĞİŞTİĞİNDE çağrılıyor.
 */
export async function atamaBildirimi(
  tx: ReminderTransaction,
  record: { id: string; workspaceId: string; title: string; assignedToId: number | null; dueAt: Date | null },
  oncekiAssignedToId: number | null,
  actorId: number
) {
  const yeni = record.assignedToId
  if (!yeni || yeni === oncekiAssignedToId || yeni === actorId) return null

  const ayarlar = await tx.businessWorkspace.findUnique({
    where: { id: record.workspaceId },
    select: { settings: { select: { notificationPrefs: true } } }
  })
  let acik = true
  try { acik = JSON.parse(ayarlar?.settings?.notificationPrefs || '{}').assignments !== false }
  catch { acik = true }
  if (!acik) return null

  const tarih = record.dueAt
    ? record.dueAt.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
    : null

  return tx.businessNotification.create({
    data: {
      workspaceId: record.workspaceId,
      userId: yeni,
      recordId: record.id,
      type: 'record_assigned',
      title: 'Size bir görev atandı',
      /* Tarih yoksa UYDURULMUYOR: "tarihsiz" yazmak, olmayan bir
         tarihi ima etmekten iyi. */
      body: tarih ? `${record.title} · tarih: ${tarih}` : `${record.title} · tarihsiz`
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
      /* Tür dedupeKey önekinden okunuyor (bkz. YAKLASAN_ONEK). */
      const geciken = reminder.dedupeKey.startsWith(GECIKEN_ONEK)
      await tx.businessNotification.upsert({
        where: { dedupeKey: `reminder:${reminder.id}` },
        update: {},
        create: {
          workspaceId: reminder.workspaceId,
          userId: reminder.recipientId,
          recordId: reminder.recordId,
          dedupeKey: `reminder:${reminder.id}`,
          type: geciken ? 'record_overdue' : 'record_due',
          title: geciken ? 'Geciken işletme kaydı' : 'Yaklaşan işletme kaydı',
          body: bildirimGovdesi(reminder.record, dueLabel, geciken)
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
