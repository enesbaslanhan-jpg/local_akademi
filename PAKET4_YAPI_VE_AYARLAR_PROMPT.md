# LOCAL KARAR — PAKET 4: BİLGİ MİMARİSİ VE AYARLAR

Menüyü sadeleştirmek, tekrarlayan sayfaları birleştirmek ve Ayarlar sayfasını
gerçek ayarlarla doldurmak.

**ÇALIŞMA BİÇİMİ:** 6 iş var, sırayla yap. Her işin sonunda `npm run build` +
`npm test`. Bir iş takılırsa orada dur ve raporla.

**BACKEND:** Yalnızca İŞ 6'da tek bir endpoint eklenecek. Başka hiçbir backend
değişikliği yapılmayacak. Veri modeli değişmeyecek (yeni migration yok).

Commit/push YAPILMAYACAK.

Ortak tasarım kuralları önceki paketlerdeki gibi geçerli: turuncu sayfa başına
tek CTA, bordo yalnızca risk/uyarı/yıkıcı, sabit hex yok, yeni keyframe/token
yok, Tailwind yok, sahte veri yok, görsel yok.

---

## İŞ 1 — Sidebar menüsünü sadeleştir

Dosya: `components/layout/Sidebar.jsx`

**Hiçbir route SİLİNMEYECEK.** Sayfalar erişilebilir kalacak, sadece menüden
çıkacaklar.

Yeni menü:

```
ANA MENÜ
  Ana Sayfa          /app/dashboard
  Kurslar            /app/courses
  Karar Araçları     /app/decision-checks     [Önerilen rozeti]
  Finans Merkezi     /app/tools
  AI Mentor          /app/mentor
  İşletme Takibi     /app/workspaces/:id/tracker  (aktif işletme yoksa /app/workspaces)

DİĞER
  Kaydedilenler      (mevcut hedef)
  Haberler           /app/community
  Ayarlar            /app/settings

YÖNETİM (yalnızca admin)
  mevcut 5 madde aynen kalır
```

Menüden çıkanlar ve nereden erişilecekleri:
- **İşletme Takvimi** → İşletme Takibi'nin sekmesi (zaten öyle)
- **İşletmelerim** → İşletme Takibi sayfasındaki işletme seçicisi (İŞ 4)
- **Kayıtlarım** → Kurslar sayfasında sekme (İŞ 2)
- **Öğrenme Yolu** → Kurslar sayfasındaki koyu panelden (zaten öyle)
- **Pilot Program** → menüden kalkar, route durur
- **Bilgi Nesneleri** → menüden kalkar; ders içinden erişilir
  (`Lesson.knowledgeObjectId` bağı zaten var)
- **Model Laboratuvarı** → Finans Merkezi'nde sekme (İŞ 3)

Sidebar testleri güncellenecek (`Sidebar.test.jsx`).

## İŞ 2 — Kayıtlarım'ı Kurslar'a sekme olarak taşı

Dosyalar: `pages/CoursesPage.jsx`, `pages/EnrollmentsPage.jsx`

- Kurslar sayfasının üstüne (öğrenme yolu panelinin altına) iki sekme:
  **"Tüm Kurslar"** ve **"Kayıtlarım"**.
- "Kayıtlarım" sekmesi `EnrollmentsPage` içeriğini render etsin.
  Bileşeni yeniden yazma — mevcut sayfayı bir bileşen olarak içeri al veya
  içeriğini paylaşılan bir bileşene çıkar.
- `/app/enrollments` route'u ÇALIŞMAYA DEVAM ETSİN (doğrudan gidilirse
  Kurslar sayfasını "Kayıtlarım" sekmesi açık şekilde göstersin).
- "Devam ettiğin kurslar" bölümündeki "Tümünü gör" artık bu sekmeye geçsin.

## İŞ 3 — Model Laboratuvarı'nı Finans Merkezi'ne sekme olarak taşı

Dosyalar: `pages/ToolsPage.jsx`, `pages/FinancialModelLibrary.jsx`

- Finans Merkezi sayfasının üstüne iki sekme:
  **"Hesaplayıcılar"** ve **"Model Laboratuvarı"**.
- İkinci sekme `FinancialModelLibrary` içeriğini render etsin.
- `/app/finance/models` ve `/app/finance/models/:code` route'ları çalışmaya
  devam etsin. Model çalışma alanı (`FinancialModelWorkspace`) ayrı sayfa
  olarak kalsın, sekmeye gömülmesin.

## İŞ 4 — İşletme seçicisi

Dosyalar: `pages/Workspaces/WorkspaceLayout.jsx`, `pages/Workspaces/index.jsx`

- İşletme Takibi sayfasının üst kısmına, işletme adının yanına bir **seçici**
  ekle (dropdown). `WorkspaceContext`'teki `workspaces` listesi ve
  `switchWorkspace` fonksiyonu zaten var, onları kullan.
- **Tek işletme varsa seçiciyi gösterme**, sadece adı yaz.
- Seçicinin altında/sonunda "Yeni işletme oluştur" ve "Tüm işletmeler"
  seçenekleri olsun.
- `/app/workspaces` (liste sayfası) route'u kalsın, oraya seçiciden gidilsin.

## İŞ 5 — Ayarlar sayfasını gerçek ayarlarla doldur

Dosya: `pages/SettingsPage.jsx` + `.module.css`

Şu an sayfada yalnızca kullanıcı adı ve sürüm bilgisi var. Aşağıdaki bölümleri
kur. **Her alan gerçek bir endpoint'e bağlanacak** — bağlanamayan alanı
gösterme.

### Bölüm 1 — Hesap
- Ad (düzenlenebilir — mevcut güncelleme akışı korunsun)
- E-posta (salt okunur)
- Rol (salt okunur, rozet)

### Bölüm 2 — Güvenlik
- Şifre değiştirme formu: mevcut şifre, yeni şifre, yeni şifre tekrar.
- Endpoint İŞ 6'da eklenecek. **İŞ 6'yı önce yap**, sonra buraya bağla.
- Başarı/hata mesajları görünür olsun (toast veya satır içi).

### Bölüm 3 — İşletme Ayarları
Kaynak: `GET/PUT /workspaces/:workspaceId/settings`
(`api.workspace.settings.get/update` — frontend'de zaten tanımlı)

Gerçek alanlar:
- **Saat dilimi** (`timezone`) — seçici, varsayılan `Europe/Istanbul`
- **Dil / bölge** (`locale`) — seçici, varsayılan `tr-TR`
- **Para birimi** (`defaultCurrency`) — 3 harfli, seçici (TRY, USD, EUR)
- **Hafta başlangıcı** (`weekStartsOn`) — 0-6, seçici (Pazar…Cumartesi)

Aktif işletme yoksa bu bölümü gösterme; yerine "Ayarları düzenlemek için
bir işletme profili oluşturun" + yönlendirme.

### Bölüm 4 — Bildirim Tercihleri
Kaynak: aynı endpoint'in `notificationPrefs` alanı (serbest JSON).

**Anahtar uydurma.** Önce `notificationPrefs` içinde bugün hangi anahtarların
yazıldığını kodda ara (`grep -r notificationPrefs src/`). Kullanılan anahtar
varsa onları açma/kapatma anahtarı olarak göster. **Hiç kullanılan anahtar
yoksa bu bölümü hiç ekleme** ve raporda belirt.

### Bölüm 5 — İşletme Profili
Kaynak: `GET/PUT /onboarding/profile` (`api.onboarding.getProfile/updateProfile`)

Endpoint'in gerçekten döndürdüğü alanları göster (sektör, rol, çalışan sayısı
vb. — önce yanıt şeklini kontrol et). Döndürmediği alanı ekleme.

### Bölüm 6 — Uygulama Bilgisi
Mevcut bölüm korunsun (sürüm, backend, veritabanı, bağlantı durumu).

### Düzen
- Her bölüm ayrı kart, kart başlığı + alanlar.
- Masaüstünde iki sütun (sol: Hesap, Güvenlik, İşletme Profili /
  sağ: İşletme Ayarları, Bildirimler, Uygulama Bilgisi), mobilde tek sütun.
- Kaydet butonları bölüm başına, teal.
- Turuncu CTA: **yok** (ayarlar sayfasında tek bir "ana aksiyon" yok).
- Yıkıcı işlem (varsa) bordo ve en altta ayrı bir bölümde.

## İŞ 6 — Şifre değiştirme endpoint'i (TEK backend değişikliği)

Dosya: `src/services/auth.ts` + `frontend/src/services/api.js`

Yeni endpoint: **`PUT /auth/password`** (kimlik doğrulaması zorunlu)

Gereksinimler:
- Gövde: `{ currentPassword, newPassword }`, zod ile doğrula.
- `newPassword` en az 8 karakter.
- Mevcut şifreyi veritabanındaki hash ile **bcrypt.compare** ile doğrula;
  yanlışsa `401` dön, hangi alanın yanlış olduğunu sızdırma.
- Yeni şifreyi aynı bcrypt maliyetiyle hash'le (kayıt akışındaki değerle aynı).
- Yeni şifre eskisiyle aynıysa `422` dön.
- Yanıt gövdesinde şifre veya hash DÖNDÜRME.
- Prisma şeması DEĞİŞMEYECEK, migration YOK — sadece mevcut `password`
  alanı güncellenir.
- `api.js`'e `auth.changePassword(currentPassword, newPassword)` ekle.

Bu endpoint için mevcut auth testlerinin bozulmadığını doğrula.

---

## Bitirince raporla

1. Menüde kaç madde kaldı, hangileri çıktı
2. Kayıtlarım ve Model Laboratuvarı sekmeleri çalışıyor mu, eski route'lar
   hâlâ erişilebilir mi
3. İşletme seçicisi tek işletmede gizleniyor mu
4. Ayarlar'da hangi bölümler eklendi, hangileri veri olmadığı için eklenmedi
5. `notificationPrefs` içinde kullanılan anahtar bulundu mu
6. Şifre değiştirme endpoint'i: doğrulama kuralları ve dönen hata kodları
7. Her iş sonundaki build/test sonucu (referans: 23 dosya, 126 test)
8. Takıldığın veya karar bekleyen noktalar
