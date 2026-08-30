-- Amazon pazaryeri provider'i etiket olarak ekleniyor.
--
-- Amazon SP-API gelistirici hesabi ve onay sureci istedigi icin
-- gercek bagdastirici YAZILMADI: katalogda "Yakinda" karti olarak
-- duracak. Bu goc yalnizca enum'a yeni deger ekler; var olan
-- hicbir satira dokunmaz.
--
-- 🔴 WOOCOMMERCE degeri bilerek KALDI: PostgreSQL'de enum degeri
-- kaldirmak tipi yeniden yaratmayi gerektirir, bu olcekte gereksiz
-- risk. Deger artik katalogda olmadigi icin kullaniciya gorunmez.
--
-- NOT: PostgreSQL 12+ 'ALTER TYPE ... ADD VALUE' transaction icinde
-- calisir (yeni deger ayni transaction'da KULLANILMADIGI surece).
-- Bu goc yalnizca degeri ekler, kullanmaz.

ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'AMAZON';
