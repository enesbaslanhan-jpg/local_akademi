# YAPILACAK — i18n'i gerçekten bitirmek

> ## ⛔ ÖNCE BUNU OKU
>
> 1. **BU DOSYAYI DEĞİŞTİRME.** Üstüne durum raporu yazma, "tamamlandı"
>    diye işaretleme, silme. Bu bir görev tarifi, bir çıktı yeri değil.
>    Yapılacak iş **KOD**.
> 2. **Git commit / push YAPMA.** Ürün sahibinin süregelen talimatı.
>    Değişiklikleri çalışma dizininde bırak.
> 3. Sonda **"Kendi kendini denetle"** bölümü var. Bitirdim demeden önce
>    oradaki komutları çalıştır ve **sayıları raporla**. Sayı vermeyen
>    bir "bitti" kabul edilmiyor.
> 4. İş büyük. **Sırayla git** (A → G). A maddesi kalan her şeyin
>    doğrulama aracını üretiyor; onu atlarsan gerisini ölçemezsin.

---

## Proje

| | |
|---|---|
| Depo kökü | bu dosyanın bulunduğu dizin |
| Ön yüz | React 19 + Vite 6, `frontend/` |
| Arka uç | Fastify 5 + Prisma, `src/` |
| i18n | `react-i18next` ^17 / `i18next` ^26 |
| Kataloglar | `frontend/src/i18n/locales/{tr,en}/*.json` — 10 namespace: `admin, auth, common, community, dashboard, integrations, learning, mentor, tools, workspace` |
| Kurulum | `frontend/src/i18n/index.js` |
| Mevcut bekçi | `scripts/check-i18n.mjs` |

Komutlar (depo kökünden):

```bash
node scripts/check-i18n.mjs          # i18n bekçisi
cd frontend && npx tsc --noEmit      # tip kontrolü
cd frontend && npx vitest run        # ön yüz testleri
cd frontend && npm run build         # üretim derlemesi
```

---

## Neden buradayız — ölçülmüş teşhis

Ürün sahibi şunları bildirdi: *"panelde bazı kısımlarda İngilizce
görünüyor"*, *"menüdeki alt öğeler İngilizce'de Türkçe görünüyor"*,
*"bazı uyarılar Türkçe"*, **"daha benim göremediğim yerlerde var"**.

Son cümle asıl sorun. Önceki turda 21 dosya i18n'e bağlandı ve her
adımda `check-i18n.mjs` yeşil geçti — **ama o betik bu hataların
hiçbirini yakalayamıyor.** Yalnız tr/en anahtar eşitliğine bakıyor;
koddaki `t('x.y')` çağrısının katalogda karşılığı olup olmadığına
BAKMIYOR. Bu yüzden hatalar ancak ürün sahibi ekranda görünce çıkıyor.

### Üç ayrı arıza sınıfı

**1 — 184 eksik anahtar → ekrana ham anahtar basılıyor.**

i18next bulamadığı anahtarı ekrana **olduğu gibi** yazar: kullanıcı
`dashboard.heading` yazısını görür. `fallbackLng: 'tr'` ve `lng: 'tr'`
olduğu için ikinci bir şans yok.

⚠️ **Ürün sahibinin "İngilizce" sandığı şey budur.** Gerçekte İngilizce
değil, çevrilmemiş anahtar adı. İngilizce kataloğa düşme ihtimali
ölçülüp elendi.

| Dosya | Eksik anahtar |
|---|---|
| `frontend/src/pages/admin/AdminCommunity.jsx` | 76 |
| `frontend/src/pages/admin/AdminImports.jsx` | 39 |
| `frontend/src/pages/admin/AdminKOReview.jsx` | 34 |
| `frontend/src/pages/admin/AdminKnowledge.jsx` | 17 |
| `frontend/src/pages/admin/AdminKOForm.jsx` | 12 |
| `frontend/src/pages/PilotLearningPathPage.jsx` | 3 |
| `frontend/src/pages/admin/AdminUsers.jsx` | 1 |
| `frontend/src/pages/Workspaces/Calendar.jsx` | 1 |
| `frontend/src/pages/Workspaces/Contacts.jsx` | 1 |
| **Toplam** | **184 / 9 dosya** |

Ayrıca **11 kırık dinamik önek** (üst nesne hiç yok, her varyantı
düşüyor): `knowledge.level.*`, `knowledge.status.*`, `knowledge.type.*`,
`knowledge.workflow.*`, `form.reviewGate.*`, `form.verification.*` —
`AdminKnowledge.jsx`, `AdminKOReview.jsx`, `AdminKOForm.jsx` içinde.

**2 — ~950 sabit Türkçe metin, ~56 dosyada.** İngilizce seçilince
Türkçe kalıyor.

**3 — `/decision-tools` ölü rotası.** Yarı İngilizce, bozuk yer tutucu
metinli bir prototip; `frontend/src/router/index.jsx:98`'de canlı ama
hiçbir yerden linklenmiyor.

### Kataloglar sağlam — sorun orada DEĞİL

Ölçüldü: tr ↔ en **2687 anahtarda tam simetrik**. İngilizce dosyada
çevrilmemiş Türkçe metin **0**, Türkçe dosyada İngilizce metin **0**.
`uiLanguage` arka uç gidiş-dönüşü çalışıyor (`src/services/auth.ts:288`
upsert → `:244`/`:269` okuma). **Kataloglara toptan dokunma.**

---

## A. 🔴 ÖNCE BEKÇİ — `scripts/check-i18n.mjs`

**İlk bu yapılacak.** Kalan her maddenin doğrulaması buna dayanıyor.
Ürün sahibinin *"göremediğim yerler"* endişesinin tek gerçek cevabı:
hatayı insana değil betiğe buldurmak.

Mevcut parite denetimi **AYNEN KORUNACAK**, üstüne kullanım denetimi
eklenecek:

1. `frontend/src/**/*.{js,jsx,ts,tsx}` taranır — `__tests__/`,
   `node_modules/`, `*.test.*`, `*.spec.*` hariç.
2. Her dosyanın `useTranslation(...)` çağrılarından kapsamdaki
   namespace'ler çıkarılır. `useTranslation('admin')` ve
   `useTranslation(['common','workspace'])` biçimlerinin ikisi de.
   Hiç yoksa `defaultNS` = `common`.
3. Anahtar sabitleri toplanır: `t('...')`, `t("...")`, `` t(`...`) ``
   ve `i18nKey="..."` / `i18nKey={'...'}` (`<Trans>` bileşeni).
4. Her anahtar **tr** kataloğuna çözülür. `ns:key` biçimi namespace'i
   açıkça adlandırır ve kapsamı yok sayar. Çoğul ekleri (`_one`,
   `_other`, `_zero`, `_two`, `_few`, `_many`) bare anahtarı karşılar.
5. Çözülemeyen anahtar **hata**; süreç `exit 1`.
6. Şablonlu anahtar (`` t(`a.b.${v}`) ``) için `${` öncesindeki statik
   önek çözülür — o alt ağaçta en az bir anahtar varsa geçerli. Üst
   nesne hiç yoksa **hata**.
7. Tam değişken anahtar (`t(link.i18nKey)`) statik çözülemez —
   **uyarı** listesine düşer, hata değil.

⚠️ **`t(` yakalayan regex'e dikkat.** Naif bir `/t\(/` deseni
`.at(`, `format(`, `split(` çağrılarını da yakalar. Öncesinde
harf/nokta/`$` olmamasını şart koş — üç tırnak biçimini de
(tek, çift, ters) desteklemeli:

```js
const T_CALL = /(?<![\w.$])t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
const TRANS_KEY = /i18nKey\s*=\s*\{?\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
const USE_TRANSLATION = /useTranslation\(\s*(\[[^\]]*\]|['"`][^'"`]*['"`])/g
```

Node'un lookbehind desteği var, sorun çıkarmaz.

⚠️ **Yanlış pozitif üretmemesi gereken dosya:**
`frontend/src/utils/marketplaceActionLabels.js:10` — `t` burada
fonksiyon parametresi ve anahtar `workspace:` ile nitelenmiş. Doğru
çalışan bir betik bunu hata saymaz.

⚠️ **DİŞ KONTROLÜ — atlanamaz.** Betiği yazdıktan sonra herhangi bir
bileşene bilerek `t('yok.olan.anahtar')` ekle, betiği çalıştır,
**kırmızıya düştüğünü gör**, sonra o satırı geri al. Düşmüyorsa betik
hiçbir şey korumuyordur ve bütün bu iş boşa gitmiştir.

**Ek görünürlük:** `frontend/src/i18n/index.js`'e YALNIZ geliştirme
kipinde (`import.meta.env.DEV`) eksik anahtarı konsola yazan bir
`missingKeyHandler` ekle. Üretimde sessiz kalmalı.

**A bitince** betiğin ürettiği eksik anahtar listesi B maddesinin
yapılacaklar listesidir. Elle liste tutma, betiği çalıştır.

---

## B. 184 eksik anahtar

Betik listeyi verdiğinde mekanik iş. Kural:

🔴 **KOD DEĞİL KATALOG DÜZELTİLECEK.** Kodun kullandığı isimler tutarlı
ve okunur; sapma `admin.json` tarafında. Kodu anahtar adına uydurmak
yerine kataloğu koda uydur.

Sebep şu — bu bir **şema kayması**, eksik çeviri değil. Kataloğun
karşılığı çoğu zaten VAR, sadece başka adla duruyor:

| Kodun istediği | Katalogda duran | Yapılacak |
|---|---|---|
| `community.ads.formHeading` | `community.ads.createHeading` | yeniden adlandır |
| `community.ads.formDescription` | `community.ads.createDescription` | yeniden adlandır |
| `community.ads.bodyLabel` | `community.ads.textField` | yeniden adlandır |
| `community.ads.empty` | `community.ads.listEmpty` | yeniden adlandır |
| `community.ads.created` | `community.ads.publishSuccess` | yeniden adlandır |
| `community.ads.removeFromFeed` | `community.ads.unpublish` | yeniden adlandır |
| `community.header.*` | `community.page.*` | kap adını değiştir |
| `knowledge.level.*` | `knowledge.levels.*` | tekil/çoğul |
| `knowledge.type.*` | `knowledge.types.*` | tekil/çoğul |
| `knowledge.status.*` | `knowledge.statuses.*` | tekil/çoğul |
| `knowledge.workflow.*` | `knowledge.modals.*` | kap adını değiştir |
| `form.reviewGate.*` | `form.gates.*` | kap adını değiştir |
| `form.verification.*` | `form.verifications.*` | tekil/çoğul |
| `review.quiz.*` | `review.aiQuiz.*` | kap adını değiştir |
| `imports.confirm.*` | `imports.confirmModal.*` | kap adını değiştir |
| `knowledge.newKo` | `knowledge.newKO` | harf durumu |

Karşılığı **hiç olmayan** alt ağaçlar da var — bunlar YENİ yazılacak:
`community.autoNews.*`, `community.published.*`, `community.errors.*`,
`imports.file.*`, `imports.severity.*`, `imports.status.*`,
`imports.summary.*`, `imports.preview.*`, `form.placeholders.*`,
`review.sections.*`, `review.meta.*`.

### Kurallar

- **`tr` ve `en` AYNI ANDA, aynı yapıda** değişecek. Parite denetimi
  zaten yakalar ama baştan doğru yap.
- ⚠️ **Değer UYDURMA.** Yeni bir anahtarın Türkçe/İngilizce karşılığını
  yazarken kodun o anahtarı BASTIĞI yeri oku (hangi başlık, hangi
  düğme, hangi hata) ve gerçek metni yaz. Uydurulmuş etiket, ham
  anahtardan daha kötüdür çünkü yanlış olduğu belli olmaz.
- ⚠️ **Çalışan anahtarı bozma.** Aynı kapta hem çözülen hem çözülmeyen
  anahtarlar var (ör. `community.ads.loadError` çalışıyor,
  `community.ads.createError` yok). Yalnız betiğin şikâyet ettiklerine
  dokun.
- ⚠️ Dinamik önekler için **çalışma zamanındaki her varyantın**
  karşılığı olmalı. `knowledge.status.${status}` için kodda `status`
  hangi değerleri alıyorsa (`draft`, `in_review`, `published`,
  `archived`…) hepsi katalogda bulunmalı. Bunu kodu okuyarak çıkar.

Dokunulacak: `frontend/src/i18n/locales/{tr,en}/admin.json` (ağırlık
burada), `learning.json`, `workspace.json`.

---

## C. Kenar çubuğu — ürün sahibinin gördüğü hata

`frontend/src/components/layout/Sidebar.jsx:129` mekanizması **zaten
doğru çalışıyor**:

```js
const displayLabel = link => link.i18nKey ? t(link.i18nKey) : link.label
```

Sorun `i18nKey`i EKSİK olan girdiler — onlar sabit Türkçe `label`e
düşüyor:

| Yer | Sorun |
|---|---|
| `:93` `adminParentLink` | `i18nKey` yok. ⚠️ **`nav.management` anahtarı `common.json`'da ZATEN VAR** ("Yönetim") — sadece bağlanmamış. Yeni anahtar ekleme, bağla. |
| `:95-102` `adminLinks` | 6 girdinin **hiçbirinde** `i18nKey` yok: `Panel`, `KO Yönetimi`, `Kullanıcılar`, `Toplu İçe Aktar`, `Haberler & Topluluk`, `Denetim Kayıtları`. Yeni `nav.admin.*` anahtarları gerekiyor. |
| `:168-169` | Hesaplamalar alt menüsü: `Katalog`, `Geçmiş` |
| `:174-177` | Topluluk alt menüsü: `Akış`, `Profil`, `Takip ve engelleme`, `Sohbetler` |
| `:230` | `'Önerilen'` rozeti |
| `:319`, `:324` | Bölüm başlıkları `'Çalışma alanı'`, `'Diğer'` |
| `:265`, `:268` | Hızlı aksiyonlar `'Haber oluştur'`, `'Hesaplama başlat'` |
| `:287`, `:294`, `:296`, `:357`, `:359` | `aria-label`'lar |

Aynı turda:

- `frontend/src/components/layout/Header.jsx` — `TITLES` haritası
  `:24-27`, arama grup başlıkları `:230`/`:241`/`:274`, `title=`/
  `aria-label`'lar `:306`/`:317-318`/`:334-335`/`:344-345`
- `frontend/src/data/calculationCatalog.js` — `CALCULATION_CATEGORIES`
  `:1-8` + ~30 hesaplama adı.
  ⚠️ **Bu dosya ZATEN migrate edilmiş üç ekranı besliyor**
  (`ToolsPage.jsx`, `Header.jsx` araması, `CanonicalLessonSections.jsx`).
  O ekranlar "bitti" sayılmıştı ama etiketleri buradan geldiği için
  hâlâ Türkçe. Kaynağı düzeltmeden o ekranlar düzelmez.

---

## D. Uyarılar ve ortak bileşenler

Ürün sahibinin *"bazı uyarılar Türkçe"* şikâyetinin karşılığı.

**`frontend/src/pages/SettingsPage.jsx` — ~120 metin, en büyük tek
kaynak.** Şu an yalnız `language.*`, `formatLocales.*`,
`buttons.save/saving`, `states.loading` bağlı. Bağlanacaklar:

- **Tüm `flash(...)` çağrıları** — `:118-120`, `:197-198`, `:203-204`,
  `:213-214`, `:220-221`, `:229`, `:242`, `:254-255`, `:261`, `:281`,
  `:294`, `:401-403`
- `SettingsSection` başlık/açıklamaları — `:368`, `:372`, `:376`,
  `:385`, `:392`, `:414`, `:433`, `:437`, `:454`, `:458`, `:522`
- `Field label`'ları — `:369`, `:373`, `:377`, `:434`, `:437`
- `ROLE_LABELS` `:41`, `WEEK_DAYS` `:40`, `STAGES` `:42`
- ⚠️ `:418` — elle yazılmış
  `uiLanguage === 'en' ? 'Choose the language…' : 'Navigasyon, form…'`
  üçlüsü var. Bu i18n'in ta kendisini elle taklit etmek; anahtara çevir.

**`frontend/src/components/ui/*` — her ekranda görünür, tek düzeltme
geniş etki:**

| Dosya | Örnek |
|---|---|
| `Select.jsx` | `'Eşleşen sonuç yok'` `:5`, `'Seçim'` `:239`, `'Seçiniz'` `:264`, `'Ara...'` `:292`, `aria-label="Seçenek ara"` `:293` |
| `Loading.jsx` | `'Yükleniyor...'` `:3` |
| `Modal.jsx` | `aria-label="Kapat"` `:53` |
| `SearchBar.jsx` | `:4`, `:20` |
| `DataTable.jsx` | `'Veri bulunamadı'` `:4`, `'Önceki sayfa'` `:84` |
| `ConfirmModal.jsx` | `:8-9`, `:16`, `:54` |
| `PasswordInput.jsx` | `:33` |
| `ImageViewer.jsx` | `:70`, `:149`, `:157` |
| `StorageNotice.jsx` | `:56-62` |
| `QuizWidget.jsx` | `:32`, `:46`, `:58`, `:118` |
| `TaskWorkspace.jsx` | `:65`, `:91`, `:104`, `:109`, `:150`, `:158` |
| `FlashcardSection.jsx` | `:8`, `:52`, `:61`, `:65` |

**`frontend/src/components/layout/*`:** `VerificationBanner.jsx` (5),
`ConsentBanner.jsx` (3), `WelcomeTour.jsx` (11 — `useTranslation` hiç
yok), `ContextPanel.jsx` (4 — `useTranslation` hiç yok),
`MobileTabBar.jsx`.

---

## E. Kalan ekranlar

**Onboarding / auth:** `OnboardingPage.jsx` (62, `useTranslation` yok),
`PasswordResetPage.jsx` (28, yok), `InvitationPage.jsx` (8),
`AuthPage.jsx` (6), `AuthThemeToggle.jsx` (3).

**Uygulama içi:** `NotificationsPage.jsx` (13), `NewsPage.jsx` (16),
`EnrollmentsPage.jsx` (8), `DecisionCheckList.jsx` (34),
`components/settings/IntegrationsPanel.jsx` (28),
`components/memory/MemoryPanel.jsx` (29),
`pages/Workspaces/ImportDialog.jsx` (29),
`pages/Workspaces/navigation.js` (etiket yedekleri).

**Öğrenme / içerik:** `FinancialModelWorkspace.jsx` (88),
`KnowledgeDetail.jsx` (40), `FinancialModelLibrary.jsx` (21),
`AssessmentPage.jsx` (17), `KnowledgePage.jsx` (17),
`components/progress/LearningProgressPanel.jsx` (14),
`components/course/CanonicalLessonSections.jsx` (10),
`components/practice/EmbeddedPracticeBlock.jsx` (8),
`components/feed/PersonalizedFeed.jsx` (6),
`KnowledgeTopicPage.jsx` (5).

**Genel:** `SupportPage.jsx` (74 — kenar çubuğundan linkli, gerçekten
kullanılıyor), `AboutPage.jsx` (45), `NotFound.jsx` (3),
`Unauthorized.jsx` (3), `components/legacy/LegacyFeatureUnavailable.jsx`
(2), `components/about/EkranCizimi.jsx` (6),
`pages/LegalPage.jsx` (6 — yalnız belge BAŞLIKLARI; gövde metnine
dokunma).

---

## F. `/decision-tools` rotasını kaldır

`frontend/src/router/index.jsx`:
- `:55` `const DecisionToolsPage = lazy(...)` → sil
- `:98` `<Route path="/decision-tools" ...>` → sil

⚠️ **`DecisionToolsPage.jsx` dosyasını SİLME.** Rota kapanınca zaten
erişilemez; dosya silmek geri alınamaz bir işlem ve ürün sahibi yalnız
rotanın kaldırılmasını onayladı.

Gerçek Karar Araçları akışı `DecisionCheckList.jsx` →
`DecisionCheckSession.jsx` üzerinden çalışıyor ve etkilenmiyor.

---

## G. `AuthContext` dil ezme hatası

`frontend/src/context/AuthContext.jsx` — `:19`, `:39`, `:49`:

```js
setUiLanguage(data.uiLanguage || 'tr')
```

Sunucu `uiLanguage` döndürmezse (kayıt yok / eski yanıt biçimi),
geçerli bir `localStorage` `'en'` tercihi **her sayfa yenilemesinde
sessizce Türkçe'ye eziliyor**.

Düzeltme: sunucu **desteklenen bir değer döndürdüyse** uygula, yoksa
yerel tercihi **koru**. Üç çağrı yerinde de.

---

## Depo kuralları — bu projede böyle yazılıyor

1. **Yorumlar NEDENİ anlatır, ne yaptığını değil.** Kod ne yaptığını
   zaten söylüyor. "Neden böyle, alternatifi neden seçilmedi" yazılır.
   Dil: **Türkçe**. (Türkçe yorumlar ve `kaldirilabilir`, `sohbetAdi`
   gibi Türkçe tanımlayıcılar **depo tarzıdır — dokunma.**)
2. **İkinci uygulama yazılmaz.** Aynı işi yapan ikinci yol
   kaçınılmaz olarak ilkinden ayrışır. Mevcut yardımcı varsa o
   kullanılır.
3. **Testin dişi kontrol edilir.** Koruma yazıldıktan sonra bilerek
   bozulur ve testin/betiğin düştüğü görülür.
4. **Ölçmeden iddia edilmez.** "Düzeldi" demeden önce komut çıktısı
   ya da tarayıcı gösterilir.

### i18n deseni

```jsx
import { useTranslation } from 'react-i18next'
const { t } = useTranslation('workspace')            // tek namespace
const { t } = useTranslation(['mentor', 'common'])   // çoklu
t('bir.anahtar')                                     // kapsamdaki ns
t('common:buttons.cancel')                           // başka ns
t('feed.time.days', { count: 3 })                    // çoğul + değişken
<Trans i18nKey="session.calcItems.totalCost" ns="tools"
       components={[<strong key="0" />]} />          // gömülü etiket
```

---

## Kapsam dışı — bilerek

- 🔴 **Özellik bayrağı KAPALI eski ekranlar** — `FlashcardStudyPage`,
  `FlashcardDashboardPage`, `QuizTakePage`, `pages/practical-cards/*`
  (~54 metin). `frontend/src/config/featureFlags.js`'de
  `legacyFlashcards`, `legacyQuiz`, `practicalCards` üçü de `false`.
  Bugün kimse göremiyor. **Ürün sahibi kararı: yapılmayacak.**
- **Yasal metin gövdeleri** — `frontend/src/content/legal/*`. Bilerek
  Türkçe; çevirisi hukuki sorumluluk doğurur, ayrı karar.
  (`LegalPage.jsx`'teki belge BAŞLIKLARI kapsam içinde, gövde değil.)
- **Kurs / haber / kullanıcı içeriği** — veri, arayüz değil.
- **Türkçe kod yorumları ve tanımlayıcılar** — depo tarzı.
- **`DecisionToolsPage.jsx` dosyasının silinmesi** — yalnız rota kapanır.
- **Arka uç (`src/`)** — bu turda dokunulmuyor. `uiLanguage`
  gidiş-dönüşü ölçüldü, çalışıyor.

---

## Bilinen tuzaklar

- **`grep -c` sıfır eşleşmede hata koduyla çıkar** ve `&&` zincirini
  kırar. Sayarken `|| true` ekle.
- **Diakritiksiz Türkçe kelimeler kaçar.** `[çğıöşüÇĞİÖŞÜ]` araması
  `Kaydet`, `Panel`, `Komisyon`, `Bildirimler`, `Kullanicilar` gibi
  kelimeleri **bulamaz**. Bu tuzak bu projede birden çok kez sayıyı
  düşük gösterdi. Dosyayı gözle de tara.
- **Yorum satırları gürültünün ~%60'ı.** Saymadan önce `//` ve `/* */`
  gövdelerini ele.
- **CSS Modül sınıf adları derlemede hash'lenir** — tarayıcıda eski
  seçiciyle arama yapma.
- **Geliştirme sunucusu `watch` yapmıyor** (arka uç). Arka uç
  değişirse yeniden başlat. (Bu turda arka uç kapsam dışı.)
- **`i18nKey` bir dizide taşınıyorsa** (`Sidebar`, `WorkspaceLayout`,
  `MentorMessageBubble`, `ToolsPage`, `Activity`) betik onu statik
  çözemez ve uyarı basar. O anahtarların gerçekten var olduğunu
  **tanım yerinden elle** doğrula.

---

## Kendi kendini denetle

Bitirdim demeden ÖNCE çalıştır ve **çıktıların sayılarını raporla**.

```bash
# 1. i18n bekçisi — parite VE kullanım. Eksik anahtar SIFIR olmalı.
node scripts/check-i18n.mjs

# 2. Diş kontrolü: betik gerçekten koruyor mu?
#    Bir bileşene t('yok.olan.anahtar') ekle, aşağıyı çalıştır,
#    KIRMIZI gördüğünü doğrula, sonra satırı geri al.
node scripts/check-i18n.mjs   # exit 1 vermeli

# 3. Tip kontrolü — temiz olmalı
cd frontend && npx tsc --noEmit

# 4. Testler
cd frontend && npx vitest run

# 5. Üretim derlemesi
cd frontend && npm run build

# 6. Ölü rota gitti mi? (0 beklenir)
grep -c "decision-tools" frontend/src/router/index.jsx || true

# 7. Kenar çubuğunda i18nKey'siz menü girdisi kaldı mı?
#    adminLinks ve alt menülerde 'label:' olup 'i18nKey' olmayan
#    satır KALMAMALI.
grep -nE "^\s*\{ id: '" frontend/src/components/layout/Sidebar.jsx | grep -v i18nKey || true

# 8. AuthContext dil ezmesi gitti mi? (0 beklenir)
grep -c "uiLanguage || 'tr'" frontend/src/context/AuthContext.jsx || true
```

### Kabul ölçütleri

| # | Ölçüt |
|---|---|
| 1 | `node scripts/check-i18n.mjs` **geçiyor** ve kullanım denetimi **0 eksik anahtar** raporluyor |
| 2 | Diş kontrolü yapıldı: sahte anahtarla betiğin **kırmızıya düştüğü görüldü**, sonra geri alındı |
| 3 | `npx tsc --noEmit` **temiz** |
| 4 | `npx vitest run` geçiyor ve test sayısı **54 dosya · 388 testin ALTINA düşmemiş** |
| 5 | `npm run build` başarılı |
| 6 | Denetim komutu 6, 7, 8 → hepsi **0 / boş** |
| 7 | Tarayıcıda: dil **İngilizce**yken kenar çubuğu açılıp "Yönetim/Panel/KO Yönetimi" **İngilizce** görünüyor |
| 8 | Tarayıcıda: `/admin/dashboard` ve `/admin/community` açıldığında ham `dashboard.xxx` / `community.xxx` anahtarı **hiç görünmüyor** |
| 9 | Tarayıcıda: Ayarlar'da bir kaydetme hatası tetiklenip uyarının **seçili dilde** çıktığı görüldü |
| 10 | Git commit / push **yapılmadı** |

> **Test taban çizgisi — 27.08.2026'da ölçüldü:**
> `Test Files 54 passed (54)` · `Tests 388 passed (388)`, süre ~90 sn.
> Bu sayıların **altına düşmemeli**. Düşerse bir şey kırdın demektir;
> hangi testin neden düştüğünü raporla, sessizce geçme.

### Raporlama

Bitirince şunları **sayıyla** bildir:

- Kaç eksik anahtar düzeltildi (betik başta kaç diyordu, şimdi kaç)
- Kaç dosyada sabit metin i18n'e bağlandı
- Test sayısı: önce → sonra
- Diş kontrolünün sonucu
- **Yapamadığın / atladığın ne varsa açıkça yaz.** Yarım bırakılan bir
  madde, gizlenmiş bir maddeden iyidir.
