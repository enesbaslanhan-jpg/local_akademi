# YAPILACAK İŞ — Onay şeridi, yardım bulunabilirliği, Amazon, dil vaadi

> 🔴 **BU DOSYA BİR GÖREV TARİFİDİR, RAPOR ŞABLONU DEĞİL.**
> Bu dosyayı **değiştirme, üstüne yazma, silme.** Yapılacak iş
> **kaynak kodu değiştirmektir.**
>
> Önceki bir ajan tam böyle bir tarifin yerine kendi durum raporunu
> yazıp "bitti" dedi; ölçüldü, kaynak kodda **tek satır değişmemişti.**
> Aynı hataya düşme.
>
> **Bitti demeden önce** en alttaki "Kendi kendini denetle"
> bölümündeki komutları çalıştır ve çıktılarını raporuna yapıştır.
> O komutlar işin yapılıp yapılmadığını sayıyla söylüyor.

---

## Proje ve ortam

**LocalKarar** — Türkiye'deki küçük işletmeler için karar destek
uygulaması. Fastify 5 + Prisma/PostgreSQL, React 19 + Vite 6, CSS
Modules. Kod ve yorumlar **Türkçe**. Dal: `design/localkarar-18`.

Çalışma ağacı temiz; en son commit `3b8438b`.

### Depo kuralları

1. **Yorumlar NEDENİ anlatır, ne yaptığını değil.** Kod ne yaptığını
   zaten söylüyor. Türkçe yaz.
2. **İkinci uygulama yazılmaz.** Aynı işi yapan ikinci bir yol
   kaçınılmaz olarak ilkinden ayrışır. Aşağıdaki "yeniden kullan"
   tablosuna bak.
3. **Testin dişi kontrol edilir.** Test yazdıktan sonra düzeltmeyi
   **bilerek geri al** ve testin düştüğünü gör. Düşmüyorsa test bir
   şey korumuyordur.
4. **Ölçmeden iddia edilmez.** "Düzeldi" demeden önce komut çıktısı
   ya da tarayıcı ölçümü göster.

### 🔴 KAPSAM DIŞI — DÜZEN VE KAYDIRMA

`AppLayout.module.css`, `MentorPage.module.css` ve
`AuthPage.module.css` içindeki **düzen/kaydırma kurallarına
DOKUNMA.**

Sebep: bu dosyalarda ortak düzene iki kez dokunuldu, ikisi de başka
ekranları bozdu ve geri alındı. Ayrıca bilinen bir **Edge–Chrome
farkı** var (Chrome'da sorun yok, Edge'de sayfa kayıyor) ve sebebi
**henüz ölçülmedi**. Ölçülmemiş bir farkın üstüne düzeltme yazmak,
çalışan ekranları riske atmak demek.

Aşağıdaki işlerin hiçbiri düzen değişikliği gerektirmiyor.

---

# 1. 🔴 Yeniden onay şeridi

**Ölçüm:** `missingConsents` sunucuda doğru çalışıyor —
`GET /auth/consents` (`src/services/auth.ts:690`) `{ accepted,
missing }` döndürüyor ve `tests/legal-consent.test.ts` bunu sınıyor.
Ama arayüzde **tek tüketicisi `frontend/src/pages/SettingsPage.jsx`**
(satır 77, 102, 120, 441-455).

Yani uygulama geneli hiçbir uyarı yok. Yasal metin sürümü **iki kez
arttı** (23.08 ve 25.08), kullanıcı girişte hiçbir şey görmedi.

⚠️ `frontend/src/content/legal/privacy.js:13-14` yorumu *"sürüm
artınca yeniden onay isteniyor — mekanizma `missingConsents` içinde,
yeni kod gerekmiyor"* diyor. **Arayüz tarafında bu iddia YANLIŞ.** O
yorumu da düzelt.

**Yapılacak:**

- Eksik onay varsa **her sayfada** görünen bir şerit.
- Desen: `frontend/src/components/layout/VerificationBanner.jsx`.
  `AppLayout.jsx:62`'de çiziliyor; yeni şerit de oraya girecek.
  **İkinci bir mekanizma yazma.**
- Uçlar hazır: `api.auth.consents()` ve `api.auth.acceptConsents()`
  (`frontend/src/services/api.js:353` ve `:356`).
- ⚠️ 🔴 **Şerit KAPATILABİLİR OLMAYACAK.** `VerificationBanner` oturum
  bazlı kapatılabiliyor (`sessionStorage`); onay isteği için o yanlış
  olur — kapatan kullanıcı bir daha hiç görmez ve onay hiç alınmaz.
  Kapatma düğmesini kopyalama.

# 2. 🔴 Onaylanacak metin okunamıyor

**Ölçüm:** `SettingsPage.jsx:420-437` yalnız sürüm numarası ve onay
tarihini gösteriyor. **Metni açan hiçbir bağlantı yok.** Kullanıcı ne
kabul ettiğini okuyamıyor.

Bu yalnız kullanılabilirlik sorunu değil: aydınlatılmış onay, metnin
okunabilmesini gerektirir.

**✅ PARÇA HAZIR — YENİDEN YAZMA:**
`frontend/src/components/legal/LegalModal.jsx` az önce yazıldı
(commit `3b8438b`) ve kayıt formunda çalışıyor. Kullanımı:

```jsx
<LegalModal type="privacy" open={acik} onClose={() => setAcik(null)} />
```

`type`: `'privacy' | 'terms' | 'cookies'`.

**Yapılacak:** hem 1. maddedeki şeritten hem `SettingsPage`teki onay
bölümünden bu pencere açılabilsin.

# 3. Yardım ve iletişim bulunamıyor

**Ölçüm:** `/yardim` sayfası **VAR** (`frontend/src/pages/SupportPage.jsx`)
— SSS (`:21` `SSS` dizisi) ve **çalışan** iletişim formu (`:157`,
uç `POST /support/contact`, şema `src/services/support.ts:31`).

Ama uygulama içinden **hiçbir bağlantı yok**: tek bağlantı herkese
açık `AboutPage.jsx:216`'da. Giriş yapmış kullanıcı sayfayı hiç
bulamıyor.

**Yapılacak:** kenar çubuğunun "Diğer" bölümüne Yardım bağlantısı.
Desen: `frontend/src/components/layout/Sidebar.jsx:83`
(`settingsLink`).

# 4. Geri bildirim alanı

Ayrı bir yüzey **açılmayacak** — mevcut iletişim formu karşılıyor.

**Ölçüm:** `konu` alanı serbest metin (`support.ts:34`, min 3 /
maks 150). Kullanıcı ne yazacağını bilmiyor.

**Yapılacak:** formun üstüne konu seçimi — *soru* / *sorun bildirimi*
/ **geri bildirim** / *diğer*. Seçim `konu` alanını ön doldursun,
kullanıcı üzerine yazabilsin.

⚠️ **Arka uç DEĞİŞMEYECEK.** Şema zaten metin kabul ediyor; sunucuya
dokunmak mevcut testleri gereksiz yere riske atar.

# 5. Kullanma kılavuzu

Gerçekten yok. Karşılama turu ve SSS var, kılavuz yok.

**Yapılacak:** `/yardim` içine yeni bölüm — ana akışlar adım adım:
işletme oluştur → kayıt ekle → belge yükle → pazaryeri mağazası bağla
→ mentora sor.

- Modül anlatımları `frontend/src/pages/AboutPage.jsx:34`
  (`MODULLER` dizisi) içinden gelecek. **Yeni içerik uydurma**,
  var olanı genişlet.
- ⚠️ **Var olmayan özellik anlatılmayacak.** `AboutPage` zaten "Neyi
  yapmaz?" bölümü taşıyor; aynı dürüst ton korunacak.

# 6. WooCommerce → Amazon (yalnız etiket)

⚠️ **Sanıldığından geniş: `WOOCOMMERCE` 9 dosyada geçiyor.** Ölçüldü:

```
src/services/integrations/adapter-registry.ts    (satır 35, katalog)
src/services/integrations/marketplace-routes.ts  (satır 124, zod enum)
src/services/integrations/types.ts               (satır 12, ProviderCode)
prisma/schema.prisma                             (satır ~2011, enum)
frontend/src/pages/Dashboard.jsx
frontend/src/pages/Workspaces/Orders.jsx
frontend/src/pages/Workspaces/Overview.jsx
frontend/src/pages/Workspaces/Products.jsx
frontend/src/__tests__/IntegrationsPanel.test.jsx
```

**Yapılacak:**

- `IntegrationProvider` enum'una `AMAZON` ekle (yeni göç).
- Katalog girdisi Amazon olsun, `comingSoon: true` kalsın.
- Ön yüzdeki sağlayıcı etiket/ikon eşlemelerini güncelle.

⚠️ 🔴 **`WOOCOMMERCE` enum değerini veritabanından SİLME.**
PostgreSQL'de enum değeri kaldırmak tipi yeniden yaratmayı
gerektirir; bu ölçekte gereksiz risk. Değer kullanılmadan dursun —
katalogdan çıktığı için kullanıcıya görünmeyecek.

⚠️ Amazon SP-API **geliştirici hesabı ve onay süreci** istiyor;
diğer dördü gibi anahtar alıp bağlanılamıyor. Kart **"Yakında"**
kalacak, gerçek bağdaştırıcı yazılmayacak.

# 7. İngilizce'nin yanlış vaadi

**Ölçüm:** `frontend/src/pages/Workspaces/Settings.jsx:405` "Dil /
bölge" etiketiyle `English (US)` sunuyor. Ama:

- i18n kütüphanesi **YOK** (`frontend/package.json`'da sıfır eşleşme)
- Türkçe metin **171 ön yüz + 109 arka uç** dosyasında

Yani seçenek seçilse bile arayüz Türkçe kalıyor — **yanlış vaat şu an
yayında.**

**Yapılacak:**

- Etiket ve açıklama gerçeği söylesin: bunun bir **tarih ve sayı
  biçimi** ayarı olduğu, arayüz dilinin şimdilik Türkçe olduğu açıkça
  yazılsın.
- Seçenek **kaldırılmayacak** — tarih/sayı biçimi gerçek bir ihtiyaç.

🔴 **Gerçek çok dillilik BU TURDA YAPILMAYACAK.** Ürün sahibi kararı:
kendi turunda, kendi planıyla yapılacak. Yarım bırakılırsa uygulama
iki dilli-bozuk kalır.

---

## Yeniden kullan — yeniden yazma

| İhtiyaç | Mevcut yer |
|---|---|
| Şerit deseni | `components/layout/VerificationBanner.jsx` |
| Şeridin çizildiği yer | `components/layout/AppLayout.jsx:62` |
| Yasal metni gösterme | `components/legal/LegalModal.jsx` |
| Genel pencere | `components/ui/Modal.jsx` |
| Onay uçları | `api.auth.consents()` / `acceptConsents()` |
| Yardım sayfası ve formu | `pages/SupportPage.jsx` |
| İletişim ucu | `POST /support/contact` (`services/support.ts`) |
| Menü bağlantı deseni | `components/layout/Sidebar.jsx:83` |
| Modül anlatımları | `pages/AboutPage.jsx:34` (`MODULLER`) |
| Sağlayıcı kataloğu | `services/integrations/adapter-registry.ts` |

## Dosya sınırı

| Dokunulacak | Dokunulmayacak |
|---|---|
| `components/layout/` (şerit, Sidebar) | `services/integrations/marketplaces/*` |
| `pages/SupportPage.*` | `services/business-tracker.ts` |
| `pages/SettingsPage.*` | `services/gelen-eposta.ts` |
| `pages/Workspaces/Settings.jsx` | `deploy/*` |
| `services/integrations/adapter-registry.ts` | 🔴 düzen/kaydırma CSS'leri |

`prisma/schema.prisma` yalnız 6. madde için (AMAZON enum).

## Bilinen tuzaklar — bu depoda bizzat yaşandı

- **Dev sunucu `watch` YAPMIYOR** (`node --env-file=.env --import tsx
  src/server.ts`). Arka uç değişikliğinden sonra yeniden başlatmazsan
  **eski kod çalışır**; bu iki kez saat kaybettirdi.
- **`grep -c` sıfır eşleşmede hata koduyla çıkar** ve `&&` zincirini
  kırar — betiğin sessizce yarım kalır.
- **CSS modülü sınıf karmaları düzenlemeden sonra DEĞİŞİR**
  (`_page_cqg1y_20` → `_page_uceqi_20`). Tarayıcıda eski seçiciyle
  arama yapma.
- **Bir betiğin "yaptım" mesajını koşulsuz yazdırma.** Değiştirmeyi
  önce/sonra sayarak doğrula; aksi hâlde hiç uygulanmamış bir
  değişikliği yapılmış sanırsın (bu tam olarak yaşandı).

---

## Kendi kendini denetle — bitti demeden ÖNCE

Çalıştır ve **çıktılarını raporuna yapıştır**:

```bash
# 1) Onay şeridi bileşeni var mı — 0'dan BÜYÜK olmalı
ls frontend/src/components/layout/ | grep -ci consent

# 2) Şerit AppLayout'ta çiziliyor mu — 0'dan BÜYÜK olmalı
grep -c "Consent" frontend/src/components/layout/AppLayout.jsx

# 3) Yardım kenar çubuğuna eklendi mi — 0'dan BÜYÜK olmalı
grep -c "yardim" frontend/src/components/layout/Sidebar.jsx

# 4) Amazon katalogda mı — 0'dan BÜYÜK olmalı
grep -c "AMAZON" src/services/integrations/adapter-registry.ts

# 5) WooCommerce katalogdan çıktı mı — 0 OLMALI
grep -c "WooCommerce" src/services/integrations/adapter-registry.ts

# 6) Test eklendi mi — 0'dan BÜYÜK olmalı
git status --short frontend/src/__tests__ tests/ | wc -l
```

Sonra tam doğrulama:

```bash
npx tsc --noEmit
npx vitest run
cd frontend && npm run test -- --run && npm run build
npm run sql:scan && npm run secret:scan
```

⚠️ `npx vitest run` TAM TAKIMI çalıştırır — seçilmiş dosya değil.
⚠️ Testleri **paralel çalıştırma**: iki takım aynı test veritabanına
girince alakasız testler düşer ve seni yanlış yere baktırır (bu
oturumda üç kez oldu).

### Kabul ölçütü

- Yukarıdaki altı sayaç beklenen değerde
- `npx vitest run` **2008'den fazla** test raporluyor ve hepsi geçiyor
- `npm run test -- --run` (ön yüz) **370'ten fazla** test, hepsi
  geçiyor
- Her yeni test için **diş kontrolü yapıldı** ve hangi düzeltmeyi
  geri alınca hangi testin düştüğü raporda **tek tek yazılı**
- 375 pikselde şerit ve yardım sayfası taranmış, **yatay kayma yok**
- Tarayıcıda: sürüm artırılıp şeridin çıktığı, metnin açıldığı ve
  onaylayınca kaybolduğu görülmüş

⚠️ Bunları yapmadan "tamamlandı" yazma.
