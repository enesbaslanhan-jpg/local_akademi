# PHASE 8 TECHNICAL DESIGN

## 1. Tasarım İlkeleri
- **AI-Agnostic Core:** Karar motorları (Rule Engine) ve sonuçlar (Results) tamamen deterministiktir. AI yalnız açıklamada ve Contextual Mentor arayüzünde yardımcı olur.
- **Additive Migration:** Eski veri (Quiz, Flashcard) silinmeden yeni modeller (DecisionCheck, PracticalCard vb.) Prisma'ya eklenecektir. Eski UI kısımları deprecated statüsüne çekilecektir.
- **Rol & Bağlam Uyumluluğu:** Feed üzerinde çıkacak her öneri kullanıcının sektörü, rolü ve daha önceki `status` durumlarına uygun olarak kural motoru tarafından üretilecektir.

## 2. Hedef Mimari ve Phase 8.0B Kapsamı
Phase 8 bir kerede entegre edilmeyecektir.
**Phase 8.0B Daraltılmış MVP Kapsamı:**
- Additive-only Schema (Yalnızca Decision Check için)
- Typed Question/Answer Models
- Deterministik Kural Motoru (Rule Engine) Backend altyapısı
- Yalnız "Ürünüm Gerçekten Kârlı mı?" isimli tek bir kontrolün seed edilmesi (Diğerleri içerik blokajında olduğundan hariç tutuldu)
- İlgili Backend API ve Testleri
- Backend + Frontend Feature Flag altyapısı
- Admin authoring (Kayıt ekranı) **olmaksızın**, kontrollü Seed/Import üzerinden çalıştırılması
- Minimum düzeyde liste, oturum, detay ve sonuç (UI) ekranı

## 3. Decision Check Modelleri ve Prisma Tasarımı (Versioning Dahil)
Sistemin ilk hali için aşırı normalizasyon ile basitlik arasında bir denge kurulmalıdır:
- `DecisionCheck` (code, title, description, published flag, status)
- `DecisionCheckVersion` veya *Snapshot* yapısı (Tasarım kararı: Result snapshot'ı JSON olarak `DecisionCheckResult` modelinde dondurulacaktır. Ayrı version tabloları ilk MVP için overkill görülmüştür).
- `DecisionCheckRule` (questionKey, operator, threshold, findingCode, severity, priority)
- `DecisionCheckSession` (userId, code, startedAt, completedAt)
- `DecisionCheckAnswer` (sessionId, questionKey, typedValue, type)
- `DecisionCheckResult` (sessionId, findingCodes[], severity, missingInfo[], snapshotJson)

**Prisma Kuralları:**
- **Unique Constraint:** Kullanıcının aynı karta ait yarım kalan sadece bir oturumu olabilir (`userId`, `code`, `completedAt=null`).
- **Cascade:** Session silindiğinde Answer ve Result silinir. DecisionCheck silinmez (Soft delete / Published=false önerilir).
- **Audit/Ownership:** Her oturum ve cevap, o kullanıcının `userId`sine bağlanıp tenant-isolation sağlanır.

## 4. Typed Answers (Soru/Cevap Tipleri)
Desteklenecek veri türleri (Type Enum): `boolean`, `single_select`, `multi_select`, `number`, `money`, `percentage`, `date`, `short_text`, `unknown`
*Bilinmeyen Cevap Davranışı:* Kullanıcı "Bilmiyorum" dediğinde, input alanına fake 0 veya rastgele sayı girilmesine zorlanmamalı, bunun yerine sonuç statüsü `missing_information` veya rule tanımındaki karşılığı olarak çıkmalıdır.

## 5. Rule Engine (Deterministik Kural Motoru) ve Operatör Schema
AI / eval / dinamik JS kullanımı güvenlik (injection) ve stabilite gerekçeleriyle kesin olarak yasaktır.
Desteklenen **Operator Allowlist:**
`equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `between`, `contains`, `not_contains`, `is_unknown`, `is_known`, `all`, `any`.

Her kural eşleşmesi şunları üretir:
- `findingCode` (Örn: `margin_below_threshold`)
- `severity` (`low`, `medium`, `high`, `critical`)
- `messageTemplate` (UI üzerinde gösterilecek ana mesaj)

**Idempotency & Determinizm:** Aynı `input` (Answer) + aynı `Rule Set` her çağrıldığında sunucu tarafında birebir aynı JSON Result objesini üretmelidir.

## 6. Result Snapshot ve Durumlar
Sonuçlar hesaplanıp onaylandığında risk skorlaması yapılmadan duruma çevrilir.
Durumlar: `ready`, `generally_suitable`, `missing_information`, `caution`, `high_risk`, `not_recommended`.
Bu sonuç objesi (JSON olarak) DB'ye serialize (Snapshot) edilir. Kural ileride değişse bile eski result değişmez.

## 7. Practical Card Modelleri
- `PracticalCard` (code, title, type enum, mainContent, published)
- `PracticalCardSave` (Kullanıcının kaydettiği kartlar, ownership)
- `PracticalCardFeedback` (Kullanıcı AI feedback'i gibi helpful/not_helpful kaydı)
- `KnowledgeObject` ile N:1 Relation.

## 8. Feed Mimarisi ve Deterministik Sıralama
AI tabanlı ranking (Neural/Embedding sıralaması) kullanılmayacaktır. Tercih edilen: **Hibrit Model (Dinamik Render + Kalıcı Interaction Tablosu)**.
Öncelik sıralaması:
1. Kritik doğrulanmış risk (Örn: Decision Check sonucu High Risk çıkmış yarım aksiyonlar)
2. Tamamlanmamış Decision Check Session'ları
3. Kaldığın yerden devam et (İlerlemeler)
4. Rol/sektör uyumlu yeni Decision Check
5. Rol/sektör uyumlu Practical Card
6. Kaydedilen (Saved) içeriğe dönüş
7. Yeni yayın veya rehber

## 9. Learning Progress Kararı
Kullanıcıyı puanlamak (Quiz %40, Reading %60) yerine, Lifecycle Status (Durum) izleme tablosuna geçilecektir.
Türler: `guide`, `practical_card`, `decision_check`, `financial_tool` vb.
Sinyaller: `route open` yalnız başına completed yapmaz. İlgili uygulamanın tamamlanması, "Anladım/Tamamla" form aksiyonu vb. completed statüsüne geçirir. Eski `LessonProgress` eski kurs sisteminde yaşayabilir.

## 10. Contextual Mentor Sözleşmesi (Contract)
UI'da Mentor paneli açıkken, backend'e giden Context objesi sınırlandırılacaktır.
- **Sözleşme Alanları:** `contextType`, `contextCode`, `contextId`, `allowedPromptPreset`, `explicitUserConsent`.
- Serbest `prompt` yazımları doğrudan AI karar sistemini mutate (Result değiştirme) edemez. Decision Check result'ları immutable'dır (AI sadece açıklamasını yapar, skoru/riski AI belirlemez).

## 11. Authorization (Yetki) Matrisi
- **Public/Published:** Decision Check Definition, Practical Card, Guide (Sadece Okuma).
- **User-Owned (Kişisel Veri Gizliliği):** Decision Check session, answers, result, feed interactions (Tam Yetki + IDOR kontrolü şart).
- **Admin-Only:** Rule authoring, Rule version creation, Publication durumu.

## 12. Feature Flag Stratejisi
*Yalnız Frontend UI flag'leri yeterli değildir.*
**Tasarım:**
- **Backend API Flag:** Endpoint seviyesinde route authorization ve yayın (publication) kontrolü (Örn: Env variable `ENABLE_DECISION_CHECKS=true` değilse API 404/503 döner).
- **Frontend Flag:** Menüde, Dashboard'da görünürlük (Örn. `VITE_FF_DECISION_CHECKS`).
- **Beta/User Allowlist:** Sınırlı gruplar için User entity'sine özel beta bayrağı (Role checks).
- **Rollback Noktası:** Phase 8.0B patlarsa, `VITE_FF_LEGACY_DASHBOARD=true` ile Dashboard eski Pilot arayüzüne 0 ms'de dönebilecektir.

## 13. API Error Sözleşmeleri ve Idempotency
- **Idempotency:** Aynı oturuma art arda iki kez Submit (`POST /complete`) atılırsa, sistem Idempotent davranıp var olan aynı JSON Result objesini ve `200 OK` (veya `201`) dönmelidir. İkinci işlem crash veya duplicate result üretmemelidir.
- Validasyon hataları `400 Bad Request`, IDOR/Yetki ihlalleri `403 Forbidden` standardındadır.

## 14. Migration ve Test Matrisi
- **Migration:** Schema `additive-only` olacaktır. `DROP TABLE` işlemi yapılmayacaktır.
- **Testler:**
  - Aynı input'un aynı sonucu ürettiği kural motoru testi.
  - Rol filtreleme testi, Feed'in aynı tür karttan max 2 adet getirdiği testi.
  - Mentor Context Preset allowlist testi.
  - IDOR testleri (Kullanıcının başka userId result'ına GET atamaması).

## 15. Alt Fazlar ve Uygulama Planı
1. **Phase 8.0B:** Decision Check Foundation (Additive schema, Rule Engine, Tek bir kontrol MVP'si, API, Testler, Flag'ler)
2. **Phase 8.0C:** Practical Cards (Model, Save, UI)
3. **Phase 8.0D:** Feed and Learning Progress (Hibrit deterministik akış, Dashboard dönüşümü)
4. **Phase 8.0E:** Contextual Mentor (Verified context contract)
5. **Phase 8.0F:** Legacy Transition (Quiz/Flashcard UI gizlenmesi, navigasyon temizliği)
