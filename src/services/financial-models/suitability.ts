import { FINANCIAL_MODEL_REGISTRY } from './registry.js'

const RULES: Array<{
  terms: RegExp
  codes: string[]
  stage?: string[]
  explanation: string
}> = [
  { terms: /likidite|kısa vadeli borç|ödeme gücü/i, codes: ['CURRENT_RATIO', 'QUICK_RATIO', 'NET_WORKING_CAPITAL'], explanation: 'Kısa vadeli ödeme kapasitesi ve likidite tamponu birlikte değerlendirilir.' },
  { terms: /stok|tahsilat|tedarikçi|nakit dönüşüm|vade/i, codes: ['DIO', 'DSO', 'DPO', 'CASH_CONVERSION_CYCLE'], explanation: 'Operasyonel nakdin stok, alacak ve borç günlerinde nerede bağlandığını gösterir.' },
  { terms: /başa baş|maliyet|katkı|ürün kâr/i, codes: ['CONTRIBUTION_MARGIN', 'BREAK_EVEN_QUANTITY', 'PRODUCT_PROFITABILITY'], explanation: 'Birim katkı ve sabit gider ilişkisini karar seviyesine taşır.' },
  { terms: /sipariş|pazar yeri|e-?ticaret|iade|komisyon/i, codes: ['ORDER_PROFITABILITY', 'POST_RETURN_MARGIN'], explanation: 'Sipariş bazlı kesintileri ve iade riskini gerçek marja dahil eder.' },
  { terms: /müşteri|cac|ltv|churn|edinme/i, codes: ['CAC', 'LTV', 'LTV_CAC', 'CAC_PAYBACK'], explanation: 'Müşteri edinme yatırımı ve yaşam boyu ekonomik katkıyı birlikte gösterir.' },
  { terms: /nakit ne kadar|runway|burn|nakit tüken/i, codes: ['GROSS_BURN', 'NET_BURN', 'RUNWAY'], explanation: 'Nakit tüketimi ve dayanma süresi ardışık hesaplanır.' },
  { terms: /yatırım|proje|npv|irr/i, codes: ['NPV', 'IRR'], explanation: 'Proje nakit akışlarının zaman değeriyle yatırım kararını destekler.' },
  { terms: /şirket değer|dcf|wacc|sermaye maliyeti/i, codes: ['WACC_FCFF_DCF'], explanation: 'Doğrulanmış piyasa girdileriyle sermaye maliyeti ve DCF değer aralığı üretir.' },
  { terms: /roe|özsermaye kârlılığı|dupont/i, codes: ['DUPONT_3_STEP'], explanation: 'ROE değişimini marj, varlık verimi ve kaldıraç bileşenlerine ayırır.' },
  { terms: /kâr.*nakit|nakit.*kâr/i, codes: ['PROFIT_TO_CASH'], explanation: 'Muhasebe kârı ile nakit yaratımı arasındaki farkı açıklar.' },
]

export function recommendFinancialModels(params: {
  question: string
  businessType?: string
  businessStage?: string
  availableFields?: string[]
  intendedDecision?: string
}) {
  const text = `${params.question} ${params.intendedDecision ?? ''} ${params.businessType ?? ''}`
  const fieldSet = new Set(params.availableFields ?? [])
  const matched = RULES.filter(rule => rule.terms.test(text))
  const selected = (matched.length ? matched : RULES.slice(0, 1))
    .flatMap(rule => rule.codes.map(code => ({ code, explanation: rule.explanation })))
    .filter((item, index, items) => items.findIndex(other => other.code === item.code) === index)
    .slice(0, 6)

  return selected.map(item => {
    const model = FINANCIAL_MODEL_REGISTRY.find(candidate => candidate.code === item.code)!
    const missingData = model.inputs.filter(input => input.required && !fieldSet.has(input.key)).map(input => ({
      key: input.key,
      label: input.label,
      unit: input.unit,
    }))
    return {
      code: model.code,
      name: model.name,
      category: model.category,
      level: model.level,
      explanation: item.explanation,
      missingData,
      runnable: missingData.length === 0,
      limitations: model.limitations,
    }
  })
}
