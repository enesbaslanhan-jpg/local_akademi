ALTER TABLE "BusinessNotification"
ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "BusinessNotification_dedupeKey_key"
ON "BusinessNotification"("dedupeKey");
