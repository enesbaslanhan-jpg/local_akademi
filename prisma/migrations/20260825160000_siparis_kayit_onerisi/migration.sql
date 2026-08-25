-- Pazaryeri siparislerinden GUNLUK OZET kayit onerisi.
--
-- `documentId` artik NULL olabiliyor: pazaryeri kaynakli onerilerde
-- yuklenmis bir belge yok. Mevcut satirlarin hepsi belge kaynakli ve
-- dolu oldugu icin bu genisletme veri kaybetmiyor.
ALTER TABLE "DocumentSuggestion" ALTER COLUMN "documentId" DROP NOT NULL;

-- Kaynagin tekil kimligi; ornek: "marketplace:TRENDYOL:2026-08-24".
ALTER TABLE "DocumentSuggestion" ADD COLUMN "sourceKey" TEXT;

-- 🔴 TEKRAR KORUMASI. Esitleme ayni gunu HER turda yeniden gorur;
-- bu kisit olmadan onay kuyrugu ayni gunun kopyalariyla dolardi.
-- NULL degerler Postgres'te benzersizlik kisitini tetiklemez, yani
-- belge kaynakli mevcut satirlar etkilenmez.
CREATE UNIQUE INDEX "DocumentSuggestion_workspaceId_sourceKey_key"
  ON "DocumentSuggestion"("workspaceId", "sourceKey");
