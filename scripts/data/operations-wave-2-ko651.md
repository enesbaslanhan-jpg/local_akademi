# KO 651 — Kök Neden Analizi

## Metadata

- **Başlık:** Sorun Neden Tekrar Ediyor?
- **Özet:** Tekrarlayan bir operasyon sorununu belirti, olası neden ve doğrulanmış neden olarak ayır. “Neden?” sorularını kanıtla ilerlet; kişiyi suçlayan veya tahmine dayanan cevaplarda durma. Çalışmanın sonunda kanıt durumu ve doğrulama adımı bulunan bir Kök Neden Sorgulama Kaydı oluştur.
- **Öğrenme çıktıları:** Sorunu ölçülebilir olay biçiminde tanımlamak; neden zincirindeki varsayım ile kanıtı ayırmak; Beş Neden tekniğini sayıya takılmadan ve birden fazla neden olasılığını koruyarak kullanmak; düzeltici eylemden önce nedeni sınayacak doğrulama adımı belirlemek.
- **Ders süresi:** 14 dakika
- **Görev süresi:** 15 dakika
- **Görünür bloklar:** Tekrarlayan sorun vakası, kanıt sorgusu, Beş Neden zinciri, yanlış duraklar, Kök Neden Sorgulama Kaydı
- **Karar aracı:** Yok

## Üçüncü kez yanlış ürün gönderildi

Bir e-ticaret işletmesinde aynı ay içinde üç müşteriye yanlış boy ürün gönderilir. İlk olayda paketleme çalışanına daha dikkatli olması söylenir. İkinci olayda raflara büyük etiketler yapıştırılır. Üçüncü olayda hata yine oluşur.

“Çalışan dikkatsizdi” açıklaması kolaydır; fakat bir sonraki siparişte neyin değişmesi gerektiğini söylemez. Raf etiketi de görünür bir önlemdir, ancak yanlış seçimin hangi koşulda oluştuğunu anlamadan uygulanmıştır.

Analizi şu cümleyle başlat:

> Son 30 günde, paketleme aşamasında üç sipariş kaydındaki beden ile kutuya konan beden eşleşmedi.

Bu tanım “müşteriler sürekli yanlış ürün alıyor” ifadesinden daha kullanışlıdır. Dönemi, olay sayısını, karşılaştırılan şartı ve hatanın görüldüğü adımı belirtir.

## Belirti, olası neden ve doğrulanmış neden

- **Belirti:** Görülen sonuç. Yanlış beden müşteriye gönderildi.
- **Olası neden:** Sonucu açıklayabilecek, henüz sınanmamış fikir. Benzer ürünler aynı rafta olabilir.
- **Doğrulanmış neden:** Kayıt, gözlem veya kontrollü denemeyle olayla bağlantısı desteklenen neden. Hatalı üç siparişin tamamında eski raf kodu kullanılmış ve kod düzeltildiğinde test siparişleri doğru toplanmış olabilir.

Bir açıklamanın kulağa mantıklı gelmesi onu kanıt yapmaz.

## “Neden?” sorusunu kanıtla ilerlet

Beş Neden, bir sorun ifadesine art arda “neden?” sorarak belirtilerin altındaki nedenleri araştıran basit bir tekniktir. Beş sayısı bir hedef değil, sorgulamayı ilk cevapta durdurmama hatırlatıcısıdır. Bazı olaylarda üç soru yeterli olur; bazılarında dallanan birden fazla neden zinciri gerekir.

Vaka için ilk zincir şöyle kurulabilir:

1. **Neden yanlış beden kutuya kondu?** Toplama sırasında raf kodu sipariş kaydıyla eşleştirilmedi.
2. **Neden eşleştirilmedi?** Paketleme ekranında yalnız ürün adı görünüyordu; beden alanı aşağıda kalıyordu.
3. **Neden beden alanı görünür değildi?** Son ekran değişikliğinde küçük ekran görünümü test edilmemişti.
4. **Neden test edilmemişti?** Değişiklik kabul kontrolünde mobil cihaz senaryosu yoktu.

Bu zincir henüz gerçeğin kendisi değildir. Her cevap için kanıt gerekir:

| Neden iddiası | Aranacak kanıt |
|---|---|
| Beden alanı görünmüyor | Hata anındaki cihaz ve ekran görüntüsü |
| Üç hata aynı koşulda oluştu | Sipariş zamanı, kullanıcı ve cihaz kayıtları |
| Ekran değişikliği sonrası başladı | Değişiklik tarihi ile hata tarihlerini karşılaştırma |
| Mobil senaryo test edilmedi | Test veya kabul kontrol kayıtları |

Kayıtlar hatalı siparişlerin farklı cihazlarda oluştuğunu gösterirse bu zincir zayıflar. O zaman raf yerleşimi, barkod, ürün kodu veya eğitim gibi başka bir dalı incelemek gerekir.

## Yanlış durakları fark et

**“Çalışan hata yaptı.”**

Bu, olayın kimde göründüğünü söyler; hatayı kolaylaştıran koşulu açıklamaz. “Doğru seçimi yapmasını hangi bilgi veya kontrol engelledi?” diye devam et.

**“Yoğunluktan oldu.”**

Yoğunluk ölçülmediyse tahmindir. Hataların sipariş hacmi, vardiya, saat ve kuyrukla ilişkisini karşılaştır.

**“Sistem bozuk.”**

Hangi ekran, alan veya kuralın hangi davranışı ürettiğini göstermez. Sorunu gözlenebilir hâle getir.

**“Kök neden budur; çünkü ekip öyle düşünüyor.”**

Ekip görüşü olası neden üretir. Doğrulama için kayıt, gözlem veya küçük bir sınama gerekir.

## Kanıt türünü seç

Her neden aynı kanıtla sınanmaz. Uygun olanı seç:

- Zaman damgası, hata veya işlem kaydı
- Hata anındaki ekran görüntüsü ya da belge
- İş başında doğrudan gözlem
- Hatalı ve hatasız örneklerin karşılaştırılması
- Değişiklik öncesi ve sonrası sonuç
- Nedeni geçici olarak ortadan kaldıran küçük, güvenli deneme

Kanıt yoksa “doğrulanmadı” yaz. Bu bir başarısızlık değil, analizin dürüst sınırıdır.

## Düzeltmeye geçmeden önce sınama yap

Ekrandaki beden alanının görünmemesi olası neden ise küçük sınama şöyle olabilir:

1. Alanı ekranın üst bölümüne taşı.
2. Aynı cihaz tipinde 20 test siparişi çalıştır.
3. Doğru beden seçimi ve işlem süresini kaydet.
4. Sonucu eski düzenle karşılaştır.

Hata azalmazsa neden yeterince desteklenmemiştir. Çözümü büyütmek yerine analize dön.

Kök neden analizi her zaman tek bir nihai neden üretmez. İnsan, yöntem, bilgi, ekipman ve çalışma koşulları birlikte etkili olabilir. Amaç bir kişiyi bulmak değil, sorunun tekrarını azaltacak ve kanıtla savunulabilecek müdahale noktasını seçmektir.

## Ders sonu uygulama — Kök Neden Sorgulama Kaydı

Son dönemde en az iki kez tekrarlanan tek bir sorun seç.

### Sorun tanımı

- Ne oldu? ..................................................................
- Hangi dönemde, kaç kez? ...................................................
- Beklenen şart neydi? ......................................................
- Sorunu gösteren kayıt veya gözlem: ........................................

### Neden zinciri ve kanıt denetimi

| Sıra | “Neden?” sorusuna cevap | Durum: varsayım / destekleniyor / çürütüldü | Kanıt veya veri boşluğu |
|---:|---|---|---|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |
| 4 |  |  |  |
| 5 |  |  |  |

Beş satırı doldurmak zorunda değilsin. Kanıtın ayrıldığı yerde yeni bir dal açabilirsin.

### Doğrulama kararı

- En güçlü neden adayı: .....................................................
- Bu adayın dayandığı kanıt: ................................................
- Eksik kanıt: ...............................................................
- Yapacağım küçük ve güvenli sınama: ........................................
- Sonucu değerlendireceğim ölçüt ve tarih: ..................................

Çıktın, en az bir neden iddiasını kanıta bağlamalı ve doğrulanmamış iddiaları açıkça etiketlemelidir.

## Doğrudan yöntem kaynakları

- [ASQ — Five Whys and Five Hows](https://asq.org/quality-resources/five-whys): Tekniğin amacı, kullanım alanı ve uygulama adımlarını doğrudan açıklar; beşten az veya fazla soru gerekebileceğini belirtir.
- [Institute for Healthcare Improvement — 5 Whys: Finding the Root Cause](https://www.ihi.org/library/tools/5-whys-finding-root-cause): Yöntem yönergesi, örnek ve çalışma şablonu sunar; birden fazla kök neden olabileceği uyarısını içerir.
- [ASQ — Root Cause Analysis](https://asq.org/quality-resources/root-cause-analysis): Kök neden analizini daha geniş problem çözme çerçevesine yerleştirir.

Bu kaynaklar yöntemi doğrudan destekler. Dersin e-ticaret vakası ve kayıt formu LocalAkademi için özgün hazırlanmıştır; karmaşık veya yüksek riskli olaylarda bu kısa teknik tek başına yeterli kabul edilmemelidir.
