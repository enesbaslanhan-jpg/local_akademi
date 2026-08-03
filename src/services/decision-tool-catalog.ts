import { z } from 'zod'

export type DecisionMetricFormat = 'money' | 'percent' | 'number' | 'months' | 'days'
export type DecisionTone = 'good' | 'warning' | 'bad' | 'neutral'

export interface DecisionToolQuestion {
  code: string
  label: string
  description: string
  type: 'money' | 'percentage' | 'number' | 'days' | 'months'
  required: true
  allowUnknown: false
  min: number
  max?: number
  step?: number
  suffix: string
  order: number
}

export interface DecisionToolConfig {
  code: string
  title: string
  description: string
  category: string
  version: string
  intro: string
  submitLabel: string
  questions: DecisionToolQuestion[]
  formulas: string[]
  decisionChecks: string[]
}

export interface DecisionToolCalculation {
  decisionLabel: 'UYGUN' | 'SINIRDA' | 'RİSKLİ' | 'ZARAR' | 'DEVAM' | 'GÖZDEN GEÇİR' | 'BIRAK'
  decisionTone: DecisionTone
  summary: string
  metrics: Array<{ key: string; label: string; value: number; format: DecisionMetricFormat }>
  scenarios: Array<{ label: string; value: number; format: DecisionMetricFormat; detail: string; tone: DecisionTone }>
  formulas: string[]
  riskWarnings: string[]
  safeNextSteps: string[]
  mentorSummary: string[]
}

const q = (
  code: string,
  label: string,
  description: string,
  type: DecisionToolQuestion['type'],
  suffix: string,
  order: number,
  min = 0,
  max?: number
): DecisionToolQuestion => ({ code, label, description, type, required: true, allowUnknown: false, min, max, step: 0.01, suffix, order })

export const STRUCTURED_TOOL_CONFIGS: DecisionToolConfig[] = [
  {
    code: 'DC-DISCOUNT-002', title: 'Bu indirimi yapabilir miyim?', category: 'Fiyatlandırma', version: '1.0',
    description: 'Planlanan indirimin ürün katkısına, marja ve kampanya başabaşına etkisini hesaplar.',
    intro: 'Mevcut satış koşullarınızı ve kampanya beklentinizi girin; indirim öncesi ile sonrası aynı maliyet tabanında karşılaştırılsın.',
    submitLabel: 'İndirim sınırımı hesapla',
    questions: [
      q('salePrice', 'Mevcut satış fiyatı', 'İndirim uygulanmadan önce müşterinin ödediği fiyat.', 'money', '₺', 1, 0.01),
      q('unitCost', 'Ürün başı toplam maliyet', 'Ürün, paketleme, kargo ve diğer değişken maliyetlerin toplamı.', 'money', '₺', 2),
      q('commissionRate', 'Komisyon oranı', 'İndirimli satış fiyatı üzerinden kesilecek toplam oran.', 'percentage', '%', 3, 0, 99),
      q('plannedDiscountRate', 'Planlanan indirim', 'Kampanyada uygulanacak indirim yüzdesi.', 'percentage', '%', 4, 0, 99),
      q('currentMonthlyUnits', 'Mevcut aylık satış adedi', 'İndirimsiz dönemdeki ortalama aylık adet.', 'number', 'adet', 5, 1),
      q('expectedSalesLiftPercent', 'Beklenen satış artışı', 'İndirimle oluşmasını beklediğiniz adet artışı.', 'percentage', '%', 6, 0, 1000)
    ],
    formulas: ['İndirimli fiyat = Mevcut fiyat × (1 − indirim oranı)', 'Katkı = Fiyat − maliyet − fiyat × komisyon', 'Kampanya başabaş adedi = Mevcut toplam katkı ÷ indirimli ürün katkısı'],
    decisionChecks: ['İndirim sonrası ürün başına katkı pozitif mi?', 'Beklenen satış artışı, kaybedilen marjı telafi ediyor mu?', 'Güvenli indirim sınırı aşılmış mı?']
  },
  {
    code: 'DC-FREESHIP-003', title: 'Kargo ücretsiz olabilir mi?', category: 'Lojistik', version: '1.0',
    description: 'Ücretsiz kargonun sepet katkısına etkisini ve güvenli minimum sepet eşiğini hesaplar.',
    intro: 'Bir siparişin sepet değerini, maliyetini ve kargo paylaşımını girin; mevcut ve ücretsiz kargo senaryolarını karşılaştırın.',
    submitLabel: 'Ücretsiz kargo eşiğini hesapla',
    questions: [
      q('basketValue', 'Ortalama sepet tutarı', 'Müşterinin ürünler için ödediği ortalama toplam.', 'money', '₺', 1, 0.01),
      q('basketProductCost', 'Sepetteki ürünlerin maliyeti', 'Sepette bulunan ürünlerin toplam satın alma veya üretim maliyeti.', 'money', '₺', 2),
      q('commissionRate', 'Komisyon oranı', 'Sepet tutarı üzerinden kesilen kanal veya ödeme komisyonu.', 'percentage', '%', 3, 0, 89),
      q('packagingCost', 'Paketleme maliyeti', 'Sipariş başına kutu, poşet ve koruma maliyeti.', 'money', '₺', 4),
      q('carrierCost', 'Kargo firmasına ödenen', 'Sipariş başına gerçek taşıma bedeli.', 'money', '₺', 5),
      q('customerShippingFee', 'Müşteriden alınan kargo', 'Mevcut durumda müşterinin ödediği kargo bedeli.', 'money', '₺', 6),
      q('itemsPerBasket', 'Sepetteki ürün adedi', 'Ortalama bir siparişte bulunan ürün adedi.', 'number', 'adet', 7, 1)
    ],
    formulas: ['Mevcut katkı = Sepet + alınan kargo − ürün maliyeti − komisyon − paketleme − taşıma', 'Ücretsiz kargo katkısı = Sepet − ürün maliyeti − komisyon − paketleme − taşıma', 'Güvenli sepet eşiği = Toplam maliyet ÷ (1 − komisyon − %10 güvenlik marjı)'],
    decisionChecks: ['Ücretsiz kargo sonrası katkı pozitif mi?', 'Sepet tutarı güvenli eşiğin üzerinde mi?', 'Kargo maliyeti kaç ürün katkısıyla karşılanıyor?']
  },
  {
    code: 'DC-MARKETPLACE-004', title: 'Pazaryeri komisyonundan sonra ne kalıyor?', category: 'Pazaryeri', version: '1.0',
    description: 'Pazaryeri kesintilerinden sonra net tahsilatı, ürün katkısını ve alternatif kanal farkını gösterir.',
    intro: 'Pazaryerindeki tüm görünür ve görünmeyen kesintileri ürün başında girin; doğrudan kanal ile net karşılaştırma alın.',
    submitLabel: 'Kanal netini hesapla',
    questions: [
      q('salePrice', 'Pazaryeri satış fiyatı', 'Müşterinin pazaryerinde ödediği ürün fiyatı.', 'money', '₺', 1, 0.01),
      q('productCost', 'Ürün maliyeti', 'Ürünün satın alma veya üretim maliyeti.', 'money', '₺', 2),
      q('commissionRate', 'Pazaryeri komisyonu', 'Satış fiyatından kesilen komisyon oranı.', 'percentage', '%', 3, 0, 99),
      q('serviceFee', 'Hizmet ve işlem kesintileri', 'Listeleme, hizmet ve ödeme gibi ürün başı sabit kesintiler.', 'money', '₺', 4),
      q('adCost', 'Ürün başı reklam payı', 'Pazaryeri reklam harcamasının satılan ürüne düşen payı.', 'money', '₺', 5),
      q('shippingCost', 'Satıcı kargo maliyeti', 'Satıcıya kalan ürün başı kargo maliyeti.', 'money', '₺', 6),
      q('packagingCost', 'Paketleme maliyeti', 'Ürün başı paketleme gideri.', 'money', '₺', 7),
      q('directChannelFeeRate', 'Doğrudan kanal kesintisi', 'Kendi kanalınızdaki ödeme ve altyapı kesintisi oranı.', 'percentage', '%', 8, 0, 99)
    ],
    formulas: ['Net tahsilat = Fiyat − komisyon − hizmet − reklam − kargo', 'Ürün katkısı = Net tahsilat − ürün maliyeti − paketleme', 'Minimum fiyat = Sabit ve değişken maliyetler ÷ (1 − komisyon)'],
    decisionChecks: ['Tüm kesintilerden sonra katkı pozitif mi?', 'Mevcut fiyat minimum fiyatın üzerinde mi?', 'Doğrudan kanal katkısı pazaryerinden ne kadar farklı?']
  },
  {
    code: 'DC-ADS-005', title: 'Reklam bütçemi artırmalı mıyım?', category: 'Pazarlama', version: '1.0',
    description: 'Reklamın gerçek katkısını, ROAS başabaşını ve ek bütçe senaryosunu değerlendirir.',
    intro: 'Reklam paneli verilerini ürün katkısıyla birlikte girin; ciro yerine reklam sonrası katkı üzerinden karar verin.',
    submitLabel: 'Ek bütçe senaryosunu hesapla',
    questions: [
      q('adSpend', 'Mevcut reklam harcaması', 'Değerlendirilen dönemdeki toplam reklam harcaması.', 'money', '₺', 1, 0.01),
      q('revenueFromAds', 'Reklam kaynaklı ciro', 'Aynı dönemde reklama atfedilen satış tutarı.', 'money', '₺', 2, 0.01),
      q('ordersFromAds', 'Reklam kaynaklı sipariş', 'Reklama atfedilen sipariş adedi.', 'number', 'adet', 3, 1),
      q('unitContributionBeforeAds', 'Reklam öncesi sipariş katkısı', 'Bir siparişin reklam hariç tüm değişken maliyetlerden sonraki katkısı.', 'money', '₺', 4, 0.01),
      q('conversionRate', 'Dönüşüm oranı', 'Reklam tıklamalarının siparişe dönüşme oranı.', 'percentage', '%', 5, 0.01, 100),
      q('plannedIncreasePercent', 'Planlanan bütçe artışı', 'Reklam bütçesine yapılacak artış oranı.', 'percentage', '%', 6, 0, 500),
      q('expectedEfficiencyChangePercent', 'Beklenen verim değişimi', 'Ek bütçede sipariş başı verimin artış veya düşüş beklentisi.', 'percentage', '%', 7, -90, 100)
    ],
    formulas: ['ROAS = Reklam kaynaklı ciro ÷ reklam harcaması', 'Reklam sonrası katkı = Sipariş × reklam öncesi katkı − reklam harcaması', 'Ek bütçe katkısı = Tahmini ek sipariş × katkı − ek harcama'],
    decisionChecks: ['Mevcut reklam katkısı pozitif mi?', 'ROAS başabaş seviyesinin üzerinde mi?', 'Ek bütçe verim düşüşüne rağmen katkı üretiyor mu?']
  },
  {
    code: 'DC-HIRE-006', title: 'Yeni personel alabilir miyim?', category: 'İnsan Kaynağı', version: '1.0',
    description: 'Yeni personelin tam işveren maliyetini, başabaş cirosunu ve nakit dayanıklılığını hesaplar.',
    intro: 'Maaş dışında işveren yükünü, beklenen kapasite katkısını ve nakit rezervini birlikte değerlendirin.',
    submitLabel: 'İşe alım kapasitemi hesapla',
    questions: [
      q('grossSalary', 'Aylık brüt ücret', 'Planlanan aylık brüt maaş.', 'money', '₺', 1, 0.01),
      q('employerOnCostRate', 'İşveren ek yük oranı', 'Prim, yan hak ve işveren maliyetlerinin brüt ücrete oranı.', 'percentage', '%', 2, 0, 200),
      q('otherMonthlyCost', 'Diğer aylık gider', 'Ekipman, yemek, ulaşım ve yazılım gibi ek aylık maliyet.', 'money', '₺', 3),
      q('expectedMonthlyRevenue', 'Beklenen ek aylık ciro', 'Yeni personelin doğrudan veya kapasite yoluyla oluşturacağı ek ciro.', 'money', '₺', 4),
      q('contributionMarginRate', 'Ciro katkı marjı', 'Ek cironun değişken maliyetlerden sonra işletmeye kalan oranı.', 'percentage', '%', 5, 0.01, 100),
      q('monthlyFreeCash', 'Mevcut aylık serbest nakit', 'Diğer yükümlülüklerden sonra aylık ortalama serbest nakit.', 'money', '₺', 6),
      q('cashReserve', 'Kullanılabilir nakit rezervi', 'İşe alım için kullanılabilecek güvenli nakit tamponu.', 'money', '₺', 7)
    ],
    formulas: ['Tam istihdam maliyeti = Brüt ücret × (1 + işveren yükü) + ek gider', 'Başabaş ciro = Tam maliyet ÷ katkı marjı', 'Rezerv dayanıklılığı = Nakit rezervi ÷ aylık istihdam maliyeti'],
    decisionChecks: ['Beklenen katkı tam maliyeti karşılıyor mu?', 'Serbest nakit aylık yükü taşıyor mu?', 'En az üç aylık maliyet tamponu var mı?']
  },
  {
    code: 'DC-LOAN-007', title: 'Kredi taksitini karşılayabilir miyim?', category: 'Finansman', version: '1.0',
    description: 'Yeni kredi taksitinin nakit akışına etkisini, borç karşılama oranını ve kötü senaryoyu ölçer.',
    intro: 'Mevcut borç ödemelerinizi ve serbest nakdinizi birlikte girin; yalnız iyimser aya göre borçlanmayın.',
    submitLabel: 'Taksit dayanıklılığını hesapla',
    questions: [
      q('monthlyInstallment', 'Yeni aylık taksit', 'Değerlendirilen kredinin aylık ödemesi.', 'money', '₺', 1, 0.01),
      q('monthlyFreeCash', 'Aylık serbest nakit', 'Faaliyet giderleri ve vergiler sonrası ortalama nakit.', 'money', '₺', 2, 0.01),
      q('existingDebtPayments', 'Mevcut aylık borç ödemeleri', 'Devam eden tüm kredi ve finansman taksitleri.', 'money', '₺', 3),
      q('cashReserve', 'Nakit rezervi', 'Borç ödemeleri için erişilebilir güvenli rezerv.', 'money', '₺', 4),
      q('termMonths', 'Kalan toplam vade', 'Yeni kredinin ay cinsinden toplam ödeme süresi.', 'months', 'ay', 5, 1, 360),
      q('downsideCashDropPercent', 'Kötü senaryo nakit düşüşü', 'Zayıf bir ayda serbest nakitte beklenen düşüş.', 'percentage', '%', 6, 0, 100)
    ],
    formulas: ['Borç karşılama oranı = Serbest nakit ÷ toplam aylık borç ödemesi', 'Aylık tampon = Serbest nakit − toplam borç ödemesi', 'Kötü senaryo oranı = Düşürülmüş serbest nakit ÷ toplam borç ödemesi'],
    decisionChecks: ['Borç karşılama oranı 1,25 üzerinde mi?', 'Kötü senaryoda taksit hâlâ karşılanıyor mu?', 'Rezerv en az üç toplam taksit tutarında mı?']
  },
  {
    code: 'DC-CASHFLOW-008', title: 'Nakit akışım riskli mi?', category: 'Nakit Yönetimi', version: '1.0',
    description: 'Nakit giriş-çıkışını, vade farkını, açık ayları ve minimum tampon ihtiyacını hesaplar.',
    intro: 'Kârlılıktan ayrı olarak paranın ne zaman girip çıktığını değerlendirin; vade farkını görünür hale getirin.',
    submitLabel: 'Nakit riskimi hesapla',
    questions: [
      q('openingCash', 'Mevcut nakit', 'Banka ve kasadaki kullanılabilir başlangıç nakdi.', 'money', '₺', 1),
      q('monthlyCashInflow', 'Aylık nakit girişi', 'Tahsil edilen ortalama aylık nakit.', 'money', '₺', 2),
      q('monthlyCashOutflow', 'Aylık nakit çıkışı', 'Ödenen ortalama aylık toplam nakit.', 'money', '₺', 3, 0.01),
      q('receivableDays', 'Ortalama tahsilat vadesi', 'Satıştan tahsilata kadar geçen ortalama süre.', 'days', 'gün', 4, 0, 365),
      q('payableDays', 'Ortalama ödeme vadesi', 'Tedarikçi ve gider ödemelerine kadar geçen ortalama süre.', 'days', 'gün', 5, 0, 365),
      q('minimumCashBuffer', 'Hedef minimum nakit tamponu', 'Her koşulda korunması gereken nakit tutarı.', 'money', '₺', 6)
    ],
    formulas: ['Aylık net akış = Nakit girişi − nakit çıkışı', 'Vade etkisi = Aylık giriş × (tahsilat günü − ödeme günü) ÷ 30', 'Runway = Mevcut nakit ÷ aylık nakit açığı'],
    decisionChecks: ['Aylık net akış pozitif mi?', 'Vade farkı nakit açığı oluşturuyor mu?', 'Düzeltilmiş nakit minimum tamponun üzerinde mi?']
  },
  {
    code: 'DC-BRANCH-009', title: 'Yeni şube açmaya hazır mıyım?', category: 'Büyüme', version: '1.0',
    description: 'Yeni şubenin yatırımını, aylık başabaşını, geri ödeme süresini ve rezerv yeterliliğini ölçer.',
    intro: 'Açılış heyecanından önce yatırım, aylık sabit yük, ramp-up süresi ve kötü ciro senaryosunu birlikte hesaplayın.',
    submitLabel: 'Şube hazırlığımı hesapla',
    questions: [
      q('initialInvestment', 'Başlangıç yatırımı', 'Dekorasyon, depozito, ekipman ve açılış stokunun toplamı.', 'money', '₺', 1, 0.01),
      q('monthlyFixedCost', 'Aylık sabit gider', 'Kira, personel, enerji ve diğer sabit şube giderleri.', 'money', '₺', 2, 0.01),
      q('expectedMonthlyRevenue', 'Beklenen aylık ciro', 'Şubenin olgun dönemde beklenen aylık cirosu.', 'money', '₺', 3),
      q('contributionMarginRate', 'Katkı marjı', 'Cironun değişken maliyetlerden sonra kalan oranı.', 'percentage', '%', 4, 0.01, 100),
      q('cashReserve', 'Şube için ayrılan rezerv', 'Başlangıç yatırımı dışında kullanılabilir nakit.', 'money', '₺', 5),
      q('rampUpMonths', 'Hedefe ulaşma süresi', 'Şubenin beklenen ciroya erişmesi öngörülen süre.', 'months', 'ay', 6, 1, 36),
      q('downsideRevenuePercent', 'Kötü senaryo ciro düşüşü', 'Beklenen cironun altında kalma oranı.', 'percentage', '%', 7, 0, 100)
    ],
    formulas: ['Aylık faaliyet sonucu = Ciro × katkı marjı − sabit gider', 'Başabaş ciro = Sabit gider ÷ katkı marjı', 'Yatırım geri ödeme süresi = Başlangıç yatırımı ÷ aylık faaliyet sonucu'],
    decisionChecks: ['Normal ve kötü senaryoda faaliyet sonucu pozitif mi?', 'Rezerv ramp-up dönemini karşılıyor mu?', 'Geri ödeme süresi kabul edilebilir mi?']
  },
  {
    code: 'DC-CAMPAIGN-010', title: 'Kampanya yapmak mantıklı mı?', category: 'Pazarlama', version: '1.0',
    description: 'Kampanya maliyetini, başabaş adedini ve düşük-orta-yüksek satış senaryolarını karşılaştırır.',
    intro: 'İndirim maliyetini ve kampanya sabit giderini satış artışı beklentisiyle karşılaştırın.',
    submitLabel: 'Kampanya senaryolarını hesapla',
    questions: [
      q('currentUnitPrice', 'Mevcut ürün fiyatı', 'Kampanya öncesi ürün satış fiyatı.', 'money', '₺', 1, 0.01),
      q('unitVariableCost', 'Ürün başı değişken maliyet', 'Ürün, komisyon, kargo ve diğer adet bazlı maliyetler.', 'money', '₺', 2),
      q('discountRate', 'Kampanya indirimi', 'Kampanyada uygulanacak indirim oranı.', 'percentage', '%', 3, 0, 99),
      q('campaignFixedCost', 'Kampanya sabit gideri', 'Tasarım, reklam, kurulum ve diğer sabit kampanya giderleri.', 'money', '₺', 4),
      q('baselineUnits', 'Mevcut satış adedi', 'Aynı uzunluktaki normal dönemde satılan adet.', 'number', 'adet', 5, 1),
      q('expectedLiftLow', 'Düşük senaryo artışı', 'Temkinli satış artışı beklentisi.', 'percentage', '%', 6, 0, 1000),
      q('expectedLiftMedium', 'Orta senaryo artışı', 'En olası satış artışı beklentisi.', 'percentage', '%', 7, 0, 1000),
      q('expectedLiftHigh', 'Yüksek senaryo artışı', 'İyimser satış artışı beklentisi.', 'percentage', '%', 8, 0, 2000)
    ],
    formulas: ['Kampanya katkısı = İndirimli ürün katkısı × kampanya adedi − sabit gider', 'Başabaş adet = (Mevcut katkı + sabit gider) ÷ indirimli ürün katkısı', 'Senaryo farkı = Kampanya katkısı − normal dönem katkısı'],
    decisionChecks: ['İndirimli ürün katkısı pozitif mi?', 'Orta senaryo normal dönem katkısını geçiyor mu?', 'Düşük senaryodaki kayıp taşınabilir mi?']
  },
  {
    code: 'DC-STOCK-011', title: 'Stok artırmalı mıyım?', category: 'Stok Yönetimi', version: '1.0',
    description: 'Satış hızı ve tedarik süresine göre stokta kalmama riskini, elde kalma maliyetini ve sipariş aralığını hesaplar.',
    intro: 'Mevcut stokunuzu yalnız satış beklentisiyle değil; tedarik süresi, talep oynaklığı ve taşıma maliyetiyle değerlendirin.',
    submitLabel: 'Stok ihtiyacımı hesapla',
    questions: [
      q('currentStock', 'Mevcut stok', 'Bugün satılabilir durumdaki ürün adedi.', 'number', 'adet', 1, 0),
      q('averageDailySales', 'Günlük ortalama satış', 'Son anlamlı dönemdeki günlük ortalama satış adedi.', 'number', 'adet/gün', 2, 0.01),
      q('leadTimeDays', 'Tedarik süresi', 'Siparişten ürünün satılabilir olmasına kadar geçen süre.', 'days', 'gün', 3, 1, 365),
      q('demandVariabilityPercent', 'Talep oynaklığı', 'Yoğun dönemlerde ortalamaya göre görülen artış.', 'percentage', '%', 4, 0, 500),
      q('unitHoldingCostMonthly', 'Aylık ürün başı elde tutma maliyeti', 'Sermaye, depo, bozulma ve sigorta payı.', 'money', '₺', 5),
      q('plannedOrderQuantity', 'Planlanan sipariş', 'Vermeyi düşündüğünüz yeni sipariş adedi.', 'number', 'adet', 6, 0)
    ],
    formulas: ['Stok gün sayısı = Mevcut stok ÷ günlük satış', 'Yeniden sipariş noktası = Günlük satış × tedarik süresi × (1 + oynaklık)', 'Önerilen sipariş = Yeniden sipariş noktası + güvenlik stoğu − mevcut stok'],
    decisionChecks: ['Mevcut stok tedarik süresini karşılıyor mu?', 'Planlanan sipariş önerilen aralıkta mı?', 'Fazla stok taşıma maliyeti makul mü?']
  },
  {
    code: 'DC-CONTINUE-012', title: 'Bu ürünü satmaya devam etmeli miyim?', category: 'Ürün Yönetimi', version: '1.0',
    description: 'Ürün katkısını, satış hızını, iade ve stok maliyetini alternatif fırsatla karşılaştırır.',
    intro: 'Yalnız ciroya bakmadan ürünün net aylık katkısını ve rafınızda tuttuğu alternatif değeri hesaplayın.',
    submitLabel: 'Ürün kararımı hesapla',
    questions: [
      q('salePrice', 'Ürün satış fiyatı', 'Müşterinin ödediği ortalama net fiyat.', 'money', '₺', 1, 0.01),
      q('unitVariableCost', 'Ürün başı değişken maliyet', 'Ürün, komisyon, kargo ve paketleme toplamı.', 'money', '₺', 2),
      q('monthlyUnits', 'Aylık satış adedi', 'Ürünün aylık ortalama satış hızı.', 'number', 'adet', 3, 0),
      q('returnRate', 'İade oranı', 'Satılan ürünlerin iade edilen yüzdesi.', 'percentage', '%', 4, 0, 100),
      q('returnLossPerUnit', 'İade başı net kayıp', 'Kargo, değer kaybı ve işlem gideri dahil ortalama kayıp.', 'money', '₺', 5),
      q('monthlyHoldingCost', 'Aylık stok maliyeti', 'Bu ürüne ayrılan depo ve sermaye maliyeti.', 'money', '₺', 6),
      q('alternativeMonthlyContribution', 'Alternatif ürün fırsatı', 'Aynı kaynakla satılabilecek alternatif ürünün aylık katkısı.', 'money', '₺', 7)
    ],
    formulas: ['Düzeltilmiş birim katkı = Fiyat − değişken maliyet − iade oranı × iade kaybı', 'Net aylık katkı = Düzeltilmiş katkı × adet − stok maliyeti', 'Fırsat farkı = Net aylık katkı − alternatif ürün katkısı'],
    decisionChecks: ['Düzeltilmiş birim katkı pozitif mi?', 'Net aylık katkı alternatif fırsatı geçiyor mu?', 'İade oranı katkıyı kırılgan hale getiriyor mu?']
  }
]

export const STRUCTURED_TOOL_BY_CODE = new Map(STRUCTURED_TOOL_CONFIGS.map(tool => [tool.code, tool]))

const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const moneyMetric = (key: string, label: string, value: number) => ({ key, label, value: round(value), format: 'money' as const })
const percentMetric = (key: string, label: string, value: number) => ({ key, label, value: round(value, 1), format: 'percent' as const })
const numberMetric = (key: string, label: string, value: number, format: DecisionMetricFormat = 'number') => ({ key, label, value: round(value, 1), format })

export function validateStructuredToolAnswers(code: string, rawAnswers: Record<string, unknown>) {
  const config = STRUCTURED_TOOL_BY_CODE.get(code)
  if (!config) return { success: false as const, fields: [], message: 'Karar aracı hesaplayıcısı bulunamadı.' }
  const shape = Object.fromEntries(config.questions.map(question => [
    question.code,
    z.coerce.number().finite().min(question.min).max(question.max ?? Number.MAX_SAFE_INTEGER)
  ]))
  const parsed = z.object(shape).safeParse(rawAnswers)
  if (!parsed.success) {
    return {
      success: false as const,
      fields: parsed.error.issues.map(issue => String(issue.path[0])),
      message: 'Hesaplama için tüm alanları geçerli aralıkta doldurun.'
    }
  }
  return { success: true as const, data: parsed.data as Record<string, number>, config }
}

function result(
  decisionLabel: DecisionToolCalculation['decisionLabel'], decisionTone: DecisionTone, summary: string,
  metrics: DecisionToolCalculation['metrics'], scenarios: DecisionToolCalculation['scenarios'], formulas: string[],
  riskWarnings: string[], safeNextSteps: string[]
): DecisionToolCalculation {
  return {
    decisionLabel, decisionTone, summary, metrics, scenarios, formulas,
    riskWarnings: riskWarnings.length ? riskWarnings : ['Bu senaryoda kritik bir risk işareti bulunmadı.'],
    safeNextSteps: safeNextSteps.slice(0, 3),
    mentorSummary: [summary, ...metrics.slice(0, 4).map(metric => `${metric.label}: ${metric.value}`), ...riskWarnings.slice(0, 2)]
  }
}

export function calculateStructuredDecisionTool(code: string, a: Record<string, number>): DecisionToolCalculation {
  switch (code) {
    case 'DC-DISCOUNT-002': {
      const baseCommission = a.salePrice * a.commissionRate / 100
      const baseContribution = a.salePrice - a.unitCost - baseCommission
      const discountedPrice = a.salePrice * (1 - a.plannedDiscountRate / 100)
      const discountedContribution = discountedPrice * (1 - a.commissionRate / 100) - a.unitCost
      const baseTotal = baseContribution * a.currentMonthlyUnits
      const expectedUnits = a.currentMonthlyUnits * (1 + a.expectedSalesLiftPercent / 100)
      const campaignTotal = discountedContribution * expectedUnits
      const breakEvenUnits = discountedContribution > 0 ? baseTotal / discountedContribution : Infinity
      const maxSafeDiscount = Math.max(0, (1 - (a.unitCost / (a.salePrice * (1 - a.commissionRate / 100)))) * 100)
      const loss = discountedContribution <= 0
      const weak = !loss && (campaignTotal < baseTotal || discountedContribution / discountedPrice < 0.1)
      return result(loss ? 'ZARAR' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Planlanan indirim ürün başına zarar oluşturuyor.' : weak ? 'İndirim pozitif katkı bırakıyor ancak beklenen hacim marj kaybını güvenle karşılamıyor.' : 'Beklenen satış artışı indirim sonrası katkı kaybını karşılıyor.',
        [moneyMetric('discountedPrice', 'İndirimli fiyat', discountedPrice), moneyMetric('baseContribution', 'İndirim öncesi katkı', baseContribution), moneyMetric('discountedContribution', 'İndirim sonrası katkı', discountedContribution), percentMetric('maxSafeDiscount', 'Maksimum güvenli indirim', maxSafeDiscount), numberMetric('breakEvenUnits', 'Kampanya başabaş adedi', Number.isFinite(breakEvenUnits) ? Math.ceil(breakEvenUnits) : 0)],
        [{ label: 'Mevcut aylık katkı', value: baseTotal, format: 'money', detail: `${a.currentMonthlyUnits} adet`, tone: 'neutral' }, { label: 'Kampanya aylık katkısı', value: campaignTotal, format: 'money', detail: `${Math.round(expectedUnits)} beklenen adet`, tone: campaignTotal >= baseTotal ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [loss ? 'İndirim oranı maksimum güvenli sınırı aşıyor.' : '', campaignTotal < baseTotal ? 'Beklenen satış artışı toplam katkı kaybını karşılamıyor.' : ''].filter(Boolean),
        [loss ? `İndirimi %${round(maxSafeDiscount, 1)} veya altına indirin.` : 'Kampanya sırasında ürün başı katkıyı günlük izleyin.', `En az ${Number.isFinite(breakEvenUnits) ? Math.ceil(breakEvenUnits) : 'hesaplanabilir'} adet satış hedefi koyun.`])
    }
    case 'DC-FREESHIP-003': {
      const commission = a.basketValue * a.commissionRate / 100
      const baseCosts = a.basketProductCost + commission + a.packagingCost + a.carrierCost
      const currentContribution = a.basketValue + a.customerShippingFee - baseCosts
      const freeContribution = a.basketValue - baseCosts
      const safeDenominator = 1 - a.commissionRate / 100 - 0.1
      const safeBasketThreshold = safeDenominator > 0 ? (a.basketProductCost + a.packagingCost + a.carrierCost) / safeDenominator : 0
      const contributionBeforeShippingPerItem = (a.basketValue - a.basketProductCost - commission - a.packagingCost) / a.itemsPerBasket
      const coveringItems = contributionBeforeShippingPerItem > 0 ? Math.ceil(a.carrierCost / contributionBeforeShippingPerItem) : 0
      const loss = freeContribution <= 0
      const weak = !loss && (a.basketValue < safeBasketThreshold || freeContribution / a.basketValue < 0.1)
      return result(loss ? 'ZARAR' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Mevcut sepet tutarında ücretsiz kargo katkıyı negatife çeviriyor.' : weak ? 'Ücretsiz kargo mümkün, ancak sepet tutarı güvenli marj eşiğine yakın.' : 'Mevcut sepet ücretsiz kargoyu güvenli katkıyla karşılıyor.',
        [moneyMetric('currentContribution', 'Mevcut katkı', currentContribution), moneyMetric('freeContribution', 'Ücretsiz kargo katkısı', freeContribution), moneyMetric('safeBasketThreshold', 'Güvenli minimum sepet', safeBasketThreshold), numberMetric('coveringItems', 'Kargoyu karşılayan ürün', coveringItems)],
        [{ label: 'Müşteri kargoyu öder', value: currentContribution, format: 'money', detail: `Kargo geliri ${round(a.customerShippingFee)} ₺`, tone: 'neutral' }, { label: 'Satıcı kargoyu öder', value: freeContribution, format: 'money', detail: `Taşıma maliyeti ${round(a.carrierCost)} ₺`, tone: freeContribution > 0 ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [loss ? 'Kargo maliyeti sepet katkısından yüksek.' : '', a.basketValue < safeBasketThreshold ? 'Ortalama sepet güvenli ücretsiz kargo eşiğinin altında.' : ''].filter(Boolean),
        [`Ücretsiz kargo alt limitini en az ${round(safeBasketThreshold)} ₺ belirleyin.`, coveringItems > 0 ? `Sepette en az ${coveringItems} benzer katkılı ürün hedefleyin.` : 'Ürün katkısını artırmadan ücretsiz kargo sunmayın.', 'Taşıma tarifesini sepet ağırlığına göre tekrar doğrulayın.'])
    }
    case 'DC-MARKETPLACE-004': {
      const commission = a.salePrice * a.commissionRate / 100
      const deductions = commission + a.serviceFee + a.adCost + a.shippingCost
      const netReceipt = a.salePrice - deductions
      const contribution = netReceipt - a.productCost - a.packagingCost
      const fixedCosts = a.productCost + a.serviceFee + a.adCost + a.shippingCost + a.packagingCost
      const minPrice = fixedCosts / (1 - a.commissionRate / 100)
      const directContribution = a.salePrice * (1 - a.directChannelFeeRate / 100) - a.productCost - a.packagingCost
      const channelDifference = directContribution - contribution
      const loss = contribution <= 0
      const weak = !loss && contribution / a.salePrice < 0.1
      return result(loss ? 'ZARAR' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Pazaryeri kesintileri sonrası ürün katkı üretmiyor.' : weak ? 'Pazaryeri katkısı pozitif fakat kesinti artışlarına karşı kırılgan.' : 'Pazaryeri satışından pozitif ve kullanılabilir katkı kalıyor.',
        [moneyMetric('commission', 'Komisyon', commission), moneyMetric('totalDeductions', 'Toplam kanal kesintisi', deductions), moneyMetric('netReceipt', 'Net tahsilat', netReceipt), moneyMetric('contribution', 'Ürün başı katkı', contribution), moneyMetric('minimumSalePrice', 'Minimum satış fiyatı', minPrice)],
        [{ label: 'Pazaryeri katkısı', value: contribution, format: 'money', detail: `Kesinti oranı %${round(deductions / a.salePrice * 100, 1)}`, tone: contribution > 0 ? 'good' : 'bad' }, { label: 'Doğrudan kanal katkısı', value: directContribution, format: 'money', detail: `${round(channelDifference)} ₺ kanal farkı`, tone: directContribution >= contribution ? 'good' : 'neutral' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [loss ? 'Satış fiyatı tüm kesintileri ve ürün maliyetini karşılamıyor.' : '', channelDifference > contribution * 0.5 ? 'Doğrudan kanal belirgin biçimde daha yüksek katkı sağlıyor.' : ''].filter(Boolean),
        [`Pazaryeri fiyatını en az ${round(minPrice)} ₺ seviyesinde tutun.`, 'Reklam ve hizmet kesintilerini ürün bazında aylık mutabakatla doğrulayın.', channelDifference > 0 ? 'Kârlı müşterileri doğrudan kanala taşıma maliyetini ayrıca ölçün.' : 'Kanal karmasını mevcut katkıyla koruyun.'])
    }
    case 'DC-ADS-005': {
      const aov = a.revenueFromAds / a.ordersFromAds
      const roas = a.revenueFromAds / a.adSpend
      const contributionMargin = a.unitContributionBeforeAds / aov
      const breakEvenRoas = contributionMargin > 0 ? 1 / contributionMargin : 0
      const currentContribution = a.ordersFromAds * a.unitContributionBeforeAds - a.adSpend
      const extraSpend = a.adSpend * a.plannedIncreasePercent / 100
      const currentCpa = a.adSpend / a.ordersFromAds
      const projectedCpa = currentCpa / (1 + a.expectedEfficiencyChangePercent / 100)
      const extraOrders = projectedCpa > 0 ? extraSpend / projectedCpa : 0
      const extraContribution = extraOrders * a.unitContributionBeforeAds - extraSpend
      const loss = currentContribution <= 0 || extraContribution < 0
      const weak = !loss && roas < breakEvenRoas * 1.2
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Ek reklam bütçesi beklenen verimle katkı üretmiyor.' : weak ? 'Reklam pozitif katkıda, ancak başabaş ROAS tamponu dar.' : 'Mevcut performans ve ek bütçe senaryosu pozitif katkı üretiyor.',
        [moneyMetric('currentContribution', 'Mevcut reklam sonrası katkı', currentContribution), numberMetric('roas', 'Mevcut ROAS', roas), numberMetric('breakEvenRoas', 'Başabaş ROAS', breakEvenRoas), percentMetric('conversionRate', 'Dönüşüm oranı', a.conversionRate), moneyMetric('extraContribution', 'Ek bütçe katkısı', extraContribution)],
        [{ label: 'Mevcut bütçe', value: currentContribution, format: 'money', detail: `${a.ordersFromAds} sipariş`, tone: currentContribution > 0 ? 'good' : 'bad' }, { label: 'Ek bütçe', value: extraContribution, format: 'money', detail: `${round(extraOrders, 1)} tahmini ek sipariş`, tone: extraContribution > 0 ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [currentContribution <= 0 ? 'Mevcut reklam harcaması katkıdan fazla.' : '', extraContribution < 0 ? 'Planlanan bütçe artışı marjı tüketiyor.' : ''].filter(Boolean),
        [loss ? 'Bütçeyi artırmadan önce hedefleme veya teklifleri düzeltin.' : 'Ek bütçeyi kademeli ve günlük katkı limitiyle açın.', `ROAS için ${round(breakEvenRoas, 2)} altını durdurma eşiği yapın.`, 'Atıf penceresini ve organik satış payını ayrıca kontrol edin.'])
    }
    case 'DC-HIRE-006': {
      const employmentCost = a.grossSalary * (1 + a.employerOnCostRate / 100) + a.otherMonthlyCost
      const expectedContribution = a.expectedMonthlyRevenue * a.contributionMarginRate / 100
      const monthlyImpact = expectedContribution - employmentCost
      const breakEvenRevenue = employmentCost / (a.contributionMarginRate / 100)
      const reserveMonths = employmentCost > 0 ? a.cashReserve / employmentCost : 0
      const downsideImpact = expectedContribution * 0.7 - employmentCost
      const loss = monthlyImpact < 0 || a.monthlyFreeCash < employmentCost
      const weak = !loss && (reserveMonths < 3 || downsideImpact < 0)
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Beklenen katkı veya mevcut serbest nakit yeni personelin tam maliyetini karşılamıyor.' : weak ? 'İşe alım normal senaryoda karşılanıyor, ancak rezerv ya da düşük ciro tamponu yetersiz.' : 'İşe alım maliyeti beklenen katkı ve nakit tamponuyla karşılanıyor.',
        [moneyMetric('employmentCost', 'Tam aylık işveren maliyeti', employmentCost), moneyMetric('expectedContribution', 'Beklenen aylık katkı', expectedContribution), moneyMetric('breakEvenRevenue', 'Başabaş ek ciro', breakEvenRevenue), numberMetric('reserveMonths', 'Rezerv dayanıklılığı', reserveMonths, 'months'), moneyMetric('monthlyImpact', 'Net aylık etki', monthlyImpact)],
        [{ label: 'Beklenen kapasite', value: monthlyImpact, format: 'money', detail: `${round(a.expectedMonthlyRevenue)} ₺ ek ciro`, tone: monthlyImpact >= 0 ? 'good' : 'bad' }, { label: '%30 düşük ciro', value: downsideImpact, format: 'money', detail: 'Kötü senaryo aylık etkisi', tone: downsideImpact >= 0 ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [monthlyImpact < 0 ? 'Beklenen ek katkı tam istihdam maliyetinden düşük.' : '', reserveMonths < 3 ? 'Nakit rezervi üç aylık istihdam maliyetini karşılamıyor.' : ''].filter(Boolean),
        [`Aylık en az ${round(breakEvenRevenue)} ₺ ek ciro hedefi tanımlayın.`, reserveMonths < 3 ? 'İşe alımdan önce üç aylık maliyet rezervi oluşturun.' : 'İlk üç ay için kapasite ve gelir göstergeleri koyun.', 'Yasal ve bordro maliyetlerini mali müşavirle doğrulayın.'])
    }
    case 'DC-LOAN-007': {
      const totalDebt = a.monthlyInstallment + a.existingDebtPayments
      const dscr = a.monthlyFreeCash / totalDebt
      const buffer = a.monthlyFreeCash - totalDebt
      const reserveCoverage = a.cashReserve / totalDebt
      const downsideCash = a.monthlyFreeCash * (1 - a.downsideCashDropPercent / 100)
      const downsideDscr = downsideCash / totalDebt
      const loss = dscr < 1 || downsideDscr < 1
      const weak = !loss && (dscr < 1.25 || reserveCoverage < 3)
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Normal veya kötü senaryoda toplam taksitler serbest nakdi aşıyor.' : weak ? 'Taksit karşılanıyor, ancak borç veya rezerv tamponu güvenli seviyenin altında.' : 'Yeni taksit normal ve kötü senaryoda güvenli tamponla karşılanıyor.',
        [moneyMetric('totalDebtService', 'Toplam aylık borç ödemesi', totalDebt), numberMetric('dscr', 'Borç karşılama oranı', dscr), moneyMetric('monthlyBuffer', 'Aylık nakit tamponu', buffer), numberMetric('reserveCoverage', 'Rezerv taksit karşılığı', reserveCoverage, 'months'), numberMetric('downsideDscr', 'Kötü senaryo oranı', downsideDscr)],
        [{ label: 'Normal ay', value: dscr, format: 'number', detail: `${round(buffer)} ₺ tampon`, tone: dscr >= 1.25 ? 'good' : 'warning' }, { label: 'Kötü ay', value: downsideDscr, format: 'number', detail: `${round(downsideCash - totalDebt)} ₺ tampon`, tone: downsideDscr >= 1 ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [dscr < 1.25 ? 'Borç karşılama oranı 1,25 güvenlik eşiğinin altında.' : '', downsideDscr < 1 ? 'Kötü senaryoda taksit açığı oluşuyor.' : '', reserveCoverage < 3 ? 'Rezerv üç aylık toplam taksitten düşük.' : ''].filter(Boolean),
        [loss ? 'Taksiti düşürmek için tutar veya vadeyi yeniden görüşün.' : 'Otomatik ödeme öncesi ayrı borç tamponu tutun.', `En az ${round(totalDebt * 3)} ₺ borç rezervi hedefleyin.`, 'Faiz ve toplam geri ödeme maliyetini ayrıca karşılaştırın.'])
    }
    case 'DC-CASHFLOW-008': {
      const netFlow = a.monthlyCashInflow - a.monthlyCashOutflow
      const timingGapDays = Math.max(0, a.receivableDays - a.payableDays)
      const timingGap = a.monthlyCashInflow * timingGapDays / 30
      const adjustedCash = a.openingCash + netFlow - timingGap
      const runway = netFlow < 0 ? a.openingCash / Math.abs(netFlow) : 0
      const bufferGap = adjustedCash - a.minimumCashBuffer
      const loss = adjustedCash < 0 || (netFlow < 0 && runway < 3)
      const weak = !loss && bufferGap < 0
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Vade etkisi ve aylık akış birlikte nakit açığı oluşturuyor.' : weak ? 'Nakit pozitif kalıyor, ancak hedef minimum tamponun altına düşüyor.' : 'Aylık akış ve vade etkisi sonrasında nakit tamponu korunuyor.',
        [moneyMetric('netMonthlyFlow', 'Aylık net nakit akışı', netFlow), moneyMetric('timingGap', 'Vade kaynaklı finansman ihtiyacı', timingGap), moneyMetric('adjustedCash', 'Düzeltilmiş dönem sonu nakit', adjustedCash), numberMetric('runway', 'Nakit runway', runway, 'months'), moneyMetric('bufferGap', 'Minimum tampona göre fark', bufferGap)],
        [{ label: 'Muhasebe akışı', value: a.openingCash + netFlow, format: 'money', detail: 'Vade etkisi hariç', tone: 'neutral' }, { label: 'Tahsilat vadesi sonrası', value: adjustedCash, format: 'money', detail: `${timingGapDays} gün açık`, tone: adjustedCash >= a.minimumCashBuffer ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [netFlow < 0 ? 'Aylık nakit çıkışı girişten yüksek.' : '', timingGapDays > 30 ? 'Tahsilat ve ödeme vadesi arasında bir aydan uzun açık var.' : '', bufferGap < 0 ? 'Düzeltilmiş nakit hedef tamponun altında.' : ''].filter(Boolean),
        [timingGapDays > 0 ? 'Tahsilat vadesini kısaltın veya tedarikçi vadesini yeniden görüşün.' : 'Vade dengesini haftalık izleyin.', bufferGap < 0 ? `En az ${round(Math.abs(bufferGap))} ₺ ek tampon oluşturun.` : 'Minimum tamponu ayrı hesapta koruyun.', 'Önümüzdeki 13 hafta için haftalık nakit planı hazırlayın.'])
    }
    case 'DC-BRANCH-009': {
      const margin = a.contributionMarginRate / 100
      const operatingProfit = a.expectedMonthlyRevenue * margin - a.monthlyFixedCost
      const breakEvenRevenue = a.monthlyFixedCost / margin
      const paybackMonths = operatingProfit > 0 ? a.initialInvestment / operatingProfit : 0
      const downsideRevenue = a.expectedMonthlyRevenue * (1 - a.downsideRevenuePercent / 100)
      const downsideProfit = downsideRevenue * margin - a.monthlyFixedCost
      const rampReserveNeed = a.monthlyFixedCost * a.rampUpMonths + a.initialInvestment
      const reserveGap = a.cashReserve - rampReserveNeed
      const loss = operatingProfit <= 0 || reserveGap < 0
      const weak = !loss && (downsideProfit < 0 || paybackMonths > 36)
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Beklenen faaliyet sonucu veya ayrılan rezerv şube yatırımını taşımıyor.' : weak ? 'Şube normal senaryoda çalışıyor; kötü ciro ya da geri ödeme süresi sınırda.' : 'Şube normal ve kötü senaryoda yeterli rezervle sürdürülebilir görünüyor.',
        [moneyMetric('operatingProfit', 'Aylık faaliyet sonucu', operatingProfit), moneyMetric('breakEvenRevenue', 'Aylık başabaş ciro', breakEvenRevenue), numberMetric('paybackMonths', 'Yatırım geri ödeme süresi', paybackMonths, 'months'), moneyMetric('rampReserveNeed', 'Ramp-up rezerv ihtiyacı', rampReserveNeed), moneyMetric('reserveGap', 'Rezerv farkı', reserveGap)],
        [{ label: 'Beklenen ciro', value: operatingProfit, format: 'money', detail: 'Aylık faaliyet sonucu', tone: operatingProfit > 0 ? 'good' : 'bad' }, { label: 'Kötü ciro', value: downsideProfit, format: 'money', detail: `%${a.downsideRevenuePercent} düşük ciro`, tone: downsideProfit > 0 ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [operatingProfit <= 0 ? 'Beklenen ciro aylık sabit gideri karşılamıyor.' : '', reserveGap < 0 ? 'Açılış ve ramp-up rezervi yetersiz.' : '', downsideProfit < 0 ? 'Kötü ciro senaryosunda şube aylık zarar ediyor.' : ''].filter(Boolean),
        [`Aylık en az ${round(breakEvenRevenue)} ₺ ciro için doğrulanabilir talep kanıtı toplayın.`, reserveGap < 0 ? `Rezervi ${round(Math.abs(reserveGap))} ₺ artırın veya yatırımı küçültün.` : 'Ramp-up rezervini işletmenin günlük nakdinden ayırın.', 'Uzun kontrat öncesi daha küçük pilot lokasyon deneyin.'])
    }
    case 'DC-CAMPAIGN-010': {
      const discountedPrice = a.currentUnitPrice * (1 - a.discountRate / 100)
      const baseUnitContribution = a.currentUnitPrice - a.unitVariableCost
      const campaignUnitContribution = discountedPrice - a.unitVariableCost
      const baseTotal = baseUnitContribution * a.baselineUnits
      const scenario = (lift: number) => campaignUnitContribution * a.baselineUnits * (1 + lift / 100) - a.campaignFixedCost
      const low = scenario(a.expectedLiftLow), medium = scenario(a.expectedLiftMedium), high = scenario(a.expectedLiftHigh)
      const breakEvenUnits = campaignUnitContribution > 0 ? (baseTotal + a.campaignFixedCost) / campaignUnitContribution : 0
      const loss = campaignUnitContribution <= 0 || medium < baseTotal
      const weak = !loss && low < baseTotal
      return result(campaignUnitContribution <= 0 ? 'ZARAR' : loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', campaignUnitContribution <= 0 || loss ? 'bad' : weak ? 'warning' : 'good',
        campaignUnitContribution <= 0 ? 'Kampanya fiyatı ürün başına zarar oluşturuyor.' : loss ? 'Orta satış senaryosu kampanya öncesi toplam katkıyı karşılamıyor.' : weak ? 'Orta senaryo kazançlı, ancak düşük senaryoda katkı kaybı var.' : 'Düşük, orta ve yüksek senaryolar normal dönem katkısını karşılıyor.',
        [moneyMetric('discountedPrice', 'Kampanya fiyatı', discountedPrice), moneyMetric('campaignUnitContribution', 'Kampanya ürün katkısı', campaignUnitContribution), numberMetric('breakEvenUnits', 'Kampanya başabaş adedi', Math.ceil(breakEvenUnits)), moneyMetric('baselineContribution', 'Normal dönem katkısı', baseTotal), moneyMetric('mediumScenarioContribution', 'Orta senaryo katkısı', medium)],
        [{ label: 'Düşük senaryo', value: low, format: 'money', detail: `%${a.expectedLiftLow} adet artışı`, tone: low >= baseTotal ? 'good' : 'bad' }, { label: 'Orta senaryo', value: medium, format: 'money', detail: `%${a.expectedLiftMedium} adet artışı`, tone: medium >= baseTotal ? 'good' : 'warning' }, { label: 'Yüksek senaryo', value: high, format: 'money', detail: `%${a.expectedLiftHigh} adet artışı`, tone: high >= baseTotal ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [campaignUnitContribution <= 0 ? 'İndirimli fiyat değişken maliyetin altında.' : '', medium < baseTotal ? 'Orta satış artışı marj ve sabit gider kaybını karşılamıyor.' : '', low < baseTotal ? 'Düşük senaryoda normal döneme göre katkı kaybı oluşuyor.' : ''].filter(Boolean),
        [`Kampanya için en az ${Math.ceil(breakEvenUnits)} adet hedef ve durdurma kuralı koyun.`, loss ? 'İndirimi azaltın veya sabit kampanya maliyetini düşürün.' : 'Kampanya katkısını normal dönemle günlük karşılaştırın.', 'Stok ve operasyon kapasitesini yüksek senaryoya göre kontrol edin.'])
    }
    case 'DC-STOCK-011': {
      const daysCover = a.currentStock / a.averageDailySales
      const reorderPoint = a.averageDailySales * a.leadTimeDays * (1 + a.demandVariabilityPercent / 100)
      const safetyStock = a.averageDailySales * a.leadTimeDays * a.demandVariabilityPercent / 100
      const recommendedOrder = Math.max(0, reorderPoint + safetyStock - a.currentStock)
      const projectedStock = a.currentStock + a.plannedOrderQuantity
      const projectedDays = projectedStock / a.averageDailySales
      const monthlyHoldingCost = projectedStock * a.unitHoldingCostMonthly
      const stockoutGap = a.currentStock - reorderPoint
      const loss = a.currentStock < a.averageDailySales * a.leadTimeDays
      const weak = !loss && (a.currentStock < reorderPoint || a.plannedOrderQuantity > recommendedOrder * 2 + a.averageDailySales * 7)
      return result(loss ? 'RİSKLİ' : weak ? 'SINIRDA' : 'UYGUN', loss ? 'bad' : weak ? 'warning' : 'good',
        loss ? 'Mevcut stok normal talepte bile tedarik süresini karşılamıyor.' : weak ? 'Stok seviyesi veya planlanan sipariş güvenli aralığın dışında.' : 'Mevcut stok ve planlanan sipariş tedarik riskini dengeliyor.',
        [numberMetric('daysCover', 'Mevcut stok gün sayısı', daysCover, 'days'), numberMetric('reorderPoint', 'Yeniden sipariş noktası', Math.ceil(reorderPoint)), numberMetric('recommendedOrder', 'Önerilen yeni sipariş', Math.ceil(recommendedOrder)), moneyMetric('monthlyHoldingCost', 'Tahmini aylık elde tutma', monthlyHoldingCost), numberMetric('projectedDays', 'Sipariş sonrası stok günü', projectedDays, 'days')],
        [{ label: 'Sipariş verilmezse', value: stockoutGap, format: 'number', detail: 'Güvenli eşiğe göre adet farkı', tone: stockoutGap >= 0 ? 'good' : 'bad' }, { label: 'Planlanan siparişle', value: projectedDays, format: 'days', detail: `${round(projectedStock)} toplam adet`, tone: projectedDays >= a.leadTimeDays ? 'good' : 'bad' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [loss ? 'Stok tedarik gelmeden tükenebilir.' : '', a.currentStock < reorderPoint ? 'Talep oynaklığı için güvenlik stoğu yetersiz.' : '', a.plannedOrderQuantity > recommendedOrder * 2 + a.averageDailySales * 7 ? 'Planlanan sipariş belirgin fazla stok riski taşıyor.' : ''].filter(Boolean),
        [`Sipariş hedefini yaklaşık ${Math.ceil(recommendedOrder)} adet olarak gözden geçirin.`, 'Satış hızını en az haftalık güncelleyerek yeniden sipariş noktasını yenileyin.', `Sipariş sonrası aylık ${round(monthlyHoldingCost)} ₺ elde tutma maliyetini bütçeye alın.`])
    }
    case 'DC-CONTINUE-012': {
      const adjustedUnitContribution = a.salePrice - a.unitVariableCost - a.returnRate / 100 * a.returnLossPerUnit
      const grossMonthlyContribution = adjustedUnitContribution * a.monthlyUnits
      const netMonthlyContribution = grossMonthlyContribution - a.monthlyHoldingCost
      const opportunityDifference = netMonthlyContribution - a.alternativeMonthlyContribution
      const returnCost = a.monthlyUnits * a.returnRate / 100 * a.returnLossPerUnit
      const leave = adjustedUnitContribution <= 0 || netMonthlyContribution <= 0
      const review = !leave && (opportunityDifference < 0 || a.returnRate >= 20)
      return result(leave ? 'BIRAK' : review ? 'GÖZDEN GEÇİR' : 'DEVAM', leave ? 'bad' : review ? 'warning' : 'good',
        leave ? 'Ürün iade ve stok maliyetleri sonrasında aylık katkı üretmiyor.' : review ? 'Ürün pozitif katkıda, ancak alternatif ürün veya iade yükü daha iyi bir seçenek olabileceğini gösteriyor.' : 'Ürün, iade ve stok maliyetleri sonrasında alternatif fırsattan daha yüksek katkı üretiyor.',
        [moneyMetric('adjustedUnitContribution', 'Düzeltilmiş ürün katkısı', adjustedUnitContribution), moneyMetric('monthlyContribution', 'Net aylık katkı', netMonthlyContribution), moneyMetric('monthlyReturnCost', 'Aylık iade kaybı', returnCost), moneyMetric('opportunityDifference', 'Alternatife göre katkı farkı', opportunityDifference), percentMetric('returnRate', 'İade oranı', a.returnRate)],
        [{ label: 'Mevcut ürüne devam', value: netMonthlyContribution, format: 'money', detail: `${a.monthlyUnits} aylık adet`, tone: netMonthlyContribution > 0 ? 'good' : 'bad' }, { label: 'Alternatif ürüne geçiş', value: a.alternativeMonthlyContribution, format: 'money', detail: 'Tahmini aylık fırsat', tone: a.alternativeMonthlyContribution > netMonthlyContribution ? 'good' : 'neutral' }],
        STRUCTURED_TOOL_BY_CODE.get(code)!.formulas,
        [adjustedUnitContribution <= 0 ? 'İade etkisi sonrası ürün başı katkı negatif.' : '', opportunityDifference < 0 ? 'Alternatif ürün daha yüksek aylık katkı sunuyor.' : '', a.returnRate >= 20 ? 'İade oranı ürün katkısını kırılgan hale getiriyor.' : ''].filter(Boolean),
        [leave ? 'Yeni stok alımını durdurun ve mevcut stoğu zarar büyütmeden planlayın.' : review ? 'Ürünü sınırlı dönem izleyip alternatifle kontrollü test yapın.' : 'Fiyat ve iade oranını aylık izleyerek devam edin.', a.returnRate >= 20 ? 'İade nedenlerini ürün ve müşteri segmenti bazında inceleyin.' : 'Stok maliyetini satış hızına göre güncelleyin.', 'Vergi ve genel gider etkisini nihai portföy kararında ayrıca değerlendirin.'])
    }
    default:
      throw new Error(`Unsupported structured decision tool: ${code}`)
  }
}

export function decisionResultFromCalculation(calculation: DecisionToolCalculation) {
  const riskLevel = calculation.decisionTone === 'bad' ? 'high' : calculation.decisionTone === 'warning' ? 'medium' : 'low'
  const status = calculation.decisionTone === 'bad' ? 'high_risk' : calculation.decisionTone === 'warning' ? 'caution' : 'generally_suitable'
  return {
    status,
    riskLevel,
    findings: calculation.riskWarnings.map((message, index) => ({
      code: `structured_warning_${index + 1}`,
      severity: riskLevel,
      message,
      isBlocking: calculation.decisionTone === 'bad',
      priority: 100 - index
    })),
    missingInformation: [] as string[],
    criticalIssues: calculation.decisionTone === 'bad' ? ['unsafe_decision_scenario'] : [] as string[],
    recommendedActions: calculation.safeNextSteps
  }
}
