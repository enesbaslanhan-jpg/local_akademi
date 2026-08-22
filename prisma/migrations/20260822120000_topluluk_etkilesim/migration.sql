-- TOPLULUK ETKILESIM KATMANI (22.08.2026)
--
-- Yanit ve alinti AYRI BIR MODEL DEGIL: X'te bir yanit kendisi de bir
-- gonderidir. CommunityPost'a iki kendine-referans eklemek, medya eki,
-- sikayet mekanizmasi, kaldirma yolu ve yetki kontrolunun ikinci bir
-- kopyasini yazmaktan kurtariyor.
--
-- DIKKAT -- bu gocun tek gercek riski: `parentId` eklendigi an yanitlar
-- ana akisa karisir. Besleme sorgusuna `parentId IS NULL` kosulu
-- konmazsa akis yanit seliyle dolar. Kod tarafinda o kosul eklendi ve
-- testle korunuyor (tests/topluluk-etkilesim.test.ts).

ALTER TABLE "CommunityPost" ADD COLUMN "parentId" TEXT;
ALTER TABLE "CommunityPost" ADD COLUMN "quotedPostId" TEXT;

-- Yanit: ust gonderinin SATIRI gercekten silinirse yanitlar da gider.
-- Pratikte nadir; kaldirma yumusak (status = 'removed'), satir durur.
ALTER TABLE "CommunityPost"
  ADD CONSTRAINT "CommunityPost_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "CommunityPost"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Alinti: SET NULL. Alintilanan satir silinirse alintinin KENDISI ayakta
-- kalir ve "kaynak bulunamiyor" gosterir. CASCADE olsaydi baskasinin
-- yazdigi gonderi de silinirdi.
ALTER TABLE "CommunityPost"
  ADD CONSTRAINT "CommunityPost_quotedPostId_fkey"
  FOREIGN KEY ("quotedPostId") REFERENCES "CommunityPost"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CommunityPost_parentId_createdAt_idx"
  ON "CommunityPost"("parentId", "createdAt");
CREATE INDEX "CommunityPost_quotedPostId_idx"
  ON "CommunityPost"("quotedPostId");

-- Begeni
CREATE TABLE "CommunityLike" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityLike_pkey" PRIMARY KEY ("id")
);

-- Iki kez begenmek tek kayit uretmeli; sayimin dogrulugu buna bagli.
CREATE UNIQUE INDEX "CommunityLike_userId_postId_key" ON "CommunityLike"("userId", "postId");
CREATE INDEX "CommunityLike_postId_idx" ON "CommunityLike"("postId");

ALTER TABLE "CommunityLike"
  ADD CONSTRAINT "CommunityLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityLike"
  ADD CONSTRAINT "CommunityLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Kaydetme ("kaydettiklerim")
CREATE TABLE "CommunityBookmark" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityBookmark_userId_postId_key" ON "CommunityBookmark"("userId", "postId");
CREATE INDEX "CommunityBookmark_userId_createdAt_idx" ON "CommunityBookmark"("userId", "createdAt");

ALTER TABLE "CommunityBookmark"
  ADD CONSTRAINT "CommunityBookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityBookmark"
  ADD CONSTRAINT "CommunityBookmark_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
