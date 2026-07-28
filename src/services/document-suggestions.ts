type SuggestionDocument = {
  originalName: string
  extractedText: string
  category: string | null
  dueDate: Date | null
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

export function buildDocumentSuggestion(document: SuggestionDocument) {
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
