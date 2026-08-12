# LocalKarar — Hesaplama Katmanları Şeması

Üç ayrı sistem var, üçü de sayı hesaplıyor ama farklı sorulara cevap veriyorlar.

| Sistem | Adet | Kaynak dosya | Soru tipi | Çıktı |
|---|--:|---|---|---|
| **Karar Araçları** | 12 | `src/services/decision-tool-catalog.ts` | "Bunu yapmalı mıyım?" | Karar etiketi + gerekçe + senaryo |
| **Finans Merkezi** | 19 | `src/services/formulas.ts` | "Bu kaç eder?" | Sayı |
| **Model Lab** | 24 | `src/services/financial-models/registry.ts` | "Bu göstergeyi metodolojiye uygun hesapla" | Sayı + kaynak + güven aralığı |

---

## 1. Karar Araçları (12)

`DecisionToolConfig` → sorular → `DecisionToolCalculation` → **Karar Fişi**

Çıktı yapısı sabit: `decisionLabel` (UYGUN / SINIRDA / RİSKLİ / ZARAR / DEVAM /
GÖZDEN GEÇİR / BIRAK) + `decisionTone` + `summary` + `metrics[]` + `scenarios[]` +
`formulas[]` + `riskWarnings[]` + `safeNextSteps[]` + `mentorSummary[]`

| Kod | Kategori | Soru |
|---|---|---|
| DC-PROFIT-001 | Kârlılık | *(yapılandırılmış katalogda değil — ayrı akış)* |
| DC-DISCOUNT-002 | Fiyatlandırma | Bu indirimi yapabilir miyim? |
| DC-FREESHIP-003 | Lojistik | Kargo ücretsiz olabilir mi? |
| DC-MARKETPLACE-004 | Pazaryeri | Pazaryeri komisyonundan sonra ne kalıyor? |
| DC-ADS-005 | Pazarlama | Reklam bütçemi artırmalı mıyım? |
| DC-HIRE-006 | İnsan Kaynağı | Yeni personel alabilir miyim? |
| DC-LOAN-007 | Finansman | Kredi taksitini karşılayabilir miyim? |
| DC-CASHFLOW-008 | Nakit Yönetimi | Nakit akışım riskli mi? |
| DC-BRANCH-009 | Büyüme | Yeni şube açmaya hazır mıyım? |
| DC-CAMPAIGN-010 | Pazarlama | Kampanya yapmak mantıklı mı? |
| DC-STOCK-011 | Stok Yönetimi | Stok artırmalı mıyım? |
| DC-CONTINUE-012 | Ürün Yönetimi | Bu ürünü satmaya devam etmeli miyim? |

> **Not:** DC-PROFIT-001 `STRUCTURED_TOOL_CONFIGS` dizisinde yok, ayrı bir akışta
> duruyor. Daha önce `decisionLabel` / `summary` üretmediği tespit edilmişti.
> Karar Fişi'nde başlık boş kalmasının sebebi bu.

---

## 2. Finans Merkezi hesaplama araçları (19)

`FormulaDef` → `inputs[]` → `calculate()` → düz sayı sonucu. Karar etiketi yok.

| id | Ad | Girdi | Kategori |
|---|---|--:|---|
| `fiyat_mimarisi` | Fiyat Mimarisi ve Hedef Marj | 7 | — |
| `kar_hesabi` | Kâr ve Kâr Marjı | 2 | — |
| `basabas_noktasi` | Başabaş Noktası | 3 | — |
| `nakit_pozisyonu` | Nakit Pozisyonu | 2 | — |
| `isletme_sermayesi` | İşletme Sermayesi | 2 | — |
| `roi` | Yatırım Getirisi (ROI) | 2 | — |
| `stok_devir` | Stok Devir Hızı | 2 | — |
| `cac` | Müşteri Edinme Maliyeti (CAC) | 3 | — |
| `ltv` | Müşteri Yaşam Boyu Değeri (LTV) | 3 | — |
| `ltv_cac` | LTV/CAC Oranı | 2 | — |
| `indirim_kar` | İndirim/Kampanya Kârlılığı | 4 | — |
| `kredi_maliyeti` | Kredi Taksiti ve Toplam Maliyet | 3 | — |
| `ihracat_maliyet` | İhracat Birim Maliyeti | 6 | — |
| `kdv_ekleme` | KDV Ekleme | 2 | daily |
| `kasa_kapanis` | Günlük Kasa Kapanışı | 7 | daily |
| `nakit_dayanim` | Nakit Dayanma Süresi | 3 | cash |
| `vade_farki` | Vade Farkı | 3 | cash |
| `birim_maliyet` | Gerçek Birim Maliyet | 6 | stock |
| `pazaryeri_siparis_kari` | Pazar Yeri Sipariş Kârlılığı | 7 | sales |

> **Tutarsızlık:** İlk 13 aracın `category` alanı yok, son 6'sının var
> (`daily / cash / stock / sales`). Arayüzdeki filtre çubuğu ("Günlük işlemler,
> Nakit ve vade, Satış ve fiyat, Stok ve maliyet, Büyüme") bu alana dayanıyor;
> kategorisi olmayan 13 araç filtrelerde görünmüyor olabilir.

---

## 3. Model Lab finansal modelleri (24)

`FinancialModelDefinition` → deterministik motor + kaynak referansı + güven
skoru. Akademik/mesleki kaynağa bağlı (CFA, Damodaran, KAP, SPL).

### Likidite (3)

| Kod | Ad |
|---|---|
| `CURRENT_RATIO` | Cari Oran |
| `QUICK_RATIO` | Asit-Test Oranı |
| `NET_WORKING_CAPITAL` | Net İşletme Sermayesi |

### Kârlılık (1)

| `DUPONT_3_STEP` | Üç Aşamalı DuPont |
|---|---|

### Verimlilik (4)

| Kod | Ad |
|---|---|
| `CASH_CONVERSION_CYCLE` | Nakit Dönüşüm Döngüsü |
| `DIO` | Stokta Kalma Süresi |
| `DSO` | Tahsilat Süresi |
| `DPO` | Tedarikçi Ödeme Süresi |

### Birim ekonomi (9)

| Kod | Ad |
|---|---|
| `BREAK_EVEN_QUANTITY` | Başa Baş Satış Adedi |
| `CONTRIBUTION_MARGIN` | Katkı Payı |
| `PRODUCT_PROFITABILITY` | Ürün Kârlılığı |
| `ORDER_PROFITABILITY` | Sipariş Kârlılığı |
| `POST_RETURN_MARGIN` | İade Sonrası Gerçek Marj |
| `CAC` | Müşteri Edinme Maliyeti |
| `LTV` | Müşteri Yaşam Boyu Değeri |
| `LTV_CAC` | LTV/CAC Oranı |
| `CAC_PAYBACK` | CAC Geri Ödeme Süresi |

### Nakit dayanıklılığı (4)

| Kod | Ad |
|---|---|
| `PROFIT_TO_CASH` | Kârdan Nakde Mutabakat |
| `GROSS_BURN` | Brüt Nakit Tüketimi |
| `NET_BURN` | Net Nakit Tüketimi |
| `RUNWAY` | Nakit Dayanma Süresi |

### Yatırım (2)

| Kod | Ad |
|---|---|
| `NPV` | Net Bugünkü Değer |
| `IRR` | İç Verim Oranı |

### Değerleme (1)

| `WACC_FCFF_DCF` | Basitleştirilmiş WACC ve FCFF DCF |
|---|---|

---

## 4. Çakışmalar

**Aynı hesap üç ayrı yerde ayrı kodla duruyor.** Kullanıcı aynı sayıyı üç farklı
ekranda, muhtemelen farklı sonuçlarla görebilir.

| Hesap | Finans Merkezi | Model Lab | Karar Aracı |
|---|---|---|---|
| CAC | `cac` | `CAC` | — |
| LTV | `ltv` | `LTV` | — |
| LTV/CAC | `ltv_cac` | `LTV_CAC` | — |
| Başabaş | `basabas_noktasi` | `BREAK_EVEN_QUANTITY` | — |
| Nakit dayanma | `nakit_dayanim` | `RUNWAY` | — |
| İşletme sermayesi | `isletme_sermayesi` | `NET_WORKING_CAPITAL` | — |
| Stok devir | `stok_devir` | `DIO` | — |
| Birim maliyet | `birim_maliyet` | `PRODUCT_PROFITABILITY` | — |
| Sipariş kârlılığı | `pazaryeri_siparis_kari` | `ORDER_PROFITABILITY` | DC-MARKETPLACE-004 |
| İndirim etkisi | `indirim_kar` | — | DC-DISCOUNT-002 |
| Kredi taksiti | `kredi_maliyeti` | — | DC-LOAN-007 |

**11 çakışma.** Model Lab versiyonları kaynak referanslı ve güven skorlu;
Finans Merkezi versiyonları basit ve hızlı. İkisi farklı formül kullanıyorsa
kullanıcı için tutarsızlık, aynı formülü kullanıyorsa bakım yükü.

---

## 5. Önerilen mimari

Katmanları rol ayrımına göre ayır, kod tekrarını kaldır:

```
Model Lab (24 model)          →  TEK HESAP MOTORU
                                 Formül, kaynak, güven skoru burada.

Finans Merkezi (19 araç)      →  Model Lab'i çağıran BASİT ARAYÜZ
                                 Az girdi, hızlı sonuç, kaynak gösterme.

Karar Araçları (12)           →  Model Lab'i çağırıp üstüne KARAR KURALI
                                 uygulayan katman. Fiş üretir.
```

Bu yapıda:

- Bir formül değişirse tek yerde değişir.
- Kullanıcı aynı sayıyı her yerde aynı görür.
- Karar Araçları "hangi eşikte ne denir" kuralına odaklanır, hesap yapmaz.
- Kurslar ↔ Model Lab bağı zaten var (`FinancialModelCourse`,
  `FinancialModelKnowledgeObject`); kurs bitince model çalıştırılır.

### Bu fazda yapılmayacak

İş mantığı ve formül değişikliği. Bu doküman yalnızca **envanter ve teşhis**.
Birleştirme ayrı bir faz olarak planlanmalı; her çakışan çiftin formülü önce
karşılaştırılmalı, farklıysa hangisinin doğru olduğuna karar verilmeli.
