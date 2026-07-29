-- Deterministic curriculum ordering and publication metadata.
ALTER TABLE "Course"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "metadata" TEXT NOT NULL DEFAULT '{}';

CREATE INDEX "Course_published_sortOrder_idx"
ON "Course"("published", "sortOrder");
