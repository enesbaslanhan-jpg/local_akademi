import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { alanlardanOneri, belgeAlanlariniCikar } from '../src/services/belge-anlama.js'
import { buildDocumentSuggestionAi, type RecordSuggestionPayload } from '../src/services/document-suggestions.js'

/*
 * Belge anlama katmanı: model çıktısının öneriye çevrilmesi ve model
 * YOKKEN sezgisel yolun aynen çalışması. Modelin kendisi burada
 * ÇAĞRILMAZ (ağ, maliyet, kararsızlık); BELGE_ANLAMA_KAPALI=1 ile kapı
 * kapatılır ve yedek yolun bozulmadığı sınanır. Canlı örnekler için bkz.
 * belge-anlama.ts başındaki not (BİM 135 ₺, kafe fişi 345 ₺).
 */

const taban: RecordSuggestionPayload = {
  type: 'payment', title: 'fotograf 123', description: '', direction: 'payable',
  amount: null, currency: 'TRY', dueAt: null, priority: 'normal',
}

describe('alanlardanOneri', () => {
  it('fiş: tutar, tarih, satıcı ve ödenmiş durumu öneriye geçer', () => {
    const p = alanlardanOneri({
      belge_turu: 'fis', toplam_tutar: 345, para_birimi: 'TRY', tarih: '2026-09-20', son_odeme_tarihi: null,
      satici: 'Kafe X', yon: 'odeme', odenmis_mi: true, guven: 0.95, gerekce: 'TOPLAM 345,00 TL',
    }, taban, 'fotograf-1.jpg')
    expect(p.amount).toBe(345)
    expect(p.direction).toBe('payable')
    expect(p.type).toBe('payment')
    expect(p.status).toBe('completed')
    expect(p.title).toBe('Kafe X · 20.09.2026')
    expect(p.dueAt).toBeNull()
    expect(p.description).toContain('TOPLAM 345,00 TL')
  })

  it('ekstre: dönem borcu + son ödeme tarihi vade olur, ödenmemiş', () => {
    const p = alanlardanOneri({
      belge_turu: 'ekstre', toplam_tutar: 3614.33, para_birimi: 'TRY', tarih: '2026-07-31', son_odeme_tarihi: '2026-08-10',
      satici: 'VakıfBank', yon: 'odeme', odenmis_mi: false, guven: 0.9, gerekce: 'Dönem Borcunuz 3,614.33',
    }, taban, 'ekstre.pdf')
    expect(p.amount).toBe(3614.33)
    expect(p.dueAt).toBe('2026-08-10T12:00:00.000Z')
    expect(p.status).toBeUndefined()
  })

  it('tahsilat yönü türü receivable yapar; senet/çek türü korunur', () => {
    const t = alanlardanOneri({ belge_turu: 'fatura', toplam_tutar: 1000, para_birimi: 'TRY', tarih: null, son_odeme_tarihi: null, satici: null, yon: 'tahsilat', odenmis_mi: null, guven: 0.8, gerekce: null }, taban, 'f.pdf')
    expect(t.type).toBe('receivable'); expect(t.direction).toBe('receivable')
    const s = alanlardanOneri({ belge_turu: 'senet', toplam_tutar: 5000, para_birimi: null, tarih: null, son_odeme_tarihi: '2026-12-01', satici: null, yon: 'odeme', odenmis_mi: false, guven: 0.8, gerekce: null }, taban, 's.pdf')
    expect(s.type).toBe('promissory_note'); expect(s.currency).toBe('TRY')
  })

  it('model vermediği alanda sezgiselin değeri kalır', () => {
    const p = alanlardanOneri({ belge_turu: null, toplam_tutar: 12, para_birimi: null, tarih: null, son_odeme_tarihi: null, satici: null, yon: null, odenmis_mi: null, guven: 0.7, gerekce: null },
      { ...taban, direction: 'receivable', type: 'receivable', dueAt: '2026-10-01T12:00:00.000Z' }, 'x.jpg')
    expect(p.direction).toBe('receivable'); expect(p.type).toBe('receivable'); expect(p.dueAt).toBe('2026-10-01T12:00:00.000Z'); expect(p.title).toBe('fotograf 123')
  })
})

describe('model kapalıyken', () => {
  const eski = process.env.BELGE_ANLAMA_KAPALI
  beforeAll(() => { process.env.BELGE_ANLAMA_KAPALI = '1' })
  afterAll(() => { if (eski === undefined) delete process.env.BELGE_ANLAMA_KAPALI; else process.env.BELGE_ANLAMA_KAPALI = eski })

  it('belgeAlanlariniCikar null döner, ağa çıkmaz', async () => {
    expect(await belgeAlanlariniCikar('TOPLAM 810,00 TL\nfiş metni uzun olsun burada', {})).toBeNull()
  })

  it('buildDocumentSuggestionAi sezgisel sonucu aynen döner', async () => {
    const belge = { originalName: 'fis.jpg', extractedText: 'FİŞ\nTOPLAM 810,00 TL\n20.09.2026', category: null, dueDate: null }
    const oneri = await buildDocumentSuggestionAi(belge, null)
    expect(oneri).not.toBeNull()
    expect(oneri!.payload.amount).toBe(810)
    expect(oneri!.evidence.some(e => e.startsWith('Yapay zeka'))).toBe(false)
  })

  it('çok kısa metinde hiç denemez', async () => {
    expect(await belgeAlanlariniCikar('kısa', {})).toBeNull()
  })
})
