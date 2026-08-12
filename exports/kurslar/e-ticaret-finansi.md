# E-Ticaret Finansı

Bu dosya "E-Ticaret Finansı" kategorisindeki **1** yayınlanmış kursu içerir.

---

## E-Ticarette Gerçek Sipariş Karlılığı

**Slug:** `phase-6-12-e-ticarette-gercek-siparis-karliligi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

pazar yerlerinde satış yapan ayakkabı markası vakası üzerinden komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Hangi kanal–ürün kombinasyonu büyütülmeli?
- sipariş kesinti şelalesi
- kanal kapat/büyüt vakası

### 1. Sipariş Ekonomisi Şelalesi

*Bilgi nesnesi: `P6-C12-KO1`*

**Problem:** Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi

**Kısa yanıt:** Sipariş kârı = Net satış − Ürün − Komisyon − Kargo − Ödeme − Kampanya

**Özet:** sipariş kesinti şelalesi odağında pazar yerlerinde satış yapan ayakkabı markası için uygulamalı karar nesnesi.

# Sipariş Ekonomisi Şelalesi

## pazar yerlerinde satış yapan ayakkabı markası: Karar masası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. pazar yerlerinde satış yapan ayakkabı markası yönetimi şu durumla karşı karşıya: Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi. Bu bilgi nesnesinin odağı **sipariş kesinti şelalesi** ve cevaplanacak karar şudur: **Hangi kanal–ürün kombinasyonu büyütülmeli?**

## sipariş kesinti şelalesi — Kavramı yerleştir

Sipariş Ekonomisi Şelalesi, pazar yerlerinde satış yapan ayakkabı markası verisini tek başına bir oran olarak değil, **Hangi kanal–ürün kombinasyonu büyütülmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Sipariş kârı = Net satış − Ürün − Komisyon − Kargo − Ödeme − Kampanya. sipariş kesinti şelalesi sonucu; dönem, para birimi, sepet kaynağı ve pazar yerlerinde satış yapan ayakkabı markası çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Sipariş Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Sipariş Katkısı, Sipariş Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sepet ve urunMaliyeti — Veriyi hazırla

Vaka veri paketi:

- **sepet:** 1850
- **urunMaliyeti:** 670
- **komisyon:** 0.19
- **kargo:** 94
- **odemeKesintisi:** 0.027
- **kupon:** 120
- **iadeOrani:** 0.17
- **iadeKaybi:** 310

kanal kapat/büyüt vakası başlamadan önce sepet, urunMaliyeti, komisyon alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. pazar yerlerinde satış yapan ayakkabı markası belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Sipariş Kârlılığı modeline girmez.

## Sipariş kârı — Hesabı yürüt

1. “Hangi kanal–ürün kombinasyonu büyütülmeli?” sorusuyla ilgisiz alanları ayır; Sipariş Kârlılığı girdilerini eşleştir.
2. sipariş kesinti şelalesi formülünü yaz: **Sipariş kârı = Net satış − Ürün − Komisyon − Kargo − Ödeme − Kampanya**.
3. pazar yerlerinde satış yapan ayakkabı markası baz senaryosunu çalıştır; hesap izindeki ara adımı sepet verisiyle karşılaştır.
4. sipariş kârı şelale grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kanal kapat/büyüt vakası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kanal kapat/büyüt vakası — Sonucu oku

Sipariş Kârlılığı sonucu pazar yerlerinde satış yapan ayakkabı markası için basit bir “iyi/kötü” etiketi değildir. Hangi kanal–ürün kombinasyonu büyütülmeli? sorusunda sipariş kesinti şelalesi, sipariş kârı şelale grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce urunMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi problemine ilişkin operasyonel açıklama aranır.

## KDV dahil ciroyu gelir sanmak — Sınır çiz

pazar yerlerinde satış yapan ayakkabı markası vakasındaki en tehlikeli hata **KDV dahil ciroyu gelir sanmak**. Sipariş Kârlılığı; sepet eksikken, dönemler uyumsuzken veya “Hangi kanal–ürün kombinasyonu büyütülmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sipariş kesinti şelalesi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-12
- Model: [Sipariş Kârlılığı](/app/finance/models/ORDER_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kanal kapat/büyüt vakası

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** KDV dahil ciroyu gelir sanmak

**Görev:** kanal kapat/büyüt vakası


### 2. İade Sonrası Beklenen Marj

*Bilgi nesnesi: `P6-C12-KO2`*

**Problem:** Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi

**Kısa yanıt:** Beklenen iade kaybı = İade oranı × İade başı net kayıp

**Özet:** olasılık ağırlıklı iade kaybı odağında pazar yerlerinde satış yapan ayakkabı markası için uygulamalı karar nesnesi.

# İade Sonrası Beklenen Marj

## pazar yerlerinde satış yapan ayakkabı markası: Sahadan sinyal

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. pazar yerlerinde satış yapan ayakkabı markası yönetimi şu durumla karşı karşıya: Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi. Bu bilgi nesnesinin odağı **olasılık ağırlıklı iade kaybı** ve cevaplanacak karar şudur: **Hangi kanal–ürün kombinasyonu büyütülmeli?**

## olasılık ağırlıklı iade kaybı — Teşhis merceği

İade Sonrası Beklenen Marj, pazar yerlerinde satış yapan ayakkabı markası verisini tek başına bir oran olarak değil, **Hangi kanal–ürün kombinasyonu büyütülmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Beklenen iade kaybı = İade oranı × İade başı net kayıp. olasılık ağırlıklı iade kaybı sonucu; dönem, para birimi, sepet kaynağı ve pazar yerlerinde satış yapan ayakkabı markası çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — İade Sonrası Gerçek Marj:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Beklenen İade Kaybı, İade Sonrası Katkı, Gerçek Marj. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sepet ve urunMaliyeti — Kanıt paketi

Vaka veri paketi:

- **sepet:** 1850
- **urunMaliyeti:** 670
- **komisyon:** 0.19
- **kargo:** 94
- **odemeKesintisi:** 0.027
- **kupon:** 120
- **iadeOrani:** 0.17
- **iadeKaybi:** 310

kanal kapat/büyüt vakası başlamadan önce sepet, urunMaliyeti, komisyon alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. pazar yerlerinde satış yapan ayakkabı markası belgesinden OCR ile gelen alan, kullanıcı onayı olmadan İade Sonrası Gerçek Marj modeline girmez.

## Beklenen iade kaybı — Adım adım çözüm

1. “Hangi kanal–ürün kombinasyonu büyütülmeli?” sorusuyla ilgisiz alanları ayır; İade Sonrası Gerçek Marj girdilerini eşleştir.
2. olasılık ağırlıklı iade kaybı formülünü yaz: **Beklenen iade kaybı = İade oranı × İade başı net kayıp**.
3. pazar yerlerinde satış yapan ayakkabı markası baz senaryosunu çalıştır; hesap izindeki ara adımı sepet verisiyle karşılaştır.
4. sipariş kârı şelale grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kanal kapat/büyüt vakası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kanal kapat/büyüt vakası — Karar eşiği

İade Sonrası Gerçek Marj sonucu pazar yerlerinde satış yapan ayakkabı markası için basit bir “iyi/kötü” etiketi değildir. Hangi kanal–ürün kombinasyonu büyütülmeli? sorusunda olasılık ağırlıklı iade kaybı, sipariş kârı şelale grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce urunMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi problemine ilişkin operasyonel açıklama aranır.

## ücretsiz kargoyu maliyetsiz sanmak — Yanılma payı

pazar yerlerinde satış yapan ayakkabı markası vakasındaki en tehlikeli hata **ücretsiz kargoyu maliyetsiz sanmak**. İade Sonrası Gerçek Marj; sepet eksikken, dönemler uyumsuzken veya “Hangi kanal–ürün kombinasyonu büyütülmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. olasılık ağırlıklı iade kaybı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-12
- Model: [İade Sonrası Gerçek Marj](/app/finance/models/POST_RETURN_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kanal kapat/büyüt vakası

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** ücretsiz kargoyu maliyetsiz sanmak

**Görev:** kanal kapat/büyüt vakası


### 3. Kanal–Ürün Karar Matrisi

*Bilgi nesnesi: `P6-C12-KO3`*

**Problem:** Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi

**Kısa yanıt:** İade sonrası marj = (Sipariş kârı − Beklenen iade kaybı) / Net satış

**Özet:** kanal ve SKU karşılaştırması odağında pazar yerlerinde satış yapan ayakkabı markası için uygulamalı karar nesnesi.

# Kanal–Ürün Karar Matrisi

## pazar yerlerinde satış yapan ayakkabı markası: Yönetim sorusu

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. pazar yerlerinde satış yapan ayakkabı markası yönetimi şu durumla karşı karşıya: Komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi. Bu bilgi nesnesinin odağı **kanal ve SKU karşılaştırması** ve cevaplanacak karar şudur: **Hangi kanal–ürün kombinasyonu büyütülmeli?**

## kanal ve SKU karşılaştırması — Harita

Kanal–Ürün Karar Matrisi, pazar yerlerinde satış yapan ayakkabı markası verisini tek başına bir oran olarak değil, **Hangi kanal–ürün kombinasyonu büyütülmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. İade sonrası marj = (Sipariş kârı − Beklenen iade kaybı) / Net satış. kanal ve SKU karşılaştırması sonucu; dönem, para birimi, sepet kaynağı ve pazar yerlerinde satış yapan ayakkabı markası çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Sipariş Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Sipariş Katkısı, Sipariş Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sepet ve urunMaliyeti — Ölçüm protokolü

Vaka veri paketi:

- **sepet:** 1850
- **urunMaliyeti:** 670
- **komisyon:** 0.19
- **kargo:** 94
- **odemeKesintisi:** 0.027
- **kupon:** 120
- **iadeOrani:** 0.17
- **iadeKaybi:** 310

kanal kapat/büyüt vakası başlamadan önce sepet, urunMaliyeti, komisyon alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. pazar yerlerinde satış yapan ayakkabı markası belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Sipariş Kârlılığı modeline girmez.

## İade sonrası marj — Uygulama

1. “Hangi kanal–ürün kombinasyonu büyütülmeli?” sorusuyla ilgisiz alanları ayır; Sipariş Kârlılığı girdilerini eşleştir.
2. kanal ve SKU karşılaştırması formülünü yaz: **İade sonrası marj = (Sipariş kârı − Beklenen iade kaybı) / Net satış**.
3. pazar yerlerinde satış yapan ayakkabı markası baz senaryosunu çalıştır; hesap izindeki ara adımı sepet verisiyle karşılaştır.
4. sipariş kârı şelale grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kanal kapat/büyüt vakası sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kanal kapat/büyüt vakası — Gösterge paneli

Sipariş Kârlılığı sonucu pazar yerlerinde satış yapan ayakkabı markası için basit bir “iyi/kötü” etiketi değildir. Hangi kanal–ürün kombinasyonu büyütülmeli? sorusunda kanal ve SKU karşılaştırması, sipariş kârı şelale grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce urunMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra komisyon, kargo, kupon ve iade sonrasında siparişlerin zarar üretmesi problemine ilişkin operasyonel açıklama aranır.

## iade oranını tüm ürünlere eşit uygulamak — Etik fren

pazar yerlerinde satış yapan ayakkabı markası vakasındaki en tehlikeli hata **iade oranını tüm ürünlere eşit uygulamak**. Sipariş Kârlılığı; sepet eksikken, dönemler uyumsuzken veya “Hangi kanal–ürün kombinasyonu büyütülmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kanal ve SKU karşılaştırması çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-12
- Model: [Sipariş Kârlılığı](/app/finance/models/ORDER_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kanal kapat/büyüt vakası

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** iade oranını tüm ürünlere eşit uygulamak

**Görev:** kanal kapat/büyüt vakası


---
