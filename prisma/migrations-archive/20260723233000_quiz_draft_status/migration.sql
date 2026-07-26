ALTER TABLE "Quiz" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published';

CREATE INDEX "Quiz_koId_status_idx" ON "Quiz"("koId", "status");
