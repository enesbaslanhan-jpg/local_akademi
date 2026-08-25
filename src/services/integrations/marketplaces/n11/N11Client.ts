import { N11ClientError } from './N11Errors.js'
import { N11_BASE_URL } from './N11Types.js'

/*
 * N11 HTTP CLIENT.
 *
 * Resmi dokuman (developer.n11.com, agustos 2026):
 * - Kimlik: her istekte header olarak appkey + appsecret gonderilir
 *   ("Authorization: no auth"; anahtarlar header'da tasinir).
 * - Siparis listeleme servisi: dakikada maks 1000 istek.
 * - Anahtarlar Satici Paneli (so.n11.com) > Hesabim > API Hesaplari.
 *
 * Guvenlik: appKey ve appSecret birer SECRET'tir; ikisi de (ve
 * header degerlerinin bilesimi) hicbir log/hata mesajina yazilmaz
 * (redactN11Credentials). Retry yalnizca 429/5xx/network/timeout
 * icin (maks 2), Retry-After'a saygiyla; 401/403/400 denenmez.
 * Timeout 15 sn.
 */

const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2

export interface N11ClientConfig {
  appKey: string
  appSecret: string
  /** Yalnizca testler icin override; production resmi host kullanir. */
  baseUrl?: string
}

/** Header degerlerini ve anahtarlari mesajlardan temizler. */
export function redactN11Credentials(
  message: string,
  credentials: Pick<N11ClientConfig, 'appKey' | 'appSecret'>
): string {
  let safe = message
  try {
    for (const secret of [credentials.appKey, credentials.appSecret]) {
      if (secret) safe = safe.split(secret).join('[REDACTED]')
    }
    const headerPair = `appkey: ${credentials.appKey}`
    if (credentials.appKey) safe = safe.split(headerPair).join('appkey: [REDACTED]')
  } catch { /* redaction hicbir zaman firlatmaz */ }
  return safe
}

export class N11Client {
  private readonly appKey: string
  private readonly appSecret: string
  private readonly baseUrl: string

  constructor(config: N11ClientConfig) {
    if (!config.appKey || !config.appSecret) {
      throw new N11ClientError('BAD_REQUEST', 'N11 credentials are incomplete')
    }
    this.appKey = config.appKey
    this.appSecret = config.appSecret
    this.baseUrl = (config.baseUrl || process.env.N11_BASE_URL || N11_BASE_URL).replace(/\/+$/, '')
  }

  get environment(): 'production' {
    // Resmi dokumanda tek ortam yayinlanmistir (api.n11.com).
    return 'production'
  }

  private headers(): Record<string, string> {
    return {
      // Resmi kimlik modeli: anahtarlar header'da tasiyor.
      appkey: this.appKey,
      appsecret: this.appSecret,
      Accept: 'application/json'
    }
  }

  buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, `${this.baseUrl}/`)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async request<T>(
    method: 'GET',
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, query)

    let attempt = 0
    for (;;) {
      attempt += 1
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch(url, {
          method,
          headers: this.headers(),
          signal: controller.signal
        })
      } catch (error) {
        clearTimeout(timer)
        const aborted = (error as Error)?.name === 'AbortError'
        if (aborted && attempt <= MAX_RETRIES) continue
        throw new N11ClientError(
          aborted ? 'TIMEOUT' : 'NETWORK',
          `N11 request failed (${path})`
        )
      }
      clearTimeout(timer)

      if (response.status >= 200 && response.status < 300) {
        try {
          return await response.json() as T
        } catch {
          throw new N11ClientError('MALFORMED_RESPONSE', `N11 returned invalid JSON (${path})`)
        }
      }

      // Yalnizca gecici hatalar tekrar denenir; 401/403/400 denenmez.
      if ((response.status === 429 || response.status >= 500) && attempt <= MAX_RETRIES) {
        const retryAfterHeader = response.headers.get('retry-after')
        const retryAfterSeconds = Number.isFinite(Number(retryAfterHeader))
          ? Math.min(Math.max(Math.trunc(Number(retryAfterHeader)), 1), 10)
          : undefined
        await backoff(attempt, retryAfterSeconds)
        continue
      }

      throw new N11ClientError(
        mapStatusToKind(response.status),
        `N11 error (${response.status}) (${path})`,
        response.status === 429 ? 5 : undefined
      )
    }
  }
}

function mapStatusToKind(status: number): N11ClientError['kind'] {
  if (status === 401) return 'AUTH'
  if (status === 403) return 'FORBIDDEN'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 404) return 'NOT_FOUND'
  if (status === 400) return 'BAD_REQUEST'
  return 'PROVIDER_ERROR'
}

async function backoff(attempt: number, retryAfterSeconds?: number): Promise<void> {
  const delayMs = retryAfterSeconds
    ? retryAfterSeconds * 1000
    : Math.min(1000 * 2 ** (attempt - 1), 8000)
  await new Promise(resolve => setTimeout(resolve, delayMs))
}
