# PayTR — canlıya geçiş kontrol listesi

**Durum (07.09.2026):** kod tarafı hazır. `BILLING_STARTS_AT` hâlâ `null`, yani
ödeme akışı bilinçli olarak KAPALI. Aşağıdaki adımlar tamamlanmadan açılmamalı.

---

## 0. GÜNCEL DURUM (09.09.2026) — ÖNCE BUNU OKU

**Ürün sahibi kararı: canlıya geçiş, MOBİL UYGULAMA YAYINLANANA KADAR ERTELENDİ.**
Gerekçe: uygulama mağazada yokken ödeme almak yarım bir deneyim olur.

Bu tarihte doğrulanan durum (sunucudan okundu, değerler ekrana basılmadı):

| | |
|---|---|
| PayTR mağazası | **CANLI MOD** — dört adım da tamamlandı, mağaza no `742814` |
| `PAYTR_MERCHANT_ID` | girildi (`742814`) |
| `PAYTR_MERCHANT_KEY` / `_SALT` | girildi (16'şar karakter) |
| `APP_PUBLIC_URL` | `https://localkarar.com` |
| `PAYTR_TEST_MODE` | **`true`** — bilerek, henüz canlıya alınmadı |
| `BILLING_STARTS_AT` | **`null`** — bilerek, ödeme kapısı kapalı |

⚠️ **Bu iki ayar BİRLİKTE değişmeli.** Yalnız `TEST_MODE=false` yapmak ödemeyi
tamamen kapatır (herkes `409 BILLING_NOT_STARTED` alır); yalnız tarihi açmak
ekranı açar ama PayTR test kipinde kalır, gerçek tahsilat olmaz.

⚠️ **Bugün gerçek para dönmeden PROVA YAPILABİLİR.** `routes.ts`teki
`testKipiDenemesi = cfg.testMode && role === 'admin'` iki şartı birden arıyor:
test kipi açıkken **admin** hesabı ödeme akışını uçtan uca çalıştırabilir, normal
kullanıcı yine kapıda çevrilir. Lansmandan önce şu zincirin bir kez
doğrulanması önerilir: token isteği → iframe → PayTR test kartı → callback →
üyelik `ACTIVE` **ve** `currentPeriodEnd` dolu (§1.1'de düzeltilen arıza).

⚠️ Mağaza canlı moda geçtiği için sunucudaki anahtarların hâlâ geçerli olduğu
**doğrulanmadı**. Prova, aynı zamanda bunu da sınar.

---

## 1. Bu turda düzeltilenler

### 1.1 🔴 Ödeme yapan kullanıcının üyeliği yine de bitiyordu

`Subscription.currentPeriodEnd` deponun **hiçbir yerinde yazılmıyordu**; yalnız
okunuyordu. Callback sadece `status: 'ACTIVE'` yazıyor, `hesaplaUyelikDurumu` ise
iki şartı birden arıyordu (`ACTIVE` **ve** dönem geçerli). Sonuç: para geçiyor,
kullanıcı 30 gün sonra salt okunur moda düşüyordu.

- `src/config/billing.ts` → yeni `odenmisDonemSonu(donem, mevcutSon, simdi)`.
  Kalan süre varsa üstüne biniyor, yakılmıyor. Ay ekleme `setMonth` ile (sabit
  30 gün, 12 ayda 5 gün sapma yaratırdı).
- `src/services/payments/routes.ts` → callback'in başarı dalı artık
  `currentPeriodEnd`i de yazıyor; `payment.findUnique` aboneliğin `period` ve
  `currentPeriodEnd` alanlarını da çekiyor.
- Üç yeni test (`tests/payments-paytr.test.ts`). Eski test yalnız
  `subscriptionUpdate` **sayısına** bakıyordu — çağrı sayısı doğru, yazılan veri
  eksikti, bu yüzden arızayı yakalamıyordu.

### 1.2 🔴 Yıllık dönem tuzağı

`/checkout` `period: 'yearly'` isteğini kabul edip aboneliği `YEARLY` yazıyor, ama
tutar her hâlde lansmanın **aylık** bedeliydi (`ilkUcretliTutar()`, 149 TL).

⚠️ Bugün arayüzden ulaşılamıyor: `MembershipModal.jsx` `period`i sabit `monthly`
gönderiyor ve dönem seçicisinin geri gelmemesi ayrı bir testle korunuyor. Yani
**yaşanmış bir yanlış tahsilat değil, açık duran bir kapı.**

Artık `422 PERIOD_NOT_AVAILABLE` dönüyor. **Tutar hesaplanmadı, istek reddedildi** —
çünkü lansman aşamasının tanımlı bir yıllık fiyatı yok; buraya bir çarpım yazmak
ürün sahibinin koymadığı bir fiyatı icat etmek olurdu.

### 1.3 PayTR'ye giden istemci IP'si

`request.ip` gönderiliyordu. Deponun kendi ölçümü (`src/lib/client-ip.ts`,
22.08.2026) bunun Cloudflare arkasında **kullanıcı değil kenar sunucusu**
olduğunu ve istekten isteğe değiştiğini gösteriyor. Artık aynı sorun için
yazılmış `hizSiniriAnahtari()` kullanılıyor.

⚠️ Düzeltme: bu **token isteğini reddettirmiyordu**. İmzayı biz üretiyoruz ve
gönderdiğimiz değerle tutarlı oluyor. Etkisi daha sessiz — PayTR'nin
dolandırıcılık değerlendirmesi her istekte değişen bir adres görüyordu.

### 1.4 Belgeler

- `deploy/env.production.example` — "callback 503 döner" ifadesi yanlıştı, kod
  **424 PAYMENT_DISABLED** dönüyor. Bildirim URL'si ve `TRUST_PROXY` uyarısı
  eklendi (hiçbir yerde yazılı değildi).
- `.env.example` — `PAYTR_*` anahtarları hiç yoktu, eklendi.

**Doğrulama:** `tsc --noEmit` temiz; tüm takım **152 dosya / 2212 test** geçiyor.

---

## 2. Sana kalan adımlar (ben yapamam)

| # | Adım | Nerede |
|---|---|---|
| 1 | `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT` | üretim secret store |
| 2 | `PAYTR_TEST_MODE=false` | üretim env |
| 3 | `APP_PUBLIC_URL=https://localkarar.com` | üretim env (zorunlu) |
| 4 | Bildirim URL'si: `https://localkarar.com/payments/paytr/callback` | PayTR mağaza paneli |
| 5 | Gerçek kartla 1 ödeme + panelden iade | canlı |

Sırları ben girmiyorum; 1. adım senin.

### 🔴 2 ve `BILLING_STARTS_AT` AYNI DAĞITIMDA GİTMELİ

`PAYTR_TEST_MODE=false` olduğu an admin'in test satın alma kapısı da kapanır
(`routes.ts` → `testKipiDenemesi`). `BILLING_STARTS_AT` hâlâ `null` ise
`/checkout` **admin dahil herkese** `409 BILLING_NOT_STARTED` döner — yani ödeme
tümden kapanır. Tarihi ben yazacağım; ne zaman istediğini söyle.

---

## 3. Canlıda açık kalacaklar

Bunlar canlıya çıkmayı engellemiyor ama elle iş demek:

- **İptal / iade uç noktası yok.** `cancelAtPeriodEnd` ve `canceledAt` sütunları
  var, hiç yazılmıyor. İade PayTR panelinden elle yapılacak ve **veritabanına
  yansımayacak**. Arayüzdeki "Üyeliği iptal et" / "Faturalarım" zaten `disabled`.
- **Otomatik yenileme yok.** Kart saklanmıyor (PayTR'de kayıtlı karttan tahsilat
  yalnız Direkt API + Non3D ile mümkün ve kart verisi bizim sunucumuzdan geçerdi).
  Kullanıcı süresi dolunca yeniden ödeyecek.
- `renewal_upcoming` ve `membership_cancelled` bildirim tipleri tanımlı, hiç
  üretilmiyor.
- PayTR ekranı EN arayüzdeki kullanıcıya da Türkçe açılıyor (`lang: 'tr'` sabit).
- Token isteği patlarsa `PENDING` kalan ödemeleri süpüren bir iş yok.
- Yıllık ödeme satılmıyor (bkz. 1.2). Satılacağı zaman tutar `config/billing.ts`ten
  türetilecek, ikinci bir fiyat kaynağı doğmayacak.
