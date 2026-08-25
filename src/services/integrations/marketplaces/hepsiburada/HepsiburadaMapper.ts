import type { NormalizedOrder, NormalizedOrderItem, NormalizedOrderStatus, NormalizedProduct } from '../../types.js'
import { sanitizeProductImageUrl } from '../trendyol/TrendyolMapper.js'
import type { HepsiburadaCatalogProductRow, HepsiburadaListingRow, HepsiburadaOrderLine, HepsiburadaPackageRow } from './HepsiburadaTypes.js'

/*
 * HEPSIBURADA -> LOCALKARAR NORMALIZASYON.
 *
 * Kurallar (resmi dokuman + "tahmin yasagi"):
 * - Siparis lifecycle paketler uzerinden okunur; durum metni bilinen
 *   resmi degerlerle eslenir, taninmayanlar UNKNOWN kalir (yanlis
 *   tahmin YOK).
 * - Komisyon/kargo/iade TUTARLARI siparis payload'inda yok: null.
 *   (Komisyon ORANI ayri /listings/commissions ucunden capability
 *   olarak bildirilir; bu gorevde sync'e karistirilmaz.)
 * - PII minimize: yalnizca ad + soyad bas harfi. Adres/telefon/e-posta
 *   hicbir alana yazilmaz.
 * - Gorseller yalnizca katalog gercek URL verirse saklanir; yoksa null
 *   (sahte gorsel yok). Trendyol ile AYNI sanitizer kullanilir.
 */

/** Resmi durum metinleri -> normalize status. Bilinmeyen -> UNKNOWN. */
export function mapHepsiburadaStatus(rawStatus?: string | null): NormalizedOrderStatus {
  const value = String(rawStatus || '').trim().toLowerCase()
  if (!value) return 'UNKNOWN'

  // "undelivered" once eleme: 'delivered' alt-dizesini tasir.
  if (value.includes('undelivered') || (value.includes('delivered') && value.includes('not'))) return 'UNKNOWN'
  if (value.includes('delivered')) {
    // "Delivered - Returned" gibi birlesik metinlerde iade oncelidir.
    if (value.includes('return')) return 'RETURNED'
    return 'DELIVERED'
  }
  if (value.includes('returned') || value.includes('return in progress')) return 'RETURNED'
  if (value === 'cancelled' || value.includes('cancel')) return 'CANCELLED'
  if (value.includes('shipped') || value.includes('shipping') || value.includes('intransit') || value.includes('in transit')) return 'SHIPPED'
  if (value.includes('picking') || value.includes('packaging') || value.includes('processing')) return 'PROCESSING'
  if (value.includes('unpacked') || value.includes('created') || value.includes('open') || value.includes('new') || value.includes('awaiting') || value.includes('received')) return 'CREATED'
  return 'UNKNOWN'
}

/** "Ayse K." — PII minimize edilmis gosterim adi. */
export function minimizeHepsiburadaCustomerName(raw?: Record<string, unknown> | null): string | null {
  if (!raw) return null
  let first = ''
  let last = ''
  if (typeof raw.customerName === 'string' && raw.customerName.trim()) {
    const parts = raw.customerName.trim().split(/\s+/)
    first = parts[0] ?? ''
    last = parts.length > 1 ? parts[parts.length - 1] : ''
  } else {
    const customer = raw.customer as Record<string, unknown> | undefined
    if (customer && typeof customer === 'object') {
      first = String(customer.firstName ?? customer.name ?? '').trim()
      last = String(customer.lastName ?? '').trim()
    } else if (typeof raw.recipientName === 'string') {
      const parts = raw.recipientName.trim().split(/\s+/)
      first = parts[0] ?? ''
      last = parts.length > 1 ? parts[parts.length - 1] : ''
    }
  }
  if (!first && !last) return null
  const lastInitial = last ? `${last.charAt(0)}.` : ''
  return `${first}${first && lastInitial ? ' ' : ''}${lastInitial}`
}

function pickFinite(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    const num = Number(value)
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(num)) return num
  }
  return undefined
}

export function mapHepsiburadaLineToNormalizedItem(lineRaw: unknown): NormalizedOrderItem | null {
  if (!lineRaw || typeof lineRaw !== 'object') return null
  const line = lineRaw as HepsiburadaOrderLine

  const quantity = Math.trunc(pickFinite(line.quantity) ?? 0)
  const unitPrice = pickFinite(line.price)
  const grossAmount = pickFinite(line.amount, unitPrice !== undefined ? unitPrice * quantity : undefined)

  const title = String(line.productName || line.merchantSku || line.sku || 'Urun').slice(0, 500)
  const externalId = line.id !== undefined && line.id !== null ? String(line.id)
    : line.lineItemId !== undefined && line.lineItemId !== null ? String(line.lineItemId)
      : null

  const metadata: Record<string, unknown> = {}
  if (line.status) metadata.lineStatus = String(line.status)
  if (line.merchantSku) metadata.merchantSku = line.merchantSku

  return {
    externalId,
    externalProductId: line.sku ? String(line.sku) : null,
    sku: line.merchantSku || line.sku || null,
    barcode: line.barcode || (line.oemTcknId ? String(line.oemTcknId) : null),
    title,
    quantity: Math.max(0, quantity),
    unitPrice: unitPrice ?? null,
    grossAmount: grossAmount ?? null,
    discountAmount: null,
    // Provider komisyon/kargo/iade TUTARI vermiyor -> null (uydurma yok).
    commissionAmount: null,
    shippingAllocation: null,
    refundAmount: null,
    netContribution: null,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

/**
 * Paket satirini normalize eder. Kalem listesi provider'in hangi anahtar
 * altinda geldigi belirsiz oldugundan savunmaci okunur; hic kalem
 * cikarilamazsa null doner — UYDURULMUS tek kalem bile uretilmez.
 */
export function mapHepsiburadaPackageToNormalizedOrder(
  row: HepsiburadaPackageRow & Record<string, unknown>
): NormalizedOrder | null {
  const externalId = row.packageNumber || row.orderNumber || ''
  if (!externalId) return null

  const linesRaw: unknown[] = Array.isArray(row.lines)
    ? row.lines
    : Array.isArray(row.items)
      ? row.items
      : Array.isArray(row.orderLines)
        ? row.orderLines
        : []

  const items = linesRaw
    .map(mapHepsiburadaLineToNormalizedItem)
    .filter((item): item is NormalizedOrderItem => item !== null)

  if (items.length === 0) return null

  // Paket duzeyinde toplam provider'dan gelmiyorsa satirlardan toplanir;
  // satir tutari da yoksa gross 0 degil null-uyumlu minimum tutulur.
  const packageTotal = pickFinite((row as { total?: unknown }).total, (row as { price?: unknown }).price)
  const grossAmount = packageTotal
    ?? items.reduce<number>((sum, item) => sum + (item.grossAmount ?? 0), 0)

  const metadata: Record<string, unknown> = {}
  if (row.orderNumber) metadata.orderNumber = row.orderNumber
  if (row.cargoCompany) metadata.cargoProviderName = String(row.cargoCompany)
  if (row.trackingNumber) metadata.cargoTrackingNumber = String(row.trackingNumber)

  const orderDate = parseDate(row.createdDate) ?? new Date()

  return {
    externalId,
    externalOrderNumber: row.orderNumber || null,
    externalCustomerId: null,
    customerDisplayName: minimizeHepsiburadaCustomerName(row),
    currency: 'TRY',
    grossAmount,
    discountAmount: null,
    commissionAmount: null,
    shippingAmount: null,
    refundAmount: null,
    taxAmount: null,
    netContribution: null,
    status: mapHepsiburadaStatus(row.status),
    orderDate,
    providerUpdatedAt: parseDate(row.modifiedDate),
    items,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

// ---------------------------------------------------------------------------
// URUNLER: listing (fiyat/stok/satis) + catalog (baslik/marka/kategori/gorsel)
// ---------------------------------------------------------------------------

/** Catalog `fields` haritasindan string deger cozer. */
function fieldString(catalog?: HepsiburadaCatalogProductRow | null, ...keys: string[]): string | null {
  if (!catalog) return null
  for (const key of keys) {
    const fromField = (catalog.fields?.[key] as { value?: unknown } | undefined)?.value
    const candidate = fromField ?? (catalog as Record<string, unknown>)[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
  }
  return null
}

/** Catalog images alanini URL dizisine cozer: string[] | {url}[] | CSV.
 *  Deger dogrudan alanda veya resmi modeldeki { value } sarmalayicisinda
 *  olabilir; ikisi de taranir. */
export function extractHepsiburadaImages(catalog?: HepsiburadaCatalogProductRow | null): string[] {
  if (!catalog) return []
  const candidates: unknown[] = [
    (catalog.fields?.images as { value?: unknown } | undefined)?.value,
    catalog.fields?.images,
    (catalog as Record<string, unknown>).images
  ]
  for (const candidate of candidates) {
    const urls = coerceImageList(candidate)
    if (urls.length > 0) return urls
  }
  return []
}

function coerceImageList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'string' ? item
        : typeof item === 'object' && item !== null
          ? ((item as { url?: unknown }).url as string | undefined) ?? ''
          : ''
    ).filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(part => part.trim()).filter(Boolean)
  }
  return []
}

export interface HepsiburadaProductRaw {
  listing: HepsiburadaListingRow
  catalog?: HepsiburadaCatalogProductRow | null
}

/** Listing updatedAt anahtarlari (resmi modelde isim degisken olabilir). */
function listingUpdatedAt(listing: HepsiburadaListingRow): Date | null {
  for (const key of ['updatedAt', 'lastUpdateDate', 'lastModifiedDate', 'modifiedDate']) {
    const value = (listing as Record<string, unknown>)[key]
    if (typeof value === 'string' && value) {
      const parsed = parseDate(value)
      if (parsed) return parsed
    }
  }
  return null
}

export function mapHepsiburadaListingToProduct(raw: HepsiburadaProductRaw): NormalizedProduct {
  const { listing } = raw
  const merchantSku = listing.merchantSku || listing.hepsiburadaSku || ''
  const externalId = merchantSku || listing.listingId || ''

  const isActive = listing.isSalable === true
    && listing.isSuspended !== true
    && listing.isLocked !== true
    && listing.isFrozen !== true

  // Gorseller yalnizca katalogdan; AYNI sanitizer yeniden kullanilir.
  const images = extractHepsiburadaImages(raw.catalog ?? null)
    .map(url => sanitizeProductImageUrl(url))
    .filter((url): url is string => Boolean(url))
  const imageUrl = images[0] ?? null

  const titleParts = [
    fieldString(raw.catalog ?? null, 'productName', 'name', 'title'),
    merchantSku || listing.hepsiburadaSku
  ].filter(Boolean)
  const title = titleParts.join(' - ').slice(0, 500) || 'Urun'

  return {
    externalId,
    sku: listing.merchantSku || null,
    // uniqueIdentifier resmi dokumanda "benzersiz kimlik" olarak gecer;
    // garanti GTIN/barkod olmadigi icin barcode'a KOPYALANMAZ,
    // metadata'da tasinir (tahmin yasagi).
    barcode: null,
    title,
    brand: fieldString(raw.catalog ?? null, 'brand', 'brandName'),
    category: fieldString(raw.catalog ?? null, 'categoryName', 'category'),
    salePrice: pickFinite(listing.price) ?? null,
    listPrice: null,
    stockQuantity: pickFinite(listing.availableStock) !== undefined
      ? Math.max(0, Math.trunc(pickFinite(listing.availableStock) as number))
      : null,
    currency: 'TRY',
    isActive,
    imageUrl,
    providerUpdatedAt: parseDate(raw.catalog?.modifiedAt) ?? listingUpdatedAt(listing),
    metadata: {
      ...(listing.hepsiburadaSku ? { hepsiburadaSku: listing.hepsiburadaSku } : {}),
      ...(listing.listingId ? { listingId: listing.listingId } : {}),
      ...(listing.productId ? { productId: listing.productId } : {}),
      ...(listing.uniqueIdentifier ? { uniqueIdentifier: listing.uniqueIdentifier } : {}),
      ...(images.length > 1 ? { images: images.slice(0, 3) } : {})
    }
  }
}

/** ISO tarih veya epoch ms string'i tolere eden guvenli parser. */
function parseDate(value?: unknown): Date | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Date(value < 10_000_000_000 ? value * 1000 : value) : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
