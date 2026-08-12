# Nakit Yönetimi

Bu dosya "Nakit Yönetimi" kategorisindeki **2** yayınlanmış kursu içerir.

---

## İşletme Sermayesi Yönetimi

**Slug:** `phase-6-05-isletme-sermayesi-yonetimi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

ambalaj üreticisi vakası üzerinden büyüyen siparişlerle birlikte nakit açığının artması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Büyüme için ne kadar ek işletme sermayesi gerekir?
- likidite tamponu
- büyüme finansmanı planı

### 1. Net İşletme Sermayesi Tamponu

*Bilgi nesnesi: `P6-C05-KO1`*

**Problem:** Büyüyen siparişlerle birlikte nakit açığının artması

**Kısa yanıt:** NİS = Dönen varlıklar − Kısa vadeli yükümlülükler

**Özet:** likidite tamponu odağında ambalaj üreticisi için uygulamalı karar nesnesi.

# Net İşletme Sermayesi Tamponu

## ambalaj üreticisi: Karar günlüğü

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. ambalaj üreticisi yönetimi şu durumla karşı karşıya: Büyüyen siparişlerle birlikte nakit açığının artması. Bu bilgi nesnesinin odağı **likidite tamponu** ve cevaplanacak karar şudur: **Büyüme için ne kadar ek işletme sermayesi gerekir?**

## likidite tamponu — İddia

Net İşletme Sermayesi Tamponu, ambalaj üreticisi verisini tek başına bir oran olarak değil, **Büyüme için ne kadar ek işletme sermayesi gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. NİS = Dönen varlıklar − Kısa vadeli yükümlülükler. likidite tamponu sonucu; dönem, para birimi, donenVarlik kaynağı ve ambalaj üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net İşletme Sermayesi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net İşletme Sermayesi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve kvYukumluluk — Deliller

Vaka veri paketi:

- **donenVarlik:** 3900000
- **kvYukumluluk:** 2700000
- **aylikBuyume:** 0.12
- **stokArtisi:** 360000
- **alacakArtisi:** 510000

büyüme finansmanı planı başlamadan önce donenVarlik, kvYukumluluk, aylikBuyume alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ambalaj üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net İşletme Sermayesi modeline girmez.

## NİS — Sayısal deney

1. “Büyüme için ne kadar ek işletme sermayesi gerekir?” sorusuyla ilgisiz alanları ayır; Net İşletme Sermayesi girdilerini eşleştir.
2. likidite tamponu formülünü yaz: **NİS = Dönen varlıklar − Kısa vadeli yükümlülükler**.
3. ambalaj üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. işletme sermayesi su deposu metaforu üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. büyüme finansmanı planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## büyüme finansmanı planı — Karşı görüş

Net İşletme Sermayesi sonucu ambalaj üreticisi için basit bir “iyi/kötü” etiketi değildir. Büyüme için ne kadar ek işletme sermayesi gerekir? sorusunda likidite tamponu, işletme sermayesi su deposu metaforu üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce kvYukumluluk tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüyen siparişlerle birlikte nakit açığının artması problemine ilişkin operasyonel açıklama aranır.

## pozitif NİS’i otomatik yeterli saymak — Kapanış ölçütü

ambalaj üreticisi vakasındaki en tehlikeli hata **pozitif NİS’i otomatik yeterli saymak**. Net İşletme Sermayesi; donenVarlik eksikken, dönemler uyumsuzken veya “Büyüme için ne kadar ek işletme sermayesi gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. likidite tamponu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-05
- Model: [Net İşletme Sermayesi](/app/finance/models/NET_WORKING_CAPITAL)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: büyüme finansmanı planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** pozitif NİS’i otomatik yeterli saymak

**Görev:** büyüme finansmanı planı


### 2. Büyümenin Nakit Bedeli

*Bilgi nesnesi: `P6-C05-KO2`*

**Problem:** Büyüyen siparişlerle birlikte nakit açığının artması

**Kısa yanıt:** Ek ihtiyaç = Alacak artışı + Stok artışı − Ticari borç artışı

**Özet:** büyüme finansmanı odağında ambalaj üreticisi için uygulamalı karar nesnesi.

# Büyümenin Nakit Bedeli

## ambalaj üreticisi: Karar masası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. ambalaj üreticisi yönetimi şu durumla karşı karşıya: Büyüyen siparişlerle birlikte nakit açığının artması. Bu bilgi nesnesinin odağı **büyüme finansmanı** ve cevaplanacak karar şudur: **Büyüme için ne kadar ek işletme sermayesi gerekir?**

## büyüme finansmanı — Kavramı yerleştir

Büyümenin Nakit Bedeli, ambalaj üreticisi verisini tek başına bir oran olarak değil, **Büyüme için ne kadar ek işletme sermayesi gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Ek ihtiyaç = Alacak artışı + Stok artışı − Ticari borç artışı. büyüme finansmanı sonucu; dönem, para birimi, donenVarlik kaynağı ve ambalaj üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net İşletme Sermayesi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net İşletme Sermayesi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve kvYukumluluk — Veriyi hazırla

Vaka veri paketi:

- **donenVarlik:** 3900000
- **kvYukumluluk:** 2700000
- **aylikBuyume:** 0.12
- **stokArtisi:** 360000
- **alacakArtisi:** 510000

büyüme finansmanı planı başlamadan önce donenVarlik, kvYukumluluk, aylikBuyume alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ambalaj üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net İşletme Sermayesi modeline girmez.

## Ek ihtiyaç — Hesabı yürüt

1. “Büyüme için ne kadar ek işletme sermayesi gerekir?” sorusuyla ilgisiz alanları ayır; Net İşletme Sermayesi girdilerini eşleştir.
2. büyüme finansmanı formülünü yaz: **Ek ihtiyaç = Alacak artışı + Stok artışı − Ticari borç artışı**.
3. ambalaj üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. işletme sermayesi su deposu metaforu üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. büyüme finansmanı planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## büyüme finansmanı planı — Sonucu oku

Net İşletme Sermayesi sonucu ambalaj üreticisi için basit bir “iyi/kötü” etiketi değildir. Büyüme için ne kadar ek işletme sermayesi gerekir? sorusunda büyüme finansmanı, işletme sermayesi su deposu metaforu üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce kvYukumluluk tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüyen siparişlerle birlikte nakit açığının artması problemine ilişkin operasyonel açıklama aranır.

## büyüme tahmininde tahsilat gecikmesini atlamak — Sınır çiz

ambalaj üreticisi vakasındaki en tehlikeli hata **büyüme tahmininde tahsilat gecikmesini atlamak**. Net İşletme Sermayesi; donenVarlik eksikken, dönemler uyumsuzken veya “Büyüme için ne kadar ek işletme sermayesi gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. büyüme finansmanı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-05
- Model: [Net İşletme Sermayesi](/app/finance/models/NET_WORKING_CAPITAL)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: büyüme finansmanı planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** büyüme tahmininde tahsilat gecikmesini atlamak

**Görev:** büyüme finansmanı planı


### 3. İşletme Sermayesi Aksiyon Haritası

*Bilgi nesnesi: `P6-C05-KO3`*

**Problem:** Büyüyen siparişlerle birlikte nakit açığının artması

**Kısa yanıt:** NİS / Satış = Net işletme sermayesi / Yıllık satış

**Özet:** alacak-stok-borç müdahaleleri odağında ambalaj üreticisi için uygulamalı karar nesnesi.

# İşletme Sermayesi Aksiyon Haritası

## ambalaj üreticisi: Sahadan sinyal

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. ambalaj üreticisi yönetimi şu durumla karşı karşıya: Büyüyen siparişlerle birlikte nakit açığının artması. Bu bilgi nesnesinin odağı **alacak-stok-borç müdahaleleri** ve cevaplanacak karar şudur: **Büyüme için ne kadar ek işletme sermayesi gerekir?**

## alacak-stok-borç müdahaleleri — Teşhis merceği

İşletme Sermayesi Aksiyon Haritası, ambalaj üreticisi verisini tek başına bir oran olarak değil, **Büyüme için ne kadar ek işletme sermayesi gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. NİS / Satış = Net işletme sermayesi / Yıllık satış. alacak-stok-borç müdahaleleri sonucu; dönem, para birimi, donenVarlik kaynağı ve ambalaj üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net İşletme Sermayesi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net İşletme Sermayesi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve kvYukumluluk — Kanıt paketi

Vaka veri paketi:

- **donenVarlik:** 3900000
- **kvYukumluluk:** 2700000
- **aylikBuyume:** 0.12
- **stokArtisi:** 360000
- **alacakArtisi:** 510000

büyüme finansmanı planı başlamadan önce donenVarlik, kvYukumluluk, aylikBuyume alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ambalaj üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net İşletme Sermayesi modeline girmez.

## NİS / Satış — Adım adım çözüm

1. “Büyüme için ne kadar ek işletme sermayesi gerekir?” sorusuyla ilgisiz alanları ayır; Net İşletme Sermayesi girdilerini eşleştir.
2. alacak-stok-borç müdahaleleri formülünü yaz: **NİS / Satış = Net işletme sermayesi / Yıllık satış**.
3. ambalaj üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. işletme sermayesi su deposu metaforu üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. büyüme finansmanı planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## büyüme finansmanı planı — Karar eşiği

Net İşletme Sermayesi sonucu ambalaj üreticisi için basit bir “iyi/kötü” etiketi değildir. Büyüme için ne kadar ek işletme sermayesi gerekir? sorusunda alacak-stok-borç müdahaleleri, işletme sermayesi su deposu metaforu üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce kvYukumluluk tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüyen siparişlerle birlikte nakit açığının artması problemine ilişkin operasyonel açıklama aranır.

## tedarikçiyi tek finansman kaynağı görmek — Yanılma payı

ambalaj üreticisi vakasındaki en tehlikeli hata **tedarikçiyi tek finansman kaynağı görmek**. Net İşletme Sermayesi; donenVarlik eksikken, dönemler uyumsuzken veya “Büyüme için ne kadar ek işletme sermayesi gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. alacak-stok-borç müdahaleleri çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-05
- Model: [Net İşletme Sermayesi](/app/finance/models/NET_WORKING_CAPITAL)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: büyüme finansmanı planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** tedarikçiyi tek finansman kaynağı görmek

**Görev:** büyüme finansmanı planı


---

## Nakit Dönüşüm Döngüsü

**Slug:** `phase-6-06-nakit-donusum-dongusu` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

organik gıda dağıtıcısı vakası üzerinden ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?
- nakdin zaman çizgisi
- 10 günlük nakit serbestleştirme planı

### 1. Bir Liranın Operasyondaki Yolculuğu

*Bilgi nesnesi: `P6-C06-KO1`*

**Problem:** Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi

**Kısa yanıt:** CCC = DIO + DSO − DPO

**Özet:** nakdin zaman çizgisi odağında organik gıda dağıtıcısı için uygulamalı karar nesnesi.

# Bir Liranın Operasyondaki Yolculuğu

## organik gıda dağıtıcısı: Karar masası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. organik gıda dağıtıcısı yönetimi şu durumla karşı karşıya: Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi. Bu bilgi nesnesinin odağı **nakdin zaman çizgisi** ve cevaplanacak karar şudur: **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?**

## nakdin zaman çizgisi — Kavramı yerleştir

Bir Liranın Operasyondaki Yolculuğu, organik gıda dağıtıcısı verisini tek başına bir oran olarak değil, **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. CCC = DIO + DSO − DPO. nakdin zaman çizgisi sonucu; dönem, para birimi, dio kaynağı ve organik gıda dağıtıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dönüşüm Döngüsü:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Nakit Dönüşüm Süresi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## dio ve dso — Veriyi hazırla

Vaka veri paketi:

- **dio:** 46
- **dso:** 39
- **dpo:** 11
- **gunlukMaliyet:** 82000

10 günlük nakit serbestleştirme planı başlamadan önce dio, dso, dpo alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. organik gıda dağıtıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dönüşüm Döngüsü modeline girmez.

## CCC — Hesabı yürüt

1. “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” sorusuyla ilgisiz alanları ayır; Nakit Dönüşüm Döngüsü girdilerini eşleştir.
2. nakdin zaman çizgisi formülünü yaz: **CCC = DIO + DSO − DPO**.
3. organik gıda dağıtıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı dio verisiyle karşılaştır.
4. siparişten tahsilata zaman çizgisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 10 günlük nakit serbestleştirme planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 10 günlük nakit serbestleştirme planı — Sonucu oku

Nakit Dönüşüm Döngüsü sonucu organik gıda dağıtıcısı için basit bir “iyi/kötü” etiketi değildir. Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli? sorusunda nakdin zaman çizgisi, siparişten tahsilata zaman çizgisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce dso tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi problemine ilişkin operasyonel açıklama aranır.

## negatif CCC’yi her işte hedeflemek — Sınır çiz

organik gıda dağıtıcısı vakasındaki en tehlikeli hata **negatif CCC’yi her işte hedeflemek**. Nakit Dönüşüm Döngüsü; dio eksikken, dönemler uyumsuzken veya “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. nakdin zaman çizgisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-06
- Model: [Nakit Dönüşüm Döngüsü](/app/finance/models/CASH_CONVERSION_CYCLE)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 10 günlük nakit serbestleştirme planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** negatif CCC’yi her işte hedeflemek

**Görev:** 10 günlük nakit serbestleştirme planı


### 2. CCC Sürücü Köprüsü

*Bilgi nesnesi: `P6-C06-KO2`*

**Problem:** Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi

**Kısa yanıt:** Bağlı nakit ≈ CCC × Günlük maliyet

**Özet:** gün bazlı sürücü ayrıştırması odağında organik gıda dağıtıcısı için uygulamalı karar nesnesi.

# CCC Sürücü Köprüsü

## organik gıda dağıtıcısı: Sahadan sinyal

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. organik gıda dağıtıcısı yönetimi şu durumla karşı karşıya: Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi. Bu bilgi nesnesinin odağı **gün bazlı sürücü ayrıştırması** ve cevaplanacak karar şudur: **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?**

## gün bazlı sürücü ayrıştırması — Teşhis merceği

CCC Sürücü Köprüsü, organik gıda dağıtıcısı verisini tek başına bir oran olarak değil, **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Bağlı nakit ≈ CCC × Günlük maliyet. gün bazlı sürücü ayrıştırması sonucu; dönem, para birimi, dio kaynağı ve organik gıda dağıtıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dönüşüm Döngüsü:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Nakit Dönüşüm Süresi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## dio ve dso — Kanıt paketi

Vaka veri paketi:

- **dio:** 46
- **dso:** 39
- **dpo:** 11
- **gunlukMaliyet:** 82000

10 günlük nakit serbestleştirme planı başlamadan önce dio, dso, dpo alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. organik gıda dağıtıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dönüşüm Döngüsü modeline girmez.

## Bağlı nakit ≈ CCC × Günlük maliyet — Adım adım çözüm

1. “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” sorusuyla ilgisiz alanları ayır; Nakit Dönüşüm Döngüsü girdilerini eşleştir.
2. gün bazlı sürücü ayrıştırması formülünü yaz: **Bağlı nakit ≈ CCC × Günlük maliyet**.
3. organik gıda dağıtıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı dio verisiyle karşılaştır.
4. siparişten tahsilata zaman çizgisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 10 günlük nakit serbestleştirme planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 10 günlük nakit serbestleştirme planı — Karar eşiği

Nakit Dönüşüm Döngüsü sonucu organik gıda dağıtıcısı için basit bir “iyi/kötü” etiketi değildir. Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli? sorusunda gün bazlı sürücü ayrıştırması, siparişten tahsilata zaman çizgisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce dso tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi problemine ilişkin operasyonel açıklama aranır.

## gün hesaplarında dönem uyumsuzluğu — Yanılma payı

organik gıda dağıtıcısı vakasındaki en tehlikeli hata **gün hesaplarında dönem uyumsuzluğu**. Nakit Dönüşüm Döngüsü; dio eksikken, dönemler uyumsuzken veya “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. gün bazlı sürücü ayrıştırması çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-06
- Model: [Nakit Dönüşüm Döngüsü](/app/finance/models/CASH_CONVERSION_CYCLE)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 10 günlük nakit serbestleştirme planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** gün hesaplarında dönem uyumsuzluğu

**Görev:** 10 günlük nakit serbestleştirme planı


### 3. Döngüyü Kısaltan Kontrollü Deneyler

*Bilgi nesnesi: `P6-C06-KO3`*

**Problem:** Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi

**Kısa yanıt:** Serbestleşen nakit ≈ Gün azalması × Günlük maliyet

**Özet:** operasyon deneyi tasarımı odağında organik gıda dağıtıcısı için uygulamalı karar nesnesi.

# Döngüyü Kısaltan Kontrollü Deneyler

## organik gıda dağıtıcısı: Yönetim sorusu

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. organik gıda dağıtıcısı yönetimi şu durumla karşı karşıya: Ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi. Bu bilgi nesnesinin odağı **operasyon deneyi tasarımı** ve cevaplanacak karar şudur: **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?**

## operasyon deneyi tasarımı — Harita

Döngüyü Kısaltan Kontrollü Deneyler, organik gıda dağıtıcısı verisini tek başına bir oran olarak değil, **Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Serbestleşen nakit ≈ Gün azalması × Günlük maliyet. operasyon deneyi tasarımı sonucu; dönem, para birimi, dio kaynağı ve organik gıda dağıtıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dönüşüm Döngüsü:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Nakit Dönüşüm Süresi. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## dio ve dso — Ölçüm protokolü

Vaka veri paketi:

- **dio:** 46
- **dso:** 39
- **dpo:** 11
- **gunlukMaliyet:** 82000

10 günlük nakit serbestleştirme planı başlamadan önce dio, dso, dpo alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. organik gıda dağıtıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dönüşüm Döngüsü modeline girmez.

## Serbestleşen nakit ≈ Gün azalması × Günlük maliyet — Uygulama

1. “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” sorusuyla ilgisiz alanları ayır; Nakit Dönüşüm Döngüsü girdilerini eşleştir.
2. operasyon deneyi tasarımı formülünü yaz: **Serbestleşen nakit ≈ Gün azalması × Günlük maliyet**.
3. organik gıda dağıtıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı dio verisiyle karşılaştır.
4. siparişten tahsilata zaman çizgisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 10 günlük nakit serbestleştirme planı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 10 günlük nakit serbestleştirme planı — Gösterge paneli

Nakit Dönüşüm Döngüsü sonucu organik gıda dağıtıcısı için basit bir “iyi/kötü” etiketi değildir. Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli? sorusunda operasyon deneyi tasarımı, siparişten tahsilata zaman çizgisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce dso tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürünlerin depoya girişinden müşteri tahsilatına kadar 74 gün geçmesi problemine ilişkin operasyonel açıklama aranır.

## vade uzatırken tedarik riskini yok saymak — Etik fren

organik gıda dağıtıcısı vakasındaki en tehlikeli hata **vade uzatırken tedarik riskini yok saymak**. Nakit Dönüşüm Döngüsü; dio eksikken, dönemler uyumsuzken veya “Önce stok, tahsilat veya tedarikçi vadesinden hangisine müdahale edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. operasyon deneyi tasarımı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-06
- Model: [Nakit Dönüşüm Döngüsü](/app/finance/models/CASH_CONVERSION_CYCLE)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 10 günlük nakit serbestleştirme planı

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** vade uzatırken tedarik riskini yok saymak

**Görev:** 10 günlük nakit serbestleştirme planı


---
