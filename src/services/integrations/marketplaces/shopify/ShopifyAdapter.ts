import type {
  CredentialValidationResult,
  MarketplaceProviderAdapter,
  OrdersPage,
  ProductsPage,
  ProviderCapabilities,
  ProviderCredentials
} from '../../types.js'
import { defaultCapabilities } from '../../types.js'
import { ShopifyClient } from './ShopifyClient.js'
import { ShopifyClientError } from './ShopifyErrors.js'
import { mapShopifyOrder, mapShopifyVariant } from './ShopifyMapper.js'
import type { ShopifyConnection, ShopifyOrder, ShopifyProductVariant } from './ShopifyTypes.js'

const PAGE_SIZE = 100
const MAX_CURSOR_PAGES = 200

export const SHOPIFY_ORDERS_QUERY = `#graphql
query LocalKararOrders($first: Int!, $after: String, $query: String!) {
  orders(first: $first, after: $after, sortKey: UPDATED_AT, query: $query) {
    nodes {
      id name createdAt updatedAt currencyCode cancelledAt cancelReason
      displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      currentTotalDiscountsSet { shopMoney { amount currencyCode } }
      currentTotalTaxSet { shopMoney { amount currencyCode } }
      currentShippingPriceSet { shopMoney { amount currencyCode } }
      totalShippingPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 250) {
        nodes {
          id name title quantity sku
          originalUnitPriceSet { shopMoney { amount currencyCode } }
          originalTotalSet { shopMoney { amount currencyCode } }
          discountedTotalSet { shopMoney { amount currencyCode } }
          totalDiscountSet { shopMoney { amount currencyCode } }
          variant { id sku barcode product { id } }
        }
        pageInfo { hasNextPage endCursor }
      }
      fulfillments { id status displayStatus deliveredAt inTransitAt }
      refunds {
        id createdAt totalRefundedSet { shopMoney { amount currencyCode } }
      }
      returns(first: 20) { nodes { id status } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`

export const SHOPIFY_PRODUCTS_QUERY = `#graphql
query LocalKararVariants($first: Int!, $after: String) {
  productVariants(first: $first, after: $after) {
    nodes {
      id title displayName sku barcode price compareAtPrice inventoryQuantity availableForSale updatedAt
      image { url }
      inventoryItem {
        inventoryLevels(first: 100) {
          nodes { location { id name } quantities(names: ["available"]) { name quantity } }
          pageInfo { hasNextPage endCursor }
        }
      }
      product {
        id title vendor productType status updatedAt
        featuredMedia { preview { image { url } } }
        media(first: 3) { nodes { ... on MediaImage { image { url } } } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`

const SHOP_QUERY = `#graphql
query LocalKararShopIdentity { shop { id name myshopifyDomain } }`

export class ShopifyAdapter implements MarketplaceProviderAdapter<ShopifyOrder, ShopifyProductVariant> {
  readonly provider = 'SHOPIFY' as const
  readonly capabilities: ProviderCapabilities = defaultCapabilities({
    supportsShippingCost: true,
    supportsRefundData: true,
    supportsCommissionData: false,
    supportsSettlementData: false
  })

  getCapabilities(): ProviderCapabilities {
    return this.capabilities
  }

  protected createClient(credentials: ProviderCredentials): ShopifyClient {
    return new ShopifyClient({
      shopDomain: credentials.externalAccountId,
      accessToken: credentials.accessToken || ''
    })
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<CredentialValidationResult> {
    if (!credentials.externalAccountId || !credentials.accessToken) {
      return { valid: false, message: 'Shopify mağaza alan adı ve erişim belirteci zorunludur.', errorCode: 'CREDENTIALS_MISSING' }
    }
    try {
      const data = await this.createClient(credentials).query<{
        shop?: { id?: string; name?: string; myshopifyDomain?: string }
      }>(SHOP_QUERY)
      if (!data.shop?.id || !data.shop.myshopifyDomain) {
        return { valid: false, message: 'Shopify mağaza kimliği doğrulanamadı.', errorCode: 'MALFORMED_RESPONSE' }
      }
      return { valid: true, displayName: data.shop.name || null }
    } catch (error) {
      return this.validationError(error)
    }
  }

  async healthCheck(credentials: ProviderCredentials): Promise<CredentialValidationResult> {
    return this.validateCredentials(credentials)
  }

  async fetchOrders(params: {
    credentials: ProviderCredentials
    fromDate: Date
    toDate: Date
  }): Promise<OrdersPage<ShopifyOrder>> {
    const client = this.createClient(params.credentials)
    const rows: ShopifyOrder[] = []
    let cursor: string | null = null
    const query = `updated_at:>=${params.fromDate.toISOString()} updated_at:<=${params.toDate.toISOString()}`
    for (let page = 0; page < MAX_CURSOR_PAGES; page += 1) {
      const data: { orders?: ShopifyConnection<ShopifyOrder> } = await client.query<{ orders?: ShopifyConnection<ShopifyOrder> }>(SHOPIFY_ORDERS_QUERY, {
        first: PAGE_SIZE,
        after: cursor,
        query
      })
      const connection: ShopifyConnection<ShopifyOrder> | undefined = data.orders
      if (!connection || !Array.isArray(connection.nodes) || !connection.pageInfo) {
        throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify orders response is malformed')
      }
      rows.push(...connection.nodes)
      if (!connection.pageInfo.hasNextPage) break
      const next: string | null | undefined = connection.pageInfo.endCursor
      if (!next || next === cursor) throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify orders cursor is invalid')
      cursor = next
      if (page === MAX_CURSOR_PAGES - 1) throw new ShopifyClientError('PROVIDER_ERROR', 'Shopify orders pagination limit exceeded')
    }
    return { orders: rows, page: 0, totalPages: 1, totalElements: rows.length, hasNextPage: false }
  }

  async fetchProducts(params: { credentials: ProviderCredentials }): Promise<ProductsPage<ShopifyProductVariant>> {
    const client = this.createClient(params.credentials)
    const rows: ShopifyProductVariant[] = []
    let cursor: string | null = null
    for (let page = 0; page < MAX_CURSOR_PAGES; page += 1) {
      const data: { productVariants?: ShopifyConnection<ShopifyProductVariant> } = await client.query<{ productVariants?: ShopifyConnection<ShopifyProductVariant> }>(SHOPIFY_PRODUCTS_QUERY, {
        first: PAGE_SIZE,
        after: cursor
      })
      const connection: ShopifyConnection<ShopifyProductVariant> | undefined = data.productVariants
      if (!connection || !Array.isArray(connection.nodes) || !connection.pageInfo) {
        throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify products response is malformed')
      }
      rows.push(...connection.nodes)
      if (!connection.pageInfo.hasNextPage) break
      const next: string | null | undefined = connection.pageInfo.endCursor
      if (!next || next === cursor) throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify products cursor is invalid')
      cursor = next
      if (page === MAX_CURSOR_PAGES - 1) throw new ShopifyClientError('PROVIDER_ERROR', 'Shopify products pagination limit exceeded')
    }
    return { products: rows, page: 0, totalPages: 1, totalElements: rows.length, hasNextPage: false, nextPageCursor: null }
  }

  normalizeOrder(raw: ShopifyOrder) {
    return mapShopifyOrder(raw)
  }

  normalizeProduct(raw: ShopifyProductVariant) {
    return mapShopifyVariant(raw)
  }

  toSyncError(error: unknown): Error & { errorCode?: string } {
    if (error instanceof ShopifyClientError) {
      const safe = new Error(error.safeMessage) as Error & { errorCode?: string }
      safe.errorCode = `SHOPIFY_${error.kind}`
      return safe
    }
    const safe = new Error('Shopify provider request failed') as Error & { errorCode?: string }
    safe.errorCode = 'SHOPIFY_UNKNOWN_ERROR'
    return safe
  }

  private validationError(error: unknown): CredentialValidationResult {
    if (error instanceof ShopifyClientError) {
      if (error.kind === 'AUTH') return { valid: false, message: 'Shopify erişim izni geçersiz veya kaldırılmış.', errorCode: 'INVALID_CREDENTIALS' }
      if (error.kind === 'FORBIDDEN') return { valid: false, message: 'Shopify uygulamasına gerekli okuma izinleri verilmemiş.', errorCode: 'PROVIDER_FORBIDDEN' }
      if (error.kind === 'RATE_LIMITED') return { valid: false, message: 'Shopify istek sınırına ulaştı. Kısa süre sonra tekrar deneyin.', errorCode: 'PROVIDER_RATE_LIMITED' }
      if (error.kind === 'TIMEOUT' || error.kind === 'NETWORK') return { valid: false, message: 'Shopify servisine şu anda ulaşılamıyor.', errorCode: 'PROVIDER_UNREACHABLE' }
      if (error.kind === 'MALFORMED_RESPONSE') return { valid: false, message: 'Shopify beklenmeyen bir yanıt döndürdü.', errorCode: 'MALFORMED_RESPONSE' }
    }
    return { valid: false, message: 'Shopify bağlantısı doğrulanamadı.', errorCode: 'VALIDATION_FAILED' }
  }
}
