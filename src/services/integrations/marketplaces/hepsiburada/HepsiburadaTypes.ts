/*
 * HEPSIBURADA API TIPLERI.
 *
 * Kaynak: developers.hepsiburada.com resmi dokumantasyonu
 * (siparis-olusturma-entegrasyonu / katalog-urun-entegrasyonu /
 * listing dev portal urunleri; OpenAPI turetimi agustos 2026).
 * Alan adlari tahmin DEGILDIR; bilinmeyenler opsiyonel birakilir ve
 * mapper uydurma deger yazmaz.
 *
 * Hostlar (prod / sit):
 * - Siparis/OMS : oms-external[-sit].hepsiburada.com
 * - Listing     : listing-external[-sit].hepsiburada.com
 * - Katalog     : mpop[-sit].hepsiburada.com (/product/api/*)
 */

export type HepsiburadaEnvironment = 'production' | 'sit'

/** Hepsiburada servis yuzeyleri — her biri kendi hostuna sahiptir. */
export type HepsiburadaService = 'oms' | 'listing' | 'mpop'

export const HEPSIBURADA_BASE_URLS: Record<HepsiburadaEnvironment, Record<HepsiburadaService, string>> = {
  production: {
    oms: 'https://oms-external.hepsiburada.com',
    listing: 'https://listing-external.hepsiburada.com',
    mpop: 'https://mpop.hepsiburada.com'
  },
  sit: {
    oms: 'https://oms-external-sit.hepsiburada.com',
    listing: 'https://listing-external-sit.hepsiburada.com',
    mpop: 'https://mpop-sit.hepsiburada.com'
  }
}

// ---------------------------------------------------------------------------
// ORDERS (OMS)
// ---------------------------------------------------------------------------

/** GET /orders/merchantId/{id} satiri (odemesi tamamlanmis siparis). */
export interface HepsiburadaOrderRow {
  orderNumber?: string
  status?: string
  createdDate?: string
  modifiedDate?: string
  total?: number | string
  customerName?: string
  customer?: { name?: string; firstName?: string; lastName?: string }
  recipientName?: string
  items?: unknown[]
  lines?: unknown[]
  [key: string]: unknown
}

/**
 * GET /packages/merchantId/{id} satiri (kargo paketi). Siparis lifecycle
 * paketler uzerinden okunur; satir kalemleri provider farkli anahtarlarda
 * tasiyabilir (items/lines/orderLines) — mapper savunmaci okur.
 */
export interface HepsiburadaPackageRow {
  packageNumber?: string
  orderNumber?: string
  status?: string
  cargoCompany?: string
  trackingNumber?: string
  createdDate?: string
  modifiedDate?: string
  items?: unknown[]
  lines?: unknown[]
  orderLines?: unknown[]
  [key: string]: unknown
}

/** Paket/kalem satiri (resmi dokumanda alan seti degisken). */
export interface HepsiburadaOrderLine {
  id?: number | string
  lineItemId?: number | string
  sku?: string
  merchantSku?: string
  productName?: string
  quantity?: number | string
  price?: number | string
  amount?: number | string
  barcode?: string
  oemTcknId?: string
  status?: string
  [key: string]: unknown
}

/** Liste cevabi: { totalCount, items[], limit, offset } veya raw dizi. */
export interface HepsiburadaListEnvelope<T> {
  totalCount?: number
  limit?: number
  offset?: number
  pageCount?: number
  items?: T[]
}

// ---------------------------------------------------------------------------
// LISTINGS (listing-external) — fiyat / stok / satis durumu
// ---------------------------------------------------------------------------

export interface HepsiburadaListingRow {
  listingId?: string
  uniqueIdentifier?: string
  hepsiburadaSku?: string
  merchantSku?: string
  price?: number | string
  availableStock?: number | string
  dispatchTime?: number
  pricings?: Array<{ finalPrice?: number | string; startDate?: string; endDate?: string }>
  isSalable?: boolean
  isSuspended?: boolean
  isLocked?: boolean
  isFrozen?: boolean
  deactivationReasons?: string[]
  productId?: string
  hasVariant?: boolean
  updatedAt?: string
  lastUpdateDate?: string
  lastModifiedDate?: string
  modifiedDate?: string
  [key: string]: unknown
}

export interface HepsiburadaListingsPage {
  totalCount?: number
  limit?: number
  offset?: number
  listings?: HepsiburadaListingRow[]
}

// ---------------------------------------------------------------------------
// CATALOG (mpop /product/api/*) — baslik/marka/kategori/gorsel
// ---------------------------------------------------------------------------

export interface HepsiburadaCatalogProductRow {
  id?: string | number
  merchantSku?: string
  status?: string
  createdAt?: string
  modifiedAt?: string
  /** Per-SKU icerik haritasi: productName/name/categoryName/brand/images... */
  fields?: Record<string, { value?: unknown } | unknown>
  productName?: string
  categoryName?: string
  brand?: string
  images?: unknown
  [key: string]: unknown
}
