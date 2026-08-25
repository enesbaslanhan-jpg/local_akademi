import { describe, expect, it } from 'vitest'
import { ShopifyAdapter } from '../../src/services/integrations/marketplaces/shopify/ShopifyAdapter.js'
import {
  aggregateShopifyInventory,
  extractShopifyImages,
  mapShopifyOrder,
  mapShopifyOrderStatus,
  mapShopifyVariant
} from '../../src/services/integrations/marketplaces/shopify/ShopifyMapper.js'
import { buildShopifyOrder, buildShopifyVariant } from './fixtures/shopify-fixtures.js'

describe('Shopify order mapper', () => {
  it.each([
    ['created', 'CREATED'], ['processing', 'PROCESSING'], ['shipped', 'SHIPPED'],
    ['delivered', 'DELIVERED'], ['cancelled', 'CANCELLED'], ['returned', 'RETURNED'],
    ['partial', 'PARTIALLY_RETURNED']
  ] as const)('%s lifecycle -> %s', (source, expected) => {
    expect(mapShopifyOrderStatus(buildShopifyOrder(1, source))).toBe(expected)
  })

  it('normalizes financial fields, variant identity and discards customer PII', () => {
    const order = buildShopifyOrder(8, 'partial')
    ;(order as any).email = 'customer@example.com'
    ;(order as any).shippingAddress = { address1: 'Secret street', phone: '+90000' }
    const normalized = mapShopifyOrder(order)
    expect(normalized.externalId).toMatch(/^gid:\/\/shopify\/Order\//)
    expect(normalized.shippingAmount).toBe(19.9)
    expect(normalized.refundAmount).toBe(25)
    expect(normalized.taxAmount).toBe(16.67)
    expect(normalized.customerDisplayName).toBeNull()
    expect(normalized.externalCustomerId).toBeNull()
    expect(JSON.stringify(normalized)).not.toContain('customer@example.com')
    expect(JSON.stringify(normalized)).not.toContain('Secret street')
    expect(normalized.items[0].externalProductId).toMatch(/^gid:\/\/shopify\/ProductVariant\//)
  })

  it('rejects missing order identity/date instead of inventing values', () => {
    expect(() => mapShopifyOrder({})).toThrow()
    expect(() => mapShopifyOrder({ id: 'gid://shopify/Order/1' })).toThrow()
  })
})

describe('Shopify product variant mapper', () => {
  it('uses variant GID as product identity and preserves parent metadata', () => {
    const normalized = mapShopifyVariant(buildShopifyVariant(3))
    expect(normalized.externalId).toBe('gid://shopify/ProductVariant/7003')
    expect(normalized.metadata?.parentProductId).toBe('gid://shopify/Product/6003')
    expect(normalized.sku).toBe('SHOP-SKU-003')
    expect(normalized.stockQuantity).toBe(5)
    expect(normalized.salePrice).toBe(103)
    expect(normalized.listPrice).toBe(123)
  })

  it('aggregates complete multi-location available stock deterministically', () => {
    expect(aggregateShopifyInventory(buildShopifyVariant(5))).toEqual({ quantity: 7, locationCount: 2, truncated: false })
  })

  it('falls back to Shopify aggregate when location pagination is truncated', () => {
    const variant = buildShopifyVariant(6)
    variant.inventoryItem!.inventoryLevels!.pageInfo!.hasNextPage = true
    expect(aggregateShopifyInventory(variant)).toEqual({ quantity: 6, locationCount: 2, truncated: true })
  })

  it('sanitizes real image URLs and rejects unsafe schemes', () => {
    const variant = buildShopifyVariant(2)
    variant.image = { url: 'javascript:alert(1)' }
    const images = extractShopifyImages(variant)
    expect(images.length).toBeGreaterThan(0)
    expect(images.every(url => url.startsWith('https://'))).toBe(true)
  })

  it('capabilities reflect order facts, not unavailable payouts/fees', () => {
    const adapter = new ShopifyAdapter()
    expect(adapter.capabilities.supportsShippingCost).toBe(true)
    expect(adapter.capabilities.supportsRefundData).toBe(true)
    expect(adapter.capabilities.supportsCommissionData).toBe(false)
    expect(adapter.capabilities.supportsSettlementData).toBe(false)
  })
})

