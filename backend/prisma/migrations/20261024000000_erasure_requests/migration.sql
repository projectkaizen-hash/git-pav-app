-- CS-23 (decisions log #9 and #21): a queue of erasure requests with their
-- one-month deadline, and markers for erased accounts and how long their
-- clinical record is kept.
-- Additive only: one new empty table and three nullable columns (no table
-- rewrite, no backfill). Nothing is erased by this migration.
-- Rollback: drop erasure_requests and the ErasureStatus type, then the
-- three columns.

-- CreateEnum
CREATE TYPE "ErasureStatus" AS ENUM ('pending', 'completed', 'rejected');

-- AlterTable
ALTER TABLE "patient_profiles" ADD COLUMN     "erased_at" TIMESTAMP(3),
ADD COLUMN     "retain_until" DATE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "erased_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "erasure_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" VARCHAR(30) NOT NULL,
    "status" "ErasureStatus" NOT NULL DEFAULT 'pending',
    "reason" VARCHAR(500),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "handled_by_id" UUID,
    "outcome_note" VARCHAR(500),

    CONSTRAINT "erasure_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "erasure_requests_user_id_idx" ON "erasure_requests"("user_id");

-- CreateIndex
CREATE INDEX "erasure_requests_status_due_at_idx" ON "erasure_requests"("status", "due_at");

-- AddForeignKey
ALTER TABLE "erasure_requests" ADD CONSTRAINT "erasure_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erasure_requests" ADD CONSTRAINT "erasure_requests_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

