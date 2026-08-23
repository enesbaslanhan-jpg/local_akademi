import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ublFaturasiniAyristir } from '../src/services/e-fatura.js'
import { buildDocumentSuggestion } from '../src/services/document-suggestions.js'

/*
 * e-FATURADAN KAYIT ÖNERİSİ.
 *
 * Buradaki asıl iddia şu: yapılandırılmış fatura varsa sezgisel
 * (metinden tahmin eden) yola HİÇ girilmiyor. Girilseydi XML
 * etiketlerinin arasından `₺` aranır ve okunmuş bir tutarın üstüne
 * tahmin edilmiş bir tutar konurdu.
 */

const oku = (ad: string) => readFileSync(join(__dirname, 'fixtures', 'ubl', ad), 'utf-8')
const belge = (ad: string) => ({
  originalName: ad,
  extractedText: oku(ad),
  category: null,
  dueDate: null,
  eFatura: ublFaturasiniAyristir(oku(ad))
})

describe('e-Faturadan öneri', () => {
  it('tutar ve para birimi faturadan okunur, tahmin edilmez', () => {
    const o = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), '1234567890')!
    expect(o.payload.amount).toBe(17.88)
    expect(o.payload.currency).toBe('TRY')
    expect(o.confidence).toBe(1)
  })

  /* Sezgisel yol 0.95'i geçemiyor; fark bilinçli. */
  it('yapılandırılmış okuma sezgisel tahminden yüksek güven taşır', () => {
    const yapilandirilmis = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), '1234567890')!
    const sezgisel = buildDocumentSuggestion({
      originalName: 'fatura.pdf',
      extractedText: 'Fatura toplam 1.234,56 TL son ödeme 01.09.2026',
      category: 'invoice',
      dueDate: null
    })!
    expect(yapilandirilmis.confidence).toBe(1)
    expect(sezgisel.confidence).toBeLessThan(1)
  })

  it('alıcı bizsek borç kaydı önerilir', () => {
    const o = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), '1234567890')!
    expect(o.payload.direction).toBe('payable')
    expect(o.payload.title).toContain('AAA Anonim Şirketi')
  })

  it('satıcı bizsek alacak kaydı önerilir ve karşı taraf alıcı olur', () => {
    const o = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), '1288331521')!
    expect(o.payload.direction).toBe('receivable')
    expect(o.payload.title).toContain('Ali YILMAZ')
  })

  /*
   * 🔴 EN ÖNEMLİ DAVRANIŞ. Vergi numarası girilmemişse ya da hiçbir
   * tarafla eşleşmiyorsa yön uydurulmuyor; kullanıcıya ne yapması
   * gerektiği yazılıyor.
   */
  it('vergi numarası yoksa yön uydurulmaz, kullanıcı yönlendirilir', () => {
    const o = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), null)!
    expect(o.payload.direction).toBe('neutral')
    expect(o.payload.description).toContain('vergi numaranızı')
    expect(o.evidence.join(' ')).toContain('Yön belirlenemedi')
  })

  /* Vade örneklerin %86'sında yok; olmayan vade uydurulmamalı. */
  it('vadesiz faturada dueAt boş kalır', () => {
    const o = buildDocumentSuggestion(belge('OZELMATRAH.xml'), null)!
    expect(o.payload.dueAt).toBeNull()
  })

  it('vadeli faturada vade taşınır', () => {
    const o = buildDocumentSuggestion(belge('TicariFaturaOrnegi.xml'), null)!
    expect(o.payload.dueAt).toContain('2008-11-25')
  })

  /* Yabancı para birimi TRY'ye çevrilmiyor, olduğu gibi taşınıyor. */
  it('USD fatura TRY sayılmaz', () => {
    const o = buildDocumentSuggestion(belge('ISTISNA-1.xml'), null)!
    expect(o.payload.currency).toBe('USD')
    expect(o.payload.amount).toBe(26475)
  })

  it('kanıt listesi faturanın kendi alanlarını gösterir', () => {
    const o = buildDocumentSuggestion(belge('TemelFaturaOrnegi.xml'), '1234567890')!
    const kanit = o.evidence.join(' | ')
    expect(kanit).toContain('GIB20090000000001')
    expect(kanit).toContain('17.88 TRY')
    expect(kanit).toContain('VKN 1288331521')
  })
})
