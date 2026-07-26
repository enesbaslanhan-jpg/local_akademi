-- CreateTable
CREATE TABLE "LearningVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "koId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationTarget" INTEGER NOT NULL DEFAULT 300,
    "script" TEXT,
    "storyboard" TEXT,
    "transcript" TEXT,
    "webvttContent" TEXT,
    "thumbnailSpec" TEXT,
    "outputKey" TEXT,
    "voiceGuidance" TEXT,
    "playbackUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'script_ready',
    "checksum" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningVideo_koId_fkey" FOREIGN KEY ("koId") REFERENCES "KnowledgeObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "videoId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VideoProgress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "LearningVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoProductionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'render',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "outputKey" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoProductionJob_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "LearningVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningVideo_koId_key" ON "LearningVideo"("koId");

-- CreateIndex
CREATE INDEX "LearningVideo_status_idx" ON "LearningVideo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProgress_userId_videoId_key" ON "VideoProgress"("userId", "videoId");

-- CreateIndex
CREATE INDEX "VideoProgress_userId_idx" ON "VideoProgress"("userId");

-- CreateIndex
CREATE INDEX "VideoProductionJob_status_idx" ON "VideoProductionJob"("status");

-- CreateIndex
CREATE INDEX "VideoProductionJob_videoId_idx" ON "VideoProductionJob"("videoId");
