-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentCode" TEXT,
    "status" TEXT NOT NULL,
    "progressPercent" INTEGER,
    "lastPositionJson" JSONB,
    "continueLater" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningProgress_userId_status_idx" ON "LearningProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "LearningProgress_userId_contentType_idx" ON "LearningProgress"("userId", "contentType");

-- CreateIndex
CREATE INDEX "LearningProgress_userId_lastViewedAt_idx" ON "LearningProgress"("userId", "lastViewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_userId_contentType_contentId_key" ON "LearningProgress"("userId", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
