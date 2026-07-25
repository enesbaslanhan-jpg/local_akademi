-- Create UserMemory table
CREATE TABLE "UserMemory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "summary" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceMessageId" INTEGER,
    "conversationId" INTEGER,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "validationStatus" TEXT NOT NULL DEFAULT 'inferred',
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME,
    "lastUsedAt" DATETIME,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "UserMemory_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "ConversationMessage" ("id") ON DELETE SET NULL
);

-- Create ConversationSummary table
CREATE TABLE "ConversationSummary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "keyFacts" TEXT,
    "decisions" TEXT,
    "openQuestions" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE,
    CONSTRAINT "ConversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "UserMemory_userId_status_idx" ON "UserMemory" ("userId", "status");
CREATE INDEX "UserMemory_userId_type_idx" ON "UserMemory" ("userId", "type");
CREATE INDEX "UserMemory_userId_key_idx" ON "UserMemory" ("userId", "key");
CREATE INDEX "UserMemory_userId_type_status_idx" ON "UserMemory" ("userId", "type", "status");
CREATE UNIQUE INDEX "ConversationSummary_conversationId_key" ON "ConversationSummary" ("conversationId");
CREATE INDEX "ConversationSummary_userId_idx" ON "ConversationSummary" ("userId");
