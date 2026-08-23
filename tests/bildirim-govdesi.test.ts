import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { processDueBusinessReminders } from '../src/services/business-reminder-worker.js'

/*
 * HATIRLATMA BİLDİRİMİNİN GÖVDESİ.
 *
 * 🔴 ÜRÜN SAHİBİNİN TESPİTİ: "bildirim yerinde gözüküyor ne olduğu
 * yazmıyor."
 *
 * Ölçüldüğünde haklıydı. Gövde şuydu:
 *     "<başlık> için tarih: 20.01.2009"
 *
 * Yani bildirime bakan kişi TUTARI ve bunun borç mu alacak mı olduğunu
 * göremiyordu -- karar verdirecek iki bilgi eksikti. Bildirimin tek
 * işi, kullanıcıyı uygulamaya sokmadan durumu anlatmaktır.
 */

const prisma = new PrismaClient()

let workspaceId: string
let userId: number

async function hatirlatmaKur(kayit: {
  title: string
  amount: number | null
  currency?: string
  direction: string
}) {
  const record = await prisma.businessRecord.create({
    data: {
      workspaceId,
      type: 'payment',
      title: kayit.title,
      direction: kayit.direction,
      amount: kayit.amount,
      currency: kayit.currency ?? 'TRY',
      status: 'open',
      /* Geçmiş tarih: hatırlatma hemen "vadesi gelmiş" sayılsın. */
      dueAt: new Date('2026-08-20T00:00:00.000Z'),
      createdById: userId
    }
  })
  await prisma.businessReminder.create({
    data: {
      workspaceId,
      recordId: record.id,
      recipientId: userId,
      scheduledAt: new Date('2026-08-19T00:00:00.000Z'),
      channel: 'in_app',
      status: 'pending',
      dedupeKey: `test:${record.id}`
    }
  })
  return record.id
}

async function govdeyiAl(recordId: string) {
  await processDueBusinessReminders(prisma, new Date('2026-08-23T12:00:00.000Z'))
  const bildirim = await prisma.businessNotification.findFirst({
    where: { recordId },
    orderBy: { createdAt: 'desc' }
  })
  return bildirim?.body ?? ''
}

beforeAll(async () => {
  const kullanici = await prisma.user.create({
    data: {
      email: `bildirim-${Date.now()}@ornek.test`,
      password: 'x',
      name: 'Bildirim Testi',
      role: 'learner'
    }
  })
  userId = kullanici.id
  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Bildirim Testi', createdById: userId, status: 'active' }
  })
  workspaceId = ws.id
  await prisma.businessMember.create({
    data: { workspaceId, userId, role: 'owner', status: 'active' }
  })
})

afterAll(async () => {
  await prisma.businessWorkspace.delete({ where: { id: workspaceId } }).catch(() => {})
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('bildirim gövdesi', () => {
  it('tutarı ve para birimini yazar', async () => {
    const id = await hatirlatmaKur({ title: 'Tedarikçi faturası', amount: 1234.5, direction: 'payable' })
    const govde = await govdeyiAl(id)
    expect(govde).toContain('Tedarikçi faturası')
    expect(govde).toContain('TRY')
    expect(govde).toMatch(/1[.,]?234[,.]50/)
  })

  it('borç olduğunu açıkça söyler', async () => {
    const id = await hatirlatmaKur({ title: 'Borç kaydı', amount: 100, direction: 'payable' })
    expect(await govdeyiAl(id)).toContain('ödenecek')
  })

  it('alacak olduğunu açıkça söyler', async () => {
    const id = await hatirlatmaKur({ title: 'Alacak kaydı', amount: 200, direction: 'receivable' })
    expect(await govdeyiAl(id)).toContain('tahsil edilecek')
  })

  /*
   * 🔴 Yön belirsizse UYDURULMUYOR. Bir alacağı "ödenecek" diye
   * bildirmek, hiç bildirmemekten kötüdür.
   */
  it('yön belirsizse borç ya da alacak diye yazmaz', async () => {
    const id = await hatirlatmaKur({ title: 'Belirsiz fatura', amount: 300, direction: 'neutral' })
    const govde = await govdeyiAl(id)
    expect(govde).toContain('yön belirsiz')
    expect(govde).not.toContain('ödenecek')
    expect(govde).not.toContain('tahsil edilecek')
  })

  /* Tutarsız kayıtta uydurma sıfır yazılmıyor. */
  it('tutarsız kayıtta tutar bölümü hiç yazılmaz', async () => {
    const id = await hatirlatmaKur({ title: 'Tutarsız görev', amount: null, direction: 'neutral' })
    const govde = await govdeyiAl(id)
    expect(govde).toContain('Tutarsız görev')
    expect(govde).not.toContain('TRY')
    expect(govde).not.toContain('0,00')
  })

  it('tarih her durumda yazılır', async () => {
    const id = await hatirlatmaKur({ title: 'Tarihli kayıt', amount: 50, direction: 'payable' })
    expect(await govdeyiAl(id)).toContain('tarih:')
  })
})
