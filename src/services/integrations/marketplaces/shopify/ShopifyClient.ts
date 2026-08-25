import { ShopifyClientError, type ShopifyErrorKind } from './ShopifyErrors.js'
import { SHOPIFY_API_VERSION, type ShopifyGraphQLResponse } from './ShopifyTypes.js'

const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2
const MAX_THROTTLE_WAIT_MS = 10_000

export interface ShopifyClientConfig {
  shopDomain: string
  accessToken: string
  apiVersion?: string
  fetchImpl?: typeof fetch
}

export function normalizeShopDomain(value: string): string | null {
  let candidate = String(value || '').trim().toLowerCase()
  candidate = candidate.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(candidate)) return null
  return candidate
}

export function redactShopifySecrets(message: string, accessToken?: string | null): string {
  let safe = String(message || '')
  if (accessToken) safe = safe.split(accessToken).join('[REDACTED]')
  safe = safe.replace(/(X-Shopify-Access-Token\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
  safe = safe.replace(/\bshpat_[A-Za-z0-9_-]+\b/g, '[REDACTED]')
  return safe
}

export class ShopifyClient {
  private readonly shopDomain: string
  private readonly accessToken: string
  private readonly apiVersion: string
  private readonly fetchImpl: typeof fetch
  private nextRequestAt = 0

  constructor(config: ShopifyClientConfig) {
    const shopDomain = normalizeShopDomain(config.shopDomain)
    if (!shopDomain || !config.accessToken) {
      throw new ShopifyClientError('BAD_REQUEST', 'Shopify credentials are incomplete')
    }
    this.shopDomain = shopDomain
    this.accessToken = config.accessToken
    this.apiVersion = config.apiVersion || SHOPIFY_API_VERSION
    this.fetchImpl = config.fetchImpl || fetch
  }

  get endpoint(): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    let attempt = 0
    for (;;) {
      attempt += 1
      await this.waitForThrottleBudget()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      let response: Response
      try {
        response = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.accessToken
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal
        })
      } catch (error) {
        clearTimeout(timer)
        const timedOut = (error as Error)?.name === 'AbortError'
        if (attempt <= MAX_RETRIES && (timedOut || error instanceof TypeError)) {
          await backoff(attempt)
          continue
        }
        throw new ShopifyClientError(
          timedOut ? 'TIMEOUT' : 'NETWORK',
          timedOut ? 'Shopify request timed out' : 'Shopify request failed'
        )
      }
      clearTimeout(timer)

      if (response.status === 429 || response.status >= 500) {
        if (attempt <= MAX_RETRIES) {
          await backoff(attempt, parseRetryAfter(response.headers.get('retry-after')))
          continue
        }
      }
      if (!response.ok) {
        throw new ShopifyClientError(mapHttpStatus(response.status), `Shopify error (${response.status})`, response.status)
      }

      let payload: ShopifyGraphQLResponse<T>
      try {
        payload = await response.json() as ShopifyGraphQLResponse<T>
      } catch {
        throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify returned invalid JSON')
      }
      if (!payload || typeof payload !== 'object' || (!('data' in payload) && !Array.isArray(payload.errors))) {
        throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify returned a malformed GraphQL response')
      }

      this.captureThrottleStatus(payload)
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        const throttled = payload.errors.some(error => error?.extensions?.code === 'THROTTLED')
        if (throttled && attempt <= MAX_RETRIES) {
          await this.waitForThrottleBudget(true)
          continue
        }
        const kind = throttled ? 'RATE_LIMITED' : 'GRAPHQL'
        // Raw GraphQL message can contain merchant data or query fragments; expose only a controlled error.
        throw new ShopifyClientError(kind, throttled ? 'Shopify request was throttled' : 'Shopify GraphQL request failed')
      }
      if (payload.data === undefined || payload.data === null) {
        throw new ShopifyClientError('MALFORMED_RESPONSE', 'Shopify response did not include data')
      }
      return payload.data
    }
  }

  private captureThrottleStatus(payload: ShopifyGraphQLResponse<unknown>): void {
    const status = payload.extensions?.cost?.throttleStatus
    const available = Number(status?.currentlyAvailable)
    const restoreRate = Number(status?.restoreRate)
    if (!Number.isFinite(available) || !Number.isFinite(restoreRate) || restoreRate <= 0) return
    const reserve = 50
    if (available < reserve) {
      const delay = Math.min(Math.ceil(((reserve - available) / restoreRate) * 1000), MAX_THROTTLE_WAIT_MS)
      this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + delay)
    }
  }

  private async waitForThrottleBudget(force = false): Promise<void> {
    const delay = force ? Math.max(this.nextRequestAt - Date.now(), 1000) : this.nextRequestAt - Date.now()
    if (delay > 0) await sleep(Math.min(delay, MAX_THROTTLE_WAIT_MS))
  }
}

function mapHttpStatus(status: number): ShopifyErrorKind {
  if (status === 401) return 'AUTH'
  if (status === 403) return 'FORBIDDEN'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 400) return 'BAD_REQUEST'
  return 'PROVIDER_ERROR'
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 1000), MAX_THROTTLE_WAIT_MS)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.min(Math.max(date - Date.now(), 1000), MAX_THROTTLE_WAIT_MS) : undefined
}

async function backoff(attempt: number, retryAfterMs?: number): Promise<void> {
  await sleep(retryAfterMs ?? Math.min(500 * 2 ** (attempt - 1), 4000))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
