/*
 * FATURA KİMLİK BİLGİSİ — doğrulama ve normalleştirme.
 *
 * Bu modül SAF: veritabanı, istek nesnesi, tarih ya da yapılandırma
 * okumuyor. Sebebi deponun tekrar tekrar ödediği bir bedel — gövdesinin
 * içinden sabit okuyan bir işlev test edilemiyor ve yazdığın test
 * hiçbir şeyi korumuyor.
 *
 * 🔴 KVKK — VERİ EN AZA İNDİRİLİYOR.
 *
 * Burada istenen her alanın tek bir gerekçesi var:
 *   - unvan/ad, adres, il, ilçe, telefon → PayTR token'ı bu alanları
 *     ZORUNLU tutuyor ve fatura için gerekiyor. Bugüne kadar adres ve
 *     telefon yerine "Belirtilmedi" gönderiliyordu.
 *   - VKN + vergi dairesi → kurumsal faturanın olmazsa olmazı.
 *   - TCKN → ürün sahibi kararı (31.08.2026): İSTEĞE BAĞLI. Boş
 *     bırakılırsa fatura nihai tüketici olarak düzenlenir. Herkesten
 *     kimlik numarası istemek, korunması gereken bir veriyi gereksiz
 *     yere toplamak olurdu.
 *
 * 🔴 TCKN VE VKN HİÇBİR YERDE YAYIMLANMAZ. Yalnız fatura için
 * saklanıyor; hiçbir herkese açık yanıtta, günlükte ya da hata
 * mesajında geçmemeli.
 */

export type FaturaTipi = 'INDIVIDUAL' | 'CORPORATE'

export interface FaturaKimligi {
  tip: FaturaTipi
  /** Bireyselde ad soyad, kurumsalda ticari unvan. */
  unvan: string
  tckn: string | null
  vkn: string | null
  vergiDairesi: string | null
  telefon: string
  adres: string
  il: string
  ilce: string
}

export interface DogrulamaSonucu {
  ok: boolean
  /** Alan adı → hata anahtarı. Arayüz bunu alanın altına yazıyor. */
  hatalar: Record<string, string>
  /** Yalnız `ok` iken dolu. */
  deger?: FaturaKimligi
}

const AD_MAX = 140
const ADRES_MAX = 400
const KISA_MAX = 80

/** Baştaki/sondaki boşlukları atar, iç boşlukları teke indirir. */
function duzelt(deger: unknown, max: number): string {
  if (typeof deger !== 'string') return ''
  return deger.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Yalnız rakamları bırakır — kullanıcı boşluk ya da tire yazabilir. */
function sadeceRakam(deger: unknown): string {
  return typeof deger === 'string' ? deger.replace(/\D/g, '') : ''
}

/**
 * T.C. Kimlik Numarası doğrulaması — TAM ALGORİTMA.
 *
 * Kurallar:
 *   - 11 hane, tamamı rakam, ilk hane 0 olamaz
 *   - 10. hane: (tek sıradakilerin toplamı × 7 − çift sıradakilerin
 *     toplamı) mod 10
 *   - 11. hane: ilk 10 hanenin toplamı mod 10
 *
 * ⚠️ Bu algoritma `10000000146` ile elde doğrulandı:
 * tek sıra 1+0+0+0+1 = 2, çift sıra 0, (2×7−0) mod 10 = 4 → 10. hane
 * doğru; ilk on hanenin toplamı 6 → 11. hane doğru. Test o değeri
 * kullanıyor, yani buradaki mantık kendi kendini onaylamıyor.
 */
export function tcknGecerli(deger: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(deger)) return false
  const h = deger.split('').map(Number)

  const tek = h[0] + h[2] + h[4] + h[6] + h[8]
  const cift = h[1] + h[3] + h[5] + h[7]

  if ((tek * 7 - cift) % 10 !== h[9]) return false

  const ilkOn = h.slice(0, 10).reduce((t, x) => t + x, 0)
  return ilkOn % 10 === h[10]
}

/**
 * Vergi Kimlik Numarası doğrulaması — YALNIZ BİÇİM.
 *
 * 🔴 SAĞLAMA (checksum) BİLEREK YAZILMADI.
 *
 * VKN'nin bir kontrol hanesi algoritması var, ama elimde doğruluğunu
 * sınayabileceğim bilinen-geçerli bir örnek yok. Hatırladığım bir
 * formülü yazıp kendi ürettiğim değerlerle test etmek, algoritmanın
 * kendisini değil yalnız kendi tutarlılığını doğrulardı — testi
 * geçen ama gerçek VKN'leri reddeden bir doğrulama, ödeme yapmak
 * isteyen kurumsal müşteriyi kapıda durdurmak demek.
 *
 * Yanlış sağlama, sağlama olmamasından KÖTÜDÜR: biri geçerli
 * numarasını girer, "geçersiz" yazısını görür ve vazgeçer.
 *
 * Bu yüzden bugün 10 hane ve "hepsi aynı rakam değil" aranıyor —
 * yazım hatalarının çoğunu yakalar, hiçbir geçerli numarayı
 * reddetmez. Doğrulanabilir bir örnek elde edildiğinde sağlama
 * eklenecek ve o örnek teste yazılacak.
 */
export function vknGecerli(deger: string): boolean {
  if (!/^[0-9]{10}$/.test(deger)) return false
  /* 0000000000 gibi değerler yazım hatası ya da doldurma. */
  return !/^(\d)\1{9}$/.test(deger)
}

/** Telefon: 10 hane (başındaki 0 ve +90 atılır). */
export function telefonGecerli(rakamlar: string): boolean {
  return /^5[0-9]{9}$/.test(rakamlar) || /^[2-4][0-9]{9}$/.test(rakamlar)
}

/** Kullanıcının yazdığı telefonu 10 haneye indirger. */
export function telefonNormalize(deger: unknown): string {
  let r = sadeceRakam(deger)
  if (r.startsWith('90') && r.length === 12) r = r.slice(2)
  if (r.startsWith('0') && r.length === 11) r = r.slice(1)
  return r
}

/**
 * Ham form gövdesini doğrular ve normalleştirir.
 *
 * Hata anahtarları arayüzde çeviriye çevriliyor; buraya Türkçe cümle
 * yazmak `check-i18n`i atlatır ve İngilizce arayüzde Türkçe metin
 * bırakırdı.
 */
export function faturaKimligiDogrula(govde: Record<string, unknown>): DogrulamaSonucu {
  const hatalar: Record<string, string> = {}

  const tip: FaturaTipi = govde.tip === 'CORPORATE' ? 'CORPORATE' : 'INDIVIDUAL'
  const kurumsal = tip === 'CORPORATE'

  const unvan = duzelt(govde.unvan, AD_MAX)
  if (unvan.length < 2) hatalar.unvan = 'zorunlu'

  const adres = duzelt(govde.adres, ADRES_MAX)
  if (adres.length < 10) hatalar.adres = 'zorunlu'

  const il = duzelt(govde.il, KISA_MAX)
  if (il.length < 2) hatalar.il = 'zorunlu'

  const ilce = duzelt(govde.ilce, KISA_MAX)
  if (ilce.length < 2) hatalar.ilce = 'zorunlu'

  const telefon = telefonNormalize(govde.telefon)
  if (!telefon) hatalar.telefon = 'zorunlu'
  else if (!telefonGecerli(telefon)) hatalar.telefon = 'gecersiz'

  /*
   * 🔴 TCKN İSTEĞE BAĞLI (ürün sahibi kararı). Boşsa hata YOK.
   * Ama YAZILDIYSA doğru olmak zorunda: yanlış bir kimlik numarasını
   * sessizce kaydetmek, hatalı fatura kesmek demek.
   */
  let tckn: string | null = null
  const tcknHam = sadeceRakam(govde.tckn)
  if (tcknHam) {
    if (!tcknGecerli(tcknHam)) hatalar.tckn = 'gecersiz'
    else tckn = tcknHam
  }

  let vkn: string | null = null
  let vergiDairesi: string | null = null

  if (kurumsal) {
    const vknHam = sadeceRakam(govde.vkn)
    if (!vknHam) hatalar.vkn = 'zorunlu'
    else if (!vknGecerli(vknHam)) hatalar.vkn = 'gecersiz'
    else vkn = vknHam

    const daire = duzelt(govde.vergiDairesi, KISA_MAX)
    if (daire.length < 2) hatalar.vergiDairesi = 'zorunlu'
    else vergiDairesi = daire

    /* Kurumsal faturada TCKN'nin yeri yok; gönderilse de saklanmıyor.
       Gereksiz kişisel veri tutmamak için sessizce atılıyor. */
    tckn = null
    if (hatalar.tckn) delete hatalar.tckn
  }

  if (Object.keys(hatalar).length > 0) return { ok: false, hatalar }

  return {
    ok: true,
    hatalar: {},
    deger: { tip, unvan, tckn, vkn, vergiDairesi, telefon, adres, il, ilce },
  }
}

/**
 * PayTR token'ının beklediği tek satırlık adres.
 *
 * PayTR `user_address` alanını zorunlu tutuyor ve tek alan istiyor;
 * bugüne kadar oraya "Belirtilmedi" gidiyordu.
 */
export function paytrAdresi(kimlik: FaturaKimligi): string {
  return [kimlik.adres, kimlik.ilce, kimlik.il].filter(Boolean).join(', ')
}
