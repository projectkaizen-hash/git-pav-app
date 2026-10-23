-- Dependants (family members under a guardian's patient account) and the
-- persistent waitlist queue. Hand-written because `prisma migrate dev`
-- demands a destructive reset due to pre-existing historical drift between
-- the migration ledger and this environment's manually-repaired schema;
-- `migrate deploy` applies pending migrations without diffing.

-- CreateTable
CREATE TABLE "dependants" (
    "id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "dob" VARCHAR(10) NOT NULL,
    "relationship" VARCHAR(20) NOT NULL,
    "consent_signed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "service_id" TEXT NOT NULL,
    "preferred_date" VARCHAR(10) NOT NULL,
    "position" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dependants_guardian_id_idx" ON "dependants"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_service_id_preferred_date_user_id_key" ON "waitlist_entries"("service_id", "preferred_date", "user_id");

-- CreateIndex
CREATE INDEX "waitlist_entries_service_id_preferred_date_position_idx" ON "waitlist_entries"("service_id", "preferred_date", "position");

-- AddForeignKey
ALTER TABLE "dependants" ADD CONSTRAINT "dependants_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
