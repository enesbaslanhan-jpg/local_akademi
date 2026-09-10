/*
 * CARİ HESAP — bir kişiyle olan para ilişkisinin özeti.
 *
 * 🔴 NEDEN VAR: "Ahmet'e ne kadar borcum var?" sorusunun cevabı üründe
 * hiçbir yerde yoktu. Kişi kartı ad/telefon/şehir gösteriyordu; kayıtlar
 * kişiye bağlanabiliyordu ama toplanmıyordu. Bir esnafın defterinde ilk
 * baktığı sayı budur.
 *
 * ✅ Şema değişikliği GEREKMEDİ: `BusinessContact.records` ilişkisi zaten
 * vardı. Eksik olan toplama ve gösterme.
 *
 * 🔴 PARA BİRİMLERİ TOPLANMIYOR.
 *
 * Kayıtların `currency` alanı var ve farklı olabiliyor. 5.000 TL borç ile
 * 200 USD alacağı tek sayıda toplamak uydurma bir rakam üretirdi -- kur
 * bilgisi sistemde YOK ve olsa bile hangi günün kuru olduğu ayrı bir
 * karar. Bu yüzden bakiye para birimi başına ayrı hesaplanıyor.
 */

/** Bakiyeye giren kayıt: kapanmamış olanlar. */
const ACIK_DURUMLAR = new Set(['open', 'in_progress', 'deferred'])

export type CariKayit = {
  direction: string
  status: string
  amount: number | null
  currency: string
}

export type CariBakiye = {
  currency: string
  /** Bizden alacağı (receivable) */
  alacak: number
  /** Ona borcumuz (payable) */
  borc: number
  /** alacak − borç. Pozitifse bizden alacaklı. */
  bakiye: number
}

/**
 * Kişiyle olan açık hesabı para birimi başına çıkarır.
 *
 * ⚠️ Yalnız KAPANMAMIŞ kayıtlar sayılıyor: tamamlanan bir ödeme artık
 * borç değildir. İptal edilen de öyle.
 *
 * ⚠️ `neutral` yönlü kayıtlar (görev, sevkiyat) hesaba GİRMİYOR: onların
 * bir borç/alacak anlamı yok. Tutarı olsa bile.
 *
 * ⚠️ Tutarı olmayan kayıt atlanıyor, sıfır sayılmıyor -- ikisi aynı şey
 * değil ve sıfır saymak "bu kalem yok" demek olurdu.
 */
export function cariBakiye(kayitlar: CariKayit[]): CariBakiye[] {
  const paraBirimine: Map<string, CariBakiye> = new Map()

  for (const kayit of kayitlar) {
    if (!ACIK_DURUMLAR.has(kayit.status)) continue
    if (kayit.direction !== 'receivable' && kayit.direction !== 'payable') continue
    if (kayit.amount === null || kayit.amount === undefined) continue
    const tutar = Number(kayit.amount)
    if (!Number.isFinite(tutar)) continue

    const birim = (kayit.currency || 'TRY').toUpperCase()
    const mevcut = paraBirimine.get(birim) ?? { currency: birim, alacak: 0, borc: 0, bakiye: 0 }
    if (kayit.direction === 'receivable') mevcut.alacak += tutar
    else mevcut.borc += tutar
    mevcut.bakiye = mevcut.alacak - mevcut.borc
    paraBirimine.set(birim, mevcut)
  }

  /* Tutarı en büyük olan başta: ekranda ilk görünen, en çok anlamı olan. */
  return [...paraBirimine.values()].sort(
    (a, b) => Math.abs(b.bakiye) - Math.abs(a.bakiye)
  )
}

/**
 * Listede tek satırda gösterilecek bakiye.
 *
 * Kişiler listesinde her para birimi için ayrı sütun açılamaz. İşletmenin
 * kendi para birimi varsa o gösteriliyor; yoksa en büyük bakiye.
 *
 * ⚠️ `digerParaBirimleri` ARAYÜZE TAŞINIYOR: tek sayı gösterip başka
 * para biriminde de hesap olduğunu gizlemek, kullanıcıya eksik bilgi
 * vermek olurdu.
 */
export function listeBakiyesi(
  bakiyeler: CariBakiye[],
  isletmeParaBirimi = 'TRY'
): { birincil: CariBakiye | null; digerParaBirimleri: number } {
  if (bakiyeler.length === 0) return { birincil: null, digerParaBirimleri: 0 }
  const hedef = isletmeParaBirimi.toUpperCase()
  const birincil = bakiyeler.find(b => b.currency === hedef) ?? bakiyeler[0]
  return { birincil, digerParaBirimleri: bakiyeler.length - 1 }
}
