-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_clinician_id_idx" ON "appointments"("clinician_id");

-- CreateIndex
CREATE INDEX "appointments_service_id_idx" ON "appointments"("service_id");

-- CreateIndex
CREATE INDEX "appointments_start_time_utc_idx" ON "appointments"("start_time_utc");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_hold_expires_at_idx" ON "appointments"("hold_expires_at");

-- CreateIndex
CREATE INDEX "appointments_stripe_payment_id_idx" ON "appointments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "clinician_profiles_gdc_number_idx" ON "clinician_profiles"("gdc_number");

-- CreateIndex
CREATE INDEX "clinician_profiles_is_telehealth_active_idx" ON "clinician_profiles"("is_telehealth_active");

-- CreateIndex
CREATE INDEX "patient_profiles_user_id_idx" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE INDEX "patient_profiles_postcode_idx" ON "patient_profiles"("postcode");

-- CreateIndex
CREATE INDEX "patient_profiles_created_at_idx" ON "patient_profiles"("created_at");

-- CreateIndex
CREATE INDEX "prescriptions_appointment_id_idx" ON "prescriptions"("appointment_id");

-- CreateIndex
CREATE INDEX "prescriptions_clinician_id_idx" ON "prescriptions"("clinician_id");

-- CreateIndex
CREATE INDEX "prescriptions_dispatched_at_idx" ON "prescriptions"("dispatched_at");

-- CreateIndex
CREATE INDEX "prescriptions_eps_transaction_ref_idx" ON "prescriptions"("eps_transaction_ref");

-- CreateIndex
CREATE INDEX "van_service_polygons_van_id_idx" ON "van_service_polygons"("van_id");

-- CreateIndex
CREATE INDEX "van_service_polygons_sector_name_idx" ON "van_service_polygons"("sector_name");

-- CreateIndex
CREATE INDEX "vans_is_active_idx" ON "vans"("is_active");

-- CreateIndex
CREATE INDEX "vans_registration_plate_idx" ON "vans"("registration_plate");
