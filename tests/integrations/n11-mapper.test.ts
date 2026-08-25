import { describe, expect, it } from 'vitest'
import { N11Adapter } from '../../src/services/integrations/marketplaces/n11/N11Adapter.js'
import {
  extractN11Brand,
  extractN11Images,
  mapN11Currency,
  mapN11LineToNormalizedItem,
  mapN11PackageToNormalizedOrder,
  mapN11ProductToNormalizedProduct,
  mapN11Status,
  minimizeN11CustomerName
} from '../../src/services/integrations/marketplaces/n11/N11Mapper.js'
import { N11ClientError } from '../../src/services/integrations/marketplaces/n11/N11Errors.js'
import { buildN11Package, buildN11ProductRow } from './fixtures/n11-fixtures.js'

/*
 * N11 MAPPER + ADAPTER unit testleri.
 * Kaynak: developer.n11.com resmi dokuman (agustos 2026).
 * Kurallar: tahmin yok, uydurma finansal veri yok, PII minimize,
 * sahte gorsel yok.
 */

describe('mapN11Status — resmi statü tablosu', () => {
  it('maps official package statuses', () => {
    expect(mapN11Status('Created')).toBe('CREATED')
    expect(mapN11Status('Picking')).toBe('PROCESSING')
    expect(mapN11Status('Shipped')).toBe('SHIPPED')
    expect(mapN11Status('Delivered')).toBe('DELIVERED')
    expect(mapN11Status('Cancelled')).toBe('CANCELLED')
    // Resmi tablo: 8 "Reddedilmiş" -> UnSupplied (Trendyol ile ayni semantik)
    expect(mapN11Status('UnSupplied')).toBe('CANCELLED')
    // Paket bolme ana kaydi (resmi dokuman) -> CREATED
    expect(mapN11Status('Unpacked')).toBe('CREATED')
  })

  it('never guesses unknown statuses', () => {
    expect(mapN11Status('SomeNewStatus')).toBe('UNKNOWN')
    expect(mapN11Status('')).toBe('UNKNOWN')
    expect(mapN11Status(null)).toBe('UNKNOWN')
  })
})

describe('minimizeN11CustomerName — PII minimize', () => {
  it('keeps first name + last initial only', () => {
    expect(minimizeN11CustomerName('Ayşe Yılmaz')).toBe('Ayşe Y.')
    expect(minimizeN11CustomerName('Tek İsim')).toBe('Tek İ.')
  })

  it('returns null for empty input', () => {
    expect(minimizeN11CustomerName('')).toBeNull()
    expect(minimizeN11CustomerName(null)).toBeNull()
  })
})

describe('mapN11PackageToNormalizedOrder', () => {
  it('maps the official package row with documented fields', () => {
    const row = buildN11Package(1, 'Picking')
    const order = mapN11PackageToNormalizedOrder(row)
    expect(order).not.toBeNull()
    expect(order!.externalId).toBe('900000000001')
    expect(order!.externalOrderNumber).toBe('N11O-000001')
    expect(order!.status).toBe('PROCESSING')
    expect(order!.customerDisplayName).toBe('Mehmet D.')
    expect(order!.currency).toBe('TRY')
    expect(order!.discountAmount).toBeCloseTo(7.5)
    // Siparis tarihi: packageHistories status=Created kaydindan
    expect(order!.orderDate.getTime()).toBeLessThan(Date.now())
    // Kalem: resmi lines alanlarindan
    expect(order!.items).toHaveLength(1)
    const item = order!.items[0]
    expect(item.sku).toBe('N11SKU-002')
    expect(item.quantity).toBeGreaterThanOrEqual(1)
    expect(item.grossAmount).toBeCloseTo(Number(row.lines![0].sellerInvoiceAmount))
    expect(item.externalId).toBe(String(row.lines![0].orderLineId))
  })

  it('discards customer PII completely (email/TC/address never stored)', () => {
    const order = mapN11PackageToNormalizedOrder(buildN11Package(2, 'Delivered'))!
    const serialized = JSON.stringify(order)
    expect(serialized).not.toContain('musteri2@ornek.com')
    expect(serialized).not.toContain('11111111111')
    expect(serialized).not.toContain('Test Mah.')
    expect(serialized).not.toContain('5xxxxxxxxx')
    expect(serialized).not.toContain('customerEmail')
    expect(serialized).not.toContain('tcIdentityNumber')
  })

  it('leaves commission/shipping/refund amounts null (provider does not send them)', () => {
    const order = mapN11PackageToNormalizedOrder(buildN11Package(3, 'Created'))!
    expect(order.commissionAmount).toBeNull()
    expect(order.shippingAmount).toBeNull()
    expect(order.refundAmount).toBeNull()
    expect(order.taxAmount).toBeNull()
    expect(order.netContribution).toBeNull()
    // Komisyon ORANI metadata'da tasinir (resmi commissionRate).
    expect(order.items[0].metadata?.commissionRate).toBe(8)
  })

  it('builds deterministic identity from orderNumber+lineId when package id is null', () => {
    const row = buildN11Package(4, 'Delivered')
    row.id = null // resmi dokuman: Konuma Özel Teslimat'ta id null döner
    const order = mapN11PackageToNormalizedOrder(row)
    expect(order!.externalId).toBe(`${row.orderNumber}-${row.lines![0].orderLineId}`)
  })

  it('returns null (skip) when no identity and no lines exist', () => {
    expect(mapN11PackageToNormalizedOrder({} as any)).toBeNull()
    const empty = buildN11Package(5, 'Created')
    empty.id = null
    empty.lines = []
    expect(mapN11PackageToNormalizedOrder(empty)).toBeNull()
  })
})

describe('mapN11LineToNormalizedItem', () => {
  it('uses sellerInvoiceAmount as documented line gross', () => {
    const item = mapN11LineToNormalizedItem({
      quantity: 2,
      price: 100,
      sellerInvoiceAmount: 195,
      sellerDiscount: 5,
      stockCode: 'SC-1',
      productName: 'Ürün',
      orderLineId: 123
    })
    expect(item!.grossAmount).toBe(195)
    expect(item!.unitPrice).toBe(100)
    expect(item!.discountAmount).toBe(5)
  })

  it('returns null for non-object input', () => {
    expect(mapN11LineToNormalizedItem(null)).toBeNull()
  })
})

describe('mapN11ProductToNormalizedProduct', () => {
  it('maps official product-query fields', () => {
    const row = buildN11ProductRow(7)
    const product = mapN11ProductToNormalizedProduct(row)
    expect(product.externalId).toBe(String(row.n11ProductId))
    expect(product.sku).toBe(row.stockCode)
    expect(product.title).toBe(row.title)
    expect(product.brand).toBe('Marka-1')
    expect(product.salePrice).toBeCloseTo(Number(row.salePrice))
    expect(product.listPrice).toBeCloseTo(Number(row.listPrice))
    expect(product.stockQuantity).toBe(row.quantity)
    expect(product.currency).toBe('TRY') // resmi currencyType "TL"
    expect(product.isActive).toBe(true)
    expect(product.providerUpdatedAt).toBeNull() // resmi alanda guncelleme tarihi yok
    // Kategori ADI resmi alanda yok -> null; id metadata'da
    expect(product.category).toBeNull()
    expect(product.metadata?.categoryId).toBe(String(row.categoryId))
  })

  it('marks suspended products inactive', () => {
    const product = mapN11ProductToNormalizedProduct(buildN11ProductRow(11))
    expect(product.isActive).toBe(false)
  })

  it('keeps barcode only when provider sends it', () => {
    const withBarcode = mapN11ProductToNormalizedProduct(buildN11ProductRow(3))
    expect(withBarcode.barcode).toBe('8690000000003')
    const withoutBarcode = mapN11ProductToNormalizedProduct(buildN11ProductRow(1))
    expect(withoutBarcode.barcode).toBeNull()
  })
})

describe('image mapping — aynı sanitizer, sahte gorsel yok', () => {
  it('uses the first valid https image and carries up to 3 in metadata', () => {
    const row = buildN11ProductRow(1) // 2 gorsel
    const product = mapN11ProductToNormalizedProduct(row)
    expect(product.imageUrl).toMatch(/^https:\/\//)
    expect((product.metadata?.images as string[]).length).toBe(2)
    expect((product.metadata?.images as string[])[0]).toBe(product.imageUrl)
  })

  it('keeps imageUrl null when provider sends no image (never fabricated)', () => {
    const product = mapN11ProductToNormalizedProduct(buildN11ProductRow(4)) // 0 gorsel
    expect(product.imageUrl).toBeNull()
    expect(product.metadata?.images).toBeUndefined()
  })

  it('rejects non-https urls via the shared sanitizer', () => {
    const row = buildN11ProductRow(6)
    row.imageUrls = ['javascript:alert(1)', 'http://insecure.example/a.jpg']
    expect(extractN11Images(row)).toEqual([])
  })

  it('extracts brand from the official attributes list', () => {
    expect(extractN11Brand({ attributes: [{ attributeName: 'Marka', attributeValue: 'Anka' }] })).toBe('Anka')
    expect(extractN11Brand({ attributes: [] })).toBeNull()
    expect(extractN11Brand({})).toBeNull()
  })

  it('maps currencyType TL -> TRY', () => {
    expect(mapN11Currency('TL')).toBe('TRY')
    expect(mapN11Currency('TRY')).toBe('TRY')
    expect(mapN11Currency(undefined)).toBe('TRY')
  })
})

describe('N11Adapter — credential validation & safe errors', () => {
  it('requires appKey, appSecret and store name before any network call', async () => {
    const adapter = new N11Adapter()
    const missingAll = await adapter.validateCredentials({})
    expect(missingAll.valid).toBe(false)
    expect(missingAll.errorCode).toBe('CREDENTIALS_MISSING')

    const missingStore = await adapter.validateCredentials({ apiKey: 'k'.repeat(10), apiSecret: 's'.repeat(10) })
    expect(missingStore.valid).toBe(false)
    expect(missingStore.errorCode).toBe('STORE_NAME_MISSING')
  })

  it('maps client errors to safe sync errors without credential material', () => {
    const adapter = new N11Adapter()
    const safe = adapter.toSyncError(new N11ClientError('AUTH', 'N11 error (401)'))
    expect(safe.errorCode).toBe('N11_AUTH')
    expect(safe.message).toBe('N11 error (401)')

    const generic = adapter.toSyncError(new Error('unexpected'))
    expect(generic.errorCode).toBe('PROVIDER_UNKNOWN_ERROR')
  })

  it('declares documented capabilities (commission rate only, no analytics/settlement/shipping)', () => {
    const adapter = new N11Adapter()
    expect(adapter.capabilities.supportsCommissionData).toBe(true)
    expect(adapter.capabilities.supportsSettlementData).toBe(false)
    expect(adapter.capabilities.supportsShippingCost).toBe(false)
    expect(adapter.capabilities.supportsProductViews).toBe(false)
    expect(adapter.capabilities.supportsFavorites).toBe(false)
    expect(adapter.capabilities.supportsProductAnalytics).toBe(false)
  })

  it('splits sync windows to the documented 15-day provider limit', async () => {
    const { buildDateWindows } = await import('../../src/services/integrations/marketplaces/n11/N11Adapter.js')
    const to = new Date('2026-08-25T00:00:00Z')
    const from = new Date('2026-07-26T00:00:00Z') // 30 gun
    const windows = buildDateWindows(from, to)
    expect(windows.length).toBeGreaterThanOrEqual(2)
    for (const window of windows) {
      expect(window.to.getTime() - window.from.getTime()).toBeLessThanOrEqual(15 * 24 * 3600 * 1000)
    }
    // Pencereler araligi bosluksuz kapatir.
    expect(windows[0].from.getTime()).toBe(from.getTime())
    expect(windows[windows.length - 1].to.getTime()).toBe(to.getTime())
  })
})
