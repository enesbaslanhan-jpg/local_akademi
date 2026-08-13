# LocalKarar Content Migration — Read-Only Audit

## Technical summary

**Result:** The current database is **not safe for a direct hard-delete-and-replace operation**. The schema permits broad cascade deletion from both `Course` and `KnowledgeObject`; those cascades include user-owned enrollment/progress records and learning-history records. Several other history tables use unvalidated scalar/JSON references and would survive as semantically orphaned data.

The database currently contains **288 courses, 1,170 lessons, 955 Knowledge Objects, 7,441 KO versions, 47 enrollments, and 55 non-enrollment progress rows**. All 1,170 lessons point to a KO, but **223 KOs are reused by more than one lesson**, so a one-row-per-lesson replacement assumption would be wrong. There are also **20 KOs with no lesson association** and **17 courses with no lessons**.

The expected Decision Tool set is incomplete: **12 of 13 codes are present** and `DC-TAX-013` is missing. No duplicate Decision Tool code exists. `DC-PROFIT-001` legitimately has two published version rows (`1.0`, `2.0`), which is version history rather than a duplicate tool.

**Recommendation:** Begin only dry-run migration development. Use archive-first cutover, immutable old-to-new mapping tables/artifacts, explicit user-history preservation, and validation gates. Do not execute content writes until the missing Decision Tool and the four KO status/timestamp inconsistencies are resolved.

## Scope and evidence

- Repository: `LocalAkademi_fixed`
- Branch verified: `design/localkarar-18`
- Checkpoint/HEAD verified: `4ae4343`
- Audit date: 13 August 2026
- Schema source: `prisma/schema.prisma`
- Referential-action source: committed PostgreSQL migration DDL under `prisma/migrations/`
- Database access: Prisma `count`, `findMany`, and `groupBy` only
- Database mutations: none
- Repository mutations: this report only

Counts are a point-in-time snapshot of the database selected by the repository's `DATABASE_URL`. “Unpublished” below means `status != "published"`; the explicit `draft` status is reported separately so archived content is not mistaken for draft content.

## Prisma content data model

PostgreSQL is the configured datasource. Explicit `onDelete` values below come from the schema; implicit behavior was checked against the committed PostgreSQL DDL rather than inferred.

| Model | Primary key | Important foreign keys and relations | Delete behavior | Unique constraints | Migration/cascade risk |
|---|---|---|---|---|---|
| `Course` | `id Int` | `lessons`, `enrollments`, `financialCases`, `financialModels` | Deleting a course cascades to lessons, enrollments, and `FinancialModelCourse`; linked `FinancialCase.courseId` becomes `NULL` | `slug` | **High:** deletes user enrollments and indirectly lesson progress |
| `Lesson` | `id Int` | `courseId → Course`; optional `knowledgeObjectId → KnowledgeObject`; `progress` | Course delete cascades to lesson. KO delete sets `knowledgeObjectId = NULL`. Lesson delete cascades to `LessonProgress` | None; KO only indexed | **High:** deletion removes lesson progress; duplicate lesson order is not DB-prevented |
| `LessonProgress` | `id Int` | `userId → User`; `lessonId → Lesson` | Both parent deletes cascade | `(userId, lessonId)` | **High user-history risk** |
| `Enrollment` | `id Int` | `userId → User`; `courseId → Course` | Both parent deletes cascade | `(userId, courseId)` | **High user-history risk; stores course progress/status** |
| `KnowledgeObject` | `id Int` | Optional `currentVersionId`, `categoryId`; relations to lessons, versions, sources, reviews, progress, quizzes, tasks, videos, flashcards, financial models, practical cards | Most KO-owned children cascade; lessons are retained with KO set to `NULL`; current version/category are set to `NULL` if their parent is deleted | `code`, `slug` independently unique | **High:** very broad content and user-progress cascade |
| `KnowledgeObjectVersion` | `id Int` | `koId → KnowledgeObject`; `createdBy → User`; inverse `currentFor` | KO delete cascades versions. Deleting a current version sets KO `currentVersionId = NULL`. User deletion is restricted while credited versions exist | **No** `(koId, versionNumber)` uniqueness | **Medium:** duplicate version numbers are application-controlled; current pointer can be cleared |
| `Source` | `id String/UUID` | `koSources` | Source delete cascades only join rows | None beyond PK | Low alone; shared-source reuse must be preserved |
| `KnowledgeObjectSource` | `id String/UUID` | `koId → KO`; `sourceId → Source` | Either parent delete cascades join rows | **No** `(koId, sourceId)` uniqueness | Medium: duplicate source links are possible |
| `ReviewRecord` | `id String/UUID` | `koId → KO`; `reviewerId → User` | KO delete cascades reviews; reviewer deletion is restricted | None beyond PK | Medium: destroys audit/review history with KO |
| `KnowledgeProgress` | `id String/UUID` | `userId → User`; `koId → KO` | Both parent deletes cascade | `(userId, koId)` | **High user-history risk** |
| `Quiz` / `QuizQuestion` | UUIDs | Quiz belongs to KO; questions belong to quiz | KO → Quiz → Question cascades | None at content grain | Medium: assessment definitions disappear |
| `QuizAttempt` | `id String/UUID` | `userId` is a FK; `koId Int` and `quizId String?` are scalar fields without KO/Quiz relations | User delete cascades; content delete does **not** maintain these references | None beyond PK | **High orphan risk:** 3 current attempts depend on unmanaged IDs |
| `TaskTemplate` / `TaskAssignment` | UUIDs | Template belongs to KO; assignment has optional template FK plus scalar `koId` | KO delete cascades template; assignment `taskTemplateId` becomes `NULL`; assignment `koId` is unmanaged | None at assignment/content grain | **High history/orphan risk:** 3 linked assignments remain but lose template relation |
| `LearningVideo` / `VideoProgress` | UUIDs | One video per KO; progress belongs to user/video | KO → video → video progress cascades | `LearningVideo.koId`; `(userId, videoId)` | High if video progress exists; current count is zero |
| `Flashcard` / `FlashcardReview` / `FlashcardProgress` | UUIDs | Cards and KO progress belong to KO; reviews belong to card/user | KO deletion cascades cards, reviews, and KO-level progress | `(koId, order)`; `(userId, koId)` for progress | **High user-history risk:** current review/progress rows exist |
| `LearningProgress` | `id String/UUID` | User FK only; `contentType`, `contentId`, `contentCode` are generic scalar references | User delete cascades; content deletes do nothing | `(userId, contentType, contentId)` | **High semantic-orphan risk**; no DB content FK |
| `LearningPath` | `id Int` | User FK; content stored in `pathData` | User delete cascades; content deletes do nothing | None beyond PK | Medium/high semantic-orphan risk from serialized references |
| `MentorSession` | `id Int` | User FK; content context stored in `context` | User delete cascades; content deletes do nothing | `sessionId` | Medium/high semantic-orphan risk from serialized context |
| `ConversationMessage` | `id Int` | Conversation FK; `knowledgeObjects` is serialized text | Conversation delete cascades; KO delete does nothing | None beyond PK | Medium/high semantic-orphan risk in mentor/chat history |
| `PracticalCard` | `id String/UUID` | Versions, KO joins, saves, feedback | Card delete cascades all four child groups | `code` | **High if cards are replaced:** save/feedback history is user-owned |
| `PracticalCardVersion` | `id String/UUID` | `practicalCardId → PracticalCard` | Card delete cascades | `(practicalCardId, version)` | Low if stable card identity is kept |
| `PracticalCardKnowledgeObject` | Composite | Card ↔ KO many-to-many join | Either parent delete cascades the join | `(practicalCardId, knowledgeObjectId)` PK | Medium: KO deletion detaches cards but does not delete them |
| `PracticalCardSave` | `id String/UUID` | User and card FKs | Either parent delete cascades | `(userId, practicalCardId)` | High by design, though current row count is zero |
| `PracticalCardFeedback` | `id String/UUID` | User and card FKs | Either parent delete cascades | `(userId, practicalCardId)` | High if card IDs are replaced |
| `DecisionCheck` | `id String/UUID` | Sessions | Tool delete cascades sessions, answers, and result | `code` | High user-history risk if tool IDs are replaced |
| `DecisionCheckVersion` | `id String/UUID` | `decisionCheckId` is an indexed scalar, **not a declared relation/FK** | No DB-enforced owner cascade/integrity | No `(decisionCheckId, version)` uniqueness | **High integrity risk:** versions can orphan or duplicate |

### Saved/bookmark and mentor linkage finding

`PracticalCardSave` is the only explicit saved-content model found. There is no generic `Bookmark` model. `FeedInteraction` may record generic actions but is not implemented as a relational bookmark table. Mentor and conversation history link to KO/content through serialized text (`MentorSession.context`, `ConversationMessage.knowledgeObjects`, and related snapshots), not a foreign key. Those histories will not be deleted automatically, but their embedded IDs/codes can become stale.

### Course → KO linkage finding

There is no direct `Course → KnowledgeObject` join. The authoritative path is:

```text
Course.id
  └─ Lesson.courseId
       └─ Lesson.knowledgeObjectId
            └─ KnowledgeObject.id
```

This is a many-lessons-to-one-KO structure in practice: one KO can be used by multiple lessons and courses.

## Deletion dependency tree

### If a Course is deleted

```text
Course
├─ Enrollment [CASCADE]                    ← user course history lost
├─ Lesson [CASCADE]
│  └─ LessonProgress [CASCADE]             ← user lesson history lost
├─ FinancialModelCourse [CASCADE]
└─ FinancialCase.courseId [SET NULL]
```

The KO itself is not deleted. Deleting all courses would leave their KOs unless a separate KO delete is run.

### If a Lesson is deleted

```text
Lesson
└─ LessonProgress [CASCADE]                 ← user lesson history lost
```

The linked KO is retained. The lesson's course is retained.

### If a KnowledgeObject is deleted

```text
KnowledgeObject
├─ Lesson.knowledgeObjectId [SET NULL]       ← lessons survive without KO
├─ KnowledgeObjectVersion [CASCADE]
├─ KnowledgeObjectSource [CASCADE]
├─ ReviewRecord [CASCADE]
├─ KnowledgeProgress [CASCADE]              ← user KO progress lost
├─ Quiz [CASCADE]
│  └─ QuizQuestion [CASCADE]
├─ TaskTemplate [CASCADE]
│  └─ TaskAssignment.taskTemplateId [SET NULL]
├─ LearningVideo [CASCADE]
│  ├─ VideoProgress [CASCADE]               ← user video history lost
│  └─ VideoProductionJob [CASCADE]
├─ Flashcard [CASCADE]
│  └─ FlashcardReview [CASCADE]             ← user review history lost
├─ FlashcardProgress [CASCADE]              ← user flashcard progress lost
├─ PublicationEvent [CASCADE]
├─ FinancialModelKnowledgeObject [CASCADE]
└─ PracticalCardKnowledgeObject [CASCADE]   ← card remains, KO link disappears

Unmanaged references that survive and can become stale:
├─ QuizAttempt.koId / quizId
├─ TaskAssignment.koId
├─ LearningProgress.contentId/contentCode
├─ LearningPath.pathData
├─ MentorSession.context
└─ ConversationMessage.knowledgeObjects
```

### If a KnowledgeObjectVersion is deleted

```text
KnowledgeObjectVersion
└─ KnowledgeObject.currentVersionId [SET NULL, when referenced]
```

Deleting a current version therefore does not delete the KO, but can leave it without a current version. Version authorship points to `User` with `RESTRICT` on user deletion; it does not block version deletion.

### User data that must not be implicitly deleted

The migration must preserve or explicitly remap all of the following before any content hard-delete:

- `Enrollment` course status/progress and completion meaning
- `LessonProgress`
- `KnowledgeProgress`
- `LearningProgress` generic continue/completion state
- `QuizAttempt`
- `TaskAssignment` and submitted answers/review feedback
- `FlashcardReview` and `FlashcardProgress`
- `VideoProgress`
- `PracticalCardSave` and `PracticalCardFeedback`
- mentor sessions, conversations, citations, and embedded KO references
- learning-path JSON and any completion snapshots

If no semantically valid old-to-new mapping exists, keep the old content archived and retain historical progress against it; do not fabricate completion on a different lesson or KO.

## Current database inventory

| Inventory item | Count | Definition / note |
|---|---:|---|
| Course | 288 | All rows |
| Lesson | 1,170 | All rows |
| KnowledgeObject | 955 | All rows |
| Published KO | 299 | `status = published` |
| Unpublished KO | 656 | `status != published`; all 656 currently have `status = archived` |
| Explicit draft KO | 0 | `status = draft` |
| Archived KO by status | 656 | `status = archived` |
| KO with `archivedAt` populated | 660 | Four more than archived-by-status |
| KnowledgeObjectVersion | 7,441 | All rows |
| Source | 111 | All rows |
| Enrollment / course-progress rows | 47 | `Enrollment` stores progress/status |
| LessonProgress | 12 | User lesson progress |
| KnowledgeProgress | 6 | User KO progress |
| LearningProgress | 37 | All are currently `contentType = decision_check` |
| Non-enrollment progress rows | 55 | 12 + 6 + 37; used as `Progress count` in the final gate |
| Course + lesson progress rows | 59 | 47 Enrollment + 12 LessonProgress |
| All listed enrollment/progress rows | 102 | 47 + 12 + 6 + 37; not deduplicated by user |
| PracticalCard | 86 | All rows |
| PracticalCardSave | 0 | Explicit saved/bookmark relation |
| DecisionCheck | 12 | All are published and not soft-deleted |
| DecisionCheckVersion | 13 | 12 owners; `DC-PROFIT-001` has versions 1.0 and 2.0 |

### Relevant dependency volumes

These counts show the blast radius of a full KO/content hard-delete; they are not a request or authorization to delete them.

| Dependent data | Count | Hard-delete consequence |
|---|---:|---|
| KnowledgeObjectSource | 3,616 | Cascades |
| ReviewRecord | 855 | Cascades; review audit history lost |
| Quiz | 872 | Cascades |
| QuizQuestion | 4,287 | Cascades through Quiz |
| QuizAttempt | 3 | Does not cascade; unmanaged IDs can orphan |
| TaskTemplate | 867 | Cascades |
| Linked TaskAssignment | 3 | Survives with template set null; scalar KO ID can orphan |
| LearningVideo | 54 | Cascades |
| VideoProgress | 0 | No current rows, but schema risk remains |
| PublicationEvent | 2,519 | Cascades; publication audit history lost |
| Flashcard | 5,256 | Cascades |
| FlashcardReview | 15 | Cascades through Flashcard |
| FlashcardProgress | 4 | Cascades directly from KO |
| FinancialModelKnowledgeObject | 72 | Join rows cascade |
| PracticalCardKnowledgeObject | 95 | Join rows cascade; cards remain |
| KO with current-version pointer | 917 | Pointer is set null if current version is deleted |
| FinancialModelCourse | 39 | Cascades from Course |
| FinancialCase linked to Course | 24 | Course link becomes null |
| LearningPath | 7 | Serialized references require application-level audit |
| MentorSession | 20 | Serialized context requires application-level audit |

## Relationship integrity findings

| Check | Result | Rate / interpretation |
|---|---:|---|
| Course with no Lesson | 17 | 5.9% of courses |
| Lesson with no KO | 0 | 0%; current data is complete despite nullable schema |
| KO with no Course/Lesson link | 20 | 2.1% of KOs |
| KO reused by more than one Lesson | 223 | 23.4% of KOs |
| Lesson references covered by reused KOs | 458 | 235 references beyond the first use of each shared KO |

**KO status/timestamp inconsistency (high confidence):** four records are `published` while `archivedAt` is populated. They are KO IDs `106` (`CUR-021-01`), `196` (`CUR-039-01`), `626` (`FIN-CASHFLOW-001`), and `627` (`FIN-REVENUE-001`). Any archive filter must define whether status or timestamp is canonical before a migration cohort is selected.

## Sample Course → Lesson → KO rows

The following deterministic sample is ordered by course ID, then lesson order/ID.

| Course ID | Course title | Lesson ID | Lesson title | KO ID / code | KO status |
|---:|---|---:|---|---|---|
| 1 | E-ticaret Maliyet ve Kârlılık | 1 | Gerçek Birim Maliyet — Uygulama | 109 / `CUR-021-04` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 4 | Pazar Yeri Komisyonu — Uygulama | 134 / `CUR-026-04` | published |
| 1 | E-ticaret Maliyet ve Kârlılık | 2 | Satış Marjı — Uygulama | 174 / `CUR-034-04` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 5 | Kampanya Fiyatlandırma — Uygulama | 194 / `CUR-038-04` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 6 | Pazar Yeri Seçimi — Temel ve Teşhis | 206 / `CUR-041-01` | published |
| 1 | E-ticaret Maliyet ve Kârlılık | 7 | Kendi E-ticaret Sitesi — Temel ve Teşhis | 212 / `CUR-042-02` | published |
| 1 | E-ticaret Maliyet ve Kârlılık | 8 | Çoklu Kanal Satış — Süreç ve Ölçüm | 218 / `CUR-043-03` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 9 | Stok Yönetimi — İşletme Uygulaması | 234 / `CUR-046-04` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 10 | İade Yönetimi — İşletme Uygulaması | 249 / `CUR-049-04` | archived |
| 1 | E-ticaret Maliyet ve Kârlılık | 11 | Kargo Seçenekleri — Temel ve Teşhis | 285 / `CUR-056-05` | published |

## Decision Tool inventory

`DecisionCheck.code` is unique, so a duplicate code would violate the database constraint. No duplicate was observed.

| Expected code | Result | Current state |
|---|---|---|
| `DC-PROFIT-001` | VAR | Published, current 2.0; published versions 1.0 and 2.0 |
| `DC-DISCOUNT-002` | VAR | Published, current 1.0 |
| `DC-FREESHIP-003` | VAR | Published, current 1.0 |
| `DC-MARKETPLACE-004` | VAR | Published, current 1.0 |
| `DC-ADS-005` | VAR | Published, current 1.0 |
| `DC-HIRE-006` | VAR | Published, current 1.0 |
| `DC-LOAN-007` | VAR | Published, current 1.0 |
| `DC-CASHFLOW-008` | VAR | Published, current 1.0 |
| `DC-BRANCH-009` | VAR | Published, current 1.0 |
| `DC-CAMPAIGN-010` | VAR | Published, current 1.0 |
| `DC-STOCK-011` | VAR | Published, current 1.0 |
| `DC-CONTINUE-012` | VAR | Published, current 1.0 |
| `DC-TAX-013` | **YOK** | Must not be auto-created by this audit/migration |

Decision Tool duplicate result: **none**. All 13 version rows point to one of the 12 existing Decision Checks, but `DecisionCheckVersion.decisionCheckId` is not protected by a database foreign key. This is a schema integrity gap to test during every dry-run.

## Old-content cleanup risk analysis

### 1. Is deleting all published and unpublished KOs safe?

**No.** A full KO delete would cascade through 7,441 versions, 855 reviews, 872 quizzes, 867 task templates, 54 videos, 5,256 flashcards, 2,519 publication events, and multiple joins. It would also delete current user `KnowledgeProgress`, `FlashcardReview`, and `FlashcardProgress` rows. Separately, `QuizAttempt`, `TaskAssignment.koId`, learning paths, mentor/chat history, and generic progress can survive with stale references.

### 2. Which child records must be handled before deleting courses?

At minimum: `Enrollment`, `LessonProgress`, `FinancialModelCourse`, and course links from `FinancialCase`. The first two are user history and must be preserved/remapped explicitly. Because course deletion cascades lessons, lesson identity mapping must be frozen before the course operation. KOs are not course children and require a separate decision.

### 3. How should enrollment/progress history be preserved?

- Prefer keeping old courses/lessons/KOs archived and read-only so historical identity remains resolvable.
- Produce an immutable mapping manifest: old course/lesson/KO IDs and codes → new IDs/codes, plus mapping confidence and reason.
- Remap only exact semantic equivalents. A title match alone is insufficient.
- Preserve original completion timestamps, percentages, status, and source identity in a history snapshot.
- When no exact mapping exists, keep history against archived legacy content and label it legacy; do not transfer completion to unrelated new content.
- Validate before/after counts per user and per progress table; zero unexplained loss is the gate.

### 4. Are there foreign-key constraints that can block deletion?

For the audited content-parent direction, the committed DDL primarily uses `CASCADE` or `SET NULL`; it is more likely to permit an overly broad delete than to block it. `KnowledgeObjectVersion.createdBy` and `ReviewRecord.reviewerId` restrict **user** deletion, not content deletion. No current KO/course child FK was found that safely stops an accidental content hard-delete.

This does not mean deletion is guaranteed under every future schema/database state. The dry-run must re-read live FK metadata and compare it with committed migrations before execution.

### 5. Can cascade delete remove unexpected user data?

**Yes.** Course deletion cascades 47 enrollment records and 12 lesson-progress records in the current snapshot if the whole set is deleted. KO deletion cascades 6 KO-progress rows, 15 flashcard reviews, and 4 flashcard-progress rows; future video-progress rows would also cascade. Decision Tool and Practical Card deletes have similar user-history cascades even though they are outside the proposed KO cleanup.

### 6. Is archive-first safer than hard delete?

**Yes.** Archive-first is materially safer and reversible. It preserves referential identity, user history, mentor citations, and rollback capability. The current status inconsistency must first be resolved by defining a canonical archive rule; otherwise four published rows with `archivedAt` would be classified inconsistently.

### 7. Can the real migration use transactions?

**Yes, but a transaction is not a substitute for mapping and validation.** PostgreSQL/Prisma can wrap bounded create/link/cutover operations transactionally. A single giant transaction over all content is not recommended without load/lock testing. Use staged import, deterministic IDs/codes, per-batch transactions, validation, and an atomic visibility cutover. Archive/hard-delete should be a later, separately approved phase after rollback evidence exists.

## Recommended target mapping for the 38-lesson content set

```text
New JSON Course
  └─ Course
      └─ Lesson
          └─ KnowledgeObject
              ├─ KnowledgeObjectVersion
              ├─ KnowledgeObjectSource ── Source
              └─ PracticalCardKnowledgeObject ── PracticalCard

decision_tool_id
  └─ DecisionCheck.code
      └─ existing DecisionCheck.id
```

### Field and identity rules

| Input concept | Target | Required rule |
|---|---|---|
| Course identity | `Course.slug` | Stable, unique, deterministic; never match only by title |
| Lesson identity | `Lesson.id` plus external manifest key | Schema has no lesson slug/business key; keep an external deterministic key/map and validate `(course, order)` collisions |
| KO identity | `KnowledgeObject.code` / `slug` | Use canonical stable code; both are unique but nullable |
| Current KO content | `KnowledgeObject` + `currentVersionId` | Create/version/link in one bounded transaction; ensure pointer belongs to the same KO |
| KO version | `KnowledgeObjectVersion` | Enforce `(koId, versionNumber)` uniqueness in importer validation because DB does not |
| Source | `Source` + `KnowledgeObjectSource` | Normalize/deduplicate source identity; DB does not prevent duplicate KO-source pairs |
| Practical card | `PracticalCard.code` | Reuse stable card IDs/codes when semantically unchanged so saves/feedback survive |
| Decision tool | `DecisionCheck.code` | Lookup only; exactly one existing, published, non-deleted row required |

### Schema fit and gaps

The schema broadly supports the requested hierarchy, but it is **not fully migration-safe without application-level guards**:

1. Course → KO exists only through Lesson.
2. Lesson has no stable unique business key or slug.
3. `(koId, versionNumber)` is not unique in the database.
4. `(koId, sourceId)` is not unique in the database.
5. `DecisionCheckVersion.decisionCheckId` has no foreign key or declared Prisma relation.
6. Several history models store content IDs/codes inside scalar/JSON/text fields.
7. A KO can be shared by multiple lessons; the importer must not duplicate shared KOs unintentionally.
8. `KnowledgeObject.status` and `archivedAt` currently disagree for four rows.

### Required dry-run gates before any write-capable migration is approved

- Input schema validation passes for all 38 lessons.
- Course slug, KO code/slug, lesson external key, version number, source link, card code, and decision tool code are unique at their intended grain.
- All `decision_tool_id` values resolve to exactly one existing, published, non-deleted `DecisionCheck`; currently `DC-TAX-013` fails this gate.
- Shared KO intent is explicit; no accidental one-KO-per-lesson expansion.
- Every current enrollment/progress/history row is either mapped or intentionally retained against archived legacy content.
- Before/after dry-run projections show zero unexplained user-history loss.
- The four status/timestamp inconsistencies have a documented canonical resolution.
- Rollback restores visibility and identity, not merely row counts.
- A separate human approval is obtained before archive cutover and again before any hard-delete phase.

## Limitations and confidence

- Counts are a point-in-time snapshot and can change after this audit.
- Serialized JSON/text fields were identified structurally but not semantically rewritten or exhaustively parsed; doing so belongs in the dry-run analyzer.
- No new 38-lesson JSON payload was included in this task, so field-level payload validation and exact old-to-new semantic mapping were not possible.
- Referential actions were checked in the Prisma schema and committed migration DDL. A future execution plan must also inspect live PostgreSQL constraints to detect drift.
- Confidence is **high** for counts, declared relations, and cascade behavior in the committed schema; **medium** for the full semantic reach of JSON/text references.

## Recommended next steps

1. Fix or formally resolve `DC-TAX-013` outside this audit; do not let the importer synthesize it.
2. Decide whether `status` or `archivedAt` is canonical and resolve the four inconsistent KO rows through a separately approved change.
3. Build a read-only dry-run analyzer for the 38-lesson JSON that emits planned creates/reuses/archives and a complete old-to-new identity map.
4. Add deterministic preflight tests for duplicate KO versions, duplicate KO-source links, missing Decision Tools, shared-KO expansion, and user-history coverage.
5. Adopt archive-first cutover. Consider hard delete only after a retention period, backup/restore proof, and explicit user-history sign-off.

## MIGRATION GATE

```text
MIGRATION GATE

Database write executed: NO
Database delete executed: NO
Migration executed: NO
Seed executed: NO

Current Course count: 288
Current Lesson count: 1170
Current KO count: 955
Published KO: 299
Unpublished KO: 656 (status != published; explicit draft: 0, archived status: 656)
Enrollment count: 47
Progress count: 55 (excluding Enrollment: 12 LessonProgress + 6 KnowledgeProgress + 37 LearningProgress)

Decision Tool IDs expected: 13
Decision Tool IDs found: 12
Missing Decision Tool IDs: DC-TAX-013

Cascade delete risk: HIGH
User progress preservation risk: HIGH

Safe to begin dry-run migration development: YES
```

“YES” authorizes only development of a non-mutating dry-run/analyzer. It does **not** authorize database writes, imports, migrations, seeds, archive updates, or deletes.
