import type { HepsiburadaListingRow, HepsiburadaPackageRow } from '../../src/services/integrations/marketplaces/hepsiburada/HepsiburadaTypes.js'

/*
 * MOCK HEPSIBURADA DATASET (dev/test).
 *
 * Raw payload shape'i resmi dokuman (developers.hepsiburada.com) ve
 * SIT dogrulamali alan adlariyla olabildigince sadiktir. Akis HER ZAMAN:
 * raw payload -> HepsiburadaMapper -> ortak DB pipeline. Normalize
 * edilmis sahte nesne URETILMEZ. Production kodu bu modulu import ETMEZ.
 */

export const HB_MERCHANT_ID = 'b24f1a2c-1111-4a5b-9c6d-000000000001'

/** Durum dagilimi: 40 siparis/paket. */
export const HB_STATUS_PLAN: Array<{ count: number; status: string }> = [
  { count: 7, status: 'Unpacked' },      // CREATED (paketlenmemis)
  { count: 6, status: 'Picking' },       // PROCESSING
  { count: 8, status: 'Shipped' },       // SHIPPED
  { count: 12, status: 'Delivered' },    // DELIVERED
  { count: 4, status: 'Cancelled' },     // CANCELLED
  { count: 3, status: 'Returned' }       // RETURNED
]

const CUSTOMER_NAMES = [
  'Ayşe Yılmaz', 'Mehmet Demir', 'Zeynep Kaya', 'Ali Çelik', 'Elif Şahin',
  'Burak Aydın', 'Selin Koç', 'Can Polat'
]

function lineFor(index: number, skuSuffix: string) {
  return {
    id: 700_000 + index,
    sku: `HB-SKU-${skuSuffix}`,
    merchantSku: `MSKU-${skuSuffix}`,
    productName: `Hepsiburada Ürün ${skuSuffix}`,
    quantity: 1 + (index % 3),
    price: 49.9 + (index % 10),
    amount: (49.9 + (index % 10)) * (1 + (index % 3)),
    barcode: index % 2 === 0 ? `869000000${String(index).padStart(4, '0')}` : undefined,
    status: undefined
  }
}

/**
 * 40 paket/siparis satiri — durum planina gore uretilir. Her satir
 * resmi paket modelindeki anahtarlari tasir (packageNumber/orderNumber/
 * status/cargoCompany/trackingNumber/createdDate/items).
 */
export function buildHepsiburadaPackages(now = Date.now()): Array<HepsiburadaPackageRow & Record<string, unknown>> {
  const rows: Array<HepsiburadaPackageRow & Record<string, unknown>> = []
  let index = 1
  for (const bucket of HB_STATUS_PLAN) {
    for (let n = 0; n < bucket.count; n += 1) {
      const customer = CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]
      rows.push({
        packageNumber: `HBP-${String(index).padStart(4, '0')}`,
        orderNumber: `HBO-${String(index).padStart(5, '0')}`,
        status: bucket.status,
        cargoCompany: index % 2 === 0 ? 'Yurtiçi Kargo' : 'Aras Kargo',
        trackingNumber: `TR${800000 + index}`,
        createdDate: new Date(now - index * 3_600_000).toISOString(),
        modifiedDate: new Date(now - index * 1_800_000).toISOString(),
        customerName: customer,
        items: [lineFor(index, String(((index - 1) % 20) + 1).padStart(2, '0'))]
      })
      index += 1
    }
  }
  return rows
}

/** Cross-provider duplicate senaryosu icin ozel paket (shared SKU). */
export function buildSharedSkuPackage(status = 'Delivered'): HepsiburadaPackageRow & Record<string, unknown> {
  return {
    packageNumber: 'PKG-SHARED-1',
    orderNumber: 'ORD-SHARED-1',
    status,
    createdDate: new Date(Date.now() - 3_600_000).toISOString(),
    modifiedDate: new Date().toISOString(),
    customerName: 'Paylaşımlı Müşteri',
    items: [{
      id: 999_001,
      sku: 'SKU-SHARED',
      merchantSku: 'SKU-SHARED',
      productName: 'İki Pazaryerinde Aynı Ürün',
      quantity: 2,
      price: 75,
      amount: 150
    }]
  }
}

/** 20 urunluk listing sayfasi (fiyat/stok/satis durumu). */
export function buildHepsiburadaListings(count = 20): HepsiburadaListingRow[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    const stock = n === 5 ? 0 : n % 7 === 0 ? 3 : 25 + n // 1 stoksuz, birkac dusuk
    return {
      listingId: `LST-${1000 + n}`,
      uniqueIdentifier: `UNQ-${n}`,
      hepsiburadaSku: `HB${1000 + n}SK`,
      merchantSku: n <= 20 ? `MSKU-${String(n).padStart(2, '0')}` : `MSKU-${n}`,
      price: 19.9 + n * 5,
      availableStock: stock,
      dispatchTime: 1,
      isSalable: stock > 0 || n === 5,
      isSuspended: false,
      isLocked: false,
      isFrozen: false,
      productId: `PRD-${n}`,
      updatedAt: new Date(Date.now() - n * 60_000).toISOString()
    }
  })
}

/** Catalog kayitlari — baslik/marka/kategori/GORSEL (fields haritasi). */
export function buildHepsiburadaCatalogRows(count = 20): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      id: `CAT-${n}`,
      merchantSku: `MSKU-${String(n).padStart(2, '0')}`,
      status: 'Active',
      modifiedAt: new Date(Date.now() - n * 120_000).toISOString(),
      fields: {
        productName: { value: `HB Katalog Ürünü ${n}` },
        categoryName: { value: n % 2 === 0 ? 'Ev & Yaşam' : 'Elektronik' },
        brand: { value: `Marka ${n % 5}` },
        images: { value: [`https://cdn.hepsiburada.net/img/${n}/main.jpg`] }
      }
    }
  })
}

/** Spring-style katalog zarfi. */
export function hepsiburadaCatalogEnvelope(rows: unknown[]) {
  return { data: rows, totalElements: rows.length, totalPages: 1, number: 0 }
}
