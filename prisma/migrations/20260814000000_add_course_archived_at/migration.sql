-- Course arşiv desteği.
--
-- Yalnız şema değişikliği. Hiçbir Course kaydının verisi değiştirilmez;
-- yeni sütun tüm mevcut satırlarda NULL kalır, yani her kayıt bugünkü
-- ACTIVE/DRAFT durumunu aynen korur.
--
-- Arşiv sınırı Course seviyesidir. Lesson tablosuna dokunulmaz.
--
-- Geçerli durumlar:
--   ACTIVE   published = true  · archivedAt IS NULL
--   DRAFT    published = false · archivedAt IS NULL
--   ARCHIVED published = false · archivedAt IS NOT NULL

ALTER TABLE "Course" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Katalog sorgusunun yeni deseni: published + archivedAt IS NULL, sortOrder'a göre.
CREATE INDEX "Course_published_archivedAt_sortOrder_idx" ON "Course"("published", "archivedAt", "sortOrder");

-- Arşiv yönetimi ekranları için tekil filtre.
CREATE INDEX "Course_archivedAt_idx" ON "Course"("archivedAt");

-- Eski indeks yeni bileşik indeksin öneki tarafından karşılanıyor.
DROP INDEX IF EXISTS "Course_published_sortOrder_idx";
