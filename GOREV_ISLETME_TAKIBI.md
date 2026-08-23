# GÖREV: İşletme Takibi'ni gerçekten kullanılabilir yapmak

**Depo:** `LocalAkademi_fixed` · **Dal:** `design/localkarar-18`
**Tarih:** 23.08.2026 · **Alıcı:** Nemotron 3

Bu dosya kendi kendine yeterlidir. Başka bir sohbeti okumanıza gerek
yok; ölçümler, dosya yolları, yeniden kullanılacak işlevler, depo
kuralları ve doğrulama adımları burada.

---

## 1. Problem

Ürün sahibinin (Türkiye'de KOBİ'lere yönelik bu uygulamanın sahibi)
tespiti:

> *"Uygulama neredeyse bir takip asistanı ve içinde düzenleme
> yapabileceğimiz hiçbir alan yok. Marketçi her gün al-sat yapıyor;
> çek, senet, fatura, kargo, e-fatura, kredi taksit. Bunları uygulama
> içinde nasıl yükleyecek? Dosyaları tek tek elle mi?"*

Haklı. Kod üzerinde ölçüldü:

| Yetenek | Durum |
|---|---|
| Kayıt oluşturma (tekrarlama dahil) | ✅ çalışıyor |
| Takvim, dışa aktarım, belge→öneri | ✅ çalışıyor |
| **Kaydı DÜZENLEME** | 🔴 Sunucuda `PATCH` var, **arayüz hiç çağırmıyor** |
| **Kaydı SİLME** | 🔴 Sunucuda `DELETE` var, **arayüz hiç çağırmıyor** |
| **Toplu giriş** | 🔴 **Yok** — içe aktarım yalnız yönetici bilgi nesneleri için |
| **Excel yükleme** | 🔴 `xlsx` izin listesinde yok (CSV var) |
| **Mentorun kayıtları görmesi** | 🔴 **Yok** — yalnız ayarlardaki statik profil |
| e-Fatura e-postayla gelince öneri | 🟡 **Yarım** — belge düşüyor, öneri üretmiyor |

### Asıl teşhis

Tek tek eksik özellik değil. **Veri girişi elle ve teker teker.**
Marketçi günde 40 hareket yapıyorsa uygulamayı ikinci gün bırakır.
Takvim, bildirim ve mentor — hepsi DOLU bir veritabanı varsayıyor ama
onu doldurmanın yolu yok.

Düzenleme olmayınca ikinci kilit: yanlış giren kaydı düzeltemiyor,
silemiyor. Veri girse bile hapsolmuş oluyor.

### Ürün sahibinin kararları

| Konu | Karar |
|---|---|
| Veri girişi | **İkisi de** — Excel/CSV içe aktarım VE hızlı satır girişi |
| Mentor | Kayıtları **ÖZET** olarak görsün, ham kayıt değil |
| Sıra | **Önce düzenle/sil**, sonra toplu giriş |

Sıra gerekçesi ürün sahibinin: düzenleme olmadan toplu giriş
tehlikeli — yanlış gelen 200 satırı düzeltemezsin.

---

## 2. Depo kuralları — bu projede böyle yazılıyor

Bunlar biçimsel tercih değil; kod tabanının tamamı böyle ve
uyulmazsa kalan kodla tutarsız bir ada oluşur.

1. **Yorumlar NEDENİ anlatır, NE yaptığını değil.** Kod ne yaptığını
   zaten söylüyor. "Neden böyle yapıldı, alternatifi neden
   seçilmedi, hangi tuzağa düşülmesin diye" yazılır. Dil **Türkçe**.

2. **İkinci uygulama yazılmaz.** Aynı işi yapan ikinci bir yol
   kaçınılmaz olarak ilkinden ayrışır. Mevcut yardımcı varsa o
   kullanılır (§4'te listelendi). Bu turda iki kez yaşandı: dosya
   doğrulama ve belge kaydetme, e-posta kanalı eklenince ortak
   işlevlere çıkarıldı.

3. **Testin dişi kontrol edilir.** Test yazıldıktan sonra düzeltme
   BİLEREK geri alınır ve testin düştüğü görülür. Düşmüyorsa test bir
   şey korumuyordur. Commit iletisinde hangi testin düştüğü yazılır.

4. **Ölçmeden iddia edilmez.** "Düzeldi" demeden önce tarayıcıda ya da
   testte gösterilir. Bu turda birkaç kez ölçüm, önce doğru sanılan
   açıklamayı çürüttü.

5. **Her adımdan sonra tam kontrol:**
   ```
   npx tsc --noEmit
   npx vitest run
   cd frontend && npm run test -- --run && npm run build
   npm run sql:scan
   npm run secret:scan
   ```
   Başlangıç durumu: arka uç **117 dosya · 1730 test**, ön yüz
   **43 dosya · 317 test**. Hepsi geçiyor.

---

## 3. Yapılacak işler

### A. Düzenleme ve silme — arayüz işi, sunucu hazır

`PATCH /workspaces/:workspaceId/records/:recordId` kısmi güncelleme
kabul ediyor (`recordUpdate` zod şeması), `DELETE` de var. İkisi de
`scopedRecord` ile korunuyor. **Yeni uç yazmayın.**

`Tracker.jsx` içindeki `openForm(preset)` zaten ön değer alıyor
(`:143`) — düzenleme için ikinci bir form gerekmiyor: `openForm(record)`
artı hangi kaydın düzenlendiğini tutan bir durum.

Yapılacaklar:
- Kayıt detayı panelinde (`KayitDetay.jsx`) **Düzenle** ve **Sil**.
- Silme onay isteyecek ve **geri alınamaz** olduğunu söyleyecek.
- Kaydedince `BusinessRecordHistory`'ye düşecek — geçmiş zaten
  detayda gösteriliyor, "kim ne değiştirdi" görünür olsun.

⚠️ **`syncAutomaticReminder`** (`business-reminder-worker.ts`) vade
değişince YENİDEN çağrılmalı; yoksa hatırlatma eski tarihte kalır ve
kullanıcı uyarıyı yanlış günde alır.

⚠️ Satırın kendisi detay panelini açıyor. Satır içine düğme
konursa `e.stopPropagation()` şart — yoksa düğmeye basınca panel de
açılır. (Aynı hata bu turda bir kez yapıldı.)

---

### B. Toplu giriş

#### B1. Excel/CSV içe aktarım — asıl kilidi açan iş

Yeni uç: `POST /workspaces/:workspaceId/records/import`

**Akış:** dosya yükle → sütunları eşleştir → **önizle** → onayla.

🔴 **ÖNİZLEME ATLANMAYACAK.** 200 satırı doğrudan yazmak, yanlış
eşleştirilmiş bir sütunu 200 hatalı kayda çevirir. Kullanıcı ne
oluşacağını GÖRMEDEN kaydedilmeyecek. Bu, uygulamanın her yerindeki
ilkeyle aynı: mevcut belge akışında da öneri `proposed` durumunda
bekliyor ve `BusinessRecord` ancak insan onayıyla oluşuyor
(`business-tracker.ts`, `createdById: user.id`).

- `xlsx` `ALLOWED_EXTENSIONS`'a eklenecek (`documentSecurity.ts:24`).
  Okuma için **`exceljs` zaten bağımlılıkta** (dışa aktarımda
  kullanılıyor) — yeni kütüphane eklemeyin.
- Dosya doğrulaması mevcut **`dosyayiDogrula()`** üzerinden; ikinci
  bir kapı açmayın. `xlsx` eklenince sihirli bayt kontrolü de
  gerekir (XLSX bir ZIP'tir: `50 4b 03 04`), `inspectZip` deseni var.
- Satır doğrulaması mevcut **`recordInput`** zod şemasıyla.
- Hatalı satır atlanacak ve **sebebi kullanıcıya gösterilecek**,
  sessizce düşürülmeyecek. Mesaj eyleme dönük olsun:
  `"3. satır: tarih okunamadı (32.13.2026)"`.
- Üst sınır `MAX_EXPORT_ROWS` (5000) ile simetrik tutulsun.

#### B2. Hızlı satır girişi

Günlük tek tük kayıt için: form her seferinde kapanıp açılmasın, tablo
gibi alt alta yazılabilsin. Aynı `recordInput` şeması, aynı uç.

---

### C. Mentor işletme özetini görsün

`conversation.ts:194` mentor bağlamını kuruyor. Şu an yalnız
`businessProfile` gidiyor — kullanıcının AYARLARDA elle yazdığı aylık
satış/gider. Gerçek kayıtları görmüyor, bu yüzden *"3 geciken ödemen
var"* diyemiyor.

**Mevcut `GET /workspaces/:id/tracker/summary` çıktısı yeniden
kullanılacak** — sayımlar, 30 günlük borç/alacak ve `awaitingDirection`
orada zaten hesaplanıyor.

🔴 **ÖZET GÖNDERİLECEK, HAM KAYIT DEĞİL** (ürün sahibi kararı).
Sayılar ve toplamlar gidiyor; **müşteri adı, fatura numarası, kayıt
başlığı GİTMİYOR.** Gerekçe: cevabın işe yaraması için toplamlar
yeterli, ve dışarıya (Mistral AI, Fransa) aktarılan işletme verisi
asgaride kalıyor.

⚠️ **YASAL METİN ETKİSİ — atlanmayacak.** Aydınlatma metninde
(`frontend/src/content/legal/privacy.js`) "AI Mentor" satırı şu an
yalnız işletme profilinden söz ediyor. Özet de gidince o satır
güncellenmeli ve `src/config/legal-documents.ts` içindeki `privacy`
sürümü artırılmalı (biçim: `YYYY-MM-DD` ya da `YYYY-MM-DD.N`).

Bu turun dersi buydu: metin ile özellik AYNI turda güncellenmeli.
Aksi hâlde kullanıcıdan kısa aralıkla iki kez onay istenir ve onay
anlamsızlaşır.

---

### D. e-Fatura e-postayla gelince öneri üretsin

Ölçüldü: `src/services/gelen-eposta.ts` `belgeyiKaydet()` çağırıyor
ama `buildDocumentSuggestion()` **hiç çağrılmıyor**. Öneri yalnız
`PATCH /workspaces/:id/documents/:documentId` içinde üretiliyor
(`business-tracker.ts:707`).

Sonuç: e-postayla gelen fatura "Belgeler"e düşüyor, kullanıcı elle
kategorisini atayana kadar kayıt önerisi çıkmıyor — kanalın vaat
ettiği "otomatik" kısım gerçekleşmiyor.

Aynı üretim çağrısı e-posta yolunda da yapılacak. İşletmenin vergi
numarası (`BusinessWorkspace.taxNumber`) zaten biliniyor, dolayısıyla
`faturaYonu()` (`e-fatura.ts`) ile yön de belirlenebiliyor.

---

### E. 🔴 ERGONOMİ — ayrı madde, çünkü asıl şikâyet bu

Ürün sahibinin sözleri: *"gereken şeyler biraz da ergonomik yani
kullanışlı olması; bu haliyle kullanım zor ve anlaşılması güç bir hale
geliyor."*

Bu, A–D'nin üstüne eklenen bir süs değil, **kabul ölçütü.** Yeni
özellik eklerken ekranı daha da karmaşıklaştırmak başarısızlıktır.

- **Takip ekranı ilk bakışta anlaşılsın.** Kullanıcı "bugün ne
  yapmalıyım" sorusunun cevabını aramak zorunda kalmasın.
- **Sık yapılan iş en az tıkla yapılsın.** Kayıt eklemek, düzeltmek ve
  tamamlamak birer tık olsun; menü içinde kaybolmasın.
- **Boş ekran ne yapacağını söylesin.** "Henüz kayıt yok" yetmez;
  "Excel'den içeri aktar" ya da "ilk kaydı ekle" oradan başlasın.
- **Hata mesajı ne yapılacağını söylesin.** "Geçersiz satır" değil,
  "3. satırda tarih okunamadı: 32.13.2026".
- **Terimler tek olsun.** Aynı şeye bir yerde "kayıt", başka yerde
  "yükümlülük", başka yerde "iş" denmesin.

⚠️ Ölçüm şart: her ekran **375 pikselde ve masaüstünde** denenecek,
yatay kayma OLMAYACAK:
```js
document.documentElement.scrollWidth - document.documentElement.clientWidth  // 0 olmalı
```

---

## 4. Yeniden kullanılacak — yeniden yazılmayacak

| İhtiyaç | Mevcut yer |
|---|---|
| Kayıt güncelleme / silme ucu | `business-tracker.ts:460` (PATCH), `:540` (DELETE) |
| Kayıt doğrulama şeması | `recordInput` / `recordUpdate` — `business-tracker.ts` |
| Yetki + çalışma alanı kapsamı | `access()`, `scopedRecord()` — `business-tracker.ts` |
| Kayıt çıktısı (`overdue` hesabı dahil) | `recordJson()` — `business-tracker.ts:67` |
| Form (ön değer alıyor) | `openForm(preset)` — `Tracker.jsx:143` |
| Kayıt detay paneli | `frontend/src/pages/Workspaces/KayitDetay.jsx` |
| Dosya kabul kapısı | `dosyayiDogrula()` — `documentSecurity.ts` |
| Belge işleme + kayıt | `belgeyiKaydet()` — `documents.ts` |
| Öneri üretimi | `buildDocumentSuggestion()` — `document-suggestions.ts` |
| e-Fatura ayrıştırma / yön | `ublFaturasiniAyristir()`, `faturaYonu()` — `e-fatura.ts` |
| Hatırlatma eşitleme | `syncAutomaticReminder()` — `business-reminder-worker.ts` |
| İşletme özeti (C maddesi için) | `GET /:workspaceId/tracker/summary` |
| XLSX okuma/yazma | `exceljs` — zaten bağımlılıkta |
| Dosya paylaş/indir | `frontend/src/utils/dosyaPaylas.js` |

---

## 5. 🔴 Dosya sınırı — çakışmayı önlemek için

| Dokunulur | Dokunulmaz |
|---|---|
| `src/services/business-tracker.ts` | `src/services/gelen-eposta.ts` |
| `src/services/document-suggestions.ts` | `src/services/e-fatura.ts` |
| `src/services/documentSecurity.ts` (yalnız `xlsx`) | `src/services/community*.ts` |
| `src/services/conversation.ts` (C maddesi) | `deploy/*` |
| `frontend/src/pages/Workspaces/*` | `src/index.ts` |
| `frontend/src/content/legal/privacy.js` (C maddesi) | |
| `tests/business-tracker.test.ts` ve yeni test dosyaları | |

`prisma/schema.prisma` gerekirse **önce sorulacak** — iki taraf da göç
yazarsa sıra numaraları çakışır. Şu an 30 göç var.

---

## 6. Bilinen tuzaklar — bu turda bizzat yaşandı

- **Geliştirme sunucusu `watch` YAPMIYOR**
  (`node --env-file=.env --import tsx src/server.ts`). Arka uç
  değişikliği sonrası yeniden başlatılmazsa ESKİ kod çalışır. Bu
  turda iki kez saat kaybettirdi.

- **Grid ve flex öğeleri `min-width: auto` ile gelir** ve içeriğinden
  dar olmayı reddeder. `overflow-x: auto` tek başına yetmez;
  `min-width: 0` gerekir. Bu turda iki ayrı yatay kayma bunun
  yüzündeydi.

- **Sabit sütun sayısı yazmayın.** `grid-template-columns: repeat(3,…)`
  yazılmış bir şeride dördüncü öğe eklenince kart taştı.
  `grid-auto-flow: column` sayıdan bağımsızdır.

- **`/admin/stats` aralıklı 500 veriyordu**; sebep 17 sorgunun aynı
  anda açılmasıydı (bağlantı reddi, havuz tükenmesi DEĞİL — ölçüldü).
  `partiler()` yardımcısıyla 6'şar dalgaya bölündü. Aynı deseni
  tekrarlamayın.

- **Prisma şemasında `/* */` yorum ÇALIŞMAZ**, yalnız `//`.
  Doğrulama P1012 ile düşer ve göç sessizce uygulanmaz.

- **Test verisinde bilerek arşivlenmiş kayıtlar var.**
  `findFirst` ile kayıt seçen testler `archivedAt: null` koymazsa
  aralıklı 404 alır.

---

## 7. Doğrulama

- **A:** Tarayıcıda bir kaydın tutarı değiştirilecek ve listede
  değiştiği görülecek. Vade değiştirilince hatırlatmanın da YENİ
  tarihe taşındığı veritabanından doğrulanacak.
  **Diş kontrolü:** `syncAutomaticReminder` çağrısı kaldırılınca test
  düşmeli.
- **A / BOLA:** başka çalışma alanının kaydı düzenlenemez ve
  silinemez (403/404). Diş kontrolü: `scopedRecord` kaldırılınca test
  düşmeli.
- **A ergonomi:** düğmeye basınca detay paneli AÇILMAMALI
  (`stopPropagation`).
- **B1:** Gerçek bir Excel dosyası yüklenecek; önizlemede satır sayısı
  ve örnek satırlar görülecek; onaylanınca o kadar kayıt oluşacak.
  Hatalı satırın **sebebiyle birlikte** gösterildiği doğrulanacak.
- **B1 güvenlik:** sahte uzantılı `.xlsx` (içeriği ZIP olmayan) 415
  almalı.
- **C:** Mentora "geciken ödemem var mı" sorulacak; cevabın gerçek
  sayıyı içerdiği görülecek. Ayrıca gönderilen bağlamda **müşteri adı
  ya da kayıt başlığı BULUNMADIĞI** doğrulanacak.
- **C:** Sürüm artınca mevcut bir hesapta yeniden onay ekranı
  çıkmalı.
- **D:** e-postayla gelen fatura, elle yüklenmiş gibi onay bekleyen
  öneri üretmeli.
- **E:** Her yeni/değişen ekran 375 px ve masaüstünde açılacak, yatay
  kayma 0 olacak.
- Tam takım temiz (§2.5).

---

## 8. Kapsam dışı — bilerek

- **Uygulama içinde Excel DÜZENLEME.** Elektronik tablo düzenleyicisi
  yazmak ayrı bir üründür. İhtiyaç "Excel'deki veriyi içeri almak";
  düzenleme uygulamanın kendi kayıt ekranında yapılır.
- **Gelen e-posta kanalının kalan sorunları** (adres çok uzun,
  güvenilir gönderen listesi yok). Kanal beklemede; D maddesi yalnız
  yarım kalan öneri üretimini tamamlıyor.
- **İçerik boşluğu** (çek/senet, e-imza, irsaliye için sıfır içerik —
  ölçüldü). Uygulama "Senet" kayıt türü sunuyor ama senedin ne
  olduğunu anlatan tek bir içerik yok. Ürün sahibi bunu ayrı ve kolay
  bir iş olarak görüyor (içe aktarma özelliği zaten var).
- **Bildirim derinleştirme** (geciken için ikinci uyarı). B ve C'den
  sonra.
- **Sağlayıcı başına muhasebe entegrasyonu** (Paraşüt, Logo, Zirve).
  Ayrı ve büyük bir iş; e-Fatura XML yolu şu an o ihtiyacın büyük
  kısmını karşılıyor.
