# AI Mentor 2.0 — Faz 1 Sprint 1 Teslim Raporu

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` | Conversation modeline `archivedAt`, `deletedAt`, `lastMessageAt`, `model`, `provider` eklendi. Message modeli `ConversationMessage` olarak yeniden adlandırıldı; `updatedAt`, `citations`, `knowledgeObjects`, `toolCalls`, `tokenUsage`, `error` alanları eklendi; `sources` kaldırıldı. |
| `src/services/conversation.ts` | Tamamen yeniden yazıldı. `/mentor/conversations` prefix'inde 6 endpoint. Ownership kontrolü, soft delete, AI entegrasyonu. |
| `src/index.ts` | Conversation route prefix'i `/mentor/conversations` olarak güncellendi. |
| `frontend/src/pages/MentorPage.jsx` | Tamamen yeniden yazıldı. Sidebar + ana alan, mobil uyumlu, optimistic UI, inline başlık düzenleme. |
| `frontend/src/services/api.js` | Conversation API endpoint'leri `/api/mentor/conversations` olarak güncellendi, `getById` ve `sendMessage` eklendi. |
| `frontend/vite.config.js` | Eski `/conversations` proxy kuralı kaldırıldı (`/api` proxy zaten kapsıyor). |
| `package.json` | `test` ve `test:watch` script'leri, `vitest` devDependency eklendi. |

## Eklenen Dosyalar

| Dosya | Açıklama |
|---|---|
| `src/services/ai-provider.ts` | AI provider modülü. `getAiConfigs`, `callAiProviderWithRetry`, `buildSystemPrompt`, `getRelevantKnowledgeObjects`, `formatKnowledgeContext`, `needsClarification` fonksiyonlarını içerir. Conversation ve Mentor servisleri tarafından ortak kullanılır. |
| `prisma/migrations/20260719190000_add_conversationmessage_softdelete/` | Migration: Conversation'a yeni alanlar, Message → ConversationMessage rename, yeni alanlar. |
| `tests/conversation.test.ts` | 12 test senaryosu (ownership, CRUD, soft delete, mesaj kaydı, başlık otomatik güncelleme). |
| `vitest.config.ts` | Vitest yapılandırması. |
| `SPRINT1_RAPORU.md` | Bu rapor. |

## Prisma Değişiklikleri

### Conversation (güncellendi)
- `archivedAt` (DateTime?, nullable)
- `deletedAt` (DateTime?, nullable) — soft delete
- `lastMessageAt` (DateTime?, nullable) — son mesaj zamanı
- `model` (String?, nullable) — AI model adı
- `provider` (String?, nullable) — AI sağlayıcı adı

### ConversationMessage (Message → rename + genişletme)
- `role` — `user`, `assistant`, `system`, `tool` değerlerini kabul eder
- `citations` (String?, JSON)
- `knowledgeObjects` (String?, JSON)
- `toolCalls` (String?, JSON)
- `tokenUsage` (String?, JSON)
- `error` (String?, nullable) — AI hatası
- `updatedAt` (DateTime?, nullable)

## Yeni Endpointler

| Metot | Path | Açıklama |
|---|---|---|
| GET | `/api/mentor/conversations` | Kullanıcının aktif sohbetleri (deletedAt null), son mesaj özeti ve mesaj sayısıyla |
| POST | `/api/mentor/conversations` | Yeni sohbet oluştur |
| GET | `/api/mentor/conversations/:id` | Sohbet detayı + mesajlar (zaman sıralı) |
| PATCH | `/api/mentor/conversations/:id` | Başlık güncelle |
| DELETE | `/api/mentor/conversations/:id` | Soft delete (deletedAt doldurulur) |
| POST | `/api/mentor/conversations/:id/messages` | Mesaj gönder + AI yanıtı üret |

## Güvenlik Kontrolleri

Tüm endpointlerde:
- `fastify.authenticate` — JWT doğrulaması
- `ensureOwnership()` — her istekte `userId` + `deletedAt: null` filtresi
- Kullanıcı başkasının sohbetini: göremez, okuyamaz, düzenleyemez, silemez, mesaj ekleyemez
- 404 döner (bilgi sızdırmamak için "not found", "forbidden" değil)

## Çalıştırılan Testler (12/12 başarılı)

1. Kullanıcı boş conversation listesini görebilir ✓
2. Yeni conversation oluşturulabilir ✓
3. Kullanıcı kendi conversation listesini görebilir ✓
4. Başka kullanıcının conversation'ına erişemez ✓
5. Conversation başlığı güncellenebilir ✓
6. Başka kullanıcı başlığı değiştiremez ✓
7. Soft delete çalışır ✓
8. Silinen conversation listede görünmez ✓
9. Başka kullanıcının conversation'ını silemez ✓
10. Mesaj gönderildiğinde user ve assistant mesajları kaydedilir ✓
11. Başka kullanıcı mesaj ekleyemez ✓
12. Başlık otomatik güncellenir ✓

## Build Sonuçları

- Backend TypeScript (`tsc --noEmit`): **başarılı**
- Frontend Vite (`npm run build`): **başarılı** (1867 module)
- Prisma validate: **başarılı**
- Prisma generate: **başarılı**
- Test suite: **12/12 passed**

## AI Provider Akışı

Mevcut `auto` mod korundu:
1. **Ollama** (yerel, `qwen3:4b-instruct`)
2. **NVIDIA** (`deepseek-ai/deepseek-v4-flash`)
3. **DeepSeek** (`deepseek-v4-flash`)
4. **OpenAI** (`gpt-5`)

Her sağlayıcıda 1 retry; 429/5xx'te otomatik sonraki sağlayıcıya geçer.

## Bilinen Eksikler

- Streaming desteği yok (bu sprint kapsamı dışındaydı)
- Uzun süreli memory yok (sadece son 6 mesaj context'te)
- Tool calling yok
- İşletme paneli entegrasyonu yok
- `updatedAt` ConversationMessage'da nullable kaldı (SQLite kısıtı)
- İlk mesajda AI yanıt hatası alınırsa başlık yine de güncellenir

## Sonraki Sprint Önerileri

- **Sprint 2:** Streaming desteği (SSE), canlı token akışı
- **Sprint 3:** Uzun süreli memory / bellek yönetimi (özetleme + vektör DB)
- **Sprint 4:** Tool calling (web arama, formül hesaplama, doküman sorgulama)
- **Sprint 5:** İşletme profili entegrasyonu, kişiselleştirilmiş mentor
