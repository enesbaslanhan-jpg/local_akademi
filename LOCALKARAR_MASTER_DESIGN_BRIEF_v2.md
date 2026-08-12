# LocalKarar Master Design Brief v2

**Status:** Approved visual direction and batch-design contract  
**Direction:** D — Premium Operational + Apple Calm Depth  
**Palette:** Warm Petrol  
**Mode:** Operate first; Read where learning requires it  
**Design read:** A calm, premium operational workspace for small-business owners, combining decision support, learning and daily business control without resembling a generic SaaS admin template.

## 1. Product character

LocalKarar should feel like a composed expert sitting beside the operator: calm under pressure, precise with numbers, warm without becoming decorative, and confident without becoming loud. “Premium” comes from hierarchy, material restraint, typography and the quality of transitions—not oversized whitespace, glossy effects or luxury clichés. “Operational” means the next meaningful action and current state are visible quickly. “Apple Calm Depth” means surfaces have believable spatial relationships, chrome recedes, feedback is immediate and motion explains state.

Global design dials:

- `DESIGN_VARIANCE: 5` — controlled asymmetry; the shell is stable while page anatomy can vary.
- `MOTION_INTENSITY: 3` — crisp feedback and spatial transitions; no decorative loops.
- `VISUAL_DENSITY: 6` — compact-balanced for daily use, with breathing room reserved for reading and signature artifacts.

Three governing equations:

- **Unified != identical.** Pages share shell, tokens, primitives and interaction laws; they do not share the same card grid or first viewport.
- **Compact != flat.** Density comes from rhythm and grouping, while tonal layers and deliberate focal surfaces preserve depth.
- **Tokenized != colorless.** Tokens prevent drift; they do not force every surface into gray or remove domain identity.

## 2. Warm Petrol palette and role map

### 2.1 Core palette — locked

| Core color | Value | Normative role |
|---|---:|---|
| Primary Petrol | `#1F6673` | Primary CTA, active navigation, progress, selected state, focus identity |
| Deep Petrol | `#183E45` | Strong brand field, signature panel, pressed state, high-contrast brand text |
| Petrol Hover | `#275A63` | Primary hover and controlled darker interaction state |
| Soft Petrol | `#9FBFC2` | Low-emphasis brand line, dark-mode links, selected-state support |
| Light Background | `#F2EFEA` | Light canvas; never replace with full-page pure white |
| Light Surface | `#FAF8F4` | Section and standard content surface |
| Light Elevated | `#FFFDF9` | Modal, popover, focal card and elevated controls |
| Dark Background | `#141A1B` | Dark canvas; charcoal-petrol, not black or saturated blue |
| Dark Surface | `#1C2425` | Standard dark panels and cards |
| Warm Accent | `#C98245` | Rare recommendation, attention or editorial warmth—not a second CTA color |
| Sand Accent | `#D8C3A5` | Quiet warmth, receipt paper cues, subtle separators or empty-state material |
| Success | `#3C8661` | Positive outcome only; never decorative |

### 2.2 Light role map

| Semantic role | Value / derivation | Use |
|---|---|---|
| `background` | `#F2EFEA` | Full-page canvas |
| `surface-sunken` | `#EAE5DE` | Inputs, recessed wells, grouped data beds |
| `surface` | `#FAF8F4` | Standard section field |
| `surface-raised` | `#FFFDF9` | Cards that truly need containment |
| `surface-brand` | `#183E45` | One signature panel or deliberate brand field |
| `text-primary` | `#182224` | Main text |
| `text-secondary` | `#465456` | Supporting text |
| `text-muted` | `#6B7777` | Metadata only |
| `border-subtle` | `rgba(24,62,69,.10)` | Quiet separators |
| `border-strong` | `rgba(24,62,69,.20)` | Interactive and structural edges |
| `primary` | `#1F6673` | Single dominant action and active state |
| `primary-hover` | `#275A63` | Hover |
| `primary-pressed` | `#183E45` | Pressed/strong selected |
| `focus-ring` | `rgba(31,102,115,.28)` | 2px outline plus offset |
| `warm-attention` | `#C98245` | Rare recommended/attention cue |
| `success` | `#3C8661` | Verified positive state |

### 2.3 Dark role map

| Semantic role | Value / derivation | Use |
|---|---|---|
| `background` | `#141A1B` | Full-page canvas |
| `surface-sunken` | `#101617` | Recessed fields and inner wells |
| `surface` | `#1C2425` | Standard panel |
| `surface-raised` | `#242E30` | Focal/elevated surface |
| `surface-overlay` | `#2B3638` | Modal, menu, drawer |
| `text-primary` | `#F1EEE8` | Main text; warm off-white |
| `text-secondary` | `#B5BFBD` | Supporting text |
| `text-muted` | `#8E9997` | Metadata only |
| `border-subtle` | `rgba(216,195,165,.09)` | Quiet warm edge |
| `border-strong` | `rgba(159,191,194,.18)` | Interactive edge |
| `primary` | `#1F6673` | Solid CTA; do not replace with cyan |
| `primary-hover` | `#275A63` | Hover |
| `on-primary` | `#FFFDF9` | CTA foreground after contrast verification |
| `brand-light` | `#9FBFC2` | Link, focus support, selected label |
| `warm-attention` | `#C98245` | Rare recommendation/attention cue |
| `success` | `#3C8661` | Positive state only |

Dark mode is not a blue night theme. It must remain charcoal-petrol with warm neutral text. No saturated blue/cyan primary, glow field or electric teal typography.

### 2.4 Semantic color law

- Petrol is brand/action/navigation/progress; it is not automatically “success.”
- Green is exclusively semantic: confirmed success, healthy status, positive delta or completion. **Green is not decorative.**
- Warm orange identifies recommendation, cautionary attention or a genuinely warm editorial accent. It must not compete with the primary CTA.
- Sand is material and atmospheric, not a status color.
- Error and warning require dedicated accessible red/amber tokens in implementation; neither may be improvised from Warm Accent.
- Status is always expressed with text and/or icon in addition to color.
- At most one dominant brand field and one dominant primary CTA appear in a viewport.

## 3. Surface layering and material

Depth order is: **tonal contrast → edge → restrained shadow → translucency only when spatially justified**.

1. Canvas establishes the mode.
2. Section fields group related content without necessarily creating a card.
3. Raised surfaces contain actionable or independently movable objects.
4. Signature surfaces carry a page-defining artifact or summary.
5. Overlay surfaces belong to modals, menus, drawers and anchored tools.

Avoid nesting raised cards inside raised cards. A list, table, feed or metric row should usually use spacing and dividers. Cards are reserved for real containment: a resumable course, a movable model, a decision artifact or a distinct action module. Large surfaces read thicker through a slightly larger shadow and clearer edge, not stronger saturation.

Glass is allow-listed for floating header chrome, mobile drawer, modal/popover, command/search overlay and Mentor overlay. Use a solid fallback for reduced transparency. Do not use glass on normal dashboard widgets, tables, course cards or form groups.

## 4. Shell: sidebar and header

### Sidebar

- Stable desktop width `256px`; collapsed rail `64px`; mobile becomes a drawer.
- Light mode uses a quiet, warm off-surface—not a giant dark brand slab that competes with content.
- Dark mode sidebar is one tonal step distinct from the canvas, not cyan-edged.
- Active location: low-opacity petrol field + clear label + one spatial marker. “Recommended” uses warm attention and never reuses the active marker.
- Group labels are sentence case and sparse. Remove template-like visual noise and redundant badges.
- Collapsed items require tooltips; identity cannot depend on recall.

### Header

- Height `52px`; floating material is subtle and becomes visible only when content scrolls beneath it.
- Shows route context once. Do not repeat the same page title/date in the page hero.
- Global search, notifications, profile and mode switch remain secondary to page work.
- Icon controls have a minimum `44×44px` hit area on touch surfaces.

## 5. Typography

Use **Manrope** as the single primary family, preserving LocalKarar’s existing technical choice. Hierarchy comes from size, weight, line height and optical tracking—not from mixing decorative typefaces.

| Role | Desktop | Mobile | Weight / leading | Use |
|---|---:|---:|---|---|
| Display | `40–48px` | `32–40px` | 700 / 1.08 | Rare onboarding or empty-state narrative |
| Page title | `28px` | `24px` | 700 / 1.20 | Page identity; may vary only by defined page-title token |
| Section title | `20px` | `18px` | 650 / 1.30 | Primary section |
| Card/domain title | `16px` | `16px` | 650 / 1.35 | Contained object title |
| Body large | `16px` | `16px` | 400 / 1.70 | Learning and long-form reading |
| Body | `14px` | `14px` | 400 / 1.55 | Default operational text |
| Body small | `13px` | `13px` | 450 / 1.45 | Tables and supporting UI |
| Label | `12px` | `12px` | 650 / 1.35 | Control labels and compact metadata |
| Metric large | `28px` | `24px` | 700 / 1.10 | Primary KPI only |

Large text uses slightly negative tracking; body stays near zero; small labels may use slight positive tracking. No all-caps navigation. Long text lines remain around `65–72ch`.

## 6. Spacing, density and responsive grid

- Base scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Desktop page padding `24px`; mobile `16px`.
- Standard section gap `24–32px`; reading transitions may use `40–48px`.
- Standard contained padding `16px`; dense `12px`; signature `24px`.
- Control height `40px`; large composer/hero control `48px`; table row `44px`.
- Desktop grid: 12 columns; tablet 8; mobile 4. Content max width remains `1180px` unless a workspace explicitly uses the available canvas.
- Data-heavy pages compress whitespace, never typography below the defined minimum.
- Mobile redesigns priority: first viewport should show page context, primary control and first real content—not merely stacked desktop cards.

## 7. Shape and depth

| Token | Value | Use |
|---|---:|---|
| `radius-xs` | `6px` | Badge, compact code/status |
| `radius-sm` | `8px` | Input, button, list selection |
| `radius-md` | `12px` | Standard contained surface |
| `radius-lg` | `16px` | Signature or feature artifact |
| `radius-full` | `9999px` | Avatar, status dot container, deliberate pill |

Buttons and fields use 8px; cards use 12px; signature surfaces use 16px. This documented hierarchy is the only permitted mixed-radius system. Do not apply 16–24px rounding to everything.

Shadows are tinted to the surface family. Default sections are shadowless. Resting cards use either a border or a very low ambient shadow, not both at full strength. Overlays use the strongest shadow. No neon outer glow.

## 8. Controlled gradients and textures

- Gradients are permitted only in signature panels, decision/finance visual artifacts, onboarding and restrained page-family accents.
- A gradient stays within adjacent Warm Petrol/surface tones; it cannot introduce purple, bright blue or unrelated hues.
- Warm Accent may appear as a narrow directional warmth, never a full orange CTA gradient.
- Texture is optional, static and nearly imperceptible: fine grain or paper cue at roughly 1–2% visual strength. It must not reduce text contrast or repaint during scroll.
- No generic mesh background, spotlight orb, glow blob or animated sheen.

## 9. Icon treatment

- Use the project’s incumbent icon family consistently; never mix families within a screen.
- Line icons, optical size `16–20px`, consistent stroke around `1.75px`, rounded caps where supported.
- Icons support labels and state; they do not become oversized decorative illustrations in operational pages.
- Petrol is used for interactive or active icons. Semantic icons use semantic colors only when state is real.
- Icon-only actions require tooltip, accessible name and 44px touch target.

## 10. CTA hierarchy

1. **Primary:** one dominant, solid Petrol action per task context.
2. **Secondary:** neutral raised/outlined action for a meaningful alternative.
3. **Tertiary/ghost:** inline or quiet action for navigation and low-risk utility.
4. **Danger:** semantic destructive action, isolated from the normal action cluster.
5. **Inline link:** navigation inside prose, rows or artifacts.

**Every CTA is not primary.** Repeated full-width primary buttons, three equal action cards and colored buttons for every row are prohibited. Primary may recur below the fold only when it begins a distinct task context and is not simultaneously visible with another dominant CTA.

## 11. Shared primitives and domain families

Shared primitives provide consistency: button, icon button, field, select, tabs, badge, tooltip, popover, modal, drawer, list row, data row, progress, skeleton, empty/error state, toast, metric and shell chrome.

Domain families provide personality without inventing a new design language:

- **Operational Summary:** KPI strip, status ledger, alert line, task group.
- **Learning:** course cover tile, progress spine, lesson rail, transcript/notes surface.
- **Decision:** tool index row, question step, evidence block, confidence meter, decision receipt.
- **Finance:** metric ledger, assumption editor, scenario band, result narrative, chart/table pair.
- **Model Lab:** model tile, workspace canvas, parameter rail, output inspector, saved version row.
- **Mentor:** conversation stream, source/evidence capsule, suggestion rail, composer.
- **Business Tracking:** record table/list, status timeline, document attachment row, summary strip.
- **Editorial/Social:** story row, topic rail, community post, save action, source metadata.

Domain components inherit the same colors, radii, type, spacing and interaction states. Their anatomy and information density change according to purpose.

## 12. Motion philosophy

Motion communicates feedback, hierarchy, origin or state change. If it cannot answer “what changed or where did this come from?”, remove it.

- Press feedback begins on pointer-down; use a subtle `scale(.98)` or 1px translation.
- Hover/focus `120–160ms`; content/state transition `180–240ms`; modal/drawer `260–340ms`.
- Popovers originate from their trigger; modals originate from center; enter and exit share a spatial path.
- Use critically damped, no-bounce behavior for ordinary UI. Momentum/bounce is allowed only after a physical drag/flick.
- Animations must be interruptible where users can reverse or retarget them.
- Animate transform and opacity; avoid layout-property animation.
- `prefers-reduced-motion` replaces travel/spring with short cross-fades. `prefers-reduced-transparency` uses solid surfaces.
- No perpetual sweep, shimmer, floating background or celebratory motion in everyday operation.
- This is a behavior specification only; it does not authorize a runtime dependency.

## 13. Accessibility contract

- WCAG AA minimum: 4.5:1 normal text, 3:1 large text and meaningful graphical boundaries.
- Visible 2px focus ring with 2px offset; never remove it.
- Touch targets minimum 44×44px; controls retain logical keyboard order.
- Status never relies on color alone; errors are associated with fields in text.
- Disabled state changes surface, text and edge—not opacity alone.
- Text scaling must not clip or hide controls; use relative type/spacing where implementation permits.
- Tables have a small-screen alternative or horizontal strategy with clear affordance.
- Loading skeletons mirror final geometry; empty states explain the next action; errors preserve user input.

## 14. Page personality matrix

| Page family | Density | Dominant anatomy | Signature material | Primary emotional cue |
|---|---:|---|---|---|
| Dashboard | 7 | status + work queue | one operational status panel | composed readiness |
| Courses | 5 | library + progress paths | featured/resume course | momentum |
| Course Player | 4 | content stage + lesson rail | learning stage | focus |
| Decision Tools | 6 | grouped tool index | recommended path, restrained | clarity |
| Decision Session | 5 | step flow + evidence | active decision stage | agency |
| Decision Receipt | 4 | printable artifact | receipt/ledger | closure |
| Finance | 8 | ledgers + scenario controls | result/health band | financial control |
| Model Lab | 8 | library/workspace canvas | model output surface | precision |
| AI Mentor | 5 | conversation + evidence | chat stream itself | supported thinking |
| Business Tracking | 8 | summary + records | operational timeline | continuity |
| News | 5 | editorial stream | lead story | informed awareness |
| Community | 6 | discussion stream | featured discussion only | belonging |
| Saved | 6 | grouped mixed objects | none by default | retrieval |
| Settings/Profile | 6 | section navigation + forms | identity header, subtle | trust |
| Admin | 9 | control table + exception queue | system health strip | command |

## 15. Anti-patterns

- No generic admin template composition.
- No card-everything; use groups, rails, ledgers, split panes, timelines and reading stages.
- No pure-white full-page canvas; white is an elevated light surface only.
- No saturated blue/cyan dark mode.
- No green decoration or brand substitution.
- No three equal feature cards when priority differs.
- No primary styling for every CTA.
- No duplicate header/page title/date.
- No glass on normal content cards.
- No arbitrary gradients, glows, giant radii or 600ms hover effects.
- No compactness by shrinking readable type.
- No independent color, font, radius or shadow vocabulary per page.
- No invented metrics, fabricated precision or decorative dashboards.

## 16. Approval rules

A batch or screen is approved only when all conditions pass:

1. Warm Petrol values and semantic roles are intact in light and dark.
2. The shell is recognizably shared, while page anatomy matches its purpose.
3. The first viewport answers “where am I, what matters now, what can I do next?”
4. One dominant CTA and at most one signature panel are visible per task context.
5. Cards represent real containment; lists/tables/feeds are not boxed without reason.
6. Light mode does not become a white-card catalog; dark mode does not become cyan tech UI.
7. Page personality is visible through composition and domain components, not new tokens.
8. Responsive adaptation reprioritizes content rather than merely stacking desktop columns.
9. Empty, loading, error, disabled, hover, focus and selected states are specified.
10. Contrast, touch targets, keyboard wayfinding and reduced-motion/transparency behavior pass.
11. No implementation dependency is implied by a mockup or motion note.
12. Approval is family-level: a visually good isolated screen fails if it breaks the batch DNA.

