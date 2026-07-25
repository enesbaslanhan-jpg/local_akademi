-- Migration: add_knowledge_object_structured_content
-- Adds structured content columns to KnowledgeObject that were
-- added to schema.prisma without a corresponding migration.

ALTER TABLE "KnowledgeObject" ADD COLUMN "applySteps" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "learnSteps" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "problem" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "quickAnswer" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "seeAlso" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "summary" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "task" TEXT;
ALTER TABLE "KnowledgeObject" ADD COLUMN "warning" TEXT;
