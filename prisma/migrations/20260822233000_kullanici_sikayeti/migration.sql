-- KULLANICI SIKAYETI (22.08.2026)
--
-- `CommunityReport` GONDERIYE bagli. Profil ziyareti ve ozel
-- mesajlasma gelince yetmez oldu: taciz tek bir gonderide olmayabilir
-- -- birden cok mesajda, profil metninde ya da davranis oruntusunde
-- olabilir. Kullanici o durumda bildirecek bir sey bulamiyordu.
--
-- Ayni modele "ya postId ya userId" diye iki opsiyonel alan koymak,
-- her sorguyu "hangisi dolu" kontroluyle kirletirdi. Ayri tablo.

CREATE TABLE "CommunityUserReport" (
    "id" TEXT NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reportedId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedById" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityUserReport_pkey" PRIMARY KEY ("id")
);

-- Ayni kisi bir kez sikayet edilebilir: tekrar tekrar bildirmek
-- kuyrugu doldurur ve GERCEK sikayetleri gorunmez yapar.
CREATE UNIQUE INDEX "CommunityUserReport_reporterId_reportedId_key"
  ON "CommunityUserReport"("reporterId", "reportedId");

-- Yonetim kuyrugu bu indeksten okuyor.
CREATE INDEX "CommunityUserReport_status_createdAt_idx"
  ON "CommunityUserReport"("status", "createdAt");

-- "Bu kisi hakkinda kac sikayet var" sorusu icin.
CREATE INDEX "CommunityUserReport_reportedId_status_idx"
  ON "CommunityUserReport"("reportedId", "status");

ALTER TABLE "CommunityUserReport"
  ADD CONSTRAINT "CommunityUserReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityUserReport"
  ADD CONSTRAINT "CommunityUserReport_reportedId_fkey"
  FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
