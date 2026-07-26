ALTER TABLE "LearningVideo" ADD COLUMN "provider" TEXT;

ALTER TABLE "VideoProgress" ADD COLUMN "watchedSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VideoProgress" ADD COLUMN "furthestSecond" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VideoProgress" ADD COLUMN "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "VideoProductionJob" ADD COLUMN "provider" TEXT;
ALTER TABLE "VideoProductionJob" ADD COLUMN "externalJobId" TEXT;
ALTER TABLE "VideoProductionJob" ADD COLUMN "outputUrl" TEXT;
