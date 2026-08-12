# Planlama

Bu dosya "Planlama" kategorisindeki **2** yayınlanmış kursu içerir.

---

## Sürücü Tabanlı Finansal Tahmin

**Slug:** `phase-6-19-surucu-tabanli-finansal-tahmin` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

çok şubeli kahve zinciri vakası üzerinden geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?
- adet-fiyat-dönüşüm sürücüleri
- 12 aylık şube tahmini

### 1. Ciroyu İş Sürücülerine Ayırmak

*Bilgi nesnesi: `P6-C19-KO1`*

**Problem:** Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması

**Kısa yanıt:** Ciro = İşlem adedi × Ortalama sepet

**Özet:** adet-fiyat-dönüşüm sürücüleri odağında çok şubeli kahve zinciri için uygulamalı karar nesnesi.

# Ciroyu İş Sürücülerine Ayırmak

## çok şubeli kahve zinciri: Sahadan sinyal

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. çok şubeli kahve zinciri yönetimi şu durumla karşı karşıya: Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması. Bu bilgi nesnesinin odağı **adet-fiyat-dönüşüm sürücüleri** ve cevaplanacak karar şudur: **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?**

## adet-fiyat-dönüşüm sürücüleri — Teşhis merceği

Ciroyu İş Sürücülerine Ayırmak, çok şubeli kahve zinciri verisini tek başına bir oran olarak değil, **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Ciro = İşlem adedi × Ortalama sepet. adet-fiyat-dönüşüm sürücüleri sonucu; dönem, para birimi, sube kaynağı ve çok şubeli kahve zinciri çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sube ve gunlukFis — Kanıt paketi

Vaka veri paketi:

- **sube:** 7
- **gunlukFis:** 640
- **ortSepet:** 186
- **acikGun:** 30
- **yeniSubeRamp:** 0.35 · 0.55 · 0.72 · 0.88 · 1

12 aylık şube tahmini başlamadan önce sube, gunlukFis, ortSepet alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. çok şubeli kahve zinciri belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Ciro — Adım adım çözüm

1. “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. adet-fiyat-dönüşüm sürücüleri formülünü yaz: **Ciro = İşlem adedi × Ortalama sepet**.
3. çok şubeli kahve zinciri baz senaryosunu çalıştır; hesap izindeki ara adımı sube verisiyle karşılaştır.
4. sürücü ağacı ve ramp-up eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 12 aylık şube tahmini sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 12 aylık şube tahmini — Karar eşiği

Katkı Payı sonucu çok şubeli kahve zinciri için basit bir “iyi/kötü” etiketi değildir. Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli? sorusunda adet-fiyat-dönüşüm sürücüleri, sürücü ağacı ve ramp-up eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gunlukFis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması problemine ilişkin operasyonel açıklama aranır.

## tüm büyümeyi tek yüzdeye bağlamak — Yanılma payı

çok şubeli kahve zinciri vakasındaki en tehlikeli hata **tüm büyümeyi tek yüzdeye bağlamak**. Katkı Payı; sube eksikken, dönemler uyumsuzken veya “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. adet-fiyat-dönüşüm sürücüleri çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-19
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 12 aylık şube tahmini

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** tüm büyümeyi tek yüzdeye bağlamak

**Görev:** 12 aylık şube tahmini


### 2. Kapasite ve Ramp-up Eğrisi

*Bilgi nesnesi: `P6-C19-KO2`*

**Problem:** Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması

**Kısa yanıt:** Kapasite kullanımı = Gerçekleşen işlem / Teorik kapasite

**Özet:** kapasiteye ulaşma yolu odağında çok şubeli kahve zinciri için uygulamalı karar nesnesi.

# Kapasite ve Ramp-up Eğrisi

## çok şubeli kahve zinciri: Yönetim sorusu

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. çok şubeli kahve zinciri yönetimi şu durumla karşı karşıya: Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması. Bu bilgi nesnesinin odağı **kapasiteye ulaşma yolu** ve cevaplanacak karar şudur: **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?**

## kapasiteye ulaşma yolu — Harita

Kapasite ve Ramp-up Eğrisi, çok şubeli kahve zinciri verisini tek başına bir oran olarak değil, **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Kapasite kullanımı = Gerçekleşen işlem / Teorik kapasite. kapasiteye ulaşma yolu sonucu; dönem, para birimi, sube kaynağı ve çok şubeli kahve zinciri çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sube ve gunlukFis — Ölçüm protokolü

Vaka veri paketi:

- **sube:** 7
- **gunlukFis:** 640
- **ortSepet:** 186
- **acikGun:** 30
- **yeniSubeRamp:** 0.35 · 0.55 · 0.72 · 0.88 · 1

12 aylık şube tahmini başlamadan önce sube, gunlukFis, ortSepet alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. çok şubeli kahve zinciri belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Kapasite kullanımı — Uygulama

1. “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. kapasiteye ulaşma yolu formülünü yaz: **Kapasite kullanımı = Gerçekleşen işlem / Teorik kapasite**.
3. çok şubeli kahve zinciri baz senaryosunu çalıştır; hesap izindeki ara adımı sube verisiyle karşılaştır.
4. sürücü ağacı ve ramp-up eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 12 aylık şube tahmini sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 12 aylık şube tahmini — Gösterge paneli

Katkı Payı sonucu çok şubeli kahve zinciri için basit bir “iyi/kötü” etiketi değildir. Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli? sorusunda kapasiteye ulaşma yolu, sürücü ağacı ve ramp-up eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gunlukFis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması problemine ilişkin operasyonel açıklama aranır.

## kapasite sınırını aşan tahmin yapmak — Etik fren

çok şubeli kahve zinciri vakasındaki en tehlikeli hata **kapasite sınırını aşan tahmin yapmak**. Katkı Payı; sube eksikken, dönemler uyumsuzken veya “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kapasiteye ulaşma yolu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-19
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 12 aylık şube tahmini

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** kapasite sınırını aşan tahmin yapmak

**Görev:** 12 aylık şube tahmini


### 3. Tahmin Varsayım Ağacı

*Bilgi nesnesi: `P6-C19-KO3`*

**Problem:** Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması

**Kısa yanıt:** Yeni şube ciro = Olgun şube ciro × Ramp-up katsayısı

**Özet:** varsayım bağımlılıkları odağında çok şubeli kahve zinciri için uygulamalı karar nesnesi.

# Tahmin Varsayım Ağacı

## çok şubeli kahve zinciri: Vaka açılışı

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. çok şubeli kahve zinciri yönetimi şu durumla karşı karşıya: Geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması. Bu bilgi nesnesinin odağı **varsayım bağımlılıkları** ve cevaplanacak karar şudur: **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?**

## varsayım bağımlılıkları — Mekanik

Tahmin Varsayım Ağacı, çok şubeli kahve zinciri verisini tek başına bir oran olarak değil, **Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Yeni şube ciro = Olgun şube ciro × Ramp-up katsayısı. varsayım bağımlılıkları sonucu; dönem, para birimi, sube kaynağı ve çok şubeli kahve zinciri çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sube ve gunlukFis — Girdi kontrolü

Vaka veri paketi:

- **sube:** 7
- **gunlukFis:** 640
- **ortSepet:** 186
- **acikGun:** 30
- **yeniSubeRamp:** 0.35 · 0.55 · 0.72 · 0.88 · 1

12 aylık şube tahmini başlamadan önce sube, gunlukFis, ortSepet alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. çok şubeli kahve zinciri belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Yeni şube ciro — Çalışma notu

1. “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. varsayım bağımlılıkları formülünü yaz: **Yeni şube ciro = Olgun şube ciro × Ramp-up katsayısı**.
3. çok şubeli kahve zinciri baz senaryosunu çalıştır; hesap izindeki ara adımı sube verisiyle karşılaştır.
4. sürücü ağacı ve ramp-up eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. 12 aylık şube tahmini sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## 12 aylık şube tahmini — Tartışma

Katkı Payı sonucu çok şubeli kahve zinciri için basit bir “iyi/kötü” etiketi değildir. Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli? sorusunda varsayım bağımlılıkları, sürücü ağacı ve ramp-up eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gunlukFis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra geçen yıl cirosuna yüzde ekleyerek yapılan bütçenin şube gerçeklerini kaçırması problemine ilişkin operasyonel açıklama aranır.

## fiyat ve hacim etkisini ayırmamak — Ne zaman kullanma?

çok şubeli kahve zinciri vakasındaki en tehlikeli hata **fiyat ve hacim etkisini ayırmamak**. Katkı Payı; sube eksikken, dönemler uyumsuzken veya “Yeni şube ve mevcut şube satışları nasıl ayrı tahmin edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. varsayım bağımlılıkları çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-19
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: 12 aylık şube tahmini

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** fiyat ve hacim etkisini ayırmamak

**Görev:** 12 aylık şube tahmini


---

## Bütçe ve Sapma Analizi

**Slug:** `phase-6-20-butce-ve-sapma-analizi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

metal işleme atölyesi vakası üzerinden aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?
- sorumluluk merkezli bütçe
- sapma toplantısı karar tutanağı

### 1. Bütçeyi Kontrol Sistemi Olarak Kurmak

*Bilgi nesnesi: `P6-C20-KO1`*

**Problem:** Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor

**Kısa yanıt:** Fiyat sapması = Gerçek miktar × (Gerçek fiyat − Standart fiyat)

**Özet:** sorumluluk merkezli bütçe odağında metal işleme atölyesi için uygulamalı karar nesnesi.

# Bütçeyi Kontrol Sistemi Olarak Kurmak

## metal işleme atölyesi: Yönetim sorusu

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. metal işleme atölyesi yönetimi şu durumla karşı karşıya: Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor. Bu bilgi nesnesinin odağı **sorumluluk merkezli bütçe** ve cevaplanacak karar şudur: **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?**

## sorumluluk merkezli bütçe — Harita

Bütçeyi Kontrol Sistemi Olarak Kurmak, metal işleme atölyesi verisini tek başına bir oran olarak değil, **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Fiyat sapması = Gerçek miktar × (Gerçek fiyat − Standart fiyat). sorumluluk merkezli bütçe sonucu; dönem, para birimi, butceMiktar kaynağı ve metal işleme atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Kârdan Nakde Mutabakat:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Faaliyet Nakit Akışı Yaklaşımı, Serbest Nakit Yaklaşımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## butceMiktar ve gercekMiktar — Ölçüm protokolü

Vaka veri paketi:

- **butceMiktar:** 12000
- **gercekMiktar:** 13400
- **butceFiyat:** 82
- **gercekFiyat:** 91
- **standartFire:** 0.03
- **gercekFire:** 0.057

sapma toplantısı karar tutanağı başlamadan önce butceMiktar, gercekMiktar, butceFiyat alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. metal işleme atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Kârdan Nakde Mutabakat modeline girmez.

## Fiyat sapması — Uygulama

1. “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” sorusuyla ilgisiz alanları ayır; Kârdan Nakde Mutabakat girdilerini eşleştir.
2. sorumluluk merkezli bütçe formülünü yaz: **Fiyat sapması = Gerçek miktar × (Gerçek fiyat − Standart fiyat)**.
3. metal işleme atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı butceMiktar verisiyle karşılaştır.
4. bütçeden gerçeğe sapma şelalesi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. sapma toplantısı karar tutanağı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## sapma toplantısı karar tutanağı — Gösterge paneli

Kârdan Nakde Mutabakat sonucu metal işleme atölyesi için basit bir “iyi/kötü” etiketi değildir. Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı? sorusunda sorumluluk merkezli bütçe, bütçeden gerçeğe sapma şelalesi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gercekMiktar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor problemine ilişkin operasyonel açıklama aranır.

## olumlu sapmayı otomatik başarı saymak — Etik fren

metal işleme atölyesi vakasındaki en tehlikeli hata **olumlu sapmayı otomatik başarı saymak**. Kârdan Nakde Mutabakat; butceMiktar eksikken, dönemler uyumsuzken veya “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sorumluluk merkezli bütçe çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-20
- Model: [Kârdan Nakde Mutabakat](/app/finance/models/PROFIT_TO_CASH)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: sapma toplantısı karar tutanağı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** olumlu sapmayı otomatik başarı saymak

**Görev:** sapma toplantısı karar tutanağı


### 2. Fiyat ve Miktar Sapmasını Ayırmak

*Bilgi nesnesi: `P6-C20-KO2`*

**Problem:** Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor

**Kısa yanıt:** Miktar sapması = Standart fiyat × (Gerçek miktar − Standart miktar)

**Özet:** sapma köprüsü odağında metal işleme atölyesi için uygulamalı karar nesnesi.

# Fiyat ve Miktar Sapmasını Ayırmak

## metal işleme atölyesi: Vaka açılışı

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. metal işleme atölyesi yönetimi şu durumla karşı karşıya: Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor. Bu bilgi nesnesinin odağı **sapma köprüsü** ve cevaplanacak karar şudur: **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?**

## sapma köprüsü — Mekanik

Fiyat ve Miktar Sapmasını Ayırmak, metal işleme atölyesi verisini tek başına bir oran olarak değil, **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Miktar sapması = Standart fiyat × (Gerçek miktar − Standart miktar). sapma köprüsü sonucu; dönem, para birimi, butceMiktar kaynağı ve metal işleme atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Kârdan Nakde Mutabakat:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Faaliyet Nakit Akışı Yaklaşımı, Serbest Nakit Yaklaşımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## butceMiktar ve gercekMiktar — Girdi kontrolü

Vaka veri paketi:

- **butceMiktar:** 12000
- **gercekMiktar:** 13400
- **butceFiyat:** 82
- **gercekFiyat:** 91
- **standartFire:** 0.03
- **gercekFire:** 0.057

sapma toplantısı karar tutanağı başlamadan önce butceMiktar, gercekMiktar, butceFiyat alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. metal işleme atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Kârdan Nakde Mutabakat modeline girmez.

## Miktar sapması — Çalışma notu

1. “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” sorusuyla ilgisiz alanları ayır; Kârdan Nakde Mutabakat girdilerini eşleştir.
2. sapma köprüsü formülünü yaz: **Miktar sapması = Standart fiyat × (Gerçek miktar − Standart miktar)**.
3. metal işleme atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı butceMiktar verisiyle karşılaştır.
4. bütçeden gerçeğe sapma şelalesi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. sapma toplantısı karar tutanağı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## sapma toplantısı karar tutanağı — Tartışma

Kârdan Nakde Mutabakat sonucu metal işleme atölyesi için basit bir “iyi/kötü” etiketi değildir. Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı? sorusunda sapma köprüsü, bütçeden gerçeğe sapma şelalesi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gercekMiktar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor problemine ilişkin operasyonel açıklama aranır.

## hacim etkisini fiyat etkisine yüklemek — Ne zaman kullanma?

metal işleme atölyesi vakasındaki en tehlikeli hata **hacim etkisini fiyat etkisine yüklemek**. Kârdan Nakde Mutabakat; butceMiktar eksikken, dönemler uyumsuzken veya “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sapma köprüsü çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-20
- Model: [Kârdan Nakde Mutabakat](/app/finance/models/PROFIT_TO_CASH)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: sapma toplantısı karar tutanağı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** hacim etkisini fiyat etkisine yüklemek

**Görev:** sapma toplantısı karar tutanağı


### 3. Sapmadan Sorumlu Aksiyona

*Bilgi nesnesi: `P6-C20-KO3`*

**Problem:** Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor

**Kısa yanıt:** Toplam sapma = Gerçekleşen − Bütçe

**Özet:** kontrol edilebilirlik odağında metal işleme atölyesi için uygulamalı karar nesnesi.

# Sapmadan Sorumlu Aksiyona

## metal işleme atölyesi: Operasyon odası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. metal işleme atölyesi yönetimi şu durumla karşı karşıya: Aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor. Bu bilgi nesnesinin odağı **kontrol edilebilirlik** ve cevaplanacak karar şudur: **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?**

## kontrol edilebilirlik — Neden-sonuç zinciri

Sapmadan Sorumlu Aksiyona, metal işleme atölyesi verisini tek başına bir oran olarak değil, **Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Toplam sapma = Gerçekleşen − Bütçe. kontrol edilebilirlik sonucu; dönem, para birimi, butceMiktar kaynağı ve metal işleme atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Kârdan Nakde Mutabakat:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Faaliyet Nakit Akışı Yaklaşımı, Serbest Nakit Yaklaşımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## butceMiktar ve gercekMiktar — Veri sözlüğü

Vaka veri paketi:

- **butceMiktar:** 12000
- **gercekMiktar:** 13400
- **butceFiyat:** 82
- **gercekFiyat:** 91
- **standartFire:** 0.03
- **gercekFire:** 0.057

sapma toplantısı karar tutanağı başlamadan önce butceMiktar, gercekMiktar, butceFiyat alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. metal işleme atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Kârdan Nakde Mutabakat modeline girmez.

## Toplam sapma — Hesap izi

1. “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” sorusuyla ilgisiz alanları ayır; Kârdan Nakde Mutabakat girdilerini eşleştir.
2. kontrol edilebilirlik formülünü yaz: **Toplam sapma = Gerçekleşen − Bütçe**.
3. metal işleme atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı butceMiktar verisiyle karşılaştır.
4. bütçeden gerçeğe sapma şelalesi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. sapma toplantısı karar tutanağı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## sapma toplantısı karar tutanağı — Aksiyon kartı

Kârdan Nakde Mutabakat sonucu metal işleme atölyesi için basit bir “iyi/kötü” etiketi değildir. Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı? sorusunda kontrol edilebilirlik, bütçeden gerçeğe sapma şelalesi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce gercekMiktar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra aylık gider bütçesi aşılmış fakat nedenin fiyat mı miktar mı olduğu bilinmiyor problemine ilişkin operasyonel açıklama aranır.

## kontrol dışı kur etkisini personele yazmak — Kontrol testi

metal işleme atölyesi vakasındaki en tehlikeli hata **kontrol dışı kur etkisini personele yazmak**. Kârdan Nakde Mutabakat; butceMiktar eksikken, dönemler uyumsuzken veya “Satın alma, üretim veya satış ekibinden hangisi aksiyon almalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kontrol edilebilirlik çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-20
- Model: [Kârdan Nakde Mutabakat](/app/finance/models/PROFIT_TO_CASH)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: sapma toplantısı karar tutanağı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** kontrol dışı kur etkisini personele yazmak

**Görev:** sapma toplantısı karar tutanağı


---
