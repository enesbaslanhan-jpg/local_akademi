import { faturaYonu, type UblFatura } from './e-fatura.js'

type SuggestionDocument = {
  originalName: string
  extractedText: string
  category: string | null
  dueDate: Date | null
  /** Yükleme anında ayrıştırılmış e-Fatura; `analysis.eFatura` içinden. */
  eFatura?: UblFatura | null
}

/*
 * e-FATURADAN ÖNERİ — tahmin değil, okuma.
 *
 * Aşağıdaki sezgisel üretici metinden TAHMİN ediyor: tutarı `₺|TL`
 * arayarak, türü kelime eşleştirmesiyle buluyor. Kaçınılmaz olarak
 * kayıplı ve bu yüzden güveni 0.95'i geçmiyor.
 *
 * UBL-TR faturasında ise tutar, tarih, para birimi ve taraflar
 * YAPILANDIRILMIŞ alanlar. Okunuyor, tahmin edilmiyor -- güven 1.
 *
 * 🔴 YÖN AYRI BİR MESELE. Tutarı bilmek yönü bilmek değildir: aynı
 * fatura hem borç hem alacak olabilir. `faturaYonu` işletmenin vergi
 * numarasıyla karşılaştırıyor; eşleşme yoksa `neutral` dönüyor ve
 * kullanıcıya soruluyor. Yanlış yön, kullanıcının alacağını borç
 * olarak yazmak demektir.
 */
function faturadanOneri(fatura: UblFatura, isletmeVergiNo: string | null | undefined) {
  const yon = faturaYonu(fatura, isletmeVergiNo)

  /* Karşı taraf: yön belliyse öteki taraf, değilse satıcı (faturayı
     kesen taraf, kullanıcının en çok tanıdığı isim). */
  const karsiTaraf = yon === 'receivable' ? fatura.alici : fatura.satici
  const ad = karsiTaraf.unvan || 'Bilinmeyen taraf'

  const payload: RecordSuggestionPayload = {
    type: yon === 'receivable' ? 'receivable' : 'payment',
    title: `${ad} — Fatura ${fatura.id}`,
    description: yon === 'neutral'
      ? 'e-Fatura okundu. Bu faturanın gelen mi giden mi olduğu belirlenemedi — işletme ayarlarında vergi numaranızı girerseniz otomatik ayrılır.'
      : `e-Fatura okundu. Tutar ve tarih faturadan alındı, tahmin edilmedi.`,
    direction: yon,
    amount: fatura.odenecekTutar,
    currency: fatura.paraBirimi,
    /* Vade örneklerin %86'sında yok; yoksa düzenleme tarihi de
       yazılmıyor -- olmayan bir vade uydurmak yanlış hatırlatma
       kurardı. */
    dueAt: fatura.vadeTarihi ? new Date(`${fatura.vadeTarihi}T00:00:00.000Z`).toISOString() : null,
    priority: 'normal'
  }

  const evidence = [
    `Fatura no: ${fatura.id}`,
    `Düzenleme: ${fatura.duzenlemeTarihi}`,
    fatura.vadeTarihi ? `Vade: ${fatura.vadeTarihi}` : null,
    `Tutar: ${fatura.odenecekTutar} ${fatura.paraBirimi}`,
    fatura.satici.unvan ? `Satıcı: ${fatura.satici.unvan}${fatura.satici.kimlik ? ` (${fatura.satici.kimlikTuru} ${fatura.satici.kimlik})` : ''}` : null,
    fatura.alici.unvan ? `Alıcı: ${fatura.alici.unvan}${fatura.alici.kimlik ? ` (${fatura.alici.kimlikTuru} ${fatura.alici.kimlik})` : ''}` : null,
    yon === 'neutral' ? 'Yön belirlenemedi: işletme vergi numarası taraflarla eşleşmiyor' : null
  ].filter(Boolean)

  /* Yapılandırılmış alandan geldiği için tam güven. Sezgisel yol
     0.95'i geçemiyor; aradaki fark bilinçli. */
  return { suggestionType: 'business_record' as const, payload, confidence: 1, evidence }
}

export type RecordSuggestionPayload = {
  type: 'payment' | 'receivable' | 'promissory_note' | 'purchase' | 'shipment'
  title: string
  description: string
  direction: 'payable' | 'receivable' | 'neutral'
  amount: number | null
  currency: string
  dueAt: string | null
  priority: 'normal' | 'high'
}

const TYPE_RULES: Array<{
  type: RecordSuggestionPayload['type']
  direction: RecordSuggestionPayload['direction']
  terms: string[]
}> = [
  { type: 'promissory_note', direction: 'payable', terms: ['senet', 'bono', 'vade tarihi'] },
  { type: 'shipment', direction: 'neutral', terms: ['kargo', 'sevkiyat', 'teslimat', 'takip numarası'] },
  { type: 'receivable', direction: 'receivable', terms: ['tahsilat', 'alacak', 'müşteriden alınacak'] },
  { type: 'purchase', direction: 'payable', terms: ['satın alma', 'sipariş', 'tedarik', 'alım'] },
  { type: 'payment', direction: 'payable', terms: ['fatura', 'ödeme', 'borç', 'son ödeme'] }
]

const CATEGORY_TYPE: Record<string, Pick<RecordSuggestionPayload, 'type' | 'direction'>> = {
  invoice: { type: 'payment', direction: 'payable' },
  promissory_note: { type: 'promissory_note', direction: 'payable' },
  shipment: { type: 'shipment', direction: 'neutral' },
  purchase: { type: 'purchase', direction: 'payable' }
}

function findAmount(text: string) {
  const matches = [...text.matchAll(/(?:₺|TL|TRY)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)\s*(?:₺|TL|TRY)\b/gi)]
  for (const match of matches) {
    const raw = match[1]
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,(?=\d{3}\b)/g, '')
    const amount = Number(normalized)
    if (Number.isFinite(amount) && amount >= 0 && amount <= 1e15) {
      return { amount, evidence: match[0].trim() }
    }
  }
  return null
}

function parseDate(day: number, month: number, year: number) {
  const fullYear = year < 100 ? 2000 + year : year
  const date = new Date(Date.UTC(fullYear, month - 1, day, 12))
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null
  return date
}

function findDueDate(text: string) {
  const labelled = /(?:vade|son ödeme|teslimat|kargo)[^\d]{0,30}(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/i.exec(text)
  const fallback = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(text)
  const match = labelled ?? fallback
  if (!match) return null
  const date = parseDate(Number(match[1]), Number(match[2]), Number(match[3]))
  return date ? { date, evidence: match[0].trim() } : null
}

export function buildDocumentSuggestion(
  document: SuggestionDocument,
  isletmeVergiNo?: string | null
) {
  /*
   * Yapılandırılmış fatura varsa sezgisel yola HİÇ girilmiyor.
   *
   * Girilseydi, XML etiketlerinin arasından `₺` arayan bir tarama
   * yapılırdı; okunmuş bir tutarın üstüne tahmin edilmiş bir tutar
   * koymak açık bir gerileme olurdu.
   */
  if (document.eFatura) return faturadanOneri(document.eFatura, isletmeVergiNo)

  const searchable = `${document.originalName}\n${document.extractedText}`.toLocaleLowerCase('tr-TR')
  const matchedRule = TYPE_RULES.find(rule => rule.terms.some(term => searchable.includes(term)))
  const categoryRule = document.category ? CATEGORY_TYPE[document.category] : undefined
  const classification = matchedRule ?? categoryRule
  if (!classification) return null

  const amountMatch = findAmount(document.extractedText)
  const dateMatch = document.dueDate
    ? { date: document.dueDate, evidence: 'Belge için girilen vade tarihi' }
    : findDueDate(document.extractedText)
  const evidence = [
    matchedRule ? `Tür eşleşmesi: ${matchedRule.terms.find(term => searchable.includes(term))}` : `Belge kategorisi: ${document.category}`,
    amountMatch?.evidence ? `Tutar: ${amountMatch.evidence}` : null,
    dateMatch?.evidence ? `Tarih: ${dateMatch.evidence}` : null
  ].filter(Boolean)

  const baseName = document.originalName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  const confidence = Math.min(
    0.95,
    0.52 + (matchedRule ? 0.18 : 0.08) + (amountMatch ? 0.12 : 0) + (dateMatch ? 0.1 : 0)
  )
  const payload: RecordSuggestionPayload = {
    type: classification.type,
    title: baseName || 'Belgeden oluşturulan kayıt',
    description: `“${document.originalName}” belgesinden önerildi. Kaydetmeden önce bilgileri kontrol edin.`,
    direction: classification.direction,
    amount: amountMatch?.amount ?? null,
    currency: 'TRY',
    dueAt: dateMatch?.date.toISOString() ?? null,
    priority: classification.type === 'promissory_note' ? 'high' : 'normal'
  }
  return { suggestionType: 'business_record', payload, confidence, evidence }
}
