import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { atamaBildirimi, processDueBusinessReminders, syncAutomaticReminder } from '../src/services/business-reminder-worker.js'

/*
 * GÖREV ATAMA VE GECİKME BİLDİRİMLERİ.
 *
 * 🔴 İkisi de YOKTU (ürün sahibi sordu, 09.09.2026):
 *   - Birine görev atanınca o kişiye hiçbir şey gitmiyordu.
 *   - Vade geçtikten sonra hiçbir şey üretilmiyordu; tek hatırlatma
 *     vardı, o da vadeden bir gün önce.
 *
 * Yani bir görev sessizce gecikebiliyor, sorumlu listeye kendisi
 * bakmadıkça haberi olmuyordu.
 */

const prisma = new PrismaClient()

let workspaceId: string
let sahipId: number
let uyeId: number

const VADE = new Date('2026-08-20T00:00:00.000Z')
const VADEDEN_ONCE = new Date('2026-08-19T12:00:00.000Z')
const VADEDEN_SONRA = new Date('2026-08-22T12:00:00.000Z')

async function gorevKur(veri: { assignedToId?: number | null; status?: string } = {}) {
  return prisma.businessRecord.create({
    data: {
      workspaceId,
      type: 'task',
      title: 'Tedarikçiyle fiyat görüşmesi',
      direction: 'neutral',
      status: veri.status ?? 'open',
      dueAt: VADE,
      createdById: sahipId,
      assignedToId: veri.assignedToId ?? null
    }
  })
}

function bildirimler(recordId: string) {
  return prisma.businessNotification.findMany({ where: { recordId }, orderBy: { createdAt: 'asc' } })
}

beforeAll(async () => {
  const damga = Date.now()
  const [sahip, uye] = await Promise.all([
    prisma.user.create({ data: { email: `gorev-sahip-${damga}@ornek.test`, password: 'x', name: 'Sahip' } }),
    prisma.user.create({ data: { email: `gorev-uye-${damga}@ornek.test`, password: 'x', name: 'Üye' } })
  ])
  sahipId = sahip.id
  uyeId = uye.id
  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Görev Bildirimi Testi', createdById: sahipId, status: 'active' }
  })
  workspaceId = ws.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: sahipId, role: 'owner', status: 'active' },
      { workspaceId, userId: uyeId, role: 'staff', status: 'active' }
    ]
  })
})

afterAll(async () => {
  await prisma.businessWorkspace.delete({ where: { id: workspaceId } }).catch(() => {})
  await prisma.user.deleteMany({ where: { id: { in: [sahipId, uyeId] } } }).catch(() => {})
  await prisma.$disconnect()
})

describe('atama bildirimi', () => {
  it('sorumluya bildirim gidiyor', async () => {
    const gorev = await gorevKur({ assignedToId: uyeId })
    await prisma.$transaction(tx => atamaBildirimi(tx, gorev, null, sahipId))
    const cikan = await bildirimler(gorev.id)
    expect(cikan).toHaveLength(1)
    expect(cikan[0].userId).toBe(uyeId)
    expect(cikan[0].type).toBe('record_assigned')
    expect(cikan[0].body).toContain('Tedarikçiyle fiyat görüşmesi')
  })

  /* Kendi yazdığı görevi kendine atamak en sık kullanım; ona bildirim
     göndermek kutuyu kullanıcının kendi hareketleriyle doldururdu. */
  it('kendine atayana bildirim gitmiyor', async () => {
    const gorev = await gorevKur({ assignedToId: sahipId })
    await prisma.$transaction(tx => atamaBildirimi(tx, gorev, null, sahipId))
    expect(await bildirimler(gorev.id)).toHaveLength(0)
  })

  it('sorumlu değişmediyse ikinci bildirim çıkmıyor', async () => {
    const gorev = await gorevKur({ assignedToId: uyeId })
    await prisma.$transaction(tx => atamaBildirimi(tx, gorev, uyeId, sahipId))
    expect(await bildirimler(gorev.id)).toHaveLength(0)
  })

  it('vadesiz görevde tarih uydurulmuyor', async () => {
    const gorev = await prisma.businessRecord.create({
      data: {
        workspaceId, type: 'task', title: 'Vadesiz iş', direction: 'neutral',
        status: 'open', createdById: sahipId, assignedToId: uyeId
      }
    })
    await prisma.$transaction(tx => atamaBildirimi(tx, gorev, null, sahipId))
    const cikan = await bildirimler(gorev.id)
    expect(cikan[0].body).toContain('tarihsiz')
  })
})

describe('gecikme hatırlatması', () => {
  it('vade geçince geciken bildirimi üretiyor', async () => {
    const gorev = await gorevKur({ assignedToId: uyeId })
    await prisma.$transaction(tx => syncAutomaticReminder(tx, gorev, VADEDEN_ONCE))

    await processDueBusinessReminders(prisma, VADEDEN_SONRA)
    const cikan = await bildirimler(gorev.id)
    const tipler = cikan.map(b => b.type)
    expect(tipler).toContain('record_due')
    expect(tipler).toContain('record_overdue')

    const geciken = cikan.find(b => b.type === 'record_overdue')!
    expect(geciken.userId).toBe(uyeId)
    /* Geçmiş bir tarihi tek başına yazmak "daha var" diye okunabiliyor. */
    expect(geciken.body).toContain('vadesi geçti')
  })

  it('tamamlanan görev için gecikme bildirimi çıkmıyor', async () => {
    const gorev = await gorevKur({ assignedToId: uyeId })
    await prisma.$transaction(tx => syncAutomaticReminder(tx, gorev, VADEDEN_ONCE))

    /* Kullanıcı görevi vadesinde bitiriyor: hatırlatmalar iptal olmalı. */
    const biten = await prisma.businessRecord.update({
      where: { id: gorev.id }, data: { status: 'completed', completedAt: VADEDEN_ONCE }
    })
    await prisma.$transaction(tx => syncAutomaticReminder(tx, biten, VADEDEN_ONCE))

    await processDueBusinessReminders(prisma, VADEDEN_SONRA)
    expect(await bildirimler(gorev.id)).toHaveLength(0)
  })
})
