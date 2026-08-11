# PAKET 6 — Palet B geçişi (mavi-teal + soğutulmuş nötr)

## Bağlam

`frontend/src/styles/tokens.css` yeniden yazıldı. Artık tek tek hex değil,
**dört adet 11 kademeli rampa** var: `--brand-*`, `--neutral-*`, `--accent-*`,
`--gold-*`. Ayrıca dört kademeli yüzey (`--surface-canvas / -panel / -card /
-raised / -dark`) ve dört kademeli gölge (`--shadow-1..4` + `--shadow-dark`)
tanımlandı.

Eski değişken isimleri (`--bg`, `--white`, `--border`, `--text`, `--brand-teal`
vb.) **korundu** ve yeni rampalara eşlendi. Yani token kullanan modüller
otomatik geçti.

**Sorun:** yaklaşık 40+ dosyada hâlâ sıcak krem/yeşil-teal hex değerleri
hardcode edilmiş durumda. Bunlar yeni soğuk zeminle çakışıyor.

Bu paketin işi: (A) kalan hardcode renkleri tokena çevirmek, (B) yüzey/gölge
kademelerini gerçekten kullanmak.

---

## Değişmeyecek olanlar

- Backend, route, veri modeli, API bağlantıları ve iş mantığı **değişmeyecek**.
- Tailwind **kurulmayacak**. Proje CSS Modules kullanıyor.
- İçerik veya route **silinmeyecek**. Admin kullanıcı görünümü bozulmayacak.
- Sahte/uydurma veri hardcode edilmeyecek.
- Yeni görsel eklenmeyecek.
- **Commit/push yapılmayacak.**
- `tokens.css` ve `motion-glass-tokens.css` içindeki rampa tanımları
  değiştirilmeyecek — sadece kullanılacak.

---

## İŞ 1 — Hardcode renkleri tokena çevir

`frontend/src/` altındaki tüm `.module.css`, `.css` ve `.jsx` dosyalarında
aşağıdaki değerleri ara ve değiştir. Büyük/küçük harf duyarsız ara.

### Metin ve nötr

| Eski (sıcak) | Yeni |
|---|---|
| `#1d1c15`, `#2A231C` | `var(--text)` |
| `#717976`, `#7C6E58` | `var(--text-light)` |
| `#F3E9D8` | `var(--surface-canvas)` |
| `#FFFDF8`, `#fffaf0`, `#f9f7ef`, `#fff` (kart zemini olarak) | `var(--surface-card)` |
| `#EFE3CD` | `var(--surface-panel)` |
| `#E4D8BC` | `var(--border)` |

> Not: `#fff` her yerde değiştirilmeyecek. Yalnızca **kart/panel zemini**
> olarak kullanıldığı yerlerde `var(--surface-card)` olacak. Koyu zemin
> üstündeki **metin rengi** olarak duran `#fff` olduğu gibi kalabilir veya
> `var(--brand-50)` yapılabilir.

### Marka (yeşil-teal → mavi-teal)

| Eski | Yeni |
|---|---|
| `#15332D`, `#15332d` | `var(--brand-700)` |
| `#163832` | `var(--brand-600)` |
| `#1A3D36`, `#2A4B42` | `var(--brand-600)` |
| `#1E4941`, `#245148`, `#46645d`, `#153b47` | `var(--brand-500)` |
| `#3E5D50` | `var(--brand-400)` |
| `#0a211c`, `#001e19` | `var(--brand-900)` |

### Vurgu ve durum

| Eski | Yeni |
|---|---|
| `#c1592b`, `#C1592B` | `var(--accent-500)` |
| `#7a2e2e`, `#7A2E2E` | `var(--danger)` |
| `#B8923F` | `var(--gold-500)` |
| `#8A6D1E` | `var(--gold-600)` |

### rgba() değerleri

Sıcak/yeşil rgba'ları `color-mix` ile tokena bağla. Alfa değerini koru:

| Eski | Yeni |
|---|---|
| `rgba(21, 51, 45, A)` | `color-mix(in srgb, var(--brand-900) {A*100}%, transparent)` |
| `rgba(21, 59, 71, A)` | `color-mix(in srgb, var(--brand-900) {A*100}%, transparent)` |
| `rgba(231, 226, 216, A)` | `color-mix(in srgb, var(--surface-panel) {A*100}%, transparent)` |
| `rgba(232, 227, 216, A)` | `color-mix(in srgb, var(--surface-panel) {A*100}%, transparent)` |
| `rgba(249, 247, 239, A)`, `rgba(220, 218, 209, A)` | `color-mix(in srgb, var(--surface-card) {A*100}%, transparent)` |
| `rgba(113, 121, 118, A)` | `color-mix(in srgb, var(--neutral-500) {A*100}%, transparent)` |
| `rgba(42, 35, 28, A)`, `rgba(0, 30, 25, A)` | `rgba(18, 23, 23, A)` (soğuk gölge) |

**Gölgelerdeki** `rgba(...)` değerleri için: mümkünse doğrudan
`var(--shadow-1..4)` kullan (İŞ 2'ye bak). Değilse gölge rengini
`rgba(18, 23, 23, A)` yap.

### Bilinen yoğun dosyalar

Sweep'i tüm `src/` üzerinde yap, ama bu dosyalarda çok sayıda eşleşme var:

- `src/pages/Workspaces/Overview.module.css`
- `src/pages/MentorPage.module.css`
- `src/pages/CommunityPage.module.css`
- `src/components/mentor/MentorMessageBubble.module.css`
- `src/components/mentor/MentorComposer.module.css`
- `src/styles/buttons.css`
- `src/pages/DecisionToolsPage.jsx` (bunda ayrıca Tailwind sorunu var — İŞ 4)

---

## İŞ 2 — Gölge kademelerini gerçekten kullan

Şu an neredeyse her kart aynı gölgeyi kullanıyor; bu yüzden hiçbir şey
diğerinden yüksek durmuyor. `tokens.css` içinde dört kademe var:

```css
--shadow-1  /* satır içi öğe, chip, input */
--shadow-2  /* normal kart */
--shadow-3  /* hover'daki kart, açılır menü */
--shadow-4  /* modal, drawer, bottom-sheet */
--shadow-dark /* koyu panel: dış gölge + üstte 1px ışık çizgisi */
```

Kural:

1. Normal kart / panel → `box-shadow: var(--shadow-2)`
2. Kart hover → `box-shadow: var(--shadow-3)` (mevcut `translateY` korunur)
3. Modal, drawer, dropdown, bottom-sheet, toast → `var(--shadow-4)`
4. Input, chip, rozet, küçük buton → `var(--shadow-1)` veya gölgesiz
5. **Koyu zeminli her panel/kart** → `var(--shadow-dark)`

Madde 5 önemli: koyu yüzeylerin üstünde `inset 0 1px 0 rgba(255,255,255,.09)`
ışık çizgisi olmadan derinlik hissi oluşmuyor. `--shadow-dark` bunu içeriyor.

---

## İŞ 3 — Yüzey kademelerini uygula

Şu an zemin, panel ve kart neredeyse aynı değerde. Ayrıştır:

| Katman | Token |
|---|---|
| Sayfa zemini (`.app`, `main`) | `var(--surface-canvas)` |
| Bölüm paneli / gruplayıcı kutu | `var(--surface-panel)` |
| Kart | `var(--surface-card)` |
| Modal, dropdown, yüzen panel | `var(--surface-raised)` |
| Koyu imza paneli | `var(--surface-dark)` |
| Koyu panel içindeki kart | `var(--surface-dark-2)` |

Kart içinde kart varsa, içteki bir kademe **daha açık** olmalı — daha koyu
değil. Açık temada yükseklik artınca renk açılır.

Kenarlık: kart kenarı `var(--border-subtle)`, ayırıcı/vurgulu kenar
`var(--border-strong)`, koyu yüzeyde `var(--border-dark)`.

---

## İŞ 4 — `DecisionToolsPage.jsx` Tailwind temizliği

Bu dosya baştan sona Tailwind class'ı kullanıyor (`w-8`, `bg-[#3E5D50]`,
`rounded-2xl`, `hover:-translate-y-2` vb.). Tailwind kurulu olmadığı için
bu class'ların **hiçbiri CSS üretmiyor** — sayfa stilsiz render oluyor.

Projede daha önce uygulanan yöntemi burada da uygula:

1. `DecisionToolsPage.module.css` oluştur (veya varsa genişlet).
2. JSX'teki mevcut class string'lerini **silme**; yanlarına
   `className={`${styles.x} eski-class-string`}` şeklinde module class'ı ekle.
3. Gerçek stilleri module dosyasında token kullanarak yaz.

---

## İŞ 5 — Doğrulama

1. `npm run build` — hata yok.
2. `npm test` — mevcut testler geçiyor.
3. `src/` altında sıcak palet hex'i kalmadığını doğrula:

```
grep -rniE "#F3E9D8|#FFFDF8|#E4D8BC|#EFE3CD|#2A231C|#7C6E58|#1d1c15|#717976|#15332d|#163832|#3E5D50|#1E4941|rgba\(21, ?51, ?45|rgba\(231, ?226, ?216" frontend/src
```

Sonuç boş olmalı. (BrandMark.jsx ve tokens.css zaten güncellendi.)

4. Aşağıdaki sayfaların ekran görüntüsünü al ve rapora ekle:
   Ana Sayfa, Finans Merkezi, Kurslar, Karar Araçları, AI Mentor,
   İşletme Takibi (Overview), Topluluk, Ayarlar.

5. `prefers-reduced-motion` davranışı bozulmadı mı kontrol et.

---

## Rapor

İş bittiğinde şunları raporla:

- Değiştirilen dosya sayısı ve listesi
- İŞ 5.3'teki grep çıktısı (boş olmalı)
- Build/test sonucu
- Ekran görüntüleri
- Sende soru işareti bırakan yerler (özellikle `#fff`'in kart zemini mi
  metin rengi mi olduğu belirsiz kalan satırlar)
