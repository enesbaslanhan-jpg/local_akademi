-- AlterTable: add V2 fields to TaskTemplate
ALTER TABLE "TaskTemplate" ADD COLUMN "instructions" TEXT;
ALTER TABLE "TaskTemplate" ADD COLUMN "exampleOutput" TEXT;
ALTER TABLE "TaskTemplate" ADD COLUMN "checklist" TEXT;
ALTER TABLE "TaskTemplate" ADD COLUMN "rubric" TEXT;

-- AlterTable: add V2 fields to TaskAssignment
ALTER TABLE "TaskAssignment" ADD COLUMN "reviewStatus" TEXT DEFAULT 'pending';
ALTER TABLE "TaskAssignment" ADD COLUMN "feedback" TEXT;
ALTER TABLE "TaskAssignment" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "TaskAssignment" ADD COLUMN "reviewedAt" DATETIME;

-- CreateIndex
CREATE INDEX "TaskAssignment_reviewStatus_idx" ON "TaskAssignment"("reviewStatus");
