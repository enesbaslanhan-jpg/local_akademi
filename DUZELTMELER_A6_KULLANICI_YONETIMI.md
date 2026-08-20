# A6 — Kullanıcı Yönetimi (Madde 6) Raporu

Tarih: 19.08.2026

"Kullanıcılarda sadece rol değiştir bulunuyor, banla veya sil gibi şeyler
olması gerekmiyor mu" — haklıydın. Backend'de yalnız `GET /users` ve
`PATCH /users/:id/role` vardı; kötüye kullanan bir hesabı durdurmanın hiçbir
yolu yoktu.

---

## Eklenenler

| Uç nokta | Ne yapar |
|---|---|
| `POST /admin/users/:id/suspend` | Hesabı askıya alır, açık oturumları kapatır. Geri alınabilir. |
| `POST /admin/users/:id/unsuspend` | Askıyı kaldırır. |
| `POST /admin/users/:id/anonymize` | Kişisel alanları temizler. Geri alınamaz. |

Arayüz: **Yönetim → Kullanıcılar → satır menüsü**. Listede "Askıda" ve
"Anonim" rozetleri görünüyor.

### Kalıcı silme YOK — bilinçli

"Sil" isteğini **anonimleştirme** olarak karşıladım. Sebebi: denetim
kayıtları, topluluk gönderileri ve yasal saklama yükümlülükleri kullanıcı
kaydına bağlı. Kaydı silmek bu izleri de götürürdü.

Anonimleştirme, kullanıcının **kendi hesabını silme** akışıyla (`auth.ts`)
aynı deseni kullanıyor: e-posta `deleted-<id>-<zaman>@deleted.local` olur,
ad "Silinmiş Kullanıcı", avatar temizlenir, parola kullanılamaz hale gelir.
Onay kutusu bunu kullanıcıya açıkça yazıyor — "sil" deyip aslında
anonimleştirmek, söylenmezse yanıltıcı olurdu.

### Korumalar

- Admin **kendi hesabına** hiçbirini uygulayamaz (kendini kilitler, geri dönemez)
- **Son aktif yönetici** askıya alınamaz / anonimleştirilemez
- Admin olmayan → 403, kimliksiz → 401
- Anonimleştirilmiş hesap geri alınamaz (boş kabuk canlandırmak anlamsız)
- Her işlem `createAuditLog` ile kayda geçer; askıya almada **sebep** de yazılır

### Anonimleştirmede eski e-posta denetim kaydına yazılmıyor

Amaç kişisel veriyi silmekse, onu denetim kaydına kopyalamak amacı boşa
çıkarırdı. Kayıtta yalnız `userId` var. Testle de doğrulanıyor.

---

## `tokenVersion` hakkında — kendi hatamı düzelttim

Kodu yazarken yoruma şunu yazmıştım: *"tokenVersion artışı sayesinde açık
oturumlar ölüyor; olmasaydı token 8 saat daha çalışırdı."*

**Yanlıştı.** Diş kontrolü yaparken yakaladım: `tokenVersion` artışını
kaldırdım ve testlerin hepsi yine geçti. Sebep, `authenticate`'in zaten
`deletedAt` dolu kullanıcıyı reddetmesi — askıya almada oturumu kesen şey o.

`tokenVersion`'ın **gerçek** işlevi başka: askı **kalkınca** `deletedAt`
temizleniyor. Sürüm artırılmasaydı, askıdan önce üretilmiş tokenlar o anda
yeniden geçerli olurdu — yani askıya alınan kişi elindeki eski tokenla hiç
giriş yapmadan geri dönerdi.

Testi bu doğru iddiayı ölçecek şekilde yeniden yazdım, yorumu da düzelttim.
Yeni test diş geçiriyor: sürüm artışı kaldırılınca askı öncesi token
**canlanıyor** (401 yerine 200) ve test çöküyor.

---

## Doğrulama

### Testler — `tests/admin-user-moderation.test.ts` (16 test)

Yetki (4) · askıya alma ve oturum kesme (4) · askıdan çıkarma (3) ·
son yönetici koruması (1) · anonimleştirme (4).

**Diş kontrolü:** `tokenVersion` artışı kaldırılınca ilgili test çöküyor.

### Tarayıcıda uçtan uca

| Adım | Sonuç |
|---|---|
| Menü açıldı | Rol Değiştir · Askıya Al · Hesabı Anonimleştir |
| Askıya al (sebep girildi) | listede **"Askıda"** rozeti · hedefin girişi **401** |
| Askıyı kaldır | rozet kalktı · hedefin girişi **200** |
| Anonimleştir | kayıt **duruyor**, e-posta `@deleted.local`, ad "Silinmiş Kullanıcı", avatar boş |
| Denetim izi | `user.suspended` (sebepli) → `user.unsuspended` → `user.anonymized` |

### Tam takım

**96/96 dosya, 1413/1413 test — üst üste iki koşuda temiz.**

---

## Yol üstünde çıkan iki şey

**1. Bayat backend, 200 döndürüyordu.** İlk denemede askıya alma çalışmadı;
istek **200** dönüyordu ama veritabanında hiçbir şey olmuyordu. Sebep:
çalışan backend süreci yeni rotaları eklemeden önce başlatılmıştı ve
`tsx` sıcak yeniden yükleme yapmıyor. Var olmayan rota, SPA yedeğine
düşüp **index.html'i 200 ile** döndürüyordu.

Bu ciddi bir tuzak: eksik bir API rotası hata gibi değil, başarı gibi
görünüyor. Kimlik doğrulaması olmadan bile 200 aldığım için fark ettim.
Daha önce de bir kez bu yüzden yanılmıştım. **Öneri:** SPA yedeği
`/api`, `/admin`, `/auth` gibi bilinen API ön eklerinde devreye girmemeli,
404 dönmeli. Ayrı bir iş olarak listeye eklenebilir.

**2. `/admin/stats` bir koşuda kırıldı.** İzole 86/86 geçiyor, sonraki iki
tam koşu temiz. Daha önce aynı uç noktada gördüğüm kırılmanın sebebi
(global hız sınırı) düzeltilmişti; bu seferki tek seferlik kaldı ve
sebebini kesinleştiremedim. Tekrarlarsa peşine düşerim — "flakiness" deyip
geçmiyorum, çünkü geçen sefer öyle deyip yanılmıştım.

---

## Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/services/admin.ts` | 3 uç nokta, ortak doğrulama, liste yanıtına askı durumu |
| `frontend/src/services/api.js` | `suspendUser` · `unsuspendUser` · `anonymizeUser` |
| `frontend/src/pages/admin/AdminUsers.jsx` + `.module.css` | menü eylemleri, rozetler, onay kutusu |
| `tests/admin-user-moderation.test.ts` | yeni (16 test) |

Test kullanıcıları silindi, tarayıcı oturumu temizlendi.
Commit/push yapılmadı.
