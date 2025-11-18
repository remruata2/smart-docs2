-- Drop file_no from category_list if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'category_list' AND column_name = 'file_no'
  ) THEN
    ALTER TABLE "category_list" DROP COLUMN "file_no";
  END IF;
END$$;

-- Add district to file_list if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_list' AND column_name = 'district'
  ) THEN
    ALTER TABLE "file_list" ADD COLUMN "district" VARCHAR(50);
  END IF;
END$$;