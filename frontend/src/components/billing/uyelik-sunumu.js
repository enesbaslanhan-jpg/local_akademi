import { FOUNDER_STAGES, ilkUcretliTutar, fiyatYaz } from '@/config/billing'

/*
 * ÜYELİK DURUMUNUN SUNUMU — TEK KAYNAK.
 *
 * 🔴 Bu dosya, aynı durumun iki ekranda AYRI AYRI yorumlanmasını
 * engellemek için var. Ürün sahibinin şikâyeti buydu: "şu an denemede,
 * mesela o belli olsun" — durum sunucuda hesaplanıyordu ama arayüzde
 * yalnız Ayarlar'ın derinlerinde, üstelik her dal kendi metnini
 * uydurarak görünüyordu.
 *
 * Şimdi hem Ayarlar → Üyelik kartı hem Ana Sayfa şeridi buradan
 * okuyor. Biri değişip diğeri unutulamaz.
 *
 * ⚠️ METİN DEĞİL, i18n ANAHTARI döner. Çeviri json'da kalmalı;
 * buraya Türkçe cümle gömmek `check-i18n`i atlatır ve İngilizce
 * arayüzde Türkçe metin bırakırdı — depo bu hatayı bir kez yaptı.
 *
 * ⚠️ SAF: `simdi` ve `locale` parametre, `Date.now()` gövdeden
 * okunmuyor. Deneme sayacının test edilebilmesi buna bağlı.
 */

/** Durum → ton. Ton hem noktanın rengi hem şeridin vurgusu. */
export const UYELIK_TONU = {
  billing_not_started: 'sakin',
  trial: 'bilgi',
  active: 'iyi',
  expired: 'uyari',
}

/**
 * Sonraki tahsilat tarihini yerelleştirilmiş kısa biçimde yazar.
 * Tarih yoksa `null` döner — çağıran yerine tire koyar.
 */
export function tarihYaz(iso, locale = 'tr-TR') {
  if (!iso) return null
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return null
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(t)
}

/**
 * Üyelik durumunu ekranların ortak diline çevirir.
 *
 * @param membership Sunucudan gelen `user.membership`.
 * @returns Ton, başlık/alt metin anahtarları, iki ölçü ve birincil eylem.
 */
export function uyelikSunumu(membership, { locale = 'tr-TR' } = {}) {
  const durum = membership?.state ?? 'billing_not_started'
  const ton = UYELIK_TONU[durum] ?? 'sakin'

  /* Fiyatlar config'ten türetiliyor; elle yazılan sayı YOK. Standart
     fiyat ya da indirim oranı değişince burası kendiliğinden düzelir. */
  const lansman = FOUNDER_STAGES.find(s => s.code === 'launch')
  const ilkTutar = fiyatYaz(ilkUcretliTutar(), locale)
  const aylikUcret = fiyatYaz(lansman.monthlyPrice, locale)
  const sifir = fiyatYaz(0, locale)

  const temel = {
    durum,
    ton,
    rozetVar: !!membership?.founder,
    /*
     * Fatura ve iptal kartları GÖRÜNSÜN MÜ.
     *
     * ⚠️ "Etkin mi" DEĞİL — bugün ikisi de her durumda devre dışı,
     * çünkü uçları yok. Burada sorulan şey başka: ücretlendirme hiç
     * başlamamışken iptal edilecek bir üyelik ve görüntülenecek bir
     * fatura YOK, o yüzden kartlar hiç çizilmiyor. Devre dışı bir
     * "üyeliği iptal et", olmayan bir üyeliği ima ederdi.
     */
    uyelikVar: durum !== 'billing_not_started',
  }

  if (durum === 'trial') {
    const kalan = membership?.trialDaysLeft ?? 0
    const tarih = tarihYaz(membership?.trialEndsAt, locale)
    return {
      ...temel,
      baslik: { anahtar: 'billing.durum.trial.baslik' },
      alt: { anahtar: 'billing.durum.trial.alt', degerler: { count: kalan } },
      sol: { etiket: 'billing.durum.olcu.bugunOdedigin', deger: sifir },
      sag: {
        etiket: 'billing.durum.olcu.ilkTahsilat',
        deger: tarih ? `${tarih} · ${ilkTutar}` : ilkTutar,
      },
      birincil: { anahtar: 'billing.durum.eylem.uyeligiBaslat', hedef: 'odeme' },
      planBaslik: 'billing.durum.plan.bundanSonra',
      planNotu: 'billing.durum.plan.denemeNotu',
      faturaNotu: 'billing.durum.fatura.henuzYok',
    }
  }

  if (durum === 'active') {
    /* ⚠️ Sonraki tahsilat tarihi UYDURULMUYOR. Sunucu bugün bu alanı
       göndermiyor; olmayan bir tarihi yazmak, kullanıcıya yanlış gün
       söylemek olurdu. Alan gelince kendiliğinden dolar. */
    const tarih = tarihYaz(membership?.currentPeriodEnd, locale)
    return {
      ...temel,
      baslik: { anahtar: 'billing.durum.active.baslik' },
      alt: { anahtar: 'billing.durum.active.alt' },
      sol: { etiket: 'billing.durum.olcu.aylikUcretin', deger: aylikUcret },
      sag: {
        etiket: 'billing.durum.olcu.sonrakiTahsilat',
        deger: tarih ? `${tarih} · ${aylikUcret}` : '—',
      },
      birincil: { anahtar: 'billing.settings.managePayment', hedef: 'odeme' },
      planBaslik: 'billing.durum.plan.fiyatNasil',
      /* ⚠️ Var olan anahtar yeniden kullanılıyor: indirim yüzdesi
         `{{percent}}` ile config'ten geliyor. Yeni bir metne "%40"
         yazsaydım, indirim oranı değiştiğinde ekran yalan söylerdi. */
      planNotu: 'billing.settings.lockedPrice',
      faturaNotu: 'billing.durum.fatura.indirebilirsin',
    }
  }

  if (durum === 'expired') {
    return {
      ...temel,
      baslik: { anahtar: 'billing.durum.expired.baslik' },
      alt: { anahtar: 'billing.durum.expired.alt' },
      sol: { etiket: 'billing.durum.olcu.bugunOdedigin', deger: sifir },
      sag: { etiket: 'billing.durum.olcu.erisimIcin', deger: ilkTutar },
      birincil: { anahtar: 'billing.durum.eylem.uyeligiBaslat', hedef: 'odeme' },
      planBaslik: 'billing.durum.plan.bundanSonra',
      planNotu: 'billing.durum.plan.suresiDolduNotu',
      faturaNotu: 'billing.durum.fatura.henuzYok',
    }
  }

  /* billing_not_started — bugünkü hâl. */
  return {
    ...temel,
    baslik: { anahtar: 'billing.settings.freeUse' },
    alt: { anahtar: 'billing.durum.notStarted.alt' },
    sol: { etiket: 'billing.durum.olcu.bugunOdedigin', deger: sifir },
    /* Burada değer bir SAYI değil bir kelime ("Yok"), yani çevrilmeli.
       Bu yüzden `deger` yerine `degerAnahtar`; çağıran ikisinden
       hangisi doluysa onu yazıyor. */
    sag: { etiket: 'billing.durum.olcu.sonrakiTahsilat', degerAnahtar: 'billing.durum.olcu.yok' },
    /* Ücretlendirme kapalıyken "üyeliği başlat" diye bir eylem YOK —
       gösterirsek tıklanınca hiçbir şey olmayan bir düğme olurdu. */
    birincil: { anahtar: 'billing.durum.eylem.fiyatlariIncele', hedef: 'fiyatlar' },
    planBaslik: 'billing.settings.whenItStarts',
    planNotu: 'billing.settings.notifyPromise',
    faturaNotu: 'billing.durum.fatura.henuzYok',
  }
}
