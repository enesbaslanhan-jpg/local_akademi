# LocalKarar Batch Screen Specification

**System dependency:** `LOCALKARAR_MASTER_DESIGN_BRIEF_v2.md`  
**Locked direction:** Premium Operational + Apple Calm Depth  
**Locked palette:** Warm Petrol  
**Scope:** 18 main screens, designed as one family. This document defines page anatomy; it does not authorize application-code changes.

## Batch law

All screens inherit the same shell, Warm Petrol role map, Manrope type system, spacing/radius scales, CTA law, semantic colors, focus behavior and motion philosophy. A screen may vary composition, density and domain components, but may not invent a new palette, shadow language, navigation pattern or generic card system.

“Signature panel: yes” means one page-defining surface is allowed, not required to be dark and never permission for multiple hero cards. “No” means the page should rely on layout, rows, rails, tables, timelines or reading stages instead of manufacturing a focal card.

## 1. Dashboard

- **Page purpose:** Answer today’s business state, next work and next decision at a glance.
- **First viewport:** Compact page context; one operational status panel; action rail with `Karar Ver` primary and `Hesapla`/`Mentor'a Sor` secondary; top of resume-course/task workspace visible.
- **Dominant composition:** Asymmetric 7/5 workbench: status and current work dominate; tasks occupy the supporting column. News/community move below.
- **Signature panel:** **Yes — one.** “Bugünkü İşletme Durumu,” using Deep Petrol in light mode and a raised graphite-petrol surface in dark mode.
- **Component families:** Operational Summary, task group, progress spine, decision receipt preview, editorial rows.
- **CTA hierarchy:** `Karar Ver` primary; resume current work contextually primary only inside its module; utilities secondary/ghost.
- **Density:** 7/10; KPI values scan quickly without miniaturized text.
- **Special visual identity:** A calm operations desk, not a KPI tile catalog. Metric strip shares one surface rather than five cards.
- **Light/dark notes:** Light avoids white-card washout; dark preserves a clear signature-panel/canvas distinction without cyan highlights.
- **Responsive notes:** On mobile: status summary → action rail → resume/task priority. News, community and activity become quiet grouped lists below.

## 2. Courses

- **Page purpose:** Help the user resume learning, understand progress and discover the next relevant course.
- **First viewport:** Progress context and one clear “continue” course; category/filter rail; first library row visible.
- **Dominant composition:** Featured resume path followed by grouped course shelves or a purposeful two-column library—not equal promotional cards.
- **Signature panel:** **Yes — one, light-touch.** The active learning journey combines course identity, progress and next lesson.
- **Component families:** Learning course tile, progress spine, curriculum path, filter chips, competency metadata.
- **CTA hierarchy:** `Derse devam et` primary; course detail secondary; save is icon/ghost.
- **Density:** 5/10.
- **Special visual identity:** Progress is a route/path metaphor expressed through structure, not illustration-heavy decoration.
- **Light/dark notes:** Warm Sand can support course cover material; dark course tiles stay tonal, never luminous blue.
- **Responsive notes:** Continue panel becomes compact horizontal-to-vertical feature; shelves become one-column rows with visible progress and next step.

## 3. Course Player

- **Page purpose:** Keep attention on the lesson while preserving orientation, progress, notes and the next step.
- **First viewport:** Lesson title/context, content or video stage, progress, and minimal player actions. Lesson navigation is present but subordinate.
- **Dominant composition:** Desktop split stage: primary learning canvas + collapsible lesson rail; notes/transcript appear as tabs or a lower panel.
- **Signature panel:** **Yes — the learning stage itself.** No separate decorative hero.
- **Component families:** Learning stage, lesson rail, transcript block, note editor, resource row, progress spine.
- **CTA hierarchy:** `Dersi tamamla` or `Sonraki ders` primary when valid; playback/note utilities neutral.
- **Density:** 4/10 in content, 6/10 in the lesson rail.
- **Special visual identity:** Focused reading/viewing environment with generous line height and minimal chrome.
- **Light/dark notes:** Video may use black media bounds; surrounding canvas remains Warm Petrol surfaces. Dark mode reduces edge contrast around the stage.
- **Responsive notes:** Rail becomes a bottom sheet/drawer; sticky compact progress and next-step control remain clear without covering content.

## 4. Decision Tools

- **Page purpose:** Let users choose the right decision method quickly and understand what each tool will produce.
- **First viewport:** Short orientation, recommended/recent path, search/filter, and first grouped tools.
- **Dominant composition:** Categorized tool index with compact rows and one restrained recommendation band; not a grid of identical feature cards.
- **Signature panel:** **Optional — one recommendation band**, only when recommendation is backed by user context.
- **Component families:** Decision tool row, category rail, evidence/requirement tags, recent session row.
- **CTA hierarchy:** `Karar sürecini başlat` primary on the recommended tool; other rows use `Aç`/chevron secondary navigation.
- **Density:** 6/10.
- **Special visual identity:** A method library: confidence comes from clear inputs, estimated effort and expected output.
- **Light/dark notes:** Warm Accent marks “önerilen,” never active navigation or all tools. Dark uses Soft Petrol for informative metadata.
- **Responsive notes:** Filters become horizontal scroll chips; tool rows preserve input/output metadata and minimum touch targets.

## 5. Decision Tool Session

- **Page purpose:** Guide a user through a consequential decision with agency, context and recoverable progress.
- **First viewport:** Decision title, progress/step context, current question or task, and relevant evidence/helper area.
- **Dominant composition:** Focused step canvas with a narrow evidence/context rail; one question group at a time without fake wizard theatrics.
- **Signature panel:** **Yes — active decision stage.** It is a task surface, not a visual hero.
- **Component families:** Step rail, question group, option row, evidence block, confidence meter, autosave status.
- **CTA hierarchy:** `Devam et` primary; `Geri` secondary; `Taslağı kaydet` quiet; destructive reset isolated.
- **Density:** 5/10.
- **Special visual identity:** Deliberate, calm progression with visible assumptions and reversibility.
- **Light/dark notes:** Selected answers use low-opacity Petrol plus border/text; success green appears only after validated completion.
- **Responsive notes:** Evidence rail becomes an anchored disclosure/bottom sheet. Primary/secondary actions remain reachable but do not cover questions.

## 6. Decision Receipt

- **Page purpose:** Present a durable, reviewable and printable record of what was decided, why and what happens next.
- **First viewport:** Decision outcome, confidence/status, date/context, concise rationale and primary next action.
- **Dominant composition:** A receipt/ledger artifact centered in a quieter canvas, with rationale, evidence, assumptions and next steps as structured sections.
- **Signature panel:** **Yes — the receipt itself.** No additional dark summary card.
- **Component families:** Receipt header, evidence ledger, assumption rows, action checklist, provenance/source capsule.
- **CTA hierarchy:** Next operational step primary; `Yazdır/Paylaş/Dışa aktar` secondary or ghost.
- **Density:** 4/10, with dense metadata handled in orderly ledger rows.
- **Special visual identity:** Sand/paper cues, fine rules and a clear seal/status—premium documentation rather than a dashboard result card.
- **Light/dark notes:** Light artifact uses Elevated `#FFFDF9` on Warm Background; dark retains the artifact’s structure with raised charcoal and warm rules. Print is black-on-white.
- **Responsive notes:** Receipt becomes edge-to-edge with 16px margins; metadata stacks but the outcome and rationale remain first.

## 7. Finance Center

- **Page purpose:** Show financial position, surface risk and provide entry points to calculation/analysis workflows.
- **First viewport:** Financial health band, core receivable/payable/net values, exceptions, and one primary finance action.
- **Dominant composition:** Summary ledger + exception queue + compact tool/action rail. Charts only where a time/relationship question exists.
- **Signature panel:** **Yes — financial health band**, grounded in real data.
- **Component families:** Finance metric ledger, overdue row, scenario shortcut, cash-flow strip, data table.
- **CTA hierarchy:** Contextual action such as `Hesaplama başlat` primary; add/import/export secondary; row actions ghost.
- **Density:** 8/10.
- **Special visual identity:** Ledger precision and calm risk visibility; not colorful fintech tiles.
- **Light/dark notes:** Success green only for genuinely positive state; negative and overdue use semantic danger/warning. Dark charts use muted Petrol/Sand lines, not neon.
- **Responsive notes:** Summary becomes a scrollable metric band or stacked ledger; tables switch to prioritized record rows with filters in a sheet.

## 8. Finance Result

- **Page purpose:** Explain a calculation result, key drivers, uncertainty and the next safe action.
- **First viewport:** Result statement, primary metric, interpretation, confidence/assumption note and recommended next step.
- **Dominant composition:** Narrative result panel paired with driver breakdown; supporting calculation ledger below.
- **Signature panel:** **Yes — result narrative.** It may use a controlled Petrol-to-Deep gradient within the locked palette.
- **Component families:** Result statement, metric pair, driver chart, assumption ledger, scenario comparison, recommendation block.
- **CTA hierarchy:** `Sonraki adımı uygula` or `Senaryoyu kaydet` primary; `Varsayımları düzenle` secondary; export ghost.
- **Density:** 6/10.
- **Special visual identity:** A decision-ready financial explanation, not merely a large number and confetti.
- **Light/dark notes:** Result tone never depends only on green/red. Warm Accent may mark an important assumption, not decorate the whole result.
- **Responsive notes:** Narrative leads; driver chart and assumptions follow. Comparison can horizontally scroll with explicit affordance.

## 9. Model Lab Library

- **Page purpose:** Find, compare, resume and create analytical models.
- **First viewport:** Library title/context, search/filter, recent model, and first model group.
- **Dominant composition:** Compact model index with metadata columns/rows and a recent-work rail; avoid app-store cards.
- **Signature panel:** **No by default.** A resumed recent model can receive a raised row, not a hero.
- **Component families:** Model tile/row, recent version row, compatibility tag, template grouping, empty state.
- **CTA hierarchy:** `Yeni model oluştur` primary; open/resume secondary; duplicate/archive in overflow.
- **Density:** 7/10.
- **Special visual identity:** Instrument library: precise labels, last-run context and expected outputs.
- **Light/dark notes:** Selected row uses Petrol tonal state; no purple “AI/model” glow in dark.
- **Responsive notes:** Metadata prioritizes model name, last run and status; filters move to sheet; row actions remain accessible via overflow.

## 10. Model Workspace

- **Page purpose:** Edit assumptions, run a model, inspect outputs and compare versions without losing context.
- **First viewport:** Model identity/version, key parameters, run status/action and top output preview.
- **Dominant composition:** Three-zone workspace: parameter rail, central model/output canvas, compact inspector/history rail. Rails may collapse.
- **Signature panel:** **Yes — central workspace canvas**, not a decorative panel.
- **Component families:** Parameter editor, formula/data block, run controls, output inspector, version timeline, comparison table.
- **CTA hierarchy:** `Modeli çalıştır` primary; save version secondary; compare/export ghost; destructive delete isolated.
- **Density:** 9/10.
- **Special visual identity:** A calm analytical instrument. Alignment, mono-numeric behavior and output provenance create precision.
- **Light/dark notes:** Canvas layers must stay separable in dark using tonal steps. Active run uses Petrol; success green only when completed successfully.
- **Responsive notes:** Mobile is task-sequenced rather than three-column: parameters → run → outputs, with sticky section switcher and no horizontal page overflow.

## 11. AI Mentor

- **Page purpose:** Support thinking through conversation while exposing sources, context and actionable next steps.
- **First viewport:** Conversation context, latest exchange, grounded suggestions and composer. Secondary memory/tools must not dominate.
- **Dominant composition:** Conversation stream in the main column with optional collapsible context/evidence rail.
- **Signature panel:** **No separate panel.** The conversation and composer are the signature experience.
- **Component families:** Mentor message, evidence/source capsule, suggested action, context rail, composer, streaming state.
- **CTA hierarchy:** Send action is visually clear but compact; suggested next action may be primary only when explicitly user-approved; memory/settings quiet.
- **Density:** 5/10.
- **Special visual identity:** Calm counsel, not a glowing AI chat. Assistant/user separation relies on alignment, tone and subtle surface differences.
- **Light/dark notes:** No purple/blue AI gradients. Dark bubbles use adjacent graphite-petrol surfaces; citations use Soft Petrol.
- **Responsive notes:** Chat is full priority; context becomes drawer/accordion; composer clears bottom navigation and safe area.

## 12. Business Tracking Overview

- **Page purpose:** Summarize ongoing business obligations, records, deadlines and recent changes.
- **First viewport:** Operational summary, urgent exceptions/deadlines, and primary add/update action.
- **Dominant composition:** Summary strip + exception queue + timeline/records preview; no equal KPI cards.
- **Signature panel:** **Yes — operational continuity band**, especially when there are overdue or at-risk items.
- **Component families:** Operational Summary, deadline row, status timeline, record preview, document attachment row.
- **CTA hierarchy:** `Yeni kayıt ekle` primary; review/update secondary; filters ghost.
- **Density:** 8/10.
- **Special visual identity:** A business logbook: continuity, recency and accountability are visible.
- **Light/dark notes:** Warm Accent can flag attention; green means genuinely resolved/on-track. Dark timelines use quiet warm rules.
- **Responsive notes:** Exceptions precede summaries on small screens when urgent. Timeline becomes single-axis; filters live in a sheet.

## 13. Business Records

- **Page purpose:** Search, filter, inspect and manage structured business records efficiently.
- **First viewport:** Page/filter context, search, primary add action and first real records.
- **Dominant composition:** Data table/list with sticky controls and optional detail drawer; not one card per record on desktop.
- **Signature panel:** **No.** The record system itself is primary.
- **Component families:** Data table, compact record row, filter bar, bulk-action strip, detail drawer, attachment/status cells.
- **CTA hierarchy:** `Kayıt ekle` primary; bulk/edit secondary; row utilities ghost/overflow; delete isolated.
- **Density:** 9/10.
- **Special visual identity:** Efficient ledger with strong column hierarchy and soft selected-row state.
- **Light/dark notes:** Zebra striping is avoided; use dividers and hover/selected tonal states. Semantic colors appear only in status cells.
- **Responsive notes:** Switch to prioritized record rows/cards only because columns cannot fit; retain sorting/filtering and expose secondary fields in detail disclosure.

## 14. News

- **Page purpose:** Help users scan trusted, relevant business news and understand why an item matters.
- **First viewport:** One lead story, relevance context/topics and the beginning of the latest stream.
- **Dominant composition:** Editorial lead + compact story stream + topic rail; avoid an equal thumbnail-card grid.
- **Signature panel:** **Yes — one lead story**, when a real lead exists.
- **Component families:** Lead story, story row, source metadata, topic chip, saved control, relevance note.
- **CTA hierarchy:** `Haberi oku` is contextual secondary/inline; saving is ghost; no global primary unless onboarding preferences are incomplete.
- **Density:** 5/10.
- **Special visual identity:** Editorial rhythm, stronger typography and imagery while retaining the same shell/tokens.
- **Light/dark notes:** Images supply color; UI does not invent category rainbow. Dark overlays preserve readable metadata without blue tint.
- **Responsive notes:** Lead story becomes a compact vertical editorial block; story rows keep source, time and relevance visible.

## 15. Community

- **Page purpose:** Surface useful peer discussions, questions and local-business knowledge while enabling participation.
- **First viewport:** Community context, create-post action, one meaningful featured/active discussion and recent feed start.
- **Dominant composition:** Discussion stream with a narrow topic/community rail; posts are separated by rhythm/dividers, not giant cards.
- **Signature panel:** **Optional — one featured discussion**, only when curated or active.
- **Component families:** Community post, author line, topic rail, response preview, composer, moderation/status cue.
- **CTA hierarchy:** `Gönderi oluştur` primary; reply secondary/inline; reactions quiet; moderation actions isolated.
- **Density:** 6/10.
- **Special visual identity:** Human warmth through avatars, voice and conversation spacing—not playful color proliferation.
- **Light/dark notes:** Warm Accent may identify curated content; success green has no decorative social role.
- **Responsive notes:** Topic rail becomes chips; composer opens as full-width sheet/page; engagement metadata stays compact and tappable.

## 16. Saved

- **Page purpose:** Retrieve saved courses, news, tools, decisions and models across domains.
- **First viewport:** Search, domain filters/counts and the first saved group with useful context.
- **Dominant composition:** Mixed-object library grouped by domain or recency, using domain-specific compact rows within one retrieval grammar.
- **Signature panel:** **No.** Retrieval speed is the identity.
- **Component families:** Saved-object row, domain tabs/chips, sort control, bulk selection, empty state.
- **CTA hierarchy:** Open/resume is row-level secondary; remove is ghost/overflow; no forced page primary.
- **Density:** 6/10.
- **Special visual identity:** Domain families remain recognizable through icon/anatomy while sharing one saved-item alignment.
- **Light/dark notes:** Do not assign a new color to every domain; use Petrol identity plus content/media and labels.
- **Responsive notes:** Domain filters horizontally scroll; metadata collapses by priority; bulk actions appear only after selection.

## 17. Settings / Profile

- **Page purpose:** Manage identity, preferences, business context, notifications, accessibility and account safety.
- **First viewport:** Profile/business identity summary, section navigation and the most relevant editable group.
- **Dominant composition:** Desktop section rail + form canvas; destructive/account actions in a separate final zone.
- **Signature panel:** **Optional — subtle identity header**, not a dark hero.
- **Component families:** Form group, identity summary, preference row, segmented/tab control, security session row, danger zone.
- **CTA hierarchy:** `Değişiklikleri kaydet` primary only when dirty; cancel secondary; navigation ghost; destructive danger isolated.
- **Density:** 6/10.
- **Special visual identity:** Trust and calm control, with clear save state and no endless card stack.
- **Light/dark notes:** Inputs use sunken surfaces; elevated white/dark cards are reserved for independently meaningful groups. Focus and errors remain high contrast.
- **Responsive notes:** Section rail becomes top selector or drill-in navigation; sticky save bar appears only with unsaved changes and respects safe area.

## 18. Admin Overview

- **Page purpose:** Monitor system health, exceptions, content/operations queues and high-impact administrative actions.
- **First viewport:** System health strip, urgent exception queue, key operational counts and the first control table.
- **Dominant composition:** Dense command view: health strip + queue + tables/timelines. No consumer-style hero or bento KPI cards.
- **Signature panel:** **Yes — system health strip**, compact and status-driven.
- **Component families:** Admin metric ledger, exception queue, audit timeline, data table, bulk-action strip, permission/status badge.
- **CTA hierarchy:** Primary only for the page’s central creation/resolve workflow; filters and exports secondary/ghost; destructive/bulk actions require clear scope.
- **Density:** 9/10.
- **Special visual identity:** Operational authority through precision and exception visibility; still recognizably LocalKarar, not a separate admin product.
- **Light/dark notes:** Semantic colors are concentrated in health/exception states. Dark mode must keep tables legible without bright cyan grid lines.
- **Responsive notes:** Admin is desktop-first but must remain usable: prioritize exception queue, convert tables to scoped record lists, and move bulk/filters into sheets. Never hide critical status.

## Cross-screen approval checklist

- All 18 screens share the same shell, tokens, primitive states and responsive breakpoints.
- At least six distinct page anatomies are visibly present across the family: workbench, library, stage, guided session, artifact, ledger, workspace, conversation, editorial stream and settings form.
- No screen solves hierarchy by turning every section into a raised card.
- Signature surfaces are singular and purposeful.
- Each first viewport exposes real work, not duplicate headings or decorative hero space.
- Primary CTA count and semantic colors obey the Master Brief.
- Light/dark parity preserves hierarchy; mobile adaptation reprioritizes content.
- Loading, empty, error and long-content states are designed as part of each family, not appended later.

