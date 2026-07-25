-- Migration: learning_flashcard_models
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koId" INTEGER NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Flashcard_knowledgeObject_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Flashcard_koId_order_key" ON "Flashcard"("koId", "order");
CREATE INDEX "Flashcard_koId_status_idx" ON "Flashcard"("koId", "status");

CREATE TABLE "FlashcardReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "easeFactor" REAL NOT NULL,
    "repetition" INTEGER NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "reviewedAt" DATETIME NOT NULL,
    CONSTRAINT "FlashcardReview_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "FlashcardReview_flashcard_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard" ("id") ON DELETE CASCADE
);
CREATE INDEX "FlashcardReview_userId_dueAt_idx" ON "FlashcardReview"("userId", "dueAt");

CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "koId" INTEGER NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "masteredCount" INTEGER NOT NULL DEFAULT 0,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" DATETIME,
    CONSTRAINT "FlashcardProgress_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "FlashcardProgress_knowledgeObject_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "FlashcardProgress_userId_koId_key" ON "FlashcardProgress"("userId", "koId");
CREATE INDEX "FlashcardProgress_userId_idx" ON "FlashcardProgress"("userId");
