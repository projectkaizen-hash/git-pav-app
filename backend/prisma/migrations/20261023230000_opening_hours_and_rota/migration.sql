-- CS-30 (decisions log #12): clinic opening hours, closure days and a weekly
-- rota per clinician with date overrides, so slots come from real hours.
-- Additive only: four new, empty tables (no locks on existing tables beyond
-- the FK checks). After deploying, run `npm run hours:defaults` once so
-- existing clinics and clinicians get the default hours (see migrations.md).
-- Rollback: drop the four tables. Clinic.operating_hours is left as is.

-- CreateTable
CREATE TABLE "clinic_opening_hours" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "opens_minute" SMALLINT NOT NULL,
    "closes_minute" SMALLINT NOT NULL,

    CONSTRAINT "clinic_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_closures" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "reason" VARCHAR(200),

    CONSTRAINT "clinic_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_rota_blocks" (
    "id" UUID NOT NULL,
    "clinician_id" UUID NOT NULL,
    "clinic_id" UUID,
    "weekday" SMALLINT NOT NULL,
    "start_minute" SMALLINT NOT NULL,
    "end_minute" SMALLINT NOT NULL,

    CONSTRAINT "clinician_rota_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinician_rota_overrides" (
    "id" UUID NOT NULL,
    "clinician_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "clinic_id" UUID,
    "start_minute" SMALLINT,
    "end_minute" SMALLINT,
    "reason" VARCHAR(200),

    CONSTRAINT "clinician_rota_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_opening_hours_clinic_id_weekday_key" ON "clinic_opening_hours"("clinic_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_closures_clinic_id_date_key" ON "clinic_closures"("clinic_id", "date");

-- CreateIndex
CREATE INDEX "clinician_rota_blocks_clinic_id_idx" ON "clinician_rota_blocks"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinician_rota_blocks_clinician_id_weekday_start_minute_key" ON "clinician_rota_blocks"("clinician_id", "weekday", "start_minute");

-- CreateIndex
CREATE INDEX "clinician_rota_overrides_clinic_id_idx" ON "clinician_rota_overrides"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinician_rota_overrides_clinician_id_date_key" ON "clinician_rota_overrides"("clinician_id", "date");

-- AddForeignKey
ALTER TABLE "clinic_opening_hours" ADD CONSTRAINT "clinic_opening_hours_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_rota_blocks" ADD CONSTRAINT "clinician_rota_blocks_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "clinician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_rota_blocks" ADD CONSTRAINT "clinician_rota_blocks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_rota_overrides" ADD CONSTRAINT "clinician_rota_overrides_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "clinician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinician_rota_overrides" ADD CONSTRAINT "clinician_rota_overrides_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Times are minutes after midnight, Europe/London; weekday 0 = Sunday.
ALTER TABLE "clinic_opening_hours" ADD CONSTRAINT "clinic_opening_hours_valid"
  CHECK ("weekday" BETWEEN 0 AND 6 AND "opens_minute" >= 0 AND "opens_minute" < "closes_minute" AND "closes_minute" <= 1440);
ALTER TABLE "clinician_rota_blocks" ADD CONSTRAINT "clinician_rota_blocks_valid"
  CHECK ("weekday" BETWEEN 0 AND 6 AND "start_minute" >= 0 AND "start_minute" < "end_minute" AND "end_minute" <= 1440);
-- An override either has no times (not working that day) or a valid block.
ALTER TABLE "clinician_rota_overrides" ADD CONSTRAINT "clinician_rota_overrides_valid"
  CHECK (
    ("start_minute" IS NULL AND "end_minute" IS NULL AND "clinic_id" IS NULL)
    OR ("start_minute" >= 0 AND "start_minute" < "end_minute" AND "end_minute" <= 1440)
  );

