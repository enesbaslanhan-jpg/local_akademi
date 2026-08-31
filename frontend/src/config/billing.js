/*
 * Üyelik yapılandırmasının ÖN YÜZ aynası.
 *
 * Otorite `src/config/billing.ts` (arka uç). Ön yüz oradan import
 * edemiyor: ayrı derleme hedefleri, ayrı tsconfig.
 *
 * 🔴 İki dosya AYNI değerleri taşımak ZORUNDA. Bunu insana bırakmak
 * kaçınılmaz olarak sapmaya yol açar — kullanıcıya gösterilen fiyat
 * ile tahsil edilen tutarın farklı olması demektir.
 *
 * Bu yüzden `tests/billing-config-drift.test.ts` iki dosyayı
 * karşılaştırıyor ve sapma varsa DÜŞÜYOR. Buradaki bir sayıyı
 * değiştirip arka ucu unutursan test seni durdurur.
 *
 * Neden API'den çekmiyoruz: fiyat sayfası herkese açık bir pazarlama
 * yüzeyi; ağ isteği hem gecikme hem de "fiyatlar yüklenemedi" gibi
 * bir başarısızlık hâli ekler. Yasal metin SÜRÜMLERİ API'den geliyor
 * çünkü onlar onay kaydıyla eşleşmek zorunda; fiyat öyle değil.
 */

export const BILLING_CURRENCY = 'TRY'

/** Ücretlendirmenin başladığı an (ISO). `null` = henüz başlamadı. */
export const BILLING_STARTS_AT = null

export const TRIAL_DAYS = 30

export const TRIAL_WARNING_DAYS = 7

/* 🔴 Kurucu indiriminin ölçüldüğü taban. Fiyatlar sayfasında
   GÖSTERİLMİYOR (üstü çizili e-ticaret dili bilerek reddedildi) ama
   "%40 indirim" ifadesi bu sayı olmadan doğrulanamaz. */
export const STANDARD_MONTHLY_PRICE = 499

/* 🔴 Kurucu üye indirimi kalıcı ve ORANSAL: standart fiyat yükselirse
   kurucu fiyat da yükselir, ama hep aynı oranda altında kalır. */
export const FOUNDER_DISCOUNT_RATE = 0.4

/** Yıllık peşinde kaç ay hediye — 12 ay yerine 10 ay ödenir. */
export const YEARLY_FREE_MONTHS = 2

/* Yuvarlama TEK YERDE — ekranda 299, tahsilatta 299,40 olmasın. */
export const fiyatYuvarla = tutar => Math.round(tutar)

/* ⚠️ Taban ve oran PARAMETRE (varsayılanları config'ten). Sabitleri
   gövdenin içinden okuyan bir fonksiyon test edilemez: gövdeye
   `return 299` yazılsa bile test geçerdi. Parametreli hâlde
   `kuruculUyeFiyati(599)` çağrısı modeli gerçekten sınıyor. */
export const kuruculUyeFiyati = (
  standartFiyat = STANDARD_MONTHLY_PRICE,
  indirimOrani = FOUNDER_DISCOUNT_RATE,
) => fiyatYuvarla(standartFiyat * (1 - indirimOrani))

export const kuruculIndirimYuzdesi = (indirimOrani = FOUNDER_DISCOUNT_RATE) =>
  Math.round(indirimOrani * 100)

export const yillikTutar = (aylikFiyat = kuruculUyeFiyati(), hediyeAy = YEARLY_FREE_MONTHS) =>
  aylikFiyat * (12 - hediyeAy)

export const yillikAylikKarsiligi = () => fiyatYuvarla(yillikTutar() / 12)

export const yillikKazanc = (aylikFiyat = kuruculUyeFiyati(), hediyeAy = YEARLY_FREE_MONTHS) =>
  aylikFiyat * hediyeAy

/*
 * KURUCU ÜYE PROGRAMI — tek plan, üç aşama.
 *   1. ay      ücretsiz
 *   2-4. ay    149 TL/ay  (lansman dönemi)
 *   5. aydan   kurucu üye fiyatı (türetilir)
 */
export const FOUNDER_STAGES = [
  { code: 'free', monthlyPrice: 0, months: 1 },
  { code: 'launch', monthlyPrice: 149, months: 3 },
  { code: 'founder', monthlyPrice: kuruculUyeFiyati(), months: null },
]

/**
 * İlk 12 ayın kalem kalem dökümü — arka uçtaki aynısı.
 *
 * 🔴 SAYILAR ELLE YAZILMIYOR, aşamalardan türetiliyor. Ürün sahibinin
 * "rakamlar yanlış" dediği şey aritmetik değil KARŞILAŞTIRILAMAZLIKTI:
 * aşamalar tek tek yazılıyken bile "bir yılda ne ödeyeceğim" sorusu
 * cevapsız kalıyordu.
 *
 * Son aşamanın `months` alanı null (süresiz); ilk yıl için kalan
 * ayları o dolduruyor.
 */
export function ilkYilDokumu(asamalar = FOUNDER_STAGES) {
  const kalemler = []
  let kalan = 12
  for (const asama of asamalar) {
    if (kalan <= 0) break
    const ay = asama.months === null ? kalan : Math.min(asama.months, kalan)
    kalemler.push({ kod: asama.code, ay, aylik: asama.monthlyPrice, tutar: ay * asama.monthlyPrice })
    kalan -= ay
  }
  return kalemler
}

export function ilkYilToplami(asamalar = FOUNDER_STAGES) {
  return ilkYilDokumu(asamalar).reduce((toplam, k) => toplam + k.tutar, 0)
}

export const ilkUcretliTutar = () =>
  FOUNDER_STAGES.find(s => s.monthlyPrice > 0)?.monthlyPrice ?? 0

/* "5. aydan itibaren" ifadesi buradan üretiliyor; elle sayı yazmak
   aşama süreleri değişince yalan olurdu. */
export function nihaiFiyataGecisAyi() {
  let ay = 1
  for (const asama of FOUNDER_STAGES) {
    if (asama.months === null) return ay
    ay += asama.months
  }
  return ay
}

/*
 * Para biçimi — tek yerden, kuruş gösterilmiyor.
 *
 * ⚠️ Bu dosya HİÇBİR ŞEY import ETMEZ ve etmemeli.
 * `tests/billing-config-drift.test.ts` bu modülü arka uç vitest
 * bağlamında yüklüyor; orada `@/` takma adı çözülmüyor. Buraya
 * `getFormatLocale` importu eklendiği an sapma testi "modül
 * yüklenemedi" diye düşer ve iki config sessizce ayrışmaya başlar.
 *
 * `locale` bu yüzden çağıran tarafından geçiliyor (hepsi
 * `i18n.resolvedLanguage` veriyor); buradaki değer yalnız güvenlik ağı.
 */
export function fiyatYaz(tutar, locale = 'tr-TR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: BILLING_CURRENCY,
    maximumFractionDigits: 0,
  }).format(tutar)
}
