CREATE TYPE "NewsSourceType" AS ENUM ('RSS', 'OFFICIAL_PAGE', 'OFFICIAL_API');
CREATE TYPE "NewsCategory" AS ENUM ('FINANS', 'MEVZUAT', 'VERGI', 'IS_DUNYASI', 'DIJITALLESME', 'DESTEK', 'GENEL_EKONOMI');
CREATE TYPE "NewsStatus" AS ENUM ('PROCESSING', 'PUBLISHED', 'FAILED', 'ARCHIVED');
CREATE TYPE "NewsImportance" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "NewsSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "feedUrl" TEXT,
  "type" "NewsSourceType" NOT NULL,
  "category" "NewsCategory" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isOfficial" BOOLEAN NOT NULL DEFAULT true,
  "allowedDomains" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsArticle" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "category" "NewsCategory" NOT NULL,
  "status" "NewsStatus" NOT NULL DEFAULT 'PROCESSING',
  "importance" "NewsImportance",
  "title" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "sourcePublishedAt" TIMESTAMP(3) NOT NULL,
  "sourceTextExcerpt" TEXT,
  "summary" TEXT,
  "whyItMatters" TEXT,
  "tags" TEXT[] NOT NULL,
  "affectedAudience" TEXT[] NOT NULL,
  "imageId" TEXT,
  "aiProvider" TEXT,
  "aiModel" TEXT,
  "failureReason" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsArticle_canonicalUrl_key" ON "NewsArticle"("canonicalUrl");
CREATE UNIQUE INDEX "NewsArticle_contentHash_key" ON "NewsArticle"("contentHash");
CREATE INDEX "NewsSource_isActive_type_idx" ON "NewsSource"("isActive", "type");
CREATE INDEX "NewsArticle_status_sourcePublishedAt_id_idx" ON "NewsArticle"("status", "sourcePublishedAt" DESC, "id");
CREATE INDEX "NewsArticle_category_status_sourcePublishedAt_id_idx" ON "NewsArticle"("category", "status", "sourcePublishedAt" DESC, "id");
CREATE INDEX "NewsArticle_sourceId_sourcePublishedAt_idx" ON "NewsArticle"("sourceId", "sourcePublishedAt" DESC);
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
