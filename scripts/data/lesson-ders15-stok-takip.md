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

## Kaynaklar

1. [KOSGEB — KOBİ Dijital Dönüşüm Destek Programı ve güncel uygulama belgeleri](https://www.kosgeb.gov.tr/)
2. [KOSGEB — Güncel destek ve başvuru duyuruları](https://www.kosgeb.gov.tr/)
