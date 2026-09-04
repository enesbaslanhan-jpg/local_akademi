# LocalKarar Design System v2 — Compact & Unified

**Durum:** Tek kaynak (source of truth).  
**Yoğunluk profili:** `compact-balanced`.  
**Kapsam:** LocalKarar web uygulamasının tamamı — page-level CSS bu sözleşmenin dışına çıkamaz.

---

## 0. Temel kural (enforceable contract)

> **Page-level CSS must not invent new colors, font sizes, spacing values, radii, shadows, control heights or component variants.**

Bir sayfa kendi başına şunları **oluşturamaz**:

- yeni button ölçüsü / yüksekliği / genişliği,
- rastgele mavi tonu veya yeni renk değeri,
- yeni card radius / shadow / glass değeri,
- farklı input/seçim arama kutusu yüksekliği,
- farklı title scale (page title, section title, card title),
- sistemde tanımlı olmayan component varyantı.

İhtiyaç varsa sıra şudur:

1. Önce **token** (yoksa) `frontend/src/styles/` içinde tanımlanır,
2. sonra **component varyantı** ilgili `.module.css`'te eklenir,
3. en son sayfa CSS'i yalnızca **var()** referansı kullanır.

Yeni token/varyant eklemeden önce bu dosyanın ilgili bölümünde karşılığı olup olmadığı kontrol edilir. Eksikse listeden **bir** satırı genişletmek yerine bu dokümana yeni madde eklenip gerekçe yazılır.

### Aynı hiyerarşide keyfi ölçü farkı yasağı

Aynı hiyerarşideki iki component arasında keyfi ölçü farkı kabul edilmez:

- normal button = `40px` iken başka sayfada aynı "normal" button = `56px` **yapılamaz**;
- aynı kural `card`, `title`, `input`, `search`, `tabs`, `table rows`, `navigation items`, `metric` için geçerlidir.

`lg` boyut yalnızca bu dokümanda izin verilen durumlarda kullanılır.

---

## 1. Marka ve renk sistemi

### 1.1 LocalKarar Brand Palette (KRİTİK — DEĞİŞTİRİLMEZ)

LocalKarar'ın kullanıcı tarafından araştırılarak seçilmiş gerçek marka paleti `tailwind.config.js`
içindeki `brand` ailesidir. Yeni palet üretilmez; bu aile design system'in merkezi token sistemi
yapılır. **Standart Tailwind `blue-*` ailesi LocalKarar brand'i değildir.**

**Primary:**

```
brand-500 = #306D88
```

**Supporting:**

```
brand-50  = #D8E3E8
brand-100 = #C5D6DE
brand-200 = #A0BCC8
brand-300 = #7BA2B3
brand-400 = #55879D
brand-500 = #306D88   (primary)
brand-600 = #25556A
brand-700 = #1B3D4C
brand-800 = #10242D
brand-900 = #010203
brand-950 = #000000
```

> **brand-900 ve brand-950:** *Not approved as primary surface/background tokens.*
> Bunlar eski palette bulunabilir fakat yeni visual system arka planlarının kaynağı değildir.
> Ana background veya ana surface olarak kullanılamaz (bkz. §1.3, §2.1).

### 1.2 Brand roller (uygulama kuralları)

| Rol | Token | Kullanım |
|---|---|---|
| Primary brand / default accent | `brand-500` (`#306D88`) | Primary CTA, primary action, önemli metric, logo vurgusu |
| Hover / light accent | `brand-400` (`#55879D`) | Hover state, dark-mode light accent |
| Stronger emphasis / dark-mode primary | `brand-600` (`#25556A`) | Koyu zeminde vurgu, normal metin üstü bağlantı |
| Selected / active / deep accent | `brand-700` (`#1B3D4C`) | Seçili state, active state, derin vurgu |
| Dark-mode light accent / low-risk highlighted text | `brand-300` (`#7BA2B3`) | Koyu modda vurgulu metin, link |
| Light-mode subtle backgrounds / borders | `brand-50`–`brand-200` | Tonal zemin, seçili satır, soft chip, hafif çizgi |

Kontrast üretimi palette içinden yapılır; **yeni hue üretilmez** (turkuaza veya standart
Tailwind blue'ya kayma yok).

### 1.3 Brand / Surface ayrımı (KRİTİK)

Brand palette yalnız şunlar için kullanılır:

- CTA,
- active state,
- focus,
- progress,
- link,
- selected navigation,
- önemli metric,
- kontrollü vurgu.

Dark mode arka planı **doğrudan brand palette'ten türetilmez.** Özellikle `brand-900` (`#010203`)
ve `brand-950` (`#000000`) ana background veya ana surface **olamaz**:

- brand hue karakteri kaybolur,
- tasarım saf siyaha yaklaşır,
- doğal charcoal görünüm bozulur,
- tüm ürün markanın aşırı koyu uzantısına dönüşür.

Arka planlar için ayrı neutral/surface sistemi korunur (§2.1).

### 1.4 Legacy Tailwind blue migration kuralı

Projede eski componentlerde şu değerler bulunabilir:

```
#2563EB   #1D4ED8   #1E40AF   #1E3A8A
#3B82F6   #60A5FA   #93C5FD   #DBEAFE   #EFF6FF
bg-blue-600   text-blue-600   bg-blue-100   text-blue-800   ...
```

Kurallar:

- Bu renkler **legacy / migration target** olarak kabul edilir.
- **Yeni UI'da kullanılmazlar.**
- UI uygulanırken bu değerler merkezi `brand-*` tokenlarına migrate edilir:

| Legacy (kullanılmaz) | Migration hedefi |
|---|---|
| `#2563EB`, `bg-blue-600` | `brand-500` |
| `#1D4ED8` (hover) | `brand-600` |
| `#1E40AF`, `#1E3A8A` (koyu metin) | `brand-700` |
| `#3B82F6` | `brand-400` (veya context'e göre `brand-500`) |
| `#DBEAFE`, `#EFF6FF` (soft zemin) | `brand-100` / `brand-50` |

> Bu görevde CSS/component dosyaları değiştirilmez; yalnızca migration kuralı tanımlanır.
> Migration, implementation fazında `DESIGN.md`'ye uygun olarak yapılır.

### 1.5 Semantic renkler (brand ile yarışmaz)

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `success` | `#15803D` | `#4ADE80` | Başarı, olumlu değer |
| `warning` | `#B45309` | `#FBBF24` | Uyarı |
| `error` / `danger` | `#B91C1C` | `#F87171` | Hata, yıkıcı işlem |
| `info` | `brand-500` | `brand-400` | Bilgi |

Zemin varyantları: `success-bg`, `warning-bg`, `danger-bg` (light: %8–10 tint; dark: %12–16 koyu tint). `success`/`warning`/`error` hiçbir yerde brand ile aynı alanda yarışmaz: aynı kartta hem primary CTA hem success metni varsa success daha sönük ton kullanır.

---

## 2. Surface & text hiyerarşisi

### 2.1 Yüzey kademeleri (tonal layering — gölge tek başına ayırmaz)

Surface tokenları **brand palette'ten bağımsız** ayrı bir sistemdir (bkz. §1.3).
Dark mode yüzeyleri saf siyah değildir; **charcoal / dark graphite / subtle teal-charcoal**
karakterindedir ve LocalKarar brand palette ile uyumludur — ama `brand-900`/`brand-950`'den
türetilmez.

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `background` | `#EDF0F2` | `#15181C` | Sayfa zemini (saf siyah değil) |
| `surface-0` | `#E4E8EB` | `#101317` | Sunken / içeri gömülü alan, input zemini |
| `surface-1` | `#F4F6F8` | `#191D21` | Panel / bölüm alanı |
| `surface-2` | `#FBFCFD` | `#1D2126` | Kart (varsayılan) |
| `surface-3` | `#FFFFFF` | `#22272C` | Vurgulu kart, hover kart |
| `surface-elevated` | `#FFFFFF` | `#282E34` | Modal, dropdown, drawer, popover |
| `surface-overlay` | `rgba(15,23,42,.52)` | `rgba(8,10,14,.66)` | Modal/drawer arkası karartma |

Kural: yüzeyler arası ayrım önce **ton farkı** ile, sonra **border**, en son **shadow** ile yapılır. İki komşu yüzeyin değerleri birbirinden ayırt edilebilir olmalıdır.

### 2.2 Metin kademeleri

| Token | Light | Dark |
|---|---|---|
| `text-primary` | `#1A1C1E` | `#E4E9ED` (kırık beyaz) |
| `text-secondary` | `#3F484A` | `#9AA6AE` (yumuşak gri) |
| `text-muted` | `#6B7575` | `#7C8790` |

Kontrast hedefleri (WCAG AA): `text-primary` en az **7:1**, `text-secondary` en az **4.5:1**, `text-muted` yalnızca yardımcı/yan bilgide ve en az **3:1** (label/caption tercihen 4.5:1).

### 2.3 Border

| Token | Light | Dark |
|---|---|---|
| `border-default` | `rgba(26,28,30,.14)` | `rgba(255,255,255,.10)` |
| `border-strong` | `rgba(26,28,30,.24)` | `rgba(255,255,255,.16)` |
| `divider` | `rgba(26,28,30,.08)` | `rgba(255,255,255,.06)` |

Kural: dark mode'da yüzey ayrımı border'la değil tonal farkla yapılır; border yalnızca ipucudur.

---

## 3. Glow / Shadow / Glass standardı

### 3.1 Öncelik sırası

```
surface contrast → border → subtle shadow → glow
```

Glow **yalnızca**: focus ring, active state, önemli CTA, çok sınırlı hero/brand kullanımı. Normal kartların çevresinde sürekli büyük mavi glow **YOKTUR**.

### 3.2 Shadow kademeleri

| Token | Değer (light) | Değer (dark) |
|---|---|---|
| `shadow-none` | `none` | `none` |
| `shadow-sm` | `0 1px 2px rgba(26,28,30,.06)` | `0 1px 3px rgba(0,0,0,.45)` |
| `shadow-md` | `0 3px 12px -2px rgba(26,28,30,.10)` | `0 4px 16px -2px rgba(0,0,0,.5)` |
| `shadow-overlay` | `0 26px 56px -14px rgba(26,28,30,.22)` | `0 30px 66px -14px rgba(0,0,0,.72)` |

Kural:
- Kart varsayılanı `shadow-sm`; hover `shadow-md`.
- `shadow-overlay` yalnızca modal/drawer/popover.
- Koyu imza panelleri için tek istisna `shadow-dark` (koyu yüzey + üst 1px ışık çizgisi).
- 600ms'lik dev hover gölge/şerit geçişleri kaldırılır; tüm interaction süreleri §12'deki eşiğe uyar.

### 3.3 Radius sistemi (kompakt & profesyonel)

| Token | Değer | Kullanım |
|---|---|---|
| `radius-xs` | `6px` | chip, badge, küçük etiket |
| `radius-sm` | `8px` | input, select, button, list row, tooltip |
| `radius-md` | `12px` | kart (compact/standard), panel, modal |
| `radius-lg` | `16px` | feature card, auth panel, büyük kart |
| `radius-full` | `999px` | pill button, badge, avatar |

Yasak: `24px` radius her karta verilmez; `16px` üstü yalnızca `feature` kart ve hero yüzeylerdedir.

### 3.4 Glass allow-list (serbest kullanım yok)

Glassmorphism yalnızca **şu merkezi alanlarda** kullanılır:

1. Header overlay,
2. Sidebar floating / overlay state (mobil drawer dahil),
3. Modal,
4. Drawer,
5. Command / search overlay,
6. Mentor overlay panel,
7. Transient popover.

Allow-list dışındaki **normal cards, tables, forms, dashboard widgets, course cards, list rows**
üzerinde `backdrop-filter` / glass **kullanılmaz**.

Tokenlar: `--glass-bg` (light `rgba(255,255,255,.68)`, dark `rgba(18,20,23,.94)`), `--glass-border`, `--glass-blur: 14px`, `--glass-shadow`. Allow-list dışındaki yüzeylerde glass token'ları referans alınmaz.

---

## 4. Typography scale

**Tek ana font ailesi: Manrope.** Başlık ve gövde ayrımı font ailesi değiştirerek değil;
`size`, `weight`, `line-height`, `letter-spacing` ile sağlanır. İkinci font (ör. monospace)
yalnız güçlü teknik gerekçeyle kalır — varsayılan değildir.

Tüm token değerleri **tam px** cinsindendir; küsuratlı değer (`20.8px`, `15.2px`, `0.95rem` gibi)
kullanılmaz. Uygulamada `rem` kullanılacaksa ham px karşılığından türetilir (1rem = 16px).

| Token | Desktop | Mobile (≤640) | Ağırlık | Kullanım |
|---|---|---|---|---|
| `display` | `clamp(32px, 4vw, 48px)` | aynı | 700 | Hero (yalnız ana sayfa / auth / onboarding) |
| `page-title` | `24px` | `20px` | 700 | Sayfa başı h1 — **tüm sayfalarda aynı** |
| `section-title` | `18px` | `16px` | 600 | Bölüm başlığı, panel başlığı |
| `card-title` | `16px` | `16px` | 600 | Kart başlığı |
| `body-lg` | `16px` | `16px` | 400 | Uzun okuma (course, lesson) |
| `body` | `14px` | `14px` | 400 | Varsayılan gövde |
| `body-sm` | `13px` | `13px` | 400 | Yardımcı metin, tablo hücresi |
| `label` | `12px` | `12px` | 600 | Form label, tab, chip |
| `caption` | `11px` | `11px` | 500 | Zaman damgası, meta, footnote |
| `metric-lg` | `24px` | `20px` | 700 | KPI ana değer |
| `metric-md` | `18px` | `16px` | 700 | Kart içi metrik |
| `nav-label` | — | `10px` | 600 | **Yalnız mobil alt navigasyon.** Beş sekme 11px'te 360dp genişlikte kırpılıyor (ölçüldü); onaylanan mobil prototip de burada 10px kullanıyor. Başka hiçbir yerde 10px kullanılmaz. |

Zorunluluklar:

- `page-title` bir sayfada `36px`, başka sayfada `24px` olamaz. Değer yalnızca `--font-size-page-title` token'ından okunur.
- `section-title` tüm eşdeğer panellerde aynıdır.
- `letter-spacing` yalnızca display ve page-title'da `-0.01em`.
- `line-height`: başlık `1.25`, gövde `1.5`, uzun okuma `1.75`.

---

## 5. Density & Spacing

### 5.1 Spacing scale (4px tabanlı)

Yalnızca şu değerler kullanılabilir:

```
4  8  12  16  20  24  32  40  48
```

(token: `space-1..6`, `space-8`, `space-10`, `space-12`; `space-16` yalnızca §5.2'de belirtilen izinli alanlarda). `10px` / `14px` / `18px` / `22px` gibi özel değerler yasaktır — yarı adım gerekiyorsa token listesine eklenir.

### 5.2 Standart aralıklar (compact-balanced)

| Kullanım | Desktop | Mobile (≤768) |
|---|---|---|
| page padding | `24px` | `16px` |
| section gap | `24px` | `16px` |
| card padding | `16px` (compact: `12px`; feature: `24px`) | `12px` |
| card gap (grid) | `16px` | `12px` |
| form gap (label→field→row) | `16px` | `12px` |
| table row height | `44px` | `44px` |
| list row height | `40px` | `44px` (touch) |
| panel başlığı alt boşluk | `12px` | `12px` |
| sayfa başlığı altı | `20px` | `16px` |

### 5.3 Yoğunluk yasaları

- Varsayılan: **compact-balanced**. "Ferah" yalnızca course/lesson okuma alanı ve feature card'larda.
- Data-dense ekranlar (Finance Center, Model Lab, Decision Tools, Business Tracking, Admin, Dashboard) aynı spacing scale'ini kullanır; "compact" daha küçük yazı değil, daha az boşluk demektir. Minimum gövde metni `body-sm`'dir.
- İki sayfa arasında padding/gap farkı yoktur: aynı hiyerarşi aynı boşluğu alır.

---

## 6. Button contract

### 6.1 Boyutlar — md varsayılandır

| Token | Height | H-padding | Radius | Font | Icon | Gap |
|---|---|---|---|---|---|---|
| `btn-sm` | `32px` | `12px` | `radius-sm` | `label` (12px) | `14px` | `6px` |
| `btn-md` | **`40px`** | **`20px`** | `radius-sm` | `body-sm` (13px) | `16px` | `8px` |
| `btn-lg` | `48px` | `24px` | `radius-md` | `body` (14px) | `18px` | `8px` |

`lg` yalnızca: hero CTA, onboarding, çok önemli tek primary action. Normal sayfalarda dev buton yok. `40px` normal butonun başka sayfada `56px` olması yasaktır.

Mevcut sistemdeki `min-height: 40px; padding: 10px 20px` (buttons.css) v2'de `btn-md` standardına eşittir.

### 6.2 Varyantlar

| Varyant | Light | Dark | Kullanım |
|---|---|---|---|
| `primary` | solid dolgu `brand-500`, foreground erişilebilir (beyaz, contrast geçmezse koyu) | solid dolgu `brand-500` (aynı hue, koyuda açıklık korunur), foreground erişilebilir | Tek ana eylem |
| `secondary` | `surface-3` zemin, `border-default`, `text-primary` | `surface-elevated`, `border-strong` | İkincil eylem |
| `ghost` | şeffaf zemin, metin `brand-600` | şeffaf, metin `brand-300` | Üçüncül / nav içi eylem |
| `danger` | dolgu `error`, metin beyaz | tonal `error 15%` + çizgi, `error` metin | Yıkıcı işlem |
| `quiet` | `surface-1` zemin, `text-secondary` | `surface-1` karşılığı | Düşük önem eylem |

Kurallar:

- **Primary CTA dark mode'da bile solid `brand-500` dolguludur** (tonal yüzeye dönüştürülmez); yalnızca erişilebilir foreground seçilir.
- Primary CTA'ya glow yalnızca `focus`/`active`'te; normal state'te büyük gölge yok (`shadow-sm`).
- Tonal brand yüzeyleri (`brand-500 15%` zemin + `brand-400 34%` çizgi + açık brand metin) **yalnızca `secondary`, `selected`, `subtle` durumlara** aittir — primary değil.
- Tüm varyantlar yaklaşık eşit eylemsel ağırlıkta aynı yükseklikte durur.
- Disabled: opaklık `0.5` + `cursor: not-allowed` + gölgesiz (ayrıca §19 disabled ayrımı).

**Foreground contrast kuralı:** `brand-400` (`#55879D`) zemininde küçük beyaz metin WCAG AA contrast testini (4.5:1) geçmiyorsa **koyu foreground** (`brand-800` / `#10242D`) kullanılır. Tüm foreground/background kombinasyonları (primary dahil) WCAG AA doğrulamasına tabidir: beyaz foreground yalnızca zeminin koyu olduğu kombinasyonlarda kalır.

### 6.3 IconButton

- `xs`: `28px` (yalnız header ikonları), `sm`: `32px`, `md`: `36px`, `lg`: `40px`.
- Radius `radius-sm`; ikon `16px`.
- Dokunma hedefi alt sınırı mobilde `44px`'dir (padding veya hit-area ile sağlanır).

---

## 7. Input / Select / Search standardı

### 7.1 Control boyutları — md varsayılan

| Token | Height | H-padding | Radius | Font |
|---|---|---|---|---|
| `control-sm` | `32px` | `10px` | `radius-sm` | `body-sm` |
| `control-md` | **`40px`** | `12px` | `radius-sm` | `body` |
| `control-lg` | `48px` | `14px` | `radius-md` | `body` |

Button ve form kontrol ölçüleri eşit adımda ilerler: `btn-md` = `control-md` = `40px` — yan yana duruşlarında yükseklik farkı olmaz.

### 7.2 Durumlar

| State | Light | Dark |
|---|---|---|
| zemin | `surface-0` | `surface-0` (koyu) |
| value | `text-primary` | `text-primary` |
| placeholder | `text-muted` (%60 opaklık, normal stil) | `text-muted` açık |
| border | `border-default` | `border-strong` (zayıf) |
| hover | `border-strong` | `border-strong` açık ton + `text-primary` |
| focus | `border brand-500` + 3px ring `brand-500` %12 | aynı (ring `brand-400` %18) |
| disabled | zemin `surface-0`, metin `text-muted`, çizgi `divider`, gölgesiz | aynı prensip |

Search: `control-md` yükseklik; solda ikon `16px`, sağda clear butonu; radius `radius-full` yalnızca arama kutusunda izinlidir.

Textarea: `control-md` başlangıç yüksekliği, `4px` scale'den satır aralığı; resize vertical.

---

## 8. Dark mode contract

Dark mode ayrı tema değil, aynı sistemin **token varyantıdır**. Brand karakteri korunur;
yeni hue üretilmez, turkuaza veya standart Tailwind blue'ya kayılmaz (§1.1).

### 8.1 İlkeler

- Zemin saf siyah değil: `#15181C` doğal **charcoal** — ayrı surface sistemi (§2.1). `brand-900`/`brand-950` background değildir (§1.3).
- Marka vurgusu `brand` ailesi içinden kontrasta göre seçilir:

| Rol | Token |
|---|---|
| Primary CTA | solid dolgu `brand-500` + erişilebilir foreground; glow yalnızca focus/active |
| Primary hover | `brand-600` (dark) üzeri erişilebilir foreground / `brand-400` yalnızca contrast kuralı geçiyorsa |
| Primary active | `brand-600` / `brand-700` |
| Selected nav | `brand-500` düşük opacity zemin + `brand-300`/`brand-400` foreground |
| Focus ring | `brand-400`/`brand-500` |
| Progress | `brand-500` |
| Text link | erişilebilir `brand-300`/`brand-400` varyantı |

- **Dark mode Primary CTA solid `brand-500` dolguludur** (tonal değildir); glow yalnızca `focus`/`active`'te. `brand-400` kullanılıyorsa foreground contrast kuralı uygulanır (§6.2).
- Tonal brand yüzeyleri (`brand-500 15%` zemin + `brand-400 34%` çizgi + açık brand metin) yalnızca `secondary`, `selected nav`, `subtle` durumlar içindir.
- Başlıklar kırık beyaz `#E4E9ED`, secondary metin yumuşak gri `#9AA6AE`.
- Yüzeyler yalnızca gölgeyle değil **ton farkıyla** ayrılır (`15181C < 191D21 < 1D2126 < 22272C < 282E34`).
- Kenarlık çizgi değil "kenara vuran ışık" (`rgba(255,255,255,.045–.10)`).

### 8.2 Zorunlu kontroller (her dark görünüm pasında)

cards, tables, selects, dropdowns, modals, form fields, disabled state, helper text, borders, progress, chips, tabs, hover, focus, errors için:

- metin/zemin kontrastı AA (en az 4.5:1; büyük başlıkta 3:1),
- disabled ayrımı (zemin+metin+çizgi üçü birden değişir),
- helper text `text-muted`'a dayanır ve 4.5:1'i zorlar,
- hover/focus ring `brand-400`/`brand-500`,
- progress dolgusu `brand-500`; dolgu üstü metin değil, koyu zemin üstünde açık brand.

---

## 9. Light mode

Dark mode iyileştirmeleri light modu bozamaz:

- Brand palette her iki modda kimliği korur (§1.1).
- Light mode brand hiyerarşisi:

| Rol | Token |
|---|---|
| Primary default | `brand-500` |
| Hover | `brand-600` |
| Active | `brand-700` |
| Subtle background | `brand-50` / `brand-100` |
| Subtle border | `brand-200` / `brand-300` |

- Kontrast test edilir: `brand-500` üzeri beyaz metin ≥4.5:1; küçük amaçlı metinde `brand-600`/`brand-700` zeminlerde doğrulanır.
- Light surface kademeleri §2.1'deki gibidir; kartların beyazdan beyaza kaybolduğu alanlarda `surface-2`/`surface-3` farkı + `border-default` korunur.
- Focus ring, hover, selected state her iki modda aynı token ailesinden üretilir.

---

## 10. Card system

Üç seviye — başka kart tasarımı yok:

| Özellik | `compact` | `standard` | `feature` |
|---|---|---|---|
| padding | `12px` | `16px` | `24px` |
| radius | `radius-md` (12px) | `radius-md` (12px) | `radius-lg` (16px) |
| title spacing | başlık altı `8px` | başlık altı `12px` | başlık altı `12px` |
| internal gap | `8px` | `12px` | `16px` |
| min/max kullanım | dense listeler, tablo-kart, küçük metrikler | varsayılan içerik kartı | hero, akış başı, onboarding, öne çıkan içerik |

Kurallar:

- Varsayılan kart: `standard`.
- Kart tipik olarak `shadow-sm` + hover `shadow-md`; sürekli glow yok.
- Kart yüksekliği içeriğine göredir; tüm kartlar aynı görsel sistemden gelir (aynı border token'ı, aynı başlık hiyerarşisi).
- `feature` kartı dışında gereksiz büyüme yasaktır.

---

## 11. Component contract

Her component için yalnızca burada listelenen varyantlar üretilebilir. Sayfa bazında yeni varyant tanımlanmaz.

| Component | İzinli varyantlar | Ana ölçü |
|---|---|---|
| Button | primary / secondary / ghost / danger / quiet × sm/md/lg | §6 |
| IconButton | sm/md/lg | §6.3 |
| Card | compact / standard / feature | §10 |
| Input | sm/md/lg | §7 |
| Textarea | md (varsayılan), lg (mentor composer) | §7 |
| Select | sm/md/lg | §7 |
| Search | md (varsayılan) | §7 |
| Tabs | underline (varsayılan) / segmented | row `40px`, focus ring inline |
| Badge | neutral / brand / success / warning / danger | `radius-full`, `label` font, padding `4px 10px` |
| Chip | neutral / brand subtle (`brand-50`/`brand-100`) / selected / removable | `radius-full`, `control-sm` yükseklik |
| Modal | sm `400px` / md `560px` / lg `720px` / xl `960px` | §13 shell |
| Drawer | right (varsayılan) / left / bottom-sheet | genişlik §13 |
| Table | header-sticky, zebra kapalı, row hover, sortable ops. | row `44px`, hücre padding `12px 16px` |
| List | row `40px` (mobil `44px`), bölüm başlığı `label` | divider `divider` |
| Progress | linear (varsayılan) / circular | yükseklik `6px`, dolgu brand |
| Tooltip | dark zemin, `radius-sm`, `caption` font | ok işaretçili |
| EmptyState | ikon + başlık + açıklama + (ops.) CTA | padding `32px`, ortalı |
| ErrorState | başlık + hata mesajı + yeniden dene | `secondary` buton |
| Skeleton | kart / satır / metin blokları | shimmer yerine statik tonal blok (motion §12) |
| Toast | success / warning / error / info | sağ üst, `surface-elevated`, `shadow-overlay` |
| NavigationItem | default / active / badge'li / disabled | row `40px`, sidebar aktif = `brand-500` düşük opacity zemin + `brand-300`/`brand-400` foreground (dark) / `brand-700` (light) |
| Metric | `metric-lg` (KPI şeridi) / `metric-md` (kart) | §4 |

---

## 12. Motion

| Token | Süre | Kullanım |
|---|---|---|
| `fast` | `120–150ms` | button active/scale, hover, focus, ikon kayması |
| `normal` | `200–260ms` | kart hover, panel açılışı, sayfa geçişi |
| `slow` | `320–360ms` | modal, drawer, karar fişi, büyük yüzey |

Kurallar:

- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard) — component başına yeni easing yok.
- **500ms+ transition varsayılan değildir.** 600ms'lik buton şerit geçişleri kaldırılır; interaction hızlı ve responsive hissettirmelidir.
- `prefers-reduced-motion: reduce` → tüm animasyon/transition 0.001ms + lift/sweep sıfır (mevcut global kural korunur).
- Mirror Sweep yalnızca koyu imza panellerde döngüsel, açık kartlarda hover'da tek seferlik.

---

## 13. Shell & layout contract

### 13.1 Kabuk ölçüleri

| Eleman | Değer |
|---|---|
| desktop sidebar width | `256px` (varsayılan) |
| expanded sidebar width (özel varyant) | `280px` — yalnızca ayrıca gerekçelendirilen durumlarda; varsayılan değildir |
| collapsed sidebar width | `64px` |
| header height (desktop) | `52px` |
| header height (mobile ≤1023) | `52px` (menü butonu `44×44`) |
| bottom tab height | `56px` + `safe-area-inset-bottom` (≤899px görünür) |
| context panel width | `300px` (`--context-width`) |
| drawer width (right/left) | `320px` (mobil: tam genişlik `100%` veya `min(320px, 92vw)`) |
| modal sizes | sm `400` / md `560` / lg `720` / xl `960` |
| content max-width | `1180px` (`--content-max-width`) |

Sidebar, header ve content bağımsız ölçülendirilmez: content alanı `viewport − sidebar − gutters`; main `margin-left: sidebar-width`, `max-width` üst sınır içiçerme.

### 13.2 Web görünümü

- Desktop: `1440`, `1280`; Tablet: `768`; Mobile: `430`, `400`, `390`, `360`.
- Sayfa içeriği `1180px` üst sınırdadır; ekranı gereksiz tamamen doldurmaz, içerik alanı gereksiz dar düşmez.
- Grid: 12 kolon (desktop), 8 (tablet), 4 (mobile); margin/gutter `16px` (mobil) / `24px` (desktop).

---

## 14. Responsive standard

QA zorunlu viewportlar: **360 · 390 · 400 · 430 · 768 · 1280 · 1440**

Her viewportta kontrol edilir ve **bozuk olamaz**:

- yatay overflow yok,
- text clipping yok,
- giant buttons yok (button ölçüsü §6'dan sapmaz),
- inconsistent cards yok (§10),
- drawer collision yok,
- bottom nav collision yok,
- sidebar sorunları yok (sidebar width §13, mobilde hamburger drawer'i çakışmasız),
- floating Mentor launcher collision yok (composer bottom nav ile çakışmaz),
- skeleton/dataload durumları yüksekliği zıplatmaz.

Dönüm noktaları (sabit, sayfa bazlı değil):

| Breakpoint | Davranış |
|---|---|
| `≤1023` | hamburger menü görünür, desktop sidebar gizli |
| `≤899` | bottom tab bar görünür, desktop rail gizli |
| `≤768` | grid `2→1` kolon, hediyeler `space-24→16` |
| `≤640` | page-title küçülür (§4), modal tam genişlik |

---

## 15. Mobile compact standard

- Mobilde desktop componentleri yalnızca alt alta dizilmez; **mobil yoğunluk ayrıca** tanımlıdır (§5.2).
- Hedef: **ilk viewportta** sayfa başlığı + birincil filtre/aksiyon + ilk gerçek içerik görünür.
- Mobil kartlar gereksiz yüksek olmaz: kart padding `12px`, feature hariç büyük başlık açılmaz.
- İkincil Mentor alanları (sidebar, memory, actions) mobilde `collapsible` / `drawer` / `accordion` yönetilir; chat birincil içeriktir.
- Composer, bottom tab ile çakışmaz: tab üzerinde `8px` boşluk + `safe-area`.

---

## 16. Data dense screens

Finance Center · Model Lab · Decision Tools · Business Tracking · Admin · Dashboard özel "compact" moduna girer:

- Yüksek bilgi yoğunluğu + rahat taranabilirlik hedeflenir.
- Kompakt = küçük/okunamaz değil: min gövde `body-sm`, tablo row `44px`, satır arası netlik `divider`.
- Aynı token'lar kullanılır; yeni "mini" boyut üretilmez.

---

## 17. Learning screens

Course & lesson ekranlarında okuma alanı `body-lg` (16px) + `line-height 1.75` ile genişletilebilir; kart/başlık/border token'ları değişmez. Sistemden kopmaz.

---

## 18. AI Mentor

- Mentor chat **birincil içeriktir**; sidebar/memory/action alanları chattan daha baskın olamaz.
- Desktop: chat orta kolon, secondary alanlar `context panel` (300px).
- Mobile: secondary alanlar collapsible/drawer/accordion.
- Composer: `control-lg` yükseklik, bottom tab ile çakışmasız (§14, §15).

---

## 19. Accessibility

| Konu | Standart |
|---|---|
| Minimum contrast | metin ≥4.5:1 (3:1 büyük başlık), §2.2 |
| Keyboard navigation | tüm interaktifler Tab ile ulaşılır, odak sırası görsel düzenle aynı |
| Visible focus | `brand-400`/`brand-500` 2px outline, `2px` offset — hiçbir component'te kaldırılmaz |
| Touch target | mobilde min `44×44` (bottom tab `56px`) |
| Form label | her kontrole ilişkili label veya `aria-label` |
| Error association | `aria-describedby` + mesaj rengi `error` (yalnız renk değil, ikon/metin) |
| Reduced motion | §12 global kural |
| Disabled distinction | zemin+metin+çizgi üçlüsü değişir (§8.2) |

---

## 20. Global token envanteri (kaynak dosyalar)

Mevcut token altyapısı korunur; bu sözleşme onu denetler:

| Dosya | Rol |
|---|---|
| `frontend/src/styles/tokens.css` | rampalar, surface, spacing, typography, radius, shadow, layout, z-index |
| `frontend/src/styles/theme-modes.css` | light/dark token varyantları |
| `frontend/src/styles/motion-glass-tokens.css` | motion, glass, kabuk ölçüleri |
| `frontend/src/styles/buttons.css` | ortak buton geometrisi / tactile sistemi |
| `frontend/src/styles/fields.css` | ortak input/select/textarea yüzeyi |
| `frontend/src/styles/tailwind.css` | Tailwind v4 `@theme` eşlemeleri |
| `frontend/src/styles/base.css` | reset + evrensel kurallar |

Sözleşme ihlali tespit edilen yer → ya token'a bağlanır ya da bu dokümana varyant eklenir. **Bu dosya eksikse, eksik madde sayfa CSS'ine yazılmaz.**

---

## 21. Visual QA gate

Bir UI işi "tamamlandı" sayılmadan önce zorunlu kontroller:

**Viewportlar:** Desktop `1440`, `1280` · Tablet `768` · Mobile `430`, `400`, `390`, `360`

**Kontroller:**

- typography consistency (page-title/section/card/captions aynı),
- card consistency (radius, padding, break, shadow, giant cards yok),
- button consistency (height, radius, variants, giant buttons yok),
- form consistency (control heights, focus ring),
- spacing (4px scale, §5.2),
- radius (§3.3),
- color (yalnız token'lar — legacy blue yok),
- dark mode (tüm §8.2 listesi),
- light mode (yalnız token'lar),
- overflow (yatay overflow yok, clipped text yok),
- alignment (grid hizası, gutter),
- responsive behavior (1440→360 kesintisiz),
- nav collisions (sidebar/header/bottom tab/drawer/mentor, sidebar sorunları),
- content density (compact-balanced, ilk viewport hedefi).

---

## 22. Ölçü sapması yasakları (özet)

- Normal button `40px` iken başka yerde `56px` → **yasak**.
- Aynı `card-title` bir yerde `18px`, başka yerde `13px` → **yasak**.
- Table row bir sayfada `44px`, diğerinde `56px` → **yasak**.
- Page title `36px` / `24px` karışımı → **yasak** (tek token: §4).
- Input bir yerde `40px`, başka yerde `48px` (aynı kademe) → **yasak**.
- Radius `8/12/16` yerine `10/18/24` karışımı → **yasak**.
- Navigation item bir sayfada `40px`, diğerinde `48px` → **yasak**.
---

## 23. Herkese açık tanıtım sayfaları (kapsam istisnası)

**Kapsam:** `/` (tanıtım ana sayfası), `/fiyatlar`, `/hakkinda`, `/yardim`.
**Kapsam DIŞI:** `/app/**` altındaki her şey ve `/login`, `/register`.

Bu sayfalar ürünü **anlatır**, ürünü **çalıştırmaz**. Ziyaretçi buraya bir iş
yapmaya değil, karar vermeye gelir; günde onlarca kez açılmaz. Bu yüzden
§3.1 (glow kısıtı), §3.4 (glass allow-list) ve §12 (500ms tavanı) burada
gevşetilir.

### 23.1 Serbest olanlar

- Kaydırmaya bağlı animasyon (`animation-timeline: view()`, IntersectionObserver).
- 500ms+ giriş/çıkış geçişleri ve sahne süreleri.
- Dekoratif degrade, glow, doku ve geometrik kompozisyon.
- `display` kademesinin üzerinde hero tipografi (`clamp` ile).
- Tam ekran (full-bleed) koyu sahneler.

### 23.2 Gevşemeyenler — KESİN

Bunlar tanıtım sayfalarında da geçerlidir:

- **§1.1 marka paleti.** Yeni hue üretilmez. Dekoratif degradeler `brand-*`
  ailesinden ve `surface-signature`tan türetilir.
- **§4 tipografi ailesi.** Manrope. Hero boyutu serbest, aile değil.
- **§19 erişilebilirlik.** Kontrast eşikleri, klavye erişimi, görünür odak,
  44px dokunma hedefi. Animasyon bunları bozamaz.
- **`prefers-reduced-motion`.** Kaydırma animasyonları bu tercihte
  TAMAMEN durur; yavaşlatılmaz. Sayfa animasyonsuz da eksiksiz okunmalı.
- **§5.1 boşluk ölçeği** ve **§3.3 yarıçap** — hero yüzeyleri hariç.

### 23.3 Zorunlu davranış

- Animasyon **içeriğin önkoşulu olamaz**: JavaScript çalışmazsa ya da
  `animation-timeline` desteklenmiyorsa tüm metin ve bağlantılar görünür
  kalır. Animasyon yalnızca ekler.
- **Yeni bağımlılık eklenmez.** Kaydırma efektleri CSS ve
  `IntersectionObserver` ile yapılır; GSAP/Framer gibi kütüphaneler bu iş
  için pakete girmez.
- Tanıtım bileşenleri `/app/**` içinde **kullanılmaz**; ayrı dosyalarda
  durur ve uygulama paketine sızmaz (route bazlı kod bölme).

### 23.4 Gerekçe

Revolut, Stripe ve benzeri ürünlerin sinematik ekranları giriş öncesi
pazarlama yüzeyleridir; aynı ürünlerin çalışma ekranları sakindir. Bu
ayrımı korumak, tanıtımın etkisini de uygulamanın kullanılabilirliğini de
aynı anda mümkün kılar.
