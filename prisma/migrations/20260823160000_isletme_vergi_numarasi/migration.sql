-- ISLETME VERGI NUMARASI (23.08.2026)
--
-- e-Fatura XML'i okunmaya baslandi. Faturadan tutar, tarih ve taraflar
-- cikiyor ama bir sey cikmiyor: faturanin YONU.
--
-- Ayni XML hem gelen hem giden fatura olabilir; fark, faturadaki
-- taraflardan hangisinin KULLANICININ ISLETMESI oldugu. Bunu bilmenin
-- tek guvenilir yolu vergi numarasini karsilastirmak:
--
--   faturadaki ALICI  = bu numara  -> gelen fatura (borc)
--   faturadaki SATICI = bu numara  -> giden fatura (alacak)
--
-- Numara girilmemisse yon TAHMIN EDILMIYOR. Yanlis yon tahmini,
-- kullanicinin borcunu alacak olarak yazmak demektir; hic tahmin
-- etmemek ve sormak dogru olan.
--
-- Opsiyonel: mevcut calisma alanlarinin hicbirinde bu bilgi yok ve
-- zorunlu tutmak onlari kirardi. Kullanici girene kadar NULL kalir.

ALTER TABLE "BusinessWorkspace" ADD COLUMN "taxNumber" TEXT;
