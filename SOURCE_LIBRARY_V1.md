# LocalAkademi Kaynak Kütüphanesi V1

Kontrol tarihi: 21 Temmuz 2026

## Sonuç

İlk güvenilir kaynak tabanı hazırlandı. Kütüphane 26 doğrulanmış kaynaktan oluşur: 22 yüksek otoriteli resmî/kurumsal kaynak ve 4 konu sahibinin teknik dokümanı. Kaynaklar vergi-hukuk, finans, girişimcilik, e-ticaret, pazarlama, dijital olgunluk, veri, siber güvenlik ve yapay zekâ alanlarını kapsar.

Mevcut veritabanında 600 demo içerik parçası bulunmasına rağmen gerçek, kodlu KO sayısı 5'tir. Bu nedenle demo içerikler yayımlanmış eğitim içeriği kabul edilmedi. Kütüphane yalnızca 5 gerçek dijital KO'ya otomatik bağlanır; kalan başlıklar yeni profesyonel KO'lar hazırlanırken kullanılacaktır.

## Güvenlik ve kalite kuralları

- Hukuk, vergi, SGK ve destek programları 30 günde bir; ürün/platform dokümanları 90 günde bir; kalıcı standart ve eğitim dokümanları 180 günde bir yeniden kontrol edilir.
- Vergi oranı, parasal sınır, başvuru tarihi, komisyon oranı veya mevzuat süresi gibi değişken değerler, cevap üretilen gün resmî kaynaktan yeniden doğrulanmadan kesin ifade edilmez.
- `high`: kamu kurumu, düzenleyici kurum, uluslararası standart kuruluşu veya hükûmetler arası kuruluş.
- `medium`: anlatılan ürün veya platformun kendi teknik dokümanı. Tek başına tarafsız karşılaştırma kaynağı sayılmaz.
- Kaynak eklenmiş olması KO'nun otomatik yayımlanacağı anlamına gelmez. Hukuk/vergi/kişisel veri konuları profesyonel onay kapısından geçmelidir.

## Kaynak grupları

| Alan | Ana kaynaklar | Durum |
|---|---|---|
| Finans ve maliyet | KGK TFRS 2026, KGK BOBİ FRS, FDIC/SBA Money Smart, SBA başabaş rehberi | Temel kavramlar için hazır |
| Vergi ve e-belge | GİB kurumlar vergisi, e-Fatura, e-Defter | Değişken değerlerde yayın günü kontrolü zorunlu |
| Tüketici ve e-ticaret hukuku | Ticaret Bakanlığı mesafeli sözleşmeler ve e-ticaret mevzuatı | Profesyonel onay zorunlu |
| KVKK ve çalışan yükümlülükleri | KVKK aydınlatma rehberi/tebliği, SGK işveren yükümlülükleri | Profesyonel onay zorunlu |
| Girişimcilik | KOSGEB Girişimcilik El Kitabı ve destek programı | Genel eğitim hazır; destek tutarları değişken |
| E-ticaret operasyonu | Ticaret Bakanlığı E-Ticaret Akademisi | Genel süreç hazır; platform oranları eksik |
| Pazarlama ölçümü | Google Ads ROI/dönüşüm dokümanları, Mailchimp sepet rehberi | Ürün dokümanı olduğu açıkça belirtilmeli |
| Dijital olgunluk ve veri | Avrupa Komisyonu EDIH DMA aracı ve anketi | 3 gerçek KO'ya bağlanabilir |
| Siber güvenlik | ENISA, NIST CSF 2.0, ISO/IEC 27001 | Siber güvenlik KO'suna bağlanabilir |
| KOBİ'lerde yapay zekâ | OECD dijital dönüşüm ve KOBİ AI benimseme raporları | AI KO'suna bağlanabilir |

## Dosyalar ve kullanım

- `SOURCE_LIBRARY_V1.json`: makine tarafından okunabilir kaynak kayıtları, kapsama başlıkları ve gerçek KO bağlantıları.
- `KO_SOURCE_MATRIX_V1.md`: mevcut 120 demo başlık grubunun kaynak kapsama ve eksik durumları.
- `scripts/import-source-library.ts`: idempotent içe aktarma. Hiçbir kaynağı veya KO'yu silmez, KO durumunu değiştirmez.

Önce değişiklik yapmayan kontrol:

```powershell
npm.cmd run sources:import
```

Doğrulanan kaynakları veritabanına eklemek ve 5 gerçek KO'ya bağlantıları kurmak için:

```powershell
npm.cmd run sources:import -- --apply
```

## Bilinen açıklar

Şu konular V1'de “kaynak bulundu” sayılmaz ve kesin içerik yayımlanmamalıdır:

- Güncel KDV oranları ve gerçek kişi gelir vergisi uygulaması.
- Trendyol, Hepsiburada, Amazon Türkiye gibi pazar yerlerinin güncel komisyon, kampanya ve kargo şartları.
- Kargo firmalarının güncel desi, fiyat, hasar ve ekspres teslimat koşulları.
- Meta Ads, TikTok, Instagram ve LinkedIn'e özgü güncel ürün işleyişi.
- Lisanslama, franchising, ortaklık ve çıkış stratejisinin Türkiye'ye özgü hukuki ayrıntıları.
- Garanti süresi ve ürün kategorisine göre satış sonrası hizmet yükümlülükleri.

Bu açıklar, ilgili resmî veya birinci taraf belge doğrulanmadan örnek blog yazılarıyla kapatılmamalıdır.
