export const CALCULATION_CATEGORIES = {
  all: 'Tümü',
  cash: 'Nakit & Likidite',
  profitability: 'Kârlılık & Fiyatlama',
  customer: 'Satış & Müşteri',
  operations: 'Stok & Operasyon',
  growth: 'Yatırım & Büyüme',
  valuation: 'Değerleme & İleri Analiz',
}

const DEFINITIONS = [
  ['customer-acquisition-cost', 'Müşteri Edinme Maliyeti (CAC)', 'customer', 'cac', 'CAC'],
  ['customer-lifetime-value', 'Müşteri Yaşam Boyu Değeri (LTV)', 'customer', 'ltv', 'LTV'],
  ['ltv-cac-ratio', 'LTV/CAC Oranı', 'customer', 'ltv_cac', 'LTV_CAC'],
  ['break-even-quantity', 'Başa Baş Satış Adedi', 'profitability', 'basabas_noktasi', 'BREAK_EVEN_QUANTITY'],
  ['cash-runway', 'Nakit Dayanma Süresi', 'cash', 'nakit_dayanim', 'RUNWAY'],
  ['net-working-capital', 'Net İşletme Sermayesi', 'cash', 'isletme_sermayesi', 'NET_WORKING_CAPITAL'],
  ['inventory-turnover-dio', 'Stok Devir ve DIO', 'operations', 'stok_devir', 'DIO'],
  ['order-profitability', 'Sipariş Kârlılığı', 'profitability', 'pazaryeri_siparis_kari', 'ORDER_PROFITABILITY'],

  ['price-architecture', 'Fiyat Mimarisi ve Hedef Marj', 'profitability', 'fiyat_mimarisi', null],
  ['profit-margin', 'Kâr ve Kâr Marjı', 'profitability', 'kar_hesabi', null],
  ['cash-position', 'Nakit Pozisyonu', 'cash', 'nakit_pozisyonu', null],
  ['roi', 'Yatırım Getirisi (ROI)', 'growth', 'roi', null],
  ['discount-profit', 'İndirim/Kampanya Kârlılığı', 'profitability', 'indirim_kar', null],
  ['loan-cost', 'Kredi Taksiti ve Toplam Maliyet', 'cash', 'kredi_maliyeti', null],
  ['export-unit-cost', 'İhracat Birim Maliyeti', 'operations', 'ihracat_maliyet', null],
  ['vat-addition', 'KDV Ekleme', 'profitability', 'kdv_ekleme', null],
  ['cash-closing', 'Günlük Kasa Kapanışı', 'cash', 'kasa_kapanis', null],
  ['term-difference', 'Vade Farkı', 'cash', 'vade_farki', null],
  ['unit-cost', 'Gerçek Birim Maliyet', 'operations', 'birim_maliyet', null],

  ['current-ratio', 'Cari Oran', 'cash', null, 'CURRENT_RATIO'],
  ['quick-ratio', 'Asit-Test Oranı', 'cash', null, 'QUICK_RATIO'],
  ['dupont', 'Üç Aşamalı DuPont', 'profitability', null, 'DUPONT_3_STEP'],
  ['profit-to-cash', 'Kârdan Nakde Mutabakat', 'cash', null, 'PROFIT_TO_CASH'],
  ['cash-conversion-cycle', 'Nakit Dönüşüm Döngüsü', 'operations', null, 'CASH_CONVERSION_CYCLE'],
  ['dso', 'Tahsilat Süresi (DSO)', 'operations', null, 'DSO'],
  ['dpo', 'Tedarikçi Ödeme Süresi (DPO)', 'operations', null, 'DPO'],
  ['contribution-margin', 'Katkı Payı', 'profitability', null, 'CONTRIBUTION_MARGIN'],
  ['product-profitability', 'Ürün Kârlılığı', 'profitability', null, 'PRODUCT_PROFITABILITY'],
  ['post-return-margin', 'İade Sonrası Gerçek Marj', 'profitability', null, 'POST_RETURN_MARGIN'],
  ['cac-payback', 'CAC Geri Ödeme Süresi', 'customer', null, 'CAC_PAYBACK'],
  ['gross-burn', 'Brüt Nakit Tüketimi', 'cash', null, 'GROSS_BURN'],
  ['net-burn', 'Net Nakit Tüketimi', 'cash', null, 'NET_BURN'],
  ['npv', 'Net Bugünkü Değer', 'growth', null, 'NPV'],
  ['irr', 'İç Verim Oranı', 'growth', null, 'IRR'],
  ['wacc-fcff-dcf', 'Basitleştirilmiş WACC ve FCFF DCF', 'valuation', null, 'WACC_FCFF_DCF'],
]

export const CALCULATION_DEFINITIONS = DEFINITIONS.map(([id, title, category, formulaId, modelCode]) => ({
  id,
  title,
  category,
  simple: formulaId ? { formulaId } : null,
  detailed: modelCode ? { modelCode } : null,
}))

export const SIMPLE_TO_CALCULATION = Object.fromEntries(
  CALCULATION_DEFINITIONS.filter(item => item.simple).map(item => [item.simple.formulaId, item]),
)

export const MODEL_TO_CALCULATION = Object.fromEntries(
  CALCULATION_DEFINITIONS.filter(item => item.detailed).map(item => [item.detailed.modelCode, item]),
)

export function buildCalculationCatalog(formulas = [], models = []) {
  const formulaMap = new Map(formulas.map(item => [item.id, item]))
  const modelMap = new Map(models.map(item => [item.code, item]))

  return CALCULATION_DEFINITIONS.map(definition => {
    const formula = definition.simple ? formulaMap.get(definition.simple.formulaId) : null
    const model = definition.detailed ? modelMap.get(definition.detailed.modelCode) : null
    const description = formula?.description || model?.purpose || model?.description || ''
    const inputCount = formula?.inputs?.length ?? model?.requirementCount ?? model?.inputs?.length ?? 0
    return { ...definition, formula, model, description, inputCount }
  })
}

export function modeLabels(item) {
  if (item.simple && item.detailed) return ['Hızlı hesap', 'Detaylı analiz mevcut']
  if (item.simple) return ['Hızlı hesap']
  return ['İleri analiz']
}
