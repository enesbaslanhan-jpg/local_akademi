# GÖREV — İşletme Takibi: dört düzeltme

Bu, `GOREV_ISLETME_TAKIBI.md` işinin **denetim sonrası düzeltme
turu**. İş büyük ölçüde doğru yapıldı; aşağıdaki dördü tarifin dışına
çıktı. Hepsi çalışan kod üzerinde **ölçülerek** bulundu, tahmin değil.

Değişiklikler henüz **commit edilmedi** — çalışma ağacında duruyorlar.
Düzeltmeler aynı ağaç üzerinde yapılacak.

---

## ✅ Önce: doğru yapılanlar — bunlara DOKUNMA

Bunları geri alma ya da "daha iyisini yazayım" deme:

- **XLSX güvenliği.** Mevcut `inspectZip` yeniden kullanılmış; zip
  bombası, yol kaçışı ve şifreli arşiv kontrolleri bedavaya gelmiş,
  üstüne `xl/workbook.xml` kontrolü eklenmiş. Doğru karar.
- **Mentor özeti gerçekten özet.** İsteme müşteri adı, fatura numarası
  ya da kayıt başlığı girmiyor; çalışma alanı üyeliği de doğrulanıyor.
- **Yasal metin disiplini.** Yalnız aydınlatma metni `2026-08-23.3`'e
  çıkmış, Kullanım Koşulları `.2`'de bırakılmış — sadece değişen
  metnin sürümü artmış. Doğru.
- **Önizleme zorunluluğu** korunmuş.

---

## 🔴 1. İçe aktarımda satır sınırı yok

**Yer:** `src/services/business-tracker.ts:1025` civarı — `rows.length`
yalnız `=== 0` için kontrol ediliyor, üst sınır hiç yok.

**Neden önemli:** aşağıdaki döngü her satır için **ayrı bir
`prisma.$transaction`** açıyor (`:1100` civarı). 50.000 satırlık bir
dosya 50.000 ardışık işlem demek.

Bu, bu depoda **daha önce yaşanmış bir arıza**: `/admin/stats` aralıklı
500 veriyordu, sebebi 17 sorgunun aynı anda açılmasıydı ve
`partiler()` ile 6'şar dalgaya bölünerek çözüldü. Aynı sınıftan bir
hata.

**Yapılacak:**

- `workspace-exports.ts:46`'daki `MAX_EXPORT_ROWS = 5000` ile
  **simetrik** bir üst sınır. Dışa aktarım 5000 satır veriyorsa içe
  aktarım da 5000 almalı — kullanıcı kendi dışa aktardığı dosyayı geri
  yükleyebilmeli.
- Sınır aşılınca **sessizce kırpma**: 422 dön ve kaç satır olduğunu,
  sınırın ne olduğunu söyle. Kırpmak, 3. maddedeki sessiz veri
  kaybının aynısı olurdu.
- Yazma döngüsü tek tek işlem açmayacak. Ya tek işlem içinde toplu
  yazma, ya da `admin.ts`'teki `partiler()` deseniyle dalgalara bölme.
  ⚠️ `syncAutomaticReminder` her kayıt için çalışmaya devam etmeli —
  atlanırsa hatırlatmalar hiç kurulmaz.

---

## 🔴 2. İçe aktarım, VAR OLAN yetki kontrolünü atlıyor

**Ölçüm:** `records/import` gövdesinde `validateReferences` **0 kez**
geçiyor. Normal oluşturma ucu ise onu çağırıyor.

`validateReferences` (`business-tracker.ts:263`) iki şeyi doğruluyor:

- cari hesap **bu** çalışma alanına ait ve `active` mi
- görevli **bu** alanın `active` üyesi mi

İçe aktarım bunları atlayıp `contactId`'yi doğrudan yazıyor
(`:1117`). Yani elektronik tabloya **başka bir işletmenin cari hesap
UUID'si** yazılırsa kayıt o cariye bağlanıyor.

Bu, tarifte "BOLA" başlığıyla uyarılan açığın kendisi. Koruma zaten
yazılmış; tek eksik onu çağırmak.

**Yapılacak:** her satır için `validateReferences` uygula. Dikkat: o
fonksiyon `reply` alıp doğrudan 422 gönderiyor — toplu akışta tek bir
kötü satır bütün isteği düşürmemeli. **Satır bazında hata listesine
yaz** (mevcut `errors` dizisine, satır numarası ve sebebiyle), o satırı
atla, kalanı içeri al. Bunun için fonksiyonu `reply`'dan bağımsız
kullanılabilir hale getirmen gerekebilir — o zaman `reply` yazan
sarmalayıcıyı koru, **mevcut çağıranın davranışı değişmesin**.

⚠️ Önizleme ekranı da bu hataları göstermeli. Kullanıcı onayladıktan
sonra "22 satır atlandı" demek geç.

---

## 🔴 3. CSV içe aktarımı satırları SESSİZCE yutuyor

**Yer:** `business-tracker.ts:1013` — `parseCsv(document.extractedText)`.

`extractedText`, yüklemede `MAX_EXTRACTED_TEXT_LENGTH` ile
**100.000 karakterde kırpılıyor** (`documentSecurity.ts:5`, kırpma
`documents.ts:133`).

Sonuç: büyük bir CSV'nin sonu düşüyor ve kullanıcı **hiçbir uyarı
görmüyor**. 2000 satır yükleyip 600 kayıt alıyor, farkına varmıyor.
Sessiz veri kaybı, gürültülü hatadan çok daha kötüdür.

XLSX yolunda bu doğru çözülmüş: dosya diskten okunuyor ve yorumda
sebebi yazıyor. **CSV de aynı yoldan okunacak.**

**Yapılacak:**

- CSV'yi de `storedName` üzerinden diskten oku, `extractedText`'ten
  değil.
- ⚠️ XLSX yolundaki `join(UPLOAD_DIR, document.storedName)` çağrısında
  yol güvenliği kontrolü yok. Depoda bu iş için desen var:
  `safeAvatarPath`, `safeMediaPath`. `storedName` sunucu ürettiği için
  bugün sömürülebilir değil, ama **iki yol da** aynı korumalı
  yardımcıdan geçsin — ikinci bir okuma yolu açıyorsun, kapıyı şimdi
  koy.
- Kodlama: dosya UTF-8 değilse (Türkçe Excel'den CSV çıktısı sık sık
  Windows-1254 oluyor) okunamayan karakter yerine **anlaşılır bir hata**
  ver, bozuk metni içeri alma.

---

## 🔴 4. Tek bir test yazılmamış

Tarifin 3. kuralı: *"Test yazıldıktan sonra düzeltme BİLEREK geri
alınır ve testin düştüğü görülür. Düşmüyorsa test bir şey
korumuyordur."* Doğrulama bölümü isim isim testler istiyordu.

**Ölçüm:** değişen dosyalar arasında **hiç test dosyası yok**.
Çalıştırılan 6 dosya mevcut testlerdi; arka uç takımı ~1730 test.

~1400 satır yeni kodun sıfır testi var. Yukarıdaki üç açığın üçü de
bir testle yakalanırdı.

**Yazılacak testler** (mevcut dosyalara ekle: `tests/business-tracker.test.ts`,
`tests/documents.test.ts`, `tests/gelen-eposta.test.ts`):

| Ne | Diş kontrolü |
|---|---|
| Sınırın üstünde satır içeren dosya 422 alır | sınır kaldırılınca test düşmeli |
| Başka çalışma alanının `contactId`'si içeren satır **reddedilir**, kalan satırlar içeri girer | `validateReferences` çağrısı kaldırılınca düşmeli |
| 100.000 karakterden uzun CSV'nin **tüm** satırları okunur | `extractedText`'e geri dönülünce düşmeli |
| Sahte uzantılı `.xlsx` 415 alır | — (mevcut koruma, kanıtı yok) |
| Kaydı düzenleyince `syncAutomaticReminder` yeni vadeye taşınır | çağrı kaldırılınca düşmeli |
| Başka çalışma alanının kaydı düzenlenemez/silinemez (A maddesi BOLA) | `scopedRecord` kaldırılınca düşmeli |
| Mentor bağlamında müşteri adı ve kayıt başlığı **BULUNMAZ** | isteme başlık eklenince düşmeli |
| e-postayla gelen e-Fatura `proposed` öneri üretir | — |

⚠️ İki tuzak, bu depoda **bizzat yaşandı**:
- Test verisi **arşivli kayıt** seçerse uç doğru olduğu hâlde 404 alır
  ve testi yanlış yere baktırır.
- Tek bir örnekle yazılan ayrıştırıcı testi **şans eseri** geçebilir.
  Alan sırası bilerek değiştirilmiş ikinci bir örnek ekle.

---

## 🟡 5. Üç yerde kopya kod (bu turda düzeltilebilir, şart değil)

Depo kuralı 2: *"İkinci uygulama yazılmaz."*

- **Mentor özeti**, `business-tracker.ts:374-413`'teki `/tracker/summary`
  hesabının satır satır kopyası (`mentor-context.ts` içinde). Bugün aynı
  sonucu veriyorlar; biri değişince **sessizce ayrışırlar**. Tarifte
  "mevcut `/tracker/summary` çıktısı yeniden kullanılacak" yazıyordu.
- **`documentSuggestion.create` bloğu** artık üçüncü kez kopyalandı
  (`gelen-eposta.ts`). Ortak bir yardımcıya çıkar.
- `mentor-context.ts`'te `include: { contact: { select: { name } } }`
  var ama **kullanılmıyor**. Müşteri adını isteme yaklaştırmanın hiçbir
  faydası yok; kaldır.

---

## Doğrulama — bitti demeden önce

- `npx tsc --noEmit`
- `npx vitest run` — **tam takım**, seçilmiş dosyalar değil
- `cd frontend && npm run test -- --run && npm run build`
- `npm run sql:scan`, `npm run secret:scan`
- 375 pikselde içe aktarım ekranı: **yatay kayma olmayacak**
- Tarayıcıda gerçek bir Excel yüklenip önizlemenin satır sayısını ve
  hatalı satırın **sebebini** gösterdiği görülecek

⚠️ Geliştirme sunucusu `watch` YAPMIYOR (`node --import tsx
src/server.ts`). Arka uç değişikliğinden sonra yeniden başlatmazsan
ESKİ kod çalışır. Bu tuzak bu depoda iki kez saat kaybettirdi.
