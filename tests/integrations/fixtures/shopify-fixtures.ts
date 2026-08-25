import type { ShopifyOrder, ShopifyProductVariant } from '../../../src/services/integrations/marketplaces/shopify/ShopifyTypes.js'

const NOW = Date.parse('2026-08-25T10:00:00.000Z')

export function buildShopifyVariant(index: number): ShopifyProductVariant {
  const id = 7000 + index
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: index % 2 ? 'Mavi / M' : 'Default Title',
    displayName: `Shopify Ürün ${index}`,
    sku: index === 1 ? 'SKU-SHARED' : `SHOP-SKU-${String(index).padStart(3, '0')}`,
    barcode: index % 3 === 0 ? `869000${String(index).padStart(4, '0')}` : null,
    price: String(100 + index),
    compareAtPrice: index % 2 ? String(120 + index) : null,
    inventoryQuantity: index,
    availableForSale: index % 7 !== 0,
    updatedAt: new Date(NOW - index * 60_000).toISOString(),
    image: index % 4 ? { url: `https://cdn.shopify.com/s/files/1/0000/products/variant-${index}.jpg` } : null,
    inventoryItem: {
      inventoryLevels: {
        nodes: [
          { location: { id: 'gid://shopify/Location/1', name: 'Ana Depo' }, quantities: [{ name: 'available', quantity: index }] },
          { location: { id: 'gid://shopify/Location/2', name: 'Mağaza' }, quantities: [{ name: 'available', quantity: 2 }] }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
    },
    product: {
      id: `gid://shopify/Product/${6000 + index}`,
      title: index === 1 ? 'Dört Kanalda Aynı Ürün' : `Shopify Ürün ${index}`,
      vendor: 'Local Marka',
      productType: 'Ev & Yaşam',
      status: index % 7 === 0 ? 'DRAFT' : 'ACTIVE',
      updatedAt: new Date(NOW - index * 60_000).toISOString(),
      featuredMedia: { preview: { image: { url: `https://cdn.shopify.com/s/files/1/0000/products/main-${index}.jpg` } } },
      media: { nodes: [{ image: { url: `https://cdn.shopify.com/s/files/1/0000/products/extra-${index}.jpg` } }] }
    }
  }
}

export function buildShopifyVariants(count = 20): ShopifyProductVariant[] {
  return Array.from({ length: count }, (_, index) => buildShopifyVariant(index + 1))
}

export function buildShopifyOrder(index: number, status?: 'created' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'partial'): ShopifyOrder {
  const variant = buildShopifyVariant((index % 20) + 1)
  const lifecycle = status || (['created', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'partial'] as const)[index % 7]
  const gross = 100 + index
  const base: ShopifyOrder = {
    id: `gid://shopify/Order/${8000 + index}`,
    name: `#LK${String(index).padStart(4, '0')}`,
    createdAt: new Date(NOW - index * 3_600_000).toISOString(),
    updatedAt: new Date(NOW - index * 1_800_000).toISOString(),
    currencyCode: 'TRY',
    displayFinancialStatus: lifecycle === 'created' ? 'PENDING' : 'PAID',
    displayFulfillmentStatus: lifecycle === 'created' ? 'UNFULFILLED' : lifecycle === 'processing' ? 'IN_PROGRESS' : 'FULFILLED',
    totalPriceSet: { shopMoney: { amount: String(gross), currencyCode: 'TRY' } },
    currentTotalPriceSet: { shopMoney: { amount: String(gross), currencyCode: 'TRY' } },
    currentTotalDiscountsSet: { shopMoney: { amount: '5', currencyCode: 'TRY' } },
    currentTotalTaxSet: { shopMoney: { amount: '16.67', currencyCode: 'TRY' } },
    currentShippingPriceSet: { shopMoney: { amount: '19.90', currencyCode: 'TRY' } },
    totalShippingPriceSet: { shopMoney: { amount: '19.90', currencyCode: 'TRY' } },
    lineItems: { nodes: [{
      id: `gid://shopify/LineItem/${9000 + index}`,
      name: variant.product?.title,
      quantity: 1,
      originalUnitPriceSet: { shopMoney: { amount: String(gross), currencyCode: 'TRY' } },
      originalTotalSet: { shopMoney: { amount: String(gross), currencyCode: 'TRY' } },
      totalDiscountSet: { shopMoney: { amount: '5', currencyCode: 'TRY' } },
      variant: { id: variant.id, sku: variant.sku, barcode: variant.barcode, product: { id: variant.product?.id } }
    }] },
    fulfillments: lifecycle === 'delivered'
      ? [{ id: `gid://shopify/Fulfillment/${index}`, status: 'SUCCESS', displayStatus: 'DELIVERED', deliveredAt: new Date(NOW).toISOString() }]
      : lifecycle === 'shipped'
        ? [{ id: `gid://shopify/Fulfillment/${index}`, status: 'SUCCESS', displayStatus: 'IN_TRANSIT', inTransitAt: new Date(NOW).toISOString() }]
        : [],
    refunds: [],
    returns: { nodes: [] }
  }
  if (lifecycle === 'cancelled') {
    base.cancelledAt = new Date(NOW).toISOString()
    base.cancelReason = 'CUSTOMER'
  }
  if (lifecycle === 'returned' || lifecycle === 'partial') {
    base.refunds = [{
      id: `gid://shopify/Refund/${index}`,
      createdAt: new Date(NOW).toISOString(),
      totalRefundedSet: { shopMoney: { amount: lifecycle === 'returned' ? String(gross) : '25', currencyCode: 'TRY' } },
      refundLineItems: { nodes: [{ quantity: 1, lineItem: { id: `gid://shopify/LineItem/${9000 + index}` } }] }
    }]
    base.returns = { nodes: [{ id: `gid://shopify/Return/${index}`, status: 'CLOSED' }] }
  }
  return base
}

export function buildShopifyOrders(count = 40): ShopifyOrder[] {
  return Array.from({ length: count }, (_, index) => buildShopifyOrder(index + 1))
}
