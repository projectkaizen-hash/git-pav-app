-- Add Van Dispatch Tables
-- This migration documents the van dispatch tables that were created outside of the migration system

-- CreateEnum
CREATE TYPE "VanShiftStatus" AS ENUM ('offline', 'online', 'paused');

-- CreateEnum
CREATE TYPE "VanRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled', 'in_progress', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "VanStopPhase" AS ENUM ('queued', 'en_route', 'on_site', 'in_treatment', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "operator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "photo_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "van_operator_assignments" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "van_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "van_operator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "van_shifts" (
    "id" UUID NOT NULL,
    "van_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "status" "VanShiftStatus" NOT NULL DEFAULT 'online',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "last_location_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "van_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "van_location_pings" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "van_location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "van_service_requests" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "van_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_id" TEXT NOT NULL,
    "status" "VanRequestStatus" NOT NULL DEFAULT 'pending',
    "phase" "VanStopPhase" NOT NULL DEFAULT 'queued',
    "queue_position" INTEGER,
    "patient_lat" DOUBLE PRECISION NOT NULL,
    "patient_lng" DOUBLE PRECISION NOT NULL,
    "access_details" JSONB NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "treatment_started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "eta_seconds_snapshot" INTEGER,
    "appointment_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "van_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operator_profiles_user_id_key" ON "operator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "van_operator_assignments_operator_id_starts_at_idx" ON "van_operator_assignments"("operator_id", "starts_at");

-- CreateIndex
CREATE INDEX "van_operator_assignments_van_id_starts_at_idx" ON "van_operator_assignments"("van_id", "starts_at");

-- CreateIndex
CREATE INDEX "van_shifts_van_id_status_idx" ON "van_shifts"("van_id", "status");

-- CreateIndex
CREATE INDEX "van_shifts_operator_id_status_idx" ON "van_shifts"("operator_id", "status");

-- CreateIndex
CREATE INDEX "van_location_pings_shift_id_recorded_at_idx" ON "van_location_pings"("shift_id", "recorded_at");

-- CreateIndex
CREATE INDEX "van_service_requests_shift_id_status_idx" ON "van_service_requests"("shift_id", "status");

-- CreateIndex
CREATE INDEX "van_service_requests_van_id_status_idx" ON "van_service_requests"("van_id", "status");

-- CreateIndex
CREATE INDEX "van_service_requests_patient_id_status_idx" ON "van_service_requests"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "van_service_requests_appointment_id_key" ON "van_service_requests"("appointment_id");

-- AddForeignKey
ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_operator_assignments" ADD CONSTRAINT "van_operator_assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_operator_assignments" ADD CONSTRAINT "van_operator_assignments_van_id_fkey" FOREIGN KEY ("van_id") REFERENCES "vans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_shifts" ADD CONSTRAINT "van_shifts_van_id_fkey" FOREIGN KEY ("van_id") REFERENCES "vans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_shifts" ADD CONSTRAINT "van_shifts_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_location_pings" ADD CONSTRAINT "van_location_pings_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "van_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_service_requests" ADD CONSTRAINT "van_service_requests_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "van_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_service_requests" ADD CONSTRAINT "van_service_requests_van_id_fkey" FOREIGN KEY ("van_id") REFERENCES "vans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_service_requests" ADD CONSTRAINT "van_service_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_service_requests" ADD CONSTRAINT "van_service_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "van_service_requests" ADD CONSTRAINT "van_service_requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
