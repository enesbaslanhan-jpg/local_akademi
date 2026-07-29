# LocalAkademi Üç Hatlı Uygulama Planı v0.1

**Tarih:** 29 Temmuz 2026
**Kaynak plan:** `LocalAkademi_Three_Track_Plan_v0.1.md`
**Durum:** Planlama tamamlandı; uygulama başlangıç kapısı hazır
**Önerilen program kararı:** **Önce ortak kalite temeli, sonra belge pilotu ve video pilotu**

## Executive Summary

- **Üç hattın da temeli vardır fakat hiçbiri yeni kabul kriterlerinin tamamını karşılamaz.** İçerikte 204 kurs/840 KO, belgede güvenli upload/OCR/öneri, videoda 30 paket/player/progress mevcuttur.
- **En kritik bağımlılık içerik kalite motorudur.** Mevcut kurs benzerliği yeni `%25` standardını ölçmez ve bağımsız tanı taraması ciddi tekrar gösterir. Video senaryoları bu kurs amaçlarına dayanacağı için önce içerik amacı ve yayın kapısı kurulmalıdır.
- **Belge hattı bağımsız bir P0 pilot olarak ilerleyebilir.** Kargo CSV/XLSX doğrulama ve deterministik KPI motoru, içerik yeniden yazımıyla aynı geliştirici/veri migration penceresine bindirilmeden yürütülebilir.
- **Toplu üretim yerine kapılı pilot önerilir.** İçerikte 10 kurs, belgede kargo raporu, videoda 5 kurs; kabul metrikleri sağlandıktan sonra kategori dalgaları.

## 1. Başlangıç durumu

| Hat | Mevcut güçlü temel | Ana açık | Başlangıç kararı |
|---|---|---|---|
| İçerik | 204 kurs, 840 KO, kaynak/quiz/flashcard/görev | Gerçek `%25` tüm-kurs gate'i ve görsel çeşitlilik yok | P0 ilk iş |
| Belge | Güvenli upload, OCR, sahiplik, kayıt önerisi | Veri doğrulama, KPI/grafik, XLSX, Mentor/görev akışı yok | Kargo pilotu |
| Video | 30 paket, schema/API/player/progress | 0 published medya; kurs modeli, review, similarity ve admin UI yok | 5 kurs pilotu |

## 2. Ortak mimari ilkeler

1. **Sürüm ve provenance:** İçerik, doğrulanmış belge verisi ve video script'i değiştirilemez sürüm/hash ile izlenir.
2. **İnsan onayı:** Semantik benzerlik, OCR/alan çıkarımı ve AI açıklaması tek başına yayın/final analiz kararı vermez.
3. **Deterministik hesap:** Finansal/operasyonel KPI ve gate skorları sürümlü fonksiyonlarla hesaplanır.
4. **Tenant izolasyonu:** Belge, analiz, görev ve Mentor bağlamı workspace sınırını geçemez.
5. **Publish state machine:** Draft → review → approved → published; başarısız gate atlanamaz.
6. **Pilot ve feature flag:** Yeni modeller önce gölge/raporlama modunda, sonra küçük pilotta blocking olur.
7. **Erişilebilirlik ve kaynak:** Sonradan eklenecek süs değil, yayın kapısının parçasıdır.

## 3. Uygulama sırası

### Faz 0 — Güvenli başlangıç ve karar kayıtları

**Amaç:** Birbirine çarpan migration ve ürün kararlarını sabitlemek.

- Üç hattın ADR'lerini oluştur.
- Mevcut PostgreSQL yedeği ve migration validation kapısını koru.
- İçerik similarity algoritması/model sürümünü seç.
- Belge retention/KVKK ve malware yaklaşımını kararlaştır.
- Video provider/storage ve ticari ses lisansı kararını kaydet.
- Feature flag ve event naming sözleşmesini oluştur.

**Çıkış:** Onaylı veri sözleşmeleri, tehdit modeli ve rollout/rollback planı.

### Faz 1 — İçerik kalite omurgası

**Amaç:** Yeni içerik veya video üretmeden doğru özgünlük ve yayın gerçeğini kurmak.

- Course Purpose Statement ve metadata.
- `CourseQualityAssessment`, pair score, KO exception, editorial review ve asset inventory.
- Yedi bileşenli tüm-kurs similarity motoru.
- 204 kurs baseline; yanlış pozitif kalibrasyonu.
- Admin kalite raporu.
- Önce raporlama, sonra yeni/güncellenen içerikte blocking publish gate.

**Pilot:** 10 kurs; fiyat/marj pilotu referans.

**Çıkış:** `%25` gate'i tekrar üretilebilir, açıklanabilir ve manuel review ile bağlı.

### Faz 2 — İşletme belgesi kargo pilotu

**Amaç:** “Dosya saklama”yı doğrulanabilir işletme analizine dönüştürmek.

- Workspace-atomic upload.
- XLSX/CSV parser ve kolon eşleme.
- Dataset/field/verification/analysis modelleri.
- Kullanıcı doğrulama tablosu.
- Deterministik kargo KPI motoru.
- KPI/grafik/risk/öneri sonuç ekranı.
- Analizden BusinessRecord/görev ve Mentor bağlamı.
- Geçmiş, re-analysis ve export.

**Pilot:** 5–10 işletme, anonim/sentetik başlangıç.

**Çıkış:** Kullanıcı onayı olmadan final analiz üretilemez; KPI'lar kaynak satıra kadar izlenebilir.

### Faz 3 — Video veri modeli ve 5 kurs pilotu

**Amaç:** Render paketini yayımlanabilir ve ölçülebilir eğitim videosuna dönüştürmek.

- Course/lesson/KO video ilişkisi.
- Script version, source, asset, review ve quality assessment.
- Provider adapter ve secure playback.
- Admin scenario/review/publish UI.
- Özgün kadın anlatıcı voice profile.
- 5 kurs için 3–7 dakikalık özgün pilot.
- Kurs kartı/detail/lesson player entegrasyonu.
- Playback analytics ve a11y/mobile gate.

**Bağımlılık:** Faz 1 Course Purpose ve similarity normalization.

**Çıkış:** 5 kursun script, medya, caption, transcript, poster ve review zinciri tamamlanır.

### Faz 4 — İçerik editoryal dalgaları

**Amaç:** En benzer kümelerden başlayarak özgün kurslara geçmek.

- Benzerlik cluster'larını sırala.
- Aynı problemi çözen kursları birleştir veya kapsamını ayır.
- Her ana konuya amaca uygun özgün görsel/teknik blok.
- Quiz, flashcard, görev ve vaka tekrarlarını yeniden yaz.
- Kaynak güncellik ve mobil erişilebilirlik kontrolü.

**Dalga:** Kategori başına 10–20 kurs.

### Faz 5 — Belge paketleri ve video ölçekleme

- Belge: satış, maliyet, stok, pazarlama.
- Video: önce 20 kurs, kabul metrikleri sağlanırsa kategori dalgaları.
- E-kütüphane filtreleri ve dashboard devam kartları.
- Mentor'un yalnız verified/published kaynakları kullanması.

### Faz 6 — Analitik ve hardening

- İçerik kalite trendi.
- Belge correction rate, analysis completion ve task conversion.
- Video start/25/50/75/90/100, error, caption, speed ve learning outcome.
- Performans, job retry, backup/restore, data retention, security ve E2E.

## 4. P0/P1/P2/P3 birleşik backlog

### P0 — Beta engelleri

1. Tüm kurs çiftleri için bileşik `%25` kalite motoru.
2. Course Purpose/metadata ve kurs publish gate.
3. KO overlap istisnası, course review ve asset/license envanteri.
4. Belge doğrulanmış snapshot modeli ve workspace-atomic upload.
5. XLSX/CSV kargo parser + verification UI + deterministic KPI.
6. Belge tenant/AI threat model ve malware adapter.
7. Kurs/lesson video schema + script review/source/asset modeli.
8. Video provider/storage ve ticari ses lisansı kararı.
9. 5 kurs video ve 10 kurs içerik kalite pilotu.

### P1 — Kullanılabilir ürün akışları

1. Admin içerik kalite ve video review ekranları.
2. Workspace belge analiz kartı, history, result ve export.
3. Analizden görev ve Mentor entegrasyonu.
4. Kurs kartı/detail/lesson video deneyimi.
5. İçerik tipli teknik kutu ve görsel bileşenleri.
6. Video ve belge E2E analitikleri.

### P2 — Kapsam genişletme

1. 20 kurs video dalgası.
2. Kategori bazlı içerik yeniden yazım dalgaları.
3. Satış/maliyet/stok belge analiz paketleri.
4. E-kütüphane gelişmiş filtreleri ve dashboard önerileri.

### P3 — Optimizasyon

1. 204 kurs video yayılımı.
2. Çoklu belge dönem karşılaştırması.
3. Öğrenme sonuçlarına göre kalite ağırlığı kalibrasyonu.
4. Çok dil/ülke ve gelişmiş kişiselleştirme.

## 5. Bağımlılık haritası

```text
Course Purpose + metadata
        |
        +--> Course similarity/publish gate --> İçerik editoryal dalgaları
        |
        +--> Video purpose/script standard --> 5 kurs pilotu --> 20 kurs --> 204 kurs

Belge threat model + snapshot schema
        |
        +--> XLSX/CSV parser --> verification UI --> KPI engine
                                      |
                                      +--> result/history/export
                                      +--> task
                                      +--> Mentor verified context

Ortak event/version/provenance sözleşmesi
        +--> üç hattın analitik, audit ve rollback altyapısı
```

## 6. Kabul metrikleri

### İçerik pilotu

- Tüm kurs çifti skoru üretildi.
- Pilot 10 kurs diğer kurslarla `%25` veya altında ya da onaylı istisnalı.
- Her pilot kursta benzersiz purpose, ölçülebilir outcomes, kaynak, review.
- Her ana konuda amaca uygun en az bir özgün görsel/teknik anlatım.
- Quiz/görev/vaka tekrar kapıları PASS.

### Belge pilotu

- Kritik alanların `%100`'ü kullanıcıya onay/düzeltme için gösteriliyor.
- Onaysız dataset final analize gidemiyor.
- Golden fixture KPI mutabakatı `%100`.
- Çapraz tenant erişim testleri PASS.
- Parser hata/eksik kolon mesajı kullanıcı tarafından anlaşılabilir.
- Analizden görev ve Mentor aktarımı provenance koruyor.

### Video pilotu

- 5 kursun her birinde özgün script ve `%25` gate PASS/istisna yok.
- Kadın anlatıcı, 3–7 dakika, caption, transcript, poster ve kaynak tamam.
- Published olmayan video erişilemez.
- Mobil/klavye/caption/playback smoke testleri PASS.
- Progress ve milestone event'leri doğru.

## 7. Test kapıları

Her PR:

- TypeScript build ve frontend build.
- İlgili unit/integration/component testleri.
- Schema değişikliğinde migration validate + test DB apply + rollback.
- Secret scan.

Her pilot yayını:

- Tam backend/frontend test suite.
- Tenant/IDOR ve upload security.
- İçerik/video similarity baseline diff.
- Gerçek cihaz a11y/mobile.
- Backup/restore ve feature-flag rollback.

Mevcut denetim doğrulamaları:

- Adaptive V2 verifier — PASS.
- Video package verifier — 30/30 PASS.
- Hedef backend testleri — 50/50 PASS.
- Hedef frontend öğrenme testleri — 7/7 PASS.
- Yeni üç hatlı kabul testleri — henüz uygulanmadı.

## 8. Migration ve rollout stratejisi

- Aynı migration'da üç hattın bütün modelleri eklenmemeli.
- Her faz additive/nullable schema ile başlamalı.
- Backfill ayrı, idempotent ve dry-run destekli olmalı.
- Yeni okuma yolları feature flag altında çift-okuma veya gölge doğrulama yapmalı.
- Blocking gate ancak baseline ve manuel kalibrasyondan sonra açılmalı.
- Eski KO/video/document alanları en az bir stabil release boyunca korunmalı.
- Rollback yalnız kodu değil, yeni yayınları ve işleme job'larını durdurabilmeli.

## 9. Risk kaydı

| Risk | Etki | Önlem |
|---|---|---|
| `%25` yanlış kalibre edilir | Faydalı ortak kavramlar reddedilir | Bileşen skoru + manuel istisna + pilot |
| Üç hat aynı sprintte migration olur | Hata/rollback karmaşası | Faz başına ayrı migration/flag |
| OCR/AI sayıyı yanlış çıkarır | Yanlış iş kararı | Kullanıcı verification + deterministic KPI |
| Belge tenant dışına sızar | Kritik güvenlik/KVKK | Threat model, ownership, context isolation |
| 204 video toplu üretilir | Maliyet ve düşük kalite | 5 → 20 → kategori dalgaları |
| Mevcut içerik tekrarı videoya taşınır | Çifte yeniden iş | Video, içerik gate'inden sonra |
| Telif/lisans kaydı yok | Yayın riski | Asset registry ve publish gate |

## 10. Uygulama başlayınca ilk iki iş paketi

### İş Paketi A — P0 Course Quality Foundation

- ADR ve kalite sözleşmesi.
- Schema/migration.
- Bileşik score engine ve fixture'lar.
- Baseline CLI/report.
- Publish gate shadow mode.
- Admin read-only quality view.

### İş Paketi B — P0 Document Cargo Pilot Foundation

- Threat model.
- Dataset/field/verification schema.
- Workspace-atomic upload.
- XLSX/CSV parser fixture'ları.
- Verification UI skeleton.
- Deterministik KPI sözleşmesi.

Bu iki paket ayrı migration ve feature flag ile yürütülmelidir. Video P0 schema tasarımı İş Paketi A'nın purpose/version sözleşmesi kesinleşince başlar.

## 11. Açık kararlar / Not verified

- Türkçe semantik model, embedding sağlayıcısı ve similarity kalibrasyon seti.
- Belge retention/KVKK metni, malware ürünü ve üretim storage.
- Video provider, CDN/HLS maliyeti ve ticari kadın sesi lisansı.
- Grafik/görsel üretim lisans politikası.
- Pilot işletmeler ve anonim test verisi.

Bu kararlar kanıt olmadan varsayılmamalı; Faz 0 ADR'lerinde ürün sahibi tarafından onaylanmalıdır.

## 12. Bu planlama teslimatının sınırı

Bu aşamada:

- uygulama kodu değiştirilmedi;
- Prisma schema/migration/dependency/seed değiştirilmedi;
- production verisi değiştirilmedi;
- yalnız audit ve plan dokümanları oluşturuldu;
- mevcut çalışma ağacındaki bağımsız değişiklikler bu teslimata dahil edilmemelidir.
