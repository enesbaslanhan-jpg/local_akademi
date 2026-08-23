# YAPILACAK İŞ — İşletme Takibi içe aktarımında üç açık ve eksik testler

> 🔴 **BU DOSYA BİR GÖREV TARİFİDİR, RAPOR ŞABLONU DEĞİL.**
> Bu dosyayı **değiştirme, üstüne yazma, silme.** Yapılacak iş
> **kaynak kodu düzeltmek ve test yazmaktır.**
>
> Önceki ajan tam bu işin tarifini taşıyan dosyanın yerine kendi durum
> raporunu yazdı ve "bitti" dedi; **tek satır kod değişmedi**. Ölçüldü:
> `git diff --stat` birebir aynı kaldı. Aynı hataya düşme.
>
> **Bitti demeden önce** en alttaki "Kendi kendini denetle" bölümündeki
> komutları çalıştır ve çıktılarını raporuna yapıştır. O komutlar
> düzeltmenin yapılıp yapılmadığını sayıyla söylüyor.

---

## Proje ve ortam

**LocalKarar** — Türkiye'deki küçük işletmeler için karar destek
uygulaması. Fastify 5 + Prisma/PostgreSQL, React 19 + Vite 6, CSS
Modules. Kod ve yorumlar **Türkçe**. Dal: `design/localkarar-18`.

**Çalışma ağacında commit edilmemiş değişiklikler var** — önceki bir
ajanın yazdığı ~1400 satırlık "İşletme Takibi" işi. **O kodu silme ya
da baştan yazma**; düzeltmeler onun üstüne yapılacak.

⚠️ **Geliştirme sunucusu `watch` YAPMIYOR**
(`node --env-file=.env --import tsx src/server.ts`). Arka uç
değişikliğinden sonra yeniden başlatmazsan **eski kod çalışır**. Bu
tuzak bu depoda iki kez saat kaybettirdi.

### Depo kuralları

1. **Yorumlar NEDENİ anlatır, ne yaptığını değil.** Kod ne yaptığını
   zaten söylüyor. Türkçe yaz.
2. **İkinci uygulama yazılmaz.** Aynı işi yapan ikinci bir yol
   kaçınılmaz olarak ilkinden ayrışır. Mevcut yardımcı varsa o
   kullanılır.
3. **Testin dişi kontrol edilir.** Test yazdıktan sonra düzeltmeyi
   **bilerek geri al** ve testin düştüğünü gör. Düşmüyorsa test bir şey
   korumuyordur.
4. **Ölçmeden iddia edilmez.** "Düzeldi" demeden önce komut çıktısı ya
   da tarayıcı ölçümü göster.

---

## ✅ ÖNCE: doğru yapılmış olanlar — DOKUNMA

Bunları geri alma, "daha iyisini yazayım" deme, yeniden düzenleme:

- **XLSX güvenliği.** Mevcut `inspectZip` yeniden kullanılmış; zip
  bombası, yol kaçışı ve şifreli arşiv kontrolleri bedavaya gelmiş,
  üstüne `xl/workbook.xml` kontrolü eklenmiş.
- **Mentor özeti gerçekten özet.** `mentor-context.ts` içindeki isteme
  müşteri adı, fatura numarası, kayıt başlığı girmiyor; çalışma alanı
  üyeliği de doğrulanıyor.
- **Yasal metin disiplini.** Yalnız aydınlatma metni `2026-08-23.3`'e
  çıkmış, Kullanım Koşulları `.2`'de bırakılmış.
- **Önizleme zorunluluğu** (`previewOnly`) korunmuş.
- **Düzenleme/silme arayüzü** (`KayitDetay.jsx`) çalışıyor.

---

# 🔴 1. İçe aktarımda satır sınırı yok

**Yer:** `src/services/business-tracker.ts` — `records/import` ucu
(`:987` civarı). `rows.length` yalnız `=== 0` için kontrol ediliyor;
**üst sınır hiç yok**.

**Neden önemli:** yazma döngüsü (`:1101`, `for (const row of
validRows)`) her satır için **ayrı bir `prisma.$transaction`** açıyor.
50.000 satırlık bir dosya 50.000 ardışık işlem demek.

Bu, bu depoda **daha önce yaşanmış** bir arızanın aynı sınıfı:
`/admin/stats` aralıklı 500 veriyordu, sebebi 17 sorgunun aynı anda
açılmasıydı ve `src/services/admin.ts` içindeki `partiler()` ile 6'şar
dalgaya bölünerek çözüldü.

**Yapılacak:**

- `src/services/workspace-exports.ts:46`'daki `MAX_EXPORT_ROWS = 5000`
  ile **simetrik** bir üst sınır koy. Dışa aktarım 5000 satır veriyorsa
  içe aktarım da 5000 almalı — kullanıcı kendi dışa aktardığı dosyayı
  geri yükleyebilmeli.
- Sınır aşılınca **sessizce kırpma**: 422 dön, kaç satır olduğunu ve
  sınırın ne olduğunu söyle. Kırpmak 3. maddedeki sessiz veri kaybının
  aynısı olurdu.
- Yazma döngüsü satır başına işlem açmayacak: ya tek işlem içinde toplu
  yazma, ya `partiler()` deseniyle dalgalara bölme.
- ⚠️ `syncAutomaticReminder` **her kayıt için** çalışmaya devam etmeli.
  Atlanırsa hatırlatmalar hiç kurulmaz ve takvim boş kalır.

---

# 🔴 2. İçe aktarım, VAR OLAN yetki kontrolünü atlıyor

**Ölçüm:** `records/import` gövdesinde `validateReferences` **0 kez**
geçiyor. Normal kayıt oluşturma ucu ise onu çağırıyor.

`validateReferences` (`src/services/business-tracker.ts:263`) iki şeyi
doğruluyor:

- cari hesap **bu** çalışma alanına ait ve `active` mi
- görevli **bu** alanın `active` üyesi mi

İçe aktarım bunları atlayıp `contactId`'yi doğrudan yazıyor (`:1117`).
Yani elektronik tabloya **başka bir işletmenin cari hesap UUID'si**
yazılırsa kayıt o cariye bağlanıyor. Bu bir **BOLA** açığı; koruma
zaten yazılmış, tek eksik onu çağırmak.

**Yapılacak:** her satır için `validateReferences` uygula.

⚠️ **Doğrudan çağırma — o fonksiyon `reply` alıp 422 gönderiyor.**
Toplu akışta tek bir kötü satır bütün isteği düşürmemeli:

- Satır bazında **mevcut `errors` dizisine** yaz (satır numarası +
  sebep), o satırı atla, kalanı içeri al.
- Bunun için doğrulamayı `reply`'dan bağımsız kullanılabilir hale
  getirmen gerekebilir. O zaman `reply` yazan sarmalayıcıyı **koru** —
  mevcut çağıranın davranışı değişmeyecek.
- **Önizleme ekranı da bu hataları göstermeli.** Kullanıcı onayladıktan
  sonra "22 satır atlandı" demek geç.

---

# 🔴 3. CSV içe aktarımı satırları SESSİZCE yutuyor

**Yer:** `src/services/business-tracker.ts:1013` —
`parseCsv(document.extractedText)`.

`extractedText`, yüklemede `MAX_EXTRACTED_TEXT_LENGTH` ile **100.000
karakterde kırpılıyor** (sabit: `src/services/documentSecurity.ts:5`,
kırpma: `src/services/documents.ts:133`).

Sonuç: büyük bir CSV'nin sonu düşüyor ve kullanıcı **hiçbir uyarı
görmüyor**. 2000 satır yükleyip 600 kayıt alıyor, farkına varmıyor.
Sessiz veri kaybı, gürültülü hatadan çok daha kötüdür.

XLSX yolunda bu **doğru** çözülmüş: dosya diskten okunuyor ve yorumda
sebebi yazıyor. CSV de aynı yoldan okunacak.

**Yapılacak:**

- CSV'yi `storedName` üzerinden **diskten** oku, `extractedText`'ten
  değil.
- ⚠️ XLSX yolundaki `join(UPLOAD_DIR, document.storedName)` çağrısında
  **yol güvenliği kontrolü yok**. Depoda bu iş için desen var:
  `safeMediaPath` (`src/services/community.ts:252`) ve `safeAvatarPath`
  (`src/services/auth.ts`). `storedName` sunucu ürettiği için bugün
  sömürülebilir değil — ama ikinci bir dosya okuma yolu açıyorsun,
  **iki yol da** aynı korumadan geçsin.
- Kodlama: Türkçe Excel'in CSV çıktısı sık sık **Windows-1254** olur.
  Dosya UTF-8 değilse bozuk metni içeri alma; **anlaşılır bir hata**
  ver.

---

# 🔴 4. Tek bir test yazılmamış

**Ölçüm:** ~1400 satır yeni kod eklendi, değişen dosyalar arasında
**hiç test dosyası yok**. Tam takım `1730` test geçiyor ama bu sayı iş
başlamadan önce de `1730`'du.

Önceki ajan "123 test geçti" diye rapor etti; o 123 test **önceden var
olan** testler ve takımın %7'si. Yukarıdaki üç açığın **üçü de** bir
testle yakalanırdı.

**Yazılacak testler.** Mevcut dosyalara ekle — yeni dosya açma:
`tests/business-tracker.test.ts`, `tests/documents.test.ts`,
`tests/gelen-eposta.test.ts`.

| # | Test | Diş kontrolü — bunu geri alınca test DÜŞMELİ |
|---|---|---|
| 1 | Sınırın üstünde satır içeren dosya 422 alır | satır sınırı |
| 2 | Başka çalışma alanının `contactId`'si içeren satır reddedilir, **kalan satırlar içeri girer** | `validateReferences` çağrısı |
| 3 | 100.000 karakterden uzun CSV'nin **tüm** satırları okunur | diskten okuma |
| 4 | Sahte uzantılı `.xlsx` 415 alır | — (mevcut koruma, kanıtı yok) |
| 5 | Kaydı düzenleyince `syncAutomaticReminder` yeni vadeye taşınır | çağrı |
| 6 | Başka çalışma alanının kaydı düzenlenemez/silinemez | `scopedRecord` (`:249`) |
| 7 | Mentor bağlamında müşteri adı ve kayıt başlığı **BULUNMAZ** | isteme başlık ekle |
| 8 | e-postayla gelen e-Fatura `proposed` öneri üretir | — |

⚠️ **İki tuzak, bu depoda bizzat yaşandı:**

- Test verisi **arşivli** bir kayıt seçerse uç doğru olduğu hâlde 404
  döner ve testi yanlış yere baktırır.
- Tek örnekle yazılan ayrıştırıcı testi **şans eseri** geçebilir —
  alanların sırası tesadüfen uygun olduğu için. Alan sırası bilerek
  değiştirilmiş **ikinci bir örnek** ekle.

---

# 🟡 5. Üç yerde kopya kod (yapılırsa iyi, şart değil)

Depo kuralı 2 gereği:

- **Mentor özeti** (`src/services/mentor-context.ts`),
  `business-tracker.ts:374-413`'teki `/tracker/summary` hesabının satır
  satır kopyası. Bugün aynı sonucu veriyorlar; biri değişince
  **sessizce ayrışırlar**.
- **`documentSuggestion.create` bloğu** artık üçüncü kez kopyalandı
  (`src/services/gelen-eposta.ts`). Ortak bir yardımcıya çıkar.
- `mentor-context.ts` içinde
  `include: { contact: { select: { name } } }` var ama
  **kullanılmıyor**. Müşteri adını isteme yaklaştırmanın hiçbir faydası
  yok — kaldır.

---

# Dosya sınırı

| Dokunulacak | Dokunulmayacak |
|---|---|
| `src/services/business-tracker.ts` | `src/services/community*.ts` |
| `src/services/documents.ts` | `src/services/e-fatura.ts` |
| `src/services/mentor-context.ts` | `frontend/src/content/legal/*` |
| `frontend/src/pages/Workspaces/*` | `deploy/*` |
| `tests/*.test.ts` | `prisma/schema.prisma` |

Şema değişikliği gerekiyorsa **önce sor** — göç sıra numaraları
çakışır. Bu iş için şema değişikliği **gerekmiyor**.

---

# Kendi kendini denetle — bitti demeden ÖNCE

Bu komutları çalıştır ve **çıktılarını raporuna yapıştır**:

```bash
# 1) Satır sınırı kondu mu — 0'dan BÜYÜK olmalı
grep -cE "MAX_IMPORT_ROWS|5000" src/services/business-tracker.ts

# 2) validateReferences içe aktarımda çağrılıyor mu — 0'dan BÜYÜK olmalı
sed -n '/records\/import/,/^  })/p' src/services/business-tracker.ts | grep -c "validateReferences"

# 3) CSV artık extractedText'ten okunmuyor mu — 0 OLMALI
grep -c "parseCsv(document.extractedText)" src/services/business-tracker.ts

# 4) Test eklendi mi — 0'dan BÜYÜK olmalı
git status --short tests/ | wc -l
```

Sonra tam doğrulama:

```bash
npx tsc --noEmit
npx vitest run
cd frontend && npm run test -- --run && npm run build
npm run sql:scan && npm run secret:scan
```

`npx vitest run` **tam takımı** çalıştırır — seçilmiş dosya değil.

**Kabul ölçütü:**

- Yukarıdaki dört sayaç beklenen değerde
- `npx vitest run` **1730'dan fazla** test raporluyor (yeni testler
  eklendiği için) ve hepsi geçiyor
- Her yeni test için **diş kontrolü yapıldı** ve hangi düzeltmeyi geri
  alınca hangi testin düştüğü raporda **tek tek yazılı**
- 375 pikselde içe aktarım ekranında **yatay kayma yok**
- Tarayıcıda gerçek bir Excel yüklendi; önizleme satır sayısını ve
  hatalı satırın **sebebini** gösteriyor

⚠️ Bunları yapmadan "tamamlandı" yazma. Önceki tur tam olarak böyle
kaybedildi.
