import crypto from 'node:crypto'

/*
 * Tek kullanımlık gizli değer üretimi ve özetlenmesi.
 *
 * Kural: ham değer YALNIZCA kullanıcıya gider (e-posta), veritabanına her
 * zaman özeti yazılır. Veritabanı sızarsa hiçbir token/kod kullanılamaz.
 *
 * `hashToken` daha önce `src/services/workspace.ts` içinde özel bir
 * fonksiyondu; şifre sıfırlama ve e-posta doğrulama da aynı deseni
 * kullandığı için buraya alındı — üç kopya yerine tek kaynak.
 */

/** Gizli değerin veritabanına yazılacak özeti. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** URL'de taşınabilir rastgele token (varsayılan 32 bayt → 64 karakter hex). */
export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * E-postayla gönderilecek sayısal kod.
 *
 * `randomInt` kullanılıyor, `Math.random()` değil: ikincisi kriptografik
 * değildir ve üretilen kodlar tahmin edilebilir olur.
 *
 * Baştaki sıfırlar korunur — 6 haneli kod her zaman 6 karakterdir.
 */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits
  return String(crypto.randomInt(0, max)).padStart(digits, '0')
}

/**
 * Sabit zamanlı karşılaştırma.
 *
 * Özetler zaten sabit uzunlukta; erken çıkan `===` karşılaştırması ölçülebilir
 * zaman farkı yaratabildiği için gizli değer karşılaştırmalarında bu kullanılır.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
