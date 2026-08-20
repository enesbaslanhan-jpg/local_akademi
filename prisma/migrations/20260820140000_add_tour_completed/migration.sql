-- Karsilama turu bayragi.
--
-- ANKETTEN AYRI tutuluyor: `onboardingCompleted` profil anketini
-- isaretliyor, turu degil. Ikisi ayni alana baglansaydi anketi
-- sifirlayan kullanici turu goremez, ya da tersi olurdu.
--
-- Boolean degil TIMESTAMP: turu ne zaman bitirdigi ileride "yeni
-- ozellik turu" gostermek icin lazim olabilir; bir tarih hem
-- "bitirdi mi" sorusuna hem "ne zaman" sorusuna cevap verir.

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "tourCompletedAt" TIMESTAMP(3);
