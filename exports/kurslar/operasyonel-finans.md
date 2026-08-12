# Operasyonel Finans

Bu dosya "Operasyonel Finans" kategorisindeki **1** yayınlanmış kursu içerir.

---

## Stok ve Alacak Verimliliği

**Slug:** `phase-6-07-stok-ve-alacak-verimliligi` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

medikal sarf malzemesi satıcısı vakası üzerinden bazı stokların eskimesi ve hastane alacaklarının uzaması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?
- stok yaşlandırma
- SKU ve müşteri segmentasyonu

### 1. DIO ile Stok Yaşını Okumak

*Bilgi nesnesi: `P6-C07-KO1`*

**Problem:** Bazı stokların eskimesi ve hastane alacaklarının uzaması

**Kısa yanıt:** DIO = Ortalama stok / Satılan mal maliyeti × Gün

**Özet:** stok yaşlandırma odağında medikal sarf malzemesi satıcısı için uygulamalı karar nesnesi.

# DIO ile Stok Yaşını Okumak

## medikal sarf malzemesi satıcısı: Sahadan sinyal

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. medikal sarf malzemesi satıcısı yönetimi şu durumla karşı karşıya: Bazı stokların eskimesi ve hastane alacaklarının uzaması. Bu bilgi nesnesinin odağı **stok yaşlandırma** ve cevaplanacak karar şudur: **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?**

## stok yaşlandırma — Teşhis merceği

DIO ile Stok Yaşını Okumak, medikal sarf malzemesi satıcısı verisini tek başına bir oran olarak değil, **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. DIO = Ortalama stok / Satılan mal maliyeti × Gün. stok yaşlandırma sonucu; dönem, para birimi, ortStok kaynağı ve medikal sarf malzemesi satıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Stokta Kalma Süresi (DIO):** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: DIO. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ortStok ve satilanMalMaliyeti — Kanıt paketi

Vaka veri paketi:

- **ortStok:** 2200000
- **satilanMalMaliyeti:** 7300000
- **ortAlacak:** 1850000
- **krediliSatis:** 9100000
- **ortBorc:** 970000

SKU ve müşteri segmentasyonu başlamadan önce ortStok, satilanMalMaliyeti, ortAlacak alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. medikal sarf malzemesi satıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Stokta Kalma Süresi (DIO) modeline girmez.

## DIO — Adım adım çözüm

1. “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” sorusuyla ilgisiz alanları ayır; Stokta Kalma Süresi (DIO) girdilerini eşleştir.
2. stok yaşlandırma formülünü yaz: **DIO = Ortalama stok / Satılan mal maliyeti × Gün**.
3. medikal sarf malzemesi satıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı ortStok verisiyle karşılaştır.
4. üçlü yaşlandırma ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. SKU ve müşteri segmentasyonu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## SKU ve müşteri segmentasyonu — Karar eşiği

Stokta Kalma Süresi (DIO) sonucu medikal sarf malzemesi satıcısı için basit bir “iyi/kötü” etiketi değildir. Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı? sorusunda stok yaşlandırma, üçlü yaşlandırma ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satilanMalMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra bazı stokların eskimesi ve hastane alacaklarının uzaması problemine ilişkin operasyonel açıklama aranır.

## ortalama yerine tek gün bakiyesi kullanmak — Yanılma payı

medikal sarf malzemesi satıcısı vakasındaki en tehlikeli hata **ortalama yerine tek gün bakiyesi kullanmak**. Stokta Kalma Süresi (DIO); ortStok eksikken, dönemler uyumsuzken veya “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. stok yaşlandırma çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-07
- Model: [Stokta Kalma Süresi (DIO)](/app/finance/models/DIO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: SKU ve müşteri segmentasyonu

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** ortalama yerine tek gün bakiyesi kullanmak

**Görev:** SKU ve müşteri segmentasyonu


### 2. DSO ile Tahsilat Disiplini

*Bilgi nesnesi: `P6-C07-KO2`*

**Problem:** Bazı stokların eskimesi ve hastane alacaklarının uzaması

**Kısa yanıt:** DSO = Ortalama alacak / Kredili satış × Gün

**Özet:** müşteri vade davranışı odağında medikal sarf malzemesi satıcısı için uygulamalı karar nesnesi.

# DSO ile Tahsilat Disiplini

## medikal sarf malzemesi satıcısı: Yönetim sorusu

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. medikal sarf malzemesi satıcısı yönetimi şu durumla karşı karşıya: Bazı stokların eskimesi ve hastane alacaklarının uzaması. Bu bilgi nesnesinin odağı **müşteri vade davranışı** ve cevaplanacak karar şudur: **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?**

## müşteri vade davranışı — Harita

DSO ile Tahsilat Disiplini, medikal sarf malzemesi satıcısı verisini tek başına bir oran olarak değil, **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. DSO = Ortalama alacak / Kredili satış × Gün. müşteri vade davranışı sonucu; dönem, para birimi, ortStok kaynağı ve medikal sarf malzemesi satıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Tahsilat Süresi (DSO):** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: DSO. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ortStok ve satilanMalMaliyeti — Ölçüm protokolü

Vaka veri paketi:

- **ortStok:** 2200000
- **satilanMalMaliyeti:** 7300000
- **ortAlacak:** 1850000
- **krediliSatis:** 9100000
- **ortBorc:** 970000

SKU ve müşteri segmentasyonu başlamadan önce ortStok, satilanMalMaliyeti, ortAlacak alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. medikal sarf malzemesi satıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Tahsilat Süresi (DSO) modeline girmez.

## DSO — Uygulama

1. “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” sorusuyla ilgisiz alanları ayır; Tahsilat Süresi (DSO) girdilerini eşleştir.
2. müşteri vade davranışı formülünü yaz: **DSO = Ortalama alacak / Kredili satış × Gün**.
3. medikal sarf malzemesi satıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı ortStok verisiyle karşılaştır.
4. üçlü yaşlandırma ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. SKU ve müşteri segmentasyonu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## SKU ve müşteri segmentasyonu — Gösterge paneli

Tahsilat Süresi (DSO) sonucu medikal sarf malzemesi satıcısı için basit bir “iyi/kötü” etiketi değildir. Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı? sorusunda müşteri vade davranışı, üçlü yaşlandırma ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satilanMalMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra bazı stokların eskimesi ve hastane alacaklarının uzaması problemine ilişkin operasyonel açıklama aranır.

## peşin satışları kredili paydaya katmak — Etik fren

medikal sarf malzemesi satıcısı vakasındaki en tehlikeli hata **peşin satışları kredili paydaya katmak**. Tahsilat Süresi (DSO); ortStok eksikken, dönemler uyumsuzken veya “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. müşteri vade davranışı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-07
- Model: [Tahsilat Süresi (DSO)](/app/finance/models/DSO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: SKU ve müşteri segmentasyonu

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** peşin satışları kredili paydaya katmak

**Görev:** SKU ve müşteri segmentasyonu


### 3. DPO ve Tedarikçi Güven Dengesi

*Bilgi nesnesi: `P6-C07-KO3`*

**Problem:** Bazı stokların eskimesi ve hastane alacaklarının uzaması

**Kısa yanıt:** DPO = Ortalama ticari borç / Kredili alış × Gün

**Özet:** tedarikçi ödeme ritmi odağında medikal sarf malzemesi satıcısı için uygulamalı karar nesnesi.

# DPO ve Tedarikçi Güven Dengesi

## medikal sarf malzemesi satıcısı: Vaka açılışı

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. medikal sarf malzemesi satıcısı yönetimi şu durumla karşı karşıya: Bazı stokların eskimesi ve hastane alacaklarının uzaması. Bu bilgi nesnesinin odağı **tedarikçi ödeme ritmi** ve cevaplanacak karar şudur: **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?**

## tedarikçi ödeme ritmi — Mekanik

DPO ve Tedarikçi Güven Dengesi, medikal sarf malzemesi satıcısı verisini tek başına bir oran olarak değil, **Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. DPO = Ortalama ticari borç / Kredili alış × Gün. tedarikçi ödeme ritmi sonucu; dönem, para birimi, ortStok kaynağı ve medikal sarf malzemesi satıcısı çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Tedarikçi Ödeme Süresi (DPO):** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: DPO. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## ortStok ve satilanMalMaliyeti — Girdi kontrolü

Vaka veri paketi:

- **ortStok:** 2200000
- **satilanMalMaliyeti:** 7300000
- **ortAlacak:** 1850000
- **krediliSatis:** 9100000
- **ortBorc:** 970000

SKU ve müşteri segmentasyonu başlamadan önce ortStok, satilanMalMaliyeti, ortAlacak alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. medikal sarf malzemesi satıcısı belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Tedarikçi Ödeme Süresi (DPO) modeline girmez.

## DPO — Çalışma notu

1. “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” sorusuyla ilgisiz alanları ayır; Tedarikçi Ödeme Süresi (DPO) girdilerini eşleştir.
2. tedarikçi ödeme ritmi formülünü yaz: **DPO = Ortalama ticari borç / Kredili alış × Gün**.
3. medikal sarf malzemesi satıcısı baz senaryosunu çalıştır; hesap izindeki ara adımı ortStok verisiyle karşılaştır.
4. üçlü yaşlandırma ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. SKU ve müşteri segmentasyonu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## SKU ve müşteri segmentasyonu — Tartışma

Tedarikçi Ödeme Süresi (DPO) sonucu medikal sarf malzemesi satıcısı için basit bir “iyi/kötü” etiketi değildir. Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı? sorusunda tedarikçi ödeme ritmi, üçlü yaşlandırma ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce satilanMalMaliyeti tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra bazı stokların eskimesi ve hastane alacaklarının uzaması problemine ilişkin operasyonel açıklama aranır.

## gecikmeyi pazarlık edilmiş vade sanmak — Ne zaman kullanma?

medikal sarf malzemesi satıcısı vakasındaki en tehlikeli hata **gecikmeyi pazarlık edilmiş vade sanmak**. Tedarikçi Ödeme Süresi (DPO); ortStok eksikken, dönemler uyumsuzken veya “Hangi SKU ve müşteri grubunda nakit aksiyonu alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. tedarikçi ödeme ritmi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-07
- Model: [Tedarikçi Ödeme Süresi (DPO)](/app/finance/models/DPO)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: SKU ve müşteri segmentasyonu

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** gecikmeyi pazarlık edilmiş vade sanmak

**Görev:** SKU ve müşteri segmentasyonu


---
