# Localization Workflow

## Runtime model

The UI uses bundled `i18next`/`react-i18next` JSON resources. Runtime translation never calls an external service. Turkish is the default and fallback language. Interface language (`uiLanguage`) is stored per user and is independent from `BusinessSetting.locale`, which controls date, number, and currency formatting.

Locale-prefixed routes are not used. Language changes update the current screen in place and preserve route, workspace, filters, and session state.

## Adding or changing copy

1. Add the Turkish source key to the appropriate namespace under `frontend/src/i18n/locales/tr`.
2. Add the reviewed English target with the identical key and interpolation placeholders under `frontend/src/i18n/locales/en`.
3. Use `useTranslation(namespace)` in components. Prefer structured backend codes/types to translating server prose.
4. Use central formatters with explicit locale and currency. UI language must never select currency.
5. Run `npm run i18n:check`, frontend tests, and the production build.

The checker is CI-friendly and fails for missing or extra keys, empty values, invalid JSON, namespace drift, and placeholder mismatch.

## Review and exchange

JSON namespaces are the import/export unit for vendors or a future translation-management system. Stable keys allow translation-memory reuse. Machine or AI translation may produce drafts, but product copy requires product review. Financial, tax, privacy, legal, consent, and security language always requires manual specialist review.

Course bodies and legal documents are outside phase one. English UI shows “Content available in Turkish” on those surfaces. Publication remains a separate reviewed workflow.
