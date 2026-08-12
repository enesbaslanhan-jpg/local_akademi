# FAZ 5D — Finance Center + Model Lab: Kompakt ve Birleşik Geçiş

## Amaç

Finance Center ile Model Lab'i aynı LocalKarar ürün ailesine çekmek. Şu anda:

- Finance Center **"yeşil hesaplama ekranı"** gibi duruyor
- Model Lab **"beyaz, ayrı bir prototip"** gibi duruyor

İkisi de aynı tasarım sisteminin **veri yoğun iki uzman ekranı** gibi görünmeli.
Fark yalnızca içerik yoğunluğunda olmalı.

`DESIGN.md` tek otoritedir. Çakışma olursa DESIGN.md kazanır.

---

## Kapsam

Yalnızca şunlar:

```
Finance Center            → src/pages/ToolsPage.jsx + .module.css
Model Lab (kütüphane)     → src/pages/FinancialModelLibrary.jsx + .module.css
Model Lab (çalışma alanı) → src/pages/FinancialModelWorkspace.jsx + .module.css
Karar araçları            → src/pages/DecisionToolsPage.jsx + .module.css
```

Bunlara bağlı: hesaplama formları, sonuç kartları, geçmiş hesaplamalar,
model kartları, model girdi panelleri, senaryo/çıktı panelleri, geçmiş modeller.

**Kapsam dışındaki hiçbir sayfaya dokunma.**

---

## Doğrulanmış başlangıç envanteri

Bu üç borç kodda **gerçekten var**, aramana gerek yok:

| Borç | Yer |
|---|---|
| `max-width: 1240px` | `FinancialModelLibrary.module.css:1` |
| `max-width: 1240px` | `FinancialModelWorkspace.module.css:1` |
| `border-radius: 20px` | `FinancialModelWorkspace.module.css:3` |
| `border-radius: 10px` (5 yer) | `FinancialModelWorkspace.module.css:9, 16, 61, 79` + `ToolsPage.module.css:150` |

Bunlar dışında **kendi envanterini çıkar**. Dosya adlarını varsayma, gerçek
dosyayı oku. Her ekran için not al:

```
page title · hero/header · tabs · search/filter · calculator cards
form controls · result cards · metric cards · history · model cards
scenario layout · max-width · min-height · spacing · radius
custom colors · semantic colors · custom buttons · breakpoints
dark/light · mobile davranışı
```

Körlemesine küçültme yapma — gerçek içerik gereksinimini bozma.

---

## İŞ 1 — Renk hiyerarşisi (bu fazın en kritik maddesi)

**Finance Center'ın ana kimliği yeşil DEĞİL.** Ana accent brand rampası
(`brand-500` / `#306D88`) olarak kalır.

`success` yeşili **yalnızca** şunlarda:

- pozitif sonuç değeri
- sağlıklı durum rozeti
- başarı / uygunluk göstergesi

**Yeşile boyanmayacak olanlar:** calculator card, section header, tab,
buton, ikon zemini, result container, sayfa başlığı, panel zemini.

### Sınır kuralı (bunu net uygula)

Nakit ve kâr ekranlarında sonuçların çoğu pozitif olacağı için, "pozitif =
yeşil" kuralı gevşek uygulanırsa sayfa yine yeşile boğulur. Bu yüzden:

- Yeşil **yalnızca rozet ve tek bir rakamda** kullanılır.
- **Kart zemininde asla** kullanılmaz — dolu yeşil panel yok, yeşil
  gradient yok, yeşil glow yok.
- Aynı kartta hem primary CTA hem success metni varsa, success daha sönük
  ton kullanır (`DESIGN.md §` renk bölümü).

Hedef yapı:

```
neutral surface  +  brand accent  +  gerektiğinde semantic yeşil
```

---

## İŞ 2 — Finance Center sayfa başlığı

İlk viewportta şunlar görünmeli: sayfa başlığı, kısa açıklama, ana
hesaplama/filtre, ilk gerçek finans içeriği.

- Page title: `24px` desktop / `20px` mobil (semantic token)
- Dev hero veya büyük yeşil banner varsa küçült

---

## İŞ 3 — Hesaplama kartları

Standart kart:

```
padding 16px · radius-md (12px)
```

Yapı: ikon/kategori → başlık → kısa açıklama → zorunlu girdi sayısı/meta → eylem

**Kaldır:** yüksek `min-height`, büyük gradient, yeşil full-background,
dev ikon, `24px` padding, glow.

Grid: gap `16px`. Kartlar desktopta gereksiz uzamasın, farklı yüksekliklerde
dağılmasın, aşırı boşluk bırakmasın.

---

## İŞ 4 — Formlar

```
input / select / search  → control-md = 40px
normal submit            → btn-md = 40px
tek gerçek ana CTA       → btn-lg = 48px (yalnızca gerekliyse)
```

Form `24px+` dikey boşluklarla uzamasın. Label + control + helper dengeli olsun.

---

## İŞ 5 — Sonuç kartı hiyerarşisi

Sonuç ekranı dev yeşil panel olmayacak. Hiyerarşi:

```
Ana sonuç        → metric-lg, brand veya text-primary
İkincil metrikler
Yorum
Uyarı / risk
Sonraki eylem
```

Semantik renk yalnız gerçekten anlamlıysa (kâr pozitif, risk yüksek) ve
yalnız rakam/rozet düzeyinde.

---

## İŞ 6 — Yanıltıcı sonuç etiketleri ("Nakit runway 0 ay")

Şu durumları audit et: `0` değer, `undefined`, yetersiz veri, sıfıra bölme,
eksik girdi.

Görsel etiket gerçek durumu yanlış anlatıyorsa doğru UI durumuna geçir:

```
"Veri yetersiz"  ·  "Hesaplanamadı"  ·  "Girdi gerekli"
```

**Ama:** formül mantığını keyfi değiştirme, backend iş mantığını yeniden
yazma. Gerçek bir business logic problemi varsa **düzeltme, rapora taşı.**

---

## İŞ 7 — Geçmiş hesaplamalar

Compact liste/kart olarak taranabilir olsun:

```
tarih · hesaplama türü · ana sonuç · durum · aç
```

Her kayıt büyük feature card olmayacak. Satır ritmi `40–44px` veya compact
kart kontratı.

Kullanıcı bir kayda tıkladığında tepki net olmalı; detay görünümü açıkça
ayrışmalı (receipt / result sheet / drawer). **Yeni backend oluşturma** —
mevcut kayıt detayını net bir görsel container'a çek.

### Fiş standardı

Karar Fişi ile birebir aynı olmak zorunda değil, ama aynı aileden görünmeli:

```
hesaplama başlığı · tarih/meta · girdi özeti · ana sonuç
ikincil metrikler · yorum · sonraki eylem
```

Dış kap: `surface-2/3`, `radius-md/lg`, `border`, `shadow-sm`. **Glass ve glow yok.**

---

## İŞ 8 — Model Lab yüzey normalizasyonu

Özellikle şunları ara ve düzelt:

```
beyaz zeminler · büyük boş alanlar · bağımsız kart tonları
yalnız-açık-mod paneller · hardcoded #fff
```

Bembeyaz büyük paneller `surface-1 / surface-2 / surface-3` sistemine çekilecek.
Koyu modda da aynı hiyerarşiyi taşıyacak.

Model Lab üst alanı Finance Center ile **aynı hiyerarşide** olmalı — ayrı
bir prototip sayfası hissi vermemeli.

---

## İŞ 9 — Model kartları ve girdi panelleri

**Model kartı:** `padding 16` · `radius-md` · yapı: model tipi → başlık →
kısa amaç → zorunlu girdiler → karmaşıklık/meta → aç.

Kaldır: dev `min-height`, büyük illüstrasyon, her modele farklı renk,
glow, gradient.

**Kategori/filtre** (WACC, DCF, FCFF, senaryo, değerleme, maliyet):
Tabs / Select / Chip / Segmented kontratından gelsin. Dev toggle grubu yapma.

**Girdi paneli:** kontroller `40px`, bölüm aralığı `24px` desktop / `16px`
mobil. "Laboratuvar" hissi uğruna her girdi grubuna büyük beyaz kutu verme.

**Parametre bölümü:** bölüm başlığı → kısa yardım metni → girdiler.
`32–48px` aralıklarla sayfayı uzatma.

---

## İŞ 10 — Model çıktısı ve senaryolar

Çıktı hiyerarşisi: ana değer (`metric-lg`) → ikincil metrikler → yorum →
duyarlılık/senaryo → uyarı. **Neon renklerle gösterme.**

Senaryo/duyarlılık kartları: standard/compact kart, aynı radius, aynı padding.
"Base / iyimser / kötümser" durumlarında **metin + rozet + ikon** kullan —
sadece yeşil/kırmızı renk farkı bırakma (erişilebilirlik).

**Geçmiş modeller:** compact — model adı, tarih, ana metrik, durum, aç.
Her kayıt feature card olmasın.

"Geçmiş Model" gibi üst kontroller sayfa başlığıyla yarışmasın; tab/select/
quiet buton seviyesinde kalsın. Ana header'da ikinci büyük CTA yapma.

---

## İŞ 11 — CTA hiyerarşisi

```
Primary   → Hesapla · Modeli Çalıştır · Sonucu Mentora Sor
Secondary → Sıfırla · Yeniden Hesapla · Karşılaştır
Quiet     → Geçmiş · Geri · Detay
```

Hepsi primary olmayacak.

Kapsamdaki `44 / 46 / 50 / 52 / 56px` normal CTA'ları paylaşılan Button
kontratına taşı: `sm 32` · `md 40` · `lg 48`. (Mobil `44px` dokunma hedefi
ayrı konu, onu bozma.)

---

## İŞ 12 — Ölçü normalizasyonu

**Max-width:** her iki sayfa da `var(--content-max-width)` kullanacak.
Yukarıdaki iki `1240px` borcunu burada çöz. İç sonuç/model kolonu için
gerekirse daha dar nested width kullanılabilir.

**Spacing:** `4 8 12 16 20 24 32 40 48`. Kapsamdaki
`10 14 18 22 26 28 30 36` layout kalıntılarını normalize et.

**Radius:** normal `radius-md` (12) · feature `radius-lg` (16) ·
input/buton `radius-sm` (8). Kartlarda `18 / 20 / 24` bırakma.

**Gölge:** normal kart `shadow-sm`, hover `shadow-md`. Büyük glow yok.
"Finance success" yeşil glow yok, "Model Lab" mavi glow yok.

---

## İŞ 13 — Tema, grafik, durum, erişilebilirlik

**Dark/light:** Faz 4.1 tema kontratını koru. Model Lab açık modda
patlamayacak, koyu modda tüm yüzeyler aynı charcoal sistemine oturacak.
Yeni hardcoded `white / black / blue / green` **ekleme**.

**Grafikler:** chart paleti ayrı bir istisna olabilir. Ama chart dışı UI
renklerini chart paletinden alma, chart renklerini de körlemesine brand'e
çevirme.

**Validation:** semantik, kompakt, açık mesaj, kontrole bağlı. Dev kırmızı
alert kartı kullanma.

**Durumlar:** `loading · geçmiş yok · sonuç yok · model yok · geçersiz girdi`
— hepsi EmptyState kontratıyla. Boş durumda dev beyaz alan bırakma.

**Erişilebilirlik:** label, `aria-describedby`, hata bağlantıları, tabs,
sonuç başlık hiyerarşisi, progress, senaryo durumları, butonlar, geçmiş
satırları. **Renk tek başına veri taşımayacak.**

---

## İŞ 14 — Responsive

Tam mobil yeniden tasarım bu fazda **yok** (Faz 6). Sadece açık bozukluklar:
form taşması, tablo taşması, metrik satırı taşması, senaryo kartı taşması,
sonuç sheet genişliği, geçmiş satırı.

Viewport kontrolü: `1440 · 1280 · 768 · 430 · 390 · 360`

---

## Değişmeyecek olanlar

```
hesaplama formülleri · girdi mantığı · validation kuralları
kayıt/geçmiş davranışı · sonuç yükleme · model hesaplamaları
senaryo mantığı · deep link'ler · Mentor bağlantıları
```

UI normalizasyonu iş mantığını değiştirmeyecek.

Dead CSS temizliği **yalnızca** Finance Center / Model Lab kapsamında.
Başka paketlerin dead CSS'ine dokunma.

**`git add` / `git commit` / `git push` YAPMA.**

---

## Test

```bash
npm run build
npm test
```

Ek taramalar (hepsi boş dönmeli):

```
Finance özel max-width · FinancialModel 1240 · yeşil dolu kartlar
legacy kart radius (18/20/24) · özel CTA geometrisi
hardcoded finance yeşili · hardcoded beyaz (ModelLab)
izinsiz glass · özel glow · scale dışı spacing
```

### Manuel smoke

Finance Center ve Model Lab: `1440 açık` · `1440 koyu` · `1280` · `768` ·
`430` · `390` · `360`
Hesaplama sonucu/geçmişi ve model sonucu/senaryosu: `1440` · `768` · `390`

Şunlara bak:

```
Finance fazla yeşil mi · Model Lab fazla beyaz mı
kartlar aynı ürün ailesinden mi · formlar kompakt mı
sonuç okunuyor mu · geçmiş taranabilir mi
CTA hiyerarşisi doğru mu · ilk viewportta gerçek içerik var mı
dark/light dengeli mi · overflow var mı
```

Tarayıcı yoksa bu maddeyi açık bırak, uydurma.

---

## Rapor formatı

```
FAZ 5D RAPORU

1.  Finance audit
2.  Finance header sonucu
3.  Finance renk hiyerarşisi
4.  Finance hesaplama kartları
5.  Finance formlar
6.  Finance sonuç hiyerarşisi
7.  Runway / geçersiz sonuç sunumu
8.  Finance geçmiş
9.  Finance fiş/detay
10. Model Lab audit
11. Model Lab header
12. Model Lab yüzey normalizasyonu
13. Model kartları
14. Model girdi/parametre panelleri
15. Model sonuç hiyerarşisi
16. Senaryo/duyarlılık sonucu
17. Model geçmiş
18. Finance/Model ortak dil sonucu
19. CTA hiyerarşisi
20. Max-width sonucu
21. Spacing/radius sonucu
22. Dark/light sonucu
23. Chart istisnaları
24. Erişilebilirlik
25. Responsive
26. Kaldırılan page-level override'lar
27. Kalan finance/model teknik borçları
28. Build/test
29. Manuel smoke
30. Faz 5E'ye taşınan konular
```

Raporda **soru işareti bıraktığın yerleri de yaz** — özellikle "bu yeşil
semantik mi yoksa dekoratif mi" diye tereddüt ettiğin satırları.
