# LOCAL KARAR — PAKET 3C: ÖĞRENME YÜZEYİ

Kurslar, ders oynatıcı ve Kayıtlarım sayfalarını, Ana Sayfa'da kurulan
kompozisyon diline geçirmek.

**Bu paket Ana Sayfa'dan daha basit.** Yeni bileşen, yeni token, yeni keyframe
GEREKMİYOR. Her şey mevcut sistemde var; iş onları doğru dizmek.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

Kapsam: `pages/CoursesPage`, `pages/CoursePlayerPage`, `pages/EnrollmentsPage`
(+ `.module.css` dosyaları). Başka sayfaya dokunma.

---

## Kullanılacak mevcut altyapı (yeniden yaratma)

- `tokens.css` — renk, boşluk, `--font-size-page-title` / `-eyebrow` / `-intro`
- `motion-glass-tokens.css` — süre, easing, `--lift-card`, `fadeSlideUp`,
  `fadeSlideIn`, `mirrorSweep`
- `components/ui/` — Card, Button, Badge, Progress, EmptyState, Tabs, Loading
- `components/ui/DarkPanel` — imza koyu panel (sağ üst pah + altın hairline +
  isteğe bağlı sweep)

---

## 1. Kurslar (`CoursesPage`)

Yerleşim:
- Üstte kompakt başlık bloğu: `h1` (`--font-size-page-title`) + tek satır
  açıklama (`--font-size-page-intro`). Üst boşluğu dar tut.
- Altında tek satır araç çubuğu: arama kutusu solda, filtre/sıralama seçicileri
  sağda. Mobilde alt alta.
- Kurs kartları ızgarası: masaüstü 3 sütun, tablet 2, mobil 1.

Kurs kartı içeriği (hepsi gerçek veriden; alan yoksa satırı gösterme):
- Üstte kategori rozeti (`Badge`) ve varsa seviye rozeti
- Kurs başlığı (2 satırda kırp)
- Kısa açıklama (2 satırda kırp)
- Meta satırı: ders sayısı · süre
- Kayıtlıysa ince `Progress` çubuğu + "%n tamamlandı"
- Altta tek buton: kayıtlıysa "Devam et", değilse "Kursa git" — **teal
  (`variant="primary"`)**, turuncu değil (kart başına tekrarlayan aksiyon)
- Kart hover `translateY(-2px)`

**Görsel/kapak resmi EKLEME.** Kartlar tipografi ve rozetle ayrışsın.

Koyu panel: bu sayfada **kullanma** (kart ızgarası zaten yoğun).

Boş durum: mevcut `EmptyState` korunsun.

## 2. Ders oynatıcı (`CoursePlayerPage`)

Bu sayfa üç bölgeli kalacak; mevcut yapı korunuyor, sadece hizalanıyor.

**Üst şerit:**
- Breadcrumb: Kurslar › {kurs adı} › {ders adı} (küçük punto, `--text-light`)
- Kurs/ders başlığı + meta satırı (ders x/y · süre · seviye)
- Sağda ince ilerleme göstergesi

**Sol sütun — ders listesi:**
- Ders satırları: durum ikonu (tamamlandı ✓ zeytin / aktif / kilitli soluk),
  ders adı, süre
- Aktif ders satırı `--primary-light` zeminli, sol kenarında ince teal çizgi
- Mobilde mevcut açılır davranış korunsun

**Orta — içerik:**
- Sekmeler (mevcut `tabs`): aktif sekme altında ince teal çizgi, pasifler
  `--text-light`. Sekme çubuğu altında ince `--border` ayırıcı.
- Ders metni okunabilirlik için: satır uzunluğu ~70ch ile sınırlı,
  `--line-height-relaxed`, başlıklar arası nefes payı.
- Formül/örnek blokları: `--bg-tertiary` zemin, sol kenarda ince teal çizgi.
- Kaynak listesi: her satırda ikon + başlık + kaynak adı, hover'da alt çizgi.

**Sağ sütun (varsa; yoksa oluştur, ama yalnızca gerçek veriyle):**
- İlerleme kartı: yüzde + `Progress` + "x / y ders tamamlandı"
- Gömülü pratik kart bloğu zaten varsa burada özetlensin
- "Bu derste kazanacaklarınız" — mevcut `outcomeList` verisinden
- Ek kaynaklar — mevcut `sourcesList` verisinden

**Koyu panel: en fazla 1** — o da aktif ders başlığı bloğu (üst şerit).
`DarkPanel` kullan, `sweep` kapalı (sık bakılan bir yüzey, hareket yorucu olur).

**Ana CTA (turuncu): tek** — "Dersi tamamla" veya "Sonraki ders", hangisi
sayfanın asıl aksiyonuysa. Diğer tüm butonlar teal/nötr.

## 3. Kayıtlarım (`EnrollmentsPage`)

- Kompakt başlık bloğu (aynı ölçek).
- Kayıt kartları dikey liste (ızgara değil — her satır geniş).
- Her kartta: kurs başlığı, durum rozeti (Devam ediyor / Tamamlandı /
  Başlanmadı — sırasıyla teal / zeytin / nötr), `Progress`, son erişim tarihi,
  sağda "Devam et" butonu (teal).
- Koyu panel kullanma.
- Boş durum: `EmptyState` + "Kurslara göz at" aksiyonu.

---

## Kurallar

- Turuncu `#C1592B`: **sayfa başına en fazla bir** ana CTA. Emin değilsen
  kullanma, teal kullan.
- Bordo `#7A2E2E`: yalnızca risk / uyarı / yıkıcı işlem.
- Zeytin `#3E5D50`: tamamlandı, pozitif durum.
- Koyu panel: Kurslar 0, Ders oynatıcı en fazla 1, Kayıtlarım 0.
- Glass YOK.
- Kart hover en fazla `translateY(-2px)`; buton hover `-1px`, active `0.98`.
- Sabit hex yazma, hep `var(--token)`. Bu üç sayfada kalan eski hex'leri temizle.
- Yeni keyframe, yeni token, yeni ortak bileşen YAZMA.
- Tailwind EKLEME. Yeni görsel / kapak resmi / stok görsel EKLEME.
- Sahte veri hardcode etme; alan yoksa o satırı gösterme.
- Mobil ve masaüstü responsive, yatay scroll oluşmasın (`min-width: 0`).
- Mevcut işlevler kaybolmasın: sekmeler, ders ilerlemesi kaydetme, mentor
  bağlantısı, gömülü pratik kartlar, mobil açılır ders listesi.

## Bitince

```
npm run build
npm test
```

İkisi de temiz olmalı (referans: 23 test dosyası, 126 test geçiyor).

## Raporla

- Değiştirilen dosyalar
- Her sayfada ana CTA hangi buton
- Ders oynatıcıda koyu panel nereye kondu
- Temizlenen sabit hex sayısı (dosya başına)
- Gerçek veri olmadığı için gösterilemeyen alanlar
- Build ve test sonucu
