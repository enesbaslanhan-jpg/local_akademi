# Phase 2.2 — Calendar, Recurring Records and Local OCR

Date: 2026-07-28
Decision: **GO**

## Delivered

- Business records can recur weekly, monthly, quarterly, or yearly.
- Completing a recurring record creates exactly one next-period record.
- Month-end dates are clamped safely, including February and leap-year cases.
- A database unique guard prevents more than one direct successor for a recurring record.
- The workspace now has a monthly business calendar.
- Calendar entries include payments, receivables, promissory notes, purchases, shipments, tasks, and deferred items.
- Calendar financial totals exclude completed and cancelled records.
- Calendar ranges are workspace-scoped and limited to 366 days.
- PNG and JPEG business documents are accepted with MIME, signature, dimension, and pixel-count checks.
- Scanned PDFs are rendered locally and processed with Turkish OCR.
- OCR is limited to the first five PDF pages and 25 million pixels per image to control resource usage.
- OCR uses the bundled Turkish language model and does not send documents to an external service.
- Document cards show when OCR was used and provide a safe extracted-text preview.

## Data change

Migration: `20260728210000_add_recurring_record_guard`

- Adds a unique index for `BusinessRecord.parentRecordId`.
- Pre-migration duplicate-parent check: 0.
- Main local PostgreSQL migration applied successfully.
- Migration chain: 5/5 passed.

## Backup

- File: `BACKUPS/localakademi_phase22_pre_migration_2026-07-28.dump`
- Format: PostgreSQL custom archive
- Size: 3,960,253 bytes
- SHA-256: `B4B26F31E97DD8BB9A8667082EDCD9B149E0A74C410AD8BD48678A23C0C0C7C5`
- `pg_restore --list`: passed

## Verification

- Backend TypeScript build: PASS
- Frontend production build: PASS
- Backend tests: **882/882 PASS**
- Phase-specific tracker/document tests: **45/45 PASS**
- Frontend tests: **12/12 PASS**
- Migration validation and idempotent seed: PASS
- Real local OCR test: `FATURA 8450 TL` recognized from a generated PNG.
- Live API journey:
  - workspace creation: PASS
  - monthly recurring payment creation: PASS
  - completion creates one successor: PASS
  - calendar returns original and successor: PASS
  - local OCR upload: PASS
- Temporary live-test database rows and uploaded image: removed.

## Operational boundary

- OCR accuracy depends on scan quality.
- Scanned PDFs use only the first five pages in this phase.
- Handwriting recognition is not guaranteed.
