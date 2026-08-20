# Davet Tokeni — E-postaya Taşındı

Tarih: 20.08.2026

**Tam takım: arka uç 102/102 dosya · 1466/1466 test — ön yüz 32/32
dosya · 244/244 test. Derleme temiz.**

---

## 1. Sorun

`POST /workspaces/:id/invitations` ham davet tokenini **API yanıtında**
döndürüyordu. Arayüz (`Team.jsx`) onu ekranda bir kutuda gösteriyor ve
şu notu basıyordu:

> "Davet bağlantısı oluşturuldu. (Geliştirme aşamasında e-posta
> gönderimi yerine token gösteriliyor)"

Yani daveti oluşturan kişi tokeni kopyalayıp kendi bildiği bir yolla
iletiyordu. Sonuç: **davetin gerçekten o e-posta adresinin sahibine
gittiğine dair hiçbir garanti yoktu.** Tokeni gören herkes onu başka
birine verebilirdi; kabul akışındaki e-posta eşleşme kontrolü de ancak
token doğru kişiye ulaşırsa anlam taşıyor.

Veritabanı tarafı zaten doğruydu: `BusinessInvitation.tokenHash` sha256
özeti tutuyor, ham token saklanmıyor. Eksik olan tek şey iletim
kanalıydı.

## 2. Yapılanlar

### Sunucu

- Yeni şablon: `isletmeDavetiMaili()` — işletme adı, davet eden kişi ve
  `/davet?token=…` bağlantısı. 7 gün, tek kullanımlık.
- `POST .../invitations` artık e-posta gönderiyor; yanıttan `token`
  **çıkarıldı** (`{ id, email, role, expiresAt }` dönüyor).
- **Posta gönderilemezse davet siliniyor** ve 502 dönüyor. Aksi halde
  kimsenin kabul edemeyeceği bekleyen bir davet kalırdı — ve aynı
  adrese yeniden davet göndermek "zaten bekleyen davet var" hatasına
  takılırdı.

### Davet kabul ekranı — daha önce HİÇ YOKTU

`api.workspace.invitations.accept()` yazılıydı ama **hiçbir yerden
çağrılmıyordu** ve karşılık gelen bir rota yoktu. Token e-postaya
taşınınca davetlinin düşeceği bir sayfa zorunlu hale geldi.

`pages/InvitationPage.jsx` → `/davet?token=…`

- Oturum yoksa: daveti açıklayan kart + `?next=` taşıyan giriş/kayıt
  bağlantıları.
- Oturum varsa: kabul isteği otomatik gidiyor, sonuç gösteriliyor.
- Sunucunun hata mesajı **olduğu gibi** gösteriliyor: "farklı bir
  e-postaya gönderilmiş", "süresi dolmuş", "zaten üyesin" — her biri
  kullanıcının atacağı adımı değiştiriyor, tek bir genel mesajın altına
  saklamak çıkmaz olurdu.
- `useRef` ile kabul isteği **bir kez** gidiyor: React StrictMode
  geliştirmede effect'i iki kez çalıştırıyor ve ikinci istek "davet
  zaten kullanılmış" hatası veriyordu.

### Girişten sonra geri dönüş (`?next=`)

`AuthPage` daha önce **her zaman** `/app/dashboard`'a gidiyordu; davet
bağlantısıyla gelen kullanıcı davetini kaybederdi.

`?next=` desteği eklendi — ama değer **kullanıcıdan** geldiği için
doğrudan kullanılamaz: `/login?next=https://sahte-site` bağlantısı,
kullanıcı gerçek alan adımızda giriş yaptıktan hemen sonra onu
saldırganın sitesine düşürürdü. Kimlik avı için ideal, çünkü bağlantı
bizim alan adımızla başlıyor.

`utils/safeNext.js` süzüyor: yalnız tek `/` ile başlayan uygulama içi
yollar. Reddedilenler: mutlak adres, `//` ile başlayan protokole göreli
adres, `\` içeren yol (bazı tarayıcılar mutlak sayar), şema
(`javascript:`, `data:`), kontrol karakteri, 512 karakterden uzun değer.

### Arayüz

`Team.jsx` token kutusu kaldırıldı; yerine "**\<adres\>** adresine davet
e-postası gönderildi" bilgisi geldi.

**Yol üstünde bulunan hata:** davet gönderimi `catch { }` ile
hatayı **sessizce yutuyordu** — başarısızlıkta ekranda hiçbir şey
olmuyordu. Posta gönderimi eklendiği için artık gerçek bir başarısızlık
yolu da var (502), gizlenmesi kabul edilemezdi. Hata artık gösteriliyor.

---

## 3. Doğrulama

Tarayıcıda uçtan uca:

1. Davet gönderildi → yanıtta **token yok** (`{id, email, role, expiresAt}`).
2. Sunucu günlüğünde e-posta göründü, içinde
   `/davet?token=…` bağlantısı.
3. Bağlantı **çıkış yapmış** hâlde açıldı → "Bir işletmeye davet
   edildin" kartı, giriş/kayıt bağlantıları `?next=` taşıyor.
4. Giriş yapıldı → **`/davet`'e geri dönüldü** → davet otomatik kabul
   edildi → "Katıldın".
5. Veritabanı kontrolü: üyelik `Davet Test Isletmesi / rol=staff /
   durum=active`, davet `accepted`, `tokenHash` 64 hane (sha256 —
   ham token saklanmıyor).

### Testler

- `tests/workspace.test.ts` — yeni test: **yanıt ham token sızdırmaz**.
  Alan adı değişse bile 64 hanelik hex bir değerin yanıtta bulunmadığı
  kontrol ediliyor. **Diş kontrolü:** token yanıta geri konunca bu test
  çöküyor.
- Mevcut güvenlik testleri artık tokeni uçtan alamıyor; davet
  **doğrudan veritabanında** kuruluyor (sunucunun yaptığının aynısı).
- `utils/safeNext.test.js` — 9 test. **Diş kontrolü:** süzgeç
  kaldırılınca 8 test çöküyor.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/services/mail-templates.ts` | `isletmeDavetiMaili()` |
| `src/services/workspace.ts` | e-posta gönderimi; yanıttan token çıkarıldı; posta hatasında davet silinir |
| `frontend/src/pages/InvitationPage.jsx` | yeni — `/davet` |
| `frontend/src/utils/safeNext.js` + `.test.js` | yeni — açık yönlendirme süzgeci |
| `frontend/src/pages/AuthPage.jsx` | `?next=` desteği |
| `frontend/src/pages/Workspaces/Team.jsx` | token kutusu kaldırıldı; hata artık gösteriliyor |
| `frontend/src/router/index.jsx` | `/davet` rotası |
| `tests/workspace.test.ts` | sızıntı testi + davet kurulumu DB'ye taşındı |

Commit/push yapılmadı.

---

## Not

Davet e-postası şu an konsola düşüyor (`RESEND_API_KEY` yok). Gerçek
gönderim, alan adının Resend'de doğrulanmasına ve SPF/DKIM kayıtlarının
Cloudflare'a girilmesine bağlı — 16. maddenin kalan kısmı.
