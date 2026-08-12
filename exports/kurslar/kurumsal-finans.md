# Kurumsal Finans

Bu dosya "Kurumsal Finans" kategorisindeki **1** yayınlanmış kursu içerir.

---

## CAPM, WACC ve Sermaye Maliyeti

**Slug:** `phase-6-23-capm-wacc-ve-sermaye-maliyeti` · **Seviye:** advanced · **Süre:** ~105 dk · **Ders sayısı:** 3

halka açık olmayan enerji hizmetleri şirketi vakası üzerinden yeni proje için iskonto oranının keyfî seçilmesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?
- sistematik risk primi
- iskonto oranı savunma dosyası

### 1. CAPM ile Özsermaye Maliyeti

*Bilgi nesnesi: `P6-C23-KO1`*

**Problem:** Yeni proje için iskonto oranının keyfî seçilmesi

**Kısa yanıt:** Ke = Rf + Beta × Piyasa risk primi

**Özet:** sistematik risk primi odağında halka açık olmayan enerji hizmetleri şirketi için uygulamalı karar nesnesi.

# CAPM ile Özsermaye Maliyeti

## halka açık olmayan enerji hizmetleri şirketi: Karar günlüğü

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. halka açık olmayan enerji hizmetleri şirketi yönetimi şu durumla karşı karşıya: Yeni proje için iskonto oranının keyfî seçilmesi. Bu bilgi nesnesinin odağı **sistematik risk primi** ve cevaplanacak karar şudur: **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?**

## sistematik risk primi — İddia

CAPM ile Özsermaye Maliyeti, halka açık olmayan enerji hizmetleri şirketi verisini tek başına bir oran olarak değil, **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Ke = Rf + Beta × Piyasa risk primi. sistematik risk primi sonucu; dönem, para birimi, risksiz kaynağı ve halka açık olmayan enerji hizmetleri şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## risksiz ve beta — Deliller

Vaka veri paketi:

- **risksiz:** 0.32
- **beta:** 0.9
- **piyasaPrimi:** 0.055
- **borcMaliyeti:** 0.39
- **vergi:** 0.25
- **borcAgirligi:** 0.42

iskonto oranı savunma dosyası başlamadan önce risksiz, beta, piyasaPrimi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. halka açık olmayan enerji hizmetleri şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## Ke — Sayısal deney

1. “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. sistematik risk primi formülünü yaz: **Ke = Rf + Beta × Piyasa risk primi**.
3. halka açık olmayan enerji hizmetleri şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı risksiz verisiyle karşılaştır.
4. sermaye maliyeti bileşen köprüsü üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. iskonto oranı savunma dosyası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## iskonto oranı savunma dosyası — Karşı görüş

Basitleştirilmiş WACC ve FCFF DCF sonucu halka açık olmayan enerji hizmetleri şirketi için basit bir “iyi/kötü” etiketi değildir. Projenin riskine uygun sermaye maliyeti nasıl savunulmalı? sorusunda sistematik risk primi, sermaye maliyeti bileşen köprüsü üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce beta tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni proje için iskonto oranının keyfî seçilmesi problemine ilişkin operasyonel açıklama aranır.

## muhasebe değerlerini ağırlık yapmak — Kapanış ölçütü

halka açık olmayan enerji hizmetleri şirketi vakasındaki en tehlikeli hata **muhasebe değerlerini ağırlık yapmak**. Basitleştirilmiş WACC ve FCFF DCF; risksiz eksikken, dönemler uyumsuzken veya “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sistematik risk primi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-23
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: iskonto oranı savunma dosyası

## Kaynaklar

1. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** muhasebe değerlerini ağırlık yapmak

**Görev:** iskonto oranı savunma dosyası


### 2. Borç ve Özsermaye Ağırlıkları

*Bilgi nesnesi: `P6-C23-KO2`*

**Problem:** Yeni proje için iskonto oranının keyfî seçilmesi

**Kısa yanıt:** Vergi sonrası Kd = Borç maliyeti × (1 − Vergi)

**Özet:** piyasa değeri ağırlıkları odağında halka açık olmayan enerji hizmetleri şirketi için uygulamalı karar nesnesi.

# Borç ve Özsermaye Ağırlıkları

## halka açık olmayan enerji hizmetleri şirketi: Karar masası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. halka açık olmayan enerji hizmetleri şirketi yönetimi şu durumla karşı karşıya: Yeni proje için iskonto oranının keyfî seçilmesi. Bu bilgi nesnesinin odağı **piyasa değeri ağırlıkları** ve cevaplanacak karar şudur: **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?**

## piyasa değeri ağırlıkları — Kavramı yerleştir

Borç ve Özsermaye Ağırlıkları, halka açık olmayan enerji hizmetleri şirketi verisini tek başına bir oran olarak değil, **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Vergi sonrası Kd = Borç maliyeti × (1 − Vergi). piyasa değeri ağırlıkları sonucu; dönem, para birimi, risksiz kaynağı ve halka açık olmayan enerji hizmetleri şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## risksiz ve beta — Veriyi hazırla

Vaka veri paketi:

- **risksiz:** 0.32
- **beta:** 0.9
- **piyasaPrimi:** 0.055
- **borcMaliyeti:** 0.39
- **vergi:** 0.25
- **borcAgirligi:** 0.42

iskonto oranı savunma dosyası başlamadan önce risksiz, beta, piyasaPrimi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. halka açık olmayan enerji hizmetleri şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## Vergi sonrası Kd — Hesabı yürüt

1. “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. piyasa değeri ağırlıkları formülünü yaz: **Vergi sonrası Kd = Borç maliyeti × (1 − Vergi)**.
3. halka açık olmayan enerji hizmetleri şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı risksiz verisiyle karşılaştır.
4. sermaye maliyeti bileşen köprüsü üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. iskonto oranı savunma dosyası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## iskonto oranı savunma dosyası — Sonucu oku

Basitleştirilmiş WACC ve FCFF DCF sonucu halka açık olmayan enerji hizmetleri şirketi için basit bir “iyi/kötü” etiketi değildir. Projenin riskine uygun sermaye maliyeti nasıl savunulmalı? sorusunda piyasa değeri ağırlıkları, sermaye maliyeti bileşen köprüsü üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce beta tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni proje için iskonto oranının keyfî seçilmesi problemine ilişkin operasyonel açıklama aranır.

## ülke ve para birimi tutarsızlığı — Sınır çiz

halka açık olmayan enerji hizmetleri şirketi vakasındaki en tehlikeli hata **ülke ve para birimi tutarsızlığı**. Basitleştirilmiş WACC ve FCFF DCF; risksiz eksikken, dönemler uyumsuzken veya “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. piyasa değeri ağırlıkları çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-23
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: iskonto oranı savunma dosyası

## Kaynaklar

1. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** ülke ve para birimi tutarsızlığı

**Görev:** iskonto oranı savunma dosyası


### 3. WACC Kullanım Sınırları

*Bilgi nesnesi: `P6-C23-KO3`*

**Problem:** Yeni proje için iskonto oranının keyfî seçilmesi

**Kısa yanıt:** WACC = E/V × Ke + D/V × Kd × (1 − T)

**Özet:** proje-şirket risk uyumu odağında halka açık olmayan enerji hizmetleri şirketi için uygulamalı karar nesnesi.

# WACC Kullanım Sınırları

## halka açık olmayan enerji hizmetleri şirketi: Sahadan sinyal

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. halka açık olmayan enerji hizmetleri şirketi yönetimi şu durumla karşı karşıya: Yeni proje için iskonto oranının keyfî seçilmesi. Bu bilgi nesnesinin odağı **proje-şirket risk uyumu** ve cevaplanacak karar şudur: **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?**

## proje-şirket risk uyumu — Teşhis merceği

WACC Kullanım Sınırları, halka açık olmayan enerji hizmetleri şirketi verisini tek başına bir oran olarak değil, **Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. WACC = E/V × Ke + D/V × Kd × (1 − T). proje-şirket risk uyumu sonucu; dönem, para birimi, risksiz kaynağı ve halka açık olmayan enerji hizmetleri şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## risksiz ve beta — Kanıt paketi

Vaka veri paketi:

- **risksiz:** 0.32
- **beta:** 0.9
- **piyasaPrimi:** 0.055
- **borcMaliyeti:** 0.39
- **vergi:** 0.25
- **borcAgirligi:** 0.42

iskonto oranı savunma dosyası başlamadan önce risksiz, beta, piyasaPrimi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. halka açık olmayan enerji hizmetleri şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## WACC — Adım adım çözüm

1. “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. proje-şirket risk uyumu formülünü yaz: **WACC = E/V × Ke + D/V × Kd × (1 − T)**.
3. halka açık olmayan enerji hizmetleri şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı risksiz verisiyle karşılaştır.
4. sermaye maliyeti bileşen köprüsü üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. iskonto oranı savunma dosyası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## iskonto oranı savunma dosyası — Karar eşiği

Basitleştirilmiş WACC ve FCFF DCF sonucu halka açık olmayan enerji hizmetleri şirketi için basit bir “iyi/kötü” etiketi değildir. Projenin riskine uygun sermaye maliyeti nasıl savunulmalı? sorusunda proje-şirket risk uyumu, sermaye maliyeti bileşen köprüsü üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce beta tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni proje için iskonto oranının keyfî seçilmesi problemine ilişkin operasyonel açıklama aranır.

## şirket WACC’ını her projeye uygulamak — Yanılma payı

halka açık olmayan enerji hizmetleri şirketi vakasındaki en tehlikeli hata **şirket WACC’ını her projeye uygulamak**. Basitleştirilmiş WACC ve FCFF DCF; risksiz eksikken, dönemler uyumsuzken veya “Projenin riskine uygun sermaye maliyeti nasıl savunulmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. proje-şirket risk uyumu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-23
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: iskonto oranı savunma dosyası

## Kaynaklar

1. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** şirket WACC’ını her projeye uygulamak

**Görev:** iskonto oranı savunma dosyası


---
