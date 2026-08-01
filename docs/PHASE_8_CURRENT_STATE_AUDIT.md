# PHASE 8 CURRENT STATE AUDIT

## 1. Yönetici Özeti
Bu belge, LocalAkademi'nin "klasik kurs, quiz ve flashcard" merkezli mimariden sıyrılarak, kullanıcının doğrudan "karar almasına, risk görmesine ve eyleme geçmesine" odaklanan yapıya geçişi öncesi mevcut durumu haritalamaktadır. Quiz ve Flashcard sistemlerinin bağımlılıkları belirlenmiş olup, Mentor yapısı güvenli ve Phase 7 standartlarında bırakılmıştır.

## 2. İncelenen Dosyalar ve Repository Haritası
Repository'de gerçekleştirilen tam arama (`grep` ve `Prisma` analizi) sonucunda incelenen başlıca gerçek dosya yolları şunlardır:
- **Backend Entry Point:** `src/index.ts`
- **Frontend Entry Point:** `frontend/src/main.jsx`
- **Prisma Schema:** `prisma/schema.prisma`
- **Route Kayıt Dosyaları:** `frontend/src/router/index.jsx`
- **Servis Katmanı:** `src/services/course-progress.ts`, `src/services/quizzes.ts`, `src/services/courses.ts`, `src/services/quiz-engine.ts`, `src/services/pilotDashboard.ts`
- **Frontend Component/Page:** `frontend/src/pages/QuizDashboardPage.jsx`, `frontend/src/pages/QuizTakePage.jsx`, `frontend/src/pages/FlashcardDashboardPage.jsx`, `frontend/src/pages/FlashcardStudyPage.jsx`, `frontend/src/pages/Dashboard.jsx`
- **Knowledge Object:** `prisma/schema.prisma` (`KnowledgeObject` modeli), `src/services/knowledge-v2.ts`
- **Mentor:** `frontend/src/components/mentor/MentorComposer.jsx`, `src/services/mentor-retrieval-rerank.ts`

## 3. Quiz Modeli ve Gerçek Bağımlılıkları
- **Prisma Modelleri:** `Quiz`, `QuizQuestion`, `QuizAttempt`
- **Route / API:** `src/services/quizzes.ts` (API endpointleri sağlar).
- **Service / Hesaplanma:** `src/services/course-progress.ts` (Satır 62: `hasQuizzes` ise `quizPercent` `WEIGHTS.quiz` = 0.20 ile hesaplanır).
- **Frontend UI:** `frontend/src/pages/QuizTakePage.jsx` ve CoursePlayerPage bileşenlerinde gösterilir.
- **Progress Bağımlılığı (Kanıtlı):** `LessonProgress.quizPercent` alanı modelde var. `course-progress.ts` dosyası, `ko?.quizzes?.length > 0` kontrolüyle dersin tamamlanma yüzdesini (`overallPercent`) ağırlıklı hesaplar.
- **Course Completion Etkisi:** Quiz içeren bir derste kullanıcı Quiz çözmezse (`quizPercent`=0), `overallPercent` 100 olamaz. Bu durum dolaylı yoldan kursun tamamlanmasını (Enrollment progress %100 olmasını) engeller.
- **Risk Analizi:** Quiz tablolarının (Örn. `Quiz` modeli) Prisma'dan fiziksel olarak silinmesi, `course-progress.ts` içindeki `knowledgeObject { include: { quizzes: true } }` query'sini kırarak tüm ilerleme sisteminde (progress update) **fatal error / yüksek regresyon riski** üretir. Veritabanı silinmemelidir.

## 4. Flashcard Modeli ve Gerçek Bağımlılıkları
- **Prisma Modelleri:** `Flashcard`, `FlashcardReview`, `FlashcardProgress` (İsimleri birebir doğrudur).
- **Endpoint / Service:** `src/services/flashcard-routes.ts`, `src/services/flashcards.ts`
- **Frontend UI:** `frontend/src/pages/FlashcardStudyPage.jsx`, `frontend/src/components/ui/FlashcardSection.jsx`
- **Progress Bağımlılığı:** `course-progress.ts` (Satır 61) içinde `WEIGHTS.flashcard` = 0.15 olarak genel lesson completion'a etki eder.
- **Knowledge Object (KO) Relation:** `KnowledgeObject.flashcards` (One-to-Many ilişkisi vardır).
- **Migration / Dönüşüm Durumu:**
  - Mevcut "ön yüz soru, arka yüz cevap" formatı, iş kararı merkezli Pratik Kart modeline anlamsal olarak uygun değildir.
  - Örnek flashcardların büyük kısmı: **"Not suitable"** veya **"Editorial rewrite"** sınıfındadır. Doğrudan (Directly reusable) taşınamaz.
  - Sadece KO ile relation'ı vardır, içeriklerin sıfırdan "Practical Card" kurallarına göre (risk uyarıları, formül vb.) editörlerce yeniden yazılması gereklidir.

## 5. Progress Gerçek Hesaplama Yolu
- **Enrollment / LessonProgress:** İlerleme hesaplamaları `src/services/course-progress.ts` dosyasındaki `recomputeLessonAndEnrollment` fonksiyonuyla ağırlıklı (Weights: reading 0.25, video 0.20, flashcard 0.15, quiz 0.20, task 0.20) yapılmaktadır.
- Salt sayfa açılması (lastViewedAt) `readingPercent` alanını etkileyebilmekte, ancak tam 100% için test çözümü gerekmektedir.
- Yeni nesil yapıda, "karmaşık yüzde" yerine "Durum" (started, completed vb.) mantığı gerekecektir.

## 6. Dashboard / Feed Gerçek Veri Kaynakları
- **Endpoint / Service:** `src/services/pilotDashboard.ts`, `src/services/learnerDashboard.ts`
- **Frontend Page:** `frontend/src/pages/Dashboard.jsx`
- **Veri Yapısı:** Rol bazlı veya sektörel hard-coded öneriler / statik mock veya SQL sorgularıyla çekilen statik KPI kartları mevcuttur. Gerçek zamanlı, deterministik bir kural sıralama motoruna dayalı bir `FeedItem` yapısı şu an yoktur.

## 7. Route ve Navigasyon
- Mevcut: `router/index.jsx` içinde tanımlı Quiz, Flashcard, Learning Path route'ları.
- **Karar:** Quiz ve Flashcard UI modülleri "gizlenecek" (Unlisted). Fakat mevcut URL'e direkt giren veya geçmiş kurs progress yapısını görüntülemek isteyenler için tamamen route silme (404 yapma) işlemi şu an için regression yaratabilir. Öneri: Sadece navigasyon barlarından (Sidebar, Header vb.) kaldırmak (Deprecated bırakmak) daha güvenlidir.

## 8. Knowledge Object (KO) Yeterlilik Matrisi
| KO Code (Örnek/Hedef) | Kategori | Yeterlilik | Risk/Uyarı / Formül / Uygulama Adımı |
|---|---|---|---|
| Bütçe ve Ciro Farkı | Temel | Not Suitable | Tanım odaklı. Pratik karta çevrilmesi için baştan yazılmalı. |
| Ürünüm Gerçekten Kârlı mı? | Finans | Partial | Lab algoritması ve Pricing/Margin kurgusu var (Örn. scripts/verify-pricing-margin-pilot.ts), ancak kural motoru schema'sına uyarlanmalı. |
| Nakit Akışı Yönetimi | Finans | Partial | Risk uyarısı zayıf, formül soyut. |

## 9. İlk Decision Check İçerik Durumu
Decision Check 1: **"Ürünüm Gerçekten Kârlı mı?"**
- **Durum:** **Ready / Kısmi Ready**
- Mevcut Pricing & Margin laboratuvar algoritmalarından kolayca formüle edilebilir. Phase 8.0B'de kural motoruna konulacak ilk prototip olarak seçilmesi güvenlidir.

## 10. Diğer İki Decision Check Blokajları (Phase 8.0B Dışı)
- **"İndirim Yapmaya Hazır mıyım?"** & **"Reklam Bütçemi Artırmalı mıyım?"**
- **Blokaj Türü:** İçerik ve Editöryel Blokaj.
- **Nedeni:** Bu iki kontrolün karar verebilmesi için formüller (Örn. ROAS başabaş noktası), eşik değerleri, risk kuralları ve "Bilinmiyor" cevaplarına verilecek tolerans limitleri henüz sistemde kayıtlı değildir. KO kaynakları yetersizdir.
- **Karar:** Phase 8.0B'de bu iki kontrol MVP'ye dahil edilmemeli, backlog'a atılmalıdır.

## 11. İlk On Practical Card İçerik Durumu
Maliyet kalemleri (Komisyon, Kargo vb.) text bazlı KO'larda mevcuttur ancak yeni tablonun `type` (checklist, quick_formula) yapısına göre satır satır ayrıştırılıp editöryel düzeltme (Editorial Rewrite) gerektirir. Otomatik taşıma imkansızdır.

## 12. Audit Bulgusu ile Ürün Önerisi Ayrımı
- **Audit Bulgusu:** `Quiz` ve `Flashcard` modelleri ders ilerlemesini bloklamakta ve Prisma query'lerine sıkı sıkıya bağlı durumdadır. UI doğrudan route altındadır.
- **Ürün Önerisi:** Bu modüllerin navigasyondan kaldırılması ve `PracticalCard` + `DecisionCheck` kurgusuna yönelmek ürünsel bir tercihtir. Mevcut Course URL'lerini kırmamak adına, Quiz komponenti şimdilik sayfa içinde `Feature Flag` ile gizlenmeli veya read-only bırakılmalıdır.

## 13. Blokajlar ve Belirsizlikler
- **Teknik Blokaj:** Yoktur. Prisma şemasına `additive` olarak ekleme yapılabilir.
- **Editöryel Blokaj:** KO içerikleri Pratik Kart formatına uymadığı için editörlerin veri girmesi veya "Seed" scriptlerinin yepyeni içeriklerle hazırlanması gerekecektir.
