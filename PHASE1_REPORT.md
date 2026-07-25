# Phase 1 Complete Report – Knowledge Engine Hardening

**Date:** 2026-07-16
**Branch:** knowledge-engine-hardening
**Version:** v1.0.0 → v1.1.0 (Phase 1)

---

## Schema Diff

### KnowledgeObject – Before vs After

| Field | Before | After |
|-------|--------|-------|
| id (Int PK) | ✅ | ✅ unchanged |
| type | ✅ | ✅ unchanged |
| title | ✅ | ✅ unchanged |
| content | ✅ | ✅ unchanged |
| embedding | ✅ | ✅ unchanged |
| metadata | ✅ | ✅ unchanged |
| createdAt | ✅ | ✅ unchanged |
| updatedAt | ✅ | ✅ unchanged |
| **code** | ❌ | ✅ String? @unique |
| **slug** | ❌ | ✅ String? @unique |
| **status** | ❌ | ✅ String @default("draft") |
| **verificationStatus** | ❌ | ✅ String @default("unverified") |
| **reviewGate** | ❌ | ✅ String @default("standard") |
| **isDemo** | ❌ | ✅ Boolean @default(false) |
| **publishedAt** | ❌ | ✅ DateTime? |
| **archivedAt** | ❌ | ✅ DateTime? |
| **reviewDue** | ❌ | ✅ DateTime? |

**9 new fields added. No fields removed.**

---

## Migration Files

| File | Path |
|------|------|
| Manual SQL migration | `prisma/migrations/knowledge_object_hardening_phase1/migration.sql` |
| Applied with | `npx prisma db push` |
| Reason for manual | `prisma migrate dev` requires interactive TTY (not available) |

---

## Data Transformation Script

| File | Path |
|------|------|
| Script | `prisma/demo-mark.ts` |
| Result | 600 KOs updated |
| Idempotency | ✅ Safe to re-run (checks before update) |
| Collision check | ✅ No code/slug collisions |

### Transformed Values

| Field | Value |
|-------|-------|
| isDemo | `true` |
| code | `DEMO-{id}` (e.g. DEMO-1, DEMO-42, DEMO-600) |
| slug | `{slugified-title}-{id}` |
| status | `published` |
| verificationStatus | `demo_unverified` |
| reviewGate | `demo_only` |

---

## Test Results (7/7 PASSED)

| # | Test | Result |
|---|------|--------|
| 1 | Total KO count = 600 | ✅ 600 |
| 2 | All isDemo = true | ✅ 600/600 |
| 3 | All codes non-null + unique | ✅ 600/600 |
| 4 | All slugs non-null + unique | ✅ 600/600 |
| 5 | Listing (demo filter) | ✅ 5 results |
| 6 | Search (keyword) | ✅ 10 results |
| 7 | Other tables unaffected | ✅ Courses=3, Lessons=33, Sessions=3 |

---

## Files Changed

| File | Change |
|------|--------|
| `schema.prisma` | KnowledgeObject model: 9 new fields |
| `prisma/migrations/knowledge_object_hardening_phase1/migration.sql` | NEW |
| `prisma/demo-mark.ts` | NEW (idempotent transformation) |
| `prisma/phase1-tests.ts` | NEW (7 tests) |
| `MIGRATION_PLAN.md` | Updated |
| `CURRENT_SCHEMA_AUDIT.md` | Created |
| `CHANGELOG.md` | Created |
| `BACKUP_dev.db` | Pre-migration backup preserved |

---

## Rollback Status

Rollback NOT needed. All 7 tests passed.

If rollback required:
```
copy /y BACKUP_dev.db dev.db
npx prisma db push
```

---

## Phase 2 Prerequisites

- [ ] Category model
- [ ] KnowledgeObjectVersion model
- [ ] Source model  
- [ ] KnowledgeObjectSource (M:N bridge)
- [ ] ReviewRecord model
- [ ] Quiz master + QuizQuestion
- [ ] TaskTemplate model
- [ ] Formula master model
- [ ] PublicationEvent model
- [ ] ImportJob + ImportJobError models

**Phase 2 NOT started yet. Awaiting authorization.**