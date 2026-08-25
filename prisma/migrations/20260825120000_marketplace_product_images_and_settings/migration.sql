-- Marketplace urunleri: provider gorseli + LocalKarar yerel ayarlari.
-- Yalnizca nullable kolon / default'lu boolean ekleme; mevcut veriye dokunmaz.

ALTER TABLE "MarketplaceProduct" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "images" JSONB;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "tags" JSONB;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "lowStockThresholdOverride" INTEGER;
ALTER TABLE "MarketplaceProduct" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
