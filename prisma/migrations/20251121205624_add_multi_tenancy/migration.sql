-- AlterTable
ALTER TABLE "file_list" ADD COLUMN     "parsed_at" TIMESTAMPTZ(6),
ADD COLUMN     "parsing_error" TEXT,
ADD COLUMN     "parsing_status" VARCHAR(20) DEFAULT 'pending';

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

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" BIGSERIAL NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT,
    "license_expiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "board_id" TEXT NOT NULL,
    "school_id" BIGINT,
    "class_level" INTEGER,
    "subject_focus" TEXT[],
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" BIGINT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "board_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "class_level" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

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
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "parsed_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "chapter_chunk_boards" (
    "chunk_id" BIGINT NOT NULL,
    "board_id" TEXT NOT NULL,

    CONSTRAINT "chapter_chunk_boards_pkey" PRIMARY KEY ("chunk_id","board_id")
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

-- CreateIndex
CREATE INDEX "idx_document_pages_file_page" ON "document_pages"("file_id", "page_number");

-- CreateIndex
CREATE INDEX "idx_file_chunks_file" ON "file_chunks"("file_id");

-- CreateIndex
CREATE INDEX "idx_file_chunks_search_vector" ON "file_chunks" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "idx_file_chunks_vector" ON "file_chunks"("semantic_vector");

-- CreateIndex
CREATE INDEX "boards_country_id_is_active_idx" ON "boards"("country_id", "is_active");

-- CreateIndex
CREATE INDEX "schools_board_id_is_active_idx" ON "schools"("board_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_board_id_idx" ON "profiles"("board_id");

-- CreateIndex
CREATE INDEX "profiles_school_id_idx" ON "profiles"("school_id");

-- CreateIndex
CREATE INDEX "subjects_board_id_class_level_idx" ON "subjects"("board_id", "class_level");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_board_id_name_class_level_key" ON "subjects"("board_id", "name", "class_level");

-- CreateIndex
CREATE INDEX "chapters_subject_id_chapter_number_idx" ON "chapters"("subject_id", "chapter_number");

-- CreateIndex
CREATE INDEX "chapters_accessible_boards_idx" ON "chapters" USING GIN ("accessible_boards");

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
CREATE INDEX "chapter_pages_chapter_id_page_number_idx" ON "chapter_pages"("chapter_id", "page_number");

-- CreateIndex
CREATE INDEX "idx_file_list_parsing_status" ON "file_list"("parsing_status");

-- AddForeignKey
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunks" ADD CONSTRAINT "chapter_chunks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chapter_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_chunk_boards" ADD CONSTRAINT "chapter_chunk_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_pages" ADD CONSTRAINT "chapter_pages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_file_list_semantic_vector" RENAME TO "idx_semantic_vector";
