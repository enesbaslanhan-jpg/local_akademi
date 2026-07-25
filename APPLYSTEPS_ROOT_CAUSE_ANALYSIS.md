# applySteps E2E Failure — Root Cause Analysis

## Executive Summary

27 e2e tests fail because the `applySteps` column (and 7 sibling structured-content columns) defined in `prisma/schema.prisma` for the `KnowledgeObject` model were never added to any migration. When `prisma migrate deploy` creates a test database, the resulting table lacks these columns, causing Prisma Client (generated from the drifted schema) to throw `P2022` on any query touching the `KnowledgeObject` table.

**Final Verdict: MISSING MIGRATION**

## Failure Evidence

| Source | Count | Error Pattern |
|--------|-------|---------------|
| E2E test file | 27 failures | `P2022: The column 'applySteps' does not exist in the current database` |
| First failing call | `tests/e2e/e2e.test.ts:424` — `ctx.prisma.knowledgeObject.create()` | |
| Non-e2e tests | 0 failures (they use mocked/injected Prisma or separate databases) | |

All 27 failures involve the `KnowledgeObject` table. Both `create()` and `findMany()` operations are affected — any query that Prisma Client routes to this table triggers `P2022` because the client's column list (from the full schema) does not match the actual table.

## Schema Definition

`prisma/schema.prisma` lines 322–363 define `KnowledgeObject` with **27 scalar columns**:

```
id, code, slug, type, title, content, embedding, metadata,
status, verificationStatus, reviewGate, isDemo,
publishedAt, archivedAt, reviewDue,
categoryId, currentVersionId,
createdAt, updatedAt,
applySteps, learnSteps, problem, quickAnswer, seeAlso,
summary, task, warning
```

The last 8 fields — `applySteps` through `warning` — are the **structured content fields** added to the model definition **without a corresponding migration**.

## Migration History

All 23 migration files in `prisma/migrations/` were examined. Only 3 migrations touch the `KnowledgeObject` table:

| Migration | Columns Added |
|-----------|---------------|
| `20260716000000_initial_core_schema` | `id, type, title, content, embedding, metadata, createdAt, updatedAt` |
| `20260716210000_knowledge_object_hardening_phase1` | `code, slug, status, verificationStatus, reviewGate, isDemo, publishedAt, archivedAt, reviewDue` |
| `20260717090000_knowledge_object_hardening_phase2` | `categoryId, currentVersionId` |

**No migration file** contains any ALTER TABLE or column definition for any of these 8 fields:
`applySteps`, `learnSteps`, `problem`, `quickAnswer`, `seeAlso`, `summary`, `task`, `warning`

A targeted search with `Select-String -SimpleMatch` across all `migration.sql` files confirms zero hits for any of these 8 column names.

## Test Database Initialization

The test lifecycle (in `tests/e2e/helpers.ts`) works as follows:

1. `createFullTestContext()` creates a **temporary directory** inside `prisma/`
2. A **fresh SQLite file** (`test.db`) is created at a path like `prisma/e2e-test-XXXX/test.db`
3. `applyMigrations(dbUrl)` runs **`npx prisma migrate deploy`** against this fresh database
4. This applies all 23 migration files in order to the empty SQLite file
5. A new `PrismaClient` is then connected to this database

Because the migration files don't include the structured content columns, the resulting `KnowledgeObject` table has only **19 columns** — the 8 content fields are absent.

## Root Cause

**MISSING MIGRATION** — The 8 structured content fields (`applySteps`, `learnSteps`, `problem`, `quickAnswer`, `seeAlso`, `summary`, `task`, `warning`) were added directly to `prisma/schema.prisma` without running `prisma migrate dev` (or equivalent) to produce a migration file.

This is classic **Prisma schema drift**: the `.prisma` model and the actual database schema diverged. The `prisma generate` step (which produces Prisma Client) uses the full schema, so every Client operation on `KnowledgeObject` references these non-existent columns and fails with `P2022`.

### Timeline (inferred)

1. Schema was manually edited to add 8 structured-content columns (likely during knowledge-object feature development)
2. No migration was generated (`prisma migrate dev` was not ran)
3. The development database was presumably synced via `prisma db push` (which applies schema changes without creating migration files)
4. `prisma generate` was ran, producing a Client that expects the 8 columns
5. Tests use `prisma migrate deploy` (which only runs formal migrations), so they never get the 8 columns
6. Result: every e2e test that touches `KnowledgeObject` fails with `P2022`

### Why only `applySteps` appears in errors

The `P2022` error message happens to reference `applySteps` because it's the first (alphabetically or schema-order) of the 8 missing columns that Prisma's query engine encounters during validation. In reality, all 8 are equally missing. Only `applySteps` appears in the error because Prisma reports the first mismatch it finds.

## Safe Fix Options

### Option A: Generate a Migration (Recommended)

```bash
npx prisma migrate dev --name add_knowledge_object_structured_content --create-only
```

Then inspect and apply the generated SQL. This is the correct Prisma workflow.

**Impact on development data:** The migration is additive (ALTER TABLE ADD COLUMN for SQLite). Existing rows get `NULL` for new columns. No data loss.

**Impact on test database:** Fresh `prisma migrate deploy` runs will now include this migration, creating the columns.

**Prerequisite:** Ensure the production/development SQLite database has these columns already (likely synced via `prisma db push`). If they already exist, the migration will be a no-op on existing databases but will create them on new ones.

### Option B: prisma db push (Quick Fix, Not Recommended)

```bash
npx prisma db push
```

This syncs schema to the development database but does not create a migration file. Tests would still fail because `prisma migrate deploy` ignores `db push` state.

### Option C: Manual SQL

```sql
ALTER TABLE "KnowledgeObject" ADD COLUMN "applySteps" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "learnSteps" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "problem" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "quickAnswer" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "seeAlso" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "summary" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "task" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "warning" TEXT;
```

Apply to production and test databases, then generate a migration. Error-prone and version-controlled migration is preferred.

### Option D: Remove columns from schema

If the structured content fields are unused in production (not yet deployed), they can be removed from `schema.prisma`. This would fix the mismatch but lose the feature.

## Recommended Fix

**Option A** — Generate a formal migration:

```bash
npx prisma migrate dev --name add_knowledge_object_structured_content
```

This will:
1. Compare schema with the last migration state
2. Detect the 8 new columns
3. Generate a new migration file in `prisma/migrations/`
4. Apply it to the development database
5. Tests will then succeed because `prisma migrate deploy` will include this migration

### Pre-validation steps before running

```bash
# Check if schema truly differs from the last migration's snapshot
npx prisma migrate diff --from-migrations --to-schema-datamodel
```

This will show exactly which columns are missing. Apply the fix only if the diff is the expected 8 columns.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dev DB already has the columns via `db push` | Low — migration will detect existing columns and be safe | `--create-only` flag then inspect SQL |
| Migration conflicts with other in-progress changes | Medium | Isolate this change on its own branch |
| `--name` autogeneration produces incorrect defaults | Low for SQLite nullable columns | Review generated SQL before applying |
| Production DB schema unknown | Medium | Verify `prisma migrate status` on production first |

## Validation Plan

1. Run `npx prisma migrate diff --from-migrations --to-schema-datamodel` to confirm the 8 missing columns
2. Run `npx prisma migrate dev --name add_knowledge_object_structured_content`
3. Verify SQL in the generated migration file contains only the 8 expected ALTER TABLE statements
4. Run `npx prisma migrate deploy` on a fresh SQLite file to confirm columns are created
5. Run `npx tsc --noEmit`
6. Run `npm test`
7. Confirm all 27 formerly failing e2e tests now pass

## Rollback Plan

If the migration causes issues:

```bash
# Revert the migration locally
npx prisma migrate reset  # WARNING: drops all data

# Or manually delete the migration folder
Remove-Item -Recurse prisma/migrations/YYYYMMDDHHMMSS_add_knowledge_object_structured_content

# Revert schema change
git checkout prisma/schema.prisma

# Regenerate client
npx prisma generate
```

## Final Verdict

```
MISSING MIGRATION
```
