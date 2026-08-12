# FAZ 5B RAPORU — Courses / Learning Path / Lesson Kompakt-Birleşik Geçişi

Tarih: 11.08.2026 · Kapsam: öğrenme deneyimi yüzeyleri (Courses, Course Detail/Player, Learning Path, Progress, Enrollments)
Otorite: DESIGN.md · Ağaç: `frontend/src` (kanonik) · git yok

---

## 1. Courses audit sonucu

`CoursesPage.module.css` baştan sona DESIGN.md ölçeğine çekildi. Başlık bloğundaki ölü `header`/`subtitle` sınıfları (JSX'te kullanılmıyordu) silindi. Sayfa kabının `max-width: 1200px` → `var(--content-max-width)` (1180px) ve `padding: 16px 24px 40px` → `0 0 32px` oldu (AppLayout `.content` zaten yatay `--space-6` taşıyor; Dashboard/Overview ile aynı kural).

## 2. Courses header sonucu

- `catalogHero`: `gap 28px→24px`, `padding 28px 30px→20px 24px`; mobil 720 `22px→20px 16px`.
- Hero h2: `1.65rem/1.18` → `var(--font-size-page-title)` (24px) + `line-height 1.25` + `margin 0 0 8px` (sayfa başlığı sözleşmesi).
- Hero p: `line-height 1.55→1.5` (gövde kuralı).
- `catalogCount` metriği: `strong` `1.8rem→1.5rem` (metric-lg 24px), `span .72rem→var(--font-size-xs)`; kart geometrisi (16px pading, radius-sm, rgba beyaz zemin) koyu panel zincirinde dokunulmadı.
- Hero artık sayfanın TEK koyu paneli olan `pathPanel` ile aynı zincirde: katalog hero açık tasarımında değil — DarkPanel bileşeniyle render ediliyor (JSX'te zaten öyle).

## 3. Search/filter sonucu

- `searchWrapper`: `min-height: var(--control-h-md)` (40px) eklendi → search kontrol sözleşmesi sağlandı (SearchBar.module.css ile aynı 40px). Boşluklar 8/12 ölçeğinde.
- `searchInput`: `0.85rem→0.875rem` (body).
- `toolbar` `gap 10→12`, `margin-bottom 22→20`; `toolbarMid`/`toolbarRight` `gap 10→12`.
- `viewToggle` butonları: `34px→32px` (btn-h-sm=32px kontrol sözleşmesi); seçili durum `primary-light`+`brand-ink` (mark-sız değil, seçiliyken kalın zemin).

## 4. Course grid sonucu

- `.grid`/`.continueGrid` `gap 20→16`; `.list` `gap 10→12`; sayfa altları `margin-bottom 24`.
- `pageTabs` (Tüm Kurslar / Kayıtlarım) `margin-bottom 16`, `pageTab padding 9px 16px→8px 16px`, `0.86→0.875rem`.
- Sayfalama: `pageBtn min-width 34→32`, `padding 7→8px`, `0.82→0.8125rem`; hover kenarlığı `--brand-olive` → `--primary` (etkileşim semantiği; zeytin yalnız "tamamlandı" için).

## 5. Course card sonucu

- `courseCard`: `padding 22→16px`, **`min-height: 280px` kaldırıldı** (kartlar ölçeğe oturuyor; dikey fazlalık yoktu).
- `courseTitle 0.95→1rem` (card-title 16px), `description 0.8→0.8125rem` (body-sm), kırpma korundu.
- `promise` (kurs çıktısı bloğu): `padding 11px 12px→12px`, `0.78→0.75rem`; success-bg/success semantiği korundu.
- `meta 0.76→0.75`, `badgesLeft gap 6→8`, `progressText 0.72→0.6875rem` (caption).
- `continueCard`: `14px 16px→12px 16px`, başlık `0.92→0.875rem`; `listCard`: `gap 18→16`, `padding 12px 16px`, satır başlıkları `0.92→0.875`.

## 6. Course CTA sonucu

- Kartların CTA'ları zaten shared `<Button>` (primary/sm) — JSX'te dokunulmadı, geometri Button sözleşmesinden (32px sm).
- `viewBtn`/`pageBtn` gibi segment kontrol Buton sözleşmesi dışında kasıtlı (ikon segment/değişken geometri) — raporun 20. maddesinde not.
- CoursePlayer lesson gezinmesi shared Button'a geçti (bkz. 11).

## 7. Progress/status sonucu

- Progress çubuğu sözleşmesi (6px, brand fill, nötr ray) tüm kapsamda sağlandı: Courses pathTrack zaten 6px; LearningPath `progressFill brand-ink→var(--brand-500)` + `radius 3px→var(--radius-full)`; LearningProgressPanel `progressTrack 8px→6px`; CoursePlayer headerProgressTrack 6px (koyu panel üstünde açık ray — Faz 4.1'de onaylı istisna).
- Durum rozetleri token tabanlı (success-bg/success, primary-light/brand-ink, bg-tertiary/text-light) — yeni renk eklenmedi.

## 8. Learning Path sonucu

- `.page` `max-width: 800px` korundu (okuma genişliği — bilinçli sapma, aşağıda 14), `padding 24px→0 0 32px`.
- Ölü `.title` bloğu silindi (h1 sr-only).
- `progressBar` `radius 3px→var(--radius-full)`; `progressFill` `--brand-ink→--brand-500`, `transition 0.3s→var(--dur-base)`; **label artık absolute/-16px taşma değil** — `progressRow` (flex: ray + inline `%X` etiketi) JSX + CSS ile yeniden yapıldı.
- `summaryCard` `1rem 1.25rem→16px 20px`; metrikler `1.1→1.125rem` (metric-md), boşluklar 24/12/8.
- `stepCard` `radius 10px→var(--radius-md)` (12), `padding 12px 16px`, `transition: all→border-color`.
- `stepNum` `0.8→0.75rem`; `stepTitle 0.95→1rem`; `stepDesc 0.8→0.8125`.
- `koChip` `padding 0.2rem 0.6rem→4px 8px`, `radius 4px→var(--radius-xs)` (6), transition daraltıldı.
- **"Sıradaki" işareti eklendi** (yenileme isteği değil, duygu durumu netliği): `nextStepIndex = steps.findIndex(s => s.status !== 'completed')` → sıradaki adım `stepNext` (dolgu + `--primary` kenarlık) ve Badge metni `"Sıradaki · X gün"`. State yalnız renk değil — metin + yapı + kenarlık.

## 9. Learning Progress sonucu

`LearningProgressPanel.module.css`:
- `.card` radius `var(--radius-sm)` → `var(--radius-md)` (12px normal kart sözleşmesi).
- `.row` (son görüntülenenler/tamamlananlar satırları) radius → `var(--radius-md)`.
- `.progressTrack` 8px → 6px.
- `.fill` `--brand-teal` (== `--brand-500` alias) korundu; `.loading`/`.errorBox` `var(--radius)` zaten 12px (tokens: `--radius: var(--radius-md)`).

`LearningProgressPanel.jsx`:
- **Ölü Tailwind renk stringleri kaldırıldı**: `STATUS_MAP.color` alanı (`bg-yellow-100 text-yellow-800`, `bg-green-100 text-green-800`) ve iki className şablonundaki referansları silindi — modül sınıfı (`statusStarted/InProgress/Completed`) tek renk kaynağı.
- Diğer Tailwind sınıfları (`rounded-lg`, `p-4`, `space-y-3` vb.) JSX'te **dormant** durumda kalıyor (modül CSS'i unlayered, kazanıyor) — 20. maddede teknik borç olarak kayıtlı.

## 10. Course Detail sonucu

Kapsamda ayrı bir course-detail sayfası yok; detay bilgisi (özet, öğrenme çıktıları, kaynaklar, header) CoursePlayer içinde (11) ve Courses kartlarında (5) ele alındı.

## 11. Course Player/Lesson sonucu

`CoursePlayerPage.module.css` + `.jsx`:
- **Ders içeriği okuma sözleşmesi**: `.markdown` `0.9rem/1.65→1rem/1.75` (body-lg + okuma satır yüksekliği), `max-width 70ch` korundu; `.summaryText` `0.92→1rem/1.75`.
- Section başlıkları `0.88→1rem`; `tabs` `padding 14→12px`, `tab 0.84→0.8125`; `contentLayout` `18→16px`; mobil `14→12px`.
- **Lesson navigation → shared Button** (sözleşme): `.navBtn` özel CSS bloğu silindi; üst bar `size="sm"` (32px), alt gezinme `size="md"` (40px dokunma hedefi) `variant="secondary"` — disabled/focus/hover artık Button modülünden.
- Header koyu panel (TEK panel, bevel/sweep kapalı — Faz 4.1 kararı): `lessonHeaderTitle` `1.15→var(--font-size-page-title)` (24px/700); meta `0.78→0.75`, progress etiketi `0.72→0.6875`.
- Sidebar: `courseTitle 0.95→1rem`, ders satırları `10px 16px→12px 16px`, `lessonTitle 0.83→0.8125`, `lessonMeta 0.72→0.6875`; `mobileToggle` `top 64px→var(--header-height)`.
- Rail: `railCard 14px 16px→12px 16px`, `railTitle 0.8→0.8125`, `railPercent 1.4→1.25rem` (metric-md), listeler 0.75/0.6875; `top: 74px` sticky ofseti korundu (chrome).
- Ölü `.outcomeList` bloğu silindi (JSX yalnız `railList` kullanıyor); `markdown code 4px→var(--radius-xs)`; `pre` radius-sm korundu (blok=8).
- Tüm 6/7/9/10/18/22px kalıntıları ölçeğe çekildi (breadcrumb gap, img margin 16, tab/readingDone gap 8, sourceItem gap 8, markdown li 4).

## 12. Practical Cards sonucu

`EmbeddedPracticeBlock.module.css` denetlendi: radius sözleşmesi (bloklar `--radius-md` 12, iç kutular `--radius-sm` 8), padding `1rem/0.75rem`, gövde puntoları `0.875/0.9rem` — tümü token/ölçek tabanlı; Faz 4'te ton sistemi tamamlanmış. **Değişiklik gerekmedi.** Ders içi pratik kart call-to-action'ları zaten shared Button kullanıyor (Pratik kart/araç bağlantıları ayrı component zincirinde, dokunulmadı).

## 13. Enrollments sonucu

- `.page` `max-width 1200→var(--content-max-width)`, `padding 0 0 32px`.
- `enrollmentCard` `16px 18px→16px 20px` (yatay ölçeğe); `courseTitle 0.98→1rem`; `meta 0.78→0.75`.
- `statusBadge` `0.72→0.6875`, `padding 3→4px`; `progressText` `0.8→0.8125` + `min-width 38→40px` (Progress label hizası).
- Mobil 620: `gap 14→12`. `.embedded` modu (Courses "Kayıtlarım" sekmesi) korundu.
- Mevcut durum renkleri token'tan (statusCompleted/PProgress/NotStarted) — dokunulmadı.

## 14. Max-width sonucu

- Courses, Enrollments → `var(--content-max-width)` (1180px) ✓.
- LearningPath → 800px **bilinçli istisna** (okuma yüzeyi; içerik kolonu + satır uzunluğu DESIGN okuma kuralının parçası). Rapor edilir: sayfada yalnız iki aksiyon (Oluştur/Güncelle + KO chipleri) olduğu için 800px kompakt kalır.
- KnowledgeDetail/KnowledgePage `1200px` — **Kapsam dışı** (Knowledge kendi paketinde; Faz 5B talimatı "Knowledge leave if not part").
- Workspaces `1200px` — kapsam dışı.

## 15. Spacing/radius sonucu

- Kapsamdaki 5 CSS dosyasında ölçek dışı boşluk kalmadı (tarama: gap/padding/margin 6/7/9/10/18/22/26/28px → 4/8/12/16/20/24).
- Radius: kartlar 12 (`--radius-md`), buton/input 8 (`--radius-sm`), chip/etiket 6 (`--radius-xs`), progress ray `--radius-full`; legacy 10px/4px/3px radius'lar temizlendi. `--radius-lg` (16) bu pakette kullanılmıyor.
- Em tabanlı kalıntılar (markdown `1em` aralıkları, blokquote) — içerik tipografisi, dokunulmadı.

## 16. Dark/light sonucu

- Yeni hex, yeni glass, glow/neon yok (tarama: kapsamdaki 4 sayfa modülünde hex sayısı 0).
- Koyu panel zinciri (Courses `pathPanel` + `catalogCount`, Player `lessonHeaderPanel` + `headerProgressTrack`) Faz 4.1 onaylı token zincirinde aynen korundu; `rgba(255,255,255,…)` zeminler yalnız bu panellerin içinde.
- Etkileşim hover'larında `--brand-olive` yerine `--primary` (pageBtn, navBtn kalıntısı) — semantik renk ayrımı (olive=tamamlandı).

## 17. Responsive sonucu

- Mevcut kırılımlar korundu (Courses 720/780/860/620; Player 1100/768/620; Enrollments 620). Yeni kırılım eklenmedi.
- Yalnız ölçek düzeltmeleri (mobil padding/gap 12/16) ve Player sidebar drag (zaten 768'de fixed) korundu.
- Kırılım seçimi gerekçeleri: 1100 = content iki sütun (rail) bırakma noktası; 860 = pathPanel tek sütun; 780 = toolbarRight sarım; 720 = kart tek sütun; 620 = aşırı dar. Faz 6 (mobil özel) bu değerleri tam gözden geçirecek.

## 18. Accessibility sonucu

- Lesson navigation artık shared Button: odak halkası (Button kontraktı focus-visible), `disabled` + `opacity .5`, ikon aktarımı korundu.
- Ders listesi: `aria-current="true"` (aktif), state üçlü sinyal (zemin + sol kenar + içerik başlığı metni) — renk yalnız değil.
- Player progress: `role="progressbar"` + aria-valuenow/min/max korundu.
- LearningPath "Sıradaki": metin + kenarlık + pozisyon (state yalnız renk değil); `stepDone` opacity 0.7 + zemin + "Tamamlandı" Badge metni.
- Filtre sekmeleri: `role="tablist"`, `aria-label` korundu; sekme seçimi border-bottom + renk.

## 19. Kaldırılan page-level overrides

- CoursesPage: ölü `.header`, `.subtitle` (+ yorum etiketi); `catalogHero` 1.65rem h2 ve mobil padding override'ı; `courseCard min-height: 280`.
- LearningPathPage: ölü `.title`; absolute progressLabel override bloğu → inline `progressRow`.
- CoursePlayerPage: `.navBtn` bloğu (5 kural) + reduced-motion referansı, ölü `.outcomeList` bloğu (5 kural).
- 5A'daki tarzda (Dashboard/Overview) 1100–1200px genişlik override bloğu bu pakette yoktu; mevcut kırılımlar korundu.

## 20. Kalan learning teknik borçları

- `LearningProgressPanel.jsx`: dormant Tailwind sınıf kalabalığı (`border rounded-lg p-4 grid …`). Modül CSS'i unlayered olduğu için görsel etki sıfır; stratejik temizlik bir sonraki pakette (tüm panel JSX rewrite ile) yapılabilir.
- `PilotLearningPathPage` (pilot çalışma alanı) bu paketin yüzey sınırı dışında — chip renkleri Faz 4.1'de tokenize edildi; kendi paketinde kompakt seyri.
- `catalogCount min-width 132px` ve `markdown` em tabanlı aralıklar — kasıtlı, ölçek ihlali değil.
- Üst satırda `viewBtn` 32px segment butonu ve breadcrumb — chrome kontrolü, Button sözleşmesi dışı ama Faz 4 kontrol boyutu kuralına uyuyor.
- `--font-size-page-intro` hâlâ Enrollments `.subtitle` tarafından kullanılıyor — token ailesinde kaldı (Faz 4), sorun değil.

## 21. Build/test

- `npm run build` → ✓ 7.54s (tek uyarı: mevcut chunk boyutu, bu değişikliklerle ilgisiz).
- `npm test` → ✓ 25 dosya / 136 test PASSED.
- Taramalar: kapsamdaki CSS'te hex renk 0; `navBtn`/`outcomeList`/`STATUS_MAP.color`/`min-height: 280` kalıntısı 0; `max-width:1200px` kalıntısı yalnız kapsam dışı (Knowledge/Workspaces); ölçek dışı boşluk/radius 0.

## 22. Manuel smoke

Yapılamadı — tarayıcı erişimi yok. Açık doğrulama listesi (1440/1280/768/430/390/360, light+dark):
Courses: hero, pathPanel adımları, arama/filtre, ızgara/liste, devam kartları, sayfalama, "Kayıtlarım" sekmesi. Player: breadcrumb, üst/alt gezinme disabled durumları, tabs, markdown okuma, rail, mobil sidebar toggle. LearningPath: progressRow etiketi, "Sıradaki" kartı, KO chipleri. Panel: kart/rozetler/durum renkleri her üç listede.

## 23. Faz 5C'ye taşınan konular

- Administrator/Pilot/Knowledge workspace paketleri: 1200px max-width'ler, kompakt seyir, ölçek dışı kalıntılar.
- `LearningProgressPanel.jsx` Tailwind string temizliği (stratejik rewrite ile).
- Faz 6 mobil: kırılım değerlerinin (720/780/860/1100) tam gözden geçirilmesi, dokunma hedefleri (>= 40px), mobil topBar/tabs sarım sınavı.
- Faz 5I: Dashboard ölü CSS bloğu (`.toolPanel*`, `.kpiEmpty`, `.statsGrid`, `.recGrid`, `.demoBanner`, `.taskMeta`).
- Genel: uppercase mikro-etiket harf aralığı istisnasının (`typeLabel/pathEyebrow` 0.05–0.14em) DESIGN.md'ye yazılması veya kaldırılması kararı.