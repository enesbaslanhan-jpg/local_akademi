# KO 789 — Tedarikçi Performans Kartı

## Metadata

- **Başlık:** En Ucuz Tedarikçi Gerçekten En İyi Seçim mi?
- **Özet:** Üç tedarikçiyi fiyat dışında teslimat, kalite ve iletişim kayıtlarıyla karşılaştır. Ham veriyi ortak bir puan ölçeğine çevir; ağırlıkları işletmenin önceliğine göre açıkça belirle. Sonuçta puanın arkasındaki veriyi ve tek kaynak riskini birlikte gösteren bir Tedarikçi Performans Kartı oluştur.
- **Öğrenme çıktıları:** Tedarikçi ölçütlerini ham kayıtlardan hesaplamak; puan ile ham veri arasındaki bağı görünür tutmak; ağırlıklı puanlamayı sade bir yönetim yöntemi olarak uygulamak ve varsayımlarını açıklamak; tek kaynağa bağlı kalma riskini karar notuna eklemek.
- **Ders süresi:** 14 dakika
- **Görev süresi:** 15 dakika
- **Görünür bloklar:** Teklif vakası, ham veri masası, puanlama laboratuvarı, ağırlık seçimi, Tedarikçi Performans Kartı
- **Karar aracı:** Yok

## Vaka: Üç kutu tedarikçisi

Bir sabun üreticisi aynı karton kutuyu üç tedarikçiden alabilir:

- **A Tedarikçisi** en düşük birim fiyatı verir.
- **B Tedarikçisi** biraz daha pahalıdır, fakat teslimatları düzenlidir.
- **C Tedarikçisi** hızlı cevap verir; son iki partide ezilmiş kutular görülmüştür.

Yalnız fiyat listesini karşılaştırırsan A açık ara önde görünür. Fakat geç teslimat üretimi durduruyor, kusurlu kutu yeniden paketleme yaratıyor ve yanıtsız kalan sorunlar çözümü geciktiriyorsa gerçek karar tek bir fiyat sütununa sığmaz.

## Önce ham veriyi kur

Puanlamadan önce aynı dönem ve aynı ürün grubu için kayıtları yan yana koy. Aşağıdaki vaka verileri varsayımsaldır:

| Ölçüt | A | B | C |
|---|---:|---:|---:|
| Birim fiyat | 8,00 TL | 8,60 TL | 8,30 TL |
| Zamanında gelen teslimat | 7 / 10 | 9 / 10 | 8 / 10 |
| Kabul edilen kusursuz kutu | 940 / 1.000 | 985 / 1.000 | 955 / 1.000 |
| Sorun bildirimine ortalama ilk yanıt | 30 saat | 8 saat | 3 saat |
| İncelenen sipariş sayısı | 10 | 10 | 10 |

Ham tablo iki nedenle zorunludur. Birincisi, puanın nasıl oluştuğunu yeniden kurabilirsin. İkincisi, 10 üzerinden 8 puan alan iki tedarikçinin gerçekte aynı olup olmadığını görebilirsin. Biri zamanında teslimatta, diğeri iletişimde güçlü olabilir.

Kendi işletmende kullanabileceğin temel kayıtlar:

- Satın alma siparişi ve teslim tarihi
- Gelen miktar ve kabul edilen miktar
- Kusur, iade veya yeniden işleme kaydı
- Fatura ve birim fiyat
- Sorun bildirimi ile ilk anlamlı yanıtın zamanı

Veri yoksa puan uydurma. “Ölçülmedi” yaz ve önce kısa bir kayıt dönemi başlat.

## Ölçütleri açık tanımla

**Zamanında teslimat oranı = söz verilen tarihte veya önce gelen teslimat sayısı ÷ toplam teslimat sayısı × 100**

**Kusursuz kabul oranı = ilk kontrolde kabul edilen birim sayısı ÷ kontrol edilen toplam birim sayısı × 100**

**İlk yanıt süresi = sorun bildirimi ile tedarikçinin ilk anlamlı yanıtı arasındaki süre**

“Hızlı cevap” gibi belirsiz ifadeler yerine hangi iki zaman damgasının karşılaştırıldığını yaz. Birim fiyatı da aynı ürün özelliği, sipariş miktarı, teslim şekli ve vergi yaklaşımıyla karşılaştır.

## Ham veriyi puana çevir

Puanlama, farklı birimleri tek tabloda karşılaştırmak için kullanılan sade bir yönetim yöntemidir; evrensel bir standart veya nesnel gerçeğin kendisi değildir. Eşikler, dönem ve ağırlıklar değişirse sonuç da değişebilir.

Bu vaka için örnek 1–5 ölçeği:

| Ölçüt | 5 puan | 4 puan | 3 puan | 2 puan | 1 puan |
|---|---|---|---|---|---|
| Fiyat | En düşük fiyat | En düşüğün en fazla %5 üstü | %5–10 üstü | %10–15 üstü | %15'ten fazla üstü |
| Zamanında teslimat | %95–100 | %90–94 | %80–89 | %70–79 | %70 altı |
| Kusursuz kabul | %99–100 | %97–98,9 | %95–96,9 | %90–94,9 | %90 altı |
| İlk yanıt süresi | 4 saat veya az | 5–8 saat | 9–24 saat | 25–48 saat | 48 saatten fazla |

Bu eşikler eğitim örneğidir. İşletmenin ürün, sipariş sıklığı ve hata etkisine göre kendi eşiklerini karar öncesinde belirlemesi gerekir. Sonucu gördükten sonra eşik değiştirmek karşılaştırmayı taraflı hâle getirir.

Örnek ham veriden çıkan puanlar:

| Ölçüt | A | B | C |
|---|---:|---:|---:|
| Fiyat puanı | 5 | 2 | 4 |
| Teslimat puanı | 2 | 3 | 3 |
| Kalite puanı | 2 | 4 | 3 |
| İletişim puanı | 2 | 4 | 5 |

Her puanın yanında ham değeri göstermeye devam et. “Kalite: 4 puan” yerine “985 / 1.000 kusursuz kabul, 4 puan” yaz.

## Ağırlığı iş önceliğine bağla

Her ölçüte eşit önem vermek zorunda değilsin. Üretim duruşu pahalıysa teslimat; müşteri şikâyeti yüksekse kalite daha ağır basabilir.

Vaka için örnek ağırlıklar:

- Fiyat: %20
- Zamanında teslimat: %30
- Kusursuz kabul: %35
- İletişim: %15

Toplam %100 olmalıdır.

**Ağırlıklı toplam puan = her ölçütün puanı × ağırlığı; sonra bu katkıların toplamı**

| Tedarikçi | Fiyat katkısı | Teslimat katkısı | Kalite katkısı | İletişim katkısı | Ağırlıklı toplam |
|---|---:|---:|---:|---:|---:|
| A | 5 × 0,20 = 1,00 | 2 × 0,30 = 0,60 | 2 × 0,35 = 0,70 | 2 × 0,15 = 0,30 | **2,60** |
| B | 2 × 0,20 = 0,40 | 3 × 0,30 = 0,90 | 4 × 0,35 = 1,40 | 4 × 0,15 = 0,60 | **3,30** |
| C | 4 × 0,20 = 0,80 | 3 × 0,30 = 0,90 | 3 × 0,35 = 1,05 | 5 × 0,15 = 0,75 | **3,50** |

Bu örnekte C en yüksek toplam puanı alır; B ise yakın sonuçla daha güçlü kalite verisine sahiptir. Karar yalnız 3,50 sayısını okumak değildir. C'nin son partilerindeki ezilme kaydı ayrıca incelenmeli, verinin kaç siparişe dayandığı görülmeli ve kalite ağırlığı arttığında sıralamanın değişip değişmediği kontrol edilmelidir.

## Tek kaynak riski uyarısı

En yüksek puanlı tedarikçiye bütün alımı vermek her zaman güvenli değildir. Alternatif tedarikçi yoksa gecikme, kapasite sorunu, doğal afet, finansal sıkıntı veya kalite problemi bütün akışı durdurabilir. Kartın karar notunda şu soruyu bırak:

> Bu tedarikçi çalışamazsa kabul edilebilir başka bir kaynak veya geçiş planımız var mı?

Bu ders tek kaynak riskini sayısal bir formüle dönüştürmez. Risk; alternatifin varlığı, geçiş süresi, kritik malzeme ve eldeki stokla birlikte yönetim değerlendirmesi olarak kaydedilir.

## Ders sonu uygulama — Tedarikçi Performans Kartı

Aynı ürün veya hizmet için en az iki tedarikçiyi, aynı inceleme döneminde karşılaştır.

### Ham veri ve puan bağı

| Ölçüt | Ağırlık | Tedarikçi 1 ham veri | Puan | Tedarikçi 2 ham veri | Puan | Tedarikçi 3 ham veri | Puan |
|---|---:|---|---:|---|---:|---|---:|
| Fiyat |  |  |  |  |  |  |  |
| Zamanında teslimat |  |  |  |  |  |  |  |
| Kusursuz kabul |  |  |  |  |  |  |  |
| İletişim |  |  |  |  |  |  |  |

### Karar kaydı

- İnceleme dönemi ve sipariş sayısı: .......................................
- Puan ölçeğim ve eşiklerimin dayanağı: ....................................
- Ağırlıkların toplamı: .....................................................
- En yüksek ağırlıklı puan ve tedarikçi: ...................................
- Puanın arkasındaki en güçlü ham veri: ....................................
- Kararı değiştirebilecek veri boşluğu: ....................................
- Tek kaynak riski uyarısı ve alternatif plan: .............................
- Kararım: ☐ Devam et ☐ İyileştirme iste ☐ Deneme siparişi ver ☐ Alternatifi artır
- Gerekçe: ...................................................................

Kartın geçerli sayılması için her puan ham değere bağlanmalı, ağırlıklar sonuç hesaplanmadan önce belirlenmeli ve veri dönemi açık olmalıdır.

## Kaynaklar

- [ISO — ISO 9001 Explained](https://www.iso.org/home/insights-news/resources/iso-9001-explained.html)
- [ISO — Quality Management Principles](https://www.iso.org/quality-management/principles)
- [ISO — ISO 20400 Sustainable Procurement](https://www.iso.org/standard/63026.html)

Kaynaklar dış sağlayıcıların performans ve uygunluk bakımından izlenmesi ile tedarik kararlarının işletme bağlamında yönetilmesini destekler. Buradaki 1–5 ölçeği, eşikler ve ağırlıklar LocalAkademi'nin sade eğitim örneğidir; ISO tarafından verilmiş bir puanlama modeli değildir.
