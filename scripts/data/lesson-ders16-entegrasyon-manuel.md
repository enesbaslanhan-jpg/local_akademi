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

## Kaynaklar

1. [KOSGEB — KOBİ Dijital Dönüşüm Destek Programı](https://www.kosgeb.gov.tr/site/tr/genel/destekdetay/9144/kobi-dijital-donusum-destek-programi)
2. [Elektronik ticaret ve platform süreçlerine ilişkin güncel yükümlülükler](https://www.kosgeb.gov.tr/)
3. Yazılım API'leri, pazaryeri kuralları, ücretler ve bağlantı kapsamları değişebileceği için sağlayıcıdan yazılı teknik kapsam alınmalıdır.

*Kaynaklar Ağustos 2026'da kontrol edilmiştir. KOSGEB destek koşulları ve sağlayıcı sözleşmeleri için güncel kaynaklar doğrulanmalıdır.*
