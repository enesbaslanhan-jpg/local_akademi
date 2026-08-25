import type { N11ProductRow, N11ShipmentPackage } from '../../../src/services/integrations/marketplaces/n11/N11Types.js'

/*
 * MOCK N11 DATASET (dev/test).
 *
 * Raw payload shape'i resmi dokumana (developer.n11.com, agustos 2026)
 * sadiktir:
 * - Siparisler: GET /rest/delivery/v1/shipmentPackages cevabi
 *   (content[] + shipmentPackageStatus + lines[] + epoch ms tarihler).
 * - Urunler: GET /ms/product-query cevabi (Spring pageable zarfi,
 *   n11ProductId/stockCode/salePrice/listPrice/quantity/imageUrls).
 *
 * Akis HER ZAMAN: raw payload -> N11Mapper -> ortak DB pipeline.
 * Normalize edilmis sahte nesne URETILMEZ. Production kodu bu modulu
 * import ETMEZ.
 */

export const N11_STORE_NAME = 'QA N11 Magaza'

/** Durum dagilimi: 40 siparis paketi. */
export const N11_STATUS_PLAN: Array<{ count: number; status: string }> = [
  { count: 6, status: 'Created' },
  { count: 7, status: 'Picking' },
  { count: 6, status: 'Shipped' },
  { count: 13, status: 'Delivered' },
  { count: 5, status: 'Cancelled' },
  { count: 3, status: 'UnSupplied' }
]

const CUSTOMER_NAMES = [
  'Ayşe Yılmaz', 'Mehmet Demir', 'Zeynep Kaya', 'Ali Çelik', 'Elif Şahin',
  'Burak Aydın', 'Selin Koç', 'Can Polat'
]

/**
 * Resmi shipmentPackages satiri. PII alanlari (customerEmail,
 * tcIdentityNumber, adresler) GERCEK payload'daki gibi DOLU gelir —
 * mapper'in bunlari DISARIDA biraktigini dogrulamak icin.
 */
export function buildN11Package(index: number, status: string, now = Date.now()): N11ShipmentPackage & Record<string, unknown> {
  const customer = CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]
  const quantity = 1 + (index % 3)
  const unitPrice = 39.9 + (index % 10) * 5
  return {
    id: 900_000_000_000 + index,
    orderNumber: `N11O-${String(index).padStart(6, '0')}`,
    shipmentPackageStatus: status,
    // --- PII: payload'da VAR, LocalKarar'da YOK olmali ---
    customerEmail: `musteri${index}@ornek.com`,
    customerfullName: customer,
    customerId: 500_000 + index,
    taxId: null,
    taxOffice: 'Kadıköy',
    tcIdentityNumber: '11111111111',
    billingAddress: { address: 'Test Mah. 1. Sk No:2 İstanbul', gsm: '5xxxxxxxxx', fullName: customer },
    shippingAddress: { address: 'Test Mah. 1. Sk No:2 İstanbul', gsm: '5xxxxxxxxx', fullName: customer },
    // ---
    cargoSenderNumber: null,
    cargoTrackingNumber: `CT${700000 + index}`,
    cargoTrackingLink: '',
    shipmentCompanyId: 342,
    cargoProviderName: index % 2 === 0 ? 'MNG Kargo' : 'Aras Kargo',
    shipmentMethod: 1,
    installmentChargeWithVATprice: 0,
    lines: [{
      quantity,
      productId: 100_000 + (index % 20),
      productName: `N11 Test Ürünü ${1 + (index % 20)}`,
      stockCode: `N11SKU-${String(1 + (index % 20)).padStart(3, '0')}`,
      variantAttributes: [],
      customTextOptionValues: [],
      price: unitPrice,
      dueAmount: unitPrice * quantity,
      installmentChargeWithVAT: 0,
      sellerCouponDiscount: 0,
      sellerCampaignCommissionDiscount: 0,
      sellerDiscount: 2.5,
      mallDiscount: 5,
      sellerInvoiceAmount: unitPrice * quantity - 2.5,
      totalSellerDiscountPrice: 2.5,
      totalMallDiscountPrice: 5,
      orderLineId: 400_000_000 + index,
      orderItemLineItemStatusName: status,
      vatRate: 10,
      commissionRate: 8,
      sellerCampaignCommissionRate: 0,
      taxDeductionRate: 1,
      totalLaborCostExcludingVAT: 0,
      netMarketingFeeRate: 1.2,
      netMarketplaceFeeRate: 0.8,
      barcode: index % 3 === 0 ? `8690000000${String(index).padStart(3, '0')}` : null,
      deliveryFeeType: 3,
      sellerDiscountedPrice: unitPrice - 2.5,
      sender: 'SELLER',
      productOrigin: null
    }],
    lastModifiedDate: now - index * 1_800_000,
    agreedDeliveryDate: now + index * 3_600_000,
    totalAmount: unitPrice * quantity - 7.5,
    totalDiscountAmount: 7.5,
    packageHistories: [
      { createdDate: now - index * 1_800_000 - 3_600_000, status: 'Created' },
      { createdDate: now - index * 1_800_000, status }
    ],
    shipmentPackageStatusHistoryVersion: 2,
    micro: null,
    sellerId: 9_876_543
  }
}

/** 40 paket — durum planina gore. */
export function buildN11Packages(now = Date.now()): Array<N11ShipmentPackage & Record<string, unknown>> {
  const rows: Array<N11ShipmentPackage & Record<string, unknown>> = []
  let index = 1
  for (const bucket of N11_STATUS_PLAN) {
    for (let n = 0; n < bucket.count; n += 1) {
      rows.push(buildN11Package(index, bucket.status, now))
      index += 1
    }
  }
  return rows
}

/** Cross-provider duplicate senaryosu: ayni SKU/barcode, farkli provider. */
export function buildN11SharedSkuPackage(status = 'Delivered', now = Date.now()): N11ShipmentPackage & Record<string, unknown> {
  const row = buildN11Package(999, status, now)
  row.id = 900_999_999_999
  row.orderNumber = 'N11O-999999'
  row.lines = [{
    quantity: 1,
    productId: 100_999,
    productName: 'Üç Pazaryerinde Aynı Ürün',
    stockCode: 'SKU-SHARED',
    price: 99.9,
    sellerInvoiceAmount: 97.4,
    sellerDiscount: 2.5,
    totalSellerDiscountPrice: 2.5,
    orderLineId: 499_999_999,
    orderItemLineItemStatusName: status,
    vatRate: 10,
    commissionRate: 8,
    barcode: 'SKU-SHARED',
    deliveryFeeType: 3,
    sender: 'SELLER'
  }]
  row.totalAmount = 97.4
  row.totalDiscountAmount = 2.5
  return row
}

/** Resmi ms/product-query satiri. */
export function buildN11ProductRow(index: number): N11ProductRow {
  const imageCount = index % 4 === 0 ? 0 : 1 + (index % 3)
  return {
    n11ProductId: 200_000 + index,
    sellerId: 9_876_543,
    sellerNickname: N11_STORE_NAME,
    stockCode: `N11SKU-${String(index).padStart(3, '0')}`,
    title: `N11 Entegrasyon Test Ürünü ${index}`,
    description: 'Test açıklaması',
    categoryId: 1_002_000 + (index % 5),
    productMainId: `MODEL-${index % 7}`,
    status: index % 11 === 0 ? 'Suspended' : 'Active',
    saleStatus: index % 5 === 0 ? 'Out_Of_Stock' : 'On_Sale',
    preparingDay: 3,
    shipmentTemplate: '1',
    maxPurchaseQuantity: 5,
    customTextOptions: [],
    catalogId: index % 2 === 0 ? 9_000_000 + index : null,
    barcode: index % 3 === 0 ? `8690000000${String(index).padStart(3, '0')}` : null,
    groupId: 12_345_678,
    currencyType: 'TL',
    salePrice: 49.9 + index,
    listPrice: 69.9 + index,
    quantity: index % 13 === 0 ? 0 : 3 + (index % 15),
    attributes: [
      { attributeId: 1, attributeName: 'Marka', attributeValue: `Marka-${index % 6}` },
      { attributeId: 429, attributeName: 'Renk', attributeValue: index % 2 === 0 ? 'Gri' : 'Lacivert' }
    ],
    imageUrls: imageCount === 0 ? [] : Array.from({ length: imageCount }, (_, k) => `https://cdn.n11test.example/org/IMG-${index}-${k}.jpg`),
    vatRate: 10,
    commissionRate: 8,
    sender: 'SELLER'
  }
}

/** 20 urun. */
export function buildN11Products(count = 20): N11ProductRow[] {
  return Array.from({ length: count }, (_, i) => buildN11ProductRow(i + 1))
}

/** Spring pageable zarfi (resmi ms/product-query cevabi). */
export function n11ProductQueryEnvelope(rows: N11ProductRow[], page = 0, size = 250) {
  return {
    content: rows,
    pageable: { sort: null, pageNumber: page, pageSize: size, offset: page * size, paged: true, unpaged: false },
    last: true,
    totalElements: rows.length,
    totalPages: 1,
    first: page === 0,
    number: page,
    sort: null,
    numberOfElements: rows.length,
    size,
    empty: rows.length === 0
  }
}
