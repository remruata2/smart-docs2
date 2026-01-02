-- CreateEnum
CREATE TYPE "textbook_status" AS ENUM ('DRAFT', 'PARSING', 'GENERATING', 'REVIEWING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "chapter_gen_status" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'FAILED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "textbook_image_type" AS ENUM ('DIAGRAM', 'CHART', 'MAP', 'ILLUSTRATION', 'COVER', 'GRAPH', 'ANATOMY', 'CIRCUIT');

-- CreateEnum
CREATE TYPE "textbook_generation_job_type" AS ENUM ('PARSE_SYLLABUS', 'GENERATE_CHAPTER', 'GENERATE_QUESTIONS', 'GENERATE_IMAGE', 'COMPILE_PDF', 'FULL_TEXTBOOK');

-- CreateEnum
CREATE TYPE "textbook_job_status" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "textbooks" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "class_level" VARCHAR(20) NOT NULL,
    "stream" VARCHAR(50),
    "subject_name" VARCHAR(255),
    "board_id" TEXT DEFAULT 'MBSE',
    "academic_year" VARCHAR(20),
    "author" VARCHAR(255),
    "raw_syllabus" TEXT,
    "status" "textbook_status" NOT NULL DEFAULT 'DRAFT',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "cover_image_url" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "textbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_units" (
    "id" SERIAL NOT NULL,
    "textbook_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "textbook_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_chapters" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "chapter_number" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "raw_syllabus_text" TEXT,
    "subtopics" JSONB,
    "content_markdown" TEXT,
    "content_html" TEXT,
    "learning_outcomes" JSONB,
    "key_takeaways" JSONB,
    "neet_relevant" BOOLEAN NOT NULL DEFAULT false,
    "jee_relevant" BOOLEAN NOT NULL DEFAULT false,
    "cuet_relevant" BOOLEAN NOT NULL DEFAULT false,
    "exam_highlights" JSONB,
    "mcq_questions" JSONB,
    "short_questions" JSONB,
    "long_questions" JSONB,
    "model_used" VARCHAR(100),
    "tokens_used" JSONB,
    "generation_time_ms" INTEGER,
    "status" "chapter_gen_status" NOT NULL DEFAULT 'PENDING',
    "generation_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "textbook_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_images" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "type" "textbook_image_type" NOT NULL,
    "prompt" TEXT NOT NULL,
    "alt_text" VARCHAR(255) NOT NULL,
    "image_url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "model_used" VARCHAR(100),
    "generation_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "textbook_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_generation_jobs" (
    "id" SERIAL NOT NULL,
    "textbook_id" INTEGER NOT NULL,
    "job_type" "textbook_generation_job_type" NOT NULL,
    "status" "textbook_job_status" NOT NULL DEFAULT 'QUEUED',
    "target_id" INTEGER,
    "input_data" JSONB,
    "output_data" JSONB,
    "error_message" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "textbook_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "textbooks_status_created_at_idx" ON "textbooks"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "textbooks_board_id_class_level_idx" ON "textbooks"("board_id", "class_level");

-- CreateIndex
CREATE INDEX "textbooks_created_by_idx" ON "textbooks"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "textbook_units_textbook_id_order_key" ON "textbook_units"("textbook_id", "order");

-- CreateIndex
CREATE INDEX "textbook_chapters_status_idx" ON "textbook_chapters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "textbook_chapters_unit_id_order_key" ON "textbook_chapters"("unit_id", "order");

-- CreateIndex
CREATE INDEX "textbook_images_chapter_id_type_idx" ON "textbook_images"("chapter_id", "type");

-- CreateIndex
CREATE INDEX "textbook_generation_jobs_status_created_at_idx" ON "textbook_generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "textbook_generation_jobs_textbook_id_job_type_idx" ON "textbook_generation_jobs"("textbook_id", "job_type");

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_units" ADD CONSTRAINT "textbook_units_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_chapters" ADD CONSTRAINT "textbook_chapters_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "textbook_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_images" ADD CONSTRAINT "textbook_images_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "textbook_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_generation_jobs" ADD CONSTRAINT "textbook_generation_jobs_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
