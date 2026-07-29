import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const now = new Date()
const roleNames = [
  'Temel ve Teşhis',
  'Süreç ve Ölçüm',
  'Senaryo ve Ödünleşim',
  'İşletme Uygulaması',
  'Yönetişim ve Ölçekleme',
]

type SourceRow = {
  source: { title: string; url: string | null; authorityLevel: string }
}

type Lens = {
  definition: string
  decision: string
  metric: string
  formula: string
  evidence: string
  contrast: string
  artifact: string
  caseContext: string
  failure: string
  visual: 'flow' | 'matrix' | 'bridge' | 'timeline' | 'funnel' | 'scorecard'
}

function json(raw: string): Record<string, any> {
  try { return JSON.parse(raw) } catch { return {} }
}

function cleanTitle(title: string) {
  return title
    .replace(/\s*[—–-]\s*(Başlangıç|Orta|İleri|Uygulama|Uzman|Temel|Temel ve Teşhis|Süreç ve Ölçüm|Senaryo ve Ödünleşim|İşletme Uygulaması|Yönetişim ve Ölçekleme)\s*$/i, '')
    .trim()
}

function lensFor(topic: string, category: string): Lens {
  const text = `${topic} ${category}`.toLocaleLowerCase('tr-TR')
  const base: Lens = {
    definition: `${topic}, işletmenin bir sonucu görünür kılmak ve kontrollü bir karar vermek için kullandığı yönetim konusudur.`,
    decision: `${topic} için hangi müdahalenin, hangi kanıt ve sınırla uygulanacağını seçmek`,
    metric: `${topic} hedef gerçekleşme oranı`,
    formula: 'Gerçekleşme oranı = gerçekleşen sonuç / hedef sonuç × 100',
    evidence: 'tarih damgalı işlem kaydı, sorumlu onayı ve dönem karşılaştırması',
    contrast: 'faaliyet sayısı ile iş sonucunu birbirine karıştırmamak',
    artifact: `${topic} karar ve izleme kartı`,
    caseContext: 'büyüyen bir yerel işletmenin haftalık yönetim toplantısı',
    failure: 'ölçüt, sahip ve kontrol tarihi olmadan genel bir hedef yazmak',
    visual: 'scorecard',
  }

  const exactOverrides: Record<string, Partial<Lens>> = {
    'net kâr': {
      definition: 'Net kâr, belirli bir dönemin bütün ilgili gelirleri ile maliyet, faaliyet gideri, finansman ve vergi etkileri kapatıldıktan sonra kalan mutlak parasal sonuçtur.',
      decision: 'dönem kapanışındaki mutlak sonucun dağıtım, rezerv veya işletmede bırakma kararına yeterli olup olmadığını belirlemek',
      metric: 'doğrulanmış net dönem sonucu tutarı',
      formula: 'Net kâr = net satış + diğer gelirler − satışların maliyeti − faaliyet giderleri − finansman − vergi',
      evidence: 'kapanmış gelir tablosu, mizan mutabakatı, tek seferlik kalem listesi ve sahip çekişleri',
      contrast: 'parasal net kâr tutarını satışa oranlanan net marj veya yatırım getirisiyle aynı gösterge saymamak',
      artifact: 'dönem sonu net kâr mutabakat köprüsü',
      caseContext: 'yıl sonu kârını dağıtmakla nakit rezervinde tutmak arasında seçim yapan aile işletmesi',
      failure: 'tek seferlik varlık satışını olağan faaliyet kârı içinde bırakmak',
      visual: 'bridge',
    },
    'karlılık oranı': {
      definition: 'Kârlılık oranı, seçilen kâr tanımını onu üreten satış, varlık veya özkaynak tabanına bölerek farklı ölçekleri karşılaştırılabilir hale getiren göreli göstergedir.',
      decision: 'hangi paydanın yönetim sorusuna uygun olduğunu ve orandaki değişimin fiyat, hacim, maliyet veya sermaye kullanımından doğduğunu seçmek',
      metric: 'amacı ve paydası açık kârlılık oranı',
      formula: 'Kârlılık oranı = seçilen kâr ölçüsü / ilgili satış, varlık veya özkaynak tabanı × 100',
      evidence: 'aynı döneme ait kâr ölçüsü, ortalama payda bakiyesi ve oran tanım sözlüğü',
      contrast: 'farklı payda kullanan net marj, aktif getirisi ve özkaynak getirisini tek oran gibi karşılaştırmamak',
      artifact: 'pay–payda tanımlı kârlılık oranı ağacı',
      caseContext: 'iki şubenin farklı ciro ve varlık büyüklüğündeki performansını karşılaştıran perakendeci',
      failure: 'dönem sonu bakiyesini dönem ortalaması gereken paydada kullanmak',
      visual: 'scorecard',
    },
    'maliyet artı marj': {
      definition: 'Maliyet artı marj yöntemi, tanımlı maliyet tabanının üzerine hedeflenen ek oranı veya tutarı koyarak liste fiyatı üretir; müşterinin ödeme isteğini tek başına kanıtlamaz.',
      decision: 'hangi maliyetlerin fiyat tabanına alınacağını ve ekleme oranının kapasite ile pazar koşullarında yeterli olup olmadığını belirlemek',
      metric: 'maliyet tabanı üzerine eklenen markup ve oluşan satış marjı',
      formula: 'Fiyat = tanımlı birim maliyet × (1 + markup); satış marjı = (fiyat − maliyet) / fiyat',
      evidence: 'birim maliyet kartı, kapasite varsayımı, hedef markup ve rakip/müşteri fiyat testi',
      contrast: 'maliyet üzerine eklenen markup yüzdesini satış fiyatı içindeki marj yüzdesi sanmamak',
      artifact: 'maliyet tabanı–markup–nihai fiyat çalışma sayfası',
      caseContext: 'özel üretim tekliflerinde standart fiyat tabanı kuran metal atölyesi',
      failure: 'genel gider kapsamını tanımlamadan maliyet tabanına keyfî oran eklemek',
      visual: 'bridge',
    },
    'maliyet değişim analizi': {
      definition: 'Maliyet değişim analizi, iki karşılaştırılabilir dönem arasındaki toplam farkı fiyat, miktar, karışım, verim ve kapsam etkilerine ayırarak nedenini açıklar.',
      decision: 'maliyet sapmasının hangi sürücüden kaynaklandığını ve hangi sorumluluk alanında müdahale edileceğini seçmek',
      metric: 'sürücülere ayrıştırılmış maliyet farkı',
      formula: 'Toplam fark = fiyat etkisi + miktar etkisi + karışım/verim etkisi + açıklanan kapsam değişimi',
      evidence: 'iki dönemin aynı kapsamlı satın alma fiyatı, tüketim miktarı, ürün karışımı ve üretim kaydı',
      contrast: 'toplam maliyet artışını hacim değişimini ayırmadan yalnız tedarikçi fiyatına bağlamamak',
      artifact: 'fiyat–miktar–karışım maliyet varyans köprüsü',
      caseContext: 'aynı satış hacminde birim maliyeti yükselen ambalaj üreticisi',
      failure: 'ürün karışımı değişmiş iki dönemi birim ortalama üzerinden doğrudan karşılaştırmak',
      visual: 'bridge',
    },
    'iade yönetimi': {
      definition: 'İade yönetimi, müşterinin geri gönderim talebinden ürünün kabulü, para iadesi, yeniden satış veya hurda kararına kadar fiziksel ve finansal operasyon akışını yönetir.',
      decision: 'iadenin hangi adımda, kim tarafından ve hangi hizmet süresi içinde sonuçlandırılacağını belirlemek',
      metric: 'uçtan uca iade çevrim süresi ve yeniden satışa kazanım oranı',
      formula: 'İade çevrim süresi = finansal/fiziksel kapanış zamanı − müşteri talep zamanı',
      evidence: 'iade talebi, taşıma hareketi, kabul kontrolü, neden kodu, stok ve ödeme kaydı',
      contrast: 'müşteriye açıklanan yasal iade koşulu ile depo ve finansın iade işleme sürecini aynı doküman saymamak',
      artifact: 'talep–kabul–geri ödeme iade operasyon akışı',
      caseContext: 'haftalık iade hacmi artan çok kanallı ayakkabı satıcısı',
      failure: 'ürün depoya dönmeden finansal ve stok kapanışını birbirinden koparmak',
      visual: 'flow',
    },
    'iade koşulları': {
      definition: 'İade koşulları, satış türüne ve güncel mevzuata göre müşteriye işlem öncesinde açıklanması gereken hak, süre, istisna, başvuru ve geri ödeme kurallarını tanımlar.',
      decision: 'ürün ve satış kanalına uygulanabilir iade hakkını güncel resmî kaynaktan doğrulayıp müşteriye açık biçimde sunmak',
      metric: 'güncel koşul metniyle doğru bilgilendirilen satış oranı',
      formula: 'Koşul kapsaması = doğru sürüm iade metni bağlı uygun satış / toplam uygun satış × 100',
      evidence: 'güncel resmî düzenleme, ürün istisna değerlendirmesi, ön bilgilendirme sürümü ve müşteri onayı',
      contrast: 'işletmenin depo iade prosedürünü tüketicinin yasal hakkını daraltan satış koşuluna dönüştürmemek',
      artifact: 'kanal ve ürün bazlı iade hakkı açıklama matrisi',
      caseContext: 'kişiselleştirilmiş ve standart ürünleri aynı sitede satan bir e-ticaret işletmesi',
      failure: 'istisna veya süreyi güncel resmî metinden doğrulamadan kopya politika yayımlamak',
      visual: 'matrix',
    },
    'mesafeli satış': {
      definition: 'Mesafeli satış, satıcı ile tüketicinin aynı anda fiziksel olarak bulunmadığı kanalda sipariş öncesi bilgi, sipariş onayı, teslim ve cayma akışının bütünüdür.',
      decision: 'dijital satış yolculuğunun her aşamasında hangi bilginin ne zaman gösterilip hangi onayın saklanacağını tasarlamak',
      metric: 'zorunlu bilgilendirme ve onay kanıtı eksiksiz sipariş oranı',
      formula: 'Akış uygunluğu = tüm kontrol kapılarını geçen mesafeli sipariş / incelenen mesafeli sipariş × 100',
      evidence: 'ürün sayfası, sepet, ön bilgilendirme, sipariş onayı, teslim ve cayma kayıtları',
      contrast: 'mesafeli satışın uçtan uca işlem akışını yalnız sözleşme PDF dosyasından ibaret saymamak',
      artifact: 'ekrandan teslimata mesafeli satış kontrol akışı',
      caseContext: 'mobil site üzerinden ilk kez tüketici siparişi almaya başlayan yerel üretici',
      failure: 'ödeme öncesi zorunlu bilgiyi sonradan gönderilen e-postaya bırakmak',
      visual: 'flow',
    },
    'mesafeli sözleşme': {
      definition: 'Mesafeli sözleşme, belirli bir uzaktan satış işleminin taraflarını, mal veya hizmetini, bedelini, ifa koşullarını, haklarını ve uyuşmazlık bilgisini kayıt altına alan hukuki metindir.',
      decision: 'işleme özgü değişken alanları doğru veriden doldurup sözleşmenin kabul edilen sürümünü ispatlanabilir biçimde saklamak',
      metric: 'işlemle eşleşen ve kabul kanıtı saklanan sözleşme oranı',
      formula: 'Sözleşme bütünlüğü = zorunlu alanları doğru ve sürümü kanıtlı sözleşme / incelenen sözleşme × 100',
      evidence: 'sipariş anındaki sözleşme sürümü, taraf/ürün/bedel alanları, zaman damgalı kabul ve değişiklik geçmişi',
      contrast: 'genel kullanım koşullarını işlem özelindeki mesafeli sözleşmenin yerine koymamak',
      artifact: 'değişken alan ve sürüm kontrollü mesafeli sözleşme şablonu',
      caseContext: 'ürün, abonelik ve dijital hizmeti aynı ödeme akışında satan küçük işletme',
      failure: 'müşterinin kabul ettiği sürümü daha sonra değişen web sayfasıyla ispatlamaya çalışmak',
      visual: 'matrix',
    },
    'mvp oluşturma': {
      definition: 'MVP, en az özellikli ürün demek değil; en kritik müşteri varsayımını gerçek davranışla sınayacak en küçük uçtan uca deneydir.',
      decision: 'hangi riskli varsayımın hangi asgari deney ve davranış ölçütüyle devam, dönüş veya durdurma kararı üreteceğini seçmek',
      metric: 'hedef davranışı tamamlayan uygun kullanıcı ve öğrenme döngüsü süresi',
      formula: 'MVP doğrulaması = hedef davranışı tamamlayan uygun kullanıcı / deneye başlayan uygun kullanıcı × 100',
      evidence: 'varsayım kartı, çalışan deney akışı, kullanım/ödeme davranışı, görüşme notu ve hata kaydı',
      contrast: 'özellik listesini küçültmeyi öğrenme sorusu ve gerçek kullanıcı davranışı olmayan MVP sanmamak',
      artifact: 'varsayım–deney–davranış–karar MVP kartı',
      caseContext: 'randevu yönetimi fikrini kod yazmadan hizmet prototipiyle sınayan kurucu ekip',
      failure: 'başarı ölçütünü sonuç görüldükten sonra olumlu görünecek biçimde değiştirmek',
      visual: 'funnel',
    },
    'lisanslama': {
      definition: 'Lisanslama, bir fikrî mülkiyet hakkının sahipliği devredilmeden belirli kullanım alanı, bölge, süre, bedel, kalite ve denetim koşullarıyla başka tarafa kullandırılmasıdır.',
      decision: 'hangi hakkın hangi kapsam ve ekonomik modelle lisanslanacağını, ihlal ve sona erme durumlarında ne yapılacağını belirlemek',
      metric: 'lisans kapsamına uygun kullanım, tahakkuk eden bedel ve denetim istisnası',
      formula: 'Lisans getirisi = tahsil edilen sabit/royalty bedeli − izleme, destek ve hak koruma maliyeti',
      evidence: 'hak sahipliği kaydı, lisans sözleşmesi, kullanım raporu, satış bildirimi, kalite denetimi ve ödeme',
      contrast: 'müşteri talebini sınayan geçici MVP deneyini uzun vadeli fikrî hak kullandırma modeliyle karıştırmamak',
      artifact: 'hak–kapsam–bedel–denetim lisans sözleşme özeti',
      caseContext: 'tasarım desenini farklı bölgelerdeki üreticilere kullandırmayı değerlendiren yaratıcı marka',
      failure: 'bölge, alt lisans, kalite kontrolü veya satış bildirimini belirsiz bırakmak',
      visual: 'matrix',
    },
  }
  const exactOverride = exactOverrides[topic.toLocaleLowerCase('tr-TR')]
  if (exactOverride) return { ...base, ...exactOverride }

  const rules: Array<[RegExp, Partial<Lens>]> = [
    [/kâr ile nakit/, { definition: 'Kâr faaliyet sonucunu, nakit ise paranın kullanılabilir bakiyeye giriş ve çıkış zamanını gösterir; iki değer aynı dönemde farklı yönlere gidebilir.', decision: 'kârlı görünen satışların tahsilat ve ödeme zamanlamasını likidite açığı yaratmadan düzenlemek', metric: 'kâr–nakit dönüşüm farkı', formula: 'Nakit dönüşüm farkı = dönem kârı − faaliyetlerden oluşan net nakit', evidence: 'gelir tablosu kalemleri, banka hareketi, alacak ve borç yaşlandırması', contrast: 'tahakkuk etmiş satış ile tahsil edilmiş parayı ayrı izlemek', artifact: 'kâr–nakit uzlaştırma köprüsü', caseContext: 'vadeli satışla büyürken kasası daralan bir üretici', failure: 'kâr artışını ödeme gücü artışı sanmak', visual: 'bridge' }],
    [/nakit büyüme/, { definition: 'Nakit büyüme oranı, karşılaştırılabilir dönemlerde kullanılabilir nakit bakiyesindeki değişimi gösterir; tek başına faaliyet kalitesini açıklamaz.', decision: 'nakit artışının faaliyet, finansman veya ertelenmiş ödemeden hangisiyle oluştuğunu ayırmak', metric: 'kaynağı ayrıştırılmış nakit büyümesi', formula: 'Nakit büyümesi = (kapanış nakdi − açılış nakdi) / açılış nakdi × 100', evidence: 'dönem başı/sonu banka bakiyesi ve nakit hareket sınıfları', contrast: 'kredi girişini operasyonel nakit başarısı gibi sunmamak', artifact: 'nakit büyüme kaynak ağacı', caseContext: 'kredi kullandıktan sonra nakdi yükselen bir hizmet işletmesi', failure: 'nakit artışının kaynağını sınıflandırmadan performans sonucu çıkarmak', visual: 'bridge' }],
    [/nakit dengesi/, { definition: 'Nakit dengesi, belirli tarihlerdeki beklenen giriş ve çıkışların işletmenin asgari güvenli bakiye sınırıyla birlikte izlenmesidir.', decision: 'hangi haftada açığın oluşacağını ve ödeme/tahsilat müdahalesinin ne zaman başlayacağını belirlemek', metric: 'projeksiyondaki en düşük kullanılabilir bakiye', formula: 'Haftalık kapanış = açılış + gerçekleşmesi ağırlıklandırılmış giriş − planlı çıkış', evidence: 'vadeli alacak, ödeme takvimi, banka bakiyesi ve kesinlik notu', contrast: 'dönem toplamı dengeli olsa bile ara tarihteki açığı görünmez bırakmamak', artifact: '13 haftalık nakit denge takvimi', caseContext: 'aylık toplama bakınca dengeli görünen fakat maaş haftasında zorlanan bir işletme', failure: 'girişlerin kesinlik olasılığını ve ödeme tarihlerini dikkate almamak', visual: 'timeline' }],
    [/ciro/, { definition: 'Ciro, seçilen dönemde gerçekleşen satışların iade ve indirim kapsamı açıkça tanımlanmış toplam değeridir; kâr değildir.', decision: 'hangi satış hareketinin ciro raporuna hangi tarihte ve hangi netleştirmeyle alınacağını belirlemek', metric: 'iade ve indirim sonrası net ciro', formula: 'Net ciro = brüt satış − satış iadeleri − satış indirimleri', evidence: 'satış faturası, sipariş durumu ve iade kaydı', contrast: 'ciroyu tahsilat, nakit veya kâr gibi yorumlamamak', artifact: 'kanal bazlı ciro mutabakatı', caseContext: 'mağaza ve pazar yerinde satış yapan bir perakendeci', failure: 'iptal ve iadeleri brüt satışın içinde bırakmak', visual: 'bridge' }],
    [/gelir tanımı/, { definition: 'Gelir tanımı, işletmenin ekonomik fayda üreten işlemini doğru dönem, kaynak ve gerçekleşme koşuluyla sınıflandırır.', decision: 'satış dışı ve tek seferlik girişleri olağan faaliyet gelirinden ayırmak', metric: 'kaynağına göre doğrulanmış dönem geliri', formula: 'Toplam gelir = olağan faaliyet geliri + ayrı gösterilen diğer gelirler', evidence: 'sözleşme, teslim/ifa kaydı, fatura ve muhasebe sınıfı', contrast: 'her nakit girişini veya borçlanmayı gelir saymamak', artifact: 'gelir kaynağı ve dönem sınıflandırma tablosu', caseContext: 'satış, hibe ve varlık satışını aynı dönemde kaydeden bir işletme', failure: 'tek seferlik girişi sürdürülebilir faaliyet geliri gibi bütçelemek', visual: 'matrix' }],
    [/brüt kâr|brüt marj/, { definition: 'Brüt kâr, net satıştan satılan mal veya hizmetin doğrudan maliyeti çıkarıldıktan sonra kalan tutardır.', decision: 'ürün veya hizmetin doğrudan maliyet sonrasında işletmeye yeterli katkı bırakıp bırakmadığını değerlendirmek', metric: 'brüt kâr marjı', formula: 'Brüt kâr marjı = (net satış − satışların maliyeti) / net satış × 100', evidence: 'net satış, ürün maliyet kartı ve stok çıkışı', contrast: 'faaliyet giderlerini brüt kâr hesabına gelişigüzel eklememek', artifact: 'ürün bazlı brüt kâr köprüsü', caseContext: 'üç ürün grubu satan bir atölye', failure: 'maliyet kapsamını dönemler arasında değiştirmek', visual: 'bridge' }],
    [/net kâr|net marj|karlılık oranı/, { definition: 'Net kâr, işletmenin seçilen dönemde tüm ilgili gelir, maliyet, faaliyet gideri ve finansman/vergi etkileri sonrasında kalan sonucudur.', decision: 'iş modelinin bütün giderlerden sonra sürdürülebilir sonuç üretip üretmediğini değerlendirmek', metric: 'net kâr marjı', formula: 'Net kâr marjı = net dönem sonucu / net satış × 100', evidence: 'gelir tablosu, gider mutabakatı ve dönem kapanışı', contrast: 'tek seferlik gelirleri olağan performans gibi sunmamak', artifact: 'net sonuç mutabakatı', caseContext: 'hızlı büyüyen bir hizmet işletmesi', failure: 'işletme sahibinin kişisel harcamalarını sınıflandırmadan sonuca katmak', visual: 'bridge' }],
    [/tahsilat süresi/, { definition: 'Tahsilat süresi, satışın gerçekleşmesi ile paranın kullanılabilir bakiyeye geçmesi arasındaki zamanı ölçer.', decision: 'müşteri vadesi ve takip ritmini nakit ihtiyacına göre ayarlamak', metric: 'ağırlıklı ortalama tahsilat günü', formula: 'Tahsilat günü = tahsilat tarihi − fatura/satış tarihi', evidence: 'fatura, vade, banka hareketi ve müşteri hesabı', contrast: 'vade tarihi ile gerçek tahsilat tarihini aynı kabul etmemek', artifact: 'müşteri yaşlandırma ve aksiyon listesi', caseContext: 'kurumsal müşterilere vadeli satış yapan bir tedarikçi', failure: 'geciken büyük hesabı ortalamanın içinde görünmez bırakmak', visual: 'timeline' }],
    [/ödeme süresi|borç ödeme|kredi kullanımı/, { definition: 'Ödeme yönetimi, borcun tutarı kadar vadesini, maliyetini, önceliğini ve nakit etkisini birlikte ele alır.', decision: 'hangi borcun ne zaman ve hangi finansman maliyetiyle kapatılacağını seçmek', metric: 'borç servis karşılama görünümü', formula: 'Net borç yükü = anapara + finansman maliyeti − erken ödeme avantajı', evidence: 'sözleşme, ödeme planı, faiz/masraf dökümü ve nakit tahmini', contrast: 'yalnız aylık taksite bakıp toplam maliyeti gözden kaçırmamak', artifact: 'borç öncelik ve ödeme takvimi', caseContext: 'ekipman yatırımı planlayan bir işletme', failure: 'kısa vadeli açığı daha pahalı ve uyumsuz borçla sürekli çevirmek', visual: 'timeline' }],
    [/bütçe|rezerv/, { definition: 'Bütçe ve rezerv, beklenen faaliyetleri kaynakla eşleyen ve beklenmeyen sapmalara dayanma payı oluşturan yönetim araçlarıdır.', decision: 'kaynakların hangi önceliğe ayrılacağını ve hangi sapmada müdahale edileceğini belirlemek', metric: 'bütçe sapma oranı', formula: 'Sapma oranı = (gerçekleşen − bütçe) / bütçe × 100', evidence: 'onaylı bütçe, gerçekleşen kayıt ve sapma açıklaması', contrast: 'bütçeyi değişmez tahmin değil güncellenen karar çerçevesi olarak kullanmak', artifact: 'bütçe–gerçekleşen–aksiyon panosu', caseContext: 'mevsimsel satış yapan bir işletme', failure: 'sapmanın nedenini ve sahibini yazmadan yalnız renkli rapor üretmek', visual: 'scorecard' }],
    [/sabit gider|değişken gider|gider tanımı|genel gider/, { definition: 'Gider sınıflandırması, maliyetin hacimle ilişkisini ve hangi karar tarafından değiştirilebildiğini açıklar.', decision: 'gideri doğru maliyet nesnesine ve karar ufkuna bağlamak', metric: 'birim başına gider yükü', formula: 'Birim gider yükü = ilgili toplam gider / uygun faaliyet sürücüsü', evidence: 'fatura, bordro, kullanım kaydı ve maliyet merkezi', contrast: 'sabit/değişken ayrımıyla doğrudan/dolaylı ayrımını karıştırmamak', artifact: 'gider davranışı ve dağıtım tablosu', caseContext: 'ürün çeşidi artan küçük bir imalatçı', failure: 'dağıtım anahtarını kanıtlamadan tüm gideri satış adedine bölmek', visual: 'matrix' }],
    [/başabaş|marjinal kâr|fırsat maliyeti/, { definition: 'Karar analizi, seçilen alternatifin ek katkısını ve vazgeçilen en iyi seçeneğin değerini birlikte inceler.', decision: 'hacim, kapasite ve katkı ilişkisine göre alternatifler arasında seçim yapmak', metric: 'katkı payı ve güvenlik marjı', formula: 'Başabaş adet = sabit gider / birim katkı payı', evidence: 'fiyat, değişken maliyet, kapasite ve talep varsayımı', contrast: 'batık maliyeti gelecekteki kararın gerekçesi yapmamak', artifact: 'alternatif katkı ve başabaş tablosu', caseContext: 'yeni ürün kabulünü değerlendiren bir üretici', failure: 'kapasite kısıtını yok sayıp yalnız birim kâra bakmak', visual: 'matrix' }],
    [/maliyet|komisyon|iskonto|indirim|fiyat|marj|kampanya/, { definition: `${topic}, satış kararının görünmeyen kesinti ve davranış etkilerini birim ekonomi içinde ölçer.`, decision: 'fiyat veya maliyet değişiminin birim katkı ve toplam sonuç üzerindeki etkisini sınamak', metric: `${topic} sonrası birim katkı`, formula: 'Birim katkı = net satış fiyatı − işlemle değişen tüm maliyetler', evidence: 'maliyet kartı, kanal kesintisi, iade ve gerçekleşen satış', contrast: 'markup ile satış marjını aynı oran sanmamak', artifact: `${topic} duyarlılık matrisi`, caseContext: 'hem mağazada hem çevrim içi satış yapan bir marka', failure: 'indirim sonrası eski toplam katkıyı korumak için gereken hacmi hesaplamamak', visual: 'matrix' }],
    [/pazar yeri seçimi/, { definition: 'Pazar yeri seçimi, satışa başlamadan önce ürün–müşteri uyumu ile komisyon, görünürlük, lojistik ve veri kontrolünü karşılaştırır.', decision: 'ilk giriş yapılacak platformu ve ikinci kanal opsiyonunu seçmek', metric: 'beklenen kanal sonrası birim katkı ve erişilebilir hedef kitle', formula: 'Seçim puanı = kriter ağırlığı × doğrulanmış platform puanı toplamı', evidence: 'güncel platform koşulları, hedef müşteri araştırması, ürün ekonomisi ve pilot teklif', contrast: 'en popüler platformu ürün ve müşteri uyumu kanıtı olmadan seçmemek', artifact: 'giriş öncesi pazar yeri seçim matrisi', caseContext: 'ilk kez çevrim içi satışa başlayacak bir zanaat işletmesi', failure: 'satış verisi oluşmadan kesin hacim tahminiyle tek platforma bağlanmak', visual: 'matrix' }],
    [/pazar yeri analizi/, { definition: 'Pazar yeri analizi, faal bir kanalın gerçek satış, kesinti, iade, görünürlük ve müşteri kalitesi sonuçlarını dönemsel inceler.', decision: 'mevcut platformda ölçekleme, iyileştirme, küçülme veya çıkış kararı vermek', metric: 'gerçekleşen kanal katkısı ve sağlıklı sipariş oranı', formula: 'Gerçek kanal katkısı = tahsil edilen net satış − ürün − kesinti − reklam − iade/operasyon maliyeti', evidence: 'platform mutabakatı, reklam raporu, sipariş ve iade nedeni', contrast: 'brüt satış büyümesini kanal kârlılığı veya müşteri kalitesi saymamak', artifact: 'faal kanal performans ve çıkış panosu', caseContext: 'iki pazar yerinde altı aylık satış geçmişi bulunan bir satıcı', failure: 'platform raporundaki satış toplamını tüm kesintiler sonrası katkı sanmak', visual: 'scorecard' }],
    [/pazar yeri|kanal|e-ticaret sitesi/, { definition: `${topic}, erişim potansiyeli ile komisyon, veri sahipliği, operasyon yükü ve müşteri ilişkisini birlikte tartan kanal kararıdır.`, decision: 'ürün ve hedef müşteri için sürdürülebilir kanal bileşimini seçmek', metric: 'kanal sonrası katkı ve tekrar satın alma', formula: 'Kanal katkısı = net satış − ürün maliyeti − kanal gideri − siparişe bağlı operasyon gideri', evidence: 'kanal raporu, sipariş, kesinti ve iade kayıtları', contrast: 'yalnız trafik veya komisyon oranıyla kanal seçmemek', artifact: 'ağırlıklı kanal seçim matrisi', caseContext: 'el yapımı ürün satan bir mikro işletme', failure: 'tek platforma bağımlılık ve müşteri verisi riskini hesaba katmamak', visual: 'matrix' }],
    [/ürün liste|fotoğraf|kategori|arama optimizasyon/, { definition: `${topic}, müşterinin ürünü bulması, anlaması ve güvenle karşılaştırması için içerik ile katalog verisini düzenler.`, decision: 'hangi bilgi ve görsel değişikliğinin bulunabilirlik ve doğru beklenti yaratacağını seçmek', metric: 'ürün görüntüleme–sepete ekleme dönüşümü', formula: 'Liste dönüşümü = sepete ekleme / nitelikli ürün görüntüleme × 100', evidence: 'arama terimi, ürün sayfası olayı, soru ve iade nedeni', contrast: 'gösterimi satış niyeti veya kalite kanıtı sanmamak', artifact: 'ürün sayfası tanı ve deney kartı', caseContext: 'çok benzer ürün varyantları satan bir satıcı', failure: 'müşteri sorularını ve yanlış beklentiden doğan iadeyi içerik kararına katmamak', visual: 'funnel' }],
    [/stok|sipariş|iade|değişim|kargo|paketleme|desi/, { definition: `${topic}, siparişin doğru ürün, doğru zaman ve kabul edilebilir toplam maliyetle tamamlanmasını yöneten operasyon akışıdır.`, decision: 'hizmet seviyesi ile stok/işlem maliyeti arasındaki dengeyi kurmak', metric: 'ilk seferde doğru ve zamanında tamamlama oranı', formula: 'Başarı oranı = hatasız ve zamanında tamamlanan işlem / toplam işlem × 100', evidence: 'sipariş zaman damgası, stok hareketi, taşıyıcı ve iade nedeni', contrast: 'ortalama süreyle geciken uç vakaları görünmez bırakmamak', artifact: `${topic} süreç izi`, caseContext: 'günde artan sayıda sipariş hazırlayan bir e-ticaret işletmesi', failure: 'hatanın oluştuğu adım yerine yalnız son kişiyi sorumlu tutmak', visual: 'flow' }],
    [/fatura|kdv|vergi|e-defter|beyan|sgk|yasal|sözleşme|tüketici|garanti|gizlilik|işe alma|iş kazası/, { definition: `${topic}, güncel resmî yükümlülüğü tarih, sorumlu ve saklanacak kanıtla eşleyen bir uyum konusudur.`, decision: 'işletmeye uygulanabilir yükümlülüğü güncel resmî kaynaktan doğrulayıp zamanında yerine getirmek', metric: 'zamanında ve kanıtlı tamamlama oranı', formula: 'Uyum tamamlama = kanıtı mevcut zamanında işlem / ilgili toplam yükümlülük × 100', evidence: 'güncel resmî metin, tarihli beyan/işlem ve saklanan kanıt', contrast: 'eğitim örneğini somut hukuk veya vergi görüşü yerine kullanmamak', artifact: `${topic} yükümlülük takvimi`, caseContext: 'satış ve çalışan sayısı büyüyen bir KOBİ', failure: 'oran, süre veya koşulu güncel resmî kaynaktan işlem tarihinde kontrol etmemek', visual: 'timeline' }],
    [/iş fikri|müşteri problemi|hedef kitle|mvp|iş modeli|gelir modeli|pazar araştır|rekabet|farklılaştır|startup|bootstrapping|yatırım|pitch|lisans|franch|ortaklık|çıkış/, { definition: `${topic}, doğrulanmamış varsayımı en düşük makul maliyetle gerçek müşteri ve işlem kanıtına dönüştüren girişimcilik kararıdır.`, decision: 'hangi varsayımın hangi deneyle test edileceğini ve devam/dönüş/durdurma ölçütünü seçmek', metric: 'varsayım doğrulama ve ödeme davranışı', formula: 'Deney dönüşümü = hedef davranışı yapan kişi / uygun deneye katılan kişi × 100', evidence: 'görüşme notu, teklif deneyi, ödeme veya kullanım davranışı', contrast: 'olumlu görüşü gerçek ödeme veya kullanım kanıtı saymamak', artifact: `${topic} varsayım–deney kartı`, caseContext: 'yeni hizmet fikrini düşük bütçeyle sınayan bir girişimci', failure: 'çözümü savunup müşteri problemini tarafsız test etmemek', visual: 'matrix' }],
    [/içerik|blog|video|sosyal medya|instagram|tiktok|linkedin|ads|roas|dönüşüm|edinme|yaşam boyu|marka|email|sepet|yeniden pazarlama|influencer|affiliate/, { definition: `${topic}, belirli bir kitle ve davranış hedefi için mesaj, kanal, maliyet ve ölçümü aynı deneyde birleştirir.`, decision: 'hangi kitle–mesaj–kanal bileşiminin katkı ürettiğini kanıtlamak', metric: `${topic} katkı dönüşümü`, formula: 'Katkı bazlı getiri = (kampanya kaynaklı katkı − kampanya maliyeti) / kampanya maliyeti', evidence: 'kampanya harcaması, tanımlı dönüşüm olayı, sipariş katkısı ve ilişkilendirme notu', contrast: 'erişim ve tıklamayı kârlı müşteri kazanımı sanmamak', artifact: `${topic} deney panosu`, caseContext: 'sınırlı reklam bütçesi olan yerel bir marka', failure: 'aynı testte kitleyi, mesajı ve teklifi birlikte değiştirip nedeni belirsiz bırakmak', visual: 'funnel' }],
    [/süreç|standart iş|darboğaz|kapasite|kalite|kök neden|düzeltici|iyileştirme|operasyon kpi|görsel yönetim/, { definition: `${topic}, işin gerçek akışını zaman, kalite, kapasite ve yeniden işleme kanıtıyla görünür hale getirir.`, decision: 'sonucu en çok sınırlayan adımı ve uygulanacak kontrolü seçmek', metric: 'uçtan uca çevrim süresi ve ilk seferde doğru oranı', formula: 'Akış verimliliği = değer üreten süre / toplam geçen süre × 100', evidence: 'zaman damgası, hata, bekleme, yeniden işleme ve iş emri', contrast: 'yerel bir adımı hızlandırıp toplam akışı yavaşlatmamak', artifact: `${topic} mevcut–hedef durum haritası`, caseContext: 'siparişten teslimata çok el değiştiren bir atölye', failure: 'kök neden doğrulanmadan ilk görünen belirtiye çözüm uygulamak', visual: 'flow' }],
    [/rol|yetkinlik|işe uyum|performans|geri bildirim|çalışan öneri|isg|ramak|güvenlik kültürü/, { definition: `${topic}, beklenen davranış, yetki, kanıt ve gelişim desteğini açık hale getiren insan ve güvenlik yönetimi konusudur.`, decision: 'hangi yetkinlik veya güvenlik açığının hangi destek ve kontrolle kapatılacağını seçmek', metric: 'kanıtlanmış yetkinlik veya kapanan risk eylemi oranı', formula: 'Kapsama oranı = yeterli kanıtı bulunan gereklilik / toplam ilgili gereklilik × 100', evidence: 'gözlem, iş çıktısı, eğitim/uygulama kaydı ve olay verisi', contrast: 'eğitime katılımı güvenli ve yetkin davranışın tek kanıtı saymamak', artifact: `${topic} rol–kanıt–gelişim matrisi`, caseContext: 'yeni çalışan ve vardiya sayısı artan bir işletme', failure: 'kişiyi etiketleyip sistem, görev tasarımı ve kaynak nedenlerini incelememek', visual: 'matrix' }],
    [/satış hunisi|müşteri adayı|ihtiyaç analizi|değer önerisi|teklif|satış tahmini|crm|şikâyet|memnuniyet|müşteri kaybı/, { definition: `${topic}, müşterinin kanıtlanmış ihtiyacını doğru satış veya hizmet adımıyla eşleyen ilişki yönetimi disiplinidir.`, decision: 'müşteri için bir sonraki en doğru adımı ve başarı kanıtını seçmek', metric: 'aşama dönüşümü ve çevrim süresi', formula: 'Aşama dönüşümü = sonraki aşamaya geçen uygun kayıt / aşamaya giren uygun kayıt × 100', evidence: 'CRM aşaması, görüşme notu, teklif, kayıp/şikâyet nedeni ve tarih', contrast: 'faaliyet hacmini müşteri ilerlemesiyle aynı saymamak', artifact: `${topic} müşteri karar kartı`, caseContext: 'uzun teklif süreci olan bir B2B hizmet işletmesi', failure: 'eksik CRM verisini sıfır talep veya müşteri ilgisizliği diye yorumlamak', visual: 'funnel' }],
    [/ihracat|gtip|menşe|teslim şekli|sınır ötesi|e-ihracat|lokalizasyon/, { definition: `${topic}, ürün, ülke, taraf sorumluluğu, belge ve maliyetin işlem öncesinde doğrulandığı dış ticaret kontrolüdür.`, decision: 'hedef pazara hangi belge, teslim ve ödeme kontrol kapılarıyla girileceğini belirlemek', metric: 'belge tamlığı ve uçtan uca teslim süresi', formula: 'Teslim edilmiş toplam maliyet = ürün + taşıma + sigorta + vergi/harç + işlem giderleri', evidence: 'güncel resmî ülke/ürün gereği, sınıflandırma, teklif, belge ve taşıma kaydı', contrast: 'genel ülke bilgisini ürün ve işlem özelinde kesin kural saymamak', artifact: `${topic} pazar–belge–sorumlu akışı`, caseContext: 'ilk kez sınır ötesi sipariş alacak bir üretici', failure: 'GTİP, menşe, teslim ve ödeme sorumluluklarını sevkiyat sonrasına bırakmak', visual: 'flow' }],
    [/sürdürü|enerji|su |atık|kaynak verim|karbon|yeşil iddia/, { definition: `${topic}, tüketim veya etkiyi faaliyet miktarıyla ilişkilendirip doğrulanabilir iyileştirme kararı üretir.`, decision: 'en yüksek maddi etki ve uygulanabilirliğe sahip kaynak iyileştirmesini seçmek', metric: 'faaliyet birimi başına kaynak tüketimi', formula: 'Yoğunluk = dönem tüketimi / aynı dönemin uygun faaliyet miktarı', evidence: 'fatura/sayaç, üretim-hizmet miktarı, atık ve faaliyet kaydı', contrast: 'toplam tüketim düşüşünü faaliyet hacmi değişiminden ayırmadan başarı saymamak', artifact: `${topic} baz çizgi–hedef–kanıt panosu`, caseContext: 'enerji ve malzeme maliyeti yükselen küçük bir üretici', failure: 'ölçüm sınırını veya veri boşluğunu açıklamadan çevresel iddia yayımlamak', visual: 'scorecard' }],
    [/tedarikçi|satın alma|tek kaynak|emniyet stoku|sipariş noktası|tedarik süresi|talep tahmini|tedarik zinciri/, { definition: `${topic}, hizmet seviyesi, toplam maliyet, süre değişkenliği ve kesinti riskini birlikte yöneten tedarik kararıdır.`, decision: 'hangi tedarik veya stok politikasının kabul edilebilir riskle uygulanacağını seçmek', metric: 'zamanında ve tam teslimat ile süre değişkenliği', formula: 'Yeniden sipariş noktası = beklenen tedarik süresi talebi + emniyet stoku', evidence: 'satın alma siparişi, teslim tarihi, kalite kabulü, stok ve talep kaydı', contrast: 'yalnız birim fiyata bakıp kesinti ve kalite maliyetini dışarıda bırakmamak', artifact: `${topic} tedarik risk puan kartı`, caseContext: 'kritik malzemede az sayıda kaynağa bağımlı bir işletme', failure: 'ortalama tedarik süresini değişkenlik ve uç gecikmeler olmadan kullanmak', visual: 'matrix' }],
    [/siber|varlık|çok faktör|yetki|yama|yedek|oltalama|olay müdahale|veri sınıflandır/, { definition: `${topic}, işletmenin kritik dijital varlığını tehdit, kontrol, sahip ve doğrulama kanıtıyla eşleyen siber risk yönetimidir.`, decision: 'en yüksek iş etkili riski hangi önleyici ve kurtarıcı kontrolle azaltacağını seçmek', metric: 'kritik varlıklarda doğrulanmış kontrol kapsaması', formula: 'Kontrol kapsaması = testi geçen kritik varlık / kapsam içindeki kritik varlık × 100', evidence: 'varlık envanteri, erişim/yama kaydı, olay tatbikatı ve geri yükleme testi', contrast: 'bir aracın kurulu olmasını kontrolün çalıştığına kanıt saymamak', artifact: `${topic} varlık–tehdit–kontrol kaydı`, caseContext: 'müşteri ve finans verisini bulutta tutan bir KOBİ', failure: 'yedek alıp geri yükleme testini hiç yapmamak veya kritik varlığı envanter dışında bırakmak', visual: 'matrix' }],
    [/ai |yapay zek|insan gözetimi/, { definition: `${topic}, yapay zekâ kullanımını değer, veri, hata, insan kararı ve izleme sınırlarıyla yöneten sorumlu kullanım konusudur.`, decision: 'hangi AI kullanımının hangi insan gözetimi ve durdurma koşuluyla pilotlanacağını seçmek', metric: 'doğrulanmış fayda ve kritik hata/istisna oranı', formula: 'Net pilot faydası = doğrulanmış zaman/değer kazanımı − işletme ve hata düzeltme maliyeti', evidence: 'test seti, kaynak veri, hata kaydı, insan onayı ve karşılaştırma tabanı', contrast: 'akıcı model çıktısını doğru veya yetkili karar saymamak', artifact: `${topic} kullanım–risk–kontrol kartı`, caseContext: 'tekrarlı ofis işini otomatikleştirmek isteyen bir KOBİ', failure: 'başarı ölçütü ve geri dönüş yolu olmadan modeli doğrudan kritik sürece bağlamak', visual: 'matrix' }],
  ]

  for (const [pattern, override] of rules) {
    if (pattern.test(text)) return { ...base, ...override }
  }
  return base
}

function scenarioFor(topic: string) {
  const hash = createHash('sha256').update(`scenario:${topic}`).digest()
  const pick = (values: string[], offset: number) => values[hash[offset] % values.length]
  return {
    business: pick([
      'abonelik hizmeti sunan küçük bir yazılım işletmesi', 'iki şubeli mahalle fırını', 'kurumsal müşterilere çalışan bir metal atölyesi',
      'pazar yerlerinde satış yapan ev tekstili markası', 'randevuyla çalışan özel bakım merkezi', 'soğuk zincir kullanan yöresel gıda üreticisi',
      'proje bazlı çalışan mimarlık ofisi', 'yedek parça satan bölgesel toptancı', 'etkinlik hizmeti veren yaratıcı ajans',
      'mevsimsel talebi yüksek bir turizm işletmesi', 'özel üretim yapan mobilya imalathanesi', 'çok kanallı satış yapan kozmetik girişimi',
      'saha ekibi bulunan teknik servis', 'ihracata hazırlanan ambalaj üreticisi', 'eğitim paketleri satan danışmanlık şirketi',
      'günlük sevkiyat yapan çiçek tasarım atölyesi', 'kurumsal yemek sağlayan küçük mutfak', 'el yapımı ürünler satan kadın kooperatifi',
      'stoklu çalışan yapı malzemesi mağazası', 'üyelik modeli kullanan spor stüdyosu', 'kişiselleştirilmiş baskı yapan mikro üretici',
      'yerel üreticileri buluşturan dijital pazar', 'bakım sözleşmeleri yöneten tesis firması', 'sipariş üzerine çalışan pastane',
    ], 0),
    actor: pick([
      'işletme sahibi', 'finans sorumlusu', 'operasyon yöneticisi', 'satış lideri', 'müşteri deneyimi sorumlusu',
      'üretim planlama sorumlusu', 'satın alma yetkilisi', 'e-ticaret yöneticisi', 'insan kaynakları sorumlusu',
      'kalite sorumlusu', 'bilgi güvenliği yetkilisi', 'sürdürülebilirlik çalışma grubu', 'dış ticaret sorumlusu',
      'mağaza müdürü', 'ürün yöneticisi', 'vardiya lideri', 'depo sorumlusu', 'pazarlama yöneticisi',
      'genel müdür', 'muhasebe sorumlusu', 'iş geliştirme lideri', 'kurucu ekip', 'servis koordinatörü', 'uyum sorumlusu',
    ], 1),
    trigger: pick([
      'haftalık sonuç toplantısında görülen sapma', 'müşteri şikâyetlerinde ortaya çıkan örüntü', 'ay sonu mutabakatındaki açıklanamayan fark',
      'pilot uygulamada gözlenen uç değer', 'tedarik kesintisi sonrası oluşan gecikme', 'yeni kanalın ilk otuz günlük sonucu',
      'nakit tahmininde beliren açık', 'kalite kontrolünde tekrarlanan hata', 'kampanya sonrası değişen sipariş bileşimi',
      'çalışan geri bildiriminde bildirilen darboğaz', 'resmî kaynak güncellemesiyle değişen yükümlülük', 'erişim kaydında görülen beklenmeyen hareket',
      'iadelerde yoğunlaşan tek neden', 'maliyet kartındaki dönemsel sıçrama', 'teklif kayıplarında tekrarlanan itiraz',
      'stok sayımıyla sistem kaydı arasındaki fark', 'geri yükleme tatbikatındaki başarısız adım', 'enerji faturasındaki hacimden bağımsız artış',
      'teslim süresinin hedef aralığı aşması', 'müşteri kaybı görüşmesinde doğrulanan neden', 'model çıktısındaki kritik istisna',
      'yeni ürün denemesindeki düşük tekrar kullanımı', 'tedarikçi değerlendirmesindeki kanıt boşluğu', 'vardiyalar arasındaki performans ayrışması',
    ], 2),
    constraint: pick([
      'ek bütçe açmadan', 'müşteri deneyimini bozmadan', 'mevzuat kanıtını kaybetmeden', 'teslim tarihini riske atmadan',
      'çalışan yükünü artırmadan', 'veri minimizasyonunu koruyarak', 'nakit tamponunu tüketmeden', 'tek tedarikçiye bağımlılığı büyütmeden',
      'kalite eşiğini düşürmeden', 'kampanya etkisini organik taleple karıştırmadan', 'kişisel veriyi gereksiz işlemden geçirmeden',
      'üretimi durdurmadan', 'kritik erişim yetkisini genişletmeden', 'iade hakkını daraltmadan', 'fiyat algısını zedelemeden',
      'ölçüm tanımını dönem ortasında değiştirmeden', 'örneklemdeki uç kayıtları silmeden', 'varsayımı kesin sonuç gibi sunmadan',
      'iş güvenliği kontrolünü atlamadan', 'sözleşme sınırını aşmadan', 'marka vaadini belirsizleştirmeden',
      'stok tükenmesi riskini büyütmeden', 'insan onayını devre dışı bırakmadan', 'kaynak belgenin güncelliğini varsaymadan',
    ], 3),
    horizon: pick([
      'bir haftalık kontrol döngüsünde', 'iki haftalık sınırlı pilotta', 'otuz günlük karşılaştırma döneminde',
      'bir sonraki sipariş çevriminde', 'aylık yönetim toplantısından önce', 'çeyrek kapanışına kadar',
      'ilk yüz işlemde', 'son sekiz haftayı karşılaştırarak', 'üç ardışık kontrol noktasında',
      'bir vardiyalık gözlem penceresinde', 'sezon başlamadan önce', 'yeni sözleşme imzalanmadan önce',
      'ilk geri bildirim turunda', 'sonraki stok yenileme gününde', 'bir sonraki beyan döneminden önce',
      'pilotun ilk on iş gününde', 'iki farklı müşteri grubunda', 'aynı hacimli iki dönemi karşılaştırarak',
      'bir sonraki teslimat partisinde', 'sistem değişikliği devreye alınmadan önce', 'yönetim onayından önce',
      'ilk üç kullanım senaryosunda', 'yedekleme tatbikatı tamamlanana kadar', 'teklif geçerlilik süresi içinde',
    ], 4),
    counterMetric: pick([
      'müşteri şikâyeti', 'ilk seferde doğru tamamlama', 'nakit etkisi', 'teslim gecikmesi', 'iade nedeni',
      'kritik hata', 'çalışan iş yükü', 'veri eksikliği', 'birim katkı', 'tekrar satın alma',
      'stok dışı kalma', 'kontrol kanıtı', 'geri dönüş süresi', 'kalite sapması', 'yetkisiz erişim',
      'enerji yoğunluğu', 'tedarik değişkenliği', 'tahsilat günü', 'düzeltme maliyeti', 'belge tamlığı',
      'insan müdahalesi', 'müşteri kaybı', 'kapasite kullanımı', 'uyum istisnası',
    ], 5),
  }
}

function distinguishLens(base: Lens, topic: string, previousTopic: string, nextTopic: string): Lens {
  const lower = topic.toLocaleLowerCase('tr-TR')
  const scenario = scenarioFor(topic)
  return {
    ...base,
    definition: `${base.definition} Bu kursun sınırı “${previousTopic}” ile “${nextTopic}” başlıkları arasında özellikle korunur: ${topic}, kendi karar anı ve çıktısıyla ele alınır.`,
    decision: `${base.decision}; ${scenario.actor} bu seçimi ${scenario.horizon} yaparken ${previousTopic.toLocaleLowerCase('tr-TR')} ve ${nextTopic.toLocaleLowerCase('tr-TR')} kararlarını bunun yerine kullanmaz`,
    metric: `${lower} için ${base.metric}; dengeleyici sinyal ${scenario.counterMetric}`,
    evidence: `${topic} kapsamındaki ${base.evidence}; ayrıca ${scenario.trigger} için tarihli açıklama`,
    contrast: `${topic} çıktısını “${previousTopic}” veya “${nextTopic}” çıktısıyla birbirinin yerine kullanmamak`,
    artifact: `${topic} odaklı ${base.artifact}; ${scenario.actor} için ${scenario.horizon} kapanış bölümü`,
    caseContext: `${scenario.business}; ${scenario.actor}, ${scenario.trigger} sonrasında ${scenario.constraint} karar vermek zorunda`,
    failure: `${topic} kararını ${previousTopic.toLocaleLowerCase('tr-TR')} ya da ${nextTopic.toLocaleLowerCase('tr-TR')} ölçümüyle gerekçelendirmek veya ${scenario.constraint} sınırını ihlal etmek`,
  }
}

function stableNumbers(seed: string) {
  const hash = createHash('sha256').update(seed).digest()
  const baseline = 40 + hash[0] % 51
  const target = Math.min(98, baseline + 5 + hash[1] % 13)
  const volume = 80 + hash[2] % 221
  const unit = 20 + hash[3] % 181
  return { baseline, target, volume, unit }
}

function variant(seed: string, choices: string[]) {
  const index = createHash('sha256').update(seed).digest()[0] % choices.length
  return choices[index]
}

function personalizedVocabulary(topic: string) {
  const choose = (key: string, choices: string[]) => variant(`${topic}:${key}`, choices)
  return new Map<string, string>([
    ['karar sahibi', choose('decision-owner', ['karar yetkilisi', 'son kararı veren rol', 'karardan sorumlu yönetici', 'yetkili iş sahibi'])],
    ['veri sahibi', choose('data-owner', ['kayıt sorumlusu', 'veriyi üreten rol', 'veri sorumlusu', 'kaynak kayıt sahibi'])],
    ['kontrol tarihi', choose('review-date', ['gözden geçirme günü', 'ilk inceleme tarihi', 'sonuç değerlendirme zamanı', 'kontrol dönemi'])],
    ['baz çizgi', choose('baseline', ['başlangıç seviyesi', 'karşılaştırma tabanı', 'mevcut durum değeri', 'başlangıç referansı'])],
    ['kanıt kaynağı', choose('evidence-source', ['doğrulama dayanağı', 'kaynak kayıt', 'kanıt izi', 'kontrol verisi'])],
    ['kanıt', choose('evidence', ['dayanak', 'doğrulama kaydı', 'kanıt izi', 'teyit verisi'])],
    ['kapsam', choose('scope', ['inceleme sınırı', 'çalışma kapsamı', 'karar alanı', 'ölçüm sınırı'])],
    ['müdahale eşiği', choose('threshold', ['aksiyon sınırı', 'karar tetikleyicisi', 'müdahale seviyesi', 'eylem eşiği'])],
    ['hedef', choose('target', ['beklenen sonuç', 'amaçlanan aralık', 'karar hedefi', 'istenen seviye'])],
    ['gösterge', choose('metric', ['ölçüt', 'karar metriği', 'izleme değeri', 'performans sinyali'])],
    ['işletme verisi', choose('business-data', ['gerçek faaliyet kaydı', 'kuruma ait gerçekleşen veri', 'işletmenin güncel kaydı', 'gerçek işlem verisi'])],
    ['temsili vaka', choose('illustrative-case', ['öğretim senaryosu', 'temsili işletme örneği', 'yöntem vakası', 'örnek karar durumu'])],
    ['kontrol listesi', choose('checklist', ['doğrulama adımları', 'son kontrol maddeleri', 'tamamlama denetimi', 'uygulama kontrolü'])],
    ['karar kaydı', choose('decision-record', ['karar günlüğü', 'seçim tutanağı', 'karar izi', 'yönetim notu'])],
  ])
}

function personalizeText(value: string, topic: string) {
  let result = value
  for (const [source, replacement] of personalizedVocabulary(topic)) {
    result = result.replace(new RegExp(source, 'gi'), match => {
      if (match[0] === match[0].toLocaleUpperCase('tr-TR')) return replacement.toLocaleUpperCase('tr-TR')
      if (match[0] === match[0].toLocaleUpperCase('tr-TR').charAt(0) + match.slice(1)) {
        return replacement.charAt(0).toLocaleUpperCase('tr-TR') + replacement.slice(1)
      }
      return replacement
    })
  }
  return result
}

function coursePurpose(topic: string, category: string, lens: Lens) {
  return personalizeText(
    `${lens.definition} ${category} sorumluluğu taşıyan KOBİ yöneticisi, “${lens.failure}” sorununu çözmek üzere ${lens.decision}. ${topic} tanı kapısı ${lens.contrast}; ${topic} hesap kapısı “${lens.formula}”; ${topic} kanıt kapısı ${lens.evidence}; ${topic} başarı kapısı ${lens.metric}; ${topic} teslim kapısı ${lens.artifact}. Böylece katılımcı ${topic} hakkında yalnız bilgi edinmez, kararı kayıtlardan yeniden kurabilir ve uygulama sonucunu izleyebilir.`,
    topic,
  )
}

function outcomes(topic: string, lens: Lens) {
  const outcomeSets = [
    [
      `${topic} ile komşu yönetim konularını ayırarak ${lens.contrast}.`,
      `${lens.evidence} üzerinden “${lens.formula}” hesabını yeniden kurar; ${lens.metric} sonucundaki sapmayı açıklar.`,
      `${lens.decision}; seçimini risk, sorumlu ve inceleme tarihi içeren ${lens.artifact} ile savunur.`,
    ],
    [
      `${lens.failure.charAt(0).toUpperCase() + lens.failure.slice(1)} hatasını gerçek bir kayıtta teşhis eder.`,
      `${lens.metric} için veri kapsamını tanımlar ve ${lens.formula} ifadesini kontrol edilebilir biçimde uygular.`,
      `${lens.artifact} hazırlayarak ${lens.decision}; seçilmeyen alternatifi de gerekçelendirir.`,
    ],
    [
      `${topic} kararının sınırını “${lens.contrast}” ilkesiyle çizer.`,
      `${lens.evidence} içindeki eksik, tahmini ve doğrulanmış alanları ayırıp ${lens.metric} üretir.`,
      `${lens.decision}; uygulama eşiğini ve geri dönüş koşulunu ${lens.artifact} üzerinde gösterir.`,
    ],
    [
      `${lens.definition} tanımını bir işletme vakasında doğru ve yanlış örneklerle açıklar.`,
      `“${lens.formula}” hesabının pay, payda, dönem ve kapsam varsayımlarını denetler.`,
      `${lens.failure} riskini azaltan müdahaleyi seçer ve sonucu ${lens.artifact} olarak teslim eder.`,
    ],
    [
      `${topic} için kullanılan kaydın karar sorusuyla uyumunu ${lens.evidence} üzerinden sınar.`,
      `${lens.metric} değiştiğinde bunun gerçek etki mi yoksa kapsam değişikliği mi olduğunu ayırır.`,
      `${lens.decision}; kararın sahibini, eşiğini ve sonraki kontrolünü ${lens.artifact} içine işler.`,
    ],
  ]
  return variant(`${topic}:outcomes`, outcomeSets).map(value => personalizeText(value, topic))
}

function bibliography(sources: SourceRow[]) {
  return sources.slice(0, 4).map((row, index) => {
    const url = row.source.url ? `](${row.source.url})` : ']'
    return `${index + 1}. [${row.source.title}${url} — otorite: ${row.source.authorityLevel}.`
  }).join('\n')
}

function visualMarkdown(courseId: number, topic: string, lens: Lens) {
  return `![${topic} için ${lens.artifact} görseli](/academy-visuals/course-v3/course-${courseId}.svg)`
}

function roleContent(
  courseId: number,
  topic: string,
  category: string,
  roleIndex: number,
  code: string,
  lens: Lens,
  sources: SourceRow[],
  previousTopic: string,
  nextTopic: string,
) {
  const role = roleNames[Math.min(roleIndex, roleNames.length - 1)]
  const n = stableNumbers(`${code}:${topic}`)
  const opener = variant(code, [
    `${topic} konusunda ilk iş bir araç seçmek değil, kararın sınırını doğru çizmektir.`,
    `${topic} raporda görünen bir başlık olmaktan, davranışı değiştiren bir yönetime dönüştürülmelidir.`,
    `${topic} için iyi karar, tek bir sayıya değil; tanım, kanıt ve müdahale eşiğine dayanır.`,
    `${topic} işletmede çoğu zaman sonuç ortaya çıktıktan sonra konuşulur; bu ders erken sinyal kurar.`,
    `${topic} ancak kimin hangi veriye bakıp ne yapacağı açık olduğunda işletme yetkinliğine dönüşür.`,
  ])
  const common = `> **Kapsam notu:** Bu eğitim karar yöntemini öğretir. Temsili sayılar sektör ortalaması değildir. Vergi, hukuk, iş güvenliği veya teknik güvenlik etkisi bulunan konularda işlem günündeki resmî kaynak ve yetkili uzman ayrıca kontrol edilmelidir.`

  const sections = [
    `## Teşhis: kavramı doğru yere koy

${opener} **${lens.definition}** Bu tanımın yönetim değeri, ${lens.decision} kararını açık hale getirmesidir.

### Karıştırılmaması gereken sınır

${lens.contrast.charAt(0).toUpperCase() + lens.contrast.slice(1)} gerekir. ${topic} değerlendirmesinde kapsam; ürün, müşteri, kanal, süreç veya dönem olarak açıkça yazılır. Kanıt için ${lens.evidence} kullanılır. Bir sayı kaynaksızsa “ölçüm” değil, doğrulanacak varsayımdır.

${visualMarkdown(courseId, topic, lens)}

### Beş soruluk hızlı teşhis

| Teşhis sorusu | Güçlü kanıt |
|---|---|
| Karar tam olarak nedir? | ${lens.decision} |
| Ölçümün sınırı nedir? | dönem, kapsam ve hariç tutulanlar |
| Ana gösterge nedir? | ${lens.metric} |
| Hangi kayıt doğrular? | ${lens.evidence} |
| En yaygın bozulma nedir? | ${lens.failure} |

### Temsili vaka

${lens.caseContext}, ${topic.toLocaleLowerCase('tr-TR')} göstergesinde başlangıç değerini **${n.baseline}**, hedefi **${n.target}** olarak kaydediyor. Ekip önce rakamı iyileştirmeye çalışmak yerine tanımı ve veri sahibini doğruluyor. Kapsam dışı işlemler ayrılınca baz çizgi yeniden hesaplanıyor; böylece görünürdeki değişim ile gerçek iş sonucu birbirine karışmıyor.

### Ders çıktısı

Bir sayfalık **${lens.artifact}** taslağı oluştur: karar cümlesi, kapsam, kanıt, baz çizgi, hedef ve ilk kontrol tarihi. ${common}`,
    `## Ölçüm sistemi: sayıdan karara

${opener} Bu seviyede ${topic.toLocaleLowerCase('tr-TR')} için veri sözleşmesi kurulur. Sözleşme; alan adı, birim, kaynak sistem, sorumlu, yenileme sıklığı ve eksik veri davranışını içerir.

### Teknik bilgi ve formül

\`${lens.formula}\`

Formüldeki pay, payda, dönem ve para birimi sabitlenmeden dönem karşılaştırması yapılmaz. ${lens.metric} tek başına kullanılmaz; kaliteyi veya riski dengeleyen ikinci gösterge de aynı kartta tutulur.

${visualMarkdown(courseId, topic, lens)}

| Veri alanı | Tanım | Kaynak | Kontrol |
|---|---|---|---|
| baz çizgi | karar öncesi karşılaştırılabilir dönem | ${lens.evidence} | kapsam mutabakatı |
| hedef | ulaşılmak istenen aralık | karar sahibi | gerçekçilik kontrolü |
| gerçekleşen | aynı yöntemle hesaplanan sonuç | işlem kaydı | örneklem doğrulama |
| sapma nedeni | sonucu açıklayan sınıflı neden | olay/not kaydı | kanıt bağlantısı |

### Temsili hesap

${n.volume} uygun işlemden ${Math.round(n.volume * n.baseline / 100)} tanesi tanımlanan koşulu karşılıyor. Başlangıç oranı yaklaşık **%${n.baseline}**. Hedef **%${n.target}** ise kapanması gereken fark yaklaşık ${Math.max(1, Math.round(n.volume * (n.target - n.baseline) / 100))} işlemdir. Bu fark doğrudan para veya mevzuat sonucu değildir; çalışma yükünü görünür kılan temsili bir ölçektir.

### Veri kalite kapısı

- Aynı olay iki kez sayılmıyor.
- Eksik kayıt sıfır kabul edilmiyor.
- Dönemler aynı kapsamı kullanıyor.
- Uç değer silinmek yerine açıklanıyor.
- Sonucun sahibi ve kontrol tarihi yazılı.

Çıktı olarak **${lens.artifact}** içinde veri sözlüğü ve örnek hesap bulunmalıdır. ${common}`,
    `## Senaryo laboratuvarı: ödünleşimi görünür kıl

${opener} Tek tahmin yerine üç seçenek aynı ölçütlerle sınanır. Karar sorusu şudur: **${lens.decision}?**

### Karşılaştırılabilir senaryolar

| Senaryo | ${lens.metric} | Kaynak/çaba | Ana risk | Karar sinyali |
|---|---:|---:|---|---|
| koru | %${n.baseline} | düşük | ${lens.failure} sürer | baz çizgi |
| sınırlı pilot | %${Math.round((n.baseline + n.target) / 2)} | orta | örneklem küçük kalır | doğrula |
| kontrollü yayılım | %${n.target} | yüksek | yanlış varsayım ölçeklenir | pilot sonrası |

${visualMarkdown(courseId, topic, lens)}

### Duyarlılık kontrolü

\`${lens.formula}\`

Önce yalnız bir varsayımı değiştir. Ardından hacim, birim etki ve hata olasılığını birlikte stres et. Temsili olarak ${n.volume} işlemde her sapmanın ${n.unit} TL-etki birimi yarattığı varsayılırsa, senaryolar arası fark “kesin kazanç” değil kararın duyarlılık göstergesidir.

### Kırmızı takım soruları

1. Sonuç, kapsam değiştiği için mi iyileşti?
2. Bir müşteri, ürün veya dönem ortalamayı bozuyor mu?
3. ${lens.contrast} sınırı ihlal edildi mi?
4. İyileşme başka bir risk veya maliyeti büyütüyor mu?
5. Pilot hangi koşulda durdurulacak?

Karar kaydında seçilmeyen alternatifin gerekçesi de tutulur. Böylece ekip sonuç kötüleştiğinde hangi varsayıma döneceğini bilir. ${common}`,
    `## İşletme uygulaması: veriyi çalışma çıktısına çevir

${opener} Bu ders temsili örneği bırakıp son 30–90 günlük işletme verisine geçer. Amaç **${lens.artifact}** üretmektir.

${visualMarkdown(courseId, topic, lens)}

### Uygulama sprinti

1. **Kapsamı seç:** tek ürün, kanal, müşteri grubu veya süreçle başla.
2. **Kanıtı topla:** ${lens.evidence}.
3. **Hesabı kur:** \`${lens.formula}\`.
4. **Baz çizgiyi doğrula:** eksik ve tahmini kayıtları etiketle.
5. **İki müdahale tasarla:** düşük riskli pilot ile tam uygulamayı ayır.
6. **Karar eşiğini yaz:** ${lens.metric} hangi aralıkta davranışı değiştirecek?
7. **Kontrol tarihini koy:** sahip ve durdurma koşulu belirle.

### Doldurulmuş temsili örnek

${lens.caseContext}, ${n.volume} kaydı inceliyor. Başlangıç **%${n.baseline}**, hedef **%${n.target}**. Ekip birincil nedenleri üç sınıfta topluyor; en büyük sınıf için iki haftalık pilot başlatıyor. Pilot sahibi, kanıt kaynağı ve geri dönüş adımı karardan önce yazılıyor.

| Çalışma alanı | Yazılacak cevap |
|---|---|
| karar | ${lens.decision} |
| ana ölçüt | ${lens.metric} |
| doğrulama | ${lens.evidence} |
| yanlış yorum riski | ${lens.contrast} |
| teslim edilecek çıktı | ${lens.artifact} |

### Teslim kontrolü

Çalışma, yalnız tablo doldurulduğunda değil; bir başka kişi aynı kayıtlarla hesabı yeniden kurabildiğinde tamamdır. ${lens.failure.charAt(0).toUpperCase() + lens.failure.slice(1)} kabul edilmez. ${common}`,
    `## Yönetişim: kararı kişiden sisteme taşı

${opener} Ölçümün sürdürülebilir olması için sahiplik, yetki, eşik, ritim ve istisna yolu tanımlanır.

### Karar hakkı tablosu

| Rol | ${topic} sorumluluğu | Kanıt |
|---|---|---|
| veri sahibi | kaydı zamanında ve tanıma uygun üretir | ${lens.evidence} |
| kontrol sahibi | örneklem ve mutabakat yapar | kontrol kaydı |
| karar sahibi | eşiğe göre müdahaleyi seçer | karar notu |
| uygulama sahibi | eylemi tamamlar ve sonucu ölçer | kapanış kanıtı |

${visualMarkdown(courseId, topic, lens)}

### Eşik ve istisna tasarımı

\`${lens.formula}\`

Yeşil aralık normal işleyişi, sarı aralık neden incelemesini, kırmızı aralık ise önceden belirlenmiş müdahaleyi başlatır. Eşik tek bir kötü güne tepki vermemeli; fakat yüksek etkili istisnayı ortalamanın içinde de saklamamalıdır.

### Aylık gözden geçirme gündemi

1. ${lens.metric} ve dengeleyici gösterge.
2. Açık istisnalar ve geciken eylemler.
3. Değişen kapsam, veri veya dış koşul.
4. ${lens.failure} örüntüsünün tekrarı.
5. Standart, eşik veya sorumluluk güncellemesi.

### Denetim izi

**${lens.artifact}**; kullanılan veri sürümünü, hesap tarihini, kararı veren kişiyi, seçilmeyen alternatifi ve sonraki kontrolü taşımalıdır. ${lens.contrast.charAt(0).toUpperCase() + lens.contrast.slice(1)} yönetim standardının açık bir kontrol maddesidir. ${common}`,
  ]

  return personalizeText(`## ${topic}: bu dersin özgün karar çerçevesi

**Karar bağlamı:** ${lens.caseContext}. **Çözülecek hata:** ${lens.failure}. **Bu derste verilecek karar:** ${lens.decision}. **İzlenecek sinyal:** ${lens.metric}. **Teknik dayanak:** \`${lens.formula}\`. **Kullanılacak işletme kaydı:** ${lens.evidence}. **Ders sonunda üretilecek çıktı:** ${lens.artifact}. ${topic} çalışmasının değişmez sınırı şudur: ${lens.contrast}.

${sections[Math.min(roleIndex, sections.length - 1)]}

## Yakın konulardan ayrım

| Konu | Bu çalışmadaki rol | Birbirine karıştırılmaması gereken çıktı |
|---|---|---|
| ${previousTopic} | önceki/komşu karar alanı | ${previousTopic} için ayrı ölçüm ve sonuç |
| **${topic}** | bu dersin karar alanı | **${lens.artifact}** |
| ${nextTopic} | sonraki/komşu karar alanı | ${nextTopic} için ayrı uygulama çıktısı |

${topic}, ${previousTopic.toLocaleLowerCase('tr-TR')} veya ${nextTopic.toLocaleLowerCase('tr-TR')} ile ilişkili olabilir; yine de aynı soru, veri kapsamı ve başarı ölçütünü paylaşmak zorunda değildir. Kullanıcı önce “hangi kararı veriyorum?” sorusunu cevaplar, sonra yalnız o karara uygun ${lens.metric} değerini kullanır.

## ${topic} uygulama sınama kartı

Bu kart ${role.toLocaleLowerCase('tr-TR')} dersinin işletmeye aktarım kapısıdır:

| ${topic} kontrolü | Bu derste kabul edilen karşılık |
|---|---|
| ${topic} karar cümlesi | ${lens.decision} |
| ${topic} inceleme sınırı | ürün, müşteri, kanal, süreç ve dönem açıkça seçilir |
| ${topic} kaynak kaydı | ${lens.evidence} |
| ${topic} hesap kuralı | ${lens.formula} |
| ${topic} başarı sinyali | ${lens.metric} |
| ${topic} yanlış yorum testi | ${lens.contrast} |
| ${topic} hata alarmı | ${lens.failure} |
| ${topic} işletme bağlamı | ${lens.caseContext} |
| ${topic} teslim ürünü | ${lens.artifact} |
| ${topic} kapanış koşulu | yetkili iş sahibi, uygulama eşiği ve yeniden inceleme zamanı kaydedilir |

Kartın her satırı gerçek bir kayıtla doldurulmadan ${topic} uygulaması “tamamlandı” sayılmaz. Özellikle ${lens.failure} görülürse ekip sonucu savunmak yerine ${lens.evidence} kaydına geri döner; ${lens.metric} yeniden hesaplanır ve ${lens.artifact} üzerindeki seçim gerekçesi güncellenir.

## Kaynakça

${bibliography(sources)}

*Kaynaklar kavramsal çerçeveyi destekler. Temsili vaka değerleri kaynaklara veya sektör ortalamasına atfedilmez.*

### Kendi işletmene aktar

${topic} için bu dersteki yöntemi kullanırken önce ${lens.evidence} kayıtlarını hazırla. Ardından “${lens.decision}” cümlesini kendi ürünün, müşterin veya sürecin için yeniden yaz. Sonuç ${lens.artifact} içinde izlenebilir değilse ders tamamlanmış sayılmaz.

### ${topic} tamamlama beyanı

Çalışmayı kapatmadan önce şu cümleyi somut verilerle tamamla: “${lens.caseContext} bağlamında ${lens.metric} değerini izledim; ${lens.contrast}; bu nedenle ${lens.decision}. Seçimimin dayanağı ${lens.evidence}, teslim çıktısı ${lens.artifact} ve yeniden inceleme nedeni ${lens.failure} riskidir.” Bu beyan başka bir ekip üyesi tarafından kayıtlardan yeniden kurulabiliyorsa ${topic} öğrenme hedefi uygulamaya dönüşmüş demektir.`, topic)
}

function quiz(topic: string, role: string, lens: Lens, seed: string) {
  const n = stableNumbers(seed)
  return [
    { q: `${topic} karar dosyası açılırken hangi üç unsur birlikte tanımlanmalıdır?`, o: [`${topic} kapsamı, ${lens.metric} ve uygulama eşiği`, 'Yalnız faaliyet adedi', 'Rakibin kullandığı araç adı', 'Kaynağı bulunmayan tek tahmin'], a: `${topic} kapsamı, ${lens.metric} ve uygulama eşiği`, e: `${topic} kapsamı ölçümün sınırını, ${lens.metric} kararın sinyalini, eşik ise ekibin hangi durumda davranış değiştireceğini belirler.` },
    { q: `${lens.caseContext} bağlamındaki en tehlikeli ${topic} yorumu hangisidir?`, o: [lens.failure, lens.contrast, `${lens.evidence} kaydını tarih damgasıyla saklamak`, `${lens.metric} için başlangıç ile beklenen sonucu ayırmak`], a: lens.failure, e: `${lens.failure.charAt(0).toUpperCase() + lens.failure.slice(1)} görünürde düzenli bir rapor üretse de ${lens.decision} kararını kanıtsız bırakır.` },
    { q: `${n.volume} ${topic} kaydında başlangıç %${n.baseline}, beklenen sonuç %${n.target}. “${lens.formula}” uygulanmadan önce ne doğrulanır?`, o: [`${lens.evidence} kayıtlarının aynı tanım ve dönemi kullandığı`, 'Farkın kesin parasal kazanç olduğu', 'Eksik kayıtların otomatik olarak sıfır olduğu', 'Beklenen sonuca uymayan kayıtların silineceği'], a: `${lens.evidence} kayıtlarının aynı tanım ve dönemi kullandığı`, e: `${topic} hesabının veri sözleşmesi değişirse görünen fark iş sonucundan değil yöntem değişikliğinden doğabilir; bu nedenle kapsam ve dönem önce sabitlenir.` },
    { q: `${lens.artifact} hangi unsur eksikken denetlenebilir bir ${topic} yönetim aracına dönüşmez?`, o: [`${lens.decision} kararının sahibi, eşiği ve inceleme tarihi`, `Yalnız ${lens.visual} türünde renkli görsel`, 'Kaynağı belirsiz sektör oranı', 'Tek seferlik olumlu örnek'], a: `${lens.decision} kararının sahibi, eşiği ve inceleme tarihi`, e: `${lens.artifact}; ${lens.metric} değerini sorumluluk, uygulama koşulu ve tekrar eden inceleme ritmiyle birleştirmelidir.` },
    { q: `${role} dersindeki ${topic} vakası işletmeye nasıl aktarılır?`, o: [`Önce ${lens.evidence} ile yöntem sınanır, sonra temsili değerler gerçek kayıtlarla değiştirilir`, 'Örnek değer bütün sektör için norm kabul edilir', 'Sonuç resmî oran gibi yayımlanır', `${lens.evidence} yerine yalnız vaka metni kullanılır`], a: `Önce ${lens.evidence} ile yöntem sınanır, sonra temsili değerler gerçek kayıtlarla değiştirilir`, e: `${topic} vakası “${lens.formula}” yöntemini görünür kılar; işletmenin gerçek ${lens.metric} değerini kanıtlamaz.` },
  ].map(item => ({
    q: personalizeText(item.q, topic),
    o: item.o.map(option => personalizeText(option, topic)),
    a: personalizeText(item.a, topic),
    e: personalizeText(item.e, topic),
  }))
}

function flashcards(topic: string, lens: Lens) {
  return [
    { front: `${topic} kavramının işletme tanımı nedir?`, back: lens.definition, hint: 'Tanımı karar amacıyla ilişkilendir.' },
    { front: `${topic} hangi kararı destekler?`, back: `${lens.decision.charAt(0).toUpperCase() + lens.decision.slice(1)} kararını destekler.`, hint: 'Ölçüm davranışı değiştirmeli.' },
    { front: `${topic} için ana gösterge hangisidir?`, back: `${lens.metric}; kapsamı, dönemi ve veri sahibiyle birlikte tanımlanır.`, hint: 'Gösterge tek başına yeterli değildir.' },
    { front: `${topic} hesabında hangi teknik ifade kullanılır?`, back: `${lens.formula}. Pay, payda, dönem ve birim açık yazılır.`, hint: 'Formülün veri sözleşmesini unutma.' },
    { front: `${topic} için en güçlü kanıt nedir?`, back: `${lens.evidence}; tahmini veri ayrı etiketlenir.`, hint: 'Kayda geri dönülebilmeli.' },
    { front: `${topic} çalışmasının tamamlanma çıktısı nedir?`, back: `${lens.artifact}; seçenek, risk, sahip, eşik ve kontrol tarihini birlikte taşır.`, hint: 'Kararı yeniden kurulabilir yap.' },
  ].map(item => ({
    front: personalizeText(item.front, topic),
    back: personalizeText(item.back, topic),
    hint: personalizeText(item.hint, topic),
  }))
}

function task(topic: string, lens: Lens) {
  const result = {
    title: `${topic}: işletme karar dosyası`,
    description: `Kendi işletme verinizle bir ${lens.artifact} hazırlayın.`,
    instructions: `Son 30–90 günlük kapsamı seçin. ${lens.evidence} kayıtlarını kullanın. “${lens.formula}” hesabını kurun; baz çizgi, hedef, iki alternatif, ana risk, karar sahibi ve kontrol tarihini yazın. Eksik veya tahmini veriyi ayrı işaretleyin.`,
    exampleOutput: `Kapsam tek ürün ve son sekiz hafta olarak seçildi. Ana gösterge “${lens.metric}”. İki seçenek karşılaştırıldı; sınırlı pilot seçildi. Karar sahibi süreç yöneticisi, kontrol tarihi iki hafta sonra. Durdurma koşulu veri kalitesi veya dengeleyici göstergede bozulma.`,
    checklist: ['Kapsam ve dönem açık', 'Kanıt kaynağı bağlı', 'Hesap yeniden kurulabilir', 'En az iki seçenek karşılaştırılmış', 'Sahip, eşik ve kontrol tarihi yazılmış', 'Temsili ve gerçek veri ayrılmış'],
    rubric: '4 — Kanıtlı hesap, seçenek, risk, sahip ve kontrol eksiksiz. 3 — Karar kurulmuş, tek kanıt veya risk eksik. 2 — Ölçüm var, karar döngüsü eksik. 1 — Yalnız genel açıklama var.',
  }
  return {
    ...result,
    title: personalizeText(result.title, topic),
    description: personalizeText(result.description, topic),
    instructions: personalizeText(result.instructions, topic),
    exampleOutput: personalizeText(result.exampleOutput, topic),
    checklist: result.checklist.map(item => personalizeText(item, topic)),
    rubric: personalizeText(result.rubric, topic),
  }
}

function xml(value: string) {
  return value.replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!)
}

async function writeVisual(courseId: number, topic: string, lens: Lens) {
  const colors: Record<Lens['visual'], [string, string]> = {
    flow: ['#0f766e', '#ccfbf1'],
    matrix: ['#7c3aed', '#ede9fe'],
    bridge: ['#0369a1', '#e0f2fe'],
    timeline: ['#b45309', '#fef3c7'],
    funnel: ['#be123c', '#ffe4e6'],
    scorecard: ['#166534', '#dcfce7'],
  }
  const [accent, soft] = colors[lens.visual]
  const labels = [lens.metric, 'Kanıt', 'Karar eşiği', lens.artifact].map(value => xml(value.length > 34 ? `${value.slice(0, 31)}…` : value))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620" role="img" aria-labelledby="title desc">
  <title id="title">${xml(topic)} karar haritası</title>
  <desc id="desc">${xml(lens.definition)} Dört aşama: gösterge, kanıt, karar eşiği ve çalışma çıktısı.</desc>
  <rect width="1200" height="620" rx="28" fill="#f8fafc"/>
  <rect x="42" y="42" width="1116" height="118" rx="20" fill="${accent}"/>
  <text x="78" y="94" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="white">${xml(topic)}</text>
  <text x="78" y="132" font-family="Arial, sans-serif" font-size="20" fill="white">Karar akışı · ${xml(lens.visual)}</text>
  ${labels.map((label, index) => {
    const x = 56 + index * 284
    return `<rect x="${x}" y="230" width="244" height="190" rx="20" fill="${soft}" stroke="${accent}" stroke-width="3"/>
    <circle cx="${x + 44}" cy="274" r="22" fill="${accent}"/><text x="${x + 44}" y="282" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="white">${index + 1}</text>
    <text x="${x + 122}" y="335" text-anchor="middle" font-family="Arial" font-size="19" font-weight="700" fill="#0f172a">${label}</text>${index < 3 ? `
    <path d="M${x + 246} 325 H${x + 278}" stroke="${accent}" stroke-width="5"/><path d="M${x + 270} 314 L${x + 282} 325 L${x + 270} 336" fill="none" stroke="${accent}" stroke-width="5"/>` : ''}`
  }).join('\n')}
  <text x="600" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" fill="#334155">${xml(lens.decision)}</text>
  <text x="600" y="558" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#64748b">LocalAkademi · Kurs ${courseId} · temsili karar görseli</text>
</svg>`
  const directory = resolve('frontend/public/academy-visuals/course-v3')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, `course-${courseId}.svg`), svg, 'utf8')
}

async function main() {
  const courses = await prisma.course.findMany({
    where: { sourceType: 'topic' },
    orderBy: { id: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          knowledgeObject: {
            include: {
              sources: { include: { source: true } },
              quizzes: { orderBy: { createdAt: 'asc' }, include: { questions: true } },
              flashcards: true,
              taskTemplates: { orderBy: { createdAt: 'asc' } },
              versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
          },
        },
      },
    },
  })
  if (courses.length !== 200) throw new Error(`Expected 200 topic courses, received ${courses.length}`)
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } })
  if (!admin) throw new Error('Admin user is required for version history')

  let koCount = 0
  for (const course of courses) {
    const topic = cleanTitle(course.title)
    const categoryCourses = courses.filter(item => item.category === course.category)
    const categoryIndex = categoryCourses.findIndex(item => item.id === course.id)
    const previousTopic = cleanTitle(categoryCourses[categoryIndex - 1]?.title || `${course.category} başlangıç çerçevesi`)
    const nextTopic = cleanTitle(categoryCourses[categoryIndex + 1]?.title || `${course.category} uygulama çerçevesi`)
    const lens = distinguishLens(lensFor(topic, course.category), topic, previousTopic, nextTopic)
    const purpose = coursePurpose(topic, course.category, lens)
    const courseOutcomes = outcomes(topic, lens)
    const validLessons = course.lessons.filter(lesson => lesson.knowledgeObject)
    if (!validLessons.length) throw new Error(`Course ${course.id} has no knowledge object lessons`)
    for (const lesson of validLessons) {
      if (lesson.knowledgeObject!.sources.length < 2) throw new Error(`${lesson.knowledgeObject!.code}: fewer than two sources`)
    }
    if (!apply) {
      koCount += validLessons.length
      continue
    }

    await writeVisual(course.id, topic, lens)
    await prisma.course.update({
      where: { id: course.id },
      data: {
        title: topic,
        description: `${purpose} Beş ders; teşhis, ölçüm, senaryo, gerçek işletme uygulaması ve yönetişim sırasıyla ilerler.`,
        outcomes: JSON.stringify(courseOutcomes),
        estimatedMinutes: validLessons.length * 18,
        published: true,
      },
    })

    for (let index = 0; index < validLessons.length; index += 1) {
      const lesson = validLessons[index]
      const ko = lesson.knowledgeObject!
      const role = roleNames[Math.min(index, roleNames.length - 1)]
      const content = roleContent(course.id, topic, course.category, index, ko.code || String(ko.id), lens, ko.sources, previousTopic, nextTopic)
      const summary = `${topic} için ${role.toLocaleLowerCase('tr-TR')} düzeyinde ${lens.decision}; çalışma çıktısı ${lens.artifact}.`
      const questions = quiz(topic, role, lens, ko.code || String(ko.id))
      const cards = flashcards(topic, lens)
      const work = task(topic, lens)
      const oldMetadata = json(ko.metadata)
      if (
        ko.content === content &&
        oldMetadata.qualityStandard === 'course-quality-v3' &&
        oldMetadata.coursePurpose === purpose
      ) {
        koCount += 1
        continue
      }

      await prisma.$transaction(async tx => {
        const oldMeta = json(ko.metadata)
        const metadata = {
          ...oldMeta,
          summary,
          coursePurpose: purpose,
          courseOutcomes,
          targetRole: 'KOBİ sahibi, yönetici veya konu sorumlusu',
          businessStage: 'kuruluş, doğrulama, büyüme ve iyileştirme',
          solvedProblem: lens.failure,
          countryCode: 'TR',
          language: 'tr',
          contentArchetype: lens.visual,
          visualAsset: `/academy-visuals/course-v3/course-${course.id}.svg`,
          levelRole: ['diagnose', 'measure', 'scenario', 'apply', 'govern'][index] || 'apply',
          qualityStandard: 'course-quality-v3',
          editorialState: 'published-owner-authorized-v3',
          contentVersion: Math.max(Number(oldMeta.contentVersion || 1) + 1, 5),
          sourcePolicy: 'linked-source-bibliography-no-unsupported-current-rates',
          upgradedAt: now.toISOString(),
        }
        const version = await tx.knowledgeObjectVersion.create({
          data: {
            koId: ko.id,
            versionNumber: (ko.versions[0]?.versionNumber || 0) + 1,
            changes: JSON.stringify({
              standard: 'course-quality-v3',
              contentHash: createHash('sha256').update(content).digest('hex'),
              coursePurpose: purpose,
              visualAsset: metadata.visualAsset,
            }),
            createdBy: admin.id,
          },
        })
        await tx.knowledgeObject.update({
          where: { id: ko.id },
          data: {
            title: `${topic} — ${role}`,
            summary,
            content,
            metadata: JSON.stringify(metadata),
            status: 'published',
            verificationStatus: 'verified',
            currentVersionId: version.id,
            publishedAt: ko.publishedAt || now,
          },
        })
        await tx.lesson.update({
          where: { id: lesson.id },
          data: { title: `${topic} — ${role}`, content, estimatedMinutes: 18 },
        })

        let canonicalQuiz = ko.quizzes[0]
        if (canonicalQuiz) {
          canonicalQuiz = await tx.quiz.update({
            where: { id: canonicalQuiz.id },
            data: { title: `${topic} — ${role} Öğretici Quiz`, passScore: 80, status: 'published' },
          })
        } else {
          canonicalQuiz = await tx.quiz.create({
            data: { koId: ko.id, title: `${topic} — ${role} Öğretici Quiz`, passScore: 80, status: 'published' },
          })
        }
        if (ko.quizzes.length > 1) {
          await tx.quiz.updateMany({ where: { id: { in: ko.quizzes.slice(1).map(item => item.id) } }, data: { status: 'archived' } })
        }
        await tx.quizQuestion.deleteMany({ where: { quizId: canonicalQuiz.id } })
        await tx.quizQuestion.createMany({
          data: questions.map((question, questionIndex) => ({
            quizId: canonicalQuiz.id,
            questionText: question.q,
            options: JSON.stringify(question.o),
            correctAnswer: question.a,
            explanation: question.e,
            order: questionIndex + 1,
          })),
        })

        for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
          const card = cards[cardIndex]
          await tx.flashcard.upsert({
            where: { koId_order: { koId: ko.id, order: cardIndex + 1 } },
            create: { koId: ko.id, order: cardIndex + 1, status: 'published', ...card },
            update: { status: 'published', ...card },
          })
        }
        await tx.flashcard.deleteMany({ where: { koId: ko.id, order: { gt: cards.length } } })

        const taskData = {
          title: work.title,
          description: work.description,
          instructions: work.instructions,
          exampleOutput: work.exampleOutput,
          checklist: JSON.stringify(work.checklist),
          rubric: work.rubric,
          estimatedTime: 35,
        }
        if (ko.taskTemplates[0]) {
          await tx.taskTemplate.update({ where: { id: ko.taskTemplates[0].id }, data: taskData })
        } else {
          await tx.taskTemplate.create({ data: { koId: ko.id, ...taskData } })
        }
      })
      koCount += 1
    }
    console.log(`[COURSE-V3] ${course.id}/203 ${topic} — ${validLessons.length} lessons`)
  }
  console.log(`[COURSE-V3] ${apply ? 'APPLIED' : 'DRY RUN'} — ${courses.length} courses, ${koCount} knowledge objects`)
}

main()
  .catch(error => {
    console.error(`[COURSE-V3] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
