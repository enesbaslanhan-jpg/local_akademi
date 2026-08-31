-- FATURA KIMLIK BILGISI
--
-- Odeme calisiyordu ama fatura kesilebilecek hicbir bilgi
-- toplanmiyordu: PayTR token'ina user_address ve user_phone olarak
-- "Belirtilmedi" gidiyordu.
--
-- Abonelik basina degil KULLANICI basina (userId unique): abonelik
-- iptal edilip yeniden baslatildiginda fatura bilgisi tekrar
-- sorulmamali.
--
-- NOT: `prisma migrate diff` ciktisi bir de
-- `ALTER TYPE "IntegrationProvider" ADD VALUE 'AMAZON'` uretti; o
-- SATIR BILEREK ALINMADI. Bu, gelistirme veritabaninin
-- 20260826100000_amazon_provider gocunu hic almamis olmasindan gelen
-- yerel sapma; buraya yazmak sunucuda ayni degeri ikinci kez eklemeye
-- calisip gocu dusururdu.

-- CreateEnum
CREATE TYPE "BillingProfileType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "BillingProfileType" NOT NULL DEFAULT 'INDIVIDUAL',
    "title" TEXT NOT NULL,
    "tckn" TEXT,
    "vkn" TEXT,
    "taxOffice" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_userId_key" ON "BillingProfile"("userId");

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
