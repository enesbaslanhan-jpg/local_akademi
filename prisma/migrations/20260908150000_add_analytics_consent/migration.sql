ALTER TABLE "UserPreference"
  ADD COLUMN "analyticsConsent" BOOLEAN,
  ADD COLUMN "analyticsConsentAt" TIMESTAMP(3),
  ADD COLUMN "analyticsConsentVersion" TEXT;
