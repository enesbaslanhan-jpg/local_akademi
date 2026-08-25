import { describe, expect, it } from 'vitest'
import {
  extractHepsiburadaImages,
  mapHepsiburadaLineToNormalizedItem,
  mapHepsiburadaListingToProduct,
  mapHepsiburadaPackageToNormalizedOrder,
  mapHepsiburadaStatus,
  minimizeHepsiburadaCustomerName
} from '../../src/services/integrations/marketplaces/hepsiburada/HepsiburadaMapper.js'

/*
 * HEPSIBURADA MAPPER unit testleri — resmi payload alanlarindan
 * normalize modele ceviri; tahmin/uydurma yasagi burada test edilir.
 */

describe('mapHepsiburadaStatus', () => {
  it('maps known official statuses', () => {
    expect(mapHepsiburadaStatus('Unpacked')).toBe('CREATED')
    expect(mapHepsiburadaStatus('Created')).toBe('CREATED')
    expect(mapHepsiburadaStatus('Picking')).toBe('PROCESSING')
    expect(mapHepsiburadaStatus('Shipped')).toBe('SHIPPED')
    expect(mapHepsiburadaStatus('Shipping')).toBe('SHIPPED')
    expect(mapHepsiburadaStatus('Delivered')).toBe('DELIVERED')
    expect(mapHepsiburadaStatus('Cancelled')).toBe('CANCELLED')
    expect(mapHepsiburadaStatus('Returned')).toBe('RETURNED')
  })

  it('never guesses unknown statuses (UNKNOWN)', () => {
    expect(mapHepsiburadaStatus('BilinmeyenDurum')).toBe('UNKNOWN')
    expect(mapHepsiburadaStatus('Undelivered')).toBe('UNKNOWN')
    expect(mapHepsiburadaStatus(undefined)).toBe('UNKNOWN')
    expect(mapHepsiburadaStatus('')).toBe('UNKNOWN')
  })
})

describe('minimizeHepsiburadaCustomerName', () => {
  it('keeps first name + last initial only', () => {
    expect(minimizeHepsiburadaCustomerName({ customerName: 'Ayşe Yılmaz' })).toBe('Ayşe Y.')
    expect(minimizeHepsiburadaCustomerName({ customer: { firstName: 'Mehmet', lastName: 'Demir' } })).toBe('Mehmet D.')
    expect(minimizeHepsiburadaCustomerName({ recipientName: 'Zeynep Kaya' })).toBe('Zeynep K.')
  })

  it('returns null when no customer data exists', () => {
    expect(minimizeHepsiburadaCustomerName({})).toBeNull()
    expect(minimizeHepsiburadaCustomerName(null)).toBeNull()
  })
})

describe('mapHepsiburadaPackageToNormalizedOrder', () => {
  const basePackage = {
    packageNumber: 'HBP-0001',
    orderNumber: 'HBO-00001',
    status: 'Delivered',
    cargoCompany: 'Aras Kargo',
    trackingNumber: 'TR800001',
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
    customerName: 'Ayşe Yılmaz',
    items: [{
      id: 700001,
      sku: 'HB-SKU-01',
      merchantSku: 'MSKU-01',
      productName: 'HB Katalog Ürünü 01',
      quantity: 2,
      price: 49.9,
      amount: 99.8,
      barcode: '8690000000001'
    }]
  } as any

  it('normalizes package with line items and metadata', () => {
    const order = mapHepsiburadaPackageToNormalizedOrder(basePackage)
    expect(order).toBeTruthy()
    expect(order?.externalId).toBe('HBP-0001')
    expect(order?.externalOrderNumber).toBe('HBO-00001')
    expect(order?.status).toBe('DELIVERED')
    expect(order?.customerDisplayName).toBe('Ayşe Y.')
    // PII: yalnizca minimize ad; adres/telefon/e-posta hicbir alana yazilmaz.
    expect(JSON.stringify(order)).not.toContain('Yılmaz')
    expect(order?.items).toHaveLength(1)
    expect(order?.items[0].grossAmount).toBe(99.8)
    expect(order?.metadata?.cargoProviderName).toBe('Aras Kargo')
    // Finansal tutarlar provider'dan gelmedigi icin null.
    expect(order?.commissionAmount).toBeNull()
    expect(order?.shippingAmount).toBeNull()
    expect(order?.refundAmount).toBeNull()
  })

  it('returns null when the row carries NO usable line items (no fabrication)', () => {
    const empty = { ...basePackage, items: [], lines: [], orderLines: [] }
    expect(mapHepsiburadaPackageToNormalizedOrder(empty)).toBeNull()
  })

  it('reads lines from alternate keys defensively', () => {
    const alt = { ...basePackage, items: undefined, lines: [{ ...basePackage.items[0] }] }
    const order = mapHepsiburadaPackageToNormalizedOrder(alt)
    expect(order?.items).toHaveLength(1)
  })

  it('line mapper keeps commission/shipping/refund null and preserves lineStatus', () => {
    const item = mapHepsiburadaLineToNormalizedItem({
      id: 5, sku: 'S', merchantSku: 'MS', productName: 'P', quantity: 1, price: 10, amount: 10, status: 'Returned'
    })
    expect(item?.commissionAmount).toBeNull()
    expect(item?.shippingAllocation).toBeNull()
    expect(item?.refundAmount).toBeNull()
    expect(item?.metadata?.lineStatus).toBe('Returned')
  })

  it('requires an external id', () => {
    expect(mapHepsiburadaPackageToNormalizedOrder({ ...basePackage, packageNumber: '', orderNumber: '' })).toBeNull()
  })
})

describe('mapHepsiburadaListingToProduct', () => {
  const listing = {
    listingId: 'LST-1001',
    hepsiburadaSku: 'HB1001SK',
    merchantSku: 'MSKU-01',
    price: 149.9,
    availableStock: 7,
    isSalable: true,
    productId: 'PRD-1'
  }

  it('merges catalog content: title/brand/category/images', () => {
    const product = mapHepsiburadaListingToProduct({
      listing,
      catalog: {
        merchantSku: 'MSKU-01',
        modifiedAt: new Date().toISOString(),
        fields: {
          productName: { value: 'HB Katalog Ürünü 1' },
          brand: { value: 'Marka 1' },
          categoryName: { value: 'Ev & Yaşam' },
          images: { value: ['https://cdn.hepsiburada.net/img/1/main.jpg'] }
        }
      }
    })
    expect(product.externalId).toBe('MSKU-01')
    expect(product.title).toContain('HB Katalog Ürünü 1')
    expect(product.brand).toBe('Marka 1')
    expect(product.category).toBe('Ev & Yaşam')
    expect(product.imageUrl).toBe('https://cdn.hepsiburada.net/img/1/main.jpg')
    expect(product.stockQuantity).toBe(7)
    expect(product.salePrice).toBe(149.9)
    expect(product.isActive).toBe(true)
  })

  it('imageUrl stays null without provider images — never fabricated', () => {
    const product = mapHepsiburadaListingToProduct({ listing })
    expect(product.imageUrl).toBeNull()
  })

  it('rejects non-https images via shared sanitizer', () => {
    const images = extractHepsiburadaImages({
      fields: { images: { value: ['javascript:alert(1)', 'https://cdn.ok/x.jpg'] } }
    } as any)
    // extract ham URL'leri dondurur; sanitizer adapter/mapper katmaninda uygulanir.
    expect(images).toContain('javascript:alert(1)')
    const product = mapHepsiburadaListingToProduct({
      listing,
      catalog: { fields: { images: { value: ['javascript:alert(1)'] } } } as any
    })
    expect(product.imageUrl).toBeNull()
  })

  it('isActive false when suspended/locked/frozen even if salable', () => {
    const product = mapHepsiburadaListingToProduct({ listing: { ...listing, isSalable: true, isSuspended: true } })
    expect(product.isActive).toBe(false)
  })

  it('uniqueIdentifier is NOT copied to barcode (guessing ban); kept in metadata', () => {
    const product = mapHepsiburadaListingToProduct({ listing: { ...listing, uniqueIdentifier: 'UNQ-9' } })
    expect(product.barcode).toBeNull()
    expect((product.metadata as any).uniqueIdentifier).toBe('UNQ-9')
  })

  it('null stock stays null when provider omits availableStock', () => {
    const product = mapHepsiburadaListingToProduct({ listing: { ...listing, availableStock: undefined } })
    expect(product.stockQuantity).toBeNull()
  })
})
