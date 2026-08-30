# LocalKarar TR/EN i18n Report

Date: 2026-08-26  
Branch: `design/localkarar-18`  
Source language: Turkish (`tr`)  
Target language: English (`en`)

## Outcome

LocalKarar now has a production-buildable `i18next`/`react-i18next` foundation with bundled namespace catalogs, Turkish default/fallback behavior, persistent per-user interface language, independent formatting locale, central number/date/currency formatters, and language-aware AI Mentor prompt routing.

The live switch is under Settings → Interface language. It changes the current page without changing the route, workspace, filters, session, date/number locale, or currency. The preference is saved through `PATCH /auth/preferences` and returned by login and `/auth/me`.

## Migrated surfaces

- Global sidebar and principal header route titles/search states
- Authentication entry screen
- Home / dashboard primary shell, actions, KPI labels, and priorities
- Business Tracking navigation and primary Orders/Products states, filters, tables, and details
- Marketplace integration card actions and common states
- Settings page shell, section navigation, interface-language and formatting-locale controls
- AI Mentor page/panel/composer shell and language-aware formatting
- Course/player Turkish-content availability notice when English UI is active
- Marketplace action titles are rendered from structured `type` + `count`; backend Turkish prose remains backward-compatible fallback data

Course content and legal documents were not translated. No legal source content was changed for this work. Their English UI surfaces explicitly state “Content available in Turkish.”

## Architecture

- Catalogs: `frontend/src/i18n/locales/{tr,en}`
- Namespaces: `common`, `dashboard`, `workspace`, `integrations`, `auth`, `mentor`
- User preference: `UserPreference.uiLanguage`, constrained to `tr|en`
- Formatting preference: existing `BusinessSetting.locale`; intentionally independent
- Runtime external translation calls: **0**
- Locale route prefixes: **0**
- Currency inference from UI language: **0**; formatters require/use record or workspace currency
- AI Mentor: `responseLanguage` is added to the system prompt while deterministic calculation and source/citation rules remain unchanged

## Quality gates

| Gate | Result |
|---|---:|
| `npm run i18n:check` | PASS — 6 namespaces, 209 aligned keys, placeholders valid |
| Backend TypeScript build | PASS |
| Frontend Vite production build | PASS |
| Backend full tests | PASS — 136 files, 2012 tests; added preference persistence test also PASS (5/5 target file) |
| Frontend full tests | PASS — 54 files, 388 tests |
| Migration validation | PASS — 38 migrations, reset/deploy/seed idempotency |
| Secret scan | PASS with 159 pre-existing/allowlisted review warnings; no new runtime secret path |

The first frontend full run exposed legacy tests that rendered localized components without the application provider. A safe Turkish fallback and global test initialization restored backward compatibility; the affected subset then passed 68/68 and the full suite passed 388/388.

## Hardcoded-copy audit

A conservative `rg` scan across the requested high-priority source files found **701 candidate source lines** containing Turkish characters or common Turkish UI terms. This is deliberately an upper bound: it includes comments, test-preserving legacy labels, catalog/provider data, unreachable legacy JSX in Overview, and Turkish-only course/legal copy. It also confirms that long-tail English coverage is not yet complete, especially Records/Tracker detail workflows, secondary Settings forms, header search result groups, and detailed Overview prose.

Therefore this delivery establishes and validates the i18n platform and migrates the primary shell paths, but it does not claim that every existing user-visible literal is translated.

## Translation operations

- Glossary: `docs/LOCALIZATION_GLOSSARY.md`
- Workflow: `docs/LOCALIZATION_WORKFLOW.md`
- JSON namespaces are suitable for vendor/TMS import-export and translation-memory reuse.
- AI translation is draft-only. Product review is required; financial/legal/privacy/security wording requires manual specialist review.

## Final matrix

- TR UI READY: **YES**
- EN UI READY: **NOT READY** — primary shell is usable; long-tail Phase 1 literals remain
- AI Mentor Language Routing: **READY**
- Hardcoded UI Strings Remaining: **701 static-audit candidate lines (upper bound)**
- Missing Key Check: **PASS**
- Placeholder Check: **PASS**
- Runtime External Translation Call: **0**
- Legal/Course Content Translated: **NO** (intentionally deferred)
- TR/EN I18N READY: **NO** — foundation is ready, complete English copy migration is not

## Deferred next pass

1. Finish Records/Tracker forms, dialogs, types, statuses, and validation copy.
2. Finish Overview activity/status prose and relative-time strings.
3. Finish secondary Settings forms and notification/security/privacy copy.
4. Finish Header result-group labels and secondary app shells.
5. Replace the conservative text scan with an AST-based user-visible literal gate, then drive the remaining count to zero except explicitly allowlisted Turkish-only content.

## 2026-08-26 final-audit continuation checkpoint

This checkpoint supersedes the stale gate counts above but is not a final release sign-off.

- Dashboard / Overview wiring: **COMPLETE after fixes** (translation-function shadowing, missing activity translator argument, locale-bypassing dates/casing, and duplicate `status` JSON key corrected)
- Batch 2B — Records/Tracker, Documents, Activity: **COMPLETE**
- Batch 2C — Orders, Products, Notifications: **COMPLETE**
- Batch 2D — Calendar, Team, Contacts: **COMPLETE**
- Batch 2E — remaining Workspace/core: **IN PROGRESS** (`WorkspaceLayout` complete; Settings messaging complete; detailed Settings UI and `KayitDetay.jsx` remain)
- Current i18n parity: **PASS — 10 namespaces, 2647 aligned keys, placeholders valid**
- Current frontend tests: **PASS — 54 files, 388 tests**
- Current TypeScript check: **PASS**
- Current Vite production build: **PASS**
- Workspace Turkish-character candidate lines: **198** (upper bound; still includes comments and intentional/user content)
- Literal `tr-TR` usages in frontend source: **92 candidates; classification pending**
- Browser QA and AI Mentor persistence/default verification: **PENDING**

Current release verdict: **TR UI NOT YET RE-AUDITED / EN UI NOT READY / FULL TR-EN UI READY: NO**.

## 2026-08-28 Phase 2 completion audit

This section supersedes the earlier Phase 2 and hardcoded-copy figures above.

### Completed tiers

| Tier | Scope | Files | Initially measured UI strings | Result |
|---|---|---:|---:|---|
| T1 | shared layout, navigation, calculation catalog, UI primitives | 21 | ~152 | COMPLETE |
| T2 | Settings, integrations, shared errors and warnings | 6 | ~158 | COMPLETE |
| T3 | authentication, password reset, invitation, onboarding | 5 | ~104 | COMPLETE |
| T4 | learning, tools, mentor, community, workspace secondary surfaces | 20 | ~373 | COMPLETE |
| T5 | Support, About, legal shell, public/error surfaces | 7 | ~138 | COMPLETE |

The measured list contained overlaps and estimates; the source-of-truth release gate is the static source-key audit. It reports zero unresolved source keys. The final targeted hardcoded-copy review found **0 live user-visible Turkish UI literals in the Phase 2 scope**.

### Catalog and source integrity

- Catalog size: **2909 → 3761 aligned keys** (**+852** per language catalog).
- Missing/extra keys: **0**.
- Empty translations: **0** (enforced by the guard).
- Placeholder mismatches: **0**.
- Unresolved static source keys: **0**.
- Dynamic-key warnings: **88**, reviewed as map/label-key lookups; not unresolved keys.
- `admin.imports.stats.duplicate`: corrected to **“Yinelenen”** in Turkish.
- i18next JSON v4 plural pairs were preserved; no flat replacement keys were introduced.

### Intentional Turkish or locale literals

These are not UI localization failures:

- Turkish legal-document bodies and course/user/provider content.
- Backend/API enum and content matchers (`calculationCatalog.matchTitle`, Dashboard priority aliases, mentor disclaimer matching, import CSV aliases, password character regexes).
- Pilot learning-path category names used as backend-content lookup keys.
- `VideoPlayer` WebVTT track label `Türkçe`.
- `tr-TR` in supported-locale lists, persisted-setting defaults, and Turkish collation selected when the UI language is Turkish.
- Feature-flagged legacy quiz/flashcard/practical-card screens and the unrouted legacy `DecisionToolsPage` artifact.

All live date/number/currency displays found during this pass now use the persisted format locale through `LocalizationContext` or the central formatter helper. **User-locale-bypassing `tr-TR` usages: 0.**

### Verification

| Gate | Result |
|---|---|
| i18n guard | **PASS — 10 namespaces, 3761 aligned keys, placeholders valid, source keys resolved** |
| Frontend TypeScript | **PASS** |
| Frontend tests | **PASS — 54/54 files, 388/388 tests** |
| Vite production build | **PASS — 2392 modules, 11.43s** |
| TR→EN / EN→TR runtime switch test | **PASS** |
| UI language persistence API test | **PASS** |
| Format independence test | **PASS** |
| AI Mentor language routing | **PASS by code/test inspection: persisted `uiLanguage` is read for `responseLanguage`; `en` and `tr` defaults are explicit** |
| Manual browser viewport QA (375/390/1440) | **PARTIAL — public `/fiyatlar` passed all three widths; authenticated route matrix not run** |

The first full test run produced two load-related 5-second timeouts and exposed one real regression: `LegalModal` still referenced the removed `baslik` field after document titles moved to `baslikKey`. The modal now translates `baslikKey`; the three focused tests passed 23/23, then the complete suite passed 388/388 with a 15-second per-test ceiling.

### Final matrix

- TR UI: **READY by static and automated gates**
- EN UI: **READY by static and automated gates**
- Remaining hardcoded Turkish UI strings (Phase 2 live scope): **0**
- Intentional Turkish content: **legal/course/user/provider content, backend matchers/contracts, WebVTT label, disabled legacy surfaces**
- User-locale-bypassing `tr-TR`: **0**
- Intentional/default `tr-TR`: **17 source occurrences**, limited to supported options/defaults and UI-language collation
- TR→EN switch: **PASS (automated)**
- EN→TR switch: **PASS (automated)**
- Preference persistence: **PASS**
- Format independence: **PASS**
- AI Mentor language default: **PASS by implementation and existing tests**
- 375px / 390px / 1440px: **PASS for public `/fiyatlar`, `/login`, and ConsentBanner** (rendered content, no Vite overlay/console errors, `scrollWidth === clientWidth`); authenticated route matrix **NOT RUN — the browser session redirects `/app/settings` to `/login`**
- i18n parity: **PASS**
- tests: **PASS — 388/388**
- build: **PASS**
- FULL TR/EN UI READY: **NO — authenticated TR/EN browser matrix remains outstanding**

No git commit or push was performed.
