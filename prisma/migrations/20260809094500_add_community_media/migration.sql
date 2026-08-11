CREATE TABLE "CommunityMedia" (
    "id" TEXT NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "postId" TEXT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityMedia_postId_key" ON "CommunityMedia"("postId");
CREATE UNIQUE INDEX "CommunityMedia_storedName_key" ON "CommunityMedia"("storedName");
CREATE INDEX "CommunityMedia_uploaderId_createdAt_idx" ON "CommunityMedia"("uploaderId", "createdAt");

ALTER TABLE "CommunityMedia" ADD CONSTRAINT "CommunityMedia_uploaderId_fkey"
FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityMedia" ADD CONSTRAINT "CommunityMedia_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
