# OpenCode Tek Paket Talimatı — LocalAkademi Öğrenme Deneyimi V2

Aşağıdaki paketi baştan sona uygula. Ara aşamalarda kullanıcıdan onay isteme; güvenli, geri alınabilir ve kapsam içindeki teknik kararları kendin ver. Tamamlanmamış veya yalnızca arayüzü çizilmiş bir özelliği çalışıyor olarak raporlama.

## 1. Değişmez güvenlik ve veri kuralları

- Mevcut kullanıcıları, işletme profillerini, ilerlemeleri, enrollment kayıtlarını, konuşmaları ve görev cevaplarını koru.
- Mevcut 840 yayınlanmış bilgi nesnesini, kaynaklarını, quizlerini, görevlerini, inceleme ve yayın kayıtlarını silme veya yeniden üretme.
- Mevcut 200 konu kursunu, 840 bağlı dersi, 3 legacy kursu ve 33 legacy dersi koru.
- `git reset`, `git checkout --`, veritabanı sıfırlama, toplu silme, `prisma db push` veya migration zincirini atlayan işlem kullanma.
- Kirli çalışma ağacındaki kullanıcı değişikliklerini koru. Yalnızca bu paketle ilgili dosyalara dokun.
- Bilgi nesnesi tek doğruluk kaynağıdır. KO içeriğini Course veya Lesson içine kopyalama.
- Yayınlanmamış veya demo KO, flashcard ve videolar learner endpoint’lerinden görünmemeli.
- Kaynaksız yeni finans, hukuk, vergi veya mevzuat iddiası üretme. Video/flashcard içeriğini KO’nun mevcut doğrulanmış içeriği ve bağlı kaynaklarıyla sınırla.
- Video dosyası, ses, altyazı veya playback URL’si yoksa “video hazır” deme; arayüzde sahte oynatıcı veya boş placeholder oluşturma.

## 2. Doğrulanmış başlangıç durumu

Çalışmaya başlamadan önce aşağıdaki kontrolleri çalıştır ve gerçek başlangıç sayılarını rapor dosyasına kaydet:

```powershell
npx.cmd prisma migrate status
npm.cmd run courses:verify
npm.cmd run curriculum:verify-published
npm.cmd run knowledge:verify-expansion
npm.cmd test -- --reporter=dot
cd frontend
npm.cmd test
npm.cmd run build
```

Beklenen taban:

- 13 migration güncel.
- 600 temel + 240 genişleme olmak üzere 840 published, non-demo KO.
- 200 konu kursu ve 840 KO bağlantılı ders.
- 3 legacy kurs ve 33 legacy ders.
- Backend 19 test dosyasında 442 test.
- Frontend 3 test dosyasında 7 test.
- Görev başlatma isteği geçerli `{}` JSON gövdesi gönderiyor.
- Quiz seçenekleri API’den parse edilmiş dizi olarak geliyor.
- `/quizzes` Vite proxy tanımı var.
- KO’dan kursa geçiş `knowledgeObjectId` üzerinden yapılıyor ve gerekirse enrollment oluşturuyor.

Bu taban bozulursa yeni özellik eklemeye devam etmeden regresyonu düzelt.

## 3. Ürün hedefi

Ana dokümandaki öğrenme döngüsünü gerçek hale getir:

```text
Kısa cevap
→ bilgilendirici özet
→ ayrıntılı kaynaklı içerik
→ 3–6 dakikalık kısa video
→ 5 flashcard
→ mini quiz
→ uygulama görevi
→ ölçülen ilerleme
→ sıradaki öneri
```

İlk teslimde tüm 840 KO için düşük kaliteli otomatik medya üretme. Ana dokümandaki MVP kapsamına uygun olarak 30 öncelikli KO için üretime hazır video içerik paketi oluştur; gerçek video render işlemini OpenCode kapsamında yapma. Veri modeli ve ekranlar daha sonra medya üretim aracından gelecek MP4 veya doğrulanmış playback URL’sini kabul etsin. Aynı KO videosu bilgi nesnesi detayında ve bağlı kurs dersinde yeniden kullanılmalıdır. Kurs ve KO için iki ayrı kopya video üretme.

## 4. Faz 1 — Pilot KO seçimi ve içerik kalite kapısı

Tekrar çalıştırılabilir `scripts/select-learning-pilot.ts` oluştur.

- Ana dokümandaki 30 konuluk MVP envanterini öncele.
- Seçilecek KO published, non-demo, en az bir bağlı kaynağı, quiz’i, görevi ve kurs dersi olan kayıtlardan oluşsun.
- Temel Finans, Maliyet ve Fiyatlandırma, Dijital Ekonomi, E-Ticaret, Girişimcilik, Finansman ve Yatırım kategorilerini dengeli kapsa.
- Seçimi deterministik yap; ikinci çalıştırmada aynı liste üretilsin.
- Sonucu `content/learning-pilot-v1.json` manifestinde KO id/kod, başlık, kategori, lesson/course bağlantısı ve kaynak kodlarıyla sakla.
- Var olan KO metadata’sını doğrudan toplu değiştirme. Pilot için eksik yapısal alanları ayrı ve idempotent bir enrichment scriptiyle ekle.

Her pilot KO’da şu yapısal alanlar bulunmalı:

- `summary`: 80–160 kelimelik konuya özgü kısa özet.
- `keyTakeaways`: 3–5 madde.
- `commonMistakes`: en az 3 konuya özgü hata.
- `example`: gerçekçi fakat kişisel veri içermeyen KOBİ örneği.
- `nextAction`: kullanıcının bugün yapabileceği tek eylem.
- `estimatedMinutes`.

Genel şablon cümlelerini konu adı değiştirerek tekrar etme. `scripts/verify-learning-pilot-quality.ts` şunları FAIL etsin:

- Eksik alan.
- Çok kısa içerik.
- Aynı özet veya maddelerin birden fazla KO’da kullanılması.
- KO başlığıyla ilgisiz örnek.
- Bağlı kaynağı olmayan pilot KO.
- Flashcard/video scriptinde KO içeriğinde veya kaynaklarında dayanak bulamayan kesin iddia.

Package scriptleri ekle:

```json
"learning:pilot:select": "tsx scripts/select-learning-pilot.ts",
"learning:pilot:enrich": "tsx scripts/enrich-learning-pilot.ts",
"learning:pilot:verify": "tsx scripts/verify-learning-pilot-quality.ts"
```

## 5. Faz 2 — Flashcard veri modeli ve tekrar motoru

Prisma’ya güvenli migration ile şu modelleri ekle. İsimler mevcut şemayla çakışıyorsa aynı anlamı koruyarak uyumlu isim seç:

### Flashcard

- `id String @id @default(uuid())`
- `koId Int`
- `front String`
- `back String`
- `hint String?`
- `order Int`
- `status String @default("draft")`
- `createdAt`, `updatedAt`
- KnowledgeObject ilişkisi.
- `@@unique([koId, order])`
- `@@index([koId, status])`

### FlashcardReview

- `id String @id @default(uuid())`
- `userId Int`
- `flashcardId String`
- `rating String`: `again`, `hard`, `good`, `easy`.
- `intervalDays Int`
- `easeFactor Float`
- `repetition Int`
- `dueAt DateTime`
- `reviewedAt DateTime`
- User ve Flashcard ilişkileri.
- `@@index([userId, dueAt])`

### FlashcardProgress

- KO bazında hızlı özet için `userId`, `koId`, `seenCount`, `masteredCount`, `percent`, `lastReviewedAt`.
- `@@unique([userId, koId])`.

Migration kuralları:

- SQLite üzerinde hem boş veritabanına hem mevcut `dev.db` üzerine uygulanabilsin.
- Migration içinde `_prisma_migrations` tablosuna elle kayıt yazma.
- Eski tabloları drop/recreate ederek veri kaybı oluşturma.
- `prisma migrate status` temiz bitmeli.

Aralıklı tekrar için tek, saf ve test edilebilir sunucu fonksiyonu oluştur. SM-2’nin sadeleştirilmiş sürümü veya belgelenmiş eşdeğeri kullanılabilir. Aynı girdi aynı sonucu üretmeli; tarih bağımlılığını testlerde enjekte et.

API:

- `GET /flashcards/knowledge/:koId`: yalnızca published kartları; kullanıcının review/progress özetiyle döndür.
- `POST /flashcards/:flashcardId/reviews`: `again|hard|good|easy` rating kabul et, review ve due date oluştur.
- `GET /flashcards/due?limit=20`: giriş yapan kullanıcının zamanı gelen kartları.
- Doğrudan başka kullanıcının review/progress verisine erişim mümkün olmamalı.
- Bilinmeyen rating, published olmayan kart ve geçersiz ID açık 4xx dönmeli.

Pilot içerik:

- 30 KO × 5 kart = tam 150 published flashcard üret.
- Kartlar KO’nun özetini tekrar eden beş kopya olmasın.
- Kart seti tanım, uygulama, hata, örnek ve karar/kontrol sorusu çeşitlerini kapsasın.
- Upsert kullan; script ikinci kez çalışınca kart sayısı artmamalı.
- `scripts/verify-pilot-flashcards.ts` tam 150 kartı, benzersizliği ve 30 KO kapsamını doğrulasın.

## 6. Faz 3 — Flashcard kullanıcı deneyimi

Ortak `FlashcardDeck` bileşeni oluştur ve hem `KnowledgeDetail` hem `CoursePlayerPage` içinde kullan.

- Kartın ön yüzü, “Cevabı Göster”, arka yüzü ve varsa ipucu.
- Cevap görüldükten sonra `Tekrar`, `Zor`, `İyi`, `Kolay` seçenekleri.
- Klavye erişilebilirliği, görünür focus, ekran okuyucu etiketleri.
- `prefers-reduced-motion` desteği; kart çevirme animasyonu zorunlu değil.
- Sayaç: `3/5`, öğrenilen kart, sıradaki tekrar tarihi.
- Sayfa yenilendiğinde kaydedilmiş ilerleme korunmalı.
- Dashboard’da “Bugün tekrar edilecek kartlar” bölümü ve due queue bağlantısı.
- Kart yoksa boş sahte deste gösterme; bu KO için flashcard hazırlanmadığını açıkça belirt.

## 7. Faz 4 — Video veri modeli, güvenli sunum ve ilerleme

Prisma modelleri:

### LearningVideo

- `id String @id @default(uuid())`
- `koId Int @unique`
- `title String`
- `description String`
- `durationSeconds Int`
- `provider String?`: `local`, `youtube`, `vimeo` allowlist.
- `playbackUrl String?`
- `thumbnailUrl String?`
- `transcript String`
- `captionsUrl String?`
- `scriptVersion Int @default(1)`
- `status String @default("draft")`
- `publishedAt DateTime?`
- `createdAt`, `updatedAt`
- KnowledgeObject ilişkisi.

### VideoProgress

- `id String @id @default(uuid())`
- `userId Int`
- `videoId String`
- `watchedSeconds Int`
- `furthestSecond Int`
- `percent Int`
- `completed Boolean`
- `lastPositionSeconds Int`
- `updatedAt`
- `@@unique([userId, videoId])`

### VideoProductionJob

- `id String @id @default(uuid())`
- `videoId String`
- `status String`: `script_ready`, `queued`, `rendering`, `rendered`, `failed`.
- `provider String?`
- `externalJobId String?`
- `outputUrl String?`
- `errorMessage String?`
- `createdAt`, `updatedAt`
- LearningVideo ilişkisi ve `@@index([status])`.

API:

- `GET /videos/knowledge/:koId`: yalnızca published video ve published/non-demo KO.
- `PUT /videos/:videoId/progress`: watched delta, furthest point ve current position kabul et.
- İstemcinin tek istekte keyfi `%100` göndermesine izin verme.
- Watched delta anormal derecede büyükse veya video süresini aşıyorsa 422 dön.
- Completion eşiği toplam sürenin en az `%90` izlenmesidir.
- Kullanıcı yalnızca kendi video progress kaydını okuyup yazabilsin.
- Transcript ve altyazı video ile aynı sürümde tutulmalı.

Ortak `LearningVideoPlayer` bileşeni:

- HTML5 video; YouTube/Vimeo kullanılacaksa yalnızca allowlist URL ve privacy-enhanced embed.
- Oynat/duraklat, süre, kaldığı yerden devam.
- Türkçe altyazı aç/kapat.
- Açılır transcript paneli.
- Kaynaklar bağlantısı.
- Video tamamlandığında ders ilerlemesi sunucuda yeniden hesaplanmalı.
- Video URL’si yoksa oynat düğmesi gösterme.
- Otomatik oynatma yapma.

## 8. Faz 5 — 30 üretime hazır video içerik paketi

OpenCode gerçek MP4/video üretmeyecek. 30 pilot KO için, ayrı bir medya üretim aracı tarafından doğrudan tüketilebilecek 3–6 dakikalık video içerik paketi oluştur. Her paket şunları içermeli:

- 450–750 kelimelik Türkçe anlatım metni.
- 5–8 sahnelik storyboard.
- Sahne başına ekranda gösterilecek kısa metin.
- Tam transcript.
- Geçerli WebVTT altyazı.
- SVG tabanlı kapak taslağı veya kapak üretim tanımı.
- Görsel stil, ekran oranı, ses tonu, telaffuz notları ve sahne süreleri.
- KO ve kaynak ilişkisi.
- Deterministik dosya adı, manifest kaydı ve içerik checksum’u.

İçerik paketi kuralları:

- Telif hakkı belirsiz görsel, müzik veya video kullanma.
- Kullanılacak görseller özgün, lisanslı veya basit uygulama içi grafik/slayt olmalı.
- Türkçe TTS için özel isim, kısaltma, para ve yüzde telaffuz notları ekle; belirli bir TTS sağlayıcısını zorunlu kılma.
- `content/video-production-v1.json` dosyasında medya aracının ihtiyaç duyacağı script, scenes, transcript, captions, durationTarget, aspectRatio, voiceGuidance, thumbnailSpec ve outputKey alanlarını tut.
- Her video kaydı `status=script_ready`, `playbackUrl=null`, `publishedAt=null` olarak oluşturulsun. Gerçek medya gelmeden publish etme.
- `VideoProductionJob` kayıtlarını `script_ready` durumunda idempotent oluştur.
- Her video en az bir konuya özgü örnek ve bir sonraki eylem içermeli.
- `scripts/verify-video-packages.ts` 30 KO kapsamını; 450–750 kelimelik scripti, 5–8 sahneyi, 180–360 saniyelik hedef süreyi, geçerli VTT’yi, transcript’i, thumbnail tanımını ve checksum’u doğrulasın.
- Ayrı `scripts/verify-published-videos.ts` yalnızca daha sonra gerçek medya eklendiğinde playback URL/dosya erişimi, gerçek süre, transcript, VTT, thumbnail ve published durumunu doğrulasın. Sıfır yayınlanmış video mevcut geliştirme paketini başarısız yapmaz; raporda açıkça `MEDIA_RENDER_PENDING` olarak gösterilir.

Gelecekte binary medya repository boyutunu aşacaksa kontrollü `storage/learning-videos` altında tutulacak şekilde entegrasyonu hazırla ve manifest checksum desteği sağla. Dosya yollarını sabit kullanıcı dizinine bağlama. Path traversal’a izin verme.

## 9. Faz 6 — Birleşik ders deneyimi

`CoursePlayerPage` ve `KnowledgeDetail` aynı ortak öğrenme bileşenlerini kullanmalı. Ders ekranı şu sırayı açık biçimde göstermeli:

1. Kısa Özet
2. Öğrenme Çıktıları
3. Ayrıntılı İçerik
4. Video
5. Flashcard
6. Mini Quiz
7. Uygulama Görevi
8. Kaynaklar
9. Sonraki Ders/Öneri

Sekme kullanılabilir ancak kullanıcı hangi adımda olduğunu ve hangilerinin tamamlandığını görmeli. Mobilde yatay taşma olmamalı.

Her ders başlığında şu durumlar gösterilsin:

- Okuma tamamlandı.
- Video tamamlandı.
- Flashcard tekrarlandı.
- Quiz sonucu/en iyi puan.
- Görev durumu.
- Genel ilerleme.

Kısa özet yalnızca istemcide Markdown’ın ilk paragrafını keserek üretilmesin. Pilot KO’larda editoryal `metadata.summary` kullan; pilot dışı KO’larda mevcut güvenli fallback devam edebilir.

## 10. Faz 7 — İlerleme motoru V2

Mevcut `src/services/course-progress.ts` tek hesaplama kaynağı olmaya devam etsin. Yeni bileşenleri burada destekle:

- Okuma: 25 puan.
- Video: 20 puan.
- Flashcard: 15 puan.
- Quiz: 20 puan.
- Görev: 20 puan.

Bir bileşen KO’da yoksa ağırlığını mevcut bileşenlere orantılı dağıt. Bu nedenle legacy yalnız-okuma dersi okumayla yine `%100` olabilmeli.

Tamamlanma koşulları:

- Okuma kullanıcı eylemiyle tamamlandı.
- Video sürenin en az `%90`ı gerçekten izlendi.
- Flashcard setindeki tüm kartlar en az bir kez cevaplandı; mastery ayrıca gösterilebilir.
- Quiz passScore’u geçti.
- Görev tamamlandı.

Her okuma/video/flashcard/quiz/görev olayından sonra aynı recompute fonksiyonu çalışmalı. Enrollment, Dashboard, Kurslarım ve course player aynı hesaplanmış değeri göstermeli. İstemciden doğrudan overall/enrollment yüzdesi kabul etme.

## 11. Faz 8 — Görev çalışma alanı V2

Mevcut görev başlatma, taslak ve tamamlama akışını koruyarak geliştir:

- `TaskTemplate`: `instructions`, `exampleOutput`, `checklist` JSON, `rubric` JSON alanları.
- `TaskAssignment`: `reviewStatus`, `feedback`, `submittedAt`, `reviewedAt` alanları.
- Pilot 30 göreve konuya özgü checklist, örnek çıktı ve 3 maddelik rubric ekle.
- Kullanıcı boş cevapla görevi tamamlayamasın; anlamlı minimum uzunluk template’e göre doğrulansın.
- Taslak kaydetme completion sayılmasın.
- Kullanıcı tamamlamadan önce rubric/checklist’i görsün.
- Tamamlandıktan sonra cevap, teslim zamanı ve değerlendirme durumu görünsün.
- AI sağlayıcısı yoksa sahte AI geri bildirimi üretme. Yerel rubric kontrolü göster ve “Mentor değerlendirmesi kullanılamıyor” durumunu açıkça belirt.
- Dosya yükleme eklenirse mevcut güvenli document altyapısını yeniden kullan; MIME/size/sahiplik kontrollerini atlama.

## 12. Faz 9 — Dashboard ve kişiselleştirme

Dashboard’a şu blokları ekle veya mevcut bloklarla birleştir:

- Kaldığın ders ve sıradaki öğrenme adımı.
- Bugün tekrar edilecek flashcard sayısı.
- Devam eden görevler gerçek görev başlığıyla.
- Son quiz sonucu.
- Haftalık öğrenme süresi.
- Pilot içerik için önerilen video.

Öneriler işletme profili, assessment öncelikleri, tamamlanmamış kurslar ve due flashcard’lardan türesin. Kullanıcıya aynı tamamlanmış içeriği sürekli önermesin.

## 13. Faz 10 — Yönetim ve yayın iş akışı

Admin KO düzenleme/review ekranına flashcard ve video yönetimini ekle:

- Flashcard listele, oluştur, düzenle, sırala, draft/publish.
- Video metadata, script, transcript, altyazı, thumbnail ve playback URL’sini görüntüle/düzenle.
- Video dosyası/URL’si ve transcript yoksa publish engellensin.
- Bir flashcard’ın önü/arkası boşsa publish engellensin.
- Yayın ve güncelleme AuditLog’a yazılsın.
- KO archive edilirse bağlı medya learner endpoint’inden görünmesin; fiziksel medyayı otomatik silme.
- İçerik sürümü değiştiğinde video/flashcard için “review due” uyarısı üret.

## 14. Faz 11 — Testler

Backend testleri:

- Flashcard published-only ve kullanıcı izolasyonu.
- 4 rating için aralıklı tekrar tarihleri.
- Due queue.
- Flashcard pilot seed idempotency ve tam 150 kart.
- Video published-only ve kullanıcı izolasyonu.
- Video progress normal akış, anormal delta ve `%90` completion.
- Video içerik manifestinde 30 eksiksiz ve benzersiz üretim paketi doğrulaması.
- Playback URL’si olmadan video publish edilemediği testi.
- Progress V2: tüm bileşenler, eksik bileşen yeniden dağıtımı ve legacy okuma-only.
- Görev boş teslim engeli, taslak ve tamamlanma.
- Admin publish kapıları.

Frontend RTL testleri:

- Flashcard cevap gösterme ve rating gönderme.
- Due deck ilerleme.
- Video kaldığı yerden devam ve transcript paneli.
- Ders adımlarının doğru durumları.
- Quiz seçenek seçme/gönderme.
- Görev başlatma isteğinin `{}` gövdeli olması.
- Görev checklist/rubric ve boş teslim uyarısı.
- KO’dan doğru kursa gitme ve enrollment.

Mümkünse gerçek tarayıcı E2E ekle; yeni büyük bağımlılık indirmek mümkün değilse mevcut Vitest/RTL ve Fastify inject ile kullanıcı yolculuğunu kapsa. Testlerin aynı SQLite dosyasında paralel yarış oluşturmasına izin verme.

## 15. Faz 12 — Erişilebilirlik, mobil ve hata durumları

- Öncelikli cihaz mobildir.
- 360 px genişlikte course player, video, flashcard, quiz ve görev kullanılabilmeli.
- Radio, button, dialog ve media kontrollerinin erişilebilir isimleri olmalı.
- Sadece renkle durum anlatma.
- Boş/yükleniyor/hata/yeniden dene durumları görünür olmalı.
- API hatalarını sessizce yutma.
- Türkçe mojibake bırakma; tüm kaynaklar UTF-8.
- Video için transcript, altyazı ve klavyeyle kontrol zorunlu.

## 16. Zorunlu doğrulama komutları

Uygulama sonunda aşağıdakilerin tamamını çalıştır:

```powershell
npm.cmd run db:generate
npm.cmd run build
npm.cmd run validate:migrations
npm.cmd run courses:verify
npm.cmd run curriculum:verify-published
npm.cmd run knowledge:verify-expansion
npm.cmd run learning:pilot:verify
npm.cmd run flashcards:verify-pilot
npm.cmd run videos:verify-packages
npm.cmd run videos:verify-published
npm.cmd test -- --reporter=dot
cd frontend
npm.cmd test
npm.cmd run build
```

Fresh migration doğrulaması için geçici bir veritabanı kullan; gerçek `dev.db`’yi silme veya değiştirme. Seed/import scriptlerini iki kez çalıştırarak idempotency doğrula.

## 17. Tamamlanma ölçütü

Paket ancak aşağıdaki gerçek kullanıcı yolculuğu çalışırsa tamamlanmıştır:

1. Learner giriş yapar.
2. 30 pilot KO’dan birinin bağlı kursuna kaydolur.
3. Kısa özet ve ayrıntılı içeriği okur.
4. Pilot KO’nun video içerik paketinin admin ekranında `script_ready` olduğunu görür; gerçek medya sonradan bağlandıysa videoyu açar, altyazıyı/transcript’i kullanır ve kaldığı yerden devam eder.
5. Beş flashcard’ı cevaplar ve tekrar tarihleri oluşur.
6. Mini quiz’i çözer, açıklamalı sonuç alır.
7. Görevi başlatır, checklist/rubric’i görür, taslak kaydeder ve anlamlı cevapla tamamlar.
8. Ders ilerlemesi bütün bileşenlerden sunucuda hesaplanır.
9. Dashboard aynı ilerlemeyi ve due flashcard’ları gösterir.
10. Sayfa yenilendiğinde tüm ilerleme korunur.
11. Başka kullanıcı bu kullanıcının video, kart veya görev ilerlemesine erişemez.

OpenCode tesliminin tamamlanma ölçütü; video altyapısı, yayın kapısı, render kuyruğu ve 30 doğrulanmış üretim paketinin hazır olmasıdır. Gerçek medya üretilmemişse learner ekranında oynatılamayan video kartı gösterilmemeli ve ürünün video özelliği tamamlandı sayılmamalıdır. Gerçek video üretimi bu paketin dışında ayrı medya üretim işidir.

## 18. Teslim raporu

`LEARNING_EXPERIENCE_V2_REPORT.md` oluştur ve şunları kanıtlarıyla yaz:

- Migration/model/API/frontend dosyaları.
- Başlangıç ve bitiş KO/kurs/ders/quiz/görev sayıları.
- Pilot KO listesi ve kategori dağılımı.
- Flashcard sayısı: hedef 150, gerçek sayı.
- Video içerik paketi: hedef 30, doğrulanan sayı.
- Gerçek oynatılabilir/yayınlanmış video sayısı ayrı raporlansın; OpenCode tesliminde sıfır olabilir.
- Her videonun süre, provider, transcript, captions, thumbnail ve checksum/URL sonucu.
- Test dosyası ve test sayıları.
- Tüm doğrulama komutlarının PASS/FAIL sonuçları.
- 840 KO’nun ve mevcut kullanıcı verilerinin korunduğu kanıtı.
- Yalnızca gerçekten kalan riskler.

`videos:verify-packages` başarısızsa geliştirme paketini tamamlandı sayma. `videos:verify-published` sıfır video bildiriyorsa bunu hata gibi gizleme; `MEDIA_RENDER_PENDING` olarak, etkilenen KO listesiyle raporla. Gerçek medya üretimi ve yayınlanması tamamlanmadan genel ürün için “video özelliği tamamlandı” veya “risk yok” yazma.
