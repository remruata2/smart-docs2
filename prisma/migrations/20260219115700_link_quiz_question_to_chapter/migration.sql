-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN "chapter_id" BIGINT;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "quiz_questions_chapter_id_idx" ON "quiz_questions"("chapter_id");
