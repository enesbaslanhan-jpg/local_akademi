# Phase 2.1 — Reminders, PDF and Document Suggestions

Date: 2026-07-28
Decision: **GO**

## Delivered

- Business records with a due date now receive an automatic in-app reminder scheduled 24 hours before the due date, or immediately when the date is closer.
- The reminder worker converts due reminders into user-scoped notifications and uses a unique key to prevent duplicate delivery.
- Users can list notifications, mark one as read, or mark all as read.
- Completed, cancelled, archived, or inactive-workspace records do not produce notifications.
- PDF uploads now require matching extension, MIME type, `%PDF-` signature, a complete PDF ending, no encryption marker, no more than 200 pages, and extractable text.
- Scanned/image-only PDFs are rejected with a clear message; OCR is intentionally outside this phase.
- Fixed TXT validation typo (`tx` → `txt`).
- Workspace documents now receive deterministic business-record suggestions based on category and extracted evidence.
- Suggestions show type, amount, due date, and confidence.
- A suggestion never creates a business record automatically. Only the explicit **Create record** action creates and links a record.
- Accept/reject operations are workspace-scoped, role-protected, transactional, and single-use.

## Data change

Migration: `20260728200000_add_notification_dedupe`

- Adds nullable unique `BusinessNotification.dedupeKey`.
- Existing notification data remains compatible.
- Main local PostgreSQL migration applied successfully.
- `prisma migrate status`: database schema is up to date.

## Backup

- File: `BACKUPS/localakademi_phase21_pre_migration_2026-07-28.dump`
- Format: PostgreSQL custom archive
- Size: 3,959,708 bytes
- SHA-256: `FC2620B58ACA42801202837D3DE8FA38398B84AF75AACE77DB7B6F501089359F`
- `pg_restore --list`: passed

## Verification

- TypeScript backend build: PASS
- Frontend production build: PASS
- Backend tests: **880/880 PASS**
- Phase-specific backend/document tests: **43/43 PASS**
- Frontend tests: **12/12 PASS**
- Migration chain: **4/4 migrations PASS**
- Seed idempotency: PASS
- Live API journey: PASS
  - register
  - create workspace
  - create due payment
  - receive one deduplicated notification
  - upload and claim a document
  - generate an 8,450 TRY payment suggestion
  - confirm no record exists before approval
  - approve suggestion
  - confirm exactly one new linked record
- Temporary live-test database rows and uploaded file: removed
- Backend health: `200`
- Frontend login page: `200`

## Remaining boundary

OCR for image-only/scanned PDFs is not included. Such files are rejected instead of being guessed or silently accepted.
