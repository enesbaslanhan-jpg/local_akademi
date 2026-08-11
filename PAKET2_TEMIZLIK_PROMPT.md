# LOCAL KARAR — PAKET 2 TEMİZLİK

Önceki iki iş (Workspaces tanımsız tokenlar, Mentor alt bileşenleri) doğrulandı,
tamam. Bu görev aynı iki hata sınıfının kod tabanının kalanındaki örneklerini
temizler. Yeni tasarım yapma, yerleşim değiştirme — yalnızca "tanımsız token"
ve "çalışmayan Tailwind class'ı" sorunlarını gider.

Backend, route, veri modeli, API bağlantıları ve iş mantığı DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## İş 1 — Kalan tanımsız CSS tokenları

Aşağıdaki tokenlar hiçbir yerde tanımlı değil, fallback da yok — bu yüzden
ilgili yüzeyler/renkler render edilmiyor. Yeni token uydurma, `tokens.css`'e
yeni değişken ekleme; her birini mevcut tanımlı karşılığıyla değiştir.

| Dosya | Tanımsız token | Kullanılacak |
|---|---|---|
| `components/feed/Feed.module.css` | `--bg-surface` | `--white` |
| `components/feed/Feed.module.css` | `--text-muted` | `--text-light` |
| `components/ui/VideoPlayer.module.css` | `--bg-subtle` | `--bg-tertiary` |
| `pages/FlashcardStudyPage.module.css` | `--btn-bg` | `--brand-teal` |
| `pages/FlashcardStudyPage.module.css` | `--btn-color` | `--white` |
| `pages/KnowledgeDetail.module.css` | `--bg-subtle` | `--bg-tertiary` |
| `pages/KnowledgeDetail.module.css` | `--card-bg` | `--white` |
| `pages/KnowledgePage.module.css` | `--bg-subtle` | `--bg-tertiary` |
| `pages/KnowledgePage.module.css` | `--card-bg` | `--white` |
| `pages/admin/AdminDashboard.module.css` | `--danger-light` | `--danger-bg` |
| `pages/admin/AdminUsers.module.css` | `--danger-light` | `--danger-bg` |

Bitince tüm `src` altında tanımsız token kalmadığını doğrula: her `var(--x)`
için `x`'in `styles/tokens.css` veya `styles/motion-glass-tokens.css` içinde
tanımlı olduğunu kontrol et.

## İş 2 — Kalan çalışmayan Tailwind class'ları

Projede Tailwind kurulu değil; aşağıdaki dosyalardaki `flex`, `p-3`,
`rounded-xl`, `bg-white`, `text-sm` gibi class'lar hiçbir CSS üretmiyor.
MentorPanel / MentorMessageBubble / MentorPage'de izlenen yöntemi uygula.

Öncelik sırası (üstten alta, kullanıcıya görünürlük sırasına göre):

1. `pages/practical-cards/PracticalCardList.jsx`
2. `pages/practical-cards/PracticalCardDetail.jsx`
3. `pages/practical-cards/SavedPracticalCards.jsx`
4. `components/progress/LearningProgressPanel.jsx`
5. `pages/DecisionCheckSession.jsx`
6. `components/decision-checks/StructuredDecisionTool.jsx`
7. `components/mentor/CitationBadge.jsx`
8. `pages/admin/AdminAuditLog.jsx`

Not: `ProfitabilityDecisionTool.jsx`, `MentorComposer.jsx`, `MentorPanel.jsx`,
`DecisionCheckList.jsx`, `SettingsPage.jsx` listede görünüyor ama bunların
kendi CSS dosyaları zaten var ve düzeltilmişti — yalnızca artık işe yaramayan
Tailwind kalıntılarını temizle, yeniden stillendirme.

Yöntem:
- Her dosya için bir `.module.css` oluştur (yoksa).
- Konumlandırma, boşluk, yüzey ve tipografiyi LocalKarar tokenlarıyla yaz.
- Mevcut Tailwind class string'lerini SİLME, module class'ını yanına ekle.
- Yeni keyframe yazma; `fadeSlideIn` / `fadeSlideUp` gibi mevcutları kullan.

---

## Renk kuralları (değişmedi)

- Turuncu `#C1592B` → sayfa başına yalnızca bir ana CTA. Emin değilsen KULLANMA,
  teal (`variant="primary"`) kullan.
- Bordo `#7A2E2E` → yalnızca risk / uyarı / yıkıcı işlem.
- Zeytin `#3E5D50` → aktif durum, pozitif değer, başarı.
- Sabit hex yazma, hep `var(--token)`.

## Diğer kurallar

- Tailwind EKLEME.
- Kartlara glass YOK.
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

- Değiştirilen / yeni oluşturulan dosyalar
- `src` genelinde tanımsız token kalıp kalmadığı (kaldıysa nerede)
- Hâlâ çalışmayan Tailwind class'ı taşıyan dosya kalıp kalmadığı
- Build ve test sonucu
