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

  /*
   * 🔴 FATURADA İLK TUTAR YANLIŞ TUTARDIR.
   *
   * Faturada ilk geçen para hemen her zaman KDV'siz ara toplamdır;
   * ödenecek olan en altta yazar. Motor ilk tutarı aldığı için HER
   * FATURADA eksik borç kaydediliyordu (10.09.2026'da ölçüldü).
   */
  it('e-faturada ödenecek tutarı alıyor, ara toplamı değil', () => {
    const oneri = buildDocumentSuggestion(belge(
      'e-ARŞİV FATURA\n' +
      'Mal/Hizmet Toplam Tutarı: 12.500,00 TL\n' +
      'Hesaplanan KDV %20: 2.500,00 TL\n' +
      'Ödenecek Tutar: 15.000,00 TL\n' +
      'Son ödeme tarihi: 30.09.2026'
    ))
    expect(oneri).not.toBeNull()
    expect(oneri!.payload.amount).toBe(15000)
  })

  it('kağıt faturada genel toplamı alıyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'FATURA\nÜrün bedeli: 3.200,00 TL\nKDV: 640,00 TL\n' +
      'GENEL TOPLAM: 3.840,00 TL\nSon ödeme: 20.09.2026'
    ))
    expect(oneri!.payload.amount).toBe(3840)
  })

  it('ara toplam, toplam sanılmıyor', () => {
    /* 'toplam' etiketi listenin sonunda ve 'ara toplam' da onu içerir;
       daha spesifik etiket varsa o kazanmalı. */
    const oneri = buildDocumentSuggestion(belge(
      'Fatura\nARA TOPLAM 256,40 TL\nKDV 25,64 TL\nGENEL TOPLAM 282,04 TL\nson ödeme 01.10.2026'
    ))
    expect(oneri!.payload.amount).toBe(282.04)
  })

  it('etiket yoksa tek tutar yine bulunuyor', () => {
    /* Dekont ve fişte etiketli toplam olmayabilir; eski davranış korunuyor. */
    const oneri = buildDocumentSuggestion(belge(
      'HAVALE DEKONTU\nTutar: 5.000,00 TL\nAçıklama: tedarik ödemesi'
    ))
    expect(oneri!.payload.amount).toBe(5000)
  })

  /*
   * Çek eskiden HİÇ tanınmıyordu: 78.500 TL'lik bir çek sessizce
   * görmezden geliniyordu.
   */
  it('çek tanınıyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'ÇEK NO: 0012345\nKeşide tarihi: 20.11.2026\n' +
      'İşbu çek karşılığında 78.500,00 TL ödeyiniz.'
    ))
    expect(oneri).not.toBeNull()
    /* 🔴 Çek ve senet Türkiye'de HUKUKEN farklı: çek görüldüğünde
       ödenir ve karşılıksız çıkması cezai sorumluluk doğurur. İkisini
       tek türde toplamak, kullanıcıya yanlış bir vade algısı verirdi. */
    expect(oneri!.payload.type).toBe('cheque')
    expect(oneri!.payload.amount).toBe(78500)
    /* Vadesi kaçarsa sonucu ağır: senet gibi yüksek öncelikli. */
    expect(oneri!.payload.priority).toBe('high')
  })

  /*
   * 🔴 GEÇMİŞ İŞLEM AÇIK BORÇ DEĞİLDİR.
   *
   * Dekont/makbuz/fiş zaten YAPILMIŞ ödemenin belgesidir. Bunlardan
   * "açık borç" önermek, kullanıcıya ödediği parayı bir daha borç
   * göstermek ve ana sayfadaki geciken sayısını şişirmek demekti.
   */
  it('dekont tamamlanmış olarak öneriliyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'HAVALE DEKONTU\nİşlem tutarı: 3.250,00 TL\nTahsil edildi.',
      { originalName: 'dekont.pdf' }
    ))
    expect(oneri).not.toBeNull()
    /* Öneri KALDIRILMIYOR: harcamanın kaydı tutulmak istenebilir. */
    expect(oneri!.payload.status).toBe('completed')
    /* Olmuş bitmiş işin aciliyeti yok. */
    expect(oneri!.payload.priority).toBe('normal')
  })

  it('market fişi tamamlanmış olarak öneriliyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'FİŞ NO: 004512\nTOPLAM: 842,50 TL\nPara üstü: 157,50 TL',
      { originalName: 'fis.jpg' }
    ))
    expect(oneri!.payload.status).toBe('completed')
  })

  it('vadesi gelmemiş senet açık kalıyor', () => {
    /* Karşı kontrol: her belgeyi tamamlanmış saymıyoruz. */
    const oneri = buildDocumentSuggestion(belge(
      'EMRE MUHARRER SENET\nVade tarihi: 15.12.2026\n' +
      'İşbu senet mukabilinde 45.000,00 TL bedeli malen ahzolunmuştur.'
    ))
    expect(oneri!.payload.status).toBeUndefined()
  })

  it('senet doğru okunuyor', () => {
    const oneri = buildDocumentSuggestion(belge(
      'EMRE MUHARRER SENET\nVade tarihi: 15.12.2026\n' +
      'İşbu senet mukabilinde 45.000,00 TL bedeli malen ahzolunmuştur.'
    ))
    expect(oneri!.payload.type).toBe('promissory_note')
    expect(oneri!.payload.amount).toBe(45000)
    expect(oneri!.payload.dueAt?.slice(0, 10)).toBe('2026-12-15')
  })

  it('kira sözleşmesinden kayıt önerilmiyor', () => {
    /* Sözleşme tek bir kayıt değil, tekrar eden bir yükümlülük. */
    const oneri = buildDocumentSuggestion(belge(
      'KİRA SÖZLEŞMESİ\nAylık kira bedeli: 18.000,00 TL\nBaşlangıç tarihi: 01.01.2026'
    ))
    expect(oneri).toBeNull()
  })
})
