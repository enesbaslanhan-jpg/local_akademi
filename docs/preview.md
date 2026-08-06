# LocalAkademi — Güncel Ürün, İçerik ve Teknik Master Dokümanı

**Belge adı:** `LocalAkademi_Guncel_Master_v3_6.md`  
**Sürüm:** 3.6  
**Durum:** Güncel ana referans  
**Son güncelleme:** 5 Ağustos 2026  
**Proje:** LocalAkademi  

---

## 1. Belgenin Amacı ve Yetkisi

Bu doküman LocalAkademi projesinin güncel ürün kararlarını, içerik standartlarını, teknik yaklaşımını, güvenlik kurallarını ve geliştirme önceliklerini tek bir ana kaynakta toplar.

Bu belge:

- projenin ne olduğunu ve ne olmadığını açıklar,
- hedef kullanıcıları ve temel problemleri tanımlar,
- güncel ürün modüllerini sabitler,
- kaldırılmış veya değiştirilmiş özellikleri kaydeder,
- kurs, rehber ve Karar Aracı standartlarını belirler,
- AI Mentor davranış ve güvenlik sınırlarını tanımlar,
- geliştirme ajanlarının çalışma kurallarını açıklar,
- fazlar arasında bağlam kaybını önler.

Bu belge ayrıntılı araştırma paketlerinin ve teknik tasarım dosyalarının yerine geçmez. Ancak diğer güncel dokümanlar bu master belgeyle çelişmemelidir.

### 1.1 Kaynakların öncelik sırası

Bir çelişki olduğunda aşağıdaki sıra uygulanır:

1. Kullanıcının en son verdiği açık talimat
2. Bu güncel master doküman
3. Repository içindeki doğrulanmış çalışan kod
4. Güncel faz ve teknik tasarım dokümanları
5. Doğrulanmış araştırma paketleri
6. Eski master belgeler
7. Tarihsel taslaklar ve prototipler

> Dokümanda yazan hiçbir özellik, repository içinde doğrulanmadan tamamlanmış kabul edilmez.

Kod mevcut uygulama durumunu; bu doküman ise güncel ürün hedefini ve bağlayıcı kararları gösterir.

> **Denetim notu (bağlayıcı ürün mimarisi bilgisi değildir):** Bu v3.1 güncellemesinin yapıldığı denetim sırasında repository'nin aktif Git branch'i `codex/phase8-product-experience` idi. `CHECKPOINT.md` dosyasındaki eski branch bilgisi (`codex/phase7-ai-redesign`) güncel gerçek olarak kullanılmamalıdır; o dosya kendi kapsamındaki eski bir çalışma noktasını işaret eder. Branch adları bu belgenin kalıcı ürün/mimarisi bölümlerine (§19 vb.) yazılmaz; yalnızca denetim zamanlaması için referanstır.

---

## 2. Proje Tanımı

LocalAkademi; Türkiye’deki esnaf, girişimci, küçük işletme sahibi ve yatırım yapmayı değerlendiren kullanıcıların işletme kararlarını daha bilinçli vermesine yardımcı olan, eğitim ile karar desteğini birleştiren dijital bir platformdur.

Platform yalnızca bilgi sunmaz. Kullanıcının:

- kendi işletme verilerini kullanmasını,
- maliyet ve kârlılık hesabı yapmasını,
- alternatifleri karşılaştırmasını,
- riskleri fark etmesini,
- kararını gerekçelendirmesini,
- uygulanabilir bir sonraki adımı belirlemesini,
- öğrenmeyi gerçek işletme uygulamasına dönüştürmesini

sağlamayı hedefler.

LocalAkademi, klasik çevrim içi kurs platformlarından farklı olarak kullanıcıyı yalnızca içerik tüketmeye değil, karar vermeye ve eyleme geçmeye yönlendirir.

---

## 3. Temel Ürün Vaadi

LocalAkademi’nin temel ürün vaadi:

> Kullanıcının kendi işletmesiyle ilgili gerçek bir sorunu, kendi verileriyle analiz ederek gerekçeli bir karar veya uygulanabilir çıktı üretmesini sağlamak.

Her ana deneyim mümkün olduğunca şu zinciri üretmelidir:

1. Gerçek işletme problemi
2. Kullanıcının mevcut durumu veya verisi
3. Konuya özgü analiz
4. Hesaplama, teşhis ya da karşılaştırma
5. Gerekçeli sonuç
6. Somut sonraki adım
7. İlgili kurs, rehber, Karar Aracı veya AI Mentor desteği

Yalnızca genel bilgi veren ve somut sonuç üretmeyen deneyimler LocalAkademi standardını tam karşılamaz.

---

## 4. Hedef Kullanıcılar

### 4.1 Esnaf

Başlıca ihtiyaçlar:

- fiyat belirleme,
- kâr hesabı,
- maliyet kontrolü,
- stok yönetimi,
- dijital satışa başlama,
- kampanya değerlendirme,
- nakit akışı,
- müşteri kazanımı,
- vergi ve temel yükümlülükleri anlama.

### 4.2 Girişimci

Başlıca ihtiyaçlar:

- iş fikrini değerlendirme,
- hedef müşteriyi belirleme,
- MVP oluşturma,
- pazar testi yapma,
- gelir modeli seçme,
- başlangıç bütçesi hazırlama,
- yatırım hazırlığı,
- büyüme seçeneklerini değerlendirme.

### 4.3 Küçük işletme sahibi

Başlıca ihtiyaçlar:

- operasyonel verimlilik,
- personel ve süreç yönetimi,
- satış kanalı seçimi,
- dijitalleşme,
- performans takibi,
- ürün ve müşteri kârlılığı,
- finansal sürdürülebilirlik.

### 4.4 Yatırım yapmayı veya iş kurmayı değerlendiren kullanıcı

Başlıca ihtiyaçlar:

- yatırımın geri dönüşünü anlamak,
- riskleri sınıflandırmak,
- iş modellerini karşılaştırmak,
- sermaye ihtiyacını tahmin etmek,
- varsayımları test etmek,
- yatırım kararını gerekçelendirmek.

---

## 5. Ürün Tasarım İlkeleri

### 5.1 Mobil öncelikli tasarım

Platform mobil cihazlarda rahat kullanılmalıdır.

- İçerik kartları kolay okunmalıdır.
- Formlar kısa, anlaşılır ve adım adım ilerlemelidir.
- Hesaplamalar küçük ekranda da rahat yapılmalıdır.
- Sonuçlar karşılaştırılabilir biçimde gösterilmelidir.
- Ana eylemler belirgin olmalıdır.
- Masaüstü deneyimi, mobil yapının genişletilmiş hâli olmalıdır.

### 5.2 Sosyal akış hissi, profesyonel amaç

Ana sayfa sosyal medya kadar rahat gezilebilir olabilir; fakat amaç sonsuz içerik tüketimi değildir.

Akış kullanıcıyı şunlara yönlendirmelidir:

- yarım kalan derse devam etme,
- tamamlanmamış Karar Aracını bitirme,
- işletme verisine göre önerilen eylemi uygulama,
- kaydedilen içeriğe dönme,
- önceki kararı yeniden değerlendirme,
- AI Mentor önerisini inceleme,
- öğrenme ilerlemesini kontrol etme.

### 5.3 Eylem odaklılık

Her ana ekran en az bir soruya cevap vermelidir:

- Kullanıcı şimdi ne yapmalı?
- Hangi veriyi girmeli?
- Hangi kararı değerlendirmeli?
- Hangi içeriği tamamlamalı?
- Hangi riski kontrol etmeli?
- Hangi çıktıyı üretmeli?

### 5.4 Açıklanabilirlik

Kullanıcı:

- hangi verilerin kullanıldığını,
- hangi formülün veya kuralın uygulandığını,
- hangi varsayımların yapıldığını,
- sonucun neden üretildiğini,
- sonucun hangi koşullarda değişebileceğini

görebilmelidir.

---

## 6. Güncel Ana Modüller

LocalAkademi’nin güncel ana modülleri:

1. Kişiselleştirilmiş Ana Sayfa
2. Kurslar
3. Rehberler
4. Karar Araçları
5. AI Mentor
6. Öğrenme İlerlemesi
7. Kaydedilenler
8. Tamamlananlar
9. İşletme Bilgileri
10. Kullanıcı Profili
11. Yönetim Paneli
12. Bilgi Nesneleri ve İçerik Yönetimi

### 6.1 Bağımsız ana modül olmayan yapılar

- **Pratik Kartlar**, bağımsız ana modül değildir; kurs ve rehberlerin içine gömülür.
- **Quiz**, güncel ürün planının bir parçası değildir; normal kullanıcı akışından pasifleştirilmiştir (bkz. §7.1). Kod tabanında hâlâ mevcuttur, ancak yeni bir özellik olarak sunulmaz.
- **Flashcard**, güncel ürün planının bir parçası değildir; normal kullanıcı akışından pasifleştirilmiştir (bkz. §7.2). Kod tabanında hâlâ mevcuttur, ancak yeni bir özellik olarak sunulmaz.

---

## 7. Kaldırılan ve Değiştirilen Özellikler

### 7.1 Quiz modülü

> **Ürün kararı kesinleşti (5 Ağustos 2026):** Quiz kullanıcı akışına geri getirilmeyecektir. Bu artık geçici bir deneme değil, ürün sahibinin onayladığı **kalıcı** karardır. Aşağıdaki "soft-retired" teknik açıklama, kararın kod tabanında bugün nasıl uygulandığını anlatır — kararın kendisinin belirsiz veya tartışmaya açık olduğu anlamına gelmez.

Quiz, normal kullanıcı deneyiminden ve ürünün ana akışından **pasifleştirilmiştir (soft-retired)**. Bu, kodun fiziksel olarak silindiği anlamına gelmez.

Gerekçeler:

- hedef kullanıcıların klasik test çözme motivasyonunun düşük olması,
- bilgi ölçmenin tek başına işletme kararı üretmemesi,
- quiz deneyiminin ürünün eylem ve karar odaklı yönüyle tam uyumlu olmaması.

Quiz yerine **Karar Kontrolü / Karar Araçları** yaklaşımı benimsenmiştir. Quiz, güncel ürün kararı olarak **yeniden bir özellik gibi sunulmamalıdır**.

**Repository üzerinden doğrulanmış güncel durum:**

- `Quiz`, `QuizQuestion`, `QuizAttempt` Prisma modelleri kod tabanında hâlâ mevcuttur (`prisma/schema.prisma`).
- `/quizzes` altındaki route'lar `src/index.ts` içinde hâlâ kayıtlıdır; ilgili servis dosyaları (`src/services/quizzes.ts`, `quiz-engine.ts`, `quiz-generator.ts`) silinmemiştir.
- Frontend'de `QuizDashboardPage.jsx` gibi eski sayfalar kod tabanında durmaktadır; normal navigasyondan (Sidebar, Dashboard) çıkarılmıştır.
- Erişim, `FEATURE_LEGACY_QUIZ_ENABLED` (backend) ve `VITE_FF_LEGACY_QUIZ` (frontend) feature flag'leriyle kontrol edilmektedir; bu flag'ler şu an kapalı (`false`) olarak belgelenmiştir. Flag'ler tekrar `true` yapılırsa modül yeniden erişilebilir hâle gelebilir.
- Mevcut kullanıcı verisi (quiz denemeleri, skorlar) korunmaktadır; fiziksel silme, migration ve veri saklama (retention) kararı **henüz verilmemiştir**.

Eski kodda quiz bileşenleri bulunuyorsa doğrudan silinmemelidir. Fiziksel kaldırma öncesi:

- bağımlılıkları,
- veri modeli etkisi,
- kullanıcı verileri ve saklama/export politikası,
- migration ihtiyacı,
- geri alma yöntemi

incelenmeli ve ayrı bir ürün kararına bağlanmalıdır.

### 7.2 Flashcard modülü

> **Ürün kararı kesinleşti (5 Ağustos 2026):** Flashcard kullanıcı akışına geri getirilmeyecektir; yerini kalıcı olarak bilgi nesnelerine gömülü Pratik Kartlar almıştır. Bu da kalıcı bir karardır, aşağıdaki teknik açıklama yalnızca uygulama biçimini anlatır.

Flashcard, bağımsız bir ürün modülü olarak normal kullanıcı akışından ve navigasyondan **pasifleştirilmiştir (soft-retired)** — Quiz ile aynı yöntemle.

Yerine **Pratik Kartlar** kullanılacaktır. Flashcard, güncel ürün kararı olarak yeniden bir özellik gibi sunulmamalıdır.

**Repository üzerinden doğrulanmış güncel durum:**

- `Flashcard`, `FlashcardReview`, `FlashcardProgress` Prisma modelleri kod tabanında hâlâ mevcuttur.
- `/flashcards` altındaki route'lar `src/index.ts` içinde hâlâ kayıtlıdır; `src/services/flashcards.ts` ve `flashcard-routes.ts` silinmemiştir.
- Frontend'de `FlashcardDashboardPage.jsx` gibi eski sayfalar kod tabanında durmaktadır; normal navigasyondan çıkarılmıştır.
- Erişim, `FEATURE_LEGACY_FLASHCARDS_ENABLED` (backend) ve `VITE_FF_LEGACY_FLASHCARDS` (frontend) feature flag'leriyle kontrol edilmektedir; bu flag'ler şu an kapalı (`false`) olarak belgelenmiştir. Flag'ler tekrar `true` yapılırsa modül yeniden erişilebilir hâle gelebilir.
- Fiziksel silme, migration ve veri saklama (retention) kararı **henüz verilmemiştir**.

### 7.3 Pratik Kartların yeni rolü

Pratik Kartlar, kurs ve rehberlerin içinde bağlama göre kullanılan yardımcı içerik bileşenleridir.

Pratik Kart türleri:

- formül kartı,
- kontrol listesi,
- yaygın hata,
- hızlı uygulama,
- karar uyarısı,
- mini senaryo,
- veri toplama kartı,
- hesaplama özeti,
- güncel sözleşme veya politika kontrolü.

Pratik Kartlar her derste aynı sırayla tekrar eden standart kutulara dönüşmemelidir.

---

## 8. Kişiselleştirilmiş Ana Sayfa

Ana sayfanın amacı yalnızca içerik göstermek değil, kullanıcıya en doğru sonraki eylemi önermektir.

### 8.1 Örnek ana sayfa kartları

- Kaldığın yerden devam et
- Bugünkü işletme kontrolün
- Tamamlanmamış Karar Aracı
- Son hesaplamanı yeniden gözden geçir
- Sana uygun kurs
- İşletme bilgilerindeki eksik alan
- AI Mentor önerisi
- Kaydettiğin içeriğe dön
- Öğrenme ilerlemen
- İlgili yeni rehber
- Önceki kararın için güncel kontrol

### 8.2 Öneri verileri

Öneri sistemi şu verilere dayanabilir:

- kullanıcı rolü,
- işletme türü,
- sektör,
- işletme aşaması,
- tamamlanan içerikler,
- yarım kalan görevler,
- kullanılan Karar Araçları,
- kaydedilen içerikler,
- kullanıcının belirttiği hedefler,
- işletme ve finans bağlamı,
- AI Mentor görüşmeleri.

Öneri sistemi kullanıcılar arasında veri sızıntısına izin vermemelidir.

---

## 9. Kurs Sistemi

### 9.1 Kurs hedefi

Güncel hedef **60 kurstur**.

**Repository ve veritabanı üzerinden doğrulanmış envanter (5 Ağustos 2026):**

- Veritabanında toplam **268** `Course` kaydı bulunmaktadır; bunun **64**'ü yayımlanmış (`published`), **204**'ü taslak durumundadır.
- Yayımlanmış 64 kurs iki ayrı grupta toplanır:
  - **40 kurs** ("v4" seti) — 10 kategori × 4 kurs düzeninde, her biri 5 ders; toplam 200 ders, 200 farklı Bilgi Nesnesine bağlı. Bu, kullanıcı arayüzünde görülen ana kurs kataloğudur (kategoriler: E-Ticaret, Finans ve Nakit, Girişimcilik, Hukuk ve Vergi, Maliyet ve Fiyatlama, Operasyon ve İnsan, Pazarlama, Satış ve İhracat, Siber Güvenlik ve AI, Sürdürülebilirlik ve Tedarik).
  - **24 kurs** ("phase-6" seti) — ileri düzey finans/analitik konularında 13 alt kategoride, çoğunlukla 3'er ders; toplam 72 ders. Ayrı, daha teknik bir finans-derinleştirme parkuru.
  - Bu 64 kursun **hiçbirinde** kırık ders–Bilgi Nesnesi bağlantısı bulunmadı (0 sarkan referans, 0 dersiz kurs).
- Kalan **204 taslak kurs**, çoğunlukla `content/full-curriculum-v1.json` kaynaklı tek-konulu ("tek Bilgi Nesnesi = bir taslak kurs") otomatik üretilmiş kayıtlardır (ör. kategori başına 10-20 taslak: e-ticaret, girisimcilik, hukuk-vergi, maliyet, İhracat ve E-İhracat, İnsan ve İş Sağlığı, Operasyon ve Kalite vb.). Bunlar kullanıcıya yayımlanmış **gerçek kurslar değildir**; ham içerik iskelesi olarak veritabanında durmaktadır ve "60 kurs" hedefine sayılmamalıdır.
- Bilgi Nesnesi (`KnowledgeObject`) toplamı **932**; bunun **276**'sı yayımlanmış, **656**'sı arşivlenmiş durumdadır.

**Sonuç:** "60 kurs" hedefine göre bugünkü gerçek durum **40/60** (v4 ana kurs kataloğu üzerinden) veya **64/60** (phase-6 finans parkuru dahil, farklı bir yapı) olarak okunabilir — bu iki sayı aynı hedefi ölçmüyor, ayrı ürün kararı gerektirir (bkz. §30). v4 setinin "10 kategori × 4 kurs" temiz yapısı göz önüne alındığında, **5 yeni kategori × 4 kurs = 20 yeni kurs** ile 60 hedefine ulaşmak, mevcut yapıyla en tutarlı tamamlama yoludur; ancak yeni kategorilerin hangileri olacağı ayrı bir ürün kararıdır.

**5 Ağustos 2026 — tamamlama planı onaylandı ve ilk kurs teslim edildi:** Ürün sahibi 5 yeni kategoriyi onayladı: Perakende ve Mağaza Yönetimi, Finansman ve Büyüme Sermayesi, Müşteri Deneyimi ve Sadakat, Dijitalleşme ve Araç Seçimi, İşi Satın Alma ve Yatırım Değerlendirmesi. Kalite referansı olarak **"E-Ticarete Başla" kursu** seçildi (v4 setindeki "Pazarlama" kursu, incelemede ders başına tekrar eden mail-merge tarzı şablon — aynı açılış cümlesi, ders başlığının bir kalıba mekanik yerleştirilmesi, konuyla ilgisiz kaynak havuzu — içerdiği için referans alınmadı; bu, v4 setinin kalitesinin kategori bazında değil, muhtemelen üretim turuna göre değiştiğini gösterir).

İlk kurs bu standartla üretildi ve veritabanına işlendi: **"Var Olan İşletmeyi Devralmadan Önce Kontrol Et"** (`v5-isletmeyi-devralmadan-once-kontrol-et`, kategori: İşi Satın Alma ve Yatırım Değerlendirmesi, 4 ders, `sourceType: curated-pilot-v5`). Tek bir örnek işletme senaryosu 4 dersin tamamında devam eder; her ders farklı açılır; kaynaklar (SCORE.org, Resmî Gazete, TOBB, DergiPark) gerçek ve konuya özeldir. 4 dersin tamamına birer Pratik Kart gömüldü (`PC-ACQ-001`–`PC-ACQ-004`); ilgisi gerçek olan 2 derste (mali doğrulama, devir sonrası nakit riski) mevcut Karar Araçlarına (`DC-LOAN-007`, `DC-CASHFLOW-008`) bağlantı kuruldu — ilgisi olmayan derslere zorlama bağlantı eklenmedi. Kaynak taslak: `docs/content-pilot/isletmeyi-devralmadan-once-kontrol-et.md`; seed script: `scripts/seed-pilot-isletme-devri-course.ts`.

**6 Ağustos 2026 — kalan 19 kurs için üretim Gemini Deep Research'e devredildi, Kategori 5 tamamlandı.** Kullanıcı, kalan 19 kursun araştırma/yazım işini Gemini Deep Research'e yaptırdı; Claude'un hazırladığı standart brifingi ve kapsam sınırları (`docs/content-pilot/gemini-deep-research-brief-kalan-19-kurs.md`) kullanıldı. Gemini çıktısı incelendi: kalite genel olarak yüksek (gerçek kanun madde numaraları, kategori boyunca devam eden tek senaryo, kendi kendini düzeltmiş aşırı kesin ifadeler), ancak iki teknik sorun tespit edildi ve düzeltildi — (1) tüm formüller LaTeX (`\[...\]`) sözdiziminde yazılmıştı, uygulama bunu render etmediği için düz metne çevrildi; (2) kaynaklar kısa etiket hâlindeydi, gerçek ve doğrulanmış URL'lerle tıklanabilir bağlantıya çevrildi.

**Format kararı:** Gemini'nin ürettiği yeni kurslar, mevcut "4-5 kısa ders / kurs" kalıbından farklı olarak **kurs başına tek, uzun biçimli bir ders** ("derinlemesine karar rehberi") içeriyor. Bu bilinçli bir formattır — içerik derinliği ders sayısını yapay olarak çoğaltmaktan önceliklidir; her ders yine de tam karar zincirini (problem → analiz → hesaplama → gerekçeli sonuç → çalışma kaydı) tek başına tamamlıyor.

Kategori 5 (İşi Satın Alma ve Yatırım Değerlendirmesi) bu turda **tamamlandı** (4/4 kurs): pilot kursun 2. dersi, Gemini'nin daha güçlü (gerçek TBK/İş Kanunu/SGK/6183 madde numaralı) versiyonuyla yükseltildi; "İş Kurma mı Var Olanı Devralmak mı?", "Franchise Almalı mıyım?", "Kira/Lokasyon Kararını Verilerle Değerlendir" yeni kurs olarak eklendi (seed: `scripts/seed-pilot-category5-batch.ts`). Kalan 4 kategori (Perakende ve Mağaza Yönetimi, Finansman ve Büyüme Sermayesi, Müşteri Deneyimi ve Sadakat, Dijitalleşme ve Araç Seçimi — toplam 16 kurs) Gemini tarafından yazıldı, Claude'un incelemesini ve aynı LaTeX/kaynak temizliğini bekliyor.

**6 Ağustos 2026 — kullanıcı bildirimiyle üç görünürlük hatası bulundu ve düzeltildi:**

1. `frontend/src/pages/CoursesPage.jsx` içinde "10 alanda sıralanmış 40 uygulamalı kurs · 200 özgün ders" ifadesi **veritabanından değil, sabit (hardcoded) bir metindi** — yeni kurs eklendikçe hiç değişmiyordu. API'den dönen gerçek `total` değerini kullanacak şekilde dinamikleştirildi.
2. Yeni eklenen 7 Bilgi Nesnesinin (`CUR-121-01`–`04`, `CUR-122-01`–`03`) `categoryId` alanı boştu — `KnowledgeObject.category`, `Course.category` alanından **ayrı, ilişkisel bir sistem**; bu yüzden Bilgi Nesneleri sayfasında kategoriye göre filtrelenemiyor/gruplanamıyorlardı. Yeni bir `Category` kaydı (`İşi Satın Alma ve Yatırım Değerlendirmesi`) oluşturulup bağlandı.
3. Aynı 7 Bilgi Nesnesinin kaynakları yalnızca ders metninin içine gömülü markdown linkler olarak vardı; Bilgi Nesneleri listesindeki "N kaynak" sayacı ise ayrı bir ilişkisel tablodan (`KnowledgeObjectSource`) okunuyor ve bu tablo boş olduğu için "Kaynak yok" görünüyorlardı — kullanıcının "çok kısa içerik" olarak algıladığı şey buydu. Gerçek kaynaklar `Source`/`KnowledgeObjectSource` tablolarına da işlendi (düzeltme script'i: `scripts/fix-pilot-v5-metadata-and-sources.ts`).

Bu üç düzeltme, ileride eklenecek 16 kurs için de aynı script akışına dahil edilmelidir — yeni içerik yalnızca `Course`/`Lesson`/`KnowledgeObject` tablolarına değil, `Category` ve `KnowledgeObjectSource` ilişkilerine de bağlanmalıdır.

**Kategori 1 (Perakende ve Mağaza Yönetimi) tamamlandı (4/4 kurs)** — bu kez baştan itibaren tam kontrol listesiyle: her kursta `Category` bağlantısı, ders içeriğindeki linklerden otomatik çıkarılan `KnowledgeObjectSource` kayıtları, ve her kursa gömülü bir Pratik Kart (`PC-RETAIL-001`–`004`) eklendi. "Mağaza Genişletme veya Taşıma Kararını Ver" kursu, gerçekten uyan bir eşleşme olduğu için **Yeni Şube Açmaya Hazır mıyım?** (`DC-BRANCH-009`) Karar Aracına bağlandı; diğer 3 kursta zorlama bağlantı kurulmadı (§9.1'deki genel ilkeyle tutarlı). Seed script: `scripts/seed-pilot-category1-batch.ts`. Uygulama tarafında küçük bir ek: `embedded-practice-blocks.ts`'e `open_branch_check → DC-BRANCH-009` eşlemesi eklendi.

**Kalan durum:** Kategori 2 (Finansman ve Büyüme Sermayesi), Kategori 3 (Müşteri Deneyimi ve Sadakat), Kategori 4 (Dijitalleşme ve Araç Seçimi) — toplam 12 kurs — Gemini tarafından yazıldı, henüz veritabanına işlenmedi.

Yeni kurslar yalnızca sayıyı tamamlamak için üretilmemelidir. Her yeni kurs:

- gerçek bir ihtiyaç boşluğunu kapatmalı,
- mevcut kurslarla gereksiz çakışmamalı,
- farklı bir karar veya somut çıktı üretmeli,
- güncel kalite standardını karşılamalıdır.

### 9.2 Kurs benzerlik standardı

Herhangi iki kurs arasındaki toplam benzerlik oranı en fazla **%25** olmalıdır.

Başka bir ifadeyle:

> Her kurs diğer kurslardan en az %75 farklı olmalıdır.

Benzerlik değerlendirmesinde şunlar dikkate alınır:

- bölüm yapısı,
- giriş metni,
- anlatım sırası,
- soru biçimleri,
- örnekler,
- çalışma kartları,
- tablolar,
- grafikler,
- senaryolar,
- görevler,
- karar akışı,
- sonuç formatı,
- uygulama yöntemi.

%25 benzerliği aşan kurs çiftleri:

- yeniden yazılmalı,
- kapsamları ayrıştırılmalı,
- gerekirse birleştirme incelemesine alınmalıdır.

### 9.3 Ortak ders şablonunun kaldırılması

Aşağıdaki yapı tüm derslerde tekrar edilmemelidir:

- Problem Tanımı
- Öğrenme Çıktıları
- Temel İlkeler
- Pratik Uygulama Blokları
- Varsayımsal Örnek
- Somut Çalışma Kartı
- Ders Sonu Görevi
- Görev Kontrol Listesi
- Kaynakça

Bu bölümlerin bazıları bir derste kullanılabilir. Ancak bütün derslerin aynı iskeleti takip etmesi kabul edilmez.

Altın standart aynı bölüm yapısı değildir. Altın standart:

- gerçek işletme problemi,
- kullanıcının kendi verisi,
- konuya özgü öğrenme yöntemi,
- somut çıktı,
- gerekçeli teşhis veya karar,
- kaynakla desteklenen özgün anlatım

üretmektir.

### 9.4 Konuya özgü öğrenme yöntemleri

Dersler konuya göre farklı yöntemler kullanabilir:

- karşılaştırma matrisi,
- maliyet hesaplama,
- senaryo analizi,
- hata teşhisi,
- karar ağacı,
- müşteri yolculuğu,
- fiyat simülasyonu,
- risk haritası,
- veri toplama çalışması,
- kanal karşılaştırması,
- bütçe tablosu,
- varsayım testi,
- mini deney,
- belge inceleme,
- satış hunisi analizi,
- işletme sağlık kontrolü.

### 9.5 Somut ders çıktıları

Her dersin sonunda en az bir somut çıktı oluşmalıdır.

Örnekler:

- fiyatlandırma kararı,
- satış kanalı seçimi,
- maliyet tablosu,
- müşteri segmenti,
- risk listesi,
- kampanya değerlendirmesi,
- 30 günlük eylem planı,
- nakit akışı tahmini,
- ürün kârlılık analizi,
- yatırım ön değerlendirmesi,
- MVP test planı,
- satış süreci teşhisi.

---

## 10. Rehberler

Rehberler kurslardan daha kısa ve doğrudan problem odaklı olabilir.

Bir rehber:

- tek bir soruya cevap vermeli,
- gereksiz teorik genişlemeye gitmemeli,
- değişebilen bilgileri açıkça işaretlemeli,
- kontrol noktaları sunmalı,
- gerektiğinde Karar Aracı veya AI Mentor’a yönlendirmelidir.

Örnek rehberler:

- Satıcı sözleşmesinde hangi maddelere bakılır?
- E-ticaret komisyonu nasıl karşılaştırılır?
- İade maliyeti nasıl hesaplanır?
- Kargo teklifleri nasıl karşılaştırılır?
- İlk reklam bütçesi nasıl sınırlandırılır?
- Nakit açığı erken nasıl fark edilir?

---

## 11. Karar Kontrolü ve Karar Araçları

### 11.1 Genel tanım

Karar Araçları, kullanıcının işletmesiyle ilgili bir kararı kendi verileriyle analiz etmesini sağlayan etkileşimli sistemlerdir.

Bir Karar Aracı yalnızca açıklama veya genel tavsiye sunmamalıdır.

Her araç mümkün olduğunca şunları içermelidir:

- kullanıcı girdileri,
- veri doğrulama,
- açıklanabilir hesaplama,
- senaryo analizi,
- risk veya eşik kontrolü,
- gerekçeli sonuç,
- uygulanabilir sonraki adım,
- gerektiğinde kaynak veya uyarı,
- sonuç kaydetme,
- yeniden hesaplama.

### 11.2 Toplam araç sayısı

Toplam **12 Karar Aracı** planlanmıştır.

### 11.3 İlk tamamlanan araç

İlk araç:

> **Ürünüm Gerçekten Kârlı mı?** (`DC-PROFIT-001`)

Kod: `DC-PROFIT-001`, `src/services/decision-checks.ts` ve `scripts/seed-decision-checks.ts` içinde tanımlıdır. Bu aracın mevcut repository implementasyonu kod, test ve kullanıcı deneyimi açısından doğrulanmalıdır.

Tamamlandı kabul edilmesi için:

- hesaplamalar doğru olmalı,
- maliyet alanları yeterli olmalı,
- veri doğrulama çalışmalı,
- sonuç gerekçeli açıklanmalı,
- mobil görünüm kullanılabilir olmalı,
- sonuçlar kaydedilebilmeli veya tekrar kullanılabilmeli,
- hata durumları ele alınmalı,
- testler bulunmalıdır.

### 11.4 Kalan 11 araç

Kalan 11 araç, mevcut Decision Check mimarisi ve aynı ürün standardı kullanılarak `src/services/decision-tool-catalog.ts` (`STRUCTURED_TOOL_CONFIGS`) içinde tanımlanmış durumdadır.

**Güncel, repository ile doğrulanmış katalog** (eski aday liste yerine geçmiştir):

| # | Kod | Başlık | Kategori | Karar problemi (kısa) |
|---|---|---|---|---|
| 1 | `DC-PROFIT-001` | Ürünüm Gerçekten Kârlı mı? | Finans | Satış fiyatından tüm temel maliyetler düşüldüğünde ürün gerçekte ne kazandırıyor? |
| 2 | `DC-DISCOUNT-002` | Bu indirimi yapabilir miyim? | Fiyatlandırma | Planlanan indirimin ürün katkısına, marja ve kampanya başabaşına etkisi nedir? |
| 3 | `DC-FREESHIP-003` | Kargo ücretsiz olabilir mi? | Lojistik | Ücretsiz kargonun sepet katkısına etkisi ve güvenli minimum sepet eşiği nedir? |
| 4 | `DC-MARKETPLACE-004` | Pazaryeri komisyonundan sonra ne kalıyor? | Pazaryeri | Pazaryeri kesintilerinden sonra net tahsilat ve ürün katkısı nedir? |
| 5 | `DC-ADS-005` | Reklam bütçemi artırmalı mıyım? | Pazarlama | Reklamın gerçek katkısı, ROAS başabaşı ve ek bütçe senaryosu nedir? |
| 6 | `DC-HIRE-006` | Yeni personel alabilir miyim? | İnsan Kaynağı | Yeni personelin tam işveren maliyeti, başabaş cirosu ve nakit dayanıklılığı nedir? |
| 7 | `DC-LOAN-007` | Kredi taksitini karşılayabilir miyim? | Finansman | Yeni kredi taksitinin nakit akışına etkisi, borç karşılama oranı ve kötü senaryo nedir? |
| 8 | `DC-CASHFLOW-008` | Nakit akışım riskli mi? | Nakit Yönetimi | Nakit giriş-çıkışı, vade farkı, açık aylar ve minimum tampon ihtiyacı nedir? |
| 9 | `DC-BRANCH-009` | Yeni şube açmaya hazır mıyım? | Büyüme | Yeni şubenin yatırımı, aylık başabaşı, geri ödeme süresi ve rezerv yeterliliği nedir? |
| 10 | `DC-CAMPAIGN-010` | Kampanya yapmak mantıklı mı? | Pazarlama | Kampanya maliyeti, başabaş adedi ve düşük/orta/yüksek satış senaryoları nedir? |
| 11 | `DC-STOCK-011` | Stok artırmalı mıyım? | Stok Yönetimi | Satış hızı ve tedarik süresine göre stokta kalmama riski ve sipariş aralığı nedir? |
| 12 | `DC-CONTINUE-012` | Bu ürünü satmaya devam etmeli miyim? | Ürün Yönetimi | Ürün katkısı, satış hızı, iade ve stok maliyeti alternatif fırsatla nasıl karşılaştırılır? |

Toplam **12** araç, kod bazında tanımlanmıştır. Araç sayısı (12) ve ilk aracın kimliği (`DC-PROFIT-001`) bağlayıcıdır.

**Bu katalogda tanımlı olmak, aracın ürün standardını (§11.5) tam karşıladığı veya test edildiği anlamına gelmez.** Her aracın:

- hesaplama doğruluğu,
- veri doğrulama kapsamı,
- mobil kullanılabilirliği,
- test kapsamı (birim, sınır değer, hata durumları),
- kayıt/tekrar kullanım davranışı

repository üzerinden **ayrıca ve tek tek doğrulanmalıdır**. Bu doküman yalnızca kataloğun var olduğunu doğrular; ürün standardına tam uyumu doğrulamaz.

### 11.5 Karar Aracı ürün standardı

Her araç:

- gerçek bir karar sorusuyla başlamalı,
- yalnızca gerekli verileri istemeli,
- alanlar için açıklayıcı yardım sunmalı,
- kullanıcı verisine göre sonuç üretmeli,
- gerekirse birden fazla senaryo göstermeli,
- belirsizliği açıkça belirtmeli,
- “neden” açıklaması sunmalı,
- sonucu kaydedebilmeli,
- ilgili kurs, rehber veya AI Mentor’a bağlanabilmelidir.

### 11.6 Sonuç seviyeleri

İhtiyaca göre şu sonuç seviyeleri kullanılabilir:

- Güçlü görünüm
- Kontrollü ilerle
- Riskli
- Veri yetersiz
- Yeniden hesaplama gerekli
- Alternatif senaryo önerilir

Bu etiketler tek başına kullanılmamalı; gerekçe, veri ve varsayımlar gösterilmelidir.

---

## 12. Pazar Yeri Seçimi Dersi Standardı

Temel problem:

> Kendi ürünüm ve işletme koşullarım için hangi satış kanalından başlamalıyım?

Ders yalnızca platformları sıralamamalı; kullanıcıya gerekçeli bir kanal seçimi yaptırmalıdır.

Değerlendirme boyutları:

- ürün türü,
- hedef müşteri,
- komisyon yapısı,
- ödeme ve hakediş koşulları,
- iade riski,
- kargo yapısı,
- reklam ihtiyacı,
- rekabet yoğunluğu,
- marka kontrolü,
- operasyon kapasitesi,
- müşteri verisine erişim,
- teknik yeterlilik,
- başlangıç bütçesi.

Kurallar:

- platformları değişmez kategori lideri gibi sunma,
- sabit komisyon oranlarını evrensel bilgi gibi yazma,
- sabit hakediş günleri verme,
- platform politikalarını satıcı sözleşmesi ve panelden kontrol ettir,
- vergi ve hukuk konusunda kişiye özel kesin danışmanlık verme,
- e-Fatura ve e-Arşiv için güncel GİB kuralları ve mali müşavir kontrolünü vurgula.

---

## 13. İçerik ve Kaynak Kullanım İlkeleri

### 13.1 Kaynak türleri

İçerikler mümkün olduğunca şu kaynaklara dayanmalıdır:

- resmi kurumlar,
- güncel mevzuat,
- akademik kaynaklar,
- güvenilir sektör raporları,
- platformların resmi satıcı belgeleri,
- doğrulanmış teknik dokümantasyon.

### 13.2 Değişken bilgiler

Aşağıdaki bilgiler zaman içinde değişebilir:

- komisyon oranları,
- hakediş süreleri,
- satıcı koşulları,
- kargo ücretleri,
- vergi eşikleri,
- teşvikler,
- mevzuat,
- platform politikaları,
- API ve ürün özellikleri.

Bu bilgiler:

- kalıcı gerçek gibi yazılmamalı,
- mümkünse tarih veya son kontrol bilgisi içermeli,
- kullanıcı güncel resmi kaynağa yönlendirilmelidir.

### 13.3 Hukuk ve vergi sınırları

LocalAkademi:

- genel bilgilendirme yapabilir,
- kontrol noktaları sunabilir,
- resmi kaynağa yönlendirebilir,
- hangi uzmana danışılması gerektiğini açıklayabilir.

Ancak:

- kişiye özel kesin hukuki görüş,
- kişiye özel kesin vergi danışmanlığı,
- garanti sonuç,
- resmi temsil

sunmamalıdır.

### 13.4 Özgünlük

İçerikler kaynaklardan uzun alıntılarla oluşturulmamalıdır.

Kaynak bilgileri:

- özgün anlatımla,
- Türkiye bağlamına uyarlanarak,
- gerçek işletme problemleriyle ilişkilendirilerek,
- gerekli atıflarla

sunulmalıdır.

---

## 14. Bilgi Nesneleri

Bilgi Nesneleri içerik sisteminin yeniden kullanılabilir ve sürümlenebilir temel birimleridir.

Olası alanlar:

- başlık,
- özet,
- açıklama,
- kategori,
- alt kategori,
- hedef kullanıcı,
- kaynaklar,
- sürüm,
- yayın durumu,
- demo durumu,
- doğrulama durumu,
- inceleme kayıtları,
- ilişkili kurslar,
- ilişkili rehberler,
- ilişkili Karar Araçları,
- AI Mentor kullanım izinleri.

AI Mentor yalnızca yayımlanmış ve izin verilen Bilgi Nesnelerini kullanmalıdır.

Taslak, yayımlanmamış veya yetkisiz içeriklerin kullanıcıya sızması engellenmelidir.

---

## 15. AI Mentor

### 15.1 Amaç

AI Mentor:

- kullanıcı sorularını açıklamalı,
- uygun içerik önermeli,
- hesaplama sonuçlarını yorumlamalı,
- riskleri göstermeli,
- kullanıcıyı Karar Araçlarına yönlendirmeli,
- uygulanabilir görevler önermeli,
- kaynak ve gerekçe sunmalıdır.

### 15.2 Yapmaması gerekenler

AI Mentor:

- kesin yatırım garantisi vermemeli,
- kesin kâr vaadi sunmamalı,
- kişiye özel hukuki veya vergi danışmanlığı vermemeli,
- yayımlanmamış bilgiyi kullanmamalı,
- başka kullanıcının verisini göstermemeli,
- kaynaksız yüksek güvenli iddialar üretmemeli,
- gereksiz hassas veri istememeli,
- yetki dışı dosya veya sistem erişimi yapmamalıdır.

### 15.3 Kullanıcı izolasyonu

Kontrol edilmesi gerekenler:

- conversation ownership,
- message ownership,
- kullanıcı bazlı sorgu filtreleri,
- soft delete,
- archive,
- yayımlanmamış içerik filtreleri,
- yönetici ve kullanıcı yetki ayrımı,
- rate limit,
- mesaj ve token sınırları,
- hassas veri maskeleme.

### 15.4 Mevcut AI Mentor 2.0 kapsamı

Önceki çalışmalarda aşağıdaki özellikler geliştirilmiş veya planlanmıştır:

- Conversation modeli
- Message modeli
- `archivedAt`
- `deletedAt`
- `lastMessageAt`
- `provider`
- `model`
- `citations`
- `knowledgeObjects`
- `toolCalls`
- `tokenUsage`
- hata kaydı
- conversation create/list/get/patch/delete
- message gönderme
- streaming
- optimistic UI
- mobil uyum
- soft delete
- kullanıcı sahipliği
- provider seçimi
- retry
- timeout
- rate limit
- regenerate
- memory extractor
- workspace ve finance context.

Bu maddelerin gerçek uygulama durumu repository üzerinden doğrulanmalıdır.

### 15.5 Sağlayıcı katmanı

**Repository üzerinden doğrulanmış güncel durum:** `src/services/ai-provider.ts` içindeki `AiProvider` tipi yalnızca şu üç sağlayıcıyı tanımlar:

```ts
export type AiProvider = 'nvidia' | 'openai' | 'deepseek'
```

Yani LocalAkademi uygulamasının AI Mentor sohbet sağlayıcı katmanında kod bazında doğrulanmış sağlayıcılar **NVIDIA, OpenAI ve DeepSeek**'tir. Ollama, retrieval/embedding tarafında ayrı dosyalarda (ör. `src/services/retrieval/embedding-provider.ts`) referans alınmaktadır; ancak `AiProvider` sohbet tipinin bir üyesi değildir ve mentor sohbet sağlayıcısı olarak doğrulanmamıştır.

**Anthropic, LocalAkademi uygulamasının provider katmanında mevcut bir özellik değildir.** Kod tabanında `'anthropic'` değerini kullanan bir sağlayıcı implementasyonu bulunmamaktadır. Anthropic yalnızca **gelecekte değerlendirilebilecek bir sağlayıcı** olarak §30 "Açık Kararlar ve Doğrulanması Gerekenler" bölümüne taşınmıştır; güncel ürün mimarisinin bir parçası olarak sunulmamalıdır.

> **Önemli ayrım:** Bu repository üzerinde çalışan geliştirme ajanlarının (Claude Code dahil) kullandığı Claude aboneliği/API erişimi, LocalAkademi **uygulamasının kendi AI Mentor provider entegrasyonundan** tamamen ayrı bir sistemdir. Bir geliştirme ajanının Claude ile çalışıyor olması, LocalAkademi'nin kendi backend'inde bir Anthropic sağlayıcısı bulunduğu anlamına gelmez.

API anahtarları:

- repository’ye yazılmamalı,
- loglarda görünmemeli,
- istemci tarafına sızmamalı,
- commit edilmemelidir.

---

## 16. Öğrenme İlerlemesi

İlerleme sistemi yalnızca puan veya tamamlanan ders sayısına indirgenmemelidir.

Öğrenme ilerlemesi şunları gösterebilir:

- tamamlanan kurslar,
- tamamlanan dersler,
- üretilen karar çıktıları,
- kullanılan Karar Araçları,
- kaydedilen sonuçlar,
- tamamlanan görevler,
- güncellenmesi gereken işletme verileri,
- tekrar gözden geçirilmesi gereken kararlar.

Amaç rekabetçi oyunlaştırma değil, kullanıcının kendi işletme gelişimini takip etmesidir.

---

## 17. Kullanıcı ve İşletme Profili

### 17.1 Kullanıcı profili

Olası alanlar:

- ad,
- rol,
- hedefler,
- ilgi alanları,
- tercih edilen öğrenme biçimi,
- kaydedilen içerikler,
- tamamlanan içerikler,
- ilerleme bilgileri.

### 17.2 İşletme bilgileri

Olası alanlar:

- işletme türü,
- sektör,
- ürün veya hizmet türü,
- satış kanalları,
- aylık ciro aralığı,
- maliyet yapısı,
- çalışan sayısı,
- işletme aşaması,
- hedef pazar,
- mevcut problemler,
- finansal hedefler.

Hassas veya gereksiz bilgi istenmemelidir. Veriler kullanıcı bazında izole edilmeli ve AI Mentor’a kontrollü biçimde aktarılmalıdır.

---

## 18. Yönetim Paneli

Yönetim paneli şu işlevleri destekleyebilir:

- kullanıcı yönetimi,
- rol ve yetki yönetimi,
- içerik yönetimi,
- Bilgi Nesnesi yönetimi,
- kurs ve ders yönetimi,
- yayın durumu,
- içerik inceleme kayıtları,
- kaynak doğrulama,
- Karar Aracı yönetimi,
- sistem istatistikleri,
- hata ve denetim kayıtları.

Önceki geliştirme kayıtlarında:

- AdminUsers,
- AdminDashboard,
- Learner Dashboard,
- Knowledge List,
- Knowledge Detail

sayfaları üzerinde çalışma yapılmıştır. Gerçek çalışma durumu repository üzerinden doğrulanmalıdır.

---

## 19. Teknik Mimari

### 19.1 Genel yapı

**Repository üzerinden doğrulanmış mimari** (bu belgenin önceki sürümündeki "Python + Uvicorn" ifadesi hatalıydı ve kaldırılmıştır):

- Frontend: React + Vite (`frontend/`, doğrulandı)
- Backend: **Node.js + TypeScript, Fastify tabanlı servis** — `package.json` → `"name": "localakademi-server"`; `src/index.ts` → `import Fastify from 'fastify'`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/static` gibi Fastify eklentileri kullanılıyor. Python veya Uvicorn'a ait herhangi bir kod bulunmamaktadır.
- Veritabanı erişimi: Prisma (`prisma/schema.prisma`, doğrulandı; PostgreSQL `datasource`)
- Konteyner: Docker (`Dockerfile`, `docker-compose.yml` repository kökünde mevcut, doğrulandı)
- Geliştirme ortamı: Windows

Frontend ve backend port numaraları (5173 / 8000) bu denetimde ayrıca doğrulanmamıştır; kesin gerçek gibi yazılmamalı, gerektiğinde ortam yapılandırma dosyalarından (`vite.config.js`, `.env`/`.env.example`) teyit edilmelidir.

Repository gerçek kaynak kabul edilmelidir. Bu bölümdeki gibi teknik iddialar, koddan doğrulanmadan kesin gerçek gibi yazılmamalıdır.

### 19.2 Bilinen veri modeli alanları

Önceki tasarımlarda aşağıdaki modeller veya alanlar bulunmaktadır:

- KnowledgeObject
- KnowledgeObjectVersion
- Source
- ReviewRecord
- Course
- Lesson
- Enrollment
- LearningPath
- MentorSession
- Conversation
- Message
- TaskTemplate
- Formula
- PublicationEvent
- ImportJob

Quiz ve Question gibi eski modeller bulunabilir; güncel ürün kararına göre geçiş planıyla ele alınmalıdır.

### 19.3 Bilinen endpointler

Önceki geliştirme kayıtlarında:

- `/admin/users`
- `/admin/stats?period=30`
- `/dashboard`
- `/api/v2/knowledge-objects`
- `/api/v2/categories`
- `/mentor/conversations`

ve conversation/message/stream işlemleri bulunmaktadır.

Gerçek route yapısı koddan doğrulanmalıdır.

### 19.4 Frontend ilkeleri

- mobil öncelikli yapı,
- tekrar kullanılabilir bileşenler,
- tutarlı tasarım tokenları,
- erişilebilir formlar,
- yüklenme, hata ve boş durum ekranları,
- açıklanabilir sonuç kartları,
- kontrollü optimistic UI,
- kullanıcıya açık işlem geri bildirimi.

### 19.5 Backend ilkeleri

- kullanıcı sahipliği,
- giriş doğrulama,
- şema doğrulama,
- rate limit,
- güvenli hata mesajları,
- veri kaybını önleyen migration yaklaşımı,
- idempotent işlemler,
- audit edilebilir değişiklikler,
- test edilebilir servis katmanı.

---

## 20. Bilinen Teknik İlerleme ve Eksikler

### 20.1 Tamamlanan veya geliştirilen alanlar

Önceki kayıtlar şunları göstermektedir:

- AdminUsers arama, rol, sıralama ve sayfalama
- AdminDashboard KPI ve dağılımlar
- Learner Dashboard
- Knowledge List ve Knowledge Detail
- Auth ve layout iyileştirmeleri
- lazy route yapısı
- AI Mentor konuşma API’si
- kullanıcı izolasyonu
- yayımlanmamış KO sızıntısı düzeltmesi
- mesaj ve token kontrolü
- provider seçimi
- upload MIME ve DOCX metin çıkarımı
- upload kotası
- JWT süresi düzenlemesi
- Docker multi-stage build
- Vite ESM ve proxy düzeltmeleri
- soft delete ve optimistic UI
- citation JSON
- rate limit, retry ve regenerate
- workspace ve finance context.

Bunların tamamı kod ve testlerle yeniden doğrulanmalıdır.

### 20.2 Bilinen eksik veya yarım alanlar

Önceki incelemelerde şu eksikler belirtilmiştir:

- arşivleme endpointi veya UI,
- citation bağlantıları,
- Knowledge Object’ten Mentor’a sabitleme,
- öneri kartı,
- Memory API’nin varsayılan davranışı,
- stream timeout,
- eski `/mentor/chat` endpointinin emekliye ayrılması (v3.1 denetiminde doğrulandı: endpoint hâlâ çalışıyor, yalnızca `Warning: 299 Deprecated` header'ı ile işaretli — `src/services/mentor.ts`),
- KnowledgeDetail code bilgisinin backend’e iletilmesi,
- 12 Karar Aracının kalan 11’inin geliştirilmesi (v3.1 denetiminde doğrulandı: kod kataloğunda 11 araç tanımlı — bkz. §11.4 tablosu; ancak her aracın ürün standardına tam uyumu ve test kapsamı ayrıca doğrulanmalıdır),
- Pratik Kartların içerik içine doğru biçimde gömülmesi,
- kişiselleştirilmiş eylem akışının tamamlanması.

Bu liste güncel repository denetimiyle doğrulanmalıdır.

### 20.3 Beta öncesi doğrulanmış açık işler

v3.1 denetimiyle teyit edilmiş, henüz kapatılmamış beta engelleri:

- manuel masaüstü ve mobil uçtan uca kabul testi,
- staging/production ortamlarında feature flag doğrulaması,
- legacy Quiz/Flashcard için veri saklama (retention) ve export kararı (bkz. §7.1, §7.2),
- eski `/mentor/chat` endpointinin kaldırılma planı,
- repository içindeki doküman ve geçici dosyaların temizliği,
- ~~kurs/course/lesson envanter denetimi~~ — **5 Ağustos 2026'da veritabanı üzerinden doğrulandı ve kapatıldı** (bkz. §9.1): 40 yayımlanmış "v4" kursu + 24 yayımlanmış "phase-6" kursu = 64 yayımlanmış kurs, 204 taslak kurs, 276 yayımlanmış / 656 arşivlenmiş Bilgi Nesnesi, kırık bağlantı yok. Açık kalan tek karar: 60 hedefine ulaşmak için hangi yeni kategorilerin ekleneceği (bkz. §30).

Bu maddeler tahmini bir tamamlanma yüzdesi taşımaz; her biri ayrı bir doğrulama veya ürün kararı gerektirir.

---

## 21. Güvenlik Kuralları

### 21.1 Kimlik doğrulama

- Güvenli oturum veya JWT kullanılmalıdır.
- Token süresi kontrollü olmalıdır.
- Secret değerler güçlü olmalıdır.
- Varsayılan secret ile production çalışmamalıdır.

### 21.2 Yetkilendirme

Her veri erişimi:

- kullanıcı kimliği,
- rol,
- kaynak sahipliği,
- yayın durumu

üzerinden doğrulanmalıdır.

### 21.3 Veri izolasyonu

- Kullanıcı konuşmaları kullanıcı bazında izole edilmelidir.
- Başka kullanıcının işletme bilgisi görünmemelidir.
- Yayımlanmamış içerikler normal kullanıcıya sızmamalıdır.
- Yönetici işlemleri ayrı yetki kontrolüne tabi olmalıdır.

### 21.4 Dosya yükleme

- MIME doğrulaması yapılmalı,
- uzantı tek başına güvenilir kabul edilmemeli,
- dosya boyutu ve kullanıcı kotası uygulanmalı,
- tehlikeli dosya türleri engellenmeli,
- silinen kayıtların fiziksel dosyaları kontrollü kaldırılmalıdır.

### 21.5 AI güvenliği

- Prompt injection riski değerlendirilmelidir.
- Araç çağrıları izinli işlevlerle sınırlandırılmalıdır.
- API anahtarları loglanmamalıdır.
- Hassas kullanıcı verileri modele gereksiz aktarılmamalıdır.
- Model çıktısı kesin finansal, hukuki veya vergisel hüküm gibi sunulmamalıdır.

### 21.6 Migration güvenliği

Aşağıdaki işlemler açık onay olmadan çalıştırılmamalıdır:

- `prisma migrate reset`
- `prisma db push --accept-data-loss`
- veritabanı tablolarını silen komutlar
- geri dönüşsüz veri dönüşümleri.

Her migration için:

- etki analizi,
- yedekleme yaklaşımı,
- geri alma planı,
- test ortamı doğrulaması

bulunmalıdır.

---

## 22. Test ve Kalite Güvencesi

### 22.1 Test katmanları

Gerektiğinde şu testler kullanılmalıdır:

- birim testleri,
- servis testleri,
- API entegrasyon testleri,
- frontend bileşen testleri,
- uçtan uca testler,
- yetkilendirme testleri,
- veri izolasyonu testleri,
- hesaplama doğruluk testleri,
- responsive arayüz kontrolleri.

### 22.2 Karar Aracı testleri

Her Karar Aracı için en az:

- normal senaryo,
- sınır değer,
- eksik veri,
- sıfır değer,
- negatif veya geçersiz değer,
- yüksek maliyet,
- düşük marj,
- alternatif senaryo,
- sonuç açıklaması,
- mobil görünüm

kontrol edilmelidir.

### 22.3 Tamamlanma ölçütü

Bir görev şu koşullar olmadan tamamlandı sayılmamalıdır:

- ilgili kod uygulanmış,
- testler çalışmış,
- mevcut testler bozulmamış,
- kullanıcı akışı kontrol edilmiş,
- veri kaybı riski değerlendirilmiş,
- değişen dosyalar raporlanmış,
- kalan riskler belirtilmiş.

---

## 23. İçerik Üretim Süreci

Her kurs veya rehber için önerilen süreç:

1. Gerçek işletme problemini tanımla.
2. Hedef kullanıcıyı belirle.
3. Kullanıcının kullanacağı verileri belirle.
4. Doğrulanmış araştırma paketi hazırla.
5. Konuya özgü öğrenme yöntemini seç.
6. Somut çıktıyı tanımla.
7. Özgün ders yapısını oluştur.
8. Kaynak ve güncellik kontrolü yap.
9. Benzerlik denetimi uygula.
10. Editoryal ve teknik inceleme yap.
11. Yayın sürümünü kaydet.
12. Güncelleme tarihi ve sorumlusunu belirle.

Video üretiminde Gemini, Gemini Omni veya uygun diğer araçlar kullanılabilir. Önce pilot üretim yapılmalı, kalite doğrulandıktan sonra ölçeklenmelidir.

---

## 24. Bilgi Mimarisi ve Kategori Yaklaşımı

Platform e-kütüphane gibi gezilebilir olmalıdır.

Bilinen ana konu alanları:

- temel finans,
- maliyet ve fiyatlandırma,
- e-ticaret,
- hukuk ve vergi,
- girişimcilik,
- pazarlama,
- işletme yönetimi,
- yatırım ve büyüme.

Kategori sayısı ve adları içerik envanteriyle kesinleştirilebilir.

Hedeflenen bilgi tabanı daha önce kategori başına yaklaşık 100 olmak üzere toplam 600 Bilgi Nesnesi olarak planlanmıştır. Bu hedef yayın kalitesi ve gerçek ihtiyaç boşluklarına göre aşamalı uygulanmalıdır.

---

## 25. Geliştirme Yol Haritası

### Faz 1 — Güncel durum doğrulaması

- repository kökünü ve branch’i doğrula,
- git durumunu incele,
- mevcut dokümanları sınıflandır,
- çalışan ve yarım özellikleri tespit et,
- master belge ile kod arasındaki farkları çıkar,
- beta engellerini listele.

### Faz 2 — Dokümantasyon ve kaynak doğruluğu

- bu master belgeyi repository’ye ekle,
- eski master belgeleri arşivle,
- güncel karar kayıtlarını oluştur,
- kaynak öncelik sırasını sabitle,
- eski quiz ve flashcard kararlarını deprecated olarak işaretle.

### Faz 3 — İlk Karar Aracını ürün standardına tamamlama

- hesaplamaları doğrula,
- veri doğrulamayı tamamla,
- sonuç açıklamasını iyileştir,
- mobil deneyimi test et,
- kayıt ve tekrar kullanımını kontrol et,
- test kapsamını tamamla.

### Faz 4 — Kalan 11 Karar Aracı

- ortak Decision Check çekirdeğini doğrula,
- araçları tek tek geliştir,
- her araçta gerçek hesaplama veya senaryo üret,
- araçları ilgili kurs ve rehberlere bağla,
- kullanıcı sonuçlarını kaydet.

### Faz 5 — Kurs ve rehber sistemi

- kurs hedefini 60’a çıkar,
- ihtiyaç boşluğu analizi yap,
- ortak şablonu kaldır,
- benzerlik oranını denetle,
- Pratik Kartları içeriklere göm,
- güncel kaynak denetimi ekle.

### Faz 6 — Kişiselleştirilmiş eylem akışı

- ana sayfa öneri mantığını geliştir,
- yarım görevleri göster,
- Karar Aracı sonuçlarını ana sayfaya bağla,
- kullanıcı rolü ve işletme verisine göre öneri üret,
- açıklanabilir öneri kartları oluştur.

### Faz 7 — AI Mentor tamamlama

- arşivleme,
- citation bağlantıları,
- KO sabitleme,
- öneri kartları,
- memory davranışı,
- stream timeout,
- eski endpointlerin kaldırılması,
- kullanıcı izolasyonu testleri.

### Faz 8 — Beta hazırlığı

- kritik kullanıcı akışlarını test et,
- güvenlik denetimi yap,
- performans sorunlarını gider,
- hata ve boş durum ekranlarını tamamla,
- içerik yayın kontrollerini bitir,
- beta geri bildirim mekanizmasını kur.

---

## 26. Yapay Zekâ Ajanları İçin Çalışma Kuralları

Claude, Codex, OpenCode, Antigravity veya başka bir ajan bu repository’de çalışırken aşağıdaki kurallara uymalıdır.

### 26.1 İnceleme öncesi

Ajan önce:

1. bu master dokümanı okumalı,
2. çalışma klasörünü doğrulamalı,
3. repository kökünü doğrulamalı,
4. aktif branch’i bildirmeli,
5. `git status` sonucunu incelemeli,
6. ilgili dosyaları okumalıdır.

### 26.2 Açık onay olmadan yapılmayacaklar

- dosya silmek,
- migration çalıştırmak,
- veri kaybına yol açabilecek komut kullanmak,
- `.env` değiştirmek,
- yeni bağımlılık eklemek,
- büyük kapsamlı refactor yapmak,
- commit veya push oluşturmak,
- mevcut kullanıcı verisini değiştirmek.

### 26.3 Uygulama öncesi plan

Kod değişikliğinden önce ajan şunları sunmalıdır:

- sorun tanımı,
- kök neden,
- değişecek dosyalar,
- veri modeli etkisi,
- frontend etkisi,
- backend etkisi,
- test planı,
- veri kaybı riski,
- geri alma yöntemi.

### 26.4 Uygulama sonrası rapor

- değiştirilen dosyalar,
- yapılan değişiklikler,
- çalıştırılan testler,
- test sonuçları,
- başarısız veya atlanan kontroller,
- kalan riskler,
- önerilen sonraki adım.

### 26.5 Kapsam kontrolü

Ajan yalnızca verilen görev kapsamında çalışmalıdır.

Görev sırasında fark edilen başka sorunlar:

- izinsiz düzeltilmemeli,
- ayrı “tespit edilen ek sorunlar” bölümünde raporlanmalıdır.

---

## 27. Claude Code İçin Başlangıç Talimatı

Aşağıdaki metin Claude Code oturumlarının başında kullanılabilir:

```text
Bu repository LocalAkademi projesidir.

Önce LocalAkademi_Guncel_Master_v3_0.md dosyasını oku.

Şimdilik hiçbir dosyayı değiştirme, paket yükleme, migration çalıştırma,
commit oluşturma veya veri silme.

Önce şunları doğrula:
- tam çalışma yolu,
- repository kökü,
- aktif Git branch,
- git status,
- son 5 commit.

Ardından verilen görevi repository içindeki gerçek kod üzerinden incele.

Kurallar:
- Dokümanda yazan bir özelliği kodda doğrulamadan tamamlanmış sayma.
- Kod ile master belge çelişirse çelişkiyi raporla.
- Eski master belgeleri tarihsel referans kabul et.
- Açık onay olmadan değişiklik yapma.
- Her tespitte ilgili dosya yolunu belirt.
```

---

## 28. Doküman Yönetimi

### 28.1 Önerilen klasör yapısı

```text
docs/
  current/
    LocalAkademi_Guncel_Master_v3_0.md
  archive/
    eski-master-belgeler/
  research/
  technical/
  phases/
  decisions/
```

### 28.2 Eski belgeler

Eski master belgeler silinmemelidir. `docs/archive/` altında tarihsel referans olarak saklanmalıdır.

Eski belgeler:

- güncel karar kaynağı değildir,
- tarihsel bağlam ve araştırma için kullanılabilir,
- bu master belgeyle çelişirse eski kabul edilir.

### 28.3 Güncelleme yöntemi

Bu master belge değiştirildiğinde:

- sürüm numarası güncellenmeli,
- son güncelleme tarihi değiştirilmelidir,
- önemli değişiklikler changelog bölümüne eklenmelidir,
- değişiklik kapsamı kısa ve açık yazılmalıdır.

---

## 29. Changelog

### v3.6 — 6 Ağustos 2026

- §9.1: Kategori 1 (Perakende ve Mağaza Yönetimi) 4/4 kursla tamamlandı — bu kez Kategori/Kaynak/Pratik Kart adımları baştan dahil edilerek. "Mağaza Genişletme veya Taşıma Kararını Ver" kursu `DC-BRANCH-009` Karar Aracına bağlandı.
- Kalan durum netleştirildi: Kategori 2, 3, 4 (12 kurs) hâlâ yalnızca Gemini çıktısında, veritabanında değil.

### v3.5 — 6 Ağustos 2026

- Kullanıcı yeni kursları/pratik kartları uygulamada göremediğini bildirdi. Backend/veri katmanı doğrulandı (doğru çalışıyordu); asıl sorun üç görünürlük hatasıydı: (1) `CoursesPage.jsx`'te sabit "40 kurs" metni, (2) yeni Bilgi Nesnelerinde eksik `categoryId`, (3) yeni Bilgi Nesnelerinde eksik `KnowledgeObjectSource` kayıtları (kaynaklar yalnızca ders metnine gömülüydü). Üçü de düzeltildi (bkz. §9.1).
- Bu tür veri-tamlığı hatalarının tekrarını önlemek için: yeni içerik eklerken `Category` ve `KnowledgeObjectSource` ilişkilerinin de kurulması gerektiği not edildi.

### v3.4 — 6 Ağustos 2026

- §9.1: Kalan 19 kursun üretimi Gemini Deep Research'e devredildi; Kategori 5 (İşi Satın Alma ve Yatırım Değerlendirmesi) 4/4 kursla tamamlandı. Gemini çıktısındaki LaTeX formülleri düz metne çevrildi, kaynaklar doğrulanmış URL'lerle bağlandı. Yeni bir içerik formatı ("kurs başına tek uzun ders") bilinçli bir karar olarak belgelendi.
- Kalan 4 kategori (16 kurs) Gemini tarafından yazıldı, henüz Claude incelemesinden geçmedi — bir sonraki oturumda işlenecek.

### v3.3 — 5 Ağustos 2026

- §9.1: 60 kurs hedefi için 5 yeni kategori onaylandı (Perakende ve Mağaza Yönetimi, Finansman ve Büyüme Sermayesi, Müşteri Deneyimi ve Sadakat, Dijitalleşme ve Araç Seçimi, İşi Satın Alma ve Yatırım Değerlendirmesi) ve kalite referansı "Pazarlama" yerine "E-Ticarete Başla" olarak değiştirildi (Pazarlama kursunda ders-içi mail-merge şablon tekrarı tespit edildi).
- İlk yeni kurs veritabanına işlendi: "Var Olan İşletmeyi Devralmadan Önce Kontrol Et" (4 ders, 4 Pratik Kart, ilgili olan derslerde Karar Araçlarına bağlantı). Uygulama kodunda `src/services/embedded-practice-blocks.ts` içine yeni bir Pratik Kart eylem eşlemesi eklendi (`open_loan_check` → `DC-LOAN-007`).
- Bu, 20 yeni kursun ilkidir; kalan 19'u aynı standartla tek tek üretilecektir.

### v3.2 — 5 Ağustos 2026

- §7.1/§7.2: Quiz ve Flashcard'ın kullanıcı akışına geri getirilmeyeceği, ürün sahibi tarafından **kesin ve kalıcı karar** olarak onaylandığı belirtildi (önceki "soft-retired, flag açılırsa geri gelebilir" tekniği açıklama korunmuştur, yalnızca kararın kendisinin artık tartışmaya açık olmadığı netleştirildi).
- §9.1: Kurs/Bilgi Nesnesi envanteri veritabanı üzerinden gerçek sorgularla doğrulandı — 268 toplam kurs kaydı (64 yayımlanmış: 40 "v4" + 24 "phase-6"; 204 taslak), 932 Bilgi Nesnesi (276 yayımlanmış, 656 arşivlenmiş), 64 yayımlanmış kursta 0 kırık ders–KO bağlantısı. §20.3'teki "kurs/lesson envanter denetimi" beta engeli bu doğrulamayla kapatıldı.
- §30: 60 kurs hedefine ulaşmak için "5 yeni kategori × 4 kurs" tamamlama yolu, mevcut v4 yapısıyla tutarlı bir seçenek olarak eklendi; hangi kategorilerin ekleneceği açık karar olarak kaldı.
- Uygulama tarafında (bu belgeye ek olarak, ayrı bir düzeltme olarak): Karar Aracı sonuç ekranlarına "Yeniden Hesapla" eylemi eklendi — önceden bir araç tamamlandıktan sonra tekrar açıldığında yalnızca eski sonuç gösteriliyor, yeni hesaplama başlatan bir yol yoktu (`frontend/src/pages/DecisionCheckList.jsx`, `DecisionCheckSession.jsx`, `ProfitabilityDecisionTool.jsx`, `StructuredDecisionTool.jsx`). Bu, §11.1'de zorunlu tutulan "yeniden hesaplama" gereksinimini karşılar.

### v3.1 — 5 Ağustos 2026

Bu sürüm, önceki denetim raporundaki (repository karşılaştırması) doğrulanmış bulgulara göre yapılan bir dokümantasyon düzeltmesidir. Uygulama kodu, Prisma şeması, feature flag'ler, route'lar ve testler değiştirilmemiştir.

- §19.1: Backend açıklamasındaki hatalı "Python + Uvicorn" ifadesi kaldırıldı; gerçek yapı **Node.js + TypeScript + Fastify** olarak düzeltildi (`package.json`, `src/index.ts` ile doğrulandı). Doğrulanmamış port bilgileri "kesin gerçek" olarak sunulmaktan çıkarıldı.
- §7.1/§7.2: Quiz ve Flashcard için "kaldırılmıştır" ifadesi, kod tabanıyla uyumlu biçimde **"pasifleştirilmiş / soft-retired"** olarak düzeltildi. Prisma modellerinin, route'ların ve bazı frontend sayfalarının kod tabanında hâlâ bulunduğu, erişimin feature flag'lerle kontrol edildiği ve flag'ler açılırsa modüllerin tekrar erişilebilir olabileceği açıkça belirtildi. Fiziksel silme, migration ve veri saklama kararının henüz verilmediği eklendi.
- §11.4: Kalan 11 Karar Aracı için eski aday liste, `src/services/decision-tool-catalog.ts` içindeki gerçek kod kataloğuyla değiştirildi; her araç için kod, başlık, kategori ve kısa karar problemi tablo hâlinde eklendi. Katalogda tanımlı olmanın, ürün standardına tam uyum veya test tamamlanmışlığı anlamına gelmediği netleştirildi.
- §15.5: Sağlayıcı listesi, `src/services/ai-provider.ts` içindeki doğrulanmış `AiProvider` tipiyle (`nvidia | openai | deepseek`) uyumlu hâle getirildi. Anthropic'in kod tabanında mevcut bir sağlayıcı olmadığı belirtildi ve §30'a "gelecekte değerlendirilebilecek sağlayıcı" olarak taşındı. Geliştirme ajanlarının Claude aboneliği ile uygulamanın kendi provider entegrasyonunun farklı sistemler olduğu netleştirildi.
- §1: Denetim sırasında aktif branch'in `codex/phase8-product-experience` olduğunu belirten, bağlayıcı olmayan bir denetim notu eklendi; `CHECKPOINT.md`'deki eski branch bilgisinin güncel gerçek sayılmayacağı belirtildi.
- §20.2/§20.3: Eski `/mentor/chat` endpointinin hâlâ (yalnızca deprecated header ile) çalıştığı doğrulandı; kalan 11 Karar Aracının kod kataloğunda tanımlı olduğu ancak test/UX doğrulamasının ayrı olduğu netleştirildi. Yeni §20.3 alt bölümünde altı doğrulanmış beta engeli (manuel masaüstü/mobil kabul testi, staging/production flag doğrulaması, legacy Quiz/Flashcard retention ve export kararı, eski `/mentor/chat` kaldırma planı, repository doküman/geçici dosya temizliği, kurs/course/lesson envanter denetimi) ayrı listelendi.

### v3.0 — 5 Ağustos 2026

- Quiz modülü kaldırılmış ürün kararı olarak işlendi.
- Flashcard modülü kaldırıldı.
- Pratik Kartların bağımsız modül olmayacağı netleştirildi.
- Pratik Kartların kurs ve rehberlerin içine gömüleceği belirtildi.
- Karar Aracı sayısı 12 olarak sabitlendi.
- İlk aracın “Ürünüm Gerçekten Kârlı mı?” olduğu belirtildi.
- Kalan 11 aracın aynı Decision Check mimarisiyle geliştirileceği eklendi.
- Kurs hedefi 60 olarak güncellendi.
- Kurslar arası benzerlik üst sınırı %25 olarak sabitlendi.
- Ortak ders şablonu kaldırıldı.
- Pazar Yeri Seçimi dersi için özel standart eklendi.
- Kişiselleştirilmiş eylem akışı ürünün ana yönü olarak işlendi.
- AI Mentor güvenlik ve kullanıcı izolasyonu kuralları güncellendi.
- Yapay zekâ ajanları için çalışma kuralları eklendi.
- Eski master belgelerin tarihsel referans olarak tutulacağı belirtildi.

---

## 30. Açık Kararlar ve Doğrulanması Gerekenler

Aşağıdaki konular repository denetimi veya ayrı ürün kararı gerektirir:

- kursların kesin 60 başlıklı envanteri,
- kategori ve alt kategori yapısının son hâli,
- Pratik Kartların veri modeli,
- Karar Aracı sonuçlarının saklanma biçimi,
- ana sayfa öneri motorunun veri kaynakları,
- AI Mentor memory özelliğinin varsayılan davranışı,
- eski quiz ve flashcard tablolarının fiziksel kaldırma/migration planı ve veri saklama (retention) kararı,
- video üretim ve yayın iş akışı,
- beta kapsamı ve başarı ölçütleri,
- **Anthropic'in AI Mentor sağlayıcı katmanına eklenip eklenmeyeceği** — kod tabanında bugün mevcut değildir (bkz. §15.5); yalnızca gelecekte değerlendirilebilecek bir aday olarak ele alınmalıdır, güncel mimarinin parçası değildir.

Bu başlıklar doğrulanmadan tahminle tamamlanmış sayılmamalıdır.

---

## 31. Son Ürün Kontrol Soruları

Bir özellik yayımlanmadan önce şu sorular sorulmalıdır:

1. Gerçek bir kullanıcı problemini çözüyor mu?
2. Kullanıcının kendi verisini kullanıyor mu?
3. Somut bir çıktı veya karar üretiyor mu?
4. Sonucun gerekçesi açıklanıyor mu?
5. Mobilde rahat kullanılabiliyor mu?
6. Değişken bilgiler güncel kaynağa bağlı mı?
7. Kullanıcı verileri izole mi?
8. Hata ve boş durumları ele alınmış mı?
9. Testleri var mı?
10. Mevcut içerik veya araçlarla gereksiz tekrar oluşturuyor mu?
11. Kullanıcıya uygulanabilir bir sonraki adım sunuyor mu?
12. Ürünün eylem ve karar odaklı yönünü güçlendiriyor mu?

Bu soruların çoğuna net biçimde “evet” denemiyorsa özellik tamamlanmış kabul edilmemelidir.
