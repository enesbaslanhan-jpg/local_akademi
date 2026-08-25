import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto'

/*
 * ENTEGRASYON CREDENTIAL SIFRELEMESI — AES-256-GCM.
 *
 * Kurallar:
 * - Anahtar DB'de ve repoda SAKLANMAZ; env'den gelir.
 * - API key/secret plaintext olarak DB'ye YAZILMAZ, loga DUSMEZ,
 *   exception icine EKLENMEZ (redactSecret ile garanti edilir).
 * - GCM auth tag'ı ile birlikte saklanir; sessiz bit bozulmasi
 *   decrypt'te firlatilir (verinin susturulmasi yerine hata).
 *
 * Anahtar cozumlemesi:
 * 1) INTEGRATION_ENCRYPTION_KEY tanimliysa o kullanilir (32 bayt
 *    hex/base64/ham). Uretimde bu TERCIH EDILIR.
 * 2) Tanimli degilse JWT_SECRET'ten sabit etiketle turetilir ve
 *    URETIMDE net bir uyari yazilir. Bu yedek yol anahtar dondurumu
 *    yapilamayan mevcut kurulumlari kırmamak icindir.
 */

const KEY_BYTES = 32
const DERIVATION_LABEL = 'localkarar:integration-credential-encryption:v1'
const FORMAT_VERSION = 'v1'

let cachedKey: Buffer | null = null

function decodeKeyMaterial(raw: string): Buffer | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex')
  try {
    const decoded = Buffer.from(trimmed, 'base64')
    if (decoded.length === KEY_BYTES && decoded.toString('base64') === trimmed.replace(/\s/g, '')) {
      return decoded
    }
  } catch {
    /* base64 degil, asagiya devam */
  }
  if (Buffer.byteLength(trimmed, 'utf8') === KEY_BYTES) return Buffer.from(trimmed, 'utf8')
  return null
}

export function getIntegrationEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey

  const dedicated = process.env.INTEGRATION_ENCRYPTION_KEY
  if (dedicated) {
    const decoded = decodeKeyMaterial(dedicated)
    if (decoded && decoded.length === KEY_BYTES) {
      cachedKey = decoded
      return cachedKey
    }
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY must encode exactly 32 bytes (hex, base64 or raw text).'
    )
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error(
      'Credential encryption requires INTEGRATION_ENCRYPTION_KEY (preferred) or JWT_SECRET.'
    )
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[GUVENLIK] INTEGRATION_ENCRYPTION_KEY tanimli degil; anahtar JWT_SECRET\'ten turetiliyor. ' +
      'Uretimde ayri bir INTEGRATION_ENCRYPTION_KEY tanimlayin.'
    )
  }
  cachedKey = createHash('sha256').update(`${DERIVATION_LABEL}:${jwtSecret}`, 'utf8').digest()
  return cachedKey
}

/** Testler icin ozetlenmis anahtar. */
export function clearEncryptionKeyCacheForTests(): void {
  cachedKey = null
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new Error('encryptSecret: empty value')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getIntegrationEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    FORMAT_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64')
  ].join(':')
}

export function decryptSecret(encrypted: string): string {
  if (!encrypted) throw new Error('decryptSecret: empty value')
  const parts = encrypted.split(':')
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('decryptSecret: unknown payload format')
  }
  const [, ivPart, tagPart, dataPart] = parts
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getIntegrationEncryptionKey(),
    Buffer.from(ivPart, 'base64')
  )
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64')),
    decipher.final()
  ])
  return plaintext.toString('utf8')
}

/*
 * SECRET REDACTION.
 *
 * Hata mesajlari provider'dan gelen metinleri tasir; provider metni
 * bizim gonderdigimiz degeri yansitiyor olabilir. Kullaniciya/loga
 * cikmadan once bilinen tum credential degerleri maskelenir.
 */
export function redactSecrets(message: string, secrets: Array<string | undefined | null>): string {
  let safe = message ?? ''
  const values = secrets.filter((value): value is string =>
    typeof value === 'string' && value.trim().length >= 4)
  for (const secret of values) {
    // Ayrintili maskeleme: degerin kendisi, base64'u ve basic-auth
    // icinde tekrarlandigi bicim (base64(key:key)) yakalanir.
    const encoded = Buffer.from(secret, 'utf8').toString('base64')
    const doubled = Buffer.from(`${secret}:${secret}`, 'utf8').toString('base64')
    safe = safe.split(secret).join('[REDACTED]')
    if (encoded !== secret) safe = safe.split(encoded).join('[REDACTED]')
    if (doubled !== secret) safe = safe.split(doubled).join('[REDACTED]')
  }
  // Basic auth tamami tek string'de tasiniyor: base64(key:secret).
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const pairA = Buffer.from(`${values[i]}:${values[j]}`, 'utf8').toString('base64')
      const pairB = Buffer.from(`${values[j]}:${values[i]}`, 'utf8').toString('base64')
      safe = safe.split(pairA).join('[REDACTED]').split(pairB).join('[REDACTED]')
    }
  }
  return safe
}

/** Loglar icin guvenli kimlik: rastgele, credential tasimaz. */
export function newSyncRunId(): string {
  return randomUUID()
}
