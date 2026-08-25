import type {
  CredentialValidationResult,
  MarketplaceProviderAdapter,
  OrdersPage,
  ProductsPage,
  ProviderCapabilities
} from '../../types.js'
import { defaultCapabilities } from '../../types.js'
import { N11Client, redactN11Credentials } from './N11Client.js'
import { N11ClientError } from './N11Errors.js'
import {
  mapN11PackageToNormalizedOrder,
  mapN11ProductToNormalizedProduct
} from './N11Mapper.js'
import { N11_ORDER_STATUS_BUCKETS, type N11ProductQueryPage, type N11ProductRow, type N11ShipmentPackage, type N11ShipmentPackagesPage } from './N11Types.js'

/*
 * N11 ADAPTER — provider-bagimsiz sozlesmenin uygulanmasi.
 *
 * RESMI DOKUMAN DOGRULAMASI (developer.n11.com, agustos 2026):
 * - Kimlik: header appkey + appsecret; ayri seller/store id ZORUNLU
 *   degil (Satici Paneli so.n11.com > Hesabim > API Hesaplari).
 * - Siparisler: GET /rest/delivery/v1/shipmentPackages — status TEK
 *   deger alir; tarih araligi provider tarafindan 15 gune sinirlanir;
 *   size <= 100; dakikada 1000 istek; Kasim 2024 oncesi veri DONMEZ.
 * - Urunler: GET /ms/product-query — Spring pageable zarfi,
 *   page 0-based, size maks 250.
 * - Komisyon yalnizca ORAN (commissionRate); komisyon tutari, kargo
 *   maliyeti ve iade tutari siparis payload'inda YOK -> null.
 *   Settlement (SettlementService/SOAP) bu dokumanda REST kapsaminda
 *   degil -> supportsSettlementData=false (ayri faz).
 * - Analytics (views/favorites) N11 satici API'sinde YOK -> false.
 *
 * MVP kapsam: orders + products (READ-ONLY). Provider'a WRITE yok.
 */

const ORDERS_PAGE_SIZE = 100          // resmi ust sinir
const PRODUCTS_PAGE_SIZE = 250        // resmi ust sinir
/** Resmi 15 gun sinirina uygun pencere boyu. */
const WINDOW_MS = 15 * 24 * 60 * 60 * 1000
/** 30 gunluk initial sync + bindirme icin ust sinir. */
const MAX_WINDOWS = 3

/**
 * Cozumlenmis N11 credential paketi. Generic ProviderCredentials
 * kolonlarina eslenir (Hepsiburada deseniyle ayni):
 * - externalAccountId -> N11'deki magaza adi (LocalKarar baglanti kimligi)
 * - apiKey            -> N11 App Key
 * - apiSecret         -> N11 App Secret
 */
export interface ResolvedN11Credentials {
  externalAccountId?: string | null
  apiKey?: string | null
  apiSecret?: string | null
}

export type N11OrderRaw = N11ShipmentPackage & Record<string, unknown>
export type N11ProductRaw = N11ProductRow

export class N11Adapter implements MarketplaceProviderAdapter<N11OrderRaw, N11ProductRaw> {
  readonly provider = 'N11' as const

  /**
   * Komisyon ORANI belgeli (supportsCommissionData=true); tutar/settlement
   * ve kargo maliyeti siparis payload'inda yok -> false. Analytics yok.
   */
  readonly capabilities: ProviderCapabilities = defaultCapabilities({
    supportsCommissionData: true
  })

  private createClient(credentials: ResolvedN11Credentials) {
    return new N11Client({
      appKey: credentials.apiKey || '',
      appSecret: credentials.apiSecret || ''
    })
  }

  async validateCredentials(credentials: ResolvedN11Credentials): Promise<CredentialValidationResult> {
    if (!credentials?.apiKey || !credentials?.apiSecret) {
      return {
        valid: false,
        message: 'App Key ve App Secret zorunludur.',
        errorCode: 'CREDENTIALS_MISSING'
      }
    }
    const storeName = String(credentials?.externalAccountId || '').trim()
    if (!storeName) {
      return {
        valid: false,
        message: 'Mağaza adı zorunludur. N11 Satıcı Panelindeki mağaza adınızı yazın.',
        errorCode: 'STORE_NAME_MISSING'
      }
    }
    try {
      const client = this.createClient(credentials)
      // Ucuz gercek cagri: urun sorgusu (size=1). 200 -> gecerli;
      // bos magaza (content: []) da GECERLIDIR.
      await client.request<N11ProductQueryPage>('GET', '/ms/product-query', { page: 0, size: 1 })
      return { valid: true }
    } catch (error) {
      return this.validationError(error)
    }
  }

  private validationError(error: unknown): CredentialValidationResult {
    if (error instanceof N11ClientError) {
      switch (error.kind) {
        case 'AUTH':
          return {
            valid: false,
            message: 'N11 bu bilgilerle bağlantıyı reddetti. App Key ve App Secret’i kontrol edin.',
            errorCode: 'INVALID_CREDENTIALS'
          }
        case 'FORBIDDEN':
          return {
            valid: false,
            message: 'N11 bu hesap için API erişimine izin vermedi. API hesabınızın aktif olduğunu Satıcı Panelinden kontrol edin.',
            errorCode: 'PROVIDER_FORBIDDEN'
          }
        case 'RATE_LIMITED':
          return {
            valid: false,
            message: 'N11 istek sınırına ulaştı. Kısa süre sonra tekrar deneyin.',
            errorCode: 'PROVIDER_RATE_LIMITED'
          }
        case 'TIMEOUT':
        case 'NETWORK':
          return {
            valid: false,
            message: 'N11 servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
            errorCode: 'PROVIDER_UNREACHABLE'
          }
        case 'NOT_FOUND':
          return {
            valid: false,
            message: 'N11 servisi bulunamadı. Lütfen tekrar deneyin.',
            errorCode: 'PROVIDER_NOT_FOUND'
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
   * Siparis akisi. Provider sinirlari adapter ICINDE cozulur:
   * - status parametresi TEK deger aldigi icin resmi durum kovalari
   *   ayri isteklerle taranir (Unpacked bilinçli hariç: paket bölme
   *   ana kaydi mükerrer satir üretir; child paketler otoriterdir).
   * - Tarih araligi resmi 15 gun sinirina uygun pencerelere bolunur.
   * Sayfalama: core page -> her (pencere x kova) icin ayni sayfa
   * numarasi; herhangi bir kaynak daha fazla sayfa bildirirse devam.
   */
  async fetchOrders(params: {
    credentials: ResolvedN11Credentials
    fromDate: Date
    toDate: Date
    page?: number
    pageSize?: number
  }): Promise<OrdersPage<N11OrderRaw>> {
    const client = this.createClient(params.credentials)
    const page = params.page ?? 0
    const size = Math.min(params.pageSize ?? ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE)

    const windows = buildDateWindows(params.fromDate, params.toDate)
    const rows: N11OrderRaw[] = []
    let totalElements = 0
    let hasMorePage = false

    for (const window of windows) {
      for (const status of N11_ORDER_STATUS_BUCKETS) {
        const result = await client.request<N11ShipmentPackagesPage>('GET', '/rest/delivery/v1/shipmentPackages', {
          status,
          startDate: window.from.getTime(),
          endDate: window.to.getTime(),
          page,
          size,
          orderByField: true,
          orderByDirection: 'ASC'
        })
        const content = Array.isArray(result.content) ? result.content : []
        rows.push(...content.map(row => ({ ...row }) as N11OrderRaw))
        totalElements += content.length
        const totalPages = Number.isFinite(Number(result.totalPages)) ? Number(result.totalPages) : undefined
        if ((totalPages !== undefined && totalPages > page + 1) || content.length === size) {
          hasMorePage = true
        }
      }
    }

    return {
      orders: rows,
      page,
      totalPages: hasMorePage ? page + 2 : page + 1,
      totalElements,
      hasNextPage: hasMorePage
    }
  }

  normalizeOrder(raw: N11OrderRaw) {
    const normalized = mapN11PackageToNormalizedOrder(raw)
    // Kalemsiz/kimliksiz satir core'a gecmez (uydurma yasagi).
    if (!normalized) {
      throw new Error('N11 package row has no usable identity or line items')
    }
    return normalized
  }

  /** Urun akisi: ms/product-query, Spring pageable zarfi. */
  async fetchProducts(params: {
    credentials: ResolvedN11Credentials
    page?: number
    pageSize?: number
  }): Promise<ProductsPage<N11ProductRaw>> {
    const client = this.createClient(params.credentials)
    const page = params.page ?? 0
    const size = Math.min(params.pageSize ?? PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE)

    const result = await client.request<N11ProductQueryPage>('GET', '/ms/product-query', { page, size })
    const content = Array.isArray(result.content) ? result.content : []
    const last = result.last === true
    const hasNextPage = !last && content.length > 0

    return {
      products: content.map(row => ({ ...row }) as N11ProductRaw),
      page,
      totalPages: Number.isFinite(Number(result.totalPages)) ? Number(result.totalPages) : undefined,
      totalElements: Number.isFinite(Number(result.totalElements)) ? Number(result.totalElements) : undefined,
      hasNextPage,
      nextPageCursor: hasNextPage ? String(page + 1) : null
    }
  }

  normalizeProduct(raw: N11ProductRaw) {
    return mapN11ProductToNormalizedProduct(raw)
  }

  async healthCheck(credentials: ResolvedN11Credentials): Promise<CredentialValidationResult> {
    return this.validateCredentials(credentials)
  }

  /** Raw hatayi guvenli sync hatasina cevirir (credential tasimaz). */
  toSyncError(error: unknown): Error & { errorCode?: string } {
    if (error instanceof N11ClientError) {
      const err = new Error(error.safeMessage) as Error & { errorCode?: string }
      err.errorCode = `N11_${error.kind}`
      return err
    }
    const generic = new Error('Provider request failed') as Error & { errorCode?: string }
    generic.errorCode = 'PROVIDER_UNKNOWN_ERROR'
    return generic
  }
}

/** [from, to] araligini resmi 15 gun sinirina uygun pencerelere boler. */
export function buildDateWindows(fromDate: Date, toDate: Date): Array<{ from: Date; to: Date }> {
  const windows: Array<{ from: Date; to: Date }> = []
  let cursor = toDate.getTime()
  const fromMs = fromDate.getTime()
  for (let i = 0; i < MAX_WINDOWS && cursor > fromMs; i += 1) {
    const windowFrom = Math.max(fromMs, cursor - WINDOW_MS)
    windows.unshift({ from: new Date(windowFrom), to: new Date(cursor) })
    cursor = windowFrom - 1
  }
  if (windows.length === 0) {
    windows.push({ from: fromDate, to: toDate })
  }
  return windows
}

export { redactN11Credentials }
