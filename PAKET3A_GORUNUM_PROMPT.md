# LOCAL KARAR — PAKET 3A: GÖRÜNÜM (Dashboard kompozisyonu)

Paket 1-2'de renk sistemi, tokenlar, kabuk (sidebar/header) ve motion altyapısı
tamamlandı. Bu paket **kompozisyon** işidir: Ana Sayfa'yı onaylanan mockup
yerleşimine geçirmek ve iki imza görsel öğesini (Signature Dark Panel,
Mirror Sweep) sisteme eklemek.

Kapsam: **yalnızca Ana Sayfa (Dashboard) ve onun kullandığı ortak bileşenler.**
Diğer sayfalara dokunma.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## Yeni ortak bileşen 1 — Signature Dark Panel

`components/ui/DarkPanel.jsx` + `DarkPanel.module.css` oluştur.

- Zemin `--brand-teal-deep`, metin `--sidebar-active-text` / `--sidebar-text`.
- Sağ üst köşe kesik (clip-path ile ~18px pah). Diğer köşeler `--radius`.
- Üst kenarda çok ince altın (`--brand-gold`) hairline.
- Hafif iç yansıma: üstten alta çok düşük opaklıkta beyaz gradyan overlay
  (pseudo-element, `pointer-events: none`).
- **Neon/parlama/hologram yok. Görsel/illüstrasyon yok.**
- Props: `children`, `className`, `onClick`, `sweep` (bkz. aşağı).

**Kullanım sınırı: Ana Sayfa'da en fazla 3 koyu panel.** Bunlar:
1. Net Durum KPI kartı
2. Önerilen Karar Aracı kartı
3. Son Karar Sonucu (fiş) kartı

Başka hiçbir kart koyu olmayacak.

## Yeni ortak bileşen 2 — Mirror Sweep

`DarkPanel` ve `Button variant="cta"` üzerinde hover'da **tek seferlik** ince
ışık taraması.

- Pseudo-element, dar açılı beyaz gradyan şerit, `transform: translateX()` ile
  soldan sağa geçer. Süre `--dur-slow` (320ms), easing `--ease-standard`.
- `overflow: hidden`, `pointer-events: none`.
- Yalnızca `@media (hover: hover) and (pointer: fine)` içinde. Mobilde yok.
- `prefers-reduced-motion` altında çalışmaz (global kural zaten var, ama
  bileşende de açıkça kapat).
- Açık renkli kartlarda KULLANILMAZ.

---

## Ana Sayfa yerleşimi

Mevcut veri bağlantılarını KORU. Yeni sahte veri ekleme. Aşağıdaki her blok
için veri yoksa mevcut boş durum davranışı sürsün.

### 1. Karşılama (mevcut, dokunma)
"Hoş geldin, {ad} — {işletme}" + alt metin + sağda tek turuncu CTA.

### 2. KPI şeridi (mevcut veri, yeni görünüm)
5 kart yan yana: Alacaklar, Borçlar, **Net Durum (koyu panel)**, Geciken Kayıt,
Açık Kayıt. Veri kaynağı değişmiyor (`api.workspace.tracker.summary`).
- Her kartta: küçük etiket, büyük değer, altında tek satır bağlam metni.
- Net Durum koyu panel olacak; negatifse değer `--danger-bg` tonunda,
  pozitifse açık yeşil.
- İşletme yoksa mevcut boş durum kartı korunur (koyu panel gösterilmez).

### 3. Hızlı erişim (mevcut, görünüm güncellemesi)
5 kart. Her kartta: sol üstte koyu kare ikon karosu (`--brand-teal` zemin,
fildişi ikon), başlık, altında küçük durum metni, sağda chevron.
Kart hover `translateY(-2px)`.

### 4. Ana ızgara — 3 kolon (masaüstü)

**Sol kolon:**
- *Kaldığın yerden devam et* — her satırda kurs adı, "Ders x/y • %n tamamlandı",
  ince ilerleme çubuğu, sağda "Devam et" (teal, outline).
- *Görevler* — üstte durum rozetleri (tamamlandı / bekliyor / yüksek öncelik
  sayıları). Her satırda kutucuk + başlık + sağda tarih/öncelik rozeti.
  Öncelik skalası: Düşük yeşil, Orta turuncu, Yüksek bordo. Tamamlanan görev
  üstü çizili ve soluk.

**Orta kolon:**
- *Bugünün İçgörüsü* — açık kart, küçük ikon + 2-3 satır metin + chevron.
  İçerik gerçek veriden türetilecek (ör. tracker net durumu, geciken sayısı,
  ortalama ilerleme). **Metni uydurma; veri yoksa kartı gösterme.**
- *Son Karar Sonucu* — **koyu panel, fiş görünümü** (alt kenar tırtıklı).
  Veri: `api.decisionChecks.listSessions()` ile en son `completed` oturumu bul,
  `api.decisionChecks.getResult(sessionId)` ile sonucu çek. Kartta: küçük terazi
  ikonu + "KARAR FİŞİ" etiketi, ana metrik (net katkı), durum rozeti
  (Güçlü/Zayıf görünüm), tarih. Tamamlanmış oturum yoksa kartı gösterme.

**Sağ kolon:**
- *Önerilen Karar Aracı* — **koyu panel**. Başlık, 2 satır açıklama, süre ve
  gerekli veri etiketleri, altta buton. Buton turuncu DEĞİL (sayfanın tek
  turuncu CTA'sı karşılamada) — açık fildişi zeminli buton kullan.
- *Güncel haberler* — açık kart. Her satırda kategori rozeti + başlık + göreli
  zaman. Üstte "Tümünü gör" linki.

### 5. Alt içgörü şeridi
Tam genişlikte açık kart, 3 sütun. Her sütunda: yuvarlak ikon + kalın tek satır
başlık + bir satır açıklama. **İçerik gerçek veriden türetilecek** (nakit
durumu, kâr marjı veya ilerleme, risk/geciken). Veri yoksa şeridi gösterme.

---

## Kurallar

- Turuncu `#C1592B`: sayfada **tek** ana CTA (karşılama alanı). Başka hiçbir
  yerde buton zemini olarak kullanılmayacak. Rozet/skala kullanımı serbest
  (Orta öncelik).
- Bordo `#7A2E2E`: risk, gecikme, yüksek öncelik, negatif değer.
- Zeytin `#3E5D50`: pozitif değer, başarı, aktif durum.
- Koyu panel sayısı Ana Sayfa'da en fazla 3.
- Glass YOK (koyu paneller glass değil, düz koyu yüzey).
- Kart hover en fazla `translateY(-2px)`, buton hover `-1px`, active `0.98`.
- Yeni keyframe yazma; mevcut `fadeSlideUp` / `fadeSlideIn` / `growIn` kullan.
  Mirror sweep için tek yeni keyframe yazılabilir (`mirrorSweep`), o da
  `motion-glass-tokens.css` içine.
- Sabit hex yazma, hep `var(--token)`. Yeni token gerekiyorsa
  `motion-glass-tokens.css`'e ekle ve raporda belirt.
- **Sahte veri hardcode etme.** Mockup'taki rakamlar örnektir.
- Yeni görsel/illüstrasyon/stok görsel EKLEME.
- Tailwind EKLEME.
- Mobil: 3 kolon tek kolona insin, KPI 2'şerli, yatay scroll oluşmasın
  (`min-width: 0` zincirleri).

## Bitince

```
npm run build
npm test
```

İkisi de temiz olmalı.

## Raporla

- Yeni oluşturulan bileşen ve dosyalar
- Ana Sayfa'da kaç koyu panel var ve hangileri
- Hangi bloklar gerçek veriye bağlandı, hangileri veri yokluğunda gizleniyor
- Eklenen yeni token/keyframe (varsa)
- Build ve test sonucu
- Mockup'ta olup veri olmadığı için yapılamayan şeyler
