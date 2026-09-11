# Devir: topluluk videosu + B/C/D ekranları

Tarih: 11.09.2026. Bu belge işi devralan ajan için yazıldı. Ürün sahibi
yazılımcı değil; kararlar ona **ürün etkisiyle** anlatılır, kanıt (ekran
görüntüsü, test sayısı) gösterilir.

## Neden bu iki iş

1. **Topluluk = sosyal medya platformu** (ürün sahibinin kararı). Video
   birinci sınıf içerik olacak. Bugün: web oynatıyor, mobil dosya ikonu
   gösteriyor, sunucu ham dosyayı saklıyor, sınır 20 MB (telefonda 10 sn
   video zaten bunu aşar), ffmpeg yok.
2. **Faz B/C/D ekranları** (Krediler, Kasa/Banka, Personel — web
   `frontend/src/pages/Workspaces/Finance*.jsx`, mobil
   `ui/screens/workspaces/BusinessFinanceScreen.kt` + `FinancePanels.kt`)
   sunucu tarafı sağlam (tests/business-finance.test.ts 47/47) ama arayüz
   **tasarım sisteminin dışında**: düz `OutlinedTextField`, tarih elle
   "YYYY-AA-GG" yazılıyor, para birimi elle yazılıyor, form listenin içine
   açılıyor, boş durum düz cümle. Ürün sahibi "böyle olmaz" dedi.

## Sabit kurallar (bunlar tartışılmaz)

- **Native (C/C++) kütüphane eklenmez.** Release APK 3,6 MB ve bu
  bilinçli. Video sıkıştırma **sunucuda** (ffmpeg), telefonda değil.
  Oynatıcı Media3 (Kotlin, ~2 MB) olabilir.
- **Reklam SDK'sı yok.** Gelir modeli PayTR ücretli plan.
- **Tasarım sistemi dışına çıkılmaz.** Mobil: `Lk*` bileşenleri
  (`LkTextField`, `LkEmptyState`, `LkListRow`, `LkRowGroup`,
  `LkMetricCard`, `LkHeroPage`); tarih için Kayıt formundaki seçici
  (`RecordEditScreen.kt`), para birimi için oradaki çipler. Web:
  `Tracker.jsx` / `KayitDetay.jsx` desenleri, `Overview.module.css`
  bant sınıfları. Yeni ekran yazarken önce en yakın mevcut ekranı oku.
- **Para birimleri toplanmaz** (kur yok). `src/services/cari-hesap.ts`
  ve `kasa-bakiye.ts` bu kuralı uygular; kopyalama, çağır.
- **Sunucu hesaplar, iki istemci okur.** Aynı sayı web ve mobilde ayrı
  hesaplanmaz (ör. `tracker/summary.thisWeek / overdueTotals / cash`).
- Sunucu 2 CPU, disk 38 GB (%52). Video işleme kuyruğu tek işçi olsun.
- Hiçbir şey ürün sahibi düğmeye basmadan deploy edilmez. Deploy SHA'sı
  verilmeden önce **`git push` yapıldığını doğrula** — bugün yerelde
  duran 5 commit yüzünden deploy 13 sn'de düştü.

## Video planı (sırayla, her adım ayrı deploy)

1. **Sunucu** — ffmpeg Docker imajına; yüklenen video arka planda
   720p H.264 + AAC'ye sıkıştırılır, kapak karesi üretilir.
   `CommunityMedia`'ya `status` (processing/ready/failed),
   `posterStoredName`, `durationSec` alanları (eklemeli migration).
   Sınır: video 200 MB / 3 dk; işleme bitince ham dosya silinir.
   Gönderi "video işleniyor" durumunu taşır. Test: sahte küçük mp4 ile
   uçtan uca (fixture'a 1-2 sn'lik gerçek mp4 koy, uydurma bayt değil).
2. **Mobil** — `CommunityFeedScreen.kt` satır ~565: `kind == "image"`
   dalının yanına video: kapak + oynat düğmesi, dokununca **sessiz**
   başlar, ikinci dokunuşta ses; detayda tam ekran. **Otomatik oynatma
   yok** (mobil veri). Yüklemede ilerleme + iptal
   (`ComposePostSheet.kt`). DTO'ya alan eklerken sunucunun **gerçek**
   yanıtına bak; zorunlu alan uydurma (bkz. `QuizAttemptDto` notu).
3. **Web** — `VideoPlayer.jsx` poster + işleniyor durumu.

## B/C/D ekran planı

Sıra: Kasa/Banka → Krediler → Personel (Kasa, Genel Bakış'taki
"Kasada bugün" kutusuna bağlı). Her biri için: liste ekranı
(`LkListRow` + `LkEmptyState` + hero'da ekle düğmesi) ve **ayrı** form
ekranı (`RecordEditScreen` deseni). Web'de aynı: liste + modal/rota
form, `Tracker.jsx`'teki form bileşenleri. Faiz/bordro hesaplanmaz;
tutarları kullanıcı girer (ürün sahibi kararı, değişmez).

## Doğrulama alışkanlığı

- Backend `npm test` (≈2320), frontend `npx vitest run` (≈514), mobil
  `./gradlew :composeApp:testDebugUnitTest` (71).
- Emülatörde gez: yerel sunucu `npm run dev` (:3000) + debug APK
  (10.0.2.2). Bugün üç görsel hata yalnız böyle çıktı (kaybolan kişi
  adı, okunmayan hero yazısı, iki satıra sarıp kartı bozan etiket).
- Release paketi (R8) ayrıca sınanmalı: `assembleRelease` → debug
  anahtarıyla imzala → kur → giriş sonrası ekranları gez. Bugün 13
  ekran, 0 çökme. `proguard-rules.pro`'daki `-keep` satırları silinmez.
- CI artık release APK'yı artifact olarak yüklüyor
  (`localkarar-release-apk`); ürün sahibi telefonda oradan dener.

## Açık kalanlar

- Canlıda `r8-testi@localkarar.com` test hesabı duruyor (işletmesi
  arşivli, boş); silme ucu 429 verdi. `DELETE /auth/account` body:
  `{currentPassword, confirmation: "HESABIMI SİL"}`.
- Personel/maaş kayıtlarının rol bazlı görünürlüğü (kayıt listesi,
  dışa aktarma, hatırlatma) gözden geçirilmedi.
- Giriş/kayıt/hakkında ekranlarının mockup'a uyumu bu turda gözle
  doğrulanmadı (TASARIM-DEVIR.md "Giriş 1", "Giriş 5", "Ayar 8").
