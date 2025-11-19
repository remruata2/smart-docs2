-- AlterTable
ALTER TABLE "category_list" ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "file_list" ADD COLUMN     "user_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_category_list_user" ON "category_list"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_list_user" ON "file_list"("user_id");

-- AddForeignKey
ALTER TABLE "category_list" ADD CONSTRAINT "category_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_list" ADD CONSTRAINT "file_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
