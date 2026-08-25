import type { Prisma, PrismaClient } from '@prisma/client'

/*
 * URUN PERFORMANS AGGREGATION SERVISI.
 *
 * KAYNAK DOGRULAMASI (agustos 2026, developers.trendyol.com):
 * Trendyol seller API'sinde urun goruntuleme (views/impressions),
 * favori/begeni veya urun analytics endpoint'i YOKTUR. Bu servis
 * hicbir analytics metrigi UYDURMAZ; yalnizca LocalKarar'in kendi
 * MarketplaceOrderItem x MarketplaceOrder verisinden deterministik
 * toplamlar uretir.
 *
 * NULL KURALLARI:
 * - CANCELLED/UNKNOWN siparisler satis performansina girmez.
 * - RETURNED siparisin tum satirlari iade sayilir; kismi iadede satir
 *   metadata.lineStatus === 'Returned' bayragi kullanilir (mapper,
 *   provider'in gercek orderLineItemStatusName degerini tasiyor).
 * - commissionTotal/shippingTotal/refundTotal yalnizca GERCEK tutar
 *   verisi olan satirlardan toplanir; hic veri yoksa null (0 degil).
 * - netContribution katkida bulunan TUM siparislerde hesaplanabilirse
 *   toplanir; tek bir eksik bilesen varsa sonuc null.
 * - Stok provider'dan gelmiyorsa null tasinir; dusuk stok
 *   degerlendirmesine girmez.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export const PERFORMANCE_WINDOWS = [7, 30, 90] as const

export function resolveLowStockThreshold(explicit?: number | null | undefined): number {
  if (explicit !== undefined && explicit !== null && Number.isFinite(explicit)) {
    return Math.min(Math.max(Math.trunc(explicit), 1), 100_000)
  }
  const raw = Number.parseInt(process.env.MARKETPLACE_LOW_STOCK_THRESHOLD || '', 10)
  return Number.isFinite(raw) && raw > 0 ? raw : 10
}

export interface ProductPerformance {
  windowDays: number
  /** Iptal edilmeyen siparislerdeki toplam adet. */
  unitsSold: number
  /** Urunun bulundugu farkli siparis sayisi. */
  orderCount: number
  grossSales: number
  averageSellingPrice: number | null
  returnedUnits: number
  returnRate: number | null
  /** Gercek komisyon tutari yoksa null. */
  commissionTotal: number | null
  /** Gercek kargo payi yoksa null. */
  shippingTotal: number | null
  /** Gercek iade tutari yoksa null. */
  refundTotal: number | null
  /** Bilesenler eksiksiz degilse null. */
  netContribution: number | null
}

export type PerformanceByKey = Record<number, ProductPerformance>

function emptyPerformance(windowDays: number): ProductPerformance {
  return {
    windowDays,
    unitsSold: 0,
    orderCount: 0,
    grossSales: 0,
    averageSellingPrice: null,
    returnedUnits: 0,
    returnRate: null,
    commissionTotal: null,
    shippingTotal: null,
    refundTotal: null,
    netContribution: null
  }
}

/** Siparis tamamen iadeyse tum satirlar iade; kismi iadede provider'in
 *  gercek satir durumu ('Returned') belirleyicidir. Operations/action
 *  motoru da AYNI kurali kullanir — tek kaynak. */
export function lineIsReturned(orderStatus: string, lineStatus: unknown): boolean {
  if (orderStatus === 'RETURNED') return true
  return typeof lineStatus === 'string' && lineStatus === 'Returned'
}

interface Row {
  key: string
  orderId: string
  quantity: number
  grossAmount: number
  commissionAmount: number | null
  shippingAllocation: number | null
  refundAmount: number | null
  orderDateMs: number
  returned: boolean
  orderNetContribution: number | null
}

async function loadRows(
  prisma: PrismaClient,
  workspaceId: string,
  maxWindowDays: number
): Promise<Row[]> {
  const since = new Date(Date.now() - maxWindowDays * DAY_MS)
  const items = await prisma.marketplaceOrderItem.findMany({
    where: {
      order: {
        workspaceId,
        orderDate: { gte: since },
        status: { notIn: ['CANCELLED', 'UNKNOWN'] as any[] }
      }
    },
    select: {
      orderId: true,
      barcode: true,
      sku: true,
      externalProductId: true,
      quantity: true,
      grossAmount: true,
      commissionAmount: true,
      shippingAllocation: true,
      refundAmount: true,
      metadata: true,
      order: { select: { orderDate: true, status: true, netContribution: true } }
    },
    take: 50_000 // guvenli ust sinir; MVP hacminde cok uzerinde
  })

  const rows: Row[] = []
  for (const item of items) {
    const key = (item.barcode || item.sku || item.externalProductId || '').trim()
    if (!key) continue
    rows.push({
      key,
      orderId: item.orderId,
      quantity: item.quantity,
      grossAmount: Number(item.grossAmount ?? 0),
      commissionAmount: item.commissionAmount === null ? null : Number(item.commissionAmount),
      shippingAllocation: item.shippingAllocation === null ? null : Number(item.shippingAllocation),
      refundAmount: item.refundAmount === null ? null : Number(item.refundAmount),
      orderDateMs: item.order.orderDate.getTime(),
      returned: lineIsReturned(String(item.order.status), (item.metadata as Record<string, unknown> | null)?.lineStatus),
      orderNetContribution: item.order.netContribution === null ? null : Number(item.order.netContribution)
    })
  }
  return rows
}

interface Accumulator {
  perf: ProductPerformance
  orderIds: Set<string>
  /** Siparis basina son bilinen net katki; tamamlanma kontrolu icin. */
  netByOrder: Map<string, number | null>
}

function newAccumulator(windowDays: number): Accumulator {
  return { perf: emptyPerformance(windowDays), orderIds: new Set(), netByOrder: new Map() }
}

function accumulate(acc: Accumulator, row: Row): void {
  acc.perf.unitsSold += row.quantity
  acc.perf.grossSales += row.grossAmount
  acc.perf.returnedUnits += row.returned ? row.quantity : 0
  acc.orderIds.add(row.orderId)
  if (row.commissionAmount !== null) acc.perf.commissionTotal = (acc.perf.commissionTotal ?? 0) + row.commissionAmount
  if (row.shippingAllocation !== null) acc.perf.shippingTotal = (acc.perf.shippingTotal ?? 0) + row.shippingAllocation
  if (row.refundAmount !== null) acc.perf.refundTotal = (acc.perf.refundTotal ?? 0) + row.refundAmount
  acc.netByOrder.set(row.orderId, row.orderNetContribution)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function finalize(acc: Accumulator): ProductPerformance {
  const perf = acc.perf
  perf.grossSales = round2(perf.grossSales)
  perf.averageSellingPrice = perf.unitsSold > 0 ? round2(perf.grossSales / perf.unitsSold) : null
  perf.returnRate = perf.unitsSold > 0 ? Math.round((perf.returnedUnits / perf.unitsSold) * 10_000) / 10_000 : null
  perf.commissionTotal = perf.commissionTotal === null ? null : round2(perf.commissionTotal)
  perf.shippingTotal = perf.shippingTotal === null ? null : round2(perf.shippingTotal)
  perf.refundTotal = perf.refundTotal === null ? null : round2(perf.refundTotal)

  const nets = [...acc.netByOrder.values()]
  const complete = nets.length > 0 && nets.every(v => v !== null)
  perf.netContribution = complete ? round2(nets.reduce<number>((sum, v) => sum + (v ?? 0), 0)) : null
  perf.orderCount = acc.orderIds.size
  return perf
}

/**
 * Urun anahtari (externalId) -> pencere bazli performans.
 * 90 gunluk veriyi TEK sorguda ceker; 7/30/90 pencerelerine ayri
 * biriktirir (ayni veri ucer kez sorgulanmaz).
 */
export async function getProductPerformanceByKey(
  prisma: PrismaClient,
  workspaceId: string,
  windows: readonly number[] = PERFORMANCE_WINDOWS
): Promise<Map<string, PerformanceByKey>> {
  const uniqueWindows = [...new Set(windows)].sort((a, b) => a - b)
  const maxDays = uniqueWindows[uniqueWindows.length - 1]
  if (!maxDays || maxDays < 1) return new Map()

  const rows = await loadRows(prisma, workspaceId, maxDays)
  const now = Date.now()

  // key -> windowDays -> accumulator
  const accumulators = new Map<string, Map<number, Accumulator>>()
  for (const row of rows) {
    let byWindow = accumulators.get(row.key)
    if (!byWindow) { byWindow = new Map(); accumulators.set(row.key, byWindow) }

    for (const windowDays of uniqueWindows) {
      if (row.orderDateMs < now - windowDays * DAY_MS) continue
      let acc = byWindow.get(windowDays)
      if (!acc) { acc = newAccumulator(windowDays); byWindow.set(windowDays, acc) }
      accumulate(acc, row)
    }
  }

  const result = new Map<string, PerformanceByKey>()
  for (const [key, byWindow] of accumulators) {
    const entry: PerformanceByKey = {}
    for (const [windowDays, acc] of byWindow) entry[windowDays] = finalize(acc)
    result.set(key, entry)
  }
  return result
}

// ---------------------------------------------------------------------------
// LISTE / DETAY / OVERVIEW
// ---------------------------------------------------------------------------

export type StockFilter = 'all' | 'low' | 'out'
export type ProductSort = 'title' | 'bestSelling' | 'topRevenue' | 'mostReturned'

export interface ProductListOptions {
  q?: string
  provider?: string
  onSale?: boolean
  stockFilter?: StockFilter
  sort?: ProductSort
  windowDays?: number
  lowStockThreshold?: number
}

export interface ProductPerformanceView extends ProductPerformance {
  /** Komisyon/kargo/iade/net verisi eksikse arayuz bunu "veri yok" olarak gosterir. */
  financialsAvailable: boolean
}

export interface ProductListItem {
  id: string
  provider: string
  externalId: string
  title: string
  brand: string | null
  category: string | null
  sku: string | null
  barcode: string | null
  salePrice: number | null
  listPrice: number | null
  stockQuantity: number | null
  isActive: boolean
  /** Provider'in gercek gorseli; yoksa null (UI notr placeholder). */
  imageUrl: string | null
  syncedAt: Date
  lowStock: boolean
  performance: ProductPerformance
  /// --- LocalKarar yerel ayarlari (sync ezmez) ---
  internalNote: string | null
  tags: string[] | null
  lowStockThresholdOverride: number | null
  isFavorite: boolean
}

type ProductRow = {
  id: string
  provider: string
  externalId: string
  title: string
  brand: string | null
  category: string | null
  sku: string | null
  barcode: string | null
  salePrice: Prisma.Decimal | null
  listPrice: Prisma.Decimal | null
  stockQuantity: number | null
  isActive: boolean
  imageUrl: string | null
  syncedAt: Date
  internalNote: string | null
  tags: unknown
  lowStockThresholdOverride: number | null
  isFavorite: boolean
}

function normalizeTags(tags: unknown): string[] | null {
  if (!Array.isArray(tags)) return null
  const cleaned = tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  return cleaned.length > 0 ? cleaned : null
}

function productListItemFromRow(row: ProductRow, threshold: number, windowDays: number): ProductListItem {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.externalId,
    title: row.title,
    brand: row.brand,
    category: row.category,
    sku: row.sku,
    barcode: row.barcode,
    salePrice: row.salePrice === null ? null : Number(row.salePrice),
    listPrice: row.listPrice === null ? null : Number(row.listPrice),
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    imageUrl: row.imageUrl ?? null,
    syncedAt: row.syncedAt,
    lowStock: isLowStock(row.stockQuantity, threshold, row.lowStockThresholdOverride),
    performance: emptyPerformance(windowDays),
    internalNote: row.internalNote ?? null,
    tags: normalizeTags(row.tags),
    lowStockThresholdOverride: row.lowStockThresholdOverride ?? null,
    isFavorite: row.isFavorite
  }
}

function perfFor(entry: PerformanceByKey | undefined, windowDays: number): ProductPerformance {
  return entry?.[windowDays] ?? emptyPerformance(windowDays)
}

/** Dusuk stok esigi LocalKarar tarafindadir; provider stoku YOKSA
 *  (null) urun degerlendirmeye girmez — "0 stok" varsayimi yapilmaz.
 *  Urun bazli override tanimliysa o deger gecerlidir. */
export function isLowStock(
  stockQuantity: number | null | undefined,
  threshold: number,
  thresholdOverride?: number | null
): boolean {
  if (stockQuantity === null || stockQuantity === undefined) return false
  const effective = thresholdOverride ?? threshold
  return stockQuantity <= effective
}

export async function listProductsWithMetrics(
  prisma: PrismaClient,
  workspaceId: string,
  options: ProductListOptions = {}
): Promise<{ products: ProductListItem[]; total: number; threshold: number; windowDays: number }> {
  const {
    q, provider, onSale, stockFilter,
    sort = 'title',
    windowDays = 30,
    lowStockThreshold
  } = options
  const threshold = resolveLowStockThreshold(lowStockThreshold)

  const products = await prisma.marketplaceProduct.findMany({
    where: {
      workspaceId,
      ...(provider ? { provider: provider as any } : {}),
      ...(onSale !== undefined ? { isActive: onSale } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { sku: { contains: q, mode: 'insensitive' as const } },
          { barcode: { contains: q, mode: 'insensitive' as const } }
        ]
      } : {})
    },
    orderBy: [{ title: 'asc' }],
    take: 1000
  })

  // Stok filtresi DB'de YAPILAMAZ: dusuk stok esigi LocalKarar
  // tarfindadir (urun bazli override dahil) ve null stok "dusuk"
  // sayilamaz. Bu yuzden urunler cekilip bellekte elenir.
  let items: ProductListItem[] = products.map(product => productListItemFromRow(product as ProductRow, threshold, windowDays))

  if (stockFilter === 'low') items = items.filter(item => item.lowStock)
  if (stockFilter === 'out') items = items.filter(item => item.stockQuantity === 0)

  // Performans yalnizca goruntulenecek satirlar icin birlestirilir;
  // siralama aggregate uzerinden sunucuda yapilir.
  if (items.length > 0) {
    const perfMap = await getProductPerformanceByKey(prisma, workspaceId, [windowDays])
    for (const item of items) {
      item.performance = perfFor(perfMap.get(item.externalId), windowDays)
    }
  }

  switch (sort) {
    case 'bestSelling':
      items.sort((a, b) => b.performance.unitsSold - a.performance.unitsSold || a.title.localeCompare(b.title))
      break
    case 'topRevenue':
      items.sort((a, b) => b.performance.grossSales - a.performance.grossSales || a.title.localeCompare(b.title))
      break
    case 'mostReturned':
      items.sort((a, b) => b.performance.returnedUnits - a.performance.returnedUnits || a.title.localeCompare(b.title))
      break
    default:
      items.sort((a, b) => a.title.localeCompare(b.title))
  }

  return { products: items, total: items.length, threshold, windowDays }
}

export async function getProductDetailWithMetrics(
  prisma: PrismaClient,
  workspaceId: string,
  productId: string,
  lowStockThreshold?: number
): Promise<{ product: ProductListItem; performance: PerformanceByKey } | null> {
  const product = await prisma.marketplaceProduct.findFirst({
    where: { id: productId, workspaceId }
  })
  if (!product) return null

  const threshold = resolveLowStockThreshold(lowStockThreshold)
  const perfByWindow = await getProductPerformanceByKey(prisma, workspaceId)

  const base = productListItemFromRow(product as unknown as ProductRow, threshold, 30)
  base.performance = perfFor(perfByWindow.get(product.externalId), 30)

  const performance: PerformanceByKey = {}
  for (const windowDays of PERFORMANCE_WINDOWS) {
    performance[windowDays] = perfFor(perfByWindow.get(product.externalId), windowDays)
  }

  return { product: base, performance }
}

export interface MarketplaceProductOverview {
  threshold: number
  lowStockCount: number
  totalProducts: number
  outOfStockCount: number
  bestSeller: { title: string; unitsSold: number } | null
  topRevenue: { title: string; grossSales: number } | null
}

/** Dashboard/AI Mentor icin urun ozeti (yalnizca DB aggregate).
 *  Dusuk stok sayiminda urun bazli threshold override gecerlidir. */
export async function getMarketplaceProductOverview(
  prisma: PrismaClient,
  workspaceId: string,
  lowStockThreshold?: number
): Promise<MarketplaceProductOverview> {
  const threshold = resolveLowStockThreshold(lowStockThreshold)
  const products = await prisma.marketplaceProduct.findMany({
    where: { workspaceId },
    select: { title: true, stockQuantity: true, lowStockThresholdOverride: true }
  })

  let bestSeller: MarketplaceProductOverview['bestSeller'] = null
  let topRevenue: MarketplaceProductOverview['topRevenue'] = null

  // Urun basligiyla birlikte en iyi satici/ciro sahibi:
  if (products.length > 0) {
    const full = await prisma.marketplaceProduct.findMany({
      where: { workspaceId },
      select: { title: true, externalId: true, stockQuantity: true }
    })
    const perfMap = await getProductPerformanceByKey(prisma, workspaceId, [30])
    for (const row of full) {
      const perf = perfFor(perfMap.get(row.externalId), 30)
      if (!bestSeller || perf.unitsSold > bestSeller.unitsSold) {
        bestSeller = { title: row.title, unitsSold: perf.unitsSold }
      }
      if (!topRevenue || perf.grossSales > topRevenue.grossSales) {
        topRevenue = { title: row.title, grossSales: perf.grossSales }
      }
    }
    if (bestSeller && bestSeller.unitsSold === 0) bestSeller = null
    if (topRevenue && topRevenue.grossSales === 0) topRevenue = null
  }

  return {
    threshold,
    lowStockCount: products.filter(p => isLowStock(p.stockQuantity, threshold, p.lowStockThresholdOverride)).length,
    totalProducts: products.length,
    outOfStockCount: products.filter(p => p.stockQuantity === 0).length,
    bestSeller,
    topRevenue
  }
}


