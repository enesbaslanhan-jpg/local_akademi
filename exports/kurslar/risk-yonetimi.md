# Risk Yönetimi

Bu dosya "Risk Yönetimi" kategorisindeki **2** yayınlanmış kursu içerir.

---

## Nakit Krizi Erken Uyarıları

**Slug:** `phase-6-08-nakit-krizi-erken-uyarilari` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

özel eğitim merkezi vakası üzerinden kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Kriz oluşmadan hangi eşikler alarm üretmeli?
- haftalık nakit ufku
- erken uyarı kontrol paneli

### 1. 13 Haftalık Nakit Görünürlüğü

*Bilgi nesnesi: `P6-C08-KO1`*

**Problem:** Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı

**Kısa yanıt:** Hafta sonu nakit = Açılış + Giriş − Çıkış

**Özet:** haftalık nakit ufku odağında özel eğitim merkezi için uygulamalı karar nesnesi.

# 13 Haftalık Nakit Görünürlüğü

## özel eğitim merkezi: Yönetim sorusu

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. özel eğitim merkezi yönetimi şu durumla karşı karşıya: Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı. Bu bilgi nesnesinin odağı **haftalık nakit ufku** ve cevaplanacak karar şudur: **Kriz oluşmadan hangi eşikler alarm üretmeli?**

## haftalık nakit ufku — Harita

13 Haftalık Nakit Görünürlüğü, özel eğitim merkezi verisini tek başına bir oran olarak değil, **Kriz oluşmadan hangi eşikler alarm üretmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Hafta sonu nakit = Açılış + Giriş − Çıkış. haftalık nakit ufku sonucu; dönem, para birimi, nakit kaynağı ve özel eğitim merkezi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Kârdan Nakde Mutabakat:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Faaliyet Nakit Akışı Yaklaşımı, Serbest Nakit Yaklaşımı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikGiris — Ölçüm protokolü

Vaka veri paketi:

- **nakit:** 980000
- **aylikGiris:** 420000
- **aylikCikis:** 610000
- **vadesiGecmisAlacak:** 370000
- **gelecek30GunOdeme:** 540000

erken uyarı kontrol paneli başlamadan önce nakit, aylikGiris, aylikCikis alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. özel eğitim merkezi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Kârdan Nakde Mutabakat modeline girmez.

## Hafta sonu nakit — Uygulama

1. “Kriz oluşmadan hangi eşikler alarm üretmeli?” sorusuyla ilgisiz alanları ayır; Kârdan Nakde Mutabakat girdilerini eşleştir.
2. haftalık nakit ufku formülünü yaz: **Hafta sonu nakit = Açılış + Giriş − Çıkış**.
3. özel eğitim merkezi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. 13 haftalık nakit uçurum grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. erken uyarı kontrol paneli sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## erken uyarı kontrol paneli — Gösterge paneli

Kârdan Nakde Mutabakat sonucu özel eğitim merkezi için basit bir “iyi/kötü” etiketi değildir. Kriz oluşmadan hangi eşikler alarm üretmeli? sorusunda haftalık nakit ufku, 13 haftalık nakit uçurum grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikGiris tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı problemine ilişkin operasyonel açıklama aranır.

## aylık toplamın hafta içi açığı gizlemesi — Etik fren

özel eğitim merkezi vakasındaki en tehlikeli hata **aylık toplamın hafta içi açığı gizlemesi**. Kârdan Nakde Mutabakat; nakit eksikken, dönemler uyumsuzken veya “Kriz oluşmadan hangi eşikler alarm üretmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. haftalık nakit ufku çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-08
- Model: [Kârdan Nakde Mutabakat](/app/finance/models/PROFIT_TO_CASH)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: erken uyarı kontrol paneli

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** aylık toplamın hafta içi açığı gizlemesi

**Görev:** erken uyarı kontrol paneli


### 2. Erken Uyarı Sinyal Seti

*Bilgi nesnesi: `P6-C08-KO2`*

**Problem:** Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı

**Kısa yanıt:** Net burn = Aylık çıkış − Aylık giriş

**Özet:** öncü ve gecikmeli sinyaller odağında özel eğitim merkezi için uygulamalı karar nesnesi.

# Erken Uyarı Sinyal Seti

## özel eğitim merkezi: Vaka açılışı

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. özel eğitim merkezi yönetimi şu durumla karşı karşıya: Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı. Bu bilgi nesnesinin odağı **öncü ve gecikmeli sinyaller** ve cevaplanacak karar şudur: **Kriz oluşmadan hangi eşikler alarm üretmeli?**

## öncü ve gecikmeli sinyaller — Mekanik

Erken Uyarı Sinyal Seti, özel eğitim merkezi verisini tek başına bir oran olarak değil, **Kriz oluşmadan hangi eşikler alarm üretmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Net burn = Aylık çıkış − Aylık giriş. öncü ve gecikmeli sinyaller sonucu; dönem, para birimi, nakit kaynağı ve özel eğitim merkezi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Nakit Tüketimi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Burn. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikGiris — Girdi kontrolü

Vaka veri paketi:

- **nakit:** 980000
- **aylikGiris:** 420000
- **aylikCikis:** 610000
- **vadesiGecmisAlacak:** 370000
- **gelecek30GunOdeme:** 540000

erken uyarı kontrol paneli başlamadan önce nakit, aylikGiris, aylikCikis alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. özel eğitim merkezi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Nakit Tüketimi modeline girmez.

## Net burn — Çalışma notu

1. “Kriz oluşmadan hangi eşikler alarm üretmeli?” sorusuyla ilgisiz alanları ayır; Net Nakit Tüketimi girdilerini eşleştir.
2. öncü ve gecikmeli sinyaller formülünü yaz: **Net burn = Aylık çıkış − Aylık giriş**.
3. özel eğitim merkezi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. 13 haftalık nakit uçurum grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. erken uyarı kontrol paneli sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## erken uyarı kontrol paneli — Tartışma

Net Nakit Tüketimi sonucu özel eğitim merkezi için basit bir “iyi/kötü” etiketi değildir. Kriz oluşmadan hangi eşikler alarm üretmeli? sorusunda öncü ve gecikmeli sinyaller, 13 haftalık nakit uçurum grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikGiris tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı problemine ilişkin operasyonel açıklama aranır.

## sadece banka bakiyesine bakmak — Ne zaman kullanma?

özel eğitim merkezi vakasındaki en tehlikeli hata **sadece banka bakiyesine bakmak**. Net Nakit Tüketimi; nakit eksikken, dönemler uyumsuzken veya “Kriz oluşmadan hangi eşikler alarm üretmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. öncü ve gecikmeli sinyaller çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-08
- Model: [Net Nakit Tüketimi](/app/finance/models/NET_BURN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: erken uyarı kontrol paneli

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** sadece banka bakiyesine bakmak

**Görev:** erken uyarı kontrol paneli


### 3. Kriz Tetikleyici Eylem Kartları

*Bilgi nesnesi: `P6-C08-KO3`*

**Problem:** Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı

**Kısa yanıt:** Runway = Kullanılabilir nakit / Net burn

**Özet:** eşik bazlı müdahale odağında özel eğitim merkezi için uygulamalı karar nesnesi.

# Kriz Tetikleyici Eylem Kartları

## özel eğitim merkezi: Operasyon odası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. özel eğitim merkezi yönetimi şu durumla karşı karşıya: Kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı. Bu bilgi nesnesinin odağı **eşik bazlı müdahale** ve cevaplanacak karar şudur: **Kriz oluşmadan hangi eşikler alarm üretmeli?**

## eşik bazlı müdahale — Neden-sonuç zinciri

Kriz Tetikleyici Eylem Kartları, özel eğitim merkezi verisini tek başına bir oran olarak değil, **Kriz oluşmadan hangi eşikler alarm üretmeli?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Runway = Kullanılabilir nakit / Net burn. eşik bazlı müdahale sonucu; dönem, para birimi, nakit kaynağı ve özel eğitim merkezi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dayanma Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Runway. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## nakit ve aylikGiris — Veri sözlüğü

Vaka veri paketi:

- **nakit:** 980000
- **aylikGiris:** 420000
- **aylikCikis:** 610000
- **vadesiGecmisAlacak:** 370000
- **gelecek30GunOdeme:** 540000

erken uyarı kontrol paneli başlamadan önce nakit, aylikGiris, aylikCikis alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. özel eğitim merkezi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dayanma Süresi modeline girmez.

## Runway — Hesap izi

1. “Kriz oluşmadan hangi eşikler alarm üretmeli?” sorusuyla ilgisiz alanları ayır; Nakit Dayanma Süresi girdilerini eşleştir.
2. eşik bazlı müdahale formülünü yaz: **Runway = Kullanılabilir nakit / Net burn**.
3. özel eğitim merkezi baz senaryosunu çalıştır; hesap izindeki ara adımı nakit verisiyle karşılaştır.
4. 13 haftalık nakit uçurum grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. erken uyarı kontrol paneli sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## erken uyarı kontrol paneli — Aksiyon kartı

Nakit Dayanma Süresi sonucu özel eğitim merkezi için basit bir “iyi/kötü” etiketi değildir. Kriz oluşmadan hangi eşikler alarm üretmeli? sorusunda eşik bazlı müdahale, 13 haftalık nakit uçurum grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce aylikGiris tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kayıt dönemi dışında tahsilatların çökmesi ve bordro baskısı problemine ilişkin operasyonel açıklama aranır.

## alarm sonrası sorumluyu belirsiz bırakmak — Kontrol testi

özel eğitim merkezi vakasındaki en tehlikeli hata **alarm sonrası sorumluyu belirsiz bırakmak**. Nakit Dayanma Süresi; nakit eksikken, dönemler uyumsuzken veya “Kriz oluşmadan hangi eşikler alarm üretmeli?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. eşik bazlı müdahale çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-08
- Model: [Nakit Dayanma Süresi](/app/finance/models/RUNWAY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: erken uyarı kontrol paneli

## Kaynaklar

1. [CFA Institute — Working Capital and Liquidity](https://rpc.cfainstitute.org/research/foundation/2024/working-capital-management)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** alarm sonrası sorumluyu belirsiz bırakmak

**Görev:** erken uyarı kontrol paneli


---

## Senaryo, Duyarlılık ve Stres Testi

**Slug:** `phase-6-21-senaryo-duyarlilik-ve-stres-testi` · **Seviye:** advanced · **Süre:** ~105 dk · **Ders sayısı:** 3

ithal ekipman distribütörü vakası üzerinden kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Hangi risk için önceden koruma veya tampon gerekir?
- tutarlı gelecek hikâyeleri
- kur şoku savaş oyunu

### 1. Senaryo ile Duyarlılık Aynı Şey Değildir

*Bilgi nesnesi: `P6-C21-KO1`*

**Problem:** Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması

**Kısa yanıt:** Duyarlılık = Çıktı değişimi / Girdi değişimi

**Özet:** tutarlı gelecek hikâyeleri odağında ithal ekipman distribütörü için uygulamalı karar nesnesi.

# Senaryo ile Duyarlılık Aynı Şey Değildir

## ithal ekipman distribütörü: Vaka açılışı

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. ithal ekipman distribütörü yönetimi şu durumla karşı karşıya: Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması. Bu bilgi nesnesinin odağı **tutarlı gelecek hikâyeleri** ve cevaplanacak karar şudur: **Hangi risk için önceden koruma veya tampon gerekir?**

## tutarlı gelecek hikâyeleri — Mekanik

Senaryo ile Duyarlılık Aynı Şey Değildir, ithal ekipman distribütörü verisini tek başına bir oran olarak değil, **Hangi risk için önceden koruma veya tampon gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Duyarlılık = Çıktı değişimi / Girdi değişimi. tutarlı gelecek hikâyeleri sonucu; dönem, para birimi, kur kaynağı ve ithal ekipman distribütörü çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Bugünkü Değer:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Bugünkü Değer, Girişlerin Bugünkü Değeri. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kur ve hacim — Girdi kontrolü

Vaka veri paketi:

- **kur:** 41.5
- **hacim:** 1800
- **brutMarj:** 0.28
- **faiz:** 0.42
- **senaryolar:** -0.2 · -0.1 · 0 · 0.1 · 0.2

kur şoku savaş oyunu başlamadan önce kur, hacim, brutMarj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ithal ekipman distribütörü belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Bugünkü Değer modeline girmez.

## Duyarlılık — Çalışma notu

1. “Hangi risk için önceden koruma veya tampon gerekir?” sorusuyla ilgisiz alanları ayır; Net Bugünkü Değer girdilerini eşleştir.
2. tutarlı gelecek hikâyeleri formülünü yaz: **Duyarlılık = Çıktı değişimi / Girdi değişimi**.
3. ithal ekipman distribütörü baz senaryosunu çalıştır; hesap izindeki ara adımı kur verisiyle karşılaştır.
4. iki değişkenli duyarlılık matrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kur şoku savaş oyunu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kur şoku savaş oyunu — Tartışma

Net Bugünkü Değer sonucu ithal ekipman distribütörü için basit bir “iyi/kötü” etiketi değildir. Hangi risk için önceden koruma veya tampon gerekir? sorusunda tutarlı gelecek hikâyeleri, iki değişkenli duyarlılık matrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce hacim tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması problemine ilişkin operasyonel açıklama aranır.

## birbiriyle çelişen varsayımları aynı senaryoya koymak — Ne zaman kullanma?

ithal ekipman distribütörü vakasındaki en tehlikeli hata **birbiriyle çelişen varsayımları aynı senaryoya koymak**. Net Bugünkü Değer; kur eksikken, dönemler uyumsuzken veya “Hangi risk için önceden koruma veya tampon gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. tutarlı gelecek hikâyeleri çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-21
- Model: [Net Bugünkü Değer](/app/finance/models/NPV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kur şoku savaş oyunu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** birbiriyle çelişen varsayımları aynı senaryoya koymak

**Görev:** kur şoku savaş oyunu


### 2. Kırılma Noktası Aramak

*Bilgi nesnesi: `P6-C21-KO2`*

**Problem:** Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması

**Kısa yanıt:** Kırılma noktası: Karar çıktısının eşik olduğu girdi

**Özet:** tek değişken etkisi odağında ithal ekipman distribütörü için uygulamalı karar nesnesi.

# Kırılma Noktası Aramak

## ithal ekipman distribütörü: Operasyon odası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. ithal ekipman distribütörü yönetimi şu durumla karşı karşıya: Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması. Bu bilgi nesnesinin odağı **tek değişken etkisi** ve cevaplanacak karar şudur: **Hangi risk için önceden koruma veya tampon gerekir?**

## tek değişken etkisi — Neden-sonuç zinciri

Kırılma Noktası Aramak, ithal ekipman distribütörü verisini tek başına bir oran olarak değil, **Hangi risk için önceden koruma veya tampon gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Kırılma noktası: Karar çıktısının eşik olduğu girdi. tek değişken etkisi sonucu; dönem, para birimi, kur kaynağı ve ithal ekipman distribütörü çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Nakit Dayanma Süresi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Runway. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kur ve hacim — Veri sözlüğü

Vaka veri paketi:

- **kur:** 41.5
- **hacim:** 1800
- **brutMarj:** 0.28
- **faiz:** 0.42
- **senaryolar:** -0.2 · -0.1 · 0 · 0.1 · 0.2

kur şoku savaş oyunu başlamadan önce kur, hacim, brutMarj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ithal ekipman distribütörü belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Nakit Dayanma Süresi modeline girmez.

## Kırılma noktası: Karar çıktısının eşik olduğu girdi — Hesap izi

1. “Hangi risk için önceden koruma veya tampon gerekir?” sorusuyla ilgisiz alanları ayır; Nakit Dayanma Süresi girdilerini eşleştir.
2. tek değişken etkisi formülünü yaz: **Kırılma noktası: Karar çıktısının eşik olduğu girdi**.
3. ithal ekipman distribütörü baz senaryosunu çalıştır; hesap izindeki ara adımı kur verisiyle karşılaştır.
4. iki değişkenli duyarlılık matrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kur şoku savaş oyunu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kur şoku savaş oyunu — Aksiyon kartı

Nakit Dayanma Süresi sonucu ithal ekipman distribütörü için basit bir “iyi/kötü” etiketi değildir. Hangi risk için önceden koruma veya tampon gerekir? sorusunda tek değişken etkisi, iki değişkenli duyarlılık matrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce hacim tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması problemine ilişkin operasyonel açıklama aranır.

## yalnız iyimser ve baz senaryo kullanmak — Kontrol testi

ithal ekipman distribütörü vakasındaki en tehlikeli hata **yalnız iyimser ve baz senaryo kullanmak**. Nakit Dayanma Süresi; kur eksikken, dönemler uyumsuzken veya “Hangi risk için önceden koruma veya tampon gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. tek değişken etkisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-21
- Model: [Nakit Dayanma Süresi](/app/finance/models/RUNWAY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kur şoku savaş oyunu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** yalnız iyimser ve baz senaryo kullanmak

**Görev:** kur şoku savaş oyunu


### 3. Stres Testinden Acil Eylem Planına

*Bilgi nesnesi: `P6-C21-KO3`*

**Problem:** Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması

**Kısa yanıt:** Stres açığı = Gerekli tampon − Mevcut tampon

**Özet:** aşırı fakat olası şok odağında ithal ekipman distribütörü için uygulamalı karar nesnesi.

# Stres Testinden Acil Eylem Planına

## ithal ekipman distribütörü: Karar günlüğü

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. ithal ekipman distribütörü yönetimi şu durumla karşı karşıya: Kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması. Bu bilgi nesnesinin odağı **aşırı fakat olası şok** ve cevaplanacak karar şudur: **Hangi risk için önceden koruma veya tampon gerekir?**

## aşırı fakat olası şok — İddia

Stres Testinden Acil Eylem Planına, ithal ekipman distribütörü verisini tek başına bir oran olarak değil, **Hangi risk için önceden koruma veya tampon gerekir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Stres açığı = Gerekli tampon − Mevcut tampon. aşırı fakat olası şok sonucu; dönem, para birimi, kur kaynağı ve ithal ekipman distribütörü çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Net Bugünkü Değer:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Net Bugünkü Değer, Girişlerin Bugünkü Değeri. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## kur ve hacim — Deliller

Vaka veri paketi:

- **kur:** 41.5
- **hacim:** 1800
- **brutMarj:** 0.28
- **faiz:** 0.42
- **senaryolar:** -0.2 · -0.1 · 0 · 0.1 · 0.2

kur şoku savaş oyunu başlamadan önce kur, hacim, brutMarj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. ithal ekipman distribütörü belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Net Bugünkü Değer modeline girmez.

## Stres açığı — Sayısal deney

1. “Hangi risk için önceden koruma veya tampon gerekir?” sorusuyla ilgisiz alanları ayır; Net Bugünkü Değer girdilerini eşleştir.
2. aşırı fakat olası şok formülünü yaz: **Stres açığı = Gerekli tampon − Mevcut tampon**.
3. ithal ekipman distribütörü baz senaryosunu çalıştır; hesap izindeki ara adımı kur verisiyle karşılaştır.
4. iki değişkenli duyarlılık matrisi üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. kur şoku savaş oyunu sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## kur şoku savaş oyunu — Karşı görüş

Net Bugünkü Değer sonucu ithal ekipman distribütörü için basit bir “iyi/kötü” etiketi değildir. Hangi risk için önceden koruma veya tampon gerekir? sorusunda aşırı fakat olası şok, iki değişkenli duyarlılık matrisi üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce hacim tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kur, faiz ve satış hacmi aynı anda değiştiğinde planın kırılganlaşması problemine ilişkin operasyonel açıklama aranır.

## stres sonucunu aksiyonsuz bırakmak — Kapanış ölçütü

ithal ekipman distribütörü vakasındaki en tehlikeli hata **stres sonucunu aksiyonsuz bırakmak**. Net Bugünkü Değer; kur eksikken, dönemler uyumsuzken veya “Hangi risk için önceden koruma veya tampon gerekir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. aşırı fakat olası şok çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-21
- Model: [Net Bugünkü Değer](/app/finance/models/NPV)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: kur şoku savaş oyunu

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [CFA Institute — Cost of Capital](https://rpc.cfainstitute.org/research/foundation/2024/cost-of-capital)

> **Uyarı:** stres sonucunu aksiyonsuz bırakmak

**Görev:** kur şoku savaş oyunu


---
