# LocalAkademi Mevcut Durum Denetimi

Tarih: 20 Temmuz 2026

## Yönetici özeti

Bu rapor dosya adına veya önceki beyanlara değil, mevcut kod ve yeniden çalıştırılan doğrulamalara dayanır. İncelenen 29 başlığın 12'si tamamlandı, 12'si kısmen tamamlandı, 3'ü eksik ve 2'si doğrulanamadı olarak sınıflandırıldı.

Doğrulama sonuçları:

- `npm.cmd test`: 4 test dosyası, 70 test geçti.
- `npm.cmd run build`: backend TypeScript build geçti.
- `frontend\npm.cmd run build`: Vite production build geçti.
- `npx.cmd prisma validate --schema prisma\schema.prisma`: şema geçerli.
- `docker compose config`: yapılandırma çözümlendi; yerel Docker config dosyası için erişim uyarısı verdi.
- Gerçek LLM çağrısı, Docker image build/çalıştırma, yedekten geri dönüş ve uçtan uca tarayıcı testi yapılmadı.

## Bulgular

| Alan | Özellik | Durum | Kanıt | Risk / önerilen işlem |
|---|---|---|---|---|
| Auth | Kayıt, giriş, `/me`, Zod | Tamamlandı | `src/services/auth.ts` | Auth entegrasyon testleri eklenmeli. |
| Auth | JWT 8 saat ve güçlü secret kontrolü | Tamamlandı | `expiresIn: ... || '8h'`; en az 32 bayt kontrolü | Refresh/revocation yok; pilot için kabul edilebilir. |
| Kullanıcı/rol | Kimlik ve rol taşıma | Kısmen | JWT'de `id,email,role`; admin kontrolleri servislerde | Merkezi yetki matrisi ve rol testleri eksik. |
| İşletme profili | Kullanıcıya ait profil | Kısmen | `business.ts` userId filtresi | DB hataları `.catch(() => null)` ile yutuluyor, sahte başarı mümkün. |
| KO liste/detay | Yayınlanmış içerik erişimi | Tamamlandı | `knowledge.ts`, `knowledge-v2.ts` | Yetkisiz/yayın dışı erişim regresyon testi artırılmalı. |
| Kategori | Şema, slug ve listeleme | Tamamlandı | `Category`, migration ve knowledge servisleri | Seed/migration zinciri CI'da test edilmeli. |
| Learning Path | Yol ve kullanıcı ilerlemesi | Kısmen | `learningPath.ts`, `LearningPath` | Kişiselleştirme ve uçtan uca kabul testi sınırlı. |
| Enrollment | Kayıt ve ilerleme | Kısmen | `enrollments.ts`, `Enrollment` | Durum geçiş kuralları ve eşzamanlı güncelleme testleri eksik. |
| Görev | Atama ve ilerleme kalıcılığı | Kısmen | `tasks.ts` gerçek Prisma create/update kullanıyor | Görev KO metadata içinde metin aramasıyla bulunuyor; TaskTemplate ilişkisi kullanılmıyor. |
| Quiz | Soru ve deneme kaydı | Kısmen | `quizzes.ts`, `QuizAttempt` | Kayıt hatası yutulup `Date.now()` ile sahte başarı dönüyor; public GET yayın kontrolü yapmıyor. |
| Flashcard | Öğrenme nesnesi deneyimi | Eksik | Ayrı model/servis/ekran kanıtı yok | V1 pilot kapsamı netleştirilmeli veya KO metadata için sözleşme kurulmalı. |
| Formül motoru | Hesaplama ve geçmiş | Kısmen | `formulas.ts` 3 çalışır formül | Belge hedefi 11 formül; girişler şemasız `any`, yalnızca 3 formül var. |
| AI Mentor | Session userId izolasyonu | Tamamlandı | `mentorSession.findFirst/updateMany` userId ile | İzolasyon regresyon testi korunmalı. |
| AI Mentor | Mesaj ve bağlam limitleri | Tamamlandı | 8000 karakter, 20 mesaj, 5 KO, 2000 karakter/KO, 2048 output token | Sağlayıcıdan gelen token kullanımına dayalı kullanıcı kotası yok. |
| AI provider | NVIDIA/OpenAI/DeepSeek seçimi | Tamamlandı | `mentor.ts` ve `ai-provider.ts` | İki ayrı provider uygulaması mimari sapma yaratıyor; tek gateway'e indirilmeli. |
| Knowledge retrieval | Yalnız published KO | Tamamlandı | `status: 'published'` filtreleri | Retrieval semantik değil; en son güncellenen 5 KO seçiliyor. |
| AI conversation | Kalıcı sohbet, mesaj, streaming | Tamamlandı | `conversation.ts`, Prisma modelleri, 70 test içindeki conversation/streaming testleri | Gerçek provider E2E testi yok. |
| Memory/context | Hafıza modülleri ve hassas veri filtresi | Kısmen | `src/services/memory/*`, `UserMemory`, `ConversationSummary` | Retention, silme ve gerçek kullanıcı akışı E2E doğrulanmadı. |
| Review gate | AI yanıtı öncesi zorunlu kapı | Eksik | Mentor akışında review gate çağrısı bulunmuyor | Riskli konular için kural tabanlı kapı ve test eklenmeli. |
| Kaynak/claim | Source modeli ve KO bağlantısı | Kısmen | `Source`, `KnowledgeObjectSource`, `sources.ts` | Ayrı Claim/ClaimSource modeli bulunmuyor. |
| Belge yükleme | Boyut, uzantı/MIME, DOCX, sahiplik, silme | Kısmen | `documents.ts`: 10 MB, allowlist, mammoth, userId, fiziksel unlink | MIME istemci beyanına güveniyor; magic-byte kontrolü ve toplam kullanıcı kotası yok. |
| Path traversal | Sunucu üretimli saklama adı | Tamamlandı | UUID + allowlist uzantı; indirme endpoint'i yok | Silmede DB'deki `storedName` için kök sınırı savunması eklenebilir. |
| Kullanıcı dashboard | Öğrenme/aktivite görünümü | Kısmen | `learnerDashboard.ts`, frontend Dashboard | E2E ve hata durumları doğrulanmadı. |
| İşletme paneli | KPI özeti | Kısmen | `business.ts` | Sessiz DB fallback'leri veriyi güvenilmez kılıyor. |
| Admin | Dashboard/kullanıcı/içerik/import/review ekranları | Kısmen | `admin.ts`, frontend admin sayfaları | Yayın/review/audit akışının E2E kanıtı yok. |
| Audit log | Kritik değişikliklerin denetim izi | Eksik | Prisma'da `AuditLog` modeli yok | İçerik, rol, formül ve yayın değişiklikleri için append-only audit gerekir. |
| Yedekleme | Dosyalar ve klasör | Doğrulanamadı | `BACKUPS` ve raporlar mevcut | Otomatik iş, şifreleme ve restore testi kanıtlanmadı. |
| Güvenlik | Rate limit ve log redaksiyonu | Tamamlandı | auth/mentor/upload limitleri; logger redact | Dağıtık ortam store'u ve güvenlik testleri eksik. |
| Deployment | Multi-stage, non-root, volume/port | Tamamlandı | Dockerfile ve compose config | Image build/healthcheck doğrulanmadı; server portu tüm arayüzlere açılıyor. |
| Test/operasyon | Build ve birim testleri | Doğrulanamadı | 70 test ve build geçiyor | Auth, documents, tasks, quiz, business, admin, migration, gerçek DB hata yolları ve E2E kapsamı yok. |

## En kritik riskler

1. `business.ts` ve `quizzes.ts` veritabanı hatalarını yutup başarılı veya varsayılan yanıt üretebiliyor; veri kaybı kullanıcıya görünmeyebilir.
2. Belge yükleme gerçek dosya imzasını doğrulamıyor ve toplam kullanıcı kotası uygulamıyor.
3. Dokümandaki review gate, claim zinciri ve audit log hedefleri çalışan kodda tamamlanmış değil.
