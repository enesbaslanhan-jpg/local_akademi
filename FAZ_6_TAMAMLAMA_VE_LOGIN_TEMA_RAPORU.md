# Faz 6 Tamamlama + Login Koyu/Açık Mod

Tarih: 20.08.2026

Üç iş: e-posta doğrulama şeridi, çerez/depolama bildirimi, ve login
ekranının iki temada çalışması.

**Tam takım: arka uç 101/101 dosya · 1457/1457 test — ön yüz 29/29
dosya · 210/210 test. Derleme temiz.**

---

## 1. E-posta doğrulama şeridi

### Önce bir eksik: alan istemciye hiç ulaşmıyordu

Şerit yazılmadan önce ölçtüm: `/auth/me`, `/auth/login` ve
`/auth/register` yanıtlarının **hiçbiri** `emailVerified` döndürmüyordu.
Yani arayüzün kullanıcının doğrulanıp doğrulanmadığını bilmesinin bir
yolu yoktu. Şerit bu alan olmadan hiç çalışamazdı.

Üç yanıta da `emailVerified: !!user.emailVerifiedAt` eklendi.
`emailVerifiedAt`'in kendisi değil, türetilmiş boolean: tarih bilgisi
arayüzün işine yaramıyor ve gereksiz yere dışarı sızmasın.

### Şeridin davranışı

`components/layout/VerificationBanner.jsx` — `AppLayout` içinde,
içeriğin üstünde.

- **Yumuşak kapı**: kullanıcı doğrulamadan da uygulamayı kullanır.
- **Kapatma oturumluk**: `sessionStorage` kullanıldı, `localStorage`
  değil. Sekme kapanınca işaret gider, yani hatırlatma her yeni oturumda
  geri gelir. `localStorage` olsaydı bir kez kapatan bir daha hiç görmezdi.
- **"Doğrula" tek tıkta işe yarar**: kodu gönderir ve doğrulama ekranına
  götürür. Sunucu `alreadyVerified` derse yönlendirmez, oturumu günceller
  — kullanıcıyı boşuna dolaştırmaz.
- **Alan hiç gelmezse şerit çıkmaz** (`emailVerified !== false`).
  `undefined`'ı "doğrulanmamış" saymak, doğrulamış kullanıcıyı boşuna
  uyarmak olurdu.

### Yol üstünde çıkan hata

Doğrulama başarılı olunca `EmailVerifyPage` panoya dönüyordu ama
`AuthContext`'teki kullanıcıyı güncellemiyordu — şerit sayfa yenilenene
kadar ekranda kalırdı. `updateUser({ emailVerified: true })` eklendi;
tarayıcıda şeridin **anında** kaybolduğu görüldü.

### Testler

- `tests/email-verified-flag.test.ts` — 5 test, üç uç nokta ayrı ayrı.
  **Diş kontrolü:** alan kaldırılınca 5 testin 5'i de çöküyor.
- `VerificationBanner.test.jsx` — 9 test.
  **Diş kontrolü:** koşul `!== false` yerine `=== true` yapılınca tam
  olarak "alan gelmemişse uyarma" testi çöküyor.

---

## 2. Çerez/depolama bildirimi

### Ölçüm bildirimin ne olacağını değiştirdi

Bildirimi yazmadan önce uygulamanın gerçekte ne sakladığını taradım:

| Ne | Nerede | Niçin |
|---|---|---|
| `token` | localStorage | oturum — zorunlu |
| `localkarar-theme` | localStorage | kullanıcının tema tercihi |
| `localkarar-sidebar-collapsed` | localStorage | arayüz tercihi |
| `localkarar-verify-banner-dismissed` | sessionStorage | oturumluk |
| alıştırma / mentor durumları | localStorage | kullanıcının kendi girdileri |

**Çerez hiç yok** (sunucuda `Set-Cookie` yok, `@fastify/cookie` yok).
**Üçüncü taraf izleme hiç yok** (analytics, gtag, posthog, fb — hiçbiri).
Yazı tipleri de zaten kendi sunucumuzdan geliyor.

### Bu yüzden onay bandı DEĞİL, bilgilendirme

"Kabul et / Reddet" düğmesi koymadım: **reddedilebilecek isteğe bağlı
bir işleme yok.** Olmayan bir seçim sunmak kullanıcıyı yanıltır ve
onayın kendisini değersizleştirir. Saklanan her şey ya hizmet için
zorunlu ya kullanıcının kendi tercihi.

`components/ui/StorageNotice.jsx` — sol altta, `/cookies` sayfasına
bağlantılı, kalıcı olarak kapatılabilir. Uygulama kökünde duruyor, yani
giriş yapılmamış sayfalarda da görünüyor.

Bileşenin başında şu not var: **izleme eklendiği gün bu bildirim gerçek
bir onay bandına dönüşmeli.**

---

## 3. Login ekranı koyu/açık mod

### Neden tek mod vardı

Renkleri **ben** sabitlemiştim ve gerekçesi geçerliydi: kart her zaman
açıktı, uygulamanın `--text`'ini miras alınca koyu temada yazı beyaz
zeminde kayboluyordu ("YAZIYORUM AMA BEYAZ GÖZÜKMÜYOR"). Sabitleme o
hatayı kapattı ama koyu modu da beraberinde kapattı.

Doğru çözüm sabitlemeyi geri almak değil, ekrana **kendi iki paletini**
vermek.

### Yapılan

`AuthPage.module.css` içindeki ~30 sabit renk, `.page` üzerinde
tanımlanan `--auth-*` değişkenlerine çevrildi; koyu karşılıkları
`:global(.dark) .page` altında. Bu desen depoda zaten vardı
(`DecisionReceipt.module.css`), yeni bir yol açılmadı.

**Uygulamanın genel `--text`'ine bağlanmadı.** Miras yoluna dönülürse
aynı hata geri gelir.

Ayrıca:
- **Degradenin koyu varyantı.** Açık uç artık beyaza çıkmıyor
  (`#DBDEE0` → `#33708A`); koyu temada ekranın yarısının beyaza dönmesi
  tema tercihini anlamsız kılardı. Dar ekran degradesi de ayrıca.
- **Otomatik doldurma iki modda da.** `-webkit-autofill` kuralı beyaz
  zemini `!important` ile sabitliyordu; artık `--auth-autofill`
  (açık `#FFFFFF`, koyu `#12181C`). Bu değer **dolu renk olmak zorunda**
  — yarı saydam olursa tarayıcının kendi zemini altından sızar.
- **Marka işareti sabit kaldı.** `BrandMark` hiçbir renk tokenı
  kullanmıyor (yalnız bir yumuşatma eğrisi) — bir marka işareti tema
  tercihiyle dönmemeli. Yanındaki `.brandText` ise sayfa yazısı, o
  temayı izliyor.
- **Login'e tema düğmesi** (`AuthThemeToggle.jsx`). Değiştirici `Header`
  ve `SettingsPage`'de, ikisi de girişin arkasındaydı; giriş yapmamış
  ziyaretçinin modu değiştirme yolu yoktu.
- **Yalan söyleyen iki yorum güncellendi** — "kart temayı takip etmiyor"
  diyorlardı, artık ediyor.

### Tarayıcı doğrulaması

`/login` ve `/forgot-password`, iki modda da ölçüldü: degrade, kart
zemini, yazı rengi, alan yazısı, gönder düğmesi, etiket, yasal
bağlantılar. Hepsi doğru palete düşüyor.

**Ölçüm tuzağı:** tarayıcı paneli görünmediği için sayfa kare üretmiyor
ve **CSS geçişleri ilerlemiyor**. `getComputedStyle`, geçişli
özelliklerde donmuş eski değeri döndürüyor. Bu yüzden düğme rengini iki
kez yanlış teşhis ettim (önce "bayat HMR", sonra "tema hatası"). Geçişleri
kapatınca değerler doğru okundu. Geçişsiz elemanlar (kart, şerit)
baştan doğru okunuyordu.

---

## 4. Yol üstünde: `PROFESSİONAL COMMUNİTY`

Giriş ekranında İngilizce marka alt yazısı `PROFESSİONAL COMMUNİTY`
olarak çıkıyordu — İngilizce kelimelerde Türkçe noktalı İ.

Sebep kaynakta değil: metin doğru yazılmış (`Professional Community`),
ama `text-transform: uppercase` `html lang="tr"` altında Türkçe büyütme
kuralını uyguluyor ve `i` → `İ` oluyor.

Düzeltme: o `<small>` öğesine `lang="en"`. Üç dosyada (AuthPage,
PasswordResetPage, Sidebar). Tarayıcıda `PROFESSIONAL COMMUNITY`
olarak doğrulandı.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/services/auth.ts` | 3 yanıta `emailVerified` |
| `components/layout/VerificationBanner.jsx` + `.module.css` | yeni — doğrulama şeridi |
| `components/layout/AppLayout.jsx` | şerit bağlandı |
| `components/ui/StorageNotice.jsx` + `.module.css` | yeni — depolama bildirimi |
| `main.jsx` | bildirim bağlandı |
| `pages/AuthPage.module.css` | `--auth-*` paleti + koyu mod |
| `pages/AuthThemeToggle.jsx` | yeni — login tema düğmesi |
| `pages/AuthPage.jsx`, `pages/PasswordResetPage.jsx` | düğme + `lang="en"` + `updateUser` |
| `components/layout/Sidebar.jsx` | `lang="en"` |
| `tests/email-verified-flag.test.ts` | yeni — 5 test |
| `.../VerificationBanner.test.jsx` | yeni — 9 test |

Commit/push yapılmadı.

---

## Bu turda düzeltilen kendi hatam

Planda "Faz 3 hiç başlanmadı" yazmıştım. Yanlış: `backup:database`,
`backup:restore:verify` ve `logs:rotate` betikleri zaten var. Faz 3'e
gelince neyin çalıştığı ölçülecek.
