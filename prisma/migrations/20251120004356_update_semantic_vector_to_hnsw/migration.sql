-- Drop the existing regular B-tree index on semantic_vector
DROP INDEX IF EXISTS "idx_semantic_vector";

-- First, ensure the semantic_vector column has dimensions specified
-- all-MiniLM-L6-v2 produces 384-dimensional embeddings
-- This will work even if the column already has dimensions (no-op)
DO $$
BEGIN
  -- Alter column to specify dimensions (384 for all-MiniLM-L6-v2)
  -- This is safe even if column already has dimensions
  ALTER TABLE "file_list" 
  ALTER COLUMN "semantic_vector" TYPE vector(384) 
  USING CASE 
    WHEN "semantic_vector" IS NULL THEN NULL
    ELSE "semantic_vector"::vector(384)
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- If column already has correct type or other error, continue
    RAISE NOTICE 'Column type update skipped or failed: %', SQLERRM;
END $$;

-- Create HNSW index for vector similarity search with cosine distance
-- This is required for efficient pgvector similarity searches
CREATE INDEX IF NOT EXISTS "idx_file_list_semantic_vector" 
ON "file_list" USING hnsw (semantic_vector vector_cosine_ops);

