# FAZ 4 RAPORU — Dark/Light Consistency Pass (UI Literal Temizliği)

Tarih: 2026-08-11 · Kapsam: legacy UI renk literallerinin token/tonal sisteme çekilmesi, Tailwind kalıntıları, glow/glass ve shadow audit, sayfa bazlı dark override envanteri
Kaynak: DESIGN.md (tek otorite) · git commit yapılmadı.

---

## 1. Özet istatistik

- Düzeltilen dosya: **27** (12 JSX + 15 CSS)
- Silinen/yerine token konan legacy atama: **~75 satır**
- Kalan literal UI rengi: **0** (kalan 40 atamanın tümü belgeli istisna kategorisinde — bkz. §18)
- Build: `✓ built in 7.74s` (son doğrulama) — hata yok

## 2. Tailwind gerçeği

Projede Tailwind v4 aktif (`@tailwindcss/vite`). Bu, iki eski module CSS'in başlığındaki "projede Tailwind kurulu değil" notunu ve JSX'teki blue-* class'larının "ölü kod" sayılmasını geçersiz kılıyordu. Bu oturumda:

- `bg-blue-100/600`, `text-blue-600/800/900`, `border-blue-100/200`, `bg-blue-50` gibi class'lar gerçek CSS üretiyordu ve modül karşılıklarıyla (unlayered module CSS her zaman kazanıyor) **kırılgan çift kaynak** oluşturuyordu.
- 2 dosyanın başlık notu güncellendi (LearningProgressPanel.module.css, PracticalCardDetail.module.css).

## 3. LearningProgressPanel.jsx (4 satır)

| Eski | Yeni |
|---|---|
| `bg-blue-100 text-blue-800` durum rozeti | `styles.statusStarted` (primary-light + brand-ink) — zaten token |
| `bg-blue-600 h-2 rounded-full` progress | `styles.progressFill` (brand-teal = `--brand-500`; progress kuralına uygun) |
| `text-blue-600` zamanlayıcı ikonu | `styles.laterIconActive` (brand-olive) |
| `text-blue-600` konum ikonu | `styles.sectionIconContinue` (brand-teal) |

## 4. PracticalCardDetail.jsx (formül kutusu)

Tüm Tailwind class'ları kaldırıldı (`bg-blue-50 border-blue-100 rounded-xl p-5`, `text-blue-800`, `text-blue-900`); görsel zaten module'da: `formulaBox` (primary-light), `sectionLabel` (brand-ink), `formulaText` (brand-ink). Örnek senaryo kutusu aynı tile modeline geçirildi (modül karşılıkları zaten token'dı).

## 5. DecisionCheckSession.jsx submit

`bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50` → modüle teslim: `submitBtn` teal dolgu + kendi hover/disabled (Faz 2 kararı: formun tek tamamlama aksiyonu = teal).

## 6. ProfitabilityDecisionTool metric kutuları

JSX'teki `border-blue-200 bg-blue-50` / `border-emerald-200 bg-emerald-50` / `border-rose-200 bg-rose-50` tonları CSS'e taşındı:

```css
.profit-metric.good { border-color: var(--success); background: var(--success-bg); }
.profit-metric.bad  { border-color: var(--danger);  background: var(--danger-bg); }
.profit-metric.info { border-color: var(--primary); background: var(--primary-light); }
```

## 7. main.css globale literalleri

- `.btn:disabled` `#ccc` → `var(--bg-tertiary)`
- `.btn-secondary` `#53657a/#3d4d5f` (legacy slate) → `var(--bg-tertiary)` / `var(--bg-hover)`
- `.btn-danger:hover` `#8a2020` → `color-mix(in srgb, var(--danger) 84%, black)`
- `.ko-item` `#f7f9fc` → `var(--bg-tertiary)` (dark uyumu)
- `.upload-box:hover` `#eef5fb` → `color-mix(in srgb, var(--primary-light) 90%, black)`

## 8. `color: white` global temizliği (5 yer)

`.app nav button.active`, `.btn`, `.chat-message.user`, `.ko-item.active`, `.section-tabs button.active` → `var(--theme-on-primary)` (her iki modda da `#FFFFFF`; doygun zemin üstü metin token'ı).

## 9. FlashcardSection.module.css (10 satır)

- Kart ön yüzü `#f8faff/#d0e3f7` (mavi-tint) → `var(--white)` + `var(--border)`
- Kart arka (doğru cevap) `#f0fdf4/#bbf7d0` → `var(--success-bg)` + `color-mix(in srgb, var(--success) 42%, transparent)`
- Tüm `var(--text-light, #6b7280)` / `var(--text, #111827)` fallback'leri sadeleştirildi
- Rating metni `#fff` → `--theme-on-primary`; tamamlanma ikonu `#22c55e` → `var(--success)`

## 10. QuizWidget.module.css (9 satır)

`#e8f5e9/#fbe9e7/#2e7d32/#c62828/#f9fafb/#f3f4f6/#9ca3af/#e5e7eb` → sırasıyla `success-bg / danger-bg / success / danger / bg-tertiary / bg-hover / text-light / border`.

## 11. TaskWorkspace.module.css (8 satır)

Slate literalleri (`#6b7280/#334155/#475569/#64748b/#9ca3af`) → `text` ailesi; `#c62828` → `danger`; `#f8fafc` → `bg-tertiary`; `#e5e7eb` border → `var(--border)`.

## 12. Mentor ailesi — dark yüzey blokları token'a

| Dosya | Eski | Yeni |
|---|---|---|
| MentorComposer inputRow (dark) | `#1c1f24` | `--surface-1` |
| MentorComposer sendBtn (dark) | `#282a2d` | `--surface-3` |
| MentorMessageBubble user balon | `#20252a !important` | `--surface-3 !important` |
| MentorMessageBubble asistan balon | `#1c1f24 !important` | `--surface-1 !important` |
| MentorPanel composerWrap (dark) | `#121417` | `--surface-background` |
| MentorPanel streamingBubbleSurface | `#1c1f24` | `--surface-1` |

## 13. ToolsPage dark toolCard'ları (3 satır)

`#171a1d/#1d2126/#20252a` + `#3a424a/#465159` border'ları → `--surface-1/2/3` + `--border-strong`.

## 14. Doygun zemin metinleri (4 yer)

- Button.danger `#fff` → `--theme-on-primary`
- SettingsPage deleteButton `#fff` → `--theme-on-primary`
- CommunityPage featured hero `#f6fbfc/#fff` ×3 → `--theme-on-primary`
- NewsPage visual etiketi `white`/`rgba(5,25,28,.78)` → `--theme-on-primary` / `color-mix(in srgb, var(--brand-900) 78%, transparent)`

## 15. Workspaces altın ailesi → `--brand-gold`

- Notifications: summary çipi `rgba(182,133,57,.13)/#785520`, unread kenar `#b7863e`
- Activity: zaman çizgisi çizgisi/nokta `#b78742` + `.14` glow
- Documents: `.note` sol kenar `#ad7b35` + `12%` tint

`--brand-gold` (gold-500/gold-300, dark uyumlu) zaten sistemin 15 yerinde kullanılıyordu; kalan literaller aynı aileye çekildi.

## 16. Overview hero gradient'leri (2 satır)

- Light: `#24343a→#31444b→#66757b` → `--surface-dark` ailesine (CommunityPage featured ile aynı kalıp)
- Dark: `#121417→#1c1f24→#282a2d` → `--surface-background/1/3`

## 17. Shadow audit

Taranan: `box-shadow` içinde rgba/hex bulunan **52 satır**. Sınıflandırma:

**Düzeltilen (5):**
- `rgba(47,85,151,.12)` focus ring ×2 (AdminKnowledge, AdminKOForm) — legacy mavi → `color-mix(in srgb, var(--primary) 14%, transparent)`
- `rgba(25,118,210,.15)` focus ring ×2 (AssessmentPage, OnboardingPage) → `color-mix(in srgb, var(--brand-500) 16%, transparent)`
- AdminUsers dropdown `0 4px 12px rgba(0,0,0,.1)` → `var(--shadow-md)`

**Korunan (47) — belgeli istisna:**
- Mentor composer/launcher/bubble/panel cam gölgeleri (kara zemin + inset beyaz ışık deseni)
- ContextPanel/MobileTabBar/DarkPanel/fields.css/Overview hero semi-cam gölgeleri (semi-cam deseni Faz 2'den beri sistemsel kabul)
- main.css auth cam blokları (auth teması, §18)
- Select dropdown özel gölgesi (boyutu overlay token'ından farklı, görsel değişiklik istenmedi)

## 18. Kalan literal renkler — belgeli istisna listesi

Kapsamlı tarama sonrası kalan ~40 atama + çeşitli gradient satırları — tümü aşağıdaki kategorilerde:

| Kategori | Konum | Sayı | Gerekçe |
|---|---|---|---|
| Baskı | print.css + DecisionReceipt @media print | 11+2 | kağıt: siyah metin/beyaz zemin kasıtlı |
| Chart palette | MemoryPanel tip rozetleri (6), NewsPage kategori görselleri (7) | 13 | çok-renkli bilgi zeminleri — kullanıcı istisnası |
| Auth özel tema | main.css `.auth-page` bloğu (krem metinler, cam gradient'ler, dark override'ları) | 15 | her modda koyu cam tema, kendi içinde tutarlı; Faz 3'te kapsamlı tokenize edildi, kalanlar %100 opak beyaz/krem tonlar |
| Kod yüzeyi | main.css `.detail-content pre` | 2 | her modda koyu kod bloğu (kasıtlı) |
| Media | VideoPlayer | 1 | #000 — video alanı |
| Renk tanımları | tailwind.css `@theme` (warm-paper/ivory-card/deep-petrol…) | 4 | token tanımı, kullanım alanı değil |
| Semi-cam | rgba beyaz/siyah yarı saydam vurgular (sheen, heroGlow, inset ışık) | ~47 shadow + ~20 fill | "cam üstü ışıltı" deseni — tüm fazlarda sistemsel kabul |
| Yorum | MentorBetaBadge başlık notu | 1 | anlatım metni |

## 19. Glow/glass değerlendirmesi

- `--glass-blur: 14px` / `--glass-saturate: 140%` token sistemi (motion-glass-tokens.css) tüm ana camlarda kullanılıyor (Header, Sidebar, Modal, Profitability, DecisionCheckList, FinancialModelWorkspace).
- Literal blur varyantları (Header 10px, Modal 6px, ContextPanel 12px, tailwind `glass-card` 8px): ince-cam varyantları olarak korundu — token'a çekmek görsel değişiklik yaratırdı (14px'e yumuşama). İstisna olarak raporlanır.
- `heroGlow` (Overview): semi-beyaz orb — cam parlaklık deseni, korundu.
- `text-shadow` ler: yalnız auth bloğunda (istisna).

## 20. Sayfa bazlı dark override envanteri (Faz 4 sonu durumu)

`:global(.dark)` / `:root.dark` blokları — 29 dosya, ~160 blok:

| Dosya | Blok | Not |
|---|---|---|
| Overview.module.css | 24 | hero + listeler; artık yüzey token'ları |
| ToolsPage.module.css | 17 | toolCard'lar tokenlandı (§13) |
| MentorPage.module.css | 16 | mentor cam ailesi |
| fields.css | 12 | global form alanları (Faz 2 tokenize) |
| Select.module.css | 9 | menü + varyantlar |
| MentorMessageBubble.module.css | 8 | balonlar (§12) |
| Calendar.module.css | 8 | takvim camı |
| EmbeddedPracticeBlock.module.css | 7 | Faz 4'te azaltıldı (minimum `:global(.dark)`) |
| Button.module.css | 6 | varyant geçişleri |
| MemoryPanel.css | 6 | pill (Faz 4'te silindi) + badge'ler |
| Documents.module.css | 6 | §15 |
| MentorPanel.module.css | 5 | §12 |
| TaskWorkspace.module.css | 5 | §11 |
| Team.module.css | 4 | tablo cam |
| Workspaces Settings/Notifications | 3+3 | §15 |
| DarkPanel/Badge/MentorComposer + diğerleri | 1-3 | ufak alan |
| theme-modes.css | 3 | ana tema kökleri (yeniden tanım değil, dağıtım) |

Renk literallerinin tamamı bu bloklardan temizlendi; kalanlar yalnız semi-cam vurguları.

## 21. Doğrulama

- `npm run build` → `✓ built in 7.74s`, hata yok
- Son tarama: renk atama regexi (`background|color|border*|fill|stroke|shadow*: #hex`) → 40 sonuç, tümü §18 kategorilerinde
- Gradient taraması → yalnız istisna dosyaları
- `color: white` ataması → 0
- Tailwind blue/cyan/sky/teal JSX class'ı → 0

## 22. Bu turda dokunulmayanlar

- `.detail-content pre` kod yüzeyi (istisna, §18) — istenirse ayrı token tanımlanabilir
- Select dropdown gölgesi (görsel değişikliğe yol açmamak için)
- Auth sayfası (Faz 3'te zaten işlendi; kalan literaller kozmetik tutarlılık bloğu)
- Test suite: bu oturumda görsel/CSS değişikliği sırasında test çalıştırılmadı (`npm test` komutu projede tanımlı değil; mevcut doğrulama build'dir)