-- CreateEnum
CREATE TYPE "chapter_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "quiz_regen_status" AS ENUM ('IDLE', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'institution', 'student', 'instructor');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "usage_type" AS ENUM ('file_upload', 'chat_message', 'document_export', 'ai_processing', 'quiz_generation', 'battle_match', 'ai_tutor_session', 'image_generation');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('gemini', 'openai', 'anthropic', 'llamaparse', 'openrouter');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('WAITING', 'STARTING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "syllabus_status" AS ENUM ('DRAFT', 'PARSING', 'PARSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "textbook_status" AS ENUM ('DRAFT', 'PARSING', 'GENERATING', 'REVIEWING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "chapter_gen_status" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'FAILED', 'REVIEWED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "image_gen_status" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "textbook_image_type" AS ENUM ('DIAGRAM', 'CHART', 'MAP', 'ILLUSTRATION', 'COVER', 'GRAPH', 'ANATOMY', 'CIRCUIT', 'FLOWCHART', 'INFOGRAPHIC', 'MINDMAP', 'MOLECULAR', 'ANATOMICAL', 'EXPERIMENTAL', 'GEOMETRIC', 'TIMELINE', 'COMPARISON', 'PHOTO', 'ICON');

-- CreateEnum
CREATE TYPE "textbook_generation_job_type" AS ENUM ('PARSE_SYLLABUS', 'GENERATE_CHAPTER', 'GENERATE_QUESTIONS', 'GENERATE_IMAGE', 'COMPILE_PDF', 'FULL_TEXTBOOK');

-- CreateEnum
CREATE TYPE "textbook_job_status" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "category_list" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,

    CONSTRAINT "category_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_list" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "content_format" VARCHAR(20),
    "doc1" TEXT,
    "entry_date" VARCHAR(50),
    "entry_date_real" DATE,
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "semantic_vector" vector,
    "user_id" INTEGER,
    "parsed_at" TIMESTAMPTZ(6),
    "parsing_error" TEXT,
    "parsing_status" VARCHAR(20) DEFAULT 'pending',

    CONSTRAINT "file_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_pages" (
    "id" SERIAL NOT NULL,
    "file_id" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_chunks" (
    "id" SERIAL NOT NULL,
    "file_id" INTEGER NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "page_number" INTEGER,
    "bbox" JSONB,
    "token_count" INTEGER,
    "search_vector" tsvector,
    "semantic_vector" vector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'student',
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR(255),
    "image" TEXT,
    "name" VARCHAR(255),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_enrollments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ(6),
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "institution_id" BIGINT,
    "program_id" INTEGER,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" VARCHAR(255),
    "trial_ends_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "board_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "instructor_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "title" VARCHAR(100),
    "social_links" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_message_at" TIMESTAMPTZ(6),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "chapter_id" BIGINT,
    "subject_id" INTEGER,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "token_count" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_api_keys" (
    "id" SERIAL NOT NULL,
    "provider" "Provider" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "api_key_enc" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" SERIAL NOT NULL,
    "provider" "Provider" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_response_cache" (
    "id" SERIAL NOT NULL,
    "cache_key" VARCHAR(255) NOT NULL,
    "query_type" VARCHAR(50) NOT NULL,
    "chapter_id" BIGINT,
    "subject_id" BIGINT,
    "question" TEXT NOT NULL,
    "response_text" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_yearly" DECIMAL(10,2),
    "razorpay_plan_id_monthly" VARCHAR(255),
    "razorpay_plan_id_yearly" VARCHAR(255),
    "features" JSONB,
    "limits" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "razorpay_subscription_id" VARCHAR(255),
    "razorpay_customer_id" VARCHAR(255),
    "razorpay_order_id" VARCHAR(255),
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "billing_cycle" "billing_cycle" NOT NULL DEFAULT 'monthly',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "usage_type" "usage_type" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" TEXT NOT NULL DEFAULT 'IN',
    "state" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'academic',
    "hide_textbook" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" BIGSERIAL NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT,
    "license_expiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" SERIAL NOT NULL,
    "board_id" TEXT NOT NULL,
    "institution_id" BIGINT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "level" TEXT,
    "duration_years" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exam_category" VARCHAR(50),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" BIGINT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "program_id" INTEGER NOT NULL,
    "term" TEXT,
    "exam_id" TEXT,
    "quizzes_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" INTEGER,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" BIGSERIAL NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "chapter_number" INTEGER,
    "content_json" JSONB NOT NULL,
    "version_id" TEXT NOT NULL,
    "accessible_boards" TEXT[],
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "parsed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "processing_status" "chapter_status" NOT NULL DEFAULT 'PENDING',
    "pdf_url" TEXT,
    "quiz_regen_status" "quiz_regen_status" NOT NULL DEFAULT 'IDLE',
    "quizzes_enabled" BOOLEAN NOT NULL DEFAULT true,
    "key_points" TEXT,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_chunks" (
    "id" BIGSERIAL NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "page_number" INTEGER,
    "search_vector" tsvector,
    "semantic_vector" vector,
    "subject_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_chunk_boards" (
    "chunk_id" BIGINT NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "chapter_chunk_boards_pkey" PRIMARY KEY ("chunk_id","board_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "chapter_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "QuizStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB NOT NULL,
    "user_answer" JSONB,
    "is_correct" BOOLEAN,
    "points" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "feedback" TEXT,
    "chapter_id" BIGINT,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "difficulty" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_points" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_materials" (
    "id" BIGSERIAL NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "summary" JSONB,
    "definitions" JSONB,
    "flashcards" JSONB,
    "mind_map" TEXT,
    "video_queries" TEXT[],
    "curated_videos" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "short_name" VARCHAR(100),
    "exam_type" VARCHAR(30) NOT NULL DEFAULT 'board',
    "parent_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "min_streak" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streak_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_topic" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'WAITING',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "settings" JSONB,
    "duration_minutes" INTEGER NOT NULL DEFAULT 5,
    "is_public" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_participants" (
    "id" TEXT NOT NULL,
    "battle_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "current_q_index" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_ready" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "points_change" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "battle_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabi" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "board" TEXT NOT NULL DEFAULT 'MBSE',
    "class_level" VARCHAR(20) NOT NULL,
    "stream" VARCHAR(50),
    "subject" VARCHAR(255) NOT NULL,
    "academic_year" VARCHAR(20),
    "raw_text" TEXT,
    "status" "syllabus_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "exam_category" VARCHAR(50) DEFAULT 'academic_board',
    "parent_syllabus_id" INTEGER,
    "syllabus_mode" VARCHAR(20) DEFAULT 'single',
    "exam_id" TEXT,

    CONSTRAINT "syllabi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_units" (
    "id" SERIAL NOT NULL,
    "syllabus_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "syllabus_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_chapters" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "chapter_number" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "subtopics" JSONB,

    CONSTRAINT "syllabus_chapters_pkey" PRIMARY KEY ("id")
);

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
    "compiled_pdf_url" TEXT,
    "subject_id" INTEGER,
    "syllabus_id" INTEGER,
    "content_style" VARCHAR(30) DEFAULT 'academic',
    "exam_id" TEXT,

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
    "content" TEXT,
    "generated_at" TIMESTAMPTZ(6),
    "pdf_url" TEXT,
    "summary" TEXT,
    "image_count" INTEGER,
    "long_answer_count" INTEGER,
    "max_words" INTEGER,
    "mcq_count" INTEGER,
    "min_words" INTEGER,
    "short_answer_count" INTEGER,

    CONSTRAINT "textbook_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_sections" (
    "id" TEXT NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "parent_id" TEXT,
    "order" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "status" "chapter_gen_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "textbook_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "textbook_images" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "type" "textbook_image_type" NOT NULL,
    "prompt" TEXT,
    "alt_text" VARCHAR(255),
    "image_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "model_used" VARCHAR(100),
    "generation_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_at" TIMESTAMPTZ(6),
    "placement" VARCHAR(255),
    "status" "image_gen_status" NOT NULL DEFAULT 'PENDING',
    "url" TEXT,
    "caption" VARCHAR(500),

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

-- CreateTable
CREATE TABLE "forum_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topics" (
    "id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_accepted_answer" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_likes" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" TEXT,
    "post_id" TEXT,
    "is_upvote" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" SERIAL NOT NULL,
    "order_id" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER,
    "plan_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "gateway_status" VARCHAR(100),
    "gateway_order_id" VARCHAR(255),
    "gateway_transaction_id" VARCHAR(255),
    "payment_method" VARCHAR(100),
    "description" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CourseToSubject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "idx_category_list_user" ON "category_list"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_list_category" ON "file_list"("category");

-- CreateIndex
CREATE INDEX "idx_file_list_entry_date" ON "file_list"("entry_date_real");

-- CreateIndex
CREATE INDEX "idx_search_vector" ON "file_list" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "idx_semantic_vector" ON "file_list"("semantic_vector");

-- CreateIndex
CREATE INDEX "idx_file_list_user" ON "file_list"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_list_parsing_status" ON "file_list"("parsing_status");

-- CreateIndex
CREATE INDEX "idx_document_pages_file_page" ON "document_pages"("file_id", "page_number");

-- CreateIndex
CREATE INDEX "idx_file_chunks_file" ON "file_chunks"("file_id");

-- CreateIndex
CREATE INDEX "idx_file_chunks_search_vector" ON "file_chunks" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "idx_file_chunks_vector" ON "file_chunks"("semantic_vector");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_enrollments_user_id_idx" ON "user_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "user_enrollments_course_id_idx" ON "user_enrollments"("course_id");

-- CreateIndex
CREATE INDEX "user_enrollments_institution_id_idx" ON "user_enrollments"("institution_id");

-- CreateIndex
CREATE INDEX "user_enrollments_program_id_idx" ON "user_enrollments"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_enrollments_user_id_course_id_key" ON "user_enrollments"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "instructors_user_id_key" ON "instructors"("user_id");

-- CreateIndex
CREATE INDEX "idx_conversations_user_updated" ON "conversations"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_user_pinned" ON "conversations"("user_id", "is_pinned", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_subject_id_idx" ON "conversations"("subject_id");

-- CreateIndex
CREATE INDEX "conversations_chapter_id_idx" ON "conversations"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_conversation_messages_conversation" ON "conversation_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_ai_api_keys_active_priority" ON "ai_api_keys"("provider", "active", "priority");

-- CreateIndex
CREATE INDEX "idx_ai_models_active_priority" ON "ai_models"("provider", "active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_model_provider_name" ON "ai_models"("provider", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_response_cache_cache_key_key" ON "ai_response_cache"("cache_key");

-- CreateIndex
CREATE INDEX "idx_ai_response_cache_expires" ON "ai_response_cache"("expires_at");

-- CreateIndex
CREATE INDEX "idx_ai_response_cache_chapter" ON "ai_response_cache"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_ai_response_cache_subject" ON "ai_response_cache"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "idx_subscription_plans_active" ON "subscription_plans"("is_active", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_razorpay_subscription_id_key" ON "user_subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_razorpay" ON "user_subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "idx_usage_tracking_user_type" ON "usage_tracking"("user_id", "usage_type", "period_start");

-- CreateIndex
CREATE INDEX "idx_usage_tracking_period" ON "usage_tracking"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "boards_country_id_is_active_idx" ON "boards"("country_id", "is_active");

-- CreateIndex
CREATE INDEX "boards_type_idx" ON "boards"("type");

-- CreateIndex
CREATE INDEX "institutions_board_id_is_active_idx" ON "institutions"("board_id", "is_active");

-- CreateIndex
CREATE INDEX "programs_board_id_level_idx" ON "programs"("board_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "programs_board_id_institution_id_name_key" ON "programs"("board_id", "institution_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "subjects_created_by_user_id_idx" ON "subjects"("created_by_user_id");

-- CreateIndex
CREATE INDEX "subjects_program_id_idx" ON "subjects"("program_id");

-- CreateIndex
CREATE INDEX "subjects_exam_id_idx" ON "subjects"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_program_id_name_created_by_user_id_key" ON "subjects"("program_id", "name", "created_by_user_id");

-- CreateIndex
CREATE INDEX "chapters_subject_id_chapter_number_idx" ON "chapters"("subject_id", "chapter_number");

-- CreateIndex
CREATE INDEX "chapters_accessible_boards_idx" ON "chapters" USING GIN ("accessible_boards");

-- CreateIndex
CREATE INDEX "chapters_processing_status_idx" ON "chapters"("processing_status");

-- CreateIndex
CREATE INDEX "chapter_chunks_chapter_id_chunk_index_idx" ON "chapter_chunks"("chapter_id", "chunk_index");

-- CreateIndex
CREATE INDEX "chapter_chunks_search_vector_idx" ON "chapter_chunks" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "chapter_chunks_semantic_vector_idx" ON "chapter_chunks"("semantic_vector");

-- CreateIndex
CREATE INDEX "chapter_chunks_subject_id_idx" ON "chapter_chunks"("subject_id");

-- CreateIndex
CREATE INDEX "chapter_chunk_boards_board_id_idx" ON "chapter_chunk_boards"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "quizzes_user_id_idx" ON "quizzes"("user_id");

-- CreateIndex
CREATE INDEX "quizzes_subject_id_idx" ON "quizzes"("subject_id");

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_questions_chapter_id_idx" ON "quiz_questions"("chapter_id");

-- CreateIndex
CREATE INDEX "questions_chapter_id_difficulty_question_type_idx" ON "questions"("chapter_id", "difficulty", "question_type");

-- CreateIndex
CREATE INDEX "user_points_user_id_idx" ON "user_points"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_materials_chapter_id_key" ON "study_materials"("chapter_id");

-- CreateIndex
CREATE INDEX "study_materials_chapter_id_idx" ON "study_materials"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "exams_code_key" ON "exams"("code");

-- CreateIndex
CREATE INDEX "exams_exam_type_idx" ON "exams"("exam_type");

-- CreateIndex
CREATE INDEX "exams_is_active_display_order_idx" ON "exams"("is_active", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "streak_badges_min_streak_key" ON "streak_badges"("min_streak");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE INDEX "user_badges_badge_id_idx" ON "user_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "learning_sessions_user_id_chapter_id_idx" ON "learning_sessions"("user_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "battles_code_key" ON "battles"("code");

-- CreateIndex
CREATE INDEX "battles_code_idx" ON "battles"("code");

-- CreateIndex
CREATE INDEX "battles_status_idx" ON "battles"("status");

-- CreateIndex
CREATE INDEX "battles_created_by_idx" ON "battles"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "battle_participants_battle_id_user_id_key" ON "battle_participants"("battle_id", "user_id");

-- CreateIndex
CREATE INDEX "syllabi_exam_id_idx" ON "syllabi"("exam_id");

-- CreateIndex
CREATE INDEX "syllabi_parent_syllabus_id_idx" ON "syllabi"("parent_syllabus_id");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_units_syllabus_id_order_key" ON "syllabus_units"("syllabus_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_chapters_unit_id_order_key" ON "syllabus_chapters"("unit_id", "order");

-- CreateIndex
CREATE INDEX "textbooks_exam_id_idx" ON "textbooks"("exam_id");

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
CREATE INDEX "textbook_sections_chapter_id_idx" ON "textbook_sections"("chapter_id");

-- CreateIndex
CREATE INDEX "textbook_sections_parent_id_idx" ON "textbook_sections"("parent_id");

-- CreateIndex
CREATE INDEX "textbook_images_chapter_id_type_idx" ON "textbook_images"("chapter_id", "type");

-- CreateIndex
CREATE INDEX "textbook_images_status_idx" ON "textbook_images"("status");

-- CreateIndex
CREATE INDEX "textbook_generation_jobs_status_created_at_idx" ON "textbook_generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "textbook_generation_jobs_textbook_id_job_type_idx" ON "textbook_generation_jobs"("textbook_id", "job_type");

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "forum_topics_slug_key" ON "forum_topics"("slug");

-- CreateIndex
CREATE INDEX "forum_topics_category_id_idx" ON "forum_topics"("category_id");

-- CreateIndex
CREATE INDEX "forum_topics_user_id_idx" ON "forum_topics"("user_id");

-- CreateIndex
CREATE INDEX "forum_topics_created_at_idx" ON "forum_topics"("created_at" DESC);

-- CreateIndex
CREATE INDEX "forum_posts_topic_id_idx" ON "forum_posts"("topic_id");

-- CreateIndex
CREATE INDEX "forum_posts_user_id_idx" ON "forum_posts"("user_id");

-- CreateIndex
CREATE INDEX "forum_posts_created_at_idx" ON "forum_posts"("created_at");

-- CreateIndex
CREATE INDEX "forum_likes_user_id_idx" ON "forum_likes"("user_id");

-- CreateIndex
CREATE INDEX "forum_likes_topic_id_idx" ON "forum_likes"("topic_id");

-- CreateIndex
CREATE INDEX "forum_likes_post_id_idx" ON "forum_likes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_forum_like_user_topic" ON "forum_likes"("user_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_forum_like_user_post" ON "forum_likes"("user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "_CourseToSubject_B_index" ON "_CourseToSubject"("B");

-- AddForeignKey
ALTER TABLE "category_list" ADD CONSTRAINT "category_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_list" ADD CONSTRAINT "file_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunks" ADD CONSTRAINT "chapter_chunks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chapter_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "streak_badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_parent_syllabus_id_fkey" FOREIGN KEY ("parent_syllabus_id") REFERENCES "syllabi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_chapters" ADD CONSTRAINT "syllabus_chapters_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "syllabus_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_units" ADD CONSTRAINT "textbook_units_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_chapters" ADD CONSTRAINT "textbook_chapters_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "textbook_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_sections" ADD CONSTRAINT "textbook_sections_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "textbook_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_sections" ADD CONSTRAINT "textbook_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "textbook_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_images" ADD CONSTRAINT "textbook_images_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "textbook_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbook_generation_jobs" ADD CONSTRAINT "textbook_generation_jobs_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "textbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSubject" ADD CONSTRAINT "_CourseToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSubject" ADD CONSTRAINT "_CourseToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

