-- CreateTable
CREATE TABLE "FeedInteraction" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceEntityCode" TEXT,
    "viewedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "actedAt" TIMESTAMP(3),
    "actionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedInteraction_userId_dismissedAt_idx" ON "FeedInteraction"("userId", "dismissedAt");

-- CreateIndex
CREATE INDEX "FeedInteraction_userId_viewedAt_idx" ON "FeedInteraction"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedInteraction_userId_itemKey_key" ON "FeedInteraction"("userId", "itemKey");

-- AddForeignKey
ALTER TABLE "FeedInteraction" ADD CONSTRAINT "FeedInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
