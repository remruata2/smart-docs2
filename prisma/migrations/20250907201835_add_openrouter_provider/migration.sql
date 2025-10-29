-- Incremental migration: add 'openrouter' to Provider enum
-- This replaces a previous full-schema migration that caused conflicts in shadow DB.

-- Ensure pgvector is available for environments that rely on it (safe no-op if absent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new enum value if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'Provider' AND e.enumlabel = 'openrouter'
  ) THEN
    ALTER TYPE "Provider" ADD VALUE 'openrouter';
  END IF;
END$$;
