import { Prisma, type PrismaClient } from '@prisma/client'
import {
  getMarketplaceProductOverview,
  lineIsReturned,
  resolveLowStockThreshold,
  type MarketplaceProductOverview
} from './product-analytics.js'
import { CIRCUIT_BREAKER_THRESHOLD } from './sync-service.js'

/*
 * MARKETPLACE OPERATIONS AGGREGATE SERVICE + ACTION ENGINE.
 *
 * TEK KAYNAK: Genel Bakis, Ana Sayfa (Dashboard), AI Mentor ve
 * yaklasan/geciken listeleri marketplace verisini YALNIZCA bu
 * servisten okur. Ekran basina ayri hesaplama mantigi YAZILMAZ.
 *
 * Kurallar:
 * - Provider-bagimsizdir: birden fazla IntegrationConnection
 *   gelecekte ayni anda ozetlenir; bugun TRENDYOL tek saglayicidir.
 * - Sayfa acilinda dis pazaryeri cagrisi YAPILMAZ: tum veriler
 *   LocalKarar DB aggregate'lerinden gelir.
 * - Tutarlar SQL/bellek Decimal uzerinden toplanir; serilestirme
 *   sinirinda Number'a gecer. Eksik finansal veri 0 diye
 *   UYDURULMAZ.
 * - Action'lar STATELESS uretilir: her kategori icin TEK aggregate
 *   satir; problem suruyor ise ayni action, problem bitince kaybolur.
 *   Bu semantik duplicate task uretimini yapisal olarak imkansiz
 *   kilar.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * ACTION ESIGLERI — magic number UI'lara GOMULMEZ; hem backend hem
 * frontend dokumantasyonu buradan okunur.
 */
export const MARKETPLACE_ACTION_THRESHOLDS = {
  /** 1-2 bekleyen kargo INFO, 3+ ATTENTION. */
  pendingShipmentInfoMax: 2,
  /** Bu kadar gun once acilmis ve hala kargoya verilmemis siparis gecikmistir. */
  staleOrderDays: 3,
  /** Yuksek iade tespiti icin minimum satis adedi (kucuk ornekte oran anlamsiz). */
  highReturnMinUnits: 5,
  /** Iade orani esigi (0.1 = %10). Mentor baglamiyla ayni deger. */
  highReturnRateThreshold: 0.1,
  /** Sync hatasi bu sureden yeniyse ATTENTION, daha eskiyse CRITICAL. */
  syncErrorAttentionMs: 24 * 60 * 60 * 1000,
  /** Circuit breaker esigi ile ayni sayi: uzun sure veri cekilemiyor. */
  syncCriticalFailureCount: CIRCUIT_BREAKER_THRESHOLD
} as const

export type MarketplaceActionType =
  | 'PENDING_SHIPMENT'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'RETURN_PENDING'
  | 'STALE_ORDER'
  | 'HIGH_RETURN_RATE'
  | 'SYNC_ERROR'

export type MarketplaceActionSeverity = 'INFO' | 'ATTENTION' | 'CRITICAL'

/** Deep link hedefi: mevcut router/query yaklasimina uygun. */
export interface MarketplaceActionLink {
  page: 'orders' | 'products'
  query: Record<string, string>
}

export interface MarketplaceAction {
  type: MarketplaceActionType
  severity: MarketplaceActionSeverity
  count: number
  /** Kullaniciya gosterilen toplu cumle (orn. "4 sipariş kargoya verilmeyi bekliyor"). */
  title: string
  /** Kullaniciya gosterilen opsiyonel kisa aciklama (orn. sync hatasi). */
  detail?: string
  /** Kategori etiketi (Operasyon / Stok / İade / Bağlantı). */
  category: string
  link: MarketplaceActionLink
}

export interface MarketplaceOperationsSummary {
  connected: boolean
  providers: Array<{
    provider: string
    displayName: string | null
    status: string
    lastSyncedAt: Date | null
    lastSuccessfulSyncAt: Date | null
    hasError: boolean
  }>
  today: {
    orderCount: number
    grossSales: number
    pendingShipmentCount: number
    returnCount: number
  }
  inventory: {
    threshold: number
    lowStockCount: number
    outOfStockCount: number
  }
  performance: {
    bestSeller: { title: string; unitsSold: number } | null
    topRevenueProduct: { title: string; grossSales: number } | null
  }
  sync: {
    lastSyncedAt: Date | null
    hasError: boolean
  }
}

export interface MarketplaceOperationsResult {
  summary: MarketplaceOperationsSummary
  actions: MarketplaceAction[]
  /** HIGH_RETURN_RATE action'inin kaynak urunleri (mentor detayi). */
  highReturnProducts: Array<{
    productId: string | null
    externalId: string
    title: string
    unitsSold: number
    returnedUnits: number
    returnRate: number
  }>
}

interface OpenActionCounts {
  pendingShipmentAllTime: number
  returnPendingAllTime: number
  stalePendingCount: number
}

function startOfToday(now = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

function statusCountsFromGroupBy(rows: Array<{ status: string; count: number }>): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) map.set(row.status, row.count)
  return map
}

async function loadOpenActionCounts(prisma: PrismaClient, workspaceId: string): Promise<OpenActionCounts> {
  const now = Date.now()
  const staleBefore = new Date(now - MARKETPLACE_ACTION_THRESHOLDS.staleOrderDays * DAY_MS)

  const [openStatusRows, staleCount] = await Promise.all([
    prisma.marketplaceOrder.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        status: { in: ['CREATED', 'PROCESSING', 'RETURNED', 'PARTIALLY_RETURNED'] as any[] }
      },
      _count: { _all: true }
    }),
    prisma.marketplaceOrder.count({
      where: {
        workspaceId,
        status: { in: ['CREATED', 'PROCESSING'] as any[] },
        orderDate: { lt: staleBefore }
      }
    })
  ])

  const counts = statusCountsFromGroupBy(
    openStatusRows.map(row => ({ status: String(row.status), count: row._count._all }))
  )

  return {
    pendingShipmentAllTime: (counts.get('CREATED') ?? 0) + (counts.get('PROCESSING') ?? 0),
    returnPendingAllTime: (counts.get('RETURNED') ?? 0) + (counts.get('PARTIALLY_RETURNED') ?? 0),
    stalePendingCount: staleCount
  }
}

/** Bugunun siparisleri: SQL tarafinda Decimal toplam + durum kirilimi. */
async function loadTodayOrders(prisma: PrismaClient, workspaceId: string) {
  const rows = await prisma.marketplaceOrder.groupBy({
    by: ['status'],
    where: {
      workspaceId,
      orderDate: { gte: startOfToday() },
      status: { notIn: ['CANCELLED'] as any[] }
    },
    _count: { _all: true },
    _sum: { grossAmount: true }
  })

  let orderCount = 0
  let gross = new Prisma.Decimal(0)
  const counts = new Map<string, number>()
  for (const row of rows) {
    orderCount += row._count._all
    if (row._sum.grossAmount) gross = gross.add(row._sum.grossAmount)
    counts.set(String(row.status), row._count._all)
  }

  return {
    orderCount,
    grossSales: Number(gross.toFixed(2)),
    pendingShipmentCount: (counts.get('CREATED') ?? 0) + (counts.get('PROCESSING') ?? 0),
    returnCount: (counts.get('RETURNED') ?? 0) + (counts.get('PARTIALLY_RETURNED') ?? 0)
  }
}

/**
 * Yuksek iade oranli urunler (HIGH_RETURN_RATE action'i + mentor).
 * Tek, sinirli sorgu; iade kurali product-analytics ile PAYLASILIR.
 */
export async function findHighReturnProducts(
  prisma: PrismaClient,
  workspaceId: string,
  options: { windowDays?: number; minUnits?: number; rateThreshold?: number; limit?: number } = {}
): Promise<Array<{
  productId: string | null
  externalId: string
  title: string
  unitsSold: number
  returnedUnits: number
  returnRate: number
}>> {
  const windowDays = options.windowDays ?? 30
  const minUnits = options.minUnits ?? MARKETPLACE_ACTION_THRESHOLDS.highReturnMinUnits
  const rateThreshold = options.rateThreshold ?? MARKETPLACE_ACTION_THRESHOLDS.highReturnRateThreshold
  const since = new Date(Date.now() - windowDays * DAY_MS)

  const items = await prisma.marketplaceOrderItem.findMany({
    where: {
      order: { workspaceId, orderDate: { gte: since }, status: { notIn: ['CANCELLED', 'UNKNOWN'] as any[] } }
    },
    select: {
      barcode: true,
      sku: true,
      externalProductId: true,
      quantity: true,
      metadata: true,
      order: { select: { status: true } }
    },
    take: 50_000
  })

  const acc = new Map<string, { units: number; returned: number }>()
  for (const item of items) {
    const key = (item.barcode || item.sku || item.externalProductId || '').trim()
    if (!key) continue
    const returned = lineIsReturned(
      String(item.order.status),
      (item.metadata as Record<string, unknown> | null)?.lineStatus
    )
    const entry = acc.get(key) ?? { units: 0, returned: 0 }
    entry.units += item.quantity
    if (returned) entry.returned += item.quantity
    acc.set(key, entry)
  }

  const hits: Array<{ key: string; units: number; returned: number; rate: number }> = []
  for (const [key, value] of acc) {
    if (value.units < minUnits || value.returned === 0) continue
    const rate = value.returned / value.units
    if (rate >= rateThreshold) {
      hits.push({ key, units: value.units, returned: value.returned, rate: Math.round(rate * 10_000) / 10_000 })
    }
  }
  hits.sort((a, b) => b.rate - a.rate || b.units - a.units)
  const selected = hits.slice(0, options.limit ?? 3)

  // Gercek urun basliklari MarketplaceProduct'tan cozulur (siparis
  // satiri degil, urun katalog adini gostermek icin).
  if (selected.length === 0) return []
  const keys = selected.map(hit => hit.key)
  const catalog = await prisma.marketplaceProduct.findMany({
    where: { workspaceId, externalId: { in: keys } },
    select: { id: true, externalId: true, title: true }
  }).catch(() => [])
  const byExternalId = new Map(catalog.map(row => [row.externalId, row]))

  return selected.map(hit => {
    const row = byExternalId.get(hit.key)
    return {
      productId: row?.id ?? null,
      externalId: hit.key,
      title: row?.title ?? hit.key,
      unitsSold: hit.units,
      returnedUnits: hit.returned,
      returnRate: hit.rate
    }
  })
}

export async function getMarketplaceOperationsSummary(
  prisma: PrismaClient,
  workspaceId: string
): Promise<MarketplaceOperationsSummary> {
  const [connections, today, overview, stockRows] = await Promise.all([
    prisma.integrationConnection.findMany({
      where: { workspaceId },
      select: {
        provider: true,
        displayName: true,
        status: true,
        lastSyncedAt: true,
        lastSuccessfulSyncAt: true,
        lastErrorCode: true,
        consecutiveFailureCount: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    loadTodayOrders(prisma, workspaceId),
    getMarketplaceProductOverview(prisma, workspaceId),
    // DUSUK STOK sayimi burada yapilir: stogu 0 olan urun "dusuk"
    // DEGILDIR, kendi CRITICAL kategorisindedir (UI ayirt edici
    // aksiyon gosterir). Override'li esik gecerlidir.
    prisma.marketplaceProduct.findMany({
      where: { workspaceId, isActive: true },
      select: { stockQuantity: true, lowStockThresholdOverride: true }
    })
  ])

  const activeConnections = connections.filter(c => c.status !== 'DISABLED')
  const primary = activeConnections[0] ?? connections[0] ?? null
  const syncHasError = Boolean(
    primary && (
      primary.status === 'ERROR' ||
      primary.consecutiveFailureCount >= MARKETPLACE_ACTION_THRESHOLDS.syncCriticalFailureCount ||
      Boolean(primary.lastErrorCode)
    )
  )

  const threshold = overview.threshold
  const lowStockCount = stockRows.filter(row =>
    row.stockQuantity !== null &&
    row.stockQuantity > 0 &&
    row.stockQuantity <= (row.lowStockThresholdOverride ?? threshold)
  ).length

  return {
    connected: Boolean(primary && primary.status === 'ACTIVE'),
    providers: connections.map(c => ({
      provider: String(c.provider),
      displayName: c.displayName,
      status: c.status,
      lastSyncedAt: c.lastSyncedAt,
      lastSuccessfulSyncAt: c.lastSuccessfulSyncAt,
      hasError: c.status === 'ERROR' || Boolean(c.lastErrorCode)
    })),
    today: {
      orderCount: today.orderCount,
      grossSales: today.grossSales,
      pendingShipmentCount: today.pendingShipmentCount,
      returnCount: today.returnCount
    },
    inventory: {
      threshold,
      lowStockCount,
      outOfStockCount: overview.outOfStockCount
    },
    performance: {
      bestSeller: overview.bestSeller,
      topRevenueProduct: overview.topRevenue
    },
    sync: {
      lastSyncedAt: primary?.lastSuccessfulSyncAt ?? primary?.lastSyncedAt ?? null,
      hasError: syncHasError
    }
  }
}

const SEVERITY_RANK: Record<MarketplaceActionSeverity, number> = { CRITICAL: 0, ATTENTION: 1, INFO: 2 }

/**
 * ACTION ENGINE — stateless, kategori basina TEK aggregate item.
 * Ayni problem surdugu surece ayni action uretilir; problem cozulunce
 * action kendiliginden kaybolur (resolution = olmama).
 */
export function buildMarketplaceActions(
  summary: MarketplaceOperationsSummary,
  extras: {
    openActions: OpenActionCounts
    highReturnCount: number
  }
): MarketplaceAction[] {
  const actions: MarketplaceAction[] = []
  const t = MARKETPLACE_ACTION_THRESHOLDS

  // --- PENDING_SHIPMENT ---
  const pending = Math.max(extras.openActions.pendingShipmentAllTime, summary.today.pendingShipmentCount)
  if (pending > 0) {
    const stale = extras.openActions.stalePendingCount > 0
    const severity: MarketplaceActionSeverity =
      stale ? 'CRITICAL' : pending > t.pendingShipmentInfoMax ? 'ATTENTION' : 'INFO'
    actions.push({
      type: 'PENDING_SHIPMENT',
      severity,
      count: pending,
      title: `${pending} sipariş kargoya verilmeyi bekliyor`,
      category: 'Operasyon',
      link: { page: 'orders', query: { status: 'CREATED,PROCESSING' } }
    })
  }

  // --- STALE_ORDER ---
  if (extras.openActions.stalePendingCount > 0) {
    actions.push({
      type: 'STALE_ORDER',
      severity: 'CRITICAL',
      count: extras.openActions.stalePendingCount,
      title: `${extras.openActions.stalePendingCount} sipariş ${t.staleOrderDays} günden uzun süredir kargoya verilmedi`,
      category: 'Operasyon',
      link: { page: 'orders', query: { status: 'CREATED,PROCESSING' } }
    })
  }

  // --- LOW_STOCK / OUT_OF_STOCK ---
  if (summary.inventory.lowStockCount > 0) {
    actions.push({
      type: 'LOW_STOCK',
      severity: 'ATTENTION',
      count: summary.inventory.lowStockCount,
      title: `${summary.inventory.lowStockCount} ürün düşük stokta`,
      category: 'Stok',
      link: { page: 'products', query: { stockFilter: 'low' } }
    })
  }
  if (summary.inventory.outOfStockCount > 0) {
    actions.push({
      type: 'OUT_OF_STOCK',
      severity: 'CRITICAL',
      count: summary.inventory.outOfStockCount,
      title: `${summary.inventory.outOfStockCount} ürün stokta yok`,
      category: 'Stok',
      link: { page: 'products', query: { stockFilter: 'out' } }
    })
  }

  // --- RETURN_PENDING ---
  if (extras.openActions.returnPendingAllTime > 0) {
    actions.push({
      type: 'RETURN_PENDING',
      severity: 'ATTENTION',
      count: extras.openActions.returnPendingAllTime,
      title: `${extras.openActions.returnPendingAllTime} iade işlemi dikkat istiyor`,
      category: 'İade',
      link: { page: 'orders', query: { status: 'RETURNED,PARTIALLY_RETURNED' } }
    })
  }

  // --- HIGH_RETURN_RATE ---
  if (extras.highReturnCount > 0) {
    actions.push({
      type: 'HIGH_RETURN_RATE',
      severity: 'ATTENTION',
      count: extras.highReturnCount,
      title: `${extras.highReturnCount} üründe iade oranı yüksek`,
      category: 'İade',
      link: { page: 'products', query: { sort: 'mostReturned' } }
    })
  }

  // --- SYNC_ERROR ---
  if (summary.sync.hasError) {
    actions.push(syncAction(summary))
  }

  actions.sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    b.count - a.count
  )
  return actions
}

function syncAction(summary: MarketplaceOperationsSummary): MarketplaceAction {
  const connection = summary.providers.find(p => p.hasError)
  const errorAge = connection?.lastSyncedAt
    ? Date.now() - connection.lastSyncedAt.getTime()
    : Infinity
  const severity: MarketplaceActionSeverity =
    errorAge === Infinity || errorAge > MARKETPLACE_ACTION_THRESHOLDS.syncErrorAttentionMs
      ? 'CRITICAL'
      : 'ATTENTION'
  return {
    type: 'SYNC_ERROR',
    severity,
    count: 1,
    title: 'Pazaryeri verileri güncellenemedi',
    detail: 'Son başarılı eşitleme bir süredir yapılamıyor.',
    category: 'Bağlantı',
    link: { page: 'orders', query: {} }
  }
}

/**
 * ORTAK GIRIS NOKTASI: route + AI Mentor bunu kullanir. Ekranlar
 * hicbir zaman ikinci bir hesaplama yazmaz.
 */
export async function getMarketplaceOperations(
  prisma: PrismaClient,
  workspaceId: string
): Promise<MarketplaceOperationsResult> {
  const [summary, openActions, highReturnProducts] = await Promise.all([
    getMarketplaceOperationsSummary(prisma, workspaceId),
    loadOpenActionCounts(prisma, workspaceId),
    findHighReturnProducts(prisma, workspaceId).catch(() => [])
  ])

  return {
    summary,
    actions: buildMarketplaceActions(summary, {
      openActions,
      highReturnCount: highReturnProducts.length
    }),
    highReturnProducts
  }
}

export type { MarketplaceProductOverview }
export { resolveLowStockThreshold }
