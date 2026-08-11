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

## Kaynaklar

1. [GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)
2. [GİB — 593 Sıra No.lu Vergi Usul Kanunu Genel Tebliği (PDF)](https://ynokc.gib.gov.tr/UploadedFiles/Files/vuk_593_20260508.pdf)
3. [GİB — Yeni Nesil Ödeme Kaydedici Cihaz (YN ÖKC) Portalı](https://www.gib.gov.tr/ynokc)

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. YN ÖKC, EFT-POS ve mali belge düzenine ilişkin kararlar için güncel GİB düzenlemeleri ve yetkili firma bilgileri doğrulanmalıdır.*
