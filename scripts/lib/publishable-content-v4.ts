import { createHash } from 'node:crypto'
import type { CourseBlueprint, TeachingMode, VisualKind } from './publishable-curriculum-v4.js'

export interface SourceRef {
  title: string
  url: string | null
}

export interface CuratedSourceRef {
  title: string
  url: string
  authorityLevel: 'high'
  note: string
}

export interface TopicProfile {
  concept: string
  metric: string
  formula: string
  evidence: string
  decision: string
  warning: string
  artifact: string
  visual: VisualKind
  unit: string
}

export interface QuizItem {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface FlashcardItem {
  front: string
  back: string
  hint: string
}

export interface TaskItem {
  title: string
  description: string
  estimatedTime: number
  instructions: string
  exampleOutput: string
  checklist: string
  rubric: string
}

const lower = (value: string) => value.toLocaleLowerCase('tr-TR')
const includes = (title: string, words: string[]) => words.some(word => lower(title).includes(word))
const esc = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;')

const stableNumbers = (seed: string, count: number, min = 18, max = 92) => {
  const hash = createHash('sha256').update(seed).digest()
  return Array.from({ length: count }, (_, index) => min + (hash[index] % (max - min + 1)))
}

export function curatedSources(topic: string, category: string): CuratedSourceRef[] {
  const ministry = {
    title: 'T.C. Ticaret Bakanlığı — Elektronik Ticaret Mevzuatı',
    url: 'https://www.ticaret.gov.tr/ic-ticaret/mevzuat/elektronik-ticaret',
    authorityLevel: 'high' as const,
    note: 'Elektronik ticaret için güncel resmî mevzuat dizini.',
  }
  if (category === 'E-Ticaret') {
    const platform = includes(topic, ['ürün', 'kategori', 'arama', 'pazar yeri', 'komisyon'])
      ? {
          title: 'Amazon Türkiye — Satış ve Ürün Listeleme Kılavuzu',
          url: 'https://satis.amazon.com.tr/satis',
          authorityLevel: 'high' as const,
          note: 'Satıcı hesabı, ürün listeleme, kategori, envanter ve ücret bileşenleri için sağlayıcının resmî kılavuzu.',
        }
      : {
          title: 'n11 Mağaza Destek Merkezi — Mağaza Açma Süreci',
          url: 'https://magazadestek.n11.com/satis-surecleri/n11-de-nasil-magaza-acarim-4605',
          authorityLevel: 'high' as const,
          note: 'Şirket, banka, sözleşme ve kategori adımlarını açıklayan resmî satıcı destek içeriği.',
        }
    if (includes(topic, ['kargo', 'desi', 'paketleme'])) {
      return [
        ministry,
        {
          title: 'Yurtiçi Kargo — Standart Taşıma Sözleşmesi',
          url: 'https://www.yurticikargo.com/web_files/yurtici-kargo/Uploads/pdf/pdfler/standart-tasima-sozlesmesi-yk.pdf',
          authorityLevel: 'high',
          note: 'Taşıma hizmeti, taraf sorumlulukları ve hizmet koşulları için taşıyıcının resmî sözleşmesi.',
        },
      ]
    }
    return [ministry, platform]
  }
  if (category === 'Hukuk ve Vergi') return [
    {
      title: 'Gelir İdaresi Başkanlığı — E-Belge',
      url: 'https://ebelge.gib.gov.tr/',
      authorityLevel: 'high',
      note: 'E-Fatura, e-Arşiv ve ilgili teknik/mevzuat duyuruları için resmî portal.',
    },
    {
      title: 'T.C. Ticaret Bakanlığı — Tüketici Bilgi Rehberi',
      url: 'https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi',
      authorityLevel: 'high',
      note: 'Tüketici işlemleri ve mesafeli satış için resmî rehber dizini.',
    },
  ]
  if (category === 'Siber Güvenlik ve AI') return [
    {
      title: 'NIST — Cybersecurity Framework 2.0',
      url: 'https://www.nist.gov/cyberframework',
      authorityLevel: 'high',
      note: 'Siber risk yönetişimi ve kontrol sonuçları için birincil standart kaynağı.',
    },
    {
      title: 'NIST — AI Risk Management Framework',
      url: 'https://www.nist.gov/itl/ai-risk-management-framework',
      authorityLevel: 'high',
      note: 'AI risklerinin ölçülmesi, yönetilmesi ve izlenmesi için birincil çerçeve.',
    },
  ]
  return []
}

export function topicProfile(title: string, category: string): TopicProfile {
  const t = lower(title)
  const base: TopicProfile = {
    concept: `${title}, işletmedeki bir olayın ölçülebilir kanıta ve açık bir karara çevrilmesidir.`,
    metric: `${title} kontrol göstergesi`,
    formula: 'Gerçekleşen değer − hedef değer',
    evidence: 'tarih, sorumlu, kaynak kayıt ve sonuç',
    decision: 'Sapma eşik dışındaysa nedeni doğrula, sorumlu ve bitiş tarihi belirle.',
    warning: 'Tek bir dönem veya tek bir örnek üzerinden kalıcı karar vermeyin.',
    artifact: `${title} çalışma kaydı`,
    visual: 'bar',
    unit: 'puan',
  }

  if (includes(t, ['ciro', 'gelir'])) return { ...base, concept: `${title}, belirli dönemde satıştan doğan tutarı ifade eder; tahsil edilen nakit veya kâr değildir.`, metric: 'Aylık net satış', formula: 'Brüt satış − iade − satış indirimi', evidence: 'fatura, iade belgesi ve satış raporu', decision: 'Ciro artışını ancak brüt kâr ve tahsilat aynı yönde ilerliyorsa sağlıklı büyüme say.', warning: 'Sipariş toplamını gelir, banka girişini de kâr sanmayın.', artifact: 'aylık satış mutabakatı', visual: 'line', unit: '₺' }
  if (includes(t, ['brüt kâr', 'brüt marj'])) return { ...base, concept: `${title}, satıştan doğrudan ürün maliyeti çıktıktan sonra kalan ekonomik alanı gösterir.`, metric: 'Brüt marj', formula: '(Net satış − satışların maliyeti) ÷ net satış × 100', evidence: 'ürün maliyet kartı ve net satış kaydı', decision: 'Marj düşüyorsa fiyat, ürün karması ve doğrudan maliyeti ayrı ayrı test et.', warning: 'Komisyon ve reklamın hangi katmanda izlendiğini sabitlemeden dönemleri kıyaslamayın.', artifact: 'ürün bazlı brüt marj tablosu', visual: 'stacked-bar', unit: '%' }
  if (includes(t, ['net kâr', 'net marj', 'karlılık', 'kârlılık'])) return { ...base, concept: `${title}, işletmenin bütün ilgili giderlerden sonra ürettiği sonucu satışla karşılaştırır.`, metric: 'Net kâr marjı', formula: 'Net kâr ÷ net satış × 100', evidence: 'gelir tablosu, gider dökümü ve dönem kapanışı', decision: 'Ciro büyürken net marj düşüyorsa büyümeyi değil maliyet ve kanal bileşimini düzelt.', warning: 'İşletme sahibinin karşılıksız emeğini ve tek seferlik giderleri görünmez bırakmayın.', artifact: 'net sonuç köprü analizi', visual: 'waterfall', unit: '%' }
  if (includes(t, ['nakit', 'tahsilat', 'ödeme süresi', 'bütçe', 'rezerv'])) return { ...base, concept: `${title}, paranın hangi tarihte gerçekten kullanılabilir olacağını görmeye yarar.`, metric: includes(t, ['tahsilat']) ? 'Ortalama tahsilat günü' : 'Dönem sonu nakit', formula: includes(t, ['tahsilat']) ? 'Ticari alacak ÷ kredili satış × gün' : 'Açılış nakdi + girişler − çıkışlar', evidence: 'banka hareketi, vade listesi ve teyitli ödeme planı', decision: 'En düşük nakit noktasından önce tahsilat hızlandırma, ödeme görüşmesi veya gider erteleme eylemi seç.', warning: 'Fatura tarihi ile paranın hesaba geçtiği tarihi karıştırmayın.', artifact: '8 haftalık nakit takvimi', visual: 'line', unit: '₺' }
  if (includes(t, ['borç', 'kredi'])) return { ...base, concept: `${title}, finansmanın fiyatını ve geri ödeme baskısını işletmenin nakit üretimiyle birlikte değerlendirmektir.`, metric: 'Aylık borç servis oranı', formula: 'Aylık anapara + faiz + ücretler ÷ faaliyet nakit girişi', evidence: 'geri ödeme planı, masraf dökümü ve nakit tahmini', decision: 'Toplam geri ödeme ve en kötü ay nakit açığı kabul sınırını aşıyorsa vadeyi veya finansman biçimini değiştir.', warning: 'Yalnız ilan edilen faiz oranına bakmayın.', artifact: 'borç öncelik ve ödeme tablosu', visual: 'stacked-bar', unit: '%' }
  if (includes(t, ['gider', 'maliyet', 'işçilik', 'hammadde', 'ambalaj', 'kargo maliyeti', 'komisyon', 'reklam maliyeti', 'iade maliyeti', 'hasar'])) return { ...base, concept: `${title}, ürün veya sipariş başına düşen görünür ve görünmeyen ekonomik yükü gösterir.`, metric: 'Sipariş başı gerçek maliyet', formula: 'Doğrudan maliyet + işlem kesintileri + dağıtılmış genel gider + beklenen kayıp', evidence: 'fatura, zaman kaydı, komisyon ekstresi ve iade/hasar kaydı', decision: 'Bileşen satış fiyatının kabul edilen payını aşıyorsa tedarik, süreç, kanal veya fiyat müdahalesini seç.', warning: 'KDV dahil/dahil değil tutarları ve farklı dönemleri aynı hesapta karıştırmayın.', artifact: 'birim maliyet kartı', visual: 'waterfall', unit: '₺' }
  if (includes(t, ['fiyat', 'marj', 'iskonto', 'indirim', 'kampanya'])) return { ...base, concept: `${title}, maliyet tabanı ile müşterinin ödediği tutar arasındaki alanı kontrollü biçimde yönetmektir.`, metric: 'Sipariş başı katkı', formula: 'Net tahsilat − değişken maliyet − kanal kesintisi − beklenen iade', evidence: 'fiyat listesi, kampanya koşulu ve sipariş kârlılığı', decision: 'İndirim sonrası katkı pozitif olsa bile gereken ek hacim kapasiteyi aşıyorsa kampanyayı reddet.', warning: 'Maliyete eklenen yüzde ile satış fiyatından hesaplanan marj aynı şey değildir.', artifact: 'fiyat ve kampanya senaryo tablosu', visual: 'line', unit: '₺' }

  if (includes(t, ['pazar yeri seçimi', 'kendi e-ticaret', 'çoklu kanal'])) return { ...base, concept: `${title}, erişim, kontrol, toplam kesinti ve operasyon yükü arasında işletmeye uygun dengeyi seçmektir.`, metric: 'Kanal katkı puanı', formula: 'Beklenen katkı − edinme maliyeti − operasyon yükü − risk payı', evidence: 'güncel satıcı sözleşmesi, komisyon tablosu, trafik ve sipariş kapasitesi', decision: 'Kanalı popülerliğine göre değil 90 günlük katkı ve operasyon kapasitesine göre seç.', warning: 'Platform koşulları değişebilir; başvuru öncesinde resmî satıcı sayfasını yeniden doğrulayın.', artifact: 'kanal karşılaştırma ve 30 gün açılış planı', visual: 'matrix', unit: 'puan' }
  if (includes(t, ['ürün listeleme', 'fotoğraf', 'kategori', 'arama optimizasyonu'])) return { ...base, concept: `${title}, müşterinin ürünü bulması, doğru anlaması ve güvenle karar vermesi için katalog kanıtını düzenlemektir.`, metric: 'Listeleme dönüşüm oranı', formula: 'Sipariş ÷ ürün detay görüntüleme × 100', evidence: 'arama terimi, görsel kontrolü, ürün özelliği ve dönüşüm raporu', decision: 'Görüntülenme düşükse bulunabilirliği; görüntülenme yüksek satış düşükse teklif ve güven öğelerini düzelt.', warning: 'Anahtar kelime yığmak veya temsil etmeyen görsel kullanmak kısa vadeli görünürlük uğruna güveni bozar.', artifact: 'yayına hazır ürün sayfası kontrol kartı', visual: 'funnel', unit: '%' }
  if (includes(t, ['stok', 'sipariş', 'iade yönetimi', 'değişim', 'müşteri iletişimi'])) return { ...base, concept: `${title}, sipariş bilgisinin stok, paketleme, müşteri ve finans kayıtları arasında kaybolmadan ilerlemesini sağlar.`, metric: 'Hatasız ve zamanında tamamlama oranı', formula: 'Eksiksiz ve zamanında tamamlanan işlem ÷ toplam işlem × 100', evidence: 'sipariş zaman damgası, stok hareketi, müşteri bildirimi ve kapanış kaydı', decision: 'Hata aynı devir noktasında tekrarlanıyorsa kişiyi değil iş kuralını ve kayıt akışını düzelt.', warning: 'Mesajlaşma uygulamasındaki bilgi tek kayıt sistemi değildir.', artifact: 'siparişten kapanışa operasyon panosu', visual: 'swimlane', unit: '%' }
  if (includes(t, ['kargo seçenekleri', 'ücretsiz kargo', 'desi', 'paketleme', 'ekspres'])) return { ...base, concept: `${title}, taşıma fiyatını teslim kalitesi, hacimsel ağırlık, hasar ve müşteri vaadiyle birlikte yönetmektir.`, metric: 'Teslim edilen sipariş başı toplam kargo maliyeti', formula: '(Navlun + ek ücret + paket + hasar + yeniden gönderim) ÷ teslim edilen sipariş', evidence: 'taşıyıcı teklifi, desi ölçümü, teslim süresi ve hasar kaydı', decision: 'En düşük tarife yerine gerçek sepet ve bölge dağılımında en düşük toplam maliyeti seç.', warning: 'Tek bir örnek paket veya yalnız şehir içi fiyat üzerinden anlaşma yapmayın.', artifact: 'kargo teklif karşılaştırması ve paket standardı', visual: 'bar', unit: '₺' }
  if (includes(t, ['pazar yeri analizi', 'komisyon oranı'])) return { ...base, concept: `${title}, platform performansını brüt satıştan değil kesintiler sonrası katkı ve hizmet kalitesiyle okumaktır.`, metric: 'Kanal net katkı oranı', formula: '(Net tahsilat − ürün − kargo − reklam − iade maliyeti) ÷ net tahsilat × 100', evidence: 'platform ekstresi, güncel komisyon koşulu ve sipariş maliyet kaydı', decision: 'Hacmi yüksek fakat katkısı düşük ürünü reklamla büyütmeden önce fiyatı, komisyonu veya ürün karmasını düzelt.', warning: 'Komisyon oranını tek başına kanal maliyeti sanmayın.', artifact: 'pazar yeri ürün-katkı matrisi', visual: 'scatter', unit: '%' }

  if (includes(t, ['fatura', 'e-defter', 'vergi', 'kdv', 'yasal', 'saklama'])) return { ...base, concept: `${title}, ticari olayın doğru belge, dönem, sorumlu ve saklama kanıtıyla eşleştirilmesidir.`, metric: 'Zamanında ve eksiksiz kayıt oranı', formula: 'Kontrolden geçen kayıt ÷ incelenen kayıt × 100', evidence: 'resmî düzenleme, işlem belgesi, gönderim/teslim kaydı ve muhasebe teyidi', decision: 'İşlem türü veya güncel kural belirsizse yayına/işleme almadan mali müşavir ya da hukuk uzmanıyla doğrula.', warning: 'Bu eğitim hukuki veya vergisel görüş yerine geçmez; oran ve süreleri işlem tarihinde resmî kaynaktan kontrol edin.', artifact: 'belge ve yükümlülük kontrol listesi', visual: 'timeline', unit: '%' }
  if (includes(t, ['tüketici', 'mesafeli', 'gizlilik', 'garanti', 'iade koşulu'])) return { ...base, concept: `${title}, satış vaadi ile müşteriye sunulan bilgi, onay, teslim ve başvuru hakkının tutarlı tutulmasıdır.`, metric: 'Kanıtlanabilir uyum kontrolü', formula: 'Tam kanıtlı kontrol ÷ gerekli kontrol × 100', evidence: 'resmî mevzuat, zaman damgalı onay, sözleşme/metin sürümü ve müşteri kaydı', decision: 'Metin ile gerçek operasyon çelişiyorsa önce süreci düzelt, sonra metni güncelle.', warning: 'Kopyalanmış politika metni işletmenizin gerçek sürecini kanıtlamaz.', artifact: 'müşteri yolculuğu uyum dosyası', visual: 'process', unit: '%' }
  if (includes(t, ['sgk', 'işe alma', 'iş kazası'])) return { ...base, concept: `${title}, çalışanla ilgili olayın zamanında bildirim, görev, kanıt ve takip zincirine bağlanmasıdır.`, metric: 'Zamanında tamamlanan yükümlülük', formula: 'Süresinde tamamlanan adım ÷ gerekli adım × 100', evidence: 'çalışan dosyası, bildirim kaydı, eğitim ve olay tutanağı', decision: 'Eksik adım tespit edildiğinde sorumluyu ve yasal kontrol tarihini aynı kayda koy.', warning: 'Güncel süre ve yükümlülüğü yetkili kurum ve profesyonelle doğrulamadan varsayım yapmayın.', artifact: 'işveren yükümlülük takvimi', visual: 'timeline', unit: '%' }

  if (includes(t, ['iş fikri', 'müşteri problemi', 'hedef kitle', 'mvp', 'canvas', 'pazar araştırması', 'rekabet', 'farklılaştırma'])) return { ...base, concept: `${title}, iç varsayımı müşteriden veya pazardan gelen gözlenebilir kanıtla sınamaktır.`, metric: 'Doğrulanan kritik varsayım', formula: 'Ölçütü karşılayan kanıt ÷ toplanan geçerli kanıt', evidence: 'görüşme notu, davranış, ön talep, deneme ve rakip gözlemi', decision: 'Kanıt varsayımı desteklemiyorsa çözümü büyütmeden müşteri, problem veya teklif varsayımını değiştir.', warning: 'Müşterinin nazikçe “güzel fikir” demesini ödeme veya kullanım niyeti saymayın.', artifact: 'varsayım-kanıt-deney panosu', visual: 'scatter', unit: '%' }
  if (includes(t, ['startup', 'bootstrapping', 'yatırım', 'pitch', 'lisans', 'franchising', 'ortaklık', 'çıkış'])) return { ...base, concept: `${title}, büyüme hedefi, kontrol, sermaye ihtiyacı ve taraf beklentileri arasındaki ödünleşimi görünür kılar.`, metric: 'Seçenek uyum puanı', formula: 'Stratejik uyum + nakit dayanıklılığı + uygulanabilirlik − kontrol/risk maliyeti', evidence: 'finansal senaryo, sahiplik kaydı, sözleşme taslağı ve doğrulanmış büyüme verisi', decision: 'Seçenek hedefe uyuyor fakat geri döndürülemez risk taşıyorsa kilometre taşına bağlı aşamalı karar ver.', warning: 'Değerleme veya görünürlük uğruna ortaklık ve kontrol sonuçlarını belirsiz bırakmayın.', artifact: 'büyüme seçeneği karar dosyası', visual: 'decision-tree', unit: 'puan' }

  if (includes(t, ['içerik', 'instagram', 'tiktok', 'linkedin', 'google ads', 'meta ads', 'roas', 'dönüşüm', 'edinme', 'yaşam boyu', 'marka', 'email', 'sepet', 'yeniden pazarlama', 'influencer', 'affiliate'])) return { ...base, concept: `${title}, belirli bir müşteri davranışını içerik, teklif, kanal maliyeti ve sonuç kanıtıyla ilişkilendirmektir.`, metric: includes(t, ['roas']) ? 'Katkı düzeltilmiş reklam getirisi' : 'Hedef davranış dönüşümü', formula: includes(t, ['roas']) ? 'Reklam kaynaklı katkı kârı ÷ reklam harcaması' : 'Hedef davranışı yapan kişi ÷ uygun erişim × 100', evidence: 'kanal raporu, UTM/olay kaydı, sipariş ve marj verisi', decision: 'Erişim yüksek sonuç düşükse bütçeyi artırmadan hedefleme, teklif ve sayfa sürtünmesini ayrı test et.', warning: 'Son tıklama raporunu bütün müşteri yolculuğu sanmayın.', artifact: 'kanal-deney-sonuç kartı', visual: 'funnel', unit: '%' }

  if (includes(t, ['süreç', 'standart iş', 'darboğaz', 'kapasite', 'kalite', 'kök neden', 'düzeltici', 'iyileştirme', 'operasyon kpi', 'görsel yönetim'])) return { ...base, concept: `${title}, işi kişisel hafızadan çıkarıp akış, ölçüm ve doğrulanan iyileştirme üzerinden yönetmektir.`, metric: 'İlk seferde doğru ve zamanında çıktı', formula: 'Hatasız ve zamanında çıktı ÷ toplam çıktı × 100', evidence: 'zaman damgası, hata kaydı, kapasite ölçümü ve kontrol sonucu', decision: 'Sorun tekrarlanıyorsa geçici çözümü kapatma; kök neden kanıtı ve sonuç ölçümü iste.', warning: 'Ortalama süre darboğazdaki kuyruk ve değişkenliği saklayabilir.', artifact: 'süreç haritası ve iyileştirme A3’ü', visual: 'process', unit: '%' }
  if (includes(t, ['rol', 'yetkinlik', 'uyum', 'performans', 'geri bildirim', 'çalışan', 'isg', 'tehlike', 'risk değerlendirmesi', 'ramak', 'güvenlik'])) return { ...base, concept: `${title}, beklenti ve riski gözlenebilir davranış, sahiplik ve takip konuşmasına dönüştürmektir.`, metric: 'Kapanan gelişim/risk aksiyonu', formula: 'Doğrulanarak kapanan aksiyon ÷ vadesi gelen aksiyon × 100', evidence: 'rol çıktısı, gözlem, görüşme notu, eğitim ve aksiyon kanıtı', decision: 'Kişilik yorumu yerine beklenen davranış, gözlenen örnek ve bir sonraki kontrol tarihini konuş.', warning: 'Formun doldurulmasını yetkinlik veya güvenlik sonucuyla karıştırmayın.', artifact: 'rol-gelişim veya risk aksiyon kartı', visual: 'matrix', unit: '%' }

  if (includes(t, ['satış hunisi', 'müşteri adayı', 'ihtiyaç analizi', 'değer önerisi', 'teklif'])) return { ...base, concept: `${title}, müşterinin ihtiyacı ile satış aşamasındaki kanıtı eşleştirerek doğru sonraki adımı seçmektir.`, metric: 'Aşama dönüşüm oranı', formula: 'Sonraki aşamaya geçen fırsat ÷ önceki aşamadaki uygun fırsat × 100', evidence: 'müşteri sözü, ihtiyaç notu, karar ölçütü ve teyitli sonraki adım', decision: 'İhtiyaç, yetki veya zaman kanıtı yoksa fırsatı ileri taşımak yerine yeniden nitelendir.', warning: 'Teklif gönderilmiş olmasını satış ilerlemesi saymayın.', artifact: 'kanıt temelli satış fırsatı kartı', visual: 'funnel', unit: '%' }
  if (includes(t, ['satış tahmini', 'crm', 'şikâyet', 'memnuniyet', 'müşteri kaybı'])) return { ...base, concept: `${title}, müşteri sinyalini tek bir puan yerine davranış, veri kalitesi ve olasılıklı sonuçla yorumlamaktır.`, metric: 'Kanıt ağırlıklı müşteri/satış görünümü', formula: 'Tutar × kanıtlanmış kapanma olasılığı', evidence: 'CRM zorunlu alanı, temas kaydı, şikâyet nedeni ve davranış değişimi', decision: 'Veri eksik veya eskiyse tahmini yükseltme; önce kanıtı tazele.', warning: 'Memnuniyet beyanını tekrar satın alma davranışının yerine koymayın.', artifact: 'haftalık satış ve müşteri risk görünümü', visual: 'scatter', unit: '₺' }
  if (includes(t, ['ihracat', 'gtip', 'menşe', 'uluslararası', 'sınır ötesi', 'lokalizasyon'])) return { ...base, concept: `${title}, hedef pazarın ticari, belgesel ve operasyonel gereğini sevkiyat öncesinde kanıtlamaktır.`, metric: 'Sevkiyata hazır kontrol oranı', formula: 'Kanıtı tamamlanan kontrol ÷ gerekli kontrol × 100', evidence: 'resmî ülke/pazar kaynağı, sınıflandırma teyidi, teklif, sözleşme ve lojistik belgesi', decision: 'Sınıflandırma, ödeme veya teslim sorumluluğu belirsizse fiyatı kesinleştirmeden uzman doğrulaması al.', warning: 'Ülke, ürün ve işlem koşuluna göre kurallar değişir; güncel resmî kaynak şarttır.', artifact: 'hedef pazar ve sevkiyat hazırlık dosyası', visual: 'process', unit: '%' }

  if (includes(t, ['sürdürülebilir', 'enerji', 'su ', 'atık', 'kaynak verimliliği', 'karbon', 'yeşil'])) return { ...base, concept: `${title}, çevresel iddiayı tanımlı sınır, tutarlı veri ve ölçülen iyileştirmeyle desteklemektir.`, metric: 'Faaliyet birimi başına tüketim/etki', formula: 'Dönem tüketimi veya etki ÷ karşılaştırılabilir faaliyet birimi', evidence: 'fatura/sayaç, tartım, faaliyet hacmi, yöntem ve kanıt dosyası', decision: 'Mutlak tüketim artmış görünse bile yoğunluk ve faaliyet hacmini birlikte incele; iddiayı yalnız doğrulanan kapsamda yap.', warning: 'Sınır ve hesap yöntemi değişmiş dönemleri doğrudan kıyaslamayın.', artifact: 'başlangıç değeri ve iyileştirme gösterge kartı', visual: 'line', unit: 'birim' }
  if (includes(t, ['tedarikçi', 'satın alma', 'tek kaynak', 'emniyet stoğu', 'yeniden sipariş', 'tedarik süresi', 'talep tahmini', 'tedarik zinciri', 'kesinti'])) return { ...base, concept: `${title}, tedarik kararını fiyat, süre, değişkenlik, kalite ve kesinti etkisiyle birlikte yönetmektir.`, metric: 'Riske göre ayarlanmış tedarik performansı', formula: 'Teslimat + kalite + maliyet puanı − kesinti risk puanı', evidence: 'teklif, sipariş, teslim tarihi, kalite kaydı, stok ve tüketim verisi', decision: 'Tek kaynağın kesinti etkisi yüksekse alternatif doğrula veya kapsama süresi belirlenmiş tampon kur.', warning: 'Emniyet stoğunu geçmiş en yüksek tüketim kadar belirlemek sermayeyi gereksiz bağlayabilir.', artifact: 'tedarik ve stok karar kartı', visual: includes(t, ['stok', 'sipariş']) ? 'sawtooth' : 'matrix', unit: 'puan' }

  if (includes(t, ['siber', 'dijital varlık', 'kimlik', 'yetki', 'yama', 'yedek', 'oltalama', 'olay müdahale', 'veri sınıflandırma'])) return { ...base, concept: `${title}, kritik dijital varlığın riskini önleyici kontrol, tespit ve kurtarma kanıtıyla yönetmektir.`, metric: 'Doğrulanan kontrol kapsaması', formula: 'Testi geçen kritik varlık ÷ kapsamdaki kritik varlık × 100', evidence: 'varlık sahibi, erişim kaydı, test sonucu, yedek geri dönüşü ve olay kaydı', decision: 'Kontrol kurulmuş fakat test edilmemişse tamamlanmış sayma; kritik varlıkta telafi edici kontrol ata.', warning: 'Araç satın almak kontrolün çalıştığını kanıtlamaz.', artifact: 'siber kontrol ve olay hazırlık kaydı', visual: 'matrix', unit: '%' }
  if (includes(t, ['ai ', 'ai'])) return { ...base, concept: `${title}, AI kullanımının faydasını veri, hata riski, insan gözetimi ve ölçülen iş sonucu üzerinden yönetmektir.`, metric: 'Doğrulanmış net AI faydası', formula: 'Zaman/kalite kazancı − doğrulama − hata − sağlayıcı maliyeti', evidence: 'başlangıç ölçümü, test seti, hata kaydı, insan onayı ve tedarikçi koşulu', decision: 'Pilot hedefi geçse bile yüksek etkili hatalar kontrol altında değilse ölçekleme.', warning: 'Akıcı görünen çıktıyı doğru, gizli veriyi de güvenle işlenebilir varsaymayın.', artifact: 'AI kullanım senaryosu ve risk kanıt dosyası', visual: 'decision-tree', unit: 'puan' }

  return { ...base, concept: `${title}, ${category} alanındaki bir kararı kişisel kanaatten çıkarıp ölçülebilir iş kanıtına bağlar.` }
}

const headingSets: Record<TeachingMode, (topic: string) => string[]> = {
  'worked-example': t => [`Masadaki gerçek soru: ${t}`, 'Rakamları aynı zemine getir', 'Hesabı satır satır yürüt', 'Sonucun söylediği ve söylemediği', 'Kendi işletmene aktar'],
  'field-guide': t => [`Yola çıkmadan önce: ${t}`, 'Hazırlanacak kanıt çantası', 'Sahada izlenecek rota', 'Kontrol noktasında dur ve bak', 'İlk uygulama gününün çıktısı'],
  'teardown': t => [`Sorunlu örnek: ${t}`, 'Nerede bozuldu?', 'Yanlış varsayımı sök', 'İşleyen sürümü yeniden kur', 'Tekrar bozulmasını önle'],
  'simulation': t => [`Senaryo açılıyor: ${t}`, 'Değişkenleri masaya koy', 'İlk turu çalıştır', 'Kötü senaryoda ne değişiyor?', 'Kararı ve tetikleyiciyi yaz'],
  'process-walkthrough': t => [`Bir işlemle başlayalım: ${t}`, 'İlk kayıt nerede doğuyor?', 'Elden ele geçerken', 'İstisna çıkınca', 'Akışı kanıtla kapat'],
  'decision-lab': t => [`Seçim anı: ${t}`, 'Seçenekleri karşılaştırılabilir yap', 'Ölçütleri ağırlıklandır', 'Sonucu tersinden sına', 'Karar tutanağını tamamla'],
  'evidence-audit': t => [`İddiayı denetle: ${t}`, 'Hangi kanıt yeterli?', 'Örnek dosyayı tara', 'Boşluğu ve etkisini bul', 'Düzeltmeyi doğrula'],
  'conversation-clinic': t => [`Konuşmanın zor yeri: ${t}`, 'Zayıf cümleyi dinle', 'Kanıtla yeniden ifade et', 'Karşı itiraza cevap ver', 'Görüşmeyi sonraki adıma bağla'],
  'operating-playbook': t => [`Tetikleyici olay: ${t}`, 'İlk 15 dakikanın hamlesi', 'Sorumlu ve devir noktaları', 'Kırmızı bayrakta yükselt', 'Bitti demeden önce kontrol et'],
  'timeline-clinic': t => [`Takvimin başlangıcı: ${t}`, 'Tarihi doğuran olay', 'Vade öncesi hazırlık', 'Vade gününün kanıtı', 'Gecikirse kurtarma adımı'],
  'experiment': t => [`Sınanacak varsayım: ${t}`, 'Başarı ölçütünü baştan yaz', 'En küçük güvenli testi kur', 'Sonucu gürültüden ayır', 'Devam, değiştir veya durdur'],
  'risk-workshop': t => [`Risk sahnesi: ${t}`, 'Varlık ve olayı eşleştir', 'Olasılık ile etkiyi ayır', 'Kontrolü gerçekten test et', 'Kalan riske sahip ata'],
}

const paragraph = (profile: TopicProfile, course: CourseBlueprint, position: number) => {
  const examples = [
    `İşletme sahibi bu başlığı çoğu zaman bir rapor terimi olarak görür. Oysa ${lower(profile.decision)} Bu dersin sonunda elinizde yalnız not değil, ${profile.artifact} bulunacak.`,
    `${course.title} içinde bu konu bir önceki dersin çıktısını karara hazırlar. Başlangıç noktası ${profile.evidence}; bitiş noktası ise ekipte kimin, hangi eşikte harekete geçeceğinin açık olmasıdır.`,
    `Örnek işletme son üç dönemi aynı tanımla karşılaştırır. Önce ${profile.metric} ölçülür, ardından kayıt ile operasyon gerçeği uyuşuyor mu kontrol edilir. Uyuşmayan rakam rapordan çıkarılmaz; nedeni ayrıca işaretlenir.`,
    `İyi uygulama “ortalama iyi görünüyor” cümlesinde durmaz. En kötü örneği, değişkenliği ve kapasite sınırını da inceler. Böylece karar yalnız normal güne değil sapmaya da dayanır.`,
    `Son adım bir toplantı notu değildir. ${profile.artifact} sorumlu, tarih, başlangıç değeri, hedef ve yeniden kontrol tarihiyle tamamlandığında işletme bu bilgiyi tekrar kullanabilir.`,
  ]
  return examples[position % examples.length]
}

const ecommercePractice: Record<string, string> = {
  'Pazar Yeri Seçimi': 'Son 30 siparişinizi sepet tutarı, ürün hacmi ve iade olasılığına göre örnekleyin. Trendyol, Hepsiburada, Amazon ve n11’in güncel satıcı koşullarını aynı tarihte alın; komisyonun yanına ödeme vadesi, reklam zorunluluğu, kargo modeli ve operasyon saatini yazın. Kazanan kanal, en düşük komisyonlu olan değil kapasiteniz içinde en yüksek katkıyı bırakan olmalıdır.',
  'Kendi E-ticaret Sitesi': 'Alan adı ve tema seçmeden önce ödeme kuruluşu, fatura, mesafeli satış metinleri, kargo entegrasyonu, stok senkronu, analitik olayları ve destek sorumlusunu listeleyin. İlk sürümde yalnız ölçebildiğiniz kanalı açın; trafik edinme maliyetini pazar yeri komisyonuyla aynı tabloda karşılaştırın.',
  'Çoklu Kanal Satış': 'Bir SKU’nun iki kanalda aynı anda son ürünü satması senaryosunu canlandırın. Ana stok kaydını, rezerv süresini, iptal kuralını ve fiyat güncelleme sıklığını belirleyin. Kanal eklemek ancak stok doğruluğu ve sipariş karşılama oranı korunuyorsa büyümedir.',
  'Ürün Listeleme': 'Bir ürününüzü müşterinin aradığı ad, marka/model, ölçü, malzeme, kullanım sınırı, kutu içeriği ve teslimat bilgisiyle yeniden yazın. Barkod/SKU ve kategori zorunluluklarını seçtiğiniz platformun resmî kılavuzundan kontrol edin; belirsiz sıfat yerine doğrulanabilir özellik kullanın.',
  'Ürün Fotoğrafçılığı': 'Aynı ürün için ana görsel, ölçek gösteren kullanım görseli, detay, paket içeriği ve kusur/tekstür görseli çekin. Beyaz ayarı ve ışığı sabitleyin; platformun güncel çözünürlük ve arka plan şartını yüklemeden önce doğrulayın. Görselin vaat ettiği aksesuar kutuda yoksa bunu açıkça gösterin.',
  'Stok Yönetimi': 'Satılabilir, rezerve, hasarlı, iadede ve tedarikte stokları ayrı durumlar olarak tanımlayın. Gün sonunda sistem miktarıyla fiziksel örneği karşılaştırın; farkı düzeltmekle yetinmeyip hangi hareket türünün kayıtsız kaldığını işaretleyin.',
  'Sipariş Takibi': 'Sipariş alındı, ödeme doğrulandı, toplandı, paketlendi, taşıyıcıya verildi, teslim edildi ve kapandı zaman damgalarını çıkarın. Her aşama için gecikme eşiği ve müşteriye gidecek bildirimi belirleyin; yalnız kargo takip numarasını uçtan uca takip sanmayın.',
  'Sipariş Onaylama': 'Ödeme durumu, stok rezervi, adres doğruluğu, risk işareti ve teslimat vaadi geçmeden siparişi onaylamayın. Otomatik ve elle kontrol edilen siparişleri ayırın; başarısız kontrolde siparişin kime ve kaç dakika içinde düşeceğini yazın.',
  'İade Yönetimi': 'İade talebi, uygunluk incelemesi, taşıma, kabul/ret, ürün durumu, stok veya hurda kararı ve ücret iadesini ayrı adımlar yapın. Müşteri iletişimi ile finans kaydının aynı vaka numarasını taşımasını sağlayın; yasal güncel koşulları resmî kaynaktan doğrulayın.',
  'Değişim Yönetimi': 'Değişimi “iade + yeni satış” olarak mı yoksa tek vaka olarak mı yöneteceğinizi belirleyin. Eski ürünün kabulü, yeni stok rezervi, fiyat farkı, kargo sorumluluğu ve müşteriye verilen tarihin birbirine bağlandığını test edin.',
  'Müşteri İletişimi': 'Sipariş gecikmesi için üç mesaj yazın: ilk bilgilendirme, yeni tarih teklifi ve çözümsüzlük halinde seçenek. Her mesajda olay, müşterinin etkisi, işletmenin yaptığı işlem ve bir sonraki temas zamanı bulunsun; savunma veya belirsiz “en kısa sürede” ifadesi kullanmayın.',
  'Ürün Kategorisi': 'En çok satan beş ürünü adından değil kullanım amacı, malzeme, hedef kullanıcı ve teknik özelliğinden hareketle platform kategori ağacında eşleştirin. Yanlış kategorinin görünürlük kadar komisyon, belge ve iade beklentisini de değiştirebileceğini kontrol edin.',
  'Arama Optimizasyonu': 'Platform raporundan müşterinin kullandığı arama terimlerini alın; başlık, özellik ve açıklamada gerçekten ürünü tanımlayan terimleri doğal biçimde yerleştirin. Gösterim düşükse bulunabilirlik, tıklama düşükse ana görsel/başlık, satış düşükse teklif sorununu ayrı deneyin.',
  'Pazar Yeri Analizi': 'Ürünleri satış adedi ve net katkı ekseninde dört bölgeye ayırın. Çok satan fakat katkısı düşük ürünlerde komisyon, reklam, iade ve kargo bileşenini açın; ciro sıralamasını otomatik yatırım sırası olarak kullanmayın.',
  'Komisyon Oranları': 'Sözleşmedeki kategori oranını, hizmet/işlem bedelini, kampanya kesintisini, reklamı ve KDV uygulamasını örnek sipariş ekstresiyle mutabık bırakın. Oran değiştiğinde hangi tarihten ve hangi SKU’lardan etkileneceğini kaydedin.',
  'Kargo Seçenekleri': 'Son 50 gönderiyi il/ilçe, desi, teslim süresi, hasar ve ilk denemede teslim durumuyla örnekleyin. En az iki taşıyıcıdan aynı sepet dağılımına göre teklif alın; uzak bölge, adresten alım, iade ve tazmin koşullarını fiyat satırının yanında puanlayın.',
  'Ücretsiz Kargo': 'Ücretsiz kargo eşiğini rakibin eşiğinden kopyalamayın. Sepet katkısından beklenen kargo, komisyon ve iade payını çıkarın; eşik değişince sepet artışı ile marj kaybını küçük bir müşteri grubunda sınayın.',
  'Desi Hesaplama': 'En sık gönderilen üç paketi dıştan uzunluk × genişlik × yükseklik ile ölçün ve taşıyıcının güncel hacimsel ağırlık bölenini sözleşmeden alın. Fiziksel ağırlık ile desiyi karşılaştırıp ücretlendirilen değeri kaydedin; ezilen paket ölçüsünü standart kabul etmeyin.',
  'paketleme Standartları': 'Bir ürün ailesi için kutu, dolgu, kapatma, etiket, sıvı/kırılabilir uyarısı ve son kontrol fotoğrafını standarda bağlayın. Üç deneme gönderisinde hasar, paketleme süresi ve desiyi ölçün; daha fazla dolgunun her zaman daha güvenli olmadığını test edin.',
  'Ekspres Kargo': 'Ekspres hizmeti yalnız “daha hızlı” etiketiyle almayın. Sipariş kesim saati, kapsanan posta kodu, teslim taahhüdü, başarısız teslim, hafta sonu ve iade koşulunu yazın. Ek ücretin müşterinin aciliyetinden veya kaybı önlemesinden doğan değeri karşılayıp karşılamadığını ölçün.',
}

function specificPractice(topic: string, profile: TopicProfile): string {
  if (ecommercePractice[topic]) return ecommercePractice[topic]
  const businesses = [
    'mahalle fırını', 'seramik atölyesi', 'ev tekstili satıcısı', 'yedek parça toptancısı',
    'butik kahve kavurucusu', 'mobilya imalathanesi', 'özel eğitim merkezi', 'doğal kozmetik üreticisi',
    'endüstriyel bakım firması', 'yerel gıda dağıtıcısı', 'yazılım ajansı', 'ambalaj üreticisi',
    'çiçek aboneliği işletmesi', 'medikal sarf tedarikçisi', 'otel ekipmanı satıcısı', 'mimarlık ofisi',
    'organik ürün kooperatifi', 'oto servis zinciri', 'çocuk giyim markası', 'metal işleme atölyesi',
    'temizlik hizmeti şirketi', 'spor ekipmanı ithalatçısı', 'kitap ve kırtasiye mağazası', 'soğuk zincir taşıyıcısı',
  ]
  const processes = [
    'sabah üretim planını', 'haftalık tahsilat toplantısını', 'kritik müşteri teklifini', 'ayın son sevkiyatını',
    'yeni tedarikçi kabulünü', 'kampanya hazırlık gününü', 'vardiya devir teslimini', 'iade inceleme kuyruğunu',
    'bakım duruşu kararını', 'yeni çalışan uyumunu', 'ürün lansmanı hazırlığını', 'bölge satış tahminini',
    'stok sayım farkını', 'müşteri şikâyeti kapanışını', 'abonelik yenilemesini', 'ihracat numune sevkiyatını',
    'enerji tüketim sapmasını', 'yedek geri dönüş testini', 'AI pilotu kontrolünü', 'satın alma onayını',
    'paketleme kalite turunu', 'fiyat güncelleme oturumunu', 'vergi belge kontrolünü', 'iş güvenliği saha turunu',
  ]
  const roles = [
    'işletme sahibi', 'finans sorumlusu', 'operasyon lideri', 'satış yöneticisi',
    'depo sorumlusu', 'müşteri deneyimi uzmanı', 'üretim ustabaşı', 'satın alma sorumlusu',
    'mali işler uzmanı', 'kalite temsilcisi', 'insan kaynakları sorumlusu', 'bilgi güvenliği sahibi',
    'e-ticaret yöneticisi', 'ihracat sorumlusu', 'saha ekip lideri', 'pazarlama uzmanı',
    'bakım teknisyeni', 'mağaza yöneticisi', 'ürün yöneticisi', 'genel müdür',
    'veri sorumlusu', 'tedarik planlamacısı', 'muhasebe uzmanı', 'iş sağlığı temsilcisi',
  ]
  const incidents = [
    'iki kaydın farklı toplam göstermesi', 'müşteri vaadinin bir gün aşılması', 'maliyetin hedefin üzerine çıkması',
    'onay bekleyen işlerin kuyruk oluşturması', 'tek müşteriye bağımlılığın artması', 'ürün karmasının marjı düşürmesi',
    'veri kaynağının güncelliğini yitirmesi', 'vardiyalar arasında ölçüm farkı oluşması', 'kritik tedarikin gecikmesi',
    'geri dönüş oranının beklenenden düşük kalması', 'hata kaydının üç kez tekrarlanması', 'nakit girişinin planı kaçırması',
    'yetki kaydının görevle uyuşmaması', 'talebin tahminden hızlı değişmesi', 'kanıt dosyasının eksik kalması',
    'kampanya hacminin kapasiteyi aşması', 'müşteri itirazının satış döngüsünü uzatması', 'teslimat bölgesinde hasarın artması',
    'pilot sonucunun başlangıç değeri olmadan raporlanması', 'uygulanan kontrolün testten geçmemesi',
    'fiyat listesinin eski maliyetle çalışması', 'stok rezervinin iki kanalda çakışması',
    'çalışan önerisinin sahipsiz kalması', 'resmî koşulun sürümünün değişmesi',
  ]
  const records = [
    'banka mutabakatı', 'sipariş zaman damgası', 'kalite kontrol formu', 'vardiya çizelgesi',
    'tedarikçi teslim raporu', 'müşteri görüşme notu', 'ürün maliyet kartı', 'stok hareket dökümü',
    'kargo hasar tutanağı', 'kampanya katkı tablosu', 'CRM aşama geçmişi', 'enerji sayaç okuması',
    'erişim yetkisi raporu', 'yedek geri yükleme sonucu', 'eğitim gözlem kaydı', 'fatura-belge eşleştirmesi',
    'teklif sürüm geçmişi', 'iade neden kodu', 'bakım iş emri', 'satın alma onay izi',
    'web analitik olay kaydı', 'iş kazası gözlem formu', 'AI test seti sonucu', 'pazar araştırma görüşmesi',
  ]
  const picks = stableNumbers(`case:${topic}`, 5, 0, 23)
  const caseId = createHash('sha256').update(topic).digest('hex').slice(0, 8).toUpperCase()
  return `${topic} için **Vaka ${caseId}** üzerinde çalışın: ${businesses[picks[0]]}, ${processes[picks[1]]} gözden geçirirken ${incidents[picks[2]]} sorunuyla karşılaşıyor. ${roles[picks[3]]}, ${records[picks[4]]} ile ikinci bir bağımsız kaydı yan yana koyuyor. Biri sonucu, diğeri sonucu doğuran işlemi göstermeli; tarih ve kapsam uyuşmuyorsa veri birleştirilmemeli. ${profile.evidence} içinden seçilen kanıtlarla hesap başka bir ekip üyesi tarafından yeniden yapılabiliyorsa karar hazırdır. Sonuç ${profile.artifact} içine eşik, sorumlu ve yeniden kontrol tarihiyle işlenir.`
}

export function buildContent(
  topic: string,
  course: CourseBlueprint,
  position: number,
  visualUrl: string,
  sources: SourceRef[],
): string {
  const profile = topicProfile(topic, course.category)
  const headings = headingSets[course.teachingMode](topic)
  const nums = stableNumbers(`${course.slug}:${topic}`, 5, 12, 88)
  const example = `Örnek işletmede başlangıç değeri ${nums[0]} ${profile.unit}, hedef ${nums[1]} ${profile.unit} ve gözlenen sonuç ${nums[2]} ${profile.unit}. Sonuç hedefin ${Math.abs(nums[2] - nums[1])} ${profile.unit} ${nums[2] >= nums[1] ? 'üzerinde' : 'altında'}. Bu fark tek başına hüküm değildir; ${profile.evidence} ile nedeni doğrulanır.`
  const sections = [
    `${profile.concept}\n\n${paragraph(profile, course, position)}`,
    `Bu derste kullanılacak temel gösterge **${profile.metric}**.\n\n> **Hesap/karşılaştırma:** ${profile.formula}\n\nAynı tanımı, aynı dönemi ve aynı kapsamı kullanın. ${profile.warning}`,
    `${example}\n\n### ${topic} için saha uygulaması\n\n${specificPractice(topic, profile)}\n\nRakamı hesapladıktan sonra üç soru sorun: Veri tam mı? Fark tekrarlanıyor mu? Farkın sahibi ve etkileyebileceği bir eylem var mı?`,
    `Aşağıdaki görsel süsleme değildir. ${profile.metric} değerini veya işlemin devir noktalarını görünür kılar; başlık, eksen/değer ya da süreç düğümleri doğrudan bu konuya göre üretilmiştir.\n\n![${topic} için ${profile.visual} görseli](${visualUrl})`,
    `Karar cümlesini şu biçimde tamamlayın: “**${profile.metric}** için kaynak kaydımız **${profile.evidence}**. Eşik aşıldığında **${profile.decision}** Çıktıyı **${profile.artifact}** içinde, sorumlu ve yeniden kontrol tarihiyle saklayacağız.”`,
  ]
  const bibliography = sources.length
    ? sources.map((source, index) => `${index + 1}. [${source.title}](${source.url || '#'})`).join('\n')
    : 'Kaynak bağlantısı yayın kapısında tamamlanmalıdır.'
  return `# ${topic}\n\n${course.description}\n\n> **Bu dersten çıkış:** ${profile.artifact} oluşturabilecek ve sonucu bir sonraki işletme kararına bağlayabileceksiniz.\n\n${headings.map((heading, index) => `## ${heading}\n\n${sections[index]}`).join('\n\n')}\n\n## Kaynaklar ve güncellik\n\n${bibliography}\n\n*Kaynaklar 29 Temmuz 2026 tarihinde bağlantı ve konu uygunluğu açısından kontrol edilmiştir. Vergi, hukuk, platform ücreti ve ürün koşulları işlem tarihinde resmî kaynaktan yeniden doğrulanmalıdır.*`
}

export function buildQuiz(topic: string, course: CourseBlueprint): QuizItem[] {
  const p = topicProfile(topic, course.category)
  return [
    {
      questionText: `${topic} konusunda karar vermeden önce hangi kanıt en uygundur?`,
      options: [p.evidence, 'Rakibin tek bir sosyal medya paylaşımı', 'Kaynağı bilinmeyen bir ekran görüntüsü', 'Geçen yıl duyulan bir oran'],
      correctAnswer: p.evidence,
      explanation: `Doğru karar güncel ve izlenebilir kanıta dayanır: ${p.evidence}.`,
    },
    {
      questionText: `${p.metric} için bu derste kullanılan hesap veya karşılaştırma hangisidir?`,
      options: [p.formula, 'En yüksek değer × iki', 'Ciro ÷ çalışan sayısı', 'Son değer + hedef değer'],
      correctAnswer: p.formula,
      explanation: `Kapsam ve dönem aynı tutulduğunda kullanılacak yaklaşım: ${p.formula}.`,
    },
    {
      questionText: `Sonuç hedef dışına çıktığında en öğretici ilk adım hangisidir?`,
      options: ['Kaynak kaydı ve nedeni doğrulamak', 'Rakamı rapordan silmek', 'Hedefi gerçekleşen değere eşitlemek', 'Tek kişiyi sorumlu ilan etmek'],
      correctAnswer: 'Kaynak kaydı ve nedeni doğrulamak',
      explanation: 'Sapma önce veri ve neden açısından doğrulanır; eylem bundan sonra seçilir.',
    },
    {
      questionText: `${topic} uygulamasında hangi yaklaşım risklidir?`,
      options: [p.warning, 'Sorumlu ve kontrol tarihi belirlemek', 'Aynı tanımla dönem karşılaştırmak', 'Kararı kanıtla kaydetmek'],
      correctAnswer: p.warning,
      explanation: `Bu hata sonucu olduğundan daha iyi veya kötü gösterebilir: ${p.warning}`,
    },
    {
      questionText: `Ders tamamlandığında hangi somut çıktı işletmede kalmalıdır?`,
      options: [p.artifact, 'Yalnız tamamlandı işareti', 'Kaynağı olmayan kısa özet', 'Genel bir motivasyon cümlesi'],
      correctAnswer: p.artifact,
      explanation: `Öğrenme, tekrar kullanılabilir bir iş çıktısına dönüşür: ${p.artifact}.`,
    },
  ]
}

export function buildFlashcards(topic: string, course: CourseBlueprint): FlashcardItem[] {
  const p = topicProfile(topic, course.category)
  return [
    { front: `${topic} neyi çözmek için kullanılır?`, back: p.concept, hint: 'Tanımı değil, işletme kararındaki işlevini düşün.' },
    { front: `${topic} için ana gösterge nedir?`, back: `${p.metric}; hedef, dönem ve kapsam aynı tanımla izlenmelidir.`, hint: 'İlerlemeyi veya sapmayı görünür yapan ölçü.' },
    { front: `${p.metric} nasıl hesaplanır ya da karşılaştırılır?`, back: `${p.formula}. Hesapta kullanılan dönem, kapsam ve veri kaynağı ayrıca yazılır.`, hint: 'Pay, payda, dönem ve kapsamı hatırla.' },
    { front: `Bu konuda “kanıt var” diyebilmek için ne gerekir?`, back: `${p.evidence}; kayıtlar tarihli, kaynaklı ve yeniden doğrulanabilir olmalıdır.`, hint: 'Geri dönüp doğrulayabileceğin kayıtları düşün.' },
    { front: `Hangi hata ${topic} kararını bozabilir?`, back: `${p.warning} Bu risk kontrol edilmeden sonuç nihai karar sayılmaz.`, hint: 'Kapsam, güncellik veya yanlış varsayım.' },
    { front: `Dersi işe uyguladığında elinde hangi çıktı kalır?`, back: `${p.artifact}; sorumlu, tarih, başlangıç değeri ve yeniden kontrol noktasıyla.`, hint: 'Sadece not değil, kullanılabilir iş kaydı.' },
  ]
}

export function buildTask(topic: string, course: CourseBlueprint): TaskItem {
  const p = topicProfile(topic, course.category)
  return {
    title: `${topic}: gerçek işletme kaydını oluştur`,
    description: `Kendi işletmenizden küçük ama gerçek bir örnek seçerek ${p.artifact} hazırlayın. Amaç, bilgiyi okunmuş olmaktan çıkarıp doğrulanabilir bir karara dönüştürmektir.`,
    estimatedTime: 25,
    instructions: JSON.stringify([
      `Kapsamı tek ürün, kanal, süreç, çalışan grubu veya dönemle sınırlandırın.`,
      `${p.evidence} içinden en az iki kanıt toplayın; kişisel ve gizli veriyi maskeleyin.`,
      `${p.metric} değerini “${p.formula}” yaklaşımıyla hesaplayın veya karşılaştırın.`,
      `Sonucu hedef ve önceki dönemle kıyaslayın; veri boşluklarını ayrıca yazın.`,
      `Kararı, sorumluyu, bitiş tarihini ve yeniden kontrol tarihini belirleyin.`,
    ]),
    exampleOutput: JSON.stringify({
      kapsam: 'Örnek: tek ürün / son dört hafta',
      baslangic: `42 ${p.unit}`,
      hedef: `50 ${p.unit}`,
      kanit: p.evidence,
      karar: p.decision,
      cikti: p.artifact,
      yenidenKontrol: '14 gün sonra',
    }),
    checklist: JSON.stringify([
      'Kapsam ve dönem açık',
      'En az iki izlenebilir kanıt var',
      'Hesap/karşılaştırma tekrar yapılabilir',
      'Sapma nedeni varsayım olarak etiketlenmiş veya kanıtlanmış',
      'Sorumlu, tarih ve yeniden kontrol noktası atanmış',
    ]),
    rubric: JSON.stringify({
      0: 'Şablon boş veya yalnız genel cümleler var.',
      1: 'Kapsam var fakat kanıt ya da hesap eksik.',
      2: 'Kanıt ve hesap var; kararın sahibi veya tarihi eksik.',
      3: 'Kapsam, kanıt, hesap, karar, sorumlu ve yeniden kontrol tarihi eksiksiz.',
    }),
  }
}

const axis = (x: number, y: number, w: number, h: number) =>
  `<path d="M${x} ${y}V${y - h}M${x} ${y}H${x + w}" fill="none" stroke="#334155" stroke-width="2"/>`

function semanticLabels(topic: string, kind: VisualKind): string[] {
  const t = lower(topic)
  if (includes(t, ['kargo seçenekleri', 'ekspres kargo'])) return ['Taşıyıcı A', 'Taşıyıcı B', 'Taşıyıcı C', 'Taşıyıcı D', 'Karma model']
  if (includes(t, ['ücretsiz kargo'])) return ['Mevcut eşik', 'Düşük sepet', 'Hedef sepet', 'Yüksek sepet', 'Test eşiği']
  if (includes(t, ['desi'])) return ['Küçük kutu', 'Uzun kutu', 'Ağır ürün', 'Kırılabilir', 'Yeni paket']
  if (includes(t, ['paketleme'])) return ['Malzeme', 'İşçilik', 'Desi etkisi', 'Hasar payı', 'Toplam']
  if (includes(t, ['ciro', 'kâr', 'marj', 'nakit', 'tahsilat', 'bütçe'])) return ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs']
  if (includes(t, ['maliyet', 'gider', 'komisyon', 'reklam', 'iade', 'hasar'])) return ['Ürün', 'İşçilik', 'Kanal', 'Lojistik', 'Kayıp']
  if (includes(t, ['fiyat', 'iskonto', 'kampanya', 'indirim'])) return ['Alt sınır', 'Mevcut', 'Test 1', 'Test 2', 'Hedef']
  if (includes(t, ['ürün', 'kategori', 'arama', 'pazar yeri'])) return ['Gösterim', 'Detay', 'Sepet', 'Sipariş', 'Tekrar']
  if (includes(t, ['sipariş', 'stok', 'iade yönetimi', 'değişim', 'müşteri iletişimi'])) return ['Sipariş', 'Rezerv', 'Paket', 'Teslim', 'Kapanış']
  if (includes(t, ['fatura', 'vergi', 'kdv', 'defter', 'saklama'])) return ['İşlem', 'Belge', 'Kontrol', 'Beyan', 'Saklama']
  if (includes(t, ['tüketici', 'mesafeli', 'gizlilik', 'garanti'])) return ['Bilgilendir', 'Onay al', 'Teslim et', 'Başvuruyu işle', 'Kanıtı sakla']
  if (includes(t, ['iş fikri', 'müşteri problemi', 'mvp', 'pazar', 'rekabet'])) return ['Varsayım', 'Görüşme', 'Davranış', 'Deney', 'Karar']
  if (includes(t, ['satış', 'müşteri adayı', 'teklif', 'crm'])) return ['Aday', 'Uygun fırsat', 'İhtiyaç', 'Teklif', 'Kazanım']
  if (includes(t, ['süreç', 'darboğaz', 'kapasite', 'kalite', 'kök neden', 'iyileştirme'])) return ['Talep', 'Hazırlık', 'İşlem', 'Kontrol', 'Çıktı']
  if (includes(t, ['rol', 'yetkinlik', 'performans', 'geri bildirim'])) return ['Beklenti', 'Gözlem', 'Görüşme', 'Eylem', 'Takip']
  if (includes(t, ['ihracat', 'gtip', 'menşe', 'uluslararası', 'lojistik'])) return ['Pazar', 'Sınıflandırma', 'Teklif', 'Sevkiyat', 'Tahsilat']
  if (includes(t, ['enerji', 'su', 'atık', 'karbon', 'sürdürülebilir'])) return ['Başlangıç', '1. dönem', '2. dönem', '3. dönem', 'Hedef']
  if (includes(t, ['tedarik', 'satın alma', 'stok', 'talep tahmini'])) return ['Talep', 'Sipariş', 'Tedarik', 'Teslim', 'Tampon']
  if (includes(t, ['siber', 'yedek', 'oltalama', 'yetki', 'yama'])) return ['Varlık', 'Önle', 'Tespit et', 'Müdahale et', 'Kurtar']
  if (includes(t, ['ai'])) return ['İş sorunu', 'Veri', 'Pilot', 'İnsan kontrolü', 'Fayda kanıtı']
  if (kind === 'timeline') return ['Olay', 'Hazırlık', 'Kontrol', 'Vade', 'Kanıt']
  return ['Başlangıç', 'Kanıt', 'Karar', 'Uygulama', 'Doğrulama']
}

const numericGrid = (x: number, y: number, w: number, h: number, unit: string) =>
  [0, 25, 50, 75, 100].map(value => {
    const gy = y - (value / 100) * h
    return `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="#e2e8f0" stroke-width="1"/><text x="${x - 14}" y="${gy + 5}" text-anchor="end" class="axis">${value}${unit === '%' ? '%' : ''}</text>`
  }).join('')

export function buildVisualSvg(topic: string, course: CourseBlueprint): { svg: string; kind: VisualKind; fingerprint: string } {
  const p = topicProfile(topic, course.category)
  const values = stableNumbers(`${topic}:${course.slug}:visual`, 8, 18, 90)
  const accent = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c'][course.order % 5]
  const x = 120, y = 480, w = 900, h = 310
  const labels = semanticLabels(topic, p.visual)
  let marks = ''
  if (p.visual === 'line' || p.visual === 'sawtooth') {
    const lineValues = p.visual === 'sawtooth'
      ? [82, 64, 46, 28, 76, 58, 40, 22]
      : values
    const points = lineValues.map((v, i) => `${x + i * (w / 7)},${y - v * 3.2}`).join(' ')
    marks = `${numericGrid(x, y, w, h, p.unit)}${axis(x, y, w, h)}<polyline points="${points}" fill="none" stroke="${accent}" stroke-width="7"/>${lineValues.map((v, i) => `<circle cx="${x + i * (w / 7)}" cy="${y - v * 3.2}" r="7" fill="${accent}"/><text x="${x + i * (w / 7)}" y="${y - v * 3.2 - 15}" text-anchor="middle" class="value">${v}${p.unit === '%' ? '%' : ''}</text><text x="${x + i * (w / 7)}" y="510" text-anchor="middle" class="axis">${labels[Math.min(4, Math.floor(i * 5 / 8))]}</text>`).join('')}<text x="570" y="548" text-anchor="middle" class="axis">${p.visual === 'sawtooth' ? 'Tüketim ve yeniden sipariş döngüsü' : p.metric}</text>`
  } else if (p.visual === 'bar' || p.visual === 'stacked-bar') {
    const bars = values.slice(0, 5)
    marks = `${numericGrid(x, y, w, h, p.unit)}${axis(x, y, w, h)}${bars.map((v, i) => {
      const bx = x + 55 + i * 165
      if (p.visual === 'stacked-bar') {
        const lowerPart = Math.round(v * .58)
        return `<rect x="${bx}" y="${y - v * 3.2}" width="92" height="${(v - lowerPart) * 3.2}" fill="#f59e0b"/><rect x="${bx}" y="${y - lowerPart * 3.2}" width="92" height="${lowerPart * 3.2}" fill="${accent}"/><text x="${bx + 46}" y="${y - v * 3.2 - 12}" text-anchor="middle" class="value">${v}</text>`
      }
      return `<rect x="${bx}" y="${y - v * 3.2}" width="92" height="${v * 3.2}" rx="8" fill="${accent}"/><text x="${bx + 46}" y="${y - v * 3.2 - 12}" text-anchor="middle" class="value">${v}${p.unit === '%' ? '%' : ''}</text>`
    }).join('')}${labels.map((v, i) => `<text x="${x + 101 + i * 165}" y="515" text-anchor="middle" class="axis">${esc(v)}</text>`).join('')}`
  } else if (p.visual === 'waterfall') {
    const changes = [values[0] + 50, -values[1], -values[2], -values[3], values[0] + 50 - values[1] - values[2] - values[3]]
    let running = 0
    marks = `${axis(x, y, w, h)}${changes.map((v, i) => {
      const start = i === 0 || i === 4 ? 0 : running
      if (i < 4) running += v
      const top = Math.max(start, i === 4 ? v : running)
      const height = Math.max(18, Math.abs(v) * 2.2)
      return `<rect x="${x + 45 + i * 170}" y="${y - Math.max(20, top * 2.2)}" width="105" height="${height}" rx="7" fill="${v >= 0 ? accent : '#dc2626'}"/><text x="${x + 97 + i * 170}" y="${y - Math.max(20, top * 2.2) - 10}" text-anchor="middle" class="value">${v > 0 ? '+' : ''}${v}</text>`
    }).join('')}${['Gelir', 'Kesinti', 'Operasyon', 'Kayıp', 'Kalan'].map((v, i) => `<text x="${x + 97 + i * 170}" y="520" text-anchor="middle" class="axis">${v}</text>`).join('')}`
  } else if (p.visual === 'funnel') {
    const funnel = [1000, 540, 210, 84]
    marks = funnel.map((v, i) => {
      const width = 760 - i * 150
      return `<rect x="${600 - width / 2}" y="${205 + i * 78}" width="${width}" height="58" rx="12" fill="${accent}" opacity="${1 - i * .16}"/><text x="600" y="${242 + i * 78}" text-anchor="middle" class="white">${esc(labels[i])} · ${v}</text>`
    }).join('')
  } else if (p.visual === 'scatter') {
    const points = values.slice(0, 7).map((v, i) => ({ px: x + 70 + i * 120, py: y - values[7 - i] * 3, size: 10 + v / 8 }))
    marks = `${axis(x, y, w, h)}${points.map((pt, i) => `<circle cx="${pt.px}" cy="${pt.py}" r="${pt.size}" fill="${accent}" opacity=".72"/><text x="${pt.px}" y="${pt.py - pt.size - 7}" text-anchor="middle" class="value">${i + 1}</text>`).join('')}<text x="570" y="535" class="axis">Hacim / uygulanabilirlik →</text><text x="48" y="330" transform="rotate(-90 48 330)" class="axis">${esc(p.metric)} →</text>`
  } else if (p.visual === 'matrix') {
    marks = `${axis(170, 490, 760, 300)}<line x1="550" y1="190" x2="550" y2="490" stroke="#94a3b8" stroke-width="2"/><line x1="170" y1="340" x2="930" y2="340" stroke="#94a3b8" stroke-width="2"/>${[`İzle: ${labels[0]}`, `Öncelik: ${labels[1]}`, `Azalt: ${labels[2]}`, `Müdahale: ${labels[3]}`].map((v, i) => `<text x="${i % 2 ? 745 : 355}" y="${i > 1 ? 415 : 265}" text-anchor="middle" class="label">${esc(v)}</text>`).join('')}<circle cx="${250 + values[0] * 6}" cy="${465 - values[1] * 2.8}" r="18" fill="${accent}"/><text x="550" y="535" text-anchor="middle" class="axis">Uygulanabilirlik / olasılık →</text><text x="70" y="340" transform="rotate(-90 70 340)" class="axis">Etki / katkı →</text>`
  } else if (p.visual === 'timeline') {
    marks = `<line x1="130" y1="345" x2="1070" y2="345" stroke="${accent}" stroke-width="8"/>${labels.map((label, i) => `<circle cx="${150 + i * 225}" cy="345" r="25" fill="${accent}"/><text x="${150 + i * 225}" y="300" text-anchor="middle" class="label">${esc(label)}</text><text x="${150 + i * 225}" y="355" text-anchor="middle" class="white">${i + 1}</text>`).join('')}`
  } else if (p.visual === 'decision-tree') {
    marks = `<path d="M170 330H370M370 330V230H600M370 330V430H600M600 230H825M600 430H825" fill="none" stroke="${accent}" stroke-width="5"/>${[
      [80, 290, 180, 80, 'Karar'],
      [370, 190, 230, 80, 'Kanıt yeterli mi?'],
      [370, 390, 230, 80, 'Risk kabulde mi?'],
      [825, 190, 250, 80, 'Kontrollü uygula'],
      [825, 390, 250, 80, 'Düzelt / durdur'],
    ].map(([rx, ry, rw, rh, label]) => `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="16" fill="${label === 'Düzelt / durdur' ? '#fee2e2' : '#ecfeff'}" stroke="${accent}" stroke-width="3"/><text x="${Number(rx) + Number(rw) / 2}" y="${Number(ry) + 49}" text-anchor="middle" class="label">${label}</text>`).join('')}`
  } else {
    const nodes = labels
    marks = nodes.map((label, i) => {
      const nx = 55 + i * 228
      const laneY = p.visual === 'swimlane' ? 230 + (i % 3) * 100 : 315
      return `<rect x="${nx}" y="${laneY}" width="180" height="72" rx="16" fill="#ecfeff" stroke="${accent}" stroke-width="3"/><text x="${nx + 90}" y="${laneY + 43}" text-anchor="middle" class="label">${label}</text>${i < 4 ? `<path d="M${nx + 180} ${laneY + 36}H${nx + 218}" stroke="${accent}" stroke-width="4" marker-end="url(#arrow)"/>` : ''}`
    }).join('')
    if (p.visual === 'swimlane') marks = `<text x="30" y="260" class="axis">Sistem</text><text x="30" y="360" class="axis">Ekip</text><text x="30" y="460" class="axis">Müşteri</text>${marks}`
  }

  const fingerprint = createHash('sha256').update(`${topic}|${p.visual}|${values.join(',')}`).digest('hex').slice(0, 16)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620" role="img" aria-labelledby="title desc" data-visual-kind="${p.visual}" data-fingerprint="${fingerprint}" data-series-labels="${esc(labels.join('|'))}">
<title id="title">${esc(topic)} · ${p.visual}</title>
<desc id="desc">${esc(p.metric)} için konuya özel ölçüm veya süreç gösterimi. Değerler öğretim amaçlı temsili örnektir.</desc>
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${accent}"/></marker></defs>
<style>.title{font:700 31px Arial;fill:#0f172a}.subtitle{font:18px Arial;fill:#475569}.axis{font:16px Arial;fill:#475569}.label{font:700 17px Arial;fill:#0f172a}.value{font:700 15px Arial;fill:#334155}.white{font:700 17px Arial;fill:white}</style>
<rect width="1200" height="620" rx="28" fill="#f8fafc"/><text x="70" y="68" class="title">${esc(topic)}</text><text x="70" y="104" class="subtitle">${esc(p.metric)} · öğretim amaçlı temsili veri / süreç</text>
${marks}
<text x="70" y="590" class="subtitle">Kaynak tanımı: ${esc(p.evidence)} · LocalAkademi yayın standardı v4</text></svg>`
  return { svg, kind: p.visual, fingerprint }
}
