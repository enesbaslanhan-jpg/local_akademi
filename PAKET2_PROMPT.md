# LOCAL KARAR — TASARIM UYGULAMA FAZI / PAKET 2

## Önce doğrulama (bunları ilk sen çalıştır)

```
cd frontend
npm run build
npm test
```

Build veya test hata verirse ÖNCE onu düzelt, sonra aşağıdaki işe geç.
Hataları düzeltirken tasarım kapsamını genişletme.

---

## Amaç

Paket 1'de uygulama kabuğu (tokenlar, sidebar, header, dashboard) LocalKarar
tasarım sistemine geçirildi. Paket 2, kalan ana sayfaları aynı sisteme taşır.

Backend, route, veri modeli, API bağlantıları ve iş mantığı DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

## Kapsam (bu sırayla)

1. `pages/CoursesPage.jsx` + `.module.css` — Kurslar listesi
2. `pages/DecisionCheckList.jsx` + `.css` — Karar Araçları listesi
3. `pages/ToolsPage.jsx` + `.module.css` — Finans Merkezi
4. `pages/MentorPage.jsx` — AI Mentor tam sayfa
5. `pages/SettingsPage.jsx` + `.module.css` — Ayarlar
6. `pages/Workspaces/Overview.module.css` + `Tracker.module.css` — İşletme Takibi

## Zaten mevcut olan altyapı (yeniden yaratma, KULLAN)

- `src/styles/tokens.css` — tüm renk/spacing/typography tokenları
- `src/styles/motion-glass-tokens.css` — `--dur-*`, `--ease-*`, `--lift-*`,
  glass tokenları, ortak keyframe'ler (`fadeSlideUp`, `fadeSlideIn`, `growIn`)
- `src/components/ui/` — Button, Card, Badge, Progress, EmptyState, Modal, Tabs
- `src/components/ui/BrandMark.jsx` — logo monogramı

## Renk kuralları (kesin)

- Turuncu `#C1592B` → SAYFA BAŞINA YALNIZCA BİR ana CTA. `<Button variant="cta">`
- Koyu teal `#163832` → sıradan/tekrarlayan birincil butonlar. `variant="primary"`
- Bordo `#7A2E2E` → yalnızca risk / uyarı / yıkıcı işlem. `variant="danger"`
- Zeytin `#3E5D50` → aktif durum, pozitif değer, başarı
- Öncelik/risk skalası → Düşük yeşil, Orta turuncu, Yüksek bordo
- "Çıkış Yap" nötr renk, bordo DEĞİL
- Sabit hex yazma; hep `var(--token)` kullan
- Kalan mavi hex'leri (`#2563eb`, `#eff6ff`, `#dbeafe`, `#1d4ed8`, `#0f766e` vb.)
  temizle

## Diğer kurallar

- Tailwind EKLEME. Mevcut CSS Modules yapısını kullan.
- Glass yalnızca modal / drawer / bağlam paneli / parametre paneli / karar sonucu
  overlay'inde. Kartlara, tablolara, ders metnine, görev listesine glass YOK.
- Kart hover en fazla `translateY(-2px)`, buton hover `translateY(-1px)`,
  active `scale(0.98)` — hepsi mevcut tokenlardan.
- Sahte veri hardcode etme. Gerçek API verisini bağla, veri yoksa `EmptyState`.
- İçerik veya route silme. Admin görünümünü bozma. Mevcut işlevler kaybolmasın.
- Yeni görsel / stok görsel ekleme.
- Mobil ve masaüstü responsive; yatay scroll oluşmayacak
  (grid/flex zincirlerinde `min-width: 0`).

## Her sayfadan sonra

```
npm run build
```

çalıştır ve hatasız bittiğini doğrula.

## Bitince raporla

- Değiştirilen dosyalar
- Temizlenen eski mavi hex sayısı
- Her sayfada ana CTA'nın hangi buton olduğu
- Boş duruma bağlanan yerler
- Build ve test sonucu
- Çözülemeyen sorunlar
