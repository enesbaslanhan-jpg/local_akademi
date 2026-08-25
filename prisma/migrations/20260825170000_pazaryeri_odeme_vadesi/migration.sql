-- Pazaryerinin odeme vadesi (gun). Kullanici girer; NULL ise vade
-- yazilmaz ve kayit takvime girmez.
--
-- Gomulu varsayilan BILEREK YOK: yanlis bir varsayilan, sessizce
-- hatali nakit tahmini uretirdi.
ALTER TABLE "IntegrationConnection" ADD COLUMN "payoutDelayDays" INTEGER;
