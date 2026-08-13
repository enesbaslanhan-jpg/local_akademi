# LocalKarar 18 Screen Light + Dark

Repo route'ları, gerçek frontend sayfaları ve `C:/Users/bugrz/Downloads/DESIGN.md` içindeki Mineral Calm tokenları temel alınarak hazırlanmış tasarım prototipidir. Uygulama kodu değiştirilmemiştir.

## Önizleme

- `index.html?view=family&theme=light`
- `index.html?view=family&theme=dark`
- `index.html?view=screen&screen=dashboard&theme=light`
- `index.html?view=screen&screen=dashboard&theme=dark`

18 ekranın her biri `01-...-light.png` / `01-...-dark.png` biçiminde ayrı çıktı olarak bulunur. Toplu inceleme için `LOCALKARAR_18_DESKTOP_LIGHT.png` ve `LOCALKARAR_18_DESKTOP_DARK.png` kullanılır.

## Tasarım ilkeleri

- Pure white yalnız yükseltilmiş aktif yüzeydir; canvas ve büyük alanlar mineral gri katmanlardan oluşur.
- Ortak shell ürün bütünlüğü sağlar; ekran gövdeleri workbench, learning, evidence, ledger, graph, conversation, editorial ve operations anatomileriyle ayrışır.
- Her viewport gerçek içerikle doludur; süs amaçlı büyük boş hero alanı yoktur.
- Teal CTA, aktif durum ve progress ile sınırlıdır. Amber yalnız dikkat/öneri, yeşil yalnız başarı rolündedir.
- Light ve dark modlarda gövde, metadata ve kontrol kontrastı korunur.
- Motion vocabulary: press 120ms/0.98, state 180-240ms, origin-aware popover, reduced-motion crossfade. Runtime dependency eklenmemiştir.
