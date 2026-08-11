# LOCAL KARAR — KURS KARTI DÜZENİ

Kurs kartlarını dikey/uzun yapıdan, onaylanan tasarımdaki **yatay iki sütunlu**
yapıya geçirmek.

Kapsam: **yalnızca `pages/CoursesPage`** (+ `.module.css`).

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## Sorun

Şu an kart tek sütun: rozetler → başlık → açıklama → "Kurs çıktısı" kutusu
(tam genişlik, altta) → meta → ilerleme → buton. Kart dikey olarak uzuyor,
ızgara 3 sütun olduğu için kartlar dar ve sayfa seyrek görünüyor.

Onaylanan tasarımda kart **içeriden ikiye bölünmüş** ve ızgara **2 sütun**.

## Yapılacak

### 1. Izgara: 3 sütun → 2 sütun

- Masaüstü (≥1100px): **2 sütun**
- Tablet (700–1100px): 1 sütun
- Mobil: 1 sütun

`pageSize=6` aynı kalıyor → masaüstünde 3 satır.

### 2. Kart içi düzen: iki sütun

Kart kendi içinde yatay bölünsün:

```
┌─────────────────────────────────────────────┬──────────────────┐
│ [Kategori] [tür]                            │  ┌────────────┐  │
│ Kurs Başlığı                                │  │ ◎ Kurs     │  │
│ Açıklama metni (2 satır)                    │  │   çıktısı: │  │
│ 📖 5 ders   ⏱ 1s 50dk                       │  │   ...      │  │
│                                             │  │   (3 satır)│  │
│ ─────────────────────────  [ Kursa Git → ]  │  └────────────┘  │
└─────────────────────────────────────────────┴──────────────────┘
```

- Sol sütun (~62%): rozetler, başlık, açıklama, meta satırı
- Sağ sütun (~38%): "Kurs çıktısı" kutusu, dikeyde ortalı
- Sağ üstte seviye rozeti varsa kalabilir

### 3. Alt satır tek çizgide

Kartın en altında, **sol sütunun altında ama tam genişlikte** bir satır:
- Solda: ilerleme çubuğu + "İlerleme: %n" (kayıtlıysa) — kayıtlı değilse
  bu alan boş kalsın, buton yine sağda dursun
- Sağda: tek teal buton ("Devam Et" / "Kursa Git")

Buton artık kartın en altında tam genişlikte değil, **sağa yaslı ve kompakt**.

### 4. Meta satırında süre

Şu an yalnızca "N ders" görünüyor. Kurs verisi süre alanı taşıyorsa
("110 dk", "1s 50dk" gibi) meta satırına ekle. **Veri yoksa uydurma**,
yalnızca ders sayısı kalsın.

### 5. Kart yüksekliği

- Kartlar aynı satırda eşit yükseklikte olsun.
- Alt satır `margin-top: auto` ile en alta yapışsın.
- "Kurs çıktısı" kutusu sağ sütunda dikeyde ortalansın.

### 6. Devam eden kurs kartları

Aynı iki sütunlu düzeni kullansınlar **ama** sağ sütun boş kalacağı için
(kayıt verisinde açıklama/çıktı yok) bu bölüm **tek sütunlu kompakt** haliyle
kalsın — mevcut hali doğru, dokunma.

### 7. Liste görünümü

Zaten yatay tek satır; dokunma. "Kurs çıktısı" liste görünümünde gizli kalsın.

---

## Kurallar

- Turuncu: sayfada tek (öğrenme yolu panelindeki CTA). Kart butonları teal.
- Koyu panel: 1 (öğrenme yolu şeridi).
- Glass YOK. Kart hover `translateY(-2px)`.
- Sabit hex yazma, hep `var(--token)`.
- Yeni keyframe, token veya ortak bileşen YAZMA.
- Tailwind EKLEME. Görsel / kapak resmi / avatar EKLEME.
- Sahte veri hardcode etme.
- Mobilde iki sütun tek sütuna insin, çıktı kutusu açıklamanın altına geçsin,
  yatay scroll oluşmasın.

## Bitince

```
npm run build
npm test
```

## Raporla

- Değiştirilen dosyalar
- Izgara ve kart içi sütun oranları
- Süre alanı verisi bulundu mu, bulunduysa hangi alandan
- Kart yükseklikleri eşitlendi mi
- Build ve test sonucu
