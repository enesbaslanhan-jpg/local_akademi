# YAPILACAK — PayTR başvuru seti

> ## ⛔ ÖNCE BUNU OKU
>
> 1. **BU DOSYAYI DEĞİŞTİRME.** Üstüne rapor yazma, silme. Yapılacak
>    iş **KOD ve METİN**.
> 2. **Git commit / push YAPMA.**
> 3. 🔴 **HUKUKİ METİN YAZIYORSUN.** Uydurma bilgi buraya girerse
>    yanlış beyan olur. Aşağıdaki "Bilmediğin şeyi yazma" bölümü
>    bağlayıcıdır.
> 4. Sonda **"Kendi kendini denetle"** var. Sayı vermeyen "bitti"
>    kabul edilmiyor.

---

## Bu ne işe yarıyor

Ürün sahibi **bireysel PayTR sanal POS + abonelik** başvurusu yapacak.
PayTR başvuru koşulları sitede şu sayfaların **canlı** olmasını şart
koşuyor: Gizlilik, Mesafeli Satış, Teslimat ve İade, Hakkımızda,
İletişim.

Bu tur **yalnızca başvuruyu açan seti** üretiyor. **Ödeme kodu, Prisma
şeması ve PayTR entegrasyonu bu turda YOK** — merchant bilgileri
gelmeden uçtan uca doğrulanamaz, sonraki tur.

### Ürün modeli (ürün sahibi kararı)

| | |
|---|---|
| Abonelik birimi | **Kullanıcı başına** — kullanıcı öder, tüm işletmelerinde kullanır |
| Fiyat akışı | **30 gün ücretsiz → 3 ay 149 TL/ay → sonrası 299 TL/ay** |
| Deneme bitince | **Salt okunur mod** — veri görünür ve dışa aktarılabilir kalır; yeni kayıt/hesaplama/mentor kapanır |
| Satıcı | **Gerçek kişi (bireysel)** — Enes Buğra Aslanhan |

---

## 🔴 Bilmediğin şeyi YAZMA

Aşağıdakiler **senin bilmediğin** ve **uydurmaman gereken** verilerdir.
Her birini kodda `TODO_URUN_SAHIBI:` işaretiyle bırak, ürün sahibi
dolduracak:

| Alan | Neden sen yazamazsın |
|---|---|
| **Açık posta adresi** | Ürün sahibinin ev adresi. Elinde yok. `TODO_URUN_SAHIBI: acik adres` bırak |
| **Telefon numarası** | Elinde yok |
| **TC / vergi kimlik no** | Elinde yok |
| **PayTR merchant bilgileri** | Henüz başvuru yapılmadı |
| **Ücretlendirmenin başlayacağı kesin tarih** | Ödeme akışı yok |

⚠️ Bunlara **örnek/temsili değer koyma.** "Örn: 0555 555 55 55" bile
yazma — gerçek sanılır. Sadece `TODO_URUN_SAHIBI:` işareti bırak.

Öte yandan **bunlar biliniyor**, mevcut dosyalardan al:

- Veri sorumlusu adı: `frontend/src/content/legal/privacy.js:40,44`
- Başvuru e-postası `kvkk@localkarar.com`: `privacy.js:46`
- Yurt dışı aktarım tablosu (OVH/Fransa, Mistral/Fransa, Resend/İrlanda,
  Cloudflare): `privacy.js` içindeki mevcut tablo — **oradan kopyala,
  yeniden araştırma**
- İşlenen veri kategorileri: `privacy.js`
- Modül anlatımları: `frontend/src/pages/AboutPage.jsx` `MODULLER` dizisi

---

## ⚠️ Önce çakışmayı kontrol et

`YAPILACAK_I18N_TAMAMLAMA_2.md` görevi **aynı 4 dosyaya dokunuyor**
(`AboutPage.jsx`, `SupportPage.jsx`, `PasswordResetPage.jsx`,
`AuthPage.jsx` — hepsinin sayfa-içi footer'ı var).

**O iş bitmeden bu işe başlama.** Bittiyse şu doğrulamayı yap:

```bash
node scripts/check-i18n.mjs        # gecmeli
cd frontend && npx vitest run      # 54 dosya / 388 test taban
```

---

## A. Dört yeni yasal belge

`LegalDocumentType` union'ı genişletilecek. **Migration YOK** —
`UserConsent.documentType` serbest `String` (`prisma/schema.prisma:143`).

| Slug / route | Başlık | requiredAtSignup |
|---|---|---|
| `/mesafeli-satis` | Mesafeli Hizmet Sözleşmesi | `false` |
| `/on-bilgilendirme` | Ön Bilgilendirme Formu | `false` |
| `/teslimat-iade` | Teslimat, İptal ve İade Koşulları | `false` |
| `/abonelik` | Abonelik ve Faturalandırma Koşulları | `false` |

🔴 **Dördü de `requiredAtSignup: false` OLACAK.** Bunlar kayıt anında
değil **satın alma anında** onaylanır. `true` yaparsan:
`src/services/auth.ts:181-187` her required belgeye otomatik onay
satırı yazar → kayıt formundaki "Kullanım Koşulları ve Aydınlatma
Metni'ni okudum" etiketi **yalan olur** ve `ConsentBanner` mevcut tüm
kullanıcılara çıkar. Yapma.

### Belge başına dokunulacak 6 yer

1. `frontend/src/content/legal/<slug>.js` — **yeni dosya**
2. `src/config/legal-documents.ts:16` — union'a slug ekle;
   `LEGAL_DOCUMENTS` dizisine `{ type, title, version: 'YYYY-MM-DD',
   requiredAtSignup: false }` girdisi
3. `frontend/src/pages/LegalPage.jsx:29-33` — `BELGELER` haritasına
   `{ icon, baslik, icerik }` (ikon: `lucide-react`)
4. `frontend/src/router/index.jsx:85-87` yanına public route
5. `frontend/src/pages/SettingsPage.jsx:455` — `legalLinks` (elle yazılı)
6. Ortak footer (**C bölümü** — 4 kopya yerine tek yer)

### İçerik modülü şekli (mevcut desen, aynen izle)

```js
export default {
  giris: 'giris paragrafi',
  bolumler: [
    {
      id: 'kebab-slug',            // zorunlu: capa + React key + icindekiler
      baslik: '1. Bolum basligi',  // zorunlu
      paragraflar: ['...'],        // istege bagli
      tanimlar: [['Terim','Tanim']], // istege bagli -> <dl>
      tablo: { basliklar: [...], satirlar: [[...]] }, // istege bagli
      liste: ['madde'],            // istege bagli
      son: ['kapanis paragrafi']   // istege bagli
    }
  ]
}
```

Render sırası sabit: `paragraflar → tanimlar → tablo → liste → son`.
Bölüm numarası (`1.`, `2.`) **elle** `baslik` içine yazılır.

⚠️ Her dosyanın başına, mevcut `privacy.js`/`terms.js` gibi, **neden
böyle yazıldığını** anlatan Türkçe blok yorum koy.

### İçerik kuralları

- 🔴 **Fiziksel teslimat dili KULLANMA.** Kargo, gönderi, teslim
  tarihi yok. Hizmet ifası şu: *"Ödeme onaylandığında üyelik hakları
  kullanıcının LocalKarar hesabında elektronik ortamda derhal aktive
  edilir."*
- 🔴 **Cayma hakkını toptan reddetme.** "Dijital hizmettir, iade
  yoktur" yazma. Mesafeli Sözleşmeler Yönetmeliği dijital hizmetlerde
  istisna tanıyor ama **koşullu**: tüketicinin açık onayı + ifaya
  başlanmış olması + cayma hakkının kaybedileceğinin **önceden
  bildirilmiş** olması. Metni bu üç koşulu kuracak şekilde yaz.
- **30 günlük ücretsiz deneme ile ücretli dönem ilişkisi açık
  olacak:** cayma süresi **ücretli dönemin başladığı tarihten** işler.
- **Kampanya düzeni açıkça yazılacak:** 30 gün ücretsiz → 3 ay
  149 TL/ay → sonrası 299 TL/ay. Fiyat değişikliği bildirimi de.
- **Ön Bilgilendirme Formu** şunları içermeli: hizmetin temel
  nitelikleri, satıcı kimliği, toplam ücret (vergiler dahil), ödeme
  yöntemi, ifa koşulları, cayma hakkı ve istisnaları, şikâyet/başvuru
  kanalı.
- **Otomatik yenileme HENÜZ YOK.** Metinde "her ay otomatik yenilenir"
  **yazma**. Şimdilik: *"Üyeliğin devam etmesi için her dönem ödeme
  yapılması gerekir."* Recurring açılınca ayrı sürümle değişecek.

---

## B. İki mevcut belgeyi güncelle

### `frontend/src/content/legal/privacy.js`

Eklenecek:
- Yeni veri kategorisi: **ödeme işlemi verisi** — tutar, tarih, sipariş
  numarası, işlem durumu, maskeli kart bilgisi (son 4 hane)
- **PayTR** mevcut aktarım tablosuna yeni satır (yurt içi)
- Fatura yükümlülüğü kapsamında saklanan veriler ve **yasal saklama
  süresi**
- 🔴 `:50-51`'deki *"Açık posta adresi bu sayfada yayımlanmamaktadır"*
  cümlesi **kaldırılacak** ve kimlik tablosuna açık adres satırı
  eklenecek (`TODO_URUN_SAHIBI` ile)

⚠️ **"Kart bilgisi saklanmıyor" cümlesini ŞİMDİ YAZMA.** Bu ancak
PayTR'nin barındırdığı ödeme sayfası / iFrame kullanılırsa doğrudur ve
o mimari henüz seçilmedi. Ödeme turunda, mimari kesinleşince yazılacak.

### `frontend/src/content/legal/terms.js`

Dosyanın `:14-16`'daki kendi talimatı:

> *"Abonelik, ödeme ve reklam maddeleri BİLEREK YOK... Eklendiğinde
> ayrı bölüm yazılıp sürüm artırılacak."*

Yeni bölüm: abonelik, ücretlendirme, yenileme, iptal, hizmetin askıya
alınması, salt okunur moda geçiş.

### Sürüm

`src/config/legal-documents.ts` — `privacy` ve `terms` sürümü
**bir kez** artacak (bugünün tarihi). `cookies` **değişmiyorsa
artırma**.

⚠️ Sürüm artınca mevcut tüm kullanıcılara **kapatılamaz**
`ConsentBanner` çıkar. Bu beklenen davranış — mekanizma çalışıyor.

---

## C. Ortak `PublicFooter` bileşeni

🔴 Şu an **ortak footer YOK.** Dört kopya var:
`AboutPage.jsx:219-230`, `AuthPage.jsx:285-293`,
`PasswordResetPage.jsx:51-53`, `SupportPage.jsx:359-364`.
Ve **`LegalPage.jsx`'in hiç footer'ı yok** — `/terms`'e düşen ziyaretçi
başka hiçbir yasal sayfaya gidemiyor. PayTR incelemesi için bu kabul
edilemez.

Yeni: `frontend/src/components/layout/PublicFooter.jsx` + `.module.css`

Bağlantılar: Fiyatlar · Hakkımızda · Yardım ve İletişim · Gizlilik ·
Kullanım Koşulları · Mesafeli Hizmet Sözleşmesi · Ön Bilgilendirme ·
Teslimat/İptal/İade · Abonelik Koşulları · Çerezler
\+ satıcı kimlik bloğu (`TODO_URUN_SAHIBI` alanlarıyla).

**Dört kopya bununla değiştirilecek** ve **`LegalPage.jsx`'e de
eklenecek**.

⚠️ **Palet:** `frontend/src/styles/auth-surface.css` içindeki
`--auth-*` değişkenleri kullanılacak. Uygulamanın genel `--text` /
`--surface-*` token'ları **KULLANILMAYACAK** — bu daha önce koyu modda
beyaz-üstüne-beyaz hatasına yol açtı, palet o yüzden bilerek ayrıldı
(`auth-surface.css:1-16`).

⚠️ Public sayfalar uygulama UI kitini kullanmıyor: `Button`, `Card`,
`PageHead` **yok**; `BrandMark` + yerel CSS-module sınıfları var.
Footer da bu düzeni izleyecek.

**i18n:** Footer **bağlantı etiketleri** i18n'e bağlanacak
(`common` namespace). Yasal belge **gövdeleri** Türkçe kalacak —
`content/legal/*` bilerek i18n dışında.

---

## D. `/fiyatlar` sayfası

Yeni public route + `frontend/src/pages/PricingPage.jsx` +
`PricingPage.module.css`.

İçerik: plan tablosu (30 gün ücretsiz → 3 ay 149 TL → 299 TL), neyin
dahil olduğu, kısa SSS, yasal metinlere bağlantı.

⚠️ Tasarım: `AboutPage.module.css` desenini izle — üstte gradyan bant,
gövdede düz `--auth-page`. **Kayıtlı kısıt** (`AboutPage.module.css:8-16`):
gradyan hero bandının dışına taşırılmayacak.

### 🔴 Dürüstlük kısıtı

Ödeme akışı **henüz yok**. Bu sayfa satın alınamayan bir şeyi
satıyormuş gibi görünmemeli.

Depo bu hatayı bir kez yaptı: *"Ayarlar → Dil"* İngilizce sunuyordu
ama arayüz Türkçe kalıyordu; yanlış vaat olarak işaretlenip
düzeltilmesi gerekti.

Bu turda:
- CTA **"Ücretsiz başla" → `/register`** (bugün doğru)
- **"Şimdi satın al" düğmesi KOYMA**
- Ücretlendirmenin ne zaman başlayacağı açıkça yazılacak

---

## E. İletişim ve satıcı kimliği

`frontend/src/pages/SupportPage.jsx` — şu an telefon, adres, kimlik
bloğu **hiç yok**; yalnız iletişim formu ve `kvkk@localkarar.com` var.

- Satıcı kimlik bloğu eklenecek (`TODO_URUN_SAHIBI` alanlarıyla)
- Mevcut form ve SSS **korunacak**
- `SSS` dizisi (`:24-81`) şu sorularla genişletilecek: "Nasıl ödeme
  yaparım", "İptal edersem verilerime ne olur", "Deneme bitince ne
  oluyor"

---

## Depo kuralları

1. **Yorumlar NEDENİ anlatır**, ne yaptığını değil. Dil: **Türkçe**.
2. **İkinci uygulama yazılmaz** — `Bolum` renderer'ı, `LegalModal`,
   `BELGELER` haritası zaten var, yeniden yazma.
3. **Testin dişi kontrol edilir.**
4. **Ölçmeden iddia edilmez.**

---

## Bilinen tuzaklar

- **`LegalPage.jsx:35-41` `surumuTarihEt`** yalnız `YYYY-MM-DD`
  ayrıştırıyor; `2026-08-25.2` gibi revizyon ekli sürümde **tarih hiç
  görünmüyor**. Yeni sürümleri düz `YYYY-MM-DD` yaz.
- **`LegalPage.jsx:92`** bilinmeyen `type` için sessizce `privacy`'ye
  düşüyor — route eklemeyi unutursan hata almazsın, yanlış belge
  görürsün.
- **`BELGELER` anahtarları `LegalDocumentType` ile birebir aynı
  olmalı**, yoksa sürüm/tarih eşleşmez.
- **Başlık iki yerde:** `BELGELER[x].baslik` (ön yüz) ve
  `LEGAL_DOCUMENTS[].title` (arka uç). İkisini de yaz.
- `grep -c` sıfır eşleşmede hata koduyla çıkar; `|| true` ekle.

---

## Kendi kendini denetle

```bash
# 1. i18n bekcisi
node scripts/check-i18n.mjs

# 2. Tip kontrolu
cd frontend && npx tsc --noEmit

# 3. Testler — 54 dosya / 388 test taban, ALTINA dusmemeli
cd frontend && npx vitest run

# 4. Arka uc testleri (legal-consent dahil)
npx vitest run tests/legal-consent.test.ts

# 5. Uretim derlemesi
cd frontend && npm run build

# 6. Dort yeni belge legal-documents.ts'te mi? (4 beklenir)
grep -cE "mesafeli-satis|on-bilgilendirme|teslimat-iade|abonelik" src/config/legal-documents.ts || true

# 7. Hicbiri requiredAtSignup: true olmamali -> 2 beklenir (terms+privacy)
grep -c "requiredAtSignup: true" src/config/legal-documents.ts || true

# 8. Kopya footer kaldi mi? (0 beklenir)
grep -lE "styles\.(alt|footer|altBaglantilar)\b" frontend/src/pages/AboutPage.jsx frontend/src/pages/AuthPage.jsx frontend/src/pages/PasswordResetPage.jsx frontend/src/pages/SupportPage.jsx || true

# 9. Uydurulmus veri kaldi mi? Hepsi TODO_URUN_SAHIBI olmali
grep -rn "TODO_URUN_SAHIBI" frontend/src/ | wc -l

# 10. "otomatik yenilenir" yazilmis mi? (0 beklenir)
grep -rn "otomatik yenilen" frontend/src/content/legal/ || true
```

### Kabul ölçütleri

| # | Ölçüt |
|---|---|
| 1 | `check-i18n.mjs` geçiyor |
| 2 | `npx tsc --noEmit` temiz |
| 3 | Ön yüz testleri **54 dosya · 388 testin altına düşmemiş** |
| 4 | `tests/legal-consent.test.ts` geçiyor |
| 5 | `npm run build` başarılı |
| 6 | Denetim 6 → **4**, denetim 7 → **2** |
| 7 | Denetim 8 → **boş** (kopya footer kalmadı) |
| 8 | Denetim 9 → **>0** ve hiçbir yerde uydurulmuş adres/telefon/vergi no **yok** |
| 9 | Denetim 10 → **boş** |
| 10 | Tarayıcıda çıkış yapmış halde: `/`, `/fiyatlar`, `/hakkinda`, `/yardim`, `/privacy`, `/terms`, `/cookies` ve **dört yeni belge** açılıyor; **hepsinde footer var**; `/terms`'ten `/mesafeli-satis`'a tıklayarak gidilebiliyor |
| 11 | `/fiyatlar`'da çalışmayan "satın al" düğmesi **yok** |
| 12 | Sürüm artışı sonrası mevcut hesapta yeniden onay şeridi çıkıyor |
| 13 | Git commit / push **yapılmadı** |

### Raporlama

- Kaç yeni belge, kaç bölüm yazıldı
- `TODO_URUN_SAHIBI` kaç yerde bırakıldı (ürün sahibi dolduracak)
- Test: önce → sonra
- Sürüm: `privacy` ve `terms` hangi tarihe çıktı
- **Emin olamadığın hukuki ifadeleri ayrıca listele** — ürün sahibi
  (maliyeci, hukuk eğitimli) onları gözden geçirecek. Tahmin edip
  sessizce yazma.
