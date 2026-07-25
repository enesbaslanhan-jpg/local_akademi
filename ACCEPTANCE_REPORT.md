# LocalAkademi AI Mentor 2.0 — Sprint 1 Acceptance Report

**Date:** 2026-07-19  
**Tester:** Codex AI  
**Environment:** Local SQLite, Vitest, Ollama simulated

---

## Summary

| Area                  | Status | Notes |
|-----------------------|--------|-------|
| Conversation CRUD     | PASS   | Create, list, get, update, soft delete all work |
| Ownership enforcement | PASS   | Cross-user access tested (404), list filtered per user |
| Message submission    | PASS   | User + assistant messages created; role='user' verified |
| AI fallback           | PASS   | Auto mode restricted to ollama → nvidia (deepseek/openai removed) |
| AI failure handling   | PASS   | All providers fail → returns error message (not crash) |
| Title auto-generation | PASS   | First message triggers title update |
| Input validation      | PASS   | Title length (max 120), message length (max 8000), empty checks |
| ID validation         | PASS   | Non-numeric ID returns 400 with VALIDATION_ERROR code |
| Archive filter        | PASS   | archivedAt != null excluded from list |
| Soft delete           | PASS   | deletedAt set; excluded from list; 204 returned |
| TypeScript compile    | PASS   | Zero errors |
| Test count            | PASS   | 18 tests, 18 passed |

---

## Detailed Results

### 1. Conversation CRUD
- `POST /` — creates with default title 'Yeni Sohbet' or custom title
- `GET /` — lists user's non-deleted, non-archived conversations with last message preview
- `GET /:id` — returns conversation + parsed messages
- `PATCH /:id` — title update with max 120 char validation
- `DELETE /:id` — soft delete (sets `deletedAt`)

### 2. Security / Ownership
- `ensureOwnership` protects every conversation-scoped route
- Other user gets 404 (not 403 — no information leak)
- Other user's conversations never appear in list

### 3. Message Flow
- User message created with `role: 'user'`
- AI response stored with `role: 'assistant'`
- Context window limited to last 6 messages
- Clarification detection triggers rule-based response (no AI call)

### 4. AI Provider (ai-provider.ts)
- **Auto mode** now only tries ollama → nvidia (deepseek and openai configs retained for explicit selection)
- Explicit mode (`ollama`, `nvidia`, `deepseek`, `openai`) unchanged
- Error caught per-provider; chain continues on failure
- All providers fail → user-facing error message (not raw error)

### 5. Input Validation
- Title: empty allowed (defaults to 'Yeni Sohbet'), max 120 → 422
- Message: empty → 422, max 8000 → 422
- Invalid conversation ID (non-numeric) → 400 + `VALIDATION_ERROR` code
- All validation errors return `{ error: { code, message } }` structure

### 6. Code Quality
- Unused import `FastifyRequest` removed from `mentor.ts`
- Unused `isValidRole` / `VALID_ROLES` removed from `conversation.ts`
- Type imports moved to top of file
- `safeJsonParse` / `safeJsonStringify` helpers added
- `parseId` helper for consistent ID parsing
- `Record<string, unknown>` for dynamic update data (type safety)

### 7. Database
- `updatedAt` on `ConversationMessage` is `DateTime?` (nullable) — matches actual SQLite schema
- `archivedAt` field present and used in list filter
- Foreign key with CASCADE delete preserved

---

## Issues Found & Fixed

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `ai-provider.ts` auto fallback included deepseek/openai | Medium | Removed from auto chain; kept for explicit selection |
| 2 | `isValidRole` defined but never called | Low | Removed function and type |
| 3 | Type imports at line 30 instead of top | Low | Moved to top |
| 4 | `FastifyRequest` unused import in mentor.ts | Low | Removed |
| 5 | No input validation on title/message length | Medium | Added max 120/8000 with 422 response |
| 6 | No ID format validation | Medium | Added `parseId` with 400 response |
| 7 | No `archivedAt` filter in conversation list | Low | Added `archivedAt: null` to where clause |
| 8 | Error format inconsistent | Medium | Standardized to `{ error: { code, message } }` |
| 9 | AI failure returned raw error to client | Medium | Returns user-facing message |
| 10 | `updatedAt` inconsistency in migration SQL | Info | DB has `DateTime?`; schema matches. No action needed |

---

## Final Verdict

**SPRINT 1 — PASSED (18/18 tests)**

All acceptance criteria for conversation-based chat are met. The system supports:
- Full CRUD with ownership enforcement
- Message exchange with AI (with working fallback chain Ollama → NVIDIA)
- Graceful error handling when all providers fail
- Input validation at all entry points
- Soft delete with data isolation
