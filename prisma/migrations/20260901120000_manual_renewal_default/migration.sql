-- ELLE YENILEMEYE DONUS
--
-- PayTR'nin cevabi (01.09.2026): kayitli karttan tahsilat yalniz
-- Direkt API + Non3D yetkisiyle mumkun. O yol kart numarasini ve
-- CVV'yi bizim sunucumuzdan gecirir; PCI-DSS kapsami SAQ A'dan SAQ
-- D'ye cikar ve Non3D ile ters ibraz sorumlulugu saticiya gecer.
-- Urun sahibi otomatik yenilemeden vazgecti.
--
-- Yalnizca VARSAYILAN degisiyor. `AUTO` degeri enum'da KALIYOR:
-- yetki ileride alinirsa yeni bir goc gerekmesin diye alan bastan
-- iki degerli tasarlanmisti.
--
-- Mevcut satirlar da guncelleniyor -- bugun uretimde abonelik satiri
-- yok (BILLING_STARTS_AT null), ama varsayilani degistirip eskileri
-- birakmak, sonradan bakan birine iki farkli gercek gosterirdi.

ALTER TABLE "Subscription" ALTER COLUMN "renewalMode" SET DEFAULT 'MANUAL';

UPDATE "Subscription" SET "renewalMode" = 'MANUAL' WHERE "renewalMode" = 'AUTO';
