# SQLite → PostgreSQL Backup & Restore Gate Report

**Date:** 2026-07-27  
**Script:** `scripts/migrate-sqlite-to-postgres.ts` (v3)  
**Branch:** `audit/localakademi` (HEAD `16b6f8a`)

---

## 1. Changes Applied

| # | Fix | Description |
|---|-----|-------------|
| 1 | `maxBuffer: 100 * 1024 * 1024` | Added to `dumpDatabase()` `execFileSync` — prevents `BACKUP_FAILED` on 3.9 MB dumps |
| 2 | `parsePgUser(rawDbUrl)` | PostgreSQL username parsed from `DATABASE_URL` instead of hardcoded `localakademi` |
| 3 | `restoreDump()` rewrite | Reads dump via `readFileSync`, pipes to `pg_restore` via `cmd /c` shell redirect; no `input` buffer (avoided Windows `spawnSync docker EOF` bug with large stdin); reports errors; returns boolean |
| 4 | `restoreDump()` invoked | Called automatically after migration success (non-production modes) — dumps migrated DB, restores to `localakademi_restore_test`, verifies all 46 table counts |
| 5 | `verifyDumpReadable()` fix | Uses `cmd /c` with shell redirect `< file` (removed quotes around path — Windows cmd.exe rejects quoted redirect targets); removes unused `dbName` param |
| 6 | Production backup-failure guard | Exits with code 1 **before** the transaction block if dump fails in `--production` mode |

## 2. Test Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript build | PASS | `tsc` — 0 errors |
| Test suite | PASS | 800/800 (46 files) |
| `--rehearsal` (clean) | PASS | 46/46 tables, 12,826/12,826 rows |
| Pre-migration dump | PASS | 127 KB, `pg_restore --list` readable |
| Post-migration dump | PASS | 3,913,183 bytes (3.9 MB), `pg_restore --list` readable |
| Restore to `localakademi_restore_test` | PASS | via `pg_restore --clean --if-exists -Fc` |
| Restore verification (46 tables) | PASS | All counts match source |
| `--verify-only` after rehearsal | PASS | 0 orphans, 0 conflicts, 0 checksum fails |
| Production backup-failure guard | VALIDATED | Code exits at line 459-463 before transaction block at line 504 |

## 3. Key Details

- **`maxBuffer`:** `100 * 1024 * 1024` (100 MB) — safely handles production-scale dumps
- **`pgUser`:** Parsed from `DATABASE_URL` via `new URL()` — `decodeURIComponent(u.username)`; logged as `PG user: localakademi` without password
- **Shell redirect:** Uses `cmd /c` with `< path` (no quotes around path — Windows `cmd.exe` treats quotes after `<` as part of filename)
- **Dump path:** All dumps written to `BACKUPS/` with ISO timestamp filenames
- **Restore target:** `localakademi_restore_test` — created if not exists; schema pre-applied via `prisma db push`

## 4. Gate Decision: **GO**

All backup and restore gates pass. The tool is safe for production cutover.

---

## Production Cutover Command

```bash
export PRODUCTION_CONFIRM=true
npx tsx scripts/migrate-sqlite-to-postgres.ts --production
```

**Pre-flight checklist:**
- [ ] Rotate exposed NVIDIA API keys
- [ ] Fix `scripts/secret-scan.js` (missing `nvapi-` detection)
- [ ] Resolve OpenCode audit high-priority items
- [ ] Update `.env` `DATABASE_URL` to point to PostgreSQL after cutover
