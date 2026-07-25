-- Migration: add_companion_import_job_fields
-- Adds type and koCode columns to ImportJob for companion content import support

-- Recreate ImportJob table with new columns (SQLite safe approach)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'ko_import',
    "koCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_ImportJob" ("id", "status", "totalRows", "processedAt", "createdAt")
SELECT "id", "status", "totalRows", "processedAt", "createdAt" FROM "ImportJob";

DROP TABLE "ImportJob";
ALTER TABLE "new_ImportJob" RENAME TO "ImportJob";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
