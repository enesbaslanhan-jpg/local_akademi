# Belge - Kod Boşluk Matrisi

Ana kaynak: repository içindeki `doc_content.txt` dosyasında birleştirilmiş Product Blueprint, Knowledge Base ve Faz 4/Faz 5 metinleri. Özellikle Faz 5 bölümü 27 KO, 11 formül, provider bağımsız gateway, review gate, audit, yedekleme, veri maskeleme ve rate limit hedeflerini tanımlar.

| Gereksinim | Kaynak | Kod karşılığı | Durum | V1.0 | Karar |
|---|---|---|---|---|---|
| 27 Knowledge Object | Faz 5 | Prisma KO modeli, seed/import dosyaları | Kısmen | Evet | DB'deki gerçek published sayısını release kontrolünde doğrula. |
| Sources | Faz 4/5 | `Source`, `KnowledgeObjectSource`, `sources.ts` | Kısmen | Evet | Kaynak CRUD + yayın kapısı testleri ekle. |
| Claims / claim_sources | Faz 4 | Ayrı model yok | Eksik | Güvenilir içerik için evet | Claim'i ilk sınıf model yap veya v1'de açıkça KO-source düzeyine indir. |
| Formulas | Faz 4 | Prisma Formula; runtime'da 3 hard-coded formül | Kısmen | Evet | 11 hedefi yerine pilot için doğrulanmış çekirdek set ve şemalı girdiler belirle. |
| Tasks / task_assignments | Faz 4 | `TaskTemplate`, `TaskAssignment`, `tasks.ts` | Kısmen | Evet | Metadata substring aramasını gerçek FK/template sorgusuyla değiştir. |
| Quiz questions / attempts | Faz 4 | Modeller ve `quizzes.ts` | Kısmen | Evet | Sahte başarı fallback'ini kaldır; published kontrolü ve şema doğrulaması ekle. |
| Content reviews | Faz 4 | `ReviewRecord`, admin review ekranı | Kısmen | Evet | Yayın geçişini zorunlu review durum makinesine bağla. |
| AI intent routes | Faz 4 | Provider/router kodu var, DB modeli yok | Kısmen | Hayır | V1'de kod tabanlı router yeterli; izlenebilir karar logu ekle. |
| Audit logs | Faz 4/5 | Model/servis yok | Eksik | Evet | Kritik admin ve yayın işlemleri için P0. |
| Review gate | Faz 4/5 | Mentor çağrı zincirinde yok | Eksik | Evet | Finans/hukuk/vergi ve düşük güven yanıtları için zorunlu kapı. |
| AI Mentor | Faz 5 | Eski mentor + yeni conversation servisi | Kısmen | Evet | İki akışı tek gateway ve tek politika altında birleştir. |
| Knowledge retrieval | Faz 5 | Published filtreli son 5 KO | Kısmen | Evet | Sorguyla ilgisiz son içerik seçimi yerine ölçülebilir retrieval ekle. |
| Görev, quiz, flashcard | Faz 5 | Görev/quiz var; flashcard ayrı kanıt yok | Kısmen | Evet | Flashcard'ı pilot dışına al veya net metadata/API sözleşmesi ekle. |
| 11 formül | Faz 5 | 3 runtime formülü | Eksik | Kısmen | Önce 3 formülü güvenilir yap; kalanları P1'e taşı. |
| İşletme paneli | Faz 5 | Profil ve KPI endpointleri | Kısmen | Evet | Sessiz fallback'leri kaldır ve doğrulama ekle. |
| İçerik/uzman paneli | Faz 5 | Admin ekranları ve review kayıtları | Kısmen | Evet | Rol/yayın E2E testiyle pilot öncesi kanıtla. |
| Belge güvenliği | Faz 5 | Boyut, allowlist, sahiplik, UUID, fiziksel silme | Kısmen | Evet | Magic-byte, toplam kota ve zararlı arşiv savunması ekle. |
| Rate limit | Faz 5 SEC-009 | Login, mentor, upload | Tamamlandı | Evet | Dağıtık deployment için ortak store P1. |
| Veri maskeleme | Faz 5 SEC-005 | Logger redaction + memory sensitive filter | Kısmen | Evet | LLM'e gitmeden önce tüm prompt/context için tek maskeleme kapısı kur. |
| Yedekleme | Faz 5 | Klasör/yardımcı izleri | Doğrulanamadı | Evet | Otomasyon + restore tatbikatı olmadan tamamlandı sayma. |
| Multi-stage deployment | 19 Temmuz düzeltmesi | Multi-stage Dockerfile, non-root runtime | Tamamlandı | Evet | CI image build ve healthcheck ekle. |
| Route prefix uyumu | 19 Temmuz düzeltmesi | `/tasks`, `/documents`; Vite proxy'leri | Tamamlandı | Evet | API contract testiyle kilitle. |

## V1.0 hedef kararı

V1.0; güvenli bir pilot olarak Auth -> published KO -> AI conversation -> görev/quiz -> ilerleme/dashboard akışına odaklanmalıdır. Gelişmiş gamification, 11 formülün tamamı, mobil istemci, çoklu ajan ve büyük entegrasyon kataloğu P1/P2'ye bırakılmalıdır. Pilotun ayırt edici değeri daha fazla özellik değil; kaynaklı, kullanıcıya izole, kalıcı ve veri kaybetmeyen mentor deneyimidir.

