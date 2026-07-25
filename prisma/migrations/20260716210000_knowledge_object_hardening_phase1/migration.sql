-- Migration: knowledge_object_hardening_phase1
-- KnowledgeObject model hardening: adds code, slug, status, verificationStatus, reviewGate, isDemo, publishedAt, archivedAt, reviewDue

-- Redefine KnowledgeObject table with new columns (SQLite ALTER TABLE supports ADD COLUMN)
ALTER TABLE "KnowledgeObject" ADD COLUMN "code" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "slug" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "KnowledgeObject" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "KnowledgeObject" ADD COLUMN "reviewGate" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "KnowledgeObject" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KnowledgeObject" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "KnowledgeObject" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "KnowledgeObject" ADD COLUMN "reviewDue" DATETIME;

-- Create unique indexes
CREATE UNIQUE INDEX "KnowledgeObject_code_key" ON "KnowledgeObject"("code");
CREATE UNIQUE INDEX "KnowledgeObject_slug_key" ON "KnowledgeObject"("slug");