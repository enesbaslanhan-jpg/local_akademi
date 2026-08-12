# Google Stitch Prompt: LocalKarar Dashboard

Aşağıdaki promptu Google Stitch'e tek parça halinde yapıştır.

```text
Design exactly 3 distinct high-fidelity desktop UI variants for a single existing product screen: the LocalKarar Dashboard. Do not generate code. Do not redesign any other page. Produce three polished 1440 x 900 desktop frames in LIGHT MODE ONLY, each showing the same product information architecture and real Turkish sample content. Dark mode will be designed only after one light-mode direction is approved.

PRODUCT AND USER
LocalKarar is a Turkish decision-support and learning product for small business owners. The Dashboard combines daily business status, decision tools, learning continuity, tasks, official news, community updates, and the latest decision result. It must feel calm, competent, readable, trustworthy, and product-specific. It must not look like a generic SaaS admin template, a neon fintech dashboard, a CRM, or a component-library demo.

DESIGN INTENT
Create a “Calm Operational Desk” rather than a grid of widgets. Preserve all existing functions, routes, and information architecture, but redesign the visual hierarchy and component anatomy. The user should understand within five seconds: How is my business doing today? What should I do next? Where do I start a new decision?

Use these principles explicitly:
- Unified does not mean identical. Tasks are list rows, the decision result is a receipt artifact, quick actions are an action rail, learning continuation is a light feature surface, and business status is the only signature panel.
- Compact does not mean flat. Use readable type, strong hierarchy, tonal surface layering, clear spacing, and selective depth. Do not use tiny text.
- Tokenized does not mean colorless. Keep the LocalKarar brand visible in primary action, active navigation, links, focus, and progress. Use semantic colors only for real states.

PRESERVE THE EXISTING SHELL AND IA
- Left desktop sidebar, 248-256px wide, collapsible to 64px.
- Sticky top header, 52-56px high.
- Main content maximum width around 1180px.
- Keep these navigation labels: Ana Sayfa, Kurslar, Karar Araçları, Finans Merkezi, AI Mentor, İşletme Takibi, Haberler, Topluluk, Ayarlar.
- Keep header controls for theme, notifications, and user profile.
- Do not add analytics charts, made-up modules, extra navigation, marketing banners, or new product claims.

LIGHT PALETTE BEHAVIOR
- Page canvas: cool mineral gray close to #EDF0F2. Never pure white across the full page.
- Section surface: close to #F4F6F8.
- Content surface: close to #FBFCFD, used only when a real container is needed.
- Pure white is reserved for raised overlays and tiny highlights.
- Primary text: near #1A1C1E. Secondary text: near #3F484A. All important text must have strong readable contrast.
- LocalKarar primary brand: muted blue-teal centered on #306D88. Do not turn the whole screen blue.
- Sidebar must be visibly tinted but not dark or saturated: use the brand-50 mineral tint close to #D8E3E8, with dark ink text and a slightly deeper tonal active state.
- Green is semantic only. Never use green for decorative icons, generic accent tiles, navigation, or surface decoration.
- Warning amber only for actual attention/risk. Red only for error, high risk, or overdue critical state.

SHELL DETAILS
- Sidebar should feel like a quiet mineral navigation surface, not a dark admin rail.
- Use a compact LocalKarar brand area without the English subtitle “Professional Community”.
- Use sentence-case group labels, not loud uppercase micro-labels.
- Clearly distinguish current location from recommendation. Do not use the same visual indicator for both.
- Header shows “Ana Sayfa” on the left and the date once on the right. Do not repeat the date inside the Dashboard.
- Header should visually merge with the canvas using only a subtle divider. No heavy shadow or decorative glass effect.

DASHBOARD CONTENT AND HIERARCHY
1. Compact greeting row:
   - “Hoş geldin, Ayşe”
   - business context: “Mavi Fırın”
   - supporting line: “Bugünkü önceliklerini ve işletme durumunu tek ekranda takip et.”
   - no giant hero, no date chip, no marketing copy.

2. Exactly ONE compact signature panel: “Bugünkü İşletme Durumu”
   - Target height 104-120px.
   - Calm deep graphite-teal, not saturated blue, not black, no gradient glow.
   - Status sentence: “Önümüzdeki 30 günde 84.500 TL net nakit girişi görünüyor, 2 kayıt gecikmiş durumda.”
   - KPI band with: “Alacaklar 132.000 TL”, “Borçlar 47.500 TL”, “Net Durum 84.500 TL”, “Geciken 2”, “Açık Kayıt 7”.
   - Do not split each KPI into its own card.
   - Large values are off-white. Use semantic warning/red only on the overdue value.
   - No gold eyebrow, no neon, no bevel, no continuous sweep animation, no glassmorphism.

3. Compact quick-action rail, not three feature cards:
   - Label: “Hızlı işlemler”.
   - One solid primary action: “Karar Ver”.
   - Secondary action: “Hesapla”.
   - Quiet/ghost action: “Mentor’a Sor”.
   - Use 18-20px icons and 40px controls.
   - No descriptive paragraphs and no full-width buttons.

4. Daily workboard with real content visible in the first viewport:
   - “Kaldığın Yerden Devam Et”: course “Fiyatlandırma ve Kârlılık”, “%68 tamamlandı”, “Son erişim: 2 saat önce”, progress bar, secondary “Devam Et” action.
   - “Bugünkü Görevler”: show at least these three 44px rows: “Ağustos tedarikçi ödemesini onayla”, “Personel vardiya planını tamamla”, “Stok sayım farklarını kontrol et”. Include dates and meaningful priority labels only where needed.
   - Do not put every section inside a card. Tasks should read as a clear list group.
   - Completed state must remain readable; do not fade the entire row to low opacity.

5. “Son Karar Sonucu” as a receipt/ledger artifact, NOT a second dark signature panel:
   - Label “Karar Fişi”.
   - Result “UYGUN”.
   - Summary “İndirim sonrası katkı hedef aralığın üzerinde.”
   - Metric “Net katkı 18.400 TL”.
   - Date “11 Ağustos”.
   - Use a subtle receipt edge or perforation and a quiet “Fişi aç” affordance.
   - Semantic color only on a small result indicator, never as a full green panel.

6. “Güncel Haberler” as a calm text feed and “Topluluktan” as a secondary group:
   - News item: “KOSGEB Dijital Dönüşüm Desteği güncellendi” with source “KOSGEB” and time “2 saat önce”.
   - News item: “TCMB faiz kararı açıklandı” with source “TCMB” and time “Dün”.
   - No invented thumbnails because the current data model has no images.
   - Use a quiet “Tümünü gör” text action.

FIRST VIEWPORT REQUIREMENT
At 1440 x 900, the frame must visibly include the header, compact greeting, the entire signature panel, the quick-action rail, the complete continue-learning block, at least three task rows, and at least two news headlines or the upper portion of the decision receipt. Real operational content must be visible without scrolling. Do not spend the first viewport on a large hero or three big action cards.

TYPOGRAPHY AND DENSITY
- Use Manrope as the single visible type family.
- Greeting 24px bold, section titles 16-18px semibold, body 14px, body small 13px, labels 12px, captions 11-12px, KPI values 18-24px.
- No visible text below 11px.
- Use tabular numerals for financial figures.
- Use a 4px spacing system with 12-16px compact content padding, 16px grid gaps, and 44px list rows.
- Keep controls at least 40px desktop.

COMPONENT MATERIALITY
- Content radius 12px, control radius 8px. Pills only for true chips/badges.
- Use tonal differences before borders, and borders before shadows.
- Default surfaces should have no shadow or only a very subtle 1-2px shadow.
- Only the single signature panel may have a visibly tinted soft shadow.
- No glow, no holographic treatment, no large gradient, no frosted content cards, no exaggerated 3D buttons.
- Icons should be consistent line icons with 1.75-2px stroke. Do not place every icon in a large circular medallion.

CREATE THREE DISTINCT VARIANTS
Use the same shell, same information architecture, same content, same light palette rules, and same first-viewport requirement in all three. Vary composition and rhythm, not product truth.

Variant A: “Operational Ledger” - recommended direction.
- Two-column workboard below the action rail.
- Continue learning and tasks form the dominant left work lane.
- News and receipt form a narrower right context lane.
- Strongest scanability, subtle ledger/list character.

Variant B: “Guided Workbench”.
- Continue learning is a horizontal feature row paired with the first three tasks.
- Receipt and news sit below as two different content anatomies.
- Slightly more guided and approachable, still compact and professional.

Variant C: “Calm Control Room”.
- Use a restrained 12-column asymmetric composition.
- Signature panel spans the main width, followed by a compact three-zone workboard.
- More editorial rhythm, but never a magazine or marketing page.

HARD DON'TS
- No code or developer annotations.
- No dark mode frames yet.
- No pure white full-page background.
- No saturated blue/cyan dark or light surfaces.
- No decorative green.
- No generic admin template.
- No three equal feature cards.
- No card-everything layout.
- No identical icon-title-description-button anatomy repeated across sections.
- No multiple full-width primary CTAs.
- No giant hero, marketing slogan, fake chart, fake metric, stock illustration, or image thumbnail.
- No more than one compact signature panel.
- No low-contrast gray text and no tiny labels.
- No glass content cards, neon, glow, sweeping light effects, bevels, or heavy shadows.

OUTPUT
Return exactly 3 high-fidelity 1440 x 900 LIGHT MODE desktop variants, clearly labeled Variant A, Variant B, and Variant C. Show the entire desktop shell in every frame. Keep all Turkish strings legible and realistic. Do not provide code. Do not provide dark mode. Do not introduce new product features.
```
