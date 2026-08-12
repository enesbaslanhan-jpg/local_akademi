# Maliyet Yönetimi

Bu dosya "Maliyet Yönetimi" kategorisindeki **3** yayınlanmış kursu içerir.

---

## Sabit ve Değişken Maliyet

**Slug:** `phase-6-09-sabit-ve-degisken-maliyet` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

bulut mutfak vakası üzerinden kira, personel ve platform komisyonlarının yanlış sınıflanması problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- İkinci marka açıldığında hangi giderler gerçekten değişir?
- ilgili maliyet sınıflaması
- gider kartı sınıflandırma

### 1. Karara Göre Maliyet Davranışı

*Bilgi nesnesi: `P6-C09-KO1`*

**Problem:** Kira, personel ve platform komisyonlarının yanlış sınıflanması

**Kısa yanıt:** Birim katkı = Fiyat − Birim değişken maliyet

**Özet:** ilgili maliyet sınıflaması odağında bulut mutfak için uygulamalı karar nesnesi.

# Karara Göre Maliyet Davranışı

## bulut mutfak: Vaka açılışı

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. bulut mutfak yönetimi şu durumla karşı karşıya: Kira, personel ve platform komisyonlarının yanlış sınıflanması. Bu bilgi nesnesinin odağı **ilgili maliyet sınıflaması** ve cevaplanacak karar şudur: **İkinci marka açıldığında hangi giderler gerçekten değişir?**

## ilgili maliyet sınıflaması — Mekanik

Karara Göre Maliyet Davranışı, bulut mutfak verisini tek başına bir oran olarak değil, **İkinci marka açıldığında hangi giderler gerçekten değişir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Birim katkı = Fiyat − Birim değişken maliyet. ilgili maliyet sınıflaması sonucu; dönem, para birimi, fiyat kaynağı ve bulut mutfak çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fiyat ve malzeme — Girdi kontrolü

Vaka veri paketi:

- **fiyat:** 310
- **malzeme:** 102
- **ambalaj:** 18
- **komisyonOrani:** 0.21
- **aylikSabit:** 285000

gider kartı sınıflandırma başlamadan önce fiyat, malzeme, ambalaj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. bulut mutfak belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Birim katkı — Çalışma notu

1. “İkinci marka açıldığında hangi giderler gerçekten değişir?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. ilgili maliyet sınıflaması formülünü yaz: **Birim katkı = Fiyat − Birim değişken maliyet**.
3. bulut mutfak baz senaryosunu çalıştır; hesap izindeki ara adımı fiyat verisiyle karşılaştır.
4. hacim–maliyet davranış grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. gider kartı sınıflandırma sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## gider kartı sınıflandırma — Tartışma

Katkı Payı sonucu bulut mutfak için basit bir “iyi/kötü” etiketi değildir. İkinci marka açıldığında hangi giderler gerçekten değişir? sorusunda ilgili maliyet sınıflaması, hacim–maliyet davranış grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce malzeme tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kira, personel ve platform komisyonlarının yanlış sınıflanması problemine ilişkin operasyonel açıklama aranır.

## muhasebe hesabını maliyet davranışı sanmak — Ne zaman kullanma?

bulut mutfak vakasındaki en tehlikeli hata **muhasebe hesabını maliyet davranışı sanmak**. Katkı Payı; fiyat eksikken, dönemler uyumsuzken veya “İkinci marka açıldığında hangi giderler gerçekten değişir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. ilgili maliyet sınıflaması çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-09
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: gider kartı sınıflandırma

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** muhasebe hesabını maliyet davranışı sanmak

**Görev:** gider kartı sınıflandırma


### 2. Karma Maliyetleri Ayırmak

*Bilgi nesnesi: `P6-C09-KO2`*

**Problem:** Kira, personel ve platform komisyonlarının yanlış sınıflanması

**Kısa yanıt:** Toplam maliyet = Sabit + Birim değişken × Hacim

**Özet:** sabit-değişken bileşen ayrımı odağında bulut mutfak için uygulamalı karar nesnesi.

# Karma Maliyetleri Ayırmak

## bulut mutfak: Operasyon odası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. bulut mutfak yönetimi şu durumla karşı karşıya: Kira, personel ve platform komisyonlarının yanlış sınıflanması. Bu bilgi nesnesinin odağı **sabit-değişken bileşen ayrımı** ve cevaplanacak karar şudur: **İkinci marka açıldığında hangi giderler gerçekten değişir?**

## sabit-değişken bileşen ayrımı — Neden-sonuç zinciri

Karma Maliyetleri Ayırmak, bulut mutfak verisini tek başına bir oran olarak değil, **İkinci marka açıldığında hangi giderler gerçekten değişir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Toplam maliyet = Sabit + Birim değişken × Hacim. sabit-değişken bileşen ayrımı sonucu; dönem, para birimi, fiyat kaynağı ve bulut mutfak çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fiyat ve malzeme — Veri sözlüğü

Vaka veri paketi:

- **fiyat:** 310
- **malzeme:** 102
- **ambalaj:** 18
- **komisyonOrani:** 0.21
- **aylikSabit:** 285000

gider kartı sınıflandırma başlamadan önce fiyat, malzeme, ambalaj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. bulut mutfak belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Toplam maliyet — Hesap izi

1. “İkinci marka açıldığında hangi giderler gerçekten değişir?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. sabit-değişken bileşen ayrımı formülünü yaz: **Toplam maliyet = Sabit + Birim değişken × Hacim**.
3. bulut mutfak baz senaryosunu çalıştır; hesap izindeki ara adımı fiyat verisiyle karşılaştır.
4. hacim–maliyet davranış grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. gider kartı sınıflandırma sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## gider kartı sınıflandırma — Aksiyon kartı

Katkı Payı sonucu bulut mutfak için basit bir “iyi/kötü” etiketi değildir. İkinci marka açıldığında hangi giderler gerçekten değişir? sorusunda sabit-değişken bileşen ayrımı, hacim–maliyet davranış grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce malzeme tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kira, personel ve platform komisyonlarının yanlış sınıflanması problemine ilişkin operasyonel açıklama aranır.

## basamaklı gideri tamamen sabit saymak — Kontrol testi

bulut mutfak vakasındaki en tehlikeli hata **basamaklı gideri tamamen sabit saymak**. Katkı Payı; fiyat eksikken, dönemler uyumsuzken veya “İkinci marka açıldığında hangi giderler gerçekten değişir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sabit-değişken bileşen ayrımı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-09
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: gider kartı sınıflandırma

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** basamaklı gideri tamamen sabit saymak

**Görev:** gider kartı sınıflandırma


### 3. Birim Katkı ile Kapasite Kararı

*Bilgi nesnesi: `P6-C09-KO3`*

**Problem:** Kira, personel ve platform komisyonlarının yanlış sınıflanması

**Kısa yanıt:** Katkı oranı = Birim katkı / Fiyat

**Özet:** kapasite ve katkı odağında bulut mutfak için uygulamalı karar nesnesi.

# Birim Katkı ile Kapasite Kararı

## bulut mutfak: Karar günlüğü

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. bulut mutfak yönetimi şu durumla karşı karşıya: Kira, personel ve platform komisyonlarının yanlış sınıflanması. Bu bilgi nesnesinin odağı **kapasite ve katkı** ve cevaplanacak karar şudur: **İkinci marka açıldığında hangi giderler gerçekten değişir?**

## kapasite ve katkı — İddia

Birim Katkı ile Kapasite Kararı, bulut mutfak verisini tek başına bir oran olarak değil, **İkinci marka açıldığında hangi giderler gerçekten değişir?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Katkı oranı = Birim katkı / Fiyat. kapasite ve katkı sonucu; dönem, para birimi, fiyat kaynağı ve bulut mutfak çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Katkı Payı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Katkı Payı, Katkı Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## fiyat ve malzeme — Deliller

Vaka veri paketi:

- **fiyat:** 310
- **malzeme:** 102
- **ambalaj:** 18
- **komisyonOrani:** 0.21
- **aylikSabit:** 285000

gider kartı sınıflandırma başlamadan önce fiyat, malzeme, ambalaj alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. bulut mutfak belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Katkı Payı modeline girmez.

## Katkı oranı — Sayısal deney

1. “İkinci marka açıldığında hangi giderler gerçekten değişir?” sorusuyla ilgisiz alanları ayır; Katkı Payı girdilerini eşleştir.
2. kapasite ve katkı formülünü yaz: **Katkı oranı = Birim katkı / Fiyat**.
3. bulut mutfak baz senaryosunu çalıştır; hesap izindeki ara adımı fiyat verisiyle karşılaştır.
4. hacim–maliyet davranış grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. gider kartı sınıflandırma sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## gider kartı sınıflandırma — Karşı görüş

Katkı Payı sonucu bulut mutfak için basit bir “iyi/kötü” etiketi değildir. İkinci marka açıldığında hangi giderler gerçekten değişir? sorusunda kapasite ve katkı, hacim–maliyet davranış grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce malzeme tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra kira, personel ve platform komisyonlarının yanlış sınıflanması problemine ilişkin operasyonel açıklama aranır.

## boş kapasiteyi ücretsiz görmek — Kapanış ölçütü

bulut mutfak vakasındaki en tehlikeli hata **boş kapasiteyi ücretsiz görmek**. Katkı Payı; fiyat eksikken, dönemler uyumsuzken veya “İkinci marka açıldığında hangi giderler gerçekten değişir?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. kapasite ve katkı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-09
- Model: [Katkı Payı](/app/finance/models/CONTRIBUTION_MARGIN)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: gider kartı sınıflandırma

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** boş kapasiteyi ücretsiz görmek

**Görev:** gider kartı sınıflandırma


---

## Başa Baş ve Güvenlik Marjı

**Slug:** `phase-6-10-basa-bas-ve-guvenlik-marji` · **Seviye:** beginner · **Süre:** ~105 dk · **Ders sayısı:** 3

seramik atölyesi vakası üzerinden yeni koleksiyonun minimum satış adedinin bilinmemesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Üretim kalıbı yatırımına geçilmeli mi?
- sabit gideri karşılama eşiği
- koleksiyon devam/dur kararı

### 1. Başa Baş Adedi Nereden Gelir?

*Bilgi nesnesi: `P6-C10-KO1`*

**Problem:** Yeni koleksiyonun minimum satış adedinin bilinmemesi

**Kısa yanıt:** Başa baş adet = Sabit maliyet / Birim katkı

**Özet:** sabit gideri karşılama eşiği odağında seramik atölyesi için uygulamalı karar nesnesi.

# Başa Baş Adedi Nereden Gelir?

## seramik atölyesi: Operasyon odası

Rakamlar masaya geldiğinde önce sonuca değil, paranın işletme içinde izlediği yola bakılır. seramik atölyesi yönetimi şu durumla karşı karşıya: Yeni koleksiyonun minimum satış adedinin bilinmemesi. Bu bilgi nesnesinin odağı **sabit gideri karşılama eşiği** ve cevaplanacak karar şudur: **Üretim kalıbı yatırımına geçilmeli mi?**

## sabit gideri karşılama eşiği — Neden-sonuç zinciri

Başa Baş Adedi Nereden Gelir?, seramik atölyesi verisini tek başına bir oran olarak değil, **Üretim kalıbı yatırımına geçilmeli mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Başa baş adet = Sabit maliyet / Birim katkı. sabit gideri karşılama eşiği sonucu; dönem, para birimi, sabitMaliyet kaynağı ve seramik atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Başa Baş Satış Adedi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Birim Katkı, Başa Baş Adedi, Başa Baş Cirosu. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sabitMaliyet ve fiyat — Veri sözlüğü

Vaka veri paketi:

- **sabitMaliyet:** 360000
- **fiyat:** 780
- **birimDegisken:** 420
- **beklenenAdet:** 1250

koleksiyon devam/dur kararı başlamadan önce sabitMaliyet, fiyat, birimDegisken alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. seramik atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Başa Baş Satış Adedi modeline girmez.

## Başa baş adet — Hesap izi

1. “Üretim kalıbı yatırımına geçilmeli mi?” sorusuyla ilgisiz alanları ayır; Başa Baş Satış Adedi girdilerini eşleştir.
2. sabit gideri karşılama eşiği formülünü yaz: **Başa baş adet = Sabit maliyet / Birim katkı**.
3. seramik atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı sabitMaliyet verisiyle karşılaştır.
4. gelir-maliyet kesişim grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. koleksiyon devam/dur kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## koleksiyon devam/dur kararı — Aksiyon kartı

Başa Baş Satış Adedi sonucu seramik atölyesi için basit bir “iyi/kötü” etiketi değildir. Üretim kalıbı yatırımına geçilmeli mi? sorusunda sabit gideri karşılama eşiği, gelir-maliyet kesişim grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni koleksiyonun minimum satış adedinin bilinmemesi problemine ilişkin operasyonel açıklama aranır.

## katkı yerine ciro kullanmak — Kontrol testi

seramik atölyesi vakasındaki en tehlikeli hata **katkı yerine ciro kullanmak**. Başa Baş Satış Adedi; sabitMaliyet eksikken, dönemler uyumsuzken veya “Üretim kalıbı yatırımına geçilmeli mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. sabit gideri karşılama eşiği çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-10
- Model: [Başa Baş Satış Adedi](/app/finance/models/BREAK_EVEN_QUANTITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: koleksiyon devam/dur kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** katkı yerine ciro kullanmak

**Görev:** koleksiyon devam/dur kararı


### 2. Güvenlik Marjı ile Talep Tamponu

*Bilgi nesnesi: `P6-C10-KO2`*

**Problem:** Yeni koleksiyonun minimum satış adedinin bilinmemesi

**Kısa yanıt:** Güvenlik marjı = Beklenen satış − Başa baş satış

**Özet:** beklenen satış tamponu odağında seramik atölyesi için uygulamalı karar nesnesi.

# Güvenlik Marjı ile Talep Tamponu

## seramik atölyesi: Karar günlüğü

Bu çalışma bir formül ezberiyle değil, yönetimin cevap beklediği somut bir gerilimle başlar. seramik atölyesi yönetimi şu durumla karşı karşıya: Yeni koleksiyonun minimum satış adedinin bilinmemesi. Bu bilgi nesnesinin odağı **beklenen satış tamponu** ve cevaplanacak karar şudur: **Üretim kalıbı yatırımına geçilmeli mi?**

## beklenen satış tamponu — İddia

Güvenlik Marjı ile Talep Tamponu, seramik atölyesi verisini tek başına bir oran olarak değil, **Üretim kalıbı yatırımına geçilmeli mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Güvenlik marjı = Beklenen satış − Başa baş satış. beklenen satış tamponu sonucu; dönem, para birimi, sabitMaliyet kaynağı ve seramik atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Başa Baş Satış Adedi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Birim Katkı, Başa Baş Adedi, Başa Baş Cirosu. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sabitMaliyet ve fiyat — Deliller

Vaka veri paketi:

- **sabitMaliyet:** 360000
- **fiyat:** 780
- **birimDegisken:** 420
- **beklenenAdet:** 1250

koleksiyon devam/dur kararı başlamadan önce sabitMaliyet, fiyat, birimDegisken alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. seramik atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Başa Baş Satış Adedi modeline girmez.

## Güvenlik marjı — Sayısal deney

1. “Üretim kalıbı yatırımına geçilmeli mi?” sorusuyla ilgisiz alanları ayır; Başa Baş Satış Adedi girdilerini eşleştir.
2. beklenen satış tamponu formülünü yaz: **Güvenlik marjı = Beklenen satış − Başa baş satış**.
3. seramik atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı sabitMaliyet verisiyle karşılaştır.
4. gelir-maliyet kesişim grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. koleksiyon devam/dur kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## koleksiyon devam/dur kararı — Karşı görüş

Başa Baş Satış Adedi sonucu seramik atölyesi için basit bir “iyi/kötü” etiketi değildir. Üretim kalıbı yatırımına geçilmeli mi? sorusunda beklenen satış tamponu, gelir-maliyet kesişim grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni koleksiyonun minimum satış adedinin bilinmemesi problemine ilişkin operasyonel açıklama aranır.

## beklenen satışla kapasiteyi aynı sanmak — Kapanış ölçütü

seramik atölyesi vakasındaki en tehlikeli hata **beklenen satışla kapasiteyi aynı sanmak**. Başa Baş Satış Adedi; sabitMaliyet eksikken, dönemler uyumsuzken veya “Üretim kalıbı yatırımına geçilmeli mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. beklenen satış tamponu çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-10
- Model: [Başa Baş Satış Adedi](/app/finance/models/BREAK_EVEN_QUANTITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: koleksiyon devam/dur kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** beklenen satışla kapasiteyi aynı sanmak

**Görev:** koleksiyon devam/dur kararı


### 3. Çok Ürünlü Başa Baş Mantığı

*Bilgi nesnesi: `P6-C10-KO3`*

**Problem:** Yeni koleksiyonun minimum satış adedinin bilinmemesi

**Kısa yanıt:** Ağırlıklı katkı = Σ(Ürün katkısı × Satış karması)

**Özet:** satış karması etkisi odağında seramik atölyesi için uygulamalı karar nesnesi.

# Çok Ürünlü Başa Baş Mantığı

## seramik atölyesi: Karar masası

Analist rolündeki kullanıcı önce iddiayı yazar, sonra o iddiayı destekleyen ve zayıflatan kanıtları ayırır. seramik atölyesi yönetimi şu durumla karşı karşıya: Yeni koleksiyonun minimum satış adedinin bilinmemesi. Bu bilgi nesnesinin odağı **satış karması etkisi** ve cevaplanacak karar şudur: **Üretim kalıbı yatırımına geçilmeli mi?**

## satış karması etkisi — Kavramı yerleştir

Çok Ürünlü Başa Baş Mantığı, seramik atölyesi verisini tek başına bir oran olarak değil, **Üretim kalıbı yatırımına geçilmeli mi?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Ağırlıklı katkı = Σ(Ürün katkısı × Satış karması). satış karması etkisi sonucu; dönem, para birimi, sabitMaliyet kaynağı ve seramik atölyesi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Başa Baş Satış Adedi:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Birim Katkı, Başa Baş Adedi, Başa Baş Cirosu. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## sabitMaliyet ve fiyat — Veriyi hazırla

Vaka veri paketi:

- **sabitMaliyet:** 360000
- **fiyat:** 780
- **birimDegisken:** 420
- **beklenenAdet:** 1250

koleksiyon devam/dur kararı başlamadan önce sabitMaliyet, fiyat, birimDegisken alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. seramik atölyesi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Başa Baş Satış Adedi modeline girmez.

## Ağırlıklı katkı — Hesabı yürüt

1. “Üretim kalıbı yatırımına geçilmeli mi?” sorusuyla ilgisiz alanları ayır; Başa Baş Satış Adedi girdilerini eşleştir.
2. satış karması etkisi formülünü yaz: **Ağırlıklı katkı = Σ(Ürün katkısı × Satış karması)**.
3. seramik atölyesi baz senaryosunu çalıştır; hesap izindeki ara adımı sabitMaliyet verisiyle karşılaştır.
4. gelir-maliyet kesişim grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. koleksiyon devam/dur kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## koleksiyon devam/dur kararı — Sonucu oku

Başa Baş Satış Adedi sonucu seramik atölyesi için basit bir “iyi/kötü” etiketi değildir. Üretim kalıbı yatırımına geçilmeli mi? sorusunda satış karması etkisi, gelir-maliyet kesişim grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyat tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra yeni koleksiyonun minimum satış adedinin bilinmemesi problemine ilişkin operasyonel açıklama aranır.

## ürün karmasını sabit varsaymak — Sınır çiz

seramik atölyesi vakasındaki en tehlikeli hata **ürün karmasını sabit varsaymak**. Başa Baş Satış Adedi; sabitMaliyet eksikken, dönemler uyumsuzken veya “Üretim kalıbı yatırımına geçilmeli mi?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. satış karması etkisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-10
- Model: [Başa Baş Satış Adedi](/app/finance/models/BREAK_EVEN_QUANTITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: koleksiyon devam/dur kararı

## Kaynaklar

1. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)
2. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)

> **Uyarı:** ürün karmasını sabit varsaymak

**Görev:** koleksiyon devam/dur kararı


---

## Ürün Bazlı Karlılık

**Slug:** `phase-6-11-urun-bazli-karlilik` · **Seviye:** intermediate · **Süre:** ~105 dk · **Ders sayısı:** 3

doğal kozmetik üreticisi vakası üzerinden en çok satan ürünün en kârlı ürün olmayabileceği şüphesi problemini model, senaryo ve karar günlüğüyle çözen uygulamalı yol.

**Kazanımlar**

- Raf ve reklam bütçesi hangi ürünlere ayrılmalı?
- ürün bazında gerçek katkı
- üç SKU portföy kararı

### 1. SKU Katkı Kartı

*Bilgi nesnesi: `P6-C11-KO1`*

**Problem:** En çok satan ürünün en kârlı ürün olmayabileceği şüphesi

**Kısa yanıt:** Ürün katkısı = Net fiyat − İzlenebilir değişken maliyet

**Özet:** ürün bazında gerçek katkı odağında doğal kozmetik üreticisi için uygulamalı karar nesnesi.

# SKU Katkı Kartı

## doğal kozmetik üreticisi: Karar günlüğü

Operasyon ekibi ile finans ekibinin aynı kelimeye farklı anlam verdiği noktalar özellikle işaretlenir. doğal kozmetik üreticisi yönetimi şu durumla karşı karşıya: En çok satan ürünün en kârlı ürün olmayabileceği şüphesi. Bu bilgi nesnesinin odağı **ürün bazında gerçek katkı** ve cevaplanacak karar şudur: **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?**

## ürün bazında gerçek katkı — İddia

SKU Katkı Kartı, doğal kozmetik üreticisi verisini tek başına bir oran olarak değil, **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Ürün katkısı = Net fiyat − İzlenebilir değişken maliyet. ürün bazında gerçek katkı sonucu; dönem, para birimi, urunler kaynağı ve doğal kozmetik üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Ürün Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Ürün Katkısı, Ürün Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## urunler ve fiyatlar — Deliller

Vaka veri paketi:

- **urunler:** serum · sabun · krem
- **fiyatlar:** 690 · 160 · 420
- **maliyetler:** 238 · 62 · 171
- **iadeler:** 0.08 · 0.02 · 0.05

üç SKU portföy kararı başlamadan önce urunler, fiyatlar, maliyetler alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. doğal kozmetik üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Ürün Kârlılığı modeline girmez.

## Ürün katkısı — Sayısal deney

1. “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” sorusuyla ilgisiz alanları ayır; Ürün Kârlılığı girdilerini eşleştir.
2. ürün bazında gerçek katkı formülünü yaz: **Ürün katkısı = Net fiyat − İzlenebilir değişken maliyet**.
3. doğal kozmetik üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı urunler verisiyle karşılaştır.
4. marj–hacim balon grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç SKU portföy kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç SKU portföy kararı — Karşı görüş

Ürün Kârlılığı sonucu doğal kozmetik üreticisi için basit bir “iyi/kötü” etiketi değildir. Raf ve reklam bütçesi hangi ürünlere ayrılmalı? sorusunda ürün bazında gerçek katkı, marj–hacim balon grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyatlar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra en çok satan ürünün en kârlı ürün olmayabileceği şüphesi problemine ilişkin operasyonel açıklama aranır.

## ortak gideri ciroya körlemesine dağıtmak — Kapanış ölçütü

doğal kozmetik üreticisi vakasındaki en tehlikeli hata **ortak gideri ciroya körlemesine dağıtmak**. Ürün Kârlılığı; urunler eksikken, dönemler uyumsuzken veya “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. ürün bazında gerçek katkı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-11
- Model: [Ürün Kârlılığı](/app/finance/models/PRODUCT_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç SKU portföy kararı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** ortak gideri ciroya körlemesine dağıtmak

**Görev:** üç SKU portföy kararı


### 2. Maliyet Dağıtım Anahtarı Seçimi

*Bilgi nesnesi: `P6-C11-KO2`*

**Problem:** En çok satan ürünün en kârlı ürün olmayabileceği şüphesi

**Kısa yanıt:** Dağıtılan gider = Havuz × Ürün sürücü payı

**Özet:** faaliyet sürücüsüyle gider dağıtımı odağında doğal kozmetik üreticisi için uygulamalı karar nesnesi.

# Maliyet Dağıtım Anahtarı Seçimi

## doğal kozmetik üreticisi: Karar masası

Vaka, tek bir “doğru oran” aramak yerine karar değiştirici eşiği bulmayı amaçlar. doğal kozmetik üreticisi yönetimi şu durumla karşı karşıya: En çok satan ürünün en kârlı ürün olmayabileceği şüphesi. Bu bilgi nesnesinin odağı **faaliyet sürücüsüyle gider dağıtımı** ve cevaplanacak karar şudur: **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?**

## faaliyet sürücüsüyle gider dağıtımı — Kavramı yerleştir

Maliyet Dağıtım Anahtarı Seçimi, doğal kozmetik üreticisi verisini tek başına bir oran olarak değil, **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Dağıtılan gider = Havuz × Ürün sürücü payı. faaliyet sürücüsüyle gider dağıtımı sonucu; dönem, para birimi, urunler kaynağı ve doğal kozmetik üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Ürün Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Ürün Katkısı, Ürün Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## urunler ve fiyatlar — Veriyi hazırla

Vaka veri paketi:

- **urunler:** serum · sabun · krem
- **fiyatlar:** 690 · 160 · 420
- **maliyetler:** 238 · 62 · 171
- **iadeler:** 0.08 · 0.02 · 0.05

üç SKU portföy kararı başlamadan önce urunler, fiyatlar, maliyetler alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. doğal kozmetik üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Ürün Kârlılığı modeline girmez.

## Dağıtılan gider — Hesabı yürüt

1. “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” sorusuyla ilgisiz alanları ayır; Ürün Kârlılığı girdilerini eşleştir.
2. faaliyet sürücüsüyle gider dağıtımı formülünü yaz: **Dağıtılan gider = Havuz × Ürün sürücü payı**.
3. doğal kozmetik üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı urunler verisiyle karşılaştır.
4. marj–hacim balon grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç SKU portföy kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç SKU portföy kararı — Sonucu oku

Ürün Kârlılığı sonucu doğal kozmetik üreticisi için basit bir “iyi/kötü” etiketi değildir. Raf ve reklam bütçesi hangi ürünlere ayrılmalı? sorusunda faaliyet sürücüsüyle gider dağıtımı, marj–hacim balon grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyatlar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra en çok satan ürünün en kârlı ürün olmayabileceği şüphesi problemine ilişkin operasyonel açıklama aranır.

## iadeyi ürün bazında izlememek — Sınır çiz

doğal kozmetik üreticisi vakasındaki en tehlikeli hata **iadeyi ürün bazında izlememek**. Ürün Kârlılığı; urunler eksikken, dönemler uyumsuzken veya “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. faaliyet sürücüsüyle gider dağıtımı çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-11
- Model: [Ürün Kârlılığı](/app/finance/models/PRODUCT_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç SKU portföy kararı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** iadeyi ürün bazında izlememek

**Görev:** üç SKU portföy kararı


### 3. Kârlılık–Hacim Portföyü

*Bilgi nesnesi: `P6-C11-KO3`*

**Problem:** En çok satan ürünün en kârlı ürün olmayabileceği şüphesi

**Kısa yanıt:** Portföy katkısı = Birim katkı × Satış adedi

**Özet:** portföy karar matrisi odağında doğal kozmetik üreticisi için uygulamalı karar nesnesi.

# Kârlılık–Hacim Portföyü

## doğal kozmetik üreticisi: Sahadan sinyal

Buradaki yöntem bir denetim izi gibi ilerler: kaynak, dönüşüm, hesap, yorum ve yetkili karar. doğal kozmetik üreticisi yönetimi şu durumla karşı karşıya: En çok satan ürünün en kârlı ürün olmayabileceği şüphesi. Bu bilgi nesnesinin odağı **portföy karar matrisi** ve cevaplanacak karar şudur: **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?**

## portföy karar matrisi — Teşhis merceği

Kârlılık–Hacim Portföyü, doğal kozmetik üreticisi verisini tek başına bir oran olarak değil, **Raf ve reklam bütçesi hangi ürünlere ayrılmalı?** kararının neden–sonuç zincirindeki bir işaret olarak ele alır. Portföy katkısı = Birim katkı × Satış adedi. portföy karar matrisi sonucu; dönem, para birimi, urunler kaynağı ve doğal kozmetik üreticisi çalışma biçimi belirtilmeden yorumlanmaz.

> **Teknik bilgi — Ürün Kârlılığı:** Motor sürümü 1.0.0, politika sürümü phase6-1.0. Beklenen çıktı alanları: Ürün Katkısı, Ürün Marjı. Hesap deterministiktir; AI Mentor yalnızca kayıtlı sonucu açıklar.

## urunler ve fiyatlar — Kanıt paketi

Vaka veri paketi:

- **urunler:** serum · sabun · krem
- **fiyatlar:** 690 · 160 · 420
- **maliyetler:** 238 · 62 · 171
- **iadeler:** 0.08 · 0.02 · 0.05

üç SKU portföy kararı başlamadan önce urunler, fiyatlar, maliyetler alanlarının kaynağını, dönemini, KDV kapsamını ve ortalama mı dönem sonu mu olduğunu işaretle. doğal kozmetik üreticisi belgesinden OCR ile gelen alan, kullanıcı onayı olmadan Ürün Kârlılığı modeline girmez.

## Portföy katkısı — Adım adım çözüm

1. “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” sorusuyla ilgisiz alanları ayır; Ürün Kârlılığı girdilerini eşleştir.
2. portföy karar matrisi formülünü yaz: **Portföy katkısı = Birim katkı × Satış adedi**.
3. doğal kozmetik üreticisi baz senaryosunu çalıştır; hesap izindeki ara adımı urunler verisiyle karşılaştır.
4. marj–hacim balon grafiği üzerinde baz, olumsuz ve stres görünümünü yan yana oku.
5. üç SKU portföy kararı sonucunun karar eşiğini değiştirip değiştirmediğini karar günlüğüne kaydet.

## üç SKU portföy kararı — Karar eşiği

Ürün Kârlılığı sonucu doğal kozmetik üreticisi için basit bir “iyi/kötü” etiketi değildir. Raf ve reklam bütçesi hangi ürünlere ayrılmalı? sorusunda portföy karar matrisi, marj–hacim balon grafiği üzerinde diğer sürücülerle birlikte okunur. Gösterge beklenmedikse önce fiyatlar tanımı, dönem uyumu ve çift sayım kontrol edilir; sonra en çok satan ürünün en kârlı ürün olmayabileceği şüphesi problemine ilişkin operasyonel açıklama aranır.

## yüksek marjı düşük hacimden bağımsız yorumlamak — Yanılma payı

doğal kozmetik üreticisi vakasındaki en tehlikeli hata **yüksek marjı düşük hacimden bağımsız yorumlamak**. Ürün Kârlılığı; urunler eksikken, dönemler uyumsuzken veya “Raf ve reklam bütçesi hangi ürünlere ayrılmalı?” modelin kapsamadığı hukuki/vergi sonucuna bağlıyken kullanılmamalıdır. portföy karar matrisi çıktısı yatırım, kredi, vergi ya da muhasebe görüşü yerine geçmez.

### Vaka ve Mentor bağlantısı

- Vaka: P6-CASE-11
- Model: [Ürün Kârlılığı](/app/finance/models/PRODUCT_PROFITABILITY)
- Mentor eylemi: “Bu model çalışmasının hesap izini değiştirmeden açıkla; en hassas varsayımı ve bir sonraki doğrulama adımını söyle.”
- Değerlendirme: üç SKU portföy kararı

## Kaynaklar

1. [KAP — Finansal Tablolar](https://www.kap.org.tr/tr/FinansalTablolar)
2. [NYU Stern, Aswath Damodaran — Corporate Finance](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cflect.htm)

> **Uyarı:** yüksek marjı düşük hacimden bağımsız yorumlamak

**Görev:** üç SKU portföy kararı


---
