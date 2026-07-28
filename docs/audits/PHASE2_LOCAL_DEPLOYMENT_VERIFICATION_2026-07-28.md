# Phase 2 Local Deployment Verification

**Date:** 2026-07-28
**Target:** Local PostgreSQL `localakademi`
**Result:** PASS

## Backup gate

- Pre-migration custom-format PostgreSQL dump created.
- Backup: `BACKUPS/localakademi_phase2_pre_migration_2026-07-28.dump`
- Size: 3,932,070 bytes
- SHA-256: `460E19F45590B229DF56C817D26994D4A2761764AFDF71C07228F9A285D903E0`
- `pg_restore -l` readability check: PASS

## Migration

- Pending migration: `20260728190000_add_business_tracker`
- `prisma migrate deploy`: PASS
- `prisma migrate status`: database schema is up to date
- Phase 2 tables visible in PostgreSQL catalog: PASS

## Data preservation

Critical counts were identical before and after migration:

| Dataset | Before | After |
|---|---:|---:|
| Users | 10 | 10 |
| Knowledge objects | 860 | 860 |
| Published knowledge objects | 245 | 245 |
| Quizzes | 848 | 848 |
| Community posts | 5 | 5 |

## Runtime verification

- PostgreSQL container: healthy
- Backend `http://127.0.0.1:3000/health`: PASS
- Frontend `http://127.0.0.1:5173`: HTTP 200
- Frontend `/workspaces` proxy: corrected and verified with backend JSON 401 response when unauthenticated
- Frontend build: PASS
- Frontend tests: 12/12 PASS

## Live user journey

A temporary user was used to verify the running application:

1. Register
2. Open workspace list
3. Create a workspace
4. Open `İşletme Takibi`
5. Create a payable record
6. Verify open count and 30-day net cash impact
7. Complete the record
8. Open `Belgeler`
9. Upload and list a TXT document

All steps passed. The temporary user, workspace, record, database document and uploaded test file were removed after verification.
