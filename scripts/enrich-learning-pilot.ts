import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PilotKO {
  koId: number; code: string; title: string; category: string;
  topicKey: string; lessonId: number; courseId: number; courseTitle: string; sourceCodes: string[];
}

function deterministicChoice<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
  return items[Math.abs(hash) % items.length];
}

function hashRange(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
  return Math.abs(hash) % max;
}

const NAKD_SUMMARIES = [
  `Nakit Akışı, KOBİ’lerin finansal sağlığının en önemli göstergelerinden biridir. İşletmeler, nakit giriş ve çıkışlarını doğru yöneterek ödeme güçlüklerinden kaçınabilir ve büyüme fırsatlarını değerlendirebilir. Bu içerikte, nakit akış tablosunun hazırlanması, işletme sermayesi yönetimi ve nakit döngüsünün optimize edilmesi gibi temel konular KOBİ perspektifinden ele alınmaktadır. Düzenli nakit akışı takibi, işletmelerin beklenmedik giderlere karşı hazırlıklı olmasını sağlar ve kredi ihtiyacını minimize eder.`,
  `Nakit akışı yönetimi, bir işletmenin kısa vadeli yükümlülüklerini yerine getirebilmesi için kritik öneme sahiptir. KOBİ’ler için nakit akış projeksiyonu hazırlamak, gelecekteki nakit açıklarını önceden görmeyi ve önleyici tedbirler almayı mümkün kılar. Bu bölümde, nakit akış tablosunun temel bileşenleri olan işletme faaliyetleri, yatırım faaliyetleri ve finansman faaliyetleri detaylandırılmakta, her bir kalemin KOBİ ölçeğinde nasıl yönetileceği açıklanmaktadır.`,
  `KOBİ’lerde nakit akışı sorunlarının başlıca nedeni, tahsilat ve ödeme döngüleri arasındaki uyumsuzluktur. Müşterilere tanınan vade ile tedarikçilere yapılan ödeme vadesi arasındaki fark, işletme sermayesi ihtiyacını doğrudan etkiler. Bu içerik, nakit döngüsünü kısaltma yöntemleri, erken tahsilat stratejileri ve acil durum nakit rezervi oluşturma gibi pratik konuları kapsamaktadır.`,
  `Başarılı bir nakit akışı yönetimi için sadece geçmiş verilere değil, geleceğe yönelik projeksiyonlara da ihtiyaç vardır. KOBİ’ler, 3 aylık ve 12 aylık nakit akış tahminleri hazırlayarak mevsimsel dalgalanmalara ve beklenmedik harcamalara karşı hazırlıklı olabilir. Bu içerikte, nakit akış tablosu hazırlama adımları, sık yapılan hatalar ve dijital araçlarla takip yöntemleri anlatılmaktadır.`,
  `Nakit akışı, bir işletmenin kârlılığından daha önemli olabilir. Kâr eden ancak nakit sıkışıklığı yaşayan işletmeler, kısa vadeli yükümlülüklerini yerine getiremediği için iflas edebilir. Bu nedenle, KOBİ’lerin nakit akışını kâr-zarar tablosuyla birlikte değerlendirmesi gerekir. İçerik boyunca, nakit akışını iyileştirme yöntemleri ve sürdürülebilir nakit yönetimi stratejileri ele alınmaktadır.`,
];

const MALIYET_SUMMARIES = [
  `Gerçek birim maliyet, bir ürün veya hizmetin üretiminde kullanılan tüm kaynakların parasal değeridir. KOBİler, birim maliyeti doğru hesapladıklarında fiyatlandırma stratejilerini daha sağlıklı belirleyebilir ve kârlılıklarını artırabilir. Bu içerikte, sabit ve değişken maliyetlerin birim bazında dağıtılması, başabaş noktası analizi ve maliyet avantajı yaratma yöntemleri anlatılmaktadır.`,
  `Birim maliyet hesaplamasında yapılan en yaygın hata, genel üretim giderlerini ürünlere dağıtmamaktır. KOBİlerin çoğu yalnızca hammadde ve işçilik maliyetini dikkate alır, kira, elektrik, bakım ve amortisman gibi dolaylı giderleri göz ardı eder. Bu durum, gerçek maliyetin olduğundan düşük görünmesine ve hatalı fiyatlandırmaya yol açar.`,
  `Maliyet muhasebesi, KOBİler için karmaşık görünse de temel prensipleri anlaşıldığında kolayca uygulanabilir. Ürün bazında maliyet hesaplama, fire oranlarını belirleme ve verimlilik ölçümü gibi konular, işletmelerin rekabet gücünü artıran kritik bilgilerdir. Bu içerik, adım adım birim maliyet hesaplama rehberi sunmaktadır.`,
  `Doğru birim maliyet hesaplaması, sadece fiyatlandırma için değil, aynı zamanda ürün karması kararları, dış kaynak kullanımı değerlendirmeleri ve yatırım analizleri için de gereklidir. KOBİler, hangi ürünlerinin kârlı olduğunu bilmeden stratejik karar alamaz. Bu içerikte, maliyet-hacim-kâr analizi ve katkı payı hesaplama yöntemleri anlatılmaktadır.`,
  `Birim maliyet hesaplamasında sabit giderlerin ürünlere dağıtılması en karmaşık adımdır. KOBİler, makine saatleri veya işçilik saatleri gibi dağıtım anahtarları kullanarak genel giderleri ürün bazında paylaştırabilir. Bu içerik, farklı dağıtım yöntemlerini karşılaştırmalı olarak ele almakta ve her birinin KOBİ ölçeğinde uygulanabilirliğini değerlendirmektedir.`,
];

const ETICARET_SUMMARIES = [
  `Pazar yeri seçimi, e-ticaret yapacak KOBİlerin vereceği en stratejik kararlardan biridir. Doğru platform seçimi, hedef kitleye erişim, komisyon oranları, lojistik entegrasyon ve rekabet yoğunluğu gibi faktörlere bağlıdır. Bu içerikte, Türkiyedeki başlıca e-ticaret pazar yerlerinin karşılaştırması ve seçim kriterleri ele alınmaktadır.`,
  `Her pazar yerinin farklı bir müşteri kitlesi, komisyon yapısı ve hizmet modeli vardır. KOBİler, ürün özelliklerine ve hedef kitlelerine en uygun platformu seçerek satışlarını optimize edebilir. Bu içerik, pazar yeri seçim sürecini adım adım açıklamakta ve her platformun avantajlarını KOBİ perspektifinden değerlendirmektedir.`,
  `Tek bir pazar yerine bağımlı olmak risklidir. KOBİler, birden fazla kanalda varlık göstererek riski dağıtabilir ve daha geniş bir müşteri kitlesine ulaşabilir. Ancak her kanalın operasyonel yükü ve maliyeti farklıdır. Bu içerikte, çok kanallı satış stratejisi, entegrasyon maliyetleri ve envanter yönetimi konuları incelenmektedir.`,
  `Pazar yeri seçiminde hedef kitlenin demografik özellikleri ve alışveriş alışkanlıkları belirleyici rol oynar. Her platformun kullanıcı profili farklıdır; bazı platformlar daha genç kitleye hitap ederken bazıları daha geniş bir yaş aralığına sahiptir. KOBİler, ürünlerinin hedef kitlesinin en yoğun olduğu platformu seçerek pazarlama bütçesini daha verimli kullanabilir.`,
  `Pazar yeri lojistik altyapısı, KOBİlerin müşteri memnuniyetini doğrudan etkileyen bir faktördür. Hızlı kargo, kolay iade ve güvenilir teslimat, müşteri deneyimini belirleyen temel unsurlardır. KOBİler, pazar yeri seçerken lojistik hizmet kalitesini ve maliyetlerini dikkatle değerlendirmeli, kendi operasyonel kapasitesine en uygun modeli tercih etmelidir.`,
];

const GIRISIM_SUMMARIES = [
  `İş fikri geliştirme, girişimciliğin en kritik aşamalarından biridir. Başarılı bir iş fikri, bir problemi çözmeli, hedef kitlenin ihtiyacına yanıt vermeli ve sürdürülebilir bir gelir modeline sahip olmalıdır. Bu içerik, iş fikri bulma ve geliştirme yöntemlerini, iş modeli kanvası kullanımını ve fikir doğrulama tekniklerini kapsamaktadır.`,
  `İş fikrinden iş modeline geçiş, girişimcilerin en zorlandığı aşamadır. Bir fikrin işe dönüşebilmesi için pazar araştırması, müşteri doğrulaması ve finansal fizibilite çalışmaları yapılmalıdır. Bu içerikte, KOSGEB destekleri, yalın girişimcilik yöntemleri ve MVP geliştirme süreci anlatılmaktadır.`,
  `İş modeli kanvası, girişimcilerin iş fikirlerini dokuz temel bileşen etrafında yapılandırmasını sağlayan stratejik bir araçtır. Müşteri segmentleri, değer önerisi, gelir akışları ve maliyet yapısı gibi bileşenlerin her biri, iş modelinin sürdürülebilirliği için kritik öneme sahiptir. KOBİ girişimcileri, kanvası doldurarak iş planlarındaki boşlukları görebilir ve yatırımcı sunumlarını güçlendirebilir.`,
  `Müşteri doğrulaması, iş fikri geliştirme sürecinin en kritik adımıdır. Girişimciler, potansiyel müşterilerle yapacakları derinlemesine görüşmeler ve anketler sayesinde ürün-pazar uyumunu test edebilir. Bu aşamada alınan geri bildirimler, iş modelinde yapılacak düzeltmeler için hayati öneme sahiptir ve ileride oluşabilecek büyük kayıpları önler.`,
  `Finansal fizibilite, bir iş fikrinin hayata geçirilmeden önce ekonomik olarak değerlendirilmesidir. Girişimciler, başlangıç maliyetleri, işletme giderleri ve beklenen gelirleri projekte ederek başabaş noktasını ve yatırım geri dönüş süresini hesaplamalıdır. KOSGEB destekleri ve melek yatırımcı ağları, finansal fizibilitesi güçlü iş fikirleri için önemli kaynaklardır.`,
];

const AI_SUMMARIES = [
  `Yapay zeka kullanım senaryosu seçimi, KOBİlerin dijital dönüşüm yolculuğundaki ilk adımdır. Doğru senaryo seçimi, işletmenin en acil sorununu çözmeli ve ölçülebilir fayda sağlamalıdır. Bu içerikte, yapay zekanın KOBİlerde hangi alanlarda kullanılabileceği, önceliklendirme kriterleri ve başlangıç projeleri için öneriler sunulmaktadır.`,
  `Yapay zeka projelerinin başarısı, doğru kullanım senaryosu seçimine bağlıdır. KOBİler, mevcut veri altyapılarını değerlendirmeli, en yüksek etkiyi yaratacak alanları belirlemeli ve küçük ölçekli pilot projelerle başlamalıdır. Bu içerik, AI projelerinin ROI analizi ve risk değerlendirmesi konularını kapsamaktadır.`,
  `KOBİler için yapay zeka projeleri, büyük ölçekli dönüşümler yerine belirli iş süreçlerindeki iyileştirmelere odaklanmalıdır. Müşteri hizmetleri, envanter yönetimi, satış tahmini ve belge işleme gibi alanlarda hazır AI çözümleri, düşük maliyetle yüksek verimlilik artışı sağlayabilir. Başarılı bir AI stratejisi, küçük kazanımlarla başlayıp zamanla genişleyen bir yol haritası izlemelidir.`,
];

const CYBER_SUMMARIES = [
  `Siber risk yönetişimi, KOBİ’lerin dijital varlıklarını korumak için benimsemesi gereken sistematik yaklaşımdır. Küçük işletmeler, siber saldırıların hedefi olmayacağını düşünse de veriler, KOBİ’lerin büyük şirketlerden daha sık hedef alındığını göstermektedir. Bu içerikte, temel siber güvenlik politikaları, risk değerlendirme yöntemleri ve KVKK uyum süreci anlatılmaktadır.`,
  `Etkili bir siber risk yönetişimi, teknik önlemlerden önce kurumsal farkındalık ve yönetim desteği gerektirir. KOBİ’ler, sınırlı bütçelerine rağmen en kritik varlıklarını koruyacak önlemleri önceliklendirebilir. Bu içerikte, NIST ve ISO 27001 gibi çerçevelerin KOBİ ölçeğinde uygulanması ve acil durum müdahale planlaması ele alınmaktadır.`,
];

const EXPORT_SUMMARIES = [
  `İhracata hazırlık analizi, bir işletmenin yurtdışı pazarlara açılmadan önce yapması gereken kapsamlı değerlendirmedir. KOBİler, ihracat potansiyellerini belirlemek için ürün uygunluğu, hedef pazar analizi, lojistik altyapı ve finansal kapasite gibi boyutları incelemelidir. Bu içerikte, Ticaret Bakanlığı destekleri ve ihracat yol haritası sunulmaktadır.`,
  `İhracat yapmak isteyen KOBİler için en kritik adım, doğru hedef pazarı seçmektir. Pazar araştırması, talep analizi, rekabet durumu ve gümrük mevzuatı gibi faktörler dikkatle değerlendirilmelidir. Bu içerik, ihracata hazırlık sürecini adım adım açıklamakta ve başlangıç için en uygun pazarların belirlenmesine yardımcı olmaktadır.`,
  `İhracat sürecinde finansal hazırlık, operasyonel hazırlık kadar önemlidir. KOBİler, ihracat maliyetlerini (nakliye, sigorta, gümrük) doğru hesaplamalı, döviz kuru riskine karşı korunma yöntemlerini değerlendirmeli ve ihracat finansmanı seçeneklerini (Eximbank kredileri, factoring) araştırmalıdır. Bu içerik, ihracatın finansal boyutunu KOBİ perspektifinden ele almaktadır.`,
];

const SALES_SUMMARIES = [
  `Satış hunisi, müşteri adayının markayla ilk temastan satın almaya kadar geçirdiği aşamaları gösteren bir modeldir. KOBİ’ler, satış hunilerini analiz ederek hangi aşamada müşteri kaybettiklerini görebilir ve dönüşüm oranlarını iyileştirebilir. Bu içerikte, huni oluşturma, aday kalifikasyonu ve satış süreci optimizasyonu anlatılmaktadır.`,
  `Etkili bir satış hunisi, potansiyel müşterileri sistematik olarak müşteriye dönüştürür. KOBİ’ler için dijital araçlarla desteklenen bir satış hunisi, müşteri adayı yönetimini kolaylaştırır ve satış tahminlemesini iyileştirir. Bu içerik, huni metriklerinin takibi ve optimizasyon yöntemlerini kapsamaktadır.`,
];

const SUMMARY_POOL: Record<string, string[]> = {
  'Nakit Akışı': NAKD_SUMMARIES,
  'Gerçek Birim Maliyet': MALIYET_SUMMARIES,
  'Pazar Yeri Seçimi': ETICARET_SUMMARIES,
  'İş Fikri Geliştirme': GIRISIM_SUMMARIES,
  'AI Kullanım Senaryosu Seçimi': AI_SUMMARIES,
  'Siber Risk Yönetişimi': CYBER_SUMMARIES,
  'İhracata Hazırlık Analizi': EXPORT_SUMMARIES,
  'Satış Hunisi': SALES_SUMMARIES,
};

const TAKEAWAY_POOL: Record<string, string[]> = {
  'Nakit Akışı': [
    'Nakit akış tablosu, işletmenin likidite durumunu gösteren en önemli finansal rapordur',
    'Nakit döngüsünü kısaltmak işletme sermayesi ihtiyacını azaltır',
    'Düzenli nakit akış projeksiyonu, beklenmedik nakit sıkışıklıklarını önceden görmeyi sağlar',
    'Müşteri tahsilat süresi ile tedarikçi ödeme vadesi arasındaki fark nakit akışını doğrudan etkiler',
    'Acil durum nakit rezervi, işletmenin kriz dönemlerinde ayakta kalmasını sağlar',
    'Nakit akışı kârlılıktan daha önemli olabilir; kâr eden işletmeler nakit sıkışıklığı nedeniyle iflas edebilir',
    'Üç aylık ve on iki aylık nakit akış tahminleri, mevsimsel dalgalanmalara karşı hazırlıklı olmayı sağlar',
    'Erken tahsilat iskontosu ve online ödeme seçenekleri nakit girişini hızlandırır',
  ],
  'Gerçek Birim Maliyet': [
    'Gerçek birim maliyet, sabit ve değişken tüm giderlerin ürün başına dağıtılmasıyla hesaplanır',
    'Genel üretim giderlerini ürünlere dağıtmamak maliyetin olduğundan düşük görünmesine yol açar',
    'Doğru birim maliyet bilgisi, sağlıklı fiyatlandırma stratejisinin temelidir',
    'Maliyet-hacim-kâr analizi, hangi ürünlerin kârlı olduğunu belirlemeye yardımcı olur',
    'Fire oranları ve verimlilik ölçümleri, birim maliyetin optimize edilmesini sağlar',
    'Düzenli maliyet güncellemesi, enflasyonist ortamda fiyatlandırmanın güncel kalmasını sağlar',
  ],
  'Pazar Yeri Seçimi': [
    'Pazar yeri seçiminde komisyon oranı, hedef kitle ve lojistik entegrasyon ana kriterlerdir',
    'Tek bir platforma bağımlı olmak risklidir; çok kanallı satış stratejisi benimsenmelidir',
    'Her pazar yerinin müşteri profili ve hizmet modeli farklıdır, ürün özelliklerine uygun seçim yapılmalıdır',
    'Pazar yeri reklam ve görünürlük araçları, başlangıç satışlarını hızlandırabilir',
    'Platform maliyetleri ile beklenen satış hacmi arasında denge kurulmalıdır',
  ],
  'İş Fikri Geliştirme': [
    'Başarılı iş fikirleri, gerçek bir problemi çözer ve sürdürülebilir bir gelir modeline sahiptir',
    'İş modeli kanvası, fikri yapılandırmak ve eksikleri görmek için etkili bir araçtır',
    'Müşteri doğrulaması yapılmadan hayata geçirilen iş fikirleri başarısız olma riski taşır',
    'KOSGEB ve diğer kamu destekleri, girişimcilerin ilk adımı atmasını kolaylaştırır',
    'MVP (Minimum Viable Product) yaklaşımı, fikri küçük ölçekte test etmeyi sağlar',
  ],
  'AI Kullanım Senaryosu Seçimi': [
    'AI senaryosu seçiminde işletmenin en acil sorunu ve ölçülebilir fayda önceliklendirilmelidir',
    'Mevcut veri altyapısı, AI projesinin başarısında kritik faktördür',
    'Küçük ölçekli pilot projelerle başlamak, riski minimize eder',
    'AI projelerinin ROI analizi, yatırım kararının temelini oluşturur',
    'KOBİ’ler için hazır AI çözümleri, sıfırdan geliştirmeye göre daha hızlı sonuç verir',
  ],
  'Siber Risk Yönetişimi': [
    'Siber risk yönetişimi, teknik önlemlerden önce yönetim desteği ve farkındalık gerektirir',
    'KOBİ’ler siber saldırıların hedefi olmayacağını düşünmemeli, temel önlemleri almalıdır',
    'NIST ve ISO 27001 gibi çerçeveler KOBİ ölçeğine uyarlanabilir',
    'KVKK uyumu, müşteri verilerinin korunması için yasal bir zorunluluktur',
    'Düzenli yedekleme ve güncelleme, en temel siber güvenlik önlemleridir',
  ],
  'İhracata Hazırlık Analizi': [
    'İhracata başlamadan önce ürün uygunluğu ve hedef pazar analizi yapılmalıdır',
    'Ticaret Bakanlığı ihracat destekleri, KOBİ’lerin yurtdışına açılmasını kolaylaştırır',
    'Hedef pazar seçiminde talep analizi, rekabet durumu ve gümrük mevzuatı dikkate alınmalıdır',
    'İhracat lojistiği ve ödeme yöntemleri, başarılı ihracatın operasyonel temelidir',
    'Pazar çeşitlendirmesi, tek pazara bağımlılık riskini azaltır',
  ],
  'Satış Hunisi': [
    'Satış hunisi, müşteri adayının satın alma yolculuğundaki her aşamayı görünür kılar',
    'Huni analizi, hangi aşamada müşteri kaybedildiğini tespit etmeye yardımcı olur',
    'Dijital araçlarla desteklenen satış hunisi, aday yönetimini kolaylaştırır',
    'Dönüşüm oranlarının düzenli takibi, huni optimizasyonunun temelidir',
    'Müşteri adayı kalifikasyonu, satış eforunun doğru adaylara odaklanmasını sağlar',
  ],
};

const MISTAKE_POOL: Record<string, string[]> = {
  'Nakit Akışı': [
    'Nakit akışını yalnızca dönem sonunda kontrol etmek, sorunları geç fark etmeye yol açar',
    'Geçmiş verilere odaklanıp gelecek projeksiyonları ihmal etmek',
    'Mevsimsel dalgalanmaları nakit akış projeksiyonuna dahil etmemek',
    'Nakit akışı ile kârlılığı karıştırmak ve kâr ediyorum diye nakit sıkışıklığını önemsememek',
    'Acil durum nakit rezervi oluşturmamak ve her krizde krediye yönelmek',
    'Tahsilat süresini uzun tutup tedarikçi ödemelerini kısaltarak nakit dengesizliği yaratmak',
  ],
  'Gerçek Birim Maliyet': [
    'Yalnızca hammadde ve işçilik maliyetini hesaplayıp genel giderleri göz ardı etmek',
    'Birim maliyeti yılda bir kez güncellemek ve enflasyonu yansıtmamak',
    'Tüm ürünlere aynı kâr marjını uygulamak ve her ürünün maliyet yapısını dikkate almamak',
    'Fire oranlarını ve üretim kayıplarını maliyet hesaplamasına dahil etmemek',
  ],
  'Pazar Yeri Seçimi': [
    'En popüler pazar yerini araştırmadan seçmek ve ürün-hedef kitle uyumunu kontrol etmemek',
    'Komisyon oranlarına odaklanıp platformun görünürlük ve lojistik avantajlarını göz ardı etmek',
    'Müşteri yorumları ve iade oranları gibi platform kalite göstergelerini değerlendirmemek',
  ],
  'İş Fikri Geliştirme': [
    'Pazar araştırması yapmadan doğrudan uygulamaya geçmek',
    'Müşteri segmentini netleştirmeden herkese hitap etmeye çalışmak',
    'Rakipleri ve mevcut çözümleri analiz etmeden pazara girmek',
    'Finansal fizibilite ve başabaş noktası hesaplaması yapmamak',
  ],
  'AI Kullanım Senaryosu Seçimi': [
    'En popüler AI trendini takip edip işletmenin gerçek ihtiyacını dikkate almamak',
    'Mevcut veri kalitesini değerlendirmeden projeye başlamak',
    'Tüm süreci AI ile değiştirmeye çalışmak yerine belirli görevlerde iyileştirme hedeflememek',
  ],
  'Siber Risk Yönetişimi': [
    'Küçük işletmeyiz hedef olmayız düşüncesiyle hiçbir önlem almamak',
    'Yalnızca teknik çözümlere odaklanıp çalışan farkındalığını ihmal etmek',
    'Yedekleme ve güncelleme gibi temel önlemleri düzenli uygulamamak',
    'KVKK yükümlülüklerini ertelemek ve müşteri verilerini korumasız bırakmak',
  ],
  'İhracata Hazırlık Analizi': [
    'Hedef pazar mevzuatını araştırmadan ihracata başlamak',
    'Tüm ihracat yükünü tek bir pazara odaklamak',
    'Döviz kuru riskine karşı korunma yöntemlerini dikkate almamak',
    'İhracat maliyetlerini (nakliye, sigorta, gümrük) fiyata yansıtmamak',
  ],
  'Satış Hunisi': [
    'Satış hunisini kurup düzenli takip ve optimizasyon yapmamak',
    'Tüm huni aşamalarını aynı anda optimize etmeye çalışmak ve önceliklendirme yapmamak',
    'Müşteri adaylarını kalifiye etmeden tüm adaylara aynı yaklaşımı uygulamak',
    'Huni metriklerini satış ekibiyle paylaşmamak ve ortak hedef belirlememek',
  ],
};

const EXAMPLE_POOL: Record<string, string[]> = {
  'Nakit Akışı': [
    'İstanbulda hazır giyim atölyesi işleten Ayşe Hanım, nakit akışı yönetimi kapsamında nakit akış tablosu çıkararak 60 gün vadeli satışlarının nakit dengesini bozduğunu fark etti. Tedarikçilerine 30 günde ödeme yaparken müşterilerinden 60 günde tahsilat yapıyordu. Erken ödeme iskontosu uygulayarak tahsilat süresini 30 güne düşürdü ve kredi ihtiyacını yüzde 40 azalttı.',
    'Ankarada bir lokanta işletmecisi, nakit akışı yönetimi için üç aylık nakit akış projeksiyonu hazırlayarak yaz aylarında biriken fazla nakdi kış aylarına aktardı. Nakit akışı dengesini bu şekilde sağlayarak kredi çekme ihtiyacını ortadan kaldırdı.',
    'Bursada bir mobilya üreticisi, nakit akışı simülasyonu yaparak yeni makine yatırımının 4. ayda nakit sıkışıklığı yaratacağını gördü. Nakit akışı planlaması sayesinde yatırımı 2 ay erteleyerek ve bir müşteriden erken tahsilat yaparak dönemi risksiz atlattı.',
  ],
  'Gerçek Birim Maliyet': [
    'Gaziantep\'te bir tekstil üreticisi, gerçek birim maliyetini yalnızca hammadde ve işçilik üzerinden hesaplıyordu. Genel üretim giderlerini dağıtmadığı için gerçek birim maliyetinin yüzde 25 altında fiyatlandırma yaptığını fark etti. Maliyet muhasebesi danışmanlığı alarak tüm gider kalemlerini ürün bazında dağıtan bir sistem kurdu ve altı ay içinde kârlılık oranını yüzde 12 artırdı.',
    'Konyada bir makine imalatçısı, ürünlerinin gerçek birim maliyetini yılda bir kez güncelliyordu. Yıllık yüzde 40 enflasyon ortamında altı ay içinde maliyetler satış fiyatını aştı. Gerçek birim maliyet takibine geçerek her ay fiyat güncellemesi yapmaya başladı ve kâr marjını korudu.',
    'Bursada bir mobilya üreticisi, gerçek birim maliyet hesaplamasına fire oranlarını dahil etmediği için ürün başına maliyeti olduğundan düşük hesaplıyordu. Gerçek birim maliyet hesaplamasını fire dahil yeniden yapınca satış fiyatını yüzde 18 artırması gerektiğini gördü ve fiyatlama stratejisini yeniledi.',
    'Bir fırın işletmecisi, ürünlerinin gerçek birim maliyetini hesaplarken elektrik ve doğalgaz giderlerini ürünlere dağıtmıyordu. Gerçek birim maliyete bu giderleri ekleyince ekmek başına maliyetin tahmininden yüzde 30 fazla olduğunu fark etti ve fire yönetimini iyileştirdi.',
    'Bir atölye sahibi, gerçek birim maliyet hesabına amortisman giderini dahil etmediği için makinelerin yenileme maliyetini karşılayamadı. Gerçek birim maliyete amortismanı ekleyerek fiyatlandırmayı güncelledi ve makine yatırım bütçesini oluşturdu.',
  ],
  'Pazar Yeri Seçimi': [
    'Eskişehir\'de el yapımı seramik ürünleri satan bir girişimci, pazar yeri seçimi olarak Trendyol ve kendi web sitesinde eş zamanlı satış yapmaya karar verdi. Trendyolun yüksek komisyonuna rağmen görünürlük avantajı sayesinde satışlarını üç katına çıkardı. Altı ay sonra Trendyol müşterilerinin yüzde 15i markasını öğrenerek doğrudan kendi sitesinden alışveriş yapmaya başladı.',
    'İzmirde zeytinyağı üreticisi bir KOBİ, Amazon Türkiyeyi pazar yeri seçimi olarak belirleyerek yurtdışı satışlarına başladı. Platformun lojistik desteği sayesinde depolama ve kargo sorununu çözdü, ilk yılda ihracat gelirini iki katına çıkardı.',
    'Bir el işi ürünleri markası, pazar yeri seçimi olarak önce büyük bir pazaryerinde satışa başladı, ardından kendi marka sitesini açtı. Doğru pazar yeri seçimi sayesinde üç kanalda birden satış yaparak toplam cirosunu 6 ayda 4 kat artırdı.',
    'Bir kitap yayınevi, pazar yeri seçimi yaparken kitap kategorisinde güçlü olan platformu tercih etti. Bu pazar yeri seçimi stratejisi sayesinde rakiplerinden daha görünür oldu ve ilk ayda 1000 siparişe ulaştı.',
    'Bir bebek ürünleri markası, pazar yeri seçimi için anne-baba forumlarını ve sosyal medya gruplarını analiz etti. Veriye dayalı pazar yeri seçimi sonucunda hedef kitlesinin en yoğun olduğu iki platformda satışa başladı ve dönüşüm oranını yüzde 8e çıkardı.',
  ],
  'İş Fikri Geliştirme': [
    'Diyarbakırda bir üniversite mezunu, organik sebze yetiştirme iş fikri geliştirme sürecini KOSGEB desteğiyle tamamladı. İş modeli kanvasını doldururken müşteri segmentini doğru belirledi: ilk aşamada şehir merkezindeki organik pazarlar ve online sipariş platformları. İki yıl içinde dört kişilik ekiple aylık 50 bin TL ciroya ulaştı.',
    'Bir yazılım geliştirici, mahalle esnafı için mobil sipariş uygulaması iş fikri geliştirme çalışmasını 20 esnafla yaptığı görüşmelerle doğruladı. MVPyi üç haftada çıkardı ve ilk ayda 5 bakkal tarafından kullanılmaya başlandı.',
    'Bir ev hanımı, online pasta siparişi iş fikri geliştirme sürecini Instagram üzerinden başlattı. İş fikri geliştirme aşamasında müşteri geri bildirimlerini toplayarak ürün çeşitliliğini artırdı ve 6 ayda aylık 15 bin TL gelire ulaştı.',
    'Bir mühendis, atıl durumdaki aile arazisinde lavanta üretimi iş fikri geliştirme çalışması yaptı. İş fikri geliştirme sürecinde KOSGEBden aldığı eğitimle fizibilite raporu hazırladı ve iki yılda 10 dönümlük lavanta bahçesi kurdu.',
    'Bir genç girişimci, yaşlılara evde bakım hizmeti iş fikri geliştirme çalışması için 50 aileyle anket yaptı. İş fikri geliştirme sonucunda talep olduğunu doğrulayarak üç kişilik ekiple hizmet vermeye başladı ve ilk yılda 100 müşteriye ulaştı.',
  ],
  'AI Kullanım Senaryosu Seçimi': [
    'Bir e-ticaret KOBİsi, AI kullanım senaryosu seçimi olarak müşteri hizmetleri yanıt süresini azaltmak için hazır bir AI sohbet botu çözümü kullanmaya başladı. Bu AI kullanım senaryosu sayesinde sık sorulan soruların yüzde 60ı bot tarafından yanıtlanır hale geldi ve müşteri memnuniyeti yüzde 15 arttı.',
    'Bir muhasebe bürosu, AI kullanım senaryosu seçimi olarak fatura okuma ve sınıflandırma için AI destekli bir yazılım kullandı. Bu AI kullanım senaryosu ile belge işleme süresini günde 4 saatten 1 saate düşürdü.',
    'Bir perakende zinciri, stok yönetimi için AI kullanım senaryosu seçimi yaparak talep tahmini yazılımı kullanmaya başladı. Bu AI kullanım senaryosu sayesinde stok maliyetlerini yüzde 20 azalttı ve satış kaybını minimize etti.',
  ],
  'Siber Risk Yönetişimi': [
    'Bir KOBİ, siber risk yönetişimi eksikliği nedeniyle çalışanının phishing e-postasına tıklaması sonucu müşteri veritabanını kaybetti. Olay sonrası siber risk yönetişimi politikaları oluşturdu: haftalık yedekleme, güçlü parola zorunluluğu ve iki faktörlü doğrulama. Bir yıl içinde herhangi bir güvenlik olayı yaşamadı.',
    'Bir perakende işletmesi, siber risk yönetişimi kapsamında KVKK gereği müşteri verilerini şifrelemeye başladı. Veri sızıntısı durumunda cezai yaptırımlardan korunmak için KVKK uyum sürecini tamamladı.',
    'Bir lojistik firması, siber risk yönetişimi çerçevesinde tüm çalışanlarına temel siber güvenlik eğitimi verdi ve iki faktörlü doğrulamayı zorunlu kıldı. Siber risk yönetişimi iyileştirmeleri sayesinde bir yıl içinde hiçbir güvenlik ihlali yaşanmadı.',
  ],
  'İhracata Hazırlık Analizi': [
    'Bir gıda üreticisi, ihracata hazırlık analizi yaparak Almanya pazarına girmeye karar verdi. Ticaret Bakanlığı İhracat Akademisinden eğitim aldı ve ihracata hazırlık analizi sonucunda ürün ambalajını Avrupa standartlarına uyarladı. İlk yılda 200 bin Euro ihracat geliri elde etti.',
    'Bir makine yedek parça üreticisi, ihracata hazırlık analizi kapsamında Ortadoğu pazarını hedefleyerek fuar katılımı ve distribütör anlaşması yoluyla ihracata başladı. İhracata hazırlık analizi sonrası ilk yıl 5 ülkeye ihracat yaparak toplam gelirinin yüzde 30unu ihracattan elde etti.',
    'Bir tekstil firması, ihracata hazırlık analizi için danışmanlık hizmeti aldı. İhracata hazırlık analizi raporunda hedef pazar olarak İngiltereyi belirledi ve ürünlerini İngiltere standartlarına uygun hale getirdi. İhracata hazırlık analizi sayesinde ilk yıl 500 bin sterlin ihracat geliri elde etti.',
  ],
  'Satış Hunisi': [
    'Bir yazılım şirketi, satış hunisi analizi yaparak web sitesi ziyaretçilerinden müşteriye dönüşüm oranını yüzde 1den yüzde 4e çıkardı. Satış hunisinde ziyaretçilerin en çok fiyat sayfasında kaybolduğunu tespit ederek demo talep butonu ekledi ve ücretsiz deneme süresi başlattı.',
    'Bir danışmanlık firması, satış hunisi yönetimi için LinkedIn üzerinden gelen potansiyel müşterileri sistematik takip etmek için CRM kurdu. Satış hunisi sayesinde adayları kalifiye etme sürecini otomatikleştirerek satış döngüsünü 45 günden 21 güne düşürdü.',
    'Bir e-ticaret markası, satış hunisinin farkındalık aşamasında Instagram reklamları, değerlendirme aşamasında e-posta pazarlaması kullandı. Satış hunisi optimizasyonu sayesinde müşteri edinme maliyetini yüzde 35 düşürdü.',
  ],
};

const NEXT_ACTIONS: Record<string, string[]> = {
  'Nakit Akışı': ['Bugün işletmenizin 30 günlük nakit akış projeksiyonunu çıkarın. Gelir ve gider kalemlerini listeleyerek olası nakit açıklarını belirleyin ve bir aksiyon planı oluşturun.'],
  'Gerçek Birim Maliyet': ['En çok satan ürününüzün birim maliyetini tüm gider kalemlerini dahil ederek yeniden hesaplayın. Mevcut satış fiyatınızla karşılaştırın ve farkı analiz edin.'],
  'Pazar Yeri Seçimi': ['Ürünlerinize en uygun 3 e-ticaret platformunu belirleyin. Her biri için komisyon oranları, hedef kitle uyumu ve lojistik seçeneklerini karşılaştırmalı bir tablo haline getirin.'],
  'İş Fikri Geliştirme': ['İş fikrinizi bir iş modeli kanvasına yerleştirin. Dokuz bölümün her birini doldurun ve en zayıf olduğunuz alanı belirleyerek bu hafta bir iyileştirme adımı atın.'],
  'AI Kullanım Senaryosu Seçimi': ['İşletmenizde en çok zaman alan üç görevi belirleyin. Her biri için hazır bir AI çözümü olup olmadığını araştırın ve en yüksek faydayı sağlayacak görevle başlayın.'],
  'Siber Risk Yönetişimi': ['İşletmenizdeki tüm cihazlarda iki faktörlü doğrulamayı etkinleştirin ve haftalık otomatik yedekleme ayarlayın. Çalışanlarınıza temel siber güvenlik eğitimi verin.'],
  'İhracata Hazırlık Analizi': ['Ticaret Bakanlığı İhracat Akademisi\'ne üye olun ve hedef pazar analizi eğitimini tamamlayın. Ürünleriniz için en uygun 3 ihracat pazarını belirleyin.'],
  'Satış Hunisi': ['Mevcut müşteri adayı kaynaklarınızı listeleyin. Her kaynaktan gelen adayların dönüşüm oranını hesaplayın ve en yüksek dönüşüm sağlayan kaynağa bütçe ayırın.'],
};

function getDifficulty(code: string): number {
  if (code.endsWith('-I')) return 3;
  if (code.endsWith('-O')) return 2;
  const last = code.split('-').pop() || '1';
  const num = parseInt(last);
  if (num >= 5) return 3;
  if (num >= 3) return 2;
  return 1;
}

async function main() {
  const manifestPath = path.resolve('content/learning-pilot-v1.json');
  const manifest: { kos: PilotKO[] } = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`=== Enriching ${manifest.kos.length} pilot KOs (V2) ===\n`);

  let enriched = 0; let skipped = 0;

  // Track position within same-title groups to avoid hash collisions
  const titleCounters: Record<string, number> = {};

  for (const entry of manifest.kos) {
    const ko = await prisma.knowledgeObject.findUnique({
      where: { id: entry.koId },
      select: { id: true, metadata: true, content: true, title: true },
    });
    if (!ko) { console.warn(`  KO ${entry.koId} not found`); continue; }

    const meta = JSON.parse(ko.metadata || '{}');

    if (meta.summary && meta.keyTakeaways && meta.commonMistakes && meta.example && meta.nextAction && meta.enrichmentVersion === 5) {
      skipped++; continue;
    }

    if (!titleCounters[entry.title]) titleCounters[entry.title] = 0;
    const titlePos = titleCounters[entry.title];

    const diff = getDifficulty(entry.code);
    const seed = entry.code + '-' + titlePos;

    // Summary: pick from pool by sequential position (guarantees uniqueness per title group)
    const titleKey = entry.title;
    const summaryPool = SUMMARY_POOL[titleKey] || [generateFallbackSummary(entry)];
    const summaryIdx = titlePos % summaryPool.length;
    const summary = summaryPool[summaryIdx] || summaryPool[0];

    // Key takeaways: pick 4, sequential offset by title position
    const takeawayPool = TAKEAWAY_POOL[titleKey] || ['Bu konu işletme performansını etkiler'];
    const keyTakeaways = [];
    for (let ti = 0; ti < Math.min(4, takeawayPool.length); ti++) {
      keyTakeaways.push(takeawayPool[(titlePos + ti) % takeawayPool.length]);
    }

    // Common mistakes: pick 3-4, sequential offset
    const mistakePool = MISTAKE_POOL[titleKey] || ['Eksik değerlendirme yapmak'];
    const commonMistakes = [];
    const mistakeCount = Math.min(4, mistakePool.length);
    for (let mi = 0; mi < mistakeCount; mi++) {
      commonMistakes.push(mistakePool[(titlePos + mi) % mistakePool.length]);
    }

    // Example: pick from pool by sequential position
    const examplePool = EXAMPLE_POOL[titleKey] || ['Bir KOBİ, bu konuda yaptığı iyileştirme ile verimliliğini artırdı.'];
    const exampleIdx = titlePos % examplePool.length;
    const example = examplePool[exampleIdx] || examplePool[0];

    // Next action: pick from pool
    const actionPool = NEXT_ACTIONS[titleKey] || ['Bugün bir iyileştirme adımı atın.'];
    const nextAction = actionPool[titlePos % actionPool.length] || actionPool[0];

    const estimatedMinutes = diff >= 3 ? 20 : diff >= 2 ? 15 : 10;

    const updatedMeta = {
      ...meta,
      summary,
      keyTakeaways,
      commonMistakes,
      example,
      nextAction,
      estimatedMinutes,
      enrichmentVersion: 5,
      enrichedAt: new Date().toISOString(),
    };

    console.log(`  [${entry.code}] pos=${titlePos} summary#${summaryIdx} example#${exampleIdx}`);
    await prisma.knowledgeObject.update({
      where: { id: ko.id },
      data: { metadata: JSON.stringify(updatedMeta) },
    });
    enriched++;
    titleCounters[entry.title]++;
  }

  console.log(`\nDone: ${enriched} enriched, ${skipped} skipped`);
  await prisma.$disconnect();
}

function shuffleArray<T>(arr: T[], seed: string): T[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) { s = ((s << 5) - s) + seed.charCodeAt(i); s |= 0; }
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateFallbackSummary(entry: PilotKO): string {
  return `${entry.title}, KOBİ’ler için ${entry.category.toLowerCase()} alanında önemli bir konudur. Bu içerikte temel kavramlar, uygulama adımları ve dikkat edilmesi gereken noktalar ele alınmaktadır. KOBİ’lerin sınırlı kaynaklarla maksimum verim elde etmesi hedeflenmiştir.`;
}

main().catch(e => { console.error(e); process.exit(1); });
