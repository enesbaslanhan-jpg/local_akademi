import type { CredentialValidationResult, MarketplaceProviderAdapter, OrdersPage, ProductsPage, ProviderCapabilities } from '../../types.js'
import { defaultCapabilities } from '../../types.js'
import { TrendyolClient, TrendyolClientError } from './TrendyolClient.js'
import {
  mapTrendyolPackageToNormalizedOrder,
  mapTrendyolVariantToProduct
} from './TrendyolMapper.js'
import type { TrendyolApprovedContent, TrendyolApprovedVariant, TrendyolInventoryAndPriceResponse, TrendyolOrdersResponse, TrendyolProductsResponse, TrendyolShipmentPackage } from './TrendyolTypes.js'

/*
 * TRENDYOL ADAPTER — provider-bagimsiz sozlesmenin Trendyol uygulanmasi.
 *
 * validateCredentials: ucuz bir "whoami" servisi olmadigi icin kucuk
 * siparis sorgusu (size=1, son 90 gun) kullanir. 200 -> credential'lar
 * gecerli; 401/403 -> gecersiz. Bos liste de GECERLIDIR (satisi olmayan
 * magaza).
 */

const ORDERS_PAGE_SIZE = 200   // resmi maksimum
const PRODUCTS_PAGE_SIZE = 100 // resmi maksimum

/** Adapter'a gecen cozulmus credential sekli. */
interface ResolvedCredentials {
  externalAccountId: string
  apiKey?: string | null
  apiSecret?: string | null
}

export interface TrendyolInventorySnapshot {
  quantity?: number
  salePrice?: number
  listPrice?: number
}

export type TrendyolProductRaw = {
  content: TrendyolApprovedContent
  variant: TrendyolApprovedVariant
  /** inventory-and-price endpoint'inden eslenen gercek stok/fiyat (varsa). */
  stock?: TrendyolInventorySnapshot
}

export class TrendyolAdapter implements MarketplaceProviderAdapter<TrendyolShipmentPackage, TrendyolProductRaw> {
  readonly provider = 'TRENDYOL' as const

  /**
   * RESMI DOKUMAN DOGRULAMASI (developers.trendyol.com, agustos 2026):
   * Seller API'de urun goruntuleme (views/impressions), favori/begeni
   * veya urun analytics endpoint'i YOKTUR. Bu yuzden tum analytics
   * capability'leri false — UI bu metrikleri gostermaz, 0 yazmaz,
   * uydurmaz. LocalKarar kendi siparis verisinden aggregate uretir.
   */
  readonly capabilities: ProviderCapabilities = defaultCapabilities()

  private createClient(credentials: ResolvedCredentials) {
    return new TrendyolClient({
      supplierId: credentials.externalAccountId,
      apiKey: credentials.apiKey || '',
      apiSecret: credentials.apiSecret || ''
    })
  }

  async validateCredentials(credentials: ResolvedCredentials): Promise<CredentialValidationResult> {
    if (!credentials?.externalAccountId || !credentials?.apiKey || !credentials?.apiSecret) {
      return { valid: false, message: 'Merchant ID, API Key and API Secret are required', errorCode: 'CREDENTIALS_MISSING' }
    }
    try {
      const client = this.createClient(credentials)
      const now = Date.now()
      await client.getShipmentPackages({
        startDateMs: now - 90 * 24 * 60 * 60 * 1000,
        endDateMs: now,
        page: 0,
        size: 1
      })
      return { valid: true }
    } catch (error) {
      return this.validationError(error)
    }
  }

  private validationError(error: unknown): CredentialValidationResult {
    if (error instanceof TrendyolClientError) {
      if (error.kind === 'AUTH') {
        return {
          valid: false,
          message: 'Trendyol bu bilgilerle bağlantıyı reddetti. Merchant ID, API Key ve API Secret\'ı kontrol edin.',
          errorCode: 'INVALID_CREDENTIALS'
        }
      }
      if (error.kind === 'RATE_LIMITED') {
        return {
          valid: false,
          message: 'Trendyol istek sınırına ulaştı. Kısa süre sonra tekrar deneyin.',
          errorCode: 'PROVIDER_RATE_LIMITED'
        }
      }
      if (error.kind === 'TIMEOUT' || error.kind === 'NETWORK') {
        return {
          valid: false,
          message: 'Trendyol servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
          errorCode: 'PROVIDER_UNREACHABLE'
        }
      }
    }
    return {
      valid: false,
      message: 'Bağlantı doğrulanamadı. Lütfen tekrar deneyin.',
      errorCode: 'VALIDATION_FAILED'
    }
  }

  async fetchOrders(params: {
    credentials: ResolvedCredentials
    fromDate: Date
    toDate: Date
    page?: number
    pageSize?: number
  }): Promise<OrdersPage<TrendyolShipmentPackage>> {
    const client = this.createClient(params.credentials)
    const size = Math.min(params.pageSize ?? ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE)
    const page = params.page ?? 0

    let response: TrendyolOrdersResponse
    try {
      response = await client.getShipmentPackages({
        startDateMs: params.fromDate.getTime(),
        endDateMs: params.toDate.getTime(),
        page,
        size,
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'ASC'
      })
    } catch (error) {
      throw this.toSyncError(error)
    }

    const content = Array.isArray(response.content) ? response.content : []
    const totalPages = Number.isFinite(response.totalPages) ? Number(response.totalPages) : content.length > 0 ? page + 1 : page
    return {
      orders: content,
      page,
      totalPages,
      totalElements: Number.isFinite(response.totalElements) ? Number(response.totalElements) : content.length,
      hasNextPage: page + 1 < totalPages
    }
  }

  async fetchProducts(params: {
    credentials: ResolvedCredentials
    page?: number
    pageSize?: number
  }): Promise<ProductsPage<TrendyolProductRaw>> {
    const client = this.createClient(params.credentials)
    const size = Math.min(params.pageSize ?? PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE)
    const page = params.page ?? 0

    let response: TrendyolProductsResponse
    try {
      response = await client.getApprovedProducts({ page, size })
    } catch (error) {
      throw this.toSyncError(error)
    }

    /*
     * GERCEK STOK TAMAMLAMA.
     *
     * V2 approved-products cevabi stok ADEDI icermaz (yalnizca son
     * degisim tarihi). Resmi inventory-and-price endpoint'i variant
     * bazinda quantity verir; barkodla eslenip raw varianta eklenir.
     * Bu cagri basarisizsa stok null kalir — 0 uydurulmaz, sync
     * basarisiz sayilmaz (stok, siparis kadar kritik degil).
     */
    let stockByBarcode = new Map<string, { quantity?: number; salePrice?: number; listPrice?: number }>()
    try {
      const inventory = await client.getApprovedProductsInventoryAndPrice({ page, size })
      for (const content of inventory.content ?? []) {
        for (const variant of content.variants ?? []) {
          if (variant.barcode) {
            stockByBarcode.set(variant.barcode, {
              quantity: variant.quantity,
              salePrice: variant.salePrice,
              listPrice: variant.listPrice
            })
          }
        }
      }
    } catch {
      stockByBarcode = new Map() // stok bilgisi yok: null tasinir
    }

    const contents = Array.isArray(response.content) ? response.content : []
    // Adapter normalizeProduct'a TEK bir satilabilir kayit (variant)
    // verir; core katman boylece provider'in "content/variant" modelini
    // bilmek zorunda kalmaz.
    const products = contents.flatMap(content =>
      (content.variants ?? []).map(variant => ({
        content,
        variant,
        stock: variant.barcode ? stockByBarcode.get(variant.barcode) : undefined
      }))
    )
    const totalElements = Number.isFinite(response.totalElements) ? Number(response.totalElements) : undefined
    const nextPageToken = response.nextPageToken || null
    return {
      products,
      page,
      totalElements,
      hasNextPage: Boolean(nextPageToken),
      nextPageCursor: nextPageToken
    }
  }

  normalizeOrder(raw: TrendyolShipmentPackage) {
    return mapTrendyolPackageToNormalizedOrder(raw)
  }

  normalizeProduct(raw: TrendyolProductRaw) {
    const normalized = mapTrendyolVariantToProduct(raw.content, raw.variant)
    // Gercek stok: inventory-and-price endpoint'inden (varsa).
    if (raw.stock && Number.isFinite(raw.stock.quantity)) {
      normalized.stockQuantity = Math.max(0, Math.trunc(Number(raw.stock.quantity)))
      // inventory-and-price ayni zamanda guncel fiyatlari da tasir;
      // base cevapta fiyat yoksa tamamlanir.
      if ((normalized.salePrice === null || normalized.salePrice === undefined) && Number.isFinite(raw.stock.salePrice)) {
        normalized.salePrice = Number(raw.stock.salePrice)
      }
      if ((normalized.listPrice === null || normalized.listPrice === undefined) && Number.isFinite(raw.stock.listPrice)) {
        normalized.listPrice = Number(raw.stock.listPrice)
      }
    }
    return normalized
  }

  async healthCheck(credentials: ResolvedCredentials): Promise<CredentialValidationResult> {
    return this.validateCredentials(credentials)
  }

  /** Raw hatayi guvenli sync hatasina cevirir (credential tasimaz). */
  toSyncError(error: unknown): Error & { errorCode?: string } {
    if (error instanceof TrendyolClientError) {
      const err = new Error(error.safeMessage) as Error & { errorCode?: string }
      err.errorCode = `TRENDYOL_${error.kind}`
      return err
    }
    const generic = new Error('Provider request failed') as Error & { errorCode?: string }
    generic.errorCode = 'PROVIDER_UNKNOWN_ERROR'
    return generic
  }
}

export const trendyolAdapter = new TrendyolAdapter()
