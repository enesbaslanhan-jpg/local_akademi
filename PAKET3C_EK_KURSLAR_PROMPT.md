# LOCAL KARAR — 3C EK: KURSLAR SAYFASI DÜZENİ

Kurslar sayfasını bölümlü, filtreli ve sayfalanmış bir düzene geçirmek.

Kapsam: **yalnızca `pages/CoursesPage`** (+ `.module.css`). Başka sayfaya
dokunma. Ders oynatıcı ve Kayıtlarım bu pakette değil.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

Ön koşul: `PAKET3BC_DUZELTME_PROMPT.md` uygulanmış olmalı (sayfa `h1` kuralı
ve `DarkPanel` pahsız varyantı burada kullanılacak).

---

## 1. Üst koyu panel — öğrenme yolu şeridi

- `DarkPanel` kullan, **pahsız varyant** (`bevel={false}`) — geniş şerit.
- İçerik, kullanıcının **mevcut öğrenme yolundan** gelir (Ana Sayfa'daki
  `currentLearningPath` ile aynı kaynak):
  - Küçük eyebrow etiketi: "ÖĞRENME YOLUN"
  - Yol adı + tek satır açıklama
  - Meta satırı: kurs sayısı · ders sayısı · toplam süre (yalnızca veri varsa)
  - İlerleme: yüzde + `Progress` + "x / y ders tamamlandı"
  - Yolun kurs listesi: her satırda durum ikonu (tamamlandı ✓ zeytin /
    devam eden / başlanmadı soluk), kurs adı, sağda yüzde veya "Başlamadı".
    Sıradaki kurs satırı hafif vurgulu.
  - Tek turuncu CTA: "Yolculuğa Devam Et"
- **Öğrenme yolu verisi yoksa paneli hiç gösterme.** Yerine boşluk bırakma,
  doğrudan filtre satırıyla başla.
- **Dekoratif görsel / grafik EKLEME.** Panel yalnızca tipografi, rozet ve
  ilerleme çubuğundan oluşsun.
- Sweep kapalı (sık bakılan yüzey).

Bu, sayfadaki **tek** koyu panel ve **tek** turuncu CTA olacak.

## 2. Filtre ve görünüm satırı

Tek satır, mobilde sarmalanır:
- Solda: arama kutusu (ikonlu)
- Ortada: mevcut filtre seçicileri (alan / seviye / tür — backend hangilerini
  destekliyorsa; **desteklenmeyen filtre uydurma**)
- Sağda: sıralama seçicisi + ızgara/liste geçiş düğmesi (iki ikonlu segment)

Izgara/liste tercihi bileşen state'inde tutulsun (kalıcı saklama gerekmez).

## 3. Bölümler

**A. "Devam ettiğin kurslar"** — yalnızca kayıtlı ve devam eden kurslar.
- Sayfalamaya dahil DEĞİL, en fazla 2 kart göster.
- Sağ üstte "Toplam ilerleme: %n" (hesaplanabiliyorsa) ve "Tümünü gör"
  bağlantısı → Kayıtlarım sayfasına.
- Kayıtlı devam eden kurs yoksa bölümü gösterme.

**B. "Tüm kurslar"** — asıl liste. Sayfalanmış.
- Başlığın yanında toplam sayı: "Tüm kurslar (24)".

Not: Bölüm başlıkları `--font-size-page-title` değil, Ana Sayfa'daki
`sectionTitle` ölçeğinde olsun (0.88rem, semibold).

## 4. Sayfalama — sayfa başına 6 kurs

Backend zaten destekliyor: `GET /courses?page=&pageSize=` (varsayılan 12,
üst sınır 50).

- `pageSize=6` gönder.
- Izgara masaüstünde 3 sütun → 6 kurs iki satır olur.
- Alt kısımda sayfalama: önceki / sayfa numaraları / sonraki + "Sayfa 2 / 4"
  bilgisi. Mevcut `pagination` / `pageInfo` sınıfları varsa onları kullan.
- Sayfa değişince listenin başına kaydır.
- Filtre veya arama değişince sayfa 1'e dön.

## 5. Kart içeriği (ızgara görünümü)

Mevcut kart yapısı korunuyor, sadece hizalanıyor:
- Üstte kategori ve tür rozetleri; sağ üstte seviye rozeti (varsa)
- Başlık (2 satır kırpma)
- Açıklama (2 satır kırpma)
- "Kurs çıktısı" kutusu — **daha kompakt olsun**: şu an kartın yarısını
  kaplıyor. Punto küçült, 2 satırda kırp, iç boşluğu azalt.
- Meta satırı: ders sayısı · süre
- Kayıtlıysa ince `Progress` + "İlerleme: %n"
- Altta tek teal buton (`margin-top: auto` ile kartlar eşit hizalansın)

**Yer imi / kaydet ikonu EKLEME** — arkasında backend yok, ayrı pakette
yapılacak.

**Katılımcı sayısı, avatar yığını, puan/yıldız EKLEME** — bu veriler
backend'de yok, uydurulmayacak.

## 6. Liste görünümü

Izgara/liste düğmesi listeye alındığında:
- Tek sütun, her kurs bir geniş satır
- Solda başlık + açıklama (tek satır kırpma), ortada rozetler, sağda meta ve
  buton
- "Kurs çıktısı" kutusu liste görünümünde gizlensin (yer yok)

## 7. Kaldırılacak

- Sayfa altındaki tanıtım/pazarlama şeridi türü blok **eklenmeyecek**.
- Boş durum: mevcut `EmptyState` korunsun; filtre sonucu boşsa "Filtreleri
  temizle" aksiyonu sunulsun.

---

## Kurallar

- Turuncu `#C1592B`: sayfada **tek** — öğrenme yolu panelindeki CTA. Panel
  yoksa sayfada hiç turuncu olmasın (kart butonları teal).
- Bordo `#7A2E2E`: yalnızca risk / uyarı.
- Koyu panel: **1** (öğrenme yolu şeridi), o da veri varsa.
- Glass YOK.
- Kart hover `translateY(-2px)`.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe, yeni token, yeni ortak bileşen YAZMA.
- Tailwind EKLEME. Görsel / illüstrasyon / avatar EKLEME.
- **Sahte veri hardcode etme.** Alan yoksa satırı gösterme.
- Mobil: filtre satırı sarmalanır, ızgara tek sütuna iner, yatay scroll olmaz.

## Bitince

```
npm run build
npm test
```

## Raporla

- Değiştirilen dosyalar
- Öğrenme yolu paneli hangi veri kaynağına bağlandı, veri yoksa ne oluyor
- Backend'in gerçekten desteklediği filtre/sıralama parametreleri
- Sayfalama nasıl çalışıyor (pageSize, toplam sayfa bilgisi nereden geliyor)
- "Devam ettiğin kurslar" bölümü hangi koşulda gizleniyor
- Build ve test sonucu
