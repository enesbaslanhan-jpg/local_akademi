# LocalAkademi

AI destekli kişiselleştirilmiş eğitim platformu. Öğrencilere özel mentor sistemi ile interaktif öğrenme deneyimi sunar.

## Teknoloji Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Fastify 5.x
- **Language:** TypeScript 5.x
- **Database:** SQLite (Prisma ORM)
- **Authentication:** JWT (@fastify/jwt)
- **Validation:** Zod
- **Password Hashing:** bcryptjs

### Frontend
- **Framework:** React 19 + Vite 6
- **UI Components:** Lucide React, React Markdown

### Altyapı
- **Container:** Docker & Docker Compose
- **Process Manager:** tsx (development)

## Kurulum

### Gereksinimler
- Node.js 20+
- npm veya pnpm
- Docker & Docker Compose (opsiyonel)

### Yerel Geliştirme

```bash
# 1. Projeyi klonlayın
git clone <repo-url>
cd LocalAkademi

# 2. Backend bağımlılıklarını yükleyin
npm install

# 3. Frontend bağımlılıklarını yükleyin
cd frontend && npm install && cd ..

# 4. .env dosyasını oluşturun
cp .env.example .env

# 5. Veritabanını oluşturun
npm run db:push

# 6. Prisma Client'ı generate edin
npm run db:generate

# 7. Geliştirme sunucusunu başlatın
npm run dev
```

### Docker ile Çalıştırma

```bash
# Tüm servisleri başlatın
docker-compose up -d

# Logları takip edin
docker-compose logs -f
```

## Test

```bash
# Tüm testleri çalıştır
npm test

# Testleri watch modunda çalıştır
npm run test:watch

# E2E testleri
npm run test:e2e
```

## API Endpoints

### Auth (`/auth`)
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/auth/register` | Yeni kullanıcı kaydı | ❌ |
| POST | `/auth/login` | Giriş | ❌ |
| GET | `/auth/me` | Token doğrulama | ✅ |

### AI Mentor (`/mentor`) — *yerel Ollama veya yapılandırılmış bulut sağlayıcısıyla çalışır ve KO retrieval ile zenginleştirilir*
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | `/mentor/chat` | Mentor ile sohbet (Ollama/NVIDIA/OpenAI/DeepSeek) + KO retrieval | ✅ |
| GET | `/mentor/history` | Oturum geçmişi | ✅ |
| DELETE | `/mentor/history` | Geçmiş temizleme | ✅ |

> **Not:** Yerel kurulumda `AI_PROVIDER=ollama` önerilir. Gateway yalnızca
> `127.0.0.1`, `localhost` veya `::1` Ollama adreslerini kabul eder ve API
> anahtarı göndermez. Her sohbet mesajında ilgili Knowledge Object'ler bağlama
> eklenir ve bulunan KO'lar citation olarak döndürülür.

### AI Reviewer (Aşama 2 — shadow entegrasyonu)

`src/services/ai-reviewer/` altında katı JSON sözleşmesi, kanıt sınırlandırma,
zaman aşımı/iptal, ayrı provider transport'u ve shadow/enforce karar politikası
bulunur. Özellik varsayılan olarak kapalıdır. `AI_REVIEWER_ENABLED=true` olduğunda
AI Gateway, deterministic Review Gate'ten geçen normal ve streaming taslaklarını
ayrı reviewer transport'u ile arka planda değerlendirir. Reviewer kararı yalnız
içeriksiz güvenlik telemetrisi olarak kaydedilir; kullanıcı yanıtını değiştirmez
ve yanıtı geciktirmez. Aşama 2'de `AI_REVIEWER_MODE=enforce` istense bile gateway
gözlem modunda kalır. Enforcement ayrı güvenlik ve rollout aşamasında açılacaktır.
Pilot örneklemesi `AI_REVIEWER_SAMPLE_RATE` ile belirlenir (varsayılan `0.10`).
Metrikler ham soru/yanıt saklamaz. Runtime aggregate'ı yanında varsayılan 30
gün tutulan içeriksiz SQLite telemetrisi bulunur. Yalnız admin rolüne açık
`GET /admin/ai-reviewer/metrics` endpoint'inden okunur. Yerel model ve bounded
kuyruk durumu `GET /admin/ai-reviewer/health` endpoint'inden görülebilir.
Bellek içi oldukları için uygulama yeniden başladığında sıfırlanırlar.

50 vakalık Türkçe çevrimdışı gold set ve kabul kapıları için
[AI Reviewer Shadow Pilot](docs/ai-reviewer-pilot.md) belgesine bakın.
Fixture doğrulaması ağ veya provider çağrısı yapmadan
`npm run reviewer:eval:validate` ile çalıştırılır.

### Bilgi Erişim (Retrieval)

| Bileşen | Açıklama |
|---------|----------|
| `query-normalizer.ts` | NFKC normalizasyon, Türkçe locale (İ→i, I→ı vb.), stop-word filtreleme, tokenizasyon, max 500 karakter / 20 token limit |
| `lexical-knowledge-retriever.ts` | Multi-token OR sorgusu, 200 aday limiti, ağırlıklı skorlama (code eşleşmesi +100, title phrase +40, title token +12, category +6, content token +3, authority bonus +2 vb.), deterministik tie-break |
| `knowledge-context-formatter.ts` | Maksimum 3 KO, 1800 karakter/KO, 6000 toplam karakter, güvenlik çerçevesi, kaynak bilgisi |
| `Citation` | AI yanıtıyla birlikte dönen referans KO'lar (id, title, code, category) |

Retrieval akışı:
1. Kullanıcı mesajı → `normalizeQuery` ile tokenize edilir
2. Token'lar OR condition ile `knowledgeObject.findMany`'e gönderilir (sadece published, isDemo=false)
3. 200 aday içinde skorlama yapılır, en yüksek 3 sonuç seçilir
4. `formatKnowledgeContext` ile AI prompt'una güvenlik çerçevesi içinde eklenir
5. AI yanıtıyla birlikte citation'lar (KO referansları) dönülür

**Hit@3 değerlendirme:** 12 KO'luk Türkçe ticari külliyat üzerinde 14 test senaryosu → **%100 Hit@3, ortalama sıra 1.00**

### Quiz (`/quizzes`)
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/quizzes/:koId` | Quiz soruları (cevapsız) | ✅ |
| POST | `/quizzes/:koId/attempts` | Quiz cevaplama ve değerlendirme | ✅ |
| GET | `/quizzes/history` | Kullanıcının quiz geçmişi | ✅ |

### Admin (`/admin`)
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | `/admin/stats` | İstatistikler | ✅ (admin) |
| GET | `/admin/ai-reviewer/metrics` | İçerik tutmayan shadow pilot metrikleri | ✅ (admin) |
| GET | `/admin/ai-reviewer/health` | Ollama model ve reviewer kuyruk sağlığı | ✅ (admin) |
| GET | `/admin/users` | Kullanıcı listesi | ✅ (admin) |
| PATCH | `/admin/users/:userId/role` | Rol değiştir | ✅ (admin) |

Detaylı endpoint listesi için: [endpoints.md](endpoints.md)

## Veritabanı Şeması

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  role      String   @default("student")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Detaylı şema için: [docs/database-schema.md](docs/database-schema.md)

## Proje Yapısı

```
LocalAkademi/
├── src/
│   ├── index.ts               # Ana sunucu (build, route registration)
│   ├── server.ts              # Giriş noktası
│   ├── services/
│   │   ├── auth.ts            # JWT kimlik doğrulama
│   │   ├── mentor.ts          # AI Mentor (DI ile AiChatProvider)
│   │   ├── ai-gateway.ts      # AI gateway (Ollama/NVIDIA/OpenAI/DeepSeek + Citation)
│   │   ├── ai-chat-provider.ts # AiChatProvider interface + mock
│   │   ├── ai-provider.ts     # Provider yardımcıları (Citation mapping)
│   │   ├── conversation.ts    # Sohbet yönetimi (4 flow + citation wiring)
│   │   ├── ai-reviewer/       # Reviewer sözleşmesi, provider, timeout ve karar politikası
│   │   ├── quizzes.ts         # Quiz endpoint'leri
│   │   ├── admin.ts           # Admin paneli
│   │   ├── retrieval/         # *** Knowledge Retrieval Layer ***
│   │   │   ├── index.ts
│   │   │   ├── types.ts       # KnowledgeObjectResult, SourceRef, NormalizedRetrievalQuery
│   │   │   ├── query-normalizer.ts   # NFKC, Türkçe locale, stop-words, limits
│   │   │   ├── lexical-knowledge-retriever.ts  # Multi-token OR, scoring, tie-break
│   │   │   └── knowledge-context-formatter.ts  # Hard limits, security framing
│   │   └── ...
├── frontend/                  # React 19 + Vite frontend
│   ├── src/
│   └── package.json
├── prisma/
│   ├── schema.prisma          # Veritabanı şeması (SQLite) — KnowledgeObject, Source, KnowledgeObjectSource
│   └── migrations/            # Migration geçmişi
├── tests/                     # Vitest testleri (30 dosya, 667 test)
│   ├── retrieval-query-normalizer.test.ts
│   ├── retrieval-knowledge-retriever.test.ts
│   ├── retrieval-hit-at-3.test.ts  # Hit@3 değerlendirme
│   ├── fixtures/
│   │   ├── knowledge-cards.ts       # Test yardımcıları
│   │   └── retrieval-eval.tr.json    # Corpus + test senaryoları
│   ├── quizzes.test.ts
│   ├── stabilization.test.ts  # Stabilizasyon testleri
│   ├── e2e/                   # E2E testleri
├── dist/                      # Derlenmiş backend
├── scripts/                   # Veri yönetim scriptleri
├── docker-compose.yml
└── Dockerfile
```

> **Arama Altyapısı:** Mevcut arama (`/knowledge/search`) keyword-based `contains` sorgusudur. **Lexical retrieval layer** eklenmiştir: Türkçe normalizasyon, multi-token OR, ağırlıklı skorlama, authority bonusu, deterministik tie-break, Hit@3 %100. Semantic search (embedding + vector) henüz uygulanmamıştır.

## Ortam Değişkenleri

`.env.example` dosyasına bakınız.

## Geliştirme

```bash
# Build
npm run build

# Start (production)
npm start

# Veritabanı reset
npm run db:push

# Seed data
npm run db:seed
```

## Gelişmiş yerel özellikler

- Mentor retrieval katmanı lexical veya hybrid çalışabilir. Hybrid mod, yerel
  Ollama embedding sonuçlarını lexical sonuçlarla reciprocal-rank fusion
  kullanarak birleştirir ve embedding hatasında lexical aramaya geri döner.
- `npm run reviewer:pilot:status`, 200 örnek/availability/p95 kapılarını
  raporlar; insan denetimini otomatik geçmiş saymaz.
- `AI_REVIEWER_MODE=disclaimer_only` yalnız
  `AI_REVIEWER_DISCLAIMER_ROLLOUT_APPROVED=true` ile etkinleşir. Pilot ayarı
  hâlâ `shadow` modundadır.
- `npm run rag:embeddings:index` varsayılan olarak dry-run çalışır; `-- --apply`
  ile yalnız yayımlanmış ve demo olmayan KO'ları yerel olarak indeksler.
- AI quiz üretimi admin-only ve draft-only'dir. Admin yayınlamadan öğrenci
  endpoint'lerinde görünmez.
- `/community`, kaynak bağlantılı resmî özetler ve moderasyon sonrası kullanıcı
  paylaşımları için gezinilebilir alandır.
- Yerel resmî güncelleme özetleyicisi kaynak metni saklamaz ve yalnız
  moderasyon bekleyen taslak üretir.
- `npm run rag:eval:hybrid`, 50 Türkçe gerçek-korpus sorusunda lexical/hybrid
  Hit@3 ve tam kod Hit@1 kalite kapısını çalıştırır.
- Yeni yayımlanan bilgi nesneleri, `RAG_AUTO_EMBEDDING_ENABLED=true` iken
  sınırlı arka plan kuyruğunda otomatik indekslenir.
- Quiz ve resmî özet üretimi ortak `LOCAL_AI_QUEUE_*` sınırlarını kullanır.
- `npm run backup:database` bütünlüğü doğrulanmış SQLite kopyası üretir;
  `npm run logs:rotate -- --apply` yalnız operasyon loglarını sınırlar.
- `npm run beta:acceptance`, güvenli kapalı rollout'ları bozmadan kapalı beta
  kabul raporunu `outputs/beta-acceptance.json` dosyasına yazar.

Ayrıntılı durum: [Gelişmiş Yol Haritası](docs/advanced-roadmap-implementation.md)

## Lisans

MIT
