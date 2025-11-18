-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "usage_type" AS ENUM ('file_upload', 'chat_message', 'document_export', 'ai_processing');

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'user';

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
    "stripe_price_id_monthly" VARCHAR(255),
    "stripe_price_id_yearly" VARCHAR(255),
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
    "stripe_subscription_id" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
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

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "idx_subscription_plans_active" ON "subscription_plans"("is_active", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_stripe_subscription_id_key" ON "user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "idx_user_subscriptions_stripe" ON "user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_usage_tracking_user_type" ON "usage_tracking"("user_id", "usage_type", "period_start");

-- CreateIndex
CREATE INDEX "idx_usage_tracking_period" ON "usage_tracking"("period_start", "period_end");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
