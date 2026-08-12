# FAZ 5D — Hesaplama Katmanlarının Birleştirilmesi

> Bu doküman, daha önce yazılan `FAZ5D_FINANCE_MODELLAB_PROMPT.md`'nin
> **yerine geçer.** O spec iki sayfayı ayrı tutup ayrı ayrı güzelleştiriyordu;
> asıl sorun ayrılığın kendisiymiş.

## Sorun

Kullanıcı "CAC'ım ne?" diye merak ediyor. Menüde üç yer var: Karar Araçları,
Finans Merkezi, Model Lab. İkisinde CAC hesabı var, farklı kodla, muhtemelen
farklı formülle. Kullanıcı hangisine gireceğini bilmiyor; girdiği ikisinde
farklı sayı görürse ürüne güveni gidiyor.

Envanter: `HESAPLAMA_KATALOGU.md`

```
Karar Araçları    12 araç   "Bunu yapmalı mıyım?"   → karar fişi
Finans Merkezi    19 araç   "Bu kaç eder?"          → sayı
Model Lab         24 model  "Metodolojiye uygun"    → sayı + kaynak + güven
```

Finans Merkezi ile Model Lab arasında **9 gerçek çakışma** var.

## Hedef

Karar Araçları **olduğu gibi kalır** — farklı bir soruya cevap veriyor, doğru
konumlanmış.

Finans Merkezi ve Model Lab **tek katalogda birleşir.** Derinlik farkı ayrı
sayfa değil, hesabın içinde bir mod olur:

```
Hesaplamalar
└── Müşteri Edinme Maliyeti (CAC)
    ├── Basit    → 3 girdi, anında sonuç
    └── Detaylı  → tam girdi seti, kaynak, güven skoru, hassasiyet
```

Sonuç: 43 giriş noktası → **34 benzersiz hesap**, menüde bir madde eksilir.

---

## Değişmeyecek olanlar

- **Formüller ve hesaplama mantığı değişmeyecek.** Bu bir arayüz birleştirmesi.
- Backend route'ları, veri modeli, API sözleşmeleri değişmeyecek.
- **Route silinmeyecek.** `/app/finance/models` çalışmaya devam edecek
  (menüden kalksa da deep link ve Mentor bağlantıları bozulmayacak).
- Karar Araçları'na dokunulmayacak.
- Sahte veri üretilmeyecek.
- `DESIGN.md` tek otoritedir.
- **`git add` / `git commit` / `git push` YAPMA.**

---

## İŞ 1 — Formül karşılaştırması (önce bu, kod yazmadan)

9 çakışan çiftin formüllerini yan yana koy. Kod yazma, sadece raporla.

| # | Finans Merkezi (`src/services/formulas.ts`) | Model Lab (`src/services/financial-models/registry.ts`) |
|---|---|---|
| 1 | `cac` | `CAC` |
| 2 | `ltv` | `LTV` |
| 3 | `ltv_cac` | `LTV_CAC` |
| 4 | `basabas_noktasi` | `BREAK_EVEN_QUANTITY` |
| 5 | `nakit_dayanim` | `RUNWAY` |
| 6 | `isletme_sermayesi` | `NET_WORKING_CAPITAL` |
| 7 | `stok_devir` | `DIO` |
| 8 | `birim_maliyet` | `PRODUCT_PROFITABILITY` |
| 9 | `pazaryeri_siparis_kari` | `ORDER_PROFITABILITY` |

Her çift için:

- Aynı girdiyle aynı sonucu veriyorlar mı?
- Girdi setleri nasıl farklı? (Basit modun girdileri, detaylı modun alt kümesi mi?)
- Farklılarsa **hangisi doğru?** Kararı sen verme — farkı ve nedenini rapora yaz.

**Formül farkı bulursan orada dur ve sor.** Yanlış olanı sessizce doğru
kabul edip birleştirmek, kullanıcının gördüğü sayıyı sessizce değiştirir.

---

## İŞ 2 — Birleşik katalog yapısı

34 hesap üç gruba ayrılıyor:

### A. Çift modlu (9) — hem basit hem detaylı

Yukarıdaki tablo. Basit mod `formulas.ts`'ten, detaylı mod `registry.ts`'ten
beslenir. **İki motor da yerinde kalır**, katalog ikisini tek kayıtta birleştirir.

### B. Yalnız basit (10) — detaylı modu yok

```
fiyat_mimarisi · kar_hesabi · nakit_pozisyonu · roi · indirim_kar
kredi_maliyeti · ihracat_maliyet · kdv_ekleme · kasa_kapanis · vade_farki
```

Bunlarda "Detaylı" sekmesi **gösterilmez** — devre dışı sekme koyma, hiç koyma.

### C. Yalnız detaylı (15) — basit modu yok

```
CURRENT_RATIO · QUICK_RATIO · DUPONT_3_STEP · PROFIT_TO_CASH
CASH_CONVERSION_CYCLE · DSO · DPO · CONTRIBUTION_MARGIN
POST_RETURN_MARGIN · CAC_PAYBACK · GROSS_BURN · NET_BURN
NPV · IRR · WACC_FCFF_DCF
```

Bunlar doğrudan detaylı modda açılır. Basit sekmesi gösterilmez.

### Katalog kaydı sözleşmesi

Yeni bir birleşik katalog tanımı oluştur (öneri:
`src/services/calculation-catalog.ts`). Her kayıt:

```
id            benzersiz kimlik
title         kullanıcıya görünen ad
category      tek bir kategori listesi (aşağıda)
description   bir cümle, ne işe yaradığı
simple        { formulaId } | null
detailed      { modelCode } | null
relatedCourse ilgili kursun slug'ı (varsa)
relatedTool   ilgili karar aracının kodu (varsa)
```

`simple` ve `detailed` aynı anda `null` olamaz.

### Kategoriler

Şu an Finans Merkezi'nde 19 aracın **yalnız 6'sında** `category` alanı dolu
(`daily / cash / stock / sales`), 13'ünde yok. Bu yüzden filtre çubuğu eksik
çalışıyor olabilir — kontrol et ve raporla.

Birleşik katalogda **her kaydın kategorisi olacak.** Model Lab'in mevcut
kategorileri (`liquidity / profitability / efficiency / unit_economics /
cash_resilience / investment / valuation`) ile Finans Merkezi'ninkileri
tek listeye indir. Türkçe, kullanıcı diliyle, en fazla 6 kategori.
Öneriyi rapora yaz, uygulamadan önce onay bekle.

---

## İŞ 3 — Ekran

### Katalog sayfası

Tek sayfa, tek grid. Her kartta:

```
ikon · başlık · bir cümle açıklama · girdi sayısı · [Basit] [Detaylı] rozetleri
```

Kart geometrisi `DESIGN.md` standart kart kontratı — `padding 16`, `radius-md`,
`shadow-sm`, hover `shadow-md`. Dev min-height, gradient, glow yok.

Arama + kategori filtresi üstte. Filtre kontratı `DESIGN.md` (Tabs / Chip /
Segmented), dev toggle grubu değil.

### Hesap detay sayfası

Mod geçişi sayfanın üstünde, `Tabs` kontratıyla:

```
[ Basit ]  [ Detaylı ]
```

Yalnız tek modu olan hesaplarda sekme çubuğu **hiç render edilmez**.

Basit mod: az girdi, anında sonuç, kaynak gösterimi yok.
Detaylı mod: tam girdi seti, kaynak referansları, güven skoru, hassasiyet
aralığı — Model Lab'in mevcut çıktısı neyse o.

Mod değiştirince **ortak girdiler korunur.** Kullanıcı basit modda girdiği
değerleri detaylıya geçince baştan yazmak zorunda kalmamalı.

### Sonuç hiyerarşisi

Her iki modda da aynı:

```
Ana değer      → metric-lg, RENKLİ DEĞİL (--text)
İkincil metrikler
Yorum / karar kuralı
Uyarı (varsa)
Sonraki eylem
```

Renk yalnız küçük rozet ve negatif değerlerde. Büyük rakamı accent rengine
boyama — koyu modda parlıyor.

---

## İŞ 4 — Navigasyon

- Menüden **"Model Lab" maddesi kalkar.** Finans Merkezi altındaki
  "Modeller" alt maddesi de kalkar.
- Kalan yapı: `Finans Merkezi` → `Hesaplamalar` · `Geçmiş / Tamamlanan`
- `/app/finance/models` ve `/app/tools?view=models` route'ları **çalışmaya
  devam eder**, birleşik katalogda ilgili hesabın detaylı moduna yönlendirir.
- Mentor'un model çağıran araçları (`mentor-tools.ts`) bozulmaz.
- Kurs ↔ model bağları (`FinancialModelCourse`,
  `FinancialModelKnowledgeObject`) bozulmaz.

---

## İŞ 5 — Bağlantılar

Birleşik katalog üç yöne bağlanır:

- **Hesap → Kurs.** Hesabın konusunu anlatan kurs varsa "Bu konuyu öğren"
  bağlantısı. Eşleşmeyi `KURS_KATEGORI_ESLEME.md` Bölüm B'deki 7 kurstan kur.
- **Hesap → Karar Aracı.** Aynı konuda karar aracı varsa "Karar ver"
  bağlantısı. Örn. `pazaryeri_siparis_kari` → `DC-MARKETPLACE-004`,
  `indirim_kar` → `DC-DISCOUNT-002`, `kredi_maliyeti` → `DC-LOAN-007`.
- **Hesap → Geçmiş.** Kullanıcının o hesabı daha önce çalıştırdığı kayıtlar.

Bağlantı yoksa bölümü hiç gösterme — boş kutu bırakma.

---

## İŞ 6 — Ölçü borçları

Bu fazda kapsamdaki dosyalarda:

- `FinancialModelLibrary.module.css:1` → `max-width: 1240px` → `var(--content-max-width)`
- `FinancialModelWorkspace.module.css:1` → `max-width: 1240px` → `var(--content-max-width)`
- `FinancialModelWorkspace.module.css` → `border-radius: 20px` (1 yer) ve `10px` (4 yer) → `radius-md` / `radius-sm`
- `ToolsPage.module.css:150` → `border-radius: 10px` → `radius-sm`
- Spacing: `10 / 14 / 18 / 22 / 26 / 28 / 30 / 36` kalıntılarını `4 8 12 16 20 24 32 40 48` ölçeğine çek
- Model Lab'deki beyaz zeminleri (`#fff`, büyük boş paneller) `surface-*` sistemine çek

---

## İŞ 7 — Durumlar ve erişilebilirlik

`loading · sonuç yok · geçmiş yok · geçersiz girdi · veri yetersiz` —
EmptyState kontratı. Boş durumda dev beyaz alan bırakma.

"Nakit runway 0 ay" gibi yanıltıcı etiketleri audit et. `0`, `undefined`,
sıfıra bölme, eksik girdi durumlarında sonuç yanlış anlatılıyorsa görsel
etiketi düzelt (`Veri yetersiz` / `Hesaplanamadı` / `Girdi gerekli`).
**Formül mantığını değiştirme** — gerçek bir hesap hatası varsa rapora taşı.

Erişilebilirlik: label, `aria-describedby`, hata bağlantıları, sekme rolleri,
sonuç başlık hiyerarşisi. Renk tek başına veri taşımayacak.

---

## Test

```bash
npm run build
npm test
```

Ek kontroller:

- Her katalog kaydının `simple` veya `detailed`'ından en az biri dolu mu?
- 34 kayıt var mı? (9 çift modlu + 10 yalnız basit + 15 yalnız detaylı)
- `formulas.ts` ve `registry.ts`'teki her tanım katalogda temsil ediliyor mu?
  Temsil edilmeyen varsa listele — sessizce düşmesin.
- Eski route'lar 404 vermiyor mu?

Viewport: `1440 · 1280 · 768 · 430 · 390 · 360` — açık ve koyu mod.

---

## Rapor

```
FAZ 5D RAPORU — HESAPLAMA BİRLEŞTİRME

1.  Formül karşılaştırması (9 çift) — aynı/farklı, farklıysa nasıl
2.  Formül farkı bulunan çiftler ve önerilen çözüm  ← KARAR BEKLİYOR
3.  Kategori önerisi (en fazla 6)                    ← KARAR BEKLİYOR
4.  Birleşik katalog yapısı ve kayıt sayısı
5.  Katalog sayfası
6.  Hesap detay sayfası ve mod geçişi
7.  Navigasyon değişikliği ve korunan route'lar
8.  Kurs / karar aracı / geçmiş bağlantıları
9.  Ölçü borçları (max-width, radius, spacing)
10. Model Lab yüzey normalizasyonu
11. Yanıltıcı sonuç etiketleri
12. Durumlar ve erişilebilirlik
13. Build/test
14. Temsil edilmeyen tanımlar (varsa)
15. Kalan teknik borçlar
```

İŞ 1'de formül farkı bulursan **kod yazmadan önce raporla ve dur.**
