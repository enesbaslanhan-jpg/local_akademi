export const SHOPIFY_API_VERSION = '2026-07'
export const SHOPIFY_REQUIRED_SCOPES = [
  'read_orders',
  'read_products',
  'read_inventory',
  'read_returns'
] as const

export interface ShopifyMoney {
  amount?: string | number | null
  currencyCode?: string | null
}

export interface ShopifyMoneyBag {
  shopMoney?: ShopifyMoney | null
}

export interface ShopifyPageInfo {
  hasNextPage?: boolean
  endCursor?: string | null
}

export interface ShopifyLineItem {
  id?: string | null
  name?: string | null
  title?: string | null
  quantity?: number | null
  originalUnitPriceSet?: ShopifyMoneyBag | null
  discountedTotalSet?: ShopifyMoneyBag | null
  originalTotalSet?: ShopifyMoneyBag | null
  totalDiscountSet?: ShopifyMoneyBag | null
  sku?: string | null
  variant?: {
    id?: string | null
    sku?: string | null
    barcode?: string | null
    product?: { id?: string | null } | null
  } | null
}

export interface ShopifyRefund {
  id?: string | null
  createdAt?: string | null
  totalRefundedSet?: ShopifyMoneyBag | null
  refundLineItems?: {
    nodes?: Array<{
      quantity?: number | null
      lineItem?: { id?: string | null } | null
    }>
  } | null
}

export interface ShopifyOrder {
  id?: string | null
  name?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  currencyCode?: string | null
  cancelledAt?: string | null
  cancelReason?: string | null
  displayFinancialStatus?: string | null
  displayFulfillmentStatus?: string | null
  totalPriceSet?: ShopifyMoneyBag | null
  currentTotalPriceSet?: ShopifyMoneyBag | null
  currentTotalDiscountsSet?: ShopifyMoneyBag | null
  currentTotalTaxSet?: ShopifyMoneyBag | null
  currentShippingPriceSet?: ShopifyMoneyBag | null
  totalShippingPriceSet?: ShopifyMoneyBag | null
  lineItems?: { nodes?: ShopifyLineItem[]; pageInfo?: ShopifyPageInfo | null } | null
  fulfillments?: Array<{
    id?: string | null
    status?: string | null
    displayStatus?: string | null
    deliveredAt?: string | null
    inTransitAt?: string | null
  }> | null
  refunds?: ShopifyRefund[] | null
  returns?: { nodes?: Array<{ id?: string | null; status?: string | null }> } | null
}

export interface ShopifyProductVariant {
  id?: string | null
  title?: string | null
  displayName?: string | null
  sku?: string | null
  barcode?: string | null
  price?: string | number | null
  compareAtPrice?: string | number | null
  inventoryQuantity?: number | null
  availableForSale?: boolean | null
  updatedAt?: string | null
  image?: { url?: string | null } | null
  inventoryItem?: {
    inventoryLevels?: {
      nodes?: Array<{
        location?: { id?: string | null; name?: string | null } | null
        quantities?: Array<{ name?: string | null; quantity?: number | null }> | null
      }>
      pageInfo?: ShopifyPageInfo | null
    } | null
  } | null
  product?: {
    id?: string | null
    title?: string | null
    vendor?: string | null
    productType?: string | null
    status?: string | null
    updatedAt?: string | null
    featuredMedia?: { preview?: { image?: { url?: string | null } | null } | null } | null
    media?: {
      nodes?: Array<{ image?: { url?: string | null } | null }>
    } | null
  } | null
}

export interface ShopifyGraphQLError {
  message?: string
  extensions?: { code?: string }
}

export interface ShopifyGraphQLResponse<T> {
  data?: T | null
  errors?: ShopifyGraphQLError[]
  extensions?: {
    cost?: {
      requestedQueryCost?: number
      actualQueryCost?: number
      throttleStatus?: {
        maximumAvailable?: number
        currentlyAvailable?: number
        restoreRate?: number
      }
    }
  }
}

export interface ShopifyConnection<T> {
  nodes?: T[]
  pageInfo?: ShopifyPageInfo
}
