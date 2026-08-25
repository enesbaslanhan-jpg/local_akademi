-- N11 pazaryeri provider'i eklenir.
--
-- Provider-bagimsiz sema DEGISMEZ: mevcut IntegrationConnection /
-- MarketplaceOrder / MarketplaceOrderItem / MarketplaceProduct
-- tablolari aynen kullanilir. Bu goc yalnizca enum'a yeni deger
-- ekler; var olan hicbir satira dokunmaz.
--
-- NOT: PostgreSQL 12+ 'ALTER TYPE ... ADD VALUE' transaction icinde
-- calisir (yeni deger ayni transaction'da KULLANILMADIGI surece).
-- Bu goc yalnizca degeri ekler, kullanmaz.

ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'N11';
