/*
 * Parola kuralı — istemci tarafındaki TEK kaynak.
 *
 * Sunucudaki karşılığı `src/services/auth.ts` içindeki `PASSWORD_MIN`.
 * İkisi ayrışırsa kullanıcı "geçerli" görünen bir parola yazıp sunucudan
 * hata alır; bu yüzden değer burada bir kez tanımlanıp her yerde
 * buradan okunur (kayıt formu, şifre değiştirme, sıfırlama).
 */
export const PASSWORD_MIN = 10

/**
 * Kayıt ve sıfırlama ekranlarında gösterilen canlı kontrol listesi.
 * Sunucu YALNIZCA uzunluk dayatır; buradaki diğer maddeler zorunlu değil,
 * "güçlü parola" yönlendirmesidir — zorunluymuş gibi gösterilmez.
 */
export function passwordChecks(value = '') {
  return [
    { key: 'length', labelKey: 'passwordChecks.length', values: { count: PASSWORD_MIN }, required: true, ok: value.length >= PASSWORD_MIN },
    { key: 'case', labelKey: 'passwordChecks.case', required: false, ok: /[a-zçğıöşü]/.test(value) && /[A-ZÇĞİÖŞÜ]/.test(value) },
    { key: 'digit', labelKey: 'passwordChecks.digit', required: false, ok: /\d/.test(value) },
    { key: 'symbol', labelKey: 'passwordChecks.symbol', required: false, ok: /[^\p{L}\p{N}]/u.test(value) }
  ]
}

/** Sunucunun kabul edeceği asgari koşul. */
export function passwordMeetsMinimum(value = '') {
  return value.length >= PASSWORD_MIN
}
