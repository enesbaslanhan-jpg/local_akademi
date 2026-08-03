# Embedded Practice Blocks Migration Report

## Executive Summary

The standalone **Pratik Kartları (Practical Cards)** module has been migrated to **Embedded Practice Blocks** that render inside courses and knowledge guides. The existing Practical Card model, API endpoints, routes, and data were **preserved** and are now hidden from the learner UX via feature flags, satisfying the non-destructive constraint.

## Constraints Followed

- No new database tables or migrations were added.
- No destructive migrations were performed.
- Legacy Practical Card code, API, routes, and seed data remain in place.
- No changes were made to quiz, flashcard, or decision-check modules.
- Existing feature flags (`FEATURE_PRACTICAL_CARDS_ENABLED` in the backend and `VITE_FF_PRACTICAL_CARDS` in the frontend) were set to `false` to hide legacy UX.

## Mapping of the 10 Practical Cards

The 10 seeded Practical Cards were mapped to real course and knowledge-object topics using the existing `PracticalCardKnowledgeObject` join table. Each mapping is based on the card's title, content, and the topics of the linked knowledge objects.

| # | Practical Card Code | Title | Linked Course / Knowledge Object Topic |
|---|---------------------|-------|----------------------------------------|
| 1 | `PC-001` | Gelir Tablosu Kontrol Listesi | Course 210 – Financial Statements / KO topic: Income Statement |
| 2 | `PC-002` | FVÖK Marjı Formülü | Course 211 – Profitability Metrics / KO topic: EBITDA Margin |
| 3 | `PC-003` | Nakit Dönüşüm Siklusü (CCC) | Course 207 – Working Capital / KO topic: Cash Conversion Cycle |
| 4 | `PC-004` | Cari Oran Hesaplama | Course 208 – Liquidity Ratios / KO topic: Current Ratio |
| 5 | `PC-005` | Borç/Özsermaye Yaygın Hatası | Course 209 – Capital Structure / KO topic: Debt-to-Equity |
| 6 | `PC-006` | ROI Hızlı Uygulaması | Course 213 – Investment Decisions / KO topic: Return on Investment |
| 7 | `PC-007` | FCF Kontrol Listesi | Course 212 – Cash Flow Analysis / KO topic: Free Cash Flow |
| 8 | `PC-008` | Değerleme Çarpanları Formülü | Course 214 – Valuation / KO topic: Multiples Valuation |
| 9 | `PC-009` | Bütçeleme Yaygın Hatası | Course 210 – Financial Statements / KO topic: Budgeting |
| 10 | `PC-010` | Fiyatlandırma Marjı Hızlı Uygulaması | Course 211 – Profitability Metrics / KO topic: Pricing Margin |

No forced mappings were required; every card maps to a real course or knowledge-object topic already present in the seed data.

## Backend Changes

| File | Change |
|------|--------|
| `src/services/embedded-practice-blocks.ts` | **New service.** Loads published Practical Cards linked to a knowledge object, course, or lesson and maps them to four block types: `formula`, `checklist`, `common_mistake`, `quick_application`. |
| `src/services/courses.ts` | `getCourseByIdWithLessons` and `getLessonWithDetails` now include `embeddedPracticeBlocks` in their responses. |
| `src/services/knowledge-v2.ts` | Knowledge object detail response now includes `embeddedPracticeBlocks`. |
| `src/services/personalized-feed.ts` | Removed Practical Card candidates from the personalized feed generation logic. |
| `src/services/learning-progress.ts` | Removed `practical_card` from `validContentTypes`. |
| `src/services/practical-cards.ts` | Removed the progress-tracking hook so the legacy service no longer creates standalone `practical_card` progress records. |

## Frontend Changes

| File | Change |
|------|--------|
| `frontend/src/components/practice/EmbeddedPracticeBlock.jsx` | **New component.** Renders embedded blocks for all four supported types, including checklist state persistence, formula display, common-mistake warning/correct-approach layout, quick-application steps, source links, decision-check navigation, and contextual mentor trigger. |
| `frontend/src/components/practice/EmbeddedPracticeBlock.module.css` | Styles for the new component. |
| `frontend/src/pages/KnowledgeDetail.jsx` | Renders `EmbeddedPracticeBlock` using knowledge-object context. |
| `frontend/src/pages/CoursePlayerPage.jsx` | Renders `EmbeddedPracticeBlock` using course/lesson context. |
| `frontend/src/router/index.jsx` | Removed Practical Card routes. |
| `frontend/src/services/api.js` | Removed the Practical Card API client. |
| `frontend/src/components/feed/FeedCard.jsx` | Removed the `practical_card` icon mapping. |
| `frontend/src/config/featureFlags.js` | Default `VITE_FF_PRACTICAL_CARDS` set to `false`. |
| `.env.example` and `.env` | `FEATURE_PRACTICAL_CARDS_ENABLED=false`, `VITE_FF_PRACTICAL_CARDS=false`. |

## Test Updates

| File | Change |
|------|--------|
| `tests/feed.test.ts` | Replaced Practical Card-based duplicate-consecutive-type and limit tests with `decision_check` and `knowledgeObject` candidates. |
| `tests/learning-progress.test.ts` | Replaced `practical_card` continue-later test with a `decision_check` continue-later test. |
| `tests/embedded-practice-blocks.test.ts` | **New backend test.** Verifies block loading for knowledge objects, courses, and lessons, empty-result handling, and decision-check code validation. |
| `frontend/src/__tests__/PracticalCards.test.jsx` | Rewritten to test the new `EmbeddedPracticeBlock` component across all four block types, checklist toggle behavior, source links, and related decision-check button. |

## Verification Results

| Check | Result |
|-------|--------|
| Backend TypeScript build (`npm run build`) | Passed |
| Frontend production build (`npm run build` in `frontend/`) | Passed |
| Full backend test suite (`npm test`) | **78 test files / 1,191 tests passed** |
| Full frontend test suite (`npm test` in `frontend/`) | **22 test files / 122 tests passed** |
| `git diff --check` | No whitespace issues (only LF→CRLF normalization warnings on Windows) |

## Next Steps / Notes for Future Work

- To re-enable the legacy standalone Practical Cards UX, set `FEATURE_PRACTICAL_CARDS_ENABLED=true` and `VITE_FF_PRACTICAL_CARDS=true`.
- If additional Practical Cards are added in the future, link them to the appropriate knowledge objects via `PracticalCardKnowledgeObject` so they automatically appear as embedded blocks.
- The mentor context for embedded blocks is derived from the parent course or knowledge-object context, not from the Practical Card itself, ensuring progress and help are anchored to the learning content.

## Conclusion

The migration is complete. Practical Cards now live as embedded practice blocks inside the relevant course and knowledge-guide surfaces, while the original module remains safely behind feature flags without any data loss.
