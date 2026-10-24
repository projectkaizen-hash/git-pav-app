-- AlterTable
ALTER TABLE "message_threads" ADD COLUMN "recipient_type" VARCHAR(50) NOT NULL DEFAULT 'practice';
ALTER TABLE "message_threads" ADD COLUMN "assigned_clinician_id" UUID;

-- CreateIndex
CREATE INDEX "message_threads_assigned_clinician_id_updated_at_idx" ON "message_threads"("assigned_clinician_id", "updated_at");

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_assigned_clinician_id_fkey" FOREIGN KEY ("assigned_clinician_id") REFERENCES "clinician_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
