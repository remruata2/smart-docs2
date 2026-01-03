-- Safely drop constraints if they exist
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_institution_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE "profiles" DROP CONSTRAINT "profiles_institution_id_fkey";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_program_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE "profiles" DROP CONSTRAINT "profiles_program_id_fkey";
    END IF;
END $$;

-- Safely drop indexes if they exist
DROP INDEX IF EXISTS "profiles_institution_id_idx";
DROP INDEX IF EXISTS "profiles_program_id_idx";

-- Safely drop columns if they exist
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE "profiles" DROP COLUMN "institution_id";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'program_id'
    ) THEN
        ALTER TABLE "profiles" DROP COLUMN "program_id";
    END IF;
END $$;

-- Add columns to user_enrollments if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_enrollments' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE "user_enrollments" ADD COLUMN "institution_id" BIGINT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_enrollments' AND column_name = 'program_id'
    ) THEN
        ALTER TABLE "user_enrollments" ADD COLUMN "program_id" INTEGER;
    END IF;
END $$;

-- CreateIndex (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "user_enrollments_institution_id_idx" ON "user_enrollments"("institution_id");
CREATE INDEX IF NOT EXISTS "user_enrollments_program_id_idx" ON "user_enrollments"("program_id");

-- Add foreign keys if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_enrollments_institution_id_fkey' 
        AND table_name = 'user_enrollments'
    ) THEN
        ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_institution_id_fkey" 
        FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_enrollments_program_id_fkey' 
        AND table_name = 'user_enrollments'
    ) THEN
        ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_program_id_fkey" 
        FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
