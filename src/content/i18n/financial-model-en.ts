import type { FinancialModelDefinition } from '../../services/financial-models/types.js'

const META: Record<string, [string, string, string, string]> = {
  CURRENT_RATIO: ['Current Ratio', 'Measure the ability to cover short-term liabilities with current assets.', 'Divides current assets by current liabilities.', 'Current Assets / Current Liabilities'],
  QUICK_RATIO: ['Quick Ratio', 'Assess liquidity more strictly by excluding inventory.', 'Subtracts inventory from current assets and divides by current liabilities.', '(Current Assets - Inventory) / Current Liabilities'],
  NET_WORKING_CAPITAL: ['Net Working Capital', 'See the short-term funding buffer available for daily operations.', 'The difference between current assets and current liabilities.', 'Current Assets - Current Liabilities'],
  DUPONT_3_STEP: ['Three-step DuPont', 'Identify whether return on equity comes from margin, efficiency, or leverage.', 'Breaks ROE into net margin, asset turnover, and financial leverage.', '(Net Income / Revenue) × (Revenue / Average Assets) × (Average Assets / Average Equity)'],
  PROFIT_TO_CASH: ['Profit-to-Cash Reconciliation', 'Explain why accounting profit does not create the same amount of cash.', 'Adjusts profit for non-cash items and working-capital movements.', 'Net Income + Depreciation + Other Non-cash Expenses - Working Capital Increase - Capital Expenditure'],
  CASH_CONVERSION_CYCLE: ['Cash Conversion Cycle', 'Measure the net time required for cash tied up in inventory to return through collections.', 'Subtracts supplier-payment days from inventory and receivable days.', 'DIO + DSO - DPO'],
  DIO: ['Days Inventory Outstanding (DIO)', 'Measure how many days inventory takes to sell on average.', 'Converts average inventory relative to cost of sales into days.', '(Average Inventory / Cost of Goods Sold) × Period Days'],
  DSO: ['Days Sales Outstanding (DSO)', 'Measure the average collection period for credit sales.', 'Converts average trade receivables relative to credit sales into days.', '(Average Trade Receivables / Credit Sales) × Period Days'],
  DPO: ['Days Payable Outstanding (DPO)', 'Measure the average time taken to pay suppliers.', 'Converts average trade payables relative to credit purchases into days.', '(Average Trade Payables / Credit Purchases) × Period Days'],
  BREAK_EVEN_QUANTITY: ['Break-even Sales Volume', 'Find the minimum units required to cover total costs.', 'Divides fixed costs by contribution per unit.', 'Fixed Costs / (Unit Price - Unit Variable Cost)'],
  CONTRIBUTION_MARGIN: ['Contribution Margin', 'See how much sales contribute toward fixed costs and profit.', 'Subtracts variable costs from net revenue.', 'Net Revenue - Variable Costs'],
  PRODUCT_PROFITABILITY: ['Product Profitability', 'Measure the economic contribution of one product after all direct costs.', 'Combines price, product cost, operations, channel deductions, and risk per unit.', 'Net Price - Product Cost - Operations - Channel Deductions - Risk Allowance'],
  ORDER_PROFITABILITY: ['Order Profitability', 'See the contribution from an e-commerce order after all order-level deductions.', 'Combines basket revenue with product, commission, payment, shipping, advertising, and operating costs.', 'Order Revenue - Product Cost - Commission - Payment Fee - Shipping - Advertising - Operations'],
  POST_RETURN_MARGIN: ['Actual Post-return Margin', 'Include the return rate and loss per return in pricing.', 'Deducts expected return cost from gross contribution.', 'Gross Contribution - (Orders × Return Rate × Loss per Return)'],
  CAC: ['Customer Acquisition Cost', 'Measure the full sales and marketing cost of acquiring a new customer.', 'Divides acquisition-related sales and marketing spend by new customers.', '(Marketing + Sales + Campaign + Agency) / New Customers'],
  LTV: ['Customer Lifetime Value', 'Estimate the gross-profit contribution a customer creates over the relationship.', 'Relates monthly customer revenue to gross margin and monthly churn.', '(Monthly Revenue per Customer × Gross Margin) / Monthly Churn'],
  LTV_CAC: ['LTV/CAC Ratio', 'See whether customer value covers acquisition cost.', 'Divides customer lifetime value by customer acquisition cost.', 'LTV / CAC'],
  CAC_PAYBACK: ['CAC Payback Period', 'Measure how many months of gross profit are needed to recover acquisition investment.', 'Divides CAC by monthly gross profit per customer.', 'CAC / (Monthly Revenue per Customer × Gross Margin)'],
  GROSS_BURN: ['Gross Cash Burn', 'See total cash outflow in one month.', 'Adds operating, payroll, capital, and other cash outflows.', 'Operating Outflows + Payroll + Capital + Other Outflows'],
  NET_BURN: ['Net Cash Burn', 'Measure how much cash declines per month after inflows.', 'Subtracts operating cash inflows from gross cash burn.', 'Gross Burn - Monthly Cash Inflows'],
  RUNWAY: ['Cash Runway', 'Estimate how many months available cash will last at the current net burn rate.', 'Divides unrestricted cash by monthly net burn.', 'Available Cash / Net Burn'],
  NPV: ['Net Present Value', 'Assess whether discounted cash inflows cover the initial investment.', 'Discounts periodic cash flows using the rate supplied by the user.', 'NPV = Σ CFₜ / (1+r)ᵗ'],
  IRR: ['Internal Rate of Return', 'Find the periodic return that reduces an investment’s NPV to zero.', 'Uses deterministic root-finding on cash flows containing at least one negative and one positive value.', '0 = Σ CFₜ / (1+IRR)ᵗ'],
  WACC_FCFF_DCF: ['Simplified WACC and FCFF DCF', 'Produce a company or project value range using verified capital-cost and cash-flow assumptions.', 'Calculates WACC, discounts FCFF forecasts and terminal value, and returns a sensitivity range.', 'WACC = E/(D+E)×Ke + D/(D+E)×Kd×(1-T); EV = Σ FCFFₜ/(1+WACC)ᵗ + TV/(1+WACC)ⁿ'],
}

const INPUT_LABELS: Record<string, string> = {
  currentAssets: 'Current assets', currentLiabilities: 'Current liabilities', inventory: 'Inventory', netIncome: 'Net income', revenue: 'Net revenue', averageAssets: 'Average assets', averageEquity: 'Average equity', depreciation: 'Depreciation', otherNonCash: 'Other non-cash expenses', workingCapitalIncrease: 'Working capital increase', capitalExpenditure: 'Capital expenditure', dio: 'DIO', dso: 'DSO', dpo: 'DPO', averageInventory: 'Average inventory', costOfGoodsSold: 'Cost of goods sold', periodDays: 'Period days', averageReceivables: 'Average trade receivables', creditSales: 'Credit sales', averagePayables: 'Average trade payables', creditPurchases: 'Credit purchases', fixedCosts: 'Fixed costs', unitPrice: 'Net sales price per unit', unitVariableCost: 'Variable cost per unit', variableCosts: 'Total variable costs', netPrice: 'Net sales price', productCost: 'Product cost', operationsCost: 'Operating cost', channelCost: 'Channel deductions', riskCost: 'Return/waste risk allowance', orderRevenue: 'Net order revenue', commission: 'Marketplace commission', paymentFee: 'Payment fee', shipping: 'Shipping', advertising: 'Advertising allocation', operations: 'Operations', grossContribution: 'Contribution before returns', orders: 'Number of orders', returnRate: 'Return rate', lossPerReturn: 'Loss per return', netRevenue: 'Net revenue', marketingSpend: 'Marketing spend', salesSpend: 'Sales-team spend', campaignSpend: 'Campaign incentives', agencySpend: 'Agency/tool spend', newCustomers: 'New customers', monthlyRevenuePerCustomer: 'Monthly revenue per customer', grossMarginRate: 'Gross margin', monthlyChurnRate: 'Monthly churn', ltv: 'LTV', cac: 'CAC', operatingOutflows: 'Operating cash outflows', payrollOutflows: 'Payroll cash outflows', capitalOutflows: 'Capital cash outflows', otherOutflows: 'Other cash outflows', grossBurn: 'Gross burn', cashInflows: 'Monthly cash inflows', availableCash: 'Available cash', netBurn: 'Monthly net burn', cashFlows: 'Cash flows', discountRate: 'Periodic discount rate', equityValue: 'Market value of equity', debtValue: 'Interest-bearing debt value', riskFreeRate: 'Risk-free rate', beta: 'Beta', marketRiskPremium: 'Market risk premium', borrowingCost: 'Pre-tax cost of debt', taxRate: 'Marginal tax rate', fcffYear1: 'Year 1 FCFF', forecastGrowth: 'Forecast-period FCFF growth', forecastYears: 'Forecast years', terminalGrowth: 'Terminal growth', netDebt: 'Net debt',
}

const OUTPUT_LABELS: Record<string, string> = {
  currentRatio: 'Current ratio', quickRatio: 'Quick ratio', netWorkingCapital: 'Net working capital', netMargin: 'Net profit margin', assetTurnover: 'Asset turnover', equityMultiplier: 'Equity multiplier', roe: 'Return on equity', operatingCashProxy: 'Operating cash-flow proxy', freeCashProxy: 'Free-cash-flow proxy', cashConversionCycle: 'Cash conversion cycle', dio: 'DIO', dso: 'DSO', dpo: 'DPO', unitContribution: 'Contribution per unit', breakEvenQuantity: 'Break-even units', breakEvenRevenue: 'Break-even revenue', contribution: 'Contribution', contributionMargin: 'Contribution margin', productContribution: 'Product contribution', productMargin: 'Product margin', orderContribution: 'Order contribution', orderMargin: 'Order margin', expectedReturnLoss: 'Expected return loss', postReturnContribution: 'Post-return contribution', postReturnMargin: 'Actual margin', cac: 'CAC', ltv: 'LTV', impliedLifetimeMonths: 'Implied customer lifetime', ltvCacRatio: 'LTV/CAC', cacPaybackMonths: 'CAC payback', grossBurn: 'Gross burn', netBurn: 'Net burn', runwayMonths: 'Runway', npv: 'Net present value', presentValueInflows: 'Present value of inflows', irr: 'Internal rate of return', iterations: 'Solution iterations', costOfEquity: 'Cost of equity', wacc: 'WACC', enterpriseValueBase: 'Enterprise value — base', equityValueBase: 'Equity value — base', equityValueLow: 'Equity value — low', equityValueHigh: 'Equity value — high',
}

const UNIT_EN: Record<string, string> = { gün: 'days', adet: 'count', ay: 'months', yıl: 'years', 'TRY/ay': 'TRY/month', 'TRY/müşteri': 'TRY/customer' }

const SPECIAL_TEXT: Record<string, string> = {
  'Phase 6 ilk deterministik sürüm.': 'Phase 6 initial deterministic release.',
  'Churn sıfıra çok yakınsa LTV aşırı büyür; gözlem süresi ve cohort davranışı ayrıca incelenmelidir.': 'If churn is close to zero, LTV becomes excessively large; review the observation period and cohort behavior separately.',
  'Birden fazla işaret değişimi birden fazla IRR üretebilir; bu durumda NPV profili ayrıca incelenmelidir.': 'Multiple sign changes may produce multiple IRRs; review the NPV profile separately.',
  'WACC terminal büyümeden büyük olmalıdır.': 'WACC must be greater than terminal growth.',
  'Sonuç yatırım tavsiyesi değildir; varsayım hassasiyeti ve veri kalitesi açıklanmalıdır.': 'The result is not investment advice; assumption sensitivity and data quality must be disclosed.',
  'Basitleştirilmiş sabit büyüme yaklaşımıdır.': 'This is a simplified constant-growth approach.',
  'Finansal kuruluşlar ve negatif/oynak FCFF yapıları için uygun model seçimi ayrıca değerlendirilmelidir.': 'Model suitability must be assessed separately for financial institutions and negative or volatile FCFF.',
  'Muhasebe politikaları ve dönemsel etkiler karşılaştırılabilirliği sınırlayabilir.': 'Accounting policies and period-specific effects may limit comparability.',
  'Sonuç tek başına karar değildir; eğilim, sektör ve veri kalitesiyle birlikte yorumlanır.': 'The result is not a decision on its own; interpret it with trends, industry context, and data quality.',
  'Model çıktısı kullanıcının sağladığı ve doğruladığı girdiler kapsamında geçerlidir.': 'The model output is valid only within the inputs supplied and verified by the user.',
  'Likidite, çalışma sermayesi ve nakit dönüşüm döngüsü metodolojisi.': 'Methodology for liquidity, working capital, and the cash conversion cycle.',
  'Sermaye maliyeti bileşenleri, varsayımlar ve kullanım sınırları.': 'Cost-of-capital components, assumptions, and usage limits.',
  'Yatırım analizi, nakit akışı, NPV, IRR ve kurumsal finans metodolojisi.': 'Methodology for investment analysis, cash flow, NPV, IRR, and corporate finance.',
  'DCF, FCFF, iskonto oranı ve terminal değer metodolojisi.': 'Methodology for DCF, FCFF, discount rates, and terminal value.',
  'Gerçek finansal tablo ve dipnotlarla uygulama veri kaynağı.': 'Application data source using actual financial statements and notes.',
  'Kamuyu aydınlatma, meslek kuralları, etik ve mevzuat sınırları.': 'Public disclosure, professional rules, ethics, and regulatory boundaries.',
}

export function localizeFinancialModel(model: FinancialModelDefinition, language: 'tr' | 'en'): FinancialModelDefinition {
  if (language !== 'en') return model
  const meta = META[model.code]
  if (!meta) return model
  return {
    ...model,
    name: meta[0], purpose: meta[1], description: meta[2], formula: meta[3],
    inputs: model.inputs.map(input => ({ ...input, label: INPUT_LABELS[input.key] ?? input.key, description: `Enter ${String(INPUT_LABELS[input.key] ?? input.key).toLowerCase()} for the same analysis period.`, unit: UNIT_EN[input.unit] ?? input.unit })),
    outputs: model.outputs.map(output => ({ ...output, label: OUTPUT_LABELS[output.key] ?? output.key, description: `Calculated ${String(OUTPUT_LABELS[output.key] ?? output.key).toLowerCase()}.`, unit: UNIT_EN[output.unit] ?? output.unit })),
    interpretationRules: model.interpretationRules.map(text => SPECIAL_TEXT[text] ?? text),
    warningRules: model.warningRules.map(text => SPECIAL_TEXT[text] ?? text),
    limitations: model.limitations.map(text => SPECIAL_TEXT[text] ?? text),
    sources: model.sources.map(source => ({ ...source, usage: SPECIAL_TEXT[source.usage] ?? source.usage })),
  }
}

export const FINANCIAL_MODEL_EN_CODES = Object.keys(META)

export function localizeFinancialModelVersions<T extends { changeSummary: string }>(versions: T[], language: 'tr' | 'en'): T[] {
  if (language !== 'en') return versions
  return versions.map(version => ({
    ...version,
    changeSummary: SPECIAL_TEXT[version.changeSummary] ?? version.changeSummary,
  }))
}
