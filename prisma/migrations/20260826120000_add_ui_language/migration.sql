ALTER TABLE "UserPreference"
ADD COLUMN "uiLanguage" TEXT NOT NULL DEFAULT 'tr';

ALTER TABLE "UserPreference"
ADD CONSTRAINT "UserPreference_uiLanguage_check" CHECK ("uiLanguage" IN ('tr', 'en'));
