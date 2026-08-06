import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KO_410_CONTENT = # İş Fikri Geliştirme: Varsayımı Kanıta Dönüştür

Bir iş fikriyle başladığında içindeki ses "Bu harika bir fikir!" diyebilir. Bu his gerçek ve değerli. Ama fikirle iş modeli arasında tek bir köprü var: **kanıt**.

Bir fikir ancak "şu müşteri, şu problemi, şu koşulda yaşıyor ve bunun için kaynak ayırmaya hazır" cümlesini somut veriyle destekleyebildiğinde sürdürülebilir bir iş modeline dönüşür.

Bu dersin amacı seni fikrinden vazgeçirmek değil; **neyi kanıtladığını, neyi henüz kanıtlamadığını görmeni sağlamak.** Çıktı: En riskli varsayımın ve onu test etme planın.

## 1. Fikir mi, Hipotez mi?

Her iş fikrinin içinde genellikle üç varsayım gizlidir:

| Varsayım Türü | Temel Soru | Örnek |
|---|---|---|
| **Müşteri** | Bu fikir kimin için? | "Paket servis yapan mikro işletmeler için" |
| **Problem** | Gerçekten bir sıkıntı yaşıyorlar mı? | "Operasyonel maliyetlerini takip edemiyorlar" |
| **Çözüm** | Bu çözümü benimserler mi? | "Saha odaklı dijital takip panelini kullanırlar" |

> **Kural:** Kanıtlanmamış varsayımlar fikrindeki belirsizlik alanlarıdır. Önce yanlış çıkması hâlinde iş fikrinin geri kalanını en çok etkileyecek varsayımı test et.

## 2. Kanıt Toplama: Sıfır Ürünle Ne Öğrenebilirsin?

Ürünü geliştirmeden veya para harcamadan önce öğrenebileceğin çok şey var.

### Saha Gözlemi
Müşterinin problemi şu an nasıl çözdüğünü yerinde gözlemle. Operasyon alanına git, mevcut iş akışını ve manuel kayıtları incele.

### Problem Görüşmesi
Çözümünden hiç bahsetme. Sadece geçmiş davranışları anlamaya çalış:

- "Bu işi şu an nasıl yürütüyorsunuz?"
- "En çok hangi aşamada zorlanıyorsunuz?"
- "Bu zorluğu aşmak için daha önce bir şey denediniz mi?"
- "Mevcut yöntemde sizi en çok ne yoruyor?"

> 🚫 **Şunları sorma:** "Bu uygulamayı kullansanız iyi olmaz mıydı?" ya da "Şu fiyata satın alır mıydınız?" — Bu sorular yalnızca "evet" üretir, gerçek bilgi vermez.

**İlk öğrenme turunda 5–10 görüşme makul bir başlangıç noktasıdır.** Bu sayı kesin bir doğrulama eşiği değildir. Yeni görüşmeler yeni bir örüntü üretmemeye başladığında — yani aynı problemleri, aynı bağlamlarda duymaya başladığında — bulgularını değerlendirmeye geçebilirsin.

### Üç Farklı Kanıt Sinyali

Görüşme dışında veri toplamak mümkün, ama sinyal düzeyi birbirinden farklı. Bu sınıflandırma genel bir kılavuzdur; bağlama ve araştırma amacına göre değişebilir.

| Sinyal Türü | Örnekler | Genel Sinyal Düzeyi |
|---|---|---|
| **Araştırma sinyali** | Sektör forumlarını okumak, rakip yorumlarını incelemek | Düşük — İkincil veri, dolaylı |
| **İlgi sinyali** | Landing page ziyareti, bekleme listesi kaydı | Orta — Merak var, niyet belirsiz |
| **Güçlü davranış sinyali** | Pilot talebi, ön ödeme, gerçek kaynak ayırma | Yüksek — Somut eylem |

## 3. Vaka: Burak'ın Kurye Fikri

Burak, teslimat kuryelerine yönelik esnek güvence çözümü sunmayı düşünüyor. Fikri: Kuryeler tam gün çalışmıyor, standart aylık poliçeler onlara uygun düşmeyebilir.

**Burak'ın üç varsayımı:**

| Varsayım | Burak Ne Düşünüyor? | Kanıt mı, His mi? |
|---|---|---|
| Müşteri | Saha kuryeleri esnek güvence istiyor | His |
| Problem | Mevcut poliçe modelleri ihtiyaçlarına uymuyor | His |
| Çözüm | Günlük mikro güvence ürünü satın alırlar | His |

**Burak iki haftada ne yaptı:**

**Mevzuat taraması:** Sigorta ürünlerinin düzenlemeye tabi olduğunu, yalnızca teknik bir uygulama geliştirerek piyasaya sunulamayacağını fark etti. Ürün modelinin uygulanabilirliği için yetkili sigorta kuruluşlarıyla ortaklık veya lisanslama koşullarının ayrıca incelenmesi gerektiğini gördü.

**Kurye görüşmeleri:** Sekiz kuryeyle konuştu. Kuryelerin ana gündeminin güvence değil, **ödeme gecikmesi ve hakediş takibi** olduğunu gördü.

**Burak'ın öğrendikleri:**
- Müşteri segmenti doğru — ama problem varsayımı yanlıştı
- Sigorta fikri tamamen rafa kalkmadı; ancak ortaklık koşulları daha fazla araştırma gerektiriyordu

**Burak'ın kararı:** Ödeme gecikmesini ayrı bir problem hipotezi olarak yeni bir araştırma turuna aldı. Güvence fikrini ileride değerlendirmek üzere beklemeye aldı.

## 4. Varsayım-Kanıt-Deney Panosu

Aşağıdaki tabloyu kendi fikrin için doldur:

| # | Varsayım | Öncelik (1=Kritik) | Kanıt Türü | Bulgu | Karar |
|---|---|---|---|---|---|
| 1 | Müşteri kim? | 1 | Gözlem / Görüşme | | Devam / Pivot |
| 2 | Problem ne? | 2 | Doğrudan mülakat | | Devam / Pivot |
| 3 | Çözüm ne? | 3 | Prototip / Manuel deney | | Devam / Pivot |

> **Yöntem:** En kritik varsayımla başla. Müşteri veya problem varsayımını çürütürsen, çözümü test etmene henüz gerek yok.

## 5. Bir Sonraki Adıma Geçmek

Görüşmelerinden bir örüntü çıkmaya başladığında — yani farklı kişilerden benzer problemler, benzer bağlamlarda geldiğinde — bulgularını değerlendirmeye geçebilirsin. Kesin bir sayı yoktur; örüntünün tekrarlanmaya başlaması asıl işarettir.

## 6. Ders Sonu Görevi

**En kritik kanıtlanmamış varsayımını seç ve onu test etmek için bir plan yap.**

Kararını şu formatta tanımla:

> "Benim en kritik kanıtlanmamış varsayımım: [Varsayım]. Bunu test etmek için [Yöntem] kullanacağım. Sonuç [Tarih] tarihine kadar elimde olacak. Eğer [Koşul] gerçekleşmezse [Yapacağım Eylem]."

## Kaynaklar

| Başlık | Yayıncı | URL | Lisans | Ne Destekliyor |
|---|---|---|---|---|
| Girişimcilik e-Akademi | KOSGEB | https://eakademi.kosgeb.gov.tr | Açık erişim, resmî | Girişimcilik eğitimlerinde iş modeli, müşteri analizi ve pazar araştırması bağlamı |
| Market Research and Competitive Analysis | U.S. SBA | https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis | Kamu malı / telifsiz | Müşteri ve pazar araştırmasının iş fikri değerlendirmesindeki rolü |
| SMEs and Entrepreneurship Outlook | OECD | https://www.oecd.org/en/topics/policy-issues/smes-and-entrepreneurship.html | Açık erişim (belge tarihine ve lisans notuna ayrıca bakılmalı) | KOBİ ve girişimcilik politikalarının genel bağlamı |

*Vakalar kurgusaldır. Kendi fikrin için verileri güncel resmî kaynaklardan al.*

const KO_414_CONTENT = # Müşteri Problemi: Görüşme Notlarından Gerçek Örüntüyü Bulmak

KO 1'de görüşmeler yaptın, notlar aldın. Şimdi önünde bir yığın bilgi var. Soru şu:

**Bu notlar gerçekten neyi söylüyor? Hangi bulgu gerçek bir problem örüntüsü, hangisi tekil bir yorum — ya da senin kendi yorumun?**

Bu dersin çıktısı tek bir cümle:

> "[Segment], [belirli durumda], [mevcut yöntem nedeniyle] [sonucu] yaşıyor."

Bu cümleyi kanıta dayanarak yazabildiğinde, bir sonraki adıma geçmeye hazırsın.

## 1. Notlarını Üçe Ayır

Görüşme notlarındaki her ifade üç kategoriden birine girer:

| Kategori | Tanım | Örnek |
|---|---|---|
| **Müşterinin doğrudan sözü** | Müşterinin tam olarak söylediği | "Yıl sonu her şeyi poşete koyup götürüyorum" |
| **Gözlenen davranış** | Müşterinin yaptığı, söylemediği | Excel defteri, kağıt kayıt, ek eleman tutma |
| **Senin yorumun** | Duyduklarından çıkardığın sonuç | "Muhasebe sistemi yok gibi görünüyor" |

> ⚠️ **Tehlike:** Bu üçü birbirine karıştığında, aslında kendi varsayımını doğrular gibi görünebilirsin. Müşterinin sözü ile senin yorumun ayrı kalmalı.

**Uygulaması:** Her notu ilgili sütuna yaz. "Yorum" sütununa düşen ifadeler doğrudan kanıt değildir.

## 2. Örüntüleri Kümele

Müşterinin sözlerini ve gözlenen davranışları şu problem türlerine göre gruplandır:

| Problem Türü | Tipik İfadeler / Davranışlar |
|---|---|
| **Zaman kaybı** | "Bunu yapmak çok uzun sürüyor", manuel tekrarlayan işler |
| **Hata veya veri kaybı** | "Bazen kayboldu", "yanlış yazdım fark etmedim" |
| **Gelir veya kaynak kaybı** | "Para nereye gidiyor bilemiyorum", ölçülemeyen maliyet |
| **Belirsizlik** | "Ne yapacağımı bilemedim", karar verememe |
| **Süreç veya mevzuat yükü** | Zorunlu adımlar için yardım alma, dışarıdan danışma |

Aynı problem türü birden fazla bağımsız görüşmede — farklı müşterilerden, kendi kelimeleriyle — tekrarlandığında bu bir örüntü adayı olmaya başlar. Yeni görüşmeler yeni bir şey söylememeye başladığında, bulgularını değerlendirmeye geçebilirsin. Kesin bir sayı yoktur; örüntünün tekrarlanması asıl işarettir.

> 💡 **Not:** Müşterilerin aynı kelimeleri kullanması gerekmez. Aynı altta yatan deneyimi anlatmaları önemlidir.

## 3. Vaka: Selin'in Görüşme Analizi

Selin, beş görüşme notunu üç kategoriye ayırdı:

| Görüşme | Müşterinin Kendi Sözü | Gözlenen Davranış | Selin'in Yorumu |
|---|---|---|---|
| 1 | "Yıl sonu poşetle fatura götürüyorum" | Yıl boyunca belge biriktirme | Muhasebe takibi yok |
| 2 | "Yazılım karmaşık geliyor" | Sadece defter kullanıyor | Dijital araç kullanmıyor |
| 3 | "Kâr-zarar bilmiyorum, manuel takip" | El hesabı, dağınık kayıt | Sistemsiz işleyiş |
| 4 | "POS idare ediyor, sorun yok" | Mevcut sistemle devam | Problem yok |
| 5 | "Belgeler kayboldu, müşavir dönemi kaotik" | Yıl sonu yoğun çalışma | Hazırlık süreci sorunu |

**Kümeleme sonucu:**

| Problem Türü | Kaç Görüşmede Çıktı? | Güçlü mü? |
|---|---|---|
| Zaman kaybı + süreç yükü (yıl sonu hazırlığı) | 3 / 5 | ✅ Örüntü adayı |
| Dijital araç kullanmama | 2 / 5 | ⚠️ Araştırılmalı |
| Problem yok | 1 / 5 | — |

**Selin'in fark ettiği:**
- "Dijital araç kullanmıyor" Selin'in yorumudur. Müşterinin doğrudan söylediği şey "Yazılım karmaşık geliyor"; gözlenen davranış ise yalnızca defter kullanmasıdır.
- Bu iki kanıt birlikte, kalıcı bir dijital alışkanlık eksikliğini tek başına kanıtlamaz. Daha fazla görüşme gerektirir.

**Selin'in mevcut bulgulara dayalı problem cümlesi:**

> "Görüşülen bazı küçük hizmet işletmeleri, yıl sonu mali müşavir görüşmesi öncesinde belgelerini bir araya getirirken zaman kaybı ve belge kaybı yaşıyor."

*(Bu cümle beş görüşmeye dayanıyor; segment tanımı için ek görüşme gerekir.)*

## 4. Problem Örüntüsü Değerlendirme Tablosu

Kendi görüşme notların için doldur:

\\\
Problem Türü: ___________________________
Kaç bağımsız görüşmede çıktı: ___ / ___
Müşterinin doğrudan sözü (en az 1 örnek): "___"
Gözlenen davranış: ___________________________
Benim yorumum (kanıt değil): ___________________________
Bu örüntüyü çürüten görüşme var mı?: [ ] Evet → Not: ___  [ ] Hayır
\\\

## 5. Örüntü Ne Zaman Yeterince Güçlüdür?

Bir örüntünün anlamlı olduğuna işaret eden durumlar:
- Aynı problem türü birden fazla bağımsız görüşmede tekrarlandı ve yeni görüşmeler farklı bir şey söylememeye başladı
- Her örnekte müşterinin kendi sözü veya gözlenen bir davranış var — yalnızca senin yorumun değil
- Örüntüyü **çürüten** görüşmeler de var ve bunların neden farklı olduğunu açıklayabiliyorsun

> ⚠️ **Önemli:** Yoğun bir problem yaşayan müşteri, mutlaka bunun için kaynak ayırmıyor olabilir. Problem yoğunluğu ile çözüme kaynak ayırma eğilimi ayrı değerlendirilmeli — ikisini aynı anda aramak gerekmiyor.

## 6. Ders Sonu Görevi

**KO 1'den gelen görüşme notlarını al. Her ifadeyi üç kategoriye ayır, ardından örüntüleri kümele.**

Çıktını şu formata dönüştür:

> "[Segment], [belirli durumda], [mevcut yöntem nedeniyle] [sonucu] yaşıyor."

Bu cümleyi hangi görüşmelerden elde ettiğini ve hangi kategoriye girdiğini belirt.

## Kaynaklar

| Başlık | Yayıncı | URL | Lisans | Ne Destekliyor |
|---|---|---|---|---|
| Girişimcilik e-Akademi | KOSGEB | https://eakademi.kosgeb.gov.tr | Açık erişim, resmî | Girişimcilik eğitimlerinde müşteri analizi ve ihtiyaç değerlendirmesi bağlamı |
| Market Research and Competitive Analysis | U.S. SBA | https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis | Kamu malı / telifsiz | Müşteri ve pazar araştırması genel yöntemleri |
| KOBİ Destek — Avrupa Komisyonu | EC | https://single-market-economy.ec.europa.eu/smes_en | Açık erişim (belge özelinde telif notu kontrol edilmeli) | Avrupa Komisyonu'nun KOBİ destek yaklaşımının genel bağlamı |

*Vakalar kurgusaldır. Kendi görüşmelerinden elde ettiğin gerçek notlarla çalış.*

const KO_418_CONTENT = # Hedef Kitle: Başlangıç Segmentini Belirle

KO 1'de en riskli varsayımını test ettin, KO 2'de hangi problemi kimin yaşadığına dair bir örüntü buldun. Şimdi soru şu:

**Bu problemi yaşayan hangi grupla başlamalısın?**

"Herkese" satmaya çalışmak kaynak israfıdır — her kişiye ulaşmak, her kişiye farklı konuşmak, her kişinin farklı satın alma sürecini yönetmek demektir. Başlangıçta en uyumlu grubu bulmak, kısıtlı zamanı ve bütçeyi doğru yere harcamak anlamına gelir.

## 1. İşletme Odaklı Segment Boyutları

Küçük işletme ve girişim bağlamında demografik bilgiler (yaş, şehir) genellikle ikincildir. Daha belirleyici boyutlar:

| Boyut | Soru | Örnek |
|---|---|---|
| **İşletme türü** | Ne tür bir işletme? | Üretim / hizmet / perakende / solo danışmanlık |
| **Faaliyet biçimi** | Nasıl çalışıyor? | Tek kişilik / ortaklı / ekipli |
| **İşlem sıklığı** | Problem ne kadar sık yaşanıyor? | Günlük / dönemlik / yıllık |
| **Mevcut çözüm** | Şu an ne kullanıyor? | Defter / Excel / mali müşavir / hiçbir şey |
| **Karar verici** | Çözüm satın almak kimin elinde? | Sahibi mi / muhasebeci mi / ortak mı? |
| **Problemin koşulu** | Problem ne zaman görünür? | Yıl sonu / büyüme döneminde / müşteri şikayetinde |

## 2. Segment Karşılaştırması

Ayşe, uzaktan çalışan profesyoneller için faturalama çözümü geliştiriyor. Üç potansiyel segment belirledi:

| Kriter | Segment A: Solo Tasarımcılar | Segment B: Yazılım Danışmanları | Segment C: İçerik Üreticiler |
|---|---|---|---|
| **İşletme biçimi** | Tek kişi, proje bazlı | B2B, çok müşterili | Değişken gelir, platform bağımlı |
| **Mevcut çözüm** | Defter veya basit uygulama | Ayrı Excel + muhasebeci | Platform otomatik kesiyor |
| **Problem yoğunluğu** | Orta | Yüksek (çoklu proje takibi) | Düşük |
| **Kaynak ayırma eğilimi** | Düşük–Orta | Yüksek | Düşük |
| **Erişim kolaylığı** | Yüksek | Yüksek | Orta |
| **Vergi/belge durumu** | *Araştırılacak* | *Araştırılacak* | *Araştırılacak* |

> ⚠️ **Tablonun dayanağı:** Bu örnekte değerler, Ayşe'nin her segmentten en az 2 kişiyle yaptığı 6 görüşmeden ve sektör forumu taramasından elde edildi. Dayanağı olmayan satırlar tabloya dahil edilmedi; vergi/belge durumu görüşmelerde henüz sorulmadı, bu nedenle *araştırılacak* olarak işaretlendi.

> ⚠️ Vergi ve belge durumu meslek adından çıkarsanamaz. Kişinin çalışma biçimine, sözleşme yapısına ve kayıt türüne göre farklılık gösterir. Müşteri görüşmesinde doğrudan sorulmalı.

**Ayşe'nin kararı:** Problem yoğunluğu ve kaynak ayırma eğilimi en yüksek olan Segment B ile başladı.

## 3. İlk Müşteri Segment Kartı

Persona yerine kanıta dayalı bu kartı doldur. Doldurulmayan alanlar, henüz ne bilmediğini gösterir — bu da değerli bir bilgidir.

\\\
Segment Kartı
─────────────────────────────────────────────
Segment tanımı (işletme türü + faaliyet biçimi):
  ________________________________________________

Problemin görüldüğü durum:
  ________________________________________________

Şu an kullandıkları çözüm / geçici yöntem:
  ________________________________________________

Bu segmente ulaşmak için kanal:
  ________________________________________________

Kararı kim veriyor? (sahibi / ortak / muhasebeci):
  ________________________________________________

Bu segment kartının dayanağı (hangi görüşme/veri?):
  ________________________________________________

Henüz bilmediğim şeyler:
  ________________________________________________
\\\

> Bu kart, görüşmelerden gelen veriye dayanmalı. Doldurulamamış alanlar bir sonraki araştırma turuna girer.

## 4. Segmenti Test Et

Segment kartın kurgusal bir başlangıçtır. Sahada doğrulanması gerekir:

| Test | Yöntem | Ne Öğrenirsin? |
|---|---|---|
| **Problem doğrulama** | İlk turda profile uyan birkaç kişiyle görüş; 3–5 görüşme başlangıç için kullanılabilir, kesin doğrulama eşiği değildir | Bu segmentte problem gerçek mi? |
| **Mesaj doğrulama** | Değer önermeni hedef kanalda paylaş | Hangi ifade yankı buluyor? |
| **Erişim doğrulama** | Bu segmente ulaşmanın maliyetini ve yolunu ölç | Sürdürülebilir mi? |

## 5. Ders Sonu Görevi

**KO 2'deki problem cümlesini al. Bu problemi yaşayan en az iki farklı segment tanımla ve başlangıç için en güçlüsünü seç.**

Kararını şu biçimde yaz:

> "İlk odaklanacağım segment: [Tanım]. Bu segmenti seçtim çünkü [problem yoğunluğu], [kaynak ayırma eğilimi] ve [erişim kolaylığı] açısından en güçlü. Karar şu görüşmelere/verilere dayanıyor: [Kaynak]. Henüz bilmediğim şunları bir sonraki turda araştıracağım: [Bilinmeyenler]."

## Kaynaklar

| Başlık | Yayıncı | URL | Lisans | Ne Destekliyor |
|---|---|---|---|---|
| Market Research and Competitive Analysis | U.S. SBA | https://www.sba.gov/business-guide/plan-your-business/market-research-competitive-analysis | Kamu malı / telifsiz | Hedef pazar belirleme ve pazar araştırması genel yöntemleri |
| Girişimcilik e-Akademi | KOSGEB | https://eakademi.kosgeb.gov.tr | Açık erişim, resmî | Girişimcilik eğitimlerinde hedef kitle ve ihtiyaç analizi bağlamı |
| SMEs and Entrepreneurship Outlook | OECD | https://www.oecd.org/en/topics/policy-issues/smes-and-entrepreneurship.html | Açık erişim (belge tarihine ve lisans notuna ayrıca bakılmalı) | KOBİ ve girişimcilik politikalarının genel bağlamı |

*Vakalar kurgusaldır. Kendi segmentini belirlerken gerçek görüşme notlarını ve gözlemlerini kullan.*

async function main() {
  console.log('Updating KO 410...')
  await prisma.knowledgeObject.update({
    where: { id: 410 },
    data: { content: KO_410_CONTENT }
  })
  console.log('✅ KO 410 updated')

  console.log('Updating KO 414...')
  await prisma.knowledgeObject.update({
    where: { id: 414 },
    data: { content: KO_414_CONTENT }
  })
  console.log('✅ KO 414 updated')

  console.log('Updating KO 418...')
  await prisma.knowledgeObject.update({
    where: { id: 418 },
    data: { content: KO_418_CONTENT }
  })
  console.log('✅ KO 418 updated')

  console.log('\n✅ All 3 KOs applied to database successfully.')
}

main().catch(console.error).finally(() => prisma.())
