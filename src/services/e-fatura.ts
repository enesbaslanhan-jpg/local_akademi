import { XMLParser } from 'fast-xml-parser'

/*
 * UBL-TR e-FATURA AYRIŞTIRICI.
 *
 * NEDEN BU DOSYA VAR: kullanıcının muhasebe verisinin otomatik gelmesi
 * isteniyordu. Sağlayıcı başına API (Paraşüt, Logo, Zirve, e-ticaret)
 * yerine tek standart seçildi: Türkiye'de e-Fatura/e-Arşiv GİB
 * tarafından zorunlu kılınan UBL-TR XML biçiminde üretiliyor, yani
 * bütün bu programlar AYNI dosyayı çıkarıyor. Tek ayrıştırıcı hepsini
 * okur; ortaklık anlaşması, OAuth ve saklanan şifre gerekmez.
 *
 * 🔴 BURADAKİ ALAN YOLLARI EZBERDEN YAZILMADI. GİB'in resmî
 * `UBL-TR1.2.1_Paketi` içindeki 28 gerçek fatura örneği taranarak
 * çıkarıldı (23.08.2026). Tarama üç şeyi düzeltti:
 *
 *   1. `PaymentDueDate` örneklerin YALNIZ %14'ünde var (4/28). Zorunlu
 *      sayılsaydı faturaların çoğu reddedilirdi. Vade opsiyonel.
 *   2. Kimlik şeması hep `VKN` değil: `TCKN` (gerçek kişi) ve
 *      `MERSISNO` (ticaret sicil) da geçiyor, biri hiç kimlik
 *      taşımıyor.
 *   3. Unvan hep `PartyName` altında değil: gerçek kişide
 *      `Person/FirstName + FamilyName` kullanılıyor.
 *
 * Bir alanı değiştirmeden önce aynı pakete bakılmalı; "muhtemelen
 * böyledir" ile yazılan bir yol sessizce boş sonuç üretir.
 */

/*
 * Kimlik olarak KABUL EDİLEN şemalar.
 *
 * Örneklerde aynı tarafın altında birden çok `PartyIdentification`
 * bulunabiliyor: TCKN'nin yanında `TESISATNO` ve `SAYACNO` (elektrik
 * sayacı numaraları) da var. İlkini almak, kimlik yerine sayaç
 * numarası okumak demekti -- bu yüzden şema adına bakılıyor.
 */
const KIMLIK_SEMALARI = ['VKN', 'TCKN', 'MERSISNO'] as const
export type KimlikTuru = typeof KIMLIK_SEMALARI[number]

export interface UblTaraf {
  unvan: string | null
  kimlik: string | null
  kimlikTuru: KimlikTuru | null
}

export interface UblFatura {
  id: string
  profil: string | null
  faturaTipi: string | null
  /** ISO tarih (YYYY-MM-DD). */
  duzenlemeTarihi: string
  /** Örneklerin %86'sında YOK; null olması olağandır. */
  vadeTarihi: string | null
  paraBirimi: string
  odenecekTutar: number
  kdvHaricTutar: number | null
  satici: UblTaraf
  alici: UblTaraf
}

export class UblAyristirmaHatasi extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UblAyristirmaHatasi'
  }
}

/*
 * `removeNSPrefix` ile `cbc:`/`cac:` önekleri düşüyor -- örneklerde
 * önekler dosyadan dosyaya değişebiliyor, ad alanı aynı kalıyor.
 *
 * `parseTagValue: false` BİLEREK: değerler ham metin kalsın. Otomatik
 * dönüşüm açık olsaydı `VKN` "0123456789" sayıya çevrilip baştaki
 * sıfır kaybolurdu ve kimlik bozulurdu.
 */
const ayristirici = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true
})

function dizi<T>(deger: T | T[] | undefined | null): T[] {
  if (deger === undefined || deger === null) return []
  return Array.isArray(deger) ? deger : [deger]
}

/* Öğe hem düz metin hem `{ '#text': ... }` biçiminde gelebiliyor. */
function metin(deger: unknown): string | null {
  if (typeof deger === 'string') return deger.trim() || null
  if (deger && typeof deger === 'object' && '#text' in (deger as Record<string, unknown>)) {
    const ic = (deger as Record<string, unknown>)['#text']
    return typeof ic === 'string' ? ic.trim() || null : null
  }
  return null
}

/*
 * UBL tutarları HER ZAMAN nokta ondalık ayırıcı kullanır (XML Schema
 * `decimal`). Türkçe yerel ayara göre çevirmek -- virgülü ondalık
 * saymak -- 1.234,56 ile 1234.56'yı karıştırırdı. Bu yüzden yerel
 * ayara duyarlı hiçbir dönüşüm kullanılmıyor.
 */
function tutar(deger: unknown): number | null {
  const ham = metin(deger)
  if (ham === null) return null
  if (!/^-?\d+(\.\d+)?$/.test(ham)) return null
  const sayi = Number(ham)
  return Number.isFinite(sayi) ? sayi : null
}

/* UBL tarihleri `YYYY-MM-DD`. Başka bir biçim gelirse uydurmuyoruz. */
function tarih(deger: unknown): string | null {
  const ham = metin(deger)
  if (ham === null) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(ham) ? ham : null
}

function tarafiOku(dugum: Record<string, any> | undefined): UblTaraf {
  const party = dugum?.Party
  if (!party) return { unvan: null, kimlik: null, kimlikTuru: null }

  /* Kimlik: tanınan şemalar arasından, KIMLIK_SEMALARI sırasına göre. */
  let kimlik: string | null = null
  let kimlikTuru: KimlikTuru | null = null
  const kimlikler = dizi<Record<string, any>>(party.PartyIdentification)
  for (const sema of KIMLIK_SEMALARI) {
    for (const kayit of kimlikler) {
      const id = kayit?.ID
      if (id?.['@schemeID'] === sema) {
        const deger = metin(id)
        if (deger) { kimlik = deger; kimlikTuru = sema; break }
      }
    }
    if (kimlik) break
  }

  /* Unvan: önce tüzel kişi adı, yoksa gerçek kişi ad-soyad. */
  let unvan = metin(dizi<Record<string, any>>(party.PartyName)[0]?.Name)
  if (!unvan) {
    const kisi = dizi<Record<string, any>>(party.Person)[0]
    const ad = metin(kisi?.FirstName)
    const soyad = metin(kisi?.FamilyName)
    const birlesik = [ad, soyad].filter(Boolean).join(' ').trim()
    unvan = birlesik || null
  }

  return { unvan, kimlik, kimlikTuru }
}

/**
 * UBL-TR XML metnini yapılandırılmış faturaya çevirir.
 *
 * Eksik ya da uygunsuz belgede SESSİZCE boş sonuç dönmez, hata
 * fırlatır -- bu bilinçli: yarım okunmuş bir fatura, hiç okunmamış
 * faturadan kötüdür. Kullanıcı "tutar 0 TL" gören bir öneriye
 * güvenemez.
 */
export function ublFaturasiniAyristir(xml: string): UblFatura {
  let agac: Record<string, any>
  try {
    agac = ayristirici.parse(xml)
  } catch {
    throw new UblAyristirmaHatasi('XML ayrıştırılamadı')
  }

  /*
   * 🔴 KÖK ÖĞE KONTROLÜ.
   *
   * GİB paketinde `DespatchAdvice` (irsaliye) ve `ApplicationResponse`
   * (uygulama yanıtı) belgeleri de var; ikisi de geçerli UBL ama
   * FATURA DEĞİL ve tutar taşımıyor. Kullanıcı bunlardan birini
   * e-postayla gönderebilir. Kök öğeye bakılmasaydı bu belgeler
   * "tutarı 0 olan fatura" gibi görünürdü.
   */
  if (!agac?.Invoice) {
    const kok = Object.keys(agac || {}).find(k => !k.startsWith('?')) || 'bilinmiyor'
    if (kok === 'DespatchAdvice') {
      throw new UblAyristirmaHatasi('Bu bir e-İrsaliye; fatura değil')
    }
    if (kok === 'ApplicationResponse' || kok === 'ReceiptAdvice') {
      throw new UblAyristirmaHatasi('Bu bir uygulama yanıtı; fatura değil')
    }
    throw new UblAyristirmaHatasi(`Bu dosya bir UBL faturası değil (kök öğe: ${kok})`)
  }

  const fatura = agac.Invoice as Record<string, any>

  const id = metin(fatura.ID)
  if (!id) throw new UblAyristirmaHatasi('Fatura numarası (ID) bulunamadı')

  const duzenlemeTarihi = tarih(fatura.IssueDate)
  if (!duzenlemeTarihi) throw new UblAyristirmaHatasi('Düzenleme tarihi (IssueDate) okunamadı')

  const toplam = dizi<Record<string, any>>(fatura.LegalMonetaryTotal)[0]
  const odenecekTutar = tutar(toplam?.PayableAmount)
  if (odenecekTutar === null) {
    throw new UblAyristirmaHatasi('Ödenecek tutar (PayableAmount) okunamadı')
  }

  /*
   * Para birimi: önce belgenin kendi alanı, yoksa tutarın üzerindeki
   * `currencyID` özniteliği. İkisi de yoksa TRY VARSAYILMAZ -- yanlış
   * para birimi, yanlış tutar demektir.
   */
  const paraBirimi =
    metin(fatura.DocumentCurrencyCode) ||
    (typeof toplam?.PayableAmount?.['@currencyID'] === 'string'
      ? toplam.PayableAmount['@currencyID']
      : null)
  if (!paraBirimi) throw new UblAyristirmaHatasi('Para birimi okunamadı')

  return {
    id,
    profil: metin(fatura.ProfileID),
    faturaTipi: metin(fatura.InvoiceTypeCode),
    duzenlemeTarihi,
    vadeTarihi: tarih(dizi<Record<string, any>>(fatura.PaymentTerms)[0]?.PaymentDueDate),
    paraBirimi: paraBirimi.toUpperCase(),
    odenecekTutar,
    kdvHaricTutar: tutar(toplam?.TaxExclusiveAmount),
    satici: tarafiOku(dizi<Record<string, any>>(fatura.AccountingSupplierParty)[0]),
    alici: tarafiOku(dizi<Record<string, any>>(fatura.AccountingCustomerParty)[0])
  }
}

/* ---------------- YÖN ---------------- */

/**
 * Faturanın kullanıcı açısından yönü.
 *
 * `payable`  — gelen fatura, kullanıcı ödeyecek (borç)
 * `receivable` — giden fatura, kullanıcı tahsil edecek (alacak)
 * `neutral`  — belirlenemedi; kullanıcıya sorulacak
 */
export type FaturaYonu = 'payable' | 'receivable' | 'neutral'

/*
 * 🔴 EŞLEŞME YOKSA TAHMİN YOK.
 *
 * Aynı XML hem gelen hem giden fatura olabilir; fark, taraflardan
 * hangisinin kullanıcının işletmesi olduğudur. Bunu bilmenin tek
 * güvenilir yolu vergi numarasını karşılaştırmak.
 *
 * "Genelde gelen faturadır" gibi bir varsayım, kullanıcının ALACAĞINI
 * borç olarak yazabilirdi -- işletme takibinde bu, kasada olmayan bir
 * borç görmek demek. Yanlış yön, belirsiz yönden çok daha pahalı.
 * Eşleşme bulunamazsa `neutral` dönüyor ve karar kullanıcıya kalıyor.
 *
 * Numaralar metin olarak karşılaştırılıyor: sayıya çevirmek baştaki
 * sıfırları düşürür ve iki farklı VKN'yi eşit gösterebilirdi.
 */
export function faturaYonu(fatura: UblFatura, isletmeVergiNo: string | null | undefined): FaturaYonu {
  const bizim = (isletmeVergiNo || '').trim()
  if (!bizim) return 'neutral'

  const alici = (fatura.alici.kimlik || '').trim()
  const satici = (fatura.satici.kimlik || '').trim()

  /* Kendine kesilen fatura (GİB örneklerinde var): yön anlamsız. */
  if (alici === bizim && satici === bizim) return 'neutral'
  if (alici === bizim) return 'payable'
  if (satici === bizim) return 'receivable'
  return 'neutral'
}
