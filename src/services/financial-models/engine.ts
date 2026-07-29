import { calculateModelConfidence } from './confidence.js'
import { getFinancialModel } from './registry.js'
import type {
  CalculationStep,
  FinancialModelDefinition,
  FinancialModelResult,
  ModelAssumptionInput,
  ValidationCheck,
} from './types.js'

const ROUNDING = '2 ondalık, half away from zero'

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function ratio(numerator: number, denominator: number, label: string): number {
  if (denominator === 0) throw new Error(`${label} sıfır olamaz.`)
  return numerator / denominator
}

function trace(
  steps: CalculationStep[],
  key: string,
  label: string,
  formula: string,
  inputs: Record<string, unknown>,
  result: unknown,
): unknown {
  steps.push({ key, label, formula, inputs, result, rounding: ROUNDING })
  return result
}

function normalizeInputs(
  model: FinancialModelDefinition,
  raw: Record<string, unknown>,
): { normalized: Record<string, number | number[]>; checks: ValidationCheck[]; errors: string[] } {
  const normalized: Record<string, number | number[]> = {}
  const checks: ValidationCheck[] = []
  const errors: string[] = []

  for (const input of model.inputs) {
    const value = raw[input.key]
    if (value === undefined || value === null || value === '') {
      const passed = !input.required
      checks.push({
        code: `INPUT_${input.key.toUpperCase()}_PRESENT`,
        label: `${input.label} mevcut`,
        passed,
        severity: passed ? 'info' : 'error',
        detail: passed ? 'Opsiyonel alan boş bırakıldı.' : 'Zorunlu veri eksik.',
      })
      if (!passed) errors.push(`${input.label} zorunludur.`)
      continue
    }

    if (input.type === 'number_array') {
      const arrayValue = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split(/[;,\n]/).map(item => item.trim()).filter(Boolean)
          : []
      const numbers = arrayValue.map(Number)
      const valid = numbers.length >= 2 && numbers.every(Number.isFinite)
      checks.push({
        code: `INPUT_${input.key.toUpperCase()}_VALID`,
        label: `${input.label} geçerli`,
        passed: valid,
        severity: valid ? 'info' : 'error',
        detail: valid ? `${numbers.length} dönemlik seri alındı.` : 'En az iki sonlu sayı gerekir.',
      })
      if (!valid) errors.push(`${input.label} en az iki geçerli sayı içermelidir.`)
      else normalized[input.key] = numbers
      continue
    }

    const numberValue = Number(value)
    const finite = Number.isFinite(numberValue)
    const integerOk = input.type !== 'integer' || Number.isInteger(numberValue)
    const minOk = input.min === undefined || numberValue >= input.min
    const maxOk = input.max === undefined || numberValue <= input.max
    const valid = finite && integerOk && minOk && maxOk
    checks.push({
      code: `INPUT_${input.key.toUpperCase()}_VALID`,
      label: `${input.label} geçerli`,
      passed: valid,
      severity: valid ? 'info' : 'error',
      detail: valid
        ? `${numberValue} ${input.unit}`
        : `Beklenen tür/aralık sağlanmadı${input.min !== undefined ? `; min ${input.min}` : ''}${input.max !== undefined ? `; max ${input.max}` : ''}.`,
    })
    if (!valid) errors.push(`${input.label} geçersiz.`)
    else normalized[input.key] = numberValue
  }
  return { normalized, checks, errors }
}

function n(inputs: Record<string, number | number[]>, key: string): number {
  return inputs[key] as number
}

function a(inputs: Record<string, number | number[]>, key: string): number[] {
  return inputs[key] as number[]
}

function npv(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((sum, cashFlow, period) => sum + cashFlow / ((1 + rate) ** period), 0)
}

function calculateIrr(cashFlows: number[]): { irr: number; iterations: number } {
  const signChanges = cashFlows.slice(1).reduce(
    (count, value, index) => count + (Math.sign(value) !== Math.sign(cashFlows[index]) && value !== 0 && cashFlows[index] !== 0 ? 1 : 0),
    0,
  )
  if (!cashFlows.some(value => value < 0) || !cashFlows.some(value => value > 0)) {
    throw new Error('IRR için en az bir negatif ve bir pozitif nakit akışı gerekir.')
  }
  let low = -0.9999
  let high = 10
  let lowValue = npv(cashFlows, low)
  let highValue = npv(cashFlows, high)
  if (lowValue * highValue > 0) throw new Error('Belirlenen aralıkta IRR kökü bulunamadı; NPV profilini inceleyin.')
  let mid = 0
  let iterations = 0
  for (; iterations < 200; iterations += 1) {
    mid = (low + high) / 2
    const value = npv(cashFlows, mid)
    if (Math.abs(value) < 1e-8) break
    if (lowValue * value <= 0) {
      high = mid
      highValue = value
    } else {
      low = mid
      lowValue = value
    }
  }
  if (signChanges > 1) {
    // Result remains deterministic; the warning is added by the caller.
  }
  return { irr: mid, iterations: iterations + 1 }
}

function dcfValue(params: {
  fcffYear1: number
  growth: number
  years: number
  wacc: number
  terminalGrowth: number
}): { enterpriseValue: number; terminalValue: number; terminalShare: number; projectedFcff: number[] } {
  if (params.wacc <= params.terminalGrowth) throw new Error('WACC terminal büyüme oranından büyük olmalıdır.')
  const projectedFcff: number[] = []
  let presentValue = 0
  let cashFlow = params.fcffYear1
  for (let year = 1; year <= params.years; year += 1) {
    if (year > 1) cashFlow *= 1 + params.growth
    projectedFcff.push(round(cashFlow))
    presentValue += cashFlow / ((1 + params.wacc) ** year)
  }
  const terminalCashFlow = cashFlow * (1 + params.terminalGrowth)
  const terminalValue = terminalCashFlow / (params.wacc - params.terminalGrowth)
  const presentTerminal = terminalValue / ((1 + params.wacc) ** params.years)
  const enterpriseValue = presentValue + presentTerminal
  return {
    enterpriseValue,
    terminalValue,
    terminalShare: enterpriseValue === 0 ? 0 : presentTerminal / enterpriseValue,
    projectedFcff,
  }
}

function ethicsChecks(assumptions: ModelAssumptionInput[], model: FinancialModelDefinition): ValidationCheck[] {
  const sourceDisclosed = assumptions.length > 0 && assumptions.every(item => Boolean(item.sourceType))
  const unverifiedFacts = assumptions.filter(item => item.sourceType === 'user' && !item.userVerified)
  return [
    { code: 'ETHICS_SOURCE_DISCLOSED', label: 'Veri kaynakları açıklanmış', passed: sourceDisclosed, severity: sourceDisclosed ? 'info' : 'warning', detail: sourceDisclosed ? 'Varsayım kaynakları kaydedildi.' : 'Girdi kaynakları tam açıklanmadı.' },
    { code: 'ETHICS_ASSUMPTION_DISCLOSED', label: 'Varsayımlar olgu gibi sunulmuyor', passed: unverifiedFacts.length === 0, severity: unverifiedFacts.length ? 'warning' : 'info', detail: unverifiedFacts.length ? `${unverifiedFacts.length} kullanıcı varsayımı doğrulanmadı.` : 'Doğrulanmamış kullanıcı varsayımı yok.' },
    { code: 'ETHICS_LIMITATIONS_VISIBLE', label: 'Sınırlamalar görünür', passed: model.limitations.length > 0, severity: 'info', detail: `${model.limitations.length} sınırlama modelle birlikte döndürülür.` },
    { code: 'ETHICS_NO_ADVICE', label: 'Yatırım tavsiyesi üretilmiyor', passed: true, severity: 'info', detail: 'Çıktı karar desteğidir; kişiselleştirilmiş yatırım tavsiyesi değildir.' },
  ]
}

export function runFinancialModel(
  modelCode: string,
  rawInputs: Record<string, unknown>,
  assumptions: ModelAssumptionInput[] = [],
): FinancialModelResult {
  const model = getFinancialModel(modelCode)
  if (!model) throw new Error('Finansal model bulunamadı.')
  const validation = normalizeInputs(model, rawInputs)
  if (validation.errors.length) {
    const error = new Error(validation.errors.join(' '))
    ;(error as any).validationChecks = validation.checks
    throw error
  }

  const inputs = validation.normalized
  const outputs: Record<string, unknown> = {}
  const steps: CalculationStep[] = []
  const checks = [...validation.checks]
  const warnings = [...model.warningRules]

  switch (model.code) {
    case 'CURRENT_RATIO': {
      const value = ratio(n(inputs, 'currentAssets'), n(inputs, 'currentLiabilities'), 'Kısa vadeli yükümlülükler')
      outputs.currentRatio = round(value)
      trace(steps, 'currentRatio', 'Cari oran', 'currentAssets / currentLiabilities', { currentAssets: n(inputs, 'currentAssets'), currentLiabilities: n(inputs, 'currentLiabilities') }, outputs.currentRatio)
      break
    }
    case 'QUICK_RATIO': {
      checks.push({ code: 'INVENTORY_NOT_ABOVE_CURRENT_ASSETS', label: 'Stok dönen varlığı aşmıyor', passed: n(inputs, 'inventory') <= n(inputs, 'currentAssets'), severity: 'error', detail: 'Stok, dönen varlık toplamından büyük olmamalıdır.' })
      if (!checks.at(-1)!.passed) throw new Error('Stok dönen varlık toplamından büyük olamaz.')
      outputs.quickRatio = round(ratio(n(inputs, 'currentAssets') - n(inputs, 'inventory'), n(inputs, 'currentLiabilities'), 'Kısa vadeli yükümlülükler'))
      trace(steps, 'quickRatio', 'Asit-test oranı', '(currentAssets - inventory) / currentLiabilities', { currentAssets: n(inputs, 'currentAssets'), inventory: n(inputs, 'inventory'), currentLiabilities: n(inputs, 'currentLiabilities') }, outputs.quickRatio)
      break
    }
    case 'NET_WORKING_CAPITAL':
      outputs.netWorkingCapital = round(n(inputs, 'currentAssets') - n(inputs, 'currentLiabilities'))
      trace(steps, 'netWorkingCapital', 'Net işletme sermayesi', 'currentAssets - currentLiabilities', inputs, outputs.netWorkingCapital)
      break
    case 'DUPONT_3_STEP': {
      const margin = ratio(n(inputs, 'netIncome'), n(inputs, 'revenue'), 'Net satışlar')
      const turnover = ratio(n(inputs, 'revenue'), n(inputs, 'averageAssets'), 'Ortalama varlıklar')
      const multiplier = ratio(n(inputs, 'averageAssets'), n(inputs, 'averageEquity'), 'Ortalama özsermaye')
      outputs.netMargin = round(margin * 100)
      outputs.assetTurnover = round(turnover)
      outputs.equityMultiplier = round(multiplier)
      outputs.roe = round(margin * turnover * multiplier * 100)
      trace(steps, 'dupont', 'DuPont bileşimi', 'netMargin × assetTurnover × equityMultiplier', { margin, turnover, multiplier }, outputs.roe)
      break
    }
    case 'PROFIT_TO_CASH': {
      const operating = n(inputs, 'netIncome') + n(inputs, 'depreciation') + n(inputs, 'otherNonCash') - n(inputs, 'workingCapitalIncrease')
      outputs.operatingCashProxy = round(operating)
      outputs.freeCashProxy = round(operating - n(inputs, 'capitalExpenditure'))
      trace(steps, 'operatingCashProxy', 'Faaliyet nakit yaklaşımı', 'netIncome + depreciation + otherNonCash - workingCapitalIncrease', inputs, outputs.operatingCashProxy)
      trace(steps, 'freeCashProxy', 'Serbest nakit yaklaşımı', 'operatingCashProxy - capitalExpenditure', { operating, capitalExpenditure: n(inputs, 'capitalExpenditure') }, outputs.freeCashProxy)
      break
    }
    case 'CASH_CONVERSION_CYCLE':
      outputs.cashConversionCycle = round(n(inputs, 'dio') + n(inputs, 'dso') - n(inputs, 'dpo'))
      trace(steps, 'cashConversionCycle', 'Nakit dönüşüm süresi', 'DIO + DSO - DPO', inputs, outputs.cashConversionCycle)
      break
    case 'DIO':
      outputs.dio = round(ratio(n(inputs, 'averageInventory'), n(inputs, 'costOfGoodsSold'), 'Satışların maliyeti') * n(inputs, 'periodDays'))
      trace(steps, 'dio', 'Stokta kalma süresi', '(averageInventory / costOfGoodsSold) × periodDays', inputs, outputs.dio)
      break
    case 'DSO':
      outputs.dso = round(ratio(n(inputs, 'averageReceivables'), n(inputs, 'creditSales'), 'Kredili satışlar') * n(inputs, 'periodDays'))
      trace(steps, 'dso', 'Tahsilat süresi', '(averageReceivables / creditSales) × periodDays', inputs, outputs.dso)
      break
    case 'DPO':
      outputs.dpo = round(ratio(n(inputs, 'averagePayables'), n(inputs, 'creditPurchases'), 'Kredili alışlar') * n(inputs, 'periodDays'))
      trace(steps, 'dpo', 'Tedarikçi ödeme süresi', '(averagePayables / creditPurchases) × periodDays', inputs, outputs.dpo)
      break
    case 'BREAK_EVEN_QUANTITY': {
      const contribution = n(inputs, 'unitPrice') - n(inputs, 'unitVariableCost')
      if (contribution <= 0) throw new Error('Birim katkı payı pozitif olmalıdır.')
      const quantity = Math.ceil(n(inputs, 'fixedCosts') / contribution)
      outputs.unitContribution = round(contribution)
      outputs.breakEvenQuantity = quantity
      outputs.breakEvenRevenue = round(quantity * n(inputs, 'unitPrice'))
      trace(steps, 'unitContribution', 'Birim katkı', 'unitPrice - unitVariableCost', inputs, outputs.unitContribution)
      trace(steps, 'breakEvenQuantity', 'Başa baş adedi', 'ceil(fixedCosts / unitContribution)', { fixedCosts: n(inputs, 'fixedCosts'), contribution }, quantity)
      break
    }
    case 'CONTRIBUTION_MARGIN': {
      const contribution = n(inputs, 'revenue') - n(inputs, 'variableCosts')
      outputs.contribution = round(contribution)
      outputs.contributionMargin = round(ratio(contribution, n(inputs, 'revenue'), 'Net satışlar') * 100)
      trace(steps, 'contribution', 'Katkı payı', 'revenue - variableCosts', inputs, outputs.contribution)
      break
    }
    case 'PRODUCT_PROFITABILITY': {
      const contribution = n(inputs, 'netPrice') - n(inputs, 'productCost') - n(inputs, 'operationsCost') - n(inputs, 'channelCost') - n(inputs, 'riskCost')
      outputs.productContribution = round(contribution)
      outputs.productMargin = round(ratio(contribution, n(inputs, 'netPrice'), 'Net satış fiyatı') * 100)
      trace(steps, 'productContribution', 'Ürün katkısı', 'netPrice - all attributable costs', inputs, outputs.productContribution)
      break
    }
    case 'ORDER_PROFITABILITY': {
      const contribution = n(inputs, 'orderRevenue') - n(inputs, 'productCost') - n(inputs, 'commission') - n(inputs, 'paymentFee') - n(inputs, 'shipping') - n(inputs, 'advertising') - n(inputs, 'operations')
      outputs.orderContribution = round(contribution)
      outputs.orderMargin = round(ratio(contribution, n(inputs, 'orderRevenue'), 'Sipariş geliri') * 100)
      trace(steps, 'orderContribution', 'Sipariş katkısı', 'orderRevenue - attributable order costs', inputs, outputs.orderContribution)
      break
    }
    case 'POST_RETURN_MARGIN': {
      const loss = n(inputs, 'orders') * n(inputs, 'returnRate') / 100 * n(inputs, 'lossPerReturn')
      const contribution = n(inputs, 'grossContribution') - loss
      outputs.expectedReturnLoss = round(loss)
      outputs.postReturnContribution = round(contribution)
      outputs.postReturnMargin = round(ratio(contribution, n(inputs, 'netRevenue'), 'Net gelir') * 100)
      trace(steps, 'expectedReturnLoss', 'Beklenen iade kaybı', 'orders × returnRate × lossPerReturn', inputs, outputs.expectedReturnLoss)
      trace(steps, 'postReturnContribution', 'İade sonrası katkı', 'grossContribution - expectedReturnLoss', { grossContribution: n(inputs, 'grossContribution'), loss }, outputs.postReturnContribution)
      break
    }
    case 'CAC': {
      const spend = n(inputs, 'marketingSpend') + n(inputs, 'salesSpend') + n(inputs, 'campaignSpend') + n(inputs, 'agencySpend')
      outputs.cac = round(ratio(spend, n(inputs, 'newCustomers'), 'Yeni müşteri sayısı'))
      trace(steps, 'cac', 'Müşteri edinme maliyeti', 'totalAcquisitionSpend / newCustomers', { spend, newCustomers: n(inputs, 'newCustomers') }, outputs.cac)
      break
    }
    case 'LTV': {
      const churn = n(inputs, 'monthlyChurnRate') / 100
      if (churn <= 0) throw new Error('Aylık churn sıfırdan büyük olmalıdır.')
      const lifetime = 1 / churn
      outputs.impliedLifetimeMonths = round(lifetime)
      outputs.ltv = round(n(inputs, 'monthlyRevenuePerCustomer') * n(inputs, 'grossMarginRate') / 100 * lifetime)
      trace(steps, 'ltv', 'Yaşam boyu değer', 'monthlyRevenuePerCustomer × grossMargin / monthlyChurn', inputs, outputs.ltv)
      break
    }
    case 'LTV_CAC':
      outputs.ltvCacRatio = round(ratio(n(inputs, 'ltv'), n(inputs, 'cac'), 'CAC'))
      trace(steps, 'ltvCacRatio', 'LTV/CAC', 'ltv / cac', inputs, outputs.ltvCacRatio)
      break
    case 'CAC_PAYBACK': {
      const monthlyGrossProfit = n(inputs, 'monthlyRevenuePerCustomer') * n(inputs, 'grossMarginRate') / 100
      outputs.cacPaybackMonths = round(ratio(n(inputs, 'cac'), monthlyGrossProfit, 'Müşteri başına aylık brüt kâr'))
      trace(steps, 'cacPaybackMonths', 'CAC geri ödeme', 'cac / monthlyGrossProfitPerCustomer', { cac: n(inputs, 'cac'), monthlyGrossProfit }, outputs.cacPaybackMonths)
      break
    }
    case 'GROSS_BURN':
      outputs.grossBurn = round(n(inputs, 'operatingOutflows') + n(inputs, 'payrollOutflows') + n(inputs, 'capitalOutflows') + n(inputs, 'otherOutflows'))
      trace(steps, 'grossBurn', 'Brüt nakit tüketimi', 'sum(all cash outflows)', inputs, outputs.grossBurn)
      break
    case 'NET_BURN':
      outputs.netBurn = round(Math.max(0, n(inputs, 'grossBurn') - n(inputs, 'cashInflows')))
      outputs.netCashGeneration = round(Math.max(0, n(inputs, 'cashInflows') - n(inputs, 'grossBurn')))
      trace(steps, 'netBurn', 'Net nakit tüketimi', 'max(0, grossBurn - cashInflows)', inputs, outputs.netBurn)
      break
    case 'RUNWAY':
      outputs.runwayMonths = n(inputs, 'netBurn') === 0 ? null : round(n(inputs, 'availableCash') / n(inputs, 'netBurn'))
      outputs.cashGenerating = n(inputs, 'netBurn') === 0
      trace(steps, 'runwayMonths', 'Nakit dayanma süresi', 'availableCash / netBurn', inputs, outputs.runwayMonths)
      if (n(inputs, 'netBurn') === 0) warnings.push('Net burn sıfır olduğu için sonlu runway hesaplanmadı.')
      break
    case 'NPV': {
      const cashFlows = a(inputs, 'cashFlows')
      const rate = n(inputs, 'discountRate') / 100
      outputs.npv = round(npv(cashFlows, rate))
      outputs.presentValueInflows = round(cashFlows.slice(1).filter(value => value > 0).reduce((sum, value, index) => sum + value / ((1 + rate) ** (index + 1)), 0))
      trace(steps, 'npv', 'Net bugünkü değer', 'Σ CFt/(1+r)^t', { cashFlows, rate }, outputs.npv)
      break
    }
    case 'IRR': {
      const cashFlows = a(inputs, 'cashFlows')
      const result = calculateIrr(cashFlows)
      outputs.irr = round(result.irr * 100, 4)
      outputs.iterations = result.iterations
      trace(steps, 'irr', 'İç verim oranı', 'NPV(rate) = 0 için bisection', { cashFlows }, outputs.irr)
      const signChanges = cashFlows.slice(1).reduce((count, value, index) => count + (Math.sign(value) !== Math.sign(cashFlows[index]) && value !== 0 && cashFlows[index] !== 0 ? 1 : 0), 0)
      if (signChanges > 1) warnings.push('Nakit akışı birden fazla işaret değişimi içeriyor; birden fazla IRR olasılığı nedeniyle NPV profili incelenmelidir.')
      break
    }
    case 'WACC_FCFF_DCF': {
      const totalCapital = n(inputs, 'equityValue') + n(inputs, 'debtValue')
      if (totalCapital <= 0) throw new Error('Toplam sermaye değeri pozitif olmalıdır.')
      const costOfEquity = n(inputs, 'riskFreeRate') + n(inputs, 'beta') * n(inputs, 'marketRiskPremium')
      const waccPercent = n(inputs, 'equityValue') / totalCapital * costOfEquity
        + n(inputs, 'debtValue') / totalCapital * n(inputs, 'borrowingCost') * (1 - n(inputs, 'taxRate') / 100)
      const wacc = waccPercent / 100
      const terminalGrowth = n(inputs, 'terminalGrowth') / 100
      const growth = n(inputs, 'forecastGrowth') / 100
      const base = dcfValue({ fcffYear1: n(inputs, 'fcffYear1'), growth, years: n(inputs, 'forecastYears'), wacc, terminalGrowth })
      const low = dcfValue({ fcffYear1: n(inputs, 'fcffYear1'), growth: growth - 0.01, years: n(inputs, 'forecastYears'), wacc: wacc + 0.01, terminalGrowth: terminalGrowth - 0.005 })
      const highWacc = Math.max(terminalGrowth + 0.0001, wacc - 0.01)
      const high = dcfValue({ fcffYear1: n(inputs, 'fcffYear1'), growth: growth + 0.01, years: n(inputs, 'forecastYears'), wacc: highWacc, terminalGrowth: terminalGrowth + 0.005 })
      outputs.costOfEquity = round(costOfEquity)
      outputs.wacc = round(waccPercent)
      outputs.enterpriseValueBase = round(base.enterpriseValue)
      outputs.equityValueBase = round(base.enterpriseValue - n(inputs, 'netDebt'))
      outputs.equityValueLow = round(low.enterpriseValue - n(inputs, 'netDebt'))
      outputs.equityValueHigh = round(high.enterpriseValue - n(inputs, 'netDebt'))
      outputs.terminalValueShare = round(base.terminalShare * 100)
      outputs.sensitivity = {
        adverse: { wacc: round((wacc + 0.01) * 100), terminalGrowth: round((terminalGrowth - 0.005) * 100), equityValue: outputs.equityValueLow },
        base: { wacc: outputs.wacc, terminalGrowth: n(inputs, 'terminalGrowth'), equityValue: outputs.equityValueBase },
        optimistic: { wacc: round(highWacc * 100), terminalGrowth: round((terminalGrowth + 0.005) * 100), equityValue: outputs.equityValueHigh },
      }
      trace(steps, 'costOfEquity', 'Özsermaye maliyeti', 'riskFreeRate + beta × marketRiskPremium', inputs, outputs.costOfEquity)
      trace(steps, 'wacc', 'Ağırlıklı sermaye maliyeti', 'E/V×Ke + D/V×Kd×(1-T)', inputs, outputs.wacc)
      trace(steps, 'projectedFcff', 'FCFF tahmini', 'FCFF1 × (1+growth)^(t-1)', { fcffYear1: n(inputs, 'fcffYear1'), growth, years: n(inputs, 'forecastYears') }, base.projectedFcff)
      trace(steps, 'enterpriseValueBase', 'Baz firma değeri', 'PV(FCFF) + PV(Terminal Value)', { projectedFcff: base.projectedFcff, terminalValue: base.terminalValue, wacc }, outputs.enterpriseValueBase)
      checks.push({ code: 'WACC_ABOVE_TERMINAL_GROWTH', label: 'WACC terminal büyümeden yüksek', passed: wacc > terminalGrowth, severity: 'error', detail: `${round(wacc * 100)}% > ${round(terminalGrowth * 100)}%` })
      checks.push({ code: 'TERMINAL_SHARE_VISIBLE', label: 'Terminal değer payı görünür', passed: true, severity: 'warning', detail: `Firma değerinin %${outputs.terminalValueShare} bölümü terminal değerden geliyor.` })
      break
    }
    default:
      throw new Error('Model hesaplama motoru uygulanmamış.')
  }

  const ethics = ethicsChecks(assumptions, model)
  const confidence = calculateModelConfidence({
    requiredInputCount: model.inputs.filter(item => item.required).length,
    suppliedInputCount: Object.keys(inputs).length,
    assumptions,
    checks: [...checks, ...ethics],
  })

  return {
    modelCode: model.code,
    engineVersion: model.engineVersion,
    policyVersion: model.policyVersion,
    normalizedInputs: inputs,
    outputs,
    checks,
    warnings,
    trace: steps,
    confidence,
    ethics,
  }
}
