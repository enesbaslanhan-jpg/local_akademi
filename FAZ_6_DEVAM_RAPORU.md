# Login Tasarımı + API 404 + Yasal Onay Kaydı

Tarih: 19.08.2026

Bu tur üç iş: onaylanan login tasarımının kodlanması, iki kez beni yanıltan
SPA yedeği tuzağının kapatılması, ve Faz 6'dan kalan yasal onay kaydı.

**Tam takım: 100/100 dosya, 1452/1452 test.**

---

## 1. Login ekranı ve logo

### Logo — kenar ışığı varyantı

Gövde opak, cam etkisi yalnız kenarda. Dört varyant denendi; tamamen yarı
saydam gövde açık zeminde kayboluyordu. Bu varyant hem açık hem koyu zeminde
aynı okunurlukta ve 16px favicon boyutunda ayakta kalıyor.

Renkler **sabit yazıldı**, tema değişkeninden gelmiyor: bir marka işareti
açık/koyu tema tercihiyle dönmemeli. Degrade id'leri `useId()` ile örnek
başına benzersiz — aynı sayfada kenar çubuğunda ve başlıkta iki logo
olabiliyor, sabit id çakışırdı.

### Animasyon — hover'da neden çalışmıyordu

Yükleme ve hover **aynı keyframe adını** kullanıyordu. Tarayıcı aynı
`animation-name`'i değişmemiş sayıp yeniden başlatmıyor: açılışta bir kez
oynuyor, sonra imleç ne yaparsa yapsın hiçbir şey olmuyordu.

Hover'a ayrı keyframe adı verildi (`needleSettleHover`). Ayrıca kenar
çubuğundaki logo artık `animated` — uygulamaya girildiğinde de oynuyor.

**Not:** canlı hover'ı doğrulayamadım; tarayıcı otomasyonunun sentetik
faresi gerçek CSS `:hover` üretmiyor. CSS bağlantısının doğruluğunu ölçtüm
(iki sınıf da uygulanmış, adlar farklı), hareketin kendisini senin teyit
etmen gerekiyor.

### Kompozisyon

Tek yüzey, çapraz geçiş. Ara duraklar sıklaştırıldı — önceki sürümde
50%→61% arasında ani bir açılma vardı ve ortada beyaza yakın bir bant
oluşuyordu. Sağ alttaki beyaz ışık havuzu da ortaya taşıp degradeyi
solduruyordu; sağa çekilip zayıflatıldı.

Ölçüler ekran genişliğiyle **ölçekleniyor**. 1280px'e göre sabit yazılmıştı;
1920 ekranda kart genişliğin %24'ünde kalıyor ve küçük duruyordu. Şimdi %28
(470 → 540px), başlık 56px, alanlar 52px.

### Yol üstünde çıkan iki şey

**Otomatik doldurma zemini.** Tarayıcı kayıtlı parolayı doldurunca alanın
üstüne kendi zeminini boyuyordu — ekranda gri kutu olarak görünüyordu.
`background: transparent` o katmanı geçmez; `-webkit-autofill` kuralıyla
yeniden boyandı.

**`PasswordResetPage`'i kırmıştım.** O sayfa `AuthPage.module.css`'ten
`brandBar`, `form`, `heading`, `intro` sınıflarını ödünç alıyordu; dosyayı
baştan yazınca stilsiz kaldı (düğme ve bağlantı üst üste biniyordu). Sayfa
yeni tasarımın diline geçirildi; `/reset-password` ve `/verify-email` de
kontrol edildi.

---

## 2. 🔴 SPA yedeği API rotalarında 200 dönüyordu

`setNotFoundHandler` bilinmeyen **her** yol için `index.html` gönderiyordu.
Sonuç: var olmayan bir API uç noktası hata gibi değil **başarı gibi**
görünüyordu — istemci 200 alıyor, gövdeyi JSON sanıp ayrıştıramıyor ya da
sessizce hiçbir şey yapmıyordu.

Bu tuzağa geliştirme sırasında **iki kez** yakalandım: bir kez rota hiç
eklenmemişti, bir kez de sunucu süreci bayattı. İkisinde de "istek 200
dönüyor ama veritabanında hiçbir şey olmuyor" görüntüsü vardı ve sebebi
bulmak zaman aldı.

Bilinen API ön ekleri (`/api`, `/auth`, `/admin`, `/courses`, … 24 ön ek)
artık dürüstçe 404 döner. SPA rotaları index.html almaya devam eder.

**Test tuzağı:** ilk yazdığım test diş geçirmiyordu — test ortamında SPA
yedeği zaten kapalı (`NODE_ENV === 'test'`), yani "404 döndü" demek hiçbir
şey kanıtlamıyordu. İki dalı ayıran şey yanıtın şekli: API dalı `path`
alanını da döndürüyor. Testler ona bakacak şekilde yeniden yazıldı; şimdi
düzeltme kaldırılınca 9 test çöküyor.

`tests/api-404.test.ts` — 15 test.

---

## 3. Yasal onay kaydı (Faz 6.4)

KVKK açısından önemli olan onayı **kanıtlayabilmek**: kim, ne zaman, metnin
hangi sürümünü kabul etti.

### Sürüm kaynağı

`src/config/legal-documents.ts` — her metnin `version` alanı (`YYYY-MM-DD`,
hem sıralanabilir hem yürürlük tarihini taşır). **Tek kaynak**: frontend de
sürümü API üzerinden buradan alır; iki yerde ayrı yazılsaydı kaydedilen onay
ile gösterilen metin zamanla ayrışırdı.

### Kayıtta zorunlu

`POST /auth/register` artık `acceptedLegal: true` istiyor. **Sunucuda
doğrulanıyor** — arayüzdeki kutu tek başına yeterli değil, uç nokta
doğrudan da çağrılabilir.

Kullanıcı ve onay kaydı **aynı işlemde** yazılıyor. Ayrı yazılsaydı ikinci
adım düştüğünde onaysız bir hesap kalırdı — ve onayın kanıtı yoksa onay
alınmamış sayılır.

### Sürüm artınca yeniden onay

- `GET /auth/legal-documents` — güncel metinler ve sürümleri (açık uç)
- `GET /auth/consents` — kullanıcının onayları + **eksik** olanlar
- `POST /auth/consents` — eksikleri kapatır, denetim kaydı bırakır

Eski onaylar **silinmiyor**: geçmiş kayıt kanıt değeri taşır.

### Arayüz

Kayıt formunda zorunlu kutu: *"Kullanım Koşulları'nı ve Aydınlatma
Metni'ni okudum, onaylıyorum."* Metinler yeni sekmede açılıyor. Onaysız
düğme kilitli (tarayıcıda doğrulandı).

`tests/legal-consent.test.ts` — 11 test. Diş kontrolü: onay şartı
kaldırılınca tam olarak onu doğrulayan 3 test çöküyor.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `components/ui/BrandMark.jsx` + `.module.css` | kenar ışığı logo, hover animasyonu |
| `pages/AuthPage.jsx` + `.module.css` | yeni kompozisyon, onay kutusu, autofill |
| `pages/PasswordResetPage.jsx` | yeni tasarım diline geçirildi (kırılmıştı) |
| `components/layout/Sidebar.jsx` | logo girişte oynuyor |
| `src/index.ts` | API yolları 404 döner |
| `src/config/legal-documents.ts` | yeni — metin sürümleri |
| `src/services/auth.ts` | onay şartı + 3 uç nokta |
| `tests/api-404.test.ts`, `tests/legal-consent.test.ts` | yeni (26 test) |

Commit/push yapılmadı.

---

## Faz 6'dan kalan

- E-posta doğrulama şeridi (üstte kalıcı hatırlatma)
- Karşılama turu
- Çerez/depolama bildirimi
- Metinlerin kendisi ⏸ **şirket bilgilerin bekleniyor**
