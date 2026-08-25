/*
 * N11 HATA SINIFLAMASI.
 *
 * Trendyol/Hepsiburada ClientError semantiğiyle aynidir:
 * - kind: guvenli hata sinifi (AUTH/RATE_LIMITED/...)
 * - safeMessage: kullaniciya/loga gidebilir metin; appKey/appSecret
 *   ASLA tasmaz (redaction testi N11Client.test.ts'tedir).
 */

export type N11ErrorKind =
  | 'AUTH'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'

export class N11ClientError extends Error {
  readonly kind: N11ErrorKind
  /** Credential'siz, loglanabilir guvenli mesaj. */
  readonly safeMessage: string
  readonly retryAfterSeconds?: number

  constructor(kind: N11ErrorKind, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'N11ClientError'
    this.kind = kind
    this.safeMessage = message
    this.retryAfterSeconds = retryAfterSeconds
  }
}
