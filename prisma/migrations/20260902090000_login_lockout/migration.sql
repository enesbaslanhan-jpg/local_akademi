-- HESAP BAZLI KABA KUVVET KORUMASI
--
-- Giris sinirlamasi bugune kadar YALNIZ IP basinaydi:
-- POST /auth/login icin 10/dakika (auth.ts). Bu sinir tek kaynaktan gelen
-- saldiriyi kesiyor ama iki yonden yetersizdi:
--
--   1. IP donduren bir saldirgan ayni hesaba yuzlerce IP'den deneme
--      dagitabiliyordu; hesap basina TOPLAM bir sinir yoktu.
--   2. Tersinden, tek bir ofis NAT'i arkasindaki tum kullanicilar ayni
--      10/dk'yi paylasiyordu.
--
-- Sayac basarili giriste sifirlaniyor; kilit suresi dolunca kendiliginden
-- kalkiyor. Yonetici mudahalesi gerektirmiyor -- bu bir ceza degil hiz kesme.
--
-- Varsayilanlar mevcut satirlar icin de guvenli: 0 deneme, kilit yok.

ALTER TABLE "User" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
