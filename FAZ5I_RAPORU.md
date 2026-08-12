# FAZ 5I RAPORU

Tarih: 2026-08-11 · Kapsam: final page-level cleanup · Otorite: `DESIGN.md` · Git işlemi yapılmadı.

## Dashboard dead CSS

Dashboard JSX referans taramasıyla kullanılmadığı doğrulanan `kpiEmpty`, `taskMeta`, priority tone, receipt headline tone, tool panel, pilot stats/actions, recommendation cards ve demo banner blokları kaldırıldı. Dashboard CSS bundle yaklaşık 14.66kB → 11.05kB düştü; çalışan Dashboard sınıfları korunuyor.

## LearningProgressPanel

- Dormant Tailwind utility stringleri JSX'ten kaldırıldı; görünüm yalnız `LearningProgressPanel.module.css` ile tanımlanıyor.
- Kart/satır yüzeyleri `surface-2`, `radius-md`, `shadow-sm/md`; progress primary; completed success; 4px scale ve shared Button contractı.
- Uppercase mikro-label yalnız içerik türü gibi gerçek eyebrow/label alanında, `font-size-label` + kontrollü tracking ile kullanılıyor; normal metin uppercase yapılmadı.

## Auth / terracotta istisnası

- Auth özel terracotta CTA kaldırıldı; `.btn-cta` primary contractına bağlandı.
- Auth “glass” sınıf adı backward-compatible kaldı fakat yüzey artık glass değil: backdrop-filter, glow, 23/20px radius ve hardcoded glass renkleri kaldırıldı.
- Auth form `surface-elevated`, `radius-lg`, `shadow-overlay`; kontroller 40px, ana onboarding/login CTA 48px.
- Light/dark özel hardcoded panel/input renkleri merkezi surface/text/border tokenlarına taşındı.

## Referanssız DecisionToolsPage

`DecisionToolsPage.jsx/.module.css` hiçbir route/import tarafından kullanılmıyor. `/decision-tools` doğrudan `/app/decision-checks` redirectini koruyor. Tarihsel mockup dosyaları bu turda yeniden tasarlanmadı veya silinmedi; silme kararı kullanıcı/veri kurtarma politikası gerektiren ayrı cleanup olabilir.

## Override / micro-label kararı

- Uppercase kullanım normal body/button metnine yayılmadı; yalnız eyebrow, badge, category ve label semantiğinde korundu.
- Auth istisnası kapatıldı; gerçek glass allow-list Header/Sidebar/Modal/Drawer/Search/Mentor overlay ile sınırlı kaldı.
- Kök `src` bayat kopyasına dokunulmadı.

## Doğrulama

- `npm run build`: başarılı; yalnız mevcut >500kB chunk uyarısı.
- `npm test`: 25 dosya / 138 test geçti.
- LearningProgressPanel Tailwind utility taraması boş; Dashboard kullanılmayan module selector taraması boş; auth backdrop-filter/terracotta/hardcoded CTA gradient taraması boş (sınıf adındaki `auth-glass-frame` legacy DOM adıdır, aktif glass özelliği değildir).
- `/decision-tools` redirect ve `/app/decision-checks` hedefi değişmedi.
- Manuel smoke/tarayıcı erişimi yok; görsel sonuç uydurulmadı.
