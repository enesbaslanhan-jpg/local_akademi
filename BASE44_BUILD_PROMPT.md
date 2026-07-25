# Base44 Ana Üretim Talimatı — LocalAkademi Paralel Prototipi

Bu talimatı Base44 uygulama oluşturma ekranına ver.

---

Türkiye'deki KOBİ'ler, esnaf ve girişimciler için Türkçe çalışan, yapay zekâ destekli bir öğrenme ve işletme gelişim platformu oluştur.

Uygulamanın adı: **LocalAkademi**

## Ürün hedefi

LocalAkademi yalnızca bir kurs sitesi veya genel sohbet uygulaması değildir. Kullanıcının işletmesini tanıyan, güvenilir eğitim içeriğinden yararlanan, görevler veren, quizlerle öğrenmeyi ölçen ve işletme verilerini anlamlandıran bir AI işletme mentorudur.

Bu çalışma mevcut LocalAkademi uygulamasının yerine hemen geçmeyecek. Ayrı ve güvenli bir paralel prototip olacak. Mevcut production verisi içe aktarılmayacak; başlangıçta yalnız sentetik demo verisi kullanılacak.

## Dil ve tasarım

- Uygulamanın bütün kullanıcı metinleri Türkçe olsun.
- Modern, güvenilir, sade ve mobil öncelikli bir arayüz kullan.
- Finans/muhasebe yazılımı kadar ağır görünmesin; profesyonel bir öğrenme ve işletme koçu hissi versin.
- Ana renkler lacivert, turkuaz ve açık nötr tonlar olabilir.
- Erişilebilir kontrast, klavye navigasyonu, açık hata mesajları ve boş durumlar sağla.
- Mobil, tablet ve masaüstünde düzgün çalışsın.

## Roller

### Öğrenen kullanıcı

- Kendi profilini, işletme bilgilerini, sohbetlerini, görevlerini, quiz denemelerini ve ilerlemesini görebilir.
- Başka kullanıcıların hiçbir verisini göremez veya değiştiremez.
- Yalnız yayımlanmış Knowledge Object içeriklerine erişebilir.

### Uzman

- Taslak içerikleri inceleyebilir.
- Onay, değişiklik isteği veya ret kararı verebilir.
- Kendisine atanmamış yönetim işlemlerini yapamaz.

### Admin

- Kullanıcıları ve rolleri yönetebilir.
- Knowledge Object oluşturabilir, düzenleyebilir, incelemeye gönderebilir ve yayımlayabilir.
- Kaynakları, görevleri, quizleri ve denetim kayıtlarını görebilir.

Rol kontrollerini yalnız arayüzde gizleme ile yapma; veri ve backend erişim kurallarıyla uygula.

## Veri modelleri

### UserProfile

- userId
- displayName
- role: learner | expert | admin
- onboardingCompleted
- createdAt
- updatedAt

### BusinessProfile

- userId — kullanıcı başına tek kayıt
- businessName
- sector
- city
- currency — varsayılan TRY
- monthlySales
- monthlyExpenses
- cashBalance
- debtBalance
- goals
- challenges
- createdAt
- updatedAt

Finansal alanlar sonlu, sıfır veya pozitif ve makul üst sınırlı sayı olmalı.

### Category

- name
- slug — unique
- description
- isActive
- sortOrder

### KnowledgeObject

- code — unique
- title
- summary
- content
- type
- difficulty
- categoryId
- status: draft | in_review | approved | published | archived
- version
- createdBy
- updatedBy
- publishedAt
- createdAt
- updatedAt

Normal kullanıcı sorgularında yalnız `status = published` kayıtlarını döndür.

### Source

- title
- organization
- url
- publicationDate
- sourceType
- reliabilityLevel
- notes
- createdAt
- updatedAt

### KnowledgeObjectSource

- knowledgeObjectId
- sourceId
- citationNote
- isPrimary

### ReviewRecord

- knowledgeObjectId
- reviewerId
- decision: approved | changes_requested | rejected
- comment
- createdAt

### Conversation

- userId
- title
- archivedAt
- deletedAt
- lastMessageAt
- model
- provider
- createdAt
- updatedAt

### ConversationMessage

- conversationId
- role: user | assistant | system | tool
- content
- citations
- knowledgeObjectIds
- tokenUsage
- error
- deletedAt
- createdAt

### UserMemory

- userId
- key
- value
- type
- sensitivity
- status
- expiresAt
- createdAt
- updatedAt

Hassas bilgi memory veya AI prompt'una kontrolsüz eklenmemeli.

### TaskTemplate

- knowledgeObjectId
- title
- description
- instructions
- estimatedMinutes
- isActive

### TaskAssignment

- userId
- taskTemplateId
- status: assigned | in_progress | completed | cancelled
- progressPercent
- answers
- assignedAt
- completedAt
- updatedAt

### Quiz

- knowledgeObjectId
- title
- passingScore
- isActive

### QuizQuestion

- quizId
- question
- questionType
- options
- correctAnswer
- explanation
- sortOrder

Doğru cevap normal quiz yükleme yanıtında kullanıcıya gönderilmemeli.

### QuizAttempt

- userId
- quizId
- score
- passed
- answers
- feedback
- createdAt

### UploadedDocument

- userId
- originalName
- storedName
- detectedType
- sizeBytes
- extractedText
- status
- createdAt

Dosyalar kullanıcıya izole olmalı. Başka kullanıcı belgeyi okuyamaz, silemez veya belgeye soru soramaz.

### FormulaDefinition

- code
- name
- description
- inputSchema
- version
- isActive
- warning

### FormulaCalculation

- userId
- formulaCode
- formulaVersion
- inputs
- result
- createdAt

### AuditLog

- actorUserId
- action
- entityType
- entityId
- safeMetadata
- createdAt

Audit kayıtları append-only olmalı; parola, token, API anahtarı, tam prompt veya hassas finansal payload içermemeli.

## Ana kullanıcı akışı

### 1. Onboarding

Kullanıcıdan:

- Ad
- İşletme adı
- Sektör
- Şehir
- Satış kanalı
- İşletme hedefleri
- Temel sorunlar

bilgilerini al. Kullanıcı onboarding'i atlayabilsin ve daha sonra tamamlayabilsin.

### 2. Kullanıcı dashboard'u

Dashboard şu soruya cevap versin: **Bugün ne yapmalıyım?**

Göster:

- Bugünkü önerilen görev
- Devam edilen öğrenme içeriği
- Son AI sohbeti
- Tamamlanan görev oranı
- Quiz ortalaması
- İşletme özeti: satış, gider, tahmini kâr, nakit pozisyonu
- AI tarafından hazırlanan güvenli sonraki adım önerisi

Veri yoksa sahte başarı veya uydurma KPI gösterme; açıklayıcı boş durum kullan.

### 3. Bilgi merkezi

- Kategori filtreleme
- Arama
- Zorluk ve içerik türü filtreleri
- Knowledge Object detay sayfası
- Kaynak listesi
- İlgili görev ve quiz
- “AI Mentora Sor” eylemi

### 4. AI Mentor

- Yeni sohbet oluşturma
- Sohbet listesi
- Mesaj geçmişi
- Sohbet başlığını değiştirme
- Arşivleme/soft delete
- Streaming yanıt görünümü
- Kullanılan Knowledge Object ve kaynakları gösterme
- Kullanıcıya ait işletme profili ve izinli memory ile kişiselleştirme

AI kuralları:

- Önce yayımlanmış LocalAkademi içeriğini kullan.
- Kullanılan kaynakları cevap altında göster.
- Kaynak bulunmuyorsa bunu açıkça belirt.
- Hukuk, vergi, sağlık ve yatırım konularında kesin hüküm verme; uygun uzman uyarısı göster.
- Başka kullanıcı verisini bağlama ekleme.
- Hassas veriyi prompt'a göndermeden önce maskele.
- AI başarısızsa uydurma yanıt üretme; güvenli hata ve yeniden deneme göster.

### 5. Görevler

- Atanan görev listesi
- Görev detayı
- İlerleme kaydı
- Tamamlama
- Kullanıcının yalnız kendi atamalarına erişimi

Veritabanı yazması başarısızsa tamamlandı gösterme.

### 6. Quiz

- Yalnız yayımlanmış KO quizleri
- Cevap gönderme
- Sunucu tarafında puanlama
- Sonuç ve açıklama
- Deneme geçmişi

Kayıt başarısızsa sahte attempt ID veya başarılı sonuç üretme.

### 7. İşletme paneli

- Profil düzenleme
- Aylık satış
- Aylık gider
- Nakit
- Borç
- Tahmini kâr
- Kâr marjı
- Net nakit pozisyonu

Bu alan ilk prototipte manuel veriyle çalışsın. Banka veya muhasebe entegrasyonu kurma.

### 8. Admin içerik operasyonu

- KO listeleme ve filtreleme
- Taslak oluşturma/düzenleme
- Kaynak bağlama
- İncelemeye gönderme
- Uzman kararı
- Admin yayınlama
- Sürüm ve audit geçmişi

Taslak içerik normal kullanıcı API'lerinden erişilememeli.

## Güvenlik gereksinimleri

- Tüm kullanıcıya ait sorgular oturum kullanıcısının kimliğiyle filtrelenmeli.
- İstemciden gelen `userId` güvenilir kabul edilmemeli.
- Admin/uzman işlemleri backend permission kontrolü gerektirmeli.
- Login, AI, quiz gönderme ve belge yükleme uçlarında rate limit uygula.
- Dosya uzantısı veya istemci MIME değerine tek başına güvenme.
- Kullanıcı başına belge kotası uygula.
- Hatalarda stack trace, SQL, disk yolu veya secret gösterme.
- Yazma başarısızsa başarılı cevap verme.
- Soft delete gereken conversation/message içeriklerinde uygulanmalı.
- Kritik admin ve yayın işlemlerini AuditLog'a yaz.

## İlk prototip kapsamı

İlk üretimde yalnız şu modülleri uçtan uca tamamla:

1. Auth ve rol sistemi
2. Onboarding ve BusinessProfile
3. Published Knowledge Object liste/detay
4. Kalıcı AI conversation ekranı
5. Görev atama ve ilerleme
6. Quiz ve attempt geçmişi
7. Kullanıcı dashboard'u
8. Admin KO ve review akışı
9. Audit log

Şunları ilk üretime ekleme:

- Mobil mağaza paketi
- Ödeme sistemi
- Trendyol/Shopify/Paraşüt entegrasyonları
- Çoklu ajan sistemi
- Liderlik tablosu
- Sertifika
- Gelişmiş gamification
- Otomatik banka verisi
- 11 formülün tamamı

## Demo verileri

Production veya gerçek kullanıcı verisi kullanma.

Sentetik olarak oluştur:

- 1 learner
- 1 expert
- 1 admin
- 5 kategori
- 10 yayımlanmış KO
- 2 taslak KO
- Her yayımlanmış KO için kaynak, bir görev ve kısa quiz
- Örnek işletme profili
- Örnek conversation

Demo parolalarını veya secret değerlerini uygulama koduna gömme.

## Kabul kriterleri

- Kullanıcı başka kullanıcının profil, sohbet, memory, görev, quiz ve belgesine erişemez.
- Taslak KO normal kullanıcıya hiçbir liste/detay/quiz/AI retrieval yolundan sızmaz.
- DB yazma hatalarında sahte başarı oluşmaz.
- AI cevabı kaynak veya “kaynak bulunamadı” durumu gösterir.
- Admin yayın akışı audit kaydı üretir.
- Mobil ve masaüstü temel akışları çalışır.
- Bütün boş, loading, hata ve yetkisiz durumlar tasarlanmıştır.

Önce veri modellerini ve erişim kurallarını kur. Sonra ekranları ana kullanıcı akışı sırasıyla üret. Her aşamada mevcut çalışan parçaları koru; toplu ve kontrolsüz yeniden üretim yapma.

