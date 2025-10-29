/*
  Warnings:

  - You are about to drop the column `file_no` on the `file_list` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_file_list_file_no";

-- AlterTable
ALTER TABLE "file_list" DROP COLUMN "file_no";
