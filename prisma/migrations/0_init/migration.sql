-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('gemini', 'openai', 'anthropic', 'llamaparse', 'openrouter');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_IN_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "chapter_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired');

-- CreateEnum
CREATE TYPE "usage_type" AS ENUM ('file_upload', 'chat_message', 'document_export', 'ai_processing');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'staff', 'user');

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
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
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

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "chapter_chunk_boards" (
    "chunk_id" BIGINT NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "chapter_chunk_boards_pkey" PRIMARY KEY ("chunk_id","board_id")
);

-- CreateTable
CREATE TABLE "chapter_chunks" (
    "id" BIGSERIAL NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "page_number" INTEGER,
    "bbox" JSONB,
    "search_vector" tsvector,
    "semantic_vector" vector,
    "subject_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_pages" (
    "id" BIGSERIAL NOT NULL,
    "chapter_id" BIGINT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_pages_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" BIGINT,
    "institution_id" BIGINT,
    "program_id" INTEGER,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "program_id" INTEGER NOT NULL,
    "term" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR(255),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "idx_ai_api_keys_active_priority" ON "ai_api_keys"("provider" ASC, "active" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "idx_ai_models_active_priority" ON "ai_models"("provider" ASC, "active" ASC, "priority" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_model_provider_name" ON "ai_models"("provider" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "boards_country_id_is_active_idx" ON "boards"("country_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "boards_type_idx" ON "boards"("type" ASC);

-- CreateIndex
CREATE INDEX "idx_category_list_user" ON "category_list"("user_id" ASC);

-- CreateIndex
CREATE INDEX "chapter_chunk_boards_board_id_idx" ON "chapter_chunk_boards"("board_id" ASC);

-- CreateIndex
CREATE INDEX "chapter_chunks_chapter_id_chunk_index_idx" ON "chapter_chunks"("chapter_id" ASC, "chunk_index" ASC);

-- CreateIndex
CREATE INDEX "chapter_chunks_search_vector_idx" ON "chapter_chunks" USING GIN ("search_vector" tsvector_ops);

-- CreateIndex
CREATE INDEX "chapter_chunks_semantic_vector_idx" ON "chapter_chunks"("semantic_vector" ASC);

-- CreateIndex
CREATE INDEX "chapter_chunks_subject_id_idx" ON "chapter_chunks"("subject_id" ASC);

-- CreateIndex
CREATE INDEX "chapter_pages_chapter_id_page_number_idx" ON "chapter_pages"("chapter_id" ASC, "page_number" ASC);

-- CreateIndex
CREATE INDEX "chapters_accessible_boards_idx" ON "chapters" USING GIN ("accessible_boards" array_ops);

-- CreateIndex
CREATE INDEX "chapters_processing_status_idx" ON "chapters"("processing_status" ASC);

-- CreateIndex
CREATE INDEX "chapters_subject_id_chapter_number_idx" ON "chapters"("subject_id" ASC, "chapter_number" ASC);

-- CreateIndex
CREATE INDEX "idx_conversation_messages_conversation" ON "conversation_messages"("conversation_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_conversations_user_pinned" ON "conversations"("user_id" ASC, "is_pinned" ASC, "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_user_updated" ON "conversations"("user_id" ASC, "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_document_pages_file_page" ON "document_pages"("file_id" ASC, "page_number" ASC);

-- CreateIndex
CREATE INDEX "idx_file_chunks_file" ON "file_chunks"("file_id" ASC);

-- CreateIndex
CREATE INDEX "idx_file_chunks_search_vector" ON "file_chunks" USING GIN ("search_vector" tsvector_ops);

-- CreateIndex
CREATE INDEX "idx_file_chunks_vector" ON "file_chunks"("semantic_vector" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_category" ON "file_list"("category" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_entry_date" ON "file_list"("entry_date_real" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_parsing_status" ON "file_list"("parsing_status" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_user" ON "file_list"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_search_vector" ON "file_list" USING GIN ("search_vector" tsvector_ops);

-- CreateIndex
CREATE INDEX "idx_semantic_vector" ON "file_list"("semantic_vector" ASC);

-- CreateIndex
CREATE INDEX "institutions_board_id_is_active_idx" ON "institutions"("board_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "institutions_type_idx" ON "institutions"("type" ASC);

-- CreateIndex
CREATE INDEX "profiles_institution_id_idx" ON "profiles"("institution_id" ASC);

-- CreateIndex
CREATE INDEX "profiles_program_id_idx" ON "profiles"("program_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "programs_board_id_institution_id_name_key" ON "programs"("board_id" ASC, "institution_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "programs_board_id_level_idx" ON "programs"("board_id" ASC, "level" ASC);

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions"("quiz_id" ASC);

-- CreateIndex
CREATE INDEX "quizzes_subject_id_idx" ON "quizzes"("subject_id" ASC);

-- CreateIndex
CREATE INDEX "quizzes_user_id_idx" ON "quizzes"("user_id" ASC);

-- CreateIndex
CREATE INDEX "study_materials_chapter_id_idx" ON "study_materials"("chapter_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "study_materials_chapter_id_key" ON "study_materials"("chapter_id" ASC);

-- CreateIndex
CREATE INDEX "subjects_program_id_idx" ON "subjects"("program_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_program_id_name_key" ON "subjects"("program_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "idx_subscription_plans_active" ON "subscription_plans"("is_active" ASC, "is_default" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_tracking_period" ON "usage_tracking"("period_start" ASC, "period_end" ASC);

-- CreateIndex
CREATE INDEX "idx_usage_tracking_user_type" ON "usage_tracking"("user_id" ASC, "usage_type" ASC, "period_start" ASC);

-- CreateIndex
CREATE INDEX "idx_user_email" ON "user"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username" ASC);

-- CreateIndex
CREATE INDEX "user_points_user_id_idx" ON "user_points"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions"("status" ASC, "current_period_end" ASC);

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_razorpay" ON "user_subscriptions"("razorpay_subscription_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_razorpay_subscription_id_key" ON "user_subscriptions"("razorpay_subscription_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id" ASC);

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_list" ADD CONSTRAINT "category_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chapter_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunks" ADD CONSTRAINT "chapter_chunks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_pages" ADD CONSTRAINT "chapter_pages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_list" ADD CONSTRAINT "file_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

