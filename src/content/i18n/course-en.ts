import { COURSE_LESSON_EN_BY_SLUG } from './course-lessons-en.js'

export interface CourseEnglishTranslation {
  title: string
  description?: string
  lessonTitle?: string
  lessonContent?: string
}

export const COURSE_CATEGORY_EN: Record<string, string> = {
  'Dijitalleşme': 'Digital Transformation',
  'E-Ticaret': 'E-Commerce',
  'Finansman ve Kredi Yönetimi': 'Financing and Credit Management',
  'Fiyatlandırma': 'Pricing',
  'Girişimcilik': 'Entrepreneurship',
  'Hukuk ve Vergi': 'Law and Tax',
  'Kurumsal Finans': 'Corporate Finance',
  'Maliyet ve Fiyatlama': 'Costing and Pricing',
  'Maliyet Yönetimi': 'Cost Management',
  'Nakit Yönetimi': 'Cash Management',
  'Operasyon ve İnsan': 'Operations and People',
  'Pazarlama': 'Marketing',
  'Perakende ve Mağaza Yönetimi': 'Retail and Store Management',
  'Risk Yönetimi': 'Risk Management',
  'Satış ve İhracat': 'Sales and Export',
  'Siber Güvenlik ve AI': 'Cybersecurity and AI',
  'Sürdürülebilirlik ve Tedarik': 'Sustainability and Procurement',
  'Veri Okuryazarlığı': 'Data Literacy',
}

export const COURSE_SOURCE_TITLE_EN: Record<string, string> = {
  'T.C. Gelir İdaresi Başkanlığı - Vergi Usul Kanunu': 'Turkish Revenue Administration — Tax Procedure Law',
  'Sosyal Güvenlik Kurumu': 'Social Security Institution',
  'T.C. Ticaret Bakanlığı Fiyat Etiketi Mevzuatı': 'Republic of Turkiye Ministry of Trade — Price Label Regulation',
  'T.C. Gelir İdaresi Başkanlığı KDV Tebliği': 'Turkish Revenue Administration — VAT Implementation Communique',
}

/** Yalnız yayındaki 38 kurs. Taslak/arşiv içerikleri bilerek yoktur. */
export const COURSE_EN_BY_SLUG: Record<string, CourseEnglishTranslation> = {
  'gercek-birim-maliyet-hesaplama-pusulasi': { title: 'True Unit Cost Calculation Guide', description: 'True profitability requires more than the purchase price or raw-material cost. Learn to allocate direct labor, packaging, logistics, waste, and fixed overhead correctly so each product’s real unit cost and margin are visible.' },
  'gizli-kanal-kesintilerini-ve-maliyetlerini-tespit-etme': { title: 'Identifying Hidden Channel Fees and Costs', description: 'Marketplace gross order value is not the cash your business keeps. Identify layered commissions, advertising deductions, transaction fees, and return-logistics costs to calculate the actual net proceeds from each channel.' },
  'karli-fiyat-mimarisi-ve-marj-yonetimi': { title: 'Profitable Pricing Architecture and Margin Management', description: 'Copying competitors’ prices without knowing their cost structure can quietly turn every sale into a loss. Build sustainable floor and target prices from your own costs, risks, and desired net margin.' },
  'kampanya-ve-indirim-donemlerinde-net-marji-korumak': { title: 'Protecting Net Margin During Campaigns and Discounts', description: 'High-traffic discount periods can increase revenue while destroying profit. Measure how much a discount removes from contribution margin and the extra sales volume required to break even.' },
  'karara-gore-maliyet-davranisi-ve-siniflandirma': { title: 'Cost Behavior and Classification for Decision-Making', description: 'Accounting expense lists alone are not enough for decisions. Classify costs as fixed, variable, or mixed according to how they change with sales volume and identify the true incremental impact of a new product, channel, or operation.' },
  'basa-bas-noktasi-ve-guvenlik-marji-hesaplama': { title: 'Break-Even Point and Margin of Safety', description: 'Calculate the minimum units or revenue needed to cover all fixed and variable costs, then measure how far current sales sit above that threshold through the margin of safety.' },
  'urun-portfoyu-ve-sku-karlilik-yonetimi': { title: 'Product Portfolio and SKU Profitability Management', description: 'High-revenue products are not always the most profitable. Evaluate each SKU after returns, logistics, advertising, storage, and capital costs to decide what to grow, reprice, or discontinue.' },
  'net-isletme-sermayesi-ve-buyumenin-nakit-bedeli': { title: 'Net Working Capital and the Cash Cost of Growth', description: 'Fast growth can consume cash even when the income statement shows a profit. Measure how receivables, inventory, and payment timing create additional working-capital needs and learn to fund growth safely.' },
  'nakit-donusum-dongusu-ve-nakit-serbestlesmesi': { title: 'Cash Conversion Cycle and Releasing Cash', description: 'The cash conversion cycle measures the days between paying for inventory and collecting cash from customers. Diagnose where cash is trapped and shorten the cycle to release working capital.' },
  'yatirim-degerlendirmesi-ve-sermaye-maliyeti-wacc': { title: 'Investment Appraisal and Cost of Capital (WACC)', description: 'Simple payback ignores the time value and opportunity cost of money. Evaluate branches, equipment, and other capital investments using discounted cash flows, NPV, and an appropriate weighted average cost of capital.' },
  'e-ticarete-baslangic-ve-kanal-ekonomisi': { title: 'Getting Started with E-Commerce and Channel Economics', description: 'Choose an initial e-commerce channel by comparing product fit, operating capacity, visible and hidden deductions, and the net contribution left per order—not popularity or headline commission alone.' },
  'e-ticarette-gercek-siparis-karliligi-ve-iade-yonetimi': { title: 'True Order Profitability and Returns Management in E-Commerce', description: 'High order volume can conceal losses when returns are frequent. Add probability-weighted return losses to unit economics and calculate the true contribution of an e-commerce order.' },
  'kargo-anlasmasi-desi-hesaplama-ve-teslimat-lojistigi': { title: 'Shipping Contracts, Dimensional Weight, and Delivery Logistics', description: 'Free shipping can lift conversion but also erase margin. Control dimensional-weight and delivery costs, negotiate shipping terms, and calculate a profitable minimum basket threshold.' },
  'stok-takip-sistemi-otomasyonu-ve-yazilim-secimi': { title: 'Inventory Tracking Automation and Software Selection', description: 'Inventory errors, overselling penalties, and dead stock create hidden cash losses. Assess whether moving from spreadsheets to cloud inventory software delivers a financially sound payback.' },
  'surec-entegrasyonu-ve-manuel-islemlerin-maliyet-fayda-dengesi': { title: 'Process Integration and the Cost-Benefit Balance of Manual Work', description: 'Automation brings setup costs, recurring fees, vendor dependence, and outage risk. Compare time and error savings with implementation and maintenance costs to decide which processes should actually be integrated.' },
  'musteri-edinme-maliyeti-cac-ve-reklam-butcesi': { title: 'Customer Acquisition Cost (CAC) and Advertising Budget', description: 'Calculate fully loaded customer acquisition cost and compare it with contribution per customer. Use the result to measure advertising profitability and set a rational budget ceiling.' },
  'musteri-yasam-boyu-degeri-ltv-ve-churn-analizi': { title: 'Customer Lifetime Value (LTV) and Churn Analysis', description: 'Long-term viability depends on the balance between acquisition cost and the net contribution a customer creates over their lifetime. Measure LTV, churn, and the maximum sustainable CAC.' },
  'sadakat-programi-tasarimi-ve-pilot-test-karari': { title: 'Loyalty Program Design and Pilot-Test Decision', description: 'An unplanned loyalty program may discount purchases that would have happened anyway. Test whether incremental revenue and retention benefits exceed reward and discount costs before scaling.' },
  'siber-guvenlik-veri-guvenligi-ve-kvkk-uyumu': { title: 'Cybersecurity, Data Security, and KVKK Compliance', description: 'Data breaches, ransomware, and KVKK violations can create existential costs for an SME. Estimate financial exposure and prioritize a practical minimum investment in security and compliance.' },
  'tedarikci-secimi-ve-satin-alma-risk-yonetimi': { title: 'Supplier Selection and Procurement Risk Management', description: 'The lowest unit price is not always the lowest total cost. Build a weighted supplier scorecard that includes delays, defects, production downtime, return risk, and reliability.' },
  'sirket-kurulumu-ve-vergi-planlamasi': { title: 'Company Formation and Tax Planning', description: 'Compare sole proprietorship, limited company, and joint-stock company structures by tax burden, personal liability, ownership plans, compliance cost, and ability to raise investment.' },
  'yeni-personel-istihdami-ve-tam-yuklu-maliyet-hesabi': { title: 'Hiring Employees and Calculating Fully Loaded Labor Cost', description: 'Net salary is only part of employment cost. Calculate social-security contributions, taxes, benefits, and future severance obligations to decide whether a new hire is financially sustainable.' },
  'fiziksel-magaza-ve-yeni-sube-acma-karari': { title: 'Opening a Physical Store or a New Branch', description: 'A successful first location does not guarantee a successful second one. Evaluate deposits, fit-out, rent, staffing, ramp-up time, cash reserves, and downside revenue before committing to a new branch.' },
  'finansman-ve-kredi-taksit-karsilama-kapasitesi': { title: 'Financing and Debt Service Coverage Ratio (DSCR)', description: 'Profit does not automatically mean loan installments are affordable because debt is paid with cash. Calculate DSCR, include existing obligations, and stress-test repayment capacity in a weak month.' },
  'girisim-fikri-dogrulama-ve-pazar-uyumu': { title: 'Validating a Business Idea and Achieving Product-Market Fit', description: 'Avoid investing heavily on the assumption that customers will buy. Validate demand with the smallest practical experiment and use evidence to move toward product-market fit.' },
  'girisim-degerleme-yontemleri': { title: 'Startup Valuation Methods', description: 'A defensible valuation cannot rely on intuition alone. Compare cash-flow methods and market multiples so you can negotiate investment without giving away too much equity or pricing investors out.' },
  'yatirimci-sunumu-ve-finansal-projeksiyon-hazirlama': { title: 'Preparing an Investor Pitch and Financial Projections', description: 'Build credible three-year projections that connect revenue, costs, cash flow, working capital, and break-even assumptions. Present funding needs consistently to investors and lenders.' },
  'mikro-ihracata-baslangic-ve-etgb-surecleri': { title: 'Getting Started with Micro-Exports and ETGB Procedures', description: 'Use Turkey’s ETGB micro-export framework to sell abroad without traditional customs complexity. Account for shipment limits, VAT treatment, logistics, and unit profitability.' },
  'b2b-satis-yonetimi-ve-teklif-hazirlama': { title: 'B2B Sales Management and Proposal Preparation', description: 'Long payment terms, discounts, inflation, and funding costs can turn an apparently profitable bulk order into a cash problem. Price B2B proposals with a rational financing and risk premium.' },
  'fiziksel-magaza-yer-secimi-ve-kira-ciro-dengesi': { title: 'Physical Store Location and the Rent-to-Revenue Balance', description: 'The busiest street is not necessarily the most profitable. Compare footfall and expected revenue with rent, fixed operating costs, and a sustainable rent-to-revenue ratio.' },
  'envanter-devir-hizi-ve-raf-omru-yonetimi': { title: 'Inventory Turnover and Shelf-Life Management', description: 'Slow-moving stock ties up cash and creates obsolescence, spoilage, and financing costs. Measure inventory days and turnover to set healthier purchasing and clearance decisions.' },
  'kobi-ler-icin-kur-ve-enflasyon-riski-yonetimi': { title: 'Currency and Inflation Risk Management for SMEs', description: 'Exchange-rate volatility and inflation can create illusory profit while eroding replacement purchasing power. Map exposures and use pricing, payment terms, and practical hedging methods to protect cash flow.' },
  'yesil-tedarik-zinciri-ve-karbon-ayak-izi-planlamasi': { title: 'Green Supply Chains and Carbon-Footprint Planning', description: 'Sustainability rules increasingly affect market access and cost. Map supply-chain emissions, prepare for the EU Carbon Border Adjustment Mechanism, and prioritize financially sound transition steps.' },
  'yonetici-gosterge-paneli-kpi-dashboard-okuryazarligi': { title: 'Executive KPI Dashboard Literacy', description: 'A bank balance alone cannot describe business health. Learn to monitor a focused set of liquidity, profitability, efficiency, and leverage indicators and connect them to daily decisions.' },
  'gunluk-kasa-devri-ve-kasa-farki-dedektifligi': { title: 'Daily Cash Closing, VAT Reconciliation, and Cash-Variance Investigation', description: 'Cash variances and VAT-base errors quietly reduce profit and create audit risk. Build a disciplined daily closing and reconciliation process that exposes the source of discrepancies.' },
  'isletmede-darbogaz-analizi-ve-kapasite-planlama': { title: 'Bottleneck Analysis and Capacity Planning', description: 'Business throughput is constrained by its slowest process. Identify the real bottleneck and improve capacity before defaulting to more equipment or additional staff.' },
  'uluslararasi-teslim-sekilleri-ve-gumruk-vergisi-yonetimi': { title: 'Incoterms and Customs-Duty Management for Micro-Exports', description: 'Select appropriate Incoterms such as DAP or DDP, clarify who bears customs duties and delivery risk, and prevent unexpected cross-border logistics costs from eroding micro-export margin.' },
  'yapay-zeka-yatirimlarinda-gercekci-roi-analizi': { title: 'Realistic ROI Analysis for AI Investments: Trend or Necessity?', description: 'AI tools should be evaluated through measurable savings, revenue impact, implementation cost, and risk—not FOMO. Build a realistic ROI case before committing to licenses and automation projects.' },
}

for (const [slug, lessonContent] of Object.entries(COURSE_LESSON_EN_BY_SLUG)) {
  if (COURSE_EN_BY_SLUG[slug]) COURSE_EN_BY_SLUG[slug].lessonContent = lessonContent
}
