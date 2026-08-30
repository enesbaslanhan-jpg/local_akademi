import { STRUCTURED_TOOL_CONFIGS } from '../../services/decision-tool-catalog.js'

export interface DecisionCheckEnglishTranslation {
  title: string
  description: string
  category: string
  definition?: Record<string, unknown>
}

const STRUCTURED_QUESTION_CODES: Record<string, string[]> = {
  'DC-DISCOUNT-002': ['salePrice', 'unitCost', 'commissionRate', 'plannedDiscountRate', 'currentMonthlyUnits', 'expectedSalesLiftPercent'],
  'DC-FREESHIP-003': ['basketValue', 'basketProductCost', 'commissionRate', 'packagingCost', 'carrierCost', 'customerShippingFee', 'itemsPerBasket'],
  'DC-MARKETPLACE-004': ['salePrice', 'productCost', 'commissionRate', 'serviceFee', 'adCost', 'shippingCost', 'packagingCost', 'directChannelFeeRate'],
  'DC-ADS-005': ['adSpend', 'revenueFromAds', 'ordersFromAds', 'unitContributionBeforeAds', 'conversionRate', 'plannedIncreasePercent', 'expectedEfficiencyChangePercent'],
  'DC-HIRE-006': ['grossSalary', 'employerOnCostRate', 'otherMonthlyCost', 'expectedMonthlyRevenue', 'contributionMarginRate', 'monthlyFreeCash', 'cashReserve'],
  'DC-LOAN-007': ['monthlyInstallment', 'monthlyFreeCash', 'existingDebtPayments', 'cashReserve', 'termMonths', 'downsideCashDropPercent'],
  'DC-CASHFLOW-008': ['openingCash', 'monthlyCashInflow', 'monthlyCashOutflow', 'receivableDays', 'payableDays', 'minimumCashBuffer'],
  'DC-BRANCH-009': ['initialInvestment', 'monthlyFixedCost', 'expectedMonthlyRevenue', 'contributionMarginRate', 'cashReserve', 'rampUpMonths', 'downsideRevenuePercent'],
  'DC-CAMPAIGN-010': ['currentUnitPrice', 'unitVariableCost', 'discountRate', 'campaignFixedCost', 'baselineUnits', 'expectedLiftLow', 'expectedLiftMedium', 'expectedLiftHigh'],
  'DC-STOCK-011': ['currentStock', 'averageDailySales', 'leadTimeDays', 'demandVariabilityPercent', 'unitHoldingCostMonthly', 'plannedOrderQuantity'],
  'DC-CONTINUE-012': ['salePrice', 'unitVariableCost', 'monthlyUnits', 'returnRate', 'returnLossPerUnit', 'monthlyHoldingCost', 'alternativeMonthlyContribution'],
  'DC-TAX-013': ['estimatedAnnualProfit', 'profitRetentionIntent', 'investorGoal', 'partnerCount', 'liabilitySensitivity', 'growthPlan'],
}

const QUESTION_LABELS: Record<string, string> = {
  salePrice: 'Current sales price', unitCost: 'Total cost per unit', commissionRate: 'Commission rate', plannedDiscountRate: 'Planned discount', currentMonthlyUnits: 'Current monthly units', expectedSalesLiftPercent: 'Expected sales increase', basketValue: 'Average basket value', basketProductCost: 'Cost of products in the basket', packagingCost: 'Packaging cost', carrierCost: 'Carrier charge', customerShippingFee: 'Shipping charged to the customer', itemsPerBasket: 'Items per basket', productCost: 'Product cost', serviceFee: 'Service and transaction fees', adCost: 'Advertising cost per unit', shippingCost: 'Seller shipping cost', directChannelFeeRate: 'Direct-channel fee rate', adSpend: 'Current advertising spend', revenueFromAds: 'Revenue attributed to ads', ordersFromAds: 'Orders attributed to ads', unitContributionBeforeAds: 'Order contribution before advertising', conversionRate: 'Conversion rate', plannedIncreasePercent: 'Planned budget increase', expectedEfficiencyChangePercent: 'Expected efficiency change', grossSalary: 'Monthly gross salary', employerOnCostRate: 'Employer on-cost rate', otherMonthlyCost: 'Other monthly cost', expectedMonthlyRevenue: 'Expected additional monthly revenue', contributionMarginRate: 'Contribution margin', monthlyFreeCash: 'Monthly free cash flow', cashReserve: 'Available cash reserve', monthlyInstallment: 'New monthly installment', existingDebtPayments: 'Existing monthly debt payments', termMonths: 'Remaining term', downsideCashDropPercent: 'Downside cash-flow decline', openingCash: 'Opening cash', monthlyCashInflow: 'Monthly cash inflow', monthlyCashOutflow: 'Monthly cash outflow', receivableDays: 'Average collection period', payableDays: 'Average payment period', minimumCashBuffer: 'Target minimum cash buffer', initialInvestment: 'Initial investment', monthlyFixedCost: 'Monthly fixed cost', rampUpMonths: 'Ramp-up period', downsideRevenuePercent: 'Downside revenue decline', currentUnitPrice: 'Current unit price', unitVariableCost: 'Variable cost per unit', discountRate: 'Campaign discount', campaignFixedCost: 'Campaign fixed cost', baselineUnits: 'Current units sold', expectedLiftLow: 'Low-scenario increase', expectedLiftMedium: 'Base-scenario increase', expectedLiftHigh: 'High-scenario increase', currentStock: 'Current inventory', averageDailySales: 'Average daily sales', leadTimeDays: 'Lead time', demandVariabilityPercent: 'Demand variability', unitHoldingCostMonthly: 'Monthly holding cost per unit', plannedOrderQuantity: 'Planned order quantity', monthlyUnits: 'Monthly units sold', returnRate: 'Return rate', returnLossPerUnit: 'Net loss per return', monthlyHoldingCost: 'Monthly inventory cost', alternativeMonthlyContribution: 'Alternative-product opportunity', estimatedAnnualProfit: 'Estimated annual profit', profitRetentionIntent: 'What do you plan to do with the profit?', investorGoal: 'Are you planning to raise outside investment?', partnerCount: 'How many partners will there be?', liabilitySensitivity: 'How important is personal-asset protection?', growthPlan: 'What is your three-year growth plan?',
}

const CHOICE_OPTIONS: Record<string, Array<{ value: number; label: string; description: string }>> = {
  profitRetentionIntent: [{ value: 0, label: 'Distribute almost all of it', description: 'Profit will become personal income.' }, { value: 1, label: 'Use a mixed approach', description: 'Some profit will remain in the business.' }, { value: 2, label: 'Retain most of it', description: 'Profit will be reinvested.' }],
  investorGoal: [{ value: 0, label: 'No', description: 'No outside investment is planned.' }, { value: 1, label: 'Possibly', description: 'Investment may be considered.' }, { value: 2, label: 'Yes', description: 'Outside investment is part of the plan.' }],
  liabilitySensitivity: [{ value: 0, label: 'Low importance', description: 'Risk and borrowing plans are limited.' }, { value: 1, label: 'Medium importance', description: 'Some separation is desirable.' }, { value: 2, label: 'High importance', description: 'I want to separate personal assets.' }],
  growthPlan: [{ value: 0, label: 'Stable', description: 'No rapid expansion is planned.' }, { value: 1, label: 'Gradual growth', description: 'The business will expand step by step.' }, { value: 2, label: 'Rapid growth', description: 'Fast scaling is planned.' }],
}

function englishDefinition(code: string, title: string, description: string) {
  const codes = STRUCTURED_QUESTION_CODES[code]
  const source = STRUCTURED_TOOL_CONFIGS.find(tool => tool.code === code)
  if (!codes || !source) return undefined
  return {
    questions: source.questions.map(question => {
      const label = QUESTION_LABELS[question.code] ?? question.code
      const suffix = question.type === 'days' ? 'days'
        : question.type === 'months' ? 'months'
          : question.type === 'number' ? 'count'
            : question.suffix
      return {
        ...question,
        label,
        description: `Enter the best current value available for ${label.toLowerCase()}.`,
        suffix,
        ...(CHOICE_OPTIONS[question.code] ? { options: CHOICE_OPTIONS[question.code] } : {}),
      }
    }),
    rules: [],
    ui: { intro: description, submitLabel: `Calculate: ${title}`, formulas: [`Published ${title} calculation methodology`], decisionChecks: ['Does the result remain economically positive?', 'Does the result remain resilient under the comparison scenario?', 'Which assumption creates the greatest risk?'] },
  }
}

/** Yalnız canlıda yayınlanan Karar Araçları. */
export const DECISION_CHECK_EN_BY_CODE: Record<string, DecisionCheckEnglishTranslation> = {
  'DC-ADS-005': { title: 'Should I increase my advertising budget?', description: 'Evaluates the true contribution from advertising, break-even ROAS, and an incremental-budget scenario.', category: 'Marketing' },
  'DC-BRANCH-009': { title: 'Am I ready to open a new branch?', description: 'Measures the new branch investment, monthly break-even point, payback period, and adequacy of cash reserves.', category: 'Growth' },
  'DC-CAMPAIGN-010': { title: 'Does running this campaign make sense?', description: 'Compares campaign cost, break-even unit volume, and low, medium, and high sales scenarios.', category: 'Marketing' },
  'DC-CASHFLOW-008': { title: 'Is my cash flow at risk?', description: 'Calculates cash inflows and outflows, timing gaps, deficit months, and the minimum cash buffer required.', category: 'Cash Management' },
  'DC-CONTINUE-012': { title: 'Should I keep selling this product?', description: 'Compares product contribution, sales velocity, returns, and inventory cost with the best alternative opportunity.', category: 'Product Management' },
  'DC-DISCOUNT-002': { title: 'Can I afford this discount?', description: 'Calculates how a planned discount affects product contribution, margin, and campaign break-even volume.', category: 'Pricing' },
  'DC-FREESHIP-003': { title: 'Can I offer free shipping?', description: 'Calculates the effect of free shipping on basket contribution and a safe minimum order threshold.', category: 'Logistics' },
  'DC-HIRE-006': { title: 'Can I afford to hire a new employee?', description: 'Calculates the fully loaded employer cost, break-even revenue, and cash resilience of a new hire.', category: 'People' },
  'DC-LOAN-007': { title: 'Can I afford the loan installment?', description: 'Measures the effect of a new installment on cash flow, debt-service coverage, and a downside scenario.', category: 'Financing' },
  'DC-MARKETPLACE-004': { title: 'What remains after marketplace commission?', description: 'Shows net proceeds, product contribution, and the difference from an alternative channel after marketplace deductions.', category: 'Marketplace' },
  'DC-PROFIT-001': { title: 'Is my product truly profitable?', description: 'Checks how much a product actually earns after all core costs are deducted from its selling price.', category: 'Finance' },
  'DC-STOCK-011': { title: 'Should I increase inventory?', description: 'Calculates stockout risk, holding cost, and a suitable reorder range from sales velocity and lead time.', category: 'Inventory Management' },
  'DC-TAX-013': { title: 'Which company type is right for me?', description: 'Compares sole proprietorship, limited company, and joint-stock company options by expected profit, ownership, liability, and growth plans.', category: 'Law and Tax' },
}

for (const [code, translation] of Object.entries(DECISION_CHECK_EN_BY_CODE)) {
  translation.definition = englishDefinition(code, translation.title, translation.description)
}

const DECISION_LABEL_EN: Record<string, string> = { UYGUN: 'SUITABLE', SINIRDA: 'BORDERLINE', 'RİSKLİ': 'RISKY', ZARAR: 'LOSS', DEVAM: 'CONTINUE', 'GÖZDEN GEÇİR': 'REVIEW', BIRAK: 'DISCONTINUE', 'ŞAHIS İŞLETMESİNİ DEĞERLENDİR': 'CONSIDER A SOLE PROPRIETORSHIP', 'LİMİTED ŞİRKETİ DEĞERLENDİR': 'CONSIDER A LIMITED COMPANY', 'ANONİM ŞİRKETİ DEĞERLENDİR': 'CONSIDER A JOINT-STOCK COMPANY', 'PROFESYONEL DOĞRULAMA GEREKLİ': 'PROFESSIONAL REVIEW REQUIRED' }

function humanize(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase()) }

export function localizeDecisionSnapshot(snapshot: any, language: 'tr' | 'en') {
  if (language !== 'en' || !snapshot || !snapshot.calculationOutput) return snapshot
  const source = snapshot.calculationOutput
  const title = DECISION_CHECK_EN_BY_CODE[snapshot.decisionCheckCode]?.title ?? 'Decision tool'
  const metrics = (source.metrics ?? []).map((item: any) => ({ ...item, label: humanize(item.key) }))
  const scenarios = (source.scenarios ?? []).map((item: any, index: number) => ({ ...item, label: index === 0 ? 'Current scenario' : `Comparison scenario ${index}`, detail: 'Calculated comparison' }))
  const toneSummary = source.decisionTone === 'bad' ? `The ${title.toLowerCase()} result contains a high-risk signal.` : source.decisionTone === 'warning' ? `The ${title.toLowerCase()} result is positive in part but remains sensitive to key assumptions.` : `The ${title.toLowerCase()} result remains positive under the supplied assumptions.`
  const calculationOutput = { ...source, decisionLabel: DECISION_LABEL_EN[source.decisionLabel] ?? source.decisionLabel, summary: toneSummary, metrics, scenarios, formulas: [`Published ${title} calculation methodology`], riskWarnings: (source.riskWarnings ?? []).map((_item: string, index: number) => `Risk signal ${index + 1}: review the assumptions highlighted by this calculation.`), safeNextSteps: (source.safeNextSteps ?? []).map((_item: string, index: number) => index === 0 ? 'Verify the inputs against current business records.' : index === 1 ? 'Test the decision with a limited, measurable scenario.' : 'Review tax, legal, and accounting effects with a qualified advisor.') }
  calculationOutput.mentorSummary = [calculationOutput.summary, ...metrics.slice(0, 4).map((item: any) => `${item.label}: ${item.value}`)]
  return { ...snapshot, calculationOutput, decisionLabel: calculationOutput.decisionLabel, summary: calculationOutput.summary, metrics, scenarios, formulas: calculationOutput.formulas, riskWarnings: calculationOutput.riskWarnings, safeNextSteps: calculationOutput.safeNextSteps, mentorSummary: calculationOutput.mentorSummary }
}

export function localizeDecisionCheck<T extends { code: string; title: string; description: string; category?: string | null }>(
  check: T,
  language: 'tr' | 'en',
): T {
  const english = DECISION_CHECK_EN_BY_CODE[check.code]
  if (language !== 'en' || !english) return check
  return {
    ...check,
    title: english.title,
    description: english.description,
    category: english.category,
  }
}
