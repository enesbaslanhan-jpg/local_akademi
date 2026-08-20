# F1 — Karşılama Turu (+ sessizce kırık yedi uç nokta)

Tarih: 20.08.2026

Planlanan iş karşılama turuydu. Turu yazarken, arayüzden **hiç
çalışmayan yedi uç nokta** ortaya çıktı — asıl önemli bulgu o.

**Tam takım: arka uç 102/102 dosya · 1465/1465 test — ön yüz 30/30
dosya · 229/229 test. Derleme temiz.**

---

## 1. 🔴 Gövdesiz istekler rotaya hiç varmıyordu

### Belirti

`api.onboarding.reset()` çağrılınca hiçbir şey olmuyordu. Ölçtüm:

```
POST /onboarding/reset  (gövdesiz)      -> 400
POST /onboarding/reset  (gövde: {})     -> 200
```

Yanıt: `Body cannot be empty when content-type is set to 'application/json'`.

### Sebep

`api.js` içindeki `getHeaders` **her** isteğe `Content-Type:
application/json` koyuyordu. Gövdesiz bir POST/PATCH/DELETE'te bu,
Fastify'ın JSON ayrıştırıcısını tetikliyor ve istek **daha rotaya
varmadan** reddediliyor.

Hata sessiz: arayüz "İşlem başarısız" diyor, rota hiç çalışmadığı için
sunucu tarafında da iz kalmıyor.

### Etkilenenler — ölçüldü, tahmin değil

| Uç nokta | Kullanıcıya karşılığı |
|---|---|
| `PATCH /conversations/:id/archive` | Sohbeti arşivle |
| `PATCH /conversations/:id/unarchive` | Arşivden çıkar |
| `POST /memory/:id/dispute` | Mentor hafızasına itiraz et |
| `POST /memory/:id/confirm` | Hafıza kaydını doğrula |
| `POST /assessment/restart` | Değerlendirmeyi yeniden başlat |
| `POST /onboarding/reset` | Anketi sıfırla |
| `POST /workspaces/sync-legacy-profile` | Eski profili eşitle |

Gövdesiz `DELETE` de aynı şekilde etkileniyordu (`DELETE /auth/avatar`
gövdesiz 400, `Content-Type` başlığı olmadan 204).

### Kendi payım

Bunu daha önce **bir kez** görmüş ve `logoutAll` çağrısında
`JSON.stringify({})` göndererek yamamıştım — üstüne de sebebi anlatan
bir yorum yazmıştım. Ama kök sebebi bıraktığım için diğer dokuz çağrı
kırık kaldı. Tek çağrı yerini düzeltip devam etmek yeterli değilmiş.

### Düzeltme

Merkezî, tek yerde: **gövde yoksa `Content-Type` da gönderilmiyor.**
Bu, gövdesiz bir istekte zaten doğru olan davranış — olmayan bir
gövdenin türünü bildirmenin anlamı yok.

`logoutAll`'daki yama kaldırıldı; artık gereksiz.

**Test:** `api.request.test.jsx` içine 6 test. **Diş kontrolü:**
düzeltme kaldırılınca 4 test çöküyor.

---

## 2. Karşılama turu

### Bayrak neden ayrı

`tourCompletedAt` **`UserPreference`** üzerinde — planda
`User.tourCompletedAt` yazmıştım, ama kardeş bayrak
(`onboardingCompleted`) orada olduğu için yanına konuldu.

Anketten ayrı tutulmasının sebebi: `onboardingCompleted` profil
anketini işaretliyor, turu değil. Aynı alana bağlansaydı anketi
sıfırlayan kullanıcı turu göremez, ya da tersi olurdu.

`Boolean` değil `DateTime?`: "bitirdi mi" ve "ne zaman" sorularının
ikisine birden cevap verir.

Migration: `20260820140000_add_tour_completed`.

### Uç noktalar

- `GET /onboarding/status` → `tourCompleted` alanı eklendi
- `POST /onboarding/tour/complete`
- `POST /onboarding/tour/reset`

Anketin `complete`/`reset` uçlarından **ayrı** — bilerek.

### Arayüz — ilk sürüm yanlıştı

İlk yazdığım tur yalnız **kenar çubuğundaki menü maddelerini** işaret
ediyordu: ana sayfadan hiç çıkmadan "Karar Araçları burada" diyordu.
Ürün sahibi haklı olarak itiraz etti — bu bir **menü turu**, ürün turu
değil. Kullanıcı hiçbir şeyin nasıl çalıştığını görmüyordu.

Yeniden yazıldı: her adım artık **o sayfaya gidiyor**, sayfanın gerçek
öğesini işaret ediyor ve orada ne yapıldığını anlatıyor.

| # | Gidilen yol | İşaret edilen | Anlatılan |
|---|---|---|---|
| 1 | `/app/dashboard` | bugünkü durum paneli | rakamların nereden geldiği |
| 2 | `/app/decision-checks` | araç listesi | soruların adım adım yürütülmesi |
| 3 | `/app/workspaces` | başlık bloğu | fatura okuma + onaysız kayıt yazılmaması |
| 4 | `/app/mentor` | soru yazma alanı | neye bakarak cevap verdiği |
| 5 | `/app/community/topluluk` | sayfa başlığı | moderasyon |

Tur bitince kullanıcı Topluluk sayfasında bırakılmıyor, başladığı yere
(`/app/dashboard`) dönüyor.

**Çapayı beklemek gerekti.** Sayfalar lazy yükleniyor ve verilerini
sonradan çekiyor; çapa gezinmenin hemen ardından DOM'da olmuyor. Tek
seferlik ölçüm yapılsaydı balon her adımda ortada kalırdı. Şimdi çapa
en fazla 2,5 saniye aranıyor, bulunamazsa konumdan vazgeçilip
ortalanıyor.

**Balon konumu da esnedi:** sabit "hedefin sağına koy" kuralı, sağ
kenara yakın hedeflerde balonu ekran dışına taşıyordu. Sağa sığmazsa
sola, o da sığmazsa altına yerleşiyor.

- **Yalnız anket bittikten sonra** açılır; yoksa iki karşılama üst üste
  binerdi.
- **Durum okunamazsa açılmaz** — emin olmadan karşılama ekranı açmak,
  turu bitirmiş kullanıcıya tekrar göstermek demektir.
- Her adımda atlanabilir; `Esc` ve ok tuşları çalışır.
- **Sunucuya yazmak başarısız olsa da tur kapanır.** Kullanıcıyı ağ
  hatası yüzünden karşılama ekranında tutmak kabul edilemez; en kötü
  ihtimalle bir sonraki oturumda tekrar açılır.

### Tutunma noktaları ve bir tuzak

Menü maddelerine `data-tour` niteliği eklendi (`Sidebar.jsx`). CSS
Modules sınıf adlarını hashlediği için onlara göre arama yapılamazdı.

**Tuzak:** ilk sürüm hedefi "genişliği sıfırdan büyük mü" diye
kontrol ediyordu. Kenar çubuğu **1023px**'te çekmeceye dönüp ekran
dışına kayıyor ama menü maddesi DOM'da kalıyor ve ölçülebilir bir
genişliği oluyor (`left: -222`). Benim CSS geçersiz kılmam ise
**900px**'teydi — yani 901–1023px arasında balon ekranın dışına
konumlanırdı.

Kırılma noktalarını eşitlemek kırılgan olurdu; onun yerine JS artık
hedefin **gerçekten görünüm alanı içinde** olduğunu ölçüyor. Değilse
balon ortalanıyor: hiçbir şeye tutunmayan bir işaret çizmektense
konumdan vazgeçmek daha dürüst.

### Ayarlar'dan yeniden başlatma

Erişilebilirlik sekmesine "Karşılama turu" bölümü eklendi. Bölüm
görünürlük kuralları dışlama listesiyle çalıştığı için yeni bölümün
diğer sekmelerde görünmemesi ayrıca ayarlandı.

---

## Doğrulama

Tarayıcıda uçtan uca:

- Beş adım tek tek gezildi. Her adımda **URL doğru sayfaya değişti** ve
  ışık halkası o sayfanın **doğru çapasının** üstüne oturdu
  (`dash-durum` → `karar-kartlari` → `isletme-baslik` →
  `mentor-girdi` → `topluluk-baslik`). Balon her adımda tamamen ekran
  içinde. Tur bitince `/app/dashboard`'a dönüldü.
- **Yol üstünde iki yanlış çapa:** önce `data-tour`'u
  `DecisionToolsPage`'e koymuştum — oysa `/app/decision-checks`
  rotasını `DecisionCheckList` çiziyor (`DecisionToolsPage` ayrı bir
  rotada). Taşıdıktan sonra da tutunmadı: seçtiğim
  `.decision-hero-wrap` **CSS ile gizli** (eski düzenden kalma), yani
  ölçülebilir bir kutusu yok. Üçüncü denemede gerçek araç listesine
  (`.decision-list-content`) bağlandı ve tuttu. İkisini de tarayıcıda
  ölçerek buldum; turun geri düşüşü (balonu ortala) sayesinde ekranda
  bir şey kırılmıyordu — bu yüzden ölçmeseydim fark edilmezdi.
- "Başlayalım" sonrası tur kapandı, `tourCompleted: true` kalıcı oldu.
- Sayfa yeniden yüklendi → **tur çıkmadı**.
- Ayarlar'dan "Turu yeniden göster" → `tourCompleted: false`,
  `onboardingCompleted` **`true` kaldı** (ayrımın canlı kanıtı).
- Bu düğme aynı zamanda merkezî API düzeltmesinin canlı kanıtı:
  `resetTour()` gövdesiz bir POST, düzeltme öncesi 400 dönerdi.

**Dürüstlük notu:** doğrulama sırasında bir ara tur kendiliğinden
tamamlanmış göründü. Sonra hiç dokunmadan 2,2 saniye izledim, tur açık
kaldı ve durum değişmedi — yani kendiliğinden kapanmıyor; büyük
ihtimalle kendi ölçüm betiklerimden biri tetikledi. Neyin yaptığını
kesin saptayamadım, uydurmuyorum.

### Testler

- `tests/welcome-tour.test.ts` — 8 test. **Diş kontrolü:** tur anket
  bayrağına bağlanınca ayrımı koruyan 3 test çöküyor.
- `WelcomeTour.test.jsx` — 10 test. **Diş kontrolü:** anket koşulu
  kaldırılınca tam olarak onu doğrulayan test çöküyor.
- `api.request.test.jsx` — 6 yeni test (yukarıda).

Not: tur testleri kullanıcıyı `/auth/register` yerine doğrudan
veritabanında açıyor — kayıt ucunda saatte 5 istek sınırı var ve dosya
sekiz kullanıcı gerektiriyor. Depodaki mevcut desen bu.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` + migration | `UserPreference.tourCompletedAt` |
| `src/services/onboarding.ts` | `tourCompleted` + 2 uç nokta |
| `frontend/src/services/api.js` | **gövdesiz istek düzeltmesi** + tur metodları |
| `components/layout/WelcomeTour.jsx` + `.module.css` | yeni |
| `components/layout/AppLayout.jsx` | tur bağlandı |
| `components/layout/Sidebar.jsx` | `data-tour` tutunma noktaları |
| `pages/SettingsPage.jsx` + `.module.css` | turu yeniden göster bölümü |
| `tests/welcome-tour.test.ts` | yeni — 8 test |
| `.../WelcomeTour.test.jsx` | yeni — 10 test |
| `.../api.request.test.jsx` | 6 test eklendi |

Commit/push yapılmadı.
