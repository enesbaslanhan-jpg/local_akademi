# LocalAkademi Kurs İçeriği Kalite Uygulama Denetimi v0.1

**Tarih:** 29 Temmuz 2026
**Kapsam:** Plan 1 — İçerik Kalite Standardı
**Karar:** **NO-GO — yeni `%25` özgünlük standardı uygulanmadan toplu yeniden yayın yapılmamalı**

## Executive Summary

- **Teknik bütünlük güçlü, editoryal özgünlük kapısı yetersizdir.** Mevcut doğrulayıcı 204 kursu, 840 topic KO'yu, kaynakları, quizleri, flashcard'ları ve görevleri doğruluyor; ancak yalnızca aynı kurs içindeki komşu KO'ları `%72` sınırıyla karşılaştırıyor.
- **Yeni `%25` kurs benzerliği kuralı mevcut veriyle geçilmiyor.** Bu denetimde kullanılan salt-okunur 5-gram Jaccard tanı taramasında 20.706 yayımlanmış kurs çiftinin 20.031'i `%25` üzerinde çıktı. Medyan `%48,70`, en yüksek çift `%91,68` oldu. Bu tanı skoru planın yedi bileşenli nihai puanı değildir; fakat yayın engeli gerektirecek kadar güçlü bir risk sinyalidir.
- **Görsel çeşitlilik ölçeklenmemiştir.** 840 yayımlanmış KO'nun 837'sinde tablo, 831'inde alıntı kutusu ve 833'ünde kod/formül bloğu bulunurken yalnızca 3 KO Markdown görseli içeriyor. Depoda doğrulanan üç özgün SVG'nin tamamı fiyat/marj pilotuna aittir.
- **Önerilen ilk uygulama P0 kalite altyapısıdır.** Kurs amaçları ve metadata modeli, tüm çiftleri tarayan bileşik benzerlik motoru, KO örtüşme/istisna kaydı, görsel varlık envanteri ve gerçek bir publish gate kurulmadan 204 kursun yeniden yazımına başlanmamalıdır.

## 1. İncelenen kanıtlar

| Alan | Kanıt |
|---|---|
| Kurs ve KO modelleri | `prisma/schema.prisma` — `Course`, `Lesson`, `KnowledgeObject`, `KnowledgeObjectVersion`, `KnowledgeObjectSource`, `ReviewRecord` |
| Toplu içerik üretimi | `scripts/upgrade-all-topic-courses-adaptive.ts` |
| Mevcut kalite doğrulayıcı | `scripts/verify-all-topic-courses-adaptive.ts` |
| Fiyat/marj görsel pilotu | `scripts/verify-pricing-margin-pilot.ts`, `frontend/public/academy-visuals/pricing-margin/` |
| Kurs API'si | `src/services/courses.ts` |
| KO API'leri | `src/services/knowledge.ts`, `src/services/knowledge-v2.ts` |
| Kurs oynatıcı | `frontend/src/pages/CoursePlayerPage.jsx`, `CoursePlayerPage.module.css` |
| Bilgi nesnesi ekranı | `frontend/src/pages/KnowledgeDetail.jsx`, `KnowledgeDetail.module.css` |
| Kurs kataloğu | `frontend/src/pages/CoursesPage.jsx` |
| Önceki rapor | `docs/audits/ADAPTIVE_ALL_COURSES_V2_REPORT_2026-07-28.md` |

## 2. Mevcut durum

### 2.1 Envanter

29 Temmuz 2026 tarihinde çalışan PostgreSQL veritabanı ve mevcut doğrulayıcı üzerinden:

| Metrik | Değer |
|---|---:|
| Toplam kurs | 204 |
| Topic kurs | 200 |
| Küratörlü legacy öğrenme yolu | 3 |
| Fiyat/marj pilotu | 1 |
| Topic kurslarda kullanılan benzersiz KO | 840 |
| `adaptive-operational-v2-scaled` KO | 830 |
| Korunan pilot/knowledge-v2 KO | 10 |
| İçerik arketipi | 11 |
| Tam metin hash'i benzersiz KO | 840 / 840 |

`npm run learning:adaptive-v2:verify` başarılıdır. Bu başarı aşağıdaki mevcut sözleşmeyi doğrular:

- kurs sayısı ve yayın durumu;
- kurs başına açıklama ve en az üç çıktı;
- KO yayın/doğrulama durumu;
- minimum içerik uzunluğu;
- en az iki kaynak ve scaled içerikte iki yüksek otoriteli kaynak;
- published quiz ve minimum soru sayısı;
- quiz açıklaması;
- published flashcard ve temel alanları;
- görev talimatı, örnek çıktı, kontrol listesi ve rubrik;
- tam metin hash tekrarının olmaması;
- komşu dersler arasında en fazla `%72` 5-gram benzerliği;
- legacy kursların 10'ar özgün KO'dan oluşması.

### 2.2 Mevcut doğrulayıcı ile yeni standart arasındaki çelişki

`scripts/verify-all-topic-courses-adaptive.ts`:

- yalnızca topic kursların kendi içindeki **komşu derslerini** karşılaştırır;
- eşiği `%72` olarak uygular;
- kurs amacı, quiz, görev, örnek olay ve görselleri ağırlıklı bileşik skorla karşılaştırmaz;
- tüm kurs çiftlerini taramaz;
- KO örtüşme istisnası kaydetmez;
- sonuçları kalıcı bir kalite değerlendirmesi olarak saklamaz;
- publish endpoint'inde zorunlu bir engel değildir.

Yeni plan ise bütün kurs çiftlerinde en fazla `%25` toplam benzerlik ve en fazla `%25` KO örtüşmesi istemektedir. Dolayısıyla mevcut `PASS`, yeni standarda göre yayın onayı anlamına gelmez.

### 2.3 Bağımsız tanı taraması

Bu denetimde uygulama/veri değiştirmeden, yayımlanmış 204 kursun ders KO metinleri birleştirilerek normalize edilmiş 5-gram Jaccard taraması yapıldı.

| Tanı metriği | Sonuç |
|---|---:|
| Karşılaştırılan kurs çifti | 20.706 |
| `%25` üzerinde çift | 20.031 |
| Medyan benzerlik | `%48,70` |
| En yüksek benzerlik | `%91,68` |
| En yüksek çift | `Pazar Yeri Seçimi` / `Pazar Yeri Analizi` |
| `%25` üzerinde KO Jaccard örtüşmesi | 2 çift |

**Yorum:** Bu tarama yalnızca ders metni 5-gram benzerliğidir; Plan 1'deki yedi ağırlıklı bileşenin resmî implementasyonu değildir. Buna rağmen yüzeysel şablon tekrarını ve kapsam çakışmasını güçlü biçimde gösterir. Sonuç yayın kararını tek başına vermemeli, P0 yeniden inceleme kuyruğunu oluşturmalıdır.

### 2.4 Görsel ve teknik anlatım

Salt-okunur içerik taraması:

| İçerik işareti | KO sayısı |
|---|---:|
| Markdown tablo | 837 |
| Markdown alıntı/uyarı kutusu | 831 |
| Kod/formül bloğu | 833 |
| Markdown görsel | 3 |

Doğrulanan görsel dosyaları:

- `frontend/public/academy-visuals/pricing-margin/price-stack.svg`
- `frontend/public/academy-visuals/pricing-margin/markup-margin.svg`
- `frontend/public/academy-visuals/pricing-margin/discount-heatmap.svg`

`CoursePlayerPage` ve `KnowledgeDetail` Markdown tablo, alıntı ve görsel render edebiliyor. Bu, sunum kabiliyetinin var olduğunu; eksikliğin içerik/varlık üretimi, semantik görsel seçimi ve kalite kapısında bulunduğunu gösterir.

## 3. Hazır, kısmi ve eksik alanlar

| Gereksinim | Durum | Açıklama |
|---|---|---|
| Published/non-demo KO | Hazır | API ve doğrulayıcılarda kontrol var |
| Kaynak ilişkisi | Hazır | `KnowledgeObjectSource` ve kaynak ekranı var |
| Version geçmişi | Kısmi | Model var; `currentVersion` zorunlu değil |
| Tam metin tekrar tespiti | Hazır | SHA-256 tam eşleşme kontrolü var |
| Tüm kurs çiftlerinde `%25` benzerlik | Yok | Mevcut kontrol komşu KO ve `%72` |
| Yedi bileşenli ağırlıklı skor | Yok | Amaç, quiz, örnek, görsel ayrı ölçülmüyor |
| KO örtüşme + istisna kaydı | Yok | Hesap/saklama/yönetim ekranı yok |
| Course Purpose Statement | Yok | `Course` modelinde alan yok |
| Zengin kurs metadata'sı | Kısmi | Kategori, seviye, süre, outcomes var; rol/aşama/problem/ülke/dil/ön koşul yok |
| Görsel özgünlük/hash kapısı | Yok | Yalnız fiyat pilotunda dosya varlık kontrolü var |
| Teknik kutu standardı | Kısmi | Markdown kalıpları var; tipli veri ve zorunlu çeşitlilik yok |
| Manuel editoryal publish gate | Kısmi | KO review modeli var; kurs seviyesinde gate yok |
| E-kütüphane filtreleri | Kısmi | Arama, kategori ve seviye var |
| Mobil erişilebilirlik gate'i | Not verified | CSS bulunuyor; 204 kurs için otomatik erişilebilirlik raporu yok |

## 4. Hedef mimari

### 4.1 Schema değişiklikleri

İlk migration taslağı aşağıdaki kavramları sağlamalıdır:

1. `Course` alanları:
   - `purposeStatement`
   - `targetRole`
   - `businessStage`
   - `solvedProblem`
   - `prerequisites` (JSON veya normalize ilişki)
   - `countryCode`, `language`
   - `contentUpdatedAt`
   - `editorialStatus`
2. `CourseQualityAssessment`:
   - course, standardVersion, status, aggregate score;
   - bileşen skorları ve eşikler;
   - değerlendirilen sürüm/hash;
   - değerlendiren motor ve zaman.
3. `CourseSimilarityPair`:
   - iki kurs, bileşik skor ve alt skorlar;
   - karar, inceleme durumu, açıklama.
4. `CourseOverlapException`:
   - kurs çifti, ortak KO'lar, gerekçe, onaylayan, bitiş tarihi.
5. `ContentAsset` / `CourseContentAsset`:
   - dosya hash'i, lisans, kaynak, alt metin, görsel tipi ve bağlı ders/KO.
6. `CourseEditorialReview`:
   - reviewer, kontrol listesi, karar, not ve zaman.

`KnowledgeObject.currentVersionId` için yeni yayında `NOT NULL` eşdeğeri uygulama kapısı kurulmalı; mevcut veriye doğrudan zorunluluk getirmeden önce backfill raporu alınmalıdır.

### 4.2 Backend

- Tek, sürümlü `CourseQualityEngine` oluşturulmalı.
- Bileşik skor şu bileşenleri ayrı ayrı üretmeli: amaç/çıktı, ders semantiği, KO örtüşmesi, quiz, giriş-kapanış, vaka/görev, görsel.
- Her bileşenin normalize etme, stop-word, embedding/model sürümü ve eşik sözleşmesi test fixture'larıyla sabitlenmeli.
- Bütün çiftleri her içerik değişikliğinde yeniden hesaplamak yerine içerik hash'i ve aday üretimi kullanılmalı.
- Publish işlemi kalite değerlendirmesi, kaynak, metadata, varlık lisansı ve manuel review olmadan `409/422` dönmeli.
- Yönetici için başarısız kapıları ve en yakın benzer kursları dönen API eklenmeli.
- Var olan `verify-all-topic-courses-adaptive.ts`, yeni motorun raporlayıcısı olmalı; ayrı ve daha gevşek bir gerçeklik üretmemeli.

### 4.3 Frontend

- Admin kurs düzenleme ekranında amaç, hedef rol, aşama, problem ve güncellik alanları.
- “Kalite” panelinde toplam skor, yedi alt skor, benzer kurslar, ortak KO'lar ve istisna talebi.
- Görsel varlık panelinde önizleme, alt metin, lisans/kaynak ve hash tekrarı uyarısı.
- Kurs kataloğunda alt kategori, rol, işletme aşaması, süre, durum, kaydedilen/önerilen/yeni/güncellenen filtreleri.
- Kurs detayında amaç, ölçülebilir çıktılar, ön koşullar, güncellik ve ülke bağlamı.
- Markdown sunumu korunmalı; semantik “Teknik Bilgi”, “Formül”, “Risk Matrisi” gibi tipli bloklar erişilebilir bileşenlere dönüştürülmeli.

## 5. Test planı

### Otomatik

- 204 kursun 20.706 çiftini kapsayan `%25` bileşik skor testi.
- KO Jaccard örtüşmesi ve onaylı istisna testi.
- Aynı başlık değiştirilmiş metin, aynı quiz seçenekleri, aynı görev/vaka ve giriş-kapanış fixture'ları.
- Görsel SHA-256 ve algısal hash tekrar testi.
- Kaynak, `currentVersion`, demo/unpublished/archived KO testi.
- Course Purpose Statement ve ölçülebilir fiil denetimi.
- Metadata tamlık ve yayın endpoint'i engel testleri.
- Mobil tablo/görsel taşması, alt metin, klavye ve kontrast testleri.

### Manuel

- Editör, konu uzmanı ve ürün sorumlusu üçlü kontrolü.
- Benzerlikte yanlış pozitif/negatif örneklem incelemesi.
- Yüksek riskli finans, vergi, mevzuat ve destek içeriklerinde kaynak güncellik kontrolü.
- Her arketipten en az iki kursla kullanıcı anlaşılabilirlik testi.

### Bu denetimde çalıştırılan kontroller

- `npm run learning:adaptive-v2:verify` — PASS.
- Hedef backend testleri (`documents`, `business-tracker`, `video-progress`) — 50/50 PASS.
- Hedef frontend öğrenme testleri — 7/7 PASS.

Bu testler yeni `%25` standardının uygulandığını doğrulamaz.

## 6. Rollout

1. Kalite motorunu “raporla, engelleme” modunda çalıştır.
2. 204 kurs için baseline ve manuel örneklem üret.
3. Eşik/model kalibrasyonunu pilot 10 kurs üzerinde tamamla.
4. Fiyat/marj pilotunu ilk tam uyumlu referans kurs yap.
5. En yüksek benzerlik kümelerini konu uzmanıyla ayır/birleştir/yeniden yaz.
6. Önce yeni yayınlarda, sonra güncellenen kurslarda blocking gate aç.
7. Mevcut katalog için kategori bazlı dalgalarla yeniden onay uygula.
8. Her dalgada geri alma için önceki KO sürümünü ve kurs kalite sonucunu koru.

## 7. Backlog

### P0

- Bileşik `%25` kalite motoru ve tüm kurs çifti raporu.
- Course Purpose Statement ve zorunlu metadata sözleşmesi.
- Kurs seviyesinde publish gate ve manuel review.
- KO overlap/istisna modeli.
- İçerik/görsel varlık envanteri ve lisans/hash kontrolü.

### P1

- Admin kalite ekranı ve yeniden yazım kuyruğu.
- En yüksek benzerlik kümelerinin editoryal ayrıştırılması.
- Tipli teknik kutular ve görsel bileşen kütüphanesi.
- Geniş e-kütüphane filtreleri.

### P2

- Önerilen/kaydedilen/en çok kullanılan katalog görünümleri.
- İçerik güncellik hatırlatmaları.
- Editör verimlilik ve kalite trend dashboard'u.

### P3

- Çok dilli/çok ülkeli kalite profilleri.
- Öğrenme sonucuna göre kalite ağırlığı kalibrasyonu.
- Gelişmiş görsel algısal benzerlik.

## 8. Riskler ve açık sorular

- `%25` eşiğinin hangi semantik model ve Türkçe normalizasyonuyla uygulanacağı henüz kararlaştırılmamıştır.
- Planın önerdiği ağırlıklar ürün kuralıdır; kullanıcı öğrenme sonucu verisiyle doğrulanmış değildir.
- Aynı temel mevzuatı kullanan kurslarda belgelenmiş istisna süreci gereklidir.
- 204 kursu tek seferde yeniden yazmak kaliteyi yeniden şablonlaştırabilir.
- Embedding sağlayıcısı, maliyeti ve deterministik tekrar üretilebilirliği **Not verified**.
- Görsel telif kayıtlarının mevcut üç SVG dışında tutulduğu merkezi bir kayıt **Not verified**.
- 204 kursun tamamında gerçek mobil cihaz ve ekran okuyucu testi **Not verified**.

## 9. Bağımlılık sırası

`Metadata sözleşmesi → kalite veri modeli → bileşik ölçüm motoru → baseline → admin review → pilot yeniden yazım → publish gate → katalog filtreleri → dalgalı katalog iyileştirmesi`
