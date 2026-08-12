# Dijitalleşme ve Teknoloji

Bu dosya "Dijitalleşme ve Teknoloji" kategorisindeki **4** yayınlanmış kursu içerir.

---

## Stok Takip Sistemi Kurmalı mıyım?

**Slug:** `v5-stok-takip-sistemi-kurmali-miyim` · **Seviye:** uygulamalı · **Süre:** ~15 dk · **Ders sayısı:** 1

Excel, basit stok yazılımı, ERP stok modülü ve WMS arasında ölü stok maliyeti ve geri dönüş süresine göre seçim yapın.

**Kazanımlar**

- Stok Yönetim Sistemi Otomasyon ve Geçiş Karar Formu hazırlayabilir

### 1. Stok Takip Sistemi Kurmalı mıyım?

*Bilgi nesnesi: `CUR-128-01`*

# Stok Takip Sistemi Kurmalı mıyım?

Stok, işletme sermayesinin ürüne dönüşmüş hâlidir. Stok doğruluğu zayıfsa işletme:

- sistemde var görünen ürünü bulamaz,
- olmayan ürünü satabilir,
- gereksiz sipariş verebilir,
- satılmayan üründe nakit bağlar,
- yanlış ürün gönderir,
- gerçek kârını ve nakit ihtiyacını yanlış tahmin eder.

Ancak stok sorununun her zaman yazılım eksikliğinden kaynaklandığı düşünülmemelidir. Sorun şunlardan da doğabilir:

- ürün kartlarının yanlış açılması,
- barkod disiplini olmaması,
- ürün kabulünün kontrol edilmemesi,
- iadenin yanlış depoya alınması,
- personelin sistemi kullanmaması,
- sayım yapılmaması,
- şubeler arası transferin kaydedilmemesi.

Kötü süreç dijitalleştirildiğinde daha hızlı kötü veri üretilebilir.

## Excel ne zaman yeterli olabilir?

Excel veya basit takip sistemi şu durumda yeterli olabilir:

- sınırlı sayıda ürün,
- tek depo,
- tek satış kanalı,
- düşük işlem hacmi,
- az varyant,
- düzenli sayım,
- tek sorumlu kişi,
- düşük eş zamanlı satış riski.

Ancak Excel'de:

- gerçek zamanlı çok kullanıcılı güncelleme,
- işlem geçmişi,
- barkod,
- pazaryeri senkronizasyonu,
- rol yetkileri,
- otomatik rezervasyon

ihtiyacı arttıkça risk yükselir.

## WMS, ERP stok modülü ve basit stok yazılımını ayır

### Basit stok yazılımı

- ürün giriş-çıkışı,
- stok seviyesi,
- temel raporlar.

### ERP stok modülü

Stokla birlikte:

- satış,
- satın alma,
- muhasebe,
- üretim,
- finans

süreçlerini bağlayabilir.

### WMS

Depo operasyonuna daha derin odaklanabilir:

- lokasyon,
- toplama rotası,
- parti/lot,
- seri numarası,
- görev atama,
- el terminali,
- sevkiyat kontrolü.

1.000 SKU bulunması otomatik olarak tam WMS gerektirmez. İşlem ve depo karmaşıklığı değerlendirilmelidir.

## Geçiş ihtiyacını gösteren sinyaller

- Satış kanallarındaki kullanılabilir stok farklı.
- Stokta olmayan ürün siparişi oluşuyor.
- Yanlış ürün gönderimi tekrar ediyor.
- Sipariş toplama süresi uzuyor.
- Ürünün hangi rafta olduğu bilinmiyor.
- Sayım farkları açıklanamıyor.
- Aynı SKU farklı kodlarla açılmış.
- İade edilen ürünün durumu izlenemiyor.
- Ölü stok raporu çıkarılamıyor.
- Yeniden sipariş kararları sezgiyle veriliyor.

"Sayım farkı %2'yi aşınca mutlaka yazılım alınır" şeklinde evrensel sınır kullanılmamalıdır. Yüksek değerli küçük bir ürün grubunda %0,5 fark bile önemli olabilir.

## Pazaryeri riski

Pazaryerleri stokta olmayan ürün, geciken gönderim ve sipariş iptalleri için farklı performans ölçütleri ve yaptırımlar uygulayabilir. Bu kurallar:

- platforma,
- kategoriye,
- satıcı sözleşmesine,
- döneme

göre değişebilir. "Belirli sayıda iptalde mağaza kapatılır" gibi sabit ifade yerine satıcının güncel paneli ve sözleşmesi kontrol edilmelidir.

## Ölü stok maliyeti

Satılmayan stokun etkisi yalnızca satın alma bedeli değildir.

Ölü Stok Yükü = Bağlı Sermaye Maliyeti + Depolama + Hasar/Bozulma + Değer Kaybı + Elden Çıkarma Maliyeti

Bağlı sermaye maliyetinde rastgele "piyasa faizi %35" kullanmak yerine işletmenin:

- kredi maliyeti,
- özkaynak hedef getirisi,
- alternatif kullanım değeri

esas alınmalıdır.

## Sistem seçim kriterleri

- SKU ve varyant yapısı
- depo ve şube sayısı
- sipariş hacmi
- barkod ve el terminali
- lot/seri/son kullanma ihtiyacı
- pazaryeri entegrasyonu
- rezervasyon mantığı
- iade ve hasarlı stok
- sayım
- yeniden sipariş
- kullanıcı yetkisi
- API ve veri dışa aktarma
- çevrim dışı kullanım
- destek ve yedekleme

## Düzeltilmiş varsayımsal senaryo

Verda Ev & Yaşam'ın:

- 1.400 SKU,
- bir depo,
- iki mağaza ve e-ticaret kanalı

bulunsun.

Mevcut doğrulanmış aylık etkiler:

- stok yokluğu nedeniyle iptal edilen sipariş cirosu: 36.000 TL,
- platform kesinti ve operasyon maliyeti: 8.500 TL,
- yanlış gönderi maliyeti: 12.000 TL.

Ancak iptal edilen 36.000 TL cironun tamamı zarar değildir. %40 brüt kâr varsayımıyla kaçırılan brüt kâr: 36.000 × 0,40 = 14.400 TL

Doğrudan aylık etkiler: 14.400 + 8.500 + 12.000 = 34.900 TL

### Ölü stok

240.000 TL atıl stok bulunduğunu ve işletmenin yıllık sermaye maliyetinin %35 olduğunu varsayalım: 240.000 × 0,35 = 84.000 TL/yıl

84.000 ÷ 12 = 7.000 TL/ay

Toplam ölçülen aylık ekonomik yük: 34.900 + 7.000 = 41.900 TL

Önceki 63.500 TL hesabı, kaybedilen cironun tamamını maliyet saydığı için kâr etkisini yüksek gösteriyordu.

### Sistem maliyeti

- el terminali ve yazıcı: 36.000 TL,
- yıllık lisans: 30.000 TL,
- kurulum, etiketleme ve eğitim: 24.000 TL.

İlk yıl: 36.000 + 30.000 + 24.000 = 90.000 TL

Sistemin kayıpların tamamını sıfırlamadığını varsayalım:

- stok iptal etkisinde %70 azalma,
- platform maliyetinde %60 azalma,
- yanlış gönderide %75 azalma,
- ölü stok finansman etkisinde ilk yıl %25 azalma.

Aylık katkı:

- 14.400 × 0,70 = 10.080
- 8.500 × 0,60 = 5.100
- 12.000 × 0,75 = 9.000
- 7.000 × 0,25 = 1.750
- 10.080 + 5.100 + 9.000 + 1.750 = 25.930 TL/ay

Basit geri dönüş: 90.000 ÷ 25.930 ≈ 3,5 ay

Bu sonuç ancak pilot sonrasında doğrulanabilir.

## Geçiş sırası

1. Ürün kartlarını temizle.
2. Tekil SKU standardı oluştur.
3. Barkodları doğrula.
4. Depo ve raf adreslerini tanımla.
5. Açılış sayımı yap.
6. Satılabilir, teşhir, hasarlı ve iade stoklarını ayır.
7. Pazaryeri eşleştirmelerini test et.
8. Bir ürün grubunda pilot uygula.
9. Son ürün eş zamanlı satış testi yap.
10. Sayım farkını karşılaştır.
11. Kullanıcı eğitimini tamamla.
12. Tam geçiş yap.

KOSGEB'in dijital dönüşüm programları belirli sektör, ölçek, değerlendirme ve finansman koşullarına bağlıdır. "Her stok yazılımı KOSGEB tarafından desteklenir" denmemelidir. Güncel programda dijital dönüşüm/olgunluk değerlendirme raporu ve program başvurusu gibi aşamalar bulunmaktadır.

## Bu dersten çıkacak çalışma kaydınız

**Stok Yönetim Sistemi Otomasyon ve Geçiş Karar Formu**: SKU ve varyant sayısı, kanal ve depo sayısı, iptal ve yanlış sevk oranı, sayım farkı, atıl stok, sipariş toplama süresi, gerekli sistem düzeyi, donanım, entegrasyon, ilk yıl maliyeti, beklenen kayıp azaltma oranları, pilot sonuçları, geçiş kararı alanlarını içermelidir.

> Stok seviyesi ve yeniden sipariş kararını **[Stok Artırmalı mıyım?](/app/decision-checks/DC-STOCK-011)** karar aracıyla test edin — bu ders hangi sistemi kullanacağınızı, o araç ise ne kadar sipariş vermeniz gerektiğini değerlendirir.
>
> Stok devir hızını senaryolamak için Model Laboratuvarı'ndaki **[Stokta Kalma Süresi (DIO)](/app/finance/models/DIO)** modelini kullanabilirsiniz.
>
> Hızlı kontrol için **[Finans Merkezi'nde Stok Devir Hızı](/app/tools?tool=stok_devir)** ve **[ROI](/app/tools?tool=roi)** araçları da kullanılabilir.

## Kaynaklar

1. [KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)
2. [KOSGEB — Güncel destek ve başvuru duyuruları](https://www.kosgeb.gov.tr/)


---

## POS ve Kasa Yazılımı Nasıl Seçilir?

**Slug:** `v5-pos-ve-kasa-yazilimi-secimi` · **Seviye:** uygulamalı · **Süre:** ~15 dk · **Ders sayısı:** 1

YN ÖKC, EFT-POS ve kasa yazılımı arasındaki farkı ayırarak teknik uygunluk, çevrim dışı çalışma ve toplam sahip olma maliyetine göre seçim yapın.

**Kazanımlar**

- POS ve Kasa Yazılımı Teknik İhtiyaç ve Seçim Listesi hazırlayabilir

### 1. POS ve Kasa Yazılımı Nasıl Seçilir?

*Bilgi nesnesi: `CUR-133-01`*

# POS ve Kasa Yazılımı Nasıl Seçilir?

Perakende işletmesinde kasa noktası yalnızca ödemenin alındığı yer değildir. Satış, stok, fiyat, kampanya, iade, müşteri ve muhasebe verilerinin kesiştiği operasyon merkezidir.

İşletmeler POS seçimini çoğu zaman şu soruya indirger: "En uygun fiyatlı yazar kasa POS hangisi?" Oysa doğru karar için üç ayrı yapının birbirinden ayrılması gerekir:
1. Mali belge düzenleyen cihaz veya sistem
2. Kartlı ödeme alan banka/EFT-POS altyapısı
3. Satışı, ürünü, stoğu ve raporlamayı yöneten kasa yazılımı

Bu üç işlev tek cihazda birleşebilir veya birbirine bağlı farklı sistemler üzerinden çalışabilir. İşletme, yalnızca cihaz fiyatını değil bu yapıların birbiriyle güvenli ve mevzuata uygun biçimde haberleşip haberleşmediğini değerlendirmelidir.

Yeni Nesil Ödeme Kaydedici Cihaz uygulamasına ilişkin cihazlar, onaylı model listeleri, teknik belgeler ve güncel mevzuat GİB'in YN ÖKC portalından takip edilmelidir. Mayıs 2026'da yayımlanan 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği ile YN ÖKC'lerden belirli elektronik belgelerin düzenlenmesine ilişkin yeni düzenlemeler de yapılmıştır. Bu nedenle geçmiş yıllardaki cihaz tavsiyeleri güncel kontrol yapılmadan kullanılmamalıdır.

## Önce ihtiyacını doğru tanımlayın

İşletme şu sorulara cevap vermeden ürün karşılaştırmasına başlamamalıdır:
- Kaç fiziksel satış noktası var?
- Aynı anda kaç kasa çalışacak?
- Günlük ve yoğun saatlerdeki işlem sayısı nedir?
- Ürünler barkodlu mu?
- Ağırlık veya varyant takibi gerekiyor mu?
- İade ve değişim kasada nasıl yönetiliyor?
- Fiziksel mağaza ile e-ticaret aynı stoğu mu kullanıyor?
- Fiyat ve kampanyalar merkezden mi yönetilecek?
- Satışlar ön muhasebe veya ERP sistemine aktarılacak mı?
- İnternet kesintisinde hangi işlemlerin devam etmesi gerekiyor?
- İşletmenin tabi olduğu mali belge düzeni nedir?

Bir mağaza için yeterli olan sistem, çok şubeli başka bir işletme için yetersiz olabilir.

## ÖKC, EFT-POS ve kasa yazılımı arasındaki fark

**Yeni Nesil ÖKC**
Mali belge düzenleme ve GİB'in belirlediği teknik ve güvenlik kurallarına uyma işlevini taşır. İşletme cihaz seçerken:
- cihazın GİB onay durumunu,
- modelin güncel listede bulunup bulunmadığını,
- yetkili servis ağını,
- satış yazılımıyla bağlantı seçeneklerini,
- güncel teknik kılavuzlara uygunluğunu
kontrol etmelidir.

GİB, EFT-POS özellikli ve bilgisayar bağlantılı YN ÖKC modellerini resmî listelerde yayımlamaktadır. Satın alma kararı satıcının beyanıyla değil bu listeler ve yetkili firma bilgileriyle doğrulanmalıdır.

**EFT-POS veya banka POS'u**
Kartlı ödemeyi işleyen bankacılık altyapısıdır. Değerlendirilecek noktalar:
- komisyon oranı,
- bloke süresi,
- taksit seçenekleri,
- banka ve kart desteği,
- bağlantı güvenilirliği,
- iptal ve iade süreci,
- gün sonu mutabakatı.

**Kasa satış yazılımı**
Ürün ve satış operasyonunu yönetir. Olası işlevler:
- barkod okutma,
- merkezî fiyat yönetimi,
- kampanya,
- stok düşümü,
- kullanıcı yetkileri,
- iade ve değişim,
- şube raporu,
- müşteri kaydı,
- ön muhasebe veya ERP aktarımı.

Mali cihaz uyumluluğu bulunmayan sıradan bir satış yazılımı, mevzuat gerektiren mali belge işlevini tek başına yerine getiremez.

## Seçimde karşılaştırılacak altı alan

### 1. Mali ve teknik uyumluluk
Satıcıdan yalnızca "GİB uyumlu" sözü alınmamalıdır. Şunlar yazılı olarak doğrulanmalıdır:
- desteklenen YN ÖKC marka ve modelleri,
- entegrasyon yöntemi,
- mali belgenin hangi sistemden üretildiği,
- iade ve iptal akışı,
- yazılım güncellemesi sonrası uyumluluk sorumlusu,
- mevzuat değişikliğinde güncellemenin kim tarafından yapılacağı.

"GMP3 destekliyor" gibi tek bir teknik ifadeyi bütün uyumluluğun kanıtı kabul etme. İşletmenin kullanacağı cihaz, banka, satış yazılımı ve belge türü birlikte test edilmelidir.

### 2. İnternet kesintisi ve çevrim dışı çalışma
"Offline çalışır" ifadesi ayrıntılandırılmalıdır.

Sorulacak sorular:
- Hangi işlemler bağlantısız yapılabilir?
- Mali belge düzenleme devam eder mi?
- Kartlı ödeme alınabilir mi?
- Yerel kayıt ne kadar süre saklanır?
- Aynı ürün iki kasada satılırsa stok çakışması oluşur mu?
- İnternet geldiğinde senkronizasyon nasıl yapılır?
- Çift kayıt engelleniyor mu?
- Veri kaybı olursa sorumluluk kimde?

Satış yazılımının çevrim dışı çalışabilmesi, banka veya mali cihazın bütün işlevlerinin internet olmadan devam edeceği anlamına gelmez.

### 3. Stok ve fiyat senkronizasyonu
İyi bir sistem:
- satıştan sonra stoğu doğru depodan düşmeli,
- iadeyi stoğa kontrollü eklemeli,
- teşhir ve hasarlı ürünü ayırmalı,
- şubeler arası transferi kaydetmeli,
- fiyat değişikliğini doğru tarihte uygulamalı,
- e-ticaretle çakışmayı yönetmelidir.

Senkronizasyon "anlık" olarak tanımlanıyorsa gerçek gecikme süresi ve başarısız aktarım yöntemi test edilmelidir.

### 4. Çoklu şube ve kullanıcı kontrolü
Şunlar bulunabilir:
- şube bazlı stok,
- merkezî ürün kartı,
- rol ve yetki,
- kasiyer bazlı işlem kaydı,
- fiyat değiştirme yetkisi,
- iade onayı,
- kasa açma-kapama kaydı,
- şubeler arası transfer.

Her çalışanın bütün işlemleri yapabilmesi güvenlik ve denetim riskidir.

### 5. Mutabakat ve raporlama
Sistem şu kayıtları karşılaştırmayı kolaylaştırmalıdır:
- satış yazılımı toplamı,
- mali belge toplamı,
- nakit,
- kartlı ödeme,
- banka/POS raporu,
- iptal ve iadeler,
- kasa giriş-çıkışları.

"Tek panelde görünmesi", kayıtların otomatik olarak doğru mutabık olduğu anlamına gelmez. Fark raporu ve inceleme akışı bulunmalıdır.

### 6. Toplam sahip olma maliyeti

Sadece cihaz ve yıllık lisans bedeli hesaplanmamalıdır.

Toplam Sahip Olma Maliyeti = Donanım + Lisans + Kurulum + Entegrasyon + Eğitim + Bakım + Servis + Yedek Cihaz + Veri Aktarımı

Ek olarak:
- banka komisyonları,
- cihaz değişimi,
- yeni şube lisansı,
- kullanıcı ücreti,
- API kullanımı,
- destek paketi
sorulmalıdır.

## Satın almadan önce pilot test

Canlı geçişten önce şu senaryolar test edilmelidir:
- Normal satış
- Nakit ve kartlı ödeme
- Bölünmüş ödeme
- İade ve değişim
- Kampanyalı satış
- İnternet kesintisi
- Yanlış barkod
- Fiyat değişikliği
- Şube transferi
- Gün sonu mutabakatı
- E-ticaretle eş zamanlı son ürün satışı
- Kullanıcı yetkisi ihlali

## Düzeltilmiş varsayımsal senaryo

Aşağıdaki rakamlar gerçek yazılım teklifi değil, karar yöntemini göstermek amacıyla hazırlanmıştır.

Verda Ev & Yaşam'ın iki mağazasında günde toplam 300 işlem yapılsın.

Mevcut düzende ürün satış yazılımında okutulduktan sonra tutarın ödeme cihazına tekrar elle girildiğini varsayalım.

**Ek işlem süresi**
İşlem başına ortalama 40 saniye:
- 300 × 40 = 12.000 saniye
- 12.000 ÷ 3.600 = 3,33 saat

Bu, müşterilerin kesin olarak 3,33 saat beklediği anlamına gelmez. Günlük işlemlere dağılmış toplam ek kasa süresidir. Finansal kayıp hesaplanabilmesi için:
- yoğun saat kuyruğu,
- terk edilen sepet,
- çalışan fazla mesaisi,
- işlem kapasitesi
ayrıca ölçülmelidir.

**Hata analizi**
Aylık 9.000 işlem olduğunu varsayalım:
- 300 × 30 = 9.000

%1,5 manuel giriş hatası:
- 9.000 × 0,015 = 135 işlem

Ancak 135 işlemin tamamı 450 TL kayıp oluşturmaz. Hatanın:
- ortalama tutar farkı,
- sonradan düzeltilen kısmı,
- iade ve iptal maliyeti,
- stok etkisi
ölçülmelidir.

İşletme kayıtlarından doğrulanan aylık toplam hata ve mutabakat maliyetinin 22.500 TL olduğunu varsayalım.

**Yeni sistem maliyeti**
- donanım: 45.000 TL,
- ilk yıl lisans: 18.000 TL,
- eğitim ve veri aktarımı: 10.000 TL,
- toplam ilk yıl maliyeti: 73.000 TL.

Yeni sistemin hataların tamamını değil %80'ini azalttığını varsayalım:
- 22.500 × 0,80 = 18.000 TL/ay

Basit geri dönüş süresi:
- 73.000 ÷ 18.000 ≈ 4,1 ay

Bu hesaba:
- kuyruk azalmasının olası katkısı,
- bakım maliyeti,
- geçiş dönemindeki hata,
- finansman maliyeti
dâhil değildir.

## Bu dersten çıkacak çalışma kaydınız

**POS ve Kasa Yazılımı Teknik İhtiyaç ve Seçim Listesi**: tabi olunan mali cihaz ve belge düzeni, GİB onay kontrolü, mağaza ve kasa sayısı, günlük işlem hacmi, desteklenen ödeme türleri, çevrim dışı çalışma sınırları, stok ve fiyat senkronizasyonu, iade akışı, kullanıcı yetkileri, mutabakat raporları, entegrasyonlar, ilk yıl ve üç yıllık toplam maliyet, pilot test sonucu, seçilen sistem ve gerekçesi.

> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — POS seçimi teknik, mevzuatsal ve operasyonel bir değerlendirme konusudur.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

## Kaynaklar

1. [GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)
2. [GİB — 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği (PDF)](https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf)
3. [GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. YN ÖKC, EFT-POS ve mali belge düzenine ilişkin kararlar için güncel GİB düzenlemeleri ve yetkili firma bilgileri doğrulanmalıdır.*


---

## Muhasebe Yazılımına Geçmeli miyim?

**Slug:** `v5-muhasebe-yazilimina-gecme` · **Seviye:** uygulamalı · **Süre:** ~15 dk · **Ders sayısı:** 1

Excel yetersizliği sinyallerini, ön muhasebe yazılımı işlevlerini ve zaman/finans katkısını karşılaştırarak geçiş kararı verin.

**Kazanımlar**

- Ön Muhasebe Yazılımı Geçiş ve ROI Analiz Cetveli hazırlayabilir

### 1. Muhasebe Yazılımına Geçmeli miyim?

*Bilgi nesnesi: `CUR-134-01`*

# Muhasebe Yazılımına Geçmeli miyim?

İşletmeler ilk dönemlerinde satış, tahsilat, gider ve cari hesaplarını Excel tablolarında takip edebilir. Excel'in kullanılması tek başına yanlış değildir. Sorun, işletme büyüdüğü hâlde:
- verilerin farklı dosyalara dağılması,
- aynı bilginin birden fazla kez girilmesi,
- kimin hangi kaydı değiştirdiğinin bilinmemesi,
- cari ve banka kayıtlarının eşleşmemesi,
- faturaların zamanında düzenlenmemesi,
- yönetimin güncel finansal durumu görememesi
hâlinde ortaya çıkar.

Ön muhasebe yazılımı, Serbest Muhasebeci Mali Müşavir'in ve resmî genel muhasebenin yerine geçmez. İşletmenin günlük finansal kayıtlarını düzenler ve muhasebe sürecine daha sağlıklı veri aktarılmasını sağlar.

## Önemli düzeltme: Yazılım kullanımı ile e-belge yükümlülüğü aynı şey değildir

e-Fatura, e-Arşiv Fatura ve diğer e-belge uygulamalarına geçiş koşulları GİB düzenlemeleriyle belirlenir. Bir işletmenin bu kapsama girmesi, mutlaka özel bir ticari ön muhasebe yazılımı satın almak zorunda olduğu anlamına gelmez; GİB Portal veya uygun entegrasyon yöntemleri kullanılabilir.

GİB e-Fatura Portalı için resmî kullanım kılavuzları yayımlamaktadır. İşletmenin hangi e-belgeye tabi olduğu ve hangi yöntemi kullanabileceği güncel GİB düzenlemelerinden ve mali müşavirden doğrulanmalıdır.

## Excel'den geçiş için sabit sayı kullanmayın

"Ayda 50 faturadan sonra yazılım zorunludur" şeklinde evrensel bir sınır yoktur.

Ayda 20 faturası olan ancak:
- beş banka hesabı,
- çok sayıda vadeli alacağı,
- karmaşık stok yapısı
bulunan işletme yazılıma ihtiyaç duyabilir.

Ayda 100 basit faturası olan başka bir işletme ise sınırlı bir çözümle yönetilebilir.

Karar işlem sayısından çok karmaşıklık, hata ve kontrol ihtiyacına göre verilmelidir.

## Geçiş ihtiyacını gösteren sinyaller

- Güncel nakit ve banka bakiyesi tek yerden görülemiyor.
- Vadesi geçen alacaklar geç fark ediliyor.
- Aynı fatura veya ödeme birden fazla dosyada tutuluyor.
- Müşteri ve tedarikçi bakiyeleri uyuşmuyor.
- Stok ile satış kayıtları farklı.
- SMMM'ye gönderilen evraklar eksik veya geç.
- Fatura kesimi tekrarlı veri girişine dönüşüyor.
- Kullanıcı değişiklik geçmişi bulunmuyor.
- Yönetim kâr, nakit ve alacak durumunu zamanında göremiyor.
- Excel dosyası tek kişinin bilgisayarına bağımlı.

## Ön muhasebe yazılımından beklenen işlevler

İşletmenin ihtiyacına göre:
- satış ve alış faturaları,
- e-belge bağlantısı,
- cari hesap,
- banka hareketleri,
- kasa,
- çek/senet,
- stok,
- tahsilat hatırlatma,
- gider,
- kullanıcı yetkileri,
- SMMM aktarımı,
- raporlama
değerlendirilebilir.

En fazla özelliğe sahip ürün değil, kullanılan süreçleri doğru yöneten ürün seçilmelidir.

## Toplam sahip olma maliyeti

Yıllık TCO = Lisans + E-belge Kullanımı + Banka Entegrasyonu + Kurulum + Veri Aktarımı + Eğitim + Destek + Ek Kullanıcı

Şunlar ayrıca sorulmalıdır:
- fiyat artışı nasıl uygulanıyor?
- veriler dışarı aktarılabiliyor mu?
- abonelik biterse kayıtlara erişim sürüyor mu?
- yedekleme kimde?
- SMMM hangi formatta veri alıyor?
- banka entegrasyonu gecikmeli mi?
- iptal ve düzeltme kayıtları izleniyor mu?

## Zaman tasarrufunu nasıl ölçmelisiniz?

Yazılımın bütün manuel işi ortadan kaldıracağı varsayılmamalıdır.

Fatura için:

Aylık Zaman Maliyeti = İşlem Sayısı × Ortalama İşlem Süresi × Saatlik Tam Personel Maliyeti

"Saatlik personel maliyeti" yalnızca net ücret değildir. İşveren maliyetleri ve ilgili yan giderler hesaba katılabilir.

Ayrıca otomasyon sonrası kalan:
- kontrol,
- istisna düzeltme,
- müşteri kartı yönetimi,
- banka eşleştirme
süresi de düşülmemelidir.

## Düzeltilmiş varsayımsal senaryo

Verda Ev & Yaşam'ın ayda 850 belge düzenlediğini varsayalım.

**Manuel süreç**
Belge başına dört dakika:
- 850 × 4 = 3.400 dakika
- 3.400 ÷ 60 = 56,7 saat

Tam personel saatlik maliyetinin 300 TL olduğu varsayılsın:
- 56,7 × 300 = 17.010 TL/ay

Yazılım sonrasında işlem süresinin sıfırlanması değil, belge başına bir dakikaya düşmesi varsayılsın:
- 850 × 1 = 850 dakika
- 850 ÷ 60 = 14,2 saat

Aylık tasarruf edilen süre:
- 56,7 − 14,2 = 42,5 saat

Yaklaşık zaman katkısı:
- 42,5 × 300 = 12.750 TL/ay

**Gecikmiş alacak katkısı**
Gecikmiş alacakların finansman etkisinin aylık 18.000 TL olduğu belirtilmişse yazılımın bunun tamamını ortadan kaldırdığı varsayılmamalıdır.

Yazılımla gecikme maliyetinin %30 azaldığını varsayalım:
- 18.000 × 0,30 = 5.400 TL/ay

**Yazılım maliyeti**
- lisans: 16.500 TL,
- e-belge paketi: 4.500 TL,
- banka entegrasyonu: 3.000 TL,
- ilk kurulum ve eğitim: 12.000 TL.

İlk yıl:
- 16.500 + 4.500 + 3.000 + 12.000 = 36.000 TL

Aylık ortalama:
- 36.000 ÷ 12 = 3.000 TL

**Basitleştirilmiş aylık katkı**
- 12.750 + 5.400 − 3.000 = 15.150 TL

**Basit ilk yıl katkısı**
- 15.150 × 12 = 181.800 TL

Bu tutar kesin tasarruf değildir. Yazılımın gerçekten gecikmiş alacakları azaltıp azaltmadığı ve personel zamanının değer üreten işe aktarılıp aktarılmadığı ölçülmelidir.

## Geçiş planı

1. Cari kartları temizle.
2. Açılış bakiyelerini doğrula.
3. Ürün ve hizmet kartlarını standartlaştır.
4. Banka ve kasa hesaplarını eşleştir.
5. Yetkileri tanımla.
6. SMMM ile aktarım formatını test et.
7. Bir ay paralel kontrol yap.
8. Eski Excel dosyalarını salt okunur arşivle.
9. İlk ay mutabakatını tamamla.
10. Hata listesini kapatmadan eski yöntemi bırakma.

## Bu dersten çıkacak çalışma kaydınız

**Ön Muhasebe Yazılımı Geçiş ve ROI Analiz Cetveli**: mevcut süreçler, aylık işlem hacmi, manuel çalışma süresi, hata ve gecikme maliyeti, gerekli modüller, e-belge yöntemi, SMMM uyumu, banka entegrasyonu, üç yıllık maliyet, veri aktarım planı, zaman ve finans katkısı, pilot sonucu, geçiş kararı.

> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — muhasebe yazılımı geçişi süreç ve uyum kararıdır.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

## Kaynaklar

1. [GİB — e-Belge Portalı](https://ebelge.gib.gov.tr/)
2. [GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. Yükümlülükler, belge türleri ve geçiş koşulları için güncel GİB düzenlemeleri ile mali müşavir görüşü esas alınmalıdır.*


---

## Entegrasyon mu, Manuel Süreç mi?

**Slug:** `v5-entegrasyon-mu-manuel-surec-mi` · **Seviye:** uygulamalı · **Süre:** ~15 dk · **Ders sayısı:** 1

Manuel süreç, yarı otomasyon ve tam entegrasyon arasında maliyet-fayda ve kontrol düzeyine göre karar verin.

**Kazanımlar**

- Süreç Entegrasyonu Maliyet-Fayda ve Karar Matrisi hazırlayabilir

### 1. Entegrasyon mu, Manuel Süreç mi?

*Bilgi nesnesi: `CUR-135-01`*

# Entegrasyon mu, Manuel Süreç mi?

Dijitalleşme, işletmedeki her işi birbirine bağlamak anlamına gelmez.

Gereksiz entegrasyon:
- yüksek kurulum maliyeti,
- yazılım sağlayıcısına bağımlılık,
- bakım yükü,
- görünmeyen veri hataları,
- süreç kesintisi,
- siber güvenlik riski
oluşturabilir.

Ancak yüksek hacimli ve kritik işlemleri manuel bırakmak da:
- tekrarlı işçilik,
- gecikme,
- yanlış veri,
- müşteri kaybı,
- platform cezası,
- kontrol zorluğu
yaratabilir.

Doğru soru şudur: Bu süreç hangi ölçekte, hangi kontrol düzeyiyle ve hangi maliyetle otomatikleştirilmeli?

## Basit denklem yeterli değildir

İlk değerlendirme için:

Manuel Süreç Maliyeti = İşçilik + Hata + Gecikme

kullanılabilir.

Ancak entegrasyon kararında karşı taraf da tam hesaplanmalıdır:

Entegrasyon Maliyeti = Kurulum + Lisans + Bakım + İç Kontrol + Kesinti Riski + Değişiklik Maliyeti

Otomasyonun sağlayacağı brüt fayda:

Brüt Otomasyon Faydası = Azalan İşçilik + Azalan Hata + Hızlanan Tahsilat + Korunan Satış

Net katkı:

Net Otomasyon Katkısı = Brüt Fayda − Toplam Entegrasyon Maliyeti

## Entegrasyona uygun süreçlerin özellikleri

- Yüksek tekrar: İşlem aynı kurallarla sık tekrarlanıyor.
- Standart veri: Girdi ve çıktı alanları açık biçimde tanımlanabiliyor.
- Hata etkisi yüksek: Yanlış veri finansal veya müşteri kaynaklı önemli sonuç oluşturuyor.
- Zaman duyarlılığı: Gecikme stok, teslimat veya müşteri iletişimini bozuyor.
- İzlenebilirlik ihtiyacı: Hangi kaydın ne zaman aktarıldığı görülebilmeli.
- Yeterli hacim: Kurulum ve bakım maliyetini karşılayacak işlem sayısı bulunuyor.

## Manuel veya yarı otomatik kalabilecek süreçler

- çok seyrek yapılan,
- her seferinde farklı karar gerektiren,
- veri yapısı standart olmayan,
- insan değerlendirmesi yüksek,
- hata etkisi düşük,
- entegrasyon maliyeti yüksek
süreçler manuel kalabilir.

Ancak manuel kalması "kontrolsüz" olması anlamına gelmez. Şunlar kullanılabilir:
- standart form,
- kontrol listesi,
- çift kontrol,
- dosya içe aktarma,
- toplu işlem,
- onay akışı.

Tam otomasyon ile tamamen manuel yöntem arasında yarı otomasyon seçeneği vardır.

## Önce süreci düzeltin, sonra entegre edin

Şu sorunlar çözülmeden entegrasyon yapılmamalıdır:
- aynı ürünün farklı kodlarla bulunması,
- müşteri adreslerinin standart olmaması,
- sipariş statülerinin belirsizliği,
- iade nedenlerinin tanımlanmaması,
- kargo kurallarının sürekli değişmesi,
- personel sorumluluğunun net olmaması.

Otomasyon hatalı veriyi daha hızlı yayabilir.

## Entegrasyon riskleri

**Sağlayıcı bağımlılığı**
Veriler başka sisteme taşınabiliyor mu?

**API değişikliği**
Pazaryeri veya kargo firması bağlantıyı değiştirirse kim güncelleyecek?

**Başarısız aktarım**
Hatalı kayıt nasıl kuyruğa alınacak?

**Çift kayıt**
Aynı sipariş iki kez faturalanabilir mi?

**Güvenlik**
Hangi sistem hangi veriye erişiyor?

**İş sürekliliği**
Entegrasyon kapandığında geçici manuel yöntem var mı?

**Mutabakat**
"Başarılı aktarıldı" kaydı, karşı sistemde gerçekten oluştuğunu kanıtlıyor mu?

## Entegrasyon öncelik puanı

Her süreç 1-5 arasında puanlanabilir:

| Ölçüt | Puan |
| --- | --- |
| İşlem hacmi | 1-5 |
| Manuel süre | 1-5 |
| Hata etkisi | 1-5 |
| Zaman duyarlılığı | 1-5 |
| Veri standardı | 1-5 |
| Teknik uygulanabilirlik | 1-5 |

Yüksek toplam puan entegrasyon adayını gösterir; ancak finansal fizibilitenin yerine geçmez.

## Düzeltilmiş varsayımsal senaryo

Verda Ev & Yaşam ayda 1.200 e-ticaret siparişi işliyor.

**Manuel süreçte**
- adres kargo sistemine giriliyor,
- belge düzenleniyor,
- takip numarası kanala aktarılıyor.

**Manuel zaman**
Sipariş başına altı dakika:
- 1.200 × 6 = 7.200 dakika
- 7.200 ÷ 60 = 120 saat

Bir çalışanın aylık üretken çalışma süresini doğrudan 160 saat varsaymak yerine işletmenin gerçek bordro ve çalışma düzeni kullanılmalıdır.

Tam personel maliyeti aylık 48.000 TL ve üretken süre 160 saat varsayılsın:
- 48.000 ÷ 160 = 300 TL/saat

Manuel zaman maliyeti:
- 120 × 300 = 36.000 TL/ay

**Hata maliyeti**
Aylık 25 hatalı gönderi ve olay başına ortalama 250 TL doğrulanmış maliyet:
- 25 × 250 = 6.250 TL

Toplam:
- 36.000 + 6.250 = 42.250 TL/ay

**Entegrasyon maliyeti**
- yıllık lisans: 36.000 TL,
- ilk kurulum: 12.000 TL,
- yıllık destek ve ek kullanım: 12.000 TL,
- iç kontrol için ayda 10 saat.

Yıllık dış maliyet:
- 36.000 + 12.000 + 12.000 = 60.000 TL

Aylık ortalama:
- 60.000 ÷ 12 = 5.000 TL

İç kontrol:
- 10 × 300 = 3.000 TL/ay

Toplam aylık entegrasyon maliyeti:
- 5.000 + 3.000 = 8.000 TL

**Gerçekçi fayda varsayımı**
Entegrasyon:
- manuel süreyi %80 azaltıyor,
- hata maliyetini %70 azaltıyor.

Zaman katkısı:
- 36.000 × 0,80 = 28.800 TL

Hata katkısı:
- 6.250 × 0,70 = 4.375 TL

Toplam brüt katkı:
- 28.800 + 4.375 = 33.175 TL

Net aylık katkı:
- 33.175 − 8.000 = 25.175 TL

Bu tutar "nakit tasarruf" olarak kabul edilmemelidir. Çalışanın işine son verilmediyse personel maliyeti ortadan kalkmaz; serbest kalan zamanın:
- müşteri hizmetleri,
- satış,
- veri kontrolü,
- pazarlama
gibi değer üreten işlerde kullanılması gerekir.

## Üç seçenekli karar

| Seçenek | Maliyet | Kontrol | Hız | Uygun durum |
| --- | --- | --- | --- | --- |
| Manuel | Düşük sabit/yüksek değişken | İnsan kontrolü | Düşük | Seyrek ve farklı işlemler |
| Yarı otomatik | Orta | Yüksek | Orta | Toplu içe aktarma ve onay |
| Tam entegrasyon | Yüksek sabit/düşük işlem maliyeti | Sistem + mutabakat | Yüksek | Yüksek hacim ve standart süreç |

## Pilot uygulama

Entegrasyonu bütün kanallarda aynı anda açma.
- Tek kanal seç.
- 100-200 siparişlik pilot yap.
- Başarılı aktarım oranını ölç.
- Çift kayıt kontrolü yap.
- Hata kuyruğunu test et.
- İptal ve iadeyi dene.
- Kesinti senaryosu uygula.
- Manuel geri dönüş planını dene.
- Mutabakat yap.
- Sonra ölçeklendir.

## Bu dersten çıkacak çalışma kaydınız

**Süreç Entegrasyonu Maliyet-Fayda ve Karar Matrisi**: sürecin başlangıç ve bitişi, aylık işlem hacmi, manuel süre, saatlik tam maliyet, hata ve gecikme maliyeti, veri standardı, tam ve yarı otomasyon seçenekleri, kurulum ve yıllık maliyet, bakım ve kontrol süresi, sağlayıcı bağımlılığı, güvenlik ve kesinti riski, pilot başarı ölçütü, geri dönüş planı, net katkı, karar ve gerekçe.

> Bu ders için mevcut Karar Araçları arasında doğrudan uygun bir tanı aracı bulunmuyor — entegrasyon kararı süreç ve maliyet-fayda analizidir.
>
> Yatırımın geri dönüşünü hızlı karşılaştırmak için **[Finans Merkezi'nde Yatırım Getirisi (ROI)](/app/tools?tool=roi)** aracını kullanabilirsiniz.

## Kaynaklar

1. [KOSGEB — KOBİ Dijital Dönüşüm Destek Programı](https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi)
> Not: Elektronik ticaret ve platform süreçlerine ilişkin güncel yükümlülükler değişebileceği için sağlayıcıdan yazılı teknik kapsam alınmalıdır.

> Not: Yazılım API'leri, pazaryeri kuralları, ücretler ve bağlantı kapsamları değişebileceği için sağlayıcıdan yazılı teknik kapsam alınmalıdır.
*Kaynaklar Ağustos 2026'da kontrol edilmiştir. KOSGEB destek koşulları ve sağlayıcı sözleşmeleri için güncel kaynaklar doğrulanmalıdır.*


---
