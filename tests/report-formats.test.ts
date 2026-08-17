import { describe, expect, it } from 'vitest'
import {
  recordsToCsv,
  recordsToXlsx,
  recordsToPdf,
  keyValueToPdf,
  keyValueToXlsx,
  turkishFontPaths,
  type ExportRecord,
  type ExportMeta
} from '../src/services/report-formats'

/* Türkçe kod noktaları: ş ı ğ İ Ş ç ü Ö ve ₺.
   Kaynak dosya kodlamasına güvenmemek için kod noktasından kuruluyor. */
const TR_CODEPOINTS = [0x15F, 0x131, 0x11F, 0x130, 0x15E, 0xE7, 0xFC, 0xD6, 0x20BA]
const TR_TEXT = `Şişli ığdır Öğüt çağrı ÜÇ İstanbul ${String.fromCodePoint(0x20BA)}`

const meta: ExportMeta = {
  workspaceName: TR_TEXT,
  generatedAt: new Date('2026-08-17T10:00:00.000Z'),
  generatedBy: 'Şeyma Çağrı',
  filterSummary: 'Kategori: Ödeme'
}

function record(over: Partial<ExportRecord> = {}): ExportRecord {
  return {
    id: 'r1',
    type: 'payment',
    status: 'open',
    direction: 'payable',
    title: TR_TEXT,
    contactName: 'Şişli Tedarik A.Ş.',
    amount: 1234.56,
    currency: 'TRY',
    dueAt: new Date('2026-09-01T00:00:00.000Z'),
    completedAt: null,
    documentCount: 2,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    ...over
  }
}

describe('turkishFontPaths', () => {
  it('DejaVu TTF dosyalarını çözer', () => {
    const paths = turkishFontPaths()
    expect(paths.regular).toMatch(/DejaVuSans\.ttf$/)
    expect(paths.bold).toMatch(/DejaVuSans-Bold\.ttf$/)
  })
})

describe('recordsToCsv', () => {
  it('UTF-8 BOM ile başlar — yoksa Excel dosyayı ANSI sanar', () => {
    expect(recordsToCsv([record()]).charCodeAt(0)).toBe(0xfeff)
  })

  it('Excel için ayrac satırı basar', () => {
    const csv = recordsToCsv([record()])
    expect(csv.slice(1).split('\r\n')[0]).toBe('sep=;')
  })

  it('blueprint sütunlarını taşır', () => {
    const header = recordsToCsv([]).slice(1).split('\r\n')[1]
    expect(header.split(';')).toEqual([
      'Durum', 'İşlem Tarihi', 'Karşı Taraf', 'Kategori',
      'Yön', 'Başlık', 'Tutar', 'Para Birimi', 'Belge Sayısı'
    ])
  })

  it('Türkçe karakterleri bozmadan taşır', () => {
    const csv = recordsToCsv([record()])
    for (const cp of TR_CODEPOINTS) {
      expect(csv).toContain(String.fromCodePoint(cp))
    }
  })

  it('tutarı tr-TR ondalık virgülüyle yazar', () => {
    const csv = recordsToCsv([record({ amount: 1234.5 })])
    expect(csv).toContain('1234,50')
  })

  it('tutar yoksa boş hücre bırakır, sıfır yazmaz', () => {
    const csv = recordsToCsv([record({ amount: null })])
    const row = csv.trim().split('\r\n').at(-1)!
    expect(row.split(';')[6]).toBe('')
  })

  it('ayrac içeren alanı alıntılar ve içteki alıntıyı ikiler', () => {
    const csv = recordsToCsv([record({ title: 'A;B "C"', contactName: null })])
    expect(csv).toContain('"A;B ""C"""')
  })

  it('satır sonu içeren alanı alıntılar — satır kaymasını önler', () => {
    const csv = recordsToCsv([record({ title: 'ilk\nikinci' })])
    expect(csv).toContain('"ilk\nikinci"')
    /* Başlık + sep + 1 kayıt = 3 mantıksal satır, gömülü \n sayılmamalı */
    expect(csv.trimEnd().split('\r\n')).toHaveLength(3)
  })

  it('durum ve kategoriyi Türkçe etikete çevirir', () => {
    const csv = recordsToCsv([record({ status: 'completed', type: 'promissory_note' })])
    expect(csv).toContain('Tamamlandı')
    expect(csv).toContain('Senet')
  })

  it('kayıt yoksa yalnız başlıkları üretir', () => {
    expect(recordsToCsv([]).trimEnd().split('\r\n')).toHaveLength(2)
  })
})

describe('recordsToXlsx', () => {
  it('geçerli OOXML (zip) baytı üretir', async () => {
    const buf = await recordsToXlsx([record()], meta)
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK')
    expect(buf.length).toBeGreaterThan(2000)
  })

  it('kayıt yoksa da geçerli dosya üretir', async () => {
    const buf = await recordsToXlsx([], meta)
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK')
  })
})

describe('recordsToPdf', () => {
  it('geçerli PDF baytı üretir', async () => {
    const buf = await recordsToPdf([record()], meta)
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(1000)
  })

  it('DejaVu fontunu GÖMER — PDFKit varsayılanı Türkçe glifleri taşımaz', async () => {
    const buf = await recordsToPdf([record()], meta)
    expect(buf.toString('latin1')).toContain('DejaVuSans')
  })

  it('kayıt yoksa çökmez', async () => {
    const buf = await recordsToPdf([], meta)
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  it('çok kayıtta sayfalara bölünür', async () => {
    const many = Array.from({ length: 120 }, (_, i) => record({ id: `r${i}`, title: `Kayıt ${i}` }))
    const buf = await recordsToPdf(many, meta)
    const pageCount = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
    expect(pageCount).toBeGreaterThan(1)
  })
})

describe('keyValue özet raporları', () => {
  const sections = [
    { heading: 'Finansal Özet', rows: [['Aylık satış', 1000] as [string, number]] }
  ]

  it('gerçek XLSX üretir', async () => {
    const buf = await keyValueToXlsx('Rapor', sections)
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK')
  })

  it('gerçek PDF üretir ve Türkçe fontu gömer', async () => {
    const buf = await keyValueToPdf('Kullanıcı Raporu', sections)
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(buf.toString('latin1')).toContain('DejaVuSans')
  })
})
