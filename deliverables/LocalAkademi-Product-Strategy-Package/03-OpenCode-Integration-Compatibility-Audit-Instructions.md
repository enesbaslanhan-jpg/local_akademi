# OpenCode Talimatı — LocalAkademi Entegrasyon ve Uyumluluk Denetimi

Aşağıdaki görevi tek çalışma halinde yürüt. Önce salt okunur denetim yap; açıkça tanımlanan güvenlik düzeltmeleri dışında uygulama kodunu değiştirme. Mevcut kullanıcı verilerini, yayınlanmış içerikleri, migration zincirini ve çalışma ağacındaki kullanıcı değişikliklerini koru. `git reset --hard`, toplu silme, veritabanı sıfırlama, geçmiş yeniden yazma veya secrets değerlerini rapora kopyalama yapma.

## Amaç

LocalAkademi kod tabanının:

1. `docs/master-plan/01-Product-Vision.md` ve `02-Product-Strategy.md` ile uyumunu,
2. OpenCode ile güvenli çalıştırılabilirliğini,
3. backend, frontend, Prisma/PostgreSQL, AI sağlayıcıları ve içerik üretim hatlarının entegrasyon bütünlüğünü,
4. kontrollü beta için teknik ve ürün yayın kapılarını

kanıta dayalı olarak denetle.

## Faz 0 — Kritik güvenlik kapısı

İlk iş olarak `opencode.json`, `.env*`, CI dosyaları, dokümantasyon, loglar ve Git geçmişinde sır taraması yap.

- `opencode.json` veya başka izlenen dosyada gerçek API anahtarı varsa değeri ekrana veya rapora yazma.
- Bulguyu `CRITICAL` olarak işaretle.
- İlgili anahtarın sağlayıcı panelinden iptal edilip yenilenmesi gerektiğini açıkça belirt.
- Yapılandırmayı yalnızca `${NVIDIA_API_KEY}`, `${OPENAI_API_KEY}` benzeri ortam değişkeni referanslarına taşı.
- `.env.example` içinde yalnızca boş değişken adları bulunsun.
- `.env`, `.video-tools`, `.video-work`, medya çalışma çıktıları ve logların Git kapsamını denetle.
- `scripts/secret-scan.js` gerçek sır örüntüsünde non-zero exit vermiyorsa bunu release blocker olarak raporla; eğitim metni ve kaynak URL'leri gibi yanlış pozitifler için dar allowlist öner.
- Anahtar iptalinin yapıldığını varsayma; kullanıcı/sağlayıcı doğrulaması gereken madde olarak bırak.

Bu faz tamamlanmadan dış ağ çağrısı, model testi veya sağlayıcı doğrulaması yapma.

## Faz 1 — Depo ve çalışma ağacı envanteri

Raporla:

- Git branch, HEAD ve temiz/kirli çalışma ağacı.
- Kullanıcıya ait mevcut değişiklikler; bunlara dokunma.
- Node, npm/pnpm, TypeScript, Prisma, Fastify, React, Vite ve Vitest sürümleri.
- Backend/frontend başlangıç komutları.
- Veri tabanı sağlayıcısı ve migration dizinleri.
- Docker/Compose, `.env.example`, OpenCode ve test yapılandırmaları.
- Ana modüller: auth, onboarding, courses, knowledge, quizzes, tasks, flashcards, videos, tools, mentor, RAG, reviewer.

## Faz 2 — OpenCode yapılandırma uyumluluğu

`opencode.json` dosyasını şu kontrollerle denetle:

- JSON şeması geçerli mi?
- Sağlayıcı adı, `baseURL`, model kimlikleri ve istek biçimi OpenAI-compatible kullanım ile tutarlı mı?
- API anahtarı yalnızca ortam değişkeninden mi okunuyor?
- Varsayılan model yoksa davranış açık mı?
- Model bulunamadığında güvenli ve anlaşılır hata var mı?
- Timeout, retry ve rate-limit sınırları tanımlı mı?
- Geliştirme/test sırasında gerçek API çağrısını engelleyen mock/provider abstraction var mı?
- Loglar prompt, token, kişisel veri veya anahtar sızdırıyor mu?

Gerekliyse sır içermeyen önerilen `opencode.json.example` farkını rapora ekle; gerçek anahtar veya kullanıcı verisi ekleme.

## Faz 3 — Ürün stratejisi uyum denetimi

Her madde için `PASS / PARTIAL / FAIL / NOT VERIFIED` ver ve dosya/satır kanıtı göster:

1. Ürün kurs kataloğu değil, öğrenme + araç + Mentor değer döngüsü olarak çalışıyor mu?
2. Kullanıcı profil tamamlamadan temel yüzeylere erişebiliyor mu?
3. İlk değer anı 10 dakikadan kısa bir akışla destekleniyor mu?
4. Dashboard sıradaki en değerli aksiyonu gösteriyor mu?
5. Kurs, KO, quiz, görev, flashcard ve video aynı derste bağlanıyor mu?
6. Araç sonucu göreve veya Mentor açıklamasına taşınabiliyor mu?
7. North Star için “anlamlı işletme aksiyonu” olayları ölçülüyor mu?
8. Kaynak, güncellik ve inceleme durumu kullanıcıya görünür mü?
9. AI yalnızca yayınlanmış/demo olmayan KO'ları kullanıyor mu?
10. Hesaplar deterministik servis üzerinden mi yapılıyor?

## Faz 4 — İçerik ve pedagojik kalite denetimi

Tüm içeriği elle okumak yerine örneklem ve otomatik tarama kullan:

- Her ana kategoriden en az 5 konu ailesi; toplam en az 30 aile seç.
- Aynı ailedeki ders başlıklarının ve içeriklerinin benzerlik oranını ölç.
- Yer tutucu quizleri (`A/B/C/D`, “sorusu 1”, genel kalite soruları) tara.
- Boş/kısa flashcard, genel görev, kaynaksız iddia ve tekrarlanan şablon cümlelerini raporla.
- `KNOWLEDGE_QUALITY_STANDARD_V2.md` zorunlu bölümlerini kontrol et.
- Nakit Akışı V2 pilotunu referans kalite örneği olarak incele; diğer konuların otomatik olarak aynı seviyede olduğunu varsayma.
- Başlangıç/orta/ileri seviyelerinin gerçekten artan bilişsel derinlik taşıyıp taşımadığını değerlendir.

Sayım, örnek kodlar ve kısa anonim örneklerle sonuç ver; uzun içerikleri rapora kopyalama.

## Faz 5 — Veri ve migration bütünlüğü

- `prisma validate` ve Prisma Client generation çalıştır.
- Migration zincirini yeni boş PostgreSQL veri tabanında ve mevcut geliştirme veri tabanında doğrula.
- `prisma db push` ile migration geçmişini atlama.
- 600 `CUR-*` ve 240 `KBX-*` yayınlanmış KO hedefini güncel veriyle karşılaştır.
- Konu kursu, ders, quiz, soru, görev, flashcard, video ve source ilişki sayılarını raporla.
- Orphan, duplicate, yanlış course mapping, published olmayan içerik sızıntısı ve kullanıcı izolasyonu kontrolleri yap.
- Yedekleme/geri yükleme doğrulamasını çalıştırabiliyorsan çalıştır; dış bağımlılık yoksa `NOT VERIFIED` yaz.

## Faz 6 — Backend ve frontend entegrasyonu

Şu kullanıcı yolculuğunu gerçek API ve test verisiyle kanıtla:

1. Learner giriş yapar.
2. Profil tamamlamadan Kurslar ve Bilgi Tabanı'na gider.
3. Kurs arar, filtreler ve kaydolur.
4. Dersi açar, Markdown içeriği okur.
5. Quiz cevaplar ve açıklamalı sonuç alır.
6. Görevi başlatır, taslak kaydeder ve tamamlar.
7. Flashcard çalışır; ön/arka içerik görünür.
8. Video varsa oynatılır ve ilerleme kaydolur.
9. Ders/kurs ilerlemesi sunucuda hesaplanır.
10. Dashboard ve Kurslarım aynı ilerlemeyi gösterir.
11. En az üç farklı araç doğru sonuç üretir ve geçmişe kaydeder.
12. Mentor, kullanıcı bağlamı ve yayınlanmış kaynaklarla yanıt verir.

Her adım için endpoint, beklenen/gerçek sonuç ve kanıt ver. Başarısız adımı “tamamlandı” gibi gösterme.

## Faz 7 — Zorunlu komutlar

PowerShell üzerinde uygun `.cmd` komutlarını kullan:

```powershell
npm.cmd run db:generate
npm.cmd run build
npm.cmd run validate:migrations
npm.cmd run courses:verify
npm.cmd run learning:pilot:verify-all
npm.cmd run learning:cashflow:v2:verify
npm.cmd run reviewer:eval:validate
npm.cmd test -- --reporter=dot
npm.cmd run secret:scan

Set-Location frontend
npm.cmd run build
npm.cmd test -- --reporter=dot
```

Ayrıca uygunsa:

```powershell
npm.cmd run security:acceptance
npm.cmd run backup:restore:verify
npm.cmd run beta:acceptance
npm.cmd run rag:embeddings:verify
npm.cmd run rag:eval:hybrid
```

Komut atlanırsa nedenini yaz. Eski raporu güncel PASS kanıtı gibi kullanma.

## Faz 8 — Performans, erişilebilirlik ve gözlemlenebilirlik

- 200 civarı kurs için pagination ve sorgu sayısını kontrol et.
- N+1 sorgu, büyük payload, tam içerik listede gönderimi ve indeks eksiklerini ara.
- Klavye erişimi, form label'ları, hata mesajları, kontrast ve mobil ders oynatıcıyı kontrol et.
- Structured log, request ID, hata redaksiyonu, health/readiness ve temel metrikleri denetle.
- AI, TTS ve harici servis kesintilerinde temel öğrenme yüzeylerinin çalışmaya devam edip etmediğini kontrol et.

## Faz 9 — Çıktı

Tek rapor üret:

`docs/audits/OPENCODE_INTEGRATION_COMPATIBILITY_AUDIT_2026-07-27.md`

Rapor yapısı:

1. Yönetici özeti ve genel karar.
2. Kritik güvenlik bulguları.
3. Çalıştırılan komutlar ve gerçek sonuçlar.
4. Ürün stratejisi uyum matrisi.
5. OpenCode yapılandırma uyumu.
6. İçerik/pedagoji örneklem sonuçları.
7. Veri ve migration bütünlüğü.
8. Uçtan uca kullanıcı yolculuğu.
9. Performans, erişilebilirlik ve operasyon.
10. P0/P1/P2 öncelikli düzeltmeler.
11. Kontrollü beta kararı: `GO / CONDITIONAL GO / NO-GO`.
12. Yeniden doğrulama komutları.

Her bulguda önem seviyesi, kanıt dosyası/satırı, kullanıcı etkisi, önerilen düzeltme ve kabul ölçütü bulunmalıdır.

## Yasaklar

- Sır değerlerini çıktılamak veya rapora kopyalamak.
- Kullanıcı verisini harici AI/TTS hizmetine göndermek.
- Mevcut kullanıcı değişikliklerini geri almak.
- Testleri silmek, gevşetmek veya sadece geçmeleri için assertion değiştirmek.
- Migration geçmişini `db push` ile atlamak.
- Sayım veya test sonucu uydurmak.
- `PARTIAL` veya `NOT VERIFIED` sonucu `PASS` gibi sunmak.

## Tamamlanma ölçütü

Görev yalnızca rapor dosyası üretildiğinde ve rapordaki her PASS güncel komut, dosya/satır veya gerçek API kanıtına dayandığında tamamlanmış sayılır. Kritik sır sızıntısı çözülmeden beta için `GO` verme.

