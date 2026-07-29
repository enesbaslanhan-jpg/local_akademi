import type {
  FinancialInputDefinition,
  FinancialModelDefinition,
  FinancialModelCategory,
  FinancialOutputDefinition,
  FinancialSourceReference,
} from './types.js'

const ENGINE_VERSION = '1.0.0'
const POLICY_VERSION = 'phase6-1.0'

const SOURCES = {
  cfaWorkingCapital: {
    title: 'CFA Institute - Working Capital and Liquidity',
    url: 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/working-capital-and-liquidity',
    authority: 'professional',
    usage: 'Likidite, çalışma sermayesi ve nakit dönüşüm döngüsü metodolojisi.',
  },
  cfaCostOfCapital: {
    title: 'CFA Institute - Cost of Capital: Advanced Topics',
    url: 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/cost-capital-advanced-topics',
    authority: 'professional',
    usage: 'Sermaye maliyeti bileşenleri, varsayımlar ve kullanım sınırları.',
  },
  damodaranCorporateFinance: {
    title: 'Aswath Damodaran - Corporate Finance',
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/CFin/CF.htm',
    authority: 'academic',
    usage: 'Yatırım analizi, nakit akışı, NPV, IRR ve kurumsal finans metodolojisi.',
  },
  damodaranValuation: {
    title: 'Aswath Damodaran - Valuation',
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valuation/val.htm',
    authority: 'academic',
    usage: 'DCF, FCFF, iskonto oranı ve terminal değer metodolojisi.',
  },
  kap: {
    title: 'Kamuyu Aydınlatma Platformu - Finansal Tablolar',
    url: 'https://www.kap.org.tr/tr',
    authority: 'official',
    usage: 'Gerçek finansal tablo ve dipnotlarla uygulama veri kaynağı.',
  },
  spl1002: {
    title: 'SPL 1002 - Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları',
    url: 'https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf',
    authority: 'official',
    usage: 'Kamuyu aydınlatma, meslek kuralları, etik ve mevzuat sınırları.',
  },
} satisfies Record<string, FinancialSourceReference>

function n(
  key: string,
  label: string,
  unit: string,
  description: string,
  options: Partial<FinancialInputDefinition> = {},
): FinancialInputDefinition {
  return { key, label, type: 'number', unit, required: true, description, ...options }
}

function arr(key: string, label: string, unit: string, description: string): FinancialInputDefinition {
  return { key, label, type: 'number_array', unit, required: true, description }
}

function o(key: string, label: string, unit: string, description: string): FinancialOutputDefinition {
  return { key, label, unit, description }
}

function model(params: {
  code: string
  name: string
  category: FinancialModelCategory
  purpose: string
  description: string
  level?: FinancialModelDefinition['level']
  formula: string
  inputs: FinancialInputDefinition[]
  outputs: FinancialOutputDefinition[]
  limitations?: string[]
  warnings?: string[]
  sources?: FinancialSourceReference[]
  courseCode: string
}): FinancialModelDefinition {
  return {
    ...params,
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    level: params.level ?? 'basic',
    interpretationRules: [
      'Sonuç tek başına karar değildir; eğilim, sektör ve veri kalitesiyle birlikte yorumlanır.',
      'Model çıktısı kullanıcının sağladığı ve doğruladığı girdiler kapsamında geçerlidir.',
    ],
    warningRules: params.warnings ?? [],
    limitations: params.limitations ?? ['Muhasebe politikaları ve dönemsel etkiler karşılaştırılabilirliği sınırlayabilir.'],
    sources: params.sources ?? [SOURCES.cfaWorkingCapital, SOURCES.kap],
  }
}

export const FINANCIAL_MODEL_REGISTRY: FinancialModelDefinition[] = [
  model({
    code: 'CURRENT_RATIO', name: 'Cari Oran', category: 'liquidity',
    purpose: 'Kısa vadeli borçların dönen varlıklarla karşılanma kapasitesini ölçmek.',
    description: 'Dönen varlıkları kısa vadeli yükümlülüklere böler.',
    formula: 'Dönen Varlıklar / Kısa Vadeli Yükümlülükler',
    inputs: [n('currentAssets', 'Dönen Varlıklar', 'TRY', 'Bir yıl içinde nakde dönmesi beklenen varlıklar.', { min: 0 }), n('currentLiabilities', 'Kısa Vadeli Yükümlülükler', 'TRY', 'Bir yıl içinde ödenecek yükümlülükler.', { min: 0 })],
    outputs: [o('currentRatio', 'Cari Oran', 'x', 'Kısa vadeli ödeme kapasitesi.')],
    courseCode: 'P6-C03',
  }),
  model({
    code: 'QUICK_RATIO', name: 'Asit-Test Oranı', category: 'liquidity',
    purpose: 'Stokları hariç tutarak daha sıkı likidite görünümü elde etmek.',
    description: 'Dönen varlıklardan stokları çıkarır ve kısa vadeli yükümlülüklere böler.',
    formula: '(Dönen Varlıklar - Stoklar) / Kısa Vadeli Yükümlülükler',
    inputs: [n('currentAssets', 'Dönen Varlıklar', 'TRY', 'Dönen varlık toplamı.', { min: 0 }), n('inventory', 'Stoklar', 'TRY', 'Dönem sonu stok değeri.', { min: 0 }), n('currentLiabilities', 'Kısa Vadeli Yükümlülükler', 'TRY', 'Bir yıl içindeki borçlar.', { min: 0 })],
    outputs: [o('quickRatio', 'Asit-Test Oranı', 'x', 'Stok dışı likidite kapasitesi.')],
    courseCode: 'P6-C03',
  }),
  model({
    code: 'NET_WORKING_CAPITAL', name: 'Net İşletme Sermayesi', category: 'liquidity',
    purpose: 'Günlük faaliyetleri finanse eden kısa vadeli kaynak tamponunu görmek.',
    description: 'Dönen varlıklar ile kısa vadeli yükümlülükler arasındaki farktır.',
    formula: 'Dönen Varlıklar - Kısa Vadeli Yükümlülükler',
    inputs: [n('currentAssets', 'Dönen Varlıklar', 'TRY', 'Dönen varlık toplamı.'), n('currentLiabilities', 'Kısa Vadeli Yükümlülükler', 'TRY', 'Kısa vadeli yükümlülük toplamı.')],
    outputs: [o('netWorkingCapital', 'Net İşletme Sermayesi', 'TRY', 'Kısa vadeli finansman tamponu.')],
    courseCode: 'P6-C05',
  }),
  model({
    code: 'DUPONT_3_STEP', name: 'Üç Aşamalı DuPont', category: 'profitability',
    purpose: 'Özsermaye kârlılığının marj, verimlilik veya kaldıraçtan hangisiyle oluştuğunu görmek.',
    description: 'ROE’yi net kâr marjı, aktif devir hızı ve finansal kaldıraç bileşenlerine ayırır.',
    formula: '(Net Kâr / Satışlar) × (Satışlar / Ortalama Varlıklar) × (Ortalama Varlıklar / Ortalama Özsermaye)',
    inputs: [n('netIncome', 'Net Kâr', 'TRY', 'Dönem net kârı veya zararı.'), n('revenue', 'Net Satışlar', 'TRY', 'Dönem net satışları.', { min: 0 }), n('averageAssets', 'Ortalama Varlıklar', 'TRY', 'Dönem başı ve sonu varlık ortalaması.', { min: 0 }), n('averageEquity', 'Ortalama Özsermaye', 'TRY', 'Dönem başı ve sonu özsermaye ortalaması.', { min: 0 })],
    outputs: [o('netMargin', 'Net Kâr Marjı', '%', 'Satış başına kâr.'), o('assetTurnover', 'Aktif Devir Hızı', 'x', 'Varlıkların satış üretme verimi.'), o('equityMultiplier', 'Özsermaye Çarpanı', 'x', 'Finansal kaldıraç.'), o('roe', 'Özsermaye Kârlılığı', '%', 'DuPont bileşimi sonucu ROE.')],
    sources: [SOURCES.damodaranCorporateFinance, SOURCES.kap],
    courseCode: 'P6-C04',
  }),
  model({
    code: 'PROFIT_TO_CASH', name: 'Kârdan Nakde Mutabakat', category: 'cash_resilience',
    purpose: 'Muhasebe kârının neden aynı miktarda nakit yaratmadığını açıklamak.',
    description: 'Nakit dışı kalemler ve işletme sermayesi etkisini kâra uygular.',
    formula: 'Net Kâr + Amortisman + Diğer Nakit Dışı Giderler - İşletme Sermayesi Artışı - Yatırım Harcamaları',
    inputs: [n('netIncome', 'Net Kâr', 'TRY', 'Dönem net kârı.'), n('depreciation', 'Amortisman', 'TRY', 'Nakit çıkışı yaratmayan amortisman.', { min: 0 }), n('otherNonCash', 'Diğer Nakit Dışı Giderler', 'TRY', 'Karşılıklar gibi nakit dışı kalemler.'), n('workingCapitalIncrease', 'İşletme Sermayesi Artışı', 'TRY', 'Nakit bağlayan artış; azalış negatif girilir.'), n('capitalExpenditure', 'Yatırım Harcamaları', 'TRY', 'Maddi ve maddi olmayan duran varlık nakit çıkışı.', { min: 0 })],
    outputs: [o('operatingCashProxy', 'Faaliyet Nakit Akışı Yaklaşımı', 'TRY', 'Kârdan işletme sermayesi etkisine geçiş.'), o('freeCashProxy', 'Serbest Nakit Yaklaşımı', 'TRY', 'Yatırım harcaması sonrası kalan nakit.')],
    sources: [SOURCES.damodaranCorporateFinance, SOURCES.kap],
    courseCode: 'P6-C01',
  }),
  model({
    code: 'CASH_CONVERSION_CYCLE', name: 'Nakit Dönüşüm Döngüsü', category: 'efficiency',
    purpose: 'Stoka bağlanan nakdin tahsilata dönüşmesinin net süresini ölçmek.',
    description: 'Stok ve alacak günlerinden tedarikçi ödeme günlerini çıkarır.',
    formula: 'DIO + DSO - DPO',
    inputs: [n('dio', 'Stokta Kalma Süresi', 'gün', 'DIO sonucu.'), n('dso', 'Tahsilat Süresi', 'gün', 'DSO sonucu.'), n('dpo', 'Tedarikçi Ödeme Süresi', 'gün', 'DPO sonucu.')],
    outputs: [o('cashConversionCycle', 'Nakit Dönüşüm Süresi', 'gün', 'Operasyonda nakdin bağlı kaldığı net süre.')],
    courseCode: 'P6-C06',
  }),
  model({
    code: 'DIO', name: 'Stokta Kalma Süresi (DIO)', category: 'efficiency',
    purpose: 'Stokların ortalama kaç günde satıldığını ölçmek.',
    description: 'Ortalama stok değerini satışların maliyetine göre gün cinsine çevirir.',
    formula: '(Ortalama Stok / Satışların Maliyeti) × Dönem Günü',
    inputs: [n('averageInventory', 'Ortalama Stok', 'TRY', 'Dönem başı ve sonu stok ortalaması.', { min: 0 }), n('costOfGoodsSold', 'Satışların Maliyeti', 'TRY', 'Aynı döneme ait satış maliyeti.', { min: 0 }), n('periodDays', 'Dönem Gün Sayısı', 'gün', 'Yıllık için 365, çeyrek için gerçek gün.', { type: 'integer', min: 1, max: 366 })],
    outputs: [o('dio', 'DIO', 'gün', 'Stokta ortalama kalma süresi.')],
    courseCode: 'P6-C07',
  }),
  model({
    code: 'DSO', name: 'Tahsilat Süresi (DSO)', category: 'efficiency',
    purpose: 'Vadeli satışların ortalama tahsilat süresini ölçmek.',
    description: 'Ortalama ticari alacakları kredili satışlara göre gün cinsine çevirir.',
    formula: '(Ortalama Ticari Alacak / Kredili Satışlar) × Dönem Günü',
    inputs: [n('averageReceivables', 'Ortalama Ticari Alacak', 'TRY', 'Dönem başı ve sonu alacak ortalaması.', { min: 0 }), n('creditSales', 'Kredili Satışlar', 'TRY', 'Aynı dönemin vadeli satışları.', { min: 0 }), n('periodDays', 'Dönem Gün Sayısı', 'gün', 'Analiz dönemindeki gün sayısı.', { type: 'integer', min: 1, max: 366 })],
    outputs: [o('dso', 'DSO', 'gün', 'Ortalama tahsilat süresi.')],
    courseCode: 'P6-C07',
  }),
  model({
    code: 'DPO', name: 'Tedarikçi Ödeme Süresi (DPO)', category: 'efficiency',
    purpose: 'Tedarikçilere ortalama ödeme süresini ölçmek.',
    description: 'Ortalama ticari borçları kredili alışlara göre gün cinsine çevirir.',
    formula: '(Ortalama Ticari Borç / Kredili Alışlar) × Dönem Günü',
    inputs: [n('averagePayables', 'Ortalama Ticari Borç', 'TRY', 'Dönem başı ve sonu borç ortalaması.', { min: 0 }), n('creditPurchases', 'Kredili Alışlar', 'TRY', 'Aynı dönemin vadeli alışları.', { min: 0 }), n('periodDays', 'Dönem Gün Sayısı', 'gün', 'Analiz dönemindeki gün sayısı.', { type: 'integer', min: 1, max: 366 })],
    outputs: [o('dpo', 'DPO', 'gün', 'Ortalama tedarikçi ödeme süresi.')],
    courseCode: 'P6-C07',
  }),
  model({
    code: 'BREAK_EVEN_QUANTITY', name: 'Başa Baş Satış Adedi', category: 'unit_economics',
    purpose: 'Toplam giderleri karşılamak için gereken minimum satış adedini bulmak.',
    description: 'Sabit giderleri birim katkı payına böler.',
    formula: 'Sabit Giderler / (Birim Fiyat - Birim Değişken Maliyet)',
    inputs: [n('fixedCosts', 'Sabit Giderler', 'TRY', 'Satış adedinden bağımsız dönem giderleri.', { min: 0 }), n('unitPrice', 'Birim Net Satış Fiyatı', 'TRY', 'İndirim ve satış vergisi hariç yönetim fiyatı.', { min: 0 }), n('unitVariableCost', 'Birim Değişken Maliyet', 'TRY', 'Satışla birlikte artan birim maliyet.', { min: 0 })],
    outputs: [o('unitContribution', 'Birim Katkı', 'TRY', 'Her satışın sabit gider ve kâra katkısı.'), o('breakEvenQuantity', 'Başa Baş Adedi', 'adet', 'Zarar etmemek için gereken adet.'), o('breakEvenRevenue', 'Başa Baş Cirosu', 'TRY', 'Başa baş adedinin satış değeri.')],
    courseCode: 'P6-C10',
  }),
  model({
    code: 'CONTRIBUTION_MARGIN', name: 'Katkı Payı', category: 'unit_economics',
    purpose: 'Satışların sabit gider ve kâra ne kadar katkı verdiğini görmek.',
    description: 'Net satıştan değişken maliyetleri çıkarır.',
    formula: 'Net Satışlar - Değişken Maliyetler',
    inputs: [n('revenue', 'Net Satışlar', 'TRY', 'İade ve indirim sonrası satışlar.', { min: 0 }), n('variableCosts', 'Toplam Değişken Maliyet', 'TRY', 'Satış hacmine bağlı maliyetler.', { min: 0 })],
    outputs: [o('contribution', 'Katkı Payı', 'TRY', 'Sabit gider ve kâr için kalan tutar.'), o('contributionMargin', 'Katkı Marjı', '%', 'Net satışların katkıya dönüşen oranı.')],
    courseCode: 'P6-C09',
  }),
  model({
    code: 'PRODUCT_PROFITABILITY', name: 'Ürün Kârlılığı', category: 'unit_economics',
    purpose: 'Tek bir ürünün tüm doğrudan maliyetlerden sonra ekonomik katkısını ölçmek.',
    description: 'Fiyat, maliyet, operasyon, kanal ve risk paylarını ürün başında birleştirir.',
    formula: 'Net Fiyat - Ürün Maliyeti - Operasyon - Kanal Kesintisi - Risk Payı',
    inputs: [n('netPrice', 'Net Satış Fiyatı', 'TRY', 'İndirim sonrası KDV hariç fiyat.', { min: 0 }), n('productCost', 'Ürün Maliyeti', 'TRY', 'Üretim veya satın alma maliyeti.', { min: 0 }), n('operationsCost', 'Operasyon Maliyeti', 'TRY', 'Ambalaj, işçilik ve hazırlık.', { min: 0 }), n('channelCost', 'Kanal Kesintileri', 'TRY', 'Komisyon ve ödeme kesintileri.', { min: 0 }), n('riskCost', 'İade/Fire Risk Payı', 'TRY', 'Beklenen risk maliyeti.', { min: 0 })],
    outputs: [o('productContribution', 'Ürün Katkısı', 'TRY', 'Birim ekonomik katkı.'), o('productMargin', 'Ürün Marjı', '%', 'Net fiyat içindeki katkı oranı.')],
    courseCode: 'P6-C11',
  }),
  model({
    code: 'ORDER_PROFITABILITY', name: 'Sipariş Kârlılığı', category: 'unit_economics',
    purpose: 'E-ticaret siparişinin tüm sipariş bazlı kesintilerden sonraki katkısını görmek.',
    description: 'Sepet geliri, ürün maliyeti, komisyon, ödeme, kargo, reklam ve operasyonu birlikte hesaplar.',
    formula: 'Sipariş Geliri - Ürün Maliyeti - Komisyon - Ödeme Kesintisi - Kargo - Reklam - Operasyon',
    inputs: [n('orderRevenue', 'Sipariş Net Geliri', 'TRY', 'İndirim sonrası sipariş geliri.', { min: 0 }), n('productCost', 'Ürün Maliyeti', 'TRY', 'Siparişteki ürünlerin maliyeti.', { min: 0 }), n('commission', 'Pazar Yeri Komisyonu', 'TRY', 'Siparişe düşen komisyon.', { min: 0 }), n('paymentFee', 'Ödeme Kesintisi', 'TRY', 'POS veya ödeme kuruluşu maliyeti.', { min: 0 }), n('shipping', 'Kargo', 'TRY', 'İşletmenin karşıladığı kargo.', { min: 0 }), n('advertising', 'Reklam Payı', 'TRY', 'Siparişe atfedilen reklam maliyeti.', { min: 0 }), n('operations', 'Operasyon', 'TRY', 'Paketleme ve hazırlık maliyeti.', { min: 0 })],
    outputs: [o('orderContribution', 'Sipariş Katkısı', 'TRY', 'Siparişten kalan ekonomik katkı.'), o('orderMargin', 'Sipariş Marjı', '%', 'Gelirin katkıya dönüşen oranı.')],
    courseCode: 'P6-C12',
  }),
  model({
    code: 'POST_RETURN_MARGIN', name: 'İade Sonrası Gerçek Marj', category: 'unit_economics',
    purpose: 'İade oranı ve iade başına kaybı fiyatlamaya dahil etmek.',
    description: 'Brüt katkıdan beklenen iade maliyetini düşer.',
    formula: 'Brüt Katkı - (Sipariş Sayısı × İade Oranı × İade Başına Kayıp)',
    inputs: [n('grossContribution', 'İade Öncesi Katkı', 'TRY', 'Dönemin brüt sipariş katkısı.'), n('orders', 'Sipariş Sayısı', 'adet', 'Toplam sipariş adedi.', { type: 'integer', min: 0 }), n('returnRate', 'İade Oranı', '%', 'İade edilen sipariş oranı.', { min: 0, max: 100 }), n('lossPerReturn', 'İade Başına Kayıp', 'TRY', 'Kargo, hasar ve yeniden işlem maliyeti.', { min: 0 }), n('netRevenue', 'Net Gelir', 'TRY', 'Marj paydası olarak net dönem geliri.', { min: 0 })],
    outputs: [o('expectedReturnLoss', 'Beklenen İade Kaybı', 'TRY', 'İadelerin beklenen toplam maliyeti.'), o('postReturnContribution', 'İade Sonrası Katkı', 'TRY', 'İade etkisi sonrası katkı.'), o('postReturnMargin', 'Gerçek Marj', '%', 'İade sonrası katkı marjı.')],
    courseCode: 'P6-C12',
  }),
  model({
    code: 'CAC', name: 'Müşteri Edinme Maliyeti', category: 'unit_economics',
    purpose: 'Yeni bir müşteri kazanmanın tam satış ve pazarlama maliyetini ölçmek.',
    description: 'Edinmeye ayrılan satış ve pazarlama giderlerini yeni müşteri sayısına böler.',
    formula: '(Pazarlama + Satış + Kampanya + Ajans) / Yeni Müşteri',
    inputs: [n('marketingSpend', 'Pazarlama Gideri', 'TRY', 'Edinmeye yönelik reklam ve pazarlama.', { min: 0 }), n('salesSpend', 'Satış Ekibi Gideri', 'TRY', 'Döneme ait satış personeli maliyeti.', { min: 0 }), n('campaignSpend', 'Kampanya Teşviki', 'TRY', 'İlk sipariş indirimi gibi teşvikler.', { min: 0 }), n('agencySpend', 'Ajans/Araç Gideri', 'TRY', 'Edinme faaliyetine ait dış hizmetler.', { min: 0 }), n('newCustomers', 'Yeni Müşteri', 'adet', 'Aynı dönemde kazanılan doğrulanmış yeni müşteri.', { type: 'integer', min: 1 })],
    outputs: [o('cac', 'CAC', 'TRY/müşteri', 'Bir müşteri edinmenin tam maliyeti.')],
    courseCode: 'P6-C14',
  }),
  model({
    code: 'LTV', name: 'Müşteri Yaşam Boyu Değeri', category: 'unit_economics',
    purpose: 'Bir müşterinin ilişkisi boyunca yaratacağı brüt kâr katkısını tahmin etmek.',
    description: 'Aylık müşteri gelirini brüt marj ve aylık kayıp oranıyla ilişkilendirir.',
    formula: '(Aylık Müşteri Geliri × Brüt Marj) / Aylık Churn',
    inputs: [n('monthlyRevenuePerCustomer', 'Aylık Müşteri Geliri', 'TRY', 'Müşteri başına aylık net gelir.', { min: 0 }), n('grossMarginRate', 'Brüt Marj', '%', 'Gelirin brüt kâra dönüşen oranı.', { min: 0, max: 100 }), n('monthlyChurnRate', 'Aylık Churn', '%', 'Her ay kaybedilen müşteri oranı.', { min: 0, max: 100 })],
    outputs: [o('ltv', 'LTV', 'TRY/müşteri', 'Tahmini yaşam boyu brüt kâr katkısı.'), o('impliedLifetimeMonths', 'Tahmini Müşteri Ömrü', 'ay', 'Churn varsayımından türetilen süre.')],
    warnings: ['Churn sıfıra çok yakınsa LTV aşırı büyür; gözlem süresi ve cohort davranışı ayrıca incelenmelidir.'],
    courseCode: 'P6-C15',
  }),
  model({
    code: 'LTV_CAC', name: 'LTV/CAC Oranı', category: 'unit_economics',
    purpose: 'Müşteri değerinin edinme maliyetini karşılayıp karşılamadığını görmek.',
    description: 'Yaşam boyu müşteri değerini edinme maliyetine böler.',
    formula: 'LTV / CAC',
    inputs: [n('ltv', 'LTV', 'TRY/müşteri', 'Brüt marj bazlı yaşam boyu değer.', { min: 0 }), n('cac', 'CAC', 'TRY/müşteri', 'Tam müşteri edinme maliyeti.', { min: 0 })],
    outputs: [o('ltvCacRatio', 'LTV/CAC', 'x', 'Müşteri ekonomisinin ölçeklenebilirlik göstergesi.')],
    courseCode: 'P6-C15',
  }),
  model({
    code: 'CAC_PAYBACK', name: 'CAC Geri Ödeme Süresi', category: 'unit_economics',
    purpose: 'Müşteri edinme yatırımının brüt kârla kaç ayda geri döndüğünü görmek.',
    description: 'CAC’yi müşteri başına aylık brüt kâra böler.',
    formula: 'CAC / (Aylık Müşteri Geliri × Brüt Marj)',
    inputs: [n('cac', 'CAC', 'TRY/müşteri', 'Müşteri edinme maliyeti.', { min: 0 }), n('monthlyRevenuePerCustomer', 'Aylık Müşteri Geliri', 'TRY', 'Müşteri başına aylık gelir.', { min: 0 }), n('grossMarginRate', 'Brüt Marj', '%', 'Müşteri gelirinin brüt kâra dönüşen kısmı.', { min: 0, max: 100 })],
    outputs: [o('cacPaybackMonths', 'CAC Geri Ödeme', 'ay', 'Edinme maliyetinin geri kazanıldığı süre.')],
    courseCode: 'P6-C14',
  }),
  model({
    code: 'GROSS_BURN', name: 'Brüt Nakit Tüketimi', category: 'cash_resilience',
    purpose: 'İşletmenin bir ayda yaptığı toplam nakit çıkışını görmek.',
    description: 'Faaliyet, personel, yatırım ve diğer nakit çıkışlarını toplar.',
    formula: 'Faaliyet Çıkışı + Personel + Yatırım + Diğer Çıkışlar',
    inputs: [n('operatingOutflows', 'Faaliyet Nakit Çıkışı', 'TRY/ay', 'Tedarikçi ve genel faaliyet ödemeleri.', { min: 0 }), n('payrollOutflows', 'Personel Nakit Çıkışı', 'TRY/ay', 'Maaş ve yan hak ödemeleri.', { min: 0 }), n('capitalOutflows', 'Yatırım Nakit Çıkışı', 'TRY/ay', 'Makine, yazılım ve varlık alımları.', { min: 0 }), n('otherOutflows', 'Diğer Nakit Çıkışı', 'TRY/ay', 'Diğer düzenli veya tek seferlik çıkışlar.', { min: 0 })],
    outputs: [o('grossBurn', 'Brüt Burn', 'TRY/ay', 'Aylık toplam nakit tüketimi.')],
    courseCode: 'P6-C17',
  }),
  model({
    code: 'NET_BURN', name: 'Net Nakit Tüketimi', category: 'cash_resilience',
    purpose: 'Nakit girişleri sonrasında kasanın ayda ne kadar azaldığını görmek.',
    description: 'Brüt nakit tüketiminden faaliyet nakit girişlerini çıkarır.',
    formula: 'Brüt Burn - Aylık Nakit Girişi',
    inputs: [n('grossBurn', 'Brüt Burn', 'TRY/ay', 'Aylık toplam nakit çıkışı.', { min: 0 }), n('cashInflows', 'Aylık Nakit Girişi', 'TRY/ay', 'Tahsil edilen toplam nakit.', { min: 0 })],
    outputs: [o('netBurn', 'Net Burn', 'TRY/ay', 'Aylık net nakit azalışı.')],
    courseCode: 'P6-C17',
  }),
  model({
    code: 'RUNWAY', name: 'Nakit Dayanma Süresi', category: 'cash_resilience',
    purpose: 'Mevcut nakdin net tüketim hızında kaç ay yeteceğini görmek.',
    description: 'Kullanılabilir nakdi aylık net nakit tüketimine böler.',
    formula: 'Kullanılabilir Nakit / Net Burn',
    inputs: [n('availableCash', 'Kullanılabilir Nakit', 'TRY', 'Kısıtsız kullanılabilir nakit bakiyesi.', { min: 0 }), n('netBurn', 'Aylık Net Burn', 'TRY/ay', 'Pozitif aylık net nakit tüketimi.', { min: 0 })],
    outputs: [o('runwayMonths', 'Runway', 'ay', 'Nakit tükenene kadar tahmini süre.')],
    courseCode: 'P6-C17',
  }),
  model({
    code: 'NPV', name: 'Net Bugünkü Değer', category: 'investment',
    purpose: 'Bir yatırımın iskonto edilmiş nakit girişleriyle başlangıç yatırımını karşılayıp karşılamadığını görmek.',
    description: 'Dönemsel nakit akışlarını kullanıcının sağladığı iskonto oranıyla bugüne indirger.',
    formula: 'NPV = Σ CFₜ / (1+r)ᵗ',
    inputs: [arr('cashFlows', 'Nakit Akışları', 'TRY', 'İlk değer yatırım çıkışı olacak şekilde dönemsel nakit akışları.'), n('discountRate', 'Dönemsel İskonto Oranı', '%', 'Nakit akışlarıyla aynı dönem frekansındaki oran.', { min: -99, max: 1000, sourceRequired: true })],
    outputs: [o('npv', 'Net Bugünkü Değer', 'TRY', 'İskonto edilmiş toplam değer.'), o('presentValueInflows', 'Girişlerin Bugünkü Değeri', 'TRY', 'Pozitif nakit akışlarının bugünkü değeri.')],
    sources: [SOURCES.damodaranCorporateFinance],
    courseCode: 'P6-C22',
  }),
  model({
    code: 'IRR', name: 'İç Verim Oranı', category: 'investment',
    purpose: 'Bir yatırımın NPV’sini sıfıra getiren dönemsel getiri oranını bulmak.',
    description: 'En az bir negatif ve bir pozitif nakit akışı içeren seri üzerinde deterministik kök araması yapar.',
    formula: '0 = Σ CFₜ / (1+IRR)ᵗ',
    inputs: [arr('cashFlows', 'Nakit Akışları', 'TRY', 'İlk yatırım ve sonraki dönem nakit akışları.')],
    outputs: [o('irr', 'İç Verim Oranı', '%', 'NPV’yi sıfırlayan dönemsel oran.'), o('iterations', 'Çözüm Adımı', 'adet', 'Deterministik kök arama adedi.')],
    warnings: ['Birden fazla işaret değişimi birden fazla IRR üretebilir; bu durumda NPV profili ayrıca incelenmelidir.'],
    sources: [SOURCES.damodaranCorporateFinance],
    courseCode: 'P6-C22',
  }),
  model({
    code: 'WACC_FCFF_DCF', name: 'Basitleştirilmiş WACC ve FCFF DCF', category: 'valuation',
    purpose: 'Kullanıcının doğruladığı sermaye maliyeti ve nakit akışı varsayımlarıyla şirket veya proje değer aralığı üretmek.',
    description: 'Önce WACC hesaplar, FCFF tahminlerini ve terminal değeri iskonto eder; hassasiyet aralığı döndürür.',
    level: 'advanced',
    formula: 'WACC = E/(D+E)×Ke + D/(D+E)×Kd×(1-T); EV = Σ FCFFₜ/(1+WACC)ᵗ + TV/(1+WACC)ⁿ',
    inputs: [
      n('equityValue', 'Özsermaye Piyasa Değeri', 'TRY', 'Sermaye ağırlığı için özsermaye değeri.', { min: 0, sourceRequired: true }),
      n('debtValue', 'Faizli Borç Değeri', 'TRY', 'Sermaye ağırlığı için borç değeri.', { min: 0, sourceRequired: true }),
      n('riskFreeRate', 'Risksiz Faiz', '%', 'Doğrulanmış piyasa veya onaylı veri kaynağından.', { min: -20, max: 200, sourceRequired: true }),
      n('beta', 'Beta', 'x', 'Şirket/varlık riskini temsil eden doğrulanmış beta.', { min: -5, max: 10, sourceRequired: true }),
      n('marketRiskPremium', 'Piyasa Risk Primi', '%', 'Doğrulanmış piyasa risk primi.', { min: -20, max: 100, sourceRequired: true }),
      n('borrowingCost', 'Vergi Öncesi Borçlanma Maliyeti', '%', 'Şirketin marjinal borçlanma maliyeti.', { min: 0, max: 300, sourceRequired: true }),
      n('taxRate', 'Marjinal Vergi Oranı', '%', 'Kullanıcı veya doğrulanmış kaynak tarafından sağlanır.', { min: 0, max: 100, sourceRequired: true }),
      n('fcffYear1', '1. Yıl FCFF', 'TRY', 'Birinci yıl serbest nakit akışı tahmini.', { sourceRequired: true }),
      n('forecastGrowth', 'Tahmin Dönemi FCFF Büyümesi', '%', 'Açık tahmin dönemi büyüme varsayımı.', { min: -100, max: 300, sourceRequired: true }),
      n('forecastYears', 'Tahmin Yılı', 'yıl', 'Açık tahmin dönemi.', { type: 'integer', min: 1, max: 10 }),
      n('terminalGrowth', 'Terminal Büyüme', '%', 'Uzun dönem sürdürülebilir büyüme varsayımı.', { min: -20, max: 100, sourceRequired: true }),
      n('netDebt', 'Net Borç', 'TRY', 'Faizli borç eksi nakit.', { sourceRequired: true }),
    ],
    outputs: [o('costOfEquity', 'Özsermaye Maliyeti', '%', 'CAPM ile hesaplanan maliyet.'), o('wacc', 'WACC', '%', 'Ağırlıklı sermaye maliyeti.'), o('enterpriseValueBase', 'Firma Değeri - Baz', 'TRY', 'Baz varsayımlarla firma değeri.'), o('equityValueBase', 'Özsermaye Değeri - Baz', 'TRY', 'Net borç sonrası baz özsermaye değeri.'), o('equityValueLow', 'Özsermaye Değeri - Düşük', 'TRY', 'Olumsuz hassasiyet senaryosu.'), o('equityValueHigh', 'Özsermaye Değeri - Yüksek', 'TRY', 'Olumlu hassasiyet senaryosu.')],
    warnings: ['WACC terminal büyümeden büyük olmalıdır.', 'Sonuç yatırım tavsiyesi değildir; varsayım hassasiyeti ve veri kalitesi açıklanmalıdır.'],
    limitations: ['Basitleştirilmiş sabit büyüme yaklaşımıdır.', 'Finansal kuruluşlar ve negatif/oynak FCFF yapıları için uygun model seçimi ayrıca değerlendirilmelidir.'],
    sources: [SOURCES.damodaranValuation, SOURCES.cfaCostOfCapital, SOURCES.kap, SOURCES.spl1002],
    courseCode: 'P6-C24',
  }),
]

export function getFinancialModel(code: string): FinancialModelDefinition | undefined {
  return FINANCIAL_MODEL_REGISTRY.find(model => model.code === code.toUpperCase())
}

export const FINANCIAL_MODEL_ENGINE_VERSION = ENGINE_VERSION
export const FINANCIAL_MODEL_POLICY_VERSION = POLICY_VERSION
