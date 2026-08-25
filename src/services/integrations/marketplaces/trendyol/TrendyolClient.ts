import { redactSecrets } from '../../../../lib/crypto.js'
import {
  TRENDYOL_BASE_URLS,
  type TrendyolEnvironment,
  type TrendyolInventoryAndPriceResponse,
  type TrendyolOrdersResponse,
  type TrendyolProductsResponse
} from './TrendyolTypes.js'

/*
 * TRENDYOL HTTP ISTEMCISI.
 *
 * Resmi dokumantasyon kurallari (developers.trendyol.com):
 * - Basic Auth: apiKey + apiSecret. supplierId path'te ve User-Agent'ta.
 * - User-Agent ZORUNLU: "{sellerId} - SelfIntegration" (integrator yoksa).
 *   Gonderilmezse istek 403 ile engellenir.
 * - storeFrontCode header: uluslararasi icin zorunlu; TR kodu "1".
 * - Siparis servisi 1000 istek/dk ile sinirli; geriye 3 ay sorgulanir.
 *
 * Guvenlik: credential degerleri hicbir loga/hata mesajina yazilmaz.
 * Tum hata mesajlari redactSecrets'ten gecer.
 */

export type TrendyolErrorKind =
  | 'AUTH' | 'RATE_LIMITED' | 'NOT_FOUND' | 'BAD_REQUEST'
  | 'PROVIDER_ERROR' | 'NETWORK' | 'TIMEOUT' | 'MALFORMED_RESPONSE'

export class TrendyolClientError extends Error {
  readonly kind: TrendyolErrorKind
  readonly statusCode?: number
  /** Provider'a ozgu kisaltma; kullaniciya gosterilebilir, raw degil. */
  readonly safeMessage: string
  readonly retryAfterMs?: number

  constructor(kind: TrendyolErrorKind, safeMessage: string, options?: {
    statusCode?: number
    retryAfterMs?: number
  }) {
    super(safeMessage)
    this.name = 'TrendyolClientError'
    this.kind = kind
    this.statusCode = options?.statusCode
    this.retryAfterMs = options?.retryAfterMs
    this.safeMessage = safeMessage
  }
}

export interface TrendyolClientConfig {
  supplierId: string | number
  apiKey: string
  apiSecret: string
  environment?: TrendyolEnvironment
  baseUrl?: string
  timeoutMs?: number
  maxRetries?: number
  /** Varsayilan "1" = TR vitrini. */
  storeFrontCode?: string
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RETRIES = 2

/*
 * SIPARIS API SURUMU.
 *
 * RESMI DUYURU (developers.trendyol.com, agustos 2026): Order V2
 * yayinda ve 15 Ekim 2026'dan itibaren ZORUNLU; V1 o tarihte
 * kapaniyor. Bu yuzden varsayilan yol V2'dir:
 *   GET /integration/order/sellers/{sellerId}/v2/orders
 *
 * V2 kisitlari: maks 10.000 kayit (maxQueryWindowResult), erisim
 * penceresi yaklasik son 1 ay, yuksek hacimde daha sik 429.
 * (Buyuk veri taramasi icin resmi oneri: /orders/stream — su an
 * kullanilmiyor, MVP senkron araligi buna uygun.)
 *
 * TRENDYOL_ORDER_API_VERSION=v1 verilirse gecici geri donus acilir;
 * bu DURUM LOGLA ISARETLENIR ve Ekim 2026 sonrasinda kaldirilmalidir.
 */
type OrderApiVersion = 'v2' | 'v1'

export function resolveOrderApiVersion(): OrderApiVersion {
  const raw = (process.env.TRENDYOL_ORDER_API_VERSION || 'v2').trim().toLowerCase()
  return raw === 'v1' ? 'v1' : 'v2'
}

let warnedV1Once = false

/** V1 yalnizca acikca istenirse kullanilir ve surec basina BIR kez
 *  net sekilde kullanilmasiz uyari verir. Varsayilan v2. */
function orderPathFor(supplierId: string): string {
  const version = resolveOrderApiVersion()
  if (version === 'v1' && !warnedV1Once) {
    warnedV1Once = true
    console.warn(
      '[KULLANIM DISI] TRENDYOL_ORDER_API_VERSION=v1 — Trendyol Order V1 15 Ekim 2026\'da kapaniyor. ' +
      'Gecici geri donus etkin; en kisa surede varsayilan v2\'ye donun.'
    )
  }
  return `/integration/order/sellers/${encodeURIComponent(supplierId)}${version === 'v1' ? '' : '/v2'}/orders`
}

interface RequestOptions {
  query?: Record<string, string | number | undefined>
}

export class TrendyolClient {
  private readonly supplierId: string
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly storeFrontCode: string

  constructor(config: TrendyolClientConfig) {
    if (!config.supplierId || !config.apiKey || !config.apiSecret) {
      throw new Error('TrendyolClient requires supplierId, apiKey and apiSecret')
    }
    this.supplierId = String(config.supplierId)
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.baseUrl = (config.baseUrl || TRENDYOL_BASE_URLS[config.environment ?? 'production']).replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = Math.max(0, config.maxRetries ?? DEFAULT_MAX_RETRIES)
    this.storeFrontCode = config.storeFrontCode ?? '1'
  }

  private authHeader(): string {
    // Basic base64(apiKey:apiSecret) — resmi dokumandaki yontem.
    return `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`, 'utf8').toString('base64')}`
  }

  private userAgent(): string {
    // Integrator firmasi yok: "sellerId - SelfIntegration".
    return `${this.supplierId} - SelfIntegration`
  }

  private secrets(): string[] {
    return [this.apiKey, this.apiSecret]
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async request<T>(method: 'GET', path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.query)
    const totalAttempts = this.maxRetries + 1
    for (let attempt = 1; ; attempt += 1) {
      // Yalniz 429 / 5xx / ag hatasi / timeout yeniden denenir
      // (max 1-2 retry). 400/401/403/404 gibi istemci hatalari denenmez.
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        let response: Response
        try {
          response = await fetch(url, {
            method,
            headers: {
              Authorization: this.authHeader(),
              'User-Agent': this.userAgent(),
              'storeFrontCode': this.storeFrontCode,
              Accept: 'application/json'
            },
            signal: controller.signal
          })
        } catch (error) {
          if (isAbortError(error)) {
            if (attempt < totalAttempts) { await sleep(Math.min(500 * attempt, 2000)); continue }
            throw new TrendyolClientError('TIMEOUT', 'Provider request timed out')
          }
          if (attempt < totalAttempts) { await sleep(Math.min(500 * attempt, 2000)); continue }
          throw new TrendyolClientError(
            'NETWORK',
            redactSecrets(`Could not reach the provider: ${(error as Error)?.message ?? 'unknown'}`, this.secrets())
          )
        }

        if (response.ok) {
          const text = await response.text()
          if (!text.trim()) throw new TrendyolClientError('MALFORMED_RESPONSE', 'Provider returned an empty response body')
          try {
            return JSON.parse(text) as T
          } catch {
            throw new TrendyolClientError('MALFORMED_RESPONSE', 'Provider response was not valid JSON')
          }
        }

        const kind = this.mapHttpError(response.status)
        const retryable = this.isRetryable(kind)
        if (retryable && attempt < totalAttempts) {
          const retryAfterHeader = response.headers.get('retry-after')
          const retryAfterMs = Number(retryAfterHeader) * 1000
          await sleep(Number.isFinite(retryAfterMs) && retryAfterMs > 0
            ? Math.min(retryAfterMs, 10_000)
            : Math.min(800 * 2 ** (attempt - 1), 5000))
          continue
        }
        throw this.errorForStatus(response.status, kind)
      } finally {
        clearTimeout(timer)
      }
    }
  }

  private mapHttpError(status: number): TrendyolErrorKind {
    if (status === 401 || status === 403) return 'AUTH'
    if (status === 429) return 'RATE_LIMITED'
    if (status === 404) return 'NOT_FOUND'
    if (status === 400 || status === 422) return 'BAD_REQUEST'
    return 'PROVIDER_ERROR'
  }

  private isRetryable(kind: TrendyolErrorKind): boolean {
    return kind === 'RATE_LIMITED' || kind === 'PROVIDER_ERROR'
  }

  private errorForStatus(status: number, kind: TrendyolErrorKind): TrendyolClientError {
    const safeMessages: Record<TrendyolErrorKind, string> = {
      AUTH: 'Trendyol credentials were rejected (invalid supplierId, API key or secret)',
      RATE_LIMITED: 'Trendyol rate limit reached; please retry later',
      NOT_FOUND: 'Trendyol resource was not found',
      BAD_REQUEST: 'Trendyol rejected the request parameters',
      PROVIDER_ERROR: 'Trendyol service returned a server error',
      NETWORK: 'Could not reach the Trendyol service',
      TIMEOUT: 'Trendyol request timed out',
      MALFORMED_RESPONSE: 'Trendyol returned an unexpected response format'
    }
    return new TrendyolClientError(kind, safeMessages[kind], { statusCode: status })
  }

  /**
   * Get Shipment Packages — V2: /integration/order/sellers/{sellerId}/v2/orders
   * (V1 yol yalnizca TRENDYOL_ORDER_API_VERSION=v1 ile, gecici olarak.)
   * startDate/endDate Unix ms; size maks 200.
   */
  async getShipmentPackages(params: {
    startDateMs: number
    endDateMs: number
    page?: number
    size?: number
    status?: string
    orderByField?: 'PackageLastModifiedDate'
    orderByDirection?: 'ASC' | 'DESC'
  }): Promise<TrendyolOrdersResponse> {
    return this.request<TrendyolOrdersResponse>(
      'GET',
      orderPathFor(this.supplierId),
      {
        query: {
          startDate: params.startDateMs,
          endDate: params.endDateMs,
          page: params.page ?? 0,
          size: params.size ?? 200,
          ...(params.status ? { status: params.status } : {}),
          orderByField: params.orderByField,
          orderByDirection: params.orderByDirection
        }
      }
    )
  }

  /**
   * GET /integration/product/sellers/{sellerId}/products/approved — V2.
   * size maks 100; 10.000+ kayitta nextPageToken doner.
   */
  async getApprovedProducts(params: {
    page?: number
    size?: number
    nextPageToken?: string
    dateQueryType?: 'VARIANT_CREATED_DATE' | 'VARIANT_MODIFIED_DATE' | 'CONTENT_MODIFIED_DATE'
    startDateMs?: number
    endDateMs?: number
  }): Promise<TrendyolProductsResponse> {
    return this.request<TrendyolProductsResponse>(
      'GET',
      `/integration/product/sellers/${encodeURIComponent(this.supplierId)}/products/approved`,
      {
        query: {
          page: params.page ?? 0,
          size: params.size ?? 100,
          ...(params.nextPageToken ? { nextPageToken: params.nextPageToken } : {}),
          ...(params.dateQueryType ? { dateQueryType: params.dateQueryType } : {}),
          ...(params.startDateMs !== undefined ? { startDate: params.startDateMs } : {}),
          ...(params.endDateMs !== undefined ? { endDate: params.endDateMs } : {})
        }
      }
    )
  }

  /**
   * GET /integration/product/sellers/{sellerId}/products/approved/inventory-and-price
   * Yalnizca stok + fiyat. V2 approved-products cevabi stok ADEDI
   * vermedigi icin gercek stok (quantity) BURADAN tamamlanir.
   * Resmi dokuman: filterApprovedProductsInventoryAndPrice.
   */
  async getApprovedProductsInventoryAndPrice(params: {
    page?: number
    size?: number
    nextPageToken?: string
  }): Promise<TrendyolInventoryAndPriceResponse> {
    return this.request<TrendyolInventoryAndPriceResponse>(
      'GET',
      `/integration/product/sellers/${encodeURIComponent(this.supplierId)}/products/approved/inventory-and-price`,
      {
        query: {
          page: params.page ?? 0,
          size: params.size ?? 100,
          ...(params.nextPageToken ? { nextPageToken: params.nextPageToken } : {})
        }
      }
    )
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}
