import { describe, it, expect, beforeEach } from 'vitest'
import {
  encryptSecret,
  decryptSecret,
  redactSecrets,
  clearEncryptionKeyCacheForTests
} from '../../src/lib/crypto'

describe('credential encryption (AES-256-GCM)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-value-32-bytes-min!!!'
    delete process.env.INTEGRATION_ENCRYPTION_KEY
    clearEncryptionKeyCacheForTests()
  })

  it('encrypts and decrypts round-trip', () => {
    const secret = 'trendyol-api-key-abcd1234'
    const encrypted = encryptSecret(secret)
    expect(encrypted).not.toContain(secret)
    expect(decryptSecret(encrypted)).toBe(secret)
  })

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encryptSecret('same-value')
    const b = encryptSecret('same-value')
    expect(a).not.toBe(b)
  })

  it('does not store plaintext in DB-shaped value', () => {
    const encrypted = encryptSecret('my-secret-key')
    expect(encrypted.startsWith('v1:')).toBe(true)
    expect(encrypted.split(':')).toHaveLength(4)
  })

  it('fails auth tag verification on tampering', () => {
    const encrypted = encryptSecret('my-secret-key')
    const parts = encrypted.split(':')
    parts[3] = Buffer.from('tampered').toString('base64')
    expect(() => decryptSecret(parts.join(':'))).toThrow()
  })

  it('rejects unknown format', () => {
    expect(() => decryptSecret('plaintext-value')).toThrow(/unknown payload format/i)
  })

  it('dedicated key takes precedence over derived key', () => {
    const dedicated = Buffer.alloc(32, 7).toString('hex')
    const first = (() => {
      process.env.INTEGRATION_ENCRYPTION_KEY = dedicated
      clearEncryptionKeyCacheForTests()
      return encryptSecret('value')
    })()

    // Ayni anahtarla cozulebilir.
    process.env.INTEGRATION_ENCRYPTION_KEY = dedicated
    clearEncryptionKeyCacheForTests()
    expect(decryptSecret(first)).toBe('value')

    // Baska anahtarla cozulemez.
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('hex')
    clearEncryptionKeyCacheForTests()
    expect(() => decryptSecret(first)).toThrow()

    process.env.INTEGRATION_ENCRYPTION_KEY = undefined as any
    clearEncryptionKeyCacheForTests()
  })
})

describe('secret redaction', () => {
  it('masks secrets inside error messages', () => {
    const safe = redactSecrets(
      'Auth failed for key abc123XYZ and urlencoded abc123XYZ',
      ['abc123XYZ']
    )
    expect(safe).not.toContain('abc123XYZ')
    expect(safe).toContain('[REDACTED]')
  })

  it('masks base64 representation used in Basic auth headers', () => {
    const apiKey = 'super-secret-key'
    const encoded = Buffer.from(`${apiKey}:${apiKey}`, 'utf8').toString('base64')
    const safe = redactSecrets(`header was: Basic ${encoded}`, [apiKey])
    expect(safe).not.toContain(encoded)
    expect(safe).toContain('[REDACTED]')
  })

  it('leaves messages without secrets untouched', () => {
    expect(redactSecrets('all good', [])).toBe('all good')
  })

  it('ignores very short values to avoid over-redaction', () => {
    expect(redactSecrets('a b c', ['a'])).toBe('a b c')
  })
})
