---
version: alpha
name: LocalKarar Warm Petrol v3
description: Premium Operational clarity with Apple Calm Depth for the complete LocalKarar product family.
colors:
  primary: "#1F6673"
  primary-deep: "#183E45"
  primary-hover: "#275A63"
  primary-soft: "#9FBFC2"
  warm-accent: "#C98245"
  sand-accent: "#D8C3A5"
  success: "#3C8661"
  on-success: "#000000"
  light-background: "#F2EFEA"
  light-surface-sunken: "#EAE5DE"
  light-surface: "#FAF8F4"
  light-surface-elevated: "#FFFDF9"
  light-text-primary: "#182224"
  light-text-secondary: "#465456"
  light-text-muted: "#6B7777"
  light-border-subtle: "rgba(24, 62, 69, 0.10)"
  light-border-strong: "rgba(24, 62, 69, 0.20)"
  dark-background: "#141A1B"
  dark-surface-sunken: "#101617"
  dark-surface: "#1C2425"
  dark-surface-elevated: "#242E30"
  dark-surface-overlay: "#2B3638"
  dark-text-primary: "#F1EEE8"
  dark-text-secondary: "#B5BFBD"
  dark-text-muted: "#8E9997"
  dark-border-subtle: "rgba(216, 195, 165, 0.09)"
  dark-border-strong: "rgba(159, 191, 194, 0.18)"
  on-primary: "#FFFDF9"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.025em
  page-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.015em
  section-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: -0.01em
  domain-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.35
  body-lg:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 450
    lineHeight: 1.45
  label-md:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: 0.01em
  metric-lg:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  metric-md:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  page-desktop: 24px
  page-mobile: 16px
  grid-gap: 16px
  section-gap: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-deep}"
  button-secondary-light:
    backgroundColor: "{colors.light-surface-elevated}"
    textColor: "{colors.light-text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 20px
  button-secondary-dark:
    backgroundColor: "{colors.dark-surface-elevated}"
    textColor: "{colors.dark-text-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 20px
  button-ghost-light:
    textColor: "{colors.primary-deep}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  button-ghost-dark:
    textColor: "{colors.primary-soft}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  field-light:
    backgroundColor: "{colors.light-surface-sunken}"
    textColor: "{colors.light-text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  field-dark:
    backgroundColor: "{colors.dark-surface-sunken}"
    textColor: "{colors.dark-text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  card-standard-light:
    backgroundColor: "{colors.light-surface-elevated}"
    textColor: "{colors.light-text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  card-standard-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  signature-panel-light:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  signature-panel-dark:
    backgroundColor: "{colors.dark-surface-elevated}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  list-row-light:
    textColor: "{colors.light-text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 44px
    padding: 0 12px
  list-row-dark:
    textColor: "{colors.dark-text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 44px
    padding: 0 12px
  badge-brand:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  navigation-active-light:
    backgroundColor: "{colors.light-surface-sunken}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  navigation-active-dark:
    backgroundColor: "{colors.dark-surface-elevated}"
    textColor: "{colors.primary-soft}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 12px
  canvas-light:
    backgroundColor: "{colors.light-background}"
    textColor: "{colors.light-text-primary}"
  canvas-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-text-primary}"
  section-field-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  overlay-dark:
    backgroundColor: "{colors.dark-surface-overlay}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  metadata-light:
    textColor: "{colors.light-text-muted}"
    typography: "{typography.body-sm}"
  metadata-dark:
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.body-sm}"
  supporting-text-dark:
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.body-md}"
  attention-badge:
    backgroundColor: "{colors.warm-accent}"
    textColor: "{colors.light-text-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  success-badge:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  receipt-surface:
    backgroundColor: "{colors.sand-accent}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  divider-light:
    backgroundColor: "{colors.light-border-subtle}"
    height: 1px
  divider-light-strong:
    backgroundColor: "{colors.light-border-strong}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.dark-border-subtle}"
    height: 1px
  divider-dark-strong:
    backgroundColor: "{colors.dark-border-strong}"
    height: 1px
---

# LocalKarar Design System v3 — Warm Petrol

## Overview

**Creative North Star: “The Calm Operating Desk.”**

LocalKarar combines daily business control, decision support and learning. It should feel like a composed expert workspace: operational enough for dense records, warm enough for long-term trust, and calm enough for consequential decisions. The approved direction is **Premium Operational + Apple Calm Depth**. Premium quality is expressed through hierarchy, surface relationships, exact typography and responsive feedback rather than oversized cards, glossy effects or decorative luxury cues.

The system is unified but not identical. All pages use the same shell, tokens and primitive behavior, while their composition follows their job: Dashboard is a workbench, Course Player is a focus stage, Decision Receipt is an artifact, Finance is a ledger, Model Workspace is an instrument, Mentor is a conversation and News is an editorial stream. This replaces v2’s over-normalization without permitting visual drift.

**Key characteristics:**

- Warm Petrol identity on warm light neutrals and charcoal-petrol dark surfaces.
- Compact-balanced density with clear depth and real first-viewport work.
- One dominant action and at most one signature surface per task context.
- Shared primitives plus domain component families.
- Calm, immediate, origin-aware feedback; no decorative motion dependency.

## Colors

Warm Petrol is a role-based system. Exact frontmatter tokens are normative; the descriptions below explain use.

- **Primary Petrol (`#1F6673`):** Primary action, active navigation, progress, selected control and brand focus.
- **Deep Petrol (`#183E45`):** Pressed state, high-contrast brand field and the rare light-mode signature panel.
- **Petrol Hover (`#275A63`):** Controlled interaction darkening; it never becomes a new hue.
- **Soft Petrol (`#9FBFC2`):** Low-emphasis brand edge and readable dark-mode brand text.
- **Warm Canvas (`#F2EFEA`):** Light page background. Pure white is reserved for elevated surfaces.
- **Ivory Surface (`#FAF8F4`) and Elevated Ivory (`#FFFDF9`):** Section and raised layers.
- **Charcoal Petrol (`#141A1B`) and Dark Surface (`#1C2425`):** Dark canvas and standard panel; dark mode is not saturated blue.
- **Warm Accent (`#C98245`):** Rare recommendation or attention cue, never an alternative primary CTA.
- **Sand Accent (`#D8C3A5`):** Quiet material warmth and receipt/editorial cues.
- **Success (`#3C8661`):** Verified positive meaning only. Green is not decoration.

**The Semantic Color Law.** Petrol is brand and interaction; green is success; warm orange is rare attention; Sand is material. Error and warning use dedicated accessible semantic tokens in implementation. Status must include text or icon, not color alone.

**The Dark Mode Law.** Preserve warm charcoal depth, off-white text and solid Petrol actions. Never introduce cyan/electric blue primary states, blue glow fields or bright teal typography.

## Typography

The single family is **Manrope**, followed by the system sans-serif stack. It is clear and contemporary without making each domain feel like a different product. Hierarchy comes from optical scale, weight, tracking and leading.

- **Display:** 48px/700/1.08; rare onboarding or narrative moment, never routine app-page decoration.
- **Page title:** 28px/700/1.2; one route identity per page. Mobile adapts to 24px.
- **Section title:** 20px/650/1.3; major content group.
- **Domain title:** 16px/650/1.35; course, model, decision, record or card title.
- **Body large:** 16px/400/1.7; lessons and long reading, approximately 65–72 characters per line.
- **Body:** 14px/400/1.55; default operational text.
- **Body small:** 13px/450/1.45; dense tables and supporting UI, not fine print.
- **Label:** 12px/650/1.35; compact metadata and controls, sentence case by default.
- **Metric:** 28px or 18px/700; numeric hierarchy, using tabular numerals where supported.

Large type tightens tracking slightly; body remains near zero; small labels may open slightly. Do not mix decorative serif words, all-caps navigation or tiny text to simulate density.

## Layout

The shell uses a `256px` desktop sidebar, `64px` collapsed rail and `52px` header. Desktop content is based on 12 columns with a practical `1180px` content maximum; tablet uses 8 columns and mobile 4. Desktop page padding is 24px and mobile padding is 16px. The spacing system is based on 4px with purposeful 8/12/16/24/32/40/48/64 steps.

Standard controls are 40px high, large composer or singular hero controls 48px, and dense rows 44px. Standard contained padding is 16px, dense padding 12px and signature padding 24px. Section rhythm is normally 24–32px and may reach 40–48px for long-form learning transitions.

**Unified != identical.** Layout primitives are shared, but page anatomy varies by purpose. Use workbenches, ledgers, stages, split panes, guided steps, artifacts, timelines and editorial streams. A shared 3-column card grid is not a batch system.

**Responsive priority law.** Mobile adapts information priority rather than merely stacking desktop columns. The first viewport should contain route context, the primary control and the first real content. Context rails become drawers/sheets; data tables become prioritized record rows only when necessary.

## Elevation & Depth

Depth follows **tonal layer → edge → restrained shadow → allowed translucency**. Page canvas, section field, raised object, signature artifact and overlay form a readable stack. Ordinary section groups are shadowless. A resting card uses a quiet edge or low ambient shadow; overlays use the strongest shadow. Shadows are tinted toward Petrol/charcoal rather than pure black.

Translucency is limited to floating header chrome, mobile drawers, modals, popovers, command/search overlays and Mentor overlay surfaces. It requires a solid fallback under reduced transparency. Normal cards, tables, forms and dashboard widgets are opaque.

Controlled gradients may appear only in a signature panel, finance/decision artifact or onboarding surface and must stay within adjacent Warm Petrol/surface tones. Static fine grain or paper texture may appear at near-imperceptible strength when it improves material meaning. No generic mesh, glow blob, neon outer glow, animated sheen or perpetual sweep.

## Shapes

The shape language is calm and engineered: soft enough to feel approachable, structured enough for dense operation.

- **6px:** badges and compact status/code objects.
- **8px:** buttons, fields, interactive rows and tooltips.
- **12px:** standard cards and contained panels.
- **16px:** the singular signature surface or major artifact.
- **Full:** avatar, deliberate status pill and search field only.

This is a documented hierarchy, not random radius mixing. Do not round every panel to 16–24px. Borders remain quiet and support tonal layers rather than drawing a box around every group.

## Components

### Shared primitives

Buttons, icon buttons, fields, select/search, tabs, badges, tooltips, popovers, modal, drawer, list/data row, progress, skeleton, empty/error states, toast, metric and shell chrome share the token and state contracts.

- **Buttons:** One solid Petrol primary per task context. Secondary is neutral raised/outlined; ghost is inline utility; danger is semantic and isolated. Press feedback is immediate and subtle.
- **Fields:** Sunken surface, 8px radius, 40px height, visible label and a 2px Petrol focus ring with offset. Error/disabled states change more than opacity.
- **Lists and tables:** Use spacing, alignment and dividers instead of outer cards. Rows are 44px minimum and selected state uses a low-opacity Petrol field.
- **Cards:** Exist only for independently meaningful containment or movement. Standard cards use 12px radius/16px padding; signature surfaces use 16px/24px. Avoid nested raised cards.
- **Navigation:** Active and recommended are distinct. Active uses Petrol; recommended uses rare Warm Accent. Collapsed navigation has tooltips.

### Domain component families

- **Operational:** KPI strip, status ledger, alert line, task group.
- **Learning:** course tile, progress spine, lesson rail, learning stage, transcript/notes.
- **Decision:** tool row, guided question, evidence block, confidence meter, decision receipt.
- **Finance:** metric ledger, assumption editor, scenario band, result narrative, chart/table pair.
- **Model Lab:** model row, parameter rail, workspace canvas, output inspector, version history.
- **Mentor:** conversation stream, evidence capsule, suggestion rail, composer.
- **Business Tracking:** record table/list, status timeline, document row, summary strip.
- **Editorial/Social:** lead story, story row, topic rail, community post, save action.

Domain families alter anatomy and density, not the base palette, typography, radius or shadow language. This is how page personality survives tokenization.

### Motion behavior

Motion is a specification, not a dependency requirement. Hover/focus feedback is 120–160ms, content/state transitions 180–240ms and modal/drawer transitions 260–340ms. Popovers originate from triggers; modals originate from center; reversible elements return along the same path. Use no-bounce, critically damped behavior for normal UI and allow momentum only after a physical drag/flick. Reduced motion replaces travel and springs with short cross-fades.

## Do's and Don'ts

### Do

- **Do** map Warm Petrol by semantic role in both light and dark modes.
- **Do** keep one dominant CTA and at most one signature surface per task context.
- **Do** use tonal depth, grouped rows, rails, ledgers and stages before reaching for a card.
- **Do** give Dashboard, learning, decisions, finance, models, Mentor, editorial and admin surfaces distinct anatomies using the same system.
- **Do** preserve real data, empty/loading/error states, keyboard wayfinding, 44px touch targets and WCAG AA contrast.
- **Do** make compact pages dense through rhythm and alignment, not smaller type.

### Don't

- **Don't** create a generic admin dashboard or a card-everything interface.
- **Don't** use pure white as the full-page light canvas or pure black as the dark canvas.
- **Don't** introduce saturated blue/cyan dark mode, purple AI gradients, neon glows or unrelated hues.
- **Don't** use green decoratively or style every CTA as primary.
- **Don't** repeat route title/date in both header and page intro.
- **Don't** use glass on standard cards/tables/forms, large decorative radii, perpetual sweeps or 500ms+ routine interactions.
- **Don't** let a page invent its own palette, type scale, radius, shadow or navigation language.
