# Finansal Analiz

Bu dosya "Finansal Analiz" kategorisindeki **3** yayınlanmış kursu içerir.

---

## Üç Finansal Tabloyu Birlikte Okumak

**Slug:** `phase-6-01-uc-finansal-tabloyu-birlikte-okumak` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

mahalle fırını vakası üzerinden kâr görünmesine rağmen kasanın her ay zayıflaması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?
- varlık-kaynak dengesi
- mutabakat avı

### 1. Bilanço Fotoğraf Değil Bağlantılar Haritasıdır

*Bilgi nesnesi: `P6-C01-KO1`*

**Problem:** Kâr görünmesine rağmen kasanın her ay zayıflaması

**Kısa yanıt:** Varlıklar = Yükümlülükler + Özkaynak

**Özet:** varlık-kaynak dengesi odağında mahalle fırını için uygulamalı karar nesnesi.

# Bilanço Fotoğraf Değil Bağlantılar Haritasıdır

## mahalle fırını: Sahadan sinyal

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. mahalle fırını yönetimi şu durumla karşı karşıya: Kâr görünmesine rağmen kasanın her ay zayıflaması. Bu bilgi nesnesinin odağı **varlık-kaynak dengesi** ve cevaplanacak karar şudur: **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?**

## varlık-kaynak dengesi — Teşhis merceği

Bilanço Fotoğraf Değil Bağlantılar Haritasıdır, mahalle fırını verisini tek başına bir oran olarak değil, **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Varlıklar = Yükümlülükler + Özkaynak. varlık-kaynak dengesi sonucu; dönem, para birimi, gelir kaynağı ve mahalle fırını çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## gelir ve netKar — Kanıt paketi

Vaka veri paketi:

- **gelir:** 980000
- **netKar:** 92000
- **faaliyetNakitAkisi:** 18000
- **varlik:** 1450000
- **borc:** 870000

mutabakat avı başlamadan önce gelir, netKar, faaliyetNakitAkisi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mahalle fırını belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Varlıklar — Adım adım çözüm

1. “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. varlık-kaynak dengesi formülünü yaz: **Varlıklar = Yükümlülükler + Özkaynak**.
3. mahalle fırını baz senaryosunu çalıştır; hesap izindeki ara adımı gelir verisiyle karşılaştır.
4. üç tablolu bağlantı akış şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. mutabakat avı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## mutabakat avı — Karar eşiği

Cari Oran sonucu mahalle fırını için basit bir “iyi/kötü” etiketi değildir. Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi? sorusunda varlık-kaynak dengesi, üç tablolu bağlantı akış şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce netKar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kâr görünmesine rağmen kasanın her ay zayıflaması problemine ilişkin operasyonel açıklama aranır.

## tek dönemi bağlamsız okumak — Yanılma payı

mahalle fırını vakasındaki en tehlikeli hata **tek dönemi bağlamsız okumak**. Cari Oran; gelir eksikken, dönemler uyumsuzken veya “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. varlık-kaynak dengesi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-01
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: mutabakat avı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** tek dönemi bağlamsız okumak

**Görev:** mutabakat avı


### 2. Kâr ile Nakit Neden Ayrışır?

*Bilgi nesnesi: `P6-C01-KO2`*

**Problem:** Kâr görünmesine rağmen kasanın her ay zayıflaması

**Kısa yanıt:** Nakit dönüşüm oranı = Faaliyet nakit akışı / Net kâr

**Özet:** tahakkuk ve nakit hareketi odağında mahalle fırını için uygulamalı karar nesnesi.

# Kâr ile Nakit Neden Ayrışır?

## mahalle fırını: Yönetim sorusu

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. mahalle fırını yönetimi şu durumla karşı karşıya: Kâr görünmesine rağmen kasanın her ay zayıflaması. Bu bilgi nesnesinin odağı **tahakkuk ve nakit hareketi** ve cevaplanacak karar şudur: **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?**

## tahakkuk ve nakit hareketi — Harita

Kâr ile Nakit Neden Ayrışır?, mahalle fırını verisini tek başına bir oran olarak değil, **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Nakit dönüşüm oranı = Faaliyet nakit akışı / Net kâr. tahakkuk ve nakit hareketi sonucu; dönem, para birimi, gelir kaynağı ve mahalle fırını çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Kârdan Nakde Mutabakat:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Faaliyet Nakit Akışı Yaklaşımı, Serbest Nakit Yaklaşımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## gelir ve netKar — Ölçüm protokolü

Vaka veri paketi:

- **gelir:** 980000
- **netKar:** 92000
- **faaliyetNakitAkisi:** 18000
- **varlik:** 1450000
- **borc:** 870000

mutabakat avı başlamadan önce gelir, netKar, faaliyetNakitAkisi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mahalle fırını belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Kârdan Nakde Mutabakat modeline girmez.

## Nakit dönüşüm oranı — Uygulama

1. “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” sorusuyla ilgisiz alanları ayır; Kârdan Nakde Mutabakat girdilerini eşleştir.
2. tahakkuk ve nakit hareketi formülünü yaz: **Nakit dönüşüm oranı = Faaliyet nakit akışı / Net kâr**.
3. mahalle fırını baz senaryosunu çalıştır; hesap izindeki ara adımı gelir verisiyle karşılaştır.
4. üç tablolu bağlantı akış şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. mutabakat avı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## mutabakat avı — Gösterge paneli

Kârdan Nakde Mutabakat sonucu mahalle fırını için basit bir “iyi/kötü” etiketi değildir. Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi? sorusunda tahakkuk ve nakit hareketi, üç tablolu bağlantı akış şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce netKar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kâr görünmesine rağmen kasanın her ay zayıflaması problemine ilişkin operasyonel açıklama aranır.

## kârı kasadaki para sanmak — Etik fren

mahalle fırını vakasındaki en tehlikeli hata **kârı kasadaki para sanmak**. Kârdan Nakde Mutabakat; gelir eksikken, dönemler uyumsuzken veya “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. tahakkuk ve nakit hareketi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-01
- Model: [Kârdan Nakde Mutabakat](/app/finance/models/PROFIT_TO_CASH)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: mutabakat avı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** kârı kasadaki para sanmak

**Görev:** mutabakat avı


### 3. Üç Tablo Mutabakatı ile Kırmızı Bayraklar

*Bilgi nesnesi: `P6-C01-KO3`*

**Problem:** Kâr görünmesine rağmen kasanın her ay zayıflaması

**Kısa yanıt:** Dönem sonu nakit = Dönem başı nakit + Net nakit değişimi

**Özet:** dönemler arası mutabakat odağında mahalle fırını için uygulamalı karar nesnesi.

# Üç Tablo Mutabakatı ile Kırmızı Bayraklar

## mahalle fırını: Vaka açılışı

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. mahalle fırını yönetimi şu durumla karşı karşıya: Kâr görünmesine rağmen kasanın her ay zayıflaması. Bu bilgi nesnesinin odağı **dönemler arası mutabakat** ve cevaplanacak karar şudur: **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?**

## dönemler arası mutabakat — Mekanik

Üç Tablo Mutabakatı ile Kırmızı Bayraklar, mahalle fırını verisini tek başına bir oran olarak değil, **Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Dönem sonu nakit = Dönem başı nakit + Net nakit değişimi. dönemler arası mutabakat sonucu; dönem, para birimi, gelir kaynağı ve mahalle fırını çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## gelir ve netKar — Girdi kontrolü

Vaka veri paketi:

- **gelir:** 980000
- **netKar:** 92000
- **faaliyetNakitAkisi:** 18000
- **varlik:** 1450000
- **borc:** 870000

mutabakat avı başlamadan önce gelir, netKar, faaliyetNakitAkisi alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mahalle fırını belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Dönem sonu nakit — Çalışma notu

1. “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. dönemler arası mutabakat formülünü yaz: **Dönem sonu nakit = Dönem başı nakit + Net nakit değişimi**.
3. mahalle fırını baz senaryosunu çalıştır; hesap izindeki ara adımı gelir verisiyle karşılaştır.
4. üç tablolu bağlantı akış şeması üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. mutabakat avı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## mutabakat avı — Tartışma

Cari Oran sonucu mahalle fırını için basit bir “iyi/kötü” etiketi değildir. Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi? sorusunda dönemler arası mutabakat, üç tablolu bağlantı akış şeması üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce netKar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kâr görünmesine rağmen kasanın her ay zayıflaması problemine ilişkin operasyonel açıklama aranır.

## dipnot ve sınıflama değişimini atlamak — Ne zaman kullanma?

mahalle fırını vakasındaki en tehlikeli hata **dipnot ve sınıflama değişimini atlamak**. Cari Oran; gelir eksikken, dönemler uyumsuzken veya “Yeni fırın yatırımını ertelemek mi, işletme sermayesini düzeltmek mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. dönemler arası mutabakat çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-01
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: mutabakat avı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** dipnot ve sınıflama değişimini atlamak

**Görev:** mutabakat avı


---

## Mali Oranlarla İşletme Sağlığı

**Slug:** `phase-6-03-mali-oranlarla-isletme-sagligi` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

yedek parça toptancısı vakası üzerinden yüksek stok nedeniyle cari oranın güvenli görünmesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?
- kısa vadeli ödeme tamponu
- oranlarla yanlış teşhisi düzeltme

### 1. Cari Oranın Söylediği ve Sakladığı

*Bilgi nesnesi: `P6-C03-KO1`*

**Problem:** Yüksek stok nedeniyle cari oranın güvenli görünmesi

**Kısa yanıt:** Cari oran = Dönen varlık / Kısa vadeli borç

**Özet:** kısa vadeli ödeme tamponu odağında yedek parça toptancısı için uygulamalı karar nesnesi.

# Cari Oranın Söylediği ve Sakladığı

## yedek parça toptancısı: Vaka açılışı

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. yedek parça toptancısı yönetimi şu durumla karşı karşıya: Yüksek stok nedeniyle cari oranın güvenli görünmesi. Bu bilgi nesnesinin odağı **kısa vadeli ödeme tamponu** ve cevaplanacak karar şudur: **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?**

## kısa vadeli ödeme tamponu — Mekanik

Cari Oranın Söylediği ve Sakladığı, yedek parça toptancısı verisini tek başına bir oran olarak değil, **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Cari oran = Dönen varlık / Kısa vadeli borç. kısa vadeli ödeme tamponu sonucu; dönem, para birimi, donenVarlik kaynağı ve yedek parça toptancısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve stok — Girdi kontrolü

Vaka veri paketi:

- **donenVarlik:** 1650000
- **stok:** 940000
- **kvBorc:** 980000
- **nakit:** 170000
- **alacak:** 410000

oranlarla yanlış teşhisi düzeltme başlamadan önce donenVarlik, stok, kvBorc alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. yedek parça toptancısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Cari oran — Çalışma notu

1. “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. kısa vadeli ödeme tamponu formülünü yaz: **Cari oran = Dönen varlık / Kısa vadeli borç**.
3. yedek parça toptancısı baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. likidite katmanları gösterge paneli üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. oranlarla yanlış teşhisi düzeltme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## oranlarla yanlış teşhisi düzeltme — Tartışma

Cari Oran sonucu yedek parça toptancısı için basit bir “iyi/kötü” etiketi değildir. Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi? sorusunda kısa vadeli ödeme tamponu, likidite katmanları gösterge paneli üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce stok tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yüksek stok nedeniyle cari oranın güvenli görünmesi problemine ilişkin operasyonel açıklama aranır.

## tek oranla kredi kararı vermek — Ne zaman kullanma?

yedek parça toptancısı vakasındaki en tehlikeli hata **tek oranla kredi kararı vermek**. Cari Oran; donenVarlik eksikken, dönemler uyumsuzken veya “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kısa vadeli ödeme tamponu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-03
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: oranlarla yanlış teşhisi düzeltme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** tek oranla kredi kararı vermek

**Görev:** oranlarla yanlış teşhisi düzeltme


### 2. Asit-Test ile Stok Bağımlılığı

*Bilgi nesnesi: `P6-C03-KO2`*

**Problem:** Yüksek stok nedeniyle cari oranın güvenli görünmesi

**Kısa yanıt:** Asit-test = (Dönen varlık − Stok) / Kısa vadeli borç

**Özet:** hızlı likit varlıklar odağında yedek parça toptancısı için uygulamalı karar nesnesi.

# Asit-Test ile Stok Bağımlılığı

## yedek parça toptancısı: Operasyon odası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. yedek parça toptancısı yönetimi şu durumla karşı karşıya: Yüksek stok nedeniyle cari oranın güvenli görünmesi. Bu bilgi nesnesinin odağı **hızlı likit varlıklar** ve cevaplanacak karar şudur: **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?**

## hızlı likit varlıklar — Neden-sonuç zinciri

Asit-Test ile Stok Bağımlılığı, yedek parça toptancısı verisini tek başına bir oran olarak değil, **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Asit-test = (Dönen varlık − Stok) / Kısa vadeli borç. hızlı likit varlıklar sonucu; dönem, para birimi, donenVarlik kaynağı ve yedek parça toptancısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Asit-Test Oranı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Asit-Test Oranı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve stok — Veri sözlüğü

Vaka veri paketi:

- **donenVarlik:** 1650000
- **stok:** 940000
- **kvBorc:** 980000
- **nakit:** 170000
- **alacak:** 410000

oranlarla yanlış teşhisi düzeltme başlamadan önce donenVarlik, stok, kvBorc alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. yedek parça toptancısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Asit-Test Oranı modeline girmez.

## Asit-test — Hesap izi

1. “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” sorusuyla ilgisiz alanları ayır; Asit-Test Oranı girdilerini eşleştir.
2. hızlı likit varlıklar formülünü yaz: **Asit-test = (Dönen varlık − Stok) / Kısa vadeli borç**.
3. yedek parça toptancısı baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. likidite katmanları gösterge paneli üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. oranlarla yanlış teşhisi düzeltme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## oranlarla yanlış teşhisi düzeltme — Aksiyon kartı

Asit-Test Oranı sonucu yedek parça toptancısı için basit bir “iyi/kötü” etiketi değildir. Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi? sorusunda hızlı likit varlıklar, likidite katmanları gösterge paneli üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce stok tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yüksek stok nedeniyle cari oranın güvenli görünmesi problemine ilişkin operasyonel açıklama aranır.

## satılamayan stoku likit saymak — Kontrol testi

yedek parça toptancısı vakasındaki en tehlikeli hata **satılamayan stoku likit saymak**. Asit-Test Oranı; donenVarlik eksikken, dönemler uyumsuzken veya “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. hızlı likit varlıklar çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-03
- Model: [Asit-Test Oranı](/app/finance/models/QUICK_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: oranlarla yanlış teşhisi düzeltme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** satılamayan stoku likit saymak

**Görev:** oranlarla yanlış teşhisi düzeltme


### 3. Oran Panosunda Eşik Yerine Eğilim

*Bilgi nesnesi: `P6-C03-KO3`*

**Problem:** Yüksek stok nedeniyle cari oranın güvenli görünmesi

**Kısa yanıt:** Değişim = Cari dönem oranı − Önceki dönem oranı

**Özet:** trend ve emsal bağlamı odağında yedek parça toptancısı için uygulamalı karar nesnesi.

# Oran Panosunda Eşik Yerine Eğilim

## yedek parça toptancısı: Karar günlüğü

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. yedek parça toptancısı yönetimi şu durumla karşı karşıya: Yüksek stok nedeniyle cari oranın güvenli görünmesi. Bu bilgi nesnesinin odağı **trend ve emsal bağlamı** ve cevaplanacak karar şudur: **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?**

## trend ve emsal bağlamı — İddia

Oran Panosunda Eşik Yerine Eğilim, yedek parça toptancısı verisini tek başına bir oran olarak değil, **Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Değişim = Cari dönem oranı − Önceki dönem oranı. trend ve emsal bağlamı sonucu; dönem, para birimi, donenVarlik kaynağı ve yedek parça toptancısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Cari Oran:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Cari Oran. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## donenVarlik ve stok — Deliller

Vaka veri paketi:

- **donenVarlik:** 1650000
- **stok:** 940000
- **kvBorc:** 980000
- **nakit:** 170000
- **alacak:** 410000

oranlarla yanlış teşhisi düzeltme başlamadan önce donenVarlik, stok, kvBorc alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. yedek parça toptancısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Cari Oran modeline girmez.

## Değişim — Sayısal deney

1. “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” sorusuyla ilgisiz alanları ayır; Cari Oran girdilerini eşleştir.
2. trend ve emsal bağlamı formülünü yaz: **Değişim = Cari dönem oranı − Önceki dönem oranı**.
3. yedek parça toptancısı baz senaryosunu çalıştır; hesap izindeki ara adımı donenVarlik verisiyle karşılaştır.
4. likidite katmanları gösterge paneli üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. oranlarla yanlış teşhisi düzeltme sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## oranlarla yanlış teşhisi düzeltme — Karşı görüş

Cari Oran sonucu yedek parça toptancısı için basit bir “iyi/kötü” etiketi değildir. Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi? sorusunda trend ve emsal bağlamı, likidite katmanları gösterge paneli üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce stok tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yüksek stok nedeniyle cari oranın güvenli görünmesi problemine ilişkin operasyonel açıklama aranır.

## sektör ve mevsimselliği yok saymak — Kapanış ölçütü

yedek parça toptancısı vakasındaki en tehlikeli hata **sektör ve mevsimselliği yok saymak**. Cari Oran; donenVarlik eksikken, dönemler uyumsuzken veya “Tedarikçi vadesi uzatılmadan yeni stok alınabilir mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. trend ve emsal bağlamı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-03
- Model: [Cari Oran](/app/finance/models/CURRENT_RATIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: oranlarla yanlış teşhisi düzeltme

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** sektör ve mevsimselliği yok saymak

**Görev:** oranlarla yanlış teşhisi düzeltme


---

## DuPont ile Karlılığın Kaynağı

**Slug:** `phase-6-04-dupont-ile-karliligin-kaynagi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

mobilya üreticisi vakası üzerinden roe yükselirken borçluluğun da hızla artması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?
- DuPont ayrıştırması
- ROE kök neden ayrıştırması

### 1. ROE’yi Üç Motora Ayırmak

*Bilgi nesnesi: `P6-C04-KO1`*

**Problem:** ROE yükselirken borçluluğun da hızla artması

**Kısa yanıt:** ROE = Net marj × Varlık devir hızı × Özkaynak çarpanı

**Özet:** DuPont ayrıştırması odağında mobilya üreticisi için uygulamalı karar nesnesi.

# ROE’yi Üç Motora Ayırmak

## mobilya üreticisi: Operasyon odası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. mobilya üreticisi yönetimi şu durumla karşı karşıya: ROE yükselirken borçluluğun da hızla artması. Bu bilgi nesnesinin odağı **DuPont ayrıştırması** ve cevaplanacak karar şudur: **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?**

## DuPont ayrıştırması — Neden-sonuç zinciri

ROE’yi Üç Motora Ayırmak, mobilya üreticisi verisini tek başına bir oran olarak değil, **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. ROE = Net marj × Varlık devir hızı × Özkaynak çarpanı. DuPont ayrıştırması sonucu; dönem, para birimi, netKar kaynağı ve mobilya üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Üç Aşamalı DuPont:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Kâr Marjı, Aktif Devir Hızı, Özsermaye Çarpanı, Özsermaye Kârlılığı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## netKar ve satis — Veri sözlüğü

Vaka veri paketi:

- **netKar:** 640000
- **satis:** 8400000
- **varlik:** 6200000
- **ozkaynak:** 2100000

ROE kök neden ayrıştırması başlamadan önce netKar, satis, varlik alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mobilya üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Üç Aşamalı DuPont modeline girmez.

## ROE — Hesap izi

1. “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” sorusuyla ilgisiz alanları ayır; Üç Aşamalı DuPont girdilerini eşleştir.
2. DuPont ayrıştırması formülünü yaz: **ROE = Net marj × Varlık devir hızı × Özkaynak çarpanı**.
3. mobilya üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı netKar verisiyle karşılaştır.
4. DuPont sürücü ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. ROE kök neden ayrıştırması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## ROE kök neden ayrıştırması — Aksiyon kartı

Üç Aşamalı DuPont sonucu mobilya üreticisi için basit bir “iyi/kötü” etiketi değildir. Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı? sorusunda DuPont ayrıştırması, DuPont sürücü ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra roe yükselirken borçluluğun da hızla artması problemine ilişkin operasyonel açıklama aranır.

## dönem sonu bakiyeleri ortalama yerine kullanmak — Kontrol testi

mobilya üreticisi vakasındaki en tehlikeli hata **dönem sonu bakiyeleri ortalama yerine kullanmak**. Üç Aşamalı DuPont; netKar eksikken, dönemler uyumsuzken veya “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. DuPont ayrıştırması çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-04
- Model: [Üç Aşamalı DuPont](/app/finance/models/DUPONT_3_STEP)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: ROE kök neden ayrıştırması

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** dönem sonu bakiyeleri ortalama yerine kullanmak

**Görev:** ROE kök neden ayrıştırması


### 2. Marj mı Devir Hızı mı?

*Bilgi nesnesi: `P6-C04-KO2`*

**Problem:** ROE yükselirken borçluluğun da hızla artması

**Kısa yanıt:** Varlık devir hızı = Satış / Ortalama varlık

**Özet:** operasyonel verim köprüsü odağında mobilya üreticisi için uygulamalı karar nesnesi.

# Marj mı Devir Hızı mı?

## mobilya üreticisi: Karar günlüğü

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. mobilya üreticisi yönetimi şu durumla karşı karşıya: ROE yükselirken borçluluğun da hızla artması. Bu bilgi nesnesinin odağı **operasyonel verim köprüsü** ve cevaplanacak karar şudur: **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?**

## operasyonel verim köprüsü — İddia

Marj mı Devir Hızı mı?, mobilya üreticisi verisini tek başına bir oran olarak değil, **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Varlık devir hızı = Satış / Ortalama varlık. operasyonel verim köprüsü sonucu; dönem, para birimi, netKar kaynağı ve mobilya üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Üç Aşamalı DuPont:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Kâr Marjı, Aktif Devir Hızı, Özsermaye Çarpanı, Özsermaye Kârlılığı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## netKar ve satis — Deliller

Vaka veri paketi:

- **netKar:** 640000
- **satis:** 8400000
- **varlik:** 6200000
- **ozkaynak:** 2100000

ROE kök neden ayrıştırması başlamadan önce netKar, satis, varlik alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mobilya üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Üç Aşamalı DuPont modeline girmez.

## Varlık devir hızı — Sayısal deney

1. “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” sorusuyla ilgisiz alanları ayır; Üç Aşamalı DuPont girdilerini eşleştir.
2. operasyonel verim köprüsü formülünü yaz: **Varlık devir hızı = Satış / Ortalama varlık**.
3. mobilya üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı netKar verisiyle karşılaştır.
4. DuPont sürücü ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. ROE kök neden ayrıştırması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## ROE kök neden ayrıştırması — Karşı görüş

Üç Aşamalı DuPont sonucu mobilya üreticisi için basit bir “iyi/kötü” etiketi değildir. Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı? sorusunda operasyonel verim köprüsü, DuPont sürücü ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra roe yükselirken borçluluğun da hızla artması problemine ilişkin operasyonel açıklama aranır.

## marj artışını hacim artışı sanmak — Kapanış ölçütü

mobilya üreticisi vakasındaki en tehlikeli hata **marj artışını hacim artışı sanmak**. Üç Aşamalı DuPont; netKar eksikken, dönemler uyumsuzken veya “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. operasyonel verim köprüsü çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-04
- Model: [Üç Aşamalı DuPont](/app/finance/models/DUPONT_3_STEP)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: ROE kök neden ayrıştırması

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** marj artışını hacim artışı sanmak

**Görev:** ROE kök neden ayrıştırması


### 3. Kaldıraçla Gelen Sahte Rahatlık

*Bilgi nesnesi: `P6-C04-KO3`*

**Problem:** ROE yükselirken borçluluğun da hızla artması

**Kısa yanıt:** Özkaynak çarpanı = Ortalama varlık / Ortalama özkaynak

**Özet:** borç kaynaklı büyütme etkisi odağında mobilya üreticisi için uygulamalı karar nesnesi.

# Kaldıraçla Gelen Sahte Rahatlık

## mobilya üreticisi: Karar masası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. mobilya üreticisi yönetimi şu durumla karşı karşıya: ROE yükselirken borçluluğun da hızla artması. Bu bilgi nesnesinin odağı **borç kaynaklı büyütme etkisi** ve cevaplanacak karar şudur: **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?**

## borç kaynaklı büyütme etkisi — Kavramı yerleştir

Kaldıraçla Gelen Sahte Rahatlık, mobilya üreticisi verisini tek başına bir oran olarak değil, **Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Özkaynak çarpanı = Ortalama varlık / Ortalama özkaynak. borç kaynaklı büyütme etkisi sonucu; dönem, para birimi, netKar kaynağı ve mobilya üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Üç Aşamalı DuPont:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Kâr Marjı, Aktif Devir Hızı, Özsermaye Çarpanı, Özsermaye Kârlılığı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## netKar ve satis — Veriyi hazırla

Vaka veri paketi:

- **netKar:** 640000
- **satis:** 8400000
- **varlik:** 6200000
- **ozkaynak:** 2100000

ROE kök neden ayrıştırması başlamadan önce netKar, satis, varlik alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. mobilya üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Üç Aşamalı DuPont modeline girmez.

## Özkaynak çarpanı — Hesabı yürüt

1. “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” sorusuyla ilgisiz alanları ayır; Üç Aşamalı DuPont girdilerini eşleştir.
2. borç kaynaklı büyütme etkisi formülünü yaz: **Özkaynak çarpanı = Ortalama varlık / Ortalama özkaynak**.
3. mobilya üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı netKar verisiyle karşılaştır.
4. DuPont sürücü ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. ROE kök neden ayrıştırması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## ROE kök neden ayrıştırması — Sonucu oku

Üç Aşamalı DuPont sonucu mobilya üreticisi için basit bir “iyi/kötü” etiketi değildir. Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı? sorusunda borç kaynaklı büyütme etkisi, DuPont sürücü ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra roe yükselirken borçluluğun da hızla artması problemine ilişkin operasyonel açıklama aranır.

## yüksek ROE’yi risksiz başarı saymak — Sınır çiz

mobilya üreticisi vakasındaki en tehlikeli hata **yüksek ROE’yi risksiz başarı saymak**. Üç Aşamalı DuPont; netKar eksikken, dönemler uyumsuzken veya “Karlılık artışı operasyonel mi, kaldıraç kaynaklı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. borç kaynaklı büyütme etkisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-04
- Model: [Üç Aşamalı DuPont](/app/finance/models/DUPONT_3_STEP)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: ROE kök neden ayrıştırması

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** yüksek ROE’yi risksiz başarı saymak

**Görev:** ROE kök neden ayrıştırması


---
