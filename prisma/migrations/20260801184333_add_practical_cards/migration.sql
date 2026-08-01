-- CreateTable
CREATE TABLE "PracticalCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shortDescription" TEXT,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalCardVersion" (
    "id" TEXT NOT NULL,
    "practicalCardId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalCardVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalCardKnowledgeObject" (
    "practicalCardId" TEXT NOT NULL,
    "knowledgeObjectId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PracticalCardKnowledgeObject_pkey" PRIMARY KEY ("practicalCardId","knowledgeObjectId")
);

-- CreateTable
CREATE TABLE "PracticalCardSave" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "practicalCardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalCardSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalCardFeedback" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "practicalCardId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalCardFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticalCard_code_key" ON "PracticalCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalCardVersion_practicalCardId_version_key" ON "PracticalCardVersion"("practicalCardId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalCardSave_userId_practicalCardId_key" ON "PracticalCardSave"("userId", "practicalCardId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalCardFeedback_userId_practicalCardId_key" ON "PracticalCardFeedback"("userId", "practicalCardId");

-- AddForeignKey
ALTER TABLE "PracticalCardVersion" ADD CONSTRAINT "PracticalCardVersion_practicalCardId_fkey" FOREIGN KEY ("practicalCardId") REFERENCES "PracticalCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardKnowledgeObject" ADD CONSTRAINT "PracticalCardKnowledgeObject_practicalCardId_fkey" FOREIGN KEY ("practicalCardId") REFERENCES "PracticalCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardKnowledgeObject" ADD CONSTRAINT "PracticalCardKnowledgeObject_knowledgeObjectId_fkey" FOREIGN KEY ("knowledgeObjectId") REFERENCES "KnowledgeObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardSave" ADD CONSTRAINT "PracticalCardSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardSave" ADD CONSTRAINT "PracticalCardSave_practicalCardId_fkey" FOREIGN KEY ("practicalCardId") REFERENCES "PracticalCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardFeedback" ADD CONSTRAINT "PracticalCardFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalCardFeedback" ADD CONSTRAINT "PracticalCardFeedback_practicalCardId_fkey" FOREIGN KEY ("practicalCardId") REFERENCES "PracticalCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
