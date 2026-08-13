# LocalKarar — Decision Tool, Tax ve Migration Manifest Audit

## Teknik özet

**`DC-TAX-013` gerçekten eksik.** Kod; PostgreSQL `DecisionCheck` / `DecisionCheckVersion` kayıtlarında, backend Decision Tool kataloğunda, hesaplama switch’lerinde, seed tanımında, frontend rota ve bileşenlerinde bulunmadı. Mevcut 12 Decision Tool içinde şirket türü, kuruluş biçimi veya vergisel yapı seçimi yapan semantik bir eşdeğer de yoktur.

Repo ve DB’de vergiyle ilgili eğitim içerikleri ile bir `KDV Ekleme` hesabı vardır. Bunlar `DecisionCheck` değildir ve “şahıs / limited / anonim şirket seçimi” gibi çok ölçütlü, hukuk-vergi hassasiyetli bir kararı vermez. En yakın görünen `DC-LOAN-007` yalnız “vergiler sonrası serbest nakit” girdisi kullandığı için metin taramasına takılmıştır; vergi veya şirket türü aracı değildir. Bu nedenle mevcut araçlardan birinin `DC-TAX-013` yerine yeniden kullanılması **semantik olarak güvenli değildir**.

Beklenen 13 kodun 12’si mevcut, yayınlanmış ve soft-delete edilmemiştir. Duplicate Decision Tool kodu yoktur. `DC-PROFIT-001` altında iki yayınlanmış sürüm bulunması (`1.0`, `2.0`) duplicate araç değil, sürüm geçmişidir.

Dört KO’nun tamamı `status = published` iken `archivedAt` doludur. İkisinin aktif Lesson/Course bağı vardır; dördünde de doğrudan KO veya ders progress bağlantısı yoktur. Bu bulgu düzeltme değil, migration cohort seçimini bloke eden veri-durumu kanıtıdır.

**Manifest durumu:** Canonical kaynak `content/migration/transformed-courses-combined.json` repoya eklendi ve doğrulandı — 38 kayıt, 0 duplicate id/slug/title, 0 eksik zorunlu alan, 0 boş içerik. Manifest gerçek 38 ders üzerinden yeniden üretildi; önceki 38 placeholder slot kaldırıldı.

Ürün kararı kesinleşti: bu 38 ders legacy katalogun devamı değil, **yerine gelecek yeni içerik setidir.** Bu nedenle legacy → canonical semantik eşleştirme migration için gerekli değildir ve manifest'te legacy eşleşme alanları bilinçli olarak boştur. Legacy içerik archive-first yaklaşımıyla korunur; kullanıcı geçmişi silinmez, otomatik remap edilmez.

Kalan tek apply blocker `DC-TAX-013`'tür. Ayrıntı için MIGRATION MANIFEST GATE bölümüne bakınız.

## Kapsam ve yöntem

- Repo: `LocalAkademi_fixed`
- Branch: `design/localkarar-18`
- HEAD/checkpoint: `4ae4343`
- Audit tarihi: 13 Ağustos 2026
- DB erişimi: yalnız Prisma `findMany`, `count`, `groupBy`
- Repo taraması: `rg` / salt-okunur dosya okuma
- DB write/delete/import/migration/seed: yapılmadı
- Kod veya mevcut KO düzeltmesi: yapılmadı
- Bu turda oluşturulan dosyalar: bu rapor ve `CONTENT_MIGRATION_MANIFEST_DRAFT.json`

Arama terimleri: `DC-TAX-013`, `tax`, `vergi`, `şirket türü`, `şirket tipi`, `company type`, `legal`, `incorporation`, `şahıs`, `limited`, `anonim`.

## `DC-TAX-013` sonucu: MISSING

### Araştırma sorularının yanıtı

| Soru | Sonuç | Kanıt |
|---|---|---|
| `DC-TAX-013` gerçekten yok mu? | **Evet** | `DecisionCheck` 12 satır; kod yok. `DecisionCheckVersion`, backend katalog, switch/engine, seed, frontend ve route referanslarında kod yok. |
| Başka kodla aynı işlev var mı? | **Hayır** | 12 aracın amaç/girdi/formüllerinde şirket türü veya vergisel yapı seçimi bulunmuyor. |
| Mevcut Decision Tool yeniden kullanılabilir mi? | **Hayır** | Yeniden kullanım yanlış karar semantiği ve yanlış sonuç snapshot’ı üretir. |
| Yeni araç gerçekten gerekli mi? | **Koşullu evet** | Canonical içerik gerçekten bu kararı gerektiriyorsa uzman incelemeli yeni araç gerekir. İçerik yalnız eğitim veriyorsa `decision_tool_id` bağı kaldırılmalı/boş bırakılmalı; mevcut araçla ikame edilmemeli. |

### Vergiyle ilişkili ama eşdeğer olmayan varlıklar

- `src/services/formulas.ts:353` — `kdv_ekleme / KDV Ekleme`: kullanıcıdan güncel KDV oranı alıp KDV dahil tutar hesaplar. Bu bir **Hesaplama**, Decision Tool değildir.
- DB’de vergi/şirket/hukuk terimleriyle eşleşen 46 KO, 25 Course ve 26 Lesson vardır. Örnek yayınlanmış KOs: `CUR-066-01 Gelir Vergisi`, `CUR-067-04 Kurumlar Vergisi`, `CUR-068-05 Vergi Avantajları`, `CUR-075-04 Vergi Beyannamesi`.
- `DC-LOAN-007` definition JSON’unda “faaliyet giderleri ve **vergiler sonrası** ortalama nakit” açıklaması vardır. Bu yalnız serbest nakit girdisinin tanımıdır; vergi/şirket türü kararı değildir.
- Mentor tax/legal intent, vergi disclaimer ve review-gate desteği vardır. Bunlar bilgi güvenliği katmanıdır, Decision Tool uygulaması değildir.

### `DC-TAX-013` için gerekli semantik sınır

Canonical payload erişilebilir olduğunda önce aracın gerçek sorusu doğrulanmalıdır. Arama terimleri beklenen kapsamın şirket türü/kuruluş biçimi/vergi etkisi olabileceğini düşündürür; bu **çıkarımdır**, kaynak dosya kanıtı değildir. Böyle bir araç oluşturulacaksa:

- hukuk ve vergi sonucu kesin tavsiye olarak sunulmamalı,
- geçerlilik tarihi ve Türkiye yargı alanı metadata’sı zorunlu olmalı,
- şahıs/limited/anonim seçenekleri yalnız vergi oranıyla sıralanmamalı,
- sorumluluk, sermaye, ortaklık, yönetim, muhasebe/uyum yükü ve büyüme ihtiyacı birlikte ele alınmalı,
- güncel mevzuat ve mali müşavir/hukukçu doğrulaması yayın kapısı olmalı,
- mevcut 12 aracın hiçbirinin kodu veya snapshot şeması yeniden kullanılmamalıdır.

Bu audit yeni araç oluşturmaz.

## Mevcut Decision Tool envanteri

Ortak frontend katalog rotası `/app/decision-checks`; araç açma rotası `/app/decision-checks/:code` biçimindedir. Route tanımı `frontend/src/router/index.jsx:98`, orchestration `frontend/src/pages/DecisionCheckSession.jsx` içindedir. Structured araçların form/result bileşeni `frontend/src/components/decision-checks/StructuredDecisionTool.jsx`; `DC-PROFIT-001` özel bileşeni `ProfitabilityDecisionTool.jsx` kullanır.

| Beklenen kod | Exists | Gerçek başlık | Route | Backend definition / karar mantığı | Frontend | Duplicate |
|---|---|---|---|---|---|---|
| `DC-PROFIT-001` | YES | Ürünüm Gerçekten Kârlı mı? | `/app/decision-checks/DC-PROFIT-001` | `scripts/seed-decision-checks.ts:10`; `src/services/decision-checks.ts:243`; katkı, marj, başabaş ve eksik bilgi rule engine’i | `DecisionCheckSession.jsx:136` → `ProfitabilityDecisionTool.jsx:182` | NO; 1.0 ve 2.0 sürümleri var |
| `DC-DISCOUNT-002` | YES | Bu indirimi yapabilir miyim? | `/app/decision-checks/DC-DISCOUNT-002` | `decision-tool-catalog.ts:58`, hesap switch’i `:284`; indirimli katkı, güvenli indirim, gerekli satış artışı | `DecisionCheckSession.jsx:146` → `StructuredDecisionTool.jsx:142` | NO |
| `DC-FREESHIP-003` | YES | Kargo ücretsiz olabilir mi? | `/app/decision-checks/DC-FREESHIP-003` | Katalog `:74`, switch `:304`; mevcut/ücretsiz kargo katkısı ve güvenli sepet eşiği | Structured | NO |
| `DC-MARKETPLACE-004` | YES | Pazaryeri komisyonundan sonra ne kalıyor? | `/app/decision-checks/DC-MARKETPLACE-004` | Katalog `:91`, switch `:323`; net tahsilat, ürün katkısı, minimum fiyat ve kanal farkı | Structured | NO |
| `DC-ADS-005` | YES | Reklam bütçemi artırmalı mıyım? | `/app/decision-checks/DC-ADS-005` | Katalog `:109`, switch `:342`; ROAS, reklam sonrası katkı, ek bütçe senaryosu | Structured | NO |
| `DC-HIRE-006` | YES | Yeni personel alabilir miyim? | `/app/decision-checks/DC-HIRE-006` | Katalog `:126`, switch `:363`; tam işveren maliyeti, başabaş ciro, rezerv dayanımı | Structured | NO |
| `DC-LOAN-007` | YES | Kredi taksitini karşılayabilir miyim? | `/app/decision-checks/DC-LOAN-007` | Katalog `:143`, switch `:380`; DSCR, aylık tampon, downside coverage | Structured | NO |
| `DC-CASHFLOW-008` | YES | Nakit akışım riskli mi? | `/app/decision-checks/DC-CASHFLOW-008` | Katalog `:159`, switch `:397`; net akış, vade etkisi, runway ve minimum tampon | Structured | NO |
| `DC-BRANCH-009` | YES | Yeni şube açmaya hazır mıyım? | `/app/decision-checks/DC-BRANCH-009` | Katalog `:175`, switch `:414`; faaliyet sonucu, başabaş ciro, payback ve rezerv | Structured | NO |
| `DC-CAMPAIGN-010` | YES | Kampanya yapmak mantıklı mı? | `/app/decision-checks/DC-CAMPAIGN-010` | Katalog `:192`, switch `:433`; kampanya katkısı, başabaş adet, üç satış senaryosu | Structured | NO |
| `DC-STOCK-011` | YES | Stok artırmalı mıyım? | `/app/decision-checks/DC-STOCK-011` | Katalog `:210`, switch `:451`; stok gün sayısı, yeniden sipariş noktası, önerilen sipariş | Structured | NO |
| `DC-CONTINUE-012` | YES | Bu ürünü satmaya devam etmeli miyim? | `/app/decision-checks/DC-CONTINUE-012` | Katalog `:226`, switch `:470`; iade düzeltilmiş katkı ve alternatif ürün fırsat maliyeti | Structured | NO |
| `DC-TAX-013` | **NO** | — | Beklenen: `/app/decision-checks/DC-TAX-013`; bugün 404/not-found akışına düşer | Definition, engine branch, DB version veya seed yok | Özel/generic bağ yok | NO RECORD |

### Ortak backend akışı

- Liste/detail/start endpoint’leri: `src/services/decision-checks.ts:48`, `:64`, `:87`.
- 11 structured aracın tanımları: `src/services/decision-tool-catalog.ts:56`.
- Structured calculation dispatch: `src/services/decision-tool-catalog.ts:282`.
- Session completion structured engine çağrısı: `src/services/decision-checks.ts:295`.
- DB’deki 12 araç yayınlanmış, `deletedAt = null`; 13 version satırının tamamı mevcut bir araca bağlıdır.

## Dört çelişkili Knowledge Object

“Published” sütunu `status === "published"` olarak türetilmiştir. Dört satırda da `archivedAt = 2026-07-29T18:59:34.584Z` olduğu halde durum hâlâ `published`tır.

| KO | Başlık | Published / publishedAt | archivedAt | Current Course/Lesson references | Version | Source | User progress |
|---|---|---|---|---|---:|---:|---|
| `106` / `CUR-021-01` | Gerçek Birim Maliyet — İşletme Uygulaması | YES / `2026-07-28T17:40:23.930Z` | `2026-07-29T18:59:34.584Z` | Course `24` “Gerçek Birim Maliyet” (`topic-cur-021`) → Lesson `137`, order 3, aynı başlık | 8 | 3 | KO progress 0; flashcard progress 0; lesson progress 0 |
| `196` / `CUR-039-01` | Toplu İndirim — Senaryo ve Ödünleşim | YES / `2026-07-28T17:40:23.930Z` | `2026-07-29T18:59:34.584Z` | Course `42` “Toplu İndirim” (`topic-cur-039`) → Lesson `226`, order 2, aynı başlık | 8 | 3 | KO progress 0; flashcard progress 0; lesson progress 0 |
| `626` / `FIN-CASHFLOW-001` | Nakit Akışı | YES / `null` | `2026-07-29T18:59:34.584Z` | Course/Lesson referansı yok | 0 | 2 | KO progress 0; flashcard progress 0 |
| `627` / `FIN-REVENUE-001` | Ciro Nedir? | YES / `null` | `2026-07-29T18:59:34.584Z` | Course/Lesson referansı yok | 0 | 1 | KO progress 0; flashcard progress 0 |

### Yorum

- `106` ve `196`, canlı ilişki taşıdığı için migration cohort’una yalnız `archivedAt != null` filtresiyle alınırsa bağlı dersleri etkileyebilir.
- `626` ve `627`, yayınlanmış görünüp `publishedAt` taşımayan ve arşiv zamanı bulunan orphan KOs’dur; durum kuralı ayrıca kararlaştırılmalıdır.
- Kullanıcı progress’i bulunmaması düzeltmeyi otomatik güvenli yapmaz. Bu audit hiçbir statüyü değiştirmedi.

## Canonical 38 kaynak durumu ve manifest yaklaşımı

### Bulunan kanıt

Geçmiş konuşma kaydı şunları doğruluyor:

- hedef dosya adı: `transformed-courses-combined.json`,
- hedef içerik sayısı: 38,
- geçmiş QA beyanı: duplicate ID 0, duplicate slug 0, zorunlu alan eksiği 0,
- zorunlu alanlar: `id`, `title`, `slug`, `category`, `decision_tool_id`, `content_markdown`, `embedded_practice_cards`, `verified_sources`.

### Bulunmayan kanıt

Canonical JSON’un satır içeriği repo, `content/`, `outputs/`, `uploads/`, `exports/`, çalışma alanı ve erişilebilir attachment cache içinde yoktur. ChatGPT conversation preview dosyaların eklendiğini söylüyor fakat içerikleri sağlamıyor. Bu nedenle aşağıdakiler güvenilir biçimde üretilemedi:

- 38 gerçek `id`, title, slug ve category,
- her satırın gerçek `decision_tool_id` değeri,
- exact/normalized title ve slug karşılaştırması,
- KO code veya içerik benzerliği,
- legacy Course/Lesson/KO adayları,
- 223 shared KO içinden yeni 38 ile eşleşen alt küme.

Bu boşluk tahminle doldurulmadı. `CONTENT_MIGRATION_MANIFEST_DRAFT.json` 38 slot içerir; gerçek canonical içerik gelene kadar hiçbir slot executable kabul edilmez.

## Eşleme kriterleri

Eşleme skoru tek başına semantic similarity ile verilmemelidir. Önerilen deterministik sıra:

1. **Exact KO code + same subject + compatible lesson/course relation** → HIGH adayı.
2. **Exact unique slug + exact/normalized title + category agreement** → HIGH adayı; içerik hash/konu kontrolü yine zorunlu.
3. **Exact title veya normalized title + category + Decision Tool code + content-topic agreement** → MEDIUM; manuel inceleme.
4. **Yalnız semantic similarity veya yalnız category/tool-code yakınlığı** → LOW; otomatik remap yok.
5. **Sinyal yok ya da birden fazla legacy aday** → NONE; yeni içerik veya manuel karar.

### Confidence ve aksiyon sözleşmesi

| Confidence | Otomasyon | İzin verilen manifest yaklaşımı |
|---|---|---|
| HIGH | Dry-run remap adayı olabilir; yine uniqueness ve progress gate gerekir | `REUSE_AND_REMAP` veya exact legacy history varsa `CREATE_NEW_AND_REMAP` |
| MEDIUM | Otomatik kabul edilmez | `MANUAL_REVIEW` |
| LOW | Progress taşınmaz | `CREATE_NEW_NO_HISTORY` ancak payload doğrulandıktan sonra; aksi halde `MANUAL_REVIEW` |
| NONE | Progress taşınmaz | `CREATE_NEW_NO_HISTORY` veya `MANUAL_REVIEW`; canonical kaynak yokken yalnız `MANUAL_REVIEW` |

`ARCHIVE_LEGACY` yeni içerik satırının varsayılan aksiyonu değildir; yalnız mapping graph tamamlandıktan sonra hiçbir yeni içerik tarafından kullanılmayacağı kanıtlanan legacy varlıklar için ayrı archive planında kullanılmalıdır.

## Kullanıcı progress koruma manifesti

| Veri türü | Mevcut satır | Can preserve automatically | Mapping key | Risk | Recommended handling |
|---|---:|---|---|---|---|
| Enrollment | 47 | PARTIAL | Exact old Course ID → approved new Course ID; user ID | **HIGH** | Course semantiği birebir ise status/progress korunabilir. Eşleşme yoksa legacy Course’u archive edip enrollment’ı yerinde tut. |
| Course progress | 47 Enrollment içinde | PARTIAL | `(userId, courseId)` + approved course map | **HIGH** | Yüzdeyi farklı ders sayısına doğrudan taşımayın; tamamlanan lesson coverage ile yeniden doğrulayın. |
| LessonProgress | 12 | PARTIAL | `(userId, lessonId)` + HIGH lesson map | **HIGH** | Yalnız exact/eşdeğer ders için remap. Tümü şu an `in_progress`; düşük güvenli transfer yok. |
| Completion | Enrollment/Lesson/KO progress alanlarında | PARTIAL | Original completion/status/timestamp + approved map | **HIGH** | Tamamlanmış anlamı değişmemeli. Snapshot + legacy identity sakla; bu snapshot’ta enrollment completion yok. |
| KnowledgeProgress | 6 | PARTIAL | `(userId, koId)` + exact KO code/semantic map | **HIGH** | Shared KO’da update yok; exact reuse veya yeni KO’ya açık map. Tümü şu an `in_progress`. |
| Saved/Bookmark | 0 `PracticalCardSave` | YES structurally / N/A currently | `(userId, practicalCardId)` + stable card code/ID | Medium future risk | Card kimliğini koru; mevcut snapshot’ta taşınacak save yok. |
| LearningPath | 7 | NO | `pathData` JSON içindeki içerik referansları | **HIGH** | JSON parse + referans envanteri + manuel/approved map; opaque string replacement yapma. |
| TaskAssignment | 3 | PARTIAL | `taskTemplateId`, scalar `koId`, user ID | **HIGH** | 2 assigned + 1 completed kaydı snapshot’la; exact template/KO eşleşmesi yoksa legacy template bağlamını koru. |
| FlashcardProgress / Review | 4 / 15 | PARTIAL | user + exact KO/card identity | **HIGH** | KO clone/rewrite durumunda geçmişi otomatik kopyalama; stable card identity veya legacy archive kullan. |
| Generic LearningProgress | 37 | PARTIAL | `(userId, contentType, contentId)` + contentCode | Medium | Hepsi şu an `decision_check`; içerik migration’ından etkilenmemeli. DecisionCheck ID/code değişikliği yapılmamalı. |

**Confirmed progress remap candidate sayısı: 0.** Canonical 38 satırı artık mevcut ve doğrulanmış olmasına rağmen hiçbir satır HIGH eşleşme üretmedi (bkz. MIGRATION MANIFEST GATE). Bu, koruma gereksinimi olmadığı anlamına gelmez; 47 enrollment ve ilgili progress/history satırları açık risk havuzudur. Bunlardan biri — COURSE-003'e 0.889 benzerlikteki legacy kursun 2 enrollment'ı — potansiyel remap adayı olarak manuel incelemeye alınmıştır.

## Shared KO analizi

Mevcut 955 KO içinde 223 KO birden fazla Lesson tarafından kullanılıyor. Canonical 38 ile karşılaştırma yapıldı: **hiçbiri eşleşmedi** (ayrıntı için MIGRATION MANIFEST GATE). Aşağıdaki tablo bu karşılaştırmadan sonraki durumu gösterir.

| Sınıf | Kanıtlanmış sayı | Karar |
|---|---:|---|
| Shared KO reused safely | 0 | Exact code + aynı semantik + immutable içerik kanıtı olmadan reuse onaylanmadı |
| Shared KO needs cloning | 0 | Yeni içerik farkı görülmeden clone kararı verilmedi |
| Shared KO should remain legacy/archive | 0 | Yeni mapping graph olmadan archive kararı verilmedi |
| Shared KO manual review | **223** | Canonical 38 ile karşılaştırma bekliyor |

### Shared KO karar kuralı

- Yeni içerik mevcut shared KO ile **birebir aynıysa**, KO’yu değiştirmeden bağ yeniden kullanılabilir.
- Yeni içerik shared KO’dan farklıysa, mevcut KO update edilmez; yeni KO/version oluşturma planı gerekir.
- Eski derslerin gereksinimi devam ediyor ve yeni eşleşme yoksa shared KO legacy/archive olarak kalır.
- Birden fazla legacy aday, kısmi konu örtüşmesi veya farklı Decision Tool bağı varsa `MANUAL_REVIEW` zorunludur.

## Limitations ve gereken sonraki kanıt

1. ~~`transformed-courses-combined.json` yeniden eklenmeden gerçek 38 satırlı migration mapping’i üretilemez.~~ **Çözüldü:** dosya `content/migration/` altında; audit gerçek 38 kayıt üzerinden çalıştırıldı.
2. ~~Canonical dosya geldiğinde 38 entry, ID/slug uniqueness ve required-field QA yerelde doğrulanmalıdır.~~ **Çözüldü:** 38 kayıt, 0 duplicate id/slug/title, 0 eksik zorunlu alan, 0 boş içerik.
2b. Eşleşmenin zayıf çıkması bir veri kalitesi sorusu doğuruyor: legacy slug şeması ile kanonik slug şeması uyumsuz. Yeni içerik legacy'nin devamı mı yoksa değişimi mi olduğu ürün kararı olarak netleşmeli.
3. `DC-TAX-013` değerinin hangi canonical satır(lar)da kullanıldığı ve dersin gerçek karar sorusu dosyadan okunmalıdır.
4. Shared KO karşılaştırması exact code/slug/title sinyallerinden başlayıp içerik benzerliğiyle desteklenmeli; semantic similarity tek karar kaynağı olmamalıdır.
5. Dört çelişkili KO için canonical archive kuralı ayrı ve yazılı olarak onaylanmalıdır.

## MIGRATION MANIFEST GATE

**Ürün kararı (kesinleşti):** Canonical 38 ders legacy katalogun devamı veya revizyonu değildir. Eski katalogun **yerine gelecek tamamen yeni LocalKarar içerik setidir.**

Bu karar, önceki turda üretilen zayıf semantik eşleştirmeyi gereksiz kılar. Eşleşmenin 0 HIGH / 0 MEDIUM çıkması artık bir eksiklik değil, beklenen sonuçtur: iki katalog arasında kavramsal süreklilik yoktur.

```text
MIGRATION MANIFEST GATE

Canonical courses: 38
CREATE_NEW_NO_HISTORY: 37
Manual canonical entries: 1 (COURSE-021 / DC-TAX-013)
Progress remaps: 0

Legacy courses to archive: 288
Legacy lessons affected: 1170
Legacy KOs preserved: 955
Shared KOs preserved: 223
User history records preserved: 127

DC-TAX-013: MISSING

Database write executed: NO
Database delete executed: NO
Migration executed: NO
Seed executed: NO

Safe to BUILD dry-run migration script: YES
Safe to RUN real migration: NO
```

### BUILD ile RUN neden ayrı

Bu ikisi aynı şey değildir ve aynı anda karar verilmemelidir.

**BUILD = YES.** Dry-run script'i yazmak için gereken her şey elde: canonical payload doğrulanmış (38 kayıt, 0 duplicate id/slug/title, 0 eksik zorunlu alan, 0 boş içerik), strateji deterministik (eşleştirme yok, hepsi yeni kayıt), arşivleme ayrı adım olarak tanımlı. Dry-run çıktısı gerçek migration planını temsil eder.

**RUN = NO.** Tek engel `DC-TAX-013`. COURSE-021 (*Şirket Kurulumu ve Vergi Planlaması*) bu koda bağlanıyor fakat kod veritabanında yok. İçerik oluşturulabilir ama karar aracı bağı boş kalır; kullanıcı derse gider, aracı açamaz. Apply öncesi bu bağ çözülmelidir. Bu görevde yeni Decision Tool oluşturulmadı.

### `CREATE_NEW_NO_HISTORY` ne demek

> Yeni canonical içerik oluşturulur ve **legacy progress eşleşmesi almaz.**

Bu ifade **eski geçmişi silmek anlamına gelmez.** Legacy kayıtlar ve kullanıcı geçmişi yerinde kalır; yalnızca yeni içerikle aralarında otomatik bir bağ kurulmaz.

### Legacy koruma sözleşmesi

| Kural | Durum |
|---|---|
| Legacy Course/Lesson/KO overwrite | HAYIR |
| Legacy içerik yaklaşımı | Archive-first; arşivleme yalnız görünürlük/status değişikliğidir |
| Enrollment / progress / completion silme | HAYIR — 127 kayıt korunur |
| Legacy progress → canonical remap | HAYIR — 0 remap |
| Eski kurs geçmişinin erişilebilirliği | Legacy kayıtlar üzerinden korunur, audit edilebilir |
| 223 shared KO mutate / clone / delete | HAYIR — legacy katalog kapsamında korunur |
| COURSE-003 üzerindeki 2 enrollment | Legacy history olarak kalır; canonical derse taşınmaz |

### Korunacak kullanıcı geçmişi

| Tablo | Kayıt | Kapsam |
|---|---:|---|
| Enrollment | 47 | İçerik migration kapsamında |
| LessonProgress | 12 | İçerik migration kapsamında |
| KnowledgeProgress | 6 | İçerik migration kapsamında |
| QuizAttempt | 3 | İçerik migration kapsamında |
| TaskAssignment | 3 | İçerik migration kapsamında |
| ActivityEvent | 5 | İçerik migration kapsamında |
| DecisionCheckSession | 45 | Karar aracı geçmişi — içerik migration'ından etkilenmez |
| FormulaCalculation | 6 | Karar aracı geçmişi — içerik migration'ından etkilenmez |
| **Toplam** | **127** | Hiçbiri silinmez |

### Legacy archive planı ayrı tutuldu

Arşivleme işlemleri canonical manifest entry'lerinin içine **sahte eşleşme olarak eklenmedi.** Manifest'te ayrı bir `legacy_archive_plan` bölümü olarak durur. Kapsam: 288 kurs (67'si yayında), 1170 ders, 955 KO, 223 shared KO.

Arşiv adımı canonical create adımından **ayrı ve sonra** çalıştırılmalı, aynı transaction'a konmamalıdır. Arşiv için ayrı bir dry-run planı yazılmalıdır; bu manifest yalnızca canonical create kapsamını tanımlar.

Dört tutarsız KO (`archivedAt` dolu olduğu halde `status = published`) bu planda otomatik düzeltilmez; ayrı yazılı karar gerektirir.
