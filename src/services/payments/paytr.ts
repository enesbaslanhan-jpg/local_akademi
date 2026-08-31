import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * PAYTR SANAL POS — iFrame API
 *
 * Biçim kararı (27.08.2026): kart formu PayTR'nin iframe'inde açılıyor,
 * bizim sayfamıza gömülü. Kart numarası ve CVV sunucularımıza HİÇ
 * değmiyor — gizlilik metnindeki "kart bilgisi saklamıyoruz" cümlesi
 * ancak bu biçim sürdüğü sürece doğru.
 *
 * 🔴 BİÇİM DEĞİŞİRSE gizlilik metni ve ödeme ekranındaki güvence
 * cümlesi AYNI ANDA değişmeli. Bu dosya o cümlenin dayanağıdır.
 */

export class PaytrConfigError extends Error {}

export interface PaytrConfig {
  merchantId: string
  merchantKey: string
  merchantSalt: string
  testMode: boolean
}

/*
 * Yapılandırma yoksa ödeme HİÇ AÇILMIYOR.
 *
 * `INBOUND_MAIL_SECRET` ile aynı disiplin: eksik yapılandırmayı
 * "kapalı" saymak, yarım yapılandırmayla açık bırakmaktan iyi.
 * Yarısı dolu bir kurulum, ilk gerçek ödemede sessizce hash hatası
 * verir ve para çekilmiş olur.
 */
export function paytrYapilandirmasi(): PaytrConfig | null {
  const merchantId = process.env.PAYTR_MERCHANT_ID?.trim()
  const merchantKey = process.env.PAYTR_MERCHANT_KEY?.trim()
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim()
  if (!merchantId || !merchantKey || !merchantSalt) return null
  return {
    merchantId,
    merchantKey,
    merchantSalt,
    /* Varsayılan TEST: üretimde bilinçli olarak `false` verilmeli.
       Ters varsayılan, ilk dağıtımda gerçek para çekmek demekti. */
    testMode: process.env.PAYTR_TEST_MODE !== 'false',
  }
}

/*
 * Sipariş numarası.
 *
 * 🔴 PayTR yalnız HARF ve RAKAM kabul ediyor — tire, alt çizgi ve nokta
 * reddediliyor. `uuid` bu yüzden doğrudan kullanılamaz.
 *
 * Bu değeri BİZ ürettiğimiz için callback'in kullanıcısı da buradan
 * çözülüyor: `merchantOid` → `Payment` → `Subscription` → `userId`.
 * Shopify'daki imzalı state'e gerek kalmıyor.
 */
export function siparisNumarasiUret(rastgele: () => string): string {
  return rastgele().replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
}

/** Tutar kuruşa çevriliyor: PayTR tam sayı istiyor, ondalık kabul etmiyor. */
export function kurusaCevir(tutar: number): number {
  return Math.round(tutar * 100)
}

export function sepetKodla(urunAdi: string, tutar: number): string {
  return Buffer.from(JSON.stringify([[urunAdi, tutar.toFixed(2), 1]])).toString('base64')
}

export interface TokenIstegi {
  merchantOid: string
  email: string
  tutar: number
  kullaniciIp: string
  urunAdi: string
  basariliUrl: string
  basarisizUrl: string
  kullaniciAdi: string
  kullaniciAdres: string
  kullaniciTelefon: string
  /* Taksit kapalı: abonelik ürününde taksit anlamsız ve komisyon
     tablosundaki taksit oranları (3 taksit %7.98 …) tek seferlik
     satışlar için. Açılırsa fiyat sayfasındaki tutarlar yalan olur. */
  taksitYok?: boolean
}

/**
 * iFrame token'ının imzalanacak metnini kurar.
 *
 * ⚠️ ALAN SIRASI PAYTR TARAFINDAN SABİT. Tek bir alanın yeri değişirse
 * hash tutmaz ve PayTR isteği reddeder — hata mesajı da sebebi
 * söylemez. Bu yüzden sıra ayrı bir işlevde ve testi var.
 */
export function tokenImzaMetni(cfg: PaytrConfig, istek: TokenIstegi): string {
  return [
    cfg.merchantId,
    istek.kullaniciIp,
    istek.merchantOid,
    istek.email,
    String(kurusaCevir(istek.tutar)),
    sepetKodla(istek.urunAdi, istek.tutar),
    istek.taksitYok === false ? '0' : '1',
    '0',
    'TL',
    cfg.testMode ? '1' : '0',
  ].join('')
}

export function tokenImzala(cfg: PaytrConfig, istek: TokenIstegi): string {
  return createHmac('sha256', cfg.merchantKey)
    .update(tokenImzaMetni(cfg, istek) + cfg.merchantSalt)
    .digest('base64')
}

/*
 * CALLBACK HASH DOĞRULAMASI.
 *
 * 🔴 Bu işlev ödemenin tek güvenlik kapısı. Doğrulanmadan gelen bir
 * POST'a güvenmek, "ödeme başarılı" diyen sahte bir istekle herkesin
 * kendine abonelik açması demek.
 *
 * Karşılaştırma `timingSafeEqual` ile: `===` kullanmak, doğru ön eki
 * bulana kadar deneme yaparak hash'i tahmin etmeye kapı açar.
 * `ShopifyAuth.ts:50` ile aynı desen.
 */
export function callbackHashDogrula(
  cfg: PaytrConfig,
  govde: { merchant_oid?: string; status?: string; total_amount?: string; hash?: string }
): boolean {
  const { merchant_oid, status, total_amount, hash } = govde
  if (!merchant_oid || !status || !total_amount || !hash) return false

  const beklenen = createHmac('sha256', cfg.merchantKey)
    .update(merchant_oid + cfg.merchantSalt + status + total_amount)
    .digest('base64')

  const a = Buffer.from(beklenen)
  const b = Buffer.from(hash)
  /* Uzunluk farkı `timingSafeEqual`i fırlatır; önce eşitlik aranıyor. */
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
