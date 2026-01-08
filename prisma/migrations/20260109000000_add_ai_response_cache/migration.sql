-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_response_cache" (
    "id" SERIAL PRIMARY KEY,
    "cache_key" VARCHAR(255) NOT NULL,
    "query_type" VARCHAR(50) NOT NULL,
    "chapter_id" BIGINT,
    "subject_id" BIGINT,
    "question" TEXT NOT NULL,
    "response_text" TEXT NOT NULL,
    "input_tokens" INTEGER DEFAULT 0,
    "output_tokens" INTEGER DEFAULT 0,
    "hit_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ(6) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ai_response_cache_cache_key_key" ON "ai_response_cache"("cache_key");

-- CreateIndex for expiration cleanup
CREATE INDEX IF NOT EXISTS "idx_ai_response_cache_expires" ON "ai_response_cache"("expires_at");

-- CreateIndex for chapter/subject lookup
CREATE INDEX IF NOT EXISTS "idx_ai_response_cache_chapter" ON "ai_response_cache"("chapter_id");
CREATE INDEX IF NOT EXISTS "idx_ai_response_cache_subject" ON "ai_response_cache"("subject_id");
