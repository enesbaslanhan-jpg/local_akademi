# YAPILACAK — Düzeltme 1: bekçideki çoğul hatası

> ⛔ **BU DOSYAYI DEĞİŞTİRME.** Yapılacak iş kod.
> `YAPILACAK_I18N_TAMAMLAMA.md`'nin eki — onu geçersiz kılmaz.
> **B maddesine başlamadan ÖNCE bu düzeltme yapılacak.**

## Durum

A · C(kısmi) · F · G tamam, teşekkürler. Ama bekçinin raporladığı
**235 anahtarın 21'i yanlış pozitif** — ölçüldü.

O 21 anahtar bugün tarayıcıda **doğru çalışıyor.** Katalogda i18next
JSON v4 çoğul biçiminde duruyorlar:

```
feed.time.minutes_one / feed.time.minutes_other     ← kod t('feed.time.minutes') çağırır
courses.lessonCount_one / courses.lessonCount_other
calculations.timesCalculated_one / _other
path.daysShort_one / _other        ... ve 17 tanesi daha
```

## 🔴 ÖNCE BUNU OKU — yanlış düzeltme aktif zarar verir

Bu 21 anahtarı "eksik" sanıp katalogda **düz (eksiz) karşılık
eklersen ya da `_one`/`_other` çiftini eksiz hale getirirsen,
bugün çalışan çoğullaştırmayı BOZARSIN.** Türkçe/İngilizce
"1 ders" ↔ "5 ders" ayrımı çöker.

**Bu 21 anahtara DOKUNMA. Düzeltilecek olan bekçidir.**

## Hata

`scripts/check-i18n.mjs`, `hasKey()` içinde:

```js
const bareKey = key.replace(/_(?:one|other)$/, '')
return !bareKey || bareKey in catalog || Object.keys(catalog).some(c => c.startsWith(`${bareKey}.`))
```

Ek **ters yönde** işleniyor. Kod `t('feed.time.minutes')` çağırıyor —
kırpılacak ek yok. Sonra katalogda düz `feed.time.minutes` aranıyor,
yok (yalnız `_one`/`_other` var), alt ağaç da yok → "eksik" deniyor.

Doğrusu: **katalogda `anahtar + ek` var mı** diye bakmak.

```js
const PLURAL_SUFFIXES = ['', '_zero', '_one', '_two', '_few', '_many', '_other']

function hasKey(namespace, key) {
  const catalog = catalogs[namespace]
  if (!catalog || !key) return false
  /* i18next JSON v4: kod bare anahtarı çağırır, çoğul ekini i18next
     `count`a göre seçer. Katalogda ekli biçim varsa anahtar VARDIR. */
  if (PLURAL_SUFFIXES.some(suffix => Object.prototype.hasOwnProperty.call(catalog, key + suffix))) return true
  /* Dinamik önek: alt ağaçta en az bir anahtar varsa geçerli. */
  return Object.keys(catalog).some(candidate => candidate.startsWith(`${key}.`))
}
```

⚠️ Mevcut kodda `!bareKey ||` **boş anahtarı geçerli sayıyor**.
Yukarıdaki sürüm bunu da kapatıyor.

## İki ikincil bekçi hatası (aynı turda)

**1 — Çoklu namespace dizisinin yalnız İLK öğesi okunuyor.**

```js
/useTranslation\(\s*(?:\[\s*)?['"]([^'"]+)['"]/g
```

`useTranslation(['common', 'workspace'])` → yalnız `common` yakalanıyor,
`workspace` kapsam dışı kalıyor. Bugün 8 dosya çoklu namespace
kullanıyor (`Sidebar`, `CoursePlayerPage`, `CoursesPage`,
`Workspaces/Orders`, `Products`, `WorkspaceLayout`,
`MentorDeleteModal`, `IntegrationsPanel`). Şu an patlamıyor çünkü o
dosyalar `ns:anahtar` biçimini kullanıyor — ama E maddesindeki
dosyalara geçince yanlış pozitif üretecek. Dizideki **tüm** tırnaklı
değerleri topla.

**2 — `'common'` her dosyaya zorla ekleniyor** (`namespacesIn`,
`new Set(['common'])`). i18next'te `useTranslation('admin')` kapsamı
YALNIZ `admin`'dir; `common`'a düşmez (`defaultNS` sadece argümansız
`useTranslation()` için geçerli). Bu, gerçek hataları **gizler** —
yanlış pozitif değil, yanlış negatif. Yalnız hiç `useTranslation`
bulunmayan dosyada `common`'a düş.

## Düzeltme sonrası beklenen

| | |
|---|---|
| Toplam rapor satırı | 235 → **214** |
| Benzersiz (dosya, anahtar) | **195** |

195'in dağılımı — B maddesinin gerçek iş listesi:

```
  77  pages/admin/AdminCommunity.jsx
  43  pages/admin/AdminImports.jsx
  40  pages/admin/AdminKOReview.jsx
  32  pages/admin/AdminKnowledge.jsx
  16  pages/admin/AdminKOForm.jsx
   3  pages/PilotLearningPathPage.jsx
   1  pages/admin/AdminUsers.jsx
   1  pages/Workspaces/Calendar.jsx
   1  pages/Workspaces/Contacts.jsx
```

Satır sayısının (214) benzersizden (195) fazla olması normal: aynı
anahtar dosyada birden çok yerde çağrılıyor (ör. `knowledge.workflow`
`AdminKnowledge`'da 4 kez). Raporlamada sorun yok.

⚠️ Bu 195'in içinde **11 tanesi kırık dinamik önek**
(`knowledge.workflow`, `knowledge.status`, `knowledge.level`,
`knowledge.type`, `form.reviewGate`, `form.verification`). Bunlar
`` t(`knowledge.status.${status}`) `` biçiminden geliyor. Düzeltirken
**çalışma zamanındaki her varyantın** karşılığı olmalı — `status`
değişkeninin aldığı bütün değerleri koddan çıkar.

## Doğrulama

```bash
node scripts/check-i18n.mjs 2>&1 | grep -c "unresolved i18n key"   # 214 beklenir
```

Ayrıca **diş kontrolünü tekrarla**: bu kez bilerek bir ÇOĞUL anahtarı
boz (ör. `learning.json`'da `courses.lessonCount_other`ı geçici sil) —
bekçi bunu yakalamalı, `_one` hâlâ dururken sessiz kalmamalı.

Sonra `YAPILACAK_I18N_TAMAMLAMA.md`'deki **B maddesiyle** devam.
