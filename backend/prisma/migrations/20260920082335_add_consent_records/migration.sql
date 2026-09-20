-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "patient_profile_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lawful_basis" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "metadata" JSONB,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_patient_profile_id_idx" ON "consent_records"("patient_profile_id");

-- CreateIndex
CREATE INDEX "consent_records_consent_type_idx" ON "consent_records"("consent_type");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_patient_profile_id_consent_type_version_key" ON "consent_records"("patient_profile_id", "consent_type", "version");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
