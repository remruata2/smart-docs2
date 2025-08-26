-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('gemini', 'openai', 'anthropic', 'llamaparse');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'staff');

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
CREATE TABLE "category_list" (
    "id" SERIAL NOT NULL,
    "file_no" VARCHAR(100) NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_list" (
    "id" SERIAL NOT NULL,
    "file_no" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "doc1" TEXT,
    "entry_date" VARCHAR(50),
    "entry_date_real" DATE,
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "semantic_vector" vector,
    "content_format" VARCHAR(20),

    CONSTRAINT "file_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'staff',
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ai_api_keys_active_priority" ON "ai_api_keys"("provider" ASC, "active" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "idx_ai_models_active_priority" ON "ai_models"("provider" ASC, "active" ASC, "priority" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_model_provider_name" ON "ai_models"("provider" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_category" ON "file_list"("category" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_entry_date" ON "file_list"("entry_date_real" ASC);

-- CreateIndex
CREATE INDEX "idx_file_list_file_no" ON "file_list"("file_no" ASC);

-- CreateIndex
CREATE INDEX "idx_search_vector" ON "file_list" USING GIN ("search_vector" tsvector_ops ASC);

-- CreateIndex
CREATE INDEX "idx_semantic_vector" ON "file_list"("semantic_vector" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username" ASC);

