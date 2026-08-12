# Büyüme Ekonomisi

Bu dosya "Büyüme Ekonomisi" kategorisindeki **2** yayınlanmış kursu içerir.

---

## CAC ve Müşteri Edinme Ekonomisi

**Slug:** `phase-6-14-cac-ve-musteri-edinme-ekonomisi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

online yabancı dil uygulaması vakası üzerinden reklam harcaması büyürken ücretli müşteri başına maliyetin artması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Hangi kanalın bütçesi artırılmalı?
- tam yüklü edinme maliyeti
- bütçe yeniden dağıtım kurulu

### 1. CAC Paydasını Doğru Kurmak

*Bilgi nesnesi: `P6-C14-KO1`*

**Problem:** Reklam harcaması büyürken ücretli müşteri başına maliyetin artması

**Kısa yanıt:** CAC = Edinme gideri / Yeni müşteri

**Özet:** tam yüklü edinme maliyeti odağında online yabancı dil uygulaması için uygulamalı karar nesnesi.

# CAC Paydasını Doğru Kurmak

## online yabancı dil uygulaması: Yönetim sorusu

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. online yabancı dil uygulaması yönetimi şu durumla karşı karşıya: Reklam harcaması büyürken ücretli müşteri başına maliyetin artması. Bu bilgi nesnesinin odağı **tam yüklü edinme maliyeti** ve cevaplanacak karar şudur: **Hangi kanalın bütçesi artırılmalı?**

## tam yüklü edinme maliyeti — Harita

CAC Paydasını Doğru Kurmak, online yabancı dil uygulaması verisini tek başına bir oran olarak değil, **Hangi kanalın bütçesi artırılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. CAC = Edinme gideri / Yeni müşteri. tam yüklü edinme maliyeti sonucu; dönem, para birimi, kanallar kaynağı ve online yabancı dil uygulaması çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Müşteri Edinme Maliyeti:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: CAC. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kanallar ve harcama — Ölçüm protokolü

Vaka veri paketi:

- **kanallar:** arama · influencer · ortaklık
- **harcama:** 420000 · 280000 · 90000
- **yeniMusteri:** 1400 · 520 · 610
- **aylikKatki:** 240 · 210 · 230

bütçe yeniden dağıtım kurulu başlamadan önce kanallar, harcama, yeniMusteri alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. online yabancı dil uygulaması belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Müşteri Edinme Maliyeti modeline girmez.

## CAC — Uygulama

1. “Hangi kanalın bütçesi artırılmalı?” sorusuyla ilgisiz alanları ayır; Müşteri Edinme Maliyeti girdilerini eşleştir.
2. tam yüklü edinme maliyeti formülünü yaz: **CAC = Edinme gideri / Yeni müşteri**.
3. online yabancı dil uygulaması baz senaryosunu çalıştır; hesap izindeki ara adımı kanallar verisiyle karşılaştır.
4. kanal CAC ve geri ödeme karşılaştırması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. bütçe yeniden dağıtım kurulu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## bütçe yeniden dağıtım kurulu — Gösterge paneli

Müşteri Edinme Maliyeti sonucu online yabancı dil uygulaması için basit bir “iyi/kötü” etiketi değildir. Hangi kanalın bütçesi artırılmalı? sorusunda tam yüklü edinme maliyeti, kanal CAC ve geri ödeme karşılaştırması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce harcama tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra reklam harcaması büyürken ücretli müşteri başına maliyetin artması problemine ilişkin operasyonel açıklama aranır.

## mevcut müşteriye harcamayı CAC’a katmak — Etik fren

online yabancı dil uygulaması vakasındaki en tehlikeli hata **mevcut müşteriye harcamayı CAC’a katmak**. Müşteri Edinme Maliyeti; kanallar eksikken, dönemler uyumsuzken veya “Hangi kanalın bütçesi artırılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. tam yüklü edinme maliyeti çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-14
- Model: [Müşteri Edinme Maliyeti](/app/finance/models/CAC)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: bütçe yeniden dağıtım kurulu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** mevcut müşteriye harcamayı CAC’a katmak

**Görev:** bütçe yeniden dağıtım kurulu


### 2. Kanal Bazlı Edinme Kohortu

*Bilgi nesnesi: `P6-C14-KO2`*

**Problem:** Reklam harcaması büyürken ücretli müşteri başına maliyetin artması

**Kısa yanıt:** Kanal CAC = Kanal gideri / Atfedilen yeni müşteri

**Özet:** kanal-kohort ayrımı odağında online yabancı dil uygulaması için uygulamalı karar nesnesi.

# Kanal Bazlı Edinme Kohortu

## online yabancı dil uygulaması: Vaka açılışı

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. online yabancı dil uygulaması yönetimi şu durumla karşı karşıya: Reklam harcaması büyürken ücretli müşteri başına maliyetin artması. Bu bilgi nesnesinin odağı **kanal-kohort ayrımı** ve cevaplanacak karar şudur: **Hangi kanalın bütçesi artırılmalı?**

## kanal-kohort ayrımı — Mekanik

Kanal Bazlı Edinme Kohortu, online yabancı dil uygulaması verisini tek başına bir oran olarak değil, **Hangi kanalın bütçesi artırılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Kanal CAC = Kanal gideri / Atfedilen yeni müşteri. kanal-kohort ayrımı sonucu; dönem, para birimi, kanallar kaynağı ve online yabancı dil uygulaması çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — CAC Geri Ödeme Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: CAC Geri Ödeme. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kanallar ve harcama — Girdi kontrolü

Vaka veri paketi:

- **kanallar:** arama · influencer · ortaklık
- **harcama:** 420000 · 280000 · 90000
- **yeniMusteri:** 1400 · 520 · 610
- **aylikKatki:** 240 · 210 · 230

bütçe yeniden dağıtım kurulu başlamadan önce kanallar, harcama, yeniMusteri alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. online yabancı dil uygulaması belgesinden OCR ile gelen alan, kullanıcı onayı olmadan CAC Geri Ödeme Süresi modeline girmez.

## Kanal CAC — Çalışma notu

1. “Hangi kanalın bütçesi artırılmalı?” sorusuyla ilgisiz alanları ayır; CAC Geri Ödeme Süresi girdilerini eşleştir.
2. kanal-kohort ayrımı formülünü yaz: **Kanal CAC = Kanal gideri / Atfedilen yeni müşteri**.
3. online yabancı dil uygulaması baz senaryosunu çalıştır; hesap izindeki ara adımı kanallar verisiyle karşılaştır.
4. kanal CAC ve geri ödeme karşılaştırması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. bütçe yeniden dağıtım kurulu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## bütçe yeniden dağıtım kurulu — Tartışma

CAC Geri Ödeme Süresi sonucu online yabancı dil uygulaması için basit bir “iyi/kötü” etiketi değildir. Hangi kanalın bütçesi artırılmalı? sorusunda kanal-kohort ayrımı, kanal CAC ve geri ödeme karşılaştırması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce harcama tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra reklam harcaması büyürken ücretli müşteri başına maliyetin artması problemine ilişkin operasyonel açıklama aranır.

## son tıklamayı tek gerçek saymak — Ne zaman kullanma?

online yabancı dil uygulaması vakasındaki en tehlikeli hata **son tıklamayı tek gerçek saymak**. CAC Geri Ödeme Süresi; kanallar eksikken, dönemler uyumsuzken veya “Hangi kanalın bütçesi artırılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kanal-kohort ayrımı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-14
- Model: [CAC Geri Ödeme Süresi](/app/finance/models/CAC_PAYBACK)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: bütçe yeniden dağıtım kurulu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** son tıklamayı tek gerçek saymak

**Görev:** bütçe yeniden dağıtım kurulu


### 3. Geri Ödeme Süresi ve Büyüme Freni

*Bilgi nesnesi: `P6-C14-KO3`*

**Problem:** Reklam harcaması büyürken ücretli müşteri başına maliyetin artması

**Kısa yanıt:** Geri ödeme ayı = CAC / Aylık müşteri katkısı

**Özet:** nakit geri ödeme ufku odağında online yabancı dil uygulaması için uygulamalı karar nesnesi.

# Geri Ödeme Süresi ve Büyüme Freni

## online yabancı dil uygulaması: Operasyon odası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. online yabancı dil uygulaması yönetimi şu durumla karşı karşıya: Reklam harcaması büyürken ücretli müşteri başına maliyetin artması. Bu bilgi nesnesinin odağı **nakit geri ödeme ufku** ve cevaplanacak karar şudur: **Hangi kanalın bütçesi artırılmalı?**

## nakit geri ödeme ufku — Neden-sonuç zinciri

Geri Ödeme Süresi ve Büyüme Freni, online yabancı dil uygulaması verisini tek başına bir oran olarak değil, **Hangi kanalın bütçesi artırılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Geri ödeme ayı = CAC / Aylık müşteri katkısı. nakit geri ödeme ufku sonucu; dönem, para birimi, kanallar kaynağı ve online yabancı dil uygulaması çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Müşteri Edinme Maliyeti:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: CAC. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kanallar ve harcama — Veri sözlüğü

Vaka veri paketi:

- **kanallar:** arama · influencer · ortaklık
- **harcama:** 420000 · 280000 · 90000
- **yeniMusteri:** 1400 · 520 · 610
- **aylikKatki:** 240 · 210 · 230

bütçe yeniden dağıtım kurulu başlamadan önce kanallar, harcama, yeniMusteri alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. online yabancı dil uygulaması belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Müşteri Edinme Maliyeti modeline girmez.

## Geri ödeme ayı — Hesap izi

1. “Hangi kanalın bütçesi artırılmalı?” sorusuyla ilgisiz alanları ayır; Müşteri Edinme Maliyeti girdilerini eşleştir.
2. nakit geri ödeme ufku formülünü yaz: **Geri ödeme ayı = CAC / Aylık müşteri katkısı**.
3. online yabancı dil uygulaması baz senaryosunu çalıştır; hesap izindeki ara adımı kanallar verisiyle karşılaştır.
4. kanal CAC ve geri ödeme karşılaştırması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. bütçe yeniden dağıtım kurulu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## bütçe yeniden dağıtım kurulu — Aksiyon kartı

Müşteri Edinme Maliyeti sonucu online yabancı dil uygulaması için basit bir “iyi/kötü” etiketi değildir. Hangi kanalın bütçesi artırılmalı? sorusunda nakit geri ödeme ufku, kanal CAC ve geri ödeme karşılaştırması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce harcama tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra reklam harcaması büyürken ücretli müşteri başına maliyetin artması problemine ilişkin operasyonel açıklama aranır.

## brüt gelirle geri ödeme hesaplamak — Kontrol testi

online yabancı dil uygulaması vakasındaki en tehlikeli hata **brüt gelirle geri ödeme hesaplamak**. Müşteri Edinme Maliyeti; kanallar eksikken, dönemler uyumsuzken veya “Hangi kanalın bütçesi artırılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. nakit geri ödeme ufku çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-14
- Model: [Müşteri Edinme Maliyeti](/app/finance/models/CAC)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: bütçe yeniden dağıtım kurulu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** brüt gelirle geri ödeme hesaplamak

**Görev:** bütçe yeniden dağıtım kurulu


---

## LTV, Churn ve Retention

**Slug:** `phase-6-15-ltv-churn-ve-retention` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

abonelikli evcil hayvan bakım kutusu vakası üzerinden ilk ay indirimli müşterilerin üçüncü ayda hızla ayrılması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?
- müşteri yaşam eğrisi
- promosyon kohortu teşhisi

### 1. Retention Eğrisini Okumak

*Bilgi nesnesi: `P6-C15-KO1`*

**Problem:** İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması

**Kısa yanıt:** Retention(t) = Aktif kohort / Başlangıç kohortu

**Özet:** müşteri yaşam eğrisi odağında abonelikli evcil hayvan bakım kutusu için uygulamalı karar nesnesi.

# Retention Eğrisini Okumak

## abonelikli evcil hayvan bakım kutusu: Vaka açılışı

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. abonelikli evcil hayvan bakım kutusu yönetimi şu durumla karşı karşıya: İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması. Bu bilgi nesnesinin odağı **müşteri yaşam eğrisi** ve cevaplanacak karar şudur: **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?**

## müşteri yaşam eğrisi — Mekanik

Retention Eğrisini Okumak, abonelikli evcil hayvan bakım kutusu verisini tek başına bir oran olarak değil, **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Retention(t) = Aktif kohort / Başlangıç kohortu. müşteri yaşam eğrisi sonucu; dönem, para birimi, aylikGelir kaynağı ve abonelikli evcil hayvan bakım kutusu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Müşteri Yaşam Boyu Değeri:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: LTV, Tahmini Müşteri Ömrü. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## aylikGelir ve brutMarj — Girdi kontrolü

Vaka veri paketi:

- **aylikGelir:** 520
- **brutMarj:** 0.42
- **aylikChurn:** 0.085
- **cac:** 610
- **retention:** 1 · 0.78 · 0.66 · 0.58 · 0.51 · 0.46

promosyon kohortu teşhisi başlamadan önce aylikGelir, brutMarj, aylikChurn alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. abonelikli evcil hayvan bakım kutusu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Müşteri Yaşam Boyu Değeri modeline girmez.

## Retention(t) — Çalışma notu

1. “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” sorusuyla ilgisiz alanları ayır; Müşteri Yaşam Boyu Değeri girdilerini eşleştir.
2. müşteri yaşam eğrisi formülünü yaz: **Retention(t) = Aktif kohort / Başlangıç kohortu**.
3. abonelikli evcil hayvan bakım kutusu baz senaryosunu çalıştır; hesap izindeki ara adımı aylikGelir verisiyle karşılaştır.
4. kohort retention eğrileri üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. promosyon kohortu teşhisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## promosyon kohortu teşhisi — Tartışma

Müşteri Yaşam Boyu Değeri sonucu abonelikli evcil hayvan bakım kutusu için basit bir “iyi/kötü” etiketi değildir. Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor? sorusunda müşteri yaşam eğrisi, kohort retention eğrileri üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce brutMarj tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ilk ay indirimli müşterilerin üçüncü ayda hızla ayrılması problemine ilişkin operasyonel açıklama aranır.

## geliri katkı gibi kullanmak — Ne zaman kullanma?

abonelikli evcil hayvan bakım kutusu vakasındaki en tehlikeli hata **geliri katkı gibi kullanmak**. Müşteri Yaşam Boyu Değeri; aylikGelir eksikken, dönemler uyumsuzken veya “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. müşteri yaşam eğrisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-15
- Model: [Müşteri Yaşam Boyu Değeri](/app/finance/models/LTV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: promosyon kohortu teşhisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** geliri katkı gibi kullanmak

**Görev:** promosyon kohortu teşhisi


### 2. LTV Varsayım Katmanları

*Bilgi nesnesi: `P6-C15-KO2`*

**Problem:** İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması

**Kısa yanıt:** Basit LTV = Aylık gelir × Brüt marj / Aylık churn

**Özet:** marj ve churn tabanlı değer odağında abonelikli evcil hayvan bakım kutusu için uygulamalı karar nesnesi.

# LTV Varsayım Katmanları

## abonelikli evcil hayvan bakım kutusu: Operasyon odası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. abonelikli evcil hayvan bakım kutusu yönetimi şu durumla karşı karşıya: İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması. Bu bilgi nesnesinin odağı **marj ve churn tabanlı değer** ve cevaplanacak karar şudur: **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?**

## marj ve churn tabanlı değer — Neden-sonuç zinciri

LTV Varsayım Katmanları, abonelikli evcil hayvan bakım kutusu verisini tek başına bir oran olarak değil, **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Basit LTV = Aylık gelir × Brüt marj / Aylık churn. marj ve churn tabanlı değer sonucu; dönem, para birimi, aylikGelir kaynağı ve abonelikli evcil hayvan bakım kutusu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — LTV/CAC Oranı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: LTV/CAC. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## aylikGelir ve brutMarj — Veri sözlüğü

Vaka veri paketi:

- **aylikGelir:** 520
- **brutMarj:** 0.42
- **aylikChurn:** 0.085
- **cac:** 610
- **retention:** 1 · 0.78 · 0.66 · 0.58 · 0.51 · 0.46

promosyon kohortu teşhisi başlamadan önce aylikGelir, brutMarj, aylikChurn alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. abonelikli evcil hayvan bakım kutusu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan LTV/CAC Oranı modeline girmez.

## Basit LTV — Hesap izi

1. “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” sorusuyla ilgisiz alanları ayır; LTV/CAC Oranı girdilerini eşleştir.
2. marj ve churn tabanlı değer formülünü yaz: **Basit LTV = Aylık gelir × Brüt marj / Aylık churn**.
3. abonelikli evcil hayvan bakım kutusu baz senaryosunu çalıştır; hesap izindeki ara adımı aylikGelir verisiyle karşılaştır.
4. kohort retention eğrileri üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. promosyon kohortu teşhisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## promosyon kohortu teşhisi — Aksiyon kartı

LTV/CAC Oranı sonucu abonelikli evcil hayvan bakım kutusu için basit bir “iyi/kötü” etiketi değildir. Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor? sorusunda marj ve churn tabanlı değer, kohort retention eğrileri üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce brutMarj tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ilk ay indirimli müşterilerin üçüncü ayda hızla ayrılması problemine ilişkin operasyonel açıklama aranır.

## erken dönem churn’ü sonsuza taşımak — Kontrol testi

abonelikli evcil hayvan bakım kutusu vakasındaki en tehlikeli hata **erken dönem churn’ü sonsuza taşımak**. LTV/CAC Oranı; aylikGelir eksikken, dönemler uyumsuzken veya “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. marj ve churn tabanlı değer çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-15
- Model: [LTV/CAC Oranı](/app/finance/models/LTV_CAC)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: promosyon kohortu teşhisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** erken dönem churn’ü sonsuza taşımak

**Görev:** promosyon kohortu teşhisi


### 3. LTV/CAC Oranının Sınırları

*Bilgi nesnesi: `P6-C15-KO3`*

**Problem:** İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması

**Kısa yanıt:** LTV/CAC = Müşteri yaşam boyu değeri / Edinme maliyeti

**Özet:** edinme-değer dengesi odağında abonelikli evcil hayvan bakım kutusu için uygulamalı karar nesnesi.

# LTV/CAC Oranının Sınırları

## abonelikli evcil hayvan bakım kutusu: Karar günlüğü

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. abonelikli evcil hayvan bakım kutusu yönetimi şu durumla karşı karşıya: İlk ay indirimli müşterilerin üçüncü ayda hızla ayrılması. Bu bilgi nesnesinin odağı **edinme-değer dengesi** ve cevaplanacak karar şudur: **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?**

## edinme-değer dengesi — İddia

LTV/CAC Oranının Sınırları, abonelikli evcil hayvan bakım kutusu verisini tek başına bir oran olarak değil, **Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. LTV/CAC = Müşteri yaşam boyu değeri / Edinme maliyeti. edinme-değer dengesi sonucu; dönem, para birimi, aylikGelir kaynağı ve abonelikli evcil hayvan bakım kutusu çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Müşteri Yaşam Boyu Değeri:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: LTV, Tahmini Müşteri Ömrü. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## aylikGelir ve brutMarj — Deliller

Vaka veri paketi:

- **aylikGelir:** 520
- **brutMarj:** 0.42
- **aylikChurn:** 0.085
- **cac:** 610
- **retention:** 1 · 0.78 · 0.66 · 0.58 · 0.51 · 0.46

promosyon kohortu teşhisi başlamadan önce aylikGelir, brutMarj, aylikChurn alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. abonelikli evcil hayvan bakım kutusu belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Müşteri Yaşam Boyu Değeri modeline girmez.

## LTV/CAC — Sayısal deney

1. “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” sorusuyla ilgisiz alanları ayır; Müşteri Yaşam Boyu Değeri girdilerini eşleştir.
2. edinme-değer dengesi formülünü yaz: **LTV/CAC = Müşteri yaşam boyu değeri / Edinme maliyeti**.
3. abonelikli evcil hayvan bakım kutusu baz senaryosunu çalıştır; hesap izindeki ara adımı aylikGelir verisiyle karşılaştır.
4. kohort retention eğrileri üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. promosyon kohortu teşhisi sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## promosyon kohortu teşhisi — Karşı görüş

Müşteri Yaşam Boyu Değeri sonucu abonelikli evcil hayvan bakım kutusu için basit bir “iyi/kötü” etiketi değildir. Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor? sorusunda edinme-değer dengesi, kohort retention eğrileri üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce brutMarj tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ilk ay indirimli müşterilerin üçüncü ayda hızla ayrılması problemine ilişkin operasyonel açıklama aranır.

## yüksek oranı sınırsız bütçe izni sanmak — Kapanış ölçütü

abonelikli evcil hayvan bakım kutusu vakasındaki en tehlikeli hata **yüksek oranı sınırsız bütçe izni sanmak**. Müşteri Yaşam Boyu Değeri; aylikGelir eksikken, dönemler uyumsuzken veya “Promosyon büyümeyi mi, kısa ömürlü müşteri akışını mı üretiyor?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. edinme-değer dengesi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-15
- Model: [Müşteri Yaşam Boyu Değeri](/app/finance/models/LTV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: promosyon kohortu teşhisi

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** yüksek oranı sınırsız bütçe izni sanmak

**Görev:** promosyon kohortu teşhisi


---
