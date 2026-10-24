-- CreateTable
CREATE TABLE "tooth_history" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" UUID NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "arch" TEXT NOT NULL,
    "quadrant" TEXT NOT NULL,
    "condition" "ToothCondition" NOT NULL,
    "notes" TEXT,
    "appointment_id" UUID,
    "recorded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tooth_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_notes" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "clinician_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "notes" TEXT NOT NULL,
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tooth_history_patient_id_tooth_number_idx" ON "tooth_history"("patient_id", "tooth_number");

-- CreateIndex
CREATE INDEX "tooth_history_appointment_id_idx" ON "tooth_history"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_notes_appointment_id_key" ON "appointment_notes"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_notes_patient_id_idx" ON "appointment_notes"("patient_id");

-- CreateIndex
CREATE INDEX "appointment_notes_clinician_id_idx" ON "appointment_notes"("clinician_id");

-- AddForeignKey
ALTER TABLE "tooth_history" ADD CONSTRAINT "tooth_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_history" ADD CONSTRAINT "tooth_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "clinician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
