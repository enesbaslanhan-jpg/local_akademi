import { FINANCIAL_MODEL_REGISTRY } from './registry.js'

const EXTRA_ALIASES: Record<string, string[]> = {
  currentAssets: ['dönen varlıklar', 'toplam dönen varlıklar'],
  currentLiabilities: ['kısa vadeli yükümlülükler', 'kısa vadeli borçlar'],
  inventory: ['stoklar', 'stok'],
  netIncome: ['net dönem kârı', 'net kar', 'dönem kârı'],
  revenue: ['net satışlar', 'hasılat', 'satış geliri'],
  cashInflows: ['nakit girişleri', 'nakit girişi'],
  availableCash: ['nakit ve nakit benzerleri', 'kullanılabilir nakit', 'kasa banka'],
  operatingOutflows: ['faaliyet nakit çıkışı', 'operasyonel nakit çıkışı'],
  costOfGoodsSold: ['satışların maliyeti', 'satılan malın maliyeti'],
  averageReceivables: ['ortalama ticari alacak', 'ticari alacaklar'],
  averagePayables: ['ortalama ticari borç', 'ticari borçlar'],
  equityValue: ['özkaynak piyasa değeri', 'özsermaye değeri'],
  debtValue: ['faizli borç', 'finansal borç'],
  netDebt: ['net borç'],
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
}

function numberFrom(raw: string) {
  const cleaned = raw.replace(/\s/g, '')
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned)) return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  if (/^-?\d+(?:,\d+)?$/.test(cleaned)) return Number(cleaned.replace(',', '.'))
  return Number(cleaned.replace(/,/g, ''))
}

export function mapDocumentToFinancialModels(text: string, documentName: string) {
  const normalizedText = normalize(text)
  const extracted: Record<string, { value: number; evidence: string }> = {}
  const allInputs = new Map(FINANCIAL_MODEL_REGISTRY.flatMap(model => model.inputs.map(input => [input.key, input])))

  for (const [key, input] of allInputs) {
    if (input.type === 'number_array') continue
    const aliases = [input.label, ...(EXTRA_ALIASES[key] ?? [])]
    for (const alias of aliases) {
      const escaped = normalize(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = new RegExp(`${escaped}\\s*(?:\\([^)]*\\))?\\s*[:=]?\\s*(-?\\d[\\d.,\\s]{0,24})`, 'i').exec(normalizedText)
      if (!match) continue
      const value = numberFrom(match[1].trim())
      if (!Number.isFinite(value)) continue
      extracted[key] = { value, evidence: `${alias}: ${match[1].trim()}` }
      break
    }
  }

  const models = FINANCIAL_MODEL_REGISTRY.map(model => {
    const required = model.inputs.filter(input => input.required)
    const mappedInputs = Object.fromEntries(required.filter(input => extracted[input.key]).map(input => [input.key, extracted[input.key].value]))
    const evidence = required.filter(input => extracted[input.key]).map(input => ({ key: input.key, ...extracted[input.key] }))
    const missingFields = required.filter(input => !extracted[input.key]).map(input => ({ key: input.key, label: input.label, unit: input.unit }))
    const coverage = required.length ? evidence.length / required.length : 0
    return {
      code: model.code, name: model.name, category: model.category, coverage,
      mappedInputs, evidence, missingFields,
      runnableAfterVerification: missingFields.length === 0,
      sourceDocument: documentName,
      requiresUserVerification: true,
    }
  }).filter(model => model.coverage > 0).sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name, 'tr'))

  return {
    extractedFieldCount: Object.keys(extracted).length,
    models,
    warning: 'Belgeden eşleştirilen alanlar öneridir. Kullanıcı her alanı belgeyle karşılaştırıp onaylamadan model çalıştırılamaz.',
  }
}
