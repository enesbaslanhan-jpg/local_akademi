import type { CredentialValidationResult, MarketplaceProviderAdapter, OrdersPage, ProductsPage, ProviderCapabilities } from '../../types.js'
import { defaultCapabilities } from '../../types.js'
import { HepsiburadaClient } from './HepsiburadaClient.js'
import { HepsiburadaClientError } from './HepsiburadaErrors.js'
import { mapHepsiburadaListingToProduct, mapHepsiburadaPackageToNormalizedOrder, type HepsiburadaProductRaw } from './HepsiburadaMapper.js'
import type {
  HepsiburadaCatalogProductRow,
  HepsiburadaEnvironment,
  HepsiburadaListEnvelope,
  HepsiburadaListingRow,
  HepsiburadaListingsPage,
  HepsiburadaOrderRow,
  HepsiburadaPackageRow
} from './HepsiburadaTypes.js'

/*
 * HEPSIBURADA ADAPTER — provider-bagimsiz sozlesmenin uygulanmasi.
 *
 * RESMI DOKUMAN DOGRULAMASI (developers.hepsiburada.com, agustos 2026):
 * - Seller API'de urun goruntuleme/favori/urun analytics YOKTUR
 *   (Trendyol'da oldugu gibi) -> analytics capability'leri false.
 * - Komisyon ORANI /listings/commissions ucunden okunabilir (ayri
 *   endpoint); siparis payload'i komisyon/kargo/iade tutari TASMIAZ ->
 *   supportsCommissionData=true ama sync'e karistirilmaz; settlement
 *   (muhasebe-entegrasyonu) ayri fazdir.
 * - Siparis lifecycle paketler uzerinden status-bucketed listelerle
 *   okunur; adapter bu birlesimi PROVIDER ICINDE yapar, core bilmaz.
 *
 * MVP kapsam: orders + products (READ-ONLY). Provider'a WRITE yok.
 */

const ORDERS_PAGE_SIZE = 100
const LISTINGS_PAGE_SIZE = 200 // resmi ust sinir 1000; guvenli sayfa boyu
const CATALOG_PAGE_SIZE = 100

export interface ResolvedHepsiburadaCredentials {
  externalAccountId: string
  apiKey?: string | null
  apiSecret?: string | null
}

/** Adapter'in normalizeProduct'a verdigi birlesik raw kayit. */
export type HbsProductRaw = HepsiburadaProductRaw

export class HepsiburadaAdapter implements MarketplaceProviderAdapter<HepsiburadaPackageRow & Record<string, unknown>, HbsProductRaw> {
  readonly provider = 'HEPSIBURADA' as const

  /**
   * Resmi dokuman dogrulamasi: analytics metrikleri provider'da YOK;
   * komisyon orani mevcut fakat ayri endpoint'te (sync ile
   * karistirilmaz); settlement/muhasebe ayri faz.
   */
  readonly capabilities: ProviderCapabilities = defaultCapabilities({
    supportsCommissionData: true
  })

  private createClient(credentials: ResolvedHepsiburadaCredentials, env?: HepsiburadaEnvironment) {
    return new HepsiburadaClient({
      merchantId: credentials.externalAccountId,
      username: credentials.apiKey || '',
      password: credentials.apiSecret || '',
      env
    })
  }

  async validateCredentials(credentials: ResolvedHepsiburadaCredentials): Promise<CredentialValidationResult> {
    if (!credentials?.externalAccountId || !credentials?.apiKey || !credentials?.apiSecret) {
      return {
        valid: false,
        message: 'Merchant ID, API kullanıcı adı ve şifre zorunludur.',
        errorCode: 'CREDENTIALS_MISSING'
      }
    }
    try {
      const client = this.createClient(credentials)
      // Ucuz gercek cagri: listing listesi (size=1). 200 -> gecerli;
      // bos liste de GECERLIDIR (satisi olmayan magaza).
      await client.request<HepsiburadaListingsPage>('listing', 'GET',
        `/listings/merchantid/${encodeURIComponent(credentials.externalAccountId)}`,
        { offset: 0, limit: 1 })
      return { valid: true }
    } catch (error) {
      return this.validationError(error)
    }
  }

  private validationError(error: unknown): CredentialValidationResult {
    if (error instanceof HepsiburadaClientError) {
      switch (error.kind) {
        case 'AUTH':
          return {
            valid: false,
            message: 'Hepsiburada bu bilgilerle bağlantıyı reddetti. Merchant ID, API kullanıcı adı ve şifreyi kontrol edin.',
            errorCode: 'INVALID_CREDENTIALS'
          }
        case 'FORBIDDEN':
          return {
            valid: false,
            message: 'Hepsiburada bu hesap için erişime izin vermedi. Entegrasyon yetkisini Satıcı Panelinden kontrol edin.',
            errorCode: 'PROVIDER_FORBIDDEN'
          }
        case 'RATE_LIMITED':
          return {
            valid: false,
            message: 'Hepsiburada istek sınırına ulaştı. Kısa süre sonra tekrar deneyin.',
            errorCode: 'PROVIDER_RATE_LIMITED'
          }
        case 'TIMEOUT':
        case 'NETWORK':
          return {
            valid: false,
            message: 'Hepsiburada servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
            errorCode: 'PROVIDER_UNREACHABLE'
          }
        case 'NOT_FOUND':
          return {
            valid: false,
            message: 'Merchant ID bulunamadı. Değeri Satıcı Panelinden doğrulayın.',
            errorCode: 'MERCHANT_NOT_FOUND'
          }
      }
    }
    return {
      valid: false,
      message: 'Bağlantı doğrulanamadı. Lütfen tekrar deneyin.',
      errorCode: 'VALIDATION_FAILED'
    }
  }

  /**
   * Siparis/paket akisi. Lifecycle status-bucketed ucundan BIRLESTIRILIR:
   * - /packages/merchantId/{id}                -> tum paketler (raw dizi)
   * - /orders/merchantId/{id}/cancelled        -> iptal siparisler
   * Iptal satirlarinin kalemleri provider listesinde yer almazsa skip
   * edilir — uydurulmus kalem uretilmez.
   */
  async fetchOrders(params: {
    credentials: ResolvedHepsiburadaCredentials
    fromDate: Date
    toDate: Date
    page?: number
    pageSize?: number
  }): Promise<OrdersPage<HepsiburadaPackageRow & Record<string, unknown>>> {
    const client = this.createClient(params.credentials)
    const page = params.page ?? 0
    const size = Math.min(params.pageSize ?? ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE)
    const offset = page * size

    const dateQuery = {
      beginDate: toIsoDay(params.fromDate),
      endDate: toIsoDay(new Date(params.toDate.getTime() + 24 * 60 * 60 * 1000))
    }

    let rows: Array<HepsiburadaPackageRow & Record<string, unknown>> = []
    let totalElements = offset

    const packages = await client.request<unknown>('oms', 'GET',
      `/packages/merchantId/${encodeURIComponent(params.credentials.externalAccountId)}`,
      { offset, limit: size, ...dateQuery })
    const packageRows = unwrapRows(packages)
    rows = rows.concat(packageRows as Array<HepsiburadaPackageRow & Record<string, unknown>>)

    const cancelled = await client.request<HepsiburadaListEnvelope<HepsiburadaOrderRow>>('oms', 'GET',
      `/orders/merchantId/${encodeURIComponent(params.credentials.externalAccountId)}/cancelled`,
      { offset, limit: size, ...dateQuery })
    const cancelledItems = cancelled.items ?? []
    rows = rows.concat(cancelledItems.map(row => ({ ...row }) as HepsiburadaPackageRow & Record<string, unknown>))

    totalElements += packageRows.length + cancelledItems.length

    return {
      orders: rows,
      page,
      totalPages: page + 1,
      totalElements,
      // Sayfalama adapter icinde: iki kaynak da ayni offset/limit ile
      // taranir; daha fazla sayfa olmadigi surece tek tur yeterli.
      hasNextPage: false
    }
  }

  normalizeOrder(raw: HepsiburadaPackageRow & Record<string, unknown>) {
    const normalized = mapHepsiburadaPackageToNormalizedOrder(raw)
    // Kalemsiz satir core'a gecmez (uydurma kalem yasagi).
    if (!normalized) {
      throw new Error('HEPSIBURADA order row has no usable line items')
    }
    return normalized
  }

  /**
   * Urun akisi: listing (fiyat/stok/satis) + catalog (baslik/marka/
   * kategori/gorsel) merchantSku uzerinden adapter icinde birlestirilir.
   */
  async fetchProducts(params: {
    credentials: ResolvedHepsiburadaCredentials
    page?: number
    pageSize?: number
  }): Promise<ProductsPage<HbsProductRaw>> {
    const client = this.createClient(params.credentials)
    const page = params.page ?? 0
    const size = Math.min(params.pageSize ?? LISTINGS_PAGE_SIZE, LISTINGS_PAGE_SIZE)
    const offset = page * size

    const listingsPage = await client.request<HepsiburadaListingsPage>('listing', 'GET',
      `/listings/merchantid/${encodeURIComponent(params.credentials.externalAccountId)}`,
      { offset, limit: size })
    const listings = listingsPage.listings ?? []
    const totalCount = Number.isFinite(listingsPage.totalCount) ? Number(listingsPage.totalCount) : undefined
    const nextPageCursor = offset + listings.length < (totalCount ?? 0) ? String(page + 1) : null

    // Catalog bilgisi yalnizca listing varsa anlamli; basarisizliga sync
    // dusmez — gorsel/baslik/marka eksik kalir (null), stok/fiyat gelir.
    let catalogBySku = new Map<string, HepsiburadaCatalogProductRow>()
    try {
      const catalogPage = await client.request<unknown>('mpop', 'GET',
        `/product/api/products/all-products-of-merchant/${encodeURIComponent(params.credentials.externalAccountId)}`,
        { page: 0, size: CATALOG_PAGE_SIZE })
      for (const row of unwrapRows(catalogPage)) {
        const sku = String((row as HepsiburadaCatalogProductRow).merchantSku ?? '').trim()
        if (sku) catalogBySku.set(sku, row as HepsiburadaCatalogProductRow)
      }
    } catch {
      catalogBySku = new Map()
    }

    const products: HbsProductRaw[] = listings.map(listing => ({
      listing,
      catalog: (listing.merchantSku && catalogBySku.get(listing.merchantSku)) || null
    }))

    return {
      products,
      page,
      totalElements: totalCount,
      hasNextPage: nextPageCursor !== null,
      nextPageCursor
    }
  }

  normalizeProduct(raw: HbsProductRaw) {
    return mapHepsiburadaListingToProduct(raw)
  }

  async healthCheck(credentials: ResolvedHepsiburadaCredentials): Promise<CredentialValidationResult> {
    return this.validateCredentials(credentials)
  }

  /** Raw hatayi guvenli sync hatasina cevirir (credential tasimaz). */
  toSyncError(error: unknown): Error & { errorCode?: string } {
    if (error instanceof HepsiburadaClientError) {
      const err = new Error(error.safeMessage) as Error & { errorCode?: string }
      err.errorCode = `HEPSIBURADA_${error.kind}`
      return err
    }
    const generic = new Error('Provider request failed') as Error & { errorCode?: string }
    generic.errorCode = 'PROVIDER_UNKNOWN_ERROR'
    return generic
  }
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Spring page ({data|content|items}) / raw dizi tolere eden acici. */
function unwrapRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of ['data', 'content', 'items']) {
      const value = (data as Record<string, unknown>)[key]
      if (Array.isArray(value)) return value
    }
  }
  return []
}
