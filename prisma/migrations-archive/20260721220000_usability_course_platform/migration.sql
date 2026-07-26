-- Migration: usability_course_platform
-- Course: slug, estimatedMinutes, outcomes, sourceType
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;
ALTER TABLE "Course" ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN "outcomes" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Course" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'legacy';
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- Lesson: knowledgeObjectId, estimatedMinutes
ALTER TABLE "Lesson" ADD COLUMN "knowledgeObjectId" INTEGER REFERENCES "KnowledgeObject"("id") ON DELETE SET NULL;
ALTER TABLE "Lesson" ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 10;
CREATE INDEX "Lesson_knowledgeObjectId_idx" ON "Lesson"("knowledgeObjectId");

-- LessonProgress (yeni)
CREATE TABLE "LessonProgress" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "readingPercent" INTEGER NOT NULL DEFAULT 0,
    "quizPercent" INTEGER NOT NULL DEFAULT 0,
    "taskPercent" INTEGER NOT NULL DEFAULT 0,
    "overallPercent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX "LessonProgress_userId_status_idx" ON "LessonProgress"("userId", "status");

-- QuizAttempt: quizId
ALTER TABLE "QuizAttempt" ADD COLUMN "quizId" TEXT;
