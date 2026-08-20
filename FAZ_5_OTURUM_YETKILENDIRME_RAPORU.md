# Faz 5 — Oturum ve Yetkilendirme Raporu

Tarih: 19.08.2026 · Kapsam: `src/services/auth.ts`, `prisma/schema.prisma`,
`frontend/src/pages/SettingsPage.jsx`, `frontend/src/services/api.js`

---

## Önce: zaten kapalı olanlar

`SECURITY_AUDIT.md` içindeki SEC-001 ve SEC-002'yi doğruladım, gerçekten
kapatılmışlar. `authenticate` her istekte kullanıcıyı veritabanından çekiyor,
silinmişse reddediyor ve **rolü JWT'den değil veritabanından** okuyor. Yani
silinen kullanıcı ya da düşürülen rol anında etkili.

Kalan asıl açık iptal mekanizmasıydı.

---

## 1. Oturumlar iptal edilemiyordu — ✅ KAPATILDI

### Bulgu

JWT 8 saat geçerliydi ve geçersiz kılmanın hiçbir yolu yoktu. Şifre değiştirme
uç noktası yalnızca `password` alanını güncelliyordu:

```ts
await prisma.user.update({ where: { id: found.id }, data: { password: hashed } })
```

Somut senaryo: kullanıcı hesabının ele geçirildiğinden şüpheleniyor, şifresini
değiştiriyor — **saldırganın elindeki token 8 saat daha çalışmaya devam
ediyor.** Şifre değiştirmenin tek amacı buyken.

### Çözüm — `User.tokenVersion`

Token içine `tv` claim'i konuyor, `authenticate` bunu kullanıcının güncel
sürümüyle karşılaştırıyor. Sürüm artınca o kullanıcının **tüm mevcut
tokenları** bir sonraki istekte ölüyor.

**Ek sorgu maliyeti yok.** `authenticate` zaten her istekte `findUnique`
yapıyordu; `select` listesine bir alan eklendi, o kadar.

Sürüm şu iki durumda artıyor:
- şifre değişimi
- `POST /auth/logout-all` (yeni)

### Geriye dönük uyumluluk

Bu değişiklikten önce üretilmiş tokenlarda `tv` yok. Eksik değer **0 sayılıyor**,
sütun varsayılanı da 0 — böylece dağıtım anında kimse oturumundan atılmıyor.
Sürüm bir kez arttıktan sonra (>= 1) o eski tokenlar da doğal olarak reddediliyor.

Depodaki 20 test dosyası `tv` olmadan token üretiyor; hepsi geçiyor, yani bu
yol iyi sınanmış durumda.

### `issueToken` — tek üretim noktası

`fastify.jwt.sign` üç ayrı yerde çağrılıyordu (kayıt, giriş, e-posta değişimi).
`tv` eklenirken birinin unutulması, o yoldan alınan tokenin **hiç iptal
edilememesi** demek olurdu. Üçü tek fonksiyona toplandı.

---

## 2. `POST /auth/logout-all` — yeni

Cihazını kaybeden ya da bir yerde oturumunu açık bıraktığından şüphelenen
kullanıcı, **şifresini değiştirmeden** tüm oturumları kapatabiliyor. Denetim
kaydı bırakıyor (`auth.sessions_revoked`), saatte 10 istekle sınırlı.

Arayüz: Ayarlar → Güvenlik → "Diğer cihazlardan çık".

Her iki akış da (şifre değişimi ve logout-all) çağıran cihaza **taze token**
dönüyor — o cihaz oturumda kalıyor, diğerleri düşüyor. Yanıt şekli `/auth/email`
ile aynı, frontend'in mevcut `replaceSession` yardımcısı doğrudan çalışıyor.

---

## 3. Parola politikası tutarsızlığı — ✅ HİZALANDI

Kayıt en az **10** karakter istiyordu, şifre değiştirme **8**. Yani kullanıcı 10
ile kaydolup hemen 8'e düşerek politikayı geçersizleştirebiliyordu.

Tek `passwordField` tanımı yapıldı; istemci tarafındaki üç yer (doğrulama,
`minLength`, ipucu metni) de 10'a çekildi.

---

## Kanıt

### Testler — `tests/session-revocation.test.ts` (12 test)

Gerçek akış üzerinden: `/auth/login` ile iki cihazdan token alınıyor, biri
şifreyi değiştiriyor, diğerinin tokeni **401 + `SESSION_REVOKED`** alıyor.

**Teste diş geçirdiği doğrulandı:** sürüm kontrolü geçici olarak kapatıldığında
5 test çöküyor, geri konduğunda geçiyor.

### Tarayıcıda uçtan uca

Canlı sunucu ve gerçek arayüz üzerinde denendi:

| Adım | Sonuç |
|---|---|
| İki cihazdan giriş | ikisi de 200 |
| "Diğer cihazlardan çık" tıklandı | ekranda onay mesajı |
| Diğer cihazın tokeni | **401** |
| Çağıran cihazın eski tokeni | **401** |
| Çağıran cihazın taze tokeni | **200** |

**Bu doğrulama gerçek bir hata yakaladı.** Düğme ilk denemede sessizce hiçbir
şey yapmıyordu: `api.request` her isteğe `Content-Type: application/json`
ekliyor, Fastify de gövdesiz böyle bir POST'u 400 ile reddediyor. Test takımı
bunu göremezdi — `app.inject` gövdesiz istekte Content-Type göndermiyor.
Düzeltildi (boş nesne gönderiliyor).

### Tam takım

**92/92 dosya, 1364/1364 test** temiz geçti.

Bir test güncellendi: `production-readiness.test.ts` içindeki
"DB credentials come from environment or default", Faz 2'de kaldırdığım zayıf
varsayılan parolayı şart koşuyordu. Eski davranışa dönmek yerine test **yeni ve
daha güçlü kuralı** doğrulayacak şekilde yazıldı (`:?` zorunlu değişken, ayrıca
en az yetkili rol kontrolü eklendi).

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` | `User.tokenVersion` |
| `prisma/migrations/20260818234500_add_user_token_version/` | yeni, uygulandı |
| `src/services/auth.ts` | `issueToken`, `tv` doğrulaması, `logout-all`, parola politikası |
| `frontend/src/services/api.js` | `logoutAll()` |
| `frontend/src/pages/SettingsPage.jsx` | "Diğer cihazlardan çık", token saklama, 10 karakter |
| `tests/session-revocation.test.ts` | yeni (12 test) |
| `tests/production-readiness.test.ts` | compose kuralları güncellendi |

---

## Açık kalan — mobil istemciyi doğrudan etkiliyor

**Token yenileme (refresh) hâlâ yok.** JWT 8 saat; web'de tolere edilebilir,
mobilde her gün yeniden giriş demek. `tokenVersion` altyapısı artık yerinde
olduğu için yenileme akışı güvenle eklenebilir — iptal edilebilir bir oturum
kavramı olmadan refresh token eklemek yanlış sıralama olurdu, o engel kalktı.

Ayrıca **SEC-003 (JWT localStorage'da)** duruyor. HttpOnly çereze geçiş hem
backend hem frontend hem mobil istemciyi etkiler; ayrı bir karar.

Commit/push yapılmadı.
