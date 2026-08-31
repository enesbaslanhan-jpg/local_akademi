-- Mobil cihaz anlik bildirim (push) kurulumlari.
--
-- installationId: mobil kurulumun urettigi tekil belirtec.
-- pushToken: FCM HTTP v1 cihaz belirteci.
-- platform: "android" | "ios".

CREATE TABLE "PushInstallation" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "appVersion" TEXT,
    "locale" TEXT DEFAULT 'tr',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushInstallation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushInstallation_installationId_key" ON "PushInstallation"("installationId");

CREATE UNIQUE INDEX "PushInstallation_pushToken_key" ON "PushInstallation"("pushToken");

CREATE INDEX "PushInstallation_userId_idx" ON "PushInstallation"("userId");

ALTER TABLE "PushInstallation" ADD CONSTRAINT "PushInstallation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
