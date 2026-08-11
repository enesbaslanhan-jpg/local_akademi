# LOCAL KARAR — PAKET 2 KAPANIŞ

Önceki temizlik doğrulandı. Geriye iki gerçek iş kaldı; ikisi de önceki
turlarda kapsam kısıtı yüzünden bilinçli olarak ertelenmişti. Bu turda
ikisine de açıkça yetki veriliyor.

Backend, route, veri modeli, API bağlantıları ve iş mantığı DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## İş 1 — MentorPanel tam migrasyonu (YETKİ VERİLDİ)

Dosya: `components/mentor/MentorPanel.jsx` + `MentorPanel.module.css`

Durum: 44 `className` kullanımının yalnızca 4'ü module'lü. Başlık çubuğu,
sekmeler (Aktif / Arşiv), sohbet listesi ve içerik alanı hâlâ karşılıksız
Tailwind class'ı taşıyor — fiilen stilsiz render oluyorlar.

Önceki turda "yeniden stillendirme yapma" dediğim için dokunulmamıştı.
**Bu kısıt MentorPanel için kaldırıldı.** MentorPage'e uyguladığın tam
migrasyonun aynısını uygula.

- Mevcut `MentorPanel.module.css`'i genişlet (yeni dosya açma).
- Halihazırda çalışan glass/motion sınıflarını (`backdrop`, `drawer`,
  `drawerGlass`, `contextBarGlass`, `streamingBubble`) BOZMA.
- Yerleşimi mevcut görsel yapıya sadık tut: üstte başlık + geri/kapat,
  altında sekmeler, sonra kaydırılabilir liste veya sohbet alanı, en altta
  composer. Yeni bir bilgi mimarisi kurma.
- Tailwind string'lerini bu dosyada SİLEBİLİRSİN (module kapsamı %100
  olduğunda), MentorComposer'da yaptığın gibi.
- Yeni keyframe yazma.

## İş 2 — Karar Araçları CSS'inde sabit hex temizliği

Dosyalar:
- `components/decision-checks/ProfitabilityDecisionTool.css` (61 sabit hex)
- `components/decision-checks/StructuredDecisionTool.css` (63 sabit hex)

Bu iki dosya hâlâ eski mavi/slate paletinde (`#0f172a`, `#1d4ed8`, `#2563eb`,
`#64748b`, `#e2e8f0`, `#dbeafe` vb.). Karar Araçları ürünün amiral gemisi
özelliği; şu an marka dışı görünüyor.

Yapılacak:
- Tüm sabit hex'leri `var(--token)` ile değiştir. Yeni token ekleme.
- Anlam eşlemesi:
  - koyu lacivert/slate zeminler (`#0f172a`, `#1e293b`) → `--brand-teal-deep`
  - mavi vurgu/link (`#1d4ed8`, `#2563eb`) → `--brand-ink`
  - açık mavi zemin (`#dbeafe`, `#eff6ff`) → `--primary-light`
  - gri metin (`#64748b`, `#475569`) → `--text-light`
  - koyu metin (`#0f172a` metin bağlamında) → `--text`
  - kenarlık (`#e2e8f0`, `#cbd5e1`) → `--border`
  - beyaz kart zemini (`#fff`) → `--white`
  - yeşil/başarı (`#064e3b`, `#ecfdf5`, `#a7f3d0`) → `--brand-olive` /
    `--success-bg`
  - kırmızı/hata (`#881337`, `#e11d48`, `#fff1f2`) → `--brand-bordo` /
    `--danger-bg`
  - sarı/uyarı (`#fffbeb`, `#fde68a`, `#78350f`) → `--warning-bg` /
    `--warning`
- `.profit-hero` üzerindeki mevcut glass + `fichOpen` animasyonunu BOZMA;
  yalnızca renkleri tokenla.
- Ana CTA kuralı: `.profit-primary` bu sayfanın tek ana aksiyonu →
  `--brand-terracotta` (turuncu) olabilir. Diğer tüm butonlar teal/nötr.

---

## Renk kuralları (değişmedi)

- Turuncu `#C1592B` → sayfa başına yalnızca bir ana CTA.
- Bordo `#7A2E2E` → yalnızca risk / uyarı / yıkıcı işlem.
- Zeytin `#3E5D50` → aktif durum, pozitif değer, başarı.
- Sabit hex yazma, hep `var(--token)`.

## Diğer kurallar

- Tailwind EKLEME.
- Kartlara glass YOK (mevcut izinli yüzeyler hariç).
- Sahte veri hardcode etme; mevcut boş durumlar korunsun.
- İçerik veya route silme, admin görünümünü bozma.
- Mobil ve masaüstü responsive, yatay scroll oluşmayacak.

## Her iş sonrası

```
npm run build
npm test
```

İkisi de temiz olmalı (referans: 23 test dosyası, 126 test geçiyor).

## Bitince raporla

- Değiştirilen dosyalar
- MentorPanel'de module kapsamı yüzdesi (kaç className'den kaçı)
- Temizlenen sabit hex sayısı (dosya başına)
- `src` genelinde kalan sabit hex taşıyan dosya listesi (varsa)
- Build ve test sonucu
