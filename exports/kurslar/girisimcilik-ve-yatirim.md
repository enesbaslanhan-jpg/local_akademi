# Girişimcilik ve Yatırım

Bu dosya "Girişimcilik ve Yatırım" kategorisindeki **2** yayınlanmış kursu içerir.

---

## Girişim Finansmanı

**Slug:** `phase-6-17-burn-rate-ve-runway` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 6

Nakit yakma hızını, ne kadar ömrün kaldığını ve yatırım aldığında payının ne olacağını hesaplarsın.

**Kazanımlar**

- İşe alım planı korunmalı mı, yavaşlatılmalı mı?
- aylık nakit tüketimi
- işe alım senaryosu kararı

### 1. Gross Burn ve Net Burn Ayrımı

*Bilgi nesnesi: `P6-C17-KO1`*

**Problem:** Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi

**Kısa yanıt:** Gross burn = Aylık nakit çıkışı

**Özet:** aylık nakit tüketimi odağında lojistik teknoloji girişimi için uygulamalı karar nesnesi.

# Gross Burn ve Net Burn Ayrımı

## lojistik teknoloji girişimi: Karar günlüğü

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. lojistik teknoloji girişimi yönetimi şu durumla karşı karşıya: Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi. Bu bilgi nesnesinin odağı **aylık nakit tüketimi** ve cevaplanacak karar şudur: **İşe alım planı korunmalı mı, yavaşlatılmalı mı?**

## aylık nakit tüketimi — İddia

Gross Burn ve Net Burn Ayrımı, lojistik teknoloji girişimi verisini tek başına bir oran olarak değil, **İşe alım planı korunmalı mı, yavaşlatılmalı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Gross burn = Aylık nakit çıkışı. aylık nakit tüketimi sonucu; dönem, para birimi, nakit kaynağı ve lojistik teknoloji girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Brüt Nakit Tüketimi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Brüt Burn. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikCikis — Deliller

Vaka veri paketi:

- **nakit:** 7800000
- **aylikCikis:** 1650000
- **aylikGiris:** 720000
- **yeniIseAlim:** 290000

işe alım senaryosu kararı başlamadan önce nakit, aylikCikis, aylikGiris alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. lojistik teknoloji girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Brüt Nakit Tüketimi modeline girmez.

## Gross burn — Sayısal deney

1. “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” sorusuyla ilgisiz alanları ayır; Brüt Nakit Tüketimi girdilerini eşleştir.
2. aylık nakit tüketimi formülünü yaz: **Gross burn = Aylık nakit çıkışı**.
3. lojistik teknoloji girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. aylık nakit pist grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. işe alım senaryosu kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## işe alım senaryosu kararı — Karşı görüş

Brüt Nakit Tüketimi sonucu lojistik teknoloji girişimi için basit bir “iyi/kötü” etiketi değildir. İşe alım planı korunmalı mı, yavaşlatılmalı mı? sorusunda aylık nakit tüketimi, aylık nakit pist grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikCikis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi problemine ilişkin operasyonel açıklama aranır.

## tek ayı normal kabul etmek — Kapanış ölçütü

lojistik teknoloji girişimi vakasındaki en tehlikeli hata **tek ayı normal kabul etmek**. Brüt Nakit Tüketimi; nakit eksikken, dönemler uyumsuzken veya “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. aylık nakit tüketimi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-17
- Model: [Brüt Nakit Tüketimi](/app/finance/models/GROSS_BURN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: işe alım senaryosu kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** tek ayı normal kabul etmek

**Görev:** işe alım senaryosu kararı


### 2. Runway Takvimi

*Bilgi nesnesi: `P6-C17-KO2`*

**Problem:** Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi

**Kısa yanıt:** Net burn = Çıkış − Giriş

**Özet:** nakit bitiş ufku odağında lojistik teknoloji girişimi için uygulamalı karar nesnesi.

# Runway Takvimi

## lojistik teknoloji girişimi: Karar masası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. lojistik teknoloji girişimi yönetimi şu durumla karşı karşıya: Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi. Bu bilgi nesnesinin odağı **nakit bitiş ufku** ve cevaplanacak karar şudur: **İşe alım planı korunmalı mı, yavaşlatılmalı mı?**

## nakit bitiş ufku — Kavramı yerleştir

Runway Takvimi, lojistik teknoloji girişimi verisini tek başına bir oran olarak değil, **İşe alım planı korunmalı mı, yavaşlatılmalı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Net burn = Çıkış − Giriş. nakit bitiş ufku sonucu; dönem, para birimi, nakit kaynağı ve lojistik teknoloji girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Nakit Tüketimi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Burn. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikCikis — Veriyi hazırla

Vaka veri paketi:

- **nakit:** 7800000
- **aylikCikis:** 1650000
- **aylikGiris:** 720000
- **yeniIseAlim:** 290000

işe alım senaryosu kararı başlamadan önce nakit, aylikCikis, aylikGiris alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. lojistik teknoloji girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Nakit Tüketimi modeline girmez.

## Net burn — Hesabı yürüt

1. “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” sorusuyla ilgisiz alanları ayır; Net Nakit Tüketimi girdilerini eşleştir.
2. nakit bitiş ufku formülünü yaz: **Net burn = Çıkış − Giriş**.
3. lojistik teknoloji girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. aylık nakit pist grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. işe alım senaryosu kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## işe alım senaryosu kararı — Sonucu oku

Net Nakit Tüketimi sonucu lojistik teknoloji girişimi için basit bir “iyi/kötü” etiketi değildir. İşe alım planı korunmalı mı, yavaşlatılmalı mı? sorusunda nakit bitiş ufku, aylık nakit pist grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikCikis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi problemine ilişkin operasyonel açıklama aranır.

## blokeli nakdi kullanılabilir saymak — Sınır çiz

lojistik teknoloji girişimi vakasındaki en tehlikeli hata **blokeli nakdi kullanılabilir saymak**. Net Nakit Tüketimi; nakit eksikken, dönemler uyumsuzken veya “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. nakit bitiş ufku çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-17
- Model: [Net Nakit Tüketimi](/app/finance/models/NET_BURN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: işe alım senaryosu kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** blokeli nakdi kullanılabilir saymak

**Görev:** işe alım senaryosu kararı


### 3. Burn Multiple ile Harcama Kalitesi

*Bilgi nesnesi: `P6-C17-KO3`*

**Problem:** Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi

**Kısa yanıt:** Runway = Kullanılabilir nakit / Net burn

**Özet:** büyüme başına yakılan nakit odağında lojistik teknoloji girişimi için uygulamalı karar nesnesi.

# Burn Multiple ile Harcama Kalitesi

## lojistik teknoloji girişimi: Sahadan sinyal

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. lojistik teknoloji girişimi yönetimi şu durumla karşı karşıya: Büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi. Bu bilgi nesnesinin odağı **büyüme başına yakılan nakit** ve cevaplanacak karar şudur: **İşe alım planı korunmalı mı, yavaşlatılmalı mı?**

## büyüme başına yakılan nakit — Teşhis merceği

Burn Multiple ile Harcama Kalitesi, lojistik teknoloji girişimi verisini tek başına bir oran olarak değil, **İşe alım planı korunmalı mı, yavaşlatılmalı mı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Runway = Kullanılabilir nakit / Net burn. büyüme başına yakılan nakit sonucu; dönem, para birimi, nakit kaynağı ve lojistik teknoloji girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dayanma Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Runway. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikCikis — Kanıt paketi

Vaka veri paketi:

- **nakit:** 7800000
- **aylikCikis:** 1650000
- **aylikGiris:** 720000
- **yeniIseAlim:** 290000

işe alım senaryosu kararı başlamadan önce nakit, aylikCikis, aylikGiris alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. lojistik teknoloji girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dayanma Süresi modeline girmez.

## Runway — Adım adım çözüm

1. “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” sorusuyla ilgisiz alanları ayır; Nakit Dayanma Süresi girdilerini eşleştir.
2. büyüme başına yakılan nakit formülünü yaz: **Runway = Kullanılabilir nakit / Net burn**.
3. lojistik teknoloji girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. aylık nakit pist grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. işe alım senaryosu kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## işe alım senaryosu kararı — Karar eşiği

Nakit Dayanma Süresi sonucu lojistik teknoloji girişimi için basit bir “iyi/kötü” etiketi değildir. İşe alım planı korunmalı mı, yavaşlatılmalı mı? sorusunda büyüme başına yakılan nakit, aylık nakit pist grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikCikis tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi problemine ilişkin operasyonel açıklama aranır.

## runway’i sabit sözleşme gibi sunmak — Yanılma payı

lojistik teknoloji girişimi vakasındaki en tehlikeli hata **runway’i sabit sözleşme gibi sunmak**. Nakit Dayanma Süresi; nakit eksikken, dönemler uyumsuzken veya “İşe alım planı korunmalı mı, yavaşlatılmalı mı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. büyüme başına yakılan nakit çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-17
- Model: [Nakit Dayanma Süresi](/app/finance/models/RUNWAY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: işe alım senaryosu kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)

> **Uyarı:** runway’i sabit sözleşme gibi sunmak

**Görev:** işe alım senaryosu kararı


### 4. Kilometre Taşı Bazlı Fon İhtiyacı

*Bilgi nesnesi: `P6-C18-KO1`*

**Problem:** Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı

**Kısa yanıt:** Fon ihtiyacı = Hedef dönem çıkışı − Mevcut kaynak

**Özet:** nakit açığı ve tampon odağında tarım teknolojisi girişimi için uygulamalı karar nesnesi.

# Kilometre Taşı Bazlı Fon İhtiyacı

## tarım teknolojisi girişimi: Karar masası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. tarım teknolojisi girişimi yönetimi şu durumla karşı karşıya: Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı. Bu bilgi nesnesinin odağı **nakit açığı ve tampon** ve cevaplanacak karar şudur: **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?**

## nakit açığı ve tampon — Kavramı yerleştir

Kilometre Taşı Bazlı Fon İhtiyacı, tarım teknolojisi girişimi verisini tek başına bir oran olarak değil, **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Fon ihtiyacı = Hedef dönem çıkışı − Mevcut kaynak. nakit açığı ve tampon sonucu; dönem, para birimi, mevcutNakit kaynağı ve tarım teknolojisi girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dayanma Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Runway. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutNakit ve aylikNetBurn — Veriyi hazırla

Vaka veri paketi:

- **mevcutNakit:** 4600000
- **aylikNetBurn:** 780000
- **hedefRunway:** 18
- **preMoney:** 64000000
- **yatirim:** 14000000

yatırım komitesi notu başlamadan önce mevcutNakit, aylikNetBurn, hedefRunway alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. tarım teknolojisi girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dayanma Süresi modeline girmez.

## Fon ihtiyacı — Hesabı yürüt

1. “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” sorusuyla ilgisiz alanları ayır; Nakit Dayanma Süresi girdilerini eşleştir.
2. nakit açığı ve tampon formülünü yaz: **Fon ihtiyacı = Hedef dönem çıkışı − Mevcut kaynak**.
3. tarım teknolojisi girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutNakit verisiyle karşılaştır.
4. fonlama–runway–seyrelme senaryo ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi notu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi notu — Sonucu oku

Nakit Dayanma Süresi sonucu tarım teknolojisi girişimi için basit bir “iyi/kötü” etiketi değildir. Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı? sorusunda nakit açığı ve tampon, fonlama–runway–seyrelme senaryo ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikNetBurn tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı problemine ilişkin operasyonel açıklama aranır.

## yalnız ortalama burn kullanmak — Sınır çiz

tarım teknolojisi girişimi vakasındaki en tehlikeli hata **yalnız ortalama burn kullanmak**. Nakit Dayanma Süresi; mevcutNakit eksikken, dönemler uyumsuzken veya “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. nakit açığı ve tampon çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-18
- Model: [Nakit Dayanma Süresi](/app/finance/models/RUNWAY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi notu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** yalnız ortalama burn kullanmak

**Görev:** yatırım komitesi notu


### 5. Pre-money ve Post-money Seyrelme

*Bilgi nesnesi: `P6-C18-KO2`*

**Problem:** Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı

**Kısa yanıt:** Post-money = Pre-money + Yatırım

**Özet:** pay oranı matematiği odağında tarım teknolojisi girişimi için uygulamalı karar nesnesi.

# Pre-money ve Post-money Seyrelme

## tarım teknolojisi girişimi: Sahadan sinyal

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. tarım teknolojisi girişimi yönetimi şu durumla karşı karşıya: Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı. Bu bilgi nesnesinin odağı **pay oranı matematiği** ve cevaplanacak karar şudur: **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?**

## pay oranı matematiği — Teşhis merceği

Pre-money ve Post-money Seyrelme, tarım teknolojisi girişimi verisini tek başına bir oran olarak değil, **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Post-money = Pre-money + Yatırım. pay oranı matematiği sonucu; dönem, para birimi, mevcutNakit kaynağı ve tarım teknolojisi girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Bugünkü Değer:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Bugünkü Değer, Girişlerin Bugünkü Değeri. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutNakit ve aylikNetBurn — Kanıt paketi

Vaka veri paketi:

- **mevcutNakit:** 4600000
- **aylikNetBurn:** 780000
- **hedefRunway:** 18
- **preMoney:** 64000000
- **yatirim:** 14000000

yatırım komitesi notu başlamadan önce mevcutNakit, aylikNetBurn, hedefRunway alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. tarım teknolojisi girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Bugünkü Değer modeline girmez.

## Post-money — Adım adım çözüm

1. “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” sorusuyla ilgisiz alanları ayır; Net Bugünkü Değer girdilerini eşleştir.
2. pay oranı matematiği formülünü yaz: **Post-money = Pre-money + Yatırım**.
3. tarım teknolojisi girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutNakit verisiyle karşılaştır.
4. fonlama–runway–seyrelme senaryo ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi notu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi notu — Karar eşiği

Net Bugünkü Değer sonucu tarım teknolojisi girişimi için basit bir “iyi/kötü” etiketi değildir. Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı? sorusunda pay oranı matematiği, fonlama–runway–seyrelme senaryo ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikNetBurn tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı problemine ilişkin operasyonel açıklama aranır.

## opsiyon havuzunu yok saymak — Yanılma payı

tarım teknolojisi girişimi vakasındaki en tehlikeli hata **opsiyon havuzunu yok saymak**. Net Bugünkü Değer; mevcutNakit eksikken, dönemler uyumsuzken veya “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. pay oranı matematiği çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-18
- Model: [Net Bugünkü Değer](/app/finance/models/NPV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi notu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** opsiyon havuzunu yok saymak

**Görev:** yatırım komitesi notu


### 6. Fonlama Senaryolarında Kontrol Hakları

*Bilgi nesnesi: `P6-C18-KO3`*

**Problem:** Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı

**Kısa yanıt:** Yatırımcı payı = Yatırım / Post-money

**Özet:** ekonomik ve yönetsel haklar odağında tarım teknolojisi girişimi için uygulamalı karar nesnesi.

# Fonlama Senaryolarında Kontrol Hakları

## tarım teknolojisi girişimi: Yönetim sorusu

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. tarım teknolojisi girişimi yönetimi şu durumla karşı karşıya: Ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı. Bu bilgi nesnesinin odağı **ekonomik ve yönetsel haklar** ve cevaplanacak karar şudur: **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?**

## ekonomik ve yönetsel haklar — Harita

Fonlama Senaryolarında Kontrol Hakları, tarım teknolojisi girişimi verisini tek başına bir oran olarak değil, **Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Yatırımcı payı = Yatırım / Post-money. ekonomik ve yönetsel haklar sonucu; dönem, para birimi, mevcutNakit kaynağı ve tarım teknolojisi girişimi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dayanma Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Runway. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## mevcutNakit ve aylikNetBurn — Ölçüm protokolü

Vaka veri paketi:

- **mevcutNakit:** 4600000
- **aylikNetBurn:** 780000
- **hedefRunway:** 18
- **preMoney:** 64000000
- **yatirim:** 14000000

yatırım komitesi notu başlamadan önce mevcutNakit, aylikNetBurn, hedefRunway alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. tarım teknolojisi girişimi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dayanma Süresi modeline girmez.

## Yatırımcı payı — Uygulama

1. “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” sorusuyla ilgisiz alanları ayır; Nakit Dayanma Süresi girdilerini eşleştir.
2. ekonomik ve yönetsel haklar formülünü yaz: **Yatırımcı payı = Yatırım / Post-money**.
3. tarım teknolojisi girişimi baz senaryosunu çalıştır; hesap izindeki ara adımı mevcutNakit verisiyle karşılaştır.
4. fonlama–runway–seyrelme senaryo ağacı üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. yatırım komitesi notu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## yatırım komitesi notu — Gösterge paneli

Nakit Dayanma Süresi sonucu tarım teknolojisi girişimi için basit bir “iyi/kötü” etiketi değildir. Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı? sorusunda ekonomik ve yönetsel haklar, fonlama–runway–seyrelme senaryo ağacı üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikNetBurn tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı problemine ilişkin operasyonel açıklama aranır.

## değerleme dışı sözleşme haklarını önemsiz görmek — Etik fren

tarım teknolojisi girişimi vakasındaki en tehlikeli hata **değerleme dışı sözleşme haklarını önemsiz görmek**. Nakit Dayanma Süresi; mevcutNakit eksikken, dönemler uyumsuzken veya “Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. ekonomik ve yönetsel haklar çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-18
- Model: [Nakit Dayanma Süresi](/app/finance/models/RUNWAY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: yatırım komitesi notu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [SPL — Geniş Kapsamlı Sermaye Piyasası Mevzuatı ve Meslek Kuralları](https://spl.com.tr/wp-content/uploads/2025/09/1002-Final.pdf)

> **Uyarı:** değerleme dışı sözleşme haklarını önemsiz görmek

**Görev:** yatırım komitesi notu


---

## Yatırım Kararını Değerlendir

**Slug:** `phase-6-22-npv-ve-irr-ile-yatirim-karari` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 9

Bir yatırımın veya işletmenin bugünkü değerini hesaplar, paranın maliyetini işin içine katarsın.

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


### 4. FCFF Tahminini Operasyonlardan Kurmak

*Bilgi nesnesi: `P6-C24-KO1`*

**Problem:** Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması

**Kısa yanıt:** FCFF = EBIT(1−T) + Amortisman − Yatırım − NİS artışı

**Özet:** faaliyet nakit akışı tahmini odağında endüstriyel yazılım şirketi için uygulamalı karar nesnesi.

# FCFF Tahminini Operasyonlardan Kurmak

## endüstriyel yazılım şirketi: Karar masası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. endüstriyel yazılım şirketi yönetimi şu durumla karşı karşıya: Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması. Bu bilgi nesnesinin odağı **faaliyet nakit akışı tahmini** ve cevaplanacak karar şudur: **Yatırım görüşmesinde savunulabilir değer aralığı nedir?**

## faaliyet nakit akışı tahmini — Kavramı yerleştir

FCFF Tahminini Operasyonlardan Kurmak, endüstriyel yazılım şirketi verisini tek başına bir oran olarak değil, **Yatırım görüşmesinde savunulabilir değer aralığı nedir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. FCFF = EBIT(1−T) + Amortisman − Yatırım − NİS artışı. faaliyet nakit akışı tahmini sonucu; dönem, para birimi, fcff1 kaynağı ve endüstriyel yazılım şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fcff1 ve buyume — Veriyi hazırla

Vaka veri paketi:

- **fcff1:** 12400000
- **buyume:** 0.18
- **yil:** 5
- **wacc:** 0.34
- **terminalBuyume:** 0.12
- **netBorc:** 18000000

değerleme aralığı savunması başlamadan önce fcff1, buyume, yil alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. endüstriyel yazılım şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## FCFF — Hesabı yürüt

1. “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. faaliyet nakit akışı tahmini formülünü yaz: **FCFF = EBIT(1−T) + Amortisman − Yatırım − NİS artışı**.
3. endüstriyel yazılım şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı fcff1 verisiyle karşılaştır.
4. DCF değer köprüsü ve duyarlılık ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. değerleme aralığı savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## değerleme aralığı savunması — Sonucu oku

Basitleştirilmiş WACC ve FCFF DCF sonucu endüstriyel yazılım şirketi için basit bir “iyi/kötü” etiketi değildir. Yatırım görüşmesinde savunulabilir değer aralığı nedir? sorusunda faaliyet nakit akışı tahmini, DCF değer köprüsü ve duyarlılık ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce buyume tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması problemine ilişkin operasyonel açıklama aranır.

## WACC ≤ terminal büyüme kullanmak — Sınır çiz

endüstriyel yazılım şirketi vakasındaki en tehlikeli hata **WACC ≤ terminal büyüme kullanmak**. Basitleştirilmiş WACC ve FCFF DCF; fcff1 eksikken, dönemler uyumsuzken veya “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. faaliyet nakit akışı tahmini çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-24
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: değerleme aralığı savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valuation.html)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** WACC ≤ terminal büyüme kullanmak

**Görev:** değerleme aralığı savunması


### 5. Terminal Değerin Ağırlığını Sınamak

*Bilgi nesnesi: `P6-C24-KO2`*

**Problem:** Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması

**Kısa yanıt:** Terminal değer = FCFF(n+1) / (WACC − g)

**Özet:** sürdürülebilir büyüme odağında endüstriyel yazılım şirketi için uygulamalı karar nesnesi.

# Terminal Değerin Ağırlığını Sınamak

## endüstriyel yazılım şirketi: Sahadan sinyal

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. endüstriyel yazılım şirketi yönetimi şu durumla karşı karşıya: Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması. Bu bilgi nesnesinin odağı **sürdürülebilir büyüme** ve cevaplanacak karar şudur: **Yatırım görüşmesinde savunulabilir değer aralığı nedir?**

## sürdürülebilir büyüme — Teşhis merceği

Terminal Değerin Ağırlığını Sınamak, endüstriyel yazılım şirketi verisini tek başına bir oran olarak değil, **Yatırım görüşmesinde savunulabilir değer aralığı nedir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Terminal değer = FCFF(n+1) / (WACC − g). sürdürülebilir büyüme sonucu; dönem, para birimi, fcff1 kaynağı ve endüstriyel yazılım şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fcff1 ve buyume — Kanıt paketi

Vaka veri paketi:

- **fcff1:** 12400000
- **buyume:** 0.18
- **yil:** 5
- **wacc:** 0.34
- **terminalBuyume:** 0.12
- **netBorc:** 18000000

değerleme aralığı savunması başlamadan önce fcff1, buyume, yil alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. endüstriyel yazılım şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## Terminal değer — Adım adım çözüm

1. “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. sürdürülebilir büyüme formülünü yaz: **Terminal değer = FCFF(n+1) / (WACC − g)**.
3. endüstriyel yazılım şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı fcff1 verisiyle karşılaştır.
4. DCF değer köprüsü ve duyarlılık ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. değerleme aralığı savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## değerleme aralığı savunması — Karar eşiği

Basitleştirilmiş WACC ve FCFF DCF sonucu endüstriyel yazılım şirketi için basit bir “iyi/kötü” etiketi değildir. Yatırım görüşmesinde savunulabilir değer aralığı nedir? sorusunda sürdürülebilir büyüme, DCF değer köprüsü ve duyarlılık ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce buyume tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması problemine ilişkin operasyonel açıklama aranır.

## terminal değeri kontrol etmemek — Yanılma payı

endüstriyel yazılım şirketi vakasındaki en tehlikeli hata **terminal değeri kontrol etmemek**. Basitleştirilmiş WACC ve FCFF DCF; fcff1 eksikken, dönemler uyumsuzken veya “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sürdürülebilir büyüme çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-24
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: değerleme aralığı savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valuation.html)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** terminal değeri kontrol etmemek

**Görev:** değerleme aralığı savunması


### 6. DCF Değer Aralığı ve Duyarlılık

*Bilgi nesnesi: `P6-C24-KO3`*

**Problem:** Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması

**Kısa yanıt:** Özsermaye değeri = Firma değeri − Net borç

**Özet:** WACC-büyüme matrisi odağında endüstriyel yazılım şirketi için uygulamalı karar nesnesi.

# DCF Değer Aralığı ve Duyarlılık

## endüstriyel yazılım şirketi: Yönetim sorusu

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. endüstriyel yazılım şirketi yönetimi şu durumla karşı karşıya: Büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması. Bu bilgi nesnesinin odağı **WACC-büyüme matrisi** ve cevaplanacak karar şudur: **Yatırım görüşmesinde savunulabilir değer aralığı nedir?**

## WACC-büyüme matrisi — Harita

DCF Değer Aralığı ve Duyarlılık, endüstriyel yazılım şirketi verisini tek başına bir oran olarak değil, **Yatırım görüşmesinde savunulabilir değer aralığı nedir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Özsermaye değeri = Firma değeri − Net borç. WACC-büyüme matrisi sonucu; dönem, para birimi, fcff1 kaynağı ve endüstriyel yazılım şirketi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Basitleştirilmiş WACC ve FCFF DCF:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Özsermaye Maliyeti, WACC, Firma Değeri - Baz, Özsermaye Değeri - Baz, Özsermaye Değeri - Düşük, Özsermaye Değeri - Yüksek. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fcff1 ve buyume — Ölçüm protokolü

Vaka veri paketi:

- **fcff1:** 12400000
- **buyume:** 0.18
- **yil:** 5
- **wacc:** 0.34
- **terminalBuyume:** 0.12
- **netBorc:** 18000000

değerleme aralığı savunması başlamadan önce fcff1, buyume, yil alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. endüstriyel yazılım şirketi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Basitleştirilmiş WACC ve FCFF DCF modeline girmez.

## Özsermaye değeri — Uygulama

1. “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” sorusuyla ilgisiz alanları ayır; Basitleştirilmiş WACC ve FCFF DCF girdilerini eşleştir.
2. WACC-büyüme matrisi formülünü yaz: **Özsermaye değeri = Firma değeri − Net borç**.
3. endüstriyel yazılım şirketi baz senaryosunu çalıştır; hesap izindeki ara adımı fcff1 verisiyle karşılaştır.
4. DCF değer köprüsü ve duyarlılık ısı haritası üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. değerleme aralığı savunması sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## değerleme aralığı savunması — Gösterge paneli

Basitleştirilmiş WACC ve FCFF DCF sonucu endüstriyel yazılım şirketi için basit bir “iyi/kötü” etiketi değildir. Yatırım görüşmesinde savunulabilir değer aralığı nedir? sorusunda WACC-büyüme matrisi, DCF değer köprüsü ve duyarlılık ısı haritası üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce buyume tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra büyüme ve terminal değer varsayımlarının şirket değerini aşırı oynatması problemine ilişkin operasyonel açıklama aranır.

## tek nokta değeri kesin fiyat gibi sunmak — Etik fren

endüstriyel yazılım şirketi vakasındaki en tehlikeli hata **tek nokta değeri kesin fiyat gibi sunmak**. Basitleştirilmiş WACC ve FCFF DCF; fcff1 eksikken, dönemler uyumsuzken veya “Yatırım görüşmesinde savunulabilir değer aralığı nedir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. WACC-büyüme matrisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-24
- Model: [Basitleştirilmiş WACC ve FCFF DCF](/app/finance/models/WACC_FCFF_DCF)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: değerleme aralığı savunması

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/valuation.html)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** tek nokta değeri kesin fiyat gibi sunmak

**Görev:** değerleme aralığı savunması


### 7. CAPM ile Özsermaye Maliyeti

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


### 8. Borç ve Özsermaye Ağırlıkları

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


### 9. WACC Kullanım Sınırları

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
