import { Prisma } from '@prisma/client'
import { computeNetContribution, moneyOrNull } from '../../../../lib/money.js'
import type {
  NormalizedOrder,
  NormalizedOrderItem,
  NormalizedOrderStatus,
  NormalizedProduct
} from '../../types.js'
import type {
  TrendyolApprovedContent,
  TrendyolApprovedVariant,
  TrendyolOrderLine,
  TrendyolShipmentPackage
} from './TrendyolTypes.js'

/*
 * TRENDYOL -> LOCALKARAR NORMALIZASYON.
 *
 * Kurallar:
 * - Raw provider JSON'u ana veri olarak DB'ye YAZILMAZ; asagidaki
 *   ortak modele cevrilir.
 * - Provider gercek komisyon TUTARI vermiyor (yalnizca satir bazli
 *   yuzde verir). Yuzdeden tutar uydurulmaz: commissionAmount null.
 * - Kargo/iade tutarlari siparis payload'inda yok: null. Iadeler
 *   ayri claims API'sindedir (ileride eklenebilir).
 * - netContribution bilesenlerden herhangi biri yoksa null.
 * - PII minimize: ad + soyad bas harfi; adres/e-posta/telefon/TCKN/
 *   vergi numarasi HICBIR ALANA yazilmaz.
 */

export function mapTrendyolStatus(pkg: TrendyolShipmentPackage): NormalizedOrderStatus {
  const raw = String(pkg.status || pkg.shipmentPackageStatus || '').trim()
  const lineStatuses = (pkg.lines ?? [])
    .map(line => String(line.orderLineItemStatusName || '').trim())
    .filter(Boolean)

  switch (raw) {
    case 'Created':
    case 'Awaiting':
      return 'CREATED'
    case 'Picking':
    case 'Invoiced':
    case 'AtCollectionPoint':
      return 'PROCESSING'
    case 'Shipped':
      // Paket sevk edilmis ama bazi satirlar iadeye dusmussa kismi iade.
      if (lineStatuses.includes('Returned') && lineStatuses.some(s => s !== 'Returned')) {
        return 'PARTIALLY_RETURNED'
      }
      return 'SHIPPED'
    case 'Delivered':
      if (lineStatuses.length > 0 && lineStatuses.includes('Returned') && lineStatuses.some(s => s !== 'Returned')) {
        return 'PARTIALLY_RETURNED'
      }
      return 'DELIVERED'
    case 'Cancelled':
      return 'CANCELLED'
    case 'UnSupplied':
      return 'CANCELLED'
    case 'Returned':
      return 'RETURNED'
    case 'UnDelivered':
      // Teslimat tamamlanamamis; nihai sonuc belirsiz.
      return 'UNKNOWN'
    default:
      return 'UNKNOWN'
  }
}

/** "Ayse K." — PII minimize edilmis gosterim adi. */
export function minimizeCustomerDisplayName(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const first = (firstName || '').trim()
  const lastInitial = (lastName || '').trim().charAt(0)
  if (!first && !lastInitial) return null
  if (!first) return `${lastInitial}.`
  return lastInitial ? `${first} ${lastInitial}.` : first
}

export function epochMsToDate(value?: number | null): Date | null {
  if (!value || !Number.isFinite(value)) return null
  return new Date(value)
}

function orderMetadata(pkg: TrendyolShipmentPackage): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  if (pkg.shipmentPackageId !== undefined && pkg.shipmentPackageId !== null) meta.shipmentPackageId = pkg.shipmentPackageId
  if (pkg.cargoTrackingNumber !== undefined && pkg.cargoTrackingNumber !== null) meta.cargoTrackingNumber = pkg.cargoTrackingNumber
  if (pkg.cargoProviderName) meta.cargoProviderName = pkg.cargoProviderName
  if (pkg.deliveryType) meta.deliveryType = pkg.deliveryType
  if (typeof pkg.isCod === 'boolean') meta.isCod = pkg.isCod
  if (typeof pkg.commercial === 'boolean') meta.commercial = pkg.commercial
  // Sehir: adres metni DEGIL, analitik icin tek alan.
  const city = (pkg.shipmentAddress?.city || '').trim()
  if (city) meta.shippingCity = city
  return meta
}

export function mapTrendyolLineToNormalizedItem(line: TrendyolOrderLine): NormalizedOrderItem {
  const quantity = Number.isFinite(line.quantity) ? Number(line.quantity) : 0
  // unitPrice: lineUnitPrice > price > amount/quantity sirasiyla ilk dolu.
  const unitPrice = pickFinite(line.lineUnitPrice, line.price,
    quantity > 0 ? safeDivide(pickFinite(line.amount, line.lineGrossAmount), quantity) : undefined)
  const grossAmount = pickFinite(line.lineGrossAmount, line.amount)

  const metadata: Record<string, unknown> = {}
  // commission YUZDEDIR (13 = %13). Tutara cevirmeden saklanir;
  // hesaplamalar modulu kullanici isterse ESTIMATE olarak kullanir.
  if (Number.isFinite(line.commission)) metadata.commissionPercent = line.commission
  if (Number.isFinite(line.vatRate)) metadata.vatRate = line.vatRate
  if (line.merchantSku) metadata.merchantSku = line.merchantSku
  if (line.salesCampaignId !== undefined && line.salesCampaignId !== null) {
    metadata.salesCampaignId = line.salesCampaignId
  }
  // Satir bazli iade tespiti icin gercek provider durumu korunur:
  // product-analytics returnedUnits'i bundan hesaplar.
  if (line.orderLineItemStatusName) metadata.lineStatus = line.orderLineItemStatusName

  return {
    externalId: line.lineId !== undefined && line.lineId !== null ? String(line.lineId) : null,
    externalProductId:
      line.productCode !== undefined && line.productCode !== null
        ? String(line.productCode)
        : line.contentId !== undefined && line.contentId !== null
          ? String(line.contentId)
          : null,
    sku: line.merchantSku || line.stockCode || line.sku || null,
    barcode: line.barcode || null,
    title: (line.productName || line.merchantSku || 'Urun').slice(0, 500),
    quantity,
    unitPrice: unitPrice ?? null,
    grossAmount: grossAmount ?? null,
    discountAmount: pickFinite(line.lineTotalDiscount, line.discount) ?? null,
    // Provider komisyon TUTARI vermiyor -> null (uydurma yok).
    commissionAmount: null,
    shippingAllocation: null,
    refundAmount: null,
    netContribution: null,
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

export function mapTrendyolPackageToNormalizedOrder(pkg: TrendyolShipmentPackage): NormalizedOrder {
  const externalId = pkg.id !== undefined && pkg.id !== null
    ? String(pkg.id)
    : pkg.shipmentPackageId !== undefined && pkg.shipmentPackageId !== null
      ? String(pkg.shipmentPackageId)
      : ''

  const gross = pickFinite(pkg.grossAmount, pkg.packageGrossAmount) ?? 0
  const discount = pickFinite(pkg.totalDiscount, pkg.packageTotalDiscount) ?? 0

  const items = (pkg.lines ?? []).map(mapTrendyolLineToNormalizedItem)

  // netContribution: komisyon/kargo/iade TUTARLARI olmadigi icin bu
  // akista her zaman null kalir; hesap yine de deterministik yazildi
  // ki ileride settlements verisi geldiginde ayni fonksiyon kullanilsin.
  let netContribution: Prisma.Decimal | null = null
  if (externalId) {
    netContribution = computeNetContribution({
      gross: new Prisma.Decimal(gross.toFixed(2)),
      discount: new Prisma.Decimal(discount.toFixed(2)),
      commission: null,
      shipping: null,
      refund: null
    })
  }

  return {
    externalId,
    externalOrderNumber: pkg.orderNumber || null,
    externalCustomerId: pkg.customerId !== undefined && pkg.customerId !== null ? String(pkg.customerId) : null,
    customerDisplayName: minimizeCustomerDisplayName(pkg.customerFirstName, pkg.customerLastName),
    currency: normalizeCurrency(pkg.currencyCode),
    grossAmount: gross,
    discountAmount: discount,
    commissionAmount: null,
    shippingAmount: null,
    refundAmount: null,
    taxAmount: null,
    netContribution,
    status: mapTrendyolStatus(pkg),
    orderDate: epochMsToDate(pkg.orderDate) ?? new Date(),
    providerUpdatedAt: epochMsToDate(pkg.lastModifiedDate),
    items,
    metadata: orderMetadata(pkg)
  }
}

const VARIANT_ATTR_LIMIT = 3

/**
 * Provider gorsel URL'i sanitizasyonu: yalnizca https, sinirli uzunluk.
 * javascript:/data: gibi seplere izin verilmez; gorsel yoksa null doner
 * ve UI notr placeholder gosterir — sahte resim URETILMEZ.
 */
export function sanitizeProductImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2048) return null
  if (!trimmed.toLowerCase().startsWith('https://')) return null
  return trimmed
}

export function pickProductImageUrl(content: TrendyolApprovedContent): string | null {
  const list = Array.isArray(content.images) ? content.images : []
  for (const candidate of [...list, content.imageUrl]) {
    const sanitized = sanitizeProductImageUrl(candidate)
    if (sanitized) return sanitized
  }
  return null
}

export function mapTrendyolContentVariantsToProducts(content: TrendyolApprovedContent): NormalizedProduct[] {
  const variants = content.variants ?? []
  if (variants.length === 0) return []

  return variants.map(variant => mapTrendyolVariantToProduct(content, variant))
}

export function mapTrendyolVariantToProduct(
  content: TrendyolApprovedContent,
  variant: TrendyolApprovedVariant
): NormalizedProduct {
  // externalId: barkod, Trendyol'da satis biriminin (variant) dogal
  // benzersiz kimligidir.
  const externalId = (variant.barcode || variant.stockCode || `content-${content.contentId}`).trim()

  const attrSummary = (variant.attributes ?? [])
    .filter(attr => attr.attributeValue)
    .slice(0, VARIANT_ATTR_LIMIT)
    .map(attr => `${attr.attributeName}: ${attr.attributeValue}`)
    .join(' / ')

  const isActive = variant.onSale === true
    && variant.archived !== true
    && variant.blacklisted !== true

  const metadata: Record<string, unknown> = {}
  if (content.contentId !== undefined && content.contentId !== null) metadata.contentId = content.contentId
  if (content.productMainId) metadata.productMainId = content.productMainId
  if (variant.variantId !== undefined && variant.variantId !== null) metadata.variantId = variant.variantId
  if (attrSummary) metadata.variantAttributes = attrSummary

  // Gorseller: gercek provider URL'leri; ilki imageUrl'e, ilk birkaçı
  // metadata.images'e yazilir. Temizlenmemis URL saklanmaz.
  const imageList = (Array.isArray(content.images) ? content.images : [])
    .map(url => sanitizeProductImageUrl(url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 3)
  if (imageList.length > 1) metadata.images = imageList
  const imageUrl = pickProductImageUrl(content)

  // V2 approved-products cevabinda STOK ADEDI donmuyor (yalnizca
  // son stok degisim tarihi). Uydurulmaz: stockQuantity null.
  const stockQuantity = undefined

  return {
    externalId,
    sku: variant.stockCode || null,
    barcode: variant.barcode || null,
    title: [content.title, attrSummary].filter(Boolean).join(' - ').slice(0, 500) || 'Urun',
    brand: content.brand?.name || null,
    category: content.category?.name || null,
    salePrice: pickFinite(variant.price?.salePrice) ?? null,
    listPrice: pickFinite(variant.price?.listPrice) ?? null,
    stockQuantity,
    currency: null,
    isActive,
    imageUrl: imageUrl ?? null,
    providerUpdatedAt: epochMsToDate(
      maxFinite(content.lastModifiedDate, variant.sellerModifiedDate, variant.stock?.lastModifiedDate ?? undefined)
    ),
    metadata: Object.keys(metadata).length ? metadata : undefined
  }
}

/** DB upsert katmaninin bekledigi para degerleri (Decimal). */
export function normalizedMoney(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) return null
  return moneyOrNull(value)
}

function normalizeCurrency(code?: string | null): string {
  const trimmed = (code || '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : 'TRY'
}

function pickFinite(...values: Array<number | undefined | null>): number | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && Number.isFinite(Number(value))) return Number(value)
  }
  return undefined
}

function safeDivide(a: number | undefined, b: number): number | undefined {
  if (a === undefined || !b) return undefined
  return a / b
}

function maxFinite(...values: Array<number | undefined | null>): number | undefined {
  let max: number | undefined
  for (const value of values) {
    if (value !== undefined && value !== null && Number.isFinite(Number(value))) {
      max = max === undefined ? Number(value) : Math.max(max, Number(value))
    }
  }
  return max
}
