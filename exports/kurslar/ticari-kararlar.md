# Ticari Kararlar

Bu dosya "Ticari Kararlar" kategorisindeki **1** yayınlanmış kursu içerir.

---

## Fiyatlandırma ve Marj Simülasyonu

**Slug:** `phase-6-13-fiyatlandirma-ve-marj-simulasyonu` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

B2B temizlik ürünleri üreticisi vakası üzerinden hammadde zammını müşteriye yansıtırken hacim kaybı riski problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Tek fiyat mı, müşteri segmentine göre fiyat mı?
- fiyat alt ve üst sınırı
- üç fiyat senaryosu savunması

### 1. Maliyetten Değere Fiyat Koridoru

*Bilgi nesnesi: `P6-C13-KO1`*

**Problem:** Hammadde zammını müşteriye yansıtırken hacim kaybı riski

**Kısa yanıt:** Taban fiyat = İlgili maliyet / (1 − Hedef marj)

**Özet:** fiyat alt ve üst sınırı odağında B2B temizlik ürünleri üreticisi için uygulamalı karar nesnesi.

# Maliyetten Değere Fiyat Koridoru

## B2B temizlik ürünleri üreticisi: Sahadan sinyal

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. B2B temizlik ürünleri üreticisi yönetimi şu durumla karşı karşıya: Hammadde zammını müşteriye yansıtırken hacim kaybı riski. Bu bilgi nesnesinin odağı **fiyat alt ve üst sınırı** ve cevaplanacak karar şudur: **Tek fiyat mı, müşteri segmentine göre fiyat mı?**

## fiyat alt ve üst sınırı — Teşhis merceği

Maliyetten Değere Fiyat Koridoru, B2B temizlik ürünleri üreticisi verisini tek başına bir oran olarak değil, **Tek fiyat mı, müşteri segmentine göre fiyat mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Taban fiyat = İlgili maliyet / (1 − Hedef marj). fiyat alt ve üst sınırı sonucu; dönem, para birimi, mevcutFiyat kaynağı ve B2B temizlik ürünleri üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutFiyat ve birimMaliyet — Kanıt paketi

Vaka veri paketi:

- **mevcutFiyat:** 1240
- **birimMaliyet:** 760
- **maliyetZammi:** 0.14
- **hacim:** 4200
- **tahminiEsneklik:** -1.3

üç fiyat senaryosu savunması başlamadan önce mevcutFiyat, birimMaliyet, maliyetZammi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. B2B temizlik ürünleri üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Taban fiyat — Adım adım çözüm

1. “Tek fiyat mı, müşteri segmentine göre fiyat mı?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. fiyat alt ve üst sınırı formülünü yaz: **Taban fiyat = İlgili maliyet / (1 − Hedef marj)**.
3. B2B temizlik ürünleri üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutFiyat verisiyle karşılaştır.
4. fiyat–hacim–katkı yüzeyi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç fiyat senaryosu savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç fiyat senaryosu savunması — Karar eşiği

Katkı Payı sonucu B2B temizlik ürünleri üreticisi için basit bir “iyi/kötü” etiketi değildir. Tek fiyat mı, müşteri segmentine göre fiyat mı? sorusunda fiyat alt ve üst sınırı, fiyat–hacim–katkı yüzeyi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce birimMaliyet tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra hammadde zammını müşteriye yansıtırken hacim kaybı riski problemine ilişkin operasyonel açıklama aranır.

## maliyet artışını aynı oranda fiyata eklemek — Yanılma payı

B2B temizlik ürünleri üreticisi vakasındaki en tehlikeli hata **maliyet artışını aynı oranda fiyata eklemek**. Katkı Payı; mevcutFiyat eksikken, dönemler uyumsuzken veya “Tek fiyat mı, müşteri segmentine göre fiyat mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. fiyat alt ve üst sınırı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-13
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç fiyat senaryosu savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** maliyet artışını aynı oranda fiyata eklemek

**Görev:** üç fiyat senaryosu savunması


### 2. Marj–Hacim Ödünleşimi

*Bilgi nesnesi: `P6-C13-KO2`*

**Problem:** Hammadde zammını müşteriye yansıtırken hacim kaybı riski

**Kısa yanıt:** Toplam katkı = Yeni birim katkı × Yeni hacim

**Özet:** talep tepkili katkı simülasyonu odağında B2B temizlik ürünleri üreticisi için uygulamalı karar nesnesi.

# Marj–Hacim Ödünleşimi

## B2B temizlik ürünleri üreticisi: Yönetim sorusu

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. B2B temizlik ürünleri üreticisi yönetimi şu durumla karşı karşıya: Hammadde zammını müşteriye yansıtırken hacim kaybı riski. Bu bilgi nesnesinin odağı **talep tepkili katkı simülasyonu** ve cevaplanacak karar şudur: **Tek fiyat mı, müşteri segmentine göre fiyat mı?**

## talep tepkili katkı simülasyonu — Harita

Marj–Hacim Ödünleşimi, B2B temizlik ürünleri üreticisi verisini tek başına bir oran olarak değil, **Tek fiyat mı, müşteri segmentine göre fiyat mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Toplam katkı = Yeni birim katkı × Yeni hacim. talep tepkili katkı simülasyonu sonucu; dönem, para birimi, mevcutFiyat kaynağı ve B2B temizlik ürünleri üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Sipariş Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Sipariş Katkısı, Sipariş Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutFiyat ve birimMaliyet — Ölçüm protokolü

Vaka veri paketi:

- **mevcutFiyat:** 1240
- **birimMaliyet:** 760
- **maliyetZammi:** 0.14
- **hacim:** 4200
- **tahminiEsneklik:** -1.3

üç fiyat senaryosu savunması başlamadan önce mevcutFiyat, birimMaliyet, maliyetZammi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. B2B temizlik ürünleri üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Sipariş Kârlılığı modeline girmez.

## Toplam katkı — Uygulama

1. “Tek fiyat mı, müşteri segmentine göre fiyat mı?” sorusuyla ilgisiz alanları ayır; Sipariş Kârlılığı girdilerini eşleştir.
2. talep tepkili katkı simülasyonu formülünü yaz: **Toplam katkı = Yeni birim katkı × Yeni hacim**.
3. B2B temizlik ürünleri üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutFiyat verisiyle karşılaştır.
4. fiyat–hacim–katkı yüzeyi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç fiyat senaryosu savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç fiyat senaryosu savunması — Gösterge paneli

Sipariş Kârlılığı sonucu B2B temizlik ürünleri üreticisi için basit bir “iyi/kötü” etiketi değildir. Tek fiyat mı, müşteri segmentine göre fiyat mı? sorusunda talep tepkili katkı simülasyonu, fiyat–hacim–katkı yüzeyi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce birimMaliyet tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra hammadde zammını müşteriye yansıtırken hacim kaybı riski problemine ilişkin operasyonel açıklama aranır.

## hacmi sabit varsaymak — Etik fren

B2B temizlik ürünleri üreticisi vakasındaki en tehlikeli hata **hacmi sabit varsaymak**. Sipariş Kârlılığı; mevcutFiyat eksikken, dönemler uyumsuzken veya “Tek fiyat mı, müşteri segmentine göre fiyat mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. talep tepkili katkı simülasyonu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-13
- Model: [Sipariş Kârlılığı](/app/finance/models/ORDER_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç fiyat senaryosu savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** hacmi sabit varsaymak

**Görev:** üç fiyat senaryosu savunması


### 3. İskonto Yetki Matrisi

*Bilgi nesnesi: `P6-C13-KO3`*

**Problem:** Hammadde zammını müşteriye yansıtırken hacim kaybı riski

**Kısa yanıt:** İskonto maliyeti = Liste katkısı − İskontolu katkı

**Özet:** kontrollü iskonto yönetişimi odağında B2B temizlik ürünleri üreticisi için uygulamalı karar nesnesi.

# İskonto Yetki Matrisi

## B2B temizlik ürünleri üreticisi: Vaka açılışı

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. B2B temizlik ürünleri üreticisi yönetimi şu durumla karşı karşıya: Hammadde zammını müşteriye yansıtırken hacim kaybı riski. Bu bilgi nesnesinin odağı **kontrollü iskonto yönetişimi** ve cevaplanacak karar şudur: **Tek fiyat mı, müşteri segmentine göre fiyat mı?**

## kontrollü iskonto yönetişimi — Mekanik

İskonto Yetki Matrisi, B2B temizlik ürünleri üreticisi verisini tek başına bir oran olarak değil, **Tek fiyat mı, müşteri segmentine göre fiyat mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. İskonto maliyeti = Liste katkısı − İskontolu katkı. kontrollü iskonto yönetişimi sonucu; dönem, para birimi, mevcutFiyat kaynağı ve B2B temizlik ürünleri üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutFiyat ve birimMaliyet — Girdi kontrolü

Vaka veri paketi:

- **mevcutFiyat:** 1240
- **birimMaliyet:** 760
- **maliyetZammi:** 0.14
- **hacim:** 4200
- **tahminiEsneklik:** -1.3

üç fiyat senaryosu savunması başlamadan önce mevcutFiyat, birimMaliyet, maliyetZammi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. B2B temizlik ürünleri üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## İskonto maliyeti — Çalışma notu

1. “Tek fiyat mı, müşteri segmentine göre fiyat mı?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. kontrollü iskonto yönetişimi formülünü yaz: **İskonto maliyeti = Liste katkısı − İskontolu katkı**.
3. B2B temizlik ürünleri üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutFiyat verisiyle karşılaştır.
4. fiyat–hacim–katkı yüzeyi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç fiyat senaryosu savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç fiyat senaryosu savunması — Tartışma

Katkı Payı sonucu B2B temizlik ürünleri üreticisi için basit bir “iyi/kötü” etiketi değildir. Tek fiyat mı, müşteri segmentine göre fiyat mı? sorusunda kontrollü iskonto yönetişimi, fiyat–hacim–katkı yüzeyi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce birimMaliyet tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra hammadde zammını müşteriye yansıtırken hacim kaybı riski problemine ilişkin operasyonel açıklama aranır.

## iskontoyu onaysız ve süresiz vermek — Ne zaman kullanma?

B2B temizlik ürünleri üreticisi vakasındaki en tehlikeli hata **iskontoyu onaysız ve süresiz vermek**. Katkı Payı; mevcutFiyat eksikken, dönemler uyumsuzken veya “Tek fiyat mı, müşteri segmentine göre fiyat mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kontrollü iskonto yönetişimi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-13
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç fiyat senaryosu savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** iskontoyu onaysız ve süresiz vermek

**Görev:** üç fiyat senaryosu savunması


---
