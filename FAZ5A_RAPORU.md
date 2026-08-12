# FAZ 5A RAPORU — Dashboard + Workspaces/Overview Compact & Unified Pass

Tarih: 2026-08-11 · Kapsam: yalnızca Dashboard ve Workspaces/Overview görsel/page-level normalizasyonu · Kaynak: DESIGN.md (§2 spacing, §4 typography, §5 density & spacing, §6 cards) · Git commit yapılmadı.

---

## 1. Dashboard audit bulguları

- `.page { max-width: 1200px }` → shell token'ı `--content-max-width` (1180px) kullanmıyordu; `@media (min-width:1200px)` bloğu da `1240px` force ediyordu (sayfa seviyesi çift kaynak).
- `@media (min-width:1200px) and (min-height:760px)` bloğu: 20+ ayrı override (hero, panel, KPI, aksiyon kartı, grid, col, sectionTitle) — DESİGN tek değeri yerine iki ayrı yoğunluk dili üretiyordu.
- Keyfi spacing: `gap:14px` (error/aksion/resume), `18px` (col, grid gap, activitySection), `22px` (statusPanel mb), `10px 26px` (statusKpis gap), `7px` (sectionTitle gap).
- Aksiyon kartları: 52px icon + 20px padding + 1.05rem title — feature kartı ölçeğinde; sayfanın geri kalan kartlarından (16px) ayrışıyordu.
- `heroTitle` 1.35rem semibold — page-title token'ından (24px/700) sapıyordu.
- KPI değerleri 1.08rem (17.3px — küsuratlı); metric-md/md ölçeğine uymuyordu.
- `dateChip` 8px 14px / 0.8rem (12.8px küsuratlı).
- Faz 5A kapsamındaki overflow görülmedi (grid/col `min-width:0` korumaları mevcut).
- Ölü CSS tespit edildi (kullanılmayan): `.toolPanel*`, `.kpiEmpty`, `.statsGrid/.statCard/.statValue/.statLabel/.pilotActions`, `.recGrid/.recCard/.recType/.recTitle/.recCategory`, `.demoBanner`, `.taskMeta` → Faz 5B'ye taşındı (§15).

## 2. Dashboard page header sonucu

- `.hero` (karşılama) satır düzeninde korundu: başlık + yardımcı metin + pasif tarih hapı; tek primary aksiyon yok (gerçek aksiyon kartları altta).
- `heroTitle` → `var(--font-size-page-title)` (24px) + `--font-weight-bold` (700); `heroSub` → 13px (body-sm).
- `hero` margin-bottom 20→16; `dateChip` → 8px 12px / 12px (label ölçeği) — sayfa başı 80-120px dikey boşluk yok, ilk satır içeriktir.

## 3. Dashboard hero/summary sonucu

- Dev hero yok (kompakt karşılama row'u). "Bugünkü İşletme Durumu" koyu paneli:
  - `margin-bottom` 22→16, `gap` 20px 28px → 16px 24px, `statusSentence` 1.02→1rem, KPI değerleri 1.08→1.125rem (18px = metric-md).
  - Panel içi metrikler artık KPI bandı olarak metric-md ölçeğinde; renk yalnız semantik (kırmızı risk) + nötr açık ton.

## 4. Dashboard metric/grid sonucu

- Aksiyon kartları (3K): padding 20→16, icon 52→40, title 1.05→1rem (16px card-title), desc 0.85→0.8125rem; grid `gap` 14→16 — tüm kartlar aynı padding/icon/radius sisteminde.
- `mainGrid` `gap` 18→16; `col` `gap` 18→16; `sectionTitle` alt boşluk 10→12 (DESIGN panel başlığı altı 12px).
- `listCard` padding 14→12 (compact yüz); row'lar `taskRow/newsRow 9→8px`, `communityRow 10→8px`.

## 5. Dashboard CTA/button sonucu

- Tüm CTA'lar zaten shared `Button` (`primary/sm/full`) — "Karar Ver" primary, diğerleri aynı contract. Geometry değişmedi; boyutlar 40px default satırında.
- `seeAll` (sesiz metin linki) ve `taskRow` check'leri icon-only/quiet kontrol — Button'a zorlanmadı (Faz 5A §11 istisnaları).

## 6. Dashboard spacing/radius sonucu

- `errorContainer` gap 14→16; `resumeCard` gap 14→12; `statusKpis` 10px 26px → 12px 24px; `activitySection` margin-top 18→16; `sectionTitle` gap 7→8.
- Radius: tümü token — `var(--radius)`, `--radius-sm`, `--radius-full`, `50%` (icon); legacy kart radius'ı yok.

## 7. Overview audit bulguları

- Hero: `min-height:150px`, `h2` clamp(1.65→2.25rem) — page-title (24px) ile yarışan ikinci dev başlık; `p` 650px genişlik; `heroWorkspace` 190px min-width ve 14px padding.
- Keyfi spacing: `gap:14px` (page grid), `18px` (recordsHead gap), `19px 22px` (recordsHead padding), `24px` (recordTable padding-bottom, recordsState), `gap:10px` (quickGrid/metrics), min-height 88/112/72/180.
- Radius: clip-path pahları 8/10/14px (kartlarda legacy ayrışma); `quickIcon` radius 11px.
- `recordRow` min-height 72px — DESIGN table row 44px'in ~%64 üzeri.
- `recordsHead button`: Özel buton (7 satır custom geometry + dark override) — shared Button'a taşındı.
- `@media (min-width:1100px)` bloğu: 11 ayrı override daha — ikinci yoğunluk dili.

## 8. Overview hero sonucu

- Kompakt: `min-height` 118px, `padding` 20px 24px, `h2` → `var(--font-size-page-title)` (24px, -0.01em), `p` 520px / 13px.
- İmza gradient + pah + sweep + glow korundu (hero istisnası, kontrollü); `heroWorkspace` 170px / 10px 14px / `--radius-md` eklendi.
- Mobil: hero 260→200px.

## 9. Overview quick cards sonucu

- `quickCard` min-height 88→76, gap 6, clip-path pah 8→12px; `quickIcon` radius 11→12px (aynen 40px); title 0.88→0.875rem (14px).
- Hover davranışı (`translateY(-3px)` + `bg-hover`) korundu; kartlar yalnız renkle değil, aynı surface+border sistemiyle ayrışıyor; icon hapı tek accent kanalı.

## 10. Overview list/table sonucu

- `recordRow` min-height 72→44 (DESIGN table row 44px), padding 8px 10px; `tableHead` padding 12px 10px 8px; grid `gap` 18→16.
- `recordIcon` 36→32px; `status` pill 4px 10→12px; `amount` 0.86→0.875rem; `recordTable` padding 0 20px 18 → 0 16px 12.
- `recordsState` min-height 180→140; `recordsHead` padding 19px 22px → 16px 20px, `h3` 1.18→1.125rem (18px section-title).
- Mobil `recordRow` gap 9px 14px → 12px.

## 11. Overview spacing/radius sonucu

- `page` gap 14→16; `businessCard` padding 22→20, `dl` gap 24→20; `quickGrid/.metrics` gap 10→16.
- Radius: clip-path pahları normal kartlarda 12px (quickCard/metric), feature panellerde 16px (recordsPanel/businessCard); `quickIcon` 12px; `heroWorkspace` 12px — legacy radius kalmadı.
- `@media (min-width:1100px)` override bloğu tamamen kaldırıldı (değerleri tabana gömüldü); Dashboard'daki geniş masaüstü bloğu da kaldırıldı — tek yoğunluk dili.

## 12. Dark/light sonucu

- Her değişiklik iki modda token tabanlı (surface/border/text token'ları). Overview dark bloğundaki kart/hero/quickIcon/status kuralları zaten mevcuttu; kaldırılan `recordsHead button` dark override'ı da silindi (buton shared Button contract'ına geçti).
- Yeni hardcoded renk girmedi (hex taraması: Overview light'ta 0 dış renk; yalnız koyu hero üstü beyaz alfa katmanları — kasıtlı).

## 13. Responsive sonucu

- Global breakpoint mimarisi değişmedi. Dashboard/Overview'da açık overflow yok (min-width:0 + grid korumaları).
- Mobilde hero 260→200px, quickCard 105→96, metric 130→112 (Faz 6 tam mobile pass kapsamı dışındadır).
- Viewport smoke tarayıcısız yapılamadı — §17'de açık bırakıldı.

## 14. Kaldırılan page-level override'lar

- `Dashboard.module.css`: `@media (min-width:1200px) and (min-height:760px)` bloğu (20+ override; 1240px max-width dahil) tamamen silindi.
- `Overview.module.css`: `@media (min-width:1100px) and (min-height:720px)` bloğu (11 override) tamamen silindi.
- Sayfa genişliği: Dashboard `1200/1240` → `var(--content-max-width)`; Overview zaten shell'e bağlıydı (`max-width` yok).
- Özel buton: `recordsHead button` (custom geometry + hover + dark kuralı) → shared `Button variant="secondary" size="sm"`.

## 15. Kalan teknik borçlar

- Dashboard.module.css'te ölü CSS (kullanılmayan sınıflar): `.toolPanel*`, `.kpiEmpty`, `.statsGrid/.statCard/.statValue/.statLabel/.pilotActions`, `.recGrid/.recCard/...`, `.demoBanner`, `.taskMeta` → Faz 5B'de silinecek.
- `Overview.recordsHead button` hover'ı (primary dolgulu) kaybedildi — shared secondary Button hover'ı devraldı; istenirse Faz 5B'de ghost/primary varyant değerlendirilebilir.
- Aksiyon kartı ikon renkleri (primary-light + brand-ink) korundu; semantik renk kanalı yalnız "Karar Ver"de (açıklama metni §5'te).
- Dev chunk uyarısı (index >500 kB) — bu fazın kapsamı dışı.

## 16. Build/test sonucu

- `npm run build` → `✓ built in 7.44s` — hata yok.
- `npm test` → 25 dosya / 136 test PASSED.

## 17. Manuel smoke sonucu

- Bu ortamda tarayıcı yok; görsel smoke (1440/1280/768/430/390/360, light+dark) yapılamadı. CSS ızgaraları ve media bloğu silinmeleri statik olarak doğrulandı; tarayıcıda manuel kontrol önerilir (özellikle 1280–1440 arası Dashboard 3. kolon 320px ve Overview hero pah'ları).

## 18. Faz 5B'ye taşınan konular

- Ölü CSS temizliği (Dashboard §15) + devam eden sayfa seviyesinde max-width tutarsızlıkları (WorkspaceList 1200, Courses/Enrollments/Knowledge 1200, FinancialModel 1240 — bu fazın dokunma listesi dışında).
- Tam mobil compact pass (hero/kart boyutları §13).
- Aksiyon kartı hover ikon/durum mikro-iyileştirmeleri.

Git add/commit/push yapılmadı.