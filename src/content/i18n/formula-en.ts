interface FormulaEnglishTranslation {
  name: string
  description?: string
  warning?: string
  inputs: Record<string, { label: string; unit?: string }>
}

const i = (entries: Array<[string, string, string?]>) => Object.fromEntries(
  entries.map(([key, label, unit]) => [key, { label, ...(unit ? { unit } : {}) }]),
)

/** Yalnız kullanıcıya sunulan basit hesaplamaların İngilizce görünümü. */
export const FORMULA_EN_BY_ID: Record<string, FormulaEnglishTranslation> = {
  fiyat_mimarisi: { name: 'Price Architecture and Target Margin', warning: 'The result is a VAT-exclusive management price. Use current contracts and actual business data rather than estimates; consult a qualified professional for tax and legal decisions.', inputs: i([['dogrudan_maliyet', 'Direct product/service cost'], ['operasyon_maliyeti', 'Packaging, shipping, and operations'], ['sabit_gider_payi', 'Fixed cost allocation per unit'], ['iade_risk_payi', 'Return/damage risk per unit'], ['komisyon_orani', 'Sales-channel commission'], ['odeme_orani', 'Payment-provider fee'], ['hedef_marj', 'Target sales margin']]) },
  kar_hesabi: { name: 'Profit and Profit Margin', warning: 'This calculation does not include tax or other unlisted expenses.', inputs: i([['satis', 'Monthly sales'], ['gider', 'Monthly expenses']]) },
  basabas_noktasi: { name: 'Break-even Point', warning: 'Assumption: all products share the same price and cost structure.', inputs: i([['sabit_gider', 'Fixed costs'], ['birim_fiyat', 'Unit sales price'], ['birim_degisken', 'Variable cost per unit']]) },
  nakit_pozisyonu: { name: 'Cash Position', inputs: i([['nakit', 'Cash and cash equivalents'], ['borc', 'Short-term debt']]) },
  isletme_sermayesi: { name: 'Working Capital', warning: 'Positive working capital indicates that short-term liabilities can be covered.', inputs: i([['donen_varlik', 'Current assets'], ['kisa_vadeli_borc', 'Current liabilities']]) },
  roi: { name: 'Return on Investment (ROI)', warning: 'This is a simple ROI calculation; it excludes tax, inflation, and the time value of money.', inputs: i([['yatirim', 'Total investment'], ['getiri', 'Net return']]) },
  stok_devir: { name: 'Inventory Turnover', warning: 'A higher turnover generally indicates more efficient inventory management.', inputs: i([['satislar', 'Annual cost of sales'], ['ortalama_stok', 'Average inventory']]) },
  cac: { name: 'Customer Acquisition Cost (CAC)', warning: 'A lower CAC generally indicates more efficient marketing.', inputs: i([['pazarlama', 'Marketing spend'], ['satis_ekip', 'Sales-team spend'], ['yeni_musteri', 'New customers', 'count']]) },
  ltv: { name: 'Customer Lifetime Value (LTV)', warning: 'LTV is used to evaluate customer-relationship strategies.', inputs: i([['ortalama_satis', 'Average order value'], ['satis_sikligi', 'Annual purchase frequency', 'count'], ['musteri_omru', 'Customer relationship duration', 'years']]) },
  ltv_cac: { name: 'LTV/CAC Ratio', warning: 'A 3:1 ratio is generally considered healthy; below 1:1 is unsustainable.', inputs: i([['ltv_degeri', 'Customer lifetime value'], ['cac_degeri', 'Customer acquisition cost']]) },
  indirim_kar: { name: 'Discount/Campaign Profitability', warning: 'No increase in demand is assumed; the campaign may change sales volume.', inputs: i([['normal_fiyat', 'Regular sales price'], ['indirim_oran', 'Discount rate'], ['birim_maliyet', 'Unit cost'], ['beklenen_satis', 'Expected units sold', 'count']]) },
  kredi_maliyeti: { name: 'Loan Payment and Total Cost', warning: 'A fixed interest rate is assumed; fees and insurance are excluded.', inputs: i([['kredi_tutari', 'Loan amount'], ['yillik_faiz', 'Annual interest rate'], ['vade', 'Term', 'months']]) },
  ihracat_maliyet: { name: 'Export Unit Cost', warning: 'Exchange-rate movements and additional taxes may affect the cost.', inputs: i([['uretim_maliyet', 'Production cost'], ['lojistik', 'Logistics cost'], ['gumruk', 'Customs/tax cost'], ['diger', 'Other costs'], ['urun_adet', 'Units', 'count'], ['kur', 'Exchange rate (1 USD)']]) },
  kdv_ekleme: { name: 'Add VAT', description: 'Calculates VAT and the VAT-inclusive total from a VAT-exclusive amount.', warning: 'Enter the current correct VAT rate. This result does not replace a tax return.', inputs: i([['kdv_haric_tutar', 'Amount excluding VAT'], ['kdv_orani', 'Applicable VAT rate']]) },
  kasa_kapanis: { name: 'Daily Cash Closing', description: 'Calculates expected cash on hand from the day’s cash inflows and outflows.', inputs: i([['acilis_kasasi', 'Opening cash'], ['nakit_satis', 'Cash sales'], ['tahsilat', 'Cash collected'], ['diger_giris', 'Other cash inflow'], ['gider_odeme', 'Expense payments'], ['tedarikci_odeme', 'Supplier payments'], ['bankaya_yatirilan', 'Deposited to bank']]) },
  nakit_dayanim: { name: 'Cash Runway', description: 'Shows how many months available cash can cover the monthly cash shortfall.', warning: 'Unexpected expenses and collection delays should be assessed separately.', inputs: i([['mevcut_nakit', 'Available cash'], ['aylik_nakit_girisi', 'Monthly cash inflow'], ['aylik_nakit_cikisi', 'Monthly cash outflow']]) },
  birim_maliyet: { name: 'Actual Unit Cost', description: 'Allocates materials, labor, overhead, shipping, and waste across each unit.', inputs: i([['hammadde', 'Materials/product purchases'], ['iscilik', 'Labor'], ['genel_gider', 'Overhead allocation'], ['ambalaj_kargo', 'Packaging and shipping'], ['fire_iade', 'Waste and return cost'], ['uretim_adedi', 'Units produced/purchased', 'count']]) },
  vade_farki: { name: 'Term Difference', description: 'Calculates the financed total and financing difference from the cash price.', warning: 'Add contractual fees, taxes, and commissions separately.', inputs: i([['pesin_fiyat', 'Cash price'], ['aylik_vade_orani', 'Monthly financing rate'], ['vade_ay', 'Term', 'months']]) },
  pazaryeri_siparis_kari: { name: 'Marketplace Order Profitability', description: 'Shows order contribution after commission, shipping, advertising, and return risk.', warning: 'Assess VAT and income/corporate tax separately for your business.', inputs: i([['satis_fiyati', 'Sales price'], ['urun_maliyeti', 'Product cost'], ['komisyon_orani', 'Marketplace commission'], ['kargo', 'Shipping'], ['ambalaj', 'Packaging'], ['reklam_payi', 'Advertising per order'], ['iade_riski', 'Return-risk allowance']]) },
}

const RESULT_TEXT_EN: Record<string, string> = {
  'Kasa pozitif': 'Positive cash balance', 'Kasa açığı var': 'Cash shortfall',
  'Nakit tüketimi yok': 'No cash burn', '6 ay ve üzeri': '6 months or more', 'Yakından izleyin': 'Monitor closely', 'Kritik nakit riski': 'Critical cash risk',
  'Sipariş kârlı': 'Profitable order', 'Sipariş zarar ediyor': 'Loss-making order', 'Başa baş': 'Break-even',
  'Kârlı': 'Profitable', 'Zararda': 'Loss-making', 'Pozitif': 'Positive', 'Negatif': 'Negative', 'Sıfır': 'Zero',
  'Yeterli': 'Sufficient', 'Yetersiz': 'Insufficient', 'Kârlı yatırım': 'Profitable investment', 'Zararlı yatırım': 'Loss-making investment',
  'Sağlıklı (3+)': 'Healthy (3+)', 'Kabul edilebilir (1-3)': 'Acceptable (1–3)', 'Zayıf (<1)': 'Weak (<1)',
  'Kampanya kârlı': 'Campaign is profitable', 'Kampanya kârlı değil': 'Campaign is not profitable',
}

export function localizeFormula<T extends { id: string; name: string; description?: string; warning?: string; inputs: Array<{ name: string; label: string; unit: string }> }>(formula: T, language: 'tr' | 'en'): T {
  const english = FORMULA_EN_BY_ID[formula.id]
  if (language !== 'en' || !english) return formula
  return {
    ...formula,
    name: english.name,
    description: english.description ?? formula.description,
    warning: english.warning ?? formula.warning,
    inputs: formula.inputs.map(input => ({ ...input, ...(english.inputs[input.name] ?? {}) })),
  }
}

export function localizeFormulaResult(result: Record<string, unknown>, language: 'tr' | 'en') {
  if (language !== 'en') return result
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, typeof value === 'string' ? (RESULT_TEXT_EN[value] ?? value) : value]))
}
