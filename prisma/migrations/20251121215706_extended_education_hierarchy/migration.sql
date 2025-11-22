/*
  Warnings:

  - You are about to drop the column `board_id` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `class_level` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `school_id` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `subject_focus` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `board_id` on the `subjects` table. All the data in the column will be lost.
  - You are about to drop the column `class_level` on the `subjects` table. All the data in the column will be lost.
  - You are about to drop the `schools` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[program_id,name]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `program_id` to the `subjects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_board_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_school_id_fkey";

-- DropForeignKey
ALTER TABLE "schools" DROP CONSTRAINT "schools_board_id_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_board_id_fkey";

-- DropIndex
DROP INDEX "profiles_board_id_idx";

-- DropIndex
DROP INDEX "profiles_school_id_idx";

-- DropIndex
DROP INDEX "subjects_board_id_class_level_idx";

-- DropIndex
DROP INDEX "subjects_board_id_name_class_level_key";

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'academic';

-- AlterTable
ALTER TABLE "chapters" ALTER COLUMN "is_global" SET DEFAULT false;

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "board_id",
DROP COLUMN "class_level",
DROP COLUMN "school_id",
DROP COLUMN "subject_focus",
ADD COLUMN     "institution_id" BIGINT,
ADD COLUMN     "program_id" INTEGER;

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "board_id",
DROP COLUMN "class_level",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "program_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "schools";

-- CreateTable
CREATE TABLE "institutions" (
    "id" BIGSERIAL NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "license_expiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" SERIAL NOT NULL,
    "board_id" TEXT NOT NULL,
    "institution_id" BIGINT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "level" TEXT,
    "duration_years" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institutions_board_id_is_active_idx" ON "institutions"("board_id", "is_active");

-- CreateIndex
CREATE INDEX "institutions_type_idx" ON "institutions"("type");

-- CreateIndex
CREATE INDEX "programs_board_id_level_idx" ON "programs"("board_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "programs_board_id_institution_id_name_key" ON "programs"("board_id", "institution_id", "name");

-- CreateIndex
CREATE INDEX "boards_type_idx" ON "boards"("type");

-- CreateIndex
CREATE INDEX "profiles_institution_id_idx" ON "profiles"("institution_id");

-- CreateIndex
CREATE INDEX "profiles_program_id_idx" ON "profiles"("program_id");

-- CreateIndex
CREATE INDEX "subjects_program_id_idx" ON "subjects"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_program_id_name_key" ON "subjects"("program_id", "name");

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
