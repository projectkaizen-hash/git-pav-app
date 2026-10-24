-- CS-17 (WH-3, VP-2, BJ-4): Stripe webhook deduplication table and van deposit release tracking.
-- Additive only: nullable columns on van_service_requests, new stripe_events table, and release status index.

-- AlterTable
ALTER TABLE "van_service_requests" ADD COLUMN "deposit_release_status" VARCHAR(50),
ADD COLUMN "deposit_released_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "van_service_requests_status_deposit_release_status_idx" ON "van_service_requests"("status", "deposit_release_status");
