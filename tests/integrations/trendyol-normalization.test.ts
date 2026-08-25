import { describe, it, expect } from 'vitest'
import {
  mapTrendyolStatus,
  mapTrendyolPackageToNormalizedOrder,
  mapTrendyolVariantToProduct,
  minimizeCustomerDisplayName
} from '../../src/services/integrations/marketplaces/trendyol/TrendyolMapper'
import type { TrendyolShipmentPackage } from '../../src/services/integrations/marketplaces/trendyol/TrendyolTypes'

function basePackage(overrides: Partial<TrendyolShipmentPackage> = {}): TrendyolShipmentPackage {
  return {
    id: 33301111111,
    shipmentPackageId: 33301111111,
    orderNumber: '10654411111',
    grossAmount: 498.9,
    totalDiscount: 20,
    totalPrice: 478.9,
    currencyCode: 'TRY',
    orderDate: 1762253333685,
    lastModifiedDate: 1762865408581,
    status: 'Delivered',
    customerId: 1451111111,
    customerFirstName: 'Ayşe',
    customerLastName: 'Yılmaz',
    supplierId: 2738,
    lines: [
      {
        quantity: 2,
        merchantSku: 'MSKU-1',
        stockCode: 'ST-1',
        productName: 'Desenli Tepsi',
        productCode: 1239111111,
        amount: 498.9,
        lineGrossAmount: 498.9,
        discount: 20,
        lineTotalDiscount: 20,
        price: 249.45,
        lineUnitPrice: 249.45,
        barcode: '8683772071724',
        vatRate: 20,
        commission: 13,
        orderLineItemStatusName: 'Delivered'
      }
    ],
    ...overrides
  }
}

describe('Trendyol status mapping', () => {
  it.each([
    ['Created', 'CREATED'],
    ['Awaiting', 'CREATED'],
    ['Picking', 'PROCESSING'],
    ['Invoiced', 'PROCESSING'],
    ['AtCollectionPoint', 'PROCESSING'],
    ['Shipped', 'SHIPPED'],
    ['Delivered', 'DELIVERED'],
    ['Cancelled', 'CANCELLED'],
    ['UnSupplied', 'CANCELLED'],
    ['Returned', 'RETURNED'],
    ['UnDelivered', 'UNKNOWN'],
    ['BilinmeyenDurum', 'UNKNOWN']
  ] as const)('maps "%s" to %s', (raw, expected) => {
    expect(mapTrendyolStatus(basePackage({ status: raw })) as string).toBe(expected)
  })

  it('detects partial return when some lines are Returned but package is Delivered', () => {
    const pkg = basePackage({
      status: 'Delivered',
      lines: [
        { orderLineItemStatusName: 'Delivered' },
        { orderLineItemStatusName: 'Returned' }
      ] as any
    })
    expect(mapTrendyolStatus(pkg) as string).toBe('PARTIALLY_RETURNED')
  })
})

describe('PII minimization', () => {
  it('stores first name + last initial only', () => {
    expect(minimizeCustomerDisplayName('Ayşe', 'Yılmaz')).toBe('Ayşe Y.')
  })

  it('normalized order never contains email/phone/address/identity/tax data', () => {
    const pkg = basePackage({
      customerEmail: 'hacker@must-not-store.com',
      identityNumber: '11111111111',
      taxNumber: '9999999999',
      shipmentAddress: {
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        phone: '+905555555555',
        fullAddress: 'Çok gizli adres satırı'
      } as any
    })
    const normalized = mapTrendyolPackageToNormalizedOrder(pkg)
    const serialized = JSON.stringify(normalized)
    expect(serialized).not.toContain('hacker@must-not-store.com')
    expect(serialized).not.toContain('+905555555555')
    expect(serialized).not.toContain('Çok gizli adres')
    expect(serialized).not.toContain('Yılmaz')
    expect(normalized.customerDisplayName).toBe('Ayşe Y.')
  })

  it('keeps cargo tracking number in provider-specific metadata (not a core column)', () => {
    const normalized = mapTrendyolPackageToNormalizedOrder(
      basePackage({ cargoTrackingNumber: 7280027504111111 })
    )
    expect((normalized.metadata as any)?.cargoTrackingNumber).toBe(7280027504111111)
  })
})

describe('financial normalization rules', () => {
  it('uses provided gross/discount and keeps unknown money fields null', () => {
    const normalized = mapTrendyolPackageToNormalizedOrder(basePackage())
    expect(normalized.grossAmount).toBeCloseTo(498.9, 2)
    expect(normalized.discountAmount).toBeCloseTo(20, 2)
    // Provider komisyon/kargo/iade TUTARI vermiyor -> uydurma yok.
    expect(normalized.commissionAmount).toBeNull()
    expect(normalized.shippingAmount).toBeNull()
    expect(normalized.refundAmount).toBeNull()
    // netContribution bilesenleri eksik -> null.
    expect(normalized.netContribution).toBeNull()
  })

  it('keeps commission as PERCENT in item metadata, not as an amount', () => {
    const normalized = mapTrendyolPackageToNormalizedOrder(basePackage())
    const item = normalized.items[0]
    expect(item.metadata?.commissionPercent).toBe(13)
    expect(item.commissionAmount).toBeNull()
  })

  it('normalizes currency fallback to TRY', () => {
    expect(mapTrendyolPackageToNormalizedOrder(basePackage({ currencyCode: undefined })).currency).toBe('TRY')
    expect(mapTrendyolPackageToNormalizedOrder(basePackage({ currencyCode: 'usd' })).currency).toBe('USD')
  })

  it('computes net contribution deterministically when all parts exist', async () => {
    const { computeNetContribution } = await import('../../src/lib/money')
    const { Prisma } = await import('@prisma/client')
    const net = computeNetContribution({
      gross: new Prisma.Decimal('100.00'),
      discount: new Prisma.Decimal('10.00'),
      commission: new Prisma.Decimal('5.00'),
      shipping: new Prisma.Decimal('3.50'),
      refund: new Prisma.Decimal('1.25')
    })
    expect(net?.toString()).toBe('80.25')
  })

  it('returns null net contribution when a part is missing', async () => {
    const { computeNetContribution } = await import('../../src/lib/money')
    const { Prisma } = await import('@prisma/client')
    expect(computeNetContribution({
      gross: new Prisma.Decimal('100.00'),
      discount: null,
      commission: null,
      shipping: null,
      refund: null
    })).toBeNull()
  })

  it('money conversion keeps two decimals via Decimal, not float math', async () => {
    const { toMoneyString } = await import('../../src/lib/money')
    expect(toMoneyString(498.9)).toBe('498.90')
    expect(toMoneyString(0.1 + 0.2)).toBe('0.30')
  })
})

describe('product normalization', () => {
  it('maps variant to product with barcode externalId and no fabricated stock', () => {
    const product = mapTrendyolVariantToProduct(
      {
        contentId: 9511264,
        title: 'White Dress',
        brand: { id: 1, name: 'TYBR' },
        category: { id: 2, name: 'Dress' },
        variants: []
      } as any,
      {
        variantId: 42,
        barcode: '4066747871111',
        stockCode: 'TYPMID52',
        onSale: true,
        archived: false,
        blacklisted: false,
        price: { salePrice: 49.99, listPrice: 59.99 },
        attributes: [{ attributeName: 'Size', attributeValue: '42' }]
      } as any
    )
    expect(product.externalId).toBe('4066747871111')
    expect(product.sku).toBe('TYPMID52')
    expect(product.brand).toBe('TYBR')
    expect(product.category).toBe('Dress')
    expect(product.salePrice).toBeCloseTo(49.99, 2)
    expect(product.listPrice).toBeCloseTo(59.99, 2)
    // V2 approved-products cevabi stok adedi vermiyor -> null.
    expect(product.stockQuantity).toBeUndefined()
    expect(product.isActive).toBe(true)
    expect(product.metadata?.contentId).toBe(9511264)
  })

  it('marks archived or off-sale variants inactive', () => {
    const baseContent = { contentId: 1, title: 'X' } as any
    expect(mapTrendyolVariantToProduct(baseContent, { onSale: false } as any).isActive).toBe(false)
    expect(mapTrendyolVariantToProduct(baseContent, { onSale: true, archived: true } as any).isActive).toBe(false)
  })
})
