-- Migration: usability_phase1
-- BusinessProfile genişletme
ALTER TABLE "BusinessProfile" ADD COLUMN "businessStage" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN "employeeCount" INTEGER;
ALTER TABLE "BusinessProfile" ADD COLUMN "salesChannels" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "BusinessProfile" ADD COLUMN "primaryGoal" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN "weeklyLearningMinutes" INTEGER;
ALTER TABLE "BusinessProfile" ADD COLUMN "challenges" TEXT NOT NULL DEFAULT '[]';

-- BusinessAssessment (yeni)
CREATE TABLE "BusinessAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "answers" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "priorityDomains" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
CREATE INDEX "BusinessAssessment_userId_idx" ON "BusinessAssessment"("userId");

-- KnowledgeProgress (yeni)
CREATE TABLE "KnowledgeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "koId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "KnowledgeProgress_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "KnowledgeProgress_userId_koId_key" ON "KnowledgeProgress"("userId", "koId");
CREATE INDEX "KnowledgeProgress_userId_status_idx" ON "KnowledgeProgress"("userId", "status");

-- TaskAssignment: taskTemplateId and its referential constraint.
-- SQLite cannot add a foreign key with ALTER TABLE, so preserve the rows while
-- recreating the table in the same shape Prisma expects.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaskAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "koId" INTEGER NOT NULL,
    "taskTemplateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignment_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TaskAssignment" ("id", "userId", "taskId", "koId", "status", "progressPercent", "answers", "createdAt", "updatedAt")
SELECT "id", "userId", "taskId", "koId", "status", "progressPercent", "answers", "createdAt", "updatedAt" FROM "TaskAssignment";
DROP TABLE "TaskAssignment";
ALTER TABLE "new_TaskAssignment" RENAME TO "TaskAssignment";
CREATE INDEX "TaskAssignment_taskTemplateId_idx" ON "TaskAssignment"("taskTemplateId");
PRAGMA foreign_keys=ON;
