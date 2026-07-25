# Mevcut Schema Audit – LocalAkademi v1.0.0

**Tarih:** 2026-07-16  
**Veritabanı:** SQLite (file:./dev.db)  
**Kayıt sayısı:** KnowledgeObject → 600, User → 2, Course → 3

---

## 1. Mevcut Modeller (15 model)

| # | Model | Anahtar alan | Amaç |
|---|-------|-------------|------|
| 1 | User | id (autoInt) | Kullanici kaydi, auth |
| 2 | Course | id (autoInt) | Kurs ana kayitlari |
| 3 | Lesson | id (autoInt), courseId FK | Kursa bagli ders |
| 4 | Enrollment | id (autoInt), userId+courseId unique | Kurs kayit ve ilerleme |
| 5 | **KnowledgeObject** | **id (autoInt)** | **Bilgi nesnesi (ELEŞTIRILEN)** |
| 6 | LearningPath | id (autoInt), userId FK | Ogrenme yolu |
| 7 | MentorSession | id (autoInt), userId FK, sessionId unique | AI mentor oturumu |
| 8 | QuizAttempt | id (uuid), userId FK, koId | Quiz denemesi |
| 9 | TaskAssignment | id (uuid), userId FK | Gorev atamasi |
| 10 | UploadedDocument | id (uuid), userId FK | Belge yukleme |
| 11 | BusinessProfile | userId unique FK | Isletme profili |
| 12 | FormulaCalculation | id (uuid), userId FK | Hesaplama gecmisi |
| 13 | ActivityEvent | id (uuid), userId FK | Aktivite logu |
| 14 | GeneratedReport | id (uuid), userId FK | Rapor ve yedek |
| 15 | DocumentConversation | id (uuid), userId+document FK | Belge soru-cevap |

---

## 2. KnowledgeObject – Eksik Alan Analizi

| Alan | Mevcut? | Not |
|------|---------|-----|
| id (Int auto) | ✅ | Internal PK, korunacak |
| code (String unique) | ❌ | `FIN-BREAKEVEN-001` gibi profesyonel ID |
| slug (String unique) | ❌ | URL-friendly kod |
| type (String) | ✅ | concept, fact, procedure, principle |
| title (String) | ✅ | |
| content (String) | ✅ | |
| embedding (String) | ✅ | |
| metadata (String JSON) | ✅ | Kategori, seviye vs |
| **status (String)** | ❌ | draft, review, published, archived |
| **verificationStatus (String)** | ❌ | unverified, expert_review, verified |
| **reviewGate (String)** | ❌ | none, periodic, requires_document, requires_professional |
| **isDemo (Boolean)** | ❌ | **600 kayit demo olarak isaretlenmeli** |
| **publishedAt (DateTime?)** | ❌ | Yayin tarihi |
| **archivedAt (DateTime?)** | ❌ | Arsiv tarihi |
| **reviewDue (DateTime?)** | ❌ | Gozden gecirme tarihi |
| currentVersionId (Int) | ❌ | FK → KnowledgeObjectVersion |
| createdAt | ✅ | |
| updatedAt | ✅ | |

---

## 3. Eksik Modeller (Eslesme Tablosu)

| # | Model | Mevcut? | Islev |
|---|-------|---------|-------|
| 1 | Category | ❌ | KO kategorilerini yonetir (FK eklenmeli) |
| 2 | KnowledgeObjectVersion | ❌ | Surumleme |
| 3 | Source | ❌ | Kaynak kaydi (referans, otorite, guncellik) |
| 4 | KnowledgeObjectSource | ❌ | KO ↔ Source M:N koprusu |
| 5 | ReviewRecord | ❌ | Uzman inceleme kaydi |
| 6 | Quiz (master) | ❌ | Quiz ana kaydi, QuizQuestion'a FK |
| 7 | QuizQuestion | ❌ | Soru bankasi |
| 8 | TaskTemplate | ❌ | Gorev sablonu |
| 9 | Formula (master) | ❌ | Formul tanimi, FormulaCalculation'a FK |
| 10 | PublicationEvent | ❌ | Yayin event logu |
| 11 | ImportJob | ❌ | Icerik import batch |
| 12 | ImportJobError | ❌ | Import hata satiri |

---

## 4. Iliskiler

```
User 1──< Enrollment >──1 Course
User 1──< MentorSession
User 1──< QuizAttempt
User 1──< TaskAssignment
User 1──< UploadedDocument
User 1──< GeneratedReport
User 1──< DocumentConversation
User 1──1 BusinessProfile
User 1──1 UserPreference
User 1──< FormulaCalculation
User 1──< ActivityEvent
User 1──< LearningPath

Course 1──< Lesson
Course 1──< Enrollment

UploadedDocument 1──< DocumentConversation
```

**Eksik:** KnowledgeObject'in Category, Version, Source ile iliskisi yok.

---

## 5. Veri Kaybi Riskleri

| Risk | Seviye | Aciklama |
|------|--------|----------|
| KO'ya zorunlu `code` ekleme | 🔴 YUKSEK | Mevcut 600 KO'nun code degeri yok. Default = demo-{id} verilebilir |
| KO'ya zorunlu `slug` ekleme | 🟡 ORTA | Slug otomatik uretilebilir |
| `isDemo` default false | 🟢 DUSUK | Migration sonrasi script ile true yapilir |
| Sqlite → PostgreSQL | 🔴 YUKSEK | Uzun vadeli, bu asamada yok |
| Mevcut service kodlari | 🟡 ORTA | `knowledge.ts` id bazli select kullaniyor, code/index degismeli |
| QuizAttempt.koId FK | 🟡 ORTA | KO id integer, UUID olunca kirilir (ileride) |

---

## 6. Profesyonel KO Modeline Gecis Engelleri

| Engel | Cozum |
|-------|-------|
| Mevcut KO'larin code alani yok | Migration'da `code = "DEMO-{id}"` default |
| KO'lar JSON metadata icinde kategori tutuyor | Category modeli olustur, metadata'dan cikar |
| Embedding alani her KO'da `[]` | Gercek embedding sistemi yok, ileri faz |
| KO id integer | Profesyonel KO'da id kalabilir, code ayri unique key |
| Service dosyalari `id` ile sorguluyor | Servisler hem id hem code ile sorgulamaya guncellenmeli |

---

## 7. Oncelikli Aksiyonlar

| Sira | Islem | Faz |
|------|-------|-----|
| P0 | KnowledgeObject'e code, slug, status, isDemo alanlari ekle | Faz 1 |
| P0 | 600 KO'yu `isDemo = true` yap | Faz 1 |
| P0 | Prisma migration olustur ve test et | Faz 1 |
| P1 | Category modeli ekle | Faz 2 |
| P1 | Source, ReviewRecord modelleri ekle | Faz 2 |
| P1 | Quiz, QuizQuestion, TaskTemplate modelleri ekle | Faz 2 |
| P1 | Formula master modeli ekle | Faz 2 |
| P1 | KnowledgeObjectVersion ekle | Faz 2 |
| P2 | ImportJob, ImportJobError ekle | Faz 3 |
| P2 | PublicationEvent ekle | Faz 3 |
| P2 | Service kodlarini code bazli query'e guncelle | Faz 3 |

---

*(Audit tamamlandi – sonraki adim MIGRATION_PLAN.md)*