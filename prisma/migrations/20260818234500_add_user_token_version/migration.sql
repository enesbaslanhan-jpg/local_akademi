-- Oturum iptali icin token surumu.
--
-- Gerekce: JWT 8 saat gecerliydi ve iptal edilemiyordu. Kullanici sifresini
-- degistirse bile calinmis bir token calismaya devam ediyordu. Artik token
-- icindeki surum kullanicinin surumuyle eslesmek zorunda; surum artirildiginda
-- o kullaniciya ait tum mevcut tokenlar aninda gecersiz olur.
--
-- Varsayilan 0: mevcut tokenlarda bu claim yok, kod eksik claim'i 0 sayar,
-- dolayisiyla dagitim aninda kimse oturumundan atilmaz.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
