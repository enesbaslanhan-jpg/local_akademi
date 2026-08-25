/*
 * HEPSIBURADA HATA SINIFLAMASI.
 *
 * Trendyol tarafindaki TrendyolClientError ile ayni semantiği tasir:
 * - kind: guvenli hata sinifi (AUTH/RATE_LIMITED/...)
 * - safeMessage: kullaniciya/loga gidebilir metin; credential ASLA tasmaz.
 * Basic Auth base64 degerinin kendisi secret sayilir ve redaction
 * testine dahildir.
 */

export type HepsiburadaErrorKind =
  | 'AUTH'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'

export class HepsiburadaClientError extends Error {
  readonly kind: HepsiburadaErrorKind
  /** Credential'siz, loglanabilir guvenli mesaj. */
  readonly safeMessage: string
  readonly retryAfterSeconds?: number

  constructor(kind: HepsiburadaErrorKind, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'HepsiburadaClientError'
    this.kind = kind
    this.safeMessage = message
    this.retryAfterSeconds = retryAfterSeconds
  }
}
