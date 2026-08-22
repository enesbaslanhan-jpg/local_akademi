-- PROFIL, BILDIRIM, GRUP DAVETI, REKLAM SAYACLARI (22.08.2026)
--
-- Hepsi eklemeli: var olan hicbir sutun degismiyor ya da silinmiyor,
-- yeni sutunlarin hepsi nullable ya da varsayilanli. Yani calisan
-- uretim verisi icin risk tasimiyor ve geri alinabilir.

-- --------------------------------------------------------------
-- 1) PROFIL OZELLESTIRME
--
-- Profiller uyeler arasinda ziyaret edilebilir hale geliyor; bu
-- alanlar DIGER UYELERE GORUNUR. Aydinlatma metninde karsiligi
-- olmali (bkz. plan E3).
-- --------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "location" TEXT;
ALTER TABLE "User" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "coverStoredName" TEXT;
ALTER TABLE "User" ADD COLUMN "coverMimeType" TEXT;

-- --------------------------------------------------------------
-- 2) GRUP DAVETI
--
-- Varsayilan 'joined': var olan uyelikler kabul edilmis sayilir.
-- 'invited' yapilsaydi calisan sohbetler bir anda kilitlenirdi.
-- --------------------------------------------------------------
ALTER TABLE "CommunityThreadMember" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'joined';

-- --------------------------------------------------------------
-- 3) REKLAM: MEDYA VE SAYACLAR
--
-- Sayaclar TOPLAM tutulur. Kimin gordugu KAYDEDILMEZ -- kisi bazinda
-- olcum gercek izlemedir ve "hicbir ucuncu taraf izleme araci
-- calistirmiyor" taahhudunu bozardi. Bu yuzden burada bir
-- "AdImpression" tablosu YOKTUR ve olmamalidir.
-- --------------------------------------------------------------
ALTER TABLE "CommunityAd" ADD COLUMN "mediaId" TEXT;
ALTER TABLE "CommunityAd" ADD COLUMN "impressions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommunityAd" ADD COLUMN "clicks" INTEGER NOT NULL DEFAULT 0;

-- --------------------------------------------------------------
-- 4) TOPLULUK BILDIRIMLERI
--
-- `BusinessNotification` kullanilamadi: o calisma alanina bagli
-- (`workspaceId` zorunlu) ve topluluk olaylarinin calisma alani yok.
--
-- Bu tablo olmadan sosyal katman GORUNMEZ: kimse takip edildigini,
-- mesaj geldigini ya da gonderisine yanit yazildigini ogrenmiyor.
-- --------------------------------------------------------------
CREATE TABLE "CommunityNotification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "type" TEXT NOT NULL,
    "postId" TEXT,
    "threadId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNotification_pkey" PRIMARY KEY ("id")
);

-- Okunmamis bildirim sayaci ve liste ayni indeksten yararlaniyor.
CREATE INDEX "CommunityNotification_userId_readAt_createdAt_idx"
  ON "CommunityNotification"("userId", "readAt", "createdAt");

ALTER TABLE "CommunityNotification"
  ADD CONSTRAINT "CommunityNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Olayi yapan silinirse bildirim de gitmeli: "kim yapti" bilgisi
-- olmayan bir bildirim kullaniciya hicbir sey anlatmaz.
ALTER TABLE "CommunityNotification"
  ADD CONSTRAINT "CommunityNotification_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityNotification"
  ADD CONSTRAINT "CommunityNotification_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityNotification"
  ADD CONSTRAINT "CommunityNotification_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "CommunityThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
