import type {
  NormalizedOrder,
  NormalizedOrderItem,
  NormalizedOrderStatus,
  NormalizedProduct
} from '../../types.js'
import { sanitizeProductImageUrl } from '../trendyol/TrendyolMapper.js'
import type {
  ShopifyLineItem,
  ShopifyMoneyBag,
  ShopifyOrder,
  ShopifyProductVariant,
  ShopifyRefund
} from './ShopifyTypes.js'

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function money(bag?: ShopifyMoneyBag | null): number | null {
  return numberOrNull(bag?.shopMoney?.amount)
}

function validDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function sumRefunds(refunds?: ShopifyRefund[] | null): number | null {
  if (!Array.isArray(refunds) || refunds.length === 0) return null
  let sum = 0
  let found = false
  for (const refund of refunds) {
    const amount = money(refund.totalRefundedSet)
    if (amount !== null) {
      sum += amount
      found = true
    }
  }
  return found ? sum : null
}

export function mapShopifyOrderStatus(order: ShopifyOrder): NormalizedOrderStatus {
  // Cancellation refunds are not returns: cancellation is authoritative.
  if (order.cancelledAt) return 'CANCELLED'

  const gross = money(order.totalPriceSet)
  const refunded = sumRefunds(order.refunds)
  if (refunded !== null && refunded > 0) {
    if (gross !== null && gross > 0 && refunded + 0.005 >= gross) return 'RETURNED'
    return 'PARTIALLY_RETURNED'
  }

  const fulfillments = Array.isArray(order.fulfillments) ? order.fulfillments : []
  const delivered = fulfillments.some(f => Boolean(f.deliveredAt) || String(f.displayStatus || '').toUpperCase() === 'DELIVERED')
  if (delivered && String(order.displayFulfillmentStatus || '').toUpperCase() === 'FULFILLED') return 'DELIVERED'

  const fulfillmentStatus = String(order.displayFulfillmentStatus || '').toUpperCase()
  if (fulfillmentStatus === 'FULFILLED' || fulfillmentStatus === 'PARTIALLY_FULFILLED') return 'SHIPPED'
  if (['IN_PROGRESS', 'PENDING_FULFILLMENT', 'SCHEDULED', 'ON_HOLD'].includes(fulfillmentStatus)) return 'PROCESSING'

  const financialStatus = String(order.displayFinancialStatus || '').toUpperCase()
  if ((fulfillmentStatus === 'UNFULFILLED' || fulfillmentStatus === 'OPEN')
    && ['', 'PENDING', 'AUTHORIZED'].includes(financialStatus)) return 'CREATED'
  if (['AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'PENDING'].includes(financialStatus)) return 'PROCESSING'
  if (fulfillmentStatus === 'UNFULFILLED' || fulfillmentStatus === 'OPEN') return 'CREATED'
  return 'UNKNOWN'
}

export function mapShopifyLineItem(line: ShopifyLineItem): NormalizedOrderItem {
  const quantity = Math.max(0, Math.trunc(numberOrNull(line.quantity) ?? 0))
  const unitPrice = money(line.originalUnitPriceSet)
  const gross = money(line.originalTotalSet) ?? (unitPrice !== null ? unitPrice * quantity : null)
  const discount = money(line.totalDiscountSet)
  const variant = line.variant
  return {
    externalId: line.id ? String(line.id) : null,
    externalProductId: variant?.id ? String(variant.id) : null,
    sku: variant?.sku || line.sku || null,
    barcode: variant?.barcode || null,
    title: String(line.name || line.title || variant?.sku || 'Ürün').slice(0, 500),
    quantity,
    unitPrice,
    grossAmount: gross,
    discountAmount: discount,
    commissionAmount: null,
    shippingAllocation: null,
    refundAmount: null,
    netContribution: null,
    metadata: variant?.product?.id ? { parentProductId: variant.product.id } : undefined
  }
}

export function mapShopifyOrder(order: ShopifyOrder): NormalizedOrder {
  const externalId = typeof order.id === 'string' ? order.id.trim() : ''
  if (!externalId) throw new Error('Shopify order has no id')
  const orderDate = validDate(order.createdAt)
  if (!orderDate) throw new Error('Shopify order has no valid createdAt')
  if (order.lineItems?.pageInfo?.hasNextPage) {
    // Partial line item imports would corrupt product analytics and totals.
    throw new Error('Shopify order line item page is truncated')
  }

  const currency = String(order.currencyCode || order.totalPriceSet?.shopMoney?.currencyCode || '').toUpperCase()
  const fulfillments = Array.isArray(order.fulfillments) ? order.fulfillments : []
  const returns = Array.isArray(order.returns?.nodes) ? order.returns!.nodes! : []
  const metadata: Record<string, unknown> = {
    financialStatus: order.displayFinancialStatus || null,
    fulfillmentStatus: order.displayFulfillmentStatus || null,
    cancellationReason: order.cancelReason || null,
    fulfillmentCount: fulfillments.length,
    returnStatuses: returns.map(row => row.status).filter(Boolean)
  }

  return {
    externalId,
    externalOrderNumber: order.name || null,
    // Protected customer identity and all contact/address fields are deliberately not queried or stored.
    externalCustomerId: null,
    customerDisplayName: null,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'TRY',
    grossAmount: money(order.totalPriceSet) ?? money(order.currentTotalPriceSet),
    discountAmount: money(order.currentTotalDiscountsSet),
    commissionAmount: null,
    shippingAmount: money(order.currentShippingPriceSet) ?? money(order.totalShippingPriceSet),
    refundAmount: sumRefunds(order.refunds),
    taxAmount: money(order.currentTotalTaxSet),
    netContribution: null,
    status: mapShopifyOrderStatus(order),
    orderDate,
    providerUpdatedAt: validDate(order.updatedAt),
    items: (Array.isArray(order.lineItems?.nodes) ? order.lineItems!.nodes! : []).map(mapShopifyLineItem),
    metadata
  }
}

export function extractShopifyImages(variant: ShopifyProductVariant): string[] {
  const candidates: unknown[] = [
    variant.image?.url,
    variant.product?.featuredMedia?.preview?.image?.url,
    ...(Array.isArray(variant.product?.media?.nodes)
      ? variant.product!.media!.nodes!.map(node => node?.image?.url)
      : [])
  ]
  const unique: string[] = []
  for (const candidate of candidates) {
    const sanitized = sanitizeProductImageUrl(candidate)
    if (sanitized && !unique.includes(sanitized)) unique.push(sanitized)
    if (unique.length >= 3) break
  }
  return unique
}

export function aggregateShopifyInventory(variant: ShopifyProductVariant): {
  quantity: number | null
  locationCount: number
  truncated: boolean
} {
  const levels = variant.inventoryItem?.inventoryLevels
  const nodes = Array.isArray(levels?.nodes) ? levels!.nodes! : []
  const truncated = levels?.pageInfo?.hasNextPage === true
  let sum = 0
  let found = false
  for (const level of nodes) {
    const available = (Array.isArray(level.quantities) ? level.quantities : [])
      .find(row => row?.name === 'available')
    const quantity = numberOrNull(available?.quantity)
    if (quantity !== null) {
      sum += quantity
      found = true
    }
  }
  // inventoryQuantity is Shopify's variant-level aggregate. Prefer explicit
  // level sum only when the complete level connection was returned.
  const aggregate = numberOrNull(variant.inventoryQuantity)
  return {
    quantity: found && !truncated ? Math.trunc(sum) : aggregate === null ? null : Math.trunc(aggregate),
    locationCount: nodes.length,
    truncated
  }
}

export function mapShopifyVariant(variant: ShopifyProductVariant): NormalizedProduct {
  const externalId = typeof variant.id === 'string' ? variant.id.trim() : ''
  if (!externalId) throw new Error('Shopify variant has no id')
  const product = variant.product
  const images = extractShopifyImages(variant)
  const inventory = aggregateShopifyInventory(variant)
  const variantTitle = String(variant.title || '').trim()
  const parentTitle = String(product?.title || variant.displayName || variant.sku || 'Ürün').trim()
  const hasMeaningfulVariantTitle = variantTitle && variantTitle.toLowerCase() !== 'default title'
  const metadata: Record<string, unknown> = {
    parentProductId: product?.id || null,
    parentTitle: product?.title || null,
    variantTitle: variant.title || null,
    inventoryLocationCount: inventory.locationCount,
    inventoryLevelsTruncated: inventory.truncated,
    images
  }

  return {
    // Shopify's sellable and inventory-bearing unit is ProductVariant.
    externalId,
    sku: variant.sku || null,
    barcode: variant.barcode || null,
    title: [parentTitle, hasMeaningfulVariantTitle ? variantTitle : null].filter(Boolean).join(' - ').slice(0, 500),
    brand: product?.vendor || null,
    category: product?.productType || null,
    salePrice: numberOrNull(variant.price),
    listPrice: numberOrNull(variant.compareAtPrice),
    stockQuantity: inventory.quantity,
    currency: null,
    isActive: String(product?.status || '').toUpperCase() === 'ACTIVE' && variant.availableForSale !== false,
    imageUrl: images[0] || null,
    providerUpdatedAt: validDate(variant.updatedAt) || validDate(product?.updatedAt),
    metadata
  }
}
