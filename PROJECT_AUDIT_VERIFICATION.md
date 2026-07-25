# LocalAkademi — PROJECT_AUDIT.md Doğrulama Raporu

**Doğrulama tarihi:** 2026-07-25  
**Yöntem:** Kaynak kodu incelemesi + salt-okunur veritabanı sorgusu  
**Kapsam:** `vite.config.js`, `frontend/src/services/api.js`, `frontend/src/pages/MentorPage.jsx`, `package.json`, `src/services/knowledge-v2.ts`, `src/index.ts`, `src/server.ts`, `PrismaClient` kullanımları

---

## 1. Vite proxy'de `/community` eksik mi?

**Kesinlik:** DOĞRULANDI ✅

| Kaynak | Detay |
|--------|-------|
| `frontend/vite.config.js:21-60` | Proxy listesinde `/community` bulunmuyor. Mevcut proxy'ler: `/api/memory`, `/api/v2`, `/api`, `/mentor`, `/auth`, `/courses`, `/lessons`, `/enrollments`, `/knowledge`, `/learning-path`, `/learning`, `/onboarding`, `/assessment`, `/admin`, `/dashboard`, `/quizzes`, `/tasks`, `/flashcards`, `/videos`, `/documents`, `/business`, `/formulas`, `/formula-calculations`, `/reports`. |
| `frontend/src/services/api.js:283-323` | `api.community` endpoint'lerinin tamamı `/community` prefix'i ile başlar (`/community`, `/community/posts`, `/community/official`, `/community/moderation`, `/community/reports`, vb.). |

**Sonuç:** Audit'in "Incomplete Vite proxy — omits `/community`" tespiti doğrudur. Community sayfaları `VITE_API_URL` tanımlı değilse ve Vite proxy'si olmadan local dev'de 404 alır.

---

## 2. Frontend `/api` yolları production'da sorun çıkarır mı?

**Kesinlik:** KISMEN DOĞRULANDI ⚠️

### `api.conversation` (`/api/mentor/conversations`)

| Ortam | İstek | Backend'e Ulaşan | Eşleşme |
|-------|-------|-------------------|---------|
| Dev (Vite proxy) | `/api/mentor/conversations` | `/mentor/conversations` (`/api` strip edildi) | ✅ `prefix: '/mentor/conversations'` (`src/index.ts:83`) |
| Production (`VITE_API_URL`) | `${VITE_API_URL}/api/mentor/conversations` | `/api/mentor/conversations` | ❌ Backend rotası `/mentor/conversations`, eşleşmez |

- **Kaynak:** `frontend/src/services/api.js:218` → `BASE: '/api/mentor/conversations'`
- **Kaynak:** `src/index.ts:83` → `server.register(conversationRoutes, { prefix: '/mentor/conversations' })`

### `api.knowledgeV2` (`/api/v2/...`)

| Ortam | İstek | Backend'e Ulaşan | Eşleşme |
|-------|-------|-------------------|---------|
| Dev (Vite proxy) | `/api/v2/knowledge-objects` | `/api/v2/knowledge-objects` (pass-through, rewrite yok) | ✅ `fastify.get('/api/v2/knowledge-objects', ...)` (`knowledge-v2.ts:169`) |
| Production (`VITE_API_URL`) | `${VITE_API_URL}/api/v2/knowledge-objects` | `/api/v2/knowledge-objects` | ✅ Birebir eşleşir |

- **Kaynak:** `frontend/src/services/api.js:362` → `V2_PREFIX: '/api/v2'`
- **Kaynak:** `src/index.ts:92` → `server.register(knowledgeV2Routes)` (prefix'siz)

**Sonuç:** Audit'in "Dual API prefix convention" tespiti conversation rotaları için doğrudur; v2 KO rotaları backend'de `/api/v2` ile kayıtlı olduğu için production'da çalışır. Audit'in bu ayrımı net yapmadığı not edilmelidir.

---

## 3. Kaç ayrı `new PrismaClient()` kullanımı?

**Kesinlik:** DOĞRULANDI ✅

| Kategori | Dosya Sayısı | Örnekler |
|----------|--------------|----------|
| `src/services/` | **32** | admin, ai-provider, assessment, audit, auth, business, community, companion-content, conversation, courses, documents, enrollments, flashcards, formulas, import, knowledge, knowledge-v2, learnerDashboard, learning, learningPath, lessons, memory-routes, mentor, onboarding, pilotDashboard, quiz-engine, quizzes, reports, sources, tasks, videos, reviewer-telemetry |
| `prisma/` | 7 | seed, seed-knowledge, seed-dig-pilot, phase1/2/3a-tests, test-import-endpoint |
| `scripts/` | ~40+ | 40+ script dosyası |
| `tests/` | ~20+ | test dosyalarının çoğu |

- **Kaynak:** Tüm `src/services/` altındaki `new PrismaClient()` çağrıları.
- **Not:** Bazı dosyalar (`community.ts:80`, `business.ts:29`, `learning.ts:16`, `assessment.ts:68`, `onboarding.ts:31`, `documents.ts:29`, `quizzes.ts:34`) factory pattern kullanır (`opts?.prisma \|\| new PrismaClient()`), ancak parametre verilmezse yine yeni instance oluşturur.

**Sonuç:** Audit'in "30+ modules each call new PrismaClient()" tespiti doğrudur.

---

## 4. Legacy `/mentor/chat` frontend tarafından kullanılıyor mu?

**Kesinlik:** DOĞRULANDI — Kullanılmıyor (dead code) ✅

| Bileşen | Durum |
|---------|-------|
| `api.mentor.chat()` (`api.js:207-208`) | Tanımlı, `/mentor/chat` POST |
| `api.mentor.getHistory()` (`api.js:210`) | Tanımlı, `/mentor/history` GET |
| `api.mentor.clearHistory()` (`api.js:211-214`) | Tanımlı, `/mentor/history` DELETE |
| `MentorPage.jsx` | Sadece `api.conversation.*` kullanır (9 farklı çağrı: getList, getById, create, update, remove, streamMessage, regenerate, editAndRegenerate) |
| `frontend/src/pages/` altı | `api.mentor` veya `/mentor/chat` referansı yok |

- **Kaynak:** `frontend/src/pages/MentorPage.jsx:108,128,146,170,182,275,290,295,319`

**Sonuç:** Audit'in "api.mentor client methods defined but unused by pages" tespiti doğrudur.

---

## 5. `package.json` `main` alanı gerçek başlangıç dosyasıyla uyumlu mu?

**Kesinlik:** DOĞRULANDI — Uyumsuz ✅

| Alan | Değer | Dosya |
|------|-------|-------|
| `package.json:5` `"main"` | `dist/index.js` | `src/index.ts` → `build()` ve `start()` fonksiyonlarını export eder, kendi başına çalışmaz |
| `package.json:9` `"start"` | `node --env-file=.env dist/server.js` | `src/server.ts` → `import { start } from './index'; start()` |
| `docker-entrypoint.sh` | `dist/server.js` kullanır | Doğru |

- **Kaynak:** `src/server.ts:1-6` (6 satır, sadece `start()` çağırır)
- **Kaynak:** `src/index.ts:1-170` (modül olarak kullanılmak üzere tasarlanmış)

**Sonuç:** Audit'in "main points to dist/index.js but start runs dist/server.js; Docker correctly uses dist/server.js" tespiti doğrudur. `main` alanı `dist/server.js` olmalı veya kaldırılmalıdır.

---

## 6. KO liste sorguları `embedding` alanını gereksiz çekiyor mu?

**Kesinlik:** DOĞRULANDI ✅

| Endpoint | Satır | Sorgu | `select` var mı? |
|----------|-------|-------|-------------------|
| Public list `/api/v2/knowledge-objects` | `knowledge-v2.ts:190` | `findMany({ include: { category: true } })` | ❌ Yok — tüm alanlar + embedding |
| Admin list `/api/v2/admin/knowledge-objects` | `knowledge-v2.ts:764` | `findMany({ include: { category: true } })` | ❌ Yok — tüm alanlar + embedding |
| Topic listing `/api/v2/knowledge-topics` | `knowledge-v2.ts:291` | `findMany({ include: { category: true, sources: { include: { source: true } } } })` | ❌ Yok — tüm alanlar + embedding |

- **Not:** `embedding` JSON string'leri boyut olarak büyüktür (~4KB+). Liste sorgularında gereksiz yere taşınır.
- **Karşılaştırma:** Import akışı (`import.ts:294`) `select: { code: true, slug: true }` kullanarak embedding'i hariç tutar — bu doğru desendir.

**Sonuç:** Audit'in "Embedding storage bloat row reads for list endpoints unless select clauses omit embedding" tespiti doğrudur.

---

## 7. & 8. KO sayıları (salt-okunur sorgu)

**Toplam Knowledge Object:** 860

| Statü | Adet |
|-------|------|
| `published` | 245 |
| `in_review` | 600 |
| `draft` | 15 |
| `approved` | 0 |
| `archived` | 0 |
| `isDemo = true` | 0 |

- **Sorgu yöntemi:** Prisma Client ile salt-okunur `count()` ve `groupBy()`.
- **Veritabanına yazma yapılmadı.**
- **Migration çalıştırılmadı.**

---

## Özet

| # | Başlık | Durum |
|---|--------|-------|
| 1 | Vite proxy `/community` eksik | ✅ DOĞRULANDI |
| 2 | Frontend `/api` production sorunu | ⚠️ KISMEN (conversation kırılır, v2 KO çalışır) |
| 3 | `new PrismaClient()` sayısı | ✅ DOĞRULANDI (32 `src/services/` dosyası) |
| 4 | Legacy `/mentor/chat` kullanımı | ✅ DOĞRULANDI (dead code) |
| 5 | `package.json` `main` uyumsuzluğu | ✅ DOĞRULANDI |
| 6 | KO list'te `embedding` gereksiz çekimi | ✅ DOĞRULANDI |
| 7 | Toplam KO sayısı | ✅ 860 |
| 8 | KO statü dağılımı | ✅ published: 245, in_review: 600, draft: 15, archived: 0, isDemo: 0 |

---

*Salt-okunur doğrulama. Hiçbir kaynak dosya değiştirilmedi, veritabanına yazılmadı.*
