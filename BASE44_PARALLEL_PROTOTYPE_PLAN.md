# Base44 Paralel Prototip ve Karşılaştırma Planı

## Karar

Base44 sürümü mevcut LocalAkademi'nin yerine doğrudan geçirilmemelidir. Ayrı veri, ayrı kullanıcılar ve sentetik içerikle paralel prototip olarak kurulmalıdır.

## Taşınacak kavramlar

| Mevcut LocalAkademi | Base44 prototipi | İlk aşama |
|---|---|---|
| User / JWT role | Base44 auth + UserProfile role | Yeniden kur |
| BusinessProfile | BusinessProfile entity | Şemayı taşı, veri taşıma |
| Category | Category entity | Şemayı taşı |
| KnowledgeObject | KnowledgeObject entity | 10 sentetik KO ile başla |
| Source ilişkisi | Source + KnowledgeObjectSource | Yeniden kur |
| Conversation / Message | Conversation + ConversationMessage | Yeniden kur |
| UserMemory | UserMemory | Hassasiyet alanıyla sınırla |
| TaskTemplate / Assignment | Aynı ayrım | Yeniden kur |
| Quiz / Question / Attempt | Aynı ayrım | Yeniden kur |
| FormulaCalculation | FormulaDefinition + Calculation | İlk prototipte 3 formül |
| UploadedDocument | Base44 storage + metadata entity | Güvenlik kanıtından sonra |
| ReviewRecord | ReviewRecord | Admin/uzman akışına bağla |
| Audit log eksik | AuditLog | Base44 prototipinde baştan kur |

## Taşınmayacaklar

- Mevcut `.env` ve API anahtarları
- `dev.db`
- Gerçek kullanıcı kayıtları
- Mevcut upload dosyaları
- Parola hash'leri
- Conversation geçmişi
- Hassas işletme verileri
- Docker ve Prisma migration dosyaları

## Aşama planı

### Aşama 1 — İzole prototip

- Base44'te yeni ve ayrı uygulama oluştur.
- `BASE44_BUILD_PROMPT.md` talimatını kullan.
- Yalnız sentetik demo verisi oluştur.
- GitHub bağlanacaksa mevcut LocalAkademi repository'sini değil yeni bir repository kullan.

### Aşama 2 — Güvenlik testi

Üç hesap oluştur: learner A, learner B, admin.

Kontrol et:

- Learner A, learner B verisini URL/ID değiştirerek görebiliyor mu?
- Taslak KO liste, detay, quiz veya AI içinden sızıyor mu?
- Role alanı istemciden değiştirilerek admin olunabiliyor mu?
- AI başka kullanıcı memory'sini kullanıyor mu?
- Başarısız kayıt işleminde arayüz başarı gösteriyor mu?

Bu kontroller geçmeden gerçek veri aktarma.

### Aşama 3 — Ürün karşılaştırması

| Ölçüt | Mevcut uygulama | Base44 | Karar eşiği |
|---|---:|---:|---|
| Auth ve kullanıcı izolasyonu |  |  | Kritik testlerin %100'ü |
| Published-only içerik |  |  | Sızıntı sıfır |
| AI sohbet kalıcılığı |  |  | Ana akış hatasız |
| Kaynak gösterme |  |  | Her kaynaklı yanıtta görünür |
| Görev/quiz bütünlüğü |  |  | Sahte başarı sıfır |
| Admin yayın akışı |  |  | Audit ile izlenebilir |
| Mobil kullanılabilirlik |  |  | Temel görevler tamamlanabilir |
| Geliştirme hızı |  |  | Ölçülen süre |
| Platform maliyeti |  |  | Pilot bütçesine uygun |
| Vendor bağımlılığı |  |  | Kabul edilen risk |

### Aşama 4 — Karar

Base44 yalnız şu koşullarda ana aday olsun:

1. Bütün kritik izolasyon ve yayın testleri geçer.
2. AI ve veri kullanım maliyeti ölçülür.
3. Kod ve veri dışa aktarma provası yapılır.
4. Özel belge güvenliği ve AI gateway gereksinimleri karşılanabilir.
5. En az bir haftalık pilotta kritik veri kaybı görülmez.

Koşullar karşılanmazsa Base44; tasarım prototipi, admin aracı veya hızlı deney ortamı olarak tutulur, ana LocalAkademi kod tabanı geliştirilmeye devam eder.

## İlk Base44 oturumunda yapılacaklar

1. Yeni uygulama oluştur.
2. Ana prompt'u gönder.
3. Yalnız Auth, roller ve entity şemalarını üretmesini iste.
4. Permission kurallarını elle incele.
5. Learner A/B izolasyon testini yap.
6. Sonra onboarding ve Knowledge Object ekranlarına geç.

Tek seferde tüm ürünü üretmesini istemek yerine her aşamayı çalışır ve test edilmiş durumda sabitle.
