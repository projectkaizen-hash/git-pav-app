-- DropIndex (redundant with unique constraints - DB-6)
DROP INDEX "clinician_profiles_gdc_number_idx";

-- DropIndex (redundant with unique constraints - DB-6)
DROP INDEX "patient_profiles_user_id_idx";

-- DropIndex (redundant with unique constraints - DB-6)
DROP INDEX "vans_registration_plate_idx";

-- AlterTable (attempts counter and error tracker for dispatcher - BJ-3)
ALTER TABLE "scheduled_notifications" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_error" TEXT;

-- CreateIndex (foreign key index - DB-6)
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex (foreign key index - DB-6)
CREATE INDEX "notification_history_user_id_idx" ON "notification_history"("user_id");

-- CreateIndex (foreign key index - DB-6)
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex (hot polling composite index - DB-6)
CREATE INDEX "scheduled_notifications_status_scheduled_for_idx" ON "scheduled_notifications"("status", "scheduled_for");
