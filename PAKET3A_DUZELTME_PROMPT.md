# LOCAL KARAR — PAKET 3A DÜZELTMELERİ

Paket 3A tarayıcıda incelendi. Dört düzeltme gerekiyor. Yeni özellik ekleme,
yerleşim değiştirme — yalnızca aşağıdakiler.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## 1. Fiş kartı yanlış metriği öne çıkarıyor

Dosya: `pages/Dashboard.jsx` → `receiptMetric()`

Sorun: `calculation.contribution` yoksa `calc.metrics[0]`'a düşülüyor. İndirim
aracında `metrics[0]` "İndirimli fiyat" — bu bir **girdi yankısı**, karar
çıktısı değil. Ekranda fiş kartı "İndirimli fiyat ₺190" gösteriyor; oysa o
kararın sonucu "UYGUN".

Snapshot'ta zaten mevcut olan alanlar (StructuredDecisionTool bunları
kullanıyor, bkz. `components/decision-checks/StructuredDecisionTool.jsx:49-50`):
- `calculation.decisionLabel` → kararın manşeti (ör. "UYGUN")
- `calculation.summary` → tek cümlelik açıklama

Yapılacak:
- Fiş kartının manşeti **`decisionLabel`** olsun (yoksa mevcut mantığa düş).
- Manşetin altında `summary`'den tek satır (kısaltılmış) gösterilebilir.
- Sayısal metrik ikincil satır olarak kalsın; ama `metrics[0]`'a körlemesine
  düşme. Öncelik sırası: `contribution` → adı "katkı"/"net"/"marj" geçen ilk
  metrik → hiçbiri yoksa sayısal metrik gösterme.
- Girdi yankısı olan metrikleri (fiyat, adet gibi kullanıcının kendi girdiği
  değerler) manşet yapma.

## 2. Rozet dili ile sonuç sayfası dili çelişiyor

Dosya: `pages/Dashboard.jsx` → `receiptTone()`

Sorun: Fiş kartı "Güçlü görünüm" derken sonuç sayfası aynı karar için "UYGUN"
diyor. İki farklı sözlük.

Yapılacak:
- `decisionLabel` varsa rozet olarak **onu** kullan (kararın kendi dili).
- `decisionLabel` yoksa mevcut riskLevel eşlemesi (Güçlü görünüm / Dikkat
  gerekiyor / Zayıf görünüm) yedek olarak kalsın.
- Renk kuralı aynı: olumlu → zeytin ailesi, dikkat → hardal, olumsuz → bordo.

## 3. Sayfa adı tutarsızlığı

Sidebar ve header "Karar Araçları" diyor, sayfanın `h1`'i "Karar Kontrolleri".

Yapılacak:
- `pages/DecisionCheckList.jsx:106` → `<h1>Karar Araçları</h1>`
- Aynı sayfada ve alt sayfalarda geçen diğer "Karar Kontrolleri" / "karar
  kontrolü" ifadelerini de "Karar Araçları" / "karar aracı" olarak güncelle
  (kullanıcıya görünen metinler; değişken/route/kod isimlerine DOKUNMA).
- `decisionChecks` gibi teknik isimler ve route'lar aynen kalacak.

## 4. Tipografi ölçeği sayfalar arasında kopuk

Sorun: `DecisionCheckList.css` `h1` → `clamp(2rem, 4vw, 3rem)` (32–48px).
Dashboard karşılama başlığı → `1.35rem` (~22px). Aynı uygulamada iki ayrı
başlık dili var, sayfa geçişinde göze çarpıyor.

Yapılacak:
- Sayfa başlıkları için tek ölçek belirle ve `tokens.css`'e ekle:
  - `--font-size-page-title: 1.5rem` (mobilde 1.3rem)
- `DecisionCheckList` ve benzer şekilde büyük `h1` kullanan diğer sayfaları
  (`ToolsPage`, `CoursesPage`, `KnowledgePage`, `FinancialModelLibrary`,
  `SettingsPage` — hangileri varsa) bu token'a geçir.
- Zaten üstte kompakt header'da sayfa adı yazıyor; sayfa içi `h1` ona rakip
  olmamalı, destekleyici kalmalı.
- Alt başlık/eyebrow boyutlarını da orantılı küçült; sayfa üstündeki boşluğu
  azalt (şu an Karar Araçları sayfasının üstü çok boş).

## 5. Kontrol edilecek: header altındaki açık dikdörtgen

Karar Araçları liste ve sonuç sayfalarında, üst barın hemen altında, sayfa
başlığının sağında ince açık renkli bir dikdörtgen görünüyor. Ana Sayfa'da yok.

Yapılacak: bu artığın kaynağını bul (boş bir eyebrow/skeleton/stray element
olabilir) ve gider. Gerçekten yoksa raporda "bulunamadı" diye belirt.

---

## Kurallar (değişmedi)

- Turuncu: sayfa başına tek ana CTA.
- Bordo: yalnızca risk / uyarı / yıkıcı işlem.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe yazma.
- Tailwind EKLEME.
- Sahte veri hardcode etme.

## Bitince

```
npm run build
npm test
```

## Raporla

- Değiştirilen dosyalar
- Fiş kartının artık hangi alanı manşet yaptığı
- Tek ölçeğe geçirilen sayfa listesi
- Dikdörtgen artığının kaynağı (veya bulunamadığı)
- Build ve test sonucu
