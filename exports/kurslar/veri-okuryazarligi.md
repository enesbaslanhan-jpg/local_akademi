# Veri Okuryazarlığı

Bu dosya "Veri Okuryazarlığı" kategorisindeki **1** yayınlanmış kursu içerir.

---

## Finansal Veri Kalitesi ve Model Girdileri

**Slug:** `phase-6-02-finansal-veri-kalitesi-ve-model-girdileri` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

iki şubeli güzellik salonu vakası üzerinden pos, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Hangi veri setiyle aylık yönetim raporu hazırlanmalı?
- veri soyu ve kapsam
- hatalı veri paketi temizleme

### 1. Kaynak–Dönem–Birim Üçlüsü

*Bilgi nesnesi: `P6-C02-KO1`*

**Problem:** POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi

**Kısa yanıt:** Mutabakat farkı = Kaynak A − Kaynak B

**Özet:** veri soyu ve kapsam odağında iki şubeli güzellik salonu için uygulamalı karar nesnesi.

# Kaynak–Dönem–Birim Üçlüsü

## iki şubeli güzellik salonu: Yönetim sorusu

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. iki şubeli güzellik salonu yönetimi şu durumla karşı karşıya: POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi. Bu bilgi nesnesinin odağı **veri soyu ve kapsam** ve cevaplanacak karar şudur: **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?**

## veri soyu ve kapsam — Harita

Kaynak–Dönem–Birim Üçlüsü, iki şubeli güzellik salonu verisini tek başına bir oran olarak değil, **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Mutabakat farkı = Kaynak A − Kaynak B. veri soyu ve kapsam sonucu; dönem, para birimi, posSatis kaynağı ve iki şubeli güzellik salonu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## posSatis ve bankaTahsilat — Ölçüm protokolü

Vaka veri paketi:

- **posSatis:** 428000
- **bankaTahsilat:** 401500
- **muhasebeGelir:** 433200
- **iptal:** 8700
- **gecikmeliTahsilat:** 23000

hatalı veri paketi temizleme başlamadan önce posSatis, bankaTahsilat, muhasebeGelir alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. iki şubeli güzellik salonu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Mutabakat farkı — Uygulama

1. “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. veri soyu ve kapsam formülünü yaz: **Mutabakat farkı = Kaynak A − Kaynak B**.
3. iki şubeli güzellik salonu baz senaryosunu çalıştır; hesap izindeki ara adımı posSatis verisiyle karşılaştır.
4. veri soyu ve kontrol kapıları şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. hatalı veri paketi temizleme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## hatalı veri paketi temizleme — Gösterge paneli

Cari Oran sonucu iki şubeli güzellik salonu için basit bir “iyi/kötü” etiketi değildir. Hangi veri setiyle aylık yönetim raporu hazırlanmalı? sorusunda veri soyu ve kapsam, veri soyu ve kontrol kapıları şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce bankaTahsilat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra pos, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi problemine ilişkin operasyonel açıklama aranır.

## brüt ve net tutarı karıştırmak — Etik fren

iki şubeli güzellik salonu vakasındaki en tehlikeli hata **brüt ve net tutarı karıştırmak**. Cari Oran; posSatis eksikken, dönemler uyumsuzken veya “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. veri soyu ve kapsam çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-02
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: hatalı veri paketi temizleme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** brüt ve net tutarı karıştırmak

**Görev:** hatalı veri paketi temizleme


### 2. Eksik, Mükerrer ve Bayat Veri Testleri

*Bilgi nesnesi: `P6-C02-KO2`*

**Problem:** POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi

**Kısa yanıt:** Tamlık = Dolu zorunlu alan / Tüm zorunlu alan

**Özet:** kalite kontrol kapıları odağında iki şubeli güzellik salonu için uygulamalı karar nesnesi.

# Eksik, Mükerrer ve Bayat Veri Testleri

## iki şubeli güzellik salonu: Vaka açılışı

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. iki şubeli güzellik salonu yönetimi şu durumla karşı karşıya: POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi. Bu bilgi nesnesinin odağı **kalite kontrol kapıları** ve cevaplanacak karar şudur: **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?**

## kalite kontrol kapıları — Mekanik

Eksik, Mükerrer ve Bayat Veri Testleri, iki şubeli güzellik salonu verisini tek başına bir oran olarak değil, **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Tamlık = Dolu zorunlu alan / Tüm zorunlu alan. kalite kontrol kapıları sonucu; dönem, para birimi, posSatis kaynağı ve iki şubeli güzellik salonu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## posSatis ve bankaTahsilat — Girdi kontrolü

Vaka veri paketi:

- **posSatis:** 428000
- **bankaTahsilat:** 401500
- **muhasebeGelir:** 433200
- **iptal:** 8700
- **gecikmeliTahsilat:** 23000

hatalı veri paketi temizleme başlamadan önce posSatis, bankaTahsilat, muhasebeGelir alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. iki şubeli güzellik salonu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Tamlık — Çalışma notu

1. “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. kalite kontrol kapıları formülünü yaz: **Tamlık = Dolu zorunlu alan / Tüm zorunlu alan**.
3. iki şubeli güzellik salonu baz senaryosunu çalıştır; hesap izindeki ara adımı posSatis verisiyle karşılaştır.
4. veri soyu ve kontrol kapıları şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. hatalı veri paketi temizleme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## hatalı veri paketi temizleme — Tartışma

Cari Oran sonucu iki şubeli güzellik salonu için basit bir “iyi/kötü” etiketi değildir. Hangi veri setiyle aylık yönetim raporu hazırlanmalı? sorusunda kalite kontrol kapıları, veri soyu ve kontrol kapıları şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce bankaTahsilat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra pos, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi problemine ilişkin operasyonel açıklama aranır.

## mükerrer satırı satış saymak — Ne zaman kullanma?

iki şubeli güzellik salonu vakasındaki en tehlikeli hata **mükerrer satırı satış saymak**. Cari Oran; posSatis eksikken, dönemler uyumsuzken veya “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kalite kontrol kapıları çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-02
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: hatalı veri paketi temizleme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** mükerrer satırı satış saymak

**Görev:** hatalı veri paketi temizleme


### 3. Varsayım Sicili ve Kullanıcı Doğrulaması

*Bilgi nesnesi: `P6-C02-KO3`*

**Problem:** POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi

**Kısa yanıt:** Varsayım etkisi = Senaryo çıktısı − Baz çıktı

**Özet:** varsayım yönetişimi odağında iki şubeli güzellik salonu için uygulamalı karar nesnesi.

# Varsayım Sicili ve Kullanıcı Doğrulaması

## iki şubeli güzellik salonu: Operasyon odası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. iki şubeli güzellik salonu yönetimi şu durumla karşı karşıya: POS, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi. Bu bilgi nesnesinin odağı **varsayım yönetişimi** ve cevaplanacak karar şudur: **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?**

## varsayım yönetişimi — Neden-sonuç zinciri

Varsayım Sicili ve Kullanıcı Doğrulaması, iki şubeli güzellik salonu verisini tek başına bir oran olarak değil, **Hangi veri setiyle aylık yönetim raporu hazırlanmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Varsayım etkisi = Senaryo çıktısı − Baz çıktı. varsayım yönetişimi sonucu; dönem, para birimi, posSatis kaynağı ve iki şubeli güzellik salonu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## posSatis ve bankaTahsilat — Veri sözlüğü

Vaka veri paketi:

- **posSatis:** 428000
- **bankaTahsilat:** 401500
- **muhasebeGelir:** 433200
- **iptal:** 8700
- **gecikmeliTahsilat:** 23000

hatalı veri paketi temizleme başlamadan önce posSatis, bankaTahsilat, muhasebeGelir alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. iki şubeli güzellik salonu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Varsayım etkisi — Hesap izi

1. “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. varsayım yönetişimi formülünü yaz: **Varsayım etkisi = Senaryo çıktısı − Baz çıktı**.
3. iki şubeli güzellik salonu baz senaryosunu çalıştır; hesap izindeki ara adımı posSatis verisiyle karşılaştır.
4. veri soyu ve kontrol kapıları şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. hatalı veri paketi temizleme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## hatalı veri paketi temizleme — Aksiyon kartı

Cari Oran sonucu iki şubeli güzellik salonu için basit bir “iyi/kötü” etiketi değildir. Hangi veri setiyle aylık yönetim raporu hazırlanmalı? sorusunda varsayım yönetişimi, veri soyu ve kontrol kapıları şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce bankaTahsilat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra pos, banka ve muhasebe dışa aktarımlarının aynı satış toplamını vermemesi problemine ilişkin operasyonel açıklama aranır.

## OCR sonucunu onaysız gerçek kabul etmek — Kontrol testi

iki şubeli güzellik salonu vakasındaki en tehlikeli hata **OCR sonucunu onaysız gerçek kabul etmek**. Cari Oran; posSatis eksikken, dönemler uyumsuzken veya “Hangi veri setiyle aylık yönetim raporu hazırlanmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. varsayım yönetişimi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-02
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: hatalı veri paketi temizleme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** OCR sonucunu onaysız gerçek kabul etmek

**Görev:** hatalı veri paketi temizleme


---
