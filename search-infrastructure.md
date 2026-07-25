# Arama Altyapısı

## Genel Bakış

LocalAkademi'de arama altyapısı, öğrencilerin bilgi tabanında hızlı ve akurat bir şekilde arama yapabilmesini sağlar. Semantic search ve keyword-based search olmak üzere iki katmanlı bir yapı kullanılır.

## Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Arama Katmanları                      │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Semantic Search (Vektor Araması)              │
│  └── Anlamsal benzerlik araması                        │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Keyword Search (Anahtar Kelime)              │
│  └── Tam metin araması                                  │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Hybrid (Hibrit)                              │
│  └── Her iki yöntemin birleşimi                        │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│                 Bilgi Kaynakları                         │
├─────────────────────────────────────────────────────────┤
│  • Knowledge Objects (Prisma/SQLite)                    │
│  • Course Content (Ders içerikleri)                    │
│  • Mentor Chat History (Sohbet geçmişi)                 │
└─────────────────────────────────────────────────────────┘
```

## Semantic Search

### Çalışma Prensibi

1. **Embedding Oluşturma:** Metin, vektör temsiline dönüştürülür
2. **İndeksleme:** Vektörler vektör veritabanında indekslenir
3. **Sorgulama:** Kullanıcı sorgusu embedding'e çevrilir
4. **Benzerlik Hesaplama:** Cosine similarity ile en yakın sonuçlar bulunur

### Teknoloji Stack

| Bileşen | Teknoloji | Açıklama |
|---------|-----------|----------|
| Embedding Model | NVIDIA Mistral/CLIP | Metin → Vektör dönüşümü |
| Vector Store | SQLite + json (dev) | Vektör depolama |
| Production | pgvector/Pinecone | Ölçeklenebilir vektör DB |

### Embedding Akışı

```
Knowledge Object İçeriği
        ↓
   Text Preprocessing
   (temizleme, tokenize)
        ↓
   Embedding Model (Mistral)
        ↓
   Vector Representation
   [0.123, -0.456, 0.789, ...]
        ↓
   Vector Store'a Kaydet
```

## Mevcut Durum

**Şu An:** Planlama aşamasında

**Mevcut Veritabanı:** SQLite (Prisma)
- `User` modeli mevcut
- `KnowledgeObject` modeli planlandı ama oluşturulmadı

**Planlanan Yapı:**

```typescript
// KnowledgeObject schema (planlanan)
model KnowledgeObject {
  id        Int     @id @default(autoincrement())
  type      String  // concept, fact, procedure, principle
  title     String
  content   String
  embedding String  // JSON array of floats
  metadata  String  // JSON metadata
}
```

## Keyword Search

Tam metin araması için SQLite FTS5 (Full-Text Search) kullanılacak:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Virtual table for FTS
model KnowledgeObjectFTS {
  id      Int
  title   String
  content String
}
```

## Hibrit Arama Stratejisi

```typescript
async function hybridSearch(query: string, topK: number = 10) {
  // 1. Semantic search results
  const semanticResults = await vectorStore.search(
    await embedQuery(query),
    { topK: topK * 2 }
  )

  // 2. Keyword search results
  const keywordResults = await db.knowledgeObjectFTS.search(query)

  // 3. Reranking - sonuçları birleştir ve sırala
  const combined = rerank(semanticResults, keywordResults)

  return combined.slice(0, topK)
}
```

## Relevans Hesaplama

```
Relevance Score = (semantic_weight × semantic_score) +
                  (keyword_weight × keyword_score) +
                  (popularity_weight × usage_count_normalized)
```

Varsayılan ağırlıklar:
- Semantic: 0.5
- Keyword: 0.3
- Popularity: 0.2

## Arama Endpoint'i (Planlanan)

```typescript
// GET /knowledge/search?q=recursion&type=concept&limit=10
interface SearchRequest {
  q: string           // Arama sorgusu
  type?: string       // Filtre: concept, fact, procedure, principle
  limit?: number      // Sonuç sayısı (default: 10)
  offset?: number     // Sayfalama
}

interface SearchResponse {
  results: KnowledgeObject[]
  total: number
  query: string
  processingTime: number // ms
}
```

## Önbellekleme (Caching)

Sık aranan sorgular için Redis/Cache:

```
Arama Sorgusu
      ↓
  Cache Control
      ↓
┌───────────────┐
│ Cache Hit?    │
│   ↓ Evet      │
│   Cache'den   │
│   dön         │
│   ↓ Hayır     │
│   DB'ye git   │
│   ve cache'a  │
│   kaydet      │
└───────────────┘
```

## Gelecek Geliştirmeler

- [ ] Vector index için pgvector entegrasyonu
- [ ] NVIDIA API ile embedding generation
- [ ] FTS5 full-text search
- [ ] Elasticsearch/OpenSearch entegrasyonu
- [ ] Arama analitiği (hangi sorgular yapılıyor)
- [ ] Autocomplete/suggestions