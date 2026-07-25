# API Endpoints

## Mevcut Endpoints

### Auth Routes (`/auth`)

#### POST /auth/register
Yeni kullanıcı kaydı oluşturur.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Ahmet Yılmaz"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmet Yılmaz",
    "role": "student"
  }
}
```

**Hatalar:**
- `400`: Email zaten kullanımda

---

#### POST /auth/login
Kullanıcı girişi yapar.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmet Yılmaz",
    "role": "student"
  }
}
```

**Hatalar:**
- `401`: Geçersiz kimlik bilgileri

---

#### GET /auth/me
Token ile kullanıcı bilgilerini getirir.

**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Ahmet Yılmaz",
  "role": "student"
}
```

**Hatalar:**
- `401`: Geçersiz veya süresi dolmuş token
- `404`: Kullanıcı bulunamadı

---

### Admin gözlem (`/admin`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/admin/ai-reviewer/metrics` | Runtime + içerik saklamayan kalıcı AI Reviewer shadow pilot metrikleri | ✅ (admin) |
| GET | `/admin/ai-reviewer/health` | Yerel Ollama model erişimi ve bounded reviewer kuyruk durumu | ✅ (admin) |

---

## Planlanan Endpoints

### Courses (`/courses`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/courses` | Tüm kursları listele | ❌ |
| GET | `/courses/:id` | Kurs detayı | ❌ |
| POST | `/courses` | Yeni kurs oluştur | ✅ (admin) |
| PUT | `/courses/:id` | Kurs güncelle | ✅ (admin) |
| DELETE | `/courses/:id` | Kurs sil | ✅ (admin) |

### Lessons (`/lessons`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/lessons/:id` | Ders detayı | ❌ |
| POST | `/courses/:id/lessons` | Ders ekle | ✅ (admin) |
| PUT | `/lessons/:id` | Ders güncelle | ✅ (admin) |

### Enrollments (`/enrollments`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/enrollments/my` | Benim kayıtlarım | ✅ |
| POST | `/enrollments` | Kursa kayıt ol | ✅ |
| PUT | `/enrollments/:id/progress` | İlerleme güncelle | ✅ |

### AI Mentor (`/mentor`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/mentor/chat` | Mentor ile sohbet (NVIDIA/OpenAI/DeepSeek + KO retrieval) | ✅ |
| GET | `/mentor/history` | Oturum geçmişi (messages + citations ile) | ✅ |
| DELETE | `/mentor/history` | Geçmiş temizleme (tek veya tümü) | ✅ |

**POST `/mentor/chat` — Request:**
```json
{
  "message": "İş danışmanlığı almak istiyorum",
  "sessionId": "uuid-v4 (opsiyonel, yoksa yeni oturum)",
  "code": "KO-123 (opsiyonel)"
}
```

**Response (200):**
```json
{
  "sessionId": "uuid-v4",
  "reply": "AI mentor yanıtı...",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150
  },
  "citations": [
    {
      "id": 1,
      "title": "Şirket Kurulum Rehberi",
      "code": "KO-SIRKET",
      "category": { "name": "Girişimcilik" }
    }
  ]
}
```

**Not:** Mentor her mesajda otomatik olarak ilgili Knowledge Object'leri (KO) lexical retrieval ile bulur.
Retrieval akışı: mesaj → normalizasyon (Türkçe NFKC, stop-word) → multi-token OR query → skorlama
(code +100, title phrase +40, title token +12, category +6, content token +3, authority bonus) →
en yüksek 3 KO → güvenlik çerçevesi ile prompt'a ekle → AI yanıtı + citation dönüşü.

**GET `/mentor/history` — Response:**
```json
{
  "sessions": [
    {
      "sessionId": "uuid-v4",
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ],
      "createdAt": "2026-07-23T...",
      "updatedAt": "2026-07-23T..."
    }
  ]
}
```

### Knowledge (`/knowledge`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/knowledge/search` | Keyword arama (lexical contains) | ❌ |
| GET | `/knowledge/:id` | Bilgi nesnesi detayı | ❌ |
| POST | `/knowledge` | Bilgi nesnesi oluştur | ✅ (admin) |
| GET | `/knowledge/related/:id` | İlgili bilgi nesneleri | ❌ |

### Retrieval Katmanı (Internal)

Mentor `/mentor/chat` endpoint'inde kullanılan lexical retrieval sistemi:

| Bileşen | Dosya | Görevi |
|---------|-------|--------|
| Normalizer | `src/services/retrieval/query-normalizer.ts` | NFKC, Türkçe locale (İ→i, I→ı), stop-word, tokenizasyon, max 500 karakter / 20 token |
| Retriever | `src/services/retrieval/lexical-knowledge-retriever.ts` | Multi-token OR, 200 aday, skorlama, deterministik tie-break, top-3 |
| Formatter | `src/services/retrieval/knowledge-context-formatter.ts` | Güvenlik çerçevesi, max 3 KO, 1800c/KO, 6000c toplam, source metadata |
| Types | `src/services/retrieval/types.ts` | KnowledgeObjectResult, SourceRef, NormalizedRetrievalQuery, Retriever |

### Learning Path (`/learning-path`)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/learning-path/current` | Mevcut öğrenme yolu | ✅ |
| POST | `/learning-path/generate` | Yeni yol oluştur | ✅ |
| PUT | `/learning-path/:id` | Yol güncelle | ✅ |

## Error Format

Tüm hatalar standart formatta döner:

```json
{
  "error": "Hata mesajı",
  "statusCode": 400
}
```

## Rate Limiting

Global rate limit: 100 istek/dakika (opsiyonel). Endpoint bazında:
- Auth register: 5 istek/saat
- Auth login: 10 istek/dakika
- Mentor chat: 30 istek/dakika
- Topluluk paylaşımı: 5 istek/saat
- Resmî güncelleme taslağı: 20 istek/saat
- Yerel AI resmî özet taslağı: 10 istek/saat

### AI Reviewer Pilot

| Method | Endpoint | Açıklama | Auth |
|---|---|---|---|
| GET | `/admin/ai-reviewer/metrics` | Runtime ve içeriksiz kalıcı pilot metrikleri | Admin |
| GET | `/admin/ai-reviewer/health` | Ollama/model ve kuyruk sağlığı | Admin |

`npm run reviewer:pilot:status` otomatik makine kapılarını raporlar. İçeriksiz
telemetri insan kalite kontrolünü veya kritik kaçırma denetimini kanıtlayamadığı
için rollout hiçbir zaman otomatik onaylanmaz.

### AI Quiz Taslak Üretimi

| Method | Endpoint | Açıklama | Auth |
|---|---|---|---|
| POST | `/admin/quiz-generator/:koId/draft` | Yerel AI ile incelenmemiş quiz taslağı oluşturur | Admin |
| POST | `/admin/quiz-generator/:quizId/publish` | Admin tarafından incelenen taslağı yayınlar | Admin |

Üretim `AI_QUIZ_GENERATOR_ENABLED=true` olmadan çalışmaz. Taslak quizler normal
`GET /quizzes/:koId` ve attempt akışından tamamen filtrelenir.

### Güncellemeler ve Paylaşım

| Method | Endpoint | Açıklama | Auth |
|---|---|---|---|
| GET | `/community` | Yalnız yayımlanmış resmî/topluluk gönderileri | Kullanıcı |
| POST | `/community/posts` | Kullanıcı paylaşımını moderasyona gönderir | Kullanıcı |
| POST | `/community/official` | Kaynak bağlantılı resmî güncelleme taslağı | Admin |
| POST | `/community/official/ai-draft` | Kaynak metninden yerel AI özeti; kaynak metni saklanmaz | Admin |
| GET | `/community/moderation` | Taslak ve bekleyen paylaşımlar | Admin |
| POST | `/community/:postId/moderate` | Yayınla veya neden belirterek reddet | Admin |
| POST | `/community/:postId/reports` | Yayımlanmış gönderiyi raporlar; kullanıcı/gönderi başına tek kayıt | Kullanıcı |
| GET | `/community/reports` | Açık kullanıcı raporları | Admin |
| POST | `/community/reports/:reportId/resolve` | Raporu kapatır veya gönderiyi gizler | Admin |

Topluluk içeriği doğrudan yayınlanmaz. Resmî gönderilerde HTTP(S) kaynak
bağlantısı zorunludur. AI özet endpoint'i
`AI_OFFICIAL_SUMMARIZER_ENABLED=true` olmadan çalışmaz ve yalnız taslak üretir.

### Reviewer İnsan Denetimi ve Yerel AI Kuyruğu

| Method | Endpoint | Açıklama | Auth |
|---|---|---|---|
| GET | `/admin/ai-reviewer/human-audits` | İçerik saklamayan etiket özeti ve bekleyen telemetri | Admin |
| POST | `/admin/ai-reviewer/human-audits` | Canlı incelenmiş örneğe doğruluk/kritik kaçırma etiketi | Admin |
| GET | `/admin/local-ai/queue` | Quiz ve resmî özet kuyruğu durumu | Admin |

İnsan denetimi ham kullanıcı/model içeriğini saklamaz. `disclaimer_only`;
shadow metrikleri, en az 20 gerçek insan etiketi, sıfır kritik kaçırma ve açık
onay olmadan hazır sayılmaz.
