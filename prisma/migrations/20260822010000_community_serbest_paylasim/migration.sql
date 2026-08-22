-- TOPLULUK: X benzeri serbest paylasim.
--
-- Iki degisiklik, ikisi de urun kararindan geliyor (22.08.2026):
--
-- 1. BASLIK ARTIK ZORUNLU DEGIL.
--    Gonderi bicimi "baslik + ozet"ten tek metin kutusuna gecti. Eski
--    gonderiler basliklarini KORUYOR; yalniz yenilerinde baslik yok.
--    Sutun silinmiyor -- veri kaybi olmadan geri donulebilir olsun.
--
-- 2. "removed" DURUMU EKLENIYOR (veri degil, anlam degisikligi).
--    Yayimlanmis bir gonderi artik kaldirilabiliyor. Kaldirma GERCEK
--    SILME degil: `CommunityReport` kayitlari gonderiye bagli ve gercek
--    silme hem o kayitlari hem "kim neyi neden kaldirdi" izini goturur.
--    Durum alanina yeni bir deger yaziliyor; kolon degisikligi gerekmiyor,
--    bu yorum kaydi icin duruyor.

-- AlterTable
ALTER TABLE "CommunityPost" ALTER COLUMN "title" DROP NOT NULL;
