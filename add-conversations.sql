-- Safe migration: Only adds conversation tables, doesn't modify existing data
-- Run this in your PostgreSQL client or command line

-- Step 1: Create enum for message roles
DO $$ BEGIN
    CREATE TYPE "message_role" AS ENUM ('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMPTZ(6),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false
);

-- Step 3: Create conversation_messages table
CREATE TABLE IF NOT EXISTS "conversation_messages" (
    "id" SERIAL PRIMARY KEY,
    "conversation_id" INTEGER NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "token_count" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "idx_conversations_user_updated" 
    ON "conversations"("user_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_conversations_user_pinned" 
    ON "conversations"("user_id", "is_pinned", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conversation" 
    ON "conversation_messages"("conversation_id", "created_at");

-- Step 5: Add foreign keys (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_messages" 
        ADD CONSTRAINT "conversation_messages_conversation_id_fkey" 
        FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verification
SELECT 'Conversations table created' as status 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations');

SELECT 'Conversation messages table created' as status 
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversation_messages');

