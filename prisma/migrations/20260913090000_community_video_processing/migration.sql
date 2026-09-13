-- Eski topluluk medyalari yayinlanmis durumdaydi; bu nedenle eklemeli
-- sutunun varsayilani `ready`. Yalniz yeni videolar `processing` ile acilir.
ALTER TABLE "CommunityMedia"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN "posterStoredName" TEXT,
  ADD COLUMN "durationSec" INTEGER;

CREATE INDEX "CommunityMedia_kind_status_createdAt_idx"
  ON "CommunityMedia"("kind", "status", "createdAt");
