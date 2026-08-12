# Yatırım Analizi

Bu dosya "Yatırım Analizi" kategorisindeki **1** yayınlanmış kursu içerir.

---

## NPV ve IRR ile Yatırım Kararı

**Slug:** `phase-6-22-npv-ve-irr-ile-yatirim-karari` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

soğuk hava deposu işletmesi vakası üzerinden enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?
- bugünkü değer
- yatırım komitesi önerisi

### 1. Paranın Zaman Değeri

*Bilgi nesnesi: `P6-C22-KO1`*

**Problem:** Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması

**Kısa yanıt:** PV = Nakit akışı / (1 + r)^t

**Özet:** bugünkü değer odağında soğuk hava deposu işletmesi için uygulamalı karar nesnesi.

# Paranın Zaman Değeri

## soğuk hava deposu işletmesi: Operasyon odası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. soğuk hava deposu işletmesi yönetimi şu durumla karşı karşıya: Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması. Bu bilgi nesnesinin odağı **bugünkü değer** ve cevaplanacak karar şudur: **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?**

## bugünkü değer — Neden-sonuç zinciri

Paranın Zaman Değeri, soğuk hava deposu işletmesi verisini tek başına bir oran olarak değil, **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. PV = Nakit akışı / (1 + r)^t. bugünkü değer sonucu; dönem, para birimi, ilkYatirim kaynağı ve soğuk hava deposu işletmesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Bugünkü Değer:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Bugünkü Değer, Girişlerin Bugünkü Değeri. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ilkYatirim ve nakitAkislari — Veri sözlüğü

Vaka veri paketi:

- **ilkYatirim:** -6800000
- **nakitAkislari:** -6800000 · 1750000 · 1960000 · 2110000 · 2260000 · 2380000
- **iskonto:** 0.31

yatırım komitesi önerisi başlamadan önce ilkYatirim, nakitAkislari, iskonto alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. soğuk hava deposu işletmesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Bugünkü Değer modeline girmez.

## PV — Hesap izi

1. “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” sorusuyla ilgisiz alanları ayır; Net Bugünkü Değer girdilerini eşleştir.
2. bugünkü değer formülünü yaz: **PV = Nakit akışı / (1 + r)^t**.
3. soğuk hava deposu işletmesi baz senaryosunu çalıştır; hesap izindeki ara adımı ilkYatirim verisiyle karşılaştır.
4. NPV profili ve iskonto oranı eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi önerisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi önerisi — Aksiyon kartı

Net Bugünkü Değer sonucu soğuk hava deposu işletmesi için basit bir “iyi/kötü” etiketi değildir. Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli? sorusunda bugünkü değer, NPV profili ve iskonto oranı eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce nakitAkislari tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması problemine ilişkin operasyonel açıklama aranır.

## nominal nakdi reel oranla iskonto etmek — Kontrol testi

soğuk hava deposu işletmesi vakasındaki en tehlikeli hata **nominal nakdi reel oranla iskonto etmek**. Net Bugünkü Değer; ilkYatirim eksikken, dönemler uyumsuzken veya “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. bugünkü değer çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-22
- Model: [Net Bugünkü Değer](/app/finance/models/NPV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi önerisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** nominal nakdi reel oranla iskonto etmek

**Görev:** yatırım komitesi önerisi


### 2. NPV ile Değer Yaratım Eşiği

*Bilgi nesnesi: `P6-C22-KO2`*

**Problem:** Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması

**Kısa yanıt:** NPV = Σ İskontolu nakit akışı

**Özet:** sermaye maliyeti üstü değer odağında soğuk hava deposu işletmesi için uygulamalı karar nesnesi.

# NPV ile Değer Yaratım Eşiği

## soğuk hava deposu işletmesi: Karar günlüğü

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. soğuk hava deposu işletmesi yönetimi şu durumla karşı karşıya: Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması. Bu bilgi nesnesinin odağı **sermaye maliyeti üstü değer** ve cevaplanacak karar şudur: **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?**

## sermaye maliyeti üstü değer — İddia

NPV ile Değer Yaratım Eşiği, soğuk hava deposu işletmesi verisini tek başına bir oran olarak değil, **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. NPV = Σ İskontolu nakit akışı. sermaye maliyeti üstü değer sonucu; dönem, para birimi, ilkYatirim kaynağı ve soğuk hava deposu işletmesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — İç Verim Oranı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: İç Verim Oranı, Çözüm Adımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ilkYatirim ve nakitAkislari — Deliller

Vaka veri paketi:

- **ilkYatirim:** -6800000
- **nakitAkislari:** -6800000 · 1750000 · 1960000 · 2110000 · 2260000 · 2380000
- **iskonto:** 0.31

yatırım komitesi önerisi başlamadan önce ilkYatirim, nakitAkislari, iskonto alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. soğuk hava deposu işletmesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan İç Verim Oranı modeline girmez.

## NPV — Sayısal deney

1. “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” sorusuyla ilgisiz alanları ayır; İç Verim Oranı girdilerini eşleştir.
2. sermaye maliyeti üstü değer formülünü yaz: **NPV = Σ İskontolu nakit akışı**.
3. soğuk hava deposu işletmesi baz senaryosunu çalıştır; hesap izindeki ara adımı ilkYatirim verisiyle karşılaştır.
4. NPV profili ve iskonto oranı eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi önerisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi önerisi — Karşı görüş

İç Verim Oranı sonucu soğuk hava deposu işletmesi için basit bir “iyi/kötü” etiketi değildir. Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli? sorusunda sermaye maliyeti üstü değer, NPV profili ve iskonto oranı eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce nakitAkislari tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması problemine ilişkin operasyonel açıklama aranır.

## batık maliyeti projeye katmak — Kapanış ölçütü

soğuk hava deposu işletmesi vakasındaki en tehlikeli hata **batık maliyeti projeye katmak**. İç Verim Oranı; ilkYatirim eksikken, dönemler uyumsuzken veya “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sermaye maliyeti üstü değer çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-22
- Model: [İç Verim Oranı](/app/finance/models/IRR)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi önerisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** batık maliyeti projeye katmak

**Görev:** yatırım komitesi önerisi


### 3. IRR’nin Çoklu Kök ve Ölçek Tuzakları

*Bilgi nesnesi: `P6-C22-KO3`*

**Problem:** Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması

**Kısa yanıt:** IRR: NPV’yi sıfıra eşitleyen oran

**Özet:** getiri oranı sınırlamaları odağında soğuk hava deposu işletmesi için uygulamalı karar nesnesi.

# IRR’nin Çoklu Kök ve Ölçek Tuzakları

## soğuk hava deposu işletmesi: Karar masası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. soğuk hava deposu işletmesi yönetimi şu durumla karşı karşıya: Enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması. Bu bilgi nesnesinin odağı **getiri oranı sınırlamaları** ve cevaplanacak karar şudur: **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?**

## getiri oranı sınırlamaları — Kavramı yerleştir

IRR’nin Çoklu Kök ve Ölçek Tuzakları, soğuk hava deposu işletmesi verisini tek başına bir oran olarak değil, **Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. IRR: NPV’yi sıfıra eşitleyen oran. getiri oranı sınırlamaları sonucu; dönem, para birimi, ilkYatirim kaynağı ve soğuk hava deposu işletmesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Bugünkü Değer:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Bugünkü Değer, Girişlerin Bugünkü Değeri. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ilkYatirim ve nakitAkislari — Veriyi hazırla

Vaka veri paketi:

- **ilkYatirim:** -6800000
- **nakitAkislari:** -6800000 · 1750000 · 1960000 · 2110000 · 2260000 · 2380000
- **iskonto:** 0.31

yatırım komitesi önerisi başlamadan önce ilkYatirim, nakitAkislari, iskonto alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. soğuk hava deposu işletmesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Bugünkü Değer modeline girmez.

## IRR: NPV’yi sıfıra eşitleyen oran — Hesabı yürüt

1. “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” sorusuyla ilgisiz alanları ayır; Net Bugünkü Değer girdilerini eşleştir.
2. getiri oranı sınırlamaları formülünü yaz: **IRR: NPV’yi sıfıra eşitleyen oran**.
3. soğuk hava deposu işletmesi baz senaryosunu çalıştır; hesap izindeki ara adımı ilkYatirim verisiyle karşılaştır.
4. NPV profili ve iskonto oranı eğrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi önerisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi önerisi — Sonucu oku

Net Bugünkü Değer sonucu soğuk hava deposu işletmesi için basit bir “iyi/kötü” etiketi değildir. Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli? sorusunda getiri oranı sınırlamaları, NPV profili ve iskonto oranı eğrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce nakitAkislari tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra enerji verimli kompresör yatırımının geri dönüşünün belirsiz olması problemine ilişkin operasyonel açıklama aranır.

## IRR ile farklı ölçekli projeyi tek başına seçmek — Sınır çiz

soğuk hava deposu işletmesi vakasındaki en tehlikeli hata **IRR ile farklı ölçekli projeyi tek başına seçmek**. Net Bugünkü Değer; ilkYatirim eksikken, dönemler uyumsuzken veya “Yatırım şimdi yapılmalı mı, kiralama mı tercih edilmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. getiri oranı sınırlamaları çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-22
- Model: [Net Bugünkü Değer](/app/finance/models/NPV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi önerisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** IRR ile farklı ölçekli projeyi tek başına seçmek

**Görev:** yatırım komitesi önerisi


---
