-- AlterTable: add V2 percent fields to LessonProgress
ALTER TABLE "LessonProgress" ADD COLUMN "flashcardPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LessonProgress" ADD COLUMN "videoPercent" INTEGER NOT NULL DEFAULT 0;
