import { HepsiburadaClientError } from './HepsiburadaErrors.js'
import { HEPSIBURADA_BASE_URLS, type HepsiburadaEnvironment, type HepsiburadaService } from './HepsiburadaTypes.js'

/*
 * HEPSIBURADA HTTP CLIENT.
 *
 * Resmi dokuman (developers.hepsiburada.com, agustos 2026):
 * - Kimlik: HTTP Basic (username:password) — Merchant Portal
 *   (merchant.hepsiburada.com) > Ayarlar > Entegrasyonlar'dan alinir.
 * - merchantId UUID bicimindedir ve cogu path'te segment olarak gecer.
 * - User-Agent ZORUNLUDUR: portalda tanimli entegrator adi (bare isim)
 *   gonderilir; anlamli UA olmayan istekler reddedilir.
 * - Ortamlar: production *.hepsiburada.com, SIT *-sit.hepsiburada.com.
 *
 * Guvenlik: Basic Auth base64(username:password) degeri bir butun olarak
 * secret sayilir; hicbir log/hata mesajina yazilmaz (redactBasicToken).
 * Retry yalnizca 429/5xx/network/timeout icin (maks 2), Retry-After'a
 * saygiyla; 401/403/400 denenmez. Timeout 15 sn.
 */

const TIMEOUT_MS = 15_000
const MAX_RETRIES = 2

export interface HepsiburadaClientConfig {
  /** UUID biciminde satici kimligi. */
  merchantId: string
  username: string
  password: string
  env?: HepsiburadaEnvironment
  /** Portal entegrator adi — User-Agent olarak gonderilir. */
  integratorName?: string
}

/** Basic Auth token'ini ve sifreyi mesajlardan temizler. */
export function redactBasicToken(message: string, credentials: Pick<HepsiburadaClientConfig, 'username' | 'password'>): string {
  let safe = message
  try {
    const token = Buffer.from(`${credentials.username}:${credentials.password}`, 'utf8').toString('base64')
    if (token) safe = safe.split(token).join('[REDACTED]')
    if (credentials.password) safe = safe.split(credentials.password).join('[REDACTED]')
  } catch { /* redaction hicbir zaman firlatmaz */ }
  return safe
}

export class HepsiburadaClient {
  private readonly merchantId: string
  private readonly username: string
  private readonly password: string
  private readonly integratorName: string
  private readonly env: HepsiburadaEnvironment

  constructor(config: HepsiburadaClientConfig) {
    if (!config.merchantId || !config.username || !config.password) {
      throw new HepsiburadaClientError('BAD_REQUEST', 'Hepsiburada credentials are incomplete')
    }
    this.merchantId = config.merchantId
    this.username = config.username
    this.password = config.password
    this.integratorName = config.integratorName ?? 'LocalKarar'
    this.env = config.env ?? resolveDefaultEnv()
  }

  get environment(): HepsiburadaEnvironment {
    return this.env
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`, 'utf8').toString('base64')}`,
      Accept: 'application/json',
      // Resmi gereksinim: portal entegrator adi (bare isim).
      'User-Agent': this.integratorName
    }
  }

  async request<T>(
    service: HepsiburadaService,
    method: 'GET',
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const base = HEPSIBURADA_BASE_URLS[this.env][service]
    const url = new URL(path, base)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }

    let attempt = 0
    for (;;) {
      attempt += 1
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch(url.toString(), {
          method,
          headers: this.headers(),
          signal: controller.signal
        })
      } catch (error) {
        clearTimeout(timer)
        const aborted = (error as Error)?.name === 'AbortError'
        if (aborted && attempt <= MAX_RETRIES) continue
        throw new HepsiburadaClientError(
          aborted ? 'TIMEOUT' : 'NETWORK',
          `Hepsiburada ${service} request failed`
        )
      }
      clearTimeout(timer)

      if (response.status >= 200 && response.status < 300) {
        try {
          return await response.json() as T
        } catch {
          throw new HepsiburadaClientError('MALFORMED_RESPONSE', `Hepsiburada ${service} returned invalid JSON`)
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

      throw new HepsiburadaClientError(
        mapStatusToKind(response.status),
        `Hepsiburada ${service} error (${response.status})`,
        response.status === 429 ? 5 : undefined
      )
    }
  }
}

function resolveDefaultEnv(): HepsiburadaEnvironment {
  return String(process.env.HEPSIBURADA_ENV || '').trim().toLowerCase() === 'sit' ? 'sit' : 'production'
}

function mapStatusToKind(status: number): HepsiburadaErrorKindAlias {
  if (status === 401) return 'AUTH'
  if (status === 403) return 'FORBIDDEN'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 404) return 'NOT_FOUND'
  if (status === 400) return 'BAD_REQUEST'
  return 'PROVIDER_ERROR'
}

type HepsiburadaErrorKindAlias = HepsiburadaClientError['kind']

async function backoff(attempt: number, retryAfterSeconds?: number): Promise<void> {
  const delayMs = retryAfterSeconds
    ? retryAfterSeconds * 1000
    : Math.min(1000 * 2 ** (attempt - 1), 8000)
  await new Promise(resolve => setTimeout(resolve, delayMs))
}
