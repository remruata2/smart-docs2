-- DropForeignKey
ALTER TABLE "chapter_pages" DROP CONSTRAINT "chapter_pages_chapter_id_fkey";

-- AlterTable
ALTER TABLE "chapter_chunks" DROP COLUMN "bbox";

-- DropTable
DROP TABLE "chapter_pages";

