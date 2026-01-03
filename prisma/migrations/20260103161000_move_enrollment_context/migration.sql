-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_program_id_fkey";

-- DropIndex
DROP INDEX "profiles_institution_id_idx";

-- DropIndex
DROP INDEX "profiles_program_id_idx";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "institution_id",
DROP COLUMN "program_id";

-- AlterTable
ALTER TABLE "user_enrollments" ADD COLUMN     "institution_id" BIGINT,
ADD COLUMN     "program_id" INTEGER;

-- CreateIndex
CREATE INDEX "user_enrollments_institution_id_idx" ON "user_enrollments"("institution_id");

-- CreateIndex
CREATE INDEX "user_enrollments_program_id_idx" ON "user_enrollments"("program_id");

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
