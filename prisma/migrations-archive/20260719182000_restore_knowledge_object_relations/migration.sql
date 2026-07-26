-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KnowledgeObject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "slug" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "reviewGate" TEXT NOT NULL DEFAULT 'standard',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "archivedAt" DATETIME,
    "reviewDue" DATETIME,
    "categoryId" INTEGER,
    "currentVersionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeObject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeObject_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "KnowledgeObjectVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KnowledgeObject" ("archivedAt", "categoryId", "code", "content", "createdAt", "currentVersionId", "embedding", "id", "isDemo", "metadata", "publishedAt", "reviewDue", "reviewGate", "slug", "status", "title", "type", "updatedAt", "verificationStatus") SELECT "archivedAt", "categoryId", "code", "content", "createdAt", "currentVersionId", "embedding", "id", "isDemo", "metadata", "publishedAt", "reviewDue", "reviewGate", "slug", "status", "title", "type", "updatedAt", "verificationStatus" FROM "KnowledgeObject";
DROP TABLE "KnowledgeObject";
ALTER TABLE "new_KnowledgeObject" RENAME TO "KnowledgeObject";
CREATE UNIQUE INDEX "KnowledgeObject_code_key" ON "KnowledgeObject"("code");
CREATE UNIQUE INDEX "KnowledgeObject_slug_key" ON "KnowledgeObject"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
