CREATE TABLE "CommunityPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authorId" INTEGER,
  "moderatedById" INTEGER,
  "postType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceTitle" TEXT,
  "sourcePublishedAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "moderationReason" TEXT,
  "publishedAt" DATETIME,
  "moderatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CommunityPost_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommunityPost_moderatedById_fkey"
    FOREIGN KEY ("moderatedById") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CommunityPost_status_publishedAt_idx"
  ON "CommunityPost"("status", "publishedAt");
CREATE INDEX "CommunityPost_postType_status_idx"
  ON "CommunityPost"("postType", "status");
CREATE INDEX "CommunityPost_authorId_createdAt_idx"
  ON "CommunityPost"("authorId", "createdAt");
