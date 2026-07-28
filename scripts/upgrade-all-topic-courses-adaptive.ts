import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const now = new Date()
const accessDate = '28.07.2026'
const preservedStandards = new Set(['adaptive-operational-v1', 'knowledge-v2'])

const curatedLegacyPaths = [
  {
    title: 'E-ticaret Maliyet ve Kârlılık',
    description: 'Gerçek birim maliyetten kanal seçimi, stok, iade ve kampanya kararına uzanan 10 derslik uygulamalı e-ticaret kârlılık yolu.',
    codes: ['CUR-021-04', 'CUR-026-04', 'CUR-034-04', 'CUR-038-04', 'CUR-041-01', 'CUR-042-02', 'CUR-043-03', 'CUR-046-04', 'CUR-049-04', 'CUR-056-05'],
    outcomes: ['Gerçek maliyet ve kanal sonrası katkıyı hesaplamak', 'E-ticaret akışındaki maliyet ve risk noktalarını yönetmek', 'Kampanya, stok ve iade kararını kanıtla vermek'],
  },
  {
    title: 'Nakit Akışı Yönetimi',
    description: 'Kâr–nakit farkından tahsilat, ödeme, bütçe, rezerv ve nakit dengesine ilerleyen; gerçek işletme verisi ve kontrol eşikleri kullanan 10 derslik işletme nakit yönetimi yolu.',
    codes: ['CUR-001-01', 'CUR-001-02', 'CUR-001-03', 'CUR-001-04', 'CUR-001-05', 'CUR-007-02', 'CUR-008-02', 'CUR-009-03', 'CUR-010-04', 'CUR-016-05'],
    outcomes: ['Kâr ile nakit hareketini ayırmak', 'Tahsilat ve ödeme zamanlamasını görünür kılmak', 'Bütçe, rezerv ve müdahale eşikleri kurmak'],
  },
  {
    title: 'Vergi ve Yasal Yükümlülükler',
    description: 'Fatura akışından vergi, tüketici, mesafeli satış, gizlilik ve beyan kontrollerine ilerleyen 10 derslik kaynaklı uyum yolu.',
    codes: ['CUR-061-01', 'CUR-062-02', 'CUR-064-03', 'CUR-065-04', 'CUR-066-05', 'CUR-067-01', 'CUR-069-02', 'CUR-070-03', 'CUR-071-04', 'CUR-076-05'],
    outcomes: ['Yükümlülük, tarih, sorumlu ve kanıtı eşlemek', 'Fatura ve vergi kontrollerini güncel kaynakla yürütmek', 'Tüketici, satış ve gizlilik risklerinde uzmanlık sınırını tanımak'],
  },
]

type SourceSpec = {
  key: string
  title: string
  url: string
  authorityLevel: string
  lastChecked: string
  reviewCadenceDays?: number
}

type DomainProfile = {
  id: string
  archetype: string
  metrics: string[]
  artifact: string
  decision: string
  evidence: string
  sourceKeys: string[]
  caution?: string
}

type GeneratedSpec = {
  courseId: number
  courseTitle: string
  courseDescription: string
  courseOutcomes: string[]
  koId: number
  koCode: string
  title: string
  summary: string
  content: string
  minutes: number
  levelRole: string
  profile: DomainProfile
  sources: SourceSpec[]
  quiz: Array<{ q: string; o: string[]; a: string; e: string }>
  cards: Array<{ front: string; back: string; hint: string }>
  task: {
    title: string
    description: string
    instructions: string
    exampleOutput: string
    checklist: string[]
    rubric: string
  }
}

const levelLabels = ['Başlangıç', 'Orta', 'İleri', 'Uygulama', 'Uzman', 'Temel']
const levelRoles = [
  {
    role: 'temel-teshis',
    label: 'Temel ve Teşhis',
    purpose: 'kavramın sınırını belirlemek ve işletmenin bugünkü durumunu görünür kılmak',
    action: 'mevcut durumu tek sayfalık başlangıç fotoğrafına dönüştür',
    control: 'tanımların, veri döneminin ve kapsamın herkes tarafından aynı anlaşılması',
  },
  {
    role: 'surec-olcum',
    label: 'Süreç ve Ölçüm',
    purpose: 'işin nasıl aktığını ve hangi ölçümün kararı taşıdığını kurmak',
    action: 'veri kaynağı, sorumlu ve ölçüm sıklığı tanımlı bir çalışma sistemi kur',
    control: 'pay, payda, zaman damgası ve veri sahibinin açık olması',
  },
  {
    role: 'senaryo-odunlesim',
    label: 'Senaryo ve Ödünleşim',
    purpose: 'tek doğru varsaymak yerine seçeneklerin sonuçlarını karşılaştırmak',
    action: 'en az üç senaryoyu aynı ölçütlerle karşılaştır ve karar gerekçesini yaz',
    control: 'en iyi, beklenen ve stres senaryolarının aynı kapsamla hesaplanması',
  },
  {
    role: 'isletme-uygulamasi',
    label: 'İşletme Uygulaması',
    purpose: 'kavramı kullanıcının gerçek işletme verisiyle çalışan bir karara çevirmek',
    action: 'son 30–90 günlük gerçek veriyle çalışma çıktısını tamamla',
    control: 'temsili verinin gerçek veriden ayrılması ve varsayımların belgelenmesi',
  },
  {
    role: 'yonetisim-olcekleme',
    label: 'Yönetişim ve Ölçekleme',
    purpose: 'kararı kişiye bağlı olmaktan çıkarıp tekrarlanabilir bir yönetime dönüştürmek',
    action: 'sahip, eşik, kontrol ritmi ve istisna yolunu tanımla',
    control: 'karar eşiği aşıldığında kimin ne yapacağının önceden yazılması',
  },
]

const profiles: Record<string, DomainProfile> = {
  finance: {
    id: 'finance',
    archetype: 'finansal-simulasyon',
    metrics: ['dönemsel nakit farkı', 'tahsilat/ödeme vadesi', 'sapma oranı'],
    artifact: 'senaryo ve nakit karar tablosu',
    decision: 'hangi finansal hareketin ne zaman ve hangi sınır içinde yapılacağı',
    evidence: 'banka hareketi, fatura, ödeme planı ve dönem mutabakatı',
    sourceKeys: ['SRC-FIN-001', 'SRC-FIN-002', 'SRC-FIN-003'],
  },
  margin: {
    id: 'margin',
    archetype: 'finansal-simulasyon',
    metrics: ['birim katkı', 'satış marjı', 'başabaş hacmi'],
    artifact: 'maliyet–fiyat–marj duyarlılık tablosu',
    decision: 'fiyatın, indirimin veya maliyet değişiminin kabul edilip edilmeyeceği',
    evidence: 'ürün maliyet kartı, kanal kesintisi ve gerçekleşen satış',
    sourceKeys: ['SRC-FIN-001', 'SRC-FIN-003', 'SRC-FIN-004'],
  },
  ecommerce: {
    id: 'ecommerce',
    archetype: 'surec-haritasi',
    metrics: ['sipariş çevrim süresi', 'dönüşüm oranı', 'iade oranı'],
    artifact: 'müşteri tıklamasından teslimata süreç haritası',
    decision: 'hangi kanal veya süreç adımının önce iyileştirileceği',
    evidence: 'sipariş zaman damgaları, kanal raporu ve iade nedeni',
    sourceKeys: ['SRC-ECOM-001', 'SRC-LAW-001', 'SRC-LAW-003'],
    caution: 'Platform koşulları ve tüketici yükümlülükleri değişebilir; güncel sözleşme ve resmî metin ayrıca kontrol edilmelidir.',
  },
  compliance: {
    id: 'compliance',
    archetype: 'uyum-zaman-cizelgesi',
    metrics: ['zamanında tamamlanma', 'kanıt bütünlüğü', 'açık istisna sayısı'],
    artifact: 'yükümlülük–tarih–sorumlu–kanıt zaman çizelgesi',
    decision: 'hangi yükümlülüğün kim tarafından ve hangi kanıtla kapatılacağı',
    evidence: 'güncel resmî metin, beyan/başvuru kaydı ve tarihli kontrol',
    sourceKeys: ['SRC-TAX-001', 'SRC-TAX-002', 'SRC-TAX-003', 'SRC-LAW-004', 'SRC-LAW-005', 'SRC-LAW-006'],
    caution: 'Bu eğitim genel bilgilendirmedir; somut hukuk, vergi veya sosyal güvenlik görüşü değildir. Güncel mevzuat ve yetkili uzman kontrolü gerekir.',
  },
  entrepreneurship: {
    id: 'entrepreneurship',
    archetype: 'is-modeli-kanvasi',
    metrics: ['doğrulanan varsayım', 'müşteri görüşmesi', 'deney dönüşümü'],
    artifact: 'varsayım–kanıt–deney karar matrisi',
    decision: 'hangi iş modeli varsayımının önce test edileceği',
    evidence: 'müşteri görüşmesi, teklif deneyi ve ödeme davranışı',
    sourceKeys: ['SRC-ENT-001', 'SRC-ENT-002', 'SRC-FIN-003'],
  },
  marketing: {
    id: 'marketing',
    archetype: 'deney-panosu',
    metrics: ['dönüşüm oranı', 'müşteri edinme maliyeti', 'katkı sonrası reklam getirisi'],
    artifact: 'hipotez–kitle–mesaj–sonuç deney kartı',
    decision: 'hangi kampanya veya mesajın ölçekleneceği, değiştirileceği ya da durdurulacağı',
    evidence: 'dönüşüm olayı, harcama kaydı ve kanal sonrası katkı',
    sourceKeys: ['SRC-ENT-001', 'SRC-ECOM-001', 'SRC-MKT-001'],
    caution: 'Platform tanımları ve ölçüm modelleri değişebilir; güncel ürün dokümantasyonu kontrol edilmelidir.',
  },
  operations: {
    id: 'operations',
    archetype: 'surec-haritasi',
    metrics: ['çevrim süresi', 'ilk seferde doğru oranı', 'yeniden işleme'],
    artifact: 'mevcut durum–darboğaz–hedef durum süreç haritası',
    decision: 'hangi süreç adımının sadeleştirileceği veya standartlaştırılacağı',
    evidence: 'iş emri, zaman damgası, hata ve yeniden işleme kaydı',
    sourceKeys: ['SRC-OPS-001', 'SRC-OPS-002'],
  },
  people: {
    id: 'people',
    archetype: 'yetkinlik-matrisi',
    metrics: ['yetkinlik kapsama oranı', 'eylem kapanma süresi', 'gözlenebilir davranış'],
    artifact: 'rol–yetkinlik–kanıt–gelişim matrisi',
    decision: 'hangi rol veya güvenlik açığının önce geliştirileceği',
    evidence: 'gözlem, iş çıktısı, eğitim ve olay/ramak kala kaydı',
    sourceKeys: ['SRC-HR-001', 'SRC-HR-002', 'SRC-LAW-006'],
    caution: 'İş sağlığı, güvenliği ve istihdam yükümlülüklerinde güncel ulusal mevzuat ile uzman değerlendirmesi ayrıca gerekir.',
  },
  sales: {
    id: 'sales',
    archetype: 'musteri-senaryosu',
    metrics: ['aşama dönüşümü', 'kazanma oranı', 'satış çevrim süresi'],
    artifact: 'müşteri ihtiyacı–kanıt–teklif görüşme kartı',
    decision: 'müşteri için bir sonraki en doğru satış adımının ne olduğu',
    evidence: 'CRM aşaması, görüşme notu, teklif ve kayıp nedeni',
    sourceKeys: ['SRC-ENT-001', 'SRC-OPS-002', 'SRC-FIN-003'],
  },
  export: {
    id: 'export',
    archetype: 'ihracat-belge-akisi',
    metrics: ['belge tamlık oranı', 'uçtan uca teslim süresi', 'toplam teslim maliyeti'],
    artifact: 'pazar–belge–sorumlu–tarih ihracat kontrol akışı',
    decision: 'hedef pazara hangi şartlar ve kontrol kapılarıyla girileceği',
    evidence: 'resmî pazar gereği, ürün uygunluğu, teklif ve taşıma belgesi',
    sourceKeys: ['SRC-EXP-001', 'SRC-EXP-003', 'SRC-ECOM-001'],
    caution: 'Ürün, ülke ve teslim şekline göre kurallar değişir; işlem öncesinde güncel resmî gereklilikler doğrulanmalıdır.',
  },
  sustainability: {
    id: 'sustainability',
    archetype: 'kaynak-verimliligi',
    metrics: ['birim başına enerji/su', 'atık oranı', 'kanıt kapsama oranı'],
    artifact: 'baz çizgi–hedef–eylem–kanıt kaynak panosu',
    decision: 'hangi kaynak verimliliği girişiminin önce uygulanacağı',
    evidence: 'fatura/sayaç, üretim miktarı, atık ve faaliyet kaydı',
    sourceKeys: ['SRC-SUS-001', 'SRC-OPS-001', 'SRC-OPS-002'],
  },
  supply: {
    id: 'supply',
    archetype: 'tedarikci-matrisi',
    metrics: ['zamanında ve tam teslimat', 'teslim süresi değişkenliği', 'kusur oranı'],
    artifact: 'tedarikçi performans ve risk puan kartı',
    decision: 'hangi tedarikçiyle hangi koşulda devam edileceği veya alternatif geliştirileceği',
    evidence: 'sipariş, teslim, kalite kabulü ve fiyat/değişiklik kaydı',
    sourceKeys: ['SRC-OPS-001', 'SRC-OPS-002', 'SRC-RSK-001'],
  },
  cyber: {
    id: 'cyber',
    archetype: 'risk-kaydi',
    metrics: ['varlık kapsama oranı', 'kontrol uygulama oranı', 'kurtarma testi süresi'],
    artifact: 'varlık–tehdit–kontrol–sahip siber risk kaydı',
    decision: 'hangi siber riskin hangi kontrolle ve hangi sırada azaltılacağı',
    evidence: 'varlık envanteri, erişim kaydı, yama ve yedekten dönüş testi',
    sourceKeys: ['SRC-CYB-001', 'SRC-CYB-002', 'SRC-CYB-004'],
    caution: 'Kontrol listesi tek başına güvenlik garantisi değildir; işletmenin varlıkları ve tehditleri için teknik doğrulama gerekir.',
  },
  ai: {
    id: 'ai',
    archetype: 'risk-kaydi',
    metrics: ['kullanım değeri', 'hata/istisna oranı', 'insan inceleme kapsamı'],
    artifact: 'kullanım senaryosu–risk–kontrol–izleme yapay zekâ kaydı',
    decision: 'hangi yapay zekâ kullanımının hangi insan kontrolüyle devreye alınacağı',
    evidence: 'test örneği, hata kaydı, veri kaynağı ve insan onayı',
    sourceKeys: ['SRC-AI-001', 'SRC-AI-002', 'SRC-AI-003', 'SRC-RSK-001'],
    caution: 'Model çıktısı doğrulanmadan işlem, hukuk, insan veya finans kararının tek dayanağı yapılmamalıdır.',
  },
}

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

function cleanTopic(title: string) {
  let clean = title.replace(/\s*[—–-]\s*(Başlangıç|Orta|İleri|Uygulama|Uzman|Temel|Temel ve Teşhis|Süreç ve Ölçüm|Senaryo ve Ödünleşim|İşletme Uygulaması|Yönetişim ve Ölçekleme)\s*$/i, '').trim()
  clean = clean.replace(/\s*\((Başlangıç|Orta|İleri|Uygulama|Uzman|Temel|Temel ve Teşhis|Süreç ve Ölçüm|Senaryo ve Ödünleşim|İşletme Uygulaması|Yönetişim ve Ölçekleme)\)\s*$/i, '').trim()
  return clean || title.trim()
}

function chooseProfile(category: string, topic: string, code: string): DomainProfile {
  const text = `${category} ${topic} ${code}`.toLocaleLowerCase('tr-TR')
  if (/siber|parola|kimlik|yedek|fidye|oltalama|erişim|güvenlik/.test(text)) return profiles.cyber
  if (/yapay zek|ai |algorit|model riski|otomasyon/.test(text)) return profiles.ai
  if (/ihracat|ihrac|gümrük|menşe|dış ticaret|hedef pazar/.test(text)) return profiles.export
  if (/sürdürü|enerji|su |atık|karbon|kaynak verim/.test(text)) return profiles.sustainability
  if (/tedarik|satın alma|stok|lojistik|depo|envanter/.test(text)) return profiles.supply
  if (/iş sağ|iş güven|çalışan|işe al|yetkinlik|performans|ekip|insan/.test(text)) return profiles.people
  if (/satış|müşteri|crm|itiraz|teklif|sadakat|çapraz satış/.test(text)) return profiles.sales
  if (/vergi|fatura|defter|hukuk|sözleş|kvkk|gizlilik|sgk|mevzuat|şirket tür/.test(text)) return profiles.compliance
  if (/reklam|pazarlama|roas|dönüşüm|içerik|seo|sosyal medya|email|kampanya/.test(text)) return profiles.marketing
  if (/e-ticaret|pazar yeri|ürün liste|sipariş|kargo|iade|paketleme/.test(text)) return profiles.ecommerce
  if (/maliyet|marj|fiyat|kâr|kar |başabaş|gider/.test(text)) return profiles.margin
  if (/nakit|ciro|gelir|tahsilat|ödeme|bütçe|borç|rezerv|finans/.test(text)) return profiles.finance
  if (/girişim|iş fikri|iş modeli|startup|pazar araştır|rekabet|değer öner/.test(text)) return profiles.entrepreneurship
  if (/tedarik zinciri/.test(category.toLocaleLowerCase('tr-TR'))) return profiles.supply
  if (/operasyon|kalite|verim|süreç|kapasite|standart/.test(text)) return profiles.operations
  if (/pazarlama/.test(category.toLocaleLowerCase('tr-TR'))) return profiles.marketing
  return profiles.operations
}

function stableNumbers(code: string) {
  const hash = createHash('sha256').update(code).digest()
  const base = 80 + (hash[0] % 71)
  const volume = 120 + (hash[1] % 181)
  const current = 8 + (hash[2] % 23)
  const target = Math.max(3, current - (3 + hash[3] % 6))
  return { base, volume, current, target, result: volume * (current - target) }
}

function selectLevel(index: number, total: number) {
  if (total <= 3) return [levelRoles[0], levelRoles[1], levelRoles[4]][index] || levelRoles[0]
  return levelRoles[Math.min(index, levelRoles.length - 1)]
}

function buildArchetypeLab(topic: string, profile: DomainProfile) {
  const labs: Record<string, string> = {
    finance: `### Nakit masası

Bu çalışmada kayıtlar gerçekleşme tarihine göre bir nakit masasına alınır: beklenen giriş, beklenen çıkış, kesinlik düzeyi ve gerçekleşme tarihi. ${topic} ile ilgili tutar kadar **zamanlama farkı** da görünür tutulur. “Fatura kesildi” ile “para kullanılabilir bakiyeye geçti” aynı olay değildir.

Üç stres düğmesi kullan: tahsilatın gecikmesi, beklenmeyen ödeme ve satış hacminin değişmesi. Her düğmede en düşük bakiye ile müdahale tarihi yeniden hesaplanır. Karar yalnızca dönem sonu bakiyesine bakılarak verilmez; dönem içindeki en düşük nokta da kontrol edilir.`,
    margin: `### Katkı köprüsü

${topic} analizi için satış fiyatından başlayıp ürün maliyeti, işlemle değişen gider, kanal kesintisi ve beklenen kaybı ayrı basamaklarda göster. Böylece “kâr var” ifadesi hangi maliyet kapsamına göre söylendiği belli olan bir katkı köprüsüne dönüşür.

Fiyat, hacim ve maliyet aynı anda değiştirilmez. Önce bir değişken için duyarlılık aralığı kurulur; sonra birleşik stres senaryosu çalıştırılır. İndirim kararında ciro değil, yeni birim katkı ile eski toplam katkıyı korumak için gereken adet birlikte gösterilir.`,
    ecommerce: `### Sipariş izi

Bir siparişi müşterinin ilk temasından teslimat ve olası iadeye kadar izle. Her geçişe zaman damgası, sorumlu, kullanılan sistem ve hata nedeni ekle. ${topic} iyileştirmesi bu izdeki tek bir gecikme veya kopukluğu hedeflemelidir.

Kanal karşılaştırmasında yalnızca komisyon kullanılmaz. Veri sahipliği, iade iş yükü, teslim performansı, müşteri iletişimi ve kanal sonrası katkı aynı kartta değerlendirilir. Süreç değişikliği önce sınırlı sipariş grubunda denenir; müşteri hakkını veya kayıt bütünlüğünü zayıflatan hız artışı kabul edilmez.`,
    compliance: `### Uyum dosyası

${topic} için önce kapsam sorusu yazılır: kim, hangi işlem, hangi dönem ve hangi belge? Ardından yükümlülük, son tarih, sorumlu, onaylayan ve saklanacak kanıt tek satırda birleştirilir. Resmî metnin bağlantısı ve kontrol tarihi dosyada tutulur.

“Tamamlandı” işareti tek başına kanıt değildir. Beyan, gönderim makbuzu, sözleşme sürümü veya sistem kaydı gibi tekrar bulunabilir bir delil gerekir. İstisna oluştuğunda işletme içi çözüm ile yetkili uzman görüşü gerektiren durum ayrılır; eski oran ve tarihlerin otomatik kullanılmasına izin verilmez.`,
    entrepreneurship: `### Varsayım pazarı

${topic} başlığını doğrulanması gereken varsayımlara ayır: müşteri gerçekten bu sorunu yaşıyor mu, çözüm için davranış değiştiriyor mu, ödeme yapıyor mu ve işletme bunu sürdürülebilir biçimde sunabiliyor mu? Her varsayımın karşısına onu yanlışlayabilecek kanıt yazılır.

Görüşme sayısı sonuç değildir. Söylenen niyet ile gözlenen davranış ayrılır. Önce en yüksek belirsizlik ve en büyük kayıp riski taşıyan varsayım test edilir. Deney bittiğinde “başarılı/başarısız” yerine sürdür, değiştir veya bırak kararı ve bunu doğuran kanıt kaydedilir.`,
    marketing: `### Deney masası

${topic} için tek cümlelik bir hipotez kur: belirli kitleye, belirli mesaj ve teklif gösterildiğinde hangi davranışın neden değişmesi bekleniyor? Birincil ölçüt, koruyucu ölçüt ve durdurma eşiği deney başlamadan yazılır. Sonradan seçilen başarı metriği yanlılığı artırır.

Gösterim ve tıklama ara sinyaldir; işletme sonucu için dönüşüm, edinme maliyeti ve kanal sonrası katkı birlikte izlenir. Aynı anda kitle, teklif ve görsel değiştirilmez. Kazanan varyasyon yeni bir dönemde doğrulanmadan bütçe hızla büyütülmez; ölçüm penceresi ve atıf sınırı rapora eklenir.`,
    operations: `### Akış laboratuvarı

${topic} sürecini başlangıç olayı, bitiş olayı, iş adımları, beklemeler, geri dönüşler ve karar noktalarıyla çiz. İşlem süresi ile bekleme süresini ayır. Çoğu iyileştirmede sorun çalışan hızından değil, kuyruk, eksik bilgi veya yeniden işleme döngüsünden doğar.

Darboğaz seçilirken en uzun görünen adım değil, toplam akışı sınırlayan adım aranır. Küçük bir pilotta iş sırası veya kontrol noktası değiştirilir. Çevrim süresi iyileşirken hata ya da müşteri şikâyeti artıyorsa değişiklik dengeli sayılmaz; hedef akış standart işe dönüştürülmeden önce kanıtlanır.`,
    people: `### Davranış kanıtı

${topic} için soyut yetkinlik adı yerine iş üzerinde gözlenebilen davranış yaz. “İletişimi güçlü” yerine, hangi durumda hangi bilgiyi kime, ne sürede ve hangi doğrulukta aktardığı tanımlanır. Rolün kritik çıktıları ile güvenlik sorumlulukları aynı matriste görünür.

Değerlendirme tek kişinin genel izlenimine bırakılmaz; iş örneği, gözlem, sonuç ve gelişim görüşmesi birleştirilir. Açık puan çalışanı etiketlemek için değil, destek planını seçmek için kullanılır. İş sağlığı ve güvenliği konusuysa tehlikeyi kaynağında azaltma, çalışan katılımı ve kapanan eylem kanıtı önceliklidir.`,
    sales: `### Müşteri konuşma provası

${topic} görüşmesinde amaç ürünü anlatmak değil, müşterinin durumu, etkisi, önceliği ve karar ölçütünü anlamaktır. Açık uçlu soru, duyulanın özeti, kanıt ve mutabık kalınan sonraki adım ayrı alanlarda tutulur. Teklif, keşfedilmemiş ihtiyacın yerine geçmez.

İtiraz bir engel etiketiyle kapatılmaz; fiyat, güven, zamanlama, yetki veya uygunluk köklerinden hangisine dayandığı sınanır. CRM aşaması “görüşüldü” gibi faaliyet değil, müşteri tarafından doğrulanan kanıtla değişir. Kayıp nedenleri düzenli incelenir ve yalnızca satışçı yorumuna bırakılmaz.`,
    export: `### Sınır ötesi kontrol kapıları

${topic} akışını ürün uygunluğu, pazar gereği, sınıflandırma/menşe, ticari belge, teslim ve ödeme başlıklarına ayır. Her kapıda gereken resmî kaynak, belgenin sahibi, son kontrol tarihi ve geçememe halinde izlenecek yol yazılır.

Fiyat karşılaştırması fabrika çıkış tutarında bitmez; taşıma, sigorta, işlem, iade ve ödeme riski toplam teslim maliyetine eklenir. Ülke ve ürün gereklilikleri genellenmez. Pilot sevkiyatta belge tutarlılığı ve takip numarası uçtan uca doğrulanmadan ölçekleme yapılmaz.`,
    sustainability: `### Fiziksel baz çizgi

${topic} için önce fiziksel tüketim veya oluşum ölçülür: kWh, m³, kilogram ya da uygun faaliyet birimi. Toplam tüketim büyümeden etkilenebileceği için üretim, sipariş veya çalışma saati başına yoğunluk ayrıca hesaplanır. Tahmin ile sayaç/fatura kanıtı ayrılır.

İyileştirme seçenekleri maliyet, uygulanabilirlik, kaynak azaltımı ve kanıt kalitesiyle puanlanır. Bir alandaki azalma başka yere taşınan etkiyse gerçek kazanım sayılmaz. “Yeşil” iddiası ölçüm dönemi, kapsamı ve karşılaştırma tabanı olmadan yayımlanmaz; eylem sonrası baz çizgi aynı yöntemle tekrar ölçülür.`,
    supply: `### Tedarikçi kontrol kulesi

${topic} kararında birim fiyat tek başına kullanılmaz. Zamanında ve tam teslim, kusur, teslim süresi değişkenliği, iletişim ve kesinti etkisi aynı puan kartına alınır. Ölçüt ağırlıkları teklif görülmeden önce belirlenir; aksi halde sonuç istenen tedarikçiye göre eğilebilir.

Tek kaynak riski yalnızca alternatif isim listesiyle kapanmaz. Alternatifin numunesi, kapasitesi, geçiş süresi ve ticari şartı doğrulanır. Emniyet stoku, zayıf tedarik performansını sonsuza kadar gizleyen sabit sayı değil; talep ve teslim belirsizliği değiştikçe gözden geçirilen bir karar tamponudur.`,
    cyber: `### Kontrol kanıtı atölyesi

${topic} için önce korunacak varlık, iş etkisi, tehdit olayı ve mevcut kontrol yazılır. “Antivirüs var” gibi ürün adı yeterli değildir; kontrolün kapsamı, sahibi, son testi ve başarısızlık halinde müdahalesi kanıtlanır. En kritik varlıklar kurtarma ihtiyacına göre sıralanır.

Risk puanı kesin gerçek gibi kullanılmaz; önceliklendirme aracıdır. Önleme kadar algılama, müdahale ve kurtarma adımları da çalışılır. Yedek ancak geri dönüş testiyle, erişim kontrolü ise düzenli yetki incelemesiyle kanıtlanır. Tedarikçi erişimleri ve ayrılan çalışan hesapları ayrı istisna kuyruğunda izlenir.`,
    ai: `### İnsan gözetimli AI deneyi

${topic} kullanımını görev, beklenen değer, etkilenen kişi, veri ve başarısızlık sonucu ile tanımla. Model adı bir kullanım senaryosu değildir. Başarı ölçütü hız kadar doğruluk, istisna, yeniden işleme ve insan inceleme yükünü de kapsar.

Pilot örnekleri kolay vakalardan seçilmez; sınır ve hata örnekleri dâhil edilir. Yüksek etkili çıktıda insan onayı, durdurma yetkisi ve kayıt izi bulunur. Model veya veri değiştiğinde eski test sonucu otomatik geçerli sayılmaz. Kullanıcıya açıklanamayacak, doğrulanamayacak ya da güvenli biçimde geri alınamayacak otomasyon ölçeklenmez.`,
  }
  return labs[profile.id] || labs.operations
}

function buildLevelLab(topic: string, level: ReturnType<typeof selectLevel>, profile: DomainProfile) {
  if (level.role === 'temel-teshis') {
    return `## Teşhis çalışması: doğru soruyu kur

Bu seviyede çözüm seçmeden önce ${topic} için bir karar cümlesi yaz: “Hangi kapsamda, hangi kanıta bakarak, neyi değiştireceğiz?” Ardından beş satırlık mevcut durum kartı hazırla:

| Teşhis alanı | Yazılacak bilgi |
|---|---|
| Kapsam | dâhil ve hariç olanlar |
| Başlangıç | ilk ölçüm ve dönemi |
| Belirti | görülen sonuç |
| Olası neden | henüz kanıtlanmamış açıklama |
| Sonraki kanıt | nedeni doğrulayacak kayıt |

Belirtiyi neden sanma. ${profile.metrics[0]} kötüleşmiş olabilir; bu tek başına hangi müdahalenin doğru olduğunu söylemez. İki farklı olası neden yaz ve ikisini ayıracak en ucuz kanıtı seç. Teşhis çıktısı, çözüm fikrinden bağımsız okunabilmelidir.`
  }
  if (level.role === 'surec-olcum') {
    return `## Ölçüm sistemi: veriden karara

${topic} için veri sözlüğü oluştur. Her alanın adı, tanımı, birimi, kaynağı, sorumlusu ve güncellenme ritmi bulunmalıdır. Özellikle ${profile.metrics[0]} ile ${profile.metrics[1]} aynı zaman aralığı ve kapsamla üretilmelidir.

\`Ham kayıt → doğrulama → hesap → eşik kontrolü → karar → geri bildirim\`

Bu zincirin bir halkası sahipsizse ölçüm güvenilir değildir. Bir haftalık örnek üzerinde üç kayıt seçip kaynağa geri izle. Hesabı başka biri yeniden üretebiliyor mu kontrol et. Son olarak “metrik eşik dışına çıkarsa 24 saat/7 gün/30 gün içinde hangi karar tetiklenir?” sorusuna açık cevap yaz.`
  }
  if (level.role === 'senaryo-odunlesim') {
    return `## Senaryo masası: seçeneklerin bedeli

${topic} için üç senaryo kur: beklenen, stres ve kontrollü iyileştirme. Hepsinde aynı başlangıç verisini kullan. Değişen varsayımları ayrı satırda göster.

| Senaryo | Değişen varsayım | ${profile.metrics[0]} | Koruyucu ölçüt | Geri dönüş koşulu |
|---|---|---:|---|---|
| Beklenen | mevcut eğilim | hesapla | kalite/risk | baz |
| Stres | gecikme veya kayıp | hesapla | nakit/süre | eşik aşımı |
| İyileştirme | tek müdahale | hesapla | yan etki | pilot sonucu |

En yüksek puanı alan seçeneği otomatik seçme. Geri döndürülebilirlik, kanıt gücü ve uygulama kapasitesi zayıfsa küçük pilot tercih edilebilir. Karar notunda vazgeçilen seçeneğin nedenini de kaydet; bu, aynı tartışmanın tekrar başlamasını önler.`
  }
  if (level.role === 'isletme-uygulamasi') {
    return `## Saha görevi: gerçek veriyle bir çevrim

Son 30–90 günden ${topic} ile ilgili en az 20 kayıt seç. Kişisel bilgi ve ticari sırrı gereksiz yere kopyalama; yalnızca karar için gereken alanları kullan. Önce veri tamlığını ölç, sonra ${profile.metrics.join(', ')} göstergelerini hesapla.

Bir müdahale seç ve kapsamını küçük tut. Başlangıç değerini, uygulama tarihini ve beklenen değişimi önceden yaz. Uygulama sonunda yalnızca ortalamaya bakma: uç örnekleri, başarısız kayıtları ve istenmeyen yan etkiyi incele. Sonucu **sürdür / değiştir / durdur** kararıyla kapat ve kararın dayandığı iki kanıtı ekle.`
  }
  return `## Yönetişim tasarımı: kişiden sisteme

${topic} için bir RACI değil, karar hakkı tablosu oluştur: veriyi kim üretir, kim doğrular, eşik dışı durumda kim karar verir ve kim bilgilendirilir? Aynı kişide toplanan kritik görevler varsa ikinci kontrol veya örneklem incelemesi tanımla.

| Yönetim öğesi | Tasarım sorusu |
|---|---|
| Sahip | sonuçtan kim sorumlu? |
| Eşik | hangi değer müdahale başlatır? |
| Ritim | günlük, haftalık, aylık mı? |
| İstisna | normal akış çalışmazsa ne olur? |
| Öğrenme | karar sonrası standart nasıl güncellenir? |

Üç aylık inceleme takvimi kur. İlk toplantıda yalnızca skor değil; açık istisna, geciken eylem ve değişen varsayım ele alınır. Sistem büyüdükçe daha çok onay eklemek yerine, riskle orantılı kontrol ve açık yetki sınırı kullanılır.`
}

function buildContent(topic: string, code: string, level: ReturnType<typeof selectLevel>, profile: DomainProfile, sources: SourceSpec[]) {
  const n = stableNumbers(code)
  const metricRows = profile.metrics.map((metric, i) => `| ${metric} | ${i === 0 ? 'kararın ana sonucu' : i === 1 ? 'erken uyarı' : 'kalite kontrolü'} | haftalık/aylık, karara göre | veri sahibi + karar sahibi |`).join('\n')
  const sourceList = sources.map((source, i) => `${i + 1}. [${source.title}](${source.url}), erişim: ${accessDate}.`).join('\n')
  const caution = profile.caution ? `\n> **Kapsam uyarısı:** ${profile.caution}\n` : ''
  const levelFocus = level.role === 'temel-teshis'
    ? `Önce “${topic}” için ortak dili kur. Bir metriğin adını yazmak yetmez; kapsamını, dönemini, veri kaynağını ve sahibini belirt.`
    : level.role === 'surec-olcum'
      ? `Bu seviyede odak, “${topic}” kararını düzenli veriyle besleyen iş akışıdır. Ölçüm üretiliyor ama karar değişmiyorsa gösterge dekorasyona dönüşür.`
      : level.role === 'senaryo-odunlesim'
        ? `Bu seviyede tek tahmin yerine seçenekleri sınarsın. Her senaryoda aynı kapsamı koru; aksi halde görünen fark kararın değil, ölçüm yönteminin farkıdır.`
        : level.role === 'isletme-uygulamasi'
          ? `Bu seviyede temsili örneği bırakıp kendi işletmenin son 30–90 günlük verisine geçersin. Eksik veri varsa tahmini ayrıca işaretler ve doğrulama tarihini yazarsın.`
          : `Bu seviyede “${topic}” tek kişinin hafızasından çıkar. Eşik, yetki, inceleme ritmi ve istisna yolu yazılı hale gelir.`

  return `## Karar problemi

**${topic}** konusu, yalnızca tanım öğrenmek için değil; ${profile.decision} kararını daha tutarlı vermek için kullanılır. ${level.label} seviyesinin amacı ${level.purpose}. Bu dersin sonunda kullanıcı bir **${profile.artifact}** üretir.

${levelFocus}

${buildArchetypeLab(topic, profile)}

${buildLevelLab(topic, level, profile)}

## Kavramın çalışma sınırı

“${topic}” değerlendirmesi üç sınırla başlar:

1. **Kapsam:** Hangi ürün, müşteri, süreç, ekip veya dönem karara dâhil?
2. **Kanıt:** Sonucu destekleyen kayıt nedir? Bu konu için öncelikli kanıtlar: ${profile.evidence}.
3. **Karar:** Ölçüm hangi eşikte davranışı değiştirecek? Eşik yoksa rapor vardır, yönetim yoktur.

Kaynaklar ortak bir yön gösterir: küçük işletmede iyi uygulama, yalnızca araç satın almak değil; hedefi, sorumluluğu, ölçümü ve izlemeyi birlikte kurmaktır.[1] Bu cümle, kaynaklardaki çerçevelerin bu derse uyarlanmış eğitim yorumudur; işletmeye özgü sonucu kullanıcı verisi belirler.
${caution}
## Ölçüm kartı

| Ölçüt | Karardaki rolü | Önerilen ritim | Kanıt sahibi |
|---|---|---|---|
${metricRows}

Ölçüm kartında “yüksek iyidir” gibi belirsiz bir yön yerine, istenen aralık ve müdahale eşiği yazılır. Örneğin ${profile.metrics[0]} için yalnızca son değer değil, başlangıç çizgisi, hedef ve fark birlikte gösterilir. ${profile.metrics[1]} ise sonuç ortaya çıkmadan önce müdahale etmeyi sağlayan erken uyarı olarak izlenir.

## Temsili vaka: ${topic} kararı

> Aşağıdaki sayılar yalnızca yöntemi öğretmek için üretilmiş **temsili vakadır**; sektör ortalaması değildir.

Bir işletme ${n.volume} işlemden oluşan bir dönemde, ${topic.toLocaleLowerCase('tr-TR')} ile ilişkili ana göstergesini **${n.current}** olarak ölçüyor. Kabul edilen hedef **${n.target}**. Bir olayın yönetim etkisi temsili olarak ${n.base} TL kabul edildiğinde aradaki farkın görünür etkisi:

\`${n.volume} × (${n.current} − ${n.target}) = ${n.result.toLocaleString('tr-TR')} TL-etki birimi\`

Bu sonuç doğrudan muhasebe kaydı değildir. Karar sahibine “fark nereden geliyor?” sorusunu sordurur. Kök neden incelemesi şu sırada yapılır:

- kapsam veya veri tanımı değişti mi,
- tek bir müşteri/ürün/tedarikçi sonucu bozuyor mu,
- süreçte bekleme, hata ya da kontrol eksikliği var mı,
- iyileştirme başka bir metriği olumsuz etkiliyor mu?

| Seçenek | Beklenen yarar | Yan etki | Kanıt eşiği | Karar |
|---|---|---|---|---|
| A — mevcut yöntem | karşılaştırma tabanı | sorun sürer | iki dönem aynı tanım | baz çizgi |
| B — sınırlı pilot | düşük uygulama riski | örneklem küçük kalabilir | hedef metrikte görünür fark | test et |
| C — tam uygulama | hızlı ölçek | yanlış varsayımı büyütebilir | pilot + sorumlu onayı | koşullu |

## ${level.label} uygulama adımları

1. ${level.action.charAt(0).toUpperCase() + level.action.slice(1)}.
2. ${profile.metrics.join(', ')} ölçütleri için tanım, veri kaynağı ve dönem yaz.
3. Bugünkü durumu tek bir baz çizgide göster; eksik ve tahmini veriyi ayrı işaretle.
4. En az iki alternatif üret ve her alternatifi yarar, risk, maliyet/çaba ve kanıt açısından karşılaştır.
5. Kararı, sahibini, ilk kontrol tarihini ve durdurma/değiştirme koşulunu kaydet.

Bu adımlar tamamlandığında beklenen çıktı bir **${profile.artifact}** olur. Çıktı, bir başkasının aynı veriye bakarak hesabı ve karar gerekçesini yeniden kurabileceği kadar açık olmalıdır.

## Hata örüntüleri

- **Başlıkla yönetmek:** “${topic} iyileştirilecek” demek; ölçüt, sahip ve tarih vermemek.
- **Paydayı değiştirmek:** dönemler arasında farklı kapsam kullanıp sonucu eğilim gibi yorumlamak.
- **Faaliyeti sonuç sanmak:** toplantı veya eğitim sayısını gerçek iş sonucu yerine kullanmak.
- **Tek metrikle optimizasyon:** ${profile.metrics[0]} iyileşirken kalite, nakit, müşteri veya risk etkisini görmemek.
- **Kanıtsız kesinlik:** temsili sayıyı işletme gerçeği ya da sektör normu gibi sunmak.

## Karar ve kontrol kapısı

Dersi bitirmeden şu kontrolü yap:

- Karar cümlesi tek ve açık mı?
- Ölçütlerin payı, paydası, dönemi ve sahibi belli mi?
- Temsili veri ile işletme verisi ayrıldı mı?
- Seçeneklerin yan etkileri karşılaştırıldı mı?
- ${level.control.charAt(0).toUpperCase() + level.control.slice(1)} doğrulandı mı?
- İlk gözden geçirme tarihi ve istisna yolu yazıldı mı?

## Kaynakça

${sourceList}

*Kaynaklar çerçeveyi destekler; temsili vaka sayıları kaynaklara atfedilmez. Uygulama kararı işletmenin güncel verisi ve gerektiğinde yetkili uzman değerlendirmesiyle verilmelidir.*`
}

function buildQuiz(topic: string, level: ReturnType<typeof selectLevel>, profile: DomainProfile) {
  const artifact = profile.artifact
  return [
    {
      q: `${topic} çalışmasına başlamadan önce hangi bilgi kararı en çok netleştirir?`,
      o: ['Kapsam, dönem ve karar eşiği', 'Yalnızca konu başlığı', 'Rakibin logo rengi', 'Tek bir tahmini sayı'],
      a: 'Kapsam, dönem ve karar eşiği',
      e: 'Kapsam ve dönem ölçümün sınırını, eşik ise ölçüm sonucunda hangi davranışın değişeceğini belirler.',
    },
    {
      q: `${profile.metrics[0]} iki dönem arasında karşılaştırılırken en kritik kontrol hangisidir?`,
      o: ['Tanım ve kapsamın aynı kalması', 'Tablo renginin aynı olması', 'Her dönemde farklı payda kullanmak', 'Eksik veriyi sıfır saymak'],
      a: 'Tanım ve kapsamın aynı kalması',
      e: 'Tanım veya payda değişirse görünen fark performanstan değil ölçüm yönteminden kaynaklanabilir.',
    },
    {
      q: `${topic} için en kullanışlı çalışma çıktısı hangisidir?`,
      o: [artifact, 'Kaynağı olmayan genel bir paragraf', 'Sahibi ve tarihi olmayan görev listesi', 'Yalnızca toplam faaliyet sayısı'],
      a: artifact,
      e: `Bu konu arketipinde ${artifact}; kanıtı, seçeneği ve karar sahibini aynı görünümde birleştirir.`,
    },
    {
      q: `Temsili vakadaki sayılar nasıl kullanılmalıdır?`,
      o: ['Yöntemi anlamak için; gerçek kararda işletme verisiyle değiştirilerek', 'Sektör ortalaması olarak', 'Resmî mevzuat oranı olarak', 'Her işletmede değişmeden'],
      a: 'Yöntemi anlamak için; gerçek kararda işletme verisiyle değiştirilerek',
      e: 'Temsili vaka bir hesap veya karar yolunu öğretir; işletmenin gerçek sonucunu kanıtlamaz.',
    },
    {
      q: `${level.label} seviyesinde çalışma ne zaman tamamlanmış sayılır?`,
      o: ['Çıktı, sahip, eşik ve kontrol tarihi birlikte yazıldığında', 'Metin bir kez okunduğunda', 'Sadece bir seçenek düşünüldüğünde', 'Ölçüm yapılmadan karar verildiğinde'],
      a: 'Çıktı, sahip, eşik ve kontrol tarihi birlikte yazıldığında',
      e: 'Öğrenme, bilgiyi tekrarlamakla değil; izlenebilir bir iş çıktısı ve kontrol döngüsü kurmakla tamamlanır.',
    },
  ]
}

function buildCards(topic: string, level: ReturnType<typeof selectLevel>, profile: DomainProfile) {
  return [
    { front: `${topic} kararının üç başlangıç sınırı nedir?`, back: 'Kapsam, kararı destekleyen kanıt ve davranışı değiştirecek karar eşiğidir.', hint: 'Neyi, neyle, ne zaman?' },
    { front: `${topic} için ana çalışma çıktısı nedir?`, back: `Bu dersin ana çıktısı ${profile.artifact}; seçenek, kanıt, sahip ve kontrol tarihini birlikte gösterir.`, hint: profile.archetype },
    { front: `${profile.metrics[0]} nasıl güvenilir karşılaştırılır?`, back: 'Aynı tanım, kapsam, veri dönemi ve payda korunur; eksik veya tahmini veri ayrıca işaretlenir.', hint: 'Elmayla elmayı karşılaştır' },
    { front: `${topic} çalışmasında temsili vaka neyi kanıtlar?`, back: 'Yalnızca yöntemin nasıl uygulandığını gösterir; sektör ortalaması veya işletmenin gerçek sonucu değildir.', hint: 'Yöntem, gerçek değil' },
    { front: `${level.label} seviyesinin kontrol sorusu nedir?`, back: `${level.control.charAt(0).toUpperCase() + level.control.slice(1)} kontrol edilmelidir.`, hint: level.role },
    { front: `${topic} kararı nasıl tekrarlanabilir hale gelir?`, back: 'Karar sahibi, ölçüm tanımı, eşik, inceleme ritmi ve istisna yolu yazılı hale getirilir.', hint: 'Sahip + eşik + ritim' },
  ]
}

function buildTask(topic: string, level: ReturnType<typeof selectLevel>, profile: DomainProfile) {
  return {
    title: `${topic}: ${level.label} işletme çalışması`,
    description: `Kendi işletmende ${topic.toLocaleLowerCase('tr-TR')} için kullanılabilir bir ${profile.artifact} hazırla.`,
    instructions: `Son 30–90 günlük veriyi kullan. ${profile.metrics.join(', ')} ölçütlerini tanımla. Baz çizgiyi, en az iki seçeneği, karar eşiğini, sorumluyu ve ilk kontrol tarihini yaz. Eksik/tahmini veriyi ayrıca işaretle.`,
    exampleOutput: `${topic} için baz çizgi kaydedildi. Pilot seçenek seçildi; ana ölçüt “${profile.metrics[0]}”, karar eşiği hedefe iki dönem üst üste yaklaşmak. Sorumlu: süreç sahibi. İlk kontrol: 14 gün sonra. Kanıt: ${profile.evidence}.`,
    checklist: [
      'Kapsam ve veri dönemi yazıldı',
      'Ölçütlerin tanımı ve veri kaynağı belirtildi',
      'En az iki seçenek karşılaştırıldı',
      'Karar eşiği ve sorumlu belirlendi',
      'Kontrol tarihi ve istisna yolu yazıldı',
    ],
    rubric: 'Tam (4): işletme verisi, seçenek, eşik, sahip ve kontrol birlikte. İyi (3): tek kanıt veya yan etki eksik. Gelişiyor (2): ölçüm var fakat karar döngüsü eksik. Başlangıç (1): yalnızca genel açıklama var.',
  }
}

function validateSpec(spec: GeneratedSpec) {
  const failures: string[] = []
  if (spec.content.length < 2500) failures.push('content<2500')
  if (!spec.content.includes('## Kaynakça')) failures.push('source-section')
  if (!spec.content.includes('temsili vaka')) failures.push('case-label')
  if (spec.sources.length < 2) failures.push('sources<2')
  if (spec.quiz.length !== 5 || spec.quiz.some(item => item.e.length < 40)) failures.push('quiz')
  if (spec.cards.length !== 6 || spec.cards.some(item => item.front.length < 18 || item.back.length < 35 || !item.hint)) failures.push('cards')
  if (!spec.task.exampleOutput || spec.task.checklist.length < 5 || !spec.task.rubric) failures.push('task')
  if (/lorem ipsum|placeholder|sorusu\s*[1-9]|cevap\s*[a-d]/i.test(spec.content)) failures.push('placeholder')
  return failures
}

async function main() {
  const library = JSON.parse(readFileSync(resolve('SOURCE_LIBRARY_V1.json'), 'utf8')) as { sources: SourceSpec[] }
  const sourceByKey = new Map(library.sources.map(source => [source.key, source]))
  const courses = await prisma.course.findMany({
    where: { sourceType: 'topic' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { knowledgeObject: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  if (courses.length !== 200) throw new Error(`Beklenen 200 topic kursu yerine ${courses.length} bulundu.`)
  const linkedIds = courses.flatMap(course => course.lessons.map(lesson => lesson.knowledgeObjectId).filter((id): id is number => id !== null))
  const uniqueIds = new Set(linkedIds)
  if (uniqueIds.size !== 840) throw new Error(`Beklenen 840 benzersiz bağlı KO yerine ${uniqueIds.size} bulundu.`)

  const specs: GeneratedSpec[] = []
  let preserved = 0
  for (const course of courses) {
    const lessons = course.lessons.filter(lesson => lesson.knowledgeObject)
    if (!lessons.length) throw new Error(`Dersi olmayan topic kursu: ${course.id}`)
    const firstTopic = cleanTopic(lessons[0].knowledgeObject!.title)
    const courseTitle = firstTopic
    const profile = chooseProfile(course.category, firstTopic, lessons[0].knowledgeObject!.code)
    const courseOutcomes = [
      `${courseTitle} kararının kapsamını ve kanıtını tanımlamak`,
      `${profile.metrics.join(', ')} ölçütlerini işletme verisiyle kullanmak`,
      `${profile.artifact} hazırlayıp karar ve kontrol döngüsü kurmak`,
    ]
    const courseDescription = `${courseTitle} konusunda tanımdan uygulamaya ilerleyen; ${profile.artifact}, öğretici quiz, çift yüzlü kartlar ve işletme görevi içeren kaynaklı öğrenme yolu.`

    for (let index = 0; index < lessons.length; index++) {
      const ko = lessons[index].knowledgeObject!
      const existingMeta = parseJson(ko.metadata)
      if (preservedStandards.has(String(existingMeta.qualityStandard || ''))) {
        preserved += 1
        continue
      }
      const topic = cleanTopic(ko.title)
      const specificProfile = chooseProfile(course.category, topic, ko.code)
      const level = selectLevel(index, lessons.length)
      const sources = specificProfile.sourceKeys.map(key => sourceByKey.get(key)).filter((source): source is SourceSpec => Boolean(source)).slice(0, 3)
      const title = `${topic} — ${level.label}`
      const summary = `${topic} konusunda ${level.purpose}; çıktı olarak ${specificProfile.artifact} üretir.`
      const content = buildContent(topic, ko.code, level, specificProfile, sources)
      specs.push({
        courseId: course.id,
        courseTitle,
        courseDescription,
        courseOutcomes,
        koId: ko.id,
        koCode: ko.code,
        title,
        summary,
        content,
        minutes: level.role === 'isletme-uygulamasi' ? 18 : level.role === 'yonetisim-olcekleme' ? 16 : 14,
        levelRole: level.role,
        profile: specificProfile,
        sources,
        quiz: buildQuiz(topic, level, specificProfile),
        cards: buildCards(topic, level, specificProfile),
        task: buildTask(topic, level, specificProfile),
      })
    }
  }

  const failures = specs.flatMap(spec => validateSpec(spec).map(issue => `${spec.koCode}:${issue}`))
  if (failures.length) throw new Error(`Üretim kalite kapısı başarısız (${failures.length}): ${failures.slice(0, 20).join(', ')}`)
  const contentHashes = new Set(specs.map(spec => createHash('sha256').update(spec.content).digest('hex')))
  if (contentHashes.size !== specs.length) throw new Error(`İçerik hashleri benzersiz değil: ${contentHashes.size}/${specs.length}`)

  const archetypes = new Map<string, number>()
  specs.forEach(spec => archetypes.set(spec.profile.archetype, (archetypes.get(spec.profile.archetype) || 0) + 1))
  console.log(`[ADAPTIVE-V2] Kurs: ${courses.length}; bağlı KO: ${uniqueIds.size}; üretilecek: ${specs.length}; korunacak pilot: ${preserved}`)
  console.log(`[ADAPTIVE-V2] Benzersiz içerik: ${contentHashes.size}/${specs.length}`)
  console.log(`[ADAPTIVE-V2] Arketipler: ${JSON.stringify(Object.fromEntries(archetypes))}`)
  if (!apply) {
    console.log('[ADAPTIVE-V2] DRY RUN — veritabanı değiştirilmedi. Uygulamak için --apply kullanın.')
    return
  }

  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } })
  if (!admin) throw new Error('Yayın olayı için admin kullanıcı bulunamadı.')

  const sourceRows = new Map<string, { id: string }>()
  for (const source of library.sources) {
    const row = await prisma.source.findFirst({ where: { url: source.url } })
    const saved = row
      ? await prisma.source.update({ where: { id: row.id }, data: { title: source.title, authorityLevel: source.authorityLevel, lastChecked: new Date(source.lastChecked) } })
      : await prisma.source.create({ data: { title: source.title, url: source.url, authorityLevel: source.authorityLevel, lastChecked: new Date(source.lastChecked) } })
    sourceRows.set(source.key, saved)
  }

  for (const course of courses) {
    const courseSpecs = specs.filter(spec => spec.courseId === course.id)
    const allLessonMinutes = course.lessons.reduce((sum, lesson) => {
      const spec = courseSpecs.find(item => item.koId === lesson.knowledgeObjectId)
      return sum + (spec?.minutes || lesson.estimatedMinutes)
    }, 0)
    const representative = courseSpecs[0]
    const fallbackTopic = cleanTopic(course.lessons[0]?.knowledgeObject?.title || course.title)
    const fallbackProfile = chooseProfile(course.category, fallbackTopic, course.lessons[0]?.knowledgeObject?.code || '')
    const shellTitle = representative?.courseTitle || fallbackTopic
    const shellDescription = representative?.courseDescription || `${shellTitle} konusunda tanımdan uygulamaya ilerleyen; ${fallbackProfile.artifact}, öğretici quiz, çift yüzlü kartlar ve işletme görevi içeren kaynaklı öğrenme yolu.`
    const shellOutcomes = representative?.courseOutcomes || [
      `${shellTitle} kararının kapsamını ve kanıtını tanımlamak`,
      `${fallbackProfile.metrics.join(', ')} ölçütlerini işletme verisiyle kullanmak`,
      `${fallbackProfile.artifact} hazırlayıp karar ve kontrol döngüsü kurmak`,
    ]
    await prisma.course.update({
      where: { id: course.id },
      data: {
        title: shellTitle,
        description: shellDescription,
        outcomes: JSON.stringify(shellOutcomes),
        estimatedMinutes: allLessonMinutes,
        published: true,
      },
    })

    for (const spec of courseSpecs) {
      await prisma.$transaction(async tx => {
        const ko = await tx.knowledgeObject.findUniqueOrThrow({ where: { id: spec.koId } })
        const oldMeta = parseJson(ko.metadata)
        const volatile = spec.profile.id === 'compliance'
        const reviewDays = volatile ? 30 : ['marketing', 'ecommerce', 'export'].includes(spec.profile.id) ? 90 : 180
        const reviewDue = new Date(now.getTime() + reviewDays * 86_400_000)
        const metadata = {
          ...oldMeta,
          summary: spec.summary,
          estimatedMinutes: spec.minutes,
          estimatedTime: `${spec.minutes} dakika`,
          learningOutcomes: spec.courseOutcomes,
          contentArchetype: spec.profile.archetype,
          courseTopic: spec.courseTitle,
          levelRole: spec.levelRole,
          qualityStandard: 'adaptive-operational-v2-scaled',
          editorialState: 'published-scaled-v2',
          sourcePolicy: 'official-first-numbered-bibliography',
          contentVersion: Math.max(Number(oldMeta.contentVersion || 1), 4),
          illustrativeCasePolicy: 'labeled-not-benchmark',
          upgradedAt: now.toISOString(),
        }
        await tx.knowledgeObject.update({
          where: { id: spec.koId },
          data: {
            title: spec.title,
            summary: spec.summary,
            content: spec.content,
            metadata: JSON.stringify(metadata),
            status: 'published',
            verificationStatus: 'verified',
            reviewGate: volatile ? 'professional' : 'standard',
            publishedAt: ko.publishedAt || now,
            reviewDue,
          },
        })
        await tx.lesson.updateMany({
          where: { knowledgeObjectId: spec.koId },
          data: { title: spec.title, content: spec.content, estimatedMinutes: spec.minutes },
        })

        for (const source of spec.sources) {
          const sourceRow = sourceRows.get(source.key)
          if (!sourceRow) throw new Error(`Kaynak DB satırı yok: ${source.key}`)
          const relation = await tx.knowledgeObjectSource.findFirst({ where: { koId: spec.koId, sourceId: sourceRow.id } })
          const note = `Adaptive course v2: ${source.key}; ${spec.profile.id} arketipi kaynakçası`
          if (relation) await tx.knowledgeObjectSource.update({ where: { id: relation.id }, data: { relation: 'supports', note } })
          else await tx.knowledgeObjectSource.create({ data: { koId: spec.koId, sourceId: sourceRow.id, relation: 'supports', note } })
        }

        const quizzes = await tx.quiz.findMany({ where: { koId: spec.koId }, orderBy: { createdAt: 'asc' } })
        let quiz = quizzes[0]
        quiz = quiz
          ? await tx.quiz.update({ where: { id: quiz.id }, data: { title: `${spec.title} — Öğretici Quiz`, passScore: 80, status: 'published' } })
          : await tx.quiz.create({ data: { koId: spec.koId, title: `${spec.title} — Öğretici Quiz`, passScore: 80, status: 'published' } })
        if (quizzes.length > 1) {
          await tx.quiz.updateMany({ where: { id: { in: quizzes.slice(1).map(item => item.id) } }, data: { status: 'archived' } })
        }
        await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id } })
        await tx.quizQuestion.createMany({
          data: spec.quiz.map((question, index) => ({
            quizId: quiz.id,
            questionText: question.q,
            options: JSON.stringify(question.o),
            correctAnswer: question.a,
            explanation: question.e,
            order: index + 1,
          })),
        })

        for (let index = 0; index < spec.cards.length; index++) {
          const card = spec.cards[index]
          await tx.flashcard.upsert({
            where: { koId_order: { koId: spec.koId, order: index + 1 } },
            create: { koId: spec.koId, order: index + 1, status: 'published', ...card },
            update: { status: 'published', ...card },
          })
        }
        await tx.flashcard.deleteMany({ where: { koId: spec.koId, order: { gt: 6 } } })

        const tasks = await tx.taskTemplate.findMany({ where: { koId: spec.koId }, orderBy: { createdAt: 'asc' } })
        const taskData = {
          title: spec.task.title,
          description: spec.task.description,
          instructions: spec.task.instructions,
          exampleOutput: spec.task.exampleOutput,
          checklist: JSON.stringify(spec.task.checklist),
          rubric: spec.task.rubric,
          estimatedTime: 30,
        }
        if (tasks[0]) await tx.taskTemplate.update({ where: { id: tasks[0].id }, data: taskData })
        else await tx.taskTemplate.create({ data: { koId: spec.koId, ...taskData } })

        const priorEvent = await tx.publicationEvent.findFirst({
          where: { koId: spec.koId, action: 'published_adaptive_v2' },
        })
        if (!priorEvent) {
          await tx.publicationEvent.create({
            data: {
              koId: spec.koId,
              action: 'published_adaptive_v2',
              performedBy: admin.id,
              note: `Kullanıcı onayıyla ${spec.profile.archetype} arketipine yükseltildi; resmî kaynak öncelikli ölçekleme.`,
            },
          })
        }
      })
    }
    console.log(`[ADAPTIVE-V2] Güncellendi: ${course.id} — ${representative?.courseTitle || course.title} (${courseSpecs.length} KO)`)
  }

  for (const path of curatedLegacyPaths) {
    const legacyCourse = await prisma.course.findFirst({ where: { sourceType: 'legacy', title: path.title }, include: { lessons: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } } })
    if (!legacyCourse) throw new Error(`Küratörlü eski kurs bulunamadı: ${path.title}`)
    const pathKOs = await prisma.knowledgeObject.findMany({ where: { code: { in: path.codes } } })
    if (pathKOs.length !== path.codes.length) {
      const found = new Set(pathKOs.map(ko => ko.code))
      throw new Error(`${path.title} için eksik KO: ${path.codes.filter(code => !found.has(code)).join(', ')}`)
    }
    const orderedKOs = path.codes.map(code => pathKOs.find(ko => ko.code === code)!)
    await prisma.$transaction(async tx => {
      await tx.course.update({
        where: { id: legacyCourse.id },
        data: {
          description: path.description,
          outcomes: JSON.stringify(path.outcomes),
          estimatedMinutes: orderedKOs.reduce((sum, ko) => sum + Number(parseJson(ko.metadata).estimatedMinutes || 15), 0),
          level: 'curated',
          published: true,
        },
      })
      for (let index = 0; index < orderedKOs.length; index++) {
        const ko = orderedKOs[index]
        const data = {
          order: index + 1,
          title: ko.title,
          content: ko.content,
          knowledgeObjectId: ko.id,
          estimatedMinutes: Number(parseJson(ko.metadata).estimatedMinutes || 15),
        }
        if (legacyCourse.lessons[index]) await tx.lesson.update({ where: { id: legacyCourse.lessons[index].id }, data })
        else await tx.lesson.create({ data: { courseId: legacyCourse.id, ...data } })
      }
      if (legacyCourse.lessons.length > orderedKOs.length) {
        await tx.lesson.deleteMany({ where: { id: { in: legacyCourse.lessons.slice(orderedKOs.length).map(lesson => lesson.id) } } })
      }
    })
    console.log(`[ADAPTIVE-V2] Küratörlü yol: ${path.title} (${orderedKOs.length} ders)`)
  }

  console.log(`[ADAPTIVE-V2] TAMAMLANDI — ${specs.length} KO, ${specs.length * 5} soru, ${specs.length * 6} kart, ${specs.length} görev.`)
}

main()
  .catch(error => {
    console.error(`[ADAPTIVE-V2] BAŞARISIZ: ${error instanceof Error ? error.stack || error.message : String(error)}`)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
