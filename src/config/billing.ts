/*
 * Üyelik ve ücretlendirmenin TEK KAYNAĞI.
 *
 * Neden ayrı bir config: fiyat, deneme süresi ve kampanya düzeni hem
 * arayüzde (fiyat sayfası, ödeme paneli, ayarlar), hem yasal
 * metinlerde, hem de ileride ödeme akışında kullanılacak. Üç ayrı
 * yerde yazılırsa kaçınılmaz olarak ayrışır ve kullanıcıya gösterilen
 * fiyat ile tahsil edilen tutar farklı olur.
 *
 * 🔴 `BILLING_STARTS_AT` bu dosyanın en önemli satırıdır.
 *
 * `null` olduğu sürece ücretlendirme BAŞLAMAMIŞTIR: hiçbir kullanıcı
 * geri sayım, uyarı, rozet ya da bildirim görmez. Ekranlar yazılı ve
 * test edilmiş durumda bekler.
 *
 * Bunun sebebi deponun daha önce ödediği bir bedel: "Ayarlar → Dil"
 * İngilizce sunuyordu ama arayüz Türkçe kalıyordu; olmayan bir
 * yeteneği vaat etmek yanlış vaat olarak işaretlenip geri alınmak
 * zorunda kaldı.
 *
 * PayTR onayı gelip ödeme akışı çalıştığında buraya tarih yazılır ve
 * bütün üyelik deneyimi tek satırla canlanır.
 */

/** Para birimi — PayTR TRY ile çalışacak. */
export const BILLING_CURRENCY = 'TRY' as const

/**
 * Ücretlendirmenin gerçekten başladığı an (ISO 8601).
 * `null` = henüz başlamadı.
 */
export const BILLING_STARTS_AT: string | null = null

/** Ücretsiz deneme uzunluğu (gün). */
export const TRIAL_DAYS = 30

/**
 * Deneme bitimine kaç gün kala uyarı üretilsin.
 * Daha erken uyarmak, henüz karar vermesi gerekmeyen kullanıcıyı
 * rahatsız etmek olurdu.
 */
export const TRIAL_WARNING_DAYS = 7

/* ------------------------------------------------------------------ *
 * FİYAT MODELİ
 * ------------------------------------------------------------------ */

/*
 * 🔴 STANDART FİYAT — kurucu indiriminin ÖLÇÜLDÜĞÜ taban.
 *
 * Fiyatlar sayfasında GÖSTERİLMİYOR: ürün sahibi üstü çizili
 * "₺499 → ₺299" e-ticaret dilini bilerek reddetti. Ama sayı burada
 * bulunmak ZORUNDA, çünkü kurucu üyeye verilen taahhüt bir yüzde:
 * "standart fiyatın hep %40 altı". Tabanı yazmadan bu cümle
 * doğrulanamaz ve abonelik sözleşmesinde ölçülemez bir vaat olur.
 */
export const STANDARD_MONTHLY_PRICE = 499

/*
 * 🔴 KURUCU ÜYE İNDİRİMİ — kalıcı ve ORANSAL (ürün sahibi kararı,
 * 28.08.2026).
 *
 * Bu, 27.08.2026'nın "299 TL sonsuza dek sabit" kararının yerine
 * geçer. Fiyat artık dondurulmuyor; standart fiyata BAĞLANIYOR.
 * Standart fiyat yükselirse kurucu fiyat da yükselir — ama her zaman
 * aynı oranda altında kalır. Kurucu üye "zamdan muaf" değil, "zamdan
 * diğerlerine göre daha az etkilenen"dir.
 *
 * Bu ayrım abonelik sözleşmesine aynen bu şekilde yazılacak; iki
 * ifade birbirinden ayrışırsa yanlış beyan olur.
 */
export const FOUNDER_DISCOUNT_RATE = 0.4

/**
 * Yıllık peşin ödemede kaç ay hediye.
 * 12 ay yerine 10 ay ödenir.
 */
export const YEARLY_FREE_MONTHS = 2

/** Tahsilat dönemi — kullanıcı seçer (ürün sahibi kararı, 28.08.2026). */
export type RenewalPeriod = 'monthly' | 'yearly'

/*
 * Yuvarlama TEK YERDE.
 *
 * 499 × 0.6 = 299.4. Bugün 299 TL çıkıyor ama standart fiyat
 * değiştiğinde başka bir kuruş çıkacak. İki ayrı yerde yuvarlanırsa
 * ekranda 299, tahsilatta 299,40 görünür — kullanıcı açısından bu bir
 * hata değil, güven kaybıdır.
 */
export function fiyatYuvarla(tutar: number): number {
  return Math.round(tutar)
}

/**
 * Nihai kurucu üye aylık fiyatı — TÜRETİLİR, elle yazılmaz.
 *
 * ⚠️ Taban ve oran PARAMETRE, varsayılanları config'ten geliyor.
 * Aynı desen `hesaplaUyelikDurumu`da da var ve sebebi aynı: sabitleri
 * gövdenin içinden okuyan bir fonksiyon TEST EDİLEMEZ. İlk sürümde
 * öyleydi ve yazdığım test hiçbir şey korumuyordu — gövdeye
 * `return 299` yazsam test yine geçiyordu, çünkü beklenen değeri de
 * aynı sabitlerden hesaplıyordum. Parametreli hâlde `kuruculUyeFiyati(599)`
 * çağrısı 359 dönmezse test düşer.
 */
export function kuruculUyeFiyati(
  standartFiyat: number = STANDARD_MONTHLY_PRICE,
  indirimOrani: number = FOUNDER_DISCOUNT_RATE
): number {
  return fiyatYuvarla(standartFiyat * (1 - indirimOrani))
}

/** İndirimin yüzde karşılığı — arayüzde "%40" olarak yazılır. */
export function kuruculIndirimYuzdesi(indirimOrani: number = FOUNDER_DISCOUNT_RATE): number {
  return Math.round(indirimOrani * 100)
}

/** Yıllık peşin toplam tutar. */
export function yillikTutar(
  aylikFiyat: number = kuruculUyeFiyati(),
  hediyeAy: number = YEARLY_FREE_MONTHS
): number {
  return aylikFiyat * (12 - hediyeAy)
}

/** Yıllık ödemenin aylığa düşen karşılığı — karşılaştırma için. */
export function yillikAylikKarsiligi(): number {
  return fiyatYuvarla(yillikTutar() / 12)
}

/** Yıllık ödemede yılda kazanılan tutar. */
export function yillikKazanc(
  aylikFiyat: number = kuruculUyeFiyati(),
  hediyeAy: number = YEARLY_FREE_MONTHS
): number {
  return aylikFiyat * hediyeAy
}

export interface FounderStage {
  code: 'free' | 'launch' | 'founder'
  /** Bu aşamanın aylık ücreti. */
  monthlyPrice: number
  /** Kaç ay sürdüğü. `null` = süresiz (nihai aşama). */
  months: number | null
}

/*
 * KURUCU ÜYE PROGRAMI — tek plan, üç aşama.
 *
 * Bilerek "üç paket" değil. Klasik SaaS üçlemesi (Başlangıç / Pro /
 * Kurumsal) kullanıcı sayısı ve davranış verisi olmadan uydurma bir
 * bölümleme olurdu; hangi özelliğin hangi pakette olacağını bilecek
 * veri yok. Bunun yerine tek teklif ve zaman çizgisi:
 *
 *   1. ay        ücretsiz
 *   2-4. ay      149 TL/ay   (lansman dönemi)
 *   5. aydan     kurucu üye fiyatı
 *
 * ⚠️ Son aşamanın fiyatı SABİT YAZILMAZ, `kuruculUyeFiyati()`den
 * gelir. Buraya 299 yazmak ikinci bir kaynak yaratır ve standart
 * fiyat değiştiğinde sessizce ayrışır.
 */
export const FOUNDER_STAGES: readonly FounderStage[] = [
  { code: 'free', monthlyPrice: 0, months: 1 },
  { code: 'launch', monthlyPrice: 149, months: 3 },
  { code: 'founder', monthlyPrice: kuruculUyeFiyati(), months: null },
]

/**
 * İlk 12 ayın kalem kalem dökümü.
 *
 * 🔴 SAYILAR ELLE YAZILMIYOR — aşamalardan türetiliyor.
 *
 * Ürün sahibinin "rakamlar yanlış" dediği şey aritmetik değil,
 * KARŞILAŞTIRILAMAZLIKTI: aşamalar tek tek yazılıyken bile ziyaretçi
 * "bir yılda ne ödeyeceğim" sorusunu kafasında toplayamıyordu.
 *
 * Son aşamanın `months` alanı `null` (süresiz); ilk yıl için kalan
 * ayları o dolduruyor.
 */
export interface YilKalemi {
  kod: string
  ay: number
  aylik: number
  tutar: number
}

export function ilkYilDokumu(asamalar: readonly FounderStage[] = FOUNDER_STAGES): YilKalemi[] {
  const kalemler: YilKalemi[] = []
  let kalan = 12
  for (const asama of asamalar) {
    if (kalan <= 0) break
    const ay = asama.months === null ? kalan : Math.min(asama.months, kalan)
    kalemler.push({ kod: asama.code, ay, aylik: asama.monthlyPrice, tutar: ay * asama.monthlyPrice })
    kalan -= ay
  }
  return kalemler
}

export function ilkYilToplami(asamalar: readonly FounderStage[] = FOUNDER_STAGES): number {
  return ilkYilDokumu(asamalar).reduce((toplam, k) => toplam + k.tutar, 0)
}

/** İlk ücretli aşamanın aylık tutarı — ödeme panelinde "bugün ödenecek". */
export const ilkUcretliTutar = (): number =>
  FOUNDER_STAGES.find(s => s.monthlyPrice > 0)?.monthlyPrice ?? 0

/**
 * Ücretli dönemin kaçıncı ayında nihai fiyata geçildiği.
 * Ödeme panelinde "5. aydan itibaren" ifadesi buradan üretilir —
 * elle "5" yazmak, aşama süreleri değişince yalan olurdu.
 */
export function nihaiFiyataGecisAyi(): number {
  let ay = 1
  for (const asama of FOUNDER_STAGES) {
    if (asama.months === null) return ay
    ay += asama.months
  }
  return ay
}

/* ------------------------------------------------------------------ *
 * ÜYELİK DURUMU
 * ------------------------------------------------------------------ */

/**
 * Kullanıcının üyelik durumu. Saklanmıyor — türetiliyor.
 *
 * `Subscription` tablosu henüz yok; bu tur yalnız durumu GÖSTERİYOR.
 * Tablo geldiğinde `active` ve `expired` gerçek ödeme kaydından
 * okunacak, arayüz sözleşmesi değişmeyecek.
 */
export type MembershipState =
  /** Ücretlendirme hiç başlamadı. Bugünkü durum. */
  | 'billing_not_started'
  /** Ücretsiz deneme sürüyor. */
  | 'trial'
  /** Deneme bitti, ödeme yok → salt okunur. */
  | 'expired'
  /** Ödemesi güncel. */
  | 'active'

export interface MembershipStatus {
  state: MembershipState
  /** Denemenin bittiği an (ISO). `billing_not_started` iken `null`. */
  trialEndsAt: string | null
  /** Denemeden kalan tam gün. Deneme dışında `null`. */
  trialDaysLeft: number | null
  /** Uyarı eşiğine girildi mi — arayüz bu kararı kendi vermesin. */
  showBanner: boolean
  /**
   * Kurucu üye rozeti gösterilsin mi.
   *
   * ⚠️ `billing_not_started` iken FALSE: ücretlendirme başlamadan
   * herkes "kurucu üye" olamaz, rozet o zaman hiçbir şey ayırt etmez.
   */
  founder: boolean
  /**
   * Ödenmiş dönemin bittiği an (ISO) — yalnız `active` iken dolu.
   *
   * ⚠️ Arayüz "sonraki tahsilat" gününü BURADAN okuyor. Alan boşsa
   * tarih yerine tire yazılır; uydurulmaz.
   */
  currentPeriodEnd: string | null
}

/**
 * `hesaplaUyelikDurumu`nun ihtiyaç duyduğu abonelik alanları.
 *
 * ⚠️ Prisma tipini almıyoruz bilerek: bu dosya `@prisma/client`
 * bağımlılığı taşımıyor ve taşımamalı — testlerin veritabanı
 * kurmadan senaryo kurabilmesi buna bağlı.
 */
export interface AbonelikOzeti {
  status: string
  currentPeriodEnd: Date | string | null
}

const GUN_MS = 24 * 60 * 60 * 1000

/**
 * Üyelik durumunu hesaplar.
 *
 * ⚠️ Deneme başlangıcı `user.createdAt` DEĞİL,
 * `max(createdAt, BILLING_STARTS_AT)`. Aksi hâlde ücretlendirme
 * açıldığı gün, aylar önce kaydolmuş her kullanıcı anında "süresi
 * dolmuş" olurdu. Mevcut kullanıcılar da denemeyi baştan alır.
 */
export function hesaplaUyelikDurumu(
  createdAt: Date,
  simdi: Date = new Date(),
  /* Yapılandırma SON parametre ve varsayılanı config'ten geliyor:
     fonksiyon böylece saf kalıyor ve test modül mock'lamadan
     senaryo kurabiliyor. İlk sürümde sabit doğrudan okunuyordu ve
     test edilemiyordu. */
  ucretlendirmeBaslangici: string | null = BILLING_STARTS_AT,
  /*
   * 🔴 ÖDEME KAYDI. Bu parametre olmadan ÖDEME YAPMAK ÜYELİĞİ AÇMIYORDU.
   *
   * Ölçülen arıza (31.08.2026): PayTR callback'i `Subscription.status`
   * alanını ACTIVE yapıyor ama bu fonksiyon yalnız `createdAt`e
   * bakıyordu ve o satırı okuyan kimse yoktu. Sonuç: kullanıcı öder,
   * para geçer, 30 gün dolunca yine `expired` olur ve salt okunur moda
   * düşerdi. Fonksiyonun kendi yorumu bunu zaten söylüyordu — "tablo
   * gelince burada `active` de dönecek"; tablo geldi, fonksiyon
   * güncellenmemişti.
   *
   * Son parametre ve varsayılanı `null`: mevcut çağrılar bozulmuyor,
   * fonksiyon saf kalıyor ve test veritabanı olmadan senaryo kurabiliyor.
   */
  abonelik: AbonelikOzeti | null = null
): MembershipStatus {
  /*
   * ÖDENMİŞ ÜYELİK HER ŞEYDEN ÖNCE GELİR.
   *
   * Ücretlendirme anahtarından da önce bakılıyor: parası alınmış bir
   * kullanıcıyı, genel anahtar kapalı diye "ücretsiz kullanım"da
   * göstermek yanlış olurdu. Aldığımız parayı ekranda inkâr edemeyiz.
   */
  const donemSonu = abonelik?.currentPeriodEnd ? new Date(abonelik.currentPeriodEnd) : null
  const donemGecerli = donemSonu !== null && !Number.isNaN(donemSonu.getTime()) && donemSonu > simdi

  if (abonelik?.status === 'ACTIVE' && donemGecerli) {
    return {
      state: 'active',
      trialEndsAt: null,
      trialDaysLeft: null,
      showBanner: false,
      founder: true,
      currentPeriodEnd: donemSonu.toISOString(),
    }
  }

  if (!ucretlendirmeBaslangici) {
    return {
      state: 'billing_not_started',
      trialEndsAt: null,
      trialDaysLeft: null,
      showBanner: false,
      founder: false,
      currentPeriodEnd: null,
    }
  }

  const baslangic = new Date(Math.max(createdAt.getTime(), new Date(ucretlendirmeBaslangici).getTime()))
  const bitis = new Date(baslangic.getTime() + TRIAL_DAYS * GUN_MS)
  const kalanGun = Math.ceil((bitis.getTime() - simdi.getTime()) / GUN_MS)

  if (kalanGun > 0) {
    return {
      state: 'trial',
      trialEndsAt: bitis.toISOString(),
      trialDaysLeft: kalanGun,
      showBanner: kalanGun <= TRIAL_WARNING_DAYS,
      founder: true,
      currentPeriodEnd: null,
    }
  }

  /* Deneme bitti ve geçerli bir ödeme yok (varsa yukarıda `active`
     dönmüştük) → salt okunur. */
  return {
    state: 'expired',
    trialEndsAt: bitis.toISOString(),
    trialDaysLeft: 0,
    showBanner: true,
    founder: false,
    currentPeriodEnd: null,
  }
}
