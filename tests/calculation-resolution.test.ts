import { describe, expect, it } from 'vitest'
// @ts-expect-error — düz JS yardımcı modülü, tip tanımı yok
import { resolveCalculation } from '../frontend/src/utils/canonicalContent.js'
// @ts-expect-error — düz JS veri modülü
import { CALCULATION_DEFINITIONS } from '../frontend/src/data/calculationCatalog.js'

/**
 * Ders içindeki hesaplama etiketlerinin katalogla eşleştirilmesi.
 *
 * İKİ GERÇEK HATA buradan çıktı:
 *
 * 1. "Güvenlik Marjı" → "Kâr ve Kâr Marjı" hesaplamasına bağlanıyordu.
 *    Güvenlik marjı başa baş noktasına uzaklıktır; kâr marjı bambaşka bir
 *    şey. Kullanıcı alakasız bir hesaplamaya götürülüyordu.
 *
 * 2. Kök sebep: `normalize` inceltme işaretli harfleri (â, î, û)
 *    eşlemiyordu. "Kâr" → "k r" oluyor, iki parça da uzunluk filtresine
 *    takılıp siliniyor ve "Kâr ve Kâr Marjı" başlığı yalnız ["marji"]
 *    kalıyordu. Bu yüzden DOĞRU eşleşme ("Brüt Kâr Marjı") ile YANLIŞ
 *    eşleşme ("Güvenlik Marjı") matcher'a birebir aynı görünüyordu.
 */

function coz(etiket: string) {
  return resolveCalculation(etiket, CALCULATION_DEFINITIONS)
}

describe('Türkçe normalleştirme', () => {
  it('inceltme işaretli "Kâr" kelimesi kaybolmuyor', () => {
    /* Kaybolsaydı bu etiket hiçbir şeye çözülemezdi. */
    const r = coz('Kâr Marjı')
    expect(r.status).toBe('FOUND')
    expect(r.definition.id).toBe('profit-margin')
  })

  it('inceltmesiz yazım da aynı sonuca çözülür', () => {
    expect(coz('Kar Marjı').definition?.id).toBe('profit-margin')
  })
})

describe('yanlış eşleşme engellendi', () => {
  it('"Güvenlik Marjı" kâr marjına BAĞLANMAZ', () => {
    /* Asıl hata buydu: tek kelime ("marjı") örtüşmesi yeterli sayılıyordu. */
    const r = coz('Güvenlik Marjı')
    expect(r.definition).toBeNull()
    expect(r.status).toBe('AMBIGUOUS')
  })

  it('tek kelimelik rastlantı eşleşmesi FOUND dönmez', () => {
    /* Etiket başka hiçbir şeye benzemediğinde "fark" büyük çıkıyor ve
       eski kural bunu kendinden emin eşleşme sanıyordu. */
    const r = coz('Personel Devir Marjı')
    expect(r.status).not.toBe('FOUND')
  })

  it('gerçekten belirsiz etiket CTA üretmez', () => {
    /* "Nakit Dönüşüm Süresi" iki farklı hesaplamaya eşit yakınlıkta. */
    expect(coz('Nakit Dönüşüm Süresi').definition).toBeNull()
  })
})

describe('doğru eşleşmeler korundu', () => {
  it('katalogdaki her hesaplama kendi adıyla bulunur', () => {
    const kayip: string[] = []
    for (const d of CALCULATION_DEFINITIONS) {
      const r = coz(d.title)
      if (r.status !== 'FOUND' || r.definition?.id !== d.id) {
        kayip.push(`${d.id} → ${r.status}`)
      }
    }
    /* `cac-payback` bilinçli olarak dışlanıyor (PAYBACK_EXCLUDES_CAC):
       genel "geri ödeme" etiketleri müşteri edinme metriğine bağlanmasın
       diye. Bu davranış bu değişiklikten ÖNCE de vardı. */
    expect(kayip).toEqual(['cac-payback → MISSING'])
  })

  it('çok kelimeli doğru eşleşme çalışır', () => {
    expect(coz('Brüt Kâr Marjı').definition?.id).toBe('profit-margin')
    expect(coz('Müşteri Yaşam Boyu Değeri').definition?.id).toBe('customer-lifetime-value')
    expect(coz('Stok Devir Hızı').definition?.id).toBe('inventory-turnover-dio')
  })

  it('kısaltma alt küme kuralı korundu', () => {
    /* "ROI" ⊂ "Yatırım Getirisi (ROI)" — tek kelime ama alt küme. */
    expect(coz('ROI').definition?.id).toBe('roi')
  })
})

describe('aynı hesaplamaya çözülen farklı etiketler', () => {
  it('iki farklı etiket aynı tanımı döndürür', () => {
    /*
     * Arayüzdeki tekrarın kaynağı: bu iki etiket AYNI hesaplamaya
     * çözülüyor. Çözümleyici doğru çalışıyor; tekilleştirmenin etiket
     * yerine tanım id'sine göre yapılması gerekiyordu —
     * `CanonicalLessonSections.jsx` içinde düzeltildi.
     */
    const a = coz('Başa Baş Satış Adedi')
    const b = coz('Başa Baş Noktası')
    expect(a.definition?.id).toBe('break-even-quantity')
    expect(b.definition?.id).toBe(a.definition?.id)
  })
})
