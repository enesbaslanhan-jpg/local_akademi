# LocalKarar Desktop Light - Internal QA

QA, iki bağımsız inceleme ile yapıldı: görsel özgünlük/ürün tadı ve kural/detector denetimi. Kapsam yalnız tasarım artefaktıdır; uygulama davranışı veya mobile adaptasyon bu aşamanın parçası değildir.

## Sonuç

- Warm Petrol rol disiplini: geçti. Petrol CTA, seçili durum, progress ve gerekçeli signature yüzeylerle sınırlı; yeşil semantik başarı rolünde.
- CTA hiyerarşisi: geçti. 39 buton kullanımının 17'si primary, 22'si secondary/quiet/ghost.
- 18 ekran kapsamı ve adlandırma: geçti.
- Ekran ailelerinin ayrışması: kritik akışlar için geçti; ortak shell bilinçli olarak korunuyor.
- Detector: bir `dark-glow` uyarısı buldu. Renkli gölgeler nötr elevation gölgelerine çevrildi.
- Kontrast: muted/metadata rengi koyulaştırıldı; mineral katmanlar arasındaki tonal ayrım artırıldı; Warm Accent ve Success swatch metinleri koyu renge alındı.
- Motion: yalnız vocabulary olarak kullanıldı; runtime dependency eklenmedi. Reduced-motion kuralı eklendi.

## Uygulanan kritik düzeltmeler

| Önce | Sonra |
|---|---|
| Petrol tonlu ambient gölge | Nötr, düşük kromalı elevation gölgesi |
| Birbirine fazla yaklaşan canvas/surface katmanları | Daha okunur mineral canvas, sunken, surface ve raised ayrımı |
| 10px ve düşük kontrast metadata | 11px ve daha koyu metadata standardı |
| Course Player'da geniş, pasif dark alan | Ders bağlamına ait üç gerçek hesap göstergesi |
| Model Workspace'te bağı kopuk kartlar | Yönlü, okunabilir gelir-gider-tampon-risk akışı |
| Mentor'da zayıf işlem hissi | Doğrulanmış kaynak izi ve önerilen prompt eylemleri |
| Admin'de tekrar eden signature banner | Üst sınır çizgili operasyon/SLA özeti ve yoğun istisna kuyruğu |
| Dekoratif bar grafikler | Hedef çizgisi, dönem etiketi ve senaryo bağlamı |

## Kalan bilinçli kararlar

- Ortak sidebar/topbar ürün bütünlüğü için aynıdır; sayfa gövdeleri workbench, course, lesson, decision, receipt, ledger, result, model graph, conversation, editorial ve operations queue anatomileriyle ayrıştırılmıştır.
- HTML, Figma capture ve görsel onay için statik prototiptir. Simüle edilen alanlar gerçek uygulama kontrolü değildir.
- Mobile ve dark adaptasyonları, desktop-light aile onayından sonraki ayrı aşamadır.

