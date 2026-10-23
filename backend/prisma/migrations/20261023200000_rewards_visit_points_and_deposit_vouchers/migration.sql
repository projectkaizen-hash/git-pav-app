-- CS-33 (decisions log #14): points come from completed visits, one award per
-- appointment, and redeem as a voucher off a future deposit.
-- Additive only: new nullable or constant-default columns and a new table.
-- Rollback: drop reward_points_awards, then the three new columns.

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "deposit_discount_pence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reward_redemptions" ADD COLUMN     "appointment_id" UUID,
ADD COLUMN     "discount_pence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reward_points_awards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_points_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_points_awards_appointment_id_key" ON "reward_points_awards"("appointment_id");

-- CreateIndex
CREATE INDEX "reward_points_awards_user_id_created_at_idx" ON "reward_points_awards"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_appointment_id_key" ON "reward_redemptions"("appointment_id");

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_points_awards" ADD CONSTRAINT "reward_points_awards_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

