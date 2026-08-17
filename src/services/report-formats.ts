/**
 * Dışa aktarım biçim üreticileri.
 *
 * Saf fonksiyonlar: Fastify ve Prisma bilmezler, bu yüzden ayrı ayrı test
 * edilebilirler. Buradaki üç üretici de GERÇEK dosya baytı döndürür —
 * bu modülden önceki sürüm `.pdf`/`.xlsx` uzantısıyla düz metin yazıyordu
 * ve hiçbir uygulama dosyayı açamıyordu.
 */
import { createRequire } from 'module'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

/* Türkçe glif gömme.
   PDFKit'in gömülü Helvetica'sı WinAnsi (cp1252) kodlamalıdır ve
   `ı ş ğ İ ₺` gliflerini İÇERMEZ; font gömülmezse rapor bozuk çıkar.
   DejaVuSans bu kod noktalarının tamamını taşıyor.
   createRequire, hem CommonJS hem ESM altında çalışır — bare `require`
   ESM'de, `import.meta` ise CJS'de kırılırdı. */
const resolveFromCwd = createRequire(`${process.cwd()}/package.json`)
let cachedFontPaths: { regular: string; bold: string } | null = null

export function turkishFontPaths() {
  if (!cachedFontPaths) {
    cachedFontPaths = {
      regular: resolveFromCwd.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'),
      bold: resolveFromCwd.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')
    }
  }
  return cachedFontPaths
}

export const RECORD_TYPE_LABELS: Record<string, string> = {
  payment: 'Ödeme',
  receivable: 'Tahsilat',
  promissory_note: 'Senet',
  purchase: 'Satın alma',
  shipment: 'Sevkiyat',
  task: 'Görev',
  deferred: 'Ertelenen',
  other: 'Kayıt'
}

export const RECORD_STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  deferred: 'Ertelendi'
}

export const DIRECTION_LABELS: Record<string, string> = {
  payable: 'Borç',
  receivable: 'Alacak',
  neutral: '—'
}

export interface ExportRecord {
  id: string
  type: string
  status: string
  direction: string
  title: string
  contactName: string | null
  amount: number | null
  currency: string
  dueAt: Date | null
  completedAt: Date | null
  documentCount: number
  createdAt: Date
}

export interface ExportMeta {
  workspaceName: string
  generatedAt: Date
  generatedBy: string
  /** Kullanıcının seçtiği filtreler; raporun neyi kapsadığını belgeler. */
  filterSummary?: string
}

export interface ExportSummary {
  open: number
  overdue: number
  dueToday: number
  payable: number
  receivable: number
  net: number
  currency: string
}

const COLUMNS = [
  'Durum', 'İşlem Tarihi', 'Karşı Taraf', 'Kategori',
  'Yön', 'Başlık', 'Tutar', 'Para Birimi', 'Belge Sayısı'
] as const

function label(map: Record<string, string>, key: string) {
  return map[key] ?? key
}

function formatDateTr(value: Date | null) {
  if (!value) return ''
  const d = value.getUTCDate().toString().padStart(2, '0')
  const m = (value.getUTCMonth() + 1).toString().padStart(2, '0')
  return `${d}.${m}.${value.getUTCFullYear()}`
}

/** tr-TR ondalık ayracı virgüldür; binlik ayrac KOYMUYORUZ çünkü
 *  CSV alanı içinde gereksiz alıntılama gerektirir ve Excel'i şaşırtır. */
function amountForCsv(value: number | null) {
  if (value === null || value === undefined) return ''
  return value.toFixed(2).replace('.', ',')
}

function rowsFrom(records: ExportRecord[]) {
  return records.map(r => [
    label(RECORD_STATUS_LABELS, r.status),
    formatDateTr(r.dueAt ?? r.createdAt),
    r.contactName ?? '',
    label(RECORD_TYPE_LABELS, r.type),
    label(DIRECTION_LABELS, r.direction),
    r.title,
    r.amount,
    r.currency,
    r.documentCount
  ])
}

/* ---------------------------------------------------------------- CSV */

const CSV_DELIMITER = ';'

/** RFC 4180 alıntılama: alan ayrac, alıntı veya satır sonu içeriyorsa
 *  çift alıntıya alınır, içindeki alıntı ikilenir. */
function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  if (text.includes(CSV_DELIMITER) || text.includes('"') || /[\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function recordsToCsv(records: ExportRecord[]): string {
  const lines: string[] = []
  /* `sep=` Excel'e ayracı bildirir. Türkçe Windows'ta liste ayracı
     noktalı virgüldür; bu satır olmadan çift tıklayan kullanıcı tüm
     veriyi tek kolonda görür. Katı CSV ayrıştırıcıları bu satırı
     atlamalıdır (pandas: skiprows=1). */
  lines.push(`sep=${CSV_DELIMITER}`)
  lines.push(COLUMNS.map(csvCell).join(CSV_DELIMITER))
  for (const row of rowsFrom(records)) {
    const cells = row.map((cell, i) =>
      i === 6 ? csvCell(amountForCsv(cell as number | null)) : csvCell(cell)
    )
    lines.push(cells.join(CSV_DELIMITER))
  }
  /* UTF-8 BOM: Excel bu bayt dizisi olmadan dosyayı ANSI sanır ve
     Türkçe karakterler bozulur. */
  return `﻿${lines.join('\r\n')}\r\n`
}

/* --------------------------------------------------------------- XLSX */

export async function recordsToXlsx(
  records: ExportRecord[],
  meta: ExportMeta,
  summary?: ExportSummary
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LocalKarar'
  wb.created = meta.generatedAt

  const ws = wb.addWorksheet('Kayıtlar', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  ws.columns = [
    { header: 'Durum', key: 'status', width: 14 },
    { header: 'İşlem Tarihi', key: 'date', width: 14 },
    { header: 'Karşı Taraf', key: 'contact', width: 26 },
    { header: 'Kategori', key: 'type', width: 14 },
    { header: 'Yön', key: 'direction', width: 10 },
    { header: 'Başlık', key: 'title', width: 40 },
    { header: 'Tutar', key: 'amount', width: 16 },
    { header: 'Para Birimi', key: 'currency', width: 12 },
    { header: 'Belge Sayısı', key: 'documents', width: 13 }
  ]
  ws.getRow(1).font = { bold: true }

  for (const r of records) {
    ws.addRow({
      status: label(RECORD_STATUS_LABELS, r.status),
      date: r.dueAt ?? r.createdAt,
      contact: r.contactName ?? '',
      type: label(RECORD_TYPE_LABELS, r.type),
      direction: label(DIRECTION_LABELS, r.direction),
      title: r.title,
      /* Sayı olarak yazılır, metin olarak DEĞİL — muhasebeci hücrede
         toplama/filtreleme yapabilsin. Biçimlendirmeyi Excel kullanıcının
         yereline göre uygular. */
      amount: r.amount,
      currency: r.currency,
      documents: r.documentCount
    })
  }

  ws.getColumn('amount').numFmt = '#,##0.00'
  ws.getColumn('date').numFmt = 'dd.mm.yyyy'
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } }

  /* İkinci sayfa: raporun kapsamı ve künyesi. Bir dışa aktarımın neyi
     içerdiği dosyanın kendisinden anlaşılmalı. */
  const info = wb.addWorksheet('Rapor Bilgisi')
  info.columns = [{ width: 22 }, { width: 52 }]
  const infoRows: Array<[string, string | number]> = [
    ['İşletme', meta.workspaceName],
    ['Oluşturan', meta.generatedBy],
    ['Oluşturma tarihi', meta.generatedAt.toLocaleString('tr-TR')],
    ['Kayıt sayısı', records.length]
  ]
  if (meta.filterSummary) infoRows.push(['Filtreler', meta.filterSummary])
  if (summary) {
    infoRows.push(
      ['Açık kayıt', summary.open],
      ['Geciken', summary.overdue],
      ['Bugün vadesi gelen', summary.dueToday],
      ['30 gün ödenecek', summary.payable],
      ['30 gün tahsil edilecek', summary.receivable],
      ['30 gün net', summary.net]
    )
  }
  for (const [k, v] of infoRows) {
    const row = info.addRow([k, v])
    row.getCell(1).font = { bold: true }
  }

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

/* --------------------------------------- Anahtar-değer özet raporları */

export interface KeyValueSection {
  heading: string
  rows: Array<[string, string | number]>
}

/** Basit özet raporu (etiket → değer). `reports.ts`'in kullanıcı özeti
 *  bunu kullanıyor; eskiden `.xlsx` uzantısıyla sekmeli düz metin
 *  yazılıyordu ve Excel dosyayı açamıyordu. */
export async function keyValueToXlsx(
  title: string,
  sections: KeyValueSection[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LocalKarar'
  const ws = wb.addWorksheet('Özet')
  ws.columns = [{ width: 28 }, { width: 46 }]

  const titleRow = ws.addRow([title])
  titleRow.font = { bold: true, size: 14 }
  ws.addRow([])

  for (const section of sections) {
    const head = ws.addRow([section.heading])
    head.font = { bold: true }
    for (const [k, v] of section.rows) {
      const row = ws.addRow([k, v])
      row.getCell(1).font = { color: { argb: 'FF555555' } }
      if (typeof v === 'number') row.getCell(2).numFmt = '#,##0.00'
    }
    ws.addRow([])
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

export async function keyValueToPdf(
  title: string,
  sections: KeyValueSection[]
): Promise<Buffer> {
  const fonts = turkishFontPaths()
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.registerFont('tr', fonts.regular)
  doc.registerFont('tr-bold', fonts.bold)

  const left = doc.page.margins.left
  const width = doc.page.width - left - doc.page.margins.right

  doc.font('tr-bold').fontSize(18).text(title)
  doc.moveDown(0.6)

  for (const section of sections) {
    doc.font('tr-bold').fontSize(11).fillColor('#000').text(section.heading)
    doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2)
      .lineWidth(1).strokeColor('#222').stroke()
    doc.moveDown(0.4)
    for (const [k, v] of section.rows) {
      const y = doc.y
      doc.font('tr').fontSize(9.5).fillColor('#666')
        .text(k, left, y, { width: width * 0.45, lineBreak: false })
      doc.font('tr').fontSize(9.5).fillColor('#000').text(
        typeof v === 'number'
          ? v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(v),
        left + width * 0.45,
        y,
        { width: width * 0.55, lineBreak: false }
      )
      doc.y = y + 15
    }
    doc.moveDown(0.6)
  }

  doc.end()
  return done
}

/* ---------------------------------------------------------------- PDF */

const PDF_TABLE_COLUMNS: Array<{ label: string; width: number; align?: 'left' | 'right' }> = [
  { label: 'Durum', width: 62 },
  { label: 'Tarih', width: 58 },
  { label: 'Karşı Taraf', width: 120 },
  { label: 'Kategori', width: 66 },
  { label: 'Başlık', width: 150 },
  { label: 'Tutar', width: 84, align: 'right' }
]

/* Bilinen para birimleri sembolle basılır — Türkçe bir raporda
   "1.234,56 ₺" doğal, "1.234,56 TRY" değil. Bilinmeyen birim kod olarak
   kalır; uydurma sembol üretmiyoruz. DejaVuSans ₺ (U+20BA) taşıyor. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£'
}

function moneyForPdf(value: number | null, currency: string) {
  if (value === null || value === undefined) return ''
  const unit = CURRENCY_SYMBOLS[currency] ?? currency
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`
}

export async function recordsToPdf(
  records: ExportRecord[],
  meta: ExportMeta,
  summary?: ExportSummary
): Promise<Buffer> {
  const fonts = turkishFontPaths()
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.registerFont('tr', fonts.regular)
  doc.registerFont('tr-bold', fonts.bold)

  const left = doc.page.margins.left
  const contentWidth = doc.page.width - left - doc.page.margins.right

  doc.font('tr-bold').fontSize(18).text(meta.workspaceName)
  doc.font('tr').fontSize(9).fillColor('#555')
    .text(`İşletme takibi raporu · ${meta.generatedAt.toLocaleString('tr-TR')} · ${meta.generatedBy}`)
  if (meta.filterSummary) doc.text(`Kapsam: ${meta.filterSummary}`)
  doc.fillColor('#000').moveDown(0.8)

  if (summary) {
    const tiles: Array<[string, string]> = [
      ['30 gün tahsilat', moneyForPdf(summary.receivable, summary.currency)],
      ['30 gün ödeme', moneyForPdf(summary.payable, summary.currency)],
      ['30 gün net', moneyForPdf(summary.net, summary.currency)]
    ]
    const tileWidth = contentWidth / tiles.length
    const top = doc.y
    tiles.forEach(([caption, value], i) => {
      const x = left + i * tileWidth
      doc.font('tr').fontSize(8).fillColor('#666').text(caption, x, top, { width: tileWidth - 8 })
      doc.font('tr-bold').fontSize(13).fillColor('#000')
        .text(value, x, top + 12, { width: tileWidth - 8 })
    })
    doc.y = top + 34
    doc.font('tr').fontSize(9).fillColor('#555')
      .text(`Açık ${summary.open} · Geciken ${summary.overdue} · Bugün ${summary.dueToday}`, left, doc.y)
    doc.fillColor('#000').moveDown(0.8)
  }

  const tableWidth = PDF_TABLE_COLUMNS.reduce((s, c) => s + c.width, 0)
  const rowHeight = 18

  const drawHeader = () => {
    const y = doc.y
    doc.font('tr-bold').fontSize(8.5).fillColor('#000')
    let x = left
    for (const col of PDF_TABLE_COLUMNS) {
      doc.text(col.label, x + 2, y + 4, { width: col.width - 4, align: col.align ?? 'left', lineBreak: false })
      x += col.width
    }
    doc.moveTo(left, y + rowHeight - 2).lineTo(left + tableWidth, y + rowHeight - 2)
      .lineWidth(1).strokeColor('#222').stroke()
    doc.y = y + rowHeight
  }

  drawHeader()
  doc.font('tr').fontSize(8.5)

  for (const r of records) {
    /* Sayfa taşarsa yeni sayfa aç ve başlığı tekrar bas. */
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      drawHeader()
      doc.font('tr').fontSize(8.5)
    }
    const y = doc.y
    const cells = [
      label(RECORD_STATUS_LABELS, r.status),
      formatDateTr(r.dueAt ?? r.createdAt),
      r.contactName ?? '',
      label(RECORD_TYPE_LABELS, r.type),
      r.title,
      moneyForPdf(r.amount, r.currency)
    ]
    let x = left
    cells.forEach((cell, i) => {
      const col = PDF_TABLE_COLUMNS[i]
      doc.fillColor('#000').text(cell, x + 2, y + 4, {
        width: col.width - 4,
        align: col.align ?? 'left',
        lineBreak: false,
        ellipsis: true
      })
      x += col.width
    })
    doc.moveTo(left, y + rowHeight - 1).lineTo(left + tableWidth, y + rowHeight - 1)
      .lineWidth(0.4).strokeColor('#ddd').stroke()
    doc.y = y + rowHeight
  }

  if (records.length === 0) {
    doc.moveDown(0.5).font('tr').fontSize(9).fillColor('#666')
      .text('Bu kapsamda kayıt bulunmuyor.', left)
  }

  /* Sayfa numaraları — bufferPages sayesinde sonradan gezilebiliyor. */
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i)
    doc.font('tr').fontSize(8).fillColor('#888').text(
      `${i + 1} / ${range.count}`,
      left,
      doc.page.height - doc.page.margins.bottom + 8,
      { width: contentWidth, align: 'right', lineBreak: false }
    )
  }

  doc.end()
  return done
}
