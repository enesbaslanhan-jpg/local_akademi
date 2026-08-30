-- Hesap bildirimleri (uyelik, odeme, guvenlik).
--
-- Ucuncu bildirim tablosu; sebebi schema.prisma icindeki model
-- yorumunda yazili: BusinessNotification calisma alanina bagli,
-- CommunityNotification'in dedupeKey'i yok.

CREATE TABLE "AccountNotification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkTo" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountNotification_pkey" PRIMARY KEY ("id")
);

-- Ayni olayin ikinci kez yazilmasini veritabani seviyesinde durdurur.
-- Uygulama seviyesinde kontrol yetmezdi: uretici birden fazla ornekte
-- ayni anda calisabilir ve "once oku sonra yaz" arasinda yaris olur.
CREATE UNIQUE INDEX "AccountNotification_dedupeKey_key" ON "AccountNotification"("dedupeKey");

-- Zil sayaci ve liste ayni erisim deseni: kullanici + okunma + tarih.
CREATE INDEX "AccountNotification_userId_readAt_createdAt_idx" ON "AccountNotification"("userId", "readAt", "createdAt");

ALTER TABLE "AccountNotification"
    ADD CONSTRAINT "AccountNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
