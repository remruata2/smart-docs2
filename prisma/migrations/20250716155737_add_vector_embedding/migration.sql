/*
  Warnings:

  - You are about to drop the column `note_plain_text` on the `file_list` table. All the data in the column will be lost.

*/
-- Create vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "file_list" DROP COLUMN "note_plain_text",
ADD COLUMN     "semantic_vector" vector;

-- CreateIndex
CREATE INDEX "idx_semantic_vector" ON "file_list"("semantic_vector");
