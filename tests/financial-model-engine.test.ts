import { describe, expect, it } from 'vitest'
import { runFinancialModel } from '../src/services/financial-models/engine'
import { FINANCIAL_MODEL_REGISTRY } from '../src/services/financial-models/registry'
import { recommendFinancialModels } from '../src/services/financial-models/suitability'

const CASES: Array<[string, Record<string, unknown>, string]> = [
  ['CURRENT_RATIO', { currentAssets: 200, currentLiabilities: 100 }, 'currentRatio'],
  ['QUICK_RATIO', { currentAssets: 200, inventory: 50, currentLiabilities: 100 }, 'quickRatio'],
  ['NET_WORKING_CAPITAL', { currentAssets: 200, currentLiabilities: 100 }, 'netWorkingCapital'],
  ['DUPONT_3_STEP', { netIncome: 20, revenue: 200, averageAssets: 100, averageEquity: 50 }, 'roe'],
  ['PROFIT_TO_CASH', { netIncome: 100, depreciation: 20, otherNonCash: 5, workingCapitalIncrease: 30, capitalExpenditure: 25 }, 'freeCashProxy'],
  ['CASH_CONVERSION_CYCLE', { dio: 45, dso: 30, dpo: 20 }, 'cashConversionCycle'],
  ['DIO', { averageInventory: 100, costOfGoodsSold: 1000, periodDays: 365 }, 'dio'],
  ['DSO', { averageReceivables: 100, creditSales: 1000, periodDays: 365 }, 'dso'],
  ['DPO', { averagePayables: 100, creditPurchases: 1000, periodDays: 365 }, 'dpo'],
  ['BREAK_EVEN_QUANTITY', { fixedCosts: 1000, unitPrice: 100, unitVariableCost: 60 }, 'breakEvenQuantity'],
  ['CONTRIBUTION_MARGIN', { revenue: 1000, variableCosts: 600 }, 'contributionMargin'],
  ['PRODUCT_PROFITABILITY', { netPrice: 200, productCost: 80, operationsCost: 20, channelCost: 15, riskCost: 5 }, 'productMargin'],
  ['ORDER_PROFITABILITY', { orderRevenue: 300, productCost: 100, commission: 30, paymentFee: 5, shipping: 20, advertising: 10, operations: 15 }, 'orderMargin'],
  ['POST_RETURN_MARGIN', { grossContribution: 1000, orders: 100, returnRate: 10, lossPerReturn: 20, netRevenue: 5000 }, 'postReturnMargin'],
  ['CAC', { marketingSpend: 1000, salesSpend: 500, campaignSpend: 200, agencySpend: 300, newCustomers: 20 }, 'cac'],
  ['LTV', { monthlyRevenuePerCustomer: 100, grossMarginRate: 60, monthlyChurnRate: 5 }, 'ltv'],
  ['LTV_CAC', { ltv: 1200, cac: 300 }, 'ltvCacRatio'],
  ['CAC_PAYBACK', { cac: 300, monthlyRevenuePerCustomer: 100, grossMarginRate: 60 }, 'cacPaybackMonths'],
  ['GROSS_BURN', { operatingOutflows: 1000, payrollOutflows: 500, capitalOutflows: 200, otherOutflows: 100 }, 'grossBurn'],
  ['NET_BURN', { grossBurn: 1800, cashInflows: 1200 }, 'netBurn'],
  ['RUNWAY', { availableCash: 6000, netBurn: 1000 }, 'runwayMonths'],
  ['NPV', { cashFlows: [-1000, 400, 400, 400], discountRate: 10 }, 'npv'],
  ['IRR', { cashFlows: [-1000, 400, 400, 400] }, 'irr'],
  ['WACC_FCFF_DCF', {
    equityValue: 7000,
    debtValue: 3000,
    riskFreeRate: 10,
    beta: 1,
    marketRiskPremium: 5,
    borrowingCost: 12,
    taxRate: 25,
    fcffYear1: 1000,
    forecastGrowth: 5,
    forecastYears: 5,
    terminalGrowth: 3,
    netDebt: 2500,
  }, 'equityValueBase'],
]

describe('Phase 6 deterministic financial model engine', () => {
  it('registers exactly the first 24 working models', () => {
    expect(FINANCIAL_MODEL_REGISTRY).toHaveLength(24)
    expect(new Set(FINANCIAL_MODEL_REGISTRY.map(model => model.code)).size).toBe(24)
  })

  it.each(CASES)('%s produces its required output with trace and checks', (code, inputs, outputKey) => {
    const result = runFinancialModel(code, inputs, Object.entries(inputs).map(([key, value]) => ({
      key,
      value,
      sourceType: 'user' as const,
      userVerified: true,
      effectiveDate: new Date().toISOString(),
    })))
    expect(result.outputs).toHaveProperty(outputKey)
    expect(result.trace.length).toBeGreaterThan(0)
    expect(result.checks.every(check => check.passed)).toBe(true)
    expect(result.confidence.score).toBeGreaterThanOrEqual(50)
    expect(result.ethics).toHaveLength(4)
  })

  it('replays the same input deterministically', () => {
    const inputs = { fixedCosts: 1000, unitPrice: 100, unitVariableCost: 60 }
    expect(runFinancialModel('BREAK_EVEN_QUANTITY', inputs)).toEqual(runFinancialModel('BREAK_EVEN_QUANTITY', inputs))
  })

  it('returns requirements instead of fabricating missing DCF market inputs', () => {
    expect(() => runFinancialModel('WACC_FCFF_DCF', { fcffYear1: 1000 })).toThrow(/zorunludur/)
  })

  it('rejects DCF when terminal growth is not below WACC', () => {
    expect(() => runFinancialModel('WACC_FCFF_DCF', {
      equityValue: 100,
      debtValue: 0,
      riskFreeRate: 1,
      beta: 0,
      marketRiskPremium: 0,
      borrowingCost: 0,
      taxRate: 0,
      fcffYear1: 10,
      forecastGrowth: 2,
      forecastYears: 5,
      terminalGrowth: 2,
      netDebt: 0,
    })).toThrow(/WACC terminal büyüme/)
  })

  it('recommends order profitability for an e-commerce question with missing fields', () => {
    const recommendations = recommendFinancialModels({
      question: 'Pazar yeri siparişinde komisyon ve iade sonrası gerçekten kâr ediyor muyum?',
      availableFields: ['orderRevenue'],
    })
    expect(recommendations.map(item => item.code)).toContain('ORDER_PROFITABILITY')
    expect(recommendations[0].missingData.length).toBeGreaterThan(0)
  })
})
