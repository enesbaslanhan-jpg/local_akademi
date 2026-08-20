# Faz 6 — Ara Rapor (F6.1–F6.3 tamam)

Tarih: 19.08.2026

Altı istekten üçünün altyapısı bitti ve uçtan uca doğrulandı. Bu rapor
tamamlananları ve **yol üstünde çıkan ciddi bir güvenlik bulgusunu** anlatıyor.

---

## 🔴 Yol üstünde çıkan bulgu: hız sınırlarının tamamı aşılabiliyordu

Şifre sıfırlamaya saatte 3 istek sınırı koydum, sonra testte o sınırın
neden takılmadığını incelerken asıl sorunu buldum.

`src/index.ts` içinde `trustProxy: true` sabitti. Bu, gelen
`X-Forwarded-For` başlığına **koşulsuz güvenmek** demek. Uygulamaya doğrudan
erişilebildiğinde saldırgan her istekte başlığı değiştirerek IP tabanlı hız
sınırlarının **tamamını** aşabiliyordu:

| Uç nokta | Sınır | Ne işe yarıyordu |
|---|---|---|
| `/auth/login` | 10/dakika | parola kaba kuvvet koruması |
| `/auth/register` | 5/saat | sahte hesap seli |
| `/auth/password-reset/request` | 3/saat | sıfırlama e-postası yağdırma |
| + 19 uç nokta daha | — | toplam 22 |

Yani uygulamanın kaba kuvvet koruması tek bir HTTP başlığıyla devre dışıydı.

### Kanıt

`tests/trust-proxy.test.ts` eski koda karşı çalıştırıldığında: sınır 3/saat
olmasına rağmen **6 isteğin 6'sı da 200 döndü.** Düzeltmeden sonra 3 geçiyor,
3'ü 429 alıyor.

### Düzeltme

`TRUST_PROXY` ortam değişkeni, **varsayılan `false`**:

```
(tanımsız)      → X-Forwarded-For yok sayılır, soket adresi kullanılır
TRUST_PROXY=1   → tek ters vekil arkasında
TRUST_PROXY=10.0.0.0/8 → güvenilecek adres aralığı
TRUST_PROXY=true → başlığa koşulsuz güvenilir + açılışta UYARI basar
```

**Dikkat etmen gereken:** nginx/Caddy arkasına koyduğunda `TRUST_PROXY=1`
ayarlamazsan tüm istekler vekilin IP'sinden geliyormuş gibi görünür ve tek
kullanıcı herkesin kotasını tüketir. Bu değişken ya doğru ayarlanmalı ya da
uygulama doğrudan internete bakmalı; arada kalmak iki yönden de hatalı.

---

## F6.1 — E-posta altyapısı ✅

`src/services/mailer.ts` + `src/services/mail-templates.ts` (yeni).

- Sağlayıcıdan bağımsız: Türkiye'de sunuculu bir sağlayıcıya geçiş **tek
  fonksiyon** değişikliği (`resendGonder`), çağıran hiçbir kod değişmez.
- **SDK eklenmedi** — Resend'in tek REST uç noktası var, `fetch` yeterli.
  Güncellenmesi ve denetlenmesi gereken bir bağımlılık daha olmasın.
- `RESEND_API_KEY` yoksa e-postalar **konsola** yazılır → tüm akış sağlayıcı
  olmadan geliştirilip test edilebiliyor.
- Üretimde eksik yapılandırmada sunucu **açılışta durur**. Sessizce
  çalışmayan bir şifre sıfırlama, kullanıcının hesabına erişimini kaybetmesi
  ve kimsenin fark etmemesi demek.
- Gönderim hatası **yutulmaz** — tek istisna, kasıtlı olarak yutulan sıfırlama
  isteği (aşağıda).

3 Türkçe şablon: sıfırlama bağlantısı, doğrulama kodu, "şifreniz değiştirildi"
bildirimi. Hepsi düz metin gövde üretir (HTML engellenirse işe yaramaz
kalmasın) ve hepsinde "bunu siz yapmadıysanız" satırı var — bu e-postalar
hesabın ele geçirildiğinin ilk sinyali olabilir.

**Senin yapman gereken:** resend.com hesabı + alan adının DNS'ine SPF/DKIM.

---

## F6.2 — Şifre sıfırlama ✅

`POST /auth/password-reset/request` · `POST /auth/password-reset/confirm`
Arayüz: `/forgot-password` ve `/reset-password`, "Şifremi unuttum" bağlantısı.

Üç tasarım kararı:

1. **İstek uç noktası HER ZAMAN 200 döner.** "Bu e-posta kayıtlı değil"
   demek, saldırgana hangi adreslerin sistemde olduğunu söyler. Arayüz de
   aynı dili konuşuyor: *"...adresi sistemde kayıtlıysa gönderildi."*
   Gönderim hatası bile yutuluyor — aksi halde cevap ayırt edilebilir olurdu.
2. **Token ham haliyle saklanmaz** — yalnız sha256 özeti. Veritabanı sızarsa
   hiçbir token kullanılamaz. `BusinessInvitation` ile aynı desen.
3. **Sıfırlama tüm oturumları öldürür** (Faz 5'teki `tokenVersion`). Sıfırlamanın
   amacı zaten bu: hesabı ele geçiren kişinin açık oturumu da ölmeli.

Ayrıca: token tek kullanımlık, 1 saat geçerli, ve bir sıfırlama yapıldığında
kullanıcının **bekleyen diğer tüm tokenları** da geçersiz olur. Sıfırlama
yalnız **doğrulanmış** adrese gönderilir — yoksa birinin başkasının adresiyle
açtığı hesap, o adrese e-posta yağdırmak için kullanılabilirdi.

---

## F6.3 — E-posta doğrulama (6 haneli kod) ✅ (backend + kod ekranı)

`POST /auth/email/verify-request` · `POST /auth/email/verify-confirm`
Arayüz: `/verify-email`.

- Bağlantı değil **kod**: mobil istemcide derin bağlantı kurmaya gerek yok,
  aynı akış web ve Android'de çalışıyor.
- Kod da **özetlenerek** saklanır.
- 15 dakika geçerli, **5 deneme** hakkı. 6 hane = 1.000.000 olasılık; sayaç
  olmadan kaba kuvvetle denenebilirdi.
- Yeni kod istendiğinde eskiler geçersiz olur — aynı anda birden çok geçerli
  kod, deneme sayacını anlamsızlaştırırdı.

---

## F6.6 (kısmi) — Parola gereksinimleri ✅

Kayıt ve sıfırlama ekranlarında **canlı kontrol listesi**.
`frontend/src/constants/password.js` tek kaynak; sunucudaki `PASSWORD_MIN`
ile ayrışırsa kullanıcı "geçerli" görünen bir parola yazıp sunucudan hata
alırdı.

Yalnız uzunluk zorunlu; diğerleri "(önerilir)" olarak işaretli — zorunlu
olmayanı zorunluymuş gibi göstermek kullanıcıyı var olmayan bir kurala
uymaya zorlar. Karşılanan madde hem renk hem **ikon** değiştirir (renk
körlüğünde de okunur).

---

## Doğrulama

### Testler — 3 yeni dosya, 42 test

`mailer.test.ts` (17) · `password-reset.test.ts` (13) · `trust-proxy.test.ts` (3)
+ mevcut testler.

**Tam takım: 95/95 dosya, 1397/1397 test temiz.**

**Diş kontrolü:** `trustProxy` düzeltmesi geri alındığında testler çöküyor
(*expected 6 to be 3*).

### Canlı sunucuda uçtan uca

| Adım | Sonuç |
|---|---|
| Kayıt → kod iste | kod loga düştü |
| Yanlış kod | `INVALID_CODE`, kalan deneme 4 |
| Doğru kod | doğrulandı |
| Sıfırlama iste | bağlantı loga düştü |
| Sıfırla | eski oturum **401**, yeni token **200** |
| Aynı bağlantı 2. kez | **400** |
| Eski şifreyle giriş | **401** · yeni şifreyle **200** |

### Tarayıcıda

- `/forgot-password`: kayıtlı **olmayan** adres için de aynı "kayıtlıysa
  gönderildi" mesajı — sızdırma yok.
- `/register`: `kisa` → 4 madde de işaretsiz, düğme kilitli;
  `GucluParola!2026` → 4 madde işaretli, düğme açık.

Doğrulama için açılan test kullanıcıları silindi.

---

## Kalan işler

| İş | Durum |
|---|---|
| F6.3 doğrulama şeridi (üstte kalıcı hatırlatma) | yapılmadı |
| F6.4 yasal onay kaydı | şema hazır (`UserConsent`), uç nokta ve kayıt formu kutusu yapılmadı |
| F6.5 yasal metinlerin yazımı | ⏸ **şirket bilgileri sende** |
| F6.6 karşılama turu | yapılmadı |
| F6.6 çerez/depolama bildirimi | yapılmadı |

Şema tarafı hazır olduğu için F6.4 kısa; F6.5 senin bilgilerini bekliyor.

Commit/push yapılmadı. Backend dev sunucusu ayakta ve yeni kodla çalışıyor.
