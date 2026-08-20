# Oturum Yenileme (Refresh Token)

Tarih: 20.08.2026

**Tam takım: arka uç 103/103 dosya · 1483/1483 test — ön yüz 33/33
dosya · 252/252 test. Derleme temiz.**

---

## 1. Sorun

Erişim tokeni 8 saat geçerliydi ve **yenilenmiyordu**. Süre dolunca
kullanıcı sessizce dışarı atılıyordu. Webde katlanılır; mobilde günde
birkaç kez yeniden giriş demek.

## 2. Tasarımın can alıcı noktası

`tokenVersion` **beş ayrı yerde** artıyor: şifre değişimi, tüm
cihazlardan çıkış, şifre sıfırlama, askıya alma, anonimleştirme.

Naif çözüm, bu beş yere ayrı ayrı "yenileme tokenlerini de sil" eklemek
olurdu. **Yapmadım** — ileride eklenecek altıncı yolun unutulması sessiz
bir güvenlik açığı olurdu: iptal edilmiş bir oturum, yenileme yoluyla
taze erişim tokeni üretmeye devam ederdi. (Depodaki `issueToken`
yorumu tam bu hatayı anlatıyor: token üretimi üç yere dağılmışken
`tv` claim'inin birinde unutulması riski.)

Onun yerine **`tokenVersion` yenileme kaydının içinde tutuluyor** ve
yenileme anında kullanıcının güncel sürümüyle karşılaştırılıyor. Sürümü
artıran her yol, açık yenileme tokenlerini kendiliğinden geçersiz
kılıyor. Kontrol tek yerde.

## 3. Yapılanlar

### Model — `RefreshToken`

| Alan | Neden |
|---|---|
| `tokenHash` | Ham değer yalnız istemcide; veritabanında sha256 (parola sıfırlama ve davet tokenleriyle aynı desen) |
| `familyId` | Dönüş ailesi — hırsızlık tespiti |
| `tokenVersion` | Yukarıdaki tek kontrol noktası |
| `usedAt` / `revokedAt` | Harcanmış / iptal |

### Dönüş (rotation) ve hırsızlık tespiti

Her yenileme eski tokeni harcayıp yenisini veriyor. **Harcanmış bir
token yeniden sunulursa** bu, tokenin iki tarafta olduğu anlamına gelir;
hangisinin saldırgan olduğunu bilemeyeceğimiz için **ailenin tamamı
iptal ediliyor** ve iki taraf da yeniden giriş yapmak zorunda kalıyor.

Eşzamanlılık: harcama `updateMany ... where usedAt: null` ile yapılıyor,
yani aynı tokenle gelen iki istekten yalnız biri yenileme alabiliyor.

### Uç noktalar

- `POST /auth/refresh` — kimlik doğrulama **istemez** (amacı zaten süresi
  dolmuş tokeni değiştirmek). İstemciye tek tip 401 dönüyor; "bulunamadı
  / süresi doldu / tekrar kullanım" ayrımı yalnız günlükte, çünkü ayrım
  saldırgana bilgi verirdi ama tekrar kullanım bir saldırı sinyali ve
  ayırt edilebilmeli.
- `POST /auth/logout` — yalnız bu cihaz. `logout-all`den farkı
  `tokenVersion`'ı artırmaması.

### 🔴 Yol üstünde: üç uç nokta taze yenileme tokeni vermiyordu

Şifre değişimi, `logout-all` ve şifre sıfırlama çağırana **taze erişim
tokeni** dönüyordu ("kendi cihazın oturumda kalsın"). Ama `tokenVersion`
arttığı için o cihazın elindeki **yenileme tokeni de ölüyordu** — yani
kullanıcı işlemden hemen sonra kendi cihazından, ilk yenilemede
atılacaktı.

Üçü de artık taze yenileme tokeni dönüyor. Tek bir test üçünü birden
koruyor.

### İstemci

`api.request` 401 alınca **bir kez** yeniliyor ve isteği tekrarlıyor.

**Tek uçuş (single flight)** — kritik: sayfa açılışında birden çok istek
aynı anda 401 alabiliyor. Her biri ayrı yenileme başlatsaydı ilki tokeni
harcar, diğerleri sunucu tarafında **tekrar kullanım** sayılır ve
**aile iptal edilirdi**. Yani otomatik yenileme, kullanıcıyı atmanın
yeni bir yolu olurdu. Aynı anda yalnız bir yenileme uçuşu var.

Diğer korumalar:
- Kimlik akışının kendisi (`/auth/login`, `/register`, `/refresh`,
  `/logout`, `/password-reset`) yenileme denemesinin dışında — orada 401
  "şifre yanlış" demek.
- `tekrarMi` bayrağı sonsuz döngüyü kesiyor.
- `FormData` gövdeli istekler tekrarlanmıyor (tek kullanımlık akış).

`AuthContext.logout` artık sunucuda da iptal ediyor. Yalnız yerel
depolamayı temizlemek yetmezdi: token 30 gün daha geçerli kalırdı.

---

## 4. Doğrulama

Tarayıcıda, gerçek senaryo (erişim tokeni bozuldu, yenileme tokeni
sağlam — 8 saat dolduğunda olan şey):

```
/auth/me       401
/auth/refresh  200
/auth/me       200   → kullanıcı döndü
```

Çağıran taraf **hiç hata görmedi**; erişim tokeni değişti, yenileme
tokeni döndürüldü. Çıkış sonrası aynı tokenle yenileme denemesi 401.

### Testler

`tests/refresh-token.test.ts` — 17 test. Diş kontrolleri:
- `tokenVersion` kontrolü devre dışı → **2 test çöküyor**
- Aile iptali kaldırıldı → **1 test çöküyor**

`frontend/src/__tests__/api.refresh.test.jsx` — 8 test. Diş kontrolü:
- Tek uçuş kaldırıldı → **eşzamanlılık testi çöküyor**

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `prisma/schema.prisma` + migration | `RefreshToken` modeli |
| `src/services/refresh-tokens.ts` | yeni — dönüş, hırsızlık tespiti, temizlik |
| `src/services/auth.ts` | `/refresh`, `/logout`; login/register/şifre değişimi/logout-all/sıfırlama yanıtlarına `refreshToken` |
| `frontend/src/services/api.js` | 401 → tek uçuşlu yenileme + tekrar; `logout` |
| `frontend/src/context/AuthContext.jsx` | iki tokeni birlikte yönetir; çıkışta sunucuda iptal |
| `tests/refresh-token.test.ts` | yeni — 17 test |
| `frontend/src/__tests__/api.refresh.test.jsx` | yeni — 8 test |

Commit/push yapılmadı.

---

## Not

Erişim tokeni ömrü **8 saatte bırakıldı**. Kısaltmak revokasyonu
hızlandırmıyor: `authenticate` her istekte `tokenVersion`'ı veritabanından
kontrol ettiği için iptal zaten anında. Kısaltmanın tek etkisi yenileme
trafiğini artırmak olurdu.

Temizlikte gözüme çarpan: depoda `src/services/auth.ts.bak` diye artık
bir dosya duruyor — temizlik maddesine (9) not.
