# F2 — Hakkında / Tanıtım Sayfası

Tarih: 20.08.2026

**Tam takım: arka uç 102/102 dosya · 1465/1465 test — ön yüz 31/31
dosya · 235/235 test. Derleme temiz.**

---

## 1. Kök yol değişti

Önceden giriş yapmamış ziyaretçi `/` adresinden **doğrudan giriş
formuna** düşürülüyordu. Ürünün ne olduğunu anlatan hiçbir sayfa yoktu;
ilk karşılaşma bir parola alanıydı.

Artık:

- Giriş **yapmış** kullanıcı → `/app/dashboard` (değişmedi)
- Giriş **yapmamış** ziyaretçi → tanıtım sayfası

Sayfa ayrıca `/hakkinda` adresinden de açılıyor. Giriş ekranının alt
şeridine "Hakkında" bağlantısı eklendi — yer imiyle doğrudan `/login`'e
gelen ziyaretçinin ürünü görebileceği tek yol buydu.

## 2. İçerik

Altı modül anlatılıyor: Karar Araçları, İşletme Takibi, AI Mentor,
Hesaplamalar, Kurslar, Topluluk. Her biri **ne yaptığıyla** anlatılıyor,
sloganla değil.

Ayrı bir **"Neyi yapmaz?"** bölümü var: LocalKarar bir muhasebe programı
değil ve profesyonel danışmanlığın yerine geçmiyor. Bu zaten Kullanım
Koşulları'nda yazılı; tanıtım sayfasında gizlemek tutarsız olurdu.
Testle korunuyor — sessizce silinmesin.

## 3. Görsel dil tek kaldı

Giriş ekranının paleti (`--auth-*`) `AuthPage.module.css` içinde,
`.page` sınıfının üzerinde tanımlıydı. Hakkında sayfası da aynı dili
kullanacağı için ya kopyalanacaktı ya paylaşılacaktı.

**Kopyalanmadı:** palet `styles/auth-surface.css` dosyasına çıkarıldı
(`:root` + `html.dark`), `main.jsx` içinde yükleniyor. İki yerde ayrı
tanımlansaydı zamanla ayrışır ve ürün iki farklı görsel dile bölünürdü.

Login'in bozulmadığı tarayıcıda doğrulandı: kart zemini, yazı rengi ve
degrade aynı değerleri veriyor.

---

## 4. 🔴 Yol üstünde: kayan sayfada degrade tuzağı

İlk sürümde degrade **bütün sayfayı** kaplıyordu (`background-attachment:
fixed`). Giriş ekranı tek ekrana sığdığı için orada sorun yok — ama bu
sayfa uzun ve kayıyor.

Sonuç: aşağı inen bölümler degradenin **açık ucunun** üstüne geliyordu ve
açık renkli başlıklar kayboluyordu.

**Ölçüldü:** açık modda "Kime göre?" başlığı `#F4FAFC`, arkası
`#E1E2E5` — yaklaşık **1.1:1** kontrast. Yani görünmüyordu.

Bu, login ekranında bir kez yaşadığım hatanın aynısı: metin rengini
zeminin ne olacağını varsayarak sabitlemek.

### Düzeltme

- Degrade yalnız **üst banda** (başlık + kahraman) alındı.
- Gerisi düz `--auth-page` zemininde; metinler `--auth-text` /
  `--auth-text-soft` kullanıyor, yani temayı izliyor.

### İkinci tur ölçüm

Kontrastı doğru ölçmek için degradenin **hesaplanması** gerekti:
`getComputedStyle(...).backgroundColor` degradeler için şeffaf döner, bu
yüzden ilk ölçüm betiğim bandın altındaki düz zemini okuyup **yanlış
alarm** veriyordu. Degradenin açısı ve durakları çözülüp her öğenin
konumundaki renk hesaplandı.

Kalan tek sorun: açık modda üst şeritteki "Giriş yap" bağlantısı
**3.59:1**. Rengi açmak 4.26'ya çıkardı, hâlâ yetersizdi — çünkü bandın
sağ üstü açık modda orta tondaydı ve hiçbir açık renk orada eşiği
geçmiyordu.

**Yapısal çözüm:** banda kendi degradesi verildi
(`--auth-gradient-band`). Bandın işi zaten "koyu yüzey + açık yazı"; açık
uca hiç gitmesine gerek yok. Aynı renk yolu, daha dar aralık.

**Sonuç: iki modda da 4.5:1 eşiğinin altında hiçbir metin kalmadı.**

---

## 5. Doğrulama

- Çıkış yapmış `/` → tanıtım sayfası açılıyor (giriş formuna
  zorlamıyor).
- Giriş yapmış `/` → `/app/dashboard`.
- `/hakkinda` doğrudan açılıyor.
- Kontrast: her başlık, paragraf ve bağlantı iki modda ölçüldü —
  4.5:1 altında hiçbiri yok.
- Dar ekran (375px): yatay taşma yok, tema düğmesi üst şeritle
  çakışmıyor, altı kart tek sütuna düşüyor.
- Login ekranı palet taşınmasından etkilenmedi.

`AboutPage.test.jsx` — 6 test. Giriş/kayıt bağlantılarının ve "Neyi
yapmaz?" bölümünün varlığı ayrıca korunuyor: ikisi de sessizce
kaybolabilecek şeyler.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `styles/auth-surface.css` | yeni — paylaşılan palet + `--auth-page`, `--auth-gradient-band` |
| `pages/AuthPage.module.css` | palet dışarı taşındı |
| `pages/AboutPage.jsx` + `.module.css` | yeni |
| `pages/AboutPage.test.jsx` | yeni — 6 test |
| `router/index.jsx` | `/hakkinda` + kök yol davranışı |
| `pages/AuthPage.jsx` | alt şeride "Hakkında" |
| `main.jsx` | palet yüklendi |

Commit/push yapılmadı.

---

## Yasal metinler hakkında not

Tanıtım sayfası `/privacy`, `/terms` ve `/cookies`'e bağlanıyor. O
metinler **şu an taslak**: jenerik yazılmışlar, veri sorumlusu kimliği
ve iletişim kanalı yok. Alan adı alındığına göre başvuru e-postası
(`kvkk@localkarar.com` gibi) artık kurulabilir — ama metinlerin kendisi
19. maddede ve avukat teyidi bekliyor.

---

## Ek — ürün sahibinin bildirdiği iki hata (20.08.2026)

### 1. 🔴 Çerez bildirimi kenar çubuğunun altında kalıyordu

Ekran görüntüsünde bildirimin sol yarısı kesik görünüyordu.

**Sebep:** depoda düzgün bir z-index ölçeği var (`tokens.css`:
`--z-sidebar: 100`, `--z-header: 110`, `--z-bottom-tab: 120`,
`--z-fab: 130`, `--z-drawer: 210`, `--z-modal: 400`, `--z-toast: 500`).
Ben bu ölçeği hiç kullanmayıp ham sayı yazmışım: `z-index: 60`. Yani
bildirim kenar çubuğunun (100) **altında** kalıyordu.

Aynı hatayı karşılama turunda da yapmışım: `z-index: 120`, yani
`--z-bottom-tab` ile aynı basamakta ve `--z-drawer` (210) altında.
Şans eseri görünüyordu.

**Düzeltme:** ikisi de ölçeğe bağlandı — bildirim `--z-toast`, tur
`--z-modal`.

**Doğrulandı:** bildirimin dört köşesinde de en üstteki eleman artık
kendisi; masaüstünde (1400px) tam 420px genişlikte, mentor düğmesiyle
çakışmıyor. Tur `z-index: 400` ile kenar çubuğunun üstünde.

### 2. Hakkında sayfasına uygulama içinden erişilemiyordu

Bağlantıyı yalnız giriş ekranının alt şeridine koymuştum. Giriş yapmış
kullanıcının onu görmesinin **hiçbir yolu yoktu**.

Ayrıca giriş ekranındaki bağlantı da 11px punto ve solgun renkte
(`#5D686C`), sağ alt köşede — ölçüldü, bulunması gerçekten zor.

**Düzeltme:**
- **Ayarlar → Veri ve gizlilik → "LocalKarar hakkında"** (mevcut yasal
  bağlantı listesinin başına eklendi).
- Giriş ekranındaki **marka satırı artık `/hakkinda`'ya bağlantı**.
  Logoya tıklayınca tanıtım sayfasına gitmek standart bir kalıp ve
  görsel kalabalık eklemiyor.

Her ikisi de tarayıcıda tıklanarak doğrulandı.
