CREATE TABLE "AiReviewerHumanAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "telemetryId" TEXT NOT NULL,
  "reviewerId" INTEGER NOT NULL,
  "verdict" TEXT NOT NULL,
  "criticalMiss" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiReviewerHumanAudit_telemetryId_fkey"
    FOREIGN KEY ("telemetryId") REFERENCES "AiReviewerTelemetry" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AiReviewerHumanAudit_telemetryId_key"
  ON "AiReviewerHumanAudit"("telemetryId");
CREATE INDEX "AiReviewerHumanAudit_verdict_createdAt_idx"
  ON "AiReviewerHumanAudit"("verdict", "createdAt");
CREATE INDEX "AiReviewerHumanAudit_criticalMiss_createdAt_idx"
  ON "AiReviewerHumanAudit"("criticalMiss", "createdAt");
CREATE INDEX "AiReviewerHumanAudit_reviewerId_createdAt_idx"
  ON "AiReviewerHumanAudit"("reviewerId", "createdAt");
