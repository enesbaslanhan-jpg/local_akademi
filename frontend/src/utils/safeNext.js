/*
 * Girişten sonra dönülecek yolun doğrulaması.
 *
 * `?next=` parametresi KULLANICIDAN gelir; doğrudan `navigate()`e
 * verilmesi açık yönlendirme (open redirect) açığıdır — saldırgan
 * `/login?next=https://sahte-site` bağlantısını paylaşıp kullanıcıyı
 * giriş yaptıktan hemen sonra kendi sitesine düşürebilir. Kimlik avı
 * için biçilmiş kaftandır, çünkü bağlantı gerçekten bizim alan
 * adımızla başlar.
 *
 * Bu yüzden yalnız UYGULAMA İÇİ yollara izin veriliyor:
 *   - tek `/` ile başlamalı
 *   - `//` ile başlayamaz (protokole göreli URL: `//evil.com`
 *     tarayıcıda mutlak adres sayılır)
 *   - `\` içeremez (bazı tarayıcılar `/\evil.com` yolunu da mutlak
 *     kabul eder)
 *   - kontrol karakteri içeremez (satır sonu / NUL ayrıştırıcıları
 *     şaşırtabilir)
 *
 * Şema (`javascript:`, `data:` …) zaten "`/` ile başlamalı" kuralına
 * takılır.
 */
export const VARSAYILAN_YOL = '/app/dashboard'

const KONTROL_KARAKTERI = new RegExp('[\\u0000-\\u001F\\u007F]')

export function guvenliNext(deger, varsayilan = VARSAYILAN_YOL) {
  if (typeof deger !== 'string' || deger.length === 0) return varsayilan
  if (deger.length > 512) return varsayilan
  if (!deger.startsWith('/')) return varsayilan
  if (deger.startsWith('//')) return varsayilan
  if (deger.includes('\\')) return varsayilan
  if (KONTROL_KARAKTERI.test(deger)) return varsayilan
  return deger
}
