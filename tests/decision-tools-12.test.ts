import { describe, expect, it } from 'vitest'
import {
  calculateStructuredDecisionTool,
  STRUCTURED_TOOL_CONFIGS,
  validateStructuredToolAnswers
} from '../src/services/decision-tool-catalog'

export const validInputs: Record<string, Record<string, number>> = {
  'DC-DISCOUNT-002': { salePrice: 1000, unitCost: 500, commissionRate: 10, plannedDiscountRate: 15, currentMonthlyUnits: 100, expectedSalesLiftPercent: 30 },
  'DC-FREESHIP-003': { basketValue: 1200, basketProductCost: 600, commissionRate: 10, packagingCost: 20, carrierCost: 80, customerShippingFee: 60, itemsPerBasket: 3 },
  'DC-MARKETPLACE-004': { salePrice: 1000, productCost: 400, commissionRate: 15, serviceFee: 25, adCost: 50, shippingCost: 60, packagingCost: 15, directChannelFeeRate: 4 },
  'DC-ADS-005': { adSpend: 10000, revenueFromAds: 50000, ordersFromAds: 200, unitContributionBeforeAds: 90, conversionRate: 3, plannedIncreasePercent: 20, expectedEfficiencyChangePercent: -10 },
  'DC-HIRE-006': { grossSalary: 30000, employerOnCostRate: 25, otherMonthlyCost: 5000, expectedMonthlyRevenue: 120000, contributionMarginRate: 40, monthlyFreeCash: 60000, cashReserve: 150000 },
  'DC-LOAN-007': { monthlyInstallment: 20000, monthlyFreeCash: 70000, existingDebtPayments: 10000, cashReserve: 120000, termMonths: 24, downsideCashDropPercent: 25 },
  'DC-CASHFLOW-008': { openingCash: 200000, monthlyCashInflow: 300000, monthlyCashOutflow: 260000, receivableDays: 45, payableDays: 30, minimumCashBuffer: 80000 },
  'DC-BRANCH-009': { initialInvestment: 500000, monthlyFixedCost: 120000, expectedMonthlyRevenue: 500000, contributionMarginRate: 35, cashReserve: 1000000, rampUpMonths: 4, downsideRevenuePercent: 25 },
  'DC-CAMPAIGN-010': { currentUnitPrice: 500, unitVariableCost: 250, discountRate: 10, campaignFixedCost: 10000, baselineUnits: 100, expectedLiftLow: 20, expectedLiftMedium: 50, expectedLiftHigh: 90 },
  'DC-STOCK-011': { currentStock: 500, averageDailySales: 20, leadTimeDays: 14, demandVariabilityPercent: 25, unitHoldingCostMonthly: 3, plannedOrderQuantity: 250 },
  'DC-CONTINUE-012': { salePrice: 500, unitVariableCost: 300, monthlyUnits: 100, returnRate: 10, returnLossPerUnit: 100, monthlyHoldingCost: 2000, alternativeMonthlyContribution: 12000 },
  // Secenekli girdiler sayi olarak tasinir: 0 en dusuk, 2 en yuksek kademe.
  'DC-TAX-013': { estimatedAnnualProfit: 1500000, profitRetentionIntent: 2, investorGoal: 1, partnerCount: 2, liabilitySensitivity: 2, growthPlan: 1 }
}

describe('12 Decision Tools - architecture guardrails', () => {
  it('defines exactly 11 additional tools with unique codes and field signatures', () => {
    expect(STRUCTURED_TOOL_CONFIGS).toHaveLength(12)
    expect(new Set(STRUCTURED_TOOL_CONFIGS.map(tool => tool.code)).size).toBe(12)
    const signatures = STRUCTURED_TOOL_CONFIGS.map(tool => tool.questions.map(question => question.code).sort().join('|'))
    expect(new Set(signatures).size).toBe(12)
  })

  it('gives every tool unique formulas, checks and submit language', () => {
    expect(new Set(STRUCTURED_TOOL_CONFIGS.map(tool => tool.formulas.join('|'))).size).toBe(12)
    expect(new Set(STRUCTURED_TOOL_CONFIGS.map(tool => tool.decisionChecks.join('|'))).size).toBe(12)
    expect(new Set(STRUCTURED_TOOL_CONFIGS.map(tool => tool.submitLabel)).size).toBe(12)
  })

  it.each(STRUCTURED_TOOL_CONFIGS.map(tool => [tool.code]))('%s validates its own complete input and produces an explainable snapshot', (code) => {
    const validation = validateStructuredToolAnswers(code, validInputs[code])
    expect(validation.success).toBe(true)
    const calculation = calculateStructuredDecisionTool(code, validInputs[code])
    expect(calculation.metrics.length).toBeGreaterThanOrEqual(4)
    expect(calculation.scenarios.length).toBeGreaterThanOrEqual(2)
    expect(calculation.formulas.length).toBeGreaterThanOrEqual(3)
    expect(calculation.safeNextSteps.length).toBeGreaterThanOrEqual(2)
    expect(calculation.mentorSummary.length).toBeGreaterThanOrEqual(4)
  })

  it.each(STRUCTURED_TOOL_CONFIGS.map(tool => [tool.code, tool.questions[0].code]))('%s rejects a missing required field', (code, missingField) => {
    const invalid = { ...validInputs[code] }
    delete invalid[missingField]
    const validation = validateStructuredToolAnswers(code, invalid)
    expect(validation.success).toBe(false)
    if (!validation.success) expect(validation.fields).toContain(missingField)
  })
})

describe('Wave 1 - unique financial calculations', () => {
  it('calculates discount contribution, safe discount and campaign break-even separately', () => {
    const output = calculateStructuredDecisionTool('DC-DISCOUNT-002', validInputs['DC-DISCOUNT-002'])
    expect(output.metrics.find(metric => metric.key === 'discountedPrice')?.value).toBe(850)
    expect(output.metrics.find(metric => metric.key === 'baseContribution')?.value).toBe(400)
    expect(output.metrics.find(metric => metric.key === 'discountedContribution')?.value).toBe(265)
    expect(output.metrics.some(metric => metric.key === 'maxSafeDiscount')).toBe(true)
  })

  it('calculates free-shipping threshold from basket economics', () => {
    const output = calculateStructuredDecisionTool('DC-FREESHIP-003', validInputs['DC-FREESHIP-003'])
    expect(output.metrics.find(metric => metric.key === 'currentContribution')?.value).toBe(440)
    expect(output.metrics.find(metric => metric.key === 'freeContribution')?.value).toBe(380)
    expect(output.metrics.some(metric => metric.key === 'safeBasketThreshold')).toBe(true)
  })

  it('calculates marketplace net receipt and direct-channel comparison', () => {
    const output = calculateStructuredDecisionTool('DC-MARKETPLACE-004', validInputs['DC-MARKETPLACE-004'])
    expect(output.metrics.find(metric => metric.key === 'commission')?.value).toBe(150)
    expect(output.metrics.find(metric => metric.key === 'netReceipt')?.value).toBe(715)
    expect(output.scenarios.map(item => item.label)).toEqual(['Pazaryeri katkısı', 'Doğrudan kanal katkısı'])
  })
})

describe('Wave 2 - capacity and liquidity calculations', () => {
  it.each(['DC-ADS-005', 'DC-HIRE-006', 'DC-LOAN-007', 'DC-CASHFLOW-008'])('%s exposes tool-specific metrics', code => {
    const output = calculateStructuredDecisionTool(code, validInputs[code])
    const keys = output.metrics.map(metric => metric.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(output.summary.length).toBeGreaterThan(40)
  })
})

describe('Wave 3 - growth, campaign, inventory and portfolio calculations', () => {
  it.each(['DC-BRANCH-009', 'DC-CAMPAIGN-010', 'DC-STOCK-011', 'DC-CONTINUE-012'])('%s exposes a business-specific comparison', code => {
    const output = calculateStructuredDecisionTool(code, validInputs[code])
    expect(output.scenarios[0].label).not.toBe(output.scenarios[1].label)
    expect(output.formulas).toEqual(STRUCTURED_TOOL_CONFIGS.find(tool => tool.code === code)?.formulas)
  })
})
