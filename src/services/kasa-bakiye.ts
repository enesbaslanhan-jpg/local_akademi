import { Prisma, type PrismaClient } from '@prisma/client'

/*
 * KASA / BANKA BAKİYESİ — tek hesap.
 *
 * Önce yalnız `GET /accounts` içinde satır satır duruyordu. Genel Bakış
 * "kasada bugün ne var" kutusunu isteyince aynı hesabın ikinci kopyası
 * yazılacaktı; iki kopya bugün aynı sonucu verir ama biri değişince
 * sessizce ayrışırdı -- kasa ekranı ₺12.000 derken Genel Bakış ₺11.500
 * gösterebilirdi. Buraya alındı, iki uç da bunu çağırıyor.
 *
 * ⚠️ Ayrı dosya, business-tracker ile business-finance birbirini
 * çağırmasın diye (finance zaten tracker'dan `access` alıyor).
 *
 * Bakiye = açılış + tamamlanan tahsilatlar − tamamlanan ödemeler.
 * POS valörü (`settlementAt`) henüz gelmemişse bakiyeye GİRMEZ; o para
 * "yolda" (`inTransit`). Kart çekimi bugün olur, para 1-30 gün sonra
 * hesaba düşer; ikisini aynı saymak nakit akışını en çok bozan şeydir.
 */
export type HesapBakiyesi = {
  id: string
  name: string
  type: string
  currency: string
  balance: string
  inTransit: string
  [k: string]: unknown
}

export async function hesapBakiyeleri(prisma: PrismaClient, workspaceId: string): Promise<HesapBakiyesi[]> {
  const now = new Date()
  const accounts = await prisma.businessAccount.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: 'asc' }
  })
  const balances: HesapBakiyesi[] = []
  for (const account of accounts) {
    const settled = await prisma.businessRecord.groupBy({
      by: ['direction'],
      where: {
        workspaceId, accountId: account.id, archivedAt: null, status: 'completed',
        OR: [
          { settlementAt: null, completedAt: { gte: account.openingAt, lte: now } },
          { settlementAt: { gte: account.openingAt, lte: now } }
        ]
      },
      _sum: { amount: true }
    })
    let balance = account.openingBalance
    for (const group of settled) {
      balance = group.direction === 'receivable' ? balance.plus(group._sum.amount ?? 0)
        : group.direction === 'payable' ? balance.minus(group._sum.amount ?? 0) : balance
    }
    const pending = await prisma.businessRecord.aggregate({
      where: {
        workspaceId, accountId: account.id, direction: 'receivable',
        archivedAt: null, status: { not: 'cancelled' }, settlementAt: { gt: now }
      },
      _sum: { amount: true }
    })
    balances.push({
      ...account,
      balance: balance.toFixed(2),
      inTransit: (pending._sum.amount ?? new Prisma.Decimal(0)).toFixed(2)
    })
  }
  return balances
}

/*
 * Genel Bakış kutusu için tek sayı.
 *
 * 🔴 PARA BİRİMLERİ TOPLANMIYOR (cari hesapla aynı kural, kur yok).
 * Hesaplar farklı para birimindeyse `total` null döner ve arayüz
 * "N hesap" yazar; uydurma bir toplam yazmaz.
 */
export function kasaToplami(hesaplar: HesapBakiyesi[]) {
  if (hesaplar.length === 0) return null
  const birim = hesaplar[0].currency
  const ayni = hesaplar.every(h => h.currency === birim)
  const total = ayni ? hesaplar.reduce((s, h) => s + Number(h.balance), 0) : null
  return { total, currency: birim, accountCount: hesaplar.length }
}
