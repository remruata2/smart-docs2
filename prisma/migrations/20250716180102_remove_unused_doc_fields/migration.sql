/*
  Warnings:

  - You are about to drop the column `doc2` on the `file_list` table. All the data in the column will be lost.
  - You are about to drop the column `doc3` on the `file_list` table. All the data in the column will be lost.
  - You are about to drop the column `doc4` on the `file_list` table. All the data in the column will be lost.
  - You are about to drop the column `doc5` on the `file_list` table. All the data in the column will be lost.
  - You are about to drop the column `doc6` on the `file_list` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "file_list" DROP COLUMN "doc2",
DROP COLUMN "doc3",
DROP COLUMN "doc4",
DROP COLUMN "doc5",
DROP COLUMN "doc6";
