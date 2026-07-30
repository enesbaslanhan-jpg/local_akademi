# AI Mentor Çalışma Akışı

## Genel Bakış

LocalAkademi'de AI Mentor, öğrenciye kişiselleştirilmiş rehberlik sağlayan yapay zeka destekli asistan sistemidir. Üretimde birincil API'si `/mentor/conversations` altındaki **Conversation API**'dir. Eski `/mentor/chat` ve `/mentor/history` endpoint'leri **kullanımdan kaldırılmıştır (deprecated)**.

## Sistem Mimarisi

```
Öğrenci → Client → /mentor/conversations API → AI Gateway → AI Provider
                              ↓
                    Context Builder (KO retrieval, workspace context, memory)
                              ↓
                    Knowledge Base + Business Workspace + User Memory
```

## Endpoint'ler

### Birincil Conversation API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/mentor/conversations` | Yeni konuşma oluştur |
| GET | `/mentor/conversations` | Konuşma listesi (`archived=true/false`) |
| GET | `/mentor/conversations/:id` | Konuşma ve mesajları |
| POST | `/mentor/conversations/:id/messages` | Mesaj gönder, asistan yanıtı al |
| POST | `/mentor/conversations/:id/messages/stream` | SSE stream yanıtı |
| POST | `/mentor/conversations/:id/messages/:messageId/regenerate` | Seçili mesajı yeniden üret |
| POST | `/mentor/conversations/:id/messages/:messageId/edit-regenerate` | Mesajı düzenle ve yeniden üret |
| PATCH | `/mentor/conversations/:id/archive` | Konuşmayı arşivle |
| PATCH | `/mentor/conversations/:id/unarchive` | Konuşmayı arşivden çıkar |
| DELETE | `/mentor/conversations/:id` | Konuşmayı sil (soft delete) |

### Kullanımdan Kaldırılmış Legacy Endpoints

| Method | Endpoint | Durum |
|--------|----------|-------|
| POST | `/mentor/chat` | ⚠️ Deprecated |
| GET | `/mentor/history` | ⚠️ Deprecated |
| DELETE | `/mentor/history` | ⚠️ Deprecated |

Eski endpoint'ler mevcut istemcileri kırmamak için çalışmaya devam eder, ancak her yanıtta şu başlıkları döner:

- `Deprecation: true`
- `Warning: 299 - "Deprecated API: use /mentor/conversations instead"`
- `Link: </mentor/conversations>; rel="successor-version"`

Yeni geliştirmelerde `/mentor/conversations` API'si kullanılmalıdır.

## Çalışma Akışı

### 1. Oturum Başlatma

Öğrenci sohbete başladığında:

1. **Konuşma Oluşturma:** `POST /mentor/conversations` ile başlık oluşturulur.
2. **İlk Mesaj:** Aynı endpoint veya `POST /mentor/conversations/:id/messages` ile gönderilir.
3. **Context Yükleme:** Kullanıcı rolü, aktif işletme profili, hafıza özeti ve knowledge context otomatik eklenir.

### 2. Mesaj İşleme

```
Öğrenci Mesajı
      ↓
  POST /mentor/conversations/:id/messages
      ↓
  Knowledge Retrieval (Bilgi Çekme)
      ↓
  Context Assembly (System prompt + chat history + KO context + workspace context + memory)
      ↓
  AI Gateway → Provider (Ollama/NVIDIA/OpenAI/DeepSeek)
      ↓
  Response Formatting (Markdown, citation badges)
      ↓
  Background Memory Extraction + Summary Update
      ↓
  Öğrenciye Yanıt
```

Stream modunda yanıt `POST /mentor/conversations/:id/messages/stream` üzerinden SSE olarak akar.

### 3. Bilgi Çekme (Knowledge Retrieval)

Lexical retrieval katmanı:

- Sorgu Türkçe normalizasyon ve stop-word filtrelemeden geçer.
- `published` ve `isDemo: false` KO'ler içinde skorlama yapılır.
- En yüksek 3 KO bağlama eklenir.
- Bulunan KO'ler yanıtla birlikte `citations` olarak döner ve tıklanabilir badge'lerle sunulur.

Seçili KO modu: Kullanıcı bir bilgi nesnesini görüntülerken "Mentora sor" dediğinde, o KO'nun kodu istekle birlikte gönderilir ve bağlamda sabit tutulur.

### 4. Context Assembly

AI Gateway'e gönderilen prompt:

- **System prompt:** LocalAkademi rolü, kullanıcı adı/rolü.
- **Knowledge context:** retrieval sonuçları veya seçili KO.
- **Business workspace context:** aktif işletme kayıtları ve ilgili belgeler (sadece üyesi olunan workspace'ten).
- **Memory context:** kullanıcı hafızalarından özet.
- **Chat history:** son N mesaj.

### 5. Yanıt Formatlama

Asistan yanıtı:

- Markdown olarak işlenir.
- Kod blokları vurgulanır.
- Citation badge'leri içerir; her badge `/app/knowledge/:code` adresine bağlanır.

### 6. Hafıza ve Özet

Mesaj çifti kaydedildikten sonra arka planda:

- `extractAndStoreMemories`: kullanıcı tercihleri, hedefleri ve önemli gerçekler çıkarılır.
- `updateConversationSummary`: konuşma özeti güncellenir.

Bu işlemler best-effort'tur; hatalar kullanıcı yanıtını engellemez.

### 7. Arşivleme ve Yeniden Üretme

- `PATCH .../archive`: Konuşma `archivedAt` alanı doldurularak listeden çıkar.
- `PATCH .../unarchive`: Konuşma tekrar aktif listeye döner.
- `POST .../regenerate`: Seçili asistan mesajı yeniden üretilir, önceki seçili KO bağlamı korunur.
- `POST .../edit-regenerate`: Kullanıcı son mesajı düzenler ve asistan yanıtı yeniden üretilir.

### 8. Hata Yönetimi

| Senaryo | Davranış |
|---------|----------|
| Gateway timeout | `504` + "AI mentor yanıt vermedi. Lütfen tekrar deneyin." |
| Rate limit | `429` + "Çok fazla istek gönderildi..." |
| Empty response | `502` + "AI mentor boş yanıt döndü..." |
| Network error | `502` + "AI mentor servisine bağlanılamadı..." |
| Bilgi bulunamadı | Sistem prompt "Bu konuda kaynak yok..." mesajıyla devam eder, yanıt güvenlik çerçevesinde üretilir |

## Mevcut Durum

**Durum:** Üretimde aktif (`/mentor/conversations`). Eski `/mentor/chat` ve `/mentor/history` endpoint'leri deprecated olarak işaretlenmiştir.
