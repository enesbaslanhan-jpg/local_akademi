# LocalKarar 18-Screen Batch Design Prompt

Use this prompt in a repo-aware visual design system such as Codex, Figma/Make, Stitch or an equivalent tool. It requests one coherent product family—not 18 independent redesigns.

---

You are designing the complete LocalKarar application family from this repository.

## Read first — repository authority

Before generating any screen, read these files in order:

1. `LOCALKARAR_MASTER_DESIGN_BRIEF_v2.md`
2. `LOCALKARAR_BATCH_SCREEN_SPEC.md`
3. `DESIGN_v3_WARM_PETROL.md`
4. `DASHBOARD_DESIGN_AUDIT.md`
5. `DASHBOARD_REDESIGN_SPEC.md`
6. Existing `DESIGN.md` only as a v2 technical-history reference
7. Relevant current page/component sources only to preserve product truth, data, Turkish labels, information architecture and states

If sources conflict, use this priority:

1. This prompt and the user’s locked choices
2. `LOCALKARAR_MASTER_DESIGN_BRIEF_v2.md`
3. `LOCALKARAR_BATCH_SCREEN_SPEC.md`
4. `DESIGN_v3_WARM_PETROL.md`
5. Dashboard audit/redesign spec
6. Existing v2 `DESIGN.md`, phase reports and current implementation

Do not change application code, routes, data behavior or dependencies during this design task. Do not invent product metrics, user claims, unsupported features or English replacement copy. This is a high-fidelity batch design/mockup task.

## Locked direction — do not reopen selection

- Visual direction: **D = Premium Operational + Apple Calm Depth hybrid**.
- Palette direction: **Warm Petrol**.
- Core palette:
  - Primary `#1F6673`
  - Deep `#183E45`
  - Hover `#275A63`
  - Soft accent `#9FBFC2`
  - Light background `#F2EFEA`
  - Light surface `#FAF8F4`
  - Light elevated `#FFFDF9`
  - Dark background `#141A1B`
  - Dark surface `#1C2425`
  - Warm accent `#C98245`
  - Sand accent `#D8C3A5`
  - Success `#3C8661`
- Primary font: Manrope.
- Product mode: Operate first; Read for learning/editorial surfaces.

Do not propose alternative palettes or visual directions. Do not introduce purple AI gradients, saturated blue/cyan dark mode, decorative green, pure-white full-page canvases or generic SaaS/admin styling.

## Required process: system first, screens second

Do **not** design each screen independently.

### Phase 1 — establish the shared visual language

Create and show a compact visual-language board containing:

- Light and dark Warm Petrol role mapping.
- Canvas, sunken, standard, raised, signature and overlay layers.
- Sidebar/header shell in expanded, collapsed and mobile states.
- Typography hierarchy and numeric treatment.
- Spacing, grid, radius and depth samples.
- Primary/secondary/ghost/danger CTA hierarchy.
- Field, tabs, row, table, badge, tooltip, popover, modal/drawer, progress, skeleton, empty and error primitives.
- Active vs recommended navigation distinction.
- Focus, hover, selected, disabled and loading states.
- Domain-family samples for Operational, Learning, Decision, Finance, Model Lab, Mentor, Business Tracking and Editorial/Social.
- Motion annotations only: immediate press feedback, origin-aware overlays, critically damped transitions, reduced-motion/transparency alternatives. Do not add a runtime dependency.

The language board must prove these laws:

- Unified != identical.
- Compact != flat.
- Tokenized != colorless.
- One dominant CTA per task context.
- At most one signature panel per relevant page.
- Cards only when containment is real.

### Phase 2 — create the 18-screen family

Apply the approved Phase 1 language to all screens below in one batch. Use the exact page anatomy and requirements in `LOCALKARAR_BATCH_SCREEN_SPEC.md`:

1. Dashboard
2. Courses
3. Course Player
4. Decision Tools
5. Decision Tool Session
6. Decision Receipt
7. Finance Center
8. Finance Result
9. Model Lab Library
10. Model Workspace
11. AI Mentor
12. Business Tracking Overview
13. Business Records
14. News
15. Community
16. Saved
17. Settings/Profile
18. Admin Overview

Every screen must feel like LocalKarar, but page anatomy must follow purpose. Across the batch, visibly use multiple composition families: workbench, library, learning stage, guided session, receipt artifact, ledger, analytical workspace, conversation, timeline/records, editorial stream and settings form.

Do not solve the batch with 18 versions of “page title + three KPI cards + card grid.” Do not make every section a card. Use section fields, rows, rails, tables, split panes, stages, timelines, ledgers, artifacts and negative space.

## Viewport deliverables

The final target for **each of the 18 screens** is:

- Desktop light: `1440px` wide family view.
- Desktop dark: `1440px` wide family view.
- Mobile adaptation: `390px` wide, respecting safe areas and bottom navigation.

This equals 54 target states. Keep content, hierarchy and component identity consistent across modes and sizes; mobile must reprioritize rather than simply stack desktop columns.

### Allowed staged mockup option

For the first approval checkpoint, you may create a **Desktop Light Family Sheet** containing all 18 screens at consistent scale. This is strongly preferred when producing 54 states at once would reduce quality.

If using the staged option:

1. First deliver the Phase 1 visual-language board.
2. Then deliver all 18 desktop-light screens together as one family sheet.
3. Wait for family-level approval.
4. Only then derive the complete desktop-dark family and 390px mobile adaptations.

Do not present the first desktop screen as final while the rest remain undefined. The review unit is the family.

## Shell and shared system constraints

- Desktop sidebar `256px`, collapsed `64px`; mobile is a drawer.
- Header `52px`; avoid duplicate header/page title/date.
- Content follows the existing `1180px` maximum where appropriate; Model Workspace may use available workspace width.
- Desktop uses a 12-column basis; tablet 8; mobile 4.
- Standard page padding 24px desktop / 16px mobile.
- Standard control height 40px; mobile touch target minimum 44px.
- Buttons/fields 8px radius, standard contained surfaces 12px, signature surfaces 16px.
- Pure white is elevated light material, not the full page.
- Dark mode is warm charcoal-petrol, not blue/cyan tech UI.
- Glass is allowed only for floating chrome, drawers, modals/popovers, search/command and Mentor overlay.

## Page personality and color constraints

- Warm Petrol carries brand, action, active state, progress and focus.
- Green `#3C8661` appears only for verified success/healthy/positive states.
- Warm Accent `#C98245` marks rare attention or recommendation, not a second primary CTA.
- Sand `#D8C3A5` can support receipt/editorial material, not status.
- Semantic warning/error must be accessible and distinct; state includes text/icon.
- Imagery may contribute content color in News/Courses/Community, but UI chrome stays in the locked system.

For each screen, explicitly annotate:

- Page purpose.
- First-viewport priority.
- Dominant composition.
- Signature panel yes/no and why.
- Component/domain families used.
- CTA hierarchy.
- Density.
- Unique page identity achieved through anatomy.
- Light/dark translation.
- Mobile reprioritization.

## Interaction and state requirements

Show or document relevant variants for:

- Default, hover, active/pressed, selected and focus-visible.
- Loading skeleton matching final geometry.
- Empty state with the correct next action.
- Error state preserving user context/input.
- Disabled state using surface + text + edge, not opacity alone.
- Long Turkish labels and realistic data density.
- Reduced motion and reduced transparency alternatives.

Motion must communicate feedback, hierarchy, spatial origin or state change. No perpetual sweep, shimmer, floating glow or celebratory decoration in operational surfaces. Use short, interruptible behavior and specify it without requiring a new runtime dependency.

## Accessibility and quality gate

- WCAG AA: 4.5:1 normal text, 3:1 large text and meaningful UI boundaries.
- Focus is always visible and keyboard order matches visual order.
- Icon-only actions have accessible labels/tooltips.
- Minimum touch target is 44×44px.
- Status never relies on color alone.
- Text scaling and long content do not clip.
- Mobile tables receive a usable alternative or an explicit, understandable horizontal strategy.
- No fabricated metrics or fake precision.

## Anti-pattern rejection list

Reject and revise any batch containing:

- Generic admin dashboard styling.
- Card-everything or repeated three-equal-feature-card layouts.
- Pure-white full-page light mode.
- Saturated blue/cyan dark mode.
- Decorative green.
- Every CTA rendered primary.
- Multiple competing signature panels.
- Duplicate page/header context.
- Glass on ordinary cards/tables/forms.
- Purple AI glow, mesh gradient, neon outline or arbitrary new hue.
- Giant radii, oversized buttons or compactness achieved with tiny text.
- 18 screens that look identical except for labels.
- 18 screens that appear to belong to different products.

## Final batch review

Before presenting the result, audit all 18 screens side by side and answer:

1. Is the LocalKarar family instantly recognizable in every screen?
2. Does each page have a purpose-specific anatomy?
3. Are CTA and signature-panel counts controlled?
4. Are Warm Petrol roles consistent in light and dark?
5. Does mobile preserve the real first task?
6. Are operational, learning, decision, finance, model, Mentor, tracking, editorial and admin families distinct without new visual languages?
7. Are loading, empty, error, disabled and focus states covered?
8. Are all rejection-list patterns absent?

Present the visual-language board and family sheets with concise annotations. Review and request approval at family level before any implementation handoff.

---

