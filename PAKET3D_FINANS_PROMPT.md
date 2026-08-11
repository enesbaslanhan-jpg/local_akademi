# LOCAL KARAR — PAKET 3D: FİNANS YÜZEYİ

Finans Merkezi ve Model Laboratuvarı sayfalarını, Ana Sayfa ve öğrenme
yüzeyinde kurulan kompozisyon diline geçirmek.

Yeni bileşen, yeni token, yeni keyframe GEREKMİYOR.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

Kapsam: `pages/ToolsPage`, `pages/FinancialModelLibrary`,
`pages/FinancialModelWorkspace` (+ `.module.css`). Başka sayfaya dokunma.

Not: `ToolsPage.module.css` zaten sabit hex barındırmıyor (Paket 2'de
temizlenmiş). Kalan hex'ler: `FinancialModelLibrary` 18,
`FinancialModelWorkspace` 46 — bunlar temizlenecek.

---

## Kullanılacak mevcut altyapı (yeniden yaratma)

- `tokens.css`, `motion-glass-tokens.css`
- `components/ui/` — Card, Button, Badge, Progress, EmptyState, Tabs, Loading
- `components/ui/DarkPanel` — imza koyu panel

---

## 1. Finans Merkezi (`ToolsPage`)

Bu sayfa hesaplayıcı listesi + hesaplama paneli + geçmiş yapısında. Yapıyı
değiştirme, hizala.

- Üstte kompakt başlık bloğu (`--font-size-page-title` + tek satır açıklama).
  Mevcut `hero` alanını sadeleştir; büyük dekoratif blok olmasın.
- Kategori sekmeleri / filtreler tek satırda, mobilde kaydırılabilir.
- **Formül kartları listesi:** her kartta ikon karosu (koyu teal zemin,
  fildişi ikon — Ana Sayfa'daki hızlı erişim kutusuyla aynı dil), başlık,
  tek satır açıklama, kategori rozeti. Seçili kart `--primary-light` zeminli,
  sol kenarında ince teal çizgi.
- **Hesaplama paneli:** girdi alanları ızgarada, her alanın etiketi üstte,
  yardım metni küçük ve `--text-light`. Alanlar `--white` zemin + `--border`.
- **Sonuç kutusu:** hesaplama sonrası beliren blok. Ana metrik büyük ve
  ayrı, destekleyici metrikler altında ızgarada. Uyarı satırı varsa bordo
  ailesinde (`--danger-bg` zemin + `--danger` metin).
- **Geçmiş listesi:** her satırda formül adı, tarih, ana sonuç değeri.
- Sonuç boşken `EmptyState` (Paket 2'de bağlanmıştı, korunsun).

Koyu panel: **en fazla 1** — sonuç kutusunun ana metrik bölümü olabilir.
Zorunlu değil; sayfa kalabalıksa hiç kullanma.

Ana CTA (turuncu): **tek** — "Hesapla". Diğer tüm butonlar teal/nötr.

## 2. Model Kütüphanesi (`FinancialModelLibrary`)

- Kompakt başlık + tek satır açıklama.
- Üstte küçük istatistik şeridi (mevcut `heroStats`) — Ana Sayfa KPI kartı
  diliyle, ama daha küçük: etiket + değer, koyu panel yok.
- Model kartları ızgarası: 3-2-1 sütun. Her kartta ikon karosu, model adı,
  kısa açıklama, kategori ve seviye rozetleri, altta tek teal buton.
- Kart hover `translateY(-2px)`.
- 18 sabit hex → `var(--token)`.
- Boş durum: `EmptyState`.

Koyu panel: kullanma. Ana CTA (turuncu): kullanma (kart başına tekrarlayan
aksiyon → hepsi teal).

## 3. Model Çalışma Alanı (`FinancialModelWorkspace`)

Bu sayfa en karmaşığı: sekmeler, parametre paneli, senaryolar, çıktı panosu,
duyarlılık, kontroller, kaynaklar, sürümler. **Yapıyı değiştirme**, yalnızca
görsel dile geçir ve hiyerarşiyi netleştir.

- Üst blok: geri bağlantısı, eyebrow, başlık (`--font-size-page-title`),
  açıklama. Mevcut gradyanlı `header` bloğunu düz `--white` karta çevir.
- Sekmeler: aktif sekmede ince teal alt çizgi, pasifler `--text-light`.
- **Parametre paneli (`.inputPanel`)** — Paket 1'de glass verilmişti,
  o KORUNACAK (izinli glass alanlarından biri).
- Senaryo seçicileri: seçili olan `--primary-light` zemin + teal kenarlık.
- **Çıktı panosu:** güven rozeti (`confidenceBadge`) — yüksek zeytin,
  orta hardal, düşük bordo. Metrik kartları `--white` + `--border`;
  anlam rengi yalnızca değerde, zeminde değil.
- Duyarlılık ve karşılaştırma blokları: `--bg-tertiary` zemin, sol kenarda
  ince teal çizgi.
- Kontrol satırları: geçti zeytin ✓, kaldı bordo ✗.
- Kaynaklar ve sürümler: sade liste, hover'da kenarlık teal'e döner.
- 46 sabit hex → `var(--token)`. Özellikle `#0f766e` (eski teal) →
  `--brand-ink` veya `--brand-teal`, `#ecfdf5` → `--success-bg`,
  `#fef2f2`/`#991b1b` → `--danger-bg`/`--danger`.

Koyu panel: **en fazla 1** — çıktı panosunun ana sonuç başlığı olabilir.
Ana CTA (turuncu): **tek** — "Modeli Çalıştır" (`runBar` içindeki).

---

## Kurallar

- Turuncu `#C1592B`: sayfa başına en fazla bir ana CTA. Emin değilsen kullanma.
- Bordo `#7A2E2E`: yalnızca risk / uyarı / başarısız kontrol / yıkıcı işlem.
- Zeytin `#3E5D50`: pozitif değer, geçen kontrol, yüksek güven.
- Hardal (`--warning`): orta seviye uyarı.
- Koyu panel: her sayfada en fazla 1, Model Kütüphanesi'nde 0.
- Glass: yalnızca mevcut `.inputPanel` (yeni glass alanı ekleme).
- Kart hover en fazla `translateY(-2px)`; buton hover `-1px`, active `0.98`.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe, yeni token, yeni ortak bileşen YAZMA.
- Tailwind EKLEME. Yeni görsel / stok görsel EKLEME.
- Sahte veri hardcode etme; alan yoksa o satırı gösterme.
- Mobil ve masaüstü responsive, yatay scroll oluşmasın (`min-width: 0`).
- Mevcut işlevler kaybolmasın: hesaplama, senaryo değiştirme, model çalıştırma,
  karar kutusu kaydetme, doküman/kaynak bağlantıları, sürüm geçmişi.

## Bitince

```
npm run build
npm test
```

İkisi de temiz olmalı (referans: 23 test dosyası, 126 test geçiyor).

## Raporla

- Değiştirilen dosyalar
- Her sayfada ana CTA hangi buton (yoksa "yok")
- Koyu panel nerede kullanıldı (kullanılmadıysa "yok")
- Temizlenen sabit hex sayısı (dosya başına)
- `.inputPanel` glass'ının korunup korunmadığı
- Gerçek veri olmadığı için gösterilemeyen alanlar
- Build ve test sonucu
