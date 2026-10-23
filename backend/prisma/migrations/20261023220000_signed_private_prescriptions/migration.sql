-- CS-35 (decisions log #4): prescriptions are signed private PDFs.
-- Additive only: nullable columns and a unique index on the new reference
-- (empty for existing rows). Rollback: drop the four columns.

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "content" JSONB,
ADD COLUMN     "reference" VARCHAR(32),
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signing_key_id" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_reference_key" ON "prescriptions"("reference");

