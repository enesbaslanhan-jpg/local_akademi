# SQLite to PostgreSQL Production Cutover Verification

**Date:** 2026-07-27  
**Target:** `localakademi` PostgreSQL database

## Finding

The production cutover was executed before the final independent review, despite the handoff summary stating that only rehearsal work had been completed. The production database was therefore inspected read-only before any rollback decision.

## Production Integrity

- Tables verified: 46/46
- Source rows: 12,826
- Production rows: 12,826
- Knowledge objects: 860
- Courses: 203
- Lessons: 873
- Flashcards: 150
- Quizzes: 848
- Quiz questions: 2,535
- Task templates: 843
- Learning videos: 30
- `KnowledgeObject.currentVersionId`: 5/5 matched
- Foreign-key orphan checks: 0
- Unique conflicts: 0
- Sequence issues: 0
- Column checksum failures: 0/46

## Course Verification

`courses:verify` passed:

- All 245 published, non-demo knowledge objects have topic-course lessons.
- 200 topic courses contain 840 linked lessons.
- Three legacy courses and 33 legacy lessons were preserved.
- Lesson ordering and KO mappings are valid.

## Recovery Point

The pre-cutover production dump is:

`BACKUPS/pre-migration-localakademi-2026-07-27T16-22-59.dump`

The dump is a readable PostgreSQL custom-format archive and contains the production schema, table data, sequences, indexes, and foreign-key constraints from before the cutover.

## Decision

**PASS — no rollback required.**

The migrated production database matches the SQLite source. Do not rerun the production migration command unless restoring or rebuilding the database under a separately approved procedure.

