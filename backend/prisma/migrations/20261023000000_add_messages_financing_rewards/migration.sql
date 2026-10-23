-- CreateTable
CREATE TABLE IF NOT EXISTS "message_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_user_id" UUID NOT NULL,
    "sender_name" VARCHAR(150) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "preview" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "has_attachment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "sender_role" VARCHAR(30) NOT NULL,
    "sender_name" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "financing_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "treatment_cost_pence" INTEGER NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "monthly_pence" INTEGER NOT NULL,
    "approved_limit_pence" INTEGER NOT NULL DEFAULT 400000,
    "status" VARCHAR(40) NOT NULL DEFAULT 'pre_approved',
    "agreement_ref" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financing_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reward_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "reward_id" VARCHAR(50) NOT NULL,
    "reward_title" VARCHAR(200) NOT NULL,
    "points_cost" INTEGER NOT NULL,
    "voucher_code" VARCHAR(40) NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "oral_health_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "points_balance" INTEGER NOT NULL DEFAULT 1450,
    "streak_days" INTEGER NOT NULL DEFAULT 14,
    "plaque_index_percent" INTEGER NOT NULL DEFAULT 12,
    "bleeding_percent" INTEGER NOT NULL DEFAULT 4,
    "recall_days_remaining" INTEGER NOT NULL DEFAULT 42,
    "practitioner_advice" TEXT,
    "weekly_brushing" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oral_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "message_threads_patient_user_id_updated_at_idx" ON "message_threads"("patient_user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "messages_thread_id_sent_at_idx" ON "messages"("thread_id", "sent_at");
CREATE UNIQUE INDEX IF NOT EXISTS "financing_applications_agreement_ref_key" ON "financing_applications"("agreement_ref");
CREATE INDEX IF NOT EXISTS "financing_applications_user_id_created_at_idx" ON "financing_applications"("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "reward_redemptions_voucher_code_key" ON "reward_redemptions"("voucher_code");
CREATE INDEX IF NOT EXISTS "reward_redemptions_user_id_redeemed_at_idx" ON "reward_redemptions"("user_id", "redeemed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "oral_health_metrics_user_id_key" ON "oral_health_metrics"("user_id");
