# OpenCode Tek Paket Talimatı — LocalAkademi Eğitim Motoru

Aşağıdaki talimatı eksiksiz uygula. Ara aşamalarda kullanıcıdan onay isteme; güvenli ve geri alınabilir teknik kararları kendin ver. Mevcut kullanıcı verilerini, 840 yayınlanmış bilgi nesnesini, kaynakları, quizleri, görevleri, inceleme/yayın kayıtlarını ve kullanıcının çalışma ağacındaki değişiklikleri koru. `git reset`, veritabanı sıfırlama, toplu silme veya mevcut içeriği kopyalayarak çoğaltma yapma.

## Hedef

LocalAkademi'yi yalnızca içerik listeleyen bir uygulamadan gerçek bir eğitim platformuna dönüştür. Kullanıcı bir kursa kaydolabilmeli, sıralı dersleri tam içerikle okuyabilmeli, quiz çözebilmeli, uygulama görevi tamamlayabilmeli ve ilerlemesi gerçek etkinliklerden otomatik hesaplanmalıdır. Araçlar sayfasındaki hesaplayıcılar gerçekten çalışmalıdır.

## Mevcut durum ve doğrulanmış problemler

- Veritabanında 3 eski kurs ve 33 ders var.
- 840 adet `published`, `isDemo=false` bilgi nesnesi var; bunlar kurslarla bağlı değil.
- Yaklaşık 200 benzersiz konu vardır: `CUR-*` ailesinde konu varyantları, `KBX-*` ailesinde başlangıç/orta/ileri seviyeleri bulunur.
- 845 quiz, 2.526 quiz sorusu ve 843 görev şablonu ilişkisel tablolarda hazırdır.
- `CoursesPage.jsx` dersi yalnızca 200 karakterlik önizleme olarak gösteriyor; ders oynatıcı yok.
- `EnrollmentsPage.jsx` ilerlemeyi kullanıcıya slider ile elle değiştirtiyor.
- `KnowledgeDetail.jsx` quiz seçeneklerini salt metin olarak basıyor; seçim ve gönderim yok.
- `src/services/quizzes.ts` ilişkisel `Quiz/QuizQuestion` kayıtları yerine eski `metadata.quiz` alanını kullanıyor.
- Görev şablonları görüntüleniyor fakat atanma, yanıt kaydetme ve tamamlama arayüzü yok.
- Araçlarda frontend/backend sözleşmesi uyuşmuyor: `id`/`formula_id`, girdi nesnesi/metni ve iç içe `result` biçimleri farklı.
- Bilgi nesnesi içeriği Markdown olarak render edilmiyor.
- `%25 ilerlet` ve manuel enrollment slider'ı gerçek öğrenme ölçümü değildir.

## Mimari karar

840 ayrı ve kopya kurs oluşturma. Her benzersiz konu için bir kurs oluştur ve o konuya ait yayınlanmış bilgi nesnelerini sıralı dersler olarak bağla. Hedef yaklaşık 200 konu kursudur. İçerik `Lesson.content` içine kopyalanmamalı; tek doğruluk kaynağı `KnowledgeObject` olmalıdır.

Prisma şemasına aşağıdaki ilişkisel modeli güvenli migration ile ekle:

- `Course` alanları: mevcut alanları koru; ayrıca `slug String? @unique`, `estimatedMinutes Int @default(0)`, `outcomes String @default("[]")`, `sourceType String @default("legacy")` ekle.
- `Lesson` alanları: mevcut alanları koru; `knowledgeObjectId Int?`, `estimatedMinutes Int @default(10)` ekle ve `KnowledgeObject` ile ilişki kur. Eski 33 ders `knowledgeObjectId=null` olarak çalışmaya devam etsin.
- `LessonProgress`: `id`, `userId`, `lessonId`, `status`, `readingPercent`, `quizPercent`, `taskPercent`, `overallPercent`, `startedAt`, `completedAt`, `lastViewedAt`; `@@unique([userId, lessonId])`.
- `QuizAttempt` mümkünse `quizId String?` ve ayrıntılı feedback ile ilişkisel quiz denemesini desteklesin; eski kayıtları bozma.
- Gerekli ters ilişkileri ve indeksleri ekle.

Migration SQLite ile sıfırdan ve mevcut `dev.db` üzerinde çalışmalıdır. Migration dosyasını elle denetle. `prisma db push` ile migration zincirini atlama.

## Faz 1 — Kurs üretim hattı

Tekrar çalıştırılabilir `scripts/build-topic-courses.ts` oluştur.

- Yalnızca yayınlanmış ve demo olmayan `CUR-*` ile `KBX-*` kayıtlarını kullan.
- Konu anahtarını metadata ve kod yapısından deterministik çıkar.
- Aynı konu ailesindeki kayıtları tek kurs altında topla.
- KBX ders sırası: başlangıç, orta, ileri.
- CUR varyantlarını metadata seviyesi/sırası varsa ona göre; yoksa kod ve başlıkla deterministik sırala.
- Her ders `knowledgeObjectId` ile KO'ya bağlansın; içeriği kopyalanmasın.
- Kurs başlığı, açıklaması, kategori, kazanımlar ve tahmini süre KO metadata/içeriğinden türetilsin.
- Mevcut üç legacy kursu silme; `sourceType=legacy` olarak koru.
- Upsert kullan; ikinci çalıştırmada kurs/ders sayısı değişmemeli.
- `scripts/verify-topic-courses.ts` ile her yayınlanmış KO'nun tam bir konu kursuna bağlı olduğunu, ders sıralarını, orphan/duplicate olmadığını doğrula.
- Package scriptleri ekle: `courses:build`, `courses:verify`.

## Faz 2 — Kurs API'si

`src/services/courses.ts` ve enrollment API'sini üretim kalitesine getir.

- Liste endpoint'i pagination, kategori, seviye ve arama desteklesin.
- Kurs listesi `lessonCount`, `estimatedMinutes`, kullanıcının enrollment ve ilerleme özetini döndürsün.
- Kurs detay endpoint'i sıralı dersleri; bağlı KO kodu, seviye, süre, kilit/açık durumu ve ders ilerlemesiyle döndürsün.
- Yeni `GET /courses/:courseId/learn` ve `GET /courses/:courseId/lessons/:lessonId` endpoint'leri eklenebilir.
- Yayınlanmamış/demo KO içeriğini kullanıcıya sızdırma.
- Kullanıcı yalnızca kendi ilerlemesini okuyup yazabilsin.
- Enrollment tekrar çağrıldığında 400 yerine mevcut enrollment'ı idempotent biçimde döndür.
- Enrollment ilerlemesini istemciden gelen keyfi yüzdeyle kabul etme. Ders ilerlemelerinin ortalamasından sunucuda hesapla.
- Eski `PUT /enrollments/:id/progress` davranışını kaldır veya yalnızca geriye uyumlu, sunucu hesaplı hale getir.

## Faz 3 — Gerçek ders oynatıcı

Yeni rota oluştur: `/app/courses/:courseId/learn/:lessonId?`.

Yeni `CoursePlayerPage.jsx` ve modüler CSS oluştur:

- Sol panel: kurs adı, ders listesi, durum ikonları, yüzde ve süre.
- Ana panel: KO başlığı, öğrenme hedefleri, tam içerik, örnekler, adımlar, checklist, formüller ve kaynaklar.
- İçeriği güvenli Markdown olarak render et. `react-markdown` + `remark-gfm` gibi gerekli bağımlılığı ekle; raw HTML çalıştırma.
- Önceki/sonraki ders düğmeleri, mobil menü ve klavye erişilebilirliği ekle.
- “Derse başla” ve “Okumayı tamamladım” akışı olsun; keyfi `+%25` düğmesini kaldır.
- Okuma tamamlanınca `readingPercent=100` olsun.
- Quiz ve görev aynı ders oynatıcının sekmeleri/bölümleri olarak erişilsin.
- Kullanıcı kurs detayından “Kursa Başla/Devam Et” ile kaldığı derse gitmeli.
- Eski 33 legacy ders de aynı oynatıcıda `Lesson.content` üzerinden çalışmalı.

## Faz 4 — Çalışan quiz sistemi

`src/services/quizzes.ts` dosyasını ilişkisel `Quiz` ve `QuizQuestion` tablolarını kullanacak şekilde yeniden düzenle.

- `GET /quizzes/:koId`: yalnızca yayınlanmış KO'nun quizini döndür; doğru cevabı istemciye gönderme.
- Sorular `id`, `questionText`, parse edilmiş `options`, `order` biçiminde dönsün.
- `POST /quizzes/:koId/attempts`: tüm cevapları doğrula, ilişkisel `correctAnswer` ile puanla, `passScore` kullan.
- Sonuçta puan, geçti/kaldı, her soru için doğru/yanlış, doğru cevap ve açıklama döndür.
- Denemeyi `QuizAttempt` içine kaydet; kullanıcı izolasyonunu koru.
- Ders ekranında radyo seçenekleri, gönder butonu, boş cevap uyarısı, sonuç özeti, açıklamalar ve yeniden çözme olsun.
- Quiz geçilirse `quizPercent=100`, kalırsa en iyi puanı koru.
- En az bir önceki ve bir başarılı deneme göster.

## Faz 5 — Uygulama görevi çalışma alanı

`src/services/tasks.ts` metadata içinde task ID aramamalı; `TaskTemplate` ilişkisini kullanmalı.

- KO için görev şablonunu getir.
- “Görevi Başlat” idempotent assignment oluştursun.
- Kullanıcı metin/not/checklist yanıtını taslak kaydedebilsin.
- “Tamamla” ile status ve progress sunucuda güncellensin.
- Kullanıcı yalnızca kendi assignment'ını değiştirebilsin.
- Ders oynatıcıda görev açıklaması, tahmini süre, textarea, taslak kaydetme ve tamamla düğmesi göster.
- Görev tamamlanınca `taskPercent=100` olsun.

## Faz 6 — İlerleme motoru

Tek bir sunucu fonksiyonu oluştur ve her okuma/quiz/görev olayından sonra çağır:

- KO'da quiz ve görev varsa: okuma %40, quiz %30, görev %30.
- Bileşen yoksa ağırlıkları mevcut bileşenlere orantılı dağıt.
- Ders tamamlanma eşiği %100'dür.
- Kurs yüzdesi, ders `overallPercent` değerlerinin ortalamasıdır.
- Enrollment `not_started`, `in_progress`, `completed` durumunu sunucu belirler.
- Dashboard ve “Kurslarım” aynı hesaplanmış ilerlemeyi göstermeli.
- Slider ve manuel yüzde kontrollerini tamamen kaldır.

## Faz 7 — Kurs katalog arayüzü

`CoursesPage.jsx` sayfasını yeniden tasarla:

- Kart/grid katalog, arama, kategori filtresi, seviye filtresi.
- Her kartta ders sayısı, süre, seviye, ilerleme ve devam et/kaydol eylemi.
- Sağda metin önizlemesi yerine gerçek kurs detay paneli veya ayrı detay sayfası.
- 200 kursu performanslı pagination ile göster.
- Boş, yükleniyor ve hata durumları kullanıcıya açıkça gösterilsin.
- Türkçe metinlerde mojibake (`Ã`, `Ä`, `Å`) bırakma; kaynak dosyaları UTF-8 tut.

## Faz 8 — Bilgi nesnesi detayını iyileştir

- `KnowledgeDetail.jsx` tam içeriği Markdown olarak render et.
- Salt metin quiz listesini kaldır; ortak interaktif Quiz bileşenini kullan.
- Görev için ortak TaskWorkspace bileşenini kullan.
- `+%25` kontrolünü kaldır.
- “Bu konunun kursuna git” bağlantısı ekle.
- Kaynaklar, güncelleme tarihi ve doğrulama bilgisi korunmalı.

## Faz 9 — Araç merkezini düzelt ve genişlet

Önce frontend/backend sözleşmesini tek biçime getir:

```json
{
  "id": "kar_hesabi",
  "name": "Kâr Hesabı",
  "inputs": [{"name":"satis","label":"Aylık Satış","unit":"TRY","min":0}],
  "warning": "..."
}
```

Hesaplama cevabı:

```json
{"formulaId":"kar_hesabi","result":{},"assumptions":[],"warnings":[]}
```

En az şu 12 aracı çalışır hale getir:

1. Kâr ve kâr marjı
2. Başabaş noktası
3. Nakit pozisyonu
4. İşletme sermayesi
5. ROI
6. Stok devir hızı
7. Müşteri edinme maliyeti (CAC)
8. Müşteri yaşam boyu değeri (LTV)
9. LTV/CAC oranı
10. İndirim/kampanya kârlılığı
11. Kredi taksiti ve toplam maliyet
12. İhracat birim maliyeti

Kurallar:

- Sıfıra bölme, negatif/NaN ve eksik girişleri 422 ile açıkça reddet.
- TRY, yüzde, ay/gün gibi birimleri göster.
- Sonuçları Türkçe açıklama ve yorumla sun.
- Hesap geçmişi doğru alan adları ve tarihle görüntülensin.
- `Formula` tablosu kullanılacaksa seed et; kullanılmayacaksa nedenini kodda netleştir ve tek kaynak bırak.

## Faz 10 — Testler

Backend testleri ekle:

- Konu kursu üretimi idempotency ve kapsama testi.
- Kurs/lesson kullanıcı izolasyonu ve published-only testi.
- İlişkisel quizde doğru, yanlış, eksik ve bilinmeyen soru testi.
- Quiz doğru cevabının GET ile sızmadığı test.
- Görev assignment sahipliği ve idempotency testi.
- Ağırlıklı ilerleme ve enrollment otomatik güncelleme testi.
- 12 aracın normal ve sınır değer testleri.

Frontend Vitest/RTL testleri ekle:

- Kurs kataloğu filtreleme ve devam et.
- Ders oynatıcı önceki/sonraki.
- Quiz cevapla/gönder/sonuç.
- Görev taslak/tamamlama.
- Araç girişi/hesaplama/validation.
- Profil tamamlanmamış kullanıcı kurslara erişebilmeli.

Mevcut testleri bozma. Testler aynı SQLite DB'yi kullanıyorsa dosya paralelliğinden kaynaklanan yarış üretme.

## Faz 11 — Veri ve yayın doğrulaması

Uygulama sonunda aşağıdaki kontrollerin tamamını çalıştır ve hataları düzelt:

```powershell
npm.cmd run db:generate
npm.cmd run build
npm.cmd run validate:migrations
npm.cmd run courses:build
npm.cmd run courses:verify
npm.cmd test -- --reporter=dot
cd frontend
npm.cmd run build
npm.cmd test -- --reporter=dot
```

Ayrıca doğrula:

- 600 `CUR-*` ve 240 `KBX-*` kaydı hâlâ `published` ve kaynakları korunmuş.
- 840 yayınlanmış KO'nun tamamı bir konu kursunda ders olarak bulunuyor.
- Yaklaşık 200 benzersiz konu kursu var; kesin sayı veri anahtarlarından raporlansın.
- Quiz sayısı, soru sayısı ve görev sayısı azalmamış.
- Eski üç kurs ve enrollment kayıtları kaybolmamış.
- Kullanıcı arayüzünde `Ã`, `Ä`, `Å`, `â` gibi bozuk Türkçe karakter kalmamış.
- Onboarding tamamlanmamış kullanıcı dashboard, kurslar ve bilgi tabanına erişebiliyor.

## Tamamlanma ölçütü

İş yalnızca kod derlendiğinde tamamlanmış sayılmaz. Aşağıdaki kullanıcı yolculuğu gerçek API ve veritabanıyla çalışmalıdır:

1. Learner giriş yapar.
2. Profil doldurmadan Kurslar'a gider.
3. Arama/filtre ile bir konu kursu bulur.
4. Kursa kaydolur ve ilk dersi açar.
5. Tam KO içeriğini biçimlendirilmiş şekilde okur.
6. Quizde seçenek işaretler, gönderir ve açıklamalı sonuç alır.
7. Uygulama görevine yanıt yazar ve tamamlar.
8. Ders ve kurs ilerlemesi otomatik yükselir.
9. Kurslarım ve Dashboard aynı ilerlemeyi gösterir.
10. Araçlar sayfasında en az 12 hesaplayıcının her biri doğru sonuç verir ve geçmişe kaydolur.

## Teslim raporu

Sonunda kısa fakat kanıtlı rapor ver:

- Değiştirilen migration/model/API/frontend dosyaları.
- Üretilen toplam konu kursu ve ders sayısı.
- Bağlanan KO/quiz/görev sayıları.
- Test dosyası ve test sayıları.
- Çalıştırılan doğrulama komutlarının PASS/FAIL sonuçları.
- Varsa yalnızca gerçekten kalan riskler; tamamlanmamış işi tamamlandı gibi gösterme.
