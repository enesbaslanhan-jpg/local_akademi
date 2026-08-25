/*
 * TRENDYOL API TIPLERI.
 *
 * Alanlar resmi dokumantasyondan dogrulanmistir:
 * - Get Shipment Packages:
 *   GET {base}/integration/order/sellers/{sellerId}/orders
 *   https://developers.trendyol.com/v3.0/reference/getshipmentpackages
 *   (rate limit 1000 istek/dk, geriye 3 ay sorgulanabilir)
 * - Product Filtering - Approved Products (V2; V1 10.08.2026'da kapanmistir):
 *   GET {base}/integration/product/sellers/{sellerId}/products/approved
 *   https://developers.trendyol.com/v3.0/reference/filterapprovedproducts
 *
 * Auth: Basic (apiKey + apiSecret). Ayrica User-Agent zorunlu;
 * gonderilmezse 403 doner ("{sellerId} - SelfIntegration").
 * storeFrontCode header'i uluslararasi satıcılar icin zorunlu;
 * eksikse istek TR olarak islenir. TR icin kod "1".
 */

export type TrendyolEnvironment = 'production' | 'stage'

export const TRENDYOL_BASE_URLS: Record<TrendyolEnvironment, string> = {
  production: 'https://apigw.trendyol.com',
  stage: 'https://stageapigw.trendyol.com'
}

/** Siparis paketi durumlarinin resmi enum'u. */
export type TrendyolPackageStatus =
  | 'Created' | 'Picking' | 'Invoiced' | 'Shipped' | 'Cancelled'
  | 'Delivered' | 'UnDelivered' | 'Returned' | 'AtCollectionPoint'
  | 'UnSupplied' | 'Awaiting'

export interface TrendyolShipmentAddress {
  firstName?: string
  lastName?: string
  city?: string
  district?: string
  fullName?: string
  [key: string]: unknown
}

export interface TrendyolOrderLine {
  id?: number
  lineId?: number
  quantity?: number
  merchantSku?: string
  sku?: string
  stockCode?: string
  productName?: string
  productCode?: number
  contentId?: number
  productMainId?: string
  amount?: number
  lineGrossAmount?: number
  discount?: number
  lineTotalDiscount?: number
  price?: number
  lineUnitPrice?: number
  barcode?: string
  vatRate?: number
  commission?: number
  currencyCode?: string
  orderLineItemStatusName?: string
  salesCampaignId?: number
  merchantId?: number
  [key: string]: unknown
}

export interface TrendyolShipmentPackage {
  id?: number
  shipmentPackageId?: number
  orderNumber?: string
  grossAmount?: number
  packageGrossAmount?: number
  totalDiscount?: number
  packageTotalDiscount?: number
  totalPrice?: number
  packageTotalPrice?: number
  currencyCode?: string
  orderDate?: number
  lastModifiedDate?: number
  status?: string
  shipmentPackageStatus?: string
  customerId?: number
  customerFirstName?: string
  customerLastName?: string
  supplierId?: number
  lines?: TrendyolOrderLine[]
  cargoTrackingNumber?: number
  cargoProviderName?: string
  isCod?: boolean
  commercial?: boolean
  deliveryType?: string
  whoPays?: number
  // Asagidaki PII alanlari bilinir ama BILEREK SAKLANMAZ:
  // shipmentAddress / invoiceAddress / customerEmail / identityNumber /
  // taxNumber. Mapper bunlari hicbir alana yazmaz.
  shipmentAddress?: TrendyolShipmentAddress
  invoiceAddress?: TrendyolShipmentAddress
  customerEmail?: string
  identityNumber?: string
  taxNumber?: string | null
  [key: string]: unknown
}

export interface TrendyolOrdersResponse {
  totalElements?: number
  totalPages?: number
  page?: number
  size?: number
  content?: TrendyolShipmentPackage[]
}

export interface TrendyolApprovedVariant {
  variantId?: number
  barcode?: string
  stockCode?: string
  onSale?: boolean
  archived?: boolean
  blacklisted?: boolean
  locked?: boolean
  price?: {
    salePrice?: number
    listPrice?: number
  }
  stock?: {
    lastModifiedDate?: number | null
  }
  sellerModifiedDate?: number
  attributes?: Array<{
    attributeName?: string
    attributeValue?: string
    attributeValueId?: number | null
  }>
  [key: string]: unknown
}

export interface TrendyolApprovedContent {
  contentId?: number
  productMainId?: string
  title?: string
  brand?: { id?: number; name?: string } | null
  category?: { id?: number; name?: string } | null
  creationDate?: number
  lastModifiedDate?: number
  variants?: TrendyolApprovedVariant[]
  // Resmi V2 approved-products cevabinda urun gorselleri content
  // seviyesinde tasiniyor: images[] (cdn URL'leri) + eski imageUrl.
  images?: string[]
  imageUrl?: string
  [key: string]: unknown
}

export interface TrendyolProductsResponse {
  totalElements?: number
  totalPages?: number
  page?: number
  size?: number
  nextPageToken?: string
  content?: TrendyolApprovedContent[]
}

/*
 * filterApprovedProductsInventoryAndPrice — yalnizca stok + fiyat.
 * Resmi dokuman: developers.trendyol.com/v3.0/reference/filterapprovedproductsinventoryandprice
 * V2 approved-products cevabi stok ADEDI vermedigi icin gercek stok
 * bu endpoint'ten tamamlanir. quantity = satilabilir stok adedi.
 */
export interface TrendyolInventoryVariant {
  variantId?: number
  barcode?: string
  salePrice?: number
  listPrice?: number
  quantity?: number
  stockCode?: string
  stockLastModifiedDate?: number | null
}

export interface TrendyolInventoryContent {
  contentId?: number
  productMainId?: string
  variants?: TrendyolInventoryVariant[]
}

export interface TrendyolInventoryAndPriceResponse {
  totalElements?: number
  totalPages?: number
  page?: number
  size?: number
  nextPageToken?: string
  content?: TrendyolInventoryContent[]
}
