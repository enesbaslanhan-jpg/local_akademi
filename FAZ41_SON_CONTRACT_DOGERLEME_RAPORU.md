# FAZ 4.1 RAPORU — Dark/Light Son Contract Doğrulaması

Tarih: 2026-08-11 · Kapsam: glass allow-list denetimi, glass token sözlüğü, semi-glass yeniden değerlendirme, dark override yeniden sayımı, legacy blue/cyan son taraması, auth istisna işaretlemesi, build + test
Kaynak: `frontend/DESIGN.md` (tek otorite, §3.4 glass sözleşmesi) · Git commit yapılmadı.

---

## 1. Yöntem ve kapsam

- Kanonik ağaç: `frontend/src` (kök `src/` bayat/paralel kopyadır; tüm taramalar frontend üzerinde yeniden ve güvenilir biçimde çalıştırıldı).
- Her dark blok, light tarafındaki tanımıyla satır satır karşılaştırılarak sınıflandırıldı: **redundant** (aynı değer — kaldırılır) vs **justified** (light'tan gerçek görsel fark — kalır).

## 2. Test komutu doğrulaması

- `package.json` içinde test script'i mevcut: `"test": "vitest run --configLoader runner"`, `"test:watch": "vitest --configLoader runner"`.
- `npm test` → **25 dosya / 136 test PASSED** (12.87s). Yalnızca zararsız jsdom uyarısı: `Not implemented: navigation to another Document`.

## 3. Glass allow-list denetimi (DESIGN.md §3.4)

Frontend'de kalan **tüm** `backdrop-filter` kullanımları allow-list içinde:

| Yer | Allow-list kategorisi | Token |
|---|---|---|
| `layout/Header.module.css:14-15` | Header overlay | `--glass-blur-subtle` ✓ |
| `layout/Sidebar.module.css:306-307` | Sidebar floating/overlay | `--glass-blur` ✓ |
| `ui/Modal.module.css:5-6` (overlay) + `18-19` (panel) | Modal | `--glass-blur-subtle` / `--glass-blur` ✓ |
| `layout/ContextPanel.module.css:54-55` | Sidebar overlay ailesi (context rail searchPill) | `--glass-blur-subtle` ✓ |
| `styles/main.css:634/656/809` | Auth glass-frame/form | **İSTİSNA — beklemede (bkz. §8)** |
| `styles/print.css:32-33` | Yazdırmada cam kapanışı | korunur ✓ |

Önceki oturumlarda kaldırılan izinsiz kullanımlar bu oturumda **yok olarak doğrulandı**: `ProfitabilityDecisionTool .profit-hero`, `DecisionCheckList .decision-hero-search`, `FinancialModelWorkspace .inputPanel`, `Overview .heroWorkspace`, `NewsPage` görsel etiketi, `tailwind.css .glass-card` utility'si, `motion-glass-tokens.css .glass-surface` utility'leri. Calendar/Team/Overview normal kartlarında da cam yok.

## 4. Glass varyantları → merkezi token sözlüğü

- Sözlük (sınırlı, `motion-glass-tokens.css:38-39`): `--glass-blur: 14px` (ana) + `--glass-blur-subtle: 8px` (ikincil).
- Ara değerler (10px/12px/6px) kalmadı — tümü `--glass-blur-subtle`'a yuvarlandı; hiçbir bileşende literal `blur(Npx)` yok (main.css auth istisnası hariç).

## 5. Semi-glass istisna listesi yeniden değerlendirmesi

- **ALLOW-LIST** (kalır): Header, Sidebar, Modal, ContextPanel/search pill — hepsi token'lı ve listede.
- **NORMAL SURFACE** (kaldırıldı/doğrulandı): karar araçları sonuç başlığı, karar hero araması, model laboratuvarı parametre paneli, hero chip, kategori etiketi, `glass-card` — hiçbiri kalmadı.
- **DECORATIVE** (kalır, içerik okunabilirliğini etkilemez): hero orbs (`Overview .heroGlow`, `DecisionToolsPage .orb`), `glow-panel` — bunlar `filter: blur()` ile zemin dekoru, `backdrop-filter` değil; üzerinde içerik yok.

## 6. Dark override yeniden sayımı

- **Before: 176** selector satırı / 29 dosya.
- **Removed: 7** — merkezi token'ın zaten aynı değeri ürettiği redundant bloklar:
  - `ui/Select.module.css` (3): `.trigger:focus-visible/aria-expanded` (`--primary` = `--brand-500`, light ile aynı), `.option` (`var(--text)`), `.empty` (`var(--text-light)`)
  - `pages/Workspaces/Overview.module.css` (3): `.quickCard` color (`inherit` = `--text`), `.metricTop/.tableHead` (`--text-light`), `.metric>strong/.amount` (`--text`)
  - `ui/TaskWorkspace.module.css` (1): `.wordCount` (`--text-light`)
- **After: 169** — kalanların tümü justified: light'tan gerçek fark (fon/border/hover varyantları) veya `:root.dark` / `[data-theme='dark']` alias çiftleri (ayrı selector, aynı kural değil). Örn. Button ikincil/danger varyantları, `fields.css` input iç gölgeleri, MentorMessageBubble balon varyantları.

## 7. Legacy blue/cyan son taraması

Bu oturumda kalan **9 nesne** bulundu ve temizlendi:

| Dosya | Eski | Yeni |
|---|---|---|
| `pages/admin/AdminDashboard.jsx` | 3× `#3b82f6` | `var(--primary)` |
| `pages/admin/AdminDashboard.jsx` | `#14b8a6` (Demo KO) | `var(--brand-teal)` |
| `pages/PilotLearningPathPage.jsx` | `#dbeafe/#2563eb` + `#d9eaf7/#2f5597` (2 chip) | `var(--brand-50)` / `--brand-500/700` |
| `pages/FlashcardDashboardPage.jsx`, `pages/QuizDashboardPage.jsx` | `#d9eaf7/#2f5597` statIcon | `var(--brand-50)` / `--brand-700` |
| `pages/FlashcardStudyPage.jsx` | `easy` rozeti `#d9eaf7/#2f5597` | `var(--brand-50)` / `--brand-700` |
| `components/memory/MemoryPanel.css` | `profile` rozeti 2 atama `#2F5597` | `var(--brand-700)` |

Kalan eşleşmeler yalnızca `styles/tokens.css:312/315` içindeki **legacy→token eşleme belgesi** satırları (gerçek stil ataması değil). Fonksiyonel durum renkleri (kırmızı/yeşil/amber/mor) legacy palet değildir, korunur.

## 8. Auth özel tema

Değiştirilmedi. `main.css` `.auth-glass-frame` başına **istisna işareti** eklendi (Faz 4.1 İSTİSNA — giriş cam kartları glass allow-list dışında ama Faz 5 kararına kadar korunur). Faz 5'te yeniden ele alınacak.

## 9. Build + test

- `npm run build` → `✓ built in 7.69s` — hata yok (index chunk >500 kB uyarısı önceden mevcut, bu turun kapsamı dışı).
- `npm test` → 25 dosya / 136 test PASSED.

## 10. Bu oturumda değiştirilen dosyalar

1. `frontend/src/components/ui/Select.module.css`
2. `frontend/src/pages/Workspaces/Overview.module.css`
3. `frontend/src/components/ui/TaskWorkspace.module.css`
4. `frontend/src/pages/admin/AdminDashboard.jsx`
5. `frontend/src/pages/PilotLearningPathPage.jsx`
6. `frontend/src/pages/FlashcardDashboardPage.jsx`
7. `frontend/src/pages/QuizDashboardPage.jsx`
8. `frontend/src/pages/FlashcardStudyPage.jsx`
9. `frontend/src/components/memory/MemoryPanel.css`
10. `frontend/src/styles/main.css` (yalnızca istisna yorumu)

Git add/commit/push yapılmadı.