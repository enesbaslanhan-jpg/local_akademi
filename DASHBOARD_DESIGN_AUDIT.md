# LocalKarar Dashboard Design Audit

**Kapsam:** Yalnız Dashboard, AppLayout, Sidebar, Header ve bu yüzeylerin kullandığı ortak UI / tema dosyaları  
**Tarih:** 12 Ağustos 2026  
**Durum:** Tasarım denetimi, uygulama kodu değişikliği yok

## Tasarım okuması

Bu yüzeyi, küçük işletme sahipleri için karar desteği ile öğrenmeyi aynı günlük çalışma akışında birleştiren bir **operasyon Dashboard'u** olarak okuyorum. Hedef dil sakin, güvenilir, yoğun ama rahat taranabilir ve LocalKarar'a özgü olmalı. Mod: **Operate**.

- `DESIGN_VARIANCE: 4` - kontrollü asimetri ve belirgin öncelik, deneysel kompozisyon değil.
- `MOTION_INTENSITY: 2` - bu aşamada motion implementasyonu yok; yalnız durum geri bildirimi ve hızlı geçiş ilkesi korunur.
- `VISUAL_DENSITY: 7` - gerçek günlük içerik ilk viewportta görünür, fakat küçük yazı veya sıkışık kontrol kullanılmaz.
- Redesign modu: **Preserve IA, replace visual hierarchy**. Route, veri kaynağı, işlev, Türkçe içerik ve ana bilgi mimarisi korunur; görsel ağırlık ve yüzey anatomisi yeniden kurulur.

## İncelenen kaynaklar

- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Dashboard.module.css`
- `frontend/src/components/layout/AppLayout.jsx` ve `.module.css`
- `frontend/src/components/layout/Sidebar.jsx` ve `.module.css`
- `frontend/src/components/layout/Header.jsx` ve `.module.css`
- `frontend/src/components/ui/Card`, `Button`, `DarkPanel`
- `frontend/src/styles/tokens.css`, `theme-modes.css`, `buttons.css`
- Repo kökündeki `DESIGN.md`
- İlgili FAZ raporları, özellikle `FAZ3_SHELL_RAPORU.md`, `FAZ4_DARK_LIGHT_TUTARLILIK_RAPORU.md`, `FAZ5A_RAPORU.md` ve `FAZ7_RAPORU.md`

Impeccable statik dedektörü `Dashboard.jsx` üzerinde çalıştırıldı ve otomatik kural bulgusu üretmedi. Bu, görsel hiyerarşi ve ürün karakteri sorunlarının olmadığı anlamına gelmez; dedektör daha çok mekanik anti-pattern işaretlerini yakalar. Bu rapordaki ana bulgular kaynak, token ve bileşen anatomisinin birlikte okunmasına dayanır.

## Mevcut güçlü yönler

1. **Bilgi mimarisi gerçek işlere dayanıyor.** İşletme durumu, hızlı aksiyonlar, devam edilen kurs, görevler, haberler, topluluk, son karar sonucu ve aktiviteler gerçek veri kaynaklarına bağlı. Uydurma KPI veya dekoratif istatistik eklenmemiş.
2. **Boş, yükleniyor ve hata durumları düşünülmüş.** Dashboard skeleton, yeniden dene aksiyonu, işletme profili boş durumu ve liste boş durumları içeriyor.
3. **Ana shell işlevsel.** Sidebar daraltma durumu saklanıyor, mobil drawer ve bottom tab davranışı var, Header sticky, içerik genişliği sınırlandırılmış.
4. **Klavye erişimi için iyi başlangıçlar var.** Kart ve haber satırlarında keyboard activation, `aria-current`, `aria-label`, görünür focus yaklaşımı ve reduced-motion kuralları bulunuyor.
5. **Semantic veri mantığı özenli.** Karar fişi manşeti gerçek `decisionLabel` ve `decisionTone` alanlarından geliyor; KPI ve görev öncelikleri gerçek backend alanlarına dayanıyor.
6. **Saf beyaz veya saf siyah tam sayfa zemini kullanılmıyor.** Surface katmanları için temel altyapı mevcut.

## Görsel sorunlar

### P1 - Birincil iş görünmüyor, bileşen kataloğu görünümü oluşuyor

Sayfa sırası şu anda karşılama, koyu işletme paneli, üç büyük aksiyon kartı, sonra gerçek günlük içerik şeklinde. Bu yüzden kullanıcı ilk viewportta devam edeceği kursu, görevlerini veya karar sonucunu geç görüyor. Dashboard bir iş masası yerine bileşen vitrini gibi açılıyor.

**Etkisi:** Kullanıcı “bugün ne yapmalıyım?” sorusuna hızlı yanıt alamıyor. Karar desteği ve öğrenme sürekliliği, genel amaçlı CTA'ların gerisinde kalıyor.

### P1 - Üç eşit aksiyon kartı bütün hiyerarşiyi düzlüyor

`Karar Ver`, `Hesapla` ve `Mentor'a Sor` aynı kart anatomisine, aynı ikon boyutuna, aynı açıklama uzunluğuna ve tam genişlik butona sahip. Yalnız renk farkı ile öncelik kurulmaya çalışılıyor.

**Etkisi:** Üç iş eşit önemdeymiş gibi okunuyor. “Karar Ver” gerçekten birincil ise kompozisyon bunu boyut, konum ve CTA seviyesiyle anlatmıyor.

### P1 - Card-everything ve aynı anatomi

Hızlı aksiyonlar, devam kartı, görevler, haberler, topluluk, aktiviteler ve karar sonucu ayrı ayrı kutulara giriyor. Bölüm başlığı + kart + satır tekrarları sayfayı modüler ama karakterden yoksun yapıyor.

**Etkisi:** İçerik türleri arasındaki anlam farkı kayboluyor. Görev listesi, haber akışı ve öğrenme devamı birbirinin temalı kopyaları gibi görünüyor.

### P1 - Token ve sözleşme drift'i

Repo kökündeki `DESIGN.md`, marka merkezini `brand-500 #306D88`, kart radiusunu 12px ve dark primary CTA'yı solid brand dolgu olarak tanımlıyor. Mevcut kaynaklarda ise:

- `tokens.css` marka rampası `#2C5961` merkezli,
- `theme-modes.css` light primary `#266E7A`, dark primary `#5CBCC8`,
- `Button.module.css` primary için güçlü 3D gölge ve gradient,
- `buttons.css` koyu modda primary ve CTA'yı tonal saydam yüzeye çeviriyor,
- `Dashboard.module.css` tekrar 1200/1240px ve geniş ekran yoğunluk override'ları kullanıyor,
- `FAZ5A_RAPORU.md` bu override'ların ve büyük aksiyon kartı ölçülerinin kaldırıldığını söylüyor.

**Etkisi:** Tasarımın gerçek kaynağı belirsiz. Mockup onaylansa bile uygulamada hangi token setine bağlanacağı net olmazsa tekrar görsel sapma oluşur.

### P2 - Dokunsal efektler üründen daha görünür

Primary butonlarda kalın gölge, 5px basılma, hover lift ve 600ms ışık şeridi bulunuyor. DarkPanel'de 5 saniyede bir döngüsel sweep var. Bu efektler günlük operasyon arayüzü için gereğinden fazla “fiziksel demo” hissi yaratıyor.

**Etkisi:** Güvenilir ve sakin karar desteği yerine oyuncak benzeri, efekt odaklı bir his oluşuyor. Kritik sayılarla etkileşim rekabet ediyor.

## Light mode sorunları

1. **Washed-out katmanlar:** Canvas `#EDF0F2`, panel `#F4F6F8`, card `#FBFCFD` doğru bir başlangıç olsa da her içerik kart olduğunda yüzey farkları birbirini nötrlüyor. Sonuç, soluk gri-beyaz kutular dizisi.
2. **Koyu ve doygun sidebar aşırı ağırlık taşıyor:** Light mode sidebar `#245F68`. İçerik alanı açık ve düşük doygunluklu iken sidebar ayrı bir ürün kabuğu gibi baskınlaşıyor.
3. **Beyaz küçük yüzey fazlalığı:** Tarih chip'i, tüm kartlar ve butonların çoğu ayrı yüzey oluşturuyor. Pure white full page yok, ancak birçok küçük beyaz yüzey toplamda aynı washed-out algıyı üretiyor.
4. **Gold dekoratif role kayıyor:** İşletme paneli eyebrow'u ve active/recommended çizgileri gold kullanıyor. Gold ürün semantiği taşımadığı halde ikinci vurgu rengi gibi davranıyor.
5. **Semantic roller marka rolleriyle karışıyor:** `success` teale bağlanmış, `brand-olive` yine teal karşılığına dönüşmüş. Böylece olumlu durum, marka vurgusu ve tamamlanmış görev aynı hue ailesine yığılıyor.

## Dark mode sorunları

1. **Fazla mavi-teal ışık:** Dark primary `#5CBCC8`, hover `#74CDD8`, selected çizgi `#50B8C5` ve çeşitli on-dark değerler aynı anda kullanılıyor. Arka plan grafit olsa da vurgu sistemi ekranı mavi-cyan karaktere çekiyor.
2. **Primary CTA hiyerarşisi çöküyor:** `buttons.css`, dark mode primary ve CTA'yı saydam tonal yüzeye dönüştürüyor. Bu, `DESIGN.md` içindeki solid primary kuralıyla doğrudan çelişiyor ve ana aksiyonu ikincil kontrol gibi gösteriyor.
3. **İmza paneli anlamını kaybediyor:** Light mode'da koyu signature panel belirgin. Dark mode'da `DarkPanel` sıradan yükseltilmiş yüzeye dönüşüyor; yine sweep, üst çizgi ve panel anatomisi taşıdığı için hem fazla efektli hem de yeterince özel değil.
4. **Sidebar ile içerik arasındaki ton farkı sınırlı:** Sidebar `#171A1D`, canvas `#15181C`, kartlar `#1D2126`. Tonlar doğru ailede fakat kabuk, sayfa ve paneller birbirine çok yakın. Ayrım çoğu yerde kenarlık ve gölgeye kalıyor.
5. **Koyu modda çok sayıda açık teal metin:** Link, active, focus, progress, success ve dekoratif çizgiler aynı parlaklık bandında. Semantik tarama zorlaşıyor.

## Sidebar / Header sorunları

### Sidebar

- Sidebar işlevsel, fakat 256px genişlikte logo, İngilizce `Professional Community` alt başlığı, menü araması, bölüm başlıkları, “Önerilen” rozeti, alt menüler, hızlı aksiyon ve çıkış kontrolü ile aşırı katmanlı.
- İçerik yoğunluğu yüksek olmasına rağmen görsel karakter hâlâ yaygın admin template kalıbı: logo alanı, search input, uppercase grup label, ikon + label satırları, active bar.
- `Önerilen` bilgisi hem rozet hem sol çizgi ile çift kodlanıyor. Active ve recommended aynı `::before` işaretini paylaşınca “şu an buradayım” ile “bunu öneriyoruz” ayrımı zayıflıyor.
- Light sidebar koyu blok olduğu için Dashboard'daki tek imza paneliyle yarışıyor.
- Collapsed state yararlı, fakat 64px durumda navigasyon etiketleri kayboluyor ve tooltip davranışı kaynakta görünmüyor. Recognition yerine recall riski oluşuyor.

### Header

- 52px yüksekliği doğru ve kompakt.
- `Ana Sayfa` route başlığı ile Dashboard içindeki `Hoş geldin` başlığı birlikte çift başlangıç üretiyor.
- Tarih Header'da tam gün adıyla, Dashboard hero'da tekrar chip olarak gösteriliyor. Aynı bilgi iki kez yer kaplıyor.
- Header'ın cam efekti izinli alanda olsa da görsel değer üretmiyor; canvas üzerinde yarı saydam bir şerit olarak jenerik kalıyor.
- Bildirim ve profil kontrolleri işlevsel, fakat avatar 28px desktop hit area contract'ının altında kalıyor.

## Dashboard içerik hiyerarşisi

### Mevcut sıra

1. Karşılama ve tekrar eden tarih
2. Bugünkü İşletme Durumu koyu paneli
3. Üç eşit hızlı aksiyon kartı
4. Kaldığın Yerden Devam Et
5. Bugünkü Görevler
6. Güncel Haberler
7. Topluluktan
8. Son Karar Sonucu
9. Son Aktiviteler

### Önerilen önem sırası

1. **Bugünkü bağlam:** kısa karşılama + işletme adı, tekrar eden tarih yok.
2. **Tek signature panel:** Bugünkü İşletme Durumu ve 4-5 gerçek KPI.
3. **Kompakt hızlı aksiyon şeridi:** Karar Ver birincil, Hesapla ve Mentor'a Sor ikincil.
4. **Bugünkü çalışma alanı:** Kaldığın Yerden Devam Et + Bugünkü Görevler.
5. **Son karar sonucu:** karar fişi biçiminde, signature panel değil.
6. **Güncel Haberler ve Topluluktan:** daha sakin bir bilgi akışı.
7. **Son Aktiviteler:** düşük öncelikli özet, ilk viewport sonrası.

Bu sıra IA'yı değiştirmez. Aynı içerik blokları korunur; yalnız görsel öncelik ve yerleşim yeniden kurulur.

## Anti-pattern tespitleri

| Anti-pattern | Kanıt | Sonuç |
|---|---|---|
| Generic admin template | Koyu sidebar + search + grup label + üç eşit quick-action card | Ürün karakteri zayıf |
| Card-everything | Her bölümün ayrı Card/DarkPanel içine alınması | İçerik türleri aynılaşıyor |
| Three equal feature cards | `actionGrid repeat(3, 1fr)` | Birincil aksiyon belirsiz |
| Full-width CTA repetition | Üç aksiyon kartında `Button full` | Kart anatomisi ağırlaşıyor |
| Duplicate information | Header tarihi + Dashboard dateChip, Header pageTitle + heroTitle | İlk viewport israfı |
| Decorative semantic color | Gold eyebrow/active bar, teal success/brand aliasları | Renklerin anlamı zayıflıyor |
| Mixed visual contracts | DESIGN, token, theme ve global button override ayrışması | Uygulama tutarsızlığı |
| Motion as decoration | Perpetual signature sweep ve geniş hover ışıkları | Operasyon odağı dağılıyor |
| Compact via smaller type | 0.65-0.70rem label ve hint'ler | Okunabilirlik düşüyor |
| Density breakpoint fork | Geniş ekran için 20+ ayrı override | Aynı sayfada iki tasarım dili |

## Korunacak yapılar

- Tüm mevcut route ve ana navigation label'ları.
- Dashboard veri kaynakları ve koşullu görünürlük mantığı.
- Aktif işletme bağlamı.
- İşletme durumu KPI'ları: Alacaklar, Borçlar, Net Durum, Geciken, Açık Kayıt.
- Hızlı aksiyonların işlevleri ve yolları.
- Devam edilen kurs, görevler, haberler, topluluk, karar fişi ve aktiviteler.
- Loading, error ve empty state mantığı.
- Sidebar collapse, mobil drawer, mobile tab ve sticky Header davranışı.
- Klavye aktivasyonu, `aria-current`, focus-visible ve reduced-motion kazanımları.
- LocalKarar'ın araştırılarak seçilmiş `brand` ailesi. Mockup için otorite `DESIGN.md` içindeki `#306D88` merkezli palet olmalı.

## Kaldırılacak / yeniden tasarlanacak öğeler

### Kaldırılacak

- Dashboard hero içindeki tekrar eden tarih chip'i.
- Üç eşit hızlı aksiyon kartı anatomisi.
- Hızlı aksiyonlardaki üç tam genişlik buton.
- Normal kartlardaki sweep efekti.
- Signature paneldeki sürekli otomatik sweep.
- Dekoratif gold eyebrow ve recommended çizgi tekrarları.
- Geniş ekran için ayrı yoğunluk dili üreten media override bloğu.
- Kullanılmayan Dashboard CSS blokları implementasyon fazında ayrıca temizlenmeli; bu audit görevinde kod değişikliği yapılmadı.

### Yeniden tasarlanacak

- Sidebar light tonu, active/recommended ayrımı ve marka alanı.
- Header ile Dashboard başlangıcının tek hiyerarşiye dönüşmesi.
- Hızlı aksiyonlar: kart yerine kompakt action rail.
- Continue Learning: ilk gerçek işe dönüşen belirgin ama hafif yüzey.
- Tasks ve News: outer-card yerine section group + satır sistemi.
- Decision Receipt: koyu kart yerine receipt/ledger karakterli sonuç artefaktı.
- Dark mode: cyan ağırlığı azaltılmış charcoal yüzey sistemi.
- Button hierarchy: bir solid primary, sonra secondary/ghost; tonal primary yok.

## Accessibility / contrast riskleri

Kaynak token değerleri üzerinden yapılan örnek kontrast ölçümleri:

| Kombinasyon | Yaklaşık oran | Risk |
|---|---:|---|
| Light primary `#266E7A` üstü beyaz | 5.84:1 | AA geçer |
| Light muted `#3F484A` / card `#FBFCFD` | 9.14:1 | Güçlü |
| Light sidebar dim `#ABEEFC` / `#245F68` | 5.62:1 | AA geçer |
| Dark sidebar dim `#8E9AA2` / `#171A1D` | 6.07:1 | AA geçer |
| Dark status hint `#8E9AA2` / `#2B323C` | 4.49:1 | 0.66rem metin için sınırın hemen altında |
| Light gold `#B8923F` / status `#24343A` | 4.44:1 | Küçük uppercase metin için AA altında |
| Light success `#217A85` / `#E1EFF1` | 4.26:1 | Küçük badge metni için AA altında |
| Light warning `#977535` / `#F6ECCC` | 3.62:1 | Küçük badge metni için belirgin AA riski |

Ek riskler:

- Çok sayıda yardımcı label 0.65-0.70rem. `DESIGN.md` minimum caption 11px ve body-sm 13px sözleşmesiyle sınırda veya altında.
- Sidebar collapsed state'te label yok; tooltip veya erişilebilir görünür açıklama gereklidir.
- Header avatar 28x28px, mobil değilse bile motor erişilebilirlik açısından dar.
- Haber satırı `role="button"` ile çalışıyor; gerçek `<button>` veya link semantiği daha güvenli olur. Bu implementasyon notudur, bu görevde değiştirilmedi.
- Tamamlanmış görevde opacity 0.6 bütün satıra uygulanıyor; metin kontrastı gereksiz düşebilir.
- Renk tek başına anlam taşımamalı. Öncelik, karar sonucu ve başarı durumunda metin/ikon etiketi korunmalı.

## Skill ve LocalKarar kuralı çatışmaları

- `design-taste-frontend` Dashboard ve dense product UI'ı kendi kapsamı dışında sayıyor. Bu nedenle landing-page hero, görsel asset ve deneysel layout kuralları uygulanmadı. Yalnız audit-first, anti-template, card restraint, renk disiplini ve tasarım drift'i ilkeleri alındı.
- Impeccable'ın “go bold” yönü, Operate modunda taranabilirlik ve ürün gerçeğinin önüne geçirilmedi.
- Skill'lerin genel “tek accent” yaklaşımı, LocalKarar'ın brand + semantic color ihtiyacıyla sınırlandı. Brand birincil vurgu olarak kalır; success/warning/error yalnız semantik durumlarda kullanılır.
- `DESIGN.md` mevcut kodla çeliştiğinde ürün hedefi, kullanıcı geri bildirimi ve repo kökündeki LocalKarar sözleşmesi üstün tutuldu. Bu belgeler uygulama kodunu değiştirmez; onaylanan mockup sonrasında token drift'i ayrı implementasyon işi olmalıdır.

## Denetim sonucu

Mevcut Dashboard işlevsel ve veri açısından güçlü, fakat görsel sistem gerçek iş önceliklerini yeterince taşımıyor. En büyük fırsat yeni bileşen eklemek değil; aynı içeriği tek signature panel, kompakt action rail, iki kolonlu günlük çalışma alanı ve daha sakin bilgi akışı ile yeniden hiyerarşileştirmek. Böylece `Unified != identical`, `Compact != flat`, `Tokenized != colorless` ilkeleri ürün gerçekliğine bağlanabilir.
