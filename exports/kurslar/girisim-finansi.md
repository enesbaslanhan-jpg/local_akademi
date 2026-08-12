# Girişim Finansı

Bu dosya "Girişim Finansı" kategorisindeki **2** yayınlanmış kursu içerir.

---

## Burn Rate ve Runway

**Slug:** `phase-6-17-burn-rate-ve-runway` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

lojistik teknoloji girişimi vakası üzerinden büyüme işe alımları sonrası nakit ömrünün belirsizleşmesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

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


---

## Fonlama İhtiyacı ve Seyrelme

**Slug:** `phase-6-18-fonlama-ihtiyaci-ve-seyrelme` · **Seviye:** advanced · **Süre:** ~105 dk · **Ders sayısı:** 3

tarım teknolojisi girişimi vakası üzerinden ürün sertifikasyonuna kadar nakit açığı ve kurucu payı baskısı problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Ne kadar fon, hangi tarihte ve hangi kilometre taşı için alınmalı?
- nakit açığı ve tampon
- yatırım komitesi notu

### 1. Kilometre Taşı Bazlı Fon İhtiyacı

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


### 2. Pre-money ve Post-money Seyrelme

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


### 3. Fonlama Senaryolarında Kontrol Hakları

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
