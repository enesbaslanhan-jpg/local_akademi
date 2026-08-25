import type { NormalizedOrder, NormalizedOrderItem, NormalizedOrderStatus, NormalizedProduct } from '../../types.js'
import { sanitizeProductImageUrl } from '../trendyol/TrendyolMapper.js'
import type { N11OrderLine, N11ProductRow, N11ShipmentPackage } from './N11Types.js'

/*
 * N11 -> LOCALKARAR NORMALIZASYON.
 *
 * Kurallar (resmi dokuman + "tahmin yasagi"):
 * - Durum eslemesi YALNIZCA resmi "RestAPI Sipariş Servis
 *   Bilgilendirmeleri" tablosundaki degerlerle yapilir; taninmayan
 *   deger UNKNOWN kalir (yanlis tahmin YOK).
 * - Komisyon yalnizca ORAN olarak belgelenmistir (commissionRate);
 *   komisyon TUTARI provider tarafindan donmedigi icin null birakilir
 *   ve oran metadata'da tasinir (Trendyol konvansiyonuyla ayni).
 * - Kargo maliyeti siparis payload'inda YOKTUR (yalnizca kim
 *   odedigini soyleyen deliveryFeeType) -> shippingAmount null.
 * - Iade/iptal tutari siparis servisinden donmez (iade akisi ayri
 *   ReturnService fazidir) -> refundAmount null.
 * - PII minimize: customerfullName yalnizca "Ad S." seklinde
 *   cozulur; e-posta, TC kimlik, vergi no, adres, GSM HICBIR alana
 *   yazilmaz (DATA INVENTORY: discard).
 * - Gorseller yalnizca provider gercek https URL verirse saklanir;
 *   AYNI sanitizer (sanitizeProductImageUrl) kullanilir; gorsel
 *   yoksa null — sahte gorsel URETILMEZ.
 */

/**
 * Resmi shipmentPackageStatus -> normalize status.
 * Kaynak: developer.n11.com "RestAPI Sipariş Servis Bilgilendirmeleri"
 * (statü tablosu) + "Sipariş Listeleme Servisi" status parametresi.
 */
export function mapN11Status(rawStatus?: string | null): NormalizedOrderStatus {
  const value = String(rawStatus || '').trim()
  switch (value) {
    case 'Created':
    case 'Unpacked': // paket bolme sonrasi ana siparis (resmi dokuman)
      return 'CREATED'
    case 'Picking':
      return 'PROCESSING'
    case 'Shipped':
      return 'SHIPPED'
    case 'Delivered':
      return 'DELIVERED'
    case 'Cancelled':
    case 'UnSupplied': // resmi tablo: 8 "Reddedilmiş" (Trendyol ile ayni semantik)
      return 'CANCELLED'
    default:
      return 'UNKNOWN'
  }
}

/** "Ayşe K." — PII minimize edilmis gosterim adi. */
export function minimizeN11CustomerName(raw?: string | null): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  const parts = value.split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
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

/** Epoch ms (GMT+3) veya ISO string -> Date. */
function parseEpochOrIso(value?: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed))
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export function mapN11LineToNormalizedItem(lineRaw: unknown): NormalizedOrderItem | null {
  if (!lineRaw || typeof lineRaw !== 'object') return null
  const line = lineRaw as N11OrderLine

  const quantity = Math.trunc(pickFinite(line.quantity) ?? 0)
  const unitPrice = pickFinite(line.price)
  // Resmi dokuman: "Fatura edilecek toplam tutar icin lines blokundaki
  // sellerInvoiceAmount alanini baz alabilirsiniz."
  const sellerInvoice = pickFinite(line.sellerInvoiceAmount)
  const grossAmount = sellerInvoice
    ?? (unitPrice !== undefined ? unitPrice * quantity : undefined)

  const title = String(line.productName || line.stockCode || 'Urun').slice(0, 500)
  const metadata: Record<string, unknown> = {}
  if (line.orderItemLineItemStatusName) metadata.lineStatus = String(line.orderItemLineItemStatusName)
  if (line.commissionRate !== undefined && line.commissionRate !== null) metadata.commissionRate = Number(line.commissionRate)
  if (line.vatRate !== undefined && line.vatRate !== null) metadata.vatRate = Number(line.vatRate)
  if (line.mallDiscount !== undefined && line.mallDiscount !== null) metadata.mallDiscount = Number(line.mallDiscount)

  return {
    externalId: line.orderLineId !== undefined && line.orderLineId !== null ? String(line.orderLineId) : null,
    externalProductId: line.productId !== undefined && line.productId !== null ? String(line.productId) : null,
    sku: line.stockCode || null,
    barcode: line.barcode || null,
    title,
    quantity: Math.max(0, quantity),
    unitPrice: unitPrice ?? null,
    grossAmount: grossAmount ?? null,
    // Satici indirimleri belgeli alanlardan: sellerDiscount + sellerCouponDiscount
    // (resmi formül: (price*qty) - (sellerDiscount + sellerCouponDiscount) = sellerInvoiceAmount)
    discountAmount: pickFinite(line.totalSellerDiscountPrice, (() => {
      const sd = pickFinite(line.sellerDiscount)
      const scd = pickFinite(line.sellerCouponDiscount)
      return sd !== undefined || scd !== undefined ? (sd ?? 0) + (scd ?? 0) : undefined
    })()) ?? null,
    // Komisyon TUTARI provider'dan donmez (yalnizca oran) -> null.
    commissionAmount: null,
    shippingAllocation: null,
    refundAmount: null,
    netContribution: null,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

/**
 * Paket satirini normalize eder. Kimlik: id (paket numarasi). Konuma
 * ozel teslimatta id null doner (resmi dokuman); bu durumda orderNumber
 * + ilk kalem orderLineId ile deterministik kimlik uretilir; hicbiri
 * yoksa satir core'a gecmez (null) — uydurma kimlik YOK.
 */
export function mapN11PackageToNormalizedOrder(row: N11ShipmentPackage): NormalizedOrder | null {
  const packageId = row.id !== undefined && row.id !== null && String(row.id).trim() !== ''
    ? String(row.id).trim()
    : null
  const firstLineId = Array.isArray(row.lines)
    ? row.lines.map(l => (l as N11OrderLine)?.orderLineId).find(v => v !== undefined && v !== null)
    : undefined
  const externalId = packageId
    ?? (row.orderNumber && firstLineId !== undefined ? `${row.orderNumber}-${String(firstLineId)}` : '')
  if (!externalId) return null

  const linesRaw = Array.isArray(row.lines) ? row.lines : []
  const items = linesRaw
    .map(mapN11LineToNormalizedItem)
    .filter((item): item is NormalizedOrderItem => item !== null)

  if (items.length === 0) return null

  // Paket toplami resmi alandan; yoksa satir fatura tutarlari toplanir.
  const totalAmount = pickFinite(row.totalAmount)
  const grossAmount = totalAmount
    ?? items.reduce<number>((sum, item) => sum + (item.grossAmount ?? 0), 0)

  // Siparis olusturma tarihi: resmi esleme tablosuna gore packageHistories
  // icindeki status=Created kaydinin createdDate'i. Yoksa lastModifiedDate.
  const createdHistory = Array.isArray(row.packageHistories)
    ? row.packageHistories.find(h => String(h?.status || '').trim() === 'Created')
    : undefined
  const orderDate = parseEpochOrIso(createdHistory?.createdDate)
    ?? parseEpochOrIso(row.lastModifiedDate)
    ?? new Date()

  const metadata: Record<string, unknown> = {}
  if (row.orderNumber) metadata.orderNumber = String(row.orderNumber)
  if (row.cargoProviderName) metadata.cargoProviderName = String(row.cargoProviderName)
  if (row.cargoTrackingNumber) metadata.cargoTrackingNumber = String(row.cargoTrackingNumber)
  if (row.shipmentMethod !== undefined && row.shipmentMethod !== null) metadata.shipmentMethod = Number(row.shipmentMethod)
  if (row.micro === true) metadata.eExport = true

  return {
    externalId,
    externalOrderNumber: row.orderNumber ? String(row.orderNumber) : null,
    // Alici ID'si saglayici-icin opak tanimlayici (Trendyol konvansiyonu).
    externalCustomerId: row.customerId !== undefined && row.customerId !== null ? String(row.customerId) : null,
    customerDisplayName: minimizeN11CustomerName(row.customerfullName),
    currency: 'TRY',
    grossAmount,
    discountAmount: pickFinite(row.totalDiscountAmount) ?? null,
    commissionAmount: null,
    shippingAmount: null,
    refundAmount: null,
    taxAmount: null,
    netContribution: null,
    status: mapN11Status(row.shipmentPackageStatus),
    orderDate,
    providerUpdatedAt: parseEpochOrIso(row.lastModifiedDate),
    items,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

// ---------------------------------------------------------------------------
// URUNLER — GET /ms/product-query
// ---------------------------------------------------------------------------

/** Resmi attributes listesinden Marka degerini cozer. */
export function extractN11Brand(product: N11ProductRow): string | null {
  if (!Array.isArray(product.attributes)) return null
  for (const attribute of product.attributes) {
    const name = String(attribute?.attributeName || '').trim().toLocaleLowerCase('tr')
    const value = typeof attribute?.attributeValue === 'string' ? attribute.attributeValue.trim() : ''
    if ((name === 'marka' || name === 'brand') && value) return value
  }
  return null
}

/** imageUrls[] -> sanitize edilmis URL listesi (yalnizca gercek https). */
export function extractN11Images(product: N11ProductRow): string[] {
  const list = Array.isArray(product.imageUrls) ? product.imageUrls : []
  return list
    .map(url => sanitizeProductImageUrl(url))
    .filter((url): url is string => Boolean(url))
}

/** Resmi currencyType degeri -> ISO para kodu. */
export function mapN11Currency(raw?: string | null): string {
  const value = String(raw || '').trim().toUpperCase()
  if (value === 'TL' || value === 'TRY') return 'TRY'
  return value || 'TRY'
}

export function mapN11ProductToNormalizedProduct(row: N11ProductRow): NormalizedProduct {
  const externalId = row.n11ProductId !== undefined && row.n11ProductId !== null
    ? String(row.n11ProductId)
    : String(row.stockCode || '')
  if (!externalId) {
    throw new Error('N11 product row has no usable identity (n11ProductId/stockCode)')
  }

  const images = extractN11Images(row)
  const imageUrl = images[0] ?? null
  const stockQuantity = pickFinite(row.quantity)

  const metadata: Record<string, unknown> = {}
  if (row.productMainId) metadata.productMainId = String(row.productMainId)
  if (row.catalogId !== undefined && row.catalogId !== null) metadata.catalogId = String(row.catalogId)
  if (row.saleStatus) metadata.saleStatus = String(row.saleStatus)
  if (row.commissionRate !== undefined && row.commissionRate !== null) metadata.commissionRate = Number(row.commissionRate)
  if (row.vatRate !== undefined && row.vatRate !== null) metadata.vatRate = Number(row.vatRate)
  if (row.categoryId !== undefined && row.categoryId !== null) metadata.categoryId = String(row.categoryId)
  if (images.length > 1) metadata.images = images.slice(0, 3)

  return {
    externalId,
    sku: row.stockCode || null,
    barcode: row.barcode || null,
    title: String(row.title || row.stockCode || 'Urun').slice(0, 500),
    brand: extractN11Brand(row),
    // Urun sorgusu yalnizca categoryId dondurur (kategori ADI yok) ->
    // category null birakilir; id metadata'da tasinir (uydurma yok).
    category: null,
    salePrice: pickFinite(row.salePrice) ?? null,
    listPrice: pickFinite(row.listPrice) ?? null,
    stockQuantity: stockQuantity !== undefined ? Math.max(0, Math.trunc(stockQuantity)) : null,
    currency: mapN11Currency(row.currencyType),
    // Resmi productStatus enum'u: Active onayli/satilabilir urun.
    isActive: String(row.status || '') === 'Active',
    imageUrl,
    // Urun sorgusu guncelleme tarihi alanı icermez -> null (uydurma yok).
    providerUpdatedAt: null,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}
