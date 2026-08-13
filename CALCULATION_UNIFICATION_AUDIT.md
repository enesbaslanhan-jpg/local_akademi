# HESAPLAMA BİRLEŞTİRME AUDITİ

Tarih: 2026-08-13  
Branch: `design/localkarar-18`  
Kapsam: `src/services/formulas.ts` içindeki 19 hızlı hesap ile `src/services/financial-models/registry.ts` / `engine.ts` içindeki 24 detaylı model.

## Yönetici özeti

Repo envanteri 19 + 24 = 43 giriş noktasını doğruluyor. İsim benzerliğiyle önerilen dokuz çiftin sekizi tek hesap ailesi altında Basit/Detaylı veya yöntem seçimiyle sunulabilir. `birim_maliyet` ile `PRODUCT_PROFITABILITY` ise farklı sorulara cevap verdiği için birleşmemelidir. Güvenli katalog sonucu bu nedenle **35 benzersiz hesap**tır:

- 8 çift modlu/yöntemli hesap
- 11 yalnız hızlı hesap
- 16 yalnız ileri analiz

34 sayısına ulaşmak için iki farklı hesabı birleştirmek kullanıcıya yanlış anlam ve sonuç taşır. Bu audit herhangi bir formülü, geçmiş sonucu veya kayıtlı girdiyi değiştirmez.

## Canonical seçim ilkeleri

1. Aynı ekonomik soru, aynı pay/payda ve aynı dönem semantiği varsa tek tanım altında iki arayüz modu kullanılabilir.
2. Aynı ekonomik ailede olup girdi kapsamı veya metodoloji farklıysa kullanıcıya yöntem açıkça gösterilir; bir modun sonucu diğerinin yerine geçirilmez.
3. Çıktı anlamı farklıysa araçlar ayrı kalır; isim benzerliği birleşme gerekçesi değildir.
4. Eski formül ve model kodları immutable compatibility alias olarak korunur. Mevcut `FormulaCalculation` ve `FinancialModelRun` kayıtları migrate edilmez.
5. Detaylı moda geçişte yalnız semantiği birebir aynı girdiler taşınabilir. Eş anlamlı görünse de dönem/birim farkı olan alanlar otomatik doldurulmaz.
6. Yuvarlama görüntü katmanında iki ondalık olarak ortaklaştırılabilir; motor çıktısı veya tam hassasiyet sessizce değiştirilemez.
7. Kaynak, varsayım metadatası, güven skoru, kontrol izi ve hassasiyet yalnız detaylı model sonucunun özellikleridir; hızlı sonuca yapay güven skoru eklenmez.

## Dokuz aday eşleşme

| # | Hızlı / detaylı | Amaç ve çıktı | Formül ve dönem | Girdi/birim farkı | Varsayım, rounding, metodoloji | Karar |
|---:|---|---|---|---|---|---|
| 1 | `cac` / `CAC` | Yeni müşteri başına edinme maliyeti; TRY/müşteri | Hızlı: `(pazarlama + satış ekibi) / yeni müşteri`. Detaylı: `(pazarlama + satış + kampanya + ajans) / yeni müşteri`. Aynı dönem şarttır. | Hızlı 3, detaylı 5 girdi. Kampanya ve ajans gideri sıfır değilse sonuçlar farklıdır. | İkisi 2 ondalık. Detaylı CFA/KAP varsayılan kaynakları, doğrulama izi ve veri-kalite güven skoru taşır. | **B — aynı aile, farklı maliyet kapsamı.** Tek CAC kaydı; “Temel edinme giderleri” ve “Tam yüklenmiş CAC” yöntemi görünür olmalı. Canonical sonuç seçilmez. |
| 2 | `ltv` / `LTV` | Müşteri yaşam boyu değeri | Hızlı: `ortalama satış × yıllık satın alma sıklığı × ilişki yılı` (brüt gelir LTV). Detaylı: `aylık gelir × brüt marj / aylık churn` (brüt kâr katkısı LTV). | Her ikisi 3 girdi olsa da alanlar ve zaman tabanı farklıdır; birbirinin alt kümesi değildir. | 2 ondalık. Detaylı churn yaklaşımı, kaynak/varsayım/güven kontrolleri ve aşırı düşük churn uyarısı taşır. | **B — aynı aile, farklı metodoloji.** “Gelir bazlı” / “Brüt kâr ve churn bazlı” yöntem seçimi zorunlu; sonuçlar birbirinin yerine kullanılamaz. |
| 3 | `ltv_cac` / `LTV_CAC` | LTV’nin CAC’a oranı; `x` | Her ikisi `LTV / CAC`; dönem doğrudan üst girdilerin dönemiyle bağlıdır. | İkişer girdi. Hızlı adlar TRY, detaylı adlar TRY/müşteri; matematik aynı. | 2 ondalık. Hızlı ek olarak 3:1 yorum etiketi üretir; detaylı kaynak/güven/iz üretir. | **A — aynı hesap.** Tek oran tanımı; girdilerin aynı LTV metodolojisinden geldiği açıkça gösterilmeli. |
| 4 | `basabas_noktasi` / `BREAK_EVEN_QUANTITY` | Minimum satış adedi, birim katkı, başa baş geliri | İkisi de `ceil(sabit gider / (birim fiyat - birim değişken maliyet))`. Aynı maliyet dönemi gerekir. | Üçer girdi; adlar farklı, birimler aynı (TRY, adet). | Katkı/gelir 2 ondalık, adet tam sayıya yukarı yuvarlanır. Detaylı doğrulama, iz, kaynak ve güven ekler. | **A — aynı hesap.** Tek canonical formül tanımı için en güvenli aday; eski kodlar alias kalır. |
| 5 | `nakit_dayanim` / `RUNWAY` | Nakit tamponunun kaç ay yeteceği | Hızlı önce `max(0, çıkış-giriş)` hesaplar, sonra `nakit/burn`; burn=0 ise **99 ay** döndürür. Detaylı hazır `netBurn` alır; burn=0 ise **null / nakit üretiyor** döndürür. | Hızlı 3 girdi, detaylı 2 girdi. TRY ve TRY/ay. | 2 ondalık. Sıfır-burn semantiği farklı ve kullanıcı sonucunu değiştirir. Detaylı iz/güven taşır. | **B — aynı aile, farklı girdi yöntemi.** 99 ay sentinel canonical kabul edilmemeli; mevcut geçmiş korunmalı. Yeni UI “sonlu süre hesaplanamaz / nakit tüketimi yok” metnini göstermeli. |
| 6 | `isletme_sermayesi` / `NET_WORKING_CAPITAL` | Kısa vadeli finansman tamponu | İkisi de `dönen varlıklar - kısa vadeli yükümlülükler`. | İkişer TRY girdisi; yalnız adlar farklı. | 2 ondalık. Hızlı durum etiketi; detaylı kaynak, doğrulama izi ve güven skoru. | **A — aynı hesap.** Tek canonical tanım için güvenli; eski kodlar alias kalır. |
| 7 | `stok_devir` / `DIO` | Stok verimliliği | Hızlı `COGS / ortalama stok` devir hızını ve `365 / hız` gününü üretir. Detaylı `(ortalama stok / COGS) × periodDays` ile yalnız DIO üretir. | Hızlı 2 yıllık girdi; detaylı 3 girdi ve 1–366 dönem günü. | Hızlı DIO’yu tam güne, devir hızını 2 ondalığa; detaylı DIO’yu 2 ondalığa yuvarlar. | **B — aynı aile, dönem/yöntem farkı.** Tek “Stok devir ve DIO” hesabında yıllık hızlı yöntem ile dönem-duyarlı detaylı yöntem; otomatik sonuç ikamesi yok. |
| 8 | `birim_maliyet` / `PRODUCT_PROFITABILITY` | Hızlı araç üretilen adet başına maliyet; model ise satış başına ekonomik katkı ve marj | Hızlı `(hammadde + işçilik + genel gider + ambalaj/kargo + fire/iade) / üretim adedi`. Detaylı `net fiyat - ürün maliyeti - operasyon - kanal - risk`. | Hızlı 6 üretim girdisi; detaylı 5 satış/kârlılık girdisi. Çıktıların paydası ve anlamı farklıdır. | İkisi 2 ondalık; model metodoloji/güven taşır. | **C — gerçekte farklı.** “Gerçek Birim Maliyet” ve “Ürün Kârlılığı” ayrı kalır. Bu bulgu hedef katalog sayısını 35 yapar. |
| 9 | `pazaryeri_siparis_kari` / `ORDER_PROFITABILITY` | Sipariş katkısı ve marjı | İkisi de gelirden atfedilebilir sipariş maliyetlerini düşer. Hızlı komisyonu oranla türetir; ürün+kargo+ambalaj+reklam+iade riski düşer. Detaylı komisyonu tutar olarak alır; ödeme kesintisi+shipping+advertising+operations düşer, ayrı iade riski yoktur. | Yedişer girdi ama maliyet taksonomileri birebir değildir. TRY ve yüzde kullanımı farklıdır. | 2 ondalık. Hızlı durum etiketi; detaylı iz, kaynak ve güven. | **B — aynı aile, farklı maliyet taksonomisi.** “Pazar yeri hızlı” ve “tam atfedilmiş sipariş” yöntemi görünür olmalı; alanlar sessizce eşlenmemeli. |

## Katalog haritası (35)

### Çift modlu / yöntemli (8)

| Canonical id | Başlık | Hızlı | Detaylı | Kategori |
|---|---|---|---|---|
| `customer-acquisition-cost` | Müşteri Edinme Maliyeti | `cac` | `CAC` | Satış & Müşteri |
| `customer-lifetime-value` | Müşteri Yaşam Boyu Değeri | `ltv` | `LTV` | Satış & Müşteri |
| `ltv-cac-ratio` | LTV/CAC Oranı | `ltv_cac` | `LTV_CAC` | Satış & Müşteri |
| `break-even-quantity` | Başa Baş Satış Adedi | `basabas_noktasi` | `BREAK_EVEN_QUANTITY` | Kârlılık & Fiyatlama |
| `cash-runway` | Nakit Dayanma Süresi | `nakit_dayanim` | `RUNWAY` | Nakit & Likidite |
| `net-working-capital` | Net İşletme Sermayesi | `isletme_sermayesi` | `NET_WORKING_CAPITAL` | Nakit & Likidite |
| `inventory-turnover-dio` | Stok Devir ve DIO | `stok_devir` | `DIO` | Stok & Operasyon |
| `order-profitability` | Sipariş Kârlılığı | `pazaryeri_siparis_kari` | `ORDER_PROFITABILITY` | Kârlılık & Fiyatlama |

### Yalnız hızlı (11)

`fiyat_mimarisi`, `kar_hesabi`, `nakit_pozisyonu`, `roi`, `indirim_kar`, `kredi_maliyeti`, `ihracat_maliyet`, `kdv_ekleme`, `kasa_kapanis`, `vade_farki`, `birim_maliyet`.

### Yalnız detaylı (16)

`CURRENT_RATIO`, `QUICK_RATIO`, `DUPONT_3_STEP`, `PROFIT_TO_CASH`, `CASH_CONVERSION_CYCLE`, `DSO`, `DPO`, `CONTRIBUTION_MARGIN`, `PRODUCT_PROFITABILITY`, `POST_RETURN_MARGIN`, `CAC_PAYBACK`, `GROSS_BURN`, `NET_BURN`, `NPV`, `IRR`, `WACC_FCFF_DCF`.

## Altı niyet kategorisi

| Kategori | Hesaplar |
|---|---|
| Nakit & Likidite | Nakit Pozisyonu, Net İşletme Sermayesi, Nakit Dayanma Süresi, Kasa Kapanışı, Vade Farkı, Kredi Maliyeti, Cari Oran, Asit-Test, Kârdan Nakde, Brüt Burn, Net Burn |
| Kârlılık & Fiyatlama | Fiyat Mimarisi, Kâr ve Marj, Başa Baş, İndirim Kârlılığı, KDV Ekleme, Sipariş Kârlılığı, Katkı Payı, Ürün Kârlılığı, İade Sonrası Marj, DuPont |
| Satış & Müşteri | CAC, LTV, LTV/CAC, CAC Geri Ödeme |
| Stok & Operasyon | Stok Devir ve DIO, Gerçek Birim Maliyet, İhracat Birim Maliyeti, Nakit Dönüşüm Döngüsü, DSO, DPO |
| Yatırım & Büyüme | ROI, NPV, IRR |
| Değerleme & İleri Analiz | WACC ve FCFF DCF |

Anlam olarak açıkta kalan hesap yoktur. `DuPont` finansal analiz niteliği taşısa da kullanıcının “kârlılığın kaynağı ne?” niyetine daha yakın olduğu için Kârlılık & Fiyatlama grubuna konmuştur. `KDV Ekleme` operasyonel bir günlük işlem olsa da fiyatın vergi dahil/hariç dönüşümünü yaptığı için Kârlılık & Fiyatlama altında tutulmuştur.

## Riskler ve güvenli uygulama sınırı

- CAC, LTV, runway, stok/DIO ve sipariş kârlılığı aynı girdide aynı sonucu garanti etmez. UI bunları “aynı sonucun daha detaylısı” diye sunmamalı; yöntem farkını açıklamalıdır.
- `nakit_dayanim` geçmişte burn=0 için 99 ay kaydetmiş olabilir. Migration yapılmamalıdır; yeni gösterimde sentinel değer “nakit tüketimi yok” olarak yorumlanabilir.
- Hızlı LTV gelir bazlı, detaylı LTV brüt kâr bazlıdır. LTV/CAC karşılaştırmasında metodoloji etiketi kaydedilmeden çapraz kullanım yanıltıcıdır.
- Hızlı ve detaylı hesap kayıtları farklı tablolarda ve route’larda yaşamaktadır. Birleşik katalog bu aşamada presentation/definition katmanıdır; kayıt geçmişini bir araya getirmek ayrı, geriye uyumlu bir veri tasarımı gerektirir.
- Basit mod için kaynak/güven/hassasiyet uydurulmamalıdır. Bu alanlar yalnız model motorunun gerçek çıktısında gösterilir.
- `/app/tools`, `/app/tools?view=models`, `/app/finance/models` ve `/app/finance/models/:modelCode` deep linkleri redirect veya compatibility görünümüyle korunmalıdır.
