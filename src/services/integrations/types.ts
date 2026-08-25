import type { Prisma } from '@prisma/client'

/*
 * PROVIDER-BAGIMSIZ NORMALIZE EDILMIS TIPLER.
 *
 * Provider raw JSON'u ASLA dogrudan DB'ye yazilmaz; her adapter
 * kendi mapper'ıyla bu sekle cevirir. Yeni bir pazaryeri eklemek
 * icin core sync logic degistirilmez: sadece yeni bir adapter
 * yazilir ve registry'e kaydedilir.
 */

export type ProviderCode = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'SHOPIFY' | 'WOOCOMMERCE'

export type NormalizedOrderStatus =
  | 'CREATED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'
  | 'CANCELLED' | 'RETURNED' | 'PARTIALLY_RETURNED' | 'UNKNOWN'

/** Adapter'a gecen, DB'den cozulmus credential paketi. */
export interface ProviderCredentials {
  externalAccountId: string
  apiKey?: string | null
  apiSecret?: string | null
  accessToken?: string | null
  refreshToken?: string | null
}

export interface CredentialValidationResult {
  valid: boolean
  /** Kullaniciya gosterilebilir GUVENLI mesaj; raw provider hatasi tasimaz. */
  message?: string
  errorCode?: string
  displayName?: string | null
}

export interface NormalizedOrderItem {
  externalId?: string | null
  externalProductId?: string | null
  sku?: string | null
  barcode?: string | null
  title: string
  quantity: number
  unitPrice: number | null
  grossAmount: number | null
  discountAmount?: number | null
  commissionAmount?: number | null
  shippingAllocation?: number | null
  refundAmount?: number | null
  netContribution?: Prisma.Decimal | null
  metadata?: Record<string, unknown>
}

export interface NormalizedOrder {
  externalId: string
  externalOrderNumber?: string | null
  externalCustomerId?: string | null
  customerDisplayName?: string | null
  currency: string
  grossAmount: number | null
  discountAmount?: number | null
  commissionAmount?: number | null
  shippingAmount?: number | null
  refundAmount?: number | null
  taxAmount?: number | null
  netContribution?: Prisma.Decimal | null
  status: NormalizedOrderStatus
  orderDate: Date
  providerUpdatedAt?: Date | null
  items: NormalizedOrderItem[]
  metadata?: Record<string, unknown>
}

export interface NormalizedProduct {
  externalId: string
  sku?: string | null
  barcode?: string | null
  title: string
  brand?: string | null
  category?: string | null
  salePrice?: number | null
  listPrice?: number | null
  stockQuantity?: number | null
  currency?: string | null
  isActive: boolean
  /** Provider'in gercek urun gorseli (https); saglanmiyorsa null. */
  imageUrl?: string | null
  providerUpdatedAt?: Date | null
  metadata?: Record<string, unknown>
}

export interface FetchOrdersParams {
  credentials: ProviderCredentials
  fromDate: Date
  toDate: Date
  page?: number
  pageSize?: number
}

export interface OrdersPage<TOrder> {
  orders: TOrder[]
  page: number
  totalPages: number
  totalElements: number
  hasNextPage: boolean
}

export interface FetchProductsParams {
  credentials: ProviderCredentials
  page?: number
  pageSize?: number
  cursor?: string | null
}

export interface ProductsPage<TProduct> {
  products: TProduct[]
  page?: number
  totalPages?: number
  totalElements?: number
  hasNextPage: boolean
  nextPageCursor?: string | null
}

/**
 * Provider'in resmi API'sinde GERCEK ERISILEBILIR analytics
 * alanlarini belirten capability bayraklari. false olan metrikler
 * UI'da GOSTERILMEZ ve hicbir zaman 0 ile doldurulmaz.
 */
export interface ProviderCapabilities {
  supportsProductViews: boolean
  supportsFavorites: boolean
  supportsProductAnalytics: boolean
  /** Komisyon bilgisi provider API'sinde mevcut (oran/tutar ayri degerlendirilir). */
  supportsCommissionData?: boolean
  /** Mutabakat/settlement verisi provider API'sinde mevcut. */
  supportsSettlementData?: boolean
  /** Siparis payload'inda gercek kargo tutari tasiyor. */
  supportsShippingCost?: boolean
  /** Siparis/Refund verisinden gercek iade tutari okunabiliyor. */
  supportsRefundData?: boolean
}

const NO_ANALYTICS: Required<Pick<ProviderCapabilities,
  'supportsProductViews' | 'supportsFavorites' | 'supportsProductAnalytics'
>> & ProviderCapabilities = {
  supportsProductViews: false,
  supportsFavorites: false,
  supportsProductAnalytics: false,
  supportsCommissionData: false,
  supportsSettlementData: false,
  supportsShippingCost: false,
  supportsRefundData: false
}

export function defaultCapabilities(overrides?: Partial<ProviderCapabilities>): ProviderCapabilities {
  return { ...NO_ANALYTICS, ...overrides }
}

/**
 * Pazaryeri adapter sozlesmesi. Core sync katmani SADECE bu arayuzu
 * ve normalize edilmis tipleri tanir.
 */
export interface MarketplaceProviderAdapter<TOrderRaw = unknown, TProductRaw = unknown> {
  readonly provider: ProviderCode

  /** Varsayilan hepsi false: analytics verisi olmadiginda uydurma yok. */
  readonly capabilities?: ProviderCapabilities

  validateCredentials(credentials: ProviderCredentials): Promise<CredentialValidationResult>

  fetchOrders(params: FetchOrdersParams): Promise<OrdersPage<TOrderRaw>>
  fetchProducts(params: FetchProductsParams): Promise<ProductsPage<TProductRaw>>

  normalizeOrder(raw: TOrderRaw): NormalizedOrder
  normalizeProduct(raw: TProductRaw): NormalizedProduct

  healthCheck(credentials: ProviderCredentials): Promise<CredentialValidationResult>
}
