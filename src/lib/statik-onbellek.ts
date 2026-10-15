/*
 * Statik dosyalar için tarayıcı önbellek başlığı (15.10.2026).
 *
 * 🔴 NEDEN: Vite çıktısı `/assets/` altında İÇERİK ÖZETLİ dosya adlarıyla gelir
 * (`index-CYKxVhSj.js`). İçerik değişince ad değişir; yani aynı adlı dosya ASLA
 * farklı içerik taşımaz ve güvenle bir yıl önbellekte tutulabilir. Ayar yoktu:
 * sunucu `max-age=0` gönderiyor, Cloudflare bunu 4 saate çıkarıyordu; PageSpeed
 * "Verimli önbellek sürelerini kullanın (1,6 MiB)" uyarısı veriyordu ve geri dönen
 * ziyaretçi her 4 saatte tüm paketi yeniden indiriyordu.
 *
 * ⚠️ Yalnız `/assets/` + içerik özeti taşıyan adlar. `index.html` ve sabit adlı
 * dosyalar (`about-screens/*`, `sitemap.xml`) bunun DIŞINDA kalır: onların adı
 * değişmeden içeriği değişebilir, uzun önbellek eski sürümü kullanıcıda bırakır.
 */
export const DEGISMEZ_ONBELLEK = 'public, max-age=31536000, immutable'

/** `index-CYKxVhSj.js`, `manrope-latin-400-normal-PaqtzbVb.woff2`: son `-` sonrası 8+ karakterlik özet. */
const OZETLI_AD = /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/

export function statikOnbellekBasligi(dosyaYolu: string): string | null {
  const yol = dosyaYolu.replace(/\\/g, '/')
  if (!/\/assets\/[^/]+$/.test(yol)) return null
  return OZETLI_AD.test(yol) ? DEGISMEZ_ONBELLEK : null
}
