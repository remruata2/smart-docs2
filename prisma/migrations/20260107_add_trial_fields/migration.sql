-- Add trial fields to user_enrollments table
-- Migration: add_trial_fields

ALTER TABLE "user_enrollments" ADD COLUMN IF NOT EXISTS "is_paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_enrollments" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(6) WITH TIME ZONE;
ALTER TABLE "user_enrollments" ADD COLUMN IF NOT EXISTS "payment_id" VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN "user_enrollments"."is_paid" IS 'Whether the user has purchased the course';
COMMENT ON COLUMN "user_enrollments"."trial_ends_at" IS 'When the trial period expires (null for free courses)';
COMMENT ON COLUMN "user_enrollments"."payment_id" IS 'Razorpay payment reference ID';
