# SQLite → PostgreSQL Final Cutover Gate Report

**Date:** 2026-07-27
**Tool:** `scripts/migrate-sqlite-to-postgres.ts` v3  
**Branch:** `audit/localakademi` (HEAD `16b6f8a`)

---

## 1. Test Results Summary

| Check | Status | Details |
|-------|--------|---------|
| TypeScript build | PASS | `tsc` — 0 errors, 0 warnings |
| Test suite | PASS | 800/800 (46 files) |
| Rollback (fail-after-Quiz) | PASS | Transaction rolled back, seed restored |
| Clean rehearsal (--rehearsal) | PASS | 46/46 tables, 12,826/12,826 rows |
| Verify-only after rehearsal | PASS | 0 orphans, 0 unique conflicts, 0 checksum fails, 5/5 currentVersionId |
| Dump readability | PASS | `pg_restore --list` verified |
| Restore test (localakademi_restore_test) | PASS | 46/46 tables, all counts/checksums match |

## 2. Data Integrity

- **Tables:** 46 of 46 present
- **Rows:** 12,826 source → 12,826 target
- **Orphans (FK):** 0 of 42 checks
- **Unique constraint violations:** 0 of 20 checks
- **Column-level checksum:** 0 of 46 mismatches
- **`currentVersionId` (deferred FK):** 5/5 match (KO ids 615-619)
- **Sequences:** 18/18 int-id tables synced

## 3. Tool Safety

- `DATABASE_URL` parsed with `new URL()` — only pathname changed, password never logged
- `--production` requires `PRODUCTION_CONFIRM=true` + validates target db name
- `--fail-after-table=<name>` confirms transactional rollback
- `--verify-only` is read-only (no writes, no backup)
- `--dry-run` is read-only (same as verify-only)
- Backup failure blocks production cutover (exit code 1)
- SQLite `prisma/dev.db` opened `readOnly` via `node:sqlite DatabaseSync`

## 4. Rollback / Restore

- **Transactional rollback:** Verified — `--fail-after-table=Quiz` causes `$transaction` to roll back all inserts; seed data restored
- **pg_dump backup:** Created pre-migration (empty DB) and post-migration (3.9 MB, 12,826 rows)
- **pg_restore restore:** Successfully restored to `localakademi_restore_test`; all 46 tables verified identical

## 5. Decision: **GO**

All gates pass. The migration tool is safe for production use.

---

## Production Cutover Command

When ready to execute:

```bash
# 1. Set production confirmation
export PRODUCTION_CONFIRM=true

# 2. Run migration
npx tsx scripts/migrate-sqlite-to-postgres.ts --production

# 3. Update DATABASE_URL in .env to point to localakademi (PostgreSQL)
```

**Prerequisites:**
- Rotate the exposed NVIDIA API keys (one in git history and one in `.env`; values intentionally redacted)
- Resolve `scripts/secret-scan.js` (missing `nvapi-` pattern, exits 0 on real secrets)
- Resolve OpenCode audit high-priority items
