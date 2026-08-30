# YAPILACAK — i18n Faz 2: sabit Türkçe metinler

> ## ⛔ ÖNCE BUNU OKU
>
> 1. **BU DOSYAYI DEĞİŞTİRME.** Üstüne durum raporu yazma, silme.
>    Yapılacak iş **KOD**.
> 2. **Git commit / push YAPMA.** Değişiklikleri çalışma dizininde bırak.
> 3. **Sırayla git: T1 → T5.** T1 ve T2 kullanıcının bizzat şikâyet
>    ettiği yüzeyler; en yüksek etki orada.
> 4. Sonda **"Kendi kendini denetle"** var. Bitirdim demeden önce
>    komutları çalıştır ve **sayıları raporla**.
> 5. Her tier sonunda `node scripts/check-i18n.mjs` + `npx tsc --noEmit`
>    çalıştır. Sona bırakma — 900 metinlik bir yığında hatayı sonda
>    bulmak pahalıdır.

---

## Durum: ne bitti, ne kaldı

**Bitti (doğrulandı):**

- Bekçi `scripts/check-i18n.mjs` — parite + kaynak anahtar denetimi,
  çoğul ekleri doğru işleniyor
- 195 çözülmemiş katalog anahtarı → **0**
- Katalog 2909 anahtar, tr/en tam simetrik, uydurma değer yok
- Ölü `/decision-tools` rotası kaldırıldı
- `AuthContext` dil ezme hatası düzeltildi
- Kenar çubuğu **Yönetim** açılır menüsü (`nav.admin.*`)
- Testler: 54 dosya · 388 test PASS · tsc temiz

**Kalan — bu tarifin konusu:** ~929 sabit Türkçe metin / 58 dosya.
Bunlar İngilizce seçilince **Türkçe kalıyor**. Ham anahtar sınıfı
kapandı; bu tamamen ayrı bir sınıf.

⚠️ Ölçüm 27.08.2026'da, Codex'in son değişikliklerinden **sonra**
yapıldı — satır numaraları güncel.

---

## Nasıl bağlanır — desen

```jsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('common')             // tek namespace
const { t } = useTranslation(['workspace', 'common'])

t('bir.anahtar')                                   // kapsamdaki ns
t('common:buttons.cancel')                         // baska ns
t('feed.time.days', { count: 3 })                  // cogul + degisken
```

### Yeni anahtar hangi namespace'e gider

| Yüzey | Namespace |
|---|---|
| Ortak bileşen (`components/ui/*`), düzen, gezinme, **Ayarlar**, genel/herkese açık sayfalar | `common` |
| Giriş, kayıt, şifre sıfırlama, davet, onboarding | `auth` |
| Bilgi nesnesi, değerlendirme, kayıtlar, öğrenme ilerlemesi, ders bölümleri | `learning` |
| Çalışma alanı ekranları, içe aktarma | `workspace` |
| Mentor hafızası, mentor aksiyonları | `mentor` |
| Finansal modeller, karar araçları listesi | `tools` |
| Haberler, akış, bildirimler | `community` |
| Yönetim ekranları | `admin` |

Emin olamazsan **komşu, zaten migrate edilmiş ekranın** ne kullandığına
bak (`CoursesPage` → `learning`, `Orders` → `workspace`).

### Anahtar adlandırma

Mevcut kataloğun tarzını izle: `bolum.altBolum.anahtar`, camelCase
yapraklar. Örnek: `settings.notifications.title`,
`ui.select.emptyMessage`, `auth.onboarding.stageEarly`.

`common.json`'un üst düzeyi zaten şu: `brand, nav, buttons, states,
language, formatLocales, content, accessibility, search, settings,
errors, loading`. Uyanı kullan, gereksiz yeni üst düzey kap açma.

---

## 🔴 Değişmez kurallar

1. **Değer UYDURMA.** Anahtarın karşılığı, koddaki mevcut Türkçe
   metindir — onu taşı. İngilizcesini yazarken **ne anlama geldiğini
   koddan anla**; makine çevirisi tadında karşılık yazma.
2. **`tr` ve `en` aynı anda, aynı yapıda.** Parite denetimi yakalar
   ama baştan doğru yap.
3. **Çoğul gereken yerde çoğul kullan.** Sayı içeren metin
   (`{{count}} kayıt`) `_one`/`_other` ile yazılır. Türkçede iki biçim
   aynı olabilir — yine de ikisini de yaz, i18next bunu bekler.
4. **Arka uç sözleşmesine dokunma.** Enum değerleri, API alan adları,
   backend metnine karşı çalışan regex'ler **metin değildir**.
   (Bkz. aşağıdaki "yanlış pozitif" listesi.)
5. **Türkçe kod yorumları ve tanımlayıcılar depo tarzıdır** —
   `kaldirilabilir`, `sohbetAdi`, yorum blokları: **dokunma**.
6. **Davranış değiştirme.** Bu iş yalnız metni dışarı çıkarmak;
   düzen, mantık, akış aynı kalacak.

---

## T1 — Her ekranda görünen ortak yüzeyler (~152 metin)

En yüksek kaldıraç: tek düzeltme bütün uygulamayı etkiliyor.

### `data/calculationCatalog.js` — 39 · `useTranslation` yok

`CALCULATION_CATEGORIES` (`:2` `'Tümü'`, `:4` `'Kârlılık & Fiyatlama'`,
`:5` `'Satış & Müşteri'`…) + ~30 hesaplama görünen adı.

⚠️ **Bu dosya ZATEN migrate edilmiş üç ekranı besliyor**
(`ToolsPage.jsx`, `Header.jsx` araması, `CanonicalLessonSections.jsx`).
O ekranlar "bitti" sayılmıştı ama etiketleri buradan geldiği için hâlâ
Türkçe. **Kaynağı düzeltmeden o ekranlar düzelmez.**

Modül düzeyinde sabit olduğu için `t` yok. Desen: `label` yerine
`labelKey` taşı, tüketen bileşende `t(item.labelKey)` çağır — bu desen
depoda zaten var (`Sidebar` `i18nKey`, `ToolsPage` `item.labelKey`).

### `components/layout/*` — ~65

| Dosya | ~ | Not |
|---|---|---|
| `Sidebar.jsx` | 26 | Alt menü etiketleri `:168-169` (`Katalog`, `Geçmiş`), `:174-177` (`Akış`, `Profil`, `Takip ve engelleme`, `Sohbetler`); `Önerilen` rozeti `:230`; hızlı aksiyonlar `:265`, `:268`; bölüm başlıkları `:319`, `:324`; `aria-label`'lar. **Yönetim menüsü bitti, dokunma.** |
| `Header.jsx` | 16 | `TITLES` haritası `:24-27`; arama grup başlıkları; `title=`/`aria-label` |
| `WelcomeTour.jsx` | 11 | `useTranslation` **yok**. Adım içerik dizisi |
| `VerificationBanner.jsx` | 5 | `useTranslation` **yok**. Uyarı şeridi |
| `ContextPanel.jsx` | 4 | `useTranslation` **yok** |
| `ConsentBanner.jsx` | 3 | `useTranslation` **yok**. Yasal onay şeridi |

### `components/ui/*` — ~48 · hiçbirinde `useTranslation` yok

`Select.jsx` (5 — `'Eşleşen sonuç yok'` `:5`, `'Seçim'`, `'Seçiniz'`,
`'Ara...'`, `aria-label="Seçenek ara"`), `QuizWidget.jsx` (7),
`TaskWorkspace.jsx` (7), `ConfirmModal.jsx` (5), `ImageViewer.jsx` (5),
`FlashcardSection.jsx` (4), `StorageNotice.jsx` (3),
`DataTable.jsx` (2), `PasswordInput.jsx` (2), `SearchBar.jsx` (2),
`AkisVideosu.jsx` (2), `VideoPlayer.jsx` (2 — `:65` `'Tamamlandı'`;
⚠️ `:86` `label="Türkçe"` bir **WebVTT altyazı parça etiketi**, arayüz
metni değil — dokunma), `Loading.jsx` (1), `Modal.jsx` (1).

⚠️ Bu bileşenlerin varsayılan prop değerleri var
(`emptyMessage = 'Veri bulunamadı'`). Varsayılanı `undefined` yapıp
bileşen içinde `t()` ile doldur — çağıran tarafları bozma.

---

## T2 — Ayarlar ve uyarılar (~158 metin)

Kullanıcının *"bazı uyarılar Türkçe"* şikâyetinin doğrudan kaynağı.

### `pages/SettingsPage.jsx` — 125 · en büyük tek dosya

`useTranslation('common')` zaten var. Bağlı olanlar: `language.*`,
`formatLocales.*`, `buttons.save/saving`, `states.loading`,
`settings.*` (kısmen). Bağlanacaklar:

- **Tüm `flash(...)` çağrıları** — hesap kaydetme, avatar yükleme/
  kaldırma, şifre, oturum kapatma, e-posta, hesap silme, çalışma
  alanı tercihleri, işletme profili, tur sıfırlama
- `SettingsSection` `title`/`description` — bildirimler, işletme
  tercihleri, işletme profili, entegrasyonlar, güvenlik, veri
- `Field label`'ları — saat dilimi, para birimi, hafta başlangıcı,
  sektör, şehir, işletme aşaması, çalışan sayısı, öncelikli hedef
- Modül düzeyi haritalar: `ROLE_LABELS`, `WEEK_DAYS`, `STAGES`,
  `LOCALES` etiketleri `:38`
- ⚠️ **Arayüz dili bölümünün açıklaması elle yazılmış bir üçlü:**
  `uiLanguage === 'en' ? 'Choose the language…' : 'Navigasyon, form…'`
  Bu, i18n'in kendisini elle taklit etmek. **Anahtara çevir.**

### `components/settings/IntegrationsPanel.jsx` — 30

`useTranslation(['integrations','common'])` var. `STATUS` haritası
`:16-18` (`Bağlı`, `Hata`, `Kapalı`) ve tüm doğrulama/hata mesajları.

### Tekil kaçaklar

| Dosya | Metin |
|---|---|
| `constants/password.js:19` | `'Büyük ve küçük harf'` — şifre gücü etiketi, kullanıcı görüyor |
| `hooks/useMentorChat.js:139` | `'Bir hata oluştu'` |
| `services/api.js:149` | `'Oturum bulunamadı'` |

### Katalog kusuru — aynı turda

`frontend/src/i18n/locales/tr/admin.json` → `imports.stats.duplicate`
değeri **`"Duplicate"`** — çevrilmemiş İngilizce. Çevresindeki her şey
Türkçe (`Hata`, `Uyarı`, `Geçerli`, `Yeni KO`, `Kaynak Hatası`).
**`"Yinelenen"`** yap. (`en` tarafı `"Duplicates"` — doğru, dokunma.)

---

## T3 — Giriş ve onboarding hunisi (~104 metin)

Yeni kullanıcının gördüğü **ilk** ekranlar.

| Dosya | ~ | Not |
|---|---|---|
| `pages/OnboardingPage.jsx` | 61 | `useTranslation` **yok**. Üç seçenek dizisi `:9-38` (`Kuruluş / Erken Aşama`, `Büyüme`, `Fiziksel Mağaza`…) + adım metinleri |
| `pages/PasswordResetPage.jsx` | 27 | `useTranslation` **yok**. `:52-53` yasal bağlantı etiketleri dahil |
| `pages/InvitationPage.jsx` | 8 | `useTranslation` **yok** |
| `pages/AuthPage.jsx` | 5 | `useTranslation('auth')` var |
| `pages/AuthThemeToggle.jsx` | 3 | `useTranslation` **yok** |

---

## T4 — Uygulama içi ekranlar (~373 metin)

| Dosya | ~ | ns önerisi |
|---|---|---|
| `pages/FinancialModelWorkspace.jsx` | 87 | `tools` |
| `pages/KnowledgeDetail.jsx` | 40 | `learning` |
| `pages/DecisionCheckList.jsx` | 34 | `tools` |
| `pages/Workspaces/ImportDialog.jsx` | 32 | `workspace` (ns zaten var) |
| `components/memory/MemoryPanel.jsx` | 31 | `mentor` |
| `pages/FinancialModelLibrary.jsx` | 21 | `tools` |
| `pages/AssessmentPage.jsx` | 17 | `learning` |
| `pages/KnowledgePage.jsx` | 17 | `learning` |
| `pages/NewsPage.jsx` | 15 | `community` |
| `components/progress/LearningProgressPanel.jsx` | 14 | `learning` |
| `pages/NotificationsPage.jsx` | 14 | `community` |
| `components/course/CanonicalLessonSections.jsx` | 10 | `learning` |
| `components/practice/EmbeddedPracticeBlock.jsx` | 8 | `learning` |
| `pages/EnrollmentsPage.jsx` | 8 | `learning` |
| `pages/Workspaces/navigation.js` | 7 | `workspace` — `i18nKey` var, sabit `label` yedekleri kalmış; normalize et |
| `components/feed/PersonalizedFeed.jsx` | 6 | `community` |
| `pages/KnowledgeTopicPage.jsx` | 5 | `learning` |
| `utils/mentorSuggestedActions.js` | 3 | `mentor` — ⚠️ önce kontrol et: `labelKey` **zaten** üretiliyor ve `MentorMessageBubble` `t(action.labelKey)` çağırıyor. Sabit `label` alanı ölü yedek olabilir; öyleyse sil, uydurma anahtar ekleme |
| `components/feed/FeedCard.jsx` | 2 | `community` |
| `pages/admin/AdminImports.jsx` | 2 | `admin` — `SEVERITY_OPTIONS` artığı |

---

## T5 — Genel ve herkese açık sayfalar (~138 metin)

| Dosya | ~ | Not |
|---|---|---|
| `pages/SupportPage.jsx` | 74 | `useTranslation` **yok**. SSS dizisi `:26+`. Kenar çubuğundan linkli, gerçekten kullanılıyor |
| `pages/AboutPage.jsx` | 45 | `useTranslation` **yok**. `MODULLER` dizisi `:43+` |
| `pages/LegalPage.jsx` | 6 | ⚠️ **YALNIZ belge başlıkları** (`:30-32`). **Gövde metnine dokunma** — `content/legal/*` bilerek Türkçe |
| `components/about/EkranCizimi.jsx` | 5 | Çizim başlıkları |
| `pages/NotFound.jsx` | 3 | |
| `pages/Unauthorized.jsx` | 3 | |
| `components/legacy/LegacyFeatureUnavailable.jsx` | 2 | |

---

## Kapsam dışı — bilerek

**Özellik bayrağı KAPALI eski ekranlar** (ürün sahibi kararı):
`FlashcardDashboardPage` (22), `FlashcardStudyPage` (14),
`practical-cards/PracticalCardDetail` (12),
`practical-cards/SavedPracticalCards` (5),
`practical-cards/PracticalCardList` (2), `QuizTakePage` (2),
`QuizDashboardPage` (2). `config/featureFlags.js`'de
`legacyFlashcards`, `legacyQuiz`, `practicalCards` üçü de `false`.

**Yanlış pozitifler — bunlar metin DEĞİL, dokunma:**

| Dosya | Neden |
|---|---|
| `utils/canonicalContent.js` (14) | Arka uç içeriğine karşı çalışan **regex eşleştiricileri** (`/karar\s+ara[çc]lar[ıi]/i`). Değiştirirsen içerik ayrıştırma bozulur |
| `pages/Dashboard.jsx` (2) | `['high','urgent','yüksek','düşük']` — arka uç **enum eşleştirici** |
| `components/mentor/MentorMessageBubble.jsx` (3) | AI yanıtındaki feragat metnini yakalayan **eşleştirici** |
| `components/ui/VideoPlayer.jsx:86` | `label="Türkçe"` — WebVTT altyazı parça etiketi |

**Yasal metin gövdeleri** (`content/legal/*`), **kurs/haber/kullanıcı
içeriği**, **arka uç (`src/`)** — hepsi kapsam dışı.

---

## Bilinen tuzaklar

- **Diakritiksiz Türkçe kelimeler kaçar.** `[çğıöşüÇĞİÖŞÜ]` araması
  `Kaydet`, `Panel`, `Komisyon`, `Bildirimler` gibi kelimeleri
  **bulamaz**. Bu projede birden çok kez sayıyı düşük gösterdi.
- **Yorum satırları gürültünün ~%60'ı.** Saymadan önce `//` ve
  `/* */` gövdelerini ele.
- **`grep -c` sıfır eşleşmede hata koduyla çıkar**, `&&` zincirini
  kırar. `|| true` ekle.
- **Modül düzeyi sabit diziler** (`STATUS`, `TABS`, `ROLE_LABELS`)
  bileşen dışında; `t` orada yok. Ya `labelKey` taşı ya diziyi
  bileşen içine/`useMemo`'ya al. Depoda **iki desen de** var.
- **Bileşen varsayılan prop'ları** (`emptyMessage = 'Veri bulunamadı'`)
  — varsayılanı kaldırıp içeride `t()` ile doldur.
- **Test dosyaları sabit Türkçe metin bekliyor olabilir.** Bir test
  düşerse metni testte de güncelle — ama önce **testin ne koruduğunu**
  anla; körlemesine metin değiştirme.

---

## Kendi kendini denetle

```bash
# 1. Bekçi: parite + kaynak anahtar. GECMELI.
node scripts/check-i18n.mjs

# 2. Tip kontrolu
cd frontend && npx tsc --noEmit

# 3. Testler — 54 dosya / 388 testin ALTINA dusmemeli
cd frontend && npx vitest run

# 4. Uretim derlemesi
cd frontend && npm run build

# 5. Katalog kusuru duzeldi mi (bos cikmali)
grep -n '"duplicate": "Duplicate"' frontend/src/i18n/locales/tr/admin.json || true

# 6. Ortak bilesenlerde sabit Turkce kaldi mi
grep -rnE "[çğıöşüÇĞİÖŞÜ]" frontend/src/components/ui/*.jsx | grep -vE "^\S+:[0-9]+:\s*(\*|//)" || true

# 7. Kapsamdaki dosyalarda useTranslation eksigi
grep -rLE "useTranslation" frontend/src/components/layout/*.jsx || true
```

### Kabul ölçütleri

| # | Ölçüt |
|---|---|
| 1 | `check-i18n.mjs` **geçiyor** (parite + kaynak anahtar 0 hata) |
| 2 | `npx tsc --noEmit` **temiz** |
| 3 | `npx vitest run` geçiyor, **54 dosya · 388 testin altına düşmemiş** |
| 4 | `npm run build` başarılı |
| 5 | Denetim 5 → boş (`duplicate` düzeldi) |
| 6 | Denetim 6 → boş ya da yalnız açıklanabilir kalıntı |
| 7 | Tarayıcıda dil **İngilizce**yken: kenar çubuğu alt menüleri, Ayarlar bölüm başlıkları ve bir kaydetme uyarısı **İngilizce** görünüyor |
| 8 | Tarayıcıda dil **Türkçe**yken hepsi Türkçe — geriye dönük bozulma yok |
| 9 | Git commit / push **yapılmadı** |

### Raporlama

Bitirince **sayıyla** bildir:

- Tier bazında: kaç dosya, kaç metin bağlandı
- Katalog: kaç anahtar eklendi (önce 2909 → sonra ?)
- Test: önce → sonra
- `check-i18n` çıktısının son satırı
- **Yapamadığın / atladığın ne varsa açıkça yaz** — özellikle
  "yanlış pozitif sandım, dokunmadım" dediklerini listele.
  Yarım bırakılan bir madde, gizlenmiş bir maddeden iyidir.
