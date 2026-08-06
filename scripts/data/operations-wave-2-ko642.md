# KO 642 — Darboğaz Analizi

## Metadata

- **Başlık:** Herkes Çalışıyor, Siparişler Neden Çıkmıyor?
- **Özet:** Yoğun görünen bir operasyonu kullanılabilir süre, işlem süresi, paralel kaynak, günlük kapasite ve iş birikimi verileriyle incele. En uzun görünen işlemle toplam çıktıyı gerçekten sınırlayan darboğazı ayır; ilk tahminini verilerle sına ve ilk incelemenin hangi adıma yönelmesi gerektiğini belirle.
- **Öğrenme çıktıları:** Bir adımın tahmini günlük kapasitesini hesaplamak; en uzun birim işlem süresi ile gerçek darboğazı ayırmak; kapasite, kuyruk ve boş bekleme işaretlerini birlikte kullanarak ilk inceleme noktasını seçmek.
- **Ders süresi:** 14 dakika
- **Görev süresi:** 15 dakika
- **Görünür bloklar:** Teşhis vakası, ilk tahmin, hesaplama laboratuvarı, kanıt kontrolü, Darboğaz Teşhis Tablosu
- **Karar aracı:** Yok

## Vaka dosyası: Yoğun atölye

Bir promosyon ürünleri atölyesinde baskı, kurutma, kalite kontrol ve paketleme adımları vardır. Gün boyunca herkes meşguldür. Yine de günlük 80 sipariş talebinin tamamı çıkmaz.

İşletme sahibi ilk olarak baskıyı suçlar: “Tek ürün için en uzun süren işlem baskı. Darboğaz kesinlikle orası.”

Kararı görmeden önce tahminini yap:

- ☐ Baskı
- ☐ Kurutma
- ☐ Kalite kontrol
- ☐ Paketleme

İlk tahminim ve dayanağım: ...............................................

## Vaka verileri

İşletmede günde 420 dakika kullanılabilir çalışma süresi vardır.

| Adım | Bir sipariş için süre | Paralel kaynak | Adım önünde bekleyen iş | Gün içindeki gözlem |
|---|---:|---:|---:|---|
| Baskı | 12 dakika | 3 makine | 5 | Makineler zaman zaman iş bekliyor |
| Kurutma | 20 dakika | 4 raf bölmesi | 7 | Bölmelerden biri sık sık boş kalıyor |
| Kalite kontrol | 8 dakika | 1 çalışan | 34 | Gün boyunca kuyruk var |
| Paketleme | 10 dakika | 2 çalışan | 3 | Çalışanlar zaman zaman kalite kontrolü bekliyor |

Sayılar yalnız bu eğitim vakası için oluşturulmuştur.

### Kapasiteyi aynı birimde karşılaştır

Tek bir kaynak için:

**Tek kaynak kapasitesi = kullanılabilir süre ÷ birim işlem süresi**

Aynı işi eşzamanlı yapabilen birden fazla kaynak varsa:

**Tahmini günlük kapasite = kullanılabilir süre × paralel kaynak sayısı ÷ birim işlem süresi**

Küsuratlı sonucu, tamamlanabilen çıktı sayısına göre aşağı yuvarla. Bu hesap; mola, arıza, ürün çeşitliliği ve yeniden işleme gibi etkiler ayrıca hesaba katılmadığında bir ilk tahmindir.

**Baskı:** 420 × 3 ÷ 12 = 105 sipariş/gün

**Kurutma:** 420 × 4 ÷ 20 = 84 sipariş/gün

**Kalite kontrol:** 420 × 1 ÷ 8 = 52,5; tamamlanabilir kapasite yaklaşık 52 sipariş/gün

**Paketleme:** 420 × 2 ÷ 10 = 84 sipariş/gün

| Adım | Tahmini günlük kapasite | Günlük talep | Tahmini kapasite farkı |
|---|---:|---:|---:|
| Baskı | 105 | 80 | +25 |
| Kurutma | 84 | 80 | +4 |
| Kalite kontrol | 52 | 80 | −28 |
| Paketleme | 84 | 80 | +4 |

En düşük kapasite kalite kontroldedir. Baskı bir siparişte 12 dakika, kalite kontrol yalnız 8 dakika sürer. Buna rağmen baskıda üç paralel makine, kalite kontrolde tek çalışan olduğu için sistemin çıktısını kalite kontrol sınırlar.

> En uzun birim işlem süresi otomatik olarak darboğaz değildir.

### Hesabı saha işaretleriyle sına

Kapasite hesabı tek başına kesin teşhis sayılmaz. Saha davranışıyla tutarlı olmalıdır:

- **Sürekli kuyruk:** Adımın önünde düzenli iş birikmesi, gelen işi yetiştiremediğini gösterebilir.
- **Aşağı akışta boş bekleme:** Sonraki adım iş gelmediği için bekliyorsa yukarıdaki kısıt onu yeterince beslemiyor olabilir.
- **Yukarı akışta fazla üretim:** Kısıttan önce daha hızlı üretmek, toplam çıktıyı artırmadan yarı tamamlanmış iş yığabilir.

Vakada kalite kontrol önünde 34 sipariş vardır ve paketleme kalite kontrolü bekler. Baskı makineleri zaman zaman iş beklemekte, bir kurutma bölmesi de boş kalmaktadır. Bu belirtiler kapasite hesabıyla aynı noktayı gösterir.

### Kuyruk ile işlemi ayır

Ürün kalite kontrole 11.00'de hazır olup kontrol 14.30'da başladıysa:

**Kuyruk süresi = işleme başlama zamanı − işin hazır olma zamanı = 3 saat 30 dakika**

Bu, sekiz dakikalık kontrol işleminden farklıdır. Kısa işlem süresi, önündeki uzun kuyruğu saklayabilir.

### İlk tahminin dayandı mı?

- İlk tahminim doğru çıktı mı? ☐ Evet ☐ Hayır
- Tahminimi doğrulayan veya değiştiren veri: .............................

Teşhisin amacı ilk görüşünü savunmak değil, sistemi neyin sınırladığını bulmaktır.

### Gerçek işletmede toplanacak veriler

Birbirini izleyen üç veya dört adım seç. Aynı dönem için şunları kaydet:

- Günlük kullanılabilir süre
- Birim işlem süresi
- Paralel çalışabilen kaynak sayısı
- Tamamlanan günlük çıktı
- Adım önünde bekleyen iş
- Adımın iş beklediği süre
- Arıza, mola, ürün çeşidi veya yeniden işleme gibi olağan dışı etkiler

Standart süre yoksa tek gözlemle kesin sonuç çıkarma. Birkaç gerçek işin süresini ölç; farklı ürün tiplerini birbirine karıştırma.

### İlk inceleme nereye yönelmeli?

Vakada baskı kapasitesini 105'ten 120'ye çıkarmak, kalite kontrolün yaklaşık 52 siparişlik kapasitesini değiştirmez. Yalnızca kalite kontrol önündeki birikmeyi büyütebilir. Bu yüzden ilk inceleme kalite kontrole yönelmelidir.

Bu ders çözüm tasarımını değil, doğru teşhis noktasını seçmeyi hedefler:

> Toplam çıktıyı sınırladığı hem hesapla hem saha gözlemiyle desteklenen adım hangisi?

## Ders sonu uygulama — Darboğaz Teşhis Tablosu

15 dakika içinde birbirini izleyen üç veya dört gerçek işlem adımını seç.

| Adım | Kullanılabilir süre | Birim süre | Paralel kaynak | Tahmini kapasite | Gerçek çıktı | Önündeki kuyruk | Boş bekleme gözlemi |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |

Ardından şu karar kaydını tamamla:

- İlk tahmin ettiğim darboğaz: ..........................................
- En düşük tahmini kapasiteye sahip adım: ...............................
- Hesabı destekleyen kuyruk veya boş bekleme kanıtı: ....................
- İlk inceleme yönelteceğim adım: ........................................
- Henüz bilmediğim ve ölçmem gereken veri: ...............................

Teşhis, yalnız “en yavaş görünüyor” ifadesine değil; aynı dönem ve çıktı biriminde karşılaştırılan kapasiteye ve en az bir saha gözlemine dayanmalıdır.

## Kaynaklar

- [OpenStax — Principles of Managerial Accounting](https://openstax.org/books/principles-managerial-accounting/pages/index)
- [OpenStax — Decisions When Resources Are Constrained](https://openstax.org/books/principles-managerial-accounting/pages/10-6-evaluate-and-determine-how-to-make-decisions-when-resources-are-constrained)
- [ISO — The Process Approach in ISO 9001:2015](https://www.iso.org/iso/iso9001_2015_process_approach.pdf)

Kaynaklar kısıtlı kaynak altında kapasite ve süreç etkileşimini destekler; vaka sayıları LocalAkademi için hazırlanmış varsayımsal eğitim verileridir.
