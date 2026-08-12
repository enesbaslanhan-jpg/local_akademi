# FAZ 5C RAPORU — Tool-Open Destiny (Karar Araçlarının Açılma Kaderi)

Tarih: 11.08.2026 · Kapsam: karar araçları liste + oturum + sonuç + fiş açılış/kapanış akışlarının tamamı
Otorite: DESIGN.md + FAZ 5C talimatı · Ağaç: `frontend/src` (kanonik)

---

## 1. Denetim yöntemi

Tüm "aracı aç" yolları uçtan uca izlendi: Sidebar/Header linkleri → `DecisionCheckList`
(kart + bağlam paneli) → `openCheck` → `DecisionCheckSession` → `StructuredDecisionTool` /
`ProfitabilityDecisionTool` (form → sonuç) → `DecisionReceipt` (modal + yazdırma).
Ek olarak araçların bağlı olmadığı eski `/decision-tools` mockup rotası ve 3 araçtaki
`window.location.reload()` geçişleri tarandı. Git geçmişi (cd9cbd1, 22c2b01, cb630d8,
7740286) açılış akışının önceki fazlarda kurulduğunu doğruladı.

## 2. Açılış yolculuğu haritası (değişiklikten önceki hali)

```
Sidebar/Header → /app/decision-checks (DecisionCheckList)
  ├─ Kart CTA (Aracı Aç / Devam Et / Sonucu Gör) ─┐
  ├─ Bağlam paneli Araçlar listesi ───────────────┴→ openCheck
  │     ├─ mevcut sessionId varsa → navigate(session)                          ✓
  │     └─ yoksa start(code) → "Açılıyor…" (disabled) → navigate(session)      ✓
  ├─ Session: hata/boş/yükleniyor ekranları ✓, araç tipine göre form ✓
  └─ Sonuç: complete() → window.location.reload() ← ✗ TAM SAYFA YENİLEME
        └─ Konuşlandırılmamış eski rota: /decision-tools (mockup, sahte veri,
           tıklanamaz kartlar, hiçbir yerden link yok) ← ✗ ÖLÜ ROTA
```

## 3. Denetim pasları — değişiklik gerektirmeyen bulgular

- **Liste**: hero (DarkPanel + sweep, TEK koyu panel), taşan cam arama hapı, durum
  süzgeçleri (masaüstü panel + mobil chip satırı, sayaçlı), kart ikonları araç
  KODUNDAN türetiliyor (uydurma ikon yok), durum rozetleri token tabanlı, `openCheck`
  "Açılıyor…" + disabled + `role="alert"` hata bandı. **Açılış kararlı ve duyurulu.**
- **"Aracı aç" davranışı**: gerçek uygulama araç kullanıcısını tam sayfaya götürüyor;
  "tıklayınca aşağıda sessiz bir alan açılıyor" davranışı **canlı koddan zaten
  silinmişti** — bu davranış yalnız mockup çağına aitti. Kullanıcı şikâyetinin kalan
  gerçek kaynağı 4. maddedeki tam sayfa yenilemeydi.
- **Sonuç sayfası**: ton hero'su (good/warning/bad gradyanları), metrikler,
  karşılaştırmalı senaryolar, risk/güvenli adım panelleri, formüller, aksiyon satırı
  (Listeye dön / Yeniden Hesapla / Sonucu Mentora sor), fiş tetikleyicisi (DarkPanel
  imzası), `prefers-reduced-motion` — tümü token/ölçek uyumlu.
- **Fiş (DecisionReceipt)**: çalışmayan aksiyonlar (Kaydet/Paylaş/Not Ekle) `disabled`
  + `title="Yakında"` — "çalışıyor gibi görünme" yok; Yazdır çalışıyor; modal kapanışı
  düzgün; `dr-print-root` baskı işaretçisi yerinde.
- **Buton ölçüleri (Faz 2 mirası)**: `.structured-primary` 50px, `.structured-secondary`/
  `.structured-mentor` 44px, `.profit-primary/secondary/mentor` ~44-48px — sözleşmeye uygun.
- **Oturum hataları**: yüklenememe / bulunamama ekranları + "Yeniden dene" — mevcut.

## 4. Bulunan kritik sorunlar ve düzeltmeler

### 4.1 Sonuç, tam sayfa yenilemeyle açılıyordu → yerinde (in-place) açılış

`complete()` başarılı olunca üç ayrı konumda `window.location.reload()` çağrılıyordu;
sonuç görünümü ancak beyaz sayfa flaşından sonra beliriyordu. Bu, "araç açıldı ama ne
oldu belli değil" hissinin gerçek kaynağıdır.

- `StructuredDecisionTool.jsx`: `resolvedResult` state'i eklendi; submit sonrası
  `complete()` → `getResult(session.id)` → `setResolvedResult(resultRes)`. Render koşulu
  `session.status === 'completed' || resolvedResult` oldu. `reload` yalnızca
  **son çare** olarak kaldı: kayıt tamamlanmışsa ama sonuç yüklenemezse (gerçekten
  ender) sayfa yenilenir ve sonuç görünürlülüğü garantilenir.
- `ProfitabilityDecisionTool.jsx`: aynı desen (`liveResult = resolvedResult ?? result`).
- `DecisionCheckSession.jsx` (jenerik/jenerik-olmayan araç dalı): `completeSession`
  sonrası `getResult` → `setResult` + `setSession({...status:'completed'})` — koşulsuz
  reload kaldırıldı; fallback yine son çare.

Etki: "Sonucu hesapla" tıklamasından sonuç hero'sunun açılışına kadar tek istek seti,
tam sayfa yeniden yükleme yok, formdaki kayıtlı değerler görsel olarak sonuca
devrediliyor.

### 4.2 Ölü mockup rotası `/decision-tools` → gerçek listeye yönlendirme

`DecisionToolsPage` (sahte verili, tıklanamaz kartlı, AppLayout dışı tasarım mock'u)
hiçbir yerden linklenmiyordu (Sidebar/Header ikisi de `/app/decision-checks`'e bakar).
Yine de elle erişilebiliyordu. `router/index.jsx`'te rota artık
`<Navigate to="/app/decision-checks" replace />`. `DecisionToolsPage` lazy import'u
router'dan çıkarıldı; sayfa dosyası arşiv niteliğiyle yerinde kaldı (referanssız).
Mockup çağının "sessiz açılış" deneyimi böylece canlı uygulamada erişilemez durumda.

### 4.3 Dokunma hedefi düzeltmeleri (44px alt sınırı)

- `DecisionCheckList.css`: `.decision-card-cta` `min-height 40→44px` (kart başı ana
  aksiyon); `.decision-list-retry` `min-height 44px`; bağlam paneli filtre/araç
  butonları `39→40px` (desktop chrome kontrolü).
- `DecisionReceipt.module.css`: `.action` butonlarına `min-height 44px` +
  `justify-content: center` (4'lü çeyrek ızgarada ikon+etiket dikey hedef).

## 5. Testler

- `StructuredDecisionTool.test.jsx`: api mock'una `getResult` eklendi; yeni test
  "opens the saved result view in place after completing — no full reload" — submit
  sonrası `getResult` çağrısı ve sonuç hero'nun (`UYGUN`) form alanı yerine render
  edildiğini doğruluyor.
- `DecisionCheckSession.test.jsx`: yeni test — jenerik araç dalında "Sonuçları Gör"
  sonrası `complete` → `getResult` → "Değerlendirme Sonucu" görünümü, reload'suz.
- `DecisionCheckList.test.jsx` dokunulmadı (değişiklik yalnız CSS geometrisi).
- Sonuç: **25 dosya / 138 test PASSED** (önceki 136 → 138).

## 6. Build

- `npm run build` → ✓ 10.57s (tek uyarı: mevcut 500 kB üstü ana chunk — bu
  değişikliklerle ilgisiz, 5B'de de kayıtlı).
- Tarama: `window.location.reload` kalıntısı 3 araçta **yalnız son-çare fallback**
  olarak; `decision-tools` referansı yalnız router redirect'te; `DecisionToolsPage`
  lazy import'u 0 referans (dosya arşiv).

## 7. Manuel smoke (tarayıcı erişimi yok — açık doğrulama listesi)

1440/1280/768/430/390/360, light+dark:
- Liste: hero, arama hapı (+ bağlam paneli senkronu), süzgeçler, kart CTA durum
  metinleri, "Açılıyor…" sırasında buton kilidi, panel Araçlar listesi.
- Oturum: koddan (DC-…) link ve sessionId linki; hata/yeniden dene ekranları.
- Sonuç: formdan "Sonucu hesapla" → kesintisiz sonuç açılışı (yenileme yok);
  ton hero, fiş tetikleyici + modal kapanışı, fiş yazdırma, Yeniden Hesapla,
  Listeye dön, Mentora sor.
- `/decision-tools` elle açılış → `/app/decision-checks`'e yönlenme.

## 8. Sonraki paketlere taşınan konular

- `DecisionToolsPage.jsx` + `.module.css`: arşiv dosyası; kalıcı olarak silinip
  silinmeyeceğine karar (mevcut durumda referanssız ve erişilemez, zararsız).
- Backend `complete` idempotency doğrulaması (mükerrer "Yeniden Hesapla"/tekrar
  gönderim davranışı API tarafında net ayrıntı).
- Bağlam paneli "Araçlar" listesinde aktif aracın işaretlenmesi (mevcut gezinme
  ActiveNav'da vardır; panel satırında yok — bilinçli, chrome).
- Faz 6 mobil: karar araçları sayfalarında dokunma hedeflerinin (44px) 360px
  genişlikte tam turu.

---

# FAZ 5C.1 — Button Geometry Contract Fix

Tarih: 11.08.2026 · Kapsam: yalnızca karar araçları buton geometrisi
Amaç: DESIGN.md §6 Button sözleşmesiyle tam uyum (`sm=32px / md=40px / lg=48px`).
Route, sonuç akışı ve backend davranışı dokunulmadı.

## 1. Structured button sonucu

`StructuredDecisionTool.jsx` + `.css`:
- Form submit ("Sonucu hesapla") → shared `<Button type="submit" variant="primary" size="md">`.
- Sonuç aksiyonları → shared Button:
  - `Listeye dön` → `variant="quiet" size="md"`
  - `Yeniden Hesapla` → `variant="secondary" size="md"`
  - `Sonucu Mentora sor` → `variant="primary" size="md"`
- `.structured-primary` (50px), `.structured-secondary` (44px), `.structured-mentor` (44px) CSS blokları silindi.
- Full-width submit için `.structured-submit-wrap` eklendi; butonun kendisi artık shared contract yüksekliğinde (40px).
- Kalan `structured-back` metin linkidir, buton değildir.

## 2. Profitability button sonucu

`ProfitabilityDecisionTool.jsx` + `.css`:
- Sonuç aksiyonları → shared Button:
  - `Listeye dön` → `quiet`
  - `Yeniden Hesapla` → `secondary`
  - `Sonucu Mentora sor` → `primary`
- Form submit `.profit-primary` ("Kârlılığımı hesapla") özel buton olarak kaldı
  çünkü `terracotta` rengi shared Button variant'larında yok (yeni variant
  açılmadı). Yüksekliği `min-height: var(--control-h-lg)` (48px) ile contract'a
  çekildi; sayfanın TEK ana CTA'sı olduğu için lg kullanımı gerekçelidir.
- `.profit-secondary` ve `.profit-mentor` CSS blokları silindi.

## 3. Card CTA sonucu

`DecisionCheckList.css`:
- `.decision-card-cta` desktop `min-height: var(--control-h-md)` (40px).
- Mobil (`max-width: 899px`) `min-height: 44px` hit-area korundu.
- `.decision-list-retry` aynı 40/44px ayrımına çekildi.
- Yorum güncellendi: "Desktop 40px md; mobil 44px hit-area".

## 4. Receipt action sonucu

`DecisionReceipt.module.css`:
- `.action` desktop `min-height: var(--control-h-md)` (40px).
- `@media (max-width: 899px) { .action { min-height: 44px; } }` ile mobil
  dokunma hedefi ayrıldı.
- Gerekçe: 4'lü çeyrek ızgara mobilde dar sütunlara bölünür; 44px satır
  yüksekliği grid yapısıyla çelişmez, aksine eşit yükseklikte kutucuklar
  sağlar.

## 5. Result action hierarchy

Tüm sonuç yüzeylerinde aksiyonlar aynı görsel ağırlıkta değil:

| Aksiyon | Yüzey | Varyant | Amaç |
|---|---|---|---|
| Sonucu Mentora sor | Structured / Profitability / Generic | `primary` (teal) | Birincil sonraki eylem |
| Yeniden Hesapla | Structured / Profitability / Generic | `secondary` | İkincil eylem |
| Listeye dön / Listeye Dön | Structured / Profitability / Generic | `quiet` | Sessiz çıkış |
| Karar fişini görüntüle | Structured / Profitability | DarkPanel tetikleyici | Sonuç artefaktı (buton hiyerarşisi dışı) |

Generic (`DecisionCheckSession`) result branch'i de bu hiyerarşiye çekildi:
`quietBtn` / `secondaryBtn` / `mentorBtn` (primary teal). Önceki iki outline
buton + bir indigo light buton eşit ağırlık durumu ortadan kalktı.

## 6. Kalan custom decision button

Shared Button'a geçilemeyen veya geçişi görsel sapma yaratacak olan
özel butonlar (tümü DESIGN token yüksekliğinde):

- `.profit-primary` — terracotta, tek ana CTA, `lg=48px`.
- `.decision-card-cta` — full-width kart aksiyonu, `md=40px` desktop / 44px mobile.
- `.decision-list-retry` — hata durumu aksiyonu, `md=40px` desktop / 44px mobile.
- `.decision-panel-filter`, `.decision-panel-tool` — bağlam paneli chrome
  kontrolleri, `md=40px`.
- `DecisionReceipt .action` — dikey ikon+etiket grid butonları, `md=40px`
  desktop / 44px mobile.
- `DecisionCheckSession` `.submitBtn`/`.secondaryBtn`/`.mentorBtn`/`.quietBtn` —
  jenerik dal butonları, `md=40px`.

Tarama sonucu: karar araçları dosyalarında 50px, 46px veya 44px desktop
buton kalmadı. 44px değerleri yalnızca mobil hit-area media query'lerinde
ve Receipt mobil kırılımında geçerli.

## 7. Build/test

- `npm test` → ✓ 25 dosya / 138 test PASSED (5C'ye eklenen 2 test korundu).
- `npm run build` → ✓ 8.85s (tek uyarı: mevcut ana chunk boyutu, bu değişikliklerle
  ilgisiz).
- Tarama: `DecisionCheckSession.css` durum ekranı butonları (`min-height` yok,
  padding tabanlı ~40px) bu paket kapsamı dışındadır (state/chrome, karar
  aksiyonu değil).