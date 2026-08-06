# Phase 8.0F — Legacy UX Retirement Report

Tarih: 2026-08-02  
Karar: **INTERNAL TEST READY**

## 1. Yönetici özeti

Quiz ve Flashcard normal öğrenci deneyiminden kontrollü biçimde çıkarıldı. Veritabanı tabloları, geçmiş denemeler, tekrar kayıtları ve yüzdeler korunmuştur. Yerlerine Karar Kontrolleri ve Pratik Kartlar konumlandırılmıştır. Silme veya veri taşıma yapılmadı.

## 2. Başlangıç git durumu

Aktif dal `codex/phase8-product-experience` idi. Çalışma ağacı başlangıçta temiz değildi: Phase 8.0D/E ile ilişkili üç değiştirilmiş production dosyası, yeni ilerleme migration'ı ve çeşitli izlenmeyen yardımcı/rapor dosyaları vardı. Bu dosyalar silinmedi veya geri alınmadı. Commit/push yapılmadı.

## 3. Quiz envanteri

`Quiz`, `QuizQuestion` ve `QuizAttempt` modelleri; `/quizzes/history`, `/quizzes/:koId` ve `/quizzes/:koId/attempts` uçları; eski öğrenci sayfaları ve testleri mevcuttur. Geçmiş okuma ucu sahiplik filtresiyle korunmuştur. Yeni içerik/attempt akışı bayrak kapalıyken engellenir.

## 4. Flashcard envanteri

`Flashcard`, `FlashcardReview` ve `FlashcardProgress` modelleri; bilgi nesnesi, due ve review uçları; eski öğrenci sayfaları ve pilot göstergeleri mevcuttur. Bayrak kapalıyken yeni çalışma/review yapılmaz.

## 5. Kullanıcı giriş noktaları

Sidebar, Dashboard, Knowledge Detail, Course Player, Pilot Learning Path, doğrudan eski URL'ler ve Mentor suggested-action allowlist denetlendi.

## 6. Kaldırılan navigation noktaları

Normal durumda Sidebar Quiz/Flashcard öğeleri, kurs sekmeleri, KO hızlı çalışma kartları, Dashboard/pilot CTA ve legacy pilot ikonları gizlidir. Karar Kontrolleri ve Pratik Kartlar menüye eklenmiştir.

## 7. Direct URL davranışı

`/app/quiz*` ve `/app/flashcards*` adresleri ham 404 vermez. Odak yönetimli `LegacyFeatureUnavailable` ekranı geçmişin korunduğunu açıklar ve ilgili yeni ürüne veya panele CTA sunar.

## 8. Backend route stratejisi

Route dosyaları fiziksel olarak korunmuştur. `GET /quizzes/:koId`, Quiz attempt, Flashcard knowledge/due ve review uçları bayrak kapalıyken veritabanına erişmeden HTTP 410 ve sabit hata kodu döndürür. Quiz history, kullanıcının kendi geçmişini okuyabilmesi için korunmuştur.

## 9. Feature flags

- `FEATURE_LEGACY_QUIZ_ENABLED=false`
- `FEATURE_LEGACY_FLASHCARDS_ENABLED=false`
- `VITE_FF_LEGACY_QUIZ=false`
- `VITE_FF_LEGACY_FLASHCARDS=false`

`true` değeri rollback yoludur. `.env.example` yeni ve legacy Phase 8 bayraklarını belgeler.

## 10. Course/Lesson progress etkisi

Bayrak kapalıyken Quiz ve Flashcard aktif ağırlık setinden çıkarılır; kalan bileşen ağırlıkları yeniden ölçeklenir. Saklı `quizPercent` ve `flashcardPercent` alanları silinmez. Daha önce tamamlanan bir ders monoton olarak tamamlanmış kalır ve `completedAt` korunur.

## 11. LearningProgress uyumluluğu

İzin verilen türler zaten `guide`, `lesson`, `course`, `practical_card`, `decision_check`, `financial_tool` ile sınırlıydı. Quiz/Flashcard türü eklenmedi. Karar Kontrolü rotasındaki hatalı `/start/` bölümü düzeltildi.

## 12. Feed uyumluluğu

Feed üreticisi Quiz/Flashcard adayı üretmiyor. Decision Check ve knowledge route eşlemelerindeki bozuk adresler düzeltildi; mevcut sıralama/dismiss davranışına dokunulmadı.

## 13. Contextual Mentor uyumluluğu

Eski Quiz/Flashcard suggested-action allowlist girdileri kaldırıldı; Karar Kontrolleri ve Pratik Kartlar eklendi. Genel Mentor, kaynak/citation ve finans araçları davranışı değişmedi.

## 14. Search/library uyumluluğu

Ana bilgi ve kurs kütüphanesi legacy ürün türü üretmiyor. KO detay cevabındaki ilişkisel eski veriler backend uyumluluğu için korunurken normal frontend bunları render etmez ve legacy API çağrısı başlatmaz.

## 15. Saved/recent content

Pratik Kart listesi, kayıtlı kartlar ve detay sayfaları `/app/practical-cards` altında gerçek rotalara bağlandı. LearningProgress recent/continue eski türleri içermez.

## 16. Admin bağımlılıkları

Quiz/Flashcard için ayrı aktif admin ekranı tespit edilmedi. Seed/verify/quality scriptleri ve ilişkisel modeller legacy bakım için korunmuştur.

## 17. Deprecation stratejisi

Soft retirement uygulanmıştır: veri korunur, normal UX kapalıdır, yazma engellenir, kontrollü geri dönüş vardır. Fiziksel kaldırma ayrı bir veri saklama ve admin ihracat fazına ertelenmiştir.

## 18. Database/migration durumu

**No schema migration required.** `prisma validate` geçti; 12 migration bulundu ve PostgreSQL şeması güncel. Bu faz yeni migration üretmedi.

## 19. Security

Auth pre-handler korunur. Kapalı özellik guard'ı mutasyondan önce çalışır. Quiz history kullanıcı ID'siyle filtrelenir. Eski veri dışa açılmadı ve IDOR yüzeyi genişletilmedi.

## 20. Performance

Bayrak kapalıyken Knowledge Detail legacy Flashcard/Quiz API çağrılarını başlatmaz. Eski sayfalar lazy import olarak rollback amacıyla bundle'da kalır; bundle karşılaştırması için güvenilir önceki build ölçümü bulunmadığından üretim performansı iddiası yapılmaz.

## 21. Backend testleri

76 dosyada **1149/1149** test geçti. Phase 8 seçili regresyon paketi 6 dosyada **21/21**; explicit backend transition guard testi **2/2** geçti. İlk tam koşudaki 16 eski Quiz beklentisi test fixture'larına açık rollback modu eklenerek giderildi.

## 22. Frontend testleri

20 dosyada **100/100** test geçti. Legacy removal frontend testi **3/3**; hedef Sidebar ile birlikte **9/9** geçti. Frontend production build başarılı.

## 23. Manual desktop

Bu çalışma sırasında oturum açılmış gerçek tarayıcıyla uçtan uca desktop testi yapılmadı. Otomatik component, route davranışı ve production build kanıtı vardır.

## 24. Manual mobile

Gerçek cihaz veya responsive tarayıcı manuel testi yapılmadı. Bu nedenle kontrollü beta sınıfı verilmedi.

## 25. Değişen dosyalar

Phase 8.0F production kapsamı: `.env.example`, backend feature-flag config, Quiz/Flashcard route guard'ları, course-progress, personalized-feed route map, frontend feature config, router, Sidebar, Dashboard, Course/Knowledge/Pilot sayfaları, LearningProgress, Mentor action allowlist, common fallback ve Practical Card rotaları. Test kapsamı: yeni backend/frontend transition testleri ve rollback amacı açık eski Quiz fixtures. Dosya silinmedi.

Başlangıçtan gelen `DecisionCheckSession.jsx`, `api.js`, feed/progress testleri, yeni practical-card listeleri, migration ve yardımcı dosyalar kullanıcı çalışması olarak korunmuştur.

## 26. Bilinen sınırlamalar

Manual desktop/mobile kanıtı yoktur. Çalışma ağacı Phase 8.0F öncesinden kalan çok sayıda izlenmeyen dosya içerir. Prisma format denetimi önceden var olan biçim farkları bildirdi; geniş kapsamlı otomatik format uygulanmadı. `git diff --check`, başlangıçta değiştirilmiş olan `DecisionCheckSession.jsx` ve `api.js` içindeki üç trailing-whitespace satırını raporladı; kullanıcı değişikliklerine müdahale etmemek için otomatik temizlenmedi. Yerel servislerin yeni `.env` değerlerini alması için yeniden başlatılması gerekir.

## 27. Legacy cleanup backlog

Silmeden önce saklama süresi, kullanıcı geçmişi export'u, admin read-only ekranı, telemetry ile sıfır trafik kanıtı, rollback penceresi, yedek/restore testi ve hukuk/ürün onayı zorunludur. Sonrasında eski lazy bundle'lar ve seed/verify scriptleri ayrı PR ile ele alınabilir.

## 28. Commit’e hazır mı?

Phase 8.0F değişiklikleri teknik olarak testlerden geçmiştir; ancak kirli başlangıç çalışma ağacı nedeniyle doğrudan toplu commit **önerilmez**. Yalnız bu raporda listelenen dosyalar seçilerek gözden geçirilmeli, manuel desktop/mobile kanıtından sonra commit edilmelidir. Bu çalışma commit veya push yapmadı.
