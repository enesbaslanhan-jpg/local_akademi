# LocalKarar — İçerik Migrasyonu Dry Run Raporu

**Mod:** READ-ONLY. Bu çalışmada hiçbir kayıt oluşturulmadı, değiştirilmedi veya silinmedi.
**Tarih:** 2026-08-13T23:36:51.372Z

## Ürün kararı

Canonical 38 ders legacy katalogun devamı veya revizyonu değildir; eski katalogun yerine
gelen yeni LocalKarar içerik setidir. Bu nedenle legacy → canonical eşleştirme yapılmaz,
legacy içerik overwrite edilmez, kullanıcı geçmişi silinmez ve otomatik progress remap
uygulanmaz.

## İki faz

Gerçek migration iki **ayrı** işlem olarak çalışır. Aynı transaction içinde birleştirilmez.

### PHASE A — CREATE CANONICAL
38 yeni içerik oluşturulur (Course + Lesson + KnowledgeObject + Version + kaynaklar +
pratik kartlar). Legacy içerik değiştirilmez.

### PHASE B — ARCHIVE LEGACY
Phase A tamamlanıp doğrulandıktan **sonra**, ayrı işlem olarak legacy içerik
görünürlükten kaldırılır. Arşivleme bir görünürlük değişikliğidir; satır silinmez.

Ayrı tutulmasının nedeni: tek transaction'da birleştirilirse Phase A'nın yarıda kalması
durumunda legacy içerik zaten gizlenmiş olur ve katalog boş kalır.

## Archive yeteneği — gerçek şema

| Entity | Kullanılabilir alan | Durum |
|---|---|---|
| `Course` | `published (Boolean) + archivedAt (DateTime?)` | Arşivlenebilir |
| `Lesson` | **yok** | Arşivlenebilir |
| `KnowledgeObject` | `status + archivedAt (+ publishedAt)` | Arşivlenebilir |

- **Course:** Tam arsiv destegi. ACTIVE = published true + archivedAt null · DRAFT = published false + archivedAt null · ARCHIVED = published false + archivedAt dolu.
- **Lesson:** Lesson uzerinde arsiv alani YOK ve urun karariyla eklenmedi. Arsiv siniri Course seviyesidir; dersler parent Course kapandiginda gorunmez olur. Lesson satirlari OKUNMAZ, YAZILMAZ, SILINMEZ. Bu bir blocker degil, kapsam karari.
- **KnowledgeObject:** Tam arsiv destegi var, ancak bu migration KO mutasyonu PLANLAMIYOR. 955 KO oldugu gibi korunur.

## Orphan riski

Arşivleme görünürlük değişikliği olduğu için hiçbir FK kırılmaz. Aşağıdaki tablo
**hard-delete seçilseydi** ne olacağını da gösterir — bu plan hard-delete kullanmaz.

| İlişki | FK davranışı | Arşivde güvenli |
|---|---|---|
| Enrollment -> Course | `onDelete: Cascade` | Evet |
| LessonProgress -> Lesson | `onDelete: Cascade` | Evet |
| KnowledgeProgress -> KnowledgeObject | `onDelete: Cascade` | Evet |
| QuizAttempt -> KnowledgeObject | `onDelete: Cascade` | Evet |
| TaskAssignment -> KnowledgeObject | `onDelete: Cascade` | Evet |
| ActivityEvent -> User (icerik FK yok) | `scalar referans` | Evet |
| DecisionCheckSession -> DecisionCheck | `icerik migrasyonundan bagimsiz` | Evet |
| FormulaCalculation -> Formula | `icerik migrasyonundan bagimsiz` | Evet |
| DecisionJournalEntry -> Course | `onDelete: SetNull` | Evet |
| Lesson -> Course | `onDelete: Cascade` | Evet |
| Saved / Bookmark | `model yok` | Evet |

Kritik nokta: içerik→geçmiş ilişkilerinin neredeyse tamamı `onDelete: Cascade`.
Legacy içerik hard-delete edilseydi 127 kullanıcı geçmişi kaydı
zincirleme silinirdi. Archive-first yaklaşımı bu riski tamamen ortadan kaldırır.

## Tutarsız Knowledge Object kayıtları

- **ID 106** `CUR-021-01` — Gerçek Birim Maliyet — İşletme Uygulaması
  - current status: `published`
  - archivedAt: `Wed Jul 29 2026 21:59:34 GMT+0300 (Türkiye Standart Saati)`
  - references: 1 lesson
  - recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  - automatic action: **NONE**
- **ID 196** `CUR-039-01` — Toplu İndirim — Senaryo ve Ödünleşim
  - current status: `published`
  - archivedAt: `Wed Jul 29 2026 21:59:34 GMT+0300 (Türkiye Standart Saati)`
  - references: 1 lesson
  - recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  - automatic action: **NONE**
- **ID 626** `FIN-CASHFLOW-001` — Nakit Akışı
  - current status: `published`
  - archivedAt: `Wed Jul 29 2026 21:59:34 GMT+0300 (Türkiye Standart Saati)`
  - references: 0 lesson
  - recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  - automatic action: **NONE**
- **ID 627** `FIN-REVENUE-001` — Ciro Nedir?
  - current status: `published`
  - archivedAt: `Wed Jul 29 2026 21:59:34 GMT+0300 (Türkiye Standart Saati)`
  - references: 0 lesson
  - recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  - automatic action: **NONE**

**MIGRATION BLOCKER: NO**
**POST-MIGRATION CLEANUP REQUIRED: YES**

Phase A yeni KO uretir, mevcut KO okumaz veya yazmaz. Phase B yalniz Course.published ve Course.archivedAt yazar. Hicbir faz KO satirina dokunmadigi icin bu tutarsizlik migration butunlugunu bozamaz; legacy veri kalitesi sorunu olarak kalir.

Bu görevde normalize edilmedi.

## Migration faz sırası

```text
PHASE A    Create 38 canonical contents.
VERIFY A   38/38 created · routes valid · decision tools valid · sources/cards present
PHASE B    Archive 288 legacy Courses.
VERIFY B   legacy no longer visible in active catalog · direct historical access still works · user enrollment/progress still accessible
```

Phase A basarisiz olursa Phase B calismaz. Iki faz ayni transaction icinde birlestirilmez.

## Safety assertions

| Kontrol | Beklenen | Bulunan | Sonuç |
|---|---:|---:|---|
| Canonical create planned | 38 | 38 | OK |
| Canonical overwrite planned | 0 | 0 | OK |
| Legacy hard deletes planned | 0 | 0 | OK |
| Legacy lesson updates planned | 0 | 0 | OK |
| Legacy KO mutations planned | 0 | 0 | OK |
| Shared KO mutations planned | 0 | 0 | OK |
| User history deletes planned | 0 | 0 | OK |
| Progress remaps planned | 0 | 0 | OK |
| DC-TAX-013 found | true | true | OK |

## Dry run gate

```text
DRY RUN GATE

Canonical payload valid: YES
Canonical records: 38

Canonical creates planned: 38
Canonical overwrites planned: 0

Legacy courses to archive: 288
Legacy hard deletes planned: 0
Legacy lesson updates planned: 0
Legacy KO mutations planned: 0
Shared KO mutations planned: 0

User history records preserved: 127
User history deletes planned: 0
Progress remaps planned: 0

Decision Tool IDs required: 13
Decision Tool IDs found: 13
Missing Decision Tool IDs: NONE

Inconsistent KO records: 4
Inconsistent KO migration blocker: NO
Post-migration KO cleanup required: YES

Archive schema blockers: NONE

Safe to BUILD apply migration code: YES
Safe to RUN Phase A canonical import: YES
Safe to RUN Phase B legacy archive after Phase A verification: YES
Safe to RUN full migration sequence: YES
```

## Konsol çıktısı

```text
LocalKarar — CONTENT MIGRATION DRY RUN (READ-ONLY)
================================================================
Tarih: 2026-08-13T23:36:51.268Z
Bu calisma hicbir kayit olusturmaz, degistirmez veya silmez.

CANONICAL PAYLOAD
----------------------------------------------------------------
  Kayit sayisi          : 38
  Tekrar eden ID / slug : 0 / 0
  Zorunlu alanlar       : eksiksiz
  Dogrulama             : GECTI

DECISION TOOL DOGRULAMASI
----------------------------------------------------------------
  Beklenen kod sayisi   : 13
  DB'de bulunan         : 13
  Eksik                 : yok
  Canonical'in kullandigi: 13 farkli kod
  Kullanilan ama eksik  : yok

PHASE A — CREATE CANONICAL (PREVIEW)
----------------------------------------------------------------
COURSE-001
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-002
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-MARKETPLACE-004 -> FOUND
  Legacy progress remap: NO

COURSE-003
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-004
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-DISCOUNT-002 -> FOUND
  Legacy progress remap: NO

COURSE-005
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CONTINUE-012 -> FOUND
  Legacy progress remap: NO

COURSE-006
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-007
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CONTINUE-012 -> FOUND
  Legacy progress remap: NO

COURSE-008
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CASHFLOW-008 -> FOUND
  Legacy progress remap: NO

COURSE-009
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CASHFLOW-008 -> FOUND
  Legacy progress remap: NO

COURSE-010
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-BRANCH-009 -> FOUND
  Legacy progress remap: NO

COURSE-011
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-MARKETPLACE-004 -> FOUND
  Legacy progress remap: NO

COURSE-012
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-MARKETPLACE-004 -> FOUND
  Legacy progress remap: NO

COURSE-013
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-FREESHIP-003 -> FOUND
  Legacy progress remap: NO

COURSE-014
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-015
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-016
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-ADS-005 -> FOUND
  Legacy progress remap: NO

COURSE-017
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-ADS-005 -> FOUND
  Legacy progress remap: NO

COURSE-018
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CAMPAIGN-010 -> FOUND
  Legacy progress remap: NO

COURSE-019
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-020
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-021
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 3
  Practice Cards: would create 2
  Decision Tool: DC-TAX-013 -> FOUND
  Legacy progress remap: NO

COURSE-022
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 3
  Practice Cards: would create 2
  Decision Tool: DC-HIRE-006 -> FOUND
  Legacy progress remap: NO

COURSE-023
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 3
  Practice Cards: would create 2
  Decision Tool: DC-BRANCH-009 -> FOUND
  Legacy progress remap: NO

COURSE-024
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 3
  Practice Cards: would create 2
  Decision Tool: DC-LOAN-007 -> FOUND
  Legacy progress remap: NO

COURSE-025
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CONTINUE-012 -> FOUND
  Legacy progress remap: NO

COURSE-026
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CONTINUE-012 -> FOUND
  Legacy progress remap: NO

COURSE-027
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-028
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-029
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-030
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-BRANCH-009 -> FOUND
  Legacy progress remap: NO

COURSE-031
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-032
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CASHFLOW-008 -> FOUND
  Legacy progress remap: NO

COURSE-033
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-034
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CASHFLOW-008 -> FOUND
  Legacy progress remap: NO

COURSE-035
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-CASHFLOW-008 -> FOUND
  Legacy progress remap: NO

COURSE-036
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-STOCK-011 -> FOUND
  Legacy progress remap: NO

COURSE-037
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

COURSE-038
  Action: CREATE_NEW_NO_HISTORY
  Course: would create
  Lesson: would create
  KnowledgeObject: would create
  KnowledgeObjectVersion: would create
  Sources: would create 2
  Practice Cards: would create 2
  Decision Tool: DC-PROFIT-001 -> FOUND
  Legacy progress remap: NO

PHASE B — LEGACY ARCHIVE PREVIEW
----------------------------------------------------------------
  Legacy Course           : 288 (67 yayinda)
  Legacy Lesson           : 1170
  Legacy KnowledgeObject  : 955
  Planlanan arsiv damgasi : 2026-08-13T23:36:51.348Z

  Course: ARSIV KAPSAMINDA
    alan : published (Boolean) + archivedAt (DateTime?)
    not  : Tam arsiv destegi. ACTIVE = published true + archivedAt null · DRAFT = published false + archivedAt null · ARCHIVED = published false + archivedAt dolu.
  Lesson: ARSIV KAPSAMINDA
    alan : YOK (kapsam disi)
    not  : Lesson uzerinde arsiv alani YOK ve urun karariyla eklenmedi. Arsiv siniri Course seviyesidir; dersler parent Course kapandiginda gorunmez olur. Lesson satirlari OKUNMAZ, YAZILMAZ, SILINMEZ. Bu bir blocker degil, kapsam karari.
  KnowledgeObject: ARSIV KAPSAMINDA
    alan : status + archivedAt (+ publishedAt)
    not  : Tam arsiv destegi var, ancak bu migration KO mutasyonu PLANLAMIYOR. 955 KO oldugu gibi korunur.

  Kurs bazinda plan (ilk 10; tamami JSON raporunda):

  Course 1 — E-ticaret Maliyet ve Kârlılık
    current published: false · current archivedAt: null
    enrollment: 1 · lesson: 10 · related KO: 10
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 2 — Nakit Akışı Yönetimi
    current published: false · current archivedAt: null
    enrollment: 4 · lesson: 10 · related KO: 10
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 3 — Vergi ve Yasal Yükümlülükler
    current published: false · current archivedAt: null
    enrollment: 2 · lesson: 10 · related KO: 10
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 4 — Kâr ile Nakit Arasındaki Fark
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 5 — Ciro Nedir?
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 6 — Brüt Kâr
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 7 — Net Kâr
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 8 — Karlılık Oranı
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 9 — Nakit Büyüme Oranı
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Course 10 — Tahsilat Süresi
    current published: false · current archivedAt: null
    enrollment: 0 · lesson: 5 · related KO: 5
    would set published=false · would set archivedAt=2026-08-13T23:36:51.348Z
    lesson rows touched: 0 · KO rows touched: 0

  Legacy courses scheduled for archive: 288
  Legacy lessons deleted: 0
  Legacy lessons updated: 0
  Legacy KOs mutated: 0
  User history delete/remap: 0

  Bu faz Phase A basarili olduktan SONRA ve AYRI islem olarak calisir.
  Iki faz ayni transaction icinde uygulanmaz.

TUTARSIZ KNOWLEDGE OBJECT KAYITLARI
----------------------------------------------------------------
  Bulunan: 4

  ID: 106
  code: CUR-021-01
  title: Gerçek Birim Maliyet — İşletme Uygulaması
  current status: published
  archivedAt: 2026-07-29T18:59:34.584Z
  references: 1 lesson
  recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  automatic action: NONE

  ID: 196
  code: CUR-039-01
  title: Toplu İndirim — Senaryo ve Ödünleşim
  current status: published
  archivedAt: 2026-07-29T18:59:34.584Z
  references: 1 lesson
  recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  automatic action: NONE

  ID: 626
  code: FIN-CASHFLOW-001
  title: Nakit Akışı
  current status: published
  archivedAt: 2026-07-29T18:59:34.584Z
  references: 0 lesson
  recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  automatic action: NONE

  ID: 627
  code: FIN-REVENUE-001
  title: Ciro Nedir?
  current status: published
  archivedAt: 2026-07-29T18:59:34.584Z
  references: 0 lesson
  recommended normalization: status ile archivedAt tek kaynaga baglanmali; karar yazili olarak onaylanmali
  automatic action: NONE

  MIGRATION BLOCKER: NO
  POST-MIGRATION CLEANUP REQUIRED: YES
  Gerekce: Phase A yeni KO uretir, mevcut KO okumaz/yazmaz.
  Phase B yalniz Course.published ve Course.archivedAt yazar.
  Hicbir faz KO satirina dokunmadigi icin bu tutarsizlik migration
  butunlugunu bozamaz; legacy veri kalitesi sorunu olarak kalir.

SHARED KNOWLEDGE OBJECT KONTROLU
----------------------------------------------------------------
  Shared KO found: 223
  Shared KO scheduled for mutation: 0
  update / delete / clone planlanmadi; legacy katalog kapsaminda korunur.

KULLANICI GECMISI KORUMA KONTROLU
----------------------------------------------------------------
  Enrollment            : 47
  DecisionCheckSession  : 45
  LessonProgress        : 12
  KnowledgeProgress     : 6
  FormulaCalculation    : 6
  ActivityEvent         : 5
  QuizAttempt           : 3
  TaskAssignment        : 3
  TOPLAM                : 127

  User-history deletes planned: 0
  Automatic progress remaps planned: 0

ORPHAN RISK ANALIZI
----------------------------------------------------------------
  Arsivleme GORUNURLUK degisikligidir; satir silinmez.
  Bu nedenle asagidaki FK iliskilerinin hicbiri kirilmaz.

  GUVENLI | Enrollment -> Course  (onDelete: Cascade)
  GUVENLI | LessonProgress -> Lesson  (onDelete: Cascade)
  GUVENLI | KnowledgeProgress -> KnowledgeObject  (onDelete: Cascade)
  GUVENLI | QuizAttempt -> KnowledgeObject  (onDelete: Cascade)
  GUVENLI | TaskAssignment -> KnowledgeObject  (onDelete: Cascade)
  GUVENLI | ActivityEvent -> User (icerik FK yok)  (scalar referans)
  GUVENLI | DecisionCheckSession -> DecisionCheck  (icerik migrasyonundan bagimsiz)
  GUVENLI | FormulaCalculation -> Formula  (icerik migrasyonundan bagimsiz)
  GUVENLI | DecisionJournalEntry -> Course  (onDelete: SetNull)
  GUVENLI | Lesson -> Course  (onDelete: Cascade)
  GUVENLI | Saved / Bookmark  (model yok)

  UYARI: hard-delete SECILIRSE tablo yukarideki Cascade zinciri
  yuzunden kullanici gecmisini de siler. Bu plan hard-delete kullanmaz.

SAFETY ASSERTIONS
----------------------------------------------------------------
  OK   | Canonical create planned          : 38
  OK   | Canonical overwrite planned       : 0
  OK   | Legacy hard deletes planned       : 0
  OK   | Legacy lesson updates planned     : 0
  OK   | Legacy KO mutations planned       : 0
  OK   | Shared KO mutations planned       : 0
  OK   | User history deletes planned      : 0
  OK   | Progress remaps planned           : 0
  OK   | DC-TAX-013 found                  : true

MIGRATION FAZ SIRASI
----------------------------------------------------------------
  PHASE A   Create 38 canonical contents.
  VERIFY A  38/38 olusturuldu · route gecerli · decision tool gecerli
            · kaynak ve pratik kartlari yerinde
  PHASE B   Archive 288 legacy Courses.
  VERIFY B  legacy aktif katalogda gorunmuyor · dogrudan tarihsel
            erisim calisiyor · enrollment/progress erisilebilir

  KURAL: Phase A basarisiz olursa Phase B CALISMAZ.
  Iki faz ayri islemdir; ayni transaction icinde birlestirilmez.

DRY RUN GATE

Canonical payload valid: YES
Canonical records: 38

Canonical creates planned: 38
Canonical overwrites planned: 0

Legacy courses to archive: 288
Legacy hard deletes planned: 0
Legacy lesson updates planned: 0
Legacy KO mutations planned: 0
Shared KO mutations planned: 0

User history records preserved: 127
User history deletes planned: 0
Progress remaps planned: 0

Decision Tool IDs required: 13
Decision Tool IDs found: 13
Missing Decision Tool IDs: NONE

Inconsistent KO records: 4
Inconsistent KO migration blocker: NO
Post-migration KO cleanup required: YES

Archive schema blockers: NONE

Safe to BUILD apply migration code: YES
Safe to RUN Phase A canonical import: YES
Safe to RUN Phase B legacy archive after Phase A verification: YES
Safe to RUN full migration sequence: YES
```
