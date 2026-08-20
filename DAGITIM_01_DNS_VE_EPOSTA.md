# Dağıtım — Adım 1: DNS ve E-posta

Tarih: 20.08.2026

Bu dosya **yalnız DNS ve e-posta** kurulumunu anlatıyor. Uygulamanın
sunucuya kurulması ayrı bir adım (Adım 2) — DNS önce yapılıyor çünkü
yayılması zaman alıyor ve Resend doğrulaması ona bağlı.

## Elde ne var

| | |
|---|---|
| Alan adı | `localkarar.com` (Cloudflare'da) |
| Sunucu | Ubuntu 24.04 · IPv4 `57.131.143.54` · IPv6 `2001:41d0:701:1100::a915` |
| Sunucu konumu | **Yurt dışı** — KVKK metinlerine aktarım kalemi olarak girecek |

> **Bu adım bittiğinde alan adına girince site AÇILMAYACAK.** Uygulama
> henüz kurulmadı. Bu normal; DNS'in yayılması için önden yapılıyor.

---

## 0. Ölçülen mevcut durum (20.08.2026)

Canlı DNS sorgulandı:

| Kayıt | Durum |
|---|---|
| `localkarar.com`, `www`, `api`, `app` → A | ✅ Cloudflare IP'leri dönüyor — proxy çalışıyor, origin IP gizli |
| MX ×5 | ✅ Namecheap yönlendirme |
| TXT SPF (kök) | ✅ `v=spf1 include:spf.efwd.registrar-servers.com ~all` |
| `_dmarc` | ❌ yok — aşağıda |
| Resend kayıtları | ❌ henüz yok |

**`api.` ve `app.` alt alanları:** uygulama **tek origin** olarak
yazılmış (Fastify hem API'yi hem arayüzü aynı adresten sunuyor —
`API_PREFIXES` + SPA yedeği). `localkarar.com` tek başına yeterli;
o ikisi zararsız, ileride lazım olursa kullanılır. Ayrı origin
istenirse CORS ve `APP_PUBLIC_URL` ayarları ile SPA yedeği mantığı
değişir.

---

## 1. Uygulama kayıtları (Cloudflare → DNS → Records)

| Tür | Ad | İçerik | Proxy |
|---|---|---|---|
| A | `@` | `57.131.143.54` | 🟠 Proxied |
| A | `www` | `57.131.143.54` | 🟠 Proxied |
| AAAA | `@` | `2001:41d0:701:1100::a915` | 🟠 Proxied |
| AAAA | `www` | `2001:41d0:701:1100::a915` | 🟠 Proxied |

**Proxy neden açık:** DDoS koruması, CDN ve sunucunun gerçek IP'sinin
gizlenmesi. Karşılığında uygulama tarafında `TRUST_PROXY` doğru
ayarlanmak zorunda — Adım 2'de yapılacak, sebebi aşağıda "Sonraki adım"
bölümünde.

**AAAA kayıtları isteğe bağlı** ama IPv6 adresin var; eklemek zarar
vermez. IPv6'yı kullanmayacaksan eklemeyip geç.

### SSL/TLS ayarı — bunu atlama

Cloudflare → SSL/TLS → Overview → **Full (strict)** seç.

- ❌ **Flexible KULLANMA.** Ziyaretçi ile Cloudflare arası şifreli olur
  ama Cloudflare ile sunucun arası **şifresiz** kalır. Tarayıcıda kilit
  görünür, gerçekte yarısı açıktır.
- `Full (strict)` sunucuda geçerli bir sertifika ister. Adım 2'de Caddy
  otomatik alacak. O zamana kadar geçici olarak `Full` yeterli.

---

## 2. Resend — alan adı doğrulama

### 2.1 Hesap ve alan adı

1. [resend.com](https://resend.com) → hesap aç
2. **Domains → Add Domain**
3. Alan adı olarak **`mail.localkarar.com`** gir — kök alan adı değil.
4. **`Advanced options` → Region → `Ireland (eu-west-1)`** — varsayılan
   ABD, değiştir.

**Neden alt alan adı:** kökte ZATEN Namecheap yönlendirmesinin SPF kaydı
var (`v=spf1 include:spf.efwd.registrar-servers.com ~all`). Resend köke
kurulsaydı ikinci bir SPF kaydı gerekirdi ve **aynı isimde iki ayrı SPF
TXT kaydı geçersizdir** — posta akışını bozardı. Alt alan adında Resend
kendi SPF'ini `send.mail.localkarar.com` üzerine koyuyor, köke hiç
dokunmuyor.

Ayrıca gönderim itibarı alt alanda izole kalır; ileride bir sorun
çıkarsa kök alan adı etkilenmez.

**Neden İrlanda:** (a) KVKK — Resend aktarım kalemi ABD yerine AB olur,
sunucu da Avrupa'da olduğu için tek bir hikâye kalır. (b) Hız — Türkiye'ye
Virginia'dan çok daha yakın.

⚠️ **Bölgeyi baştan seç.** Sonradan değiştirmek için alan adını silip
yeniden eklemek ve **bütün DNS kayıtlarını baştan girmek** gerekiyor.

### 2.2 Resend'in verdiği kayıtları Cloudflare'a gir

Resend panelde sana **kendi üreteceği** değerleri gösterir. Aşağıdaki
tablo hangi alana ne gireceğini gösteriyor — **değerleri panelden
kopyala**, buradakiler örnek:

| Tür | Ad | İçerik | Öncelik | Proxy |
|---|---|---|---|---|
| MX | `send.mail` | Resend'den kopyala (ör. `feedback-smtp...amazonses.com`) | `10` | ⚪ DNS only |
| TXT | `send.mail` | Resend'den kopyala (`v=spf1 include:amazonses.com ~all`) | — | ⚪ DNS only |
| TXT | `resend._domainkey.mail` | Resend'den kopyala (`p=…`) | — | ⚪ **DNS only** |

> ⚠️ **DKIM kaydında proxy'yi AÇMA.** Turuncu bulut açık olursa Resend
> doğrulaması başarısız olur. Cloudflare TXT kayıtlarını zaten
> proxy'lemez, ama Resend bazı kurulumlarda CNAME veriyor — CNAME
> geldiyse mutlaka gri bulut (DNS only).

> **Ad alanına dikkat:** Cloudflare `mail.localkarar.com` alt alanını
> ayrı bir zone olarak tutmuyorsa, adları `send.mail` /
> `resend._domainkey.mail` biçiminde girmen gerekir. Cloudflare
> otomatik olarak `.localkarar.com` ekler.

### 2.3 DMARC (önerilir, zorunlu değil)

| Tür | Ad | İçerik |
|---|---|---|
| TXT | `_dmarc.mail` | `v=DMARC1; p=none; rua=mailto:kvkk@localkarar.com` |

`p=none` ile başla — sadece raporlar. Gönderim oturduktan sonra
`p=quarantine`'e çekilir. Baştan sert politika koymak, kendi
postalarının spam'e düşmesine yol açabilir.

### 2.4 Doğrula

Resend panelde **Verify DNS Records**. Yeşile dönmeyen kayıt varsa
5–15 dakika bekleyip tekrar dene (Cloudflare'da genellikle bu kadar
sürer).

Kendi kontrolün için:

```bash
dig +short TXT resend._domainkey.mail.localkarar.com
dig +short MX send.mail.localkarar.com
```

---

## 3. KVKK başvuru adresi

Yasal metinlerde geçecek adres: **`kvkk@localkarar.com`**

Bu bir **alma** adresi; Resend yalnız gönderim yapıyor.

**İyi haber: altyapı zaten kurulu.** Canlı DNS'te Namecheap e-posta
yönlendirmesinin MX kayıtları görülüyor
(`eforward1-5.registrar-servers.com`). Yani ayrı bir servise gerek yok:

**Namecheap → Domain List → Manage → Redirect Email** bölümünden
`kvkk@localkarar.com` alias'ı açıp kendi adresine yönlendir.

> Bu adres 19. maddedeki metinlerde **yazılı olacak**, yani metinler
> yazılmadan önce çalışır durumda olmalı.

---

## 4. Uygulama ortam değişkenleri

Adım 2'de sunucuya girecek değerler — şimdiden not:

```
RESEND_API_KEY=re_...            # Resend → API Keys
MAIL_FROM="LocalKarar <bildirim@mail.localkarar.com>"
APP_PUBLIC_URL=https://localkarar.com
CORS_ORIGIN=https://localkarar.com
```

`MAIL_FROM` **doğrulanan alan adıyla aynı** olmalı
(`@mail.localkarar.com`), yoksa Resend gönderimi reddeder.

---

## 5. Bu adımın kanıtı

Uygulama kurulduktan sonra (Adım 2), e-postanın gerçekten gittiği şöyle
kanıtlanacak:

1. `/forgot-password` üzerinden kendi adresine sıfırlama iste
2. Posta kutusuna düşmeli — **spam klasörünü de kontrol et**
3. Gelen postanın kaynağında `dkim=pass` ve `spf=pass` görünmeli

Şu an e-postalar sunucu günlüğüne yazılıyor (`RESEND_API_KEY` yok);
anahtar girildiği anda gerçek gönderime geçiyor. Kod tarafında
yapılacak bir şey yok — `mailer.ts` bunu zaten böyle kurgulanmış.

---

## Sonraki adım (Adım 2 — uygulama kurulumu)

Bu dosyada **yok**, ama sırada bunlar var:

- Docker + compose, en az yetkili DB rolü (`setup-app-db-role.ts`)
- Caddy ters vekil + otomatik TLS → Cloudflare `Full (strict)` çalışsın
- **`TRUST_PROXY`** — Cloudflare proxy açık olduğu için her istek
  Cloudflare IP'sinden geliyormuş gibi görünüyor. `true` **yazılmayacak**:
  ölçülmüştü, `X-Forwarded-For` taklit edilerek 3/saat sınırında 6/6
  istek geçiyordu. Doğru değer sıçrama sayısı ya da Cloudflare IP
  aralıkları; kurulumdan sonra ölçülecek.
- Yedekleme cron'u — betik artık çalışıyor (bkz.
  `FAZ_3_ISLETIM_RAPORU.md`) ama onu düzenli çalıştıran bir şey yok.

**Sources:** [Resend — Cloudflare](https://resend.com/docs/knowledge-base/cloudflare) ·
[Resend SPF/DKIM/DMARC rehberi](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records)
