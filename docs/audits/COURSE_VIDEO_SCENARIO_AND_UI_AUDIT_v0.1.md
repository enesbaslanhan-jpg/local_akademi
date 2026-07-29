# LocalAkademi Kurs Video Senaryosu ve UI Denetimi v0.1

**Tarih:** 29 Temmuz 2026
**Kapsam:** Plan 3 — Kurs Video Senaryoları ve Video Entegrasyonu
**Karar:** **CONDITIONAL GO — KO video temeli çalışıyor; kurs video ürünü ve medya üretimi hazır değil**

## Executive Summary

- **Video veri modeli, learner API'si, player ve ilerleme kaydı mevcuttur.** Published ve playback URL'i olan KO videoları gösteriliyor; altyazı, transcript ve kaldığı yerden devam desteği var.
- **Envanter üretim paketi seviyesindedir.** Veritabanında 30 `LearningVideo` kaydı vardır; 30 paket doğrulayıcıdan geçer. Ancak 0 video published, 0 playback URL ve 0 kullanıcı video ilerlemesi vardır. Kullanıcıya sunulan bir video kataloğu henüz yoktur.
- **Model kurs merkezli değildir.** `LearningVideo.koId` unique ve zorunludur; `courseId`, `lessonId`, video türü, poster URL, dil/ülke, sürüm, reviewer ve kaynak ilişkisi yoktur. Bu nedenle kurs tanıtım videosu ile ders videosu ayrı ve denetlenebilir biçimde modellenemez.
- **30 paket kalite standardı yeni plana yetmez.** Paket doğrulayıcı 450–750 kelime, 180–360 saniye, 5–8 sahne ve alan tamlığını ölçüyor; kurslar arası `%25` senaryo benzerliği, kaynak doğruluğu, telif, erişilebilirlik ve manuel review kontrol edilmiyor.

## 1. İncelenen kanıtlar

| Alan | Kanıt |
|---|---|
| Modeller | `prisma/schema.prisma` — `LearningVideo`, `VideoProgress`, `VideoProductionJob` |
| Backend | `src/services/videos.ts`, `src/services/course-progress.ts`, `src/services/courses.ts` |
| Paket üretimi | `scripts/seed-video-production-packages.ts` |
| Paket doğrulama | `scripts/verify-video-packages.ts` |
| Published doğrulama | `scripts/verify-published-videos.ts` |
| Pilot render | `scripts/render-pilot-video.py` |
| Player | `frontend/src/components/ui/VideoPlayer.jsx` |
| Kurs/KO entegrasyonu | `frontend/src/pages/CoursePlayerPage.jsx`, `frontend/src/pages/KnowledgeDetail.jsx` |
| API istemcisi | `frontend/src/services/api.js` |
| Testler | `tests/video-progress.test.ts`, `frontend/src/__tests__/LearningInteractions.test.jsx` |

## 2. Mevcut envanter

29 Temmuz 2026 çalışan PostgreSQL:

| Metrik | Değer |
|---|---:|
| Video production paketi | 30 |
| `LearningVideo` | 30 |
| Published video | 0 |
| Playback URL'i olan video | 0 |
| `VideoProgress` | 0 |
| Toplam kurs | 204 |

`npm run videos:verify-packages` sonucu 30/30 PASS'tir. Bu, videoların render edildiğini veya kullanıcıya açık olduğunu değil; JSON üretim paketlerinin minimum alan sözleşmesini karşıladığını gösterir.

## 3. Mevcut backend

### Admin

- `GET /videos/admin/videos`
- `GET /videos/admin/videos/:id`
- KO için create/update endpoint'i (serviste admin kontrolü)
- `POST /videos/admin/videos/:id/publish`
- `GET /videos/admin/jobs`

Publish gate bugün:

- geçerli provider (`local`, `youtube`, `vimeo`);
- geçerli playback URL;
- transcript;
- WebVTT;
- thumbnail spec.

Eksik publish kontrolleri:

- senaryo benzerliği;
- kurs/ders ilişkisinin doğruluğu;
- kaynak ve teknik veri review;
- telif/lisans kaydı;
- gerçek poster varlığı;
- mobil/a11y test sonucu;
- admin reviewer ve review kararı;
- video dosyası checksum/erişim testi;
- content-version ile senaryo-version uyumu.

### Learner

- `GET /videos/ko/:koId` yalnız published, playback URL'li ve published/non-demo KO videosunu döndürür.
- `POST /videos/progress/:videoId` izlenen saniyeyi 0–15 aralığında sınırlar.
- İlerleme `watchedSeconds`, `furthestSecond`, `lastPositionSeconds`, yüzde ve tamamlanma olarak saklanır.
- `%90` izleme tamamlanma kabul edilir.
- Ders ve enrollment ilerlemesi yeniden hesaplanır.

Bu kontroller sahte seek ile ilerleme kazanımını azaltır; ancak analitik event sistemi değildir.

## 4. Mevcut frontend

### Hazır

- Native HTML5 video controls.
- Responsive wrapper.
- WebVTT caption track.
- Transcript aç/kapat.
- Kaldığı saniyeye dönme.
- İzleme yüzdesi/tamamlanma badge'i.
- Playback URL yoksa sahte/boş player göstermeme.
- Kurs oynatıcıda yalnız video varsa “Video” sekmesi.
- KO detay sayfasında video bileşeni.

### Eksik veya çelişkili

- Plan, ders videosunu başlık altında içerikten önce ister; mevcut UI videoyu ayrı sekmede gösterir.
- Kurs kartında video rozeti, video sayısı ve toplam video süresi yok.
- Kurs detay üst alanında tanıtım videosu yok.
- E-kütüphane video filtreleri yok.
- Dashboard “izlemeye devam et” ve önerilen video kartları yok.
- Mentor video öneri/link entegrasyonu yok.
- Admin video yönetim sayfası/route bulunamadı; API istemci yöntemleri tek başına kullanıcı arayüzü değildir.
- Poster görseli player'da kullanılmıyor; modelde yalnız `thumbnailSpec` metni var.
- Açık playback error/low-bandwidth fallback yok.
- Hız kontrolü browser native davranışına bağlı; özel erişilebilir kontrol doğrulanmadı.
- Video analytics event'leri yok.

## 5. Veri modeli boşlukları

Mevcut `LearningVideo`:

- tek bir KO'ya bağlıdır;
- KO başına yalnız bir video vardır;
- `durationTarget` gerçek medya süresinden ayrı değildir;
- script/storyboard/transcript/WebVTT serbest metindir;
- kaynaklar ilişkisel değildir;
- senaryo sürümü ve review kaydı yoktur.

Hedef model önerisi:

1. `LearningVideo`
   - nullable `courseId`, nullable `lessonId`, nullable `koId`;
   - `videoType`, `language`, `countryCode`;
   - `storageKey`, `streamUrl`, `posterUrl`, gerçek `durationSeconds`;
   - `status`, `version`, `publishedAt`, `createdById`, `reviewedById`;
   - content/script checksum ve superseded version.
2. `VideoScriptVersion`
   - purpose, audience, objective, script, storyboard, narrator tone, visual style, accessibility notes.
3. `VideoSourceReference`
   - video/script version, Source veya KO source, note.
4. `VideoAsset`
   - media/graphic/music/caption/poster, license, origin, checksum.
5. `VideoEditorialReview`
   - teknik doğruluk, özgünlük, telif, erişilebilirlik ve karar.
6. `VideoQualityAssessment`
   - similarity pair/score, gate version ve sonuç.
7. `VideoEvent`
   - event type, position, playback rate, caption state, error code ve session.

İlişki kuralı açık olmalıdır: her video tam olarak kurs, ders veya KO bağlamlarından en az birine bağlı olmalı; yayın sırasında hedef bağlam published olmalıdır.

## 6. Senaryo kalite durumu

`scripts/seed-video-production-packages.ts` 30 KO için deterministik paket üretir. Doğrulayıcı:

- zorunlu alanlar;
- 450–750 kelime;
- 180–360 saniye;
- 5–8 sahne;
- sahne alanları;
- WebVTT header;
- output key ve checksum;
- en az bir source code

kontrollerini yapar.

Yeni planın istediği aşağıdaki kontroller yoktur:

- 204 kursun her biri için benzersiz video purpose;
- açılış, örnek işletme, grafik akışı ve kapanış tekrarları;
- tüm video çiftlerinde `%25` benzerlik;
- Course Purpose Statement ile senaryo hizası;
- kaynak kodlarının gerçek ve güncel kaynaklara çözülmesi;
- görsel/müzik lisansı;
- kadın anlatıcı/voice profile metadata'sı;
- teknik uzman ve editör onayı.

30 paketin kendi aralarındaki yeni `%25` video benzerlik sonucu **Not verified**; mevcut verifier bu metriği üretmiyor.

## 7. Depolama ve yayın kararı

| Seçenek | Uygunluk | Karar |
|---|---|---|
| Uygulama sunucusunda MP4 | Lokal pilot ve geliştirme | 5–10 pilot video ile sınırlı |
| YouTube Unlisted / Vimeo | Hızlı dış platform pilotu | Erişim/analitik/marka kontrolü gereksinimine göre değerlendir |
| S3 uyumlu object storage + CDN/HLS | Üretim kontrolü ve ölçek | Önerilen hedef mimari |
| Cloudflare Stream / Mux benzeri managed video | Transcode, HLS ve analitik hızlandırır | Maliyet ve vendor kararı sonrası |

Üretim için tercih edilen soyutlama `VideoProvider` adapter'ıdır. Uygulama `local`, harici embed veya object-storage sağlayıcısını aynı güvenli playback sözleşmesiyle kullanmalıdır.

Güncel fiyat, kota ve bölgesel erişim karşılaştırması bu repo denetiminin parçası değildir: **Not verified**.

## 8. Hedef backend

- Course/lesson/KO bağlamını destekleyen sürümlü video API.
- Senaryo oluşturma → review → render → QA → publish state machine.
- Script similarity motorunu kurs kalite motoruyla ortak normalization altyapısında çalıştır.
- Render sağlayıcısını job queue ve idempotency key ile soyutla.
- Medya probe ile gerçek duration, codec, çözünürlük ve caption doğrula.
- Signed URL/entitlement kontrolü; unpublished içerikte 404.
- Publish gate: source, review, similarity, transcript, caption, poster, license ve playback smoke test.
- Event ingest: start, 25/50/75/90/100, seek, replay, error, caption, speed.
- Mentor retrieval yalnız published ve kullanıcının erişebildiği videoları önersin.

## 9. Hedef frontend

- Kurs kartı: video var, video sayısı, toplam süre.
- Kurs detay hero: tanıtım videosu, poster, outcomes ve süreler.
- Ders sayfası: ders videosu başlık altında; metinle birlikte erişilebilir layout.
- E-kütüphane: videolu, süre ve video türü filtreleri.
- Dashboard: devam et, bugün izle, kısa video, tamamlanmamış.
- Player: poster, açık hata/fallback, retry, playback rate, fullscreen, keyboard help ve network mesajı.
- Admin: senaryo, storyboard, kaynak, assets, caption/transcript, review, job ve yayın yönetimi.

## 10. Test planı

### Otomatik

- Course/lesson/KO relation constraint ve authorization.
- Draft/review/published state machine.
- `%25` script similarity ve tekrar eden hook/vaka/kapanış fixture'ları.
- Kaynak, license, poster, transcript, caption ve review publish gate.
- Signed/external/local URL validation ve unpublished erişim.
- Progress anti-seek, resume, completion ve enrollment ağırlığı.
- Event milestones, retry/dedupe ve playback error.
- Player poster, captions, transcript, rate, keyboard, fallback.
- Kurs kartı/detail/library/dashboard entegrasyonları.
- Admin E2E: script → review → render result → publish.

### Manuel

- iOS Safari, Android Chrome ve düşük bant genişliği.
- Caption senkronu ve Türkçe karakterler.
- Ekran okuyucu/klavye/tam ekran.
- Kadın anlatıcı ses kalitesi, hız ve vurgu.
- Grafik okunabilirliği ve yalnız ses/renkle bilgi vermeme.
- 3–7 dakika hedefinde öğrenme kazanımı pilotu.

### Mevcut kanıt

- Video package verifier 30/30 PASS.
- Backend hedef test grubunda video progress testleri PASS.
- Frontend öğrenme testleri playback yokluğu ve progress gönderimini doğruluyor.
- Gerçek published medya playback testi yoktur; veritabanında playback URL yoktur.

## 11. Rollout

1. Kurs kalite amacı/metadata'sını kesinleştir.
2. Video schema ve provider sözleşmesini migration tasarımıyla onayla.
3. En yüksek öncelikli 5 kurs için kurs tanıtımı + bir ders videosu pilotu.
4. Kadın anlatıcı voice profile'ı ve görsel stil rehberini sabitle.
5. Script similarity ve manuel review kapısını pilotta çalıştır.
6. Lokal MP4 veya seçilen provider ile E2E publish/playback/analytics testi.
7. 20 kursluk dalgada üretim maliyeti ve kullanıcı tamamlama metriğini ölç.
8. Başarılıysa kategori dalgalarıyla 204 kursa genişlet.

## 12. Backlog

### P0

- Kurs/lesson video veri modeli ve sürümlü script/review.
- Provider/storage kararı ve güvenli playback sözleşmesi.
- `%25` video similarity gate.
- 5 kursluk özgün kadın anlatıcılı pilot.
- Admin review/publish ekranı.

### P1

- Kurs kartı/detail/lesson entegrasyonu.
- Poster, caption, transcript ve player hardening.
- Video analytics ve dashboard “devam et”.
- Mentor published-video retrieval.

### P2

- 20 kursluk üretim dalgası.
- E-kütüphane video filtreleri.
- Managed render/transcode job otomasyonu.

### P3

- 204 kursa kategori dalgalarıyla yayılım.
- Adaptif kısa/uzun video varyantları.
- İzleme davranışına göre senaryo kalite kalibrasyonu.

## 13. Riskler ve Not verified

- 204 videoyu içerik kalite kapısından önce üretmek senaryolara mevcut tekrarları taşır.
- Render maliyeti, depolama, CDN ve yedekleme bütçesi **Not verified**.
- Harici provider sözleşme/KVKK/telif koşulları **Not verified**.
- Pilot MP4'ün tüm hedef cihazlarda oynatılması **Not verified**.
- Kullanılan ses modelinin ticari kullanım lisansı **Not verified**.
- Görsel, müzik ve stok varlık lisans kayıtları **Not verified**.

## 14. Bağımlılık sırası

`Course purpose/quality baseline → video model → provider/storage → script standard → similarity gate → 5 kurs pilotu → admin review → playback/analytics → 20 kurs dalgası → 204 kurs yayılımı`
