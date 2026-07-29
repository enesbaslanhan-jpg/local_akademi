export type VisualKind =
  | 'line'
  | 'bar'
  | 'waterfall'
  | 'stacked-bar'
  | 'funnel'
  | 'scatter'
  | 'matrix'
  | 'process'
  | 'swimlane'
  | 'timeline'
  | 'decision-tree'
  | 'sawtooth'

export type TeachingMode =
  | 'worked-example'
  | 'field-guide'
  | 'teardown'
  | 'simulation'
  | 'process-walkthrough'
  | 'decision-lab'
  | 'evidence-audit'
  | 'conversation-clinic'
  | 'operating-playbook'
  | 'timeline-clinic'
  | 'experiment'
  | 'risk-workshop'

export interface CourseBlueprint {
  order: number
  slug: string
  title: string
  category: string
  description: string
  promise: string
  outcomes: string[]
  topicCourseIds: number[]
  teachingMode: TeachingMode
}

const course = (
  order: number,
  slug: string,
  title: string,
  category: string,
  description: string,
  promise: string,
  outcomes: string[],
  topicCourseIds: number[],
  teachingMode: TeachingMode,
): CourseBlueprint => ({
  order, slug, title, category, description, promise, outcomes, topicCourseIds, teachingMode,
})

export const CURRICULUM_V4: CourseBlueprint[] = [
  course(1, 'finansal-sonuclari-dogru-oku', 'Finansal Sonuçları Doğru Oku', 'Finans ve Nakit',
    'Ciro, kâr ve nakit rakamlarının anlattığı farklı hikâyeleri ayırın; yanıltıcı büyüme hissi yerine işletmenin gerçek durumunu görün.',
    'Ay sonunda hangi rakamın neden değiştiğini açıklayan tek sayfalık bir finansal okuma hazırlamak.',
    ['Ciro, brüt kâr, net kâr ve nakit farkını ayırır', 'Kârlılık oranlarını doğru yorumlar', 'Rakamdan yönetim kararına geçer'],
    [4, 5, 6, 7, 8], 'worked-example'),
  course(2, 'nakit-akisini-planla', 'Nakit Akışını Planla ve Tahsilatı Hızlandır', 'Finans ve Nakit',
    'Kârlı görünürken nakitsiz kalma riskini önceden görün; tahsilat, ödeme ve rezerv takvimini birlikte yönetin.',
    'Önündeki sekiz haftanın nakit açığını ve müdahale tarihini gösteren yaşayan bir plan kurmak.',
    ['Tahsilat ve ödeme vadelerini ölçer', 'Nakit büyümesini izler', 'Rezerv ve bütçe kuralı kurar'],
    [9, 10, 11, 12, 13], 'timeline-clinic'),
  course(3, 'borc-kredi-gider-yonetimi', 'Borç, Kredi ve Gider Yapısını Yönet', 'Finans ve Nakit',
    'Borcu yalnız faiz oranıyla değil toplam nakit yüküyle değerlendirin; sabit ve değişken giderlerin kararlarınıza etkisini görün.',
    'Borçları önceliklendiren ve kredi kararını işletmenin ödeme kapasitesine bağlayan bir çerçeve oluşturmak.',
    ['Borç ödeme sırası kurar', 'Kredi maliyetini karşılaştırır', 'Gider yapısı ve fırsat maliyetini hesaba katar'],
    [14, 15, 16, 17, 18], 'decision-lab'),
  course(4, 'butce-basabas-karlilik', 'Bütçe, Başabaş ve Kârlı Karar', 'Finans ve Nakit',
    'Gelir ve gider varsayımlarını satış hedefiyle birleştirin; başabaş eşiğini ve ek satışın gerçek katkısını hesaplayın.',
    'Satış hedefini başabaş noktası ve marjinal kârla sınayan uygulanabilir bir aylık bütçe çıkarmak.',
    ['Nakit dengesini kurar', 'Gelir ve gideri doğru sınıflandırır', 'Başabaş ve marjinal kâr hesabı yapar'],
    [19, 20, 21, 22, 23], 'simulation'),

  course(5, 'gercek-birim-maliyet', 'Ürünün Gerçek Maliyetini Hesapla', 'Maliyet ve Fiyatlama',
    'Hammadde etiketinin ötesine geçin; işçilik, ambalaj ve kargoyu birim maliyete eksiksiz dağıtın.',
    'Her ürün için savunulabilir, güncellenebilir bir birim maliyet kartı üretmek.',
    ['Doğrudan ve dolaylı maliyeti ayırır', 'İşçilik ve ambalajı ürüne dağıtır', 'Kargoyu sipariş ekonomisine ekler'],
    [24, 25, 26, 27, 28], 'worked-example'),
  course(6, 'gizli-maliyetleri-bul', 'Kanal Kesintileri ve Gizli Maliyetleri Bul', 'Maliyet ve Fiyatlama',
    'Komisyon, reklam, genel gider, iade ve hasarın görünmeyen etkisini sipariş başına indirin.',
    'Kanal bazında elinizde gerçekten ne kaldığını gösteren maliyet şelalesi kurmak.',
    ['Kanal kesintilerini hesaplar', 'Genel gider payını dağıtır', 'İade ve hasarı beklenen maliyete dönüştürür'],
    [29, 30, 31, 32, 33], 'teardown'),
  course(7, 'karli-fiyat-kur', 'Hasar Payını Ekleyip Kârlı Fiyat Kur', 'Maliyet ve Fiyatlama',
    'Fiyatı rakibe bakarak kopyalamayın; hasar payı, maliyet, hedef marj ve müşterinin değer algısını birlikte tartın.',
    'Hasar riskini de içeren minimum, hedef ve test fiyatlarını açık varsayımlarla belirlemek.',
    ['Hasarı beklenen maliyete çevirir', 'Maliyet artı ile satış marjını ayırır', 'Brüt marjı izler'],
    [34, 35, 36, 37, 38], 'decision-lab'),
  course(8, 'indirimde-marji-koru', 'Net Marjı İndirim ve Kampanyada Koru', 'Maliyet ve Fiyatlama',
    'İndirim oranına değil kampanya sonrası katkıya bakın; hacim artışının marj kaybını karşılayıp karşılamadığını sınayın.',
    'Kampanyayı başlamadan durdurabilecek net bir alt fiyat ve hacim eşiği koymak.',
    ['İskontonun net gelire etkisini bulur', 'Kampanya ve toplu indirimi sınar', 'Maliyet değişiminde fiyatı günceller'],
    [39, 40, 41, 42, 43], 'experiment'),

  course(9, 'e-ticarete-basla', 'E-Ticarete Başla: Kanalını Seç ve Mağazanı Kur', 'E-Ticaret',
    'Pazar yeri, kendi siteniz ve çoklu kanal seçeneklerini işletmenizin kapasitesine göre karşılaştırın; ilk mağazanızı kontrollü biçimde açın.',
    'İlk 30 gün için kanal seçimi, mağaza kurulumu ve yayına alınacak ürün planı hazırlamak.',
    ['Kanal ekonomisini karşılaştırır', 'Kendi site gereksinimlerini tanımlar', 'İlk ürün listesini yayına hazırlar'],
    [44, 45, 46, 47, 48], 'field-guide'),
  course(10, 'siparisten-iadeye-operasyon', 'Sipariş, Stok ve İade Operasyonunu Kur', 'E-Ticaret',
    'Sipariş düştüğü andan iadenin kapanmasına kadar görevleri, kayıtları ve müşteri bildirimlerini tek akışta tasarlayın.',
    'Sipariş kaçırmayan, stok taşırmayan ve iadeyi belirsiz bırakmayan günlük operasyon panosu kurmak.',
    ['Stok ve siparişi eşzamanlar', 'Onay ve müşteri iletişimini standardize eder', 'İade ve değişim akışını kapatır'],
    [49, 50, 51, 52, 53], 'process-walkthrough'),
  course(11, 'katalog-pazaryeri-performansi', 'Ürün Kataloğunu ve Pazar Yeri Performansını Geliştir', 'E-Ticaret',
    'Kategori, arama görünürlüğü, komisyon ve pazar yeri verisini birlikte okuyarak kataloğunuzu bulunur ve kârlı hale getirin.',
    'En çok fırsat taşıyan ürünleri ve düzeltilecek katalog alanlarını önceliklendiren bir performans planı çıkarmak.',
    ['Doğru kategori ve anahtar kelimeyi seçer', 'Pazar yeri verisini yorumlar', 'Komisyon sonrası performansı karşılaştırır'],
    [54, 55, 56, 57, 58], 'evidence-audit'),
  course(12, 'kargo-anlasmasi-teslimat', 'Kargo Anlaşmasını ve Teslimat Sistemini Kur', 'E-Ticaret',
    'Yalnız liste fiyatını değil desi, uzak bölge, hasar, hız ve ücretsiz kargo eşiğini birlikte değerlendirerek taşıyıcı seçin.',
    'İki kargo teklifini gerçek sipariş sepetinizle karşılaştıran ve paketleme standardını bağlayan teslimat sistemi kurmak.',
    ['Kargo tekliflerini toplam maliyetle karşılaştırır', 'Desi ve ücretsiz kargo eşiğini hesaplar', 'Paketleme ve ekspres kurallarını tanımlar'],
    [59, 60, 61, 62, 63], 'decision-lab'),

  course(13, 'belge-fatura-akisi', 'Satıştan Faturaya Belge Akışını Kur', 'Hukuk ve Vergi',
    'Satış, tahsilat, gider, iade ve e-defter kayıtlarının birbirini nasıl tamamladığını gerçek işlem akışı üzerinde görün.',
    'Bir siparişin bütün belge izini eksiksiz takip eden kontrol listesi hazırlamak.',
    ['Fatura türünü olaya göre seçer', 'Tahsilat ve gider kanıtını eşleştirir', 'İade ve e-defter izini korur'],
    [64, 65, 66, 67, 79], 'process-walkthrough'),
  course(14, 'vergi-takvimi', 'Vergi Takvimini ve Yükümlülüklerini Yönet', 'Hukuk ve Vergi',
    'Oran ezberlemek yerine verginin doğduğu olayı, beyan dönemini, sorumluyu ve kanıtı birlikte yönetin.',
    'Mali müşavirle görev sınırlarını netleştiren, kaçırılmayan bir vergi takvimi kurmak.',
    ['KDV ve gelir/kurumlar vergisi bağlamını ayırır', 'Avantaj iddialarını doğrular', 'Beyanname sorumluluğunu takvime bağlar'],
    [68, 69, 70, 71, 78], 'timeline-clinic'),
  course(15, 'mesafeli-satis-tuketici', 'Tüketici ve Mesafeli Satış Kurallarını Uygula', 'Hukuk ve Vergi',
    'Müşteriye verilen bilgi, sözleşme, iade ve garanti taahhütlerinin satış öncesinden satış sonrasına nasıl bağlandığını uygulayın.',
    'E-ticaret mağazasının müşteri karşısındaki temel metin ve süreçlerini çelişkisiz hale getirmek.',
    ['Tüketici hakkını süreçte gösterir', 'Mesafeli sözleşme ve ön bilgiyi eşleştirir', 'İade ve garanti koşullarını işler hale getirir'],
    [72, 73, 75, 76, 77], 'evidence-audit'),
  course(16, 'veri-saklama-isveren', 'Veri Saklama ve İşveren Yükümlülüklerini Kur', 'Hukuk ve Vergi',
    'Müşteri verisi ve çalışan kayıtlarını “sakla gitsin” yaklaşımıyla değil amaç, süre, erişim ve olay sorumluluğuyla yönetin.',
    'Veri saklama matrisi ile işe alım, SGK ve iş kazası adımlarını sorumlulara bağlamak.',
    ['Gizlilik ve saklama gereğini ilişkilendirir', 'İşe alım ve SGK kontrolünü kurar', 'İş kazası kayıt zincirini tanımlar'],
    [74, 80, 81, 82, 83], 'risk-workshop'),

  course(17, 'is-fikrini-dogrula', 'İş Fikrini Müşteri Problemiyle Doğrula', 'Girişimcilik',
    'Çözümünüze âşık olmadan önce müşterinin gerçekten yaşadığı problemi ve kimde daha yakıcı olduğunu kanıtlayın.',
    'Görüşme kanıtına dayalı problem tanımı, hedef kitle ve küçük MVP deneyi oluşturmak.',
    ['Varsayımı problem kanıtından ayırır', 'Hedef kitleyi daraltır', 'Öğrenme amaçlı MVP tasarlar'],
    [84, 85, 86, 87, 88], 'experiment'),
  course(18, 'is-modeli-pazar-kaniti', 'İş Modelini Pazar Kanıtıyla Kur', 'Girişimcilik',
    'Gelir ve maliyet kutularını doldurmakla yetinmeyin; rekabet, talep ve farklılaşma kanıtlarını aynı modelde birleştirin.',
    'Hangi müşteriye hangi farkla, nasıl para kazanacağınızı sınanabilir bir iş modeline dönüştürmek.',
    ['Gelir ve maliyet mantığını bağlar', 'Pazarı ve rakibi kanıtla inceler', 'Farklılaşmayı müşteri sonucuyla ifade eder'],
    [89, 90, 91, 92, 93], 'teardown'),
  course(19, 'buyume-rotasi', 'Fiyat, Kanal ve Büyüme Rotasını Seç', 'Girişimcilik',
    'Büyümeyi tek bir hedef gibi görmeyin; fiyat, kanal, şirket aşaması ve finansman biçimi arasındaki uyumu test edin.',
    'Önümüzdeki aşamaya uygun fiyat, dağıtım ve finansman seçeneklerini sıralayan büyüme rotası seçmek.',
    ['Fiyat ve kanalı iş modeline bağlar', 'Aşamaya uygun büyüme hedefi kurar', 'Bootstrapping ve yatırım seçimini karşılaştırır'],
    [94, 95, 96, 97, 98], 'decision-lab'),
  course(20, 'yatirim-ortaklik-cikis', 'Yatırımcıya Hazırlan ve Ortaklık Yapısını Kur', 'Girişimcilik',
    'Sunumu süslemek yerine yatırım tezi, fikrî haklar, ortaklık rolleri ve olası çıkış beklentilerini aynı masaya koyun.',
    'Yatırım görüşmesine girmeden önce açık kalan sahiplik ve büyüme sorularını kapatmak.',
    ['Pitch anlatısını kanıta dayandırır', 'Lisans ve franchise seçeneklerini ayırır', 'Ortaklık ve çıkış beklentisini netleştirir'],
    [99, 100, 101, 102, 103], 'conversation-clinic'),

  course(21, 'icerik-motoru', 'İçerik Motorunu Kur', 'Pazarlama',
    'Her hafta “ne paylaşacağız?” telaşını bitirin; müşteri sorularından blog, video ve sosyal içerik üreten bir sistem kurun.',
    'Dört haftalık, amaç ve dağıtım kanalı belli bir içerik üretim takvimi hazırlamak.',
    ['İçerik amacını belirler', 'Blog ve video rolünü ayırır', 'Sosyal dağıtımı planlar'],
    [104, 105, 106, 107, 108], 'operating-playbook'),
  course(22, 'sosyal-kanallarda-talep', 'Sosyal Kanallarda Talep Üret', 'Pazarlama',
    'Instagram, TikTok ve LinkedIn’i aynı içerik panosu gibi kullanmayın; her kanalın niyetini ve satıştaki rolünü tasarlayın.',
    'Üç kanal için hedef, içerik biçimi, teklif ve ölçüm farklarını gösteren yayın deneyi kurmak.',
    ['Instagram satış akışını kurar', 'TikTok keşfini test eder', 'LinkedIn iş geliştirmeyi ölçer'],
    [109, 110, 111, 112, 113], 'experiment'),
  course(23, 'reklam-donusum-ekonomisi', 'Reklam ve Dönüşüm Ekonomisini Ölç', 'Pazarlama',
    'Tıklama ve beğeni yerine reklamın kasaya bıraktığı katkıyı görün; Google ve Meta sonuçlarını aynı ekonomiyle kıyaslayın.',
    'ROAS, dönüşüm ve edinme maliyetini marjla birlikte yorumlayan reklam karar tablosu hazırlamak.',
    ['Google ve Meta kampanya mantığını ayırır', 'ROAS ve dönüşümü hesaplar', 'Edinme maliyetini kârlılıkla sınar'],
    [114, 115, 116, 117, 118], 'worked-example'),
  course(24, 'musteriyi-geri-kazan', 'Müşteriyi Geri Kazan ve Ortaklıklarla Büyü', 'Pazarlama',
    'Marka değerini tek seferlik erişimden çıkarın; yaşam boyu değer, e-posta, yeniden pazarlama ve iş ortaklıklarını birlikte yönetin.',
    'Kaybedilen talebi geri getiren ve ortaklıkların gerçek katkısını ölçen tutundurma planı kurmak.',
    ['Yaşam boyu değeri ve marka etkisini okur', 'E-posta ve sepet terkini otomatikleştirir', 'Influencer ve affiliate katkısını ölçer'],
    [119, 120, 121, 122, 123], 'process-walkthrough'),

  course(25, 'is-akisi-darbogaz', 'İş Akışını Haritala ve Darboğazı Çöz', 'Operasyon ve İnsan',
    'Sorunu kişilere yüklemeden işin nasıl aktığını görün; standart, kapasite ve kalite kontrolünü darboğaza göre kurun.',
    'Tek bir kritik süreci ölçülebilir adımlara, sorumlulara ve kontrol noktalarına ayırmak.',
    ['Süreci görünür kılar', 'Darboğaz ve kapasiteyi ölçer', 'Kalite kontrolünü akışa yerleştirir'],
    [124, 125, 126, 127, 128], 'process-walkthrough'),
  course(26, 'surekli-iyilestirme', 'Kök Nedenden Sürekli İyileştirmeye Geç', 'Operasyon ve İnsan',
    'Belirtiyi tekrar tekrar söndürmek yerine kök nedeni kanıtlayın; düzeltici faaliyetin sonucunu KPI ve görsel yönetimle izleyin.',
    'Bir operasyon sorununu kapatan, sahibi ve doğrulama ölçütü belli iyileştirme döngüsü yürütmek.',
    ['Kök neden ile belirtiyi ayırır', 'Düzeltici faaliyeti doğrular', 'KPI ve görsel ritim kurar'],
    [129, 130, 131, 132, 133], 'evidence-audit'),
  course(27, 'rol-yetkinlik-performans', 'Rolleri, Yetkinliği ve Performansı Geliştir', 'Operasyon ve İnsan',
    'Görev listesinden öteye geçin; rolün çıktısını, gerekli yetkinliği, işe uyumu ve performans konuşmasını birbirine bağlayın.',
    'Bir kritik rol için beklenti, öğrenme açığı ve geri bildirim planı hazırlamak.',
    ['Rol çıktısını tanımlar', 'Yetkinlik açığını görünür kılar', 'Performans ve geri bildirim görüşmesi yürütür'],
    [134, 135, 136, 137, 138], 'conversation-clinic'),
  course(28, 'katilim-guvenlik-kulturu', 'Çalışan Katılımı ve Güvenli İş Kültürü Kur', 'Operasyon ve İnsan',
    'Öneri ve güvenliği ayrı kampanyalar gibi değil, çalışanların riski çekinmeden görünür kıldığı tek kültür olarak kurun.',
    'Öneriden ramak kalaya kadar kayıt, değerlendirme ve geri bildirim döngüsü oluşturmak.',
    ['Öneri sistemini sonuçla bağlar', 'Tehlike ve riski ayırır', 'Ramak kala öğrenmesini kültüre taşır'],
    [139, 140, 141, 142, 143], 'risk-workshop'),

  course(29, 'satis-hunisi', 'Satış Hunisini Kur ve Doğru Müşteriyi Seç', 'Satış ve İhracat',
    'Her talebi fırsat sanmayın; adayı nitelendirip ihtiyacı açığa çıkararak değeri ve teklifi doğru sırada sunun.',
    'Satış ekibinin aynı ölçütlerle ilerlettiği, kayıp nedenleri görünen bir huni kurmak.',
    ['Huni aşamalarını tanımlar', 'Adayı ve ihtiyacı nitelendirir', 'Değer önerisi ve teklifi bağlar'],
    [144, 145, 146, 147, 148], 'conversation-clinic'),
  course(30, 'satis-tahmini-musteri-verisi', 'Satışı Tahmin Et ve Müşteri Verisini İyileştir', 'Satış ve İhracat',
    'Tahmini sezgiden kurtarın; CRM veri kalitesi, şikâyet, memnuniyet ve kayıp sinyallerini satış görünümüne katın.',
    'Fırsat olasılıklarını ve müşteri riskini kanıtla güncelleyen haftalık satış tahmini üretmek.',
    ['Ağırlıklı tahmin yapar', 'CRM veri standardı kurar', 'Şikâyet, memnuniyet ve kaybı birlikte okur'],
    [149, 150, 151, 152, 153], 'evidence-audit'),
  course(31, 'ihracata-hazirlan', 'İhracata Hazırlan ve Hedef Pazarı Seç', 'Satış ve İhracat',
    'Ürün “yurt dışında satar” varsayımıyla başlamayın; kapasite, pazar, sınıflandırma, menşe ve belge gereğini sırayla doğrulayın.',
    'Tek bir hedef pazar için eksikleri ve kanıtları gösteren ihracata hazırlık dosyası oluşturmak.',
    ['İhracat hazırlık açığını bulur', 'Hedef pazarı ölçütlerle seçer', 'GTİP, menşe ve belge kontrollerini başlatır'],
    [154, 155, 156, 157, 158], 'field-guide'),
  course(32, 'ihracat-teslimat-odeme-lojistik', 'İhracat Teslimat, Ödeme ve Lojistiğini Yönet', 'Satış ve İhracat',
    'Fiyat teklifinin arkasındaki teslim, ödeme ve lojistik riskini görün; yerelleştirme ile satış sonrası performansı aynı akışa bağlayın.',
    'Bir ihracat siparişinin ticari riski, teslim sorumluluğu ve sonuç ölçümünü uçtan uca tasarlamak.',
    ['Teslim şekli sorumluluğunu ayırır', 'Ödeme ve lojistik riskini azaltır', 'Yerelleştirme ve performansı ölçer'],
    [159, 160, 161, 162, 163], 'simulation'),

  course(33, 'surdurulebilirlik-tuketim', 'Sürdürülebilirlik Önceliklerini ve Tüketimi Ölç', 'Sürdürülebilirlik ve Tedarik',
    'Her şeyi aynı anda ölçmeye çalışmayın; işletme için önemli enerji, su, atık ve kaynak verimliliği noktalarını seçin.',
    'Öncelikli tüketimleri başlangıç değeri ve sorumlusuyla izleyen sade bir gösterge seti kurmak.',
    ['Önceliği etkiyle seçer', 'Enerji, su ve atığı ölçer', 'Kaynak verimliliğini sonuçla bağlar'],
    [164, 165, 166, 167, 168], 'evidence-audit'),
  course(34, 'karbon-tedarik-yesil-iddia', 'Karbon, Tedarik ve Yeşil İddiaları Kanıtla', 'Sürdürülebilirlik ve Tedarik',
    'Yeşil söylemi kanıtsız bırakmayın; sınır, veri, tedarikçi ve gösterge kayıtlarıyla iddianın arkasını doldurun.',
    'Bir sürdürülebilirlik iddiasını veri ve iyileştirme planıyla savunulabilir hale getirmek.',
    ['Karbon hesabının sınırını tanımlar', 'Tedarik kanıtını toplar', 'Yeşil iddia ve KPI’yı doğrular'],
    [169, 170, 171, 172, 173], 'teardown'),
  course(35, 'tedarikci-satin-alma-riski', 'Tedarikçiyi Seç ve Satın Alma Riskini Azalt', 'Sürdürülebilirlik ve Tedarik',
    'En düşük fiyatı otomatik kazanan yapmayın; kalite, teslim, sürdürülebilirlik ve tek kaynağa bağımlılığı birlikte puanlayın.',
    'Tedarikçi seçiminden satın alma talebine kadar denetlenebilir bir karar sistemi kurmak.',
    ['Seçim ölçütlerini ağırlıklandırır', 'Performans kartı oluşturur', 'Talep ve tek kaynak riskini yönetir'],
    [174, 175, 176, 177, 178], 'decision-lab'),
  course(36, 'stok-tedarik-talep', 'Stok ve Tedarik Süresini Talebe Göre Planla', 'Sürdürülebilirlik ve Tedarik',
    'Fazla stok ile stoksuz kalma arasındaki dengeyi sezgiye bırakmayın; talep ve tedarik süresini senaryolarla bağlayın.',
    'Yeniden sipariş noktası, emniyet stoğu ve kesinti senaryosu içeren stok politikası kurmak.',
    ['Emniyet stoğu ve sipariş noktasını hesaplar', 'Talep ve tedarik süresini izler', 'Kesinti senaryosuna hazırlık yapar'],
    [179, 180, 181, 182, 183], 'simulation'),

  course(37, 'siber-temel', 'İşletmenin Siber Temelini Kur', 'Siber Güvenlik ve AI',
    'Güvenliği yalnız teknoloji ekibine bırakmayın; kritik varlıkları, erişimi ve güncelleme sorumluluğunu işletme kararı haline getirin.',
    'İlk 30 günde kapatılacak kritik siber açıkları sahipleriyle sıralamak.',
    ['Siber risk sahipliğini kurar', 'Varlık ve erişimi görünür kılar', 'MFA, yetki ve yama temelini uygular'],
    [184, 185, 186, 187, 188], 'risk-workshop'),
  course(38, 'yedekleme-oltalama-olay', 'Yedekleme, Oltalama ve Olay Müdahalesini Hazırla', 'Siber Güvenlik ve AI',
    'Olay gününde plan yazmaya çalışmayın; yedek geri dönüşünü, oltalama bildirimini, tedarikçi temasını ve veri önceliğini önceden sınayın.',
    'Küçük ekibin gerçekten uygulayabileceği siber olay masabaşı tatbikatı yürütmek.',
    ['Yedeği geri dönüşle doğrular', 'Oltalama ve olay akışını uygular', 'Tedarikçi ve veri önceliğini yönetir'],
    [189, 190, 191, 192, 193], 'simulation'),
  course(39, 'dogru-ai-kullanimi', 'İşletmen İçin Doğru AI Kullanımını Seç', 'Siber Güvenlik ve AI',
    'AI’ı moda olduğu için değil, ölçülebilir bir iş darboğazını daha güvenli ve hızlı çözebildiği için kullanın.',
    'Değer, hazırlık ve risk ölçütleriyle tek bir AI pilotunu seçip insan gözetimini tasarlamak.',
    ['Kullanım senaryosunu değerle seçer', 'Hazırlık ve riski değerlendirir', 'İnsan gözetimi ve doğrulamayı kurar'],
    [194, 195, 196, 197, 198], 'experiment'),
  course(40, 'ai-veri-tedarikci-politika', 'AI Verisini, Tedarikçisini ve Politikasını Yönet', 'Siber Güvenlik ve AI',
    'Pilotun çalışması yetmez; veri kalitesini, tedarikçi koşullarını, fayda ölçümünü ve kullanım sınırlarını kalıcı yönetime dönüştürün.',
    'AI hizmetini satın almadan ve ölçeklemeden önce kullanılacak kanıtlı yönetişim dosyası hazırlamak.',
    ['Veri ve tedarikçiyi değerlendirir', 'Pilotu ve faydayı ölçer', 'Sorumlu kullanım politikasını uygular'],
    [199, 200, 201, 202, 203], 'operating-playbook'),
]

export const ALL_TOPIC_COURSE_IDS = [...new Set(CURRICULUM_V4.flatMap(item => item.topicCourseIds))]

if (CURRICULUM_V4.length !== 40) throw new Error(`V4 must contain 40 courses, received ${CURRICULUM_V4.length}`)
if (CURRICULUM_V4.some(course => course.topicCourseIds.length !== 5)) {
  throw new Error('Every V4 course must contain exactly five canonical lessons.')
}
if (ALL_TOPIC_COURSE_IDS.length !== 200) throw new Error(`V4 must map 200 source topics, received ${ALL_TOPIC_COURSE_IDS.length}`)
