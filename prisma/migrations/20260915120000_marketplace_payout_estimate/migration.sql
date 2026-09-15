-- Beklenen hakedis icin ortalama komisyon orani (kullanici girer; bos = tahmini).
ALTER TABLE "IntegrationConnection" ADD COLUMN "avgCommissionPercent" DECIMAL(5,2);

-- Olu ozellik temizligi: pazaryeri gunluk "kayit onerisi" hicbir ucta
-- listelenmiyordu, onaylanamiyordu. Siparisler artik dogrudan hesaba
-- giriyor (tracker-periods.ts). Kabul edilmis (kayda donusmus) oneriler
-- durur; yalniz bekleyenler silinir.
DELETE FROM "DocumentSuggestion"
WHERE "documentId" IS NULL
  AND "sourceKey" LIKE 'marketplace:%'
  AND "status" = 'proposed';
