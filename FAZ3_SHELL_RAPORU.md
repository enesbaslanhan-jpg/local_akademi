# FAZ 3 RAPORU — Shell / Sidebar / Header / Navigation Standardization

Tarih: 2026-08-11 · Kapsam: AppLayout/Sidebar/Header/ContextPanel/MobileTabBar/Drawer/MentorLauncher + z-index/scroll/safe-area/breakpoint
Kaynak: DESIGN.md (tek otorite) · git commit yapılmadı.

---

## 1. Shell component envanteri

| Component | Dosya | Desktop (≥1024) | Tablet (768–1023) | Mobile (<768) |
|---|---|---|---|---|
| AppLayout | `src/components/layout/AppLayout.jsx` | flex: sidebar + main(margin-left rail) + ContentPanel + launcher | sidebar→drawer, main margin 0 | aynı + bottom tab + content bottom padding |
| Sidebar | `src/components/layout/Sidebar.jsx` + `.module.css` | sabit 256px ray (--sidebar-width), collapse 64px, section'lı | drawer (transform) | drawer (256px) |
| Header | `src/components/layout/Header.jsx` + `.module.css` | sticky 52px, ikonlar 32px | hamburger görünür | hamburger 44 + ikonlar 44 |
| ContextPanel | `src/components/layout/ContextPanel.jsx` + `.module.css` | sabit 300px panel (4 sayfa) | gizli | gizli |
| MobileTabBar | `src/components/layout/MobileTabBar.jsx` + `.module.css` | gizli | gizli (≤899 görünür) | görünür, 56px + safe-area |
| Drawer (MentorPanel) | `src/components/mentor/MentorPanel.jsx` + `.module.css` | sağdan 320px panel | 320px + backdrop yok | tam genişlik + backdrop |
| NavigationItem | Sidebar içinde `renderLink` + `.navItem` | row 40px | row 40px | row 40px |
| Mentor launcher | `src/components/mentor/MentorLauncher.jsx` + `.module.css` | pill 40px, bottom-right 24px | aynı | ikon-only, tab üstü offset |

Hardcoded ölçü → token kaynakları: `--sidebar-width` 256 / `--sidebar-collapsed-width` 64 / `--header-height` 52 / `--content-max-width` 1180 / `--context-width` 300 / `--drawer-width` 320 / `--bottom-tab-height` 56 (hepsi tokens.css LAYOUT bloğunda, tek kaynak).

**Çakışan CSS:** Çift kaynak vardı: `--rail-width` (motion-glass-tokens.css) vs `--sidebar-width` (tokens.css) aynı 256px değeri. `--rail-width`, `--rail-width-expanded` (280, hiç kullanılmıyordu), `--context-width` (tokens'ta zaten vardı) motion-glass-tokens'tan kaldırıldı; 5 kullanım `--sidebar-width`'e bağlandı.

## 2. Sidebar sonucu

- Genişlik tek kaynak: `--sidebar-width` (256) / `--sidebar-collapsed-width` (64). `--app-rail-width` (AppLayout) → `var(--sidebar-width)`.
- Yüzey: `--sidebar-bg` (surface-0 light / #101317 dark tanımlı theme-modes). **`:global(.dark)` bloğu silindi** — içindeki hex'ler (#171a1d, #2a3037, #50b8c5 cyan aktif çizgisi) token'ları atlıyordu; token sistemi dark'ı zaten yönetiyor. Sidebar komple mavi/cyan blok değil.
- Aktif state: `--sidebar-active-bg` (brand %14 mix) + `--sidebar-active-text` (brand-700) — DESIGN marka-subtle zemin + erişilebilir marka fg ✓. Büyük glow yok: aktif/önerilen `::before` çizgisinin 9px glow'u kaldırıldı (çizgi korundu).
- Kaldırılan dead CSS: `.panelToggle`, `.desktopLogout`, `.avatar`, `.userText`, `.userName`, `.userRole` (JSX'te kullanılmıyorlardı).
- Collapse butonu 34→32 (DESIGN ikon buton sm; radius-sm).
- 280px expanded: kullanım yoktu, token silindi (DESIGN: özel varyant yalnızca gerekçeli — hiçbir gerekçe yoktu).

## 3. Navigation item sonucu

- Row yüksekliği **40px** her yerde (basis, desktop, drawer): `.navItem` 44→40 (desktop + drawer), ContextPanel `.link` 41→40, alt menü `.submenuItem` 31px (alt hiyerarşi varyantı olarak bilinçli bırakıldı — raporda açık).
- İkon 18px tek (drawer'da da 17→18), ikon/text gap 12px (`--space-3`) tek (desktop artık 13 değil).
- Label .82rem, hover `--sidebar-hover-bg`, `:focus-visible` ring, `aria-current="page"` ✓ (JSX'te mevcuttu).
- `--z-sidebar` **tanımsızdı** (3 yerde kullanılıyordu) → tokens.css'te tanımlandı: 100.

## 4. Header sonucu

- Yükseklik `--header-height` (52) her iki kırılımda ✓, sticky `--z-header` ✓.
- Mobil dokunma hedefleri DESIGN'a çekildi: `.iconBtn` 32→44, `.avatar` 28→44, `.menuBtn` 44 (zaten ✓), `.date` mobilde gizli ✓.
- Desktop ikonlar 32 (DESIGN sm) korundu; "48–56 gereksiz geometri" yoktu.
- Logo header'ı büyütmüyor ✓.

## 5. Main content wrapper sonucu

- `max-width: var(--content-max-width)` (1180) tek tanım; `margin-inline: auto` ✓.
- Desktop padding `32/40/48` → **24px her yön** (DESIGN). Mobil 16px + alt bar payı `calc(var(--bottom-tab-height) + var(--space-6) + env(safe-area-inset-bottom))` (56 magic sayısı token'a bağlandı).
- Sidebar çakışması: `margin-left: var(--app-rail-width)`; ≤1023'te 0. Sayfa-wrapperlarının özel max-width'i dokunulmadı (Faz 5 listesi).

## 6. ContextPanel sonucu

- 300px (`--context-width`) tek kaynak ✓; hiçbir yerde 340/360/400 yok.
- `left` değeri `--app-rail-width` + fallback `--sidebar-width` (rail-width fallback'i güncellendi).
- Nav linkleri 40px standardına çekildi; kendi scroll'u (`.body overflow-y`) ✓; `inert` kapalıyken ✓.
- Mobilde gizli ✓; embedded (sayfa içi) varyant korundu.

## 7. Drawer sonucu

- **MentorPanel**: tablet/desktop genişliği 480→`--drawer-width` (320); mobilde tam genişlik (`100%`, DESIGN'ın "uygun full-width varyant" istisnası — chat UI'ı için geçerli).
- Katman düzeltmesi (aşağıda z-index). Zeminler token: backdrop `--surface-overlay` (önceden 0.4 opacity hardcoded), drawer `--surface-raised` + `--border-strong` ✓.
- Sidebar mobil drawer'ı: sidebar'ın kendi 256px görünümü (ayrı "drawer" sınıfı değil — sidebar'ın mobil hali); üstünde overlay, altında bottom tab (bkz. 10).
- z-index: 4/10 gibi drawer-içi katmanlar korundu (kendi dokuma context'i); header z111 korundu.

## 8. BottomTabBar sonucu

- ≤899 görünür, `min-height: var(--bottom-tab-height)` (56) + `env(safe-area-inset-bottom)` ✓.
- 5 madde Sidebar `primaryLinks`'ten (tek kaynak): Ana Sayfa / Kurslar / Karar Araçları(flag: açık, `VITE_FF_DECISION_CHECKS` default true) / Finans Merkezi / AI Mentor ✓ mevcut IA uyumlu.
- `--white` → `--surface-card`; z-index `--z-header` → `--z-bottom-tab` (110).
- Seçili state: `--brand-ink` + stroke-width 2.4 (mevcut, kontrastı uygun) korundu.

## 9. Breakpoint normalizasyonu

- Shell: 1023 (app layout/sidebar/header/context) + 899 (tab bar, launcher) — DESIGN (≤1023 hamburger+sidebar gizli; ≤899 bottom tab). Tutarlı, taşındı.
- Media query'de `var()` kullanılamadığı için breakpoint token'ı yok (CSS sınırı) — iki sabit shell değeri rapor satırı olarak belgeye eklendi.
- Page-level rastgele kullanımlar TESPİT edildi (dokunulmadı, Faz 5/6): 900px×8 (main.css kpi-grid, KnowledgePage×2, AdminKOForm, Calendar, FinancialModelWorkspace, ProfitabilityDecisionTool), 960/980/1000×1, 850, 1199, 1240. "900 vs 899" karesi: content grid'lerde 900 görünüm daralması 899 tab bar ile 1px çakışma — görünüm düzeyinde zararsız.
- 1024/768/640 (DESIGN) dağılımı sayfa grid'lerinde mevcut ✓.

## 10. Z-index sonucu

Katman hiyerarşisi tokens.css'te merkezileştirildi (DESIGN §16):

| Katman | Token | Değer | Kullananlar |
|---|---|---|---|
| base content | — | auto | layout + sayfalar |
| sticky header | `--z-header` | 100 | Header |
| sidebar / rail | `--z-sidebar` | 100 (YENİ — tanımsızdı) | Sidebar desktop, ContextPanel |
| bottom tab | `--z-bottom-tab` | 110 (YENİ) | MobileTabBar |
| floating action | `--z-fab` | 120 (YENİ) | MentorLauncher (40 → token) |
| overlay | `--z-overlay` | 200 (300→200) | Sidebar mobil overlay, MentorPanel backdrop |
| drawer | `--z-drawer` | 210 (YENİ) | Sidebar mobil drawer, MentorPanel drawer |
| modal overlay | `--z-modal-overlay` | 300 (310→300) | Modal, ConfirmModal, delete modalları |
| modal | `--z-modal` | 400 | Modal + panel üstü |
| toast | `--z-toast` | 500 | ToastContext |

Avantajlar: mentor drawer'ı artık modal katmanını işgal etmiyor (MentorDeleteModal 400 > drawer ✓ backdrop'u düzgün); mobil drawer bottom tab'ın (110) ve header'ın (100) üstünde — "bottom nav drawer ile yarışmaz"; launcher drawer'ın altında.
Kalan page-level magic'ler (rapor/değer, dokunulmadı): `z-index: 1000` ×5 (Contacts/Documents/Team/Tracker/WorkspaceList overlay'leri — sayfa modal'ları, Faz 5), MemoryPanel 100/110 (Faz 5 legacy), CoursePlayer 99/100, Select menu 60, `--z-panel` 200 (dead tanım).

## 11. Scroll/body-lock sonucu

- Sidebar kendi scroll'u ✓ (`.nav overflow-y:auto`, ince scrollbar).
- **Body lock eklendi**: Sidebar mobil drawer açıkken (≤1023) `body overflow hidden`; MentorPanel açıkken aynı (Modal zaten kilitliydi). Cleanup'lar restore ✓.
- Header sticky ✓; main content kendi scroll'u (viewport) ✓; ContextPanel kendi scroll'u ✓ (fixed, sticky sorunu yok).
- Bottom tab altına merkezi güvenlik payı: AppLayout mobil `padding-bottom` token'lı ✓ (sayfa bazlı ekstra paylar varsa Faz 5 listesinde).

## 12. Safe-area sonucu

- Bottom tab: `padding-bottom: env(safe-area-inset-bottom)` ✓ (mevcuttu).
- Sidebar drawer altı `userArea` + safe-area eklendi.
- MentorPanel header `max(var(--space-3), env(safe-area-inset-top))` ✓ (mevcuttu).
- Launcher offset: `var(--bottom-tab-height) + var(--space-4) + env(safe-area-inset-bottom)` ✓.
- `--safe-area-top/bottom` token'ları ve mevcut env() kullanımları DEBUG'da doğrulandı; desktop'u etkilemiyor ✓.

## 13. Floating Mentor sonucu

- `bottom/right: var(--space-6)` (24) — desktop edge offset token'lı.
- z-index magic 40 → `--z-fab` (120): toast'ın altı, drawer'ın altı (drawer açılınca launcher gizlenir/yarışmaz), bottom tab'ın üstü.
- Yükseklik `--control-h-md` (40). Mobilde label gizli (ikon-only) ✓, offset tab üstünde ✓.

## 14. Accessibility sonucu

- Mevcut ✓: hamburger `aria-label="Menüyü aç/kapat"`, kapat `aria-label`, nav `aria-label`, `aria-current="page"` nav + tab + context, drawer `aria-modal` + `role="dialog"`, Escape (MentorPanel ✓; Sidebar drawer Escape yok — mevcut mimaride mobil drawer için Escape eklenmedi, istenirse küçük iş), mentor focus restore + ilk odak ✓.
- Eklenen: mobil dokunma hedefleri (Header ikonlar/avatar, Sidebar close, MentorPanel back/close/new — hepsi 44).
- Focus ring: global buttons.css 2px ring tüm butonlara; sidebar/context `:focus-visible` mevcut ✓. Focus trap: modal/drawer'larda kurulu mimariye göre tam trap yok (MentorPanel) — açık ihlal değil, raporda not.
- İki yeni body-lock'un aria-modal'larla uyumu korundu.

## 15. Kalan page-level shell borçları

- Sayfa overlay'leri `z-index: 1000` (Contacts, Documents, Team, Tracker, WorkspaceList) — modal token'larına çekilmeli (Faz 5).
- CoursePlayer kendi üst-barı (z 99/100) — course player sub-shell'i (Faz 5).
- Workspaces/WorkspaceLayout kendi sekme düzeni (899'da tab bar ile içerik payı) — Faz 5.
- Metric: main.css kpi-grid 900px breakpoint'i (gerçek bir çakışma yaratmıyor).
- DecisionToolsPage özel rail grid'i — shared shell'e dönmedi (Faz 5).
- Sidebar logoArea 74px (marka alanı) — header 52 ile senkron değil; bilinçli marka alanı, Faz 4/5 logoya.
- MemoryPanel legacy (z 100/110) — Faz 5 legacy listesi (Faz 2 raporu 9. madde ile aynı).

## 16. Build/test sonucu

- `npm run build` → ✓ (9.21s; yalnız mevcut chunk 500kB uyarısı).
- `npm test` → ✓ 25 dosya / 136 test. (Ara adımda eklediğim body-lock jsdom'da `matchMedia` yüzünden 7 testi kırdı; `typeof window.matchMedia === 'function'` korumasıyla düzeltildi, son durum 136/136.)

## 17. Manuel smoke sonucu

Tarayıcı erişimi yok — aşağıdaki maddeler GELİŞTİRİCİDE açık kontrol:

- **1440**: sidebar 256 + content 1180 ortalanmış; collapse 64; header 52; ContextPanel (Karar Araçları/Finans/Mentor sayfalarında) 300; Mentor drawer 320 sağda.
- **1280**: content sıkışması yok (1280-256-48=976 < 1180, tam geniş).
- **768**: hamburger görünür, desktop ray YOK, bottom tab GÖRÜNÜR (≤899 — tab 768'de aktiftir, drawer yalnız drawer'dan ek menü), ContextPanel gizli.
- **430/390/360**: bottom tab 56 + ikon 44; drawer 256 + overlay; header ikonlar 44; launcher tab üstünde; content alt payı 56+24+safe; yatay taşma yok (fixed genişlikler hep ≥ mobil genişliklerden küçük, 92vw sınırı yok).
- Özel kontrol: MobileTabBar'daki `--surface-card` değişimi (beyaz → yüzey), dark modda sidebar'ın token renkleri (cyan çizgi artık marka tonu), quickAction pill → 10px radius, active nav glow'un kalkması.

## 18. Faz 4'e taşınan dark/light konuları

- Sidebar dark yüzeyi artık tamamen `--sidebar-*` token'larından (görsel fark: #171a1d→#101317; cyan→brand). Ekran üstü onayı istiyor.
- MentorPanel/ContextPanel koyu yüzeyler (surface-raised/sidebar-bg) ton karşıtlığı — Faz 4 temalama turunda.
- Bottom tab `--surface-card` dark tonu (beyaz→yüzey) görsel fark yaratır — onaylanacak.

## 19. Faz 5'e taşınan page layout konuları

- z-index 1000 overlay'lerin modal token'larına bağlanması (5 dosya).
- Sayfa seviyesi rastgele breakpoint'ler (900 yks, 960/980/1000, 850, 1199, 1240) → ortak breakpoint sözlüğü.
- WorkspaceLayout / CoursePlayer / DecisionToolsPage sub-shell'lerinin ana shell'e hizalanması.
- Sayfa düzeyi drawer'lar (Workspaces overlay'leri) ortak Drawer bileşenine taşınabilir.
- Sidebar logoArea marka alanı ve logo (ayrı logo işi).
- `--z-panel` dead token temizliği ve Select dropdown z-index'inin token'a bağlanması.