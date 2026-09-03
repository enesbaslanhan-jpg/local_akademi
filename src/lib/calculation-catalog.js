export const CALCULATION_CATEGORIES = {
  all: 'calculations.categories.all',
  cash: 'calculations.categories.cash',
  profitability: 'calculations.categories.profitability',
  customer: 'calculations.categories.customer',
  operations: 'calculations.categories.operations',
  growth: 'calculations.categories.growth',
  valuation: 'calculations.categories.valuation',
}

const DEFINITIONS = [
  ['customer-acquisition-cost', 'calculations.catalog.customerAcquisitionCost', 'customer', 'cac', 'CAC'],
  ['customer-lifetime-value', 'calculations.catalog.customerLifetimeValue', 'customer', 'ltv', 'LTV'],
  ['ltv-cac-ratio', 'calculations.catalog.ltvCacRatio', 'customer', 'ltv_cac', 'LTV_CAC'],
  ['break-even-quantity', 'calculations.catalog.breakEvenQuantity', 'profitability', 'basabas_noktasi', 'BREAK_EVEN_QUANTITY'],
  ['cash-runway', 'calculations.catalog.cashRunway', 'cash', 'nakit_dayanim', 'RUNWAY'],
  ['net-working-capital', 'calculations.catalog.netWorkingCapital', 'cash', 'isletme_sermayesi', 'NET_WORKING_CAPITAL'],
  ['inventory-turnover-dio', 'calculations.catalog.inventoryTurnoverDio', 'operations', 'stok_devir', 'DIO'],
  ['order-profitability', 'calculations.catalog.orderProfitability', 'profitability', 'pazaryeri_siparis_kari', 'ORDER_PROFITABILITY'],

  ['price-architecture', 'calculations.catalog.priceArchitecture', 'profitability', 'fiyat_mimarisi', null],
  ['profit-margin', 'calculations.catalog.profitMargin', 'profitability', 'kar_hesabi', null],
  ['cash-position', 'calculations.catalog.cashPosition', 'cash', 'nakit_pozisyonu', null],
  ['roi', 'calculations.catalog.roi', 'growth', 'roi', null],
  ['discount-profit', 'calculations.catalog.discountProfit', 'profitability', 'indirim_kar', null],
  ['loan-cost', 'calculations.catalog.loanCost', 'cash', 'kredi_maliyeti', null],
  ['export-unit-cost', 'calculations.catalog.exportUnitCost', 'operations', 'ihracat_maliyet', null],
  ['vat-addition', 'calculations.catalog.vatAddition', 'profitability', 'kdv_ekleme', null],
  ['cash-closing', 'calculations.catalog.cashClosing', 'cash', 'kasa_kapanis', null],
  ['term-difference', 'calculations.catalog.termDifference', 'cash', 'vade_farki', null],
  ['unit-cost', 'calculations.catalog.unitCost', 'operations', 'birim_maliyet', null],

  ['current-ratio', 'calculations.catalog.currentRatio', 'cash', null, 'CURRENT_RATIO'],
  ['quick-ratio', 'calculations.catalog.quickRatio', 'cash', null, 'QUICK_RATIO'],
  ['dupont', 'calculations.catalog.dupont', 'profitability', null, 'DUPONT_3_STEP'],
  ['profit-to-cash', 'calculations.catalog.profitToCash', 'cash', null, 'PROFIT_TO_CASH'],
  ['cash-conversion-cycle', 'calculations.catalog.cashConversionCycle', 'operations', null, 'CASH_CONVERSION_CYCLE'],
  ['dso', 'calculations.catalog.dso', 'operations', null, 'DSO'],
  ['dpo', 'calculations.catalog.dpo', 'operations', null, 'DPO'],
  ['contribution-margin', 'calculations.catalog.contributionMargin', 'profitability', null, 'CONTRIBUTION_MARGIN'],
  ['product-profitability', 'calculations.catalog.productProfitability', 'profitability', null, 'PRODUCT_PROFITABILITY'],
  ['post-return-margin', 'calculations.catalog.postReturnMargin', 'profitability', null, 'POST_RETURN_MARGIN'],
  ['cac-payback', 'calculations.catalog.cacPayback', 'customer', null, 'CAC_PAYBACK'],
  ['gross-burn', 'calculations.catalog.grossBurn', 'cash', null, 'GROSS_BURN'],
  ['net-burn', 'calculations.catalog.netBurn', 'cash', null, 'NET_BURN'],
  ['npv', 'calculations.catalog.npv', 'growth', null, 'NPV'],
  ['irr', 'calculations.catalog.irr', 'growth', null, 'IRR'],
  ['wacc-fcff-dcf', 'calculations.catalog.waccFcffDcf', 'valuation', null, 'WACC_FCFF_DCF'],
]

export const CALCULATION_DEFINITIONS = DEFINITIONS.map(([id, titleKey, category, formulaId, modelCode]) => {
  const matchTitle = {
  // Ders gövdesindeki Türkçe hesaplama referanslarını eşleştiren iç veri;
  // kullanıcıya gösterilmez. Görünen başlık her zaman titleKey ile çevrilir.
    'calculations.catalog.customerAcquisitionCost': 'Müşteri Edinme Maliyeti (CAC)',
    'calculations.catalog.customerLifetimeValue': 'Müşteri Yaşam Boyu Değeri (LTV)',
    'calculations.catalog.ltvCacRatio': 'LTV/CAC Oranı',
    'calculations.catalog.breakEvenQuantity': 'Başa Baş Satış Adedi',
    'calculations.catalog.cashRunway': 'Nakit Dayanma Süresi',
    'calculations.catalog.netWorkingCapital': 'Net İşletme Sermayesi',
    'calculations.catalog.inventoryTurnoverDio': 'Stok Devir ve DIO',
    'calculations.catalog.orderProfitability': 'Sipariş Kârlılığı',
    'calculations.catalog.priceArchitecture': 'Fiyat Mimarisi ve Hedef Marj',
    'calculations.catalog.profitMargin': 'Kâr ve Kâr Marjı',
    'calculations.catalog.cashPosition': 'Nakit Pozisyonu',
    'calculations.catalog.roi': 'Yatırım Getirisi (ROI)',
    'calculations.catalog.discountProfit': 'İndirim/Kampanya Kârlılığı',
    'calculations.catalog.loanCost': 'Kredi Taksiti ve Toplam Maliyet',
    'calculations.catalog.exportUnitCost': 'İhracat Birim Maliyeti',
    'calculations.catalog.vatAddition': 'KDV Ekleme',
    'calculations.catalog.cashClosing': 'Günlük Kasa Kapanışı',
    'calculations.catalog.termDifference': 'Vade Farkı',
    'calculations.catalog.unitCost': 'Gerçek Birim Maliyet',
    'calculations.catalog.currentRatio': 'Cari Oran',
    'calculations.catalog.quickRatio': 'Asit-Test Oranı',
    'calculations.catalog.dupont': 'Üç Aşamalı DuPont',
    'calculations.catalog.profitToCash': 'Kârdan Nakde Mutabakat',
    'calculations.catalog.cashConversionCycle': 'Nakit Dönüşüm Döngüsü',
    'calculations.catalog.dso': 'Tahsilat Süresi (DSO)',
    'calculations.catalog.dpo': 'Tedarikçi Ödeme Süresi (DPO)',
    'calculations.catalog.contributionMargin': 'Katkı Payı',
    'calculations.catalog.productProfitability': 'Ürün Kârlılığı',
    'calculations.catalog.postReturnMargin': 'İade Sonrası Gerçek Marj',
    'calculations.catalog.cacPayback': 'CAC Geri Ödeme Süresi',
    'calculations.catalog.grossBurn': 'Brüt Nakit Tüketimi',
    'calculations.catalog.netBurn': 'Net Nakit Tüketimi',
    'calculations.catalog.npv': 'Net Bugünkü Değer',
    'calculations.catalog.irr': 'İç Verim Oranı',
    'calculations.catalog.waccFcffDcf': 'Basitleştirilmiş WACC ve FCFF DCF',
  }[titleKey]

  return {
    id,
    titleKey,
    // Geriye uyumluluk: çözümleyicinin ve eski tüketicilerin iç eşleştirme
    // sözleşmesi `title` idi. Görünür UI bu alanı kullanmaz; titleKey çevrilir.
    title: matchTitle,
    matchTitle,
    category,
    simple: formulaId ? { formulaId } : null,
    detailed: modelCode ? { modelCode } : null,
  }
})

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

export function modeLabelKeys(item) {
  if (item.simple && item.detailed) return ['calculations.modes.quick', 'calculations.modes.detailedAvailable']
  if (item.simple) return ['calculations.modes.quick']
  return ['calculations.modes.advanced']
}
