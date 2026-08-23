-- ISLETMEYE OZEL GELEN E-POSTA KUTUSU (23.08.2026)
--
-- Faz E'nin ikinci kanali: kullanici e-Fatura XML'ini uygulamaya elle
-- yuklemek yerine, muhasebe programindan dogrudan bir adrese
-- gonderebilsin.
--
-- ADRES NEDEN RASTGELE: isletme adindan ya da slugtan turetilseydi
-- (ornegin fatura-sisli-ticaret@) adresi tahmin eden herkes o isletmeye
-- belge gonderebilirdi. Rastgele yerel parca bunu tahmin isi olmaktan
-- cikariyor.
--
-- ⚠️ RASTGELELIK TEK BASINA GUVENLIK DEGIL. Adres bir kez sizarsa
-- (iletilen bir postada, ekran goruntusunde) sonsuza kadar acik kalirdi.
-- Bu yuzden gonderen ayrica DOGRULANMIS bir calisma alani uyesi olmali
-- ve postanin DKIM/SPF sonucu gecmeli. Uc katman birlikte calisiyor.
--
-- NULL = o calisma alaninin gelen kutusu KAPALI. Varsayilan bu:
-- kullanici acikca acmadan hicbir adres dinlenmiyor.

ALTER TABLE "BusinessWorkspace" ADD COLUMN "inboxKey" TEXT;

-- Adresten calisma alanina eslesme HER GELEN POSTADA yapiliyor; bu
-- sorgu sicak yolda. Ayrica iki calisma alanina ayni adres verilemez.
CREATE UNIQUE INDEX "BusinessWorkspace_inboxKey_key"
  ON "BusinessWorkspace"("inboxKey");
