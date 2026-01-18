-- Redesign the Exam model for categorization purposes
-- This migration transforms exam from a schedule-based model to a categorization model

-- Step 1: Drop existing foreign key and indexes on exams table
DROP INDEX IF EXISTS "exams_program_id_idx";
DROP INDEX IF EXISTS "exams_date_idx";

-- Step 2: Add new columns to exams table with defaults for existing data
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "code" VARCHAR(50);
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "short_name" VARCHAR(100);
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "exam_type" VARCHAR(30) DEFAULT 'board';
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "display_order" INTEGER DEFAULT 0;

-- Step 3: Migrate existing data - use title as both code and name
UPDATE "exams" SET 
  "code" = UPPER(REPLACE(REPLACE("title", ' ', '_'), '-', '_')),
  "short_name" = "title"
WHERE "code" IS NULL;

-- Step 4: Rename 'title' column to 'name'
ALTER TABLE "exams" RENAME COLUMN "title" TO "name";

-- Step 5: Make code required and unique
ALTER TABLE "exams" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "exams" ADD CONSTRAINT "exams_code_key" UNIQUE ("code");

-- Step 6: Update name column type
ALTER TABLE "exams" ALTER COLUMN "name" TYPE VARCHAR(255);

-- Step 7: Drop old columns (program_id, date)
ALTER TABLE "exams" DROP COLUMN IF EXISTS "program_id";
ALTER TABLE "exams" DROP COLUMN IF EXISTS "date";

-- Step 8: Add self-referential foreign key for parent_id
ALTER TABLE "exams" ADD CONSTRAINT "exams_parent_id_fkey" 
  FOREIGN KEY ("parent_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Add new indexes
CREATE INDEX "exams_exam_type_idx" ON "exams"("exam_type");
CREATE INDEX "exams_is_active_display_order_idx" ON "exams"("is_active", "display_order");

-- Step 10: Add exam_id column to subjects table
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "exam_id" TEXT;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_exam_id_fkey" 
  FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "subjects_exam_id_idx" ON "subjects"("exam_id");

-- Step 11: Add exam_id column to syllabi table
ALTER TABLE "syllabi" ADD COLUMN IF NOT EXISTS "exam_id" TEXT;
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_exam_id_fkey" 
  FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "syllabi_exam_id_idx" ON "syllabi"("exam_id");

-- Step 12: Add exam_id column to textbooks table
ALTER TABLE "textbooks" ADD COLUMN IF NOT EXISTS "exam_id" TEXT;
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_exam_id_fkey" 
  FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "textbooks_exam_id_idx" ON "textbooks"("exam_id");
