import type { PrismaClient, Prisma } from '@prisma/client'
import { prisma as sharedPrisma } from '../../lib/prisma.js'

/*
 * AGGREGATE / LIST SORGULARI.
 *
 * Dashboard, isletme takibi ve AI Mentor SADECE buradaki
 * normalize edilmis veriyi okur. Toplamlar SQL tarafinda Decimal
 * uzerinden hesaplanir (float kaymasi yok). Bu dosyada provider'a
 * ozgu sorgu YOKTUR.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export interface MarketplaceSummary {
  days: number
  orderCount: number
  grossSales: number
  discountTotal: number
  commissionTotal: number | null
  shippingTotal: number | null
  refundTotal: number | null
  netContribution: number | null
  cancelledCount: number
  returnedCount: number
  /** Komisyon verisi tam olarak bilinmiyorsa arayuz bunu gosterir. */
  financialCompleteness: 'ACTUAL' | 'PARTIAL' | null
  lastSyncedAt: Date | null
  topProducts: Array<{ title: string; quantity: number; grossAmount: number }>
}

export async function getMarketplaceSummary(
  prisma: PrismaClient,
  workspaceId: string,
  days = 30
): Promise<MarketplaceSummary> {
  const to = new Date()
  const from = new Date(to.getTime() - Math.min(Math.max(days, 1), 365) * DAY_MS)

  const where: Prisma.MarketplaceOrderWhereInput = {
    workspaceId,
    orderDate: { gte: from, lte: to },
    status: { notIn: ['CANCELLED'] as any[] }
  }

  const [aggregate, byStatus, connections, topProductsRaw] = await Promise.all([
    prisma.marketplaceOrder.aggregate({
      where,
      _sum: {
        grossAmount: true,
        discountAmount: true,
        commissionAmount: true,
        shippingAmount: true,
        refundAmount: true,
        netContribution: true
      },
      _count: { _all: true }
    }),
    prisma.marketplaceOrder.groupBy({
      by: ['status'],
      where: { workspaceId, orderDate: { gte: from, lte: to } },
      _count: { _all: true }
    }),
    prisma.integrationConnection.findFirst({ where: { workspaceId }, select: { lastSyncedAt: true } }),
    prisma.marketplaceOrderItem.groupBy({
      by: ['title'],
      where: { order: { workspaceId, orderDate: { gte: from, lte: to }, status: { notIn: ['CANCELLED'] as any[] } } },
      _sum: { quantity: true, grossAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    })
  ])

  const sum = aggregate._sum
  const statusCount = (status: string) =>
    byStatus.find(row => row.status === status)?._count._all ?? 0

  return {
    days: Math.min(Math.max(days, 1), 365),
    orderCount: aggregate._count._all,
    grossSales: Number(sum.grossAmount ?? 0),
    discountTotal: Number(sum.discountAmount ?? 0),
    // Komisyon/kargo/iade provider'da tutar olarak yoksa toplam da
    // yoktur: sahte "0" yerine null.
    commissionTotal: sum.commissionAmount === null ? null : Number(sum.commissionAmount),
    shippingTotal: sum.shippingAmount === null ? null : Number(sum.shippingAmount),
    refundTotal: sum.refundAmount === null ? null : Number(sum.refundAmount),
    netContribution: sum.netContribution === null ? null : Number(sum.netContribution),
    cancelledCount: statusCount('CANCELLED'),
    returnedCount:
      statusCount('RETURNED') + statusCount('PARTIALLY_RETURNED'),
    financialCompleteness:
      sum.commissionAmount === null && sum.shippingAmount === null ? 'PARTIAL' : 'ACTUAL',
    lastSyncedAt: connections?.lastSyncedAt ?? null,
    topProducts: topProductsRaw.map(row => ({
      title: row.title,
      quantity: row._sum.quantity ?? 0,
      grossAmount: Number(row._sum.grossAmount ?? 0)
    }))
  }
}

/** Hesaplamalar modulu icin data adapter (hesaplama motoru DEGISTIRILMEZ).
 *  Komisyon ORANI gercek provider verisidir (satir metadata'sindan);
 *  tutar degil oran oldugu icin kullanilabilir. */
export async function getCalculationHints(prisma: PrismaClient, workspaceId: string) {
  const since = new Date(Date.now() - 90 * DAY_MS)
  const items = await prisma.marketplaceOrderItem.findMany({
    where: {
      order: {
        workspaceId,
        orderDate: { gte: since },
        status: { notIn: ['CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED'] as any[] }
      }
    },
    select: {
      unitPrice: true,
      metadata: true,
      order: { select: { currency: true, provider: true } }
    },
    take: 1000
  })

  let sampleSize = 0
  let priceSum = 0
  let commissionPercentSum = 0
  let commissionPercentCount = 0
  let currency: string | null = null
  let provider: string | null = null

  for (const item of items) {
    if (!item.unitPrice || Number(item.unitPrice) <= 0) continue
    sampleSize += 1
    priceSum += Number(item.unitPrice)
    currency = item.order.currency
    provider = item.order.provider
    const meta = item.metadata as Record<string, unknown> | null
    const percent = meta && typeof meta.commissionPercent === 'number' ? meta.commissionPercent : null
    if (percent !== null) {
      commissionPercentSum += percent
      commissionPercentCount += 1
    }
  }

  if (sampleSize === 0) return null

  return {
    source: provider,
    currency: currency ?? 'TRY',
    sampleSize,
    avgUnitPrice: Math.round((priceSum / sampleSize) * 100) / 100,
    avgCommissionPercent: commissionPercentCount > 0
      ? Math.round((commissionPercentSum / commissionPercentCount) * 100) / 100
      : null,
    note: commissionPercentCount > 0
      ? undefined
      : 'Komisyon orani bu baglantida saglanmadi; manuel girilecek.'
  }
}
