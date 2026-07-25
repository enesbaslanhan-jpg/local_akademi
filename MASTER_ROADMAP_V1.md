# LocalAkademi V1 Master Roadmap

## P0 - Güvenli pilot için zorunlu

### 1. Fail-closed veri kalıcılığı

- Kullanıcı değeri: Kaydedildi görünen profil, quiz ve ilerleme verileri gerçekten saklanır.
- Teknik gerekçe: `business.ts` ve `quizzes.ts` DB hatalarını yutuyor.
- Bağımlılıklar: Prisma ve Fastify hata sözleşmesi.
- Kabul: DB hatasında 5xx; sahte ID/default başarı yok; transaction ve hata testleri geçer.
- Dosyalar: `src/services/business.ts`, `src/services/quizzes.ts`, ilgili testler.
- Risk: Mevcut UI gerçek hataları göstermeye başlamalıdır.
- Sıra: 1.

### 2. Belge yükleme sertleştirmesi

- Kullanıcı değeri: Güvenli ve öngörülebilir belge analizi.
- Teknik gerekçe: İstemci MIME'ına güveniliyor; toplam kota yok.
- Bağımlılıklar: Dosya imza algılama ve kota politikası.
- Kabul: MIME/uzantı/içerik üçlü kontrolü, DOCX zip-bomb sınırı, kullanıcı kotası, kök-sınır silme testi.
- Dosyalar: `src/services/documents.ts`, Prisma migration, tests.
- Risk: Bazı geçerli ama yanlış etiketli dosyalar reddedilebilir.
- Sıra: 2.

### 3. Yayın ve erişim güvenlik regresyon paketi

- Kullanıcı değeri: Taslak içerik ve başka kullanıcı verisi sızmaz.
- Teknik gerekçe: Kod filtreleri var ancak kapsamlı endpoint testleri yok.
- Bağımlılıklar: Test DB fixture'ları.
- Kabul: Mentor, conversation, knowledge, quiz, task, document için iki kullanıcı ve draft KO negatif testleri.
- Dosyalar: `tests/`, servisler.
- Risk: Fixture izolasyonu.
- Sıra: 3.

### 4. Tek AI gateway + zorunlu güvenlik kapısı

- Kullanıcı değeri: Tutarlı hata, maskeleme, kaynak ve güvenlik davranışı.
- Teknik gerekçe: `mentor.ts` ve `ai-provider.ts` paralel provider yolları içeriyor; review gate yok.
- Bağımlılıklar: Context builder, sensitive-data filter, source sözleşmesi.
- Kabul: Tüm LLM çağrıları tek gateway'den; published-only retrieval; PII maskeleme; riskli intent review; timeout/retry testleri.
- Dosyalar: mentor, conversation, ai-provider, memory modülleri.
- Risk: Davranış değişikliği; aşamalı feature flag gerekir.
- Sıra: 4.

### 5. Audit log ve yayın durumu bütünlüğü

- Kullanıcı değeri: Kim neyi ne zaman değiştirdi görülebilir.
- Teknik gerekçe: Belgede P0, kodda model yok.
- Bağımlılıklar: Migration ve admin kimliği.
- Kabul: Rol, KO, source, review, publish ve formula değişiklikleri append-only kayda girer; hassas veri yazılmaz.
- Dosyalar: Prisma schema/migration, admin/knowledge/source servisleri.
- Risk: Log hacmi ve kişisel veri politikası.
- Sıra: 5.

### 6. Pilot E2E ve release kapısı

- Kullanıcı değeri: Ana akış sürüm öncesi kanıtlanır.
- Teknik gerekçe: Mevcut 70 test conversation/memory/streaming ağırlıklı.
- Bağımlılıklar: P0 1-5.
- Kabul: Auth -> KO -> mentor -> task/quiz -> dashboard; backend/frontend build; Prisma; compose; migration; Docker healthcheck CI'da geçer.
- Dosyalar: tests, CI, Dockerfile/compose.
- Risk: Ortam bağımlılığı.
- Sıra: 6.

## P1 - Pilotu güçlendiren

1. Sorguyla ilgili ölçülebilir retrieval ve citation/claim zinciri.
2. TaskTemplate ilişkisine geçiş ve öğrenme ilerlemesi durum makinesi.
3. Doğrulanmış formül kataloğunu 3'ten 11'e genişletme; Zod giriş şemaları ve sürümleme.
4. Admin uzman inceleme kuyruğu, SLA ve diff görünümü.
5. Otomatik şifreli yedekleme ve düzenli restore testi.
6. Merkezi yapılandırılmış log, request ID, metrik ve alarm.
7. Redis tabanlı dağıtık rate limit.

## P2 - Ölçekleme ve yeni değer

1. Gamification, streak, rozet ve liderlik.
2. Mobil uygulama ve push bildirimleri.
3. Çoklu dil ve erişilebilirlik geliştirmeleri.
4. Paraşüt/Trendyol/Shopify gibi entegrasyonlar.
5. Gelişmiş işletme analitiği, tahmin ve haftalık raporlar.
6. Çoklu ajan ve tool-calling kataloğu.

