# LocalKarar — Motion + Glass System Pilot Raporu

Tarih: 2026-08-06
Kapsam: `frontend/` (React 19 + Vite, Tailwind YOK). Route, backend bağlantısı ve iş mantığı değiştirilmedi. Commit/push yapılmadı.

## 1. Eklenen token dosyaları

- `frontend/src/styles/motion-glass-tokens.css` — **yeni dosya**. `main.jsx`'te `tokens.css`'ten hemen sonra import edildi. İçeriği:
  - Easing: `--ease-standard`, `--ease-decelerate`, `--ease-accelerate`
  - Süreler: `--dur-instant` (120ms), `--dur-fast` (180ms), `--dur-base` (220ms), `--dur-page` (260ms), `--dur-slow` (320ms)
  - Hareket miktarları: `--lift-btn` (-1px), `--lift-card` (-2px), `--scale-active` (0.98), `--shift-icon` (4px), `--offset-page` (10px), `--offset-sheet` (24px)
  - Glass yüzey tokenları: `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-blur` (14px), `--glass-saturate`, `--glass-shadow`
  - Ortak keyframe'ler: `fadeSlideUp`, `fadeSlideIn`, `sheetUp`, `drawerIn`, `fichOpen`, `growIn`
  - Global `prefers-reduced-motion: reduce` bloğu
  - `--cta-orange` / `--risk-bordo` referans tokenları (kural 10/11 için)

  Tüm component'ler animasyon süresini/easing'ini bu dosyadan okuyor; component başına farklı süre/easing tanımlanmadı (kural 3-4).

## 2. Değiştirilen componentler

| Dosya | Değişiklik |
|---|---|
| `main.jsx` | `motion-glass-tokens.css` import edildi |
| `components/layout/AppLayout.jsx` / `.module.css` | `useLocation` ile `key={pathname}` sarmalayıcı eklendi; main content `fadeSlideUp` ile 260ms'de gelir, sidebar dokunulmadı (sabit) |
| `components/ui/Button.module.css` | hover `translateY(-1px)`, active `scale(0.98)`, trailing ikon `translateX(4px)`, `hover:hover` media query ile masaüstü/mobil ayrımı |
| `components/ui/Card.module.css` | hoverable kart `translateY(-2px)`, mobilde tap `scale(0.98)` |
| `components/layout/Header.module.css` | **glass** (üst bar) |
| `components/ui/Modal.module.css` | **glass** (tüm modallar, dolayısıyla ileride eklenecek Rapor Modalı da dahil), overlay hafif blur |
| `components/layout/Sidebar.module.css` | mobilde **glass drawer** + `drawerIn`-benzeri geçiş |
| `pages/FinancialModelWorkspace.module.css` | yalnızca `.inputPanel` (Model Laboratuvarı parametre paneli) **glass**; `.panel`/`.outputDashboard` düz kaldı |
| `components/decision-checks/ProfitabilityDecisionTool.css` | `.profit-hero` (Karar Fişi/karar sonucu overlay'i) **glass** + özel `fichOpen` açılış animasyonu; `.profit-result-body` içindeki bölümler kademeli (60→260ms) `fadeSlideUp` ile sırayla beliriyor |
| `pages/Dashboard.module.css` | haftalık aktivite çubukları `growIn` ile yalnızca ilk render'da bir kez animasyonlanıyor |
| `components/mentor/MentorPanel.jsx` / **yeni** `MentorPanel.module.css` | drawer + bağlam ("Bağlam") çubuğu **glass**, `drawerIn`/`fadeSlideIn` |
| `components/mentor/MentorMessageBubble.jsx` / **yeni** `MentorMessageBubble.module.css` | her mesaj balonu `fadeSlideIn` ile gelir, sahte typing eklenmedi |

## 3. Kullanılan animasyon süreleri

Tamamı `motion-glass-tokens.css`'ten: 120 / 180 / 220 / **260 (sayfa geçişi, kural 7'deki 220–280ms aralığında)** / 320ms. Tek easing seti: `cubic-bezier(0.4,0,0.2,1)` (standard) ve `cubic-bezier(0,0,0.2,1)` (decelerate — açılışlar için).

## 4. Glass kullanılan alanlar — 7 alanın durumu

1. **Üst bar (Header)** — uygulandı
2. **Modal** — uygulandı (genel `Modal.jsx`, dolayısıyla ConfirmModal/MentorDeleteModal ve ileride eklenecek Rapor Modalı bunu miras alır)
3. **Drawer** — uygulandı (mobil Sidebar + AI Mentor paneli)
4. **AI Mentor bağlam paneli** — uygulandı (drawer'ın kendisi + "Bağlam" çubuğu)
5. **Model Laboratuvarı parametre paneli** — uygulandı (`FinancialModelWorkspace` `.inputPanel`)
6. **Karar sonucu overlay'i** — uygulandı (`ProfitabilityDecisionTool` `.profit-hero`, Karar Fişi)
7. **Mobil bottom-sheet** — **uygulanmadı**: kod tabanında ayrı bir bottom-sheet component'i yok (mobil AI Mentor paneli tam ekran drawer olarak çalışıyor, bottom-sheet değil). `--offset-sheet` ve `sheetUp` keyframe'i hazır bırakıldı; ileride bir bottom-sheet eklenirse doğrudan kullanılabilir.

Ders metni, tablo, rapor, görev listesi ve dashboard kartlarına (`.card`, `.panel`, `.statCard` vb.) glass **uygulanmadı** — kural 6.

## 5. Önemli bulgu (kapsam dışı ama raporlanması gerekli)

Projede **Tailwind CSS kurulu değil** (`package.json`'da yok, `tailwind.config` yok, PostCSS pipeline yok). Ancak `MentorPanel.jsx` ve `MentorMessageBubble.jsx` gibi dosyalar `fixed`, `inset-0`, `bg-black/40`, `rounded-2xl` gibi Tailwind class isimleriyle yazılmış — bunlar hâlihazırda **hiçbir CSS üretmiyor**, yani AI Mentor paneli glass/motion eklenmeden önce de düzgün konumlanmıyor olabilirdi. Bu pilotun kapsamı gereği bu genel sorunu düzeltmedim; sadece glass+motion'ın görünür olabilmesi için mutlak konumlandırma ve yüzey stilini kendi CSS modüllerimle (`MentorPanel.module.css`) ekledim. Mevcut Tailwind class'ları silinmedi. Bu, iş mantığını değiştirmez ama ekibin bilmesi gereken ayrı bir teknik borç — istersen ayrı bir görev olarak ele alabiliriz.

## 6. Reduced motion sonucu

`@media (prefers-reduced-motion: reduce)` global olarak `motion-glass-tokens.css`'te tanımlı: tüm `animation-duration`/`transition-duration` 0.001ms'e iniyor, `scroll-behavior: auto` oluyor. Ayrıca `MentorPanel.module.css` ve `MentorMessageBubble.module.css` içinde ek/yerel `reduce` kuralları var. Statik kod incelemesiyle doğrulandı; gerçek tarayıcıda "Reduce motion" işletim sistemi ayarıyla görsel test **yapılmadı** (bkz. madde 7).

## 7. Mobil ve masaüstü tarayıcı sonucu — YAPILAMADI

Bu sandbox ortamında `npm run build` ve `vitest` çalıştırılamadı: `node_modules` Windows'ta kurulmuş (yalnızca `rollup-win32-*` ve `esbuild` win32 binary'leri mevcut), sandbox Linux x64 ve npm registry'ye ağ erişimi yok (`403 Forbidden`). Bu ortamsal bir kısıt, kod değişikliğiyle ilgisi yok.

**Yapılan statik doğrulama:** tüm değiştirilen `.jsx` dosyalarında parantez/süslü parantez dengesi ve tüm `.css` dosyalarında `{}` dengesi programatik olarak kontrol edildi — hepsi OK.

**Yapılamayan:** gerçek tarayıcıda görsel/etkileşim testi, `npm run build`, `vitest`. Kural 21 gereği ("pilot tarayıcı doğrulaması yapılmadan yayma") bu değişiklikler yalnızca 4 pilot sayfa + onların paylaştığı ortak component'lerle sınırlı tutuldu ve **hiçbir şey diğer sayfalara yayılmadı, commit/push yapılmadı.**

**Senin yapman gereken tek adım:** kendi makinende `cd frontend && npm run dev` ile açıp Ana Sayfa, Karar Aracı Sonucu (Kârlılık aracını tamamla), bir modal (varsa) ve AI Mentor panelini kontrol etmen. Sorun çıkarsa buraya bildir, düzeltirim.

## 8. Performans / erişilebilirlik notları

- `backdrop-filter` GPU maliyetlidir; yalnızca 6 alanda (7. alan kod tabanında yok) kullanıldı, geniş yüzeylerde (kart, tablo) kullanılmadı — performans riski sınırlı olmalı.
- Tüm hover/active geçişleri `transform`/`opacity` üzerinden yapılıyor (layout'u tetiklemez) — kural 18 (layout shift olmaması) buna göre tasarlandı.
- Odak halkaları (`:focus-visible`) mevcut haliyle korundu, dokunulmadı — form/test kullanımı engellenmedi (kural 17).
- `.btn:hover`/`.hoverable:hover` kuralları `@media (hover: hover) and (pointer: fine)` içine alındı; dokunmatik cihazlarda bunun yerine `active` durumunda `scale`/`opacity` tap-feedback kullanılıyor (kural 19).
