CREATE TABLE "CommunityFollow" (
  "id" TEXT NOT NULL, "followerId" INTEGER NOT NULL, "followingId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityFollow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunityFollow_followerId_followingId_key" ON "CommunityFollow"("followerId", "followingId");
CREATE INDEX "CommunityFollow_followingId_createdAt_idx" ON "CommunityFollow"("followingId", "createdAt");
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommunityBlock" (
  "id" TEXT NOT NULL, "blockerId" INTEGER NOT NULL, "blockedId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunityBlock_blockerId_blockedId_key" ON "CommunityBlock"("blockerId", "blockedId");
CREATE INDEX "CommunityBlock_blockedId_idx" ON "CommunityBlock"("blockedId");
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommunityThread" (
  "id" TEXT NOT NULL, "name" TEXT, "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "createdById" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityThread_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommunityThreadMember" (
  "threadId" TEXT NOT NULL, "userId" INTEGER NOT NULL, "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityThreadMember_pkey" PRIMARY KEY ("threadId", "userId")
);
CREATE INDEX "CommunityThreadMember_userId_joinedAt_idx" ON "CommunityThreadMember"("userId", "joinedAt");
CREATE TABLE "CommunityMessage" (
  "id" TEXT NOT NULL, "threadId" TEXT NOT NULL, "senderId" INTEGER NOT NULL, "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityMessage_threadId_createdAt_idx" ON "CommunityMessage"("threadId", "createdAt");
ALTER TABLE "CommunityThread" ADD CONSTRAINT "CommunityThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityThreadMember" ADD CONSTRAINT "CommunityThreadMember_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityThreadMember" ADD CONSTRAINT "CommunityThreadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommunityAd" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "ctaLabel" TEXT, "ctaUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityAd_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityAd_active_createdAt_idx" ON "CommunityAd"("active", "createdAt");
ALTER TABLE "CommunityAd" ADD CONSTRAINT "CommunityAd_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
