export { ShopifyAdapter, SHOPIFY_ORDERS_QUERY, SHOPIFY_PRODUCTS_QUERY } from './ShopifyAdapter.js'
export { ShopifyClient, normalizeShopDomain, redactShopifySecrets } from './ShopifyClient.js'
export { ShopifyClientError } from './ShopifyErrors.js'
export { mapShopifyOrder, mapShopifyOrderStatus, mapShopifyLineItem, mapShopifyVariant, aggregateShopifyInventory, extractShopifyImages } from './ShopifyMapper.js'
export * from './ShopifyTypes.js'

import { ShopifyAdapter } from './ShopifyAdapter.js'
export const shopifyAdapter = new ShopifyAdapter()

