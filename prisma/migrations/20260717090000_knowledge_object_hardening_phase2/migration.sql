-- Migration: knowledge_object_hardening_phase2
-- 12 new models + KnowledgeObject FK additions

-- Category
CREATE TABLE "Category" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "parentId"    INTEGER,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- KnowledgeObjectVersion
CREATE TABLE "KnowledgeObjectVersion" (
  "id"            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "koId"          INTEGER NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "changes"       TEXT NOT NULL,
  "createdBy"     INTEGER NOT NULL,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeObjectVersion_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeObjectVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Source
CREATE TABLE "Source" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "title"          TEXT NOT NULL,
  "url"            TEXT,
  "authorityLevel" TEXT NOT NULL DEFAULT 'medium',
  "lastChecked"    DATETIME,
  "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- KnowledgeObjectSource (M:N bridge)
CREATE TABLE "KnowledgeObjectSource" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "koId"      INTEGER NOT NULL,
  "sourceId"  TEXT NOT NULL,
  "relation"  TEXT NOT NULL DEFAULT 'references',
  "note"      TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeObjectSource_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeObjectSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ReviewRecord
CREATE TABLE "ReviewRecord" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "koId"       INTEGER NOT NULL,
  "reviewerId" INTEGER NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "notes"      TEXT,
  "reviewedAt" DATETIME,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewRecord_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReviewRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Quiz (master)
CREATE TABLE "Quiz" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "koId"      INTEGER NOT NULL,
  "title"     TEXT NOT NULL,
  "passScore" INTEGER NOT NULL DEFAULT 70,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quiz_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- QuizQuestion
CREATE TABLE "QuizQuestion" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "quizId"        TEXT NOT NULL,
  "questionText"  TEXT NOT NULL,
  "options"       TEXT NOT NULL,
  "correctAnswer" TEXT NOT NULL,
  "explanation"   TEXT,
  "order"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- TaskTemplate
CREATE TABLE "TaskTemplate" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "koId"          INTEGER NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "estimatedTime" INTEGER NOT NULL DEFAULT 10,
  "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskTemplate_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Formula (master) – ref by FormulaCalculation
CREATE TABLE "Formula" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "formulaText" TEXT,
  "inputs"      TEXT NOT NULL,
  "outputs"     TEXT,
  "assumptions" TEXT,
  "warning"     TEXT,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Formula_name_key" ON "Formula"("name");

-- PublicationEvent
CREATE TABLE "PublicationEvent" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "koId"        INTEGER NOT NULL,
  "action"      TEXT NOT NULL,
  "performedBy" INTEGER NOT NULL,
  "note"        TEXT,
  "timestamp"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicationEvent_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublicationEvent_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ImportJob
CREATE TABLE "ImportJob" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "totalRows"   INTEGER NOT NULL DEFAULT 0,
  "processedAt" DATETIME,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ImportJobError
CREATE TABLE "ImportJobError" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "importJobId" TEXT NOT NULL,
  "row"         INTEGER NOT NULL,
  "field"       TEXT,
  "message"     TEXT NOT NULL,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportJobError_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- KnowledgeObject FK additions
ALTER TABLE "KnowledgeObject" ADD COLUMN "categoryId" INTEGER;
ALTER TABLE "KnowledgeObject" ADD COLUMN "currentVersionId" INTEGER;
CREATE INDEX "KnowledgeObject_categoryId_idx" ON "KnowledgeObject"("categoryId");