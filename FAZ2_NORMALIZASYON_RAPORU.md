# FAZ 2 RAPORU — Shared Component Normalization

Tarih: 2026-08-11 · Kapsam: buttons.css + shared Button/Controls + düşük riskli shared normalize
Kaynak: DESIGN.md (tek otorite) · git commit yapılmadı.

---

## 1. Button sisteminde kaldırılan çakışmalar

Dört katman çakışması (Button.jsx / Button.module.css / buttons.css / buttonFeedback.js) tek sahibin (Button.module.css) etrafında yeniden kuruldu.

**buttons.css'ten kaldırılanlar (global forcing):**
- `.btn` her-butonu primary hap yapan blok (`min-height: 40px`, `border-radius: 9999px !important`, `background: var(--primary) !important`)
- `button[data-tactile="action"]` / `button[data-tactile="secondary"|"danger"]` geometri dayatmaları
- `button[class*="_primary_"] / _cta_ / _panelCta_ / _headerBtnPrimary_ / _newChatBtn_` class-matching dayatmaları
- `.btn-secondary / .btn-outline` oval zorlaması
- Hover/active dev gölge blokları (0 20px 25px vb.)
- Tüm `:root.dark` sabitleme blokları (primary solid tutma) — artık shared Button kendi dark varyantını yönetiyor

**Button.module.css'te kaldırılanlar:**
- `border-radius: var(--radius-full)` → `--radius-sm` (8px; pill varsayılan değil)
- primary `linear-gradient(145deg, ...)` + `0 6px 0` 3D alt kenar gölgesi → solid `--brand-500` + `--shadow-sm`
- `secondary` `--brand-olive` (#55879D) dolgu + beyaz metin → `--surface-3` + `--border-default` + `--text-primary`
- cta/success/outline legacy varyant sınıfları
- hover 3D gölgeler → hafif lift + `--shadow-md`

## 2. Global buttons.css'in yeni sorumluluğu

Sadece:
- temel reset (font-family, tap-highlight, dokunma odaklılığı)
- tactile basınç geri bildirimi (`:active` press + `.is-tactile-pressed` — buttonFeedback.js ile birlikte)
- focus-visible ortak ring (2px, offset 2px — DESIGN §19; önceki offset 3px idi)
- disabled ayrımı (cursor + grayscale)
- özel istisna: `button.decision-panel-tool` (ContextPanel araçları — modül CSS karşılığı yok, Faz 5 listesinde)

Size / variant / brand rengi / radius / padding global olarak dayatılmaz.

## 3. Button.jsx API sonucu

- `variant`: primary (default) / secondary / ghost / danger / quiet
- `size`: sm (32px) / md (40px, default) / lg (48px)
- `loading` eklendi → `disabled || loading` + `aria-busy` (ConfirmModal uyumu)
- Bilinmeyen variant/size → kontrollü fallback (primary/md) + geliştirme modunda `console.warn`; CSS sınıfı kaybolup global'e teslim olmaz
- API imzası değişmedi; `ref` forwarding mevcut değil (mevcut durum korundu)

## 4. Legacy variant mapping sonucu

| Legacy | Adet | Yeni | Gerekçe (intent) |
|---|---|---|---|
| `outline` | 11 | `secondary` | filtre/kapama, önceki-sonraki, vazgeç, panele dön, tekrar dene — hepsi ikincil aksiyon |
| `cta` | 8 | `primary` | tümü gerçek tek ana CTA (işletme kur, dersi tamamla, modeli çalıştır…) |
| `success` | 6 | `primary` | AdminImports commit (Button+ConfirmModal), AdminKOReview yayınla (Button+ConfirmModal), WORKFLOW_CONFIRM onay akışları |
| `warning` | 2 | dokunulmadı | Button DEĞİL — AlertSection prop'u |
| `default`/`info` | — | Badge mapping | Button'da hiç kullanılmamış |
| `bare` | 1 | korundu | Select'in geçerli varyantı (WorkspaceLayout) |

Not: Dashboard `variant={item.cta ? 'cta' : 'primary'}` koşullu ifadesi `variant="primary"` olarak sadeleştirildi.

## 5. Belirsiz variant kullanımları

Sıfır. Tüm legacy kullanımlar intent'e göre eşlendi; bilinmeyen çağrı kalmadı. (Bilinmeyen bir variant gelirse: fallback + dev warning + görsel olarak primary.)

## 6. buttonFeedback.js sonucu

Kod aynen korundu (davranış: press klası, click sesi, disabled kontrolü). Görsel sistemle bağı CSS tarafında kesildi: `data-tactile` değerlerinin (action/secondary/control) geometry/renk karşılığı artık yok. İkon/araç butonları (`control`) yanlışlıkla primary CTA'ya dönüşemez.

## 7. Button sm/md/lg gerçek render ölçüleri

`height` artık token'lardan: sm 32 / md 40 / lg 48 (global min-height: 40 yok; `box-sizing: border-box` global base'den geliyor). Kullanım dağılımı: sm 53, md 7 (+default), lg 3.

## 8. Input/Select/SearchBar sonucu

| Öğe | Eski | Yeni |
|---|---|---|
| Input radius/border | 9px / `#cfd6e2` | `--radius-sm` / `--border-default` |
| Input focus ring | `rgba(47,85,151,.12)` | `color-mix(in srgb, var(--brand-500) 12%, transparent)` |
| Select yükseklik | 42px | `--control-h-md` (40px) |
| Select menu radius | 10px | `--radius-md` |
| SearchBar buton | 44×44 / 9px | 40×40 (IconButton) / radius-sm; mobil `(hover:none)` 44×44 hit |
| Tümü zemin | `--white` | `--surface-sunken` (fields.css ile tutarlı) |

## 9. Shared legacy blue kalan sayısı

**0** — Input/Select/SearchBar/ConfirmModal temiz; repo genelinde `#cfd6e2` ve `rgba(47,85,151)` yok. Bilinçli bırakılanlar (Faz 4/5 listesi): `MemoryPanel.css`, `EmbeddedPracticeBlock.module.css`, `Feed.module.css` (fallback `var(--primary, #2563EB)` dahil). tokens.css'teki legacy blue satırları yalnızca migrasyon haritası yorumudur.

## 10. Normalize edilen diğer shared componentler

- **Badge**: `default→neutral` (surface-1 + text-secondary), `info→brand` (primary-light + primary-dark; dark'ta brand-300); padding 2/8 → 4px/10px (DESIGN)
- **Toast (ToastContext)**: alt-sağ → sağ üst (`--header-height` altı); tonal zeminler → `surface-elevated` + `--shadow-overlay`; durum renkleri metin/ikon vurgusu olarak; hardcoded pastel border'lar silindi; animasyon `--dur-fast` + standart easing
- **Card**: `--white/--border/--radius` → `--surface-card/--border-default/--radius-md`
- **ConfirmModal**: textarea 9px/`#cfd6e2`/legacy ring → token bazlı
- **Progress**: `width 300ms ease` → `var(--dur-base) var(--ease-standard)`
- **EmptyState**: padding 32px (DESIGN §11); CTA `--control-h-md`
- **DataTable**: skeleton shimmer → statik tonal blok; `--white` → `--surface-card`
- **Modal**: audit sonucu uyumlu (sm/md/lg/xl = 400/560/720/960, glass, close 36px) — değişmedi
- **Tabs**: audit sonucu uyumlu (segmented varyant, radius-sm, token bazlı) — değişmedi

## 11. Page-level teknik borç listesi (Faz 5'e devredildi — bu fazda dokunulmadı)

- `pages/CommunityPage.module.css` — `.primaryButton` (42px, 999px, gradient, 3D), `.toolButton` vs.
- `pages/SettingsPage.module.css` — `.deleteButton` (42px, 999px), `.legalLinks button` (44/10px), `.settingsNav`
- `decision-checks/StructuredDecisionTool.css` — primary 50px / secondary 44px
- `styles/main.css` — auth `.btn-cta` 50px + terracotta gradient + 3D; `.auth-input-shell` 48px
- `DecisionToolsPage.jsx` — Tailwind `bg-deep-petrol` özel buton
- `pages/Workspaces/Tracker.module.css` — `.cta` özel buton
- `Sidebar.module.css` — 42–50px çeşitli düğmeler; `DecisionCheckList` — `decision-panel-tool` (buttons.css'te global istisna olarak tutuldu)
- Radius sapmaları: 9/10/14/18/20px kart/kontrol karışımları (Community/News/Settings/Documents/Team vs.)

## 12. Auth CTA kararı bekleyen durum

`main.css` `.auth-form .btn-cta` (terracotta `#A84217→#D5703B` gradient, 50px, `#FFF9F3` foreground) bilinçli auth/hero özel tasarımı mı yoksa legacy mi — Faz 5 kararına bırakıldı; bu fazda dönüştürülmedi.

## 13. Build/test sonucu

- `npm run build` → ✓ built (7.95s; yalnız mevcut chunk-boyutu uyarısı)
- `npm test` (vitest) → ✓ 25 dosya / 136 test geçti
- Manuel smoke tarayıcıda yapılmadı; render ölçüleri kod seviyesinde doğrulandı. Görsel kontrol listesi: primary/secondary/ghost/danger/quiet × sm/md/lg, disabled, focus, dark/light; Input/Select/Search/Modal.

## 14. Faz 3'e taşınan konular

- `fields.css` global input/select zeminin kademeli sadeleştirilmesi (odu redirector: focus'ta `surface-raised` zemin değişimi DESIGN §7.2'de yok — görsel onayıyla)
- Loading spinner → statik tonal skeleton kararı; DataTable sticky header (scroll-container düzeni)
- MemoryPanel / EmbeddedPracticeBlock / Feed legacy blue
- Page-level teknik borç (madde 11) — shared Button'a geçiş
- `buttons.css` içindeki `decision-panel-tool` istisnasının sayfa taşıması
- Toast konumlandırma (sağ üst) kullanıcı alışkanlığı check