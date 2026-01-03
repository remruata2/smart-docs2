-- Add name column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'name'
    ) THEN
        ALTER TABLE "user" ADD COLUMN "name" VARCHAR(255);
    END IF;
END $$;

-- Add image column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'image'
    ) THEN
        ALTER TABLE "user" ADD COLUMN "image" TEXT;
    END IF;
END $$;
