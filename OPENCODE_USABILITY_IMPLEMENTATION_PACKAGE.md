# LocalAkademi — OpenCode Kullanılabilir Ürün Uygulama Paketi

Bu belge OpenCode'a **tek parça halinde** verilmek üzere hazırlanmıştır. Proje kökünde çalıştırılmalıdır.

## OpenCode'a gönderilecek ana komut

```text
LocalAkademi reposunda çalışıyorsun. Amaç, mevcut uygulamayı görsel yeniden tasarıma başlamadan önce gerçek bir kullanıcının uçtan uca kullanabileceği seviyeye getirmektir. Aşağıdaki inceleme bulguları, mimari sınırlar, uygulama sırası ve kabul ölçütlerine eksiksiz uy.

ÇALIŞMA BİÇİMİ

1. Önce repo talimatlarını ve ilgili dosyaları tamamen oku. Var olmayan davranışları varsayma.
2. Değişikliklerden önce kısa bir uygulama planı çıkar; sonra kullanıcıdan tekrar onay istemeden planı uygula.
3. Her faz sonunda ilgili testleri çalıştır. Bir fazın testleri geçmeden sonraki faza geçme.
4. Mevcut kullanıcı değişikliklerini ve verileri koru. İlgisiz dosyaları değiştirme.
5. `git reset --hard`, `git checkout --`, veritabanı reseti, `prisma db push`, toplu seed veya mevcut KO'ları silen komut kullanma.
6. Şema değişikliklerinde yeni ve ileri yönlü Prisma migration oluştur. `prisma/dev.db` içindeki mevcut veriyi koru.
7. Mevcut 600 adet yayımlanmış `CUR-*` KO'yu, 240 adet incelemedeki `KBX-*` KO'yu, kaynak ilişkilerini, quizleri ve görevleri silme veya yeniden üretme.
8. Genel kullanıcıya yalnızca `published`, `isDemo=false` içerik göster. Admin/editör yaşam döngüsünü bozma.
9. Yeni bağımlılığı yalnızca gerçekten gerekli ise ekle; eklediğin bağımlılığı açıkla.
10. Türkçe metinleri UTF-8 olarak koru. Mojibake üretme. PowerShell çıktısındaki görüntü bozulmasını dosya bozulması sanma; Node ile UTF-8 doğrula.
11. Backend: Fastify + TypeScript + Prisma + SQLite. Frontend: React 19 + Vite + React Router + CSS Modules. Mevcut UI bileşenlerini yeniden kullan.
12. API girdilerini Zod ile doğrula; kullanıcı sahipliği kontrollerini her kullanıcı verisinde uygula.
13. Hassas işletme verisini loglama. Hata loglarında token, parola veya finansal form içeriği bulunmasın.

MEVCUT DURUM — KOD İNCELEMESİ BULGULARI

- Router: `frontend/src/router/index.jsx`. Onboarding veya araçlar rotası yok.
- Dashboard: `frontend/src/pages/Dashboard.jsx`; kurs ve kayıt istatistikleri merkezli, bugünkü işletme aksiyonunu öne çıkarmıyor.
- Learner dashboard API: `src/services/learnerDashboard.ts`; KO ilerleme sayıları sabit 0 ve öneriler genel.
- İşletme profili API'si hazır: `GET/PUT /business/business-profile`, `src/services/business.ts`; frontend tarafından kullanılmıyor.
- `BusinessProfile` yalnızca temel finans ve firma alanlarını içeriyor.
- `UserPreference.onboardingCompleted` şemada var fakat endpoint veya onboarding akışı yok.
- Öğrenme yolu: `frontend/src/pages/LearningPathPage.jsx`; kullanıcıdan ham JSON istiyor. Bu bir son kullanıcı arayüzü değildir.
- Learning path API ham `title/pathData` kabul ediyor ve kişisel öneri üretmiyor: `src/services/learningPath.ts`.
- Knowledge listesi `frontend/src/pages/KnowledgePage.jsx` her seviye varyantını ayrı KO olarak gösteriyor. Kullanıcı aynı başlığı tekrar tekrar görebilir.
- `CUR-*` kayıtlarında `metadata.curriculumTopicId`; `KBX-*` kodlarında son parça seviye kodudur. Bunlar tek konu altında gruplanabilir.
- Knowledge detail `frontend/src/pages/KnowledgeDetail.jsx`; kaynak, quiz ve görev blokları var ancak içerik Markdown metni güvenli bir renderer yerine düz metin gibi gösteriliyor.
- Quiz API çalışıyor: `GET /quizzes/:koId`, `POST /quizzes/:koId/attempts`; detail ekranı bunu tamamlanan interaktif akışa bağlamıyor.
- Relational quiz/task verileri mevcut. Metadata quiz yapısı da eski API için korunuyor.
- Görev API'si `src/services/tasks.ts`; atama ve güncelleme var, fakat template kimliğiyle güvenilir ilişki zayıf ve dashboard görev adı `Görev #...` olarak gösteriliyor.
- Formül API'si hazır: `/formulas`, `/formulas/:formulaId/calculate`, `/formula-calculations`; frontend araç ekranı yok. Mevcut formüller: kâr, nakit pozisyonu, ROI.
- Settings sayfası yalnızca kullanıcı ve teknik uygulama bilgisini gösteriyor; işletme profili düzenlenemiyor.
- Mentor ve konuşma altyapısı gelişmiş; kişisel plan/görev/işletme bağlamı sistematik biçimde prompt bağlamına eklenmiyor.
- Kaynaklar detail ekranında mevcut; son kontrol tarihi, otorite ve güncellik durumu kullanıcı dostu güven göstergesine dönüştürülmemiş.
- Frontend için otomatik test altyapısı yok; backend Vitest paketi 431 test içeriyor.

ÜRÜN HEDEFİ

Kullanıcı şu akışı yardımsız tamamlayabilmeli:

Kayıt/Giriş → kısa onboarding → işletme teşhisi → kişisel 30 günlük plan → bugünkü içerik → interaktif quiz → işletmeye uygula görevi → sonucu kaydet → dashboard ilerlemesi → mentorla bağlama duyarlı devam.

FAZ 1 — VERİ MODELİ VE GÜVENLİ MIGRATION

Mevcut modelleri koruyarak aşağıdaki ihtiyacı karşılayan en küçük veri modelini tasarla:

1. `BusinessProfile` genişletmesi:
   - businessStage (opsiyonel string)
   - employeeCount (opsiyonel int)
   - salesChannels (JSON string, default `[]`)
   - primaryGoal (opsiyonel string)
   - weeklyLearningMinutes (opsiyonel int)
   - challenges (JSON string, default `[]`)
2. `UserPreference` mevcut `onboardingCompleted` alanını kullan; yeni kopya alan yaratma.
3. Yeni `BusinessAssessment` modeli:
   - id UUID
   - userId
   - version
   - answers JSON string
   - scores JSON string
   - priorityDomains JSON string
   - recommendations JSON string
   - createdAt
   - user relation ve uygun indexler
4. Yeni `KnowledgeProgress` modeli:
   - id UUID
   - userId, koId
   - status: not_started/in_progress/completed
   - progressPercent
   - startedAt/completedAt/lastViewedAt
   - user ve KO relationları
   - `@@unique([userId, koId])`
5. Gerekirse `TaskAssignment` modeline nullable `taskTemplateId` relation ekle. Eski `taskId` alanını kaldırma; geriye uyumluluğu koru.

Migration güvenli olmalı ve mevcut veri kaybı yaratmamalı. Prisma client'ı güncelle.

FAZ 2 — ONBOARDING VE İŞLETME PROFİLİ API

Backend'de ayrı ve test edilebilir bir onboarding/profile servisi oluştur veya business servisini düzenli biçimde genişlet.

Gerekli endpointler:

- `GET /onboarding/status`
- `GET /onboarding/profile`
- `PUT /onboarding/profile`
- `POST /onboarding/complete`
- `POST /onboarding/reset` yalnızca kullanıcının kendi onboarding durumunu sıfırlar; işletme verisini silmez.

Kurallar:

- Tüm endpointler auth gerektirir.
- Kullanıcı yalnızca kendi kaydını okuyup değiştirebilir.
- Finansal değerler opsiyoneldir; kullanıcı paylaşmadan onboarding tamamlanabilir.
- employeeCount >= 0, weeklyLearningMinutes makul sınırlar içinde olmalı.
- salesChannels ve challenges kontrollü enum/listelerden gelmeli; sınırsız serbest JSON kabul etme.
- `complete`, gerekli minimum alanlar yoksa 422 dönmeli.
- `/auth/me` yanıtına geriye uyumlu biçimde `onboardingCompleted` eklenebilir veya status çağrısı AuthContext tarafından ayrıca yapılabilir.

Frontend:

- `frontend/src/pages/OnboardingPage.jsx` ve CSS Module oluştur.
- Rota: `/app/onboarding`.
- Giriş sonrası onboarding tamamlanmadıysa kullanıcı onboarding'e yönlendirilsin; onboarding rotasında redirect döngüsü oluşmasın.
- 4 kısa adım: işletme → kanallar/ölçek → sorunlar/hedef → zaman ve özet.
- İlerleme göstergesi, geri/ileri, kaydet ve devam et davranışı olsun.
- Finansal alanlar “isteğe bağlı” olarak açıkça işaretlensin.
- Tamamlanınca otomatik teşhise geçsin.
- Settings sayfasını gerçek “Profil ve Tercihler” sayfasına dönüştür; işletme profili burada düzenlenebilsin.

FAZ 3 — AÇIKLANABİLİR İŞLETME TEŞHİSİ

Deterministik, versiyonlu bir assessment tanımı oluştur. İlk sürümde şu 8 alanı kullan:

- Finansal Yönetim
- Satış ve Müşteri
- Operasyon ve Kalite
- İnsan ve İş Güvenliği
- Tedarik Zinciri
- Siber Güvenlik ve Veri
- İhracat Hazırlığı
- Yapay Zekâ Hazırlığı

Her alan için 3 kısa soru, toplam 24 soru. Her cevap 0–4 puan. Sorular ve puanlama backend'de tek kaynak olsun; frontend kopyası olmasın.

Endpointler:

- `GET /assessments/current-definition`
- `POST /assessments` — cevapları doğrula, puanları hesapla, kaydet
- `GET /assessments/latest`
- `GET /assessments/history` — tarih ve özet, kullanıcıya ait

Yanıt:

- Her alan 0–100 puan
- en güçlü iki alan
- en öncelikli üç alan
- her öncelik için kısa açıklama
- ilk önerilen yayımlanmış KO/topic
- puanın nasıl hesaplandığına dair açıklama

Öneri motoru hardcoded KO ID kullanmasın. Yayımlanmış `CUR-*` ve daha sonra yayımlanabilecek `KBX-*` kayıtlarını kategori/metadata/kod üzerinden güvenli biçimde bulsun. Uygun içerik yoksa dürüst fallback dönsün.

Frontend:

- `/app/assessment` sayfası.
- Tek soruluk veya alan bazlı küçük adımlar.
- Sonuçta sade radar zorunlu değil; erişilebilir yatay puan çubukları kullan.
- Öncelik kartlarının her birinde “Planıma ekle” veya otomatik plan oluşturma CTA'sı olsun.

FAZ 4 — KONU GRUPLAMA VE TEKRARSIZ KATALOG

Mevcut KO kayıtlarını silmeden kullanıcıya konu grubu sun.

Yeni public endpointler:

- `GET /api/v2/knowledge-topics`
- `GET /api/v2/knowledge-topics/:topicKey`

Gruplama:

- `CUR-*`: `metadata.curriculumTopicId` topicKey.
- `KBX-*`: kodun son seviye parçasını çıkararak topicKey üret; sadece published varyantları göster.
- Diğer gerçek KO'lar: code üzerinden tekil topic.
- Yalnızca published ve isDemo=false.
- Her topic yanıtında: topicKey, title, category, subcategory, availableLevels, defaultVariant, estimatedTime, sourceCount, updatedAt.
- Başlangıç/Orta/İleri sıralaması deterministik olsun.
- Filtreler: search, category, level, page, pageSize, sort.
- Arama topic başlığı ve ilgili varyant içeriğinde çalışabilir; sonuç tek topic olmalı.

KnowledgePage'i bu endpointlere geçir. Tek konu kartı göster; kart üzerinde mevcut seviyeler yer alsın. Kullanıcı seviyeyi karttan veya detail sayfasından seçebilsin.

Detail rotasını geriye uyumlu tut. Tercihen `/app/knowledge/topic/:topicKey?level=...` ekle; eski `/app/knowledge/:code` linkleri çalışmaya devam etsin.

FAZ 5 — BİRLEŞİK ÖĞRENME OTURUMU

Knowledge detail sayfasını işlevsel öğrenme oturumuna dönüştür:

1. Başlık, seviye seçici, süre, kategori, güven durumu.
2. Güvenli Markdown renderer. `react-markdown` + `remark-gfm` kullanılabilir; raw HTML çalıştırma, `rehype-raw` ekleme.
3. Okumaya başlayınca KnowledgeProgress in_progress ve lastViewedAt güncellensin.
4. İçerik sonrasında gerçek interaktif quiz:
   - GET quiz
   - seçenek seçimi
   - tüm sorular cevaplanınca submit
   - skor, geçti/kaldı, açıklamalar
   - doğru cevap submit öncesi frontend payloadında veya public API'de sızmamalı
5. Görev:
   - TaskTemplate'i güvenilir template ID ile ata
   - kullanıcı metin cevabı/not girebilsin
   - taslak kaydetme
   - tamamla
   - dashboard'a yansısın
6. İçerik + quiz + görev tamamlandığında progress completed olsun ve `ActivityEvent` oluşturulsun.
7. Sayfadan çıkıp dönünce durum korunsun.
8. Sonraki önerilen konu gösterilsin.

Yeni progress endpointleri:

- `GET /progress/knowledge/:koId`
- `PUT /progress/knowledge/:koId`
- `GET /progress/summary`

Task API'yi templateId ile güvenli hale getir; metadata string araması temel yöntem olmasın. Eski endpointi geriye uyumlu tut.

FAZ 6 — KİŞİSEL 30 GÜNLÜK PLAN

Ham JSON öğrenme yolu arayüzünü tamamen kaldır. Kullanıcıya JSON textarea gösterme.

Backend plan üretimi deterministik ve açıklanabilir olsun:

- latest assessment öncelikleri
- işletme primaryGoal
- weeklyLearningMinutes
- published topic varyantları
- kullanıcının tamamladığı KO'lar

üzerinden 4 haftalık plan üret.

Endpointler:

- `POST /learning-path/generate-personalized`
- `GET /learning-path/current` mevcut yanıtı normalize ederek döndürsün
- `PATCH /learning-path/:id/steps/:stepId` — tamamla/ertelemek için kullanıcı sahipliği kontrolü
- Eski `generate` endpointini admin/geriye uyumluluk için koruyabilirsin ancak frontend kullanmasın.

Plan kuralları:

- Haftalık toplam süre kullanıcının ayırdığı süreyi aşmasın.
- Önce başlangıç seviyesi veya kullanıcının assessment seviyesine uygun varyant.
- Aynı topic bir planda tekrar etmesin.
- Her adım yayımlanmış KO code/id içersin.
- İlk hafta en fazla 3 adım.
- Her hafta en az bir uygulama görevi içersin.

LearningPathPage:

- 30 günlük hedef
- hafta grupları
- adım durumu
- tahmini süre
- içeriğe git CTA
- ertele/tamamla
- planı yeniden üret (uyarı ve onayla)

FAZ 7 — İŞLETME ARAÇLARI

Yeni rota `/app/tools` ve sidebar bağlantısı “İşletme Araçları”.

İlk sürümde mevcut API'leri gerçekten kullanan üç araç:

- Kâr hesabı
- Nakit pozisyonu
- ROI

Ardından aynı servis içinde doğrulanmış hesaplarla şu üç aracı ekle:

- Birim maliyet
- Başabaş noktası
- Satış fiyatı / brüt marj simülatörü

Kurallar:

- Zod ile formül bazlı input doğrulama.
- NaN/Infinity, negatif olamayacak alanlar ve sıfıra bölme korunmalı.
- Formül, varsayım ve uyarı kullanıcıya gösterilmeli.
- Hesaplama kaydedilmeli ve geçmiş listelenmeli.
- “İlgili eğitime git” bağlantısı published topic üzerinden bulunmalı; sabit ID kullanma.
- Finansal danışmanlık uyarısı ölçülü biçimde yer alsın.

FAZ 8 — DASHBOARD'U AKSİYON MERKEZİNE DÖNÜŞTÜR

Mevcut altı istatistik kartını ana odak olmaktan çıkar. Yeni sıra:

1. Bugünkü sonraki adım (tek bir güçlü CTA)
2. Aktif 30 günlük plan ve haftalık ilerleme
3. En öncelikli assessment alanları
4. Açık uygulama görevleri — gerçek görev başlığıyla, `Görev #id` değil
5. Son hesaplama ve önceki sonuçla kıyas
6. Mentor önerisi
7. Son aktiviteler

`src/services/learnerDashboard.ts` içindeki sabit KO progress değerlerini gerçek KnowledgeProgress verisinden hesapla. Önerileri assessment ve tamamlanmış içeriklere göre kişiselleştir. Boş durumda kullanıcıyı doğru ilk adıma yönlendir:

- onboarding yok → onboarding
- assessment yok → assessment
- plan yok → plan oluştur
- plan var → sıradaki adım

FAZ 9 — MENTOR BAĞLAMI

Mentor prompt/context hazırlığında kullanıcının izinli bağlamını ekle:

- işletme profilinin hassas olmayan alanları
- assessment öncelikleri
- aktif plan
- açık görevler
- tamamlanan topicler
- son hesaplama özetleri

Finansal tutarları prompta otomatik ekleme; kullanıcı ayarı/isteği veya açık gerekli bağlam yoksa yalnızca oran/özet kullan. Kaynaklı KO erişimi published-only kalmalı. Mentor yanıtında ilgili topic ve araç linkleri için yapılandırılmış metadata üretilebiliyorsa mevcut API'yi bozmadan ekle.

FAZ 10 — KAYNAK VE GÜVEN GÖSTERGELERİ

Knowledge detail kaynak alanında:

- kaynak adı
- yayıncı
- authorityLevel
- lastChecked
- relation/note
- URL
- güncellik etiketi

göster.

Kaynak eskiyse kullanıcı dostu uyarı ver. Cadence bilgisi Source modelinde yoksa metadata/library dosyasını runtime'da bağlama; bunun yerine gerekiyorsa Source'a nullable `reviewCadenceDays` ve `volatile` alanları için migration ekle ve import scriptini güncelle. En küçük güvenilir çözümü seç.

FAZ 11 — TESTLER VE KABUL

Backend testleri ekle:

- onboarding sahipliği ve doğrulama
- assessment puanlama deterministikliği
- assessment sahipliği
- topic grouping ve published-only güvenliği
- progress sahipliği
- task template güvenliği
- personalized planın süre ve tekrar kuralları
- dashboard boş durum karar ağacı
- formül edge case'leri
- mentor unpublished KO sızıntısı olmaması

Frontend için Vitest + React Testing Library altyapısı ekle. En az şu kritik akışları test et:

- onboarding adımları ve validasyon
- assessment cevaplama
- tekrarsız topic listesi
- seviye seçimi
- quiz submit
- görev taslak/tamamlama
- dashboard doğru sonraki CTA

Erişilebilirlik:

- Klavye ile temel akış tamamlanabilmeli.
- Form label ve hata ilişkileri kurulmalı.
- Yalnızca renkle durum anlatılmamalı.
- Focus görünür olmalı.
- Dialog varsa focus trap/escape davranışı olmalı.

SON DOĞRULAMA KOMUTLARI

Windows PowerShell ortamında uygun `.cmd` komutlarını kullan:

- `npm.cmd run db:generate`
- `npm.cmd run validate:migrations`
- `npm.cmd run build`
- `npm.cmd test`
- `npm.cmd --prefix frontend run build`
- frontend test scripti eklediysen `npm.cmd --prefix frontend test`
- `npm.cmd run verify:release`
- `npm.cmd run secret:scan`
- `npm.cmd run curriculum:verify-published`
- `npm.cmd run knowledge:verify-expansion`

KABUL ÖLÇÜTLERİ

1. Yeni kullanıcı 5 dakika içinde onboarding'i tamamlayıp assessment'a ulaşır.
2. Assessment sonucu açıklanabilir 0–100 alan puanları üretir.
3. Kullanıcı ham JSON görmeden kişisel 30 günlük plan alır.
4. Knowledge katalogunda seviye varyantları ayrı tekrarlar olarak görünmez.
5. Kullanıcı içerik → quiz → görev → tamamlanma akışını tek oturumda bitirebilir.
6. Durum sayfa yenileme ve yeni oturum sonrası korunur.
7. Dashboard her kullanıcı için tek bir mantıklı “sonraki adım” gösterir.
8. En az 6 işletme aracı çalışır ve hesaplama geçmişini kaydeder.
9. Kaynak ve güncellik bilgisi detail ekranında görünür.
10. Mentor yalnızca published KO kullanır ve kullanıcı planını bilir.
11. Mobil 360px genişlikte onboarding, assessment, dashboard, topic detail ve araç akışları kullanılabilir.
12. Mevcut 600 published CUR kaydı korunur; 240 KBX kaydı yanlışlıkla yayımlanmaz.
13. Tüm backend/frontend/build/release testleri geçer.

TESLİM RAPORU

İş bittiğinde şu formatta rapor ver:

- Uygulanan fazlar
- Oluşturulan migrationlar
- Yeni/değişen endpointler
- Yeni/değişen ekranlar
- Veri koruma doğrulaması: CUR published sayısı ve KBX status dağılımı
- Çalıştırılan testler ve sonuçları
- Bilinen sınırlamalar
- Estetik fazına geçmeden önce önerilen 5 kullanıcı testi

Bu görevde geniş kapsamlı estetik yeniden tasarım yapma. Mevcut tasarım tokenlarını ve bileşenlerini kullan; yalnızca yeni akışların okunabilir ve kullanılabilir olması için gereken CSS'i ekle. Marka, renk, tipografi ve animasyon yenilemesi ayrı fazda yapılacak.
```

## OpenCode tamamladıktan sonra gönderilecek doğrulama komutu

```text
Az önce uyguladığın LocalAkademi kullanılabilirlik geliştirmesini bağımsız bir release-candidate denetimi gibi incele. Yeni özellik ekleme. Önce git diff ve migrationları denetle; sonra veri kaybı, auth/sahiplik, unpublished KO sızıntısı, tekrarlı topic, quiz doğru cevap sızıntısı, XSS/Markdown, formül edge case, onboarding redirect döngüsü, mobil taşma ve erişilebilirlik sorunlarını ara. Bulduğun sorunları önem sırasıyla düzelt. Mevcut 600 CUR kaydının published ve 240 KBX kaydının önceki statülerinin korunduğunu sayımla doğrula. Backend testleri, frontend testleri, iki build, migration validation, release verification ve secret scan çalıştır. Sonuçları PASS/FAIL tablosuyla raporla; başarısız veya çalıştırılamayan kontrolü gizleme.
```

## Kullanılabilir sürüm onaylandıktan sonra gönderilecek estetik keşif komutu

Bu komut yalnızca işlevsel paket ve doğrulama tamamlandıktan sonra kullanılmalıdır.

```text
LocalAkademi'nin artık çalışan kullanıcı akışlarını değiştirmeden estetik yenileme için bir tasarım keşfi yap. Kod değiştirme. Mevcut ekranları, CSS tokenlarını, bileşenleri, responsive davranışı ve bilgi yoğunluğunu incele. Ürünü “sakin, güvenilir, sıcak ve sonuç odaklı KOBİ çalışma alanı” yönünde geliştirmek için 3 farklı görsel yön öner. Her yön için renk sistemi, tipografi, spacing, kart kullanımı, veri görselleştirme, ikonografi, mobil navigasyon ve mikro etkileşim yaklaşımını belirt. Ardından tek bir yön öner ve ekran bazlı uygulama sırası, tasarım token değişiklikleri, erişilebilirlik kriterleri ve görsel regresyon kontrol listesini içeren uygulanabilir bir estetik plan hazırla. İşlevsel API, veri modeli ve kullanıcı akışlarını değiştirme.
```

## İnceleme özeti

Bu paketin özellikle hedeflediği gerçek sorunlar:

- Uygulamanın kurs/istatistik merkezli olması, işletme aksiyonu merkezli olmaması.
- Onboarding alanının şemada bulunup üründe çalışmaması.
- İşletme profili ve formül altyapısının frontend'e bağlanmamış olması.
- Öğrenme yolu ekranının son kullanıcıdan ham JSON istemesi.
- 600 seviye varyantının katalogda tekrar oluşturması.
- İçerik, quiz ve görevin tamamlanmış bir ilerleme döngüsü oluşturmaması.
- Görevlerin kullanıcıya gerçek başlık yerine teknik ID ile gösterilmesi.
- Dashboard KO ilerleme değerlerinin gerçek veriden gelmemesi.
- Mentorun işletme hedefi ve aktif plan bağlamını sistematik kullanmaması.
- Kaynak verisi bulunmasına rağmen güven/güncellik bilgisinin yeterince görünür olmaması.

