# AI Mentor Çalışma Akışı

## Genel Bakış

LocalAkademi'de AI Mentor, öğrenciye kişiselleştirilmiş rehberlik sağlayan yapay zeka destekli bir asistan sistemidir. NVIDIA API üzerinden Mistral modeli kullanılarak çalışır.

## Sistem Mimarisi

```
Öğrenci → Client → API Server → NVIDIA API (Mistral)
                              ↓
                        Context Builder
                              ↓
                        Knowledge Base
```

## Çalışma Akışı Adımları

### 1. Oturum Başlatma

Öğrenci sohbete başladığında:

1. **Session Oluşturma:** Benzersiz oturum ID'si oluşturulur
2. **Context Yükleme:** Öğrencinin profili, ilerleme durumu ve hedefleri yüklenir
3. **Vector Store Hazırlığı:** Semantic search için knowledge base hazırlanır

### 2. Mesaj İşleme

```
Öğrenci Mesajı
      ↓
  Intent Analysis (Amaç Tespiti)
      ↓
  ┌─────────────────────────────────┐
  │ 1. Soru Soru (Question)          │
  │ 2. Açıklama İste (Explanation)    │
  │ 3. Egzersiz Yardımı (Exercise)   │
  │ 4. Geri Bildirim (Feedback)      │
  └─────────────────────────────────┘
      ↓
  Knowledge Retrieval (Bilgi Çekme)
      ↓
  Context Assembly (Bağlam Oluşturma)
      ↓
  NVIDIA API Call (Mistral)
      ↓
  Response Formatting (Yanıt Formatlama)
      ↓
  Öğrenciye Yanıt
```

### 3. Intent Tespiti (Amaç Analizi)

Mesaj türü tespit edilir:

| Intent | Açıklama | Örnek |
|--------|----------|-------|
| `question` | Bilgi sorusu | "Recursion nedir?" |
| `explanation` | Açıklama isteme | "Bunu daha detaylı açıklar mısın?" |
| `exercise` | Egzersiz/ödev yardımı | "Bu problemi çözmeme yardım et" |
| `feedback` | Geri bildirim isteme | "Kodumu incele" |
| `recommendation` | Öneri isteme | "Ne öğrenmeliyim?" |

### 4. Bilgi Çekme (Knowledge Retrieval)

Semantic search ile ilgili knowledge object'ler çekilir:

```typescript
// Semantic search örneği
const relatedKnowledge = await vectorStore.search(
  queryEmbedding,
  { topK: 5, threshold: 0.7 }
)
```

Çekilen bilgiler:
- İlgili kavramlar (concepts)
- Prosedürler (procedures)
- Gerçekler (facts)
- Önceki ders içerikleri

### 5. Context Assembly (Bağlam Oluşturma)

Mistral API'ye gönderilecek prompt oluşturulur:

```
<system>
Sen LocalAkademi AI Mentor'usun. Öğrenciye yardımsever, sabırlı ve motivasyon verici ol.
Kullanıcı: {öğrenci_adı}
Seviye: {öğrenci_seviyesi}
Hedef: {öğrenci_hedefi}
</system>

<context>
İlgili Bilgiler:
{knowledge_objects}

Önceki Konuşma:
{chat_history}
</context>

<question>
{öğrenci_sorusu}
</question>
```

### 6. NVIDIA API Entegrasyonu

Mistral modeli çağrısı:

```typescript
const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistralai/mistral-7b-instruct-v0.3',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 1024
  })
})
```

### 7. Yanıt Formatlama

Gelen yanıt işlenir:
- Markdown formatına çevrilir
- Kod blokları vurgulanır
- İlgili kaynaklar eklenir
- Takip soruları önerilir

### 8. Session Güncelleme

Sohbet geçmişi saklanır:

```typescript
await prisma.mentorSession.update({
  where: { sessionId },
  data: {
    context: JSON.stringify([
      ...previousMessages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response }
    ])
  }
})
```

## Öğrenci Seviyesi Algoritması

```
Başlangıç Seviyesi: beginner
      ↓
İlerleme Kontrolü
      ↓
┌─────────────────────────────────────┐
│ Başarı Oranı ≥ 80% → Seviye + 1     │
│ Başarı Oranı ≥ 60% → Aynı Seviye    │
│ Başarı Oranı < 60% → Seviye - 1     │
└─────────────────────────────────────┘
```

## Geri Bildirim Döngüsü

```
Öğrenci Yanıt Aldı
      ↓
┌──────────────────────────┐
│ Doğru cevap?             │
│   ↓ Evet                 │
│   Başarı +1              │
│   → Bir sonraki seviye   │
│                          │
│   ↓ Hayır                │
│   Geri bildirim ver      │
│   → Aynı seviyede kal    │
└──────────────────────────┘
```

## Hata Yönetimi

| Senaryo | Davranış |
|---------|----------|
| API timeout | "Şu anda bağlantı sorunu var, tekrar dene" |
| Rate limit | "Biraz bekle, sonra tekrar sor" |
| Geçersiz yanıt | Konuyu basitleştirerek yeniden dene |
| Bilgi bulunamadı | "Bu konuda kaynak yok, farklı bir şekilde açıklayayım" |

## Mevcut Durum

**Durum:** Planlama aşamasında (henüz implement edilmedi)

**Gerekli Geliştirmeler:**
- [ ] `/mentor/chat` endpoint'i
- [ ] NVIDIA API entegrasyonu
- [ ] Context builder servisi
- [ ] Session management
- [ ] Knowledge retrieval sistemi
- [ ] Prompt templates