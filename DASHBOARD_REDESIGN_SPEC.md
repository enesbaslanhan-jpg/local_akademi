# LocalKarar Dashboard Redesign Specification

**Amaç:** Bu belge yalnız Dashboard için Stitch/Figma high-fidelity mockup üretim sözleşmesidir. Kod, motion implementasyonu veya başka sayfaların yeniden tasarımı bu kapsamda değildir.

## 1. Kesin tasarım yönü

### Yön adı: Sakin Operasyon Masası

LocalKarar Dashboard, genel amaçlı bir SaaS admin paneli gibi değil, küçük işletme sahibinin güne başlarken üç soruya yanıt aldığı bir çalışma masası gibi görünmelidir:

1. İşletmemin bugünkü durumu ne?
2. Şimdi hangi işi tamamlamalıyım?
3. Bir sonraki kararımı nereden başlatırım?

Karakter: sakin, yetkin, erişilebilir, gündelik ama profesyonel. Finansal güven, öğrenme sürekliliği ve karar desteği aynı sistemde birleşir. Tasarım “premium dashboard” klişesine, neon fintech estetiğine veya steril kurumsal admin şablonuna düşmez.

### Tasarım sistemi yaklaşımı

- Yeni component library veya farklı bir design system önerilmez.
- Mockup, LocalKarar'ın mevcut token mantığını yeniden yorumlar.
- Marka otoritesi: `DESIGN.md` içindeki `brand-500 #306D88` merkezli aile.
- Sans tipografi korunur. Manrope ana aile; sistem fallback'i yalnız yükleme durumunda.
- Light mode first. Dark mode, light varyant onaylandıktan sonra aynı hiyerarşinin token varyantı olarak çalışılır.

## 2. Üç ana ilke

### Unified != identical

Birleşik sistem, her içeriğin aynı kart içinde ve aynı anatomiyle sunulması değildir. Görev listesi satırdır, karar sonucu fiştir, hızlı aksiyon action rail'dir, işletme durumu signature paneldir. Hepsi aynı typography, spacing, border ve token ailesini paylaşır; biçimleri içerik görevine göre farklıdır.

### Compact != flat

Kompaktlık küçük yazı ve soluk kutu anlamına gelmez. 12-16px padding, 40-44px kontrol yüksekliği, güçlü metin hiyerarşisi, tonal surface katmanları ve seçici depth kullanılır. İlk viewportta daha fazla gerçek içerik gösterilir, fakat okunabilirlik azaltılmaz.

### Tokenized != colorless

Token kullanımı bütün ekranı gri veya tek teal yapmak değildir. Marka rengi aksiyon ve active state için görünür kalır. Semantic success, warning ve error yalnız gerçek durumlarda kullanılır. Sidebar, signature panel ve karar fişi kendi materyal karakterini token sistemi içinde taşır.

## 3. Ürün karakteri

- “Karar destekli öğrenme ve işletme yönetimi” karakteri ilk 5 saniyede anlaşılmalı.
- Finans uygulaması kadar güvenilir, eğitim uygulaması kadar anlaşılır olmalı.
- Dil resmi fakat soğuk değil. Türkçe başlıklar kısa ve doğrudan.
- Büyük pazarlama sloganı, dekoratif metrik, sahte canlı durum, rozet yığını veya gösterişli illüstrasyon yok.
- Ürün imzası, tek koyu işletme durumu paneli ile karar fişinin ayrı artefakt biçiminden gelir.

## 4. Light palette davranışı

### Temel yüzeyler

| Rol | Hedef değer | Davranış |
|---|---|---|
| Page canvas | `#EDF0F2` | Cool mineral gray, pure white değil |
| Sunken area | `#E4E8EB` | Input ve gömülü küçük alan |
| Section panel | `#F4F6F8` | Hafif grup zemini, her bölümde zorunlu değil |
| Card / content surface | `#FBFCFD` | Yalnız gerçek container gerektiğinde |
| Raised | `#FFFFFF` | Dropdown, modal, popover ve küçük highlight |
| Primary text | `#1A1C1E` | Ana okuma rengi |
| Secondary text | `#3F484A` | Açıklama ve meta |
| Muted text | `#6B7575` | Yalnız düşük öncelikli yardımcı bilgi |
| Brand primary | `#306D88` | Primary CTA, active, link, progress |

### Kullanım kuralları

- Tam sayfa pure white yasak.
- Her section için ayrı beyaz card yasak.
- Canvas, section panel ve content surface aynı viewportta en fazla üç okunur kademe oluşturur.
- Raised white yalnız gerçekten yükselen veya seçilen küçük alanlarda görünür.
- Gölge yüzeyi tanımlamaz; önce ton, sonra border, en son çok hafif shadow.
- Brand rengi büyük arka plan veya dekoratif gradient değildir.

## 5. Dark palette davranışı

Dark mode bu aşamada mockup varyantı olarak üretilmez. Onay sonrasında aşağıdaki davranışla hazırlanır:

| Rol | Hedef değer |
|---|---|
| Page canvas | `#15181C` |
| Sunken | `#101317` |
| Section panel | `#191D21` |
| Card | `#1D2126` |
| Highlighted card | `#22272C` |
| Raised | `#282E34` |
| Primary text | `#E4E9ED` |
| Secondary text | `#9AA6AE` |

Kurallar:

- Saturated blue veya cyan dark mode yasak.
- Büyük yüzeyler brand palette'ten türetilmez; graphite/charcoal kalır.
- Primary CTA solid `brand-500` olur; tonal primary yüzey kullanılmaz.
- Link ve focus için erişilebilir `brand-300/400`, yalnız küçük alanlarda.
- Signature panel dark mode'da diğer kartlardan bir ton daha yükseltilir; mavi blok veya siyah çukur olmaz.
- Semantic renkler koyu zeminde küçük label, icon veya değer için kullanılır. Büyük dolgu yüzeyi olmaz.

## 6. Sidebar tonu

### Light mode

- Sidebar açık ve belirgin biçimde tinted olmalı: ana zemin `brand-50 #D8E3E8`.
- Ana metin `brand-800 #10242D` veya eşdeğer yüksek kontrastlı ink.
- Secondary text `brand-700 #1B3D4C` düşük opaklıkla değil, erişilebilir sabit tonla.
- Active item: `brand-100 #C5D6DE` zemin + `brand-700` text + tek 2px brand indicator.
- Hover: `brand-100` ile `brand-50` arasında hafif tonal değişim.
- Sidebar içerikten daha koyu bir blok değil; shell'i tanımlayan mineral renk alanıdır.

### İçerik ve anatomi

- Desktop genişlik 248-256px; collapsed 64px korunur.
- Marka alanı 64px civarında, Header'dan kopuk dev blok olmaz.
- `Professional Community` alt başlığı kaldırılmalı veya Türkçe, ürün gerçeğine dayalı kısa bir ifade ile değiştirilmelidir. Mockup'ta alt başlıksız çözüm tercih edilir.
- Arama, menü sayısı gerçekten gerektiriyorsa kalır; görsel ağırlığı nav item'dan düşük olmalı.
- Group label'lar uppercase ve geniş tracking ile bağırmaz. 12px semibold sentence case kullanılabilir: “Ana menü”, “Diğer”.
- Active ile recommended aynı çizgiyi paylaşmaz. Active = konum; recommended = yalnız gerçek öneri varsa küçük metin etiketi.
- Collapsed durumda her ikon hover/focus tooltip ile label göstermeli.
- Sidebar üzerinde büyük primary CTA yok.

## 7. Header

- Yükseklik 52-56px.
- Zemin page canvas ile aynı ailede, yüzde 96 opak. Blur yalnız sticky katman ayrımı için ve çok hafif.
- Sol: route başlığı `Ana Sayfa`, 16px semibold. Mobilde hamburger + başlık.
- Sağ: tek tarih gösterimi, theme toggle, bildirim, 36px avatar.
- Dashboard hero içindeki ikinci tarih kaldırılır.
- Header altında belirgin shadow yok; 1px divider yeterli.
- Header, sayfa başlığından daha güçlü görünmez.

## 8. Page background ve içerik kabı

- Shell sonrası content max width 1180px.
- Desktop yatay gutter 24px, mobil 16px.
- Dashboard üst boşluğu 20-24px.
- Sayfa ayrı beyaz sheet içine alınmaz; doğrudan canvas üzerinde kompoze edilir.
- Page intro 56-64px yüksekliğini geçmez.

## 9. Typography hierarchy

| Rol | Desktop | Weight | Not |
|---|---:|---:|---|
| Page greeting | 24px | 700 | En fazla 1 satır |
| Page supporting line | 13-14px | 400 | 1 satır, secondary |
| Section title | 16-18px | 600 | İkon zorunlu değil |
| Card/content title | 15-16px | 600 | İçerik türüne göre |
| Body | 14px | 400 | Varsayılan |
| Body small | 13px | 400 | Liste meta ve yardımcı metin |
| Label | 12px | 600 | KPI label, badge |
| Caption | 11-12px | 500 | Zaman ve dip bilgi |
| KPI value | 18-24px | 700 | Yalnız gerçek metrik |

Kurallar:

- 11px altı görünür metin yok.
- Uppercase yalnız çok kısa semantic label için; bölüm başlıklarında kullanılmaz.
- Harf aralığı dekorasyon için açılmaz.
- Sayıların okunabilirliği için tabular numerals kullanılabilir.
- Manrope tek aile. Serif, mono veya rastgele ikinci font yok.

## 10. Surface layering

Yüzey hiyerarşisi:

1. Canvas: tüm sayfa.
2. Tinted sidebar: shell yönlendirmesi.
3. Signature panel: tek yüksek kontrastlı an.
4. Section group: gerektiğinde çok hafif panel tonu.
5. Content surface: yalnız container gerektiğinde.
6. Raised: overlay veya seçili küçük kontrol.

Her bölüm card olmak zorunda değildir:

- Tasks: section başlığı + bölünmüş liste.
- News: section başlığı + metin akışı.
- Quick actions: action rail.
- Continue learning: hafif feature surface.
- Decision receipt: özel artefakt yüzeyi.

## 11. Signature panel kuralı

Dashboard'da **en fazla bir** compact signature panel bulunur: `Bugünkü İşletme Durumu`.

### Anatomi

- Desktop yüksekliği hedef 104-120px.
- Zemin: light mode'da deep graphite-teal, fakat saturated blue değil. `brand-800` ile neutral graphite arasında sakin bir ton.
- Sol bölüm: 28-34 karakteri geçmeyen durum cümlesi.
- Sağ bölüm: 4 veya 5 KPI, eşit kartlara bölünmeden tek band üzerinde.
- KPI'lar ince dikey divider veya spacing ile ayrılır.
- Büyük rakamlar kırık beyaz. Semantic renk yalnız gecikme/risk değerinde küçük vurgu.
- Gold eyebrow yok. Başlık normal label olarak açık gri.
- Sürekli sweep, glow, bevel, hologram veya gradient animasyonu yok.
- Hafif 1px üst highlight ve tinted shadow yeterli.
- Empty state aynı panel içinde tek kısa açıklama + secondary action ile çözülür.

## 12. Quick actions

Üç büyük eşit kart kaldırılır, işlevler korunur.

### Hedef model: Compact action rail

- Tek satır yatay grup, 52-60px yüksekliğinde.
- Sol kısa label: `Hızlı işlemler`.
- `Karar Ver`: solid primary button, ikon + label.
- `Hesapla`: secondary button.
- `Mentor'a Sor`: ghost veya quiet button; son görüşme bilgisi varsa 1 satır meta yanında gösterilebilir.
- Açıklama paragrafları rail üzerinde gösterilmez. Gerekirse tooltip veya yardımcı kısa text kullanılır.
- Hiçbir aksiyon tam kolon genişliği kullanmaz.
- Mobile'da yatay kaydırmalı kontrol grubu veya iki satırlı compact wrap; büyük kartlara dönmez.

## 13. Continue learning

- “Kaldığın Yerden Devam Et” ilk gerçek iş olarak signature panel ve action rail sonrasında görünür.
- 2 kolonlu workboard içinde sol üstte veya en geniş sütunda yer alır.
- Hafif brand-tinted feature surface, 12px radius.
- İçerik: kurs adı, kalan bölüm/ders, `%68 tamamlandı`, progress, `Devam Et` secondary action.
- Kart yüksekliği 108-132px.
- İkon dekoratif büyük daire içinde değil; 18-20px inline veya küçük 32px tonal tile.
- Progress rengi brand; success green kullanılmaz.
- Tam kart clickable olabilir, fakat button ve kart aynı aksiyonu iki kez bağırmaz. Bir görünür `Devam Et` yeterlidir.

## 14. Tasks

- Başlık: `Bugünkü Görevler` + sağda compact status özeti.
- Dışta zorunlu card yok. Section panel veya doğrudan canvas üzerinde liste olabilir.
- İlk viewportta en az 3 görev görünür.
- Satır yüksekliği 44px.
- Checkbox 18px, görev adı 13-14px, tarih 12px.
- Öncelik badge yerine mümkünse kısa text + semantic icon; badge kullanılacaksa yalnız high/medium gibi gerçek öncelik.
- Low priority yeşil dekorasyon değildir; nötr bırakılabilir.
- Tamamlanan satırın tüm opacity'si düşürülmez. Metin strike-through + secondary text yeterli.
- Footer link: `Tüm görevler` ghost text action.

## 15. News ve community

- `Güncel Haberler` ana bilgi akışı, `Topluluktan` ikincil alt grup.
- Dış card yerine article/list rows.
- Haber satırı: kaynak kurum, başlık, zaman. Thumbnail veri modelinde yoksa uydurulmaz.
- Kaynak kurum semantic badge gibi renkli değildir; 12px semibold text.
- İlk viewport hedefinde en az 2 haber başlığı kısmen veya tamamen görünür olabilir.
- “Tümünü gör” küçük ghost action.
- Community avatar monogramları dominant renk bloğu olmaz; 28-32px nötr tonal circle.

## 16. Decision receipt / result

- `Son Karar Sonucu` korunur, fakat ikinci koyu signature panel olmaz.
- Yüzey, açık mode'da warm olmayan nötr “receipt/ledger” karakteri taşır: `surface-card`, subtle border, hafif perforation veya kesik alt kenar.
- Dark mode'da raised graphite surface.
- Anatomi: `Karar Fişi` label, büyük sonuç `UYGUN`, 1 satır summary, tek sonucu temsil eden metrik, tarih.
- Semantic renk yalnız sonuç label veya küçük edge işaretinde. Tüm panel yeşil/kırmızı olmaz.
- Click affordance açık: footer'da `Fişi aç` ghost action veya sağ üst external/detail icon.
- Receipt ilk viewportta tam görünmek zorunda değil, ancak workboard üst bölümünde konumu anlaşılmalı.

## 17. CTA hierarchy

1. **Primary:** `Karar Ver`. Sayfada tek solid primary.
2. **Secondary:** `Devam Et`, `Hesapla`, işletme empty-state aksiyonu.
3. **Ghost/quiet:** `Mentor'a Sor`, `Tümünü gör`, `Tüm görevler`, `Fişi aç`.
4. **Danger:** Dashboard ana görünümünde beklenmez.

Kurallar:

- Primary 40px yükseklik, 8px radius. Full pill değil.
- Secondary aynı yükseklik ve daha sakin yüzey.
- Tek satır label, en fazla 3 kelime.
- Full-width CTA yalnız mobilde gerçek form veya blok sonu gerekçesi varsa.
- Dark mode primary tonal değil, solid.
- 3D basamak gölgesi, 5px press travel ve 600ms sheen yok.

## 18. Icon treatment

- Mevcut ikon ailesi mockup aşamasında tek aile olarak temsil edilir. Implementasyonda mevcut dependency ayrıca değerlendirilir.
- Standart stroke 1.75-2px.
- Navigation 18px, action 18-20px, section helper 16px.
- Her bölüm başlığı ikon istemez. İkon, anlamı hızlandırıyorsa kullanılır.
- Büyük 52px circular icon medallion yok.
- İkon zeminleri 32-36px tonal square, radius 8px; yalnız belirgin aksiyonlarda.
- Semantic iconlar renk + metin ile birlikte kullanılır.

## 19. Border, shadow ve depth

- Default border: düşük kontrastlı neutral 1px.
- Default content surface shadow: yok veya `0 1px 2px`.
- Feature surface: çok hafif tinted shadow.
- Signature panel: tek belirgin tinted shadow.
- Overlay: güçlü shadow yalnız modal/dropdown.
- Glow yok.
- Card hover en fazla 1px lift veya border değişimi.
- Radius sistemi: content 12px, control 8px, small badge 999px, avatar 50%.
- Button'larda pill yalnız filtre/chip mantığı varsa.

## 20. Spacing ve density

- 4px tabanlı scale: 4, 8, 12, 16, 20, 24, 32.
- Page intro altı 16px.
- Signature panel altı 12-16px.
- Action rail altı 16px.
- Workboard grid gap 16px.
- Section içi başlık ve içerik 8-12px.
- List row 44px.
- Content padding: compact 12px, standard 16px, feature 20-24px.
- Aynı viewportta 24px'den büyük dikey boşluk yalnız ana bölüm ayrımı için bir kez kullanılabilir.

## 21. First viewport hedefi

### 1440 x 900 desktop

İlk viewportta aşağıdakiler görünmeli:

- 52-56px Header.
- Kompakt karşılama ve işletme adı.
- Tek `Bugünkü İşletme Durumu` signature paneli.
- Compact quick-action rail.
- Continue learning bloğunun tamamı.
- En az 3 görev satırı.
- En az 2 haber başlığı veya Son Karar Sonucu'nun üst kısmı.

Page title + dekoratif hero + üç büyük action card sonrasında gerçek içeriğin başlaması kabul edilmez.

### 1280 x 800 desktop

- Signature panel ve action rail tam görünür.
- Continue learning ve en az 2 görev satırı görünür.
- Üç kolon zorlanmaz; iki kolon workboard tercih edilir.

## 22. Responsive notlar

### 1024-1279px

- Sidebar 64px collapsed seçeneği görünür ve anlaşılır.
- Workboard 2 kolon.
- News ve receipt ikinci kolon altında sıralanabilir.

### 769-1023px

- Desktop sidebar drawer'a dönüşür.
- Header hamburger + page title + iki temel ikon.
- Signature KPI bandı 2x2 + tek satır kalan KPI şeklinde wrap olabilir.
- Workboard 2 kolon veya dar genişlikte 1 kolon.

### 360-768px

- Page padding 16px.
- Greeting 20px.
- Signature panel tek kolon; status cümlesi + 2x2 KPI, ikincil KPI disclosure olabilir.
- Quick actions compact wrap veya horizontal scroll. Kartlaşmaz.
- Continue learning ilk gerçek içerik.
- Tasks, receipt, news sırasıyla tek kolon.
- Touch target en az 44px.
- Bottom tab ve Mentor launcher içerikle çakışmaz.
- Tarih Header'da kısaltılabilir veya gizlenebilir; Dashboard içine geri eklenmez.

## 23. Semantic color law

### Brand

Yalnız primary CTA, active navigation, focus, link, selected state ve progress.

### Success green

Yalnız tamamlanmış, başarılı veya pozitif doğrulanmış durum. Dekoratif ikon zemini, genel KPI, navigation veya action kartı rengi olarak kullanılmaz.

### Warning amber

Yalnız gecikme yaklaşımı, dikkat veya orta risk. Section eyebrow veya premium süs rengi değildir.

### Error / danger red

Yalnız hata, yüksek risk, gecikmiş kritik kayıt veya yıkıcı işlem.

### Neutral

Default durum, low priority, normal metadata ve bilgi ayrımı. Renk yokluğu değil; bilinçli sakinlik.

Her semantic durum en az iki kanalla anlatılır: renk + text, renk + icon veya renk + pattern. Renk tek başına anlam taşımaz.

## 24. Durum tasarımları

- **Loading:** final layout biçimini taklit eden statik tonal skeleton; hızlı shimmer zorunlu değil.
- **Error:** compact inline panel, net hata mesajı ve secondary `Tekrar Dene`.
- **No workspace:** signature panel içinde kısa yönlendirme + `İşletmeyi Kur` secondary.
- **No resume:** Continue Learning alanı tamamen kaybolabilir; grid boşluk bırakmaz.
- **No tasks:** `Bugün için açık görev yok` + quiet `Görev ekle` ancak route ve işlev varsa.
- **No decision:** receipt alanı görünmez; sahte veri veya onboarding card eklenmez.
- **Long text:** 2 satır clamp, title tooltip yalnız gerektiğinde.

## 25. Do listesi

- Light-first, mineral cool gray canvas kullan.
- Sidebar'ı açık tinted brand surface yap.
- Bir adet compact signature panel kullan.
- İlk viewportta gerçek içerik göster.
- Karar Ver'i tek primary CTA yap.
- Tasks ve News'i kart yerine taranabilir listeler olarak ele al.
- Continue Learning'e günlük işe dönüşen görünür öncelik ver.
- Decision Receipt'i ayrı artefakt olarak tasarla.
- Yüzeyleri tonla ayır, border ve shadow'u destekleyici kullan.
- Typography ve contrast ile hiyerarşi kur.
- Türkçe gerçekçi örnek içerik kullan.
- Desktop varyantlar arasında kompozisyon farkı üret, IA farkı değil.

## 26. Don't listesi

- Pure white full-page background kullanma.
- Saturated blue/cyan dark mode tasarlama.
- Green'i dekoratif kullanma.
- Üç eşit feature/action card yapma.
- Her bölümü card içine alma.
- Her card için aynı icon-title-description-button anatomisini tekrarlama.
- Tam genişlik primary CTA'ları çoğaltma.
- Generic admin template, stock dashboard veya fintech neon estetiği kullanma.
- Glassmorphism'i content card'larda kullanma.
- Sürekli sweep, glow, bevel ve 3D button efekti kullanma.
- 11px altı görünür text kullanma.
- Büyük boşluklarla compact görünümü bozma.
- Küçük yazı ve düşük kontrastla “compact” üretme.
- Light ve dark mode'u aynı karede göstermeye çalışma.
- Kod, component spec veya implementation annotation üretme.

## 27. Mockup kabul kriterleri

Bir varyant ancak aşağıdakilerin hepsini sağlıyorsa değerlendirilebilir:

- Mevcut shell ve IA tanınabilir biçimde korunmuş.
- Light mode.
- Sidebar tinted ve readable.
- Tek signature panel.
- Üç büyük aksiyon kartı yok.
- Tek solid primary CTA.
- First viewportta continue learning + görevler görünür.
- En az üç farklı içerik anatomisi var: panel, list, receipt/action rail.
- Green yalnız semantic.
- Pure white full page yok.
- Generic admin template hissi yok.
- Body text ve controls güçlü kontrastlı.
- 1440x900 desktop frame high-fidelity.

## 28. Onay sonrası uygulama sırası

1. Üç Stitch varyantından bir görsel yön seçilir.
2. Seçilen yön Figma'da tek bir high-fidelity Dashboard olarak sıkılaştırılır.
3. Impeccable critique seçilen mockup üzerinde yapılır.
4. Kullanıcı son görsel onayı verir.
5. Onaylı tasarımdan token kararları çıkarılır ve mevcut `DESIGN.md` drift'i ayrı bir görevde uzlaştırılır.
6. Yalnız sonrasında Dashboard implementasyonu planlanır.
7. Motion ihtiyacı gerçek etkileşim üzerinden ayrıca değerlendirilir; bu spec motion runtime gerektirmez.
