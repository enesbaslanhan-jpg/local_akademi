CREATE TABLE "AiReviewerTelemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "decision" TEXT,
    "failureCode" TEXT,
    "riskLevel" TEXT NOT NULL,
    "issueCodes" TEXT NOT NULL DEFAULT '[]',
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "groundednessScore" REAL,
    "pedagogicalScore" REAL,
    "confidence" REAL,
    "latencyMs" INTEGER,
    "model" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AiReviewerTelemetry_createdAt_idx"
ON "AiReviewerTelemetry"("createdAt");

CREATE INDEX "AiReviewerTelemetry_status_createdAt_idx"
ON "AiReviewerTelemetry"("status", "createdAt");

CREATE INDEX "AiReviewerTelemetry_decision_createdAt_idx"
ON "AiReviewerTelemetry"("decision", "createdAt");

CREATE INDEX "AiReviewerTelemetry_failureCode_createdAt_idx"
ON "AiReviewerTelemetry"("failureCode", "createdAt");
