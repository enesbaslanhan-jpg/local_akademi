-- Gelen kutusuna posta gonderebilen guvenilir adresler.
--
-- Liste VARSAYILAN BOS oldugu icin bu goc mevcut davranisi
-- degistirmiyor: hicbir calisma alani bu tabloda satir tasimadan
-- eski kural (yalniz dogrulanmis uye) aynen isliyor.
CREATE TABLE "BusinessInboxSender" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "addedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessInboxSender_pkey" PRIMARY KEY ("id")
);

-- Ayni adres bir calisma alanina iki kez eklenemez.
CREATE UNIQUE INDEX "BusinessInboxSender_workspaceId_email_key" ON "BusinessInboxSender"("workspaceId", "email");

CREATE INDEX "BusinessInboxSender_workspaceId_idx" ON "BusinessInboxSender"("workspaceId");

ALTER TABLE "BusinessInboxSender" ADD CONSTRAINT "BusinessInboxSender_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "BusinessWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessInboxSender" ADD CONSTRAINT "BusinessInboxSender_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
