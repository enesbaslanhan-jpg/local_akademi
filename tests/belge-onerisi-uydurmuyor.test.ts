import { describe, it, expect } from 'vitest'
import { buildDocumentSuggestion } from '../src/services/document-suggestions.js'

/*
 * 🔴 BELGE ÖNERİSİ UYDURMAMALI.
 *
 * Ürün sahibi gerçek bir banka hesap cüzdanı PDF'i yükledi (10.09.2026).
 * Sistem onu şu hâle getirdi:
 *
 *   Tür: SENET · Yön: Ödenecek (borç) · Tutar: ₺0,00
 *   Vade: 31.08.2026 (geçmiş) · Öncelik: yüksek · %80 güvenilir
 *
 * Üç ayrı sebep üst üste bindi:
 *   1. 'vade tarihi' senet kuralındaydı ve kural listenin ilkiydi
 *   2. Etiketli tarih yoksa belgedeki İLK tarih vade sayılıyordu
 *   3. Tutar okunamasa bile öneri üretiliyordu
 *
 * Bu dosya üçünü de kilitliyor. Kod tabanının kendi ilkesi: okunamayan
 * bir değeri tahmin etmek, boş bırakmaktan kötüdür.
 */

function belge(metin: string, ekstra: Record<string, unknown> = {}) {
  return {
    originalName: 'Dijital Hesap Cüzdanı.pdf',
    extractedText: metin,
    category: null,
    dueDate: null,
    eFatura: null,
    ...ekstra
  } as any
}

describe('belge önerisi uydurmuyor', () => {
  it('"vade tarihi" geçen belge SENET sayılmıyor', () => {
    /* Banka cüzdanının tipik metni: vadeli hesap satırı var. */
    const oneri = buildDocumentSuggestion(belge(
      'DİJİTAL HESAP CÜZDANI\nVadeli hesap · vade tarihi 31.08.2026\nBakiye bilgisi'
    ))
    /* Ya hiç öneri çıkmamalı ya da senet olmamalı. */
    expect(oneri?.payload.type).not.toBe('promissory_note')
  })

  it('tutar okunamayan para kaydı önerilmiyor', () => {
    /* "fatura" kelimesi geçiyor ama okunabilir bir tutar yok. */
    const oneri = buildDocumentSuggestion(belge(
      'Fatura özeti\nson ödeme 30.11.2026\nDetaylar ekte'
    ))
    /* ₺0,00'lık bir borç kaydı bilgi değil gürültüdür. */
    expect(oneri).toBeNull()
  })

  it('etiketsiz tarih vade sayılmıyor', () => {
    /* Metinde tarih var ama hiçbiri vade etiketli değil. */
    const oneri = buildDocumentSuggestion(belge(
      'Hesap hareketleri\n05.01.2026 devir\n17.03.2026 havale\nTutar 1.250,00 TL fatura'
    ))
    expect(oneri).not.toBeNull()
    /* Vade uydurulmuyor; kullanıcı girsin diye boş bırakılıyor. */
    expect(oneri!.payload.dueAt).toBeNull()
  })

  it('hiçbir somut veri yoksa öneri çıkmıyor', () => {
    const oneri = buildDocumentSuggestion(belge('Kargo teslimat bilgilendirmesi'))
    expect(oneri).toBeNull()
  })

  /*
   * Düzeltmenin ürünü işlevsiz bırakmadığı da kanıtlanmalı: gerçek
   * kanıt varken öneri HÂLÂ çıkıyor.
   */
  it('tutar ve etiketli vade varken öneri çıkıyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'Tedarikçi faturası\nTutar 12.500,00 TL\nson ödeme 30.11.2026'
    ))
    expect(oneri).not.toBeNull()
    expect(oneri!.payload.amount).toBe(12500)
    expect(oneri!.payload.dueAt).toBeTruthy()
  })

  it('güven, tek anahtar kelimeyle yüksek çıkmıyor', () => {
    const zayif = buildDocumentSuggestion(belge(
      'Hesap özeti\nTutar 100,00 TL fatura'
    ))
    const guclu = buildDocumentSuggestion(belge(
      'Tedarikçi faturası\nTutar 12.500,00 TL\nson ödeme 30.11.2026'
    ))
    expect(zayif).not.toBeNull()
    /* Tarihi olmayan zayıf kanıt, tam kanıttan DÜŞÜK güven almalı. */
    expect(zayif!.confidence).toBeLessThan(guclu!.confidence)
    /* Ve ekranda "%80 güvenilir" diye görünmemeli. */
    expect(zayif!.confidence).toBeLessThan(0.75)
  })
})
