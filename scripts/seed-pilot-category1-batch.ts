import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Kategori 1 — "Perakende ve Mağaza Yönetimi" (4 kurs, kurs başına tek uzun ders).
// Kaynak: Gemini Deep Research çıktısı, Claude tarafından düzenlendi (LaTeX→düz metin,
// kaynaklar doğrulanmış URL, Category + KnowledgeObjectSource + PracticalCard ilişkileri
// baştan kuruldu — Kategori 5'te unutulan adımlar bu partide dahil edildi).
// Kullanıcı onayı: 2026-08-06 (sohbet oturumu).

const CATEGORY_NAME = 'Perakende ve Mağaza Yönetimi'
const CATEGORY_SLUG = 'perakende-magaza-yonetimi'

const COURSES = [
  {
    slug: 'v5-vitrin-magaza-ici-satis',
    title: 'Vitrin ve Mağaza İçi Satışı Artır',
    description: 'Mağaza alanlarını sıcak/nötr/soğuk bölgelere ayırıp metrekare başına ciro ve brüt kârla ölçerek, hangi ürünün nerede sergileneceğine verilerle karar verin.',
    koCode: 'CUR-123-01',
    task: 'Mağaza Metrekare Verimliliği ve Trafik Haritası Planı',
    estimatedMinutes: 14,
    metric: 'Metrekare Başına Brüt Kâr = Bölgenin Brüt Kârı ÷ Bölgenin Metrekare Alanı',
    practicalCard: {
      code: 'PC-RETAIL-001', title: 'Mağaza Bölge Verimliliği Formülü', type: 'quick_formula',
      shortDescription: 'Bir mağaza bölgesinin gerçekten kâr getirip getirmediğini metrekare başına hesaplayın.',
      contentJson: {
        mainContent: 'Yüksek ciro yapan bir bölge, düşük ciro yapan ama yüksek marjlı bir bölgeden daha az katkı üretebilir. Sadece ciroya değil, metrekare başına brüt kâra bakın.',
        formula: 'Metrekare Başına Brüt Kâr = Bölgenin Dönem Brüt Kârı ÷ Bölgenin Metrekare Alanı',
        example: '15 m² giriş alanı 6.750 TL brüt kâr üretiyorsa metrekare başına 450 TL; aynı alana daha yüksek marjlı ürün konursa bu rakam katlanabilir.',
        warning: '"Müşterilerin tamamı sağa döner" gibi genellemeler kullanmayın — sıcak bölgeyi kendi mağazanızın verisiyle belirleyin.',
        keyTakeaway: 'Düşük doluluk oranı otomatik iyi, yüksek oran otomatik kötü demek değildir; brüt kârla birlikte değerlendirin.'
      }
    },
    content: `# Vitrin ve Mağaza İçi Satışı Artır

Bir mağazanın kapısından içeri adım atan her ziyaretçi, farkında olmadan işletmenin oluşturduğu fiziksel alışveriş akışının içine girer. Vitrin, giriş alanı, ana koridorlar, ürün grupları ve kasa çevresi; müşterinin neyi fark edeceğini ve hangi ürünleri değerlendireceğini etkiler. Mağaza alanları yalnızca "boş metrekareler" değil, farklı satış ve kârlılık potansiyeline sahip kullanım bölgeleri olarak değerlendirilmelidir — yüksek kira ödeyen ama hangi bölümün satış ve brüt kâr ürettiğini ölçmeyen bir işletme, alan verimliliğini yönetemez.

## Planlı satış ile anlık karar satışını ayırın

**Planlı satış**, müşterinin mağazaya gelmeden önce almayı düşündüğü ürünlerdir (temel ihtiyaç ürünleri, önceden araştırılmış yüksek fiyatlı ürünler) — bunlar erişilebilir ve kolay bulunabilir olmalı. **Anlık karar satışı** ise müşterinin mağazada fark ederek değerlendirdiği, alışveriş listesinde olmayan ürünlerdir (tamamlayıcı aksesuarlar, küçük hediyelik ürünler) — bunlar uygun bağlamda görünür hâle getirilmelidir. İkisi aynı yöntemle sergilenmemeli.

## Sıcak, nötr ve soğuk bölgeleri kendi verinizle bulun

Mağaza içindeki trafik her alanda eşit değildir, ama "müşterilerin tamamı sağa döner" gibi genellemeler her mağaza için geçerli sayılmamalı — gerçek sıcak bölgeyi belirlemek için bir hafta boyunca müşterilerin ilk yöneldiği alan, en fazla durduğu stant, en az ziyaret edilen raf gözlemlenmelidir. **Sıcak bölgede** yüksek brüt kâr katkılı ürünler, yeni ürünler ve kampanyalı-ama-kârlılığı-korunmuş ürünler test edilir. **Nötr bölgede** kategori işareti ve ürün gruplandırmasıyla görünürlük artırılabilir. **Soğuk bölgede** ise temel ihtiyaç ürünleri özellikle bulunması zor hâle getirilmemeli — amaç müşteriyi yanıltmak değil, mağaza yolculuğunu düzenlemektir.

## Vitrin üç soruya hızlı cevap vermeli

Sabit bir "üç saniye kuralı" yerine, mesajın kısa sürede anlaşılabilir olması hedeflenmeli: *Burada benim ihtiyacıma uygun ne var? Mağazanın fiyat/kalite seviyesi nedir? İçeri girmemi sağlayacak ilgi noktası nedir?* Vitrine fazla ürün yığmak yerine tek bir tema, açık bir odak noktası ve yeterli boşluk kullanılması daha kontrollü bir sunum sağlar — "üç ila beş ürün" gibi sayılar evrensel kural değildir, vitrin genişliğine ve anlatılmak istenen hikâyeye göre belirlenir.

## Kasa çevresinde çapraz satış

Kasa alanı, müşterinin ana alışveriş kararını büyük ölçüde tamamladığı noktadır. Burada ana alışveriş tutarına göre düşük fiyatlı, işlevi kolay anlaşılan, kolay taşınabilir ürünler kullanılabilir — ama ödeme sürecini yavaşlatacak yoğunluk oluşturulmamalı. Kasa önü ürünlerinin başarısı yalnızca adet satışla değil, brüt kâr katkısı ve kasa süresine etkisiyle birlikte değerlendirilmeli.

## Metrekare verimliliğini ölçün

Metrekare Başına Ciro = Bölgenin Dönem Cirosu ÷ Bölgenin Metrekare Alanı
Metrekare Başına Brüt Kâr = Bölgenin Brüt Kârı ÷ Bölgenin Metrekare Alanı

Sadece ciroya bakmak yanıltıcı olabilir — yüksek ciro yapan düşük marjlı bir alan, daha düşük ciro yapan yüksek marjlı bir alandan daha az katkı üretebilir.

## Varsayımsal sayısal örnek

Kadıköy'de 120 m² alan üzerine kurulu bir ev tekstili ve dekorasyon mağazası düşünelim. Aylık sabit giderler (kira, faturalar, genel giderler) toplam 180.000 TL; basitleştirilmiş ortalama sabit gider yükü metrekare başına 1.500 TL (180.000 ÷ 120).

**Eski düzen** — girişteki 15 m² alanda aylık ciro 45.000 TL, brüt kâr oranı %15, brüt kâr 6.750 TL. Alana dağıtılan yaklaşık gider yükü 15 × 1.500 = 22.500 TL. Bölgenin brüt kârı bu gider yükünün altında kalıyor.

**Yeni düzen** — giriş alanına daha yüksek brüt kâr katkılı dekoratif ürünler yerleştirilsin: aylık ciro 110.000 TL, brüt kâr oranı %55, brüt kâr 60.500 TL. Gider yükü çıkarıldığında 60.500 − 22.500 = 38.000 TL kalıyor. Bu tutar "net kâr" değildir — vergi, fire, personel gibi giderler henüz düşülmedi; "basitleştirilmiş alan katkısı" olarak adlandırılmalı. Gerçek işletmede bu sonuç ancak önce-sonra satış verileriyle doğrulanabilir.

## Bu dersten çıkacak çalışma kaydınız

**Mağaza Metrekare Verimliliği ve Trafik Haritası Planı**: mağaza krokisi, sıcak/nötr/soğuk alanlar, her alanın m² başına ciro ve brüt kârı, kasa çevresinde test edilecek ürünler, uygulanacak tek yerleşim değişikliği, ölçüm tarih aralığı, önce-sonra sonucu.

## Kaynaklar

1. [T.C. Ticaret Bakanlığı — Perakende ticaretine ilişkin mevzuat ve bilgilendirmeler](https://ticaret.gov.tr/)
2. [TOBB — Perakende sektör raporları](https://www.tobb.org.tr/)
3. [SCORE — küçük işletmeler için mağaza yerleşimi ve görsel sunum içerikleri](https://www.score.org/)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Yayımdan önce kullanılan kaynakların ilgili sayfası ve güncelliği ayrıca doğrulanmalıdır.*`
  },
  {
    slug: 'v5-sahada-stok-sayim-duzeni',
    title: 'Sahada Stok ve Sayım Düzenini Kur',
    description: 'ABC sınıflandırması ve kayan sayımla, hangi ürünü ne sıklıkla sayacağınızı ve stok farklarının gerçek nedenini nasıl araştıracağınızı öğrenin.',
    koCode: 'CUR-123-02',
    task: 'ABC Stok Sınıflandırması ve Kayan Sayım Çizelgesi',
    estimatedMinutes: 15,
    metric: 'Fark Oranı = Sistem-Fiili Stok Farkı ÷ Ortalama Stok Değeri',
    practicalCard: {
      code: 'PC-RETAIL-002', title: 'Stok Sayım Farkı Araştırma Kontrol Listesi', type: 'checklist',
      shortDescription: 'Sistem stoğu ile fiili stok uyuşmadığında, tahmin yerine kanıtla nedeni bulun.',
      contentJson: {
        mainContent: 'Sayım sonucu sistem stoğu ile fiili stok eşleşmiyorsa, yalnızca düzeltme kaydı atmadan önce nedeni araştırın.',
        checklistItems: [
          'Son ürün kabulü kontrol edildi mi?',
          'Son satış ve iade işlemleri incelendi mi?',
          'Yanlış barkod veya ürün kodu ihtimali kontrol edildi mi?',
          'Teşhir/hasarlı ürün ayrı statüde mi izleniyor?',
          'Depolar arası aktarım ve yetkisiz ürün çıkışı kontrol edildi mi?'
        ],
        warning: 'Farkın nedeni bilinmiyorsa "nedeni belirlenemedi" olarak kaydedin; tahminle neden seçmeyin.',
        keyTakeaway: 'A grubu (yüksek değer/risk) daha sık, C grubu daha seyrek sayılabilir — ama yüksek adetli ucuz ürünler tamamen kontrol dışı bırakılmamalı.'
      }
    },
    content: `# Sahada Stok ve Sayım Düzenini Kur

Mağaza yerleşimini düzenlemek satış sürecinin yalnızca bir bölümüdür. Müşteriye "ürün sistemde var görünüyor ancak rafta bulunamıyor" denmesi, yalnızca o anki satışı değil işletmeye duyulan güveni de zedeler. Perakendede stok, işletmenin nakdinin ürüne dönüşmüş hâlidir; stok doğruluğu düşük olduğunda işletme olmayan ürünü satmaya çalışabilir, gerekli ürünü yeniden sipariş etmeyebilir, kaybı geç fark edebilir ve gerçek kârlılığını yanlış hesaplayabilir.

## Stok farkları nereden gelir?

Teslimat eksikleri, yanlış ürün kabulü, hatalı barkod, kırılma/bozulma, kayıt dışı numune kullanımı, yanlış iade kaydı, hırsızlık ve sayım hatası — sayılabilecek başlıca nedenlerdir. Yalnızca yıl sonunda yapılan sayım, farkın hangi dönemde ve hangi işlem nedeniyle oluştuğunu göstermekte yetersiz kalır; bu yüzden **kayan sayım** — tüm stoğu tek seferde değil, ürün gruplarını belirli periyotlarla sayma yöntemi — tercih edilir. (Kayan sayım, yasal envanter ve dönem sonu yükümlülüklerinin yerine geçmez; vergi/muhasebe açısından gereken resmî işlemler mali müşavirle ayrıca değerlendirilmelidir.)

## ABC sınıflandırmasıyla sayım sıklığını belirleyin

Klasik örneklerde az sayıda ürünün cironun büyük bölümünü oluşturduğu anlatılır, ama "ürünlerin kesin %20'si cironun %80'ini oluşturur" gibi sabit bir oran beklenmemeli — her işletme kendi verisini kullanmalı. Sınıflandırma ölçütleri: yıllık satış tutarı, brüt kâr katkısı, kaybolma/çalınma riski, tedarik süresi, bozulma riski.

- **A grubu** — yüksek değer/risk taşıyan ürünler, haftalık veya iki haftada bir sayılabilir.
- **B grubu** — orta düzey, aylık sayılabilir.
- **C grubu** — düşük birim değerli, iki-üç ayda bir sayılabilir — ama yüksek adetli veya kolay kaybolan ürünler sırf ucuz oldukları için tamamen kontrol dışı bırakılmamalı.

Bu süreler zorunlu değildir; fark oranı yüksekse sayım sıklaştırılmalı.

## Ürün kabulünde ve depoda disiplin

Stok doğruluğu ürün mağazaya ulaştığı anda başlar: irsaliye/teslimat belgesi kontrol edilmeli, koli adediyle yetinilmemeli (miktar ve ürün kodu doğrulanmalı), hasarlı ürün ve eksik/fazla teslimat kaydedilmeli. Depoda her ürün için fiziksel bir adres (ör. D-02/R-04/K-03: depo bölgesi/raf/kutu) bulunmalı. Satış alanında raf doldurma hareketleri kaydedilmeli, teşhir ve hasarlı ürün normal stoktan ayrı izlenmeli, barkodsuz satış mümkün olduğunca engellenmeli.

## Sayım farkını araştırırken tahmin etmeyin

Sistem stoğu ile fiili stok eşleşmiyorsa yalnızca düzeltme kaydı atılmamalı; son ürün kabulü, son satış/iade işlemleri, yanlış barkod, teşhir ürünü, depolar arası aktarım ve önceki sayım hatası kontrol edilmeli. Farkın nedeni bilinmiyorsa "nedeni belirlenemedi" olarak kaydedilmeli — tahminle neden seçilmemeli.

## Varsayımsal sayısal örnek

Mağazanın ortalama stok değeri (maliyet fiyatıyla) 800.000 TL olsun. Yıl sonunda sistem stoğu ile fiili stok arasında 48.000 TL fark çıkarsa, yaklaşık fark oranı 48.000 ÷ 800.000 = %6. Bu oran tek başına "yıllık kayıp oranı" sayılmamalı — daha doğru ölçüm için dönem başı/sonu, alışlar, satışlar, iadeler birlikte incelenmeli.

Yeni sayım düzeninde (yüksek değerli ürünler her hafta küçük gruplar hâlinde sayılır, kabulde çift kontrol uygulanır) ikinci ayda teslim edilen kolide belgede 20 adet, fiilî teslimatta 16 adet çıkarsa — eksik 4 ürünün toplam maliyeti 8.000 TL ise, teslimat anındaki kontrol bu farkın stok açığına dönüşmesini önler. Yıllık fark sonraki dönemde 9.600 TL'ye düşerse: 48.000 − 9.600 = 38.400 TL fark azalması — bu tutar doğrudan "net kâr" değil, "stok farklarının azalmasıyla korunan yaklaşık maliyet değeri" olarak adlandırılmalı.

## Bu dersten çıkacak çalışma kaydınız

**ABC Stok Sınıflandırması ve Kayan Sayım Çizelgesi**: ürün listesi, sınıflandırma ölçütü, A/B/C grupları, sayım sıklığı ve sorumlusu, sistem-fiilî stok farkı, fark nedeni, düzeltici işlem, sonraki kontrol tarihi.

## Kaynaklar

1. [Gelir İdaresi Başkanlığı — envanter ve stok değerlemeye ilişkin güncel düzenlemeler](https://www.gib.gov.tr/)
2. [TESK — esnaf ve işletme yönetimine ilişkin yayınlar](https://www.tesk.org.tr/)
3. [U.S. Small Business Administration — küçük işletmelerde envanter yönetimi](https://www.sba.gov/)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Kayan sayımın resmî envanter yükümlülüklerinin yerine geçtiği ifade edilmemelidir.*`
  },
  {
    slug: 'v5-personel-vardiya-kasa-guveni',
    title: 'Personel Vardiyasını ve Kasa Güvenini Yönet',
    description: 'Vardiya planını sezgiyle değil saatlik trafik verisiyle kurun; kasa farkını suçlamadan önce sistematik olarak araştırın.',
    koCode: 'CUR-123-03',
    task: 'Saatlik Trafik Odaklı Vardiya Çizelgesi ve Kasa Devir-Teslim Protokolü',
    estimatedMinutes: 14,
    metric: 'Kasa Farkı = Sistem Tutarı − Fiilî Tutar',
    practicalCard: {
      code: 'PC-RETAIL-003', title: 'Kasa Devir-Teslim Protokolü', type: 'checklist',
      shortDescription: 'Vardiya değişiminde kasa farkının hangi vardiyada oluştuğunu belirlemek için gereken adımlar.',
      contentJson: {
        mainContent: 'Kasa güvenliği "sıfır hata beklemek" değil, her işlemin kim tarafından ne zaman yapıldığının görülebilmesidir.',
        checklistItems: [
          'Çekmecedeki nakit sayıldı mı?',
          'Sistem bakiyesi ve POS toplamı karşılaştırıldı mı?',
          'İade ve iptal işlemleri incelendi mi?',
          'Teslim eden ve teslim alan kayıt altına alındı mı?',
          'Kasa farkı varsa; yanlış para üstü, iptal hatası, sistem hatası gibi olası nedenler önce araştırıldı mı (doğrudan çalışana hüküm verilmeden)?'
        ],
        warning: 'Ücret kesintisi ve disiplin işlemleri İş Kanunu ve iş sözleşmesi çerçevesinde değerlendirilmelidir; otomatik kesinti önerilmez.',
        keyTakeaway: '"Devir tutanağı" yalnızca imza için değil, farkın hangi vardiyada oluştuğunu belirlemek içindir.'
      }
    },
    content: `# Personel Vardiyasını ve Kasa Güvenini Yönet

Mağazanın fiziksel düzeni ve stok sistemi ne kadar iyi olursa olsun, müşteriyi karşılayan, ürünü sunan ve ödemeyi alan taraf çalışanlardır. Perakendede personel planlamasının iki amacı vardır: yoğun saatlerde yeterli hizmet kapasitesi sağlamak, sakin saatlerde gereksiz işçilik yükü oluşturmamak. Buna ek olarak kasa işlemlerinin izlenebilir olması gerekir — amaç çalışanı peşinen şüpheli görmek değil, sorumlulukları ve devir süreçlerini açık hâle getirmektir.

## Vardiyayı sezgiyle değil trafik verisiyle planlayın

Vardiya planı yalnızca toplam çalışma saatine göre yapılırsa sakin saatlerde fazla personel, yoğun saatlerde yetersiz personel, kasa kuyruğu ve kaçan satış oluşabilir. Son 8-12 haftanın şu verileri incelenmeli: saatlik işlem sayısı, saatlik ciro, ortalama sepet tutarı, mağazaya giren kişi sayısı, kasa kuyruğu. Sadece ciroya bakmak yeterli değildir — çok müşterili ama düşük tutarlı saatler de yüksek personel ihtiyacı doğurabilir. Yoğun saatlerde görev dağılımı da (kasa, satış alanı, depo desteği) net belirlenmeli; yarı zamanlı/çapraz vardiya kullanılabilir ama çalışma süreleri, ara dinlenmeleri ve diğer iş hukuku yükümlülükleri güncel mevzuata uygun planlanmalıdır.

## Kasa güveni: sıfır hata değil, izlenebilirlik

Mümkünse her çalışan kendi kullanıcı hesabıyla giriş yapmalı, şifresini paylaşmamalı — yaptığı işlem sistemde kendi hesabıyla görünmeli. Tek çekmecenin birden fazla çalışan tarafından kullanıldığı işletmelerde vardiya geçişi kayıt altına alınmalı. **Kasa devir işleminde**: çekmecedeki nakit sayılır, sistem bakiyesi ve POS toplamı kontrol edilir, iade/iptal işlemleri incelenir, teslim eden ve teslim alan kayıt altına alınır — "devir tutanağı" yalnızca imza için değil, farkın hangi vardiyada oluştuğunu belirlemek içindir.

Kasa çekmecesinde tutulacak üst nakit limiti (ör. 5.000 TL — ama evrensel bir sınır değil) işletme tarafından risk ve işlem hacmine göre belirlenir; limit aşıldığında ara nakit alımı yapılıp kayıt altına alınmalı.

## Gün sonu mutabakatı ve kasa farkını araştırma

Gün sonunda sistemdeki satışlar, nakit satış toplamı, POS raporları, iadeler, iptaller ve kasa giriş-çıkışları karşılaştırılmalı. **Kasa farkı oluştuğunda çalışan hakkında doğrudan hüküm verilmemeli** — önce yanlış para üstü, yanlış ödeme türü, iptal/iade hatası, eksik ara alım kaydı, sistem hatası araştırılmalı. Ücret kesintisi, çalışandan tahsilat veya disiplin işlemleri konusunda İş Kanunu ve iş sözleşmesi hükümleri dikkate alınmalı — otomatik kesinti önerilmez.

## Varsayımsal sayısal örnek

Mağazada üç tam zamanlı çalışan var. **Eski düzende** tüm çalışanlar aynı saatlerde çalışıyor; Cumartesi yoğun saatlerde aynı anda 25 müşteri varken hizmet kapasitesi yetersiz kalıyor, ödeme yapmadan çıkan müşteri gözleniyor. Kaçan satışın aylık 60.000 TL olduğu tahmin edilsin (bu gerçek işletmede doğrudan bilinemez, terk edilen sepet ve benzer saatlerin dönüşüm oranıyla tahmin edilir). Aylık açıklanamayan kasa farkı 3.500 TL.

**Yeni düzende** vardiyalar saatlik yoğunluğa göre değiştirilir, yoğun Cumartesi saatlerine yarı zamanlı çalışan eklenir, kasa ve satış alanı görevleri ayrılır, vardiya devir formu uygulanır. Aylık ciro 45.000 TL artarsa ve net kâr marjı %25 ise: 45.000 × 0,25 = 11.250 TL yaklaşık faaliyet kârı katkısı. Kasa farkı 3.500 TL'den 150 TL'ye düşerse 3.350 TL azalma. Ama yarı zamanlı çalışanın ücret ve yan maliyetleri çıkarılmadan bu iki rakamın toplamı "net fayda" olarak sunulmamalı — doğru hesap: (11.250 + 3.350) − ek personelin toplam maliyeti.

## Bu dersten çıkacak çalışma kaydınız

**Saatlik Trafik Odaklı Vardiya Çizelgesi ve Kasa Devir-Teslim Protokolü**: saatlik yoğunluk haritası, görev bazlı personel ihtiyacı, pilot vardiya değişikliği, tahmini ek personel maliyeti, kasa devir formu, kasa farkı araştırma adımları, pilot öncesi/sonrası sonuçlar.

## Kaynaklar

1. [T.C. Çalışma ve Sosyal Güvenlik Bakanlığı — 4857 sayılı İş Kanunu ve çalışma süreleri](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf)
2. [SCORE — perakende çalışan ve operasyon yönetimi içerikleri](https://www.score.org/)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Çalışma süresi, vardiya, ücret kesintisi konularında güncel mevzuat ve uzman görüşü kontrol edilmelidir.*`
  },
  {
    slug: 'v5-magaza-genisletme-tasima',
    title: 'Mağaza Genişletme veya Taşıma Kararını Ver',
    description: 'Daha büyük mağazaya taşınmak ile ikinci şube açmak arasında, başabaş ciro ve müşteri yamyamlaşma riskini hesaplayarak karar verin.',
    koCode: 'CUR-123-04',
    task: 'Şubeleşme ve Lokasyon Taşıma Fizibilite Analizi',
    estimatedMinutes: 17,
    metric: 'Başabaş Ciro = Aylık Sabit Gider ÷ Katkı Payı Oranı',
    practicalCard: {
      code: 'PC-RETAIL-004', title: 'Şubeleşme Başabaş ve Geri Dönüş Formülü', type: 'quick_formula',
      shortDescription: 'Yeni şube veya taşınma kararında başabaş ciroyu ve geri dönüş süresini hesaplayın.',
      contentJson: {
        mainContent: 'Büyüme kararı yalnızca ciro artışı beklentisiyle değil, başabaş ciro ve geri dönüş süresiyle birlikte verilmelidir.',
        formula: 'Başabaş Ciro = Aylık Sabit Gider ÷ Katkı Payı Oranı  ·  Geri Dönüş Süresi = Başlangıç Yatırımı ÷ Aylık Ek Nakit Katkısı',
        example: 'Aylık sabit gider 120.000 TL, katkı payı oranı %45 ise başabaş ciro 266.667 TL; 600.000 TL yatırım aylık 37.500 TL katkı üretiyorsa geri dönüş ~16 ay.',
        warning: 'Yeni şubenin cirosunun bir kısmı mevcut şubeden kayan (yamyamlaşan) satış olabilir — bunu ayrıca tahmin edin.',
        keyTakeaway: 'Kararı yalnızca beklenen senaryoya değil, düşük satış senaryosunda işletmenin ayakta kalıp kalamayacağına göre verin.',
        primaryAction: { label: 'Yeni Şube Açmaya Hazır mıyım?', code: 'open_branch_check' }
      }
    },
    content: `# Mağaza Genişletme veya Taşıma Kararını Ver

Mağazanın satış düzeni, stok kontrolü ve personel sistemi iyileştiğinde büyüme seçeneği gündeme gelir. İşletme genellikle üç seçenekle karşılaşır: mevcut mağazada kalmak, daha büyük bir mağazaya taşınmak, ikinci bir şube açmak. Büyüme kararı yalnızca ciro artışı beklentisine göre verilmemeli — daha büyük bir mağaza daha yüksek kira, personel, enerji gideri ve daha karmaşık operasyon anlamına gelebilir; ciro artarken faaliyet kârı azalabilir.

## Taşınma mı, ikinci şube mi?

**Daha büyük mağazaya taşınma**: tek yönetim noktası ve mevcut müşteri bölgesini koruma avantajı sağlar; ama kira/sabit gider artışı, taşınma sırasında kapanma riski ve yüksek dekorasyon yatırımı taşır.

**İkinci şube**: yeni müşteri bölgesine erişim ve coğrafi çeşitlenme sağlar, ilk mağazayı çalışır durumda tutar; ama ikinci personel/yönetim yapısı, stokun bölünmesi ve başlangıçta düşük ciro riski taşır.

## Müşteri yamyamlaşmasını göz ardı etmeyin

Yeni şubenin yaptığı her satış "yeni satış" olmayabilir — mevcut müşteriler yeni şubeyi kullanmaya başlarsa toplam ciro beklenenden az artabilir. Yamyamlaşma oranı = Yeni Şubeye Kayan Eski Şube Satışı ÷ Yeni Şubenin Toplam Satışı. Açılış öncesi kesin bilinmez; müşteri adresleri, sadakat programı verisi ve iki mağaza arasındaki ulaşım süresiyle senaryolaştırılabilir.

## Büyüme öncesi dört kontrol

**1. Kapasite sorunu gerçekten var mı?** Müşteriler yoğunluk nedeniyle çıkıyor mu, metrekare başına satış zaman içinde artıyor mu? Düşük satışın nedeni zayıf talepse daha büyük mağaza sorunu çözmeyebilir.

**2. Başabaş ciro** — yeni lokasyonun sabit giderini karşılamak için gereken ciro: Başabaş Ciro = Aylık Sabit Gider ÷ Katkı Payı Oranı (katkı payı oranı, satıştan değişken giderler çıkarıldıktan sonra kalan orandır — yalnızca brüt kâr oranını kullanmak bazı işletmelerde yanıltıcı olabilir).

**3. Yatırımın geri dönüş süresi** = Başlangıç Yatırımı ÷ Aylık Ek Nakit Katkısı. "18-24 ay her işletme için zorunlu sınırdır" denmemeli — kabul edilebilir süre sektöre, kira sözleşmesine ve finansman maliyetine göre değişir.

**4. Çalışma sermayesi** — yeni mağaza hedeflenen satışa hemen ulaşmayabilir; düşük/beklenen/güçlü en az üç senaryoda kira, ücret, stok, vergi, kredi ödemelerinin sürdürülüp sürdürülemeyeceği kontrol edilmeli.

## Varsayımsal sayısal örnek

Mevcut mağaza: aylık ciro 500.000 TL, brüt kâr oranı %45 (225.000 TL), sabit gider 150.000 TL → basitleştirilmiş faaliyet katkısı 75.000 TL (vergi, finansman ve tüm değişken giderler dahil değilse kesin net kâr sayılmamalı).

**Seçenek 1 — Daha büyük mağazaya taşınmak.** Yeni kira 200.000 TL, diğer sabit giderler 110.000 TL → toplam sabit gider 310.000 TL; taşınma/dekorasyon yatırımı 900.000 TL; tahmini ciro 750.000 TL, brüt kâr oranı %45 → brüt kâr 337.500 TL. Faaliyet katkısı: 337.500 − 310.000 = 27.500 TL. Mevcut mağazaya göre fark: 27.500 − 75.000 = **−47.500 TL**. Ciro %50 artmasına rağmen sabit gider artışı nedeniyle faaliyet katkısı düşüyor — bu varsayımlar altında yatırım geri dönüşü oluşmuyor.

**Seçenek 2 — İkinci şube açmak.** Kira 70.000 TL, personel/diğer sabit giderler 50.000 TL → toplam 120.000 TL; kurulum maliyeti 600.000 TL; tahmini ciro 350.000 TL, brüt kâr oranı %45 → brüt kâr 157.500 TL. Faaliyet katkısı: 157.500 − 120.000 = 37.500 TL. Geri dönüş süresi: 600.000 ÷ 37.500 = 16 ay — ancak bu hesap eski mağazanın cirosunun düşmediğini, yamyamlaşma olmadığını ve ek merkez/finansman maliyeti olmadığını varsayıyor; tek bir 16 aylık sonuca dayanarak karar verilmemeli.

**Üç senaryolu değerlendirme (ikinci şube):** Düşük senaryo (250.000 TL ciro) aylık katkı −7.500 TL, geri dönüş oluşmuyor. Beklenen senaryo (350.000 TL) aylık katkı 37.500 TL, geri dönüş ~16 ay. Güçlü senaryo (450.000 TL) aylık katkı 82.500 TL, geri dönüş ~7,3 ay. Bu tablo, kararın tek bir tahmine ne kadar duyarlı olduğunu gösterir.

Verilen varsayımlar altında daha büyük mağazaya taşınmak faaliyet katkısını azaltırken, ikinci şube beklenen ve güçlü senaryolarda daha avantajlı görünüyor — ama nihai karar için yamyamlaşma, çalışma sermayesi, kurulum gecikmesi ve finansman maliyeti ayrıca değerlendirilmelidir.

## Bu dersten çıkacak çalışma kaydınız

**Şubeleşme ve Lokasyon Taşıma Fizibilite Analizi**: mevcut mağaza performansı, üç büyüme seçeneği, başlangıç yatırımı, başabaş ciro, düşük/beklenen/güçlü senaryolar, geri dönüş süresi, yamyamlaşma riski, çalışma sermayesi ihtiyacı, karar ve gerekçe.

> Bu kararı **Yeni Şube Açmaya Hazır mıyım?** karar aracıyla da doğrulayın — aynı başabaş ve geri dönüş süresi mantığını, kendi rakamlarınızla otomatik hesaplar.

## Kaynaklar

1. [T.C. Ticaret Bakanlığı — perakende ve taşınmaz ticaretine ilişkin düzenlemeler](https://ticaret.gov.tr/)
2. [KOSGEB — güncel işletme geliştirme ve destek programları](https://www.kosgeb.gov.tr/)
3. [SCORE — ikinci lokasyon ve işletme büyütme rehberleri](https://www.score.org/)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Destek programları ve kira düzenlemeleri değişebilir; başvuru öncesi güncel resmî kaynak kontrol edilmelidir.*`
  }
]

async function findOrCreateSourceForCategory(title: string, url: string) {
  const existing = await prisma.source.findFirst({ where: { url } })
  if (existing) return existing
  return prisma.source.create({ data: { title, url, authorityLevel: 'high', lastChecked: new Date('2026-08-06') } })
}

// Ders içindeki markdown "[Başlık](url)" linklerini otomatik çıkarıp Source olarak bağlar.
function extractCitations(content: string): { title: string; url: string }[] {
  const matches = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
  const seen = new Set<string>()
  const result: { title: string; url: string }[] = []
  for (const m of matches) {
    if (seen.has(m[2])) continue
    seen.add(m[2])
    result.push({ title: m[1], url: m[2] })
  }
  return result
}

async function main() {
  console.log('Kategori 1 (Perakende ve Mağaza Yönetimi) partisi başlıyor...')

  let category = await prisma.category.findUnique({ where: { slug: CATEGORY_SLUG } })
  if (!category) {
    category = await prisma.category.create({ data: { name: CATEGORY_NAME, slug: CATEGORY_SLUG, isActive: true } })
    console.log(`✅ Kategori oluşturuldu (id=${category.id})`)
  }

  let sortOrder = 710
  for (const c of COURSES) {
    const citations = extractCitations(c.content)

    let ko = await prisma.knowledgeObject.findUnique({ where: { code: c.koCode } })
    const koData = {
      code: c.koCode,
      slug: c.koCode.toLowerCase(),
      type: 'procedure',
      title: c.title,
      content: c.content,
      embedding: '',
      categoryId: category.id,
      metadata: JSON.stringify({
        category: CATEGORY_NAME,
        subcategory: 'Perakende Operasyonu',
        level: 'Orta',
        tags: ['perakende', 'mağaza yönetimi', CATEGORY_NAME],
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
        duration: String(c.estimatedMinutes),
        countryCode: 'TR',
        language: 'tr'
      }),
      status: 'published',
      verificationStatus: 'verified',
      reviewGate: 'standard',
      publishedAt: new Date(),
      task: c.task,
      summary: c.description
    }
    if (!ko) {
      ko = await prisma.knowledgeObject.create({ data: koData })
      console.log(`✅ KO oluşturuldu: ${ko.code} (id=${ko.id})`)
    } else {
      ko = await prisma.knowledgeObject.update({ where: { id: ko.id }, data: koData })
      console.log(`♻️ KO güncellendi: ${ko.code} (id=${ko.id})`)
    }

    await prisma.knowledgeObjectSource.deleteMany({ where: { koId: ko.id } })
    let order = 0
    for (const cit of citations) {
      const source = await findOrCreateSourceForCategory(cit.title, cit.url)
      await prisma.knowledgeObjectSource.create({ data: { koId: ko.id, sourceId: source.id, relation: 'references', note: String(order++) } })
    }
    console.log(`   ${citations.length} kaynak bağlandı`)

    let course = await prisma.course.findUnique({ where: { slug: c.slug } })
    const courseData = {
      title: c.title, description: c.description, category: CATEGORY_NAME, level: 'uygulamalı', slug: c.slug,
      estimatedMinutes: c.estimatedMinutes,
      outcomes: JSON.stringify([c.task + ' hazırlayabilir']),
      sourceType: 'curated-pilot-v5-gdr', sortOrder: sortOrder++,
      metadata: JSON.stringify({
        standard: 'manual-editorial-pilot-v5', qualityStandard: 'manual-pilot-v5',
        generatedFrom: 'gemini-deep-research-2026-08-06', editorialState: 'owner-approved-final',
        teachingMode: 'field-guide-long-form', lessonCount: 1,
        approvedAt: new Date().toISOString(), candidateCategoryBatch: '5-category-20-course-completion-plan'
      }),
      published: true
    }
    if (!course) {
      course = await prisma.course.create({ data: courseData })
      console.log(`✅ Kurs oluşturuldu: ${course.slug} (id=${course.id})`)
    } else {
      course = await prisma.course.update({ where: { id: course.id }, data: courseData })
    }

    const existingLesson = await prisma.lesson.findFirst({ where: { courseId: course.id, knowledgeObjectId: ko.id } })
    const lessonData = { courseId: course.id, title: c.title, content: c.content, order: 1, knowledgeObjectId: ko.id, estimatedMinutes: c.estimatedMinutes }
    if (!existingLesson) {
      await prisma.lesson.create({ data: lessonData })
    } else {
      await prisma.lesson.update({ where: { id: existingLesson.id }, data: lessonData })
    }

    // Pratik Kart (varsa)
    if ('practicalCard' in c && c.practicalCard) {
      const pc = c.practicalCard
      let card = await prisma.practicalCard.findUnique({ where: { code: pc.code } })
      if (!card) {
        card = await prisma.practicalCard.create({ data: { code: pc.code, title: pc.title, type: pc.type, shortDescription: pc.shortDescription, category: CATEGORY_NAME, published: true } })
      } else {
        card = await prisma.practicalCard.update({ where: { id: card.id }, data: { title: pc.title, type: pc.type, shortDescription: pc.shortDescription, category: CATEGORY_NAME, published: true } })
      }
      const existingVersion = await prisma.practicalCardVersion.findFirst({ where: { practicalCardId: card.id }, orderBy: { version: 'desc' } })
      const newVersionNum = existingVersion ? existingVersion.version + 1 : 1
      await prisma.practicalCardVersion.create({ data: { practicalCardId: card.id, version: newVersionNum, status: 'published', contentJson: pc.contentJson as any } })
      if (existingVersion) {
        await prisma.practicalCardVersion.updateMany({ where: { practicalCardId: card.id, version: { lt: newVersionNum } }, data: { status: 'archived' } })
      }
      await prisma.practicalCardKnowledgeObject.deleteMany({ where: { practicalCardId: card.id } })
      await prisma.practicalCardKnowledgeObject.create({ data: { practicalCardId: card.id, knowledgeObjectId: ko.id, order: 0 } })
      console.log(`   Pratik Kart bağlandı: ${pc.code}`)
    }

    console.log(`✅ ${c.title} tamamlandı.\n`)
  }

  console.log('✅ Kategori 1 partisi bitti.')
}

main()
  .catch((e) => { console.error('❌ HATA:', e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
