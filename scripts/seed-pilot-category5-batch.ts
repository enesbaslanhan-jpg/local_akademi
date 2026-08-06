import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Kategori 5 — "İşi Satın Alma ve Yatırım Değerlendirmesi" tamamlama partisi.
// Kaynak: Gemini Deep Research çıktısı (c:\Users\bugrz\Desktop\19 kurs.txt), Claude tarafından
// düzenlendi: LaTeX formülleri düz metne çevrildi, kaynaklar doğrulanmış URL'lerle
// bağlandı, meta-yorumlar temizlendi. Kullanıcı onayı: 2026-08-06 (sohbet oturumu).
//
// Format kararı: Bu parti, mevcut "4-5 kısa ders / kurs" v4 kalıbından farklı olarak
// HER KURS TEK, uzun biçimli bir ders içerir (derinlemesine karar rehberi). Bu bilinçli
// bir format kararıdır — içerik derinliği, ders sayısını yapay olarak artırmaktan
// önceliklidir. Ayrıntı için raporun ilgili bölümüne bakın.
//
// Bu script idempotenttir; tekrar çalıştırıldığında mevcut kayıtları günceller.

const CATEGORY = 'İşi Satın Alma ve Yatırım Değerlendirmesi'

// --- 1. Mevcut pilot kursun Ders 2'sini yükselt (CUR-121-02) ---
const UPGRADED_LESSON_2 = {
  koCode: 'CUR-121-02',
  title: '2. Devraldığınızda Borçları da Devralabilirsiniz: Hukuki, Mali ve Operasyonel Durum Tespiti',
  task: 'Devralma Öncesi Hukuki, Mali ve Operasyonel Durum Tespiti Protokolü',
  estimatedMinutes: 18,
  metric: 'Devir kapsamında sözleşmeyle açıkça düzenlenmiş kritik kalem sayısı / toplam kritik kalem sayısı',
  content: `# Devraldığınızda Borçları da Devralabilirsiniz: Hukuki, Mali ve Operasyonel Durum Tespiti

Bir işletmeyi devralırken yalnızca görünen satış hacmine, dekorasyona veya satıcının anlattığı müşteri potansiyeline bakmak yeterli değildir. Devir işleminin türüne göre alıcı; ticari borç, çalışan ilişkisi, kira yükümlülüğü, kamu borcu riski, dava, sözleşme ve stok sorunlarıyla karşılaşabilir. Bu nedenle sözleşmeden önce bağımsız bir hukuki, mali ve operasyonel durum tespiti yapılmalıdır.

## Önce işlem türünü kesinleştirin

İlk soru şudur: tam olarak ne satın alınıyor? Bir işletme devri aynı hukuki sonucu doğurmayan üç farklı biçimde gerçekleşebilir:

- **Ticari işletme devri** — işletmenin faaliyetini sürdürmesi için gerekli aktif ve pasiflerin bir bütün olarak devredilmesi.
- **Şirket payı devri** — alıcı, varlıkları tek tek değil şirket paylarını satın alır; şirket aynı tüzel kişi olarak devam eder, borçları, davaları ve sözleşmeleri şirket bünyesinde kalır.
- **Tekil varlık devri** — yalnızca belirli stok, makine, demirbaş, marka veya alan adı satın alınır.

Sözleşmede devredilen/devredilmeyen her unsur (duran malvarlığı, kiracılık hakkı, ticaret unvanı, borç ve yükümlülükler) tek tek yazılı olmalıdır.

## Borç sorumluluğunun gerçek kapsamı

Türk Borçlar Kanunu'nun 202. maddesine göre bir işletmeyi aktif ve pasifleriyle devralan kişi, devri alacaklılara bildirdiği veya ilan ettiği tarihten itibaren işletmenin borçlarından sorumlu hâle gelir; devreden kişi de kanunda belirtilen süre boyunca (muaccel borçlarda bildirim/ilan tarihinden itibaren iki yıl) devralanla birlikte müteselsil sorumlu kalır. Bu hüküm yalnızca belirli bir makinenin veya stok grubunun satın alındığı her işlemde otomatik uygulanmaz — işlemin gerçekten işletmenin bütüncül devri niteliğinde olup olmadığı ayrıca değerlendirilmelidir.

## Vergi, kamu borcu ve SGK riski

6183 sayılı Amme Alacaklarının Tahsil Usulü Hakkında Kanun'un 35. maddesi limited şirket ortaklarının, mükerrer 35. maddesi ise kanuni temsilcilerin kamu borçlarına ilişkin sorumluluğunu düzenler; bu hükümler her ticari işletme devrinde tüm vergi borçlarının otomatik olarak alıcıya geçtiği anlamına gelmez. Şirket payı devrinde şirketin tüzel kişiliği değişmediği için vergi borçları şirket üzerinde kalır — ama payı devreden/devralan ortakların geçmiş döneme ilişkin özel sorumluluğu ayrıca incelenmelidir.

5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu'nun 89. maddesi kapsamında işyerinin aktif veya pasifiyle devri hâlinde prim ve ilgili borçlar bakımından özel sorumluluk hükümleri bulunur. Kontrol edilmesi gerekenler: SGK işyeri dosyası, prim borçları, idari para cezaları, eksik gün kayıtları, yapılandırmalar ve devam eden denetimler. "Borcu yoktur" yazısı önemlidir, ancak sonradan ortaya çıkabilecek tüm riskleri ortadan kaldırdığı varsayılmamalıdır.

## Çalışanlar devirle birlikte geçer — ama kıdem otomatik doğmaz

4857 sayılı İş Kanunu'nun 6. maddesine göre işyeri veya bir bölümü hukuki bir işlemle devredildiğinde mevcut iş sözleşmeleri bütün hak ve borçlarıyla devralana geçer; devralan, hizmet sürelerini hesaplarken devreden yanında geçen süreyi de dikkate almak zorundadır. Devir, hizmet süresini sıfırlamaz ama çalışanların otomatik olarak kıdem tazminatı almasını da sağlamaz — kıdem tazminatı yalnızca devir tarihinde kendiliğinden doğan bir borca dönüşmez; hizmet dönemleri ve devir tarihindeki ücret ayrıca değerlendirilmelidir. Çalışan yükümlülüğünü tek bir toplam rakama indirgemek yerine parçalarına ayırın: ödenmemiş ücret, fazla çalışma, kullanılmamış izin, devam eden dava, ve **gelecekte doğabilecek** (henüz kesinleşmemiş) kıdem karşılığı.

## Kira ilişkisi ayrı bir konudur

Türk Borçlar Kanunu'nun 323. maddesine göre kira ilişkisinin devri için kiraya verenin yazılı rızası gerekir; işyeri kiralarında kiraya veren haklı bir sebep olmadıkça bu rızadan kaçınamaz. Kiraya verenin yeni sözleşme veya daha yüksek kira istemesi devralmanın ekonomik değerini değiştirebilir — kira ilişkisi netleşmeden devir bedeli kesinleştirilmemelidir.

## Varsayımsal sayısal örnek

Aura Dekorasyon için talep edilen devir bedeli 2.000.000 TL. İncelemede şunlar tespit edilsin: 280.000 TL vergi/SGK riski, 340.000 TL toplam çalışan yükümlülüğü tahmini (bunun yalnızca doğmuş ve ödenmemiş kısmı kesin borçtur, gelecekte doğabilecek kıdem karşılığı değildir), aylık kirada 35.000 TL artış, 150.000 TL stok değer kaybı.

Kira artışının iki yıllık basit etkisi: 35.000 TL × 24 ay = 840.000 TL. Bu tutar satıcının doğrudan borcu değil, işletmenin gelecekteki ekonomik değerini düşüren bir maliyet unsurudur — devir bedelinden doğrudan düşülmez, ama pazarlıkta gerekçe olarak kullanılır. Buna karşılık stok değer kaybı (150.000 TL) doğrudan devir bedelinden indirilebilecek somut bir kalemdir.

## Sözleşme güvenlikleri

Devir sözleşmesine eklenebilecek koruyucu maddeler: satıcının beyan ve garantileri, vergi/SGK tazmin hükümleri, bedelin bir bölümünün bloke edilmesi veya emanet hesapta tutulması, kapanış öncesi borç ödeme şartı, sonradan çıkan borçların satıcıya rücu edilmesi, çalışan ve dava listesinin sözleşmeye eklenmesi, stok sayım tutanağı, kiraya verenin yazılı onayı.

## Bu dersten çıkacak çalışma kaydınız

**Devralma Öncesi Hukuki, Mali ve Operasyonel Durum Tespiti Protokolü**: işlemin türü (ticari işletme/şirket payı/tekil varlık), devredilen varlık ve haklar, ticari borçlar, vergi ve SGK durumu, çalışan yükümlülükleri (kesinleşmiş/gelecekte doğabilecek ayrımıyla), kira ilişkisinin durumu, sözleşmeler, davalar, stok ve demirbaş durumu, fiyat düzeltmeleri, sözleşme güvenlikleri, devam veya vazgeçme kararı.

> Bu işletmeyi bir krediyle finanse etmeyi düşünüyorsanız, aylık taksitin gerçek nakit akışına etkisini **Kredi Taksitini Karşılayabilir miyim?** karar aracıyla ayrıca kontrol edin.

## Kaynaklar

1. [mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu (m.202, m.323)](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf)
2. [mevzuat.gov.tr — 4857 sayılı İş Kanunu (m.6)](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf)
3. [mevzuat.gov.tr — 5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu (m.89)](https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5510.pdf)
4. [mevzuat.gov.tr — 6183 sayılı Amme Alacaklarının Tahsil Usulü Hakkında Kanun (m.35, mükerrer m.35)](https://www.mevzuat.gov.tr/mevzuatmetin/1.3.6183.pdf)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Bu ders genel bilgilendirme amaçlıdır; somut bir devir işleminde mutlaka bir hukukçu ve mali müşavirle birlikte çalışın.*`
}

// --- 2. Yeni kurslar (her biri tek, uzun biçimli ders) ---
const NEW_COURSES = [
  {
    slug: 'v5-is-kurma-mi-var-olani-devralmak-mi',
    title: 'İş Kurma mı, Var Olanı Devralmak mı?',
    description: 'Sıfırdan bir işletme kurmak ile devren satılık bir işletmeyi almak arasında, toplam nakit ihtiyacı ve devralınan riskler üzerinden gerekçeli bir seçim yapın.',
    koCode: 'CUR-122-01',
    task: 'İş Kurma ve Devralma Karar ve Risk Analiz Cetveli',
    estimatedMinutes: 16,
    metric: 'Sıfırdan kuruluş toplam nakit ihtiyacı ile devralma toplam nakit ihtiyacı farkı',
    content: `# İş Kurma mı, Var Olanı Devralmak mı?

Bir girişimcinin veya büyümek isteyen işletmenin önündeki temel seçeneklerden biri, yeni pazara sıfırdan mı kuracağı bir işletmeyle, yoksa faaliyette olan bir işletmeyi devralarak mı gireceğidir. Karar yalnızca "sıfırdan kurulum mu daha ucuz, devir bedeli mi?" sorusuyla verilmemelidir — asıl karşılaştırma, iki seçeneğin toplam nakit ihtiyacını, pazara giriş süresini, devralınan riskleri ve gelecekteki nakit üretme kapasitesini birlikte kapsamalıdır.

## Sıfırdan kuruluşun avantajı ve riski

Sıfırdan kuruluş marka ve konsept özgürlüğü, yeni teknoloji altyapısı kurma imkânı ve geçmiş müşteri/çalışan uyuşmazlıklarından etkilenmeme avantajı sağlar. Buna karşılık ruhsat ve izin süreci, müşteri kazanım süresi, ilk stok hataları ve başabaş noktasına ulaşana kadar süren nakit açığı gibi riskler taşır.

## Devralmanın avantajı ve riski

Devralma daha hızlı pazara giriş, geçmiş satış verilerine erişim, hazır müşteri trafiği ve kurulu tedarikçi ilişkileri sağlar. Riskleri ise eski sahibin kişisel ilişkilerine bağlı ciro, devredilemeyen sözleşmeler, çalışan hakları, kira devri belirsizliği ve satılamayan stoktur (bu risklerin nasıl tespit edileceği "Devraldığınızda Borçları da Devralabilirsiniz" dersinde ayrıntılı işlenir).

## Toplam nakit ihtiyacını karşılaştırın

Sıfırdan kuruluşta toplam nakit ihtiyacı: kurulum + ilk stok + depozito + izinler + açılış giderleri + başabaşa kadar oluşan nakit açığı.

Devralmada toplam nakit ihtiyacı: devir bedeli + kullanılabilir stok + yenileme + inceleme giderleri + çalışma sermayesi + fiyatlandırılmış riskler.

## Varsayımsal sayısal örnek

Verda Ev & Yaşam, Bursa'da yeni bir mağaza açmayı değerlendiriyor.

**Seçenek A — Sıfırdan mağaza.** Tadilat, dekorasyon ve tabela: 1.200.000 TL. İlk stok: 1.500.000 TL. Depozito, izin ve altyapı: 300.000 TL. Kurulum toplamı: 3.000.000 TL. İlk on ayda aylık ortalama 80.000 TL nakit açığı oluşursa bu on ayda toplam 800.000 TL'ye eklenir. Toplam nakit ihtiyacı: 3.800.000 TL. (On ayda başabaşa ulaşılması kesin sonuç değil, test edilmesi gereken bir tahmindir.)

**Seçenek B — Mevcut mağazayı devralma.** Devir bedeli: 2.000.000 TL. Doğrulanmış kullanılabilir stok: 1.200.000 TL. Marka ve sistem dönüşümü: 250.000 TL. Hukuki ve mali inceleme: 100.000 TL. Ek çalışma sermayesi: 300.000 TL. Toplam: 3.850.000 TL.

Bu örnekte devralma, ilk bakışta sıfırdan kuruluştan ucuz görünse de gerçek geçiş giderleri eklendiğinde neredeyse aynı seviyeye gelmektedir — bu, "devralma her zaman ucuzdur" varsayımının yanıltıcı olabileceğini gösterir.

## Karar kuralı

Devralma şu durumlarda daha uygun olabilir: geçmiş satış ve kâr kayıtları doğrulanabiliyorsa, kira ilişkisi sürdürülebiliyorsa, stok ve demirbaşlar gerçek değerinden alınıyorsa, çalışan ve müşteri devamlılığı yüksekse, hukuki ve mali riskler fiyatlandırılmışsa.

Sıfırdan kuruluş şu durumlarda daha güvenli olabilir: kayıtlar güvenilir değilse, ciro eski sahibin kişisel ilişkisine bağlıysa, kira devri belirsizse, stok kalitesi düşükse, devir bedeli gerçek nakit üretimiyle açıklanamıyorsa.

## Bu dersten çıkacak çalışma kaydınız

**İş Kurma ve Devralma Karar ve Risk Analiz Cetveli**: işlemin hukuki türü, kurulum veya devir bedeli, çalışma sermayesi, pazara giriş süresi, başabaş süresi, müşteri devir riski, stok/demirbaş değeri, kira durumu, çalışan yükümlülükleri, düşük/beklenen/güçlü senaryolar, karar ve gerekçe.

## Kaynaklar

1. [mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu (m.202, m.323)](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf)
2. [TOBB — Türkiye Ticaret Sicili Gazetesi Müdürlüğü, kuruluş ve devir işlemleri](https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Bu tutarlar karar yöntemini göstermek için oluşturulmuş varsayımsal bir senaryodur, gerçek yatırım önerisi değildir.*`
  },
  {
    slug: 'v5-franchise-almali-miyim',
    title: 'Franchise Almalı mıyım?',
    description: 'Bir franchise (bayilik) teklifini giriş bedeli, royalty, bölge koruması, e-ticaret hakları ve rekabet etmeme maddeleri açısından değerlendirin.',
    koCode: 'CUR-122-02',
    task: 'Franchise Sözleşmesi Değerlendirme Kontrol Listesi',
    estimatedMinutes: 15,
    metric: 'Sözleşmede açıkça tanımlı kritik madde sayısı / toplam kritik madde sayısı',
    content: `# Franchise Almalı mıyım?

Franchise, bir markanın yalnızca adını kullanmak değildir. Sistem çoğunlukla marka, işletme yöntemi, ürün/hizmet standardı, tedarik, eğitim, yazılım, denetim ve pazarlama bileşenlerini birlikte içerir. Franchise alan işletme marka bilinirliğinden yararlanır; buna karşılık giriş bedeli, royalty, reklam fonu, zorunlu tedarik ve operasyon kısıtlamaları üstlenir.

## Rekabet hukuku açısından temel ayrım

Franchise sözleşmelerindeki bölge koruması, internet satışı, zorunlu tedarik, tek marka ve rekabet etmeme hükümleri, Rekabet Kurumu'nun 2002/2 sayılı Dikey Anlaşmalara İlişkin Grup Muafiyeti Tebliği ve güncel Dikey Anlaşmalara İlişkin Kılavuzu kapsamında değerlendirilir. Bir hükmün grup muafiyetinden yararlanamaması, otomatik olarak geçersiz olduğu anlamına gelmez — bu durumda sözleşme 4054 sayılı Kanun kapsamında ayrıca (bireysel olarak) değerlendirilebilir.

**Aktif ve pasif satış ayrımı önemlidir.** Franchise verene belirli bölgeler tahsis edilebilir ve bazı aktif satışlar sınırlanabilir; ancak müşterinin kendiliğinden başvurmasıyla gerçekleşen pasif satışların veya internetin etkili kullanımının engellenmesi daha yüksek hukuki risk taşır. Sözleşmede şu sorular yanıtlanmalıdır: Franchise alan kendi internet sitesinden satış yapabilir mi? Pazaryeri satışı yapabilir mi? Başka bölgeden gelen siparişi kabul edebilir mi?

**Tek marka ve zorunlu tedarik hükümleri** de ayrıca incelenmelidir — alıcının ihtiyaçlarının büyük bölümünü tek sağlayıcıdan almasını gerektiren hükümler rekabet etmeme niteliği taşıyabilir. Kılavuz kapsamında beş yılı aşan veya belirsiz süreli bazı rekabet etmeme yükümlülükleri grup muafiyetinden yararlanamayabilir.

## İnceleme başlıkları

Bir franchise teklifini değerlendirirken tek tek kontrol edilmesi gereken kalemler: giriş bedeli, royalty hesaplama tabanı, reklam fonu, teknoloji/yazılım bedeli, zorunlu tedarik ve minimum sipariş, bölge koruması, e-ticaret ve pasif satış hakları, rekabet etmeme süresi ve kapsamı, yenileme koşulları, erken fesih, devir hakkı, çıkış maliyeti, marka sahibinin destek yükümlülüğü, ve — en kritiği — **benzer mağazaların gerçek performansı** (franchise verenin vaat ettiği rakamlar değil, mevcut bayilerin doğrulanmış sonuçları).

## Bu dersten çıkacak çalışma kaydınız

**Franchise Sözleşmesi Değerlendirme Kontrol Listesi**: giriş bedeli ve royalty yapısı, zorunlu tedarik koşulları, bölge/internet satış hakları, rekabet etmeme süresi, erken çıkış maliyeti, benzer bayilerin doğrulanmış performansı, ve bu kalemlerin devralma/sıfırdan kuruluş alternatifleriyle karşılaştırması.

> Franchise giriş bedelini krediyle finanse etmeyi düşünüyorsanız **Kredi Taksitini Karşılayabilir miyim?** aracıyla taksitin nakit akışına etkisini ayrıca test edin.

## Kaynaklar

1. [Rekabet Kurumu — Dikey Anlaşmalara İlişkin Kılavuz](https://www.rekabet.gov.tr/Dosya/kilavuzlar/dikeykilavuz2018-20180330155908926.pdf)
2. [Rekabet Kurumu — 2021/4 sayılı Dikey Anlaşmalara İlişkin Grup Muafiyeti Tebliği değişikliği duyurusu](https://www.rekabet.gov.tr/tr/Guncel/dikey-anlasmalara-iliskin-grup-muafiyeti-fcb6e3a0a440ec118144005056b1ce21)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Somut bir franchise sözleşmesinin rekabet hukuku ve ticaret hukuku açısından değerlendirilmesi için mutlaka bir hukukçuya danışın.*`
  },
  {
    slug: 'v5-kira-lokasyon-karari',
    title: 'Kira/Lokasyon Kararını Verilerle Değerlendir',
    description: 'Bir işletme için düşünülen lokasyonu, sabit bir "doğru oran" aramak yerine doluluk maliyeti, brüt kâr ve satış senaryolarıyla birlikte değerlendirin.',
    koCode: 'CUR-122-03',
    task: 'Lokasyon Doluluk Maliyeti ve Senaryo Değerlendirme Tablosu',
    estimatedMinutes: 13,
    metric: 'Doluluk Maliyeti Oranı = (Kira + Ortak Gider + Diğer Lokasyon Giderleri) ÷ Net Satışlar',
    content: `# Kira/Lokasyon Kararını Verilerle Değerlendir

Bir lokasyon kararı verirken sıkça karşılaşılan bir tuzak, "kira/ciro oranı şu yüzdeyi geçmemeli" gibi sabit bir kuralı evrensel bir eşikmiş gibi kullanmaktır. **Türkiye'de bütün perakende işletmelerine uygulanacak yasal veya resmî bir kira/ciro ya da doluluk maliyeti oranı bulunmamaktadır.** %8, %12 veya %15 gibi oranlar mevzuat sınırı değil, sektöre ve işletmeye göre değişen finansal değerlendirme göstergeleridir.

## Tek bir orana değil, birlikte değerlendirin

Lokasyon kararı yalnızca kira/ciro oranına göre değil, aşağıdakilerle birlikte verilmelidir: brüt kâr oranı, ürün maliyeti yapısı, personel gideri, ortak gider (AVM veya pasaj işletme gideri), enerji, lojistik/erişim maliyeti, gerekli mağaza yatırımı, ve düşük/beklenen/güçlü satış senaryoları.

**Doluluk maliyeti oranı** şu şekilde hesaplanır:

Doluluk Maliyeti Oranı = (Kira + Ortak Gider + Diğer Lokasyon Giderleri) ÷ Net Satışlar

Düşük bir doluluk oranı otomatik olarak iyi bir lokasyon anlamına gelmez — düşük satış potansiyeline sahip ucuz bir mağaza da zarar edebilir. Yüksek bir oran da otomatik olarak zarar anlamına gelmez — yüksek brüt kâr ve güçlü dönüşüm oranı sağlayan bazı işletmeler daha yüksek doluluk maliyetini karşılayabilir. Bu nedenle oranı tek başına değil, aynı işletmenin farklı lokasyon adaylarındaki brüt kâr ve satış senaryolarıyla birlikte karşılaştırın.

## Karşılaştırma çerçevesi

Değerlendirilen her lokasyon adayı için aynı tabloyu doldurun: aylık kira ve ortak gider, tahmini net satış (düşük/beklenen/güçlü), brüt kâr oranı, doluluk maliyeti oranı, gerekli ilk yatırım, yaya/araç trafiği gözlemi, ve çevredeki rekabet yoğunluğu. Kararı yalnızca en düşük doluluk oranına değil, düşük satış senaryosunda işletmenin bu lokasyonda ayakta kalıp kalamayacağına göre verin.

## Bu dersten çıkacak çalışma kaydınız

**Lokasyon Doluluk Maliyeti ve Senaryo Değerlendirme Tablosu**: karşılaştırılan lokasyon adayları, her biri için kira/ortak gider, düşük/beklenen/güçlü satış senaryosu, brüt kâr oranı, doluluk maliyeti oranı, gerekli ilk yatırım, ve seçilen lokasyon ile gerekçesi.

## Kaynaklar

1. [mevzuat.gov.tr — 6098 sayılı Türk Borçlar Kanunu (sözleşme özgürlüğü ve işyeri kira hükümleri)](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf)
2. [TOBB — perakende sektör raporları (sektör karşılaştırması için; yasal oran kaynağı değildir)](https://www.tobb.org.tr/Documents/ttk/ttk_tescil_ilan_maddeler.pdf)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Doluluk maliyeti oranı işletmenin kendi kira sözleşmesi ve satış verileriyle hesaplanmalıdır; kesin finansal karar öncesinde mali müşavir, kira sözleşmesi bakımından ise hukukçu görüşü alınmalıdır.*`
  }
]

async function main() {
  console.log('Kategori 5 tamamlama partisi başlıyor...')

  // 1. Ders 2 yükseltmesi
  const ko2 = await prisma.knowledgeObject.findUnique({ where: { code: UPGRADED_LESSON_2.koCode } })
  if (!ko2) throw new Error(`KO bulunamadı: ${UPGRADED_LESSON_2.koCode}`)
  await prisma.knowledgeObject.update({
    where: { id: ko2.id },
    data: {
      title: UPGRADED_LESSON_2.title.replace(/^\d+\.\s*/, ''),
      content: UPGRADED_LESSON_2.content,
      task: UPGRADED_LESSON_2.task,
      metadata: JSON.stringify({
        ...JSON.parse(ko2.metadata || '{}'),
        metric: UPGRADED_LESSON_2.metric,
        learningArtifact: UPGRADED_LESSON_2.task,
        estimatedMinutes: UPGRADED_LESSON_2.estimatedMinutes,
        upgradedFrom: 'gemini-deep-research-2026-08-06',
        upgradeNote: 'Orijinal pilot dersin yerine, gerçek kanun madde numaralarıyla desteklenmiş daha kapsamlı versiyon kullanıldı.'
      })
    }
  })
  const lesson2 = await prisma.lesson.findFirst({ where: { knowledgeObjectId: ko2.id } })
  if (lesson2) {
    await prisma.lesson.update({
      where: { id: lesson2.id },
      data: { title: UPGRADED_LESSON_2.title, content: UPGRADED_LESSON_2.content, estimatedMinutes: UPGRADED_LESSON_2.estimatedMinutes }
    })
    console.log(`♻️ Ders 2 yükseltildi (lesson id=${lesson2.id}, KO id=${ko2.id})`)
  } else {
    console.warn('⚠️ Ders 2 için mevcut Lesson kaydı bulunamadı — yalnızca KO güncellendi.')
  }

  // 2. Yeni kurslar
  let sortOrder = 701
  for (const c of NEW_COURSES) {
    let ko = await prisma.knowledgeObject.findUnique({ where: { code: c.koCode } })
    const koData = {
      code: c.koCode,
      slug: c.koCode.toLowerCase(),
      type: 'procedure',
      title: c.title,
      content: c.content,
      embedding: '',
      metadata: JSON.stringify({
        category: CATEGORY,
        subcategory: 'İşletme Devralma ve Yatırım',
        level: 'Orta',
        tags: ['yatırım kararı', 'işletme devri', CATEGORY],
        version: '1.0',
        source: 'LocalAkademi Pilot v5 — Gemini Deep Research + editoryal düzenleme',
        generatedFrom: 'gemini-deep-research-2026-08-06',
        editorialState: 'owner-approved-final',
        qualityStandard: 'manual-pilot-v5',
        curriculumCourseSlug: c.slug,
        teachingMode: 'field-guide-long-form',
        metric: c.metric,
        learningArtifact: c.task,
        sourceCheckedAt: '2026-08-06',
        estimatedMinutes: c.estimatedMinutes,
        countryCode: 'TR',
        language: 'tr'
      }),
      status: 'published',
      verificationStatus: 'verified',
      reviewGate: 'standard',
      publishedAt: new Date(),
      task: c.task,
      summary: c.title
    }
    if (!ko) {
      ko = await prisma.knowledgeObject.create({ data: koData })
      console.log(`✅ KO oluşturuldu: ${ko.code} (id=${ko.id})`)
    } else {
      ko = await prisma.knowledgeObject.update({ where: { id: ko.id }, data: koData })
      console.log(`♻️ KO güncellendi: ${ko.code} (id=${ko.id})`)
    }

    let course = await prisma.course.findUnique({ where: { slug: c.slug } })
    const courseData = {
      title: c.title,
      description: c.description,
      category: CATEGORY,
      level: 'uygulamalı',
      slug: c.slug,
      estimatedMinutes: c.estimatedMinutes,
      outcomes: JSON.stringify([c.task + ' hazırlayabilir']),
      sourceType: 'curated-pilot-v5-gdr',
      sortOrder: sortOrder++,
      metadata: JSON.stringify({
        standard: 'manual-editorial-pilot-v5',
        qualityStandard: 'manual-pilot-v5',
        generatedFrom: 'gemini-deep-research-2026-08-06',
        editorialState: 'owner-approved-final',
        teachingMode: 'field-guide-long-form',
        lessonCount: 1,
        approvedAt: new Date().toISOString(),
        candidateCategoryBatch: '5-category-20-course-completion-plan'
      }),
      published: true
    }
    if (!course) {
      course = await prisma.course.create({ data: courseData })
      console.log(`✅ Kurs oluşturuldu: ${course.slug} (id=${course.id})`)
    } else {
      course = await prisma.course.update({ where: { id: course.id }, data: courseData })
      console.log(`♻️ Kurs güncellendi: ${course.slug} (id=${course.id})`)
    }

    const existingLesson = await prisma.lesson.findFirst({ where: { courseId: course.id, knowledgeObjectId: ko.id } })
    const lessonData = {
      courseId: course.id,
      title: c.title,
      content: c.content,
      order: 1,
      knowledgeObjectId: ko.id,
      estimatedMinutes: c.estimatedMinutes
    }
    if (!existingLesson) {
      const created = await prisma.lesson.create({ data: lessonData })
      console.log(`✅ Ders oluşturuldu: ${created.title} (id=${created.id})`)
    } else {
      await prisma.lesson.update({ where: { id: existingLesson.id }, data: lessonData })
      console.log(`♻️ Ders güncellendi: ${existingLesson.title} (id=${existingLesson.id})`)
    }
  }

  console.log('✅ Kategori 5 tamamlama partisi bitti.')
}

main()
  .catch((e) => {
    console.error('❌ HATA:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
