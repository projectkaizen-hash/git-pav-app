-- CS-05: Remove fabricated defaults from schema (DB-5).
-- Sets financing application defaults to £0 and 'pending' instead of £4,000 'pre_approved'.
-- Makes prescriptions.dispatched_at nullable (removing DEFAULT now()) and adds created_at.

-- AlterTable
ALTER TABLE "financing_applications" ALTER COLUMN "approved_limit_pence" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dispatched_at" DROP NOT NULL,
ALTER COLUMN "dispatched_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "prescriptions_created_at_idx" ON "prescriptions"("created_at");
