-- CreateTable
CREATE TABLE "DecisionCheck" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "targetRoles" TEXT NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DecisionCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCheckVersion" (
    "id" TEXT NOT NULL,
    "decisionCheckId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "definitionJson" JSONB NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionCheckVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCheckSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "decisionCheckId" TEXT NOT NULL,
    "versionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DecisionCheckSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCheckAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "isUnknown" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionCheckAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCheckResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_ready',
    "riskLevel" TEXT NOT NULL DEFAULT 'undetermined',
    "snapshotJson" JSONB NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecisionCheck_code_key" ON "DecisionCheck"("code");

-- CreateIndex
CREATE INDEX "DecisionCheck_published_deletedAt_idx" ON "DecisionCheck"("published", "deletedAt");

-- CreateIndex
CREATE INDEX "DecisionCheckVersion_decisionCheckId_status_idx" ON "DecisionCheckVersion"("decisionCheckId", "status");

-- CreateIndex
CREATE INDEX "DecisionCheckSession_userId_status_idx" ON "DecisionCheckSession"("userId", "status");

-- CreateIndex
CREATE INDEX "DecisionCheckSession_decisionCheckId_idx" ON "DecisionCheckSession"("decisionCheckId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionCheckAnswer_sessionId_questionCode_key" ON "DecisionCheckAnswer"("sessionId", "questionCode");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionCheckResult_sessionId_key" ON "DecisionCheckResult"("sessionId");

-- AddForeignKey
ALTER TABLE "DecisionCheckSession" ADD CONSTRAINT "DecisionCheckSession_decisionCheckId_fkey" FOREIGN KEY ("decisionCheckId") REFERENCES "DecisionCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCheckSession" ADD CONSTRAINT "DecisionCheckSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCheckAnswer" ADD CONSTRAINT "DecisionCheckAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DecisionCheckSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCheckResult" ADD CONSTRAINT "DecisionCheckResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DecisionCheckSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
