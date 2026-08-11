# LOCAL KARAR — SON TEMİZLİK (3I)

Kalan iki iş: Calendar ay ızgarası ve bileşen düzeyindeki sabit hex'ler.

Backend, route, veri modeli ve API sözleşmesi DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

Ortak kurallar önceki pakette (`PAKET3D_H_KALAN_SAYFALAR_PROMPT.md`) tanımlı,
aynen geçerli: turuncu sayfa başına tek CTA, bordo yalnızca risk/uyarı,
sabit hex yok, yeni keyframe/token/bileşen yok, Tailwind yok, sahte veri yok.

---

## İŞ 1 — İşletme Takvimi ay ızgarası

Dosya: `pages/Workspaces/Calendar.jsx` + `.module.css`

Önceki pakette yalnızca renkleri tokenlandı, kompozisyon kurulmadı.

Önce mevcut yapıyı ve veri şeklini incele:
- `api.workspace.tracker.calendar(workspaceId, from, to)` çağrısının döndürdüğü
  şekli kontrol et (backend `src/services/business-tracker.ts` içinde
  `/:workspaceId/tracker/calendar` — günlere göre gruplanmış kayıtlar döndürüyor).

Sonra:
- **Ay ızgarası**: 7 sütun (Pzt–Paz), hafta satırları. Ay başlığı üstte,
  önceki/sonraki ay düğmeleri yanında.
- **Gün hücresi**: gün numarası sol üstte; o güne ait kayıt varsa küçük
  sayı rozeti; ay dışındaki günler soluk.
- **Bugün**: ince teal çerçeve.
- **Seçili gün**: `--primary-light` zemin.
- **Gecikmiş kayıt** olan gün: küçük bordo nokta.
- **Gün seçilince**: ızgaranın altında o günün kayıt listesi — saat/tür,
  başlık, tutar, durum rozeti.
- Kayıt yoksa `EmptyState`.
- Mobilde ızgara daralsın, hücreler kare kalsın, yatay scroll olmasın.

Koyu panel: 0. Turuncu CTA: 0 (kayıt ekleme Tracker'da).

**Veri şekli beklediğinden farklıysa** yapıyı zorlama — mevcut listeyi koru,
yalnızca görsel dile geçir ve raporda neden ızgara kurulmadığını yaz.

## İŞ 2 — Bileşen düzeyindeki sabit hex'ler

Aşağıdaki dosyalarda kalan hex'leri `var(--token)`'a çevir. Yerleşim
değiştirme, yalnızca renk.

| Dosya | Hex |
|---|---|
| `components/memory/MemoryPanel.css` | 59 |
| `components/practice/EmbeddedPracticeBlock.module.css` | 45 |
| `components/ui/FlashcardSection.module.css` | 14 |
| `components/feed/Feed.module.css` | 11 |
| `components/ui/QuizWidget.module.css` | 11 |
| `components/ui/TaskWorkspace.module.css` | 8 |
| `components/ui/VideoPlayer.module.css` | 3 |
| `components/layout/Sidebar.module.css` | 1-2 |
| `components/mentor/MentorLauncher.module.css` | 1-2 |
| `components/ui/ConfirmModal / Input / SearchBar / Select .module.css` | 1-2'şer |

Eşleme rehberi (önceki paketlerdekiyle aynı):
- koyu lacivert/slate zemin → `--brand-teal-deep` veya `--brand-teal`
- mavi vurgu/link → `--brand-ink`
- açık mavi zemin → `--primary-light`
- gri metin → `--text-light`, koyu metin → `--text`
- kenarlık → `--border`, beyaz kart → `--white`
- yeşil/başarı → `--brand-olive` / `--success-bg` / `--success`
- kırmızı/hata → `--brand-bordo` / `--danger-bg` / `--danger`
- sarı/uyarı → `--warning-bg` / `--warning`

**Öncelik sırası** (kullanıcıya görünürlüğe göre):
1. `EmbeddedPracticeBlock` — ders içinde görünüyor, en kritik
2. `Feed` — Ana Sayfa akışında
3. `QuizWidget`, `FlashcardSection`, `TaskWorkspace` — ders içi widget'lar
4. `MemoryPanel` — en büyük ama en az görünen
5. Kalan küçük dosyalar

**DOKUNMA:** `DecisionReceipt.module.css` içindeki 20 hex kasıtlı
(baskı bloğu gerçek siyah/beyaz gerektiriyor, `mask-image` değerleri renk
değil alfa maskesi). Dosyada açıklama notu var.

---

## Bitince

```
npm run build
npm test
```

Referans: 23 test dosyası, 126 test geçmeli.

## Raporla

- Değiştirilen dosyalar
- Calendar ızgarası kuruldu mu; kurulmadıysa veri şekli neden yetmedi
- Dosya başına temizlenen hex sayısı ve `src` genelinde kalan hex sayısı
- Kasıtlı bırakılan hex'ler (DecisionReceipt dışında varsa)
- Build ve test sonucu
