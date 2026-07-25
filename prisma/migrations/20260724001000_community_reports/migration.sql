CREATE TABLE "CommunityReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "reporterId" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolution" TEXT,
  "resolvedById" INTEGER,
  "resolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityReport_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityReport_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommunityReport_postId_reporterId_key"
  ON "CommunityReport"("postId", "reporterId");
CREATE INDEX "CommunityReport_status_createdAt_idx"
  ON "CommunityReport"("status", "createdAt");
CREATE INDEX "CommunityReport_postId_status_idx"
  ON "CommunityReport"("postId", "status");
