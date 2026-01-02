-- CreateEnum
CREATE TYPE "image_gen_status" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "chapter_gen_status" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "textbook_chapters" ADD COLUMN     "content" TEXT,
ADD COLUMN     "generated_at" TIMESTAMPTZ(6),
ADD COLUMN     "pdf_url" TEXT,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "textbook_images" ADD COLUMN     "generated_at" TIMESTAMPTZ(6),
ADD COLUMN     "placement" VARCHAR(255),
ADD COLUMN     "status" "image_gen_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "url" TEXT,
ALTER COLUMN "prompt" DROP NOT NULL,
ALTER COLUMN "alt_text" DROP NOT NULL,
ALTER COLUMN "image_url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "textbooks" ADD COLUMN     "compiled_pdf_url" TEXT;

-- CreateIndex
CREATE INDEX "textbook_images_status_idx" ON "textbook_images"("status");
