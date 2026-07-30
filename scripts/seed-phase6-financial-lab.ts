import { PrismaClient } from '@prisma/client'
import { FINANCIAL_MODEL_REGISTRY } from '../src/services/financial-models/registry.js'
import { ensureFinancialModelCatalog } from '../src/services/financial-models/catalog.js'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const now = new Date()
const reviewDue = new Date(now.getTime() + 180 * 86_400_000)

type CourseSpec = {
  title: string
  category: string
  level: string
  modelCodes: string[]
  company: string
  problem: string
  decision: string
  dataset: Record<string, number | string | number[]>
  koTitles: [string, string, string]
  lenses: [string, string, string]
  formulas: [string, string, string]
  mistakes: [string, string, string]
  visual: string
  assessment: string
  sourceKeys: string[]
}

const sources = {
  kap: { title: 'KAP — Finansal Tablolar', url: 'https://www.kap.org.tr/tr/FinansalTablolar', authorityLevel: 'high' },
  cfaWc: { title: 'CFA Institute — Working Capital and Liquidity', url: 'https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management', authorityLevel: 'high' },
  cfaCap: { title: 'CFA Institute — Cost of Capital', url: 'https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital', authorityLevel: 'high' },
  damodaranCf: { title: 'NYU Stern, Aswath Damodaran — Corporate Finance', url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm', authorityLevel: 'high' },
  damodaranVal: { title: 'NYU Stern, Aswath Damodaran — Valuation', url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valuation.html', authorityLevel: 'high' },
  spl: { title: 'SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları', url: 'https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf', authorityLevel: 'high' },
} as const

const specs: CourseSpec[] = [
  {
    title: 'Üç Finansal Tabloyu Birlikte Okumak', category: 'Finansal Analiz', level: 'beginner',
    modelCodes: ['CURRENT_RATIO', 'PROFIT_TO_CASH'], company: 'mahalle fırını',
    problem: 'Kâr görünmesine rağmen kasanın her ay zayıflaması', decision: 'Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?',
    dataset: { gelir: 980000, netKar: 92000, faaliyetNakitAkisi: 18000, varlik: 1450000, borc: 870000 },
    koTitles: ['Bilanço Fotoğraf Değil Bağlantılar Haritasıdır', 'Kâr ile Nakit Neden Ayrışır?', 'Üç Tablo Mutabakatı ile Kırmızı Bayraklar'],
    lenses: ['varlık-kaynak dengesi', 'tahakkuk ve nakit hareketi', 'dönemler arası mutabakat'],
    formulas: ['Varlıklar = Yükümlülükler + Özkaynak', 'Nakit dönüşüm oranı = Faaliyet nakit akışı / Net kâr', 'Dönem sonu nakit = Dönem başı nakit + Net nakit değişimi'],
    mistakes: ['tek dönemi bağlamsız okumak', 'kârı kasadaki para sanmak', 'dipnot ve sınıflama değişimini atlamak'],
    visual: 'üç tablolu bağlantı akış şeması', assessment: 'mutabakat avı', sourceKeys: ['kap', 'cfaWc'],
  },
  {
    title: 'Finansal Veri Kalitesi ve Model Girdileri', category: 'Veri Okuryazarlığı', level: 'beginner',
    modelCodes: ['CURRENT_RATIO'], company: 'iki şubeli güzellik salonu',
    problem: 'POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi', decision: 'Hangi veri setiyle aylık yönetim raporu hazırlanmalı?',
    dataset: { posSatis: 428000, bankaTahsilat: 401500, muhasebeGelir: 433200, iptal: 8700, gecikmeliTahsilat: 23000 },
    koTitles: ['Kaynak–Dönem–Birim Üçlüsü', 'Eksik, Mükerrer ve Bayat Veri Testleri', 'Varsayım Sicili ve Kullanıcı Doğrulaması'],
    lenses: ['veri soyu ve kapsam', 'kalite kontrol kapıları', 'varsayım yönetişimi'],
    formulas: ['Mutabakat farkı = Kaynak A − Kaynak B', 'Tamlık = Dolu zorunlu alan / Tüm zorunlu alan', 'Varsayım etkisi = Senaryo çıktısı − Baz çıktı'],
    mistakes: ['brüt ve net tutarı karıştırmak', 'mükerrer satırı satış saymak', 'OCR sonucunu onaysız gerçek kabul etmek'],
    visual: 'veri soyu ve kontrol kapıları şeması', assessment: 'hatalı veri paketi temizleme', sourceKeys: ['kap', 'spl'],
  },
  {
    title: 'Mali Oranlarla İşletme Sağlığı', category: 'Finansal Analiz', level: 'beginner',
    modelCodes: ['CURRENT_RATIO', 'QUICK_RATIO'], company: 'yedek parça toptancısı',
    problem: 'Yüksek stok nedeniyle cari oranın güvenli görünmesi', decision: 'Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?',
    dataset: { donenVarlik: 1650000, stok: 940000, kvBorc: 980000, nakit: 170000, alacak: 410000 },
    koTitles: ['Cari Oranın Söylediği ve Sakladığı', 'Asit-Test ile Stok Bağımlılığı', 'Oran Panosunda Eşik Yerine Eğilim'],
    lenses: ['kısa vadeli ödeme tamponu', 'hızlı likit varlıklar', 'trend ve emsal bağlamı'],
    formulas: ['Cari oran = Dönen varlık / Kısa vadeli borç', 'Asit-test = (Dönen varlık − Stok) / Kısa vadeli borç', 'Değişim = Cari dönem oranı − Önceki dönem oranı'],
    mistakes: ['tek oranla kredi kararı vermek', 'satılamayan stoku likit saymak', 'sektör ve mevsimselliği yok saymak'],
    visual: 'likidite katmanları gösterge paneli', assessment: 'oranlarla yanlış teşhisi düzeltme', sourceKeys: ['kap', 'cfaWc'],
  },
  {
    title: 'DuPont ile Karlılığın Kaynağı', category: 'Finansal Analiz', level: 'intermediate',
    modelCodes: ['DUPONT_3_STEP'], company: 'mobilya üreticisi',
    problem: 'ROE yükselirken borçluluğun da hızla artması', decision: 'Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?',
    dataset: { netKar: 640000, satis: 8400000, varlik: 6200000, ozkaynak: 2100000 },
    koTitles: ['ROE’yi Üç Motora Ayırmak', 'Marj mı Devir Hızı mı?', 'Kaldıraçla Gelen Sahte Rahatlık'],
    lenses: ['DuPont ayrıştırması', 'operasyonel verim köprüsü', 'borç kaynaklı büyütme etkisi'],
    formulas: ['ROE = Net marj × Varlık devir hızı × Özkaynak çarpanı', 'Varlık devir hızı = Satış / Ortalama varlık', 'Özkaynak çarpanı = Ortalama varlık / Ortalama özkaynak'],
    mistakes: ['dönem sonu bakiyeleri ortalama yerine kullanmak', 'marj artışını hacim artışı sanmak', 'yüksek ROE’yi risksiz başarı saymak'],
    visual: 'DuPont sürücü ağacı', assessment: 'ROE kök neden ayrıştırması', sourceKeys: ['kap', 'damodaranCf'],
  },
  {
    title: 'İşletme Sermayesi Yönetimi', category: 'Nakit Yönetimi', level: 'intermediate',
    modelCodes: ['NET_WORKING_CAPITAL'], company: 'ambalaj üreticisi',
    problem: 'Büyüyen siparişlerle birlikte nakit açığının artması', decision: 'Büyüme için ne kadar ek işletme sermayesi gerekir?',
    dataset: { donenVarlik: 3900000, kvYukumluluk: 2700000, aylikBuyume: 0.12, stokArtisi: 360000, alacakArtisi: 510000 },
    koTitles: ['Net İşletme Sermayesi Tamponu', 'Büyümenin Nakit Bedeli', 'İşletme Sermayesi Aksiyon Haritası'],
    lenses: ['likidite tamponu', 'büyüme finansmanı', 'alacak-stok-borç müdahaleleri'],
    formulas: ['NİS = Dönen varlıklar − Kısa vadeli yükümlülükler', 'Ek ihtiyaç = Alacak artışı + Stok artışı − Ticari borç artışı', 'NİS / Satış = Net işletme sermayesi / Yıllık satış'],
    mistakes: ['pozitif NİS’i otomatik yeterli saymak', 'büyüme tahmininde tahsilat gecikmesini atlamak', 'tedarikçiyi tek finansman kaynağı görmek'],
    visual: 'işletme sermayesi su deposu metaforu', assessment: 'büyüme finansmanı planı', sourceKeys: ['cfaWc', 'kap'],
  },
  {
    title: 'Nakit Dönüşüm Döngüsü', category: 'Nakit Yönetimi', level: 'intermediate',
    modelCodes: ['CASH_CONVERSION_CYCLE'], company: 'organik gıda dağıtıcısı',
    problem: 'Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi', decision: 'Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?',
    dataset: { dio: 46, dso: 39, dpo: 11, gunlukMaliyet: 82000 },
    koTitles: ['Bir Liranın Operasyondaki Yolculuğu', 'CCC Sürücü Köprüsü', 'Döngüyü Kısaltan Kontrollü Deneyler'],
    lenses: ['nakdin zaman çizgisi', 'gün bazlı sürücü ayrıştırması', 'operasyon deneyi tasarımı'],
    formulas: ['CCC = DIO + DSO − DPO', 'Bağlı nakit ≈ CCC × Günlük maliyet', 'Serbestleşen nakit ≈ Gün azalması × Günlük maliyet'],
    mistakes: ['negatif CCC’yi her işte hedeflemek', 'gün hesaplarında dönem uyumsuzluğu', 'vade uzatırken tedarik riskini yok saymak'],
    visual: 'siparişten tahsilata zaman çizgisi', assessment: '10 günlük nakit serbestleştirme planı', sourceKeys: ['cfaWc', 'kap'],
  },
  {
    title: 'Stok ve Alacak Verimliliği', category: 'Operasyonel Finans', level: 'intermediate',
    modelCodes: ['DIO', 'DSO', 'DPO'], company: 'medikal sarf malzemesi satıcısı',
    problem: 'Bazı stokların eskimesi ve hastane alacaklarının uzaması', decision: 'Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?',
    dataset: { ortStok: 2200000, satilanMalMaliyeti: 7300000, ortAlacak: 1850000, krediliSatis: 9100000, ortBorc: 970000 },
    koTitles: ['DIO ile Stok Yaşını Okumak', 'DSO ile Tahsilat Disiplini', 'DPO ve Tedarikçi Güven Dengesi'],
    lenses: ['stok yaşlandırma', 'müşteri vade davranışı', 'tedarikçi ödeme ritmi'],
    formulas: ['DIO = Ortalama stok / Satılan mal maliyeti × Gün', 'DSO = Ortalama alacak / Kredili satış × Gün', 'DPO = Ortalama ticari borç / Kredili alış × Gün'],
    mistakes: ['ortalama yerine tek gün bakiyesi kullanmak', 'peşin satışları kredili paydaya katmak', 'gecikmeyi pazarlık edilmiş vade sanmak'],
    visual: 'üçlü yaşlandırma ısı haritası', assessment: 'SKU ve müşteri segmentasyonu', sourceKeys: ['cfaWc', 'kap'],
  },
  {
    title: 'Nakit Krizi Erken Uyarıları', category: 'Risk Yönetimi', level: 'intermediate',
    modelCodes: ['PROFIT_TO_CASH', 'NET_BURN', 'RUNWAY'], company: 'özel eğitim merkezi',
    problem: 'Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı', decision: 'Kriz oluşmadan hangi eşikler alarm üretmeli?',
    dataset: { nakit: 980000, aylikGiris: 420000, aylikCikis: 610000, vadesiGecmisAlacak: 370000, gelecek30GunOdeme: 540000 },
    koTitles: ['13 Haftalık Nakit Görünürlüğü', 'Erken Uyarı Sinyal Seti', 'Kriz Tetikleyici Eylem Kartları'],
    lenses: ['haftalık nakit ufku', 'öncü ve gecikmeli sinyaller', 'eşik bazlı müdahale'],
    formulas: ['Hafta sonu nakit = Açılış + Giriş − Çıkış', 'Net burn = Aylık çıkış − Aylık giriş', 'Runway = Kullanılabilir nakit / Net burn'],
    mistakes: ['aylık toplamın hafta içi açığı gizlemesi', 'sadece banka bakiyesine bakmak', 'alarm sonrası sorumluyu belirsiz bırakmak'],
    visual: '13 haftalık nakit uçurum grafiği', assessment: 'erken uyarı kontrol paneli', sourceKeys: ['cfaWc', 'damodaranCf'],
  },
  {
    title: 'Sabit ve Değişken Maliyet', category: 'Maliyet Yönetimi', level: 'beginner',
    modelCodes: ['CONTRIBUTION_MARGIN'], company: 'bulut mutfak',
    problem: 'Kira, personel ve platform komisyonlarının yanlış sınıflanması', decision: 'İkinci marka açıldığında hangi giderler gerçekten değişir?',
    dataset: { fiyat: 310, malzeme: 102, ambalaj: 18, komisyonOrani: 0.21, aylikSabit: 285000 },
    koTitles: ['Karara Göre Maliyet Davranışı', 'Karma Maliyetleri Ayırmak', 'Birim Katkı ile Kapasite Kararı'],
    lenses: ['ilgili maliyet sınıflaması', 'sabit-değişken bileşen ayrımı', 'kapasite ve katkı'],
    formulas: ['Birim katkı = Fiyat − Birim değişken maliyet', 'Toplam maliyet = Sabit + Birim değişken × Hacim', 'Katkı oranı = Birim katkı / Fiyat'],
    mistakes: ['muhasebe hesabını maliyet davranışı sanmak', 'basamaklı gideri tamamen sabit saymak', 'boş kapasiteyi ücretsiz görmek'],
    visual: 'hacim–maliyet davranış grafiği', assessment: 'gider kartı sınıflandırma', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Başa Baş ve Güvenlik Marjı', category: 'Maliyet Yönetimi', level: 'beginner',
    modelCodes: ['BREAK_EVEN_QUANTITY'], company: 'seramik atölyesi',
    problem: 'Yeni koleksiyonun minimum satış adedinin bilinmemesi', decision: 'Üretim kalıbı yatırımına geçilmeli mi?',
    dataset: { sabitMaliyet: 360000, fiyat: 780, birimDegisken: 420, beklenenAdet: 1250 },
    koTitles: ['Başa Baş Adedi Nereden Gelir?', 'Güvenlik Marjı ile Talep Tamponu', 'Çok Ürünlü Başa Baş Mantığı'],
    lenses: ['sabit gideri karşılama eşiği', 'beklenen satış tamponu', 'satış karması etkisi'],
    formulas: ['Başa baş adet = Sabit maliyet / Birim katkı', 'Güvenlik marjı = Beklenen satış − Başa baş satış', 'Ağırlıklı katkı = Σ(Ürün katkısı × Satış karması)'],
    mistakes: ['katkı yerine ciro kullanmak', 'beklenen satışla kapasiteyi aynı sanmak', 'ürün karmasını sabit varsaymak'],
    visual: 'gelir-maliyet kesişim grafiği', assessment: 'koleksiyon devam/dur kararı', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Ürün Bazlı Karlılık', category: 'Maliyet Yönetimi', level: 'intermediate',
    modelCodes: ['PRODUCT_PROFITABILITY'], company: 'doğal kozmetik üreticisi',
    problem: 'En çok satan ürünün en kârlı ürün olmayabileceği şüphesi', decision: 'Raf ve reklam bütçesi hangi ürünlere ayrılmalı?',
    dataset: { urunler: ['serum', 'sabun', 'krem'], fiyatlar: [690, 160, 420], maliyetler: [238, 62, 171], iadeler: [0.08, 0.02, 0.05] },
    koTitles: ['SKU Katkı Kartı', 'Maliyet Dağıtım Anahtarı Seçimi', 'Kârlılık–Hacim Portföyü'],
    lenses: ['ürün bazında gerçek katkı', 'faaliyet sürücüsüyle gider dağıtımı', 'portföy karar matrisi'],
    formulas: ['Ürün katkısı = Net fiyat − İzlenebilir değişken maliyet', 'Dağıtılan gider = Havuz × Ürün sürücü payı', 'Portföy katkısı = Birim katkı × Satış adedi'],
    mistakes: ['ortak gideri ciroya körlemesine dağıtmak', 'iadeyi ürün bazında izlememek', 'yüksek marjı düşük hacimden bağımsız yorumlamak'],
    visual: 'marj–hacim balon grafiği', assessment: 'üç SKU portföy kararı', sourceKeys: ['kap', 'damodaranCf'],
  },
  {
    title: 'E-Ticarette Gerçek Sipariş Karlılığı', category: 'E-Ticaret Finansı', level: 'intermediate',
    modelCodes: ['ORDER_PROFITABILITY', 'POST_RETURN_MARGIN'], company: 'pazar yerlerinde satış yapan ayakkabı markası',
    problem: 'Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi', decision: 'Hangi kanal–ürün kombinasyonu büyütülmeli?',
    dataset: { sepet: 1850, urunMaliyeti: 670, komisyon: 0.19, kargo: 94, odemeKesintisi: 0.027, kupon: 120, iadeOrani: 0.17, iadeKaybi: 310 },
    koTitles: ['Sipariş Ekonomisi Şelalesi', 'İade Sonrası Beklenen Marj', 'Kanal–Ürün Karar Matrisi'],
    lenses: ['sipariş kesinti şelalesi', 'olasılık ağırlıklı iade kaybı', 'kanal ve SKU karşılaştırması'],
    formulas: ['Sipariş kârı = Net satış − Ürün − Komisyon − Kargo − Ödeme − Kampanya', 'Beklenen iade kaybı = İade oranı × İade başı net kayıp', 'İade sonrası marj = (Sipariş kârı − Beklenen iade kaybı) / Net satış'],
    mistakes: ['KDV dahil ciroyu gelir sanmak', 'ücretsiz kargoyu maliyetsiz sanmak', 'iade oranını tüm ürünlere eşit uygulamak'],
    visual: 'sipariş kârı şelale grafiği', assessment: 'kanal kapat/büyüt vakası', sourceKeys: ['kap', 'damodaranCf'],
  },
  {
    title: 'Fiyatlandırma ve Marj Simülasyonu', category: 'Ticari Kararlar', level: 'intermediate',
    modelCodes: ['CONTRIBUTION_MARGIN', 'ORDER_PROFITABILITY'], company: 'B2B temizlik ürünleri üreticisi',
    problem: 'Hammadde zammını müşteriye yansıtırken hacim kaybı riski', decision: 'Tek fiyat mı, müşteri segmentine göre fiyat mı?',
    dataset: { mevcutFiyat: 1240, birimMaliyet: 760, maliyetZammi: 0.14, hacim: 4200, tahminiEsneklik: -1.3 },
    koTitles: ['Maliyetten Değere Fiyat Koridoru', 'Marj–Hacim Ödünleşimi', 'İskonto Yetki Matrisi'],
    lenses: ['fiyat alt ve üst sınırı', 'talep tepkili katkı simülasyonu', 'kontrollü iskonto yönetişimi'],
    formulas: ['Taban fiyat = İlgili maliyet / (1 − Hedef marj)', 'Toplam katkı = Yeni birim katkı × Yeni hacim', 'İskonto maliyeti = Liste katkısı − İskontolu katkı'],
    mistakes: ['maliyet artışını aynı oranda fiyata eklemek', 'hacmi sabit varsaymak', 'iskontoyu onaysız ve süresiz vermek'],
    visual: 'fiyat–hacim–katkı yüzeyi', assessment: 'üç fiyat senaryosu savunması', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'CAC ve Müşteri Edinme Ekonomisi', category: 'Büyüme Ekonomisi', level: 'intermediate',
    modelCodes: ['CAC', 'CAC_PAYBACK'], company: 'online yabancı dil uygulaması',
    problem: 'Reklam harcaması büyürken ücretli müşteri başına maliyetin artması', decision: 'Hangi kanalın bütçesi artırılmalı?',
    dataset: { kanallar: ['arama', 'influencer', 'ortaklık'], harcama: [420000, 280000, 90000], yeniMusteri: [1400, 520, 610], aylikKatki: [240, 210, 230] },
    koTitles: ['CAC Paydasını Doğru Kurmak', 'Kanal Bazlı Edinme Kohortu', 'Geri Ödeme Süresi ve Büyüme Freni'],
    lenses: ['tam yüklü edinme maliyeti', 'kanal-kohort ayrımı', 'nakit geri ödeme ufku'],
    formulas: ['CAC = Edinme gideri / Yeni müşteri', 'Kanal CAC = Kanal gideri / Atfedilen yeni müşteri', 'Geri ödeme ayı = CAC / Aylık müşteri katkısı'],
    mistakes: ['mevcut müşteriye harcamayı CAC’a katmak', 'son tıklamayı tek gerçek saymak', 'brüt gelirle geri ödeme hesaplamak'],
    visual: 'kanal CAC ve geri ödeme karşılaştırması', assessment: 'bütçe yeniden dağıtım kurulu', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'LTV, Churn ve Retention', category: 'Büyüme Ekonomisi', level: 'intermediate',
    modelCodes: ['LTV', 'LTV_CAC'], company: 'abonelikli evcil hayvan bakım kutusu',
    problem: 'İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması', decision: 'Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?',
    dataset: { aylikGelir: 520, brutMarj: 0.42, aylikChurn: 0.085, cac: 610, retention: [1, 0.78, 0.66, 0.58, 0.51, 0.46] },
    koTitles: ['Retention Eğrisini Okumak', 'LTV Varsayım Katmanları', 'LTV/CAC Oranının Sınırları'],
    lenses: ['müşteri yaşam eğrisi', 'marj ve churn tabanlı değer', 'edinme-değer dengesi'],
    formulas: ['Retention(t) = Aktif kohort / Başlangıç kohortu', 'Basit LTV = Aylık gelir × Brüt marj / Aylık churn', 'LTV/CAC = Müşteri yaşam boyu değeri / Edinme maliyeti'],
    mistakes: ['geliri katkı gibi kullanmak', 'erken dönem churn’ü sonsuza taşımak', 'yüksek oranı sınırsız bütçe izni sanmak'],
    visual: 'kohort retention eğrileri', assessment: 'promosyon kohortu teşhisi', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Cohort Analizi', category: 'Büyüme Analitiği', level: 'advanced',
    modelCodes: ['LTV'], company: 'dijital muhasebe SaaS girişimi',
    problem: 'Toplam kullanıcı büyürken yeni kohortların daha hızlı kaybolması', decision: 'Ürün aktivasyonu mu, fiyat mı, destek mi öncelikli?',
    dataset: { kohortlar: ['Ocak', 'Şubat', 'Mart'], ay0: [420, 510, 630], ay1: [330, 372, 422], ay3: [271, 280, 286], ay6: [229, 211, 190] },
    koTitles: ['Kohort Matrisini İnşa Etmek', 'Retention Eğrisinde Kırılma Noktası', 'Kohorttan Ürün Deneyine'],
    lenses: ['aynı başlangıç zamanlı gruplama', 'davranış kırılması', 'nedensel olmayan bulgudan deney tasarımı'],
    formulas: ['Ay n retention = Ay n aktif / Ay 0 aktif', 'Kümülatif değer = Σ Dönem katkısı', 'Deney etkisi = Test retention − Kontrol retention'],
    mistakes: ['takvim büyümesini retention sanmak', 'küçük kohortları aşırı yorumlamak', 'korelasyonu ürün etkisi ilan etmek'],
    visual: 'retention ısı haritası ve eğri ailesi', assessment: 'ürün ekibine deney brifi', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Burn Rate ve Runway', category: 'Girişim Finansı', level: 'beginner',
    modelCodes: ['GROSS_BURN', 'NET_BURN', 'RUNWAY'], company: 'lojistik teknoloji girişimi',
    problem: 'Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi', decision: 'İşe alım planı korunmalı mı, yavaşlatılmalı mı?',
    dataset: { nakit: 7800000, aylikCikis: 1650000, aylikGiris: 720000, yeniIseAlim: 290000 },
    koTitles: ['Gross Burn ve Net Burn Ayrımı', 'Runway Takvimi', 'Burn Multiple ile Harcama Kalitesi'],
    lenses: ['aylık nakit tüketimi', 'nakit bitiş ufku', 'büyüme başına yakılan nakit'],
    formulas: ['Gross burn = Aylık nakit çıkışı', 'Net burn = Çıkış − Giriş', 'Runway = Kullanılabilir nakit / Net burn'],
    mistakes: ['tek ayı normal kabul etmek', 'blokeli nakdi kullanılabilir saymak', 'runway’i sabit sözleşme gibi sunmak'],
    visual: 'aylık nakit pist grafiği', assessment: 'işe alım senaryosu kararı', sourceKeys: ['damodaranCf', 'cfaWc'],
  },
  {
    title: 'Fonlama İhtiyacı ve Seyrelme', category: 'Girişim Finansı', level: 'advanced',
    modelCodes: ['RUNWAY', 'NPV'], company: 'tarım teknolojisi girişimi',
    problem: 'Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı', decision: 'Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?',
    dataset: { mevcutNakit: 4600000, aylikNetBurn: 780000, hedefRunway: 18, preMoney: 64000000, yatirim: 14000000 },
    koTitles: ['Kilometre Taşı Bazlı Fon İhtiyacı', 'Pre-money ve Post-money Seyrelme', 'Fonlama Senaryolarında Kontrol Hakları'],
    lenses: ['nakit açığı ve tampon', 'pay oranı matematiği', 'ekonomik ve yönetsel haklar'],
    formulas: ['Fon ihtiyacı = Hedef dönem çıkışı − Mevcut kaynak', 'Post-money = Pre-money + Yatırım', 'Yatırımcı payı = Yatırım / Post-money'],
    mistakes: ['yalnız ortalama burn kullanmak', 'opsiyon havuzunu yok saymak', 'değerleme dışı sözleşme haklarını önemsiz görmek'],
    visual: 'fonlama–runway–seyrelme senaryo ağacı', assessment: 'yatırım komitesi notu', sourceKeys: ['damodaranCf', 'spl'],
  },
  {
    title: 'Sürücü Tabanlı Finansal Tahmin', category: 'Planlama', level: 'intermediate',
    modelCodes: ['CONTRIBUTION_MARGIN'], company: 'çok şubeli kahve zinciri',
    problem: 'Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması', decision: 'Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?',
    dataset: { sube: 7, gunlukFis: 640, ortSepet: 186, acikGun: 30, yeniSubeRamp: [0.35, 0.55, 0.72, 0.88, 1] },
    koTitles: ['Ciroyu İş Sürücülerine Ayırmak', 'Kapasite ve Ramp-up Eğrisi', 'Tahmin Varsayım Ağacı'],
    lenses: ['adet-fiyat-dönüşüm sürücüleri', 'kapasiteye ulaşma yolu', 'varsayım bağımlılıkları'],
    formulas: ['Ciro = İşlem adedi × Ortalama sepet', 'Kapasite kullanımı = Gerçekleşen işlem / Teorik kapasite', 'Yeni şube ciro = Olgun şube ciro × Ramp-up katsayısı'],
    mistakes: ['tüm büyümeyi tek yüzdeye bağlamak', 'kapasite sınırını aşan tahmin yapmak', 'fiyat ve hacim etkisini ayırmamak'],
    visual: 'sürücü ağacı ve ramp-up eğrisi', assessment: '12 aylık şube tahmini', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Bütçe ve Sapma Analizi', category: 'Planlama', level: 'intermediate',
    modelCodes: ['PROFIT_TO_CASH'], company: 'metal işleme atölyesi',
    problem: 'Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor', decision: 'Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?',
    dataset: { butceMiktar: 12000, gercekMiktar: 13400, butceFiyat: 82, gercekFiyat: 91, standartFire: 0.03, gercekFire: 0.057 },
    koTitles: ['Bütçeyi Kontrol Sistemi Olarak Kurmak', 'Fiyat ve Miktar Sapmasını Ayırmak', 'Sapmadan Sorumlu Aksiyona'],
    lenses: ['sorumluluk merkezli bütçe', 'sapma köprüsü', 'kontrol edilebilirlik'],
    formulas: ['Fiyat sapması = Gerçek miktar × (Gerçek fiyat − Standart fiyat)', 'Miktar sapması = Standart fiyat × (Gerçek miktar − Standart miktar)', 'Toplam sapma = Gerçekleşen − Bütçe'],
    mistakes: ['olumlu sapmayı otomatik başarı saymak', 'hacim etkisini fiyat etkisine yüklemek', 'kontrol dışı kur etkisini personele yazmak'],
    visual: 'bütçeden gerçeğe sapma şelalesi', assessment: 'sapma toplantısı karar tutanağı', sourceKeys: ['damodaranCf', 'kap'],
  },
  {
    title: 'Senaryo, Duyarlılık ve Stres Testi', category: 'Risk Yönetimi', level: 'advanced',
    modelCodes: ['NPV', 'RUNWAY'], company: 'ithal ekipman distribütörü',
    problem: 'Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması', decision: 'Hangi risk için önceden koruma veya tampon gerekir?',
    dataset: { kur: 41.5, hacim: 1800, brutMarj: 0.28, faiz: 0.42, senaryolar: [-0.2, -0.1, 0, 0.1, 0.2] },
    koTitles: ['Senaryo ile Duyarlılık Aynı Şey Değildir', 'Kırılma Noktası Aramak', 'Stres Testinden Acil Eylem Planına'],
    lenses: ['tutarlı gelecek hikâyeleri', 'tek değişken etkisi', 'aşırı fakat olası şok'],
    formulas: ['Duyarlılık = Çıktı değişimi / Girdi değişimi', 'Kırılma noktası: Karar çıktısının eşik olduğu girdi', 'Stres açığı = Gerekli tampon − Mevcut tampon'],
    mistakes: ['birbiriyle çelişen varsayımları aynı senaryoya koymak', 'yalnız iyimser ve baz senaryo kullanmak', 'stres sonucunu aksiyonsuz bırakmak'],
    visual: 'iki değişkenli duyarlılık matrisi', assessment: 'kur şoku savaş oyunu', sourceKeys: ['damodaranCf', 'cfaCap'],
  },
  {
    title: 'NPV ve IRR ile Yatırım Kararı', category: 'Yatırım Analizi', level: 'intermediate',
    modelCodes: ['NPV', 'IRR'], company: 'soğuk hava deposu işletmesi',
    problem: 'Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması', decision: 'Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?',
    dataset: { ilkYatirim: -6800000, nakitAkislari: [-6800000, 1750000, 1960000, 2110000, 2260000, 2380000], iskonto: 0.31 },
    koTitles: ['Paranın Zaman Değeri', 'NPV ile Değer Yaratım Eşiği', 'IRR’nin Çoklu Kök ve Ölçek Tuzakları'],
    lenses: ['bugünkü değer', 'sermaye maliyeti üstü değer', 'getiri oranı sınırlamaları'],
    formulas: ['PV = Nakit akışı / (1 + r)^t', 'NPV = Σ İskontolu nakit akışı', 'IRR: NPV’yi sıfıra eşitleyen oran'],
    mistakes: ['nominal nakdi reel oranla iskonto etmek', 'batık maliyeti projeye katmak', 'IRR ile farklı ölçekli projeyi tek başına seçmek'],
    visual: 'NPV profili ve iskonto oranı eğrisi', assessment: 'yatırım komitesi önerisi', sourceKeys: ['damodaranCf', 'cfaCap'],
  },
  {
    title: 'CAPM, WACC ve Sermaye Maliyeti', category: 'Kurumsal Finans', level: 'advanced',
    modelCodes: ['WACC_FCFF_DCF'], company: 'halka açık olmayan enerji hizmetleri şirketi',
    problem: 'Yeni proje için iskonto oranının keyfî seçilmesi', decision: 'Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?',
    dataset: { risksiz: 0.32, beta: 0.9, piyasaPrimi: 0.055, borcMaliyeti: 0.39, vergi: 0.25, borcAgirligi: 0.42 },
    koTitles: ['CAPM ile Özsermaye Maliyeti', 'Borç ve Özsermaye Ağırlıkları', 'WACC Kullanım Sınırları'],
    lenses: ['sistematik risk primi', 'piyasa değeri ağırlıkları', 'proje-şirket risk uyumu'],
    formulas: ['Ke = Rf + Beta × Piyasa risk primi', 'Vergi sonrası Kd = Borç maliyeti × (1 − Vergi)', 'WACC = E/V × Ke + D/V × Kd × (1 − T)'],
    mistakes: ['muhasebe değerlerini ağırlık yapmak', 'ülke ve para birimi tutarsızlığı', 'şirket WACC’ını her projeye uygulamak'],
    visual: 'sermaye maliyeti bileşen köprüsü', assessment: 'iskonto oranı savunma dosyası', sourceKeys: ['cfaCap', 'damodaranCf'],
  },
  {
    title: 'DCF ile Şirket ve Proje Değerleme', category: 'Değerleme', level: 'advanced',
    modelCodes: ['WACC_FCFF_DCF'], company: 'endüstriyel yazılım şirketi',
    problem: 'Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması', decision: 'Yatırım görüşmesinde savunulabilir değer aralığı nedir?',
    dataset: { fcff1: 12400000, buyume: 0.18, yil: 5, wacc: 0.34, terminalBuyume: 0.12, netBorc: 18000000 },
    koTitles: ['FCFF Tahminini Operasyonlardan Kurmak', 'Terminal Değerin Ağırlığını Sınamak', 'DCF Değer Aralığı ve Duyarlılık'],
    lenses: ['faaliyet nakit akışı tahmini', 'sürdürülebilir büyüme', 'WACC-büyüme matrisi'],
    formulas: ['FCFF = EBIT(1−T) + Amortisman − Yatırım − NİS artışı', 'Terminal değer = FCFF(n+1) / (WACC − g)', 'Özsermaye değeri = Firma değeri − Net borç'],
    mistakes: ['WACC ≤ terminal büyüme kullanmak', 'terminal değeri kontrol etmemek', 'tek nokta değeri kesin fiyat gibi sunmak'],
    visual: 'DCF değer köprüsü ve duyarlılık ısı haritası', assessment: 'değerleme aralığı savunması', sourceKeys: ['damodaranVal', 'cfaCap'],
  },
]

function slugify(value: string) {
  return value.toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function numberLines(dataset: CourseSpec['dataset']) {
  return Object.entries(dataset).map(([key, value]) => `- **${key}:** ${Array.isArray(value) ? value.join(' · ') : value}`).join('\n')
}

const layouts = [
  ['Karar masası', 'Kavramı yerleştir', 'Veriyi hazırla', 'Hesabı yürüt', 'Sonucu oku', 'Sınır çiz'],
  ['Sahadan sinyal', 'Teşhis merceği', 'Kanıt paketi', 'Adım adım çözüm', 'Karar eşiği', 'Yanılma payı'],
  ['Yönetim sorusu', 'Harita', 'Ölçüm protokolü', 'Uygulama', 'Gösterge paneli', 'Etik fren'],
  ['Vaka açılışı', 'Mekanik', 'Girdi kontrolü', 'Çalışma notu', 'Tartışma', 'Ne zaman kullanma?'],
  ['Operasyon odası', 'Neden-sonuç zinciri', 'Veri sözlüğü', 'Hesap izi', 'Aksiyon kartı', 'Kontrol testi'],
  ['Karar günlüğü', 'İddia', 'Deliller', 'Sayısal deney', 'Karşı görüş', 'Kapanış ölçütü'],
] as const

function koContent(spec: CourseSpec, courseNo: number, koNo: number, modelCode: string) {
  const layout = layouts[(courseNo + koNo) % layouts.length]
  const title = spec.koTitles[koNo]
  const lens = spec.lenses[koNo]
  const formula = spec.formulas[koNo]
  const mistake = spec.mistakes[koNo]
  const model = FINANCIAL_MODEL_REGISTRY.find(item => item.code === modelCode)!
  const exampleOutput = model.outputs.map(output => output.label).join(', ')
  const sourceList = spec.sourceKeys.map((key, index) => `${index + 1}. [${sources[key as keyof typeof sources].title}](${sources[key as keyof typeof sources].url})`).join('\n')
  const headings = [
    `${spec.company}: ${layout[0]}`,
    `${lens} — ${layout[1]}`,
    `${Object.keys(spec.dataset).slice(0, 2).join(' ve ')} — ${layout[2]}`,
    `${formula.split('=')[0].trim()} — ${layout[3]}`,
    `${spec.assessment} — ${layout[4]}`,
    `${mistake} — ${layout[5]}`,
  ]
  const narrativeOpeners = [
    `Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır.`,
    `Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar.`,
    `Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır.`,
    `Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir.`,
    `Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar.`,
    `Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar.`,
  ]
  return `# ${title}

## ${headings[0]}

${narrativeOpeners[(courseNo * 3 + koNo) % narrativeOpeners.length]} ${spec.company} yönetimi şu durumla karşı karşıya: ${spec.problem}. Bu bilgi nesnesinin odağı **${lens}** ve cevaplanacak karar şudur: **${spec.decision}**

## ${headings[1]}

${title}, ${spec.company} verisini tek başına bir oran olarak değil, **${spec.decision}** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. ${formula}. ${lens} sonucu; dönem, para birimi, ${Object.keys(spec.dataset)[0]} kaynağı ve ${spec.company} çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — ${model.name}:** Motor sürümü ${model.engineVersion}, politika sürümü ${model.policyVersion}. Beklenen çıktı alanları: ${exampleOutput}. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ${headings[2]}

Vaka veri paketi:

${numberLines(spec.dataset)}

${spec.assessment} başlamadan önce ${Object.keys(spec.dataset).slice(0, 3).join(', ')} alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ${spec.company} belgesinden OCR ile gelen alan, kullanıcı onayı olmadan ${model.name} modeline girmez.

## ${headings[3]}

1. “${spec.decision}” sorusuyla ilgisiz alanları ayır; ${model.name} girdilerini eşleştir.
2. ${lens} formülünü yaz: **${formula}**.
3. ${spec.company} baz senaryosunu çalıştır; hesap izindeki ara adımı ${Object.keys(spec.dataset)[0]} verisiyle karşılaştır.
4. ${spec.visual} üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. ${spec.assessment} sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## ${headings[4]}

${model.name} sonucu ${spec.company} için basit bir “iyi/kötü” etiketi değildir. ${spec.decision} sorusunda ${lens}, ${spec.visual} üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce ${Object.keys(spec.dataset)[1]} tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ${spec.problem.toLocaleLowerCase('tr-TR')} problemine ilişkin operasyonel açıklama aranır.

## ${headings[5]}

${spec.company} vakasındaki en tehlikeli hata **${mistake}**. ${model.name}; ${Object.keys(spec.dataset)[0]} eksikken, dönemler uyumsuzken veya “${spec.decision}” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. ${lens} çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-${String(courseNo).padStart(2, '0')}
- Model: [${model.name}](/app/finance/models/${model.code})
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: ${spec.assessment}

## Kaynaklar

${sourceList}
`
}

function quizQuestions(spec: CourseSpec) {
  return [
    {
      q: `${spec.company} vakasında ilk yapılması gereken kontrol hangisidir?`,
      options: ['Veri dönemi, kaynak ve kapsamını doğrulamak', 'En yüksek sonucu seçmek', 'Eksik alanı sektör ortalamasıyla gizlice doldurmak', 'Tek oranla nihai karar vermek'],
      answer: 'Veri dönemi, kaynak ve kapsamını doğrulamak',
      explanation: 'Model kalitesi formülden önce girdinin tanımı, dönemi ve kaynağına bağlıdır.',
    },
    {
      q: `${spec.formulas[1]} sonucu beklenmedik çıktığında en öğretici yaklaşım hangisidir?`,
      options: ['Hesap izini ve girdi mutabakatını incelemek', 'Sonucu elle değiştirmek', 'Uyarıları kapatmak', 'Sadece iyimser senaryoyu göstermek'],
      answer: 'Hesap izini ve girdi mutabakatını incelemek',
      explanation: 'Deterministik hesap izi, farkın hangi adım veya girdiden doğduğunu görünür kılar.',
    },
    {
      q: `Bu kurstaki “${spec.decision}” kararı için model çıktısı nasıl kullanılmalıdır?`,
      options: ['Diğer kanıtlar ve sınırlamalarla birlikte karar desteği olarak', 'Kesin yatırım tavsiyesi olarak', 'Muhasebe kaydının yerine', 'Kullanıcı doğrulaması olmadan'],
      answer: 'Diğer kanıtlar ve sınırlamalarla birlikte karar desteği olarak',
      explanation: 'Model sonucu kararı destekler; yöneticinin bağlam, risk ve yetki değerlendirmesinin yerini almaz.',
    },
  ]
}

function videoScript(spec: CourseSpec, courseNo: number) {
  return `00:00–00:35 | Açılış: ${spec.company} yöneticisinin gerçek sorusu ekrana gelir: “${spec.decision}”
00:35–01:25 | ${spec.visual} ile problemin neden–sonuç yapısı kurulur.
01:25–02:25 | Vaka veri setindeki alanlar tek tek kaynak, dönem ve birim etiketleriyle gösterilir.
02:25–03:35 | ${spec.formulas[0]} hesabı Model Laboratuvarında çalıştırılır; ara adımlar hesap izinden okunur.
03:35–04:25 | Baz ve stres senaryosu karşılaştırılır; modelin en hassas girdisi işaretlenir.
04:25–05:05 | “${spec.mistakes[0]}” hatası karşı örnekle gösterilir.
05:05–05:40 | Kullanıcıya ${spec.assessment} görevi verilir ve karar günlüğü kaydıyla kapanır.

Görsel dil: ${spec.visual}; gerçek değerleri temsil eden sade grafikler, dekoratif stok görsel yok.
Ses: Türkçe kadın sesi, sakin ve öğretici, dakikada 125–140 kelime.
Erişilebilirlik: Türkçe altyazı, yüksek kontrast, grafiklerde doğrudan etiket.
Paket kodu: P6-VIDEO-${String(courseNo).padStart(2, '0')}.`
}

function phraseSet(text: string) {
  const tokens = text.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  return new Set(tokens.slice(0, -4).map((_, index) => tokens.slice(index, index + 5).join(' ')))
}

function jaccard(a: string, b: string) {
  const aa = phraseSet(a)
  const bb = phraseSet(b)
  const intersection = [...aa].filter(token => bb.has(token)).length
  const union = new Set([...aa, ...bb]).size
  return union ? intersection / union : 0
}

async function upsertSource(key: keyof typeof sources) {
  const source = sources[key]
  const existing = await prisma.source.findFirst({ where: { url: source.url } })
  if (existing) return prisma.source.update({ where: { id: existing.id }, data: { ...source, lastChecked: now } })
  return prisma.source.create({ data: { ...source, lastChecked: now } })
}

async function main() {
  if (specs.length !== 24) throw new Error(`24 kurs bekleniyordu, ${specs.length} bulundu.`)
  const previews = specs.map((spec, index) => spec.koTitles.map((_, koNo) => koContent(spec, index + 1, koNo, spec.modelCodes[koNo % spec.modelCodes.length])).join('\n'))
  let maxSimilarity = 0
  let maxPair = ''
  for (let i = 0; i < previews.length; i += 1) {
    for (let j = i + 1; j < previews.length; j += 1) {
      const score = jaccard(previews[i], previews[j])
      if (score > maxSimilarity) {
        maxSimilarity = score
        maxPair = `${i + 1}-${j + 1}`
      }
    }
  }
  console.log(`Phase 6 preview: 24 kurs, 72 KO, maksimum beşli-ifade benzerliği %${(maxSimilarity * 100).toFixed(1)} (${maxPair}).`)
  if (maxSimilarity > 0.25) console.warn('UYARI: Kurslar arası benzerlik %25 kalite eşiğini aşıyor.')
  if (!apply) {
    console.log('Veritabanı değiştirilmedi. Uygulamak için --apply kullanın.')
    return
  }

  const author = await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } })
    ?? await prisma.user.findFirst({ orderBy: { id: 'asc' } })
  if (!author) throw new Error('KO sürüm yazarı olarak kullanılabilecek kullanıcı bulunamadı.')
  await ensureFinancialModelCatalog(prisma)
  const category = await prisma.category.upsert({
    where: { name: 'Finansal Karar Laboratuvarı' },
    update: { isActive: true, description: 'Phase 6 uygulamalı finansal model ve vaka içerikleri' },
    create: { name: 'Finansal Karar Laboratuvarı', slug: 'finansal-karar-laboratuvari', description: 'Phase 6 uygulamalı finansal model ve vaka içerikleri' },
  })
  const sourceRows = Object.fromEntries(await Promise.all(
    (Object.keys(sources) as Array<keyof typeof sources>).map(async key => [key, await upsertSource(key)]),
  ))

  for (let courseIndex = 0; courseIndex < specs.length; courseIndex += 1) {
    const spec = specs[courseIndex]
    const courseNo = courseIndex + 1
    const code = `P6-C${String(courseNo).padStart(2, '0')}`
    const slug = `phase-6-${String(courseNo).padStart(2, '0')}-${slugify(spec.title)}`
    const metadata = {
      phase: 6,
      code,
      company: spec.company,
      decision: spec.decision,
      modelLab: { modelCodes: spec.modelCodes, scenarios: ['base', 'optimistic', 'adverse', 'stress'], requireTrace: true },
      outputDashboard: { visual: spec.visual, metrics: spec.formulas, confidenceComponents: true, sourceBadges: true },
      technicalBox: { formulas: spec.formulas, engine: 'deterministic' },
      ethicsBox: { limitations: spec.mistakes, disclaimer: 'Karar desteğidir; yatırım, kredi, vergi veya muhasebe görüşü değildir.' },
      mentorFlow: ['model öner', 'girdiyi doğrula', 'motoru çalıştır', 'hesap izini açıkla', 'senaryoyu karşılaştır', 'kararı kaydet'],
      sourceMap: spec.sourceKeys.map(key => sources[key as keyof typeof sources]),
      videoScenario: `P6-VIDEO-${String(courseNo).padStart(2, '0')}`,
      dataset: spec.dataset,
    }
    const course = await prisma.course.upsert({
      where: { slug },
      update: {
        title: spec.title,
        description: `${spec.company} vakası üzerinden ${spec.problem.toLocaleLowerCase('tr-TR')} problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.`,
        category: spec.category, level: spec.level, estimatedMinutes: 105,
        outcomes: JSON.stringify([spec.decision, spec.lenses[0], spec.assessment]),
        sourceType: 'phase6-financial-lab', sortOrder: 600 + courseNo, metadata: JSON.stringify(metadata), published: true,
      },
      create: {
        title: spec.title, slug,
        description: `${spec.company} vakası üzerinden ${spec.problem.toLocaleLowerCase('tr-TR')} problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.`,
        category: spec.category, level: spec.level, estimatedMinutes: 105,
        outcomes: JSON.stringify([spec.decision, spec.lenses[0], spec.assessment]),
        sourceType: 'phase6-financial-lab', sortOrder: 600 + courseNo, metadata: JSON.stringify(metadata), published: true,
      },
    })

    await prisma.lesson.deleteMany({ where: { courseId: course.id } })
    const koIds: number[] = []
    for (let koIndex = 0; koIndex < 3; koIndex += 1) {
      const koCode = `${code}-KO${koIndex + 1}`
      const modelCode = spec.modelCodes[koIndex % spec.modelCodes.length]
      const content = koContent(spec, courseNo, koIndex, modelCode)
      const ko = await prisma.knowledgeObject.upsert({
        where: { code: koCode },
        update: {
          title: spec.koTitles[koIndex], content, summary: `${spec.lenses[koIndex]} odağında ${spec.company} için uygulamalı karar nesnesi.`,
          problem: spec.problem, quickAnswer: spec.formulas[koIndex],
          learnSteps: JSON.stringify(['veriyi tanımla', 'hesap izini izle', 'senaryoyu karşılaştır', 'kararı kaydet']),
          applySteps: JSON.stringify(['kaynağı doğrula', 'modeli çalıştır', 'uyarıları incele', 'aksiyon sahibi belirle']),
          warning: spec.mistakes[koIndex], task: spec.assessment,
          type: 'applied_financial_model', metadata: JSON.stringify({ phase: 6, courseCode: code, modelCode, caseCode: `P6-CASE-${String(courseNo).padStart(2, '0')}`, archetype: layouts[(courseNo + koIndex) % layouts.length][0] }),
          status: 'published', verificationStatus: 'verified', reviewGate: 'enhanced', isDemo: false, publishedAt: now, reviewDue, categoryId: category.id,
        },
        create: {
          code: koCode, slug: slugify(`${koCode}-${spec.koTitles[koIndex]}`), title: spec.koTitles[koIndex], content,
          summary: `${spec.lenses[koIndex]} odağında ${spec.company} için uygulamalı karar nesnesi.`,
          problem: spec.problem, quickAnswer: spec.formulas[koIndex],
          learnSteps: JSON.stringify(['veriyi tanımla', 'hesap izini izle', 'senaryoyu karşılaştır', 'kararı kaydet']),
          applySteps: JSON.stringify(['kaynağı doğrula', 'modeli çalıştır', 'uyarıları incele', 'aksiyon sahibi belirle']),
          warning: spec.mistakes[koIndex], task: spec.assessment,
          type: 'applied_financial_model', embedding: '', metadata: JSON.stringify({ phase: 6, courseCode: code, modelCode, caseCode: `P6-CASE-${String(courseNo).padStart(2, '0')}`, archetype: layouts[(courseNo + koIndex) % layouts.length][0] }),
          status: 'published', verificationStatus: 'verified', reviewGate: 'enhanced', isDemo: false, publishedAt: now, reviewDue, categoryId: category.id,
        },
      })
      koIds.push(ko.id)
      const lastVersion = await prisma.knowledgeObjectVersion.findFirst({ where: { koId: ko.id }, orderBy: { versionNumber: 'desc' } })
      const phase6Change = 'Phase 6 uygulamalı finans standardı: vaka, model, iz, senaryo, etik ve kaynak haritası.'
      if (!lastVersion || lastVersion.changes !== phase6Change) {
        const version = await prisma.knowledgeObjectVersion.create({
          data: { koId: ko.id, versionNumber: lastVersion ? lastVersion.versionNumber + 1 : 1, changes: phase6Change, createdBy: author.id },
        })
        await prisma.knowledgeObject.update({ where: { id: ko.id }, data: { currentVersionId: version.id } })
      }
      await prisma.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
      await prisma.knowledgeObjectSource.createMany({
        data: spec.sourceKeys.map((key, index) => ({
          koId: ko.id, sourceId: sourceRows[key].id, relation: index === 0 ? 'primary' : 'supporting',
          note: `${spec.title} — ${spec.lenses[koIndex]} için kaynak.`,
        })),
      })
      await prisma.lesson.create({
        data: { courseId: course.id, title: spec.koTitles[koIndex], content, order: koIndex + 1, knowledgeObjectId: ko.id, estimatedMinutes: 25 + koIndex * 5 },
      })
      await prisma.flashcard.deleteMany({ where: { koId: ko.id } })
      await prisma.flashcard.createMany({
        data: [
          { koId: ko.id, order: 1, status: 'published', front: `${spec.koTitles[koIndex]} hangi iş kararını destekler?`, back: `${spec.decision} Karar; ${spec.lenses[koIndex]} kanıtı, kaynak ve dönem bilgisiyle birlikte ele alınır.`, hint: spec.company },
          { koId: ko.id, order: 2, status: 'published', front: `Temel hesap veya mantık nedir?`, back: spec.formulas[koIndex], hint: 'Formülü ezberlemek yerine pay ve paydayı tanımla.' },
          { koId: ko.id, order: 3, status: 'published', front: `Bu analizde en kritik hata nedir?`, back: `${spec.mistakes[koIndex]}. Bu hata sonucu karar için güvenilmez hâle getirebilir.`, hint: 'Sınırlama kartı' },
        ],
      })
      const model = await prisma.financialModel.findUnique({ where: { code: modelCode } })
      if (!model) throw new Error(`Model kataloğunda ${modelCode} yok.`)
      await prisma.financialModelKnowledgeObject.upsert({
        where: { modelId_koId: { modelId: model.id, koId: ko.id } },
        update: {}, create: { modelId: model.id, koId: ko.id },
      })
    }

    await prisma.quiz.deleteMany({ where: { koId: koIds[2] } })
    const quiz = await prisma.quiz.create({ data: { koId: koIds[2], title: `${spec.title} — karar vakası`, passScore: 70, status: 'published' } })
    await prisma.quizQuestion.createMany({
      data: quizQuestions(spec).map((question, index) => ({
        quizId: quiz.id, questionText: question.q, options: JSON.stringify(question.options),
        correctAnswer: question.answer, explanation: question.explanation, order: index + 1,
      })),
    })

    await prisma.taskTemplate.deleteMany({ where: { koId: koIds[1], title: { startsWith: 'P6 ·' } } })
    const task = await prisma.taskTemplate.create({
      data: {
        koId: koIds[1], title: `P6 · ${spec.assessment}`,
        description: `${spec.company} veri setini doğrula, modeli çalıştır, baz ve stres senaryosunu karşılaştır ve “${spec.decision}” sorusuna kanıtlı öneri yaz.`,
        estimatedTime: 35,
        instructions: 'Kaynak/dönem/birim etiketlerini yaz. Hesap izinden iki adımı göster. Bir sınırlama ve bir karşı görüş ekle. Son kararı sorumlu, tarih ve ölçütle kaydet.',
        exampleOutput: `Karar: ${spec.decision} Baz ve stres çıktısı birlikte değerlendirildi; en hassas varsayım doğrulandı; 30 gün sonra sonuç gözden geçirilecek.`,
        checklist: JSON.stringify(['veri kaynağı', 'model çalışması', 'hesap izi', 'senaryo karşılaştırması', 'sınırlama', 'karar kaydı']),
        rubric: '4: kaynaklı, izlenebilir, karşı senaryolu ve ölçütlü karar. 3: küçük bir kanıt eksiği. 2: model var fakat karar bağı zayıf. 1: yalnız formül veya görüş.',
      },
    })

    await prisma.learningVideo.upsert({
      where: { koId: koIds[0] },
      update: {
        title: `${spec.title} — Uygulamalı Vaka`, description: `${spec.company} üzerinden 5–6 dakikalık model uygulaması.`,
        durationTarget: 340, script: videoScript(spec, courseNo), storyboard: spec.visual,
        transcript: videoScript(spec, courseNo), thumbnailSpec: `${spec.visual}; başlık en fazla altı kelime; marka renkleri; insan yüzü zorunlu değil.`,
        voiceGuidance: 'Türkçe kadın sesi; sakin, güven veren, öğretici; 125–140 kelime/dakika.', outputKey: `phase6/P6-VIDEO-${String(courseNo).padStart(2, '0')}.mp4`, status: 'script_ready',
      },
      create: {
        koId: koIds[0], title: `${spec.title} — Uygulamalı Vaka`, description: `${spec.company} üzerinden 5–6 dakikalık model uygulaması.`,
        durationTarget: 340, script: videoScript(spec, courseNo), storyboard: spec.visual,
        transcript: videoScript(spec, courseNo), thumbnailSpec: `${spec.visual}; başlık en fazla altı kelime; marka renkleri; insan yüzü zorunlu değil.`,
        voiceGuidance: 'Türkçe kadın sesi; sakin, güven veren, öğretici; 125–140 kelime/dakika.', outputKey: `phase6/P6-VIDEO-${String(courseNo).padStart(2, '0')}.mp4`, status: 'script_ready',
      },
    })

    const financialCase = await prisma.financialCase.upsert({
      where: { code: `P6-CASE-${String(courseNo).padStart(2, '0')}` },
      update: {
        title: `${spec.company}: ${spec.title}`, courseId: course.id, difficulty: spec.level,
        companyProfile: { type: spec.company, context: spec.problem }, problemStatement: spec.decision,
        dataset: spec.dataset, evidence: { sourceMap: spec.sourceKeys, formulas: spec.formulas, expectedOutput: { visual: spec.visual, assessment: spec.assessment } },
        expectedModels: spec.modelCodes, decisionContext: spec.decision,
        ethicalIssue: `Model sınırı: ${spec.mistakes[2]}. Kullanıcı doğrulaması ve karşı görüş zorunludur.`,
        status: 'published',
      },
      create: {
        code: `P6-CASE-${String(courseNo).padStart(2, '0')}`, title: `${spec.company}: ${spec.title}`,
        course: { connect: { id: course.id } }, difficulty: spec.level, companyProfile: { type: spec.company, context: spec.problem },
        problemStatement: spec.decision, dataset: spec.dataset, evidence: { sourceMap: spec.sourceKeys, formulas: spec.formulas, expectedOutput: { visual: spec.visual, assessment: spec.assessment } },
        expectedModels: spec.modelCodes, decisionContext: spec.decision,
        ethicalIssue: `Model sınırı: ${spec.mistakes[2]}. Kullanıcı doğrulaması ve karşı görüş zorunludur.`,
        status: 'published',
      },
    })

    for (const modelCode of spec.modelCodes) {
      const model = await prisma.financialModel.findUnique({ where: { code: modelCode } })
      if (!model) throw new Error(`Model kataloğunda ${modelCode} yok.`)
      await prisma.financialModelCourse.upsert({
        where: { modelId_courseId: { modelId: model.id, courseId: course.id } },
        update: {}, create: { modelId: model.id, courseId: course.id },
      })
      await prisma.financialCaseModel.upsert({
        where: { caseId_modelId: { caseId: financialCase.id, modelId: model.id } },
        update: {}, create: { caseId: financialCase.id, modelId: model.id },
      })
      await prisma.financialModelTaskTemplate.upsert({
        where: { modelId_taskTemplateId: { modelId: model.id, taskTemplateId: task.id } },
        update: {}, create: { modelId: model.id, taskTemplateId: task.id },
      })
    }
  }

  const result = await Promise.all([
    prisma.course.count({ where: { sourceType: 'phase6-financial-lab', published: true } }),
    prisma.knowledgeObject.count({ where: { code: { startsWith: 'P6-C' }, status: 'published' } }),
    prisma.financialCase.count({ where: { code: { startsWith: 'P6-CASE-' }, status: 'published' } }),
    prisma.learningVideo.count({ where: { outputKey: { startsWith: 'phase6/' } } }),
  ])
  console.log(`Uygulandı: ${result[0]} kurs, ${result[1]} KO, ${result[2]} vaka/veri seti, ${result[3]} video senaryosu.`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
