/*
 * N11 API TIPLERI.
 *
 * Kaynak: developer.n11.com resmi REST dokumantasyonu (agustos 2026):
 * - "Siparis Listeleme Servisi"  -> GET /rest/delivery/v1/shipmentPackages
 * - "Satici Urun Sorgulama"      -> GET /ms/product-query
 *
 * Kimlik dogrulama (resmi): her istekte HTTP header'lari
 *   appkey    : N11 App Key
 *   appsecret : N11 App Secret
 * Ayri bir seller/store identifier ZORUNLU DEGILDIR; sellerId yalnizca
 * yanitlarda bilgi amacli doner. Anahtarlar Satici Paneli
 * (so.n11.com) > Hesabim > API Hesaplari'ndan alinir.
 *
 * Ortam: resmi dokumanda yalnizca production hostu (api.n11.com)
 * tanimlidir; resmi bir sandbox yayinlanmadigi icin env override'i
 * YALNIZCA test amacli N11_BASE_URL ile yapilabilir.
 *
 * Bilinen sinirlar (resmi dokuman):
 * - shipmentPackages: dakikada maks 1000 istek; status parametresi
 *   TEK deger alir (Created/Picking/Shipped/Cancelled/Delivered/
 *   Unpacked/UnSupplied); size <= 100; startDate/endDate araligi
 *   provider tarafindan 15 gune sinirlanir; Kasim 2024 oncesi
 *   siparis verisi bu servisten DONMEZ.
 * - ms/product-query: page 0-based, size default 20 / maks 250;
 *   Spring pageable zarfi (content/totalPages/last).
 */

/** Resmi tek host. Testler N11_BASE_URL ile gecersiz kilabilir. */
export const N11_BASE_URL = 'https://api.n11.com'

export type N11Environment = 'production'

/**
 * Resmi shipmentPackageStatus degerleri ("RestAPI Sipariş Servis
 * Bilgilendirmeleri" + "Sipariş Listeleme Servisi" status tablosu).
 */
export type N11PackageStatus =
  | 'Created'
  | 'Picking'
  | 'Shipped'
  | 'Cancelled'
  | 'Delivered'
  | 'Unpacked'
  | 'UnSupplied'

/**
 * Sync'te taranan durum kovalari.
 *
 * 'Unpacked' bilinçli olarak TARANMAZ: resmi dokumanda Unpacked,
 * paket bolme sonrasi ANA siparinin statüsüdür ("Bölünen ana sipariş
 * statüsü Unpacked olarak güncellenip, bölünmüş paketler Picking
 * statüsünde oluşmaktadır"). Ayni satirlar hem ana pakette hem child
 * pakette gelir; ikisini de almak kalem/satis MUKERRERI uretir.
 * Child paketler (Picking/...) otoriter durumu tasiyor.
 */
export const N11_ORDER_STATUS_BUCKETS: readonly N11PackageStatus[] = [
  'Created', 'Picking', 'Shipped', 'Delivered', 'Cancelled', 'UnSupplied'
]

// ---------------------------------------------------------------------------
// ORDERS — GET /rest/delivery/v1/shipmentPackages
// ---------------------------------------------------------------------------

/** Resmi ornek yanittaki lines[] satiri (yalnizca kullanilan alanlar). */
export interface N11OrderLine {
  quantity?: number | string
  productId?: number | string
  productName?: string
  stockCode?: string
  price?: number | string
  sellerInvoiceAmount?: number | string
  sellerDiscount?: number | string
  sellerCouponDiscount?: number | string
  totalSellerDiscountPrice?: number | string
  mallDiscount?: number | string
  totalMallDiscountPrice?: number | string
  orderLineId?: number | string
  orderItemLineItemStatusName?: string
  vatRate?: number | string
  commissionRate?: number | string
  barcode?: string | null
  deliveryFeeType?: number | string
  sender?: string
  [key: string]: unknown
}

export interface N11ShipmentPackage {
  /** Paket numarasi (benzersiz kimlik). Konuma ozel teslimatta null olabilir. */
  id?: string | number | null
  orderNumber?: string
  shipmentPackageStatus?: string
  customerEmail?: string
  customerfullName?: string
  customerId?: number | string
  taxId?: string | null
  taxOffice?: string | null
  tcIdentityNumber?: string | null
  cargoSenderNumber?: string | null
  cargoTrackingNumber?: string | null
  cargoTrackingLink?: string | null
  shipmentCompanyId?: number | string | null
  cargoProviderName?: string | null
  shipmentMethod?: number | string | null
  installmentChargeWithVATprice?: number | string | null
  lines?: N11OrderLine[]
  /** Epoch milliseconds (GMT+3). */
  lastModifiedDate?: number | string | null
  agreedDeliveryDate?: number | string | null
  totalAmount?: number | string | null
  totalDiscountAmount?: number | string | null
  packageHistories?: Array<{ createdDate?: number | string | null; status?: string }>
  micro?: boolean | null
  sellerId?: number | string
  [key: string]: unknown
}

/** Spring Page zarfi (resmi ornek): page/size/content/totalPages. */
export interface N11ShipmentPackagesPage {
  content?: N11ShipmentPackage[]
  page?: number
  size?: number
  totalPages?: number
  pageCount?: number
  totalElements?: number
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// PRODUCTS — GET /ms/product-query
// ---------------------------------------------------------------------------

export interface N11ProductAttribute {
  attributeId?: number | string
  attributeName?: string
  attributeValue?: string
  [key: string]: unknown
}

export interface N11ProductRow {
  n11ProductId?: number | string
  sellerId?: number | string
  sellerNickname?: string
  stockCode?: string
  title?: string
  description?: string
  categoryId?: number | string
  productMainId?: string
  status?: string
  saleStatus?: string
  preparingDay?: number | string
  shipmentTemplate?: string
  catalogId?: number | string | null
  barcode?: string | null
  currencyType?: string
  salePrice?: number | string
  listPrice?: number | string
  quantity?: number | string
  attributes?: N11ProductAttribute[]
  imageUrls?: string[]
  vatRate?: number | string
  commissionRate?: number | string
  sender?: string
  [key: string]: unknown
}

/** Spring pageable zarfi (resmi ornek). */
export interface N11ProductQueryPage {
  content?: N11ProductRow[]
  last?: boolean
  first?: boolean
  totalElements?: number
  totalPages?: number
  number?: number
  numberOfElements?: number
  size?: number
  pageable?: Record<string, unknown>
  [key: string]: unknown
}
