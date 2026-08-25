import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  dusukStokBildirimi,
  gecikenKargoBildirimi
} from '../../src/services/integrations/marketplace-notifications.js'

/*
 * PAZARYERI BILDIRIMLERI.
 *
 * 🔴 NEDEN VAR: pazaryeri katmani hicbir `BusinessNotification`
 * uretmiyordu. Stok esigi tanimliydi ve veri cekiliyordu ama zil
 * ikonuna HIC dusmuyordu -- kullanici ekrani acmadikca stogunun
 * bittigini ogrenemiyordu.
 */

const prisma = new PrismaClient()
const damga = Date.now()
let workspaceId: string
let ownerId: number
let uyeId: number

const GUN_MS = 24 * 60 * 60 * 1000

async function urunEkle(externalId: string, stok: number, aktif = true) {
  return prisma.marketplaceProduct.create({
    data: {
      workspaceId, provider: 'TRENDYOL' as any, externalId,
      title: `Urun ${externalId}`, stockQuantity: stok, isActive: aktif
    }
  })
}

async function siparisEkle(externalId: string, durum: string, gunOnce: number) {
  return prisma.marketplaceOrder.create({
    data: {
      workspaceId, provider: 'TRENDYOL' as any, externalId, currency: 'TRY',
      grossAmount: 100, status: durum as any,
      orderDate: new Date(Date.now() - gunOnce * GUN_MS)
    }
  })
}

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { email: `mp-bildirim-o-${damga}@test.local`, password: 'x', name: 'Sahip', role: 'learner' }
  })
  const uye = await prisma.user.create({
    data: { email: `mp-bildirim-u-${damga}@test.local`, password: 'x', name: 'Personel', role: 'learner' }
  })
  ownerId = owner.id
  uyeId = uye.id

  const ws = await prisma.businessWorkspace.create({
    data: { name: 'Bildirim Testi', createdById: ownerId, status: 'active' }
  })
  workspaceId = ws.id
  await prisma.businessMember.createMany({
    data: [
      { workspaceId, userId: ownerId, role: 'owner', status: 'active' },
      /* `staff` bilerek: bildirim yalnizca yonetici seviyesine gitmeli. */
      { workspaceId, userId: uyeId, role: 'staff', status: 'active' }
    ]
  })
})

afterAll(async () => {
  await prisma.businessWorkspace.deleteMany({ where: { id: workspaceId } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, uyeId] } } })
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.businessNotification.deleteMany({ where: { workspaceId } })
  await prisma.marketplaceProduct.deleteMany({ where: { workspaceId } })
  await prisma.marketplaceOrder.deleteMany({ where: { workspaceId } })
})

describe('dusuk stok bildirimi', () => {
  it('esigin altindaki urunler icin TEK bildirim uretiyor', async () => {
    /* 🔴 Urun basina bildirim YOK: 3 urun bitse zil 3 kez calmamali,
       aksi halde bildirim alani kullanilamaz hale gelirdi. */
    await urunEkle('U1', 2)
    await urunEkle('U2', 5)
    await urunEkle('U3', 1)

    await dusukStokBildirimi(prisma, workspaceId)

    const bildirimler = await prisma.businessNotification.findMany({ where: { workspaceId } })
    expect(bildirimler).toHaveLength(1)
    expect(bildirimler[0].userId).toBe(ownerId)
    expect(bildirimler[0].title).toContain('3 üründe')
  })

  it('🔴 ayni gun IKINCI kez bildirim yazmiyor', async () => {
    /* Esitleme gunde birden cok kez kosuyor. */
    await urunEkle('U1', 2)
    const ilk = await dusukStokBildirimi(prisma, workspaceId)
    const ikinci = await dusukStokBildirimi(prisma, workspaceId)

    expect(ilk).toBe(1)
    expect(ikinci).toBe(0)
    expect(await prisma.businessNotification.count({ where: { workspaceId } })).toBe(1)
  })

  it('sayi DEGISINCE yeni bildirim cikiyor', async () => {
    /* Durum degistiyse haber vermek gerekiyor; degismediyse susmak. */
    await urunEkle('U1', 2)
    await dusukStokBildirimi(prisma, workspaceId)
    await urunEkle('U2', 3)
    await dusukStokBildirimi(prisma, workspaceId)

    expect(await prisma.businessNotification.count({ where: { workspaceId } })).toBe(2)
  })

  it('stogu SIFIR olan urun "azaldi" sayilmiyor', async () => {
    /* Sifir stok tukenmistir; "azaldi" demek bitmis urunu var gibi
       gostermek olurdu. */
    await urunEkle('U1', 0)
    const yazilan = await dusukStokBildirimi(prisma, workspaceId)
    expect(yazilan).toBe(0)
  })

  it('pasif urun sayilmiyor', async () => {
    await urunEkle('U1', 2, false)
    expect(await dusukStokBildirimi(prisma, workspaceId)).toBe(0)
  })

  it('bildirim yalnizca YONETICI seviyesine gidiyor', async () => {
    await urunEkle('U1', 2)
    await dusukStokBildirimi(prisma, workspaceId)
    const alicilar = (await prisma.businessNotification.findMany({ where: { workspaceId } }))
      .map(b => b.userId)
    expect(alicilar).toContain(ownerId)
    expect(alicilar).not.toContain(uyeId)
  })
})

describe('geciken kargo bildirimi', () => {
  it('esigi asan bekleyen siparisler icin bildirim uretiyor', async () => {
    await siparisEkle('S1', 'CREATED', 5)
    await siparisEkle('S2', 'PROCESSING', 4)

    await gecikenKargoBildirimi(prisma, workspaceId)
    const b = await prisma.businessNotification.findFirst({ where: { workspaceId } })
    expect(b?.type).toBe('marketplace_late_shipment')
    expect(b?.title).toContain('2 sipariş')
  })

  it('BUGUNKU siparis geciken sayilmiyor', async () => {
    /* Bugun gelen siparise "geciktin" demek yanlis olurdu. */
    await siparisEkle('S1', 'CREATED', 0)
    expect(await gecikenKargoBildirimi(prisma, workspaceId)).toBe(0)
  })

  it('kargolanmis siparis geciken sayilmiyor', async () => {
    await siparisEkle('S1', 'SHIPPED', 10)
    await siparisEkle('S2', 'DELIVERED', 10)
    expect(await gecikenKargoBildirimi(prisma, workspaceId)).toBe(0)
  })

  it('ayni gun tekrar bildirim yazmiyor', async () => {
    await siparisEkle('S1', 'CREATED', 5)
    expect(await gecikenKargoBildirimi(prisma, workspaceId)).toBe(1)
    expect(await gecikenKargoBildirimi(prisma, workspaceId)).toBe(0)
  })
})
