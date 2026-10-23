# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** pavdental-backend
- **Date:** 2026-10-23
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

### Requirement: Health & Readiness Probes
- **Description:** System health and liveness probes verifying PostgreSQL and Redis connectivity.

#### Test TC001 get health endpoint returns service and dependency status
- **Test Code:** [TC001_get_health_endpoint_returns_service_and_dependency_status.py](./TC001_get_health_endpoint_returns_service_and_dependency_status.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/d0cc6228-40ab-4a6f-8acb-0176cc0c6fb8
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /health` returned HTTP 200 with `status: "ok"`, `checks.database: "ok"`, and `checks.redis: "ok"`.

---

#### Test TC002 get livez endpoint returns service liveness status
- **Test Code:** [TC002_get_livez_endpoint_returns_service_liveness_status.py](./TC002_get_livez_endpoint_returns_service_liveness_status.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/6e76baaf-fe0e-4c16-a5e4-db1ee1f216ea
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /livez` returned HTTP 200 confirming instance liveness.

---

### Requirement: Dental Services & Public Van Coverage Catalog
- **Description:** Public catalog of dental services with channel filtering and PostGIS/geospatial mobile dental van coverage checks.

#### Test TC003 get services endpoint returns active dental services with valid channel filter
- **Test Code:** [TC003_get_services_endpoint_returns_active_dental_services_with_valid_channel_filter.py](./TC003_get_services_endpoint_returns_active_dental_services_with_valid_channel_filter.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/b7d95752-e977-4144-b2d9-2e6fee36d12e
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/services` and channel filters (`clinic`, `van`, `video`) returned active dental services accurately.

---

#### Test TC004 get services endpoint returns 400 for invalid channel parameter
- **Test Code:** [TC004_get_services_endpoint_returns_400_for_invalid_channel_parameter.py](./TC004_get_services_endpoint_returns_400_for_invalid_channel_parameter.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/074415bd-5ba0-46da-a1f0-ab0efeac56b3
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Invalid `channel` query values are rejected with HTTP 400 rather than leaking a Prisma enum error.

---

#### Test TC005 post van coverage check returns coverage status for valid gps coordinates
- **Test Code:** [TC005_post_van_coverage_check_returns_coverage_status_for_valid_gps_coordinates.py](./TC005_post_van_coverage_check_returns_coverage_status_for_valid_gps_coordinates.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/83abf774-0dc8-42ff-8d94-6fd8065f0ce4
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/public/van/coverage-check` accurately resolved Central London GPS coordinates (`51.5154, -0.1411`) against active mobile dental van sectors.

---

#### Test TC006 post van coverage check returns 400 for malformed coordinates
- **Test Code:** [TC006_post_van_coverage_check_returns_400_for_malformed_coordinates.py](./TC006_post_van_coverage_check_returns_400_for_malformed_coordinates.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/7d946a2e-25ea-44bd-aa78-d12db59e1765
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Malformed latitude/longitude payloads are rejected with HTTP 400 by Zod schema validation.

---

### Requirement: Authentication & Session Lifecycle
- **Description:** Email check, Argon2id patient registration, login, and cryptographic refresh token rotation with unique `jti` claims.

#### Test TC007 post auth check email returns email existence status
- **Test Code:** [TC007_post_auth_check_email_returns_email_existence_status.py](./TC007_post_auth_check_email_returns_email_existence_status.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/e0f6c12e-d5c7-46bf-97c0-ef6661c80e98
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/auth/check-email` accurately identifies existing vs new email addresses.

---

#### Test TC008 post auth register creates new patient account with valid data
- **Test Code:** [TC008_post_auth_register_creates_new_patient_account_with_valid_data.py](./TC008_post_auth_register_creates_new_patient_account_with_valid_data.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/d615681f-cd00-425a-bd47-028d66c211c4
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/auth/register` creates User + PatientProfile + AuthSession and returns HTTP 201 with `accessToken`, `refreshToken`, and `user`.

---

#### Test TC009 post auth login authenticates user with valid credentials
- **Test Code:** [TC009_post_auth_login_authenticates_user_with_valid_credentials.py](./TC009_post_auth_login_authenticates_user_with_valid_credentials.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/b13fa945-8a30-4239-9710-bd29777dfa96
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/auth/login` authenticates valid credentials and returns HTTP 200 with session tokens and user profile metadata.

---

#### Test TC010 post auth refresh rotates refresh token and issues new tokens
- **Test Code:** [TC010_post_auth_refresh_rotates_refresh_token_and_issues_new_tokens.py](./TC010_post_auth_refresh_rotates_refresh_token_and_issues_new_tokens.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/319ca294-3dbd-47c4-bc8f-87e5b20fc28b
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** After adding `jti: crypto.randomUUID()` to `signAccessToken` in `src/lib/jwt.ts`, both `accessToken` and `refreshToken` rotate deterministically and replay of the old refresh token is rejected with HTTP 401.

---

### Requirement: Patient Profile, Odontogram & Treatment Plans
- **Description:** Patient demographic profile management, 32-tooth odontogram chart, and treatment plans supporting both `userId` and `profileId` lookup.

#### Test TC011 get and put patient profile endpoint retrieves and updates patient details
- **Test Code:** [TC011_get_and_put_patient_profile_endpoint_retrieves_and_updates_patient_details.py](./TC011_get_and_put_patient_profile_endpoint_retrieves_and_updates_patient_details.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/2b0accfb-2693-4b02-bc23-090781895a6e
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/patients/:id/profile` and `PUT /api/patients/:id/profile` resolve by `userId` or `profileId` and return the complete updated patient profile.

---

#### Test TC012 get patient odontogram and treatment plans endpoints return clinical records
- **Test Code:** [TC012_get_patient_odontogram_and_treatment_plans_endpoints_return_clinical_records.py](./TC012_get_patient_odontogram_and_treatment_plans_endpoints_return_clinical_records.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/8056b8f7-e32b-4f90-8f0e-a7dad55b884a
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/patients/:id/odontogram` and `GET /api/patients/:id/plans` return HTTP 200 with structured tooth records and treatment plans.

---

### Requirement: Booking Slots & Appointments
- **Description:** Real-time slot availability calculation with Redis hold checks and patient appointment listing.

#### Test TC013 get booking slots endpoint returns available appointment time slots
- **Test Code:** [TC013_get_booking_slots_endpoint_returns_available_appointment_time_slots.py](./TC013_get_booking_slots_endpoint_returns_available_appointment_time_slots.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/b05b0d29-2606-4fdc-8a74-48bf16528755
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/booking/slots` returns available slots with `id`, `startTimeUtc`, `endTimeUtc`, `available`, and `durationMinutes`.

---

#### Test TC014 get booking appointments endpoint lists patient appointments
- **Test Code:** [TC014_get_booking_appointments_endpoint_lists_patient_appointments.py](./TC014_get_booking_appointments_endpoint_lists_patient_appointments.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/44916b85-7508-4edb-9421-f2093640c024
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/booking/appointments` returns HTTP 200 with the authenticated patient's appointments.

---

### Requirement: Clinical Messaging, BNPL Financing, Smile Perks & GDPR Consents
- **Description:** Persistent care-team messaging, 0% APR BNPL dental financing, Smile Perks & Oral Health Insights, and UK GDPR consent records.

#### Test TC015 get and post messages endpoints list threads and create new clinical message thread
- **Test Code:** [TC015_get_and_post_messages_endpoints_list_threads_and_create_new_clinical_message_thread.py](./TC015_get_and_post_messages_endpoints_list_threads_and_create_new_clinical_message_thread.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/64011575-b536-472f-949f-fe244f9f79fd
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/messages` and `POST /api/messages` list and create persistent PostgreSQL message threads.

---

#### Test TC016 get financing endpoint returns pre approved limit and applications
- **Test Code:** [TC016_get_financing_endpoint_returns_pre_approved_limit_and_applications.py](./TC016_get_financing_endpoint_returns_pre_approved_limit_and_applications.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/6a27c18f-61e0-4138-9acd-718dd79e7a0a
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/financing` returns `preApprovedLimitPence`, `aprPercent: 0`, and persisted financing applications.

---

#### Test TC017 post financing apply creates 0 percent apr bnpl financing application
- **Test Code:** [TC017_post_financing_apply_creates_0_percent_apr_bnpl_financing_application.py](./TC017_post_financing_apply_creates_0_percent_apr_bnpl_financing_application.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/e65bfc6e-fc1f-4b03-8990-3924f800c413
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/financing/apply` calculates monthly installments, persists a `pre_approved` financing record, and logs an audit event.

---

#### Test TC018 get rewards endpoint returns smile points balance and reward catalog
- **Test Code:** [TC018_get_rewards_endpoint_returns_smile_points_balance_and_reward_catalog.py](./TC018_get_rewards_endpoint_returns_smile_points_balance_and_reward_catalog.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/148d1933-ec32-4699-9818-845ea02eb39c
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/rewards` returns `pointsBalance`, `streakDays`, `nextTierPoints`, `catalog`, and `redemptions`.

---

#### Test TC019 get rewards insights and post brushing log update oral health metrics
- **Test Code:** [TC019_get_rewards_insights_and_post_brushing_log_update_oral_health_metrics.py](./TC019_get_rewards_insights_and_post_brushing_log_update_oral_health_metrics.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/d87549c7-287e-4654-b51c-6b9e00ae7e12
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `GET /api/rewards/insights` and `POST /api/rewards/brushing-log` persist weekly brushing sessions and increment Smile Points.

---

#### Test TC020 post consents grant and get consents current manage gdpr patient consents
- **Test Code:** [TC020_post_consents_grant_and_get_consents_current_manage_gdpr_patient_consents.py](./TC020_post_consents_grant_and_get_consents_current_manage_gdpr_patient_consents.py)
- **Test Error:** 
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d1bcafed-9bd3-5519-9401-03f167b9ac48/test/ce31f4e0-eea7-4ba9-9665-de1756d516b5
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** `POST /api/consents/grant` and `GET /api/consents/current` version and persist GDPR consent records accurately.

---

## 3️⃣ Coverage & Matching Metrics

- **100.00%** of tests passed (20/20)

| Requirement | Total Tests | ✅ Passed | ❌ Failed |
|-------------|-------------|-----------|-----------|
| Health & Readiness Probes | 2 | 2 | 0 |
| Dental Services & Public Van Coverage Catalog | 4 | 4 | 0 |
| Authentication & Session Lifecycle | 4 | 4 | 0 |
| Patient Profile, Odontogram & Treatment Plans | 2 | 2 | 0 |
| Booking Slots & Appointments | 2 | 2 | 0 |
| Clinical Messaging, BNPL Financing, Smile Perks & GDPR Consents | 6 | 6 | 0 |

---

## 4️⃣ Key Gaps / Risks
> **100.00% of all 20 backend TestSprite test cases passed.**
> Three defects identified during the initial TestSprite run (`TC010` JWT access token `jti` uniqueness on same-second refresh, `TC011` patient profile lookup by both `userId` and `profileId` plus returning full updated profile fields on `PUT`, and `TC020` GDPR consent enum coverage) were remediated and re-verified to 100% pass rate.
