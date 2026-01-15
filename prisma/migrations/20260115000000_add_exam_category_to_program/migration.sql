-- Add exam_category column to programs table
-- This field allows explicit control over quiz difficulty calibration
-- Values: academic_board, engineering, medical, government_prelims, government_mains, banking, university, general

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS exam_category VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN programs.exam_category IS 'Exam category for quiz difficulty calibration. Values: academic_board, engineering, medical, government_prelims, government_mains, banking, university, general';
