# Production Requirements Specification: Pav Dental Platform
**Document Reference:** `REQ-PAV-2026-V2`  
**Standard:** ISO/IEC/IEEE 29148:2018 Systems and Software Engineering — Requirements Engineering  
**Target Release:** Production Release 1.0.0 (Target Launch: January 15, 2027) **[ASSUMPTION]**  
**Compliance Baseline:** UK GDPR / Data Protection Act 2018, NHS DSPT Category 1, GDC Standards, CQC Digital Record Standards, PCI-DSS v4.0 SAQ-A **[ASSUMPTION]**

---

## 1. Master Production Requirements Catalog

### Domain 1: Security, Secrets & Vulnerability Remediation (`SEC`)

#### `REQ-SEC-001`
- **Area:** Security & Secret Management
- **Requirement Statement:** The system must purge all live-format API credentials from workspace `.env` files, add `uploads/` and `testsprite_tests/tmp/` to `.gitignore`, delete local unencrypted GDPR SAR and plan artifacts from `backend/uploads/`, and rotate all exposed Stripe, Backblaze B2, Daily.co, and AWS STS credentials.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `S` (1 day)
- **Dependencies:** Access to Stripe, Backblaze B2, and Daily.co admin consoles
- **Owner Role:** SecOps / DevOps
- **Acceptance Criteria:**
  1. `backend/.env` contains zero live keys (`sk_live_*`, Backblaze B2 keys, Daily.co production keys); all previously exposed keys are revoked and rotated.
  2. `.gitignore` and `backend/.gitignore` explicitly exclude `uploads/`, `backend/uploads/`, and `**/testsprite_tests/tmp/`.
  3. `backend/uploads/gdpr-sar/*`, `backend/uploads/plans/*`, and `pavdental/testsprite_tests/tmp/test_results.json` are deleted from disk.
  4. Production secrets are loaded exclusively from AWS Secrets Manager or environment injection at container runtime.
- **Verification Method:** Run `gitleaks detect --source .` and `git status --ignored`; verify zero secret findings and zero untracked files under `uploads/`.

#### `REQ-SEC-002`
- **Area:** Security & Cryptography
- **Requirement Statement:** The system must encrypt all sensitive clinical and patient health information (PHI/PII) fields (`PatientProfile.medicalHistory`, `Appointment.triageData`, `ToothRecord.notes`, `TreatmentPlan`, `Prescription`, `Message.body`, and `DocumentVault` binary payloads) at rest using `clinicalRecordEncryptionService` backed by AWS KMS Customer Managed Keys (`@aws-sdk/client-kms`).
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (4 days)
- **Dependencies:** `REQ-SEC-001`, AWS KMS CMK provisioned
- **Owner Role:** Backend / SecOps
- **Acceptance Criteria:**
  1. `backend/src/lib/encryption.ts` wraps and unwraps Data Encryption Keys (DEKs) via AWS KMS `GenerateDataKeyCommand` and `DecryptCommand` in production.
  2. Every write to `medicalHistory`, `triageData`, `ToothRecord.notes`, `Message.body`, and GDPR SAR exports encrypts the payload prior to database/storage persistence.
  3. In `backend/src/routes/van.ts:359-366, 415-424, 1049-1053`, accepted operator stop reads invoke `decryptAccessDetails` so van operators receive decrypted `gateCode` and `accessNotes` instead of raw ciphertext objects.
- **Verification Method:** Automated integration test inspecting raw PostgreSQL column values to confirm AES-256-GCM ciphertext storage and verifying plaintext round-trip on authorized API reads for both patient and accepted operator roles.

#### `REQ-SEC-003`
- **Area:** Security & Object-Level Authorization (IDOR / BOLA)
- **Requirement Statement:** The system must enforce strict Role-Based and Attribute-Based Access Control (RBAC/ABAC) ownership checks across all video consultation, prescription, payment method, and push notification endpoints.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** None
- **Owner Role:** Backend
- **Acceptance Criteria:**
  1. `POST /api/video/rooms` (`backend/src/routes/video.ts:32-96`) and `POST /api/video/upload-triage-photo` (`video.ts:101-168`) verify that `req.user.sub` is either the appointment's patient or assigned clinician; otherwise return `403 Forbidden`.
  2. `GET /api/video/status/:appointmentId` (`video.ts:216-247`) denies access (`403`) to `operator`, `admin`, and unassigned `clinician` users.
  3. `GET /api/prescriptions/patient/:userId` (`backend/src/routes/prescriptions.ts:100-125`) uses `requirePatientRecordAccess` middleware, and `POST /api/prescriptions` (`prescriptions.ts:38-45`) filters fallback appointment lookup by `{ clinicianId: clinician.id, patientId: patient.id }`.
  4. `POST /api/payments/methods/attach` (`backend/src/routes/payments.ts:128-161`) verifies `pm.customer === user.stripeCustomerId` before saving `SavedPaymentMethod`.
  5. `POST /api/notifications/register-token` (`backend/src/routes/notifications.ts:27-38`) updates `userId: req.user.sub` when reassigning an existing `expoPushToken` on a shared device.
  6. `requireActiveAppointmentContext` (`backend/src/middleware/patient-access.ts:76`) resolves `PatientProfile` by either `userId` or `id` (matching `requirePatientRecordAccess` at `patient-access.ts:27-34`).
- **Verification Method:** Automated IDOR security test matrix attempting cross-patient and cross-role access on every listed endpoint and asserting `403 Forbidden`.

#### `REQ-SEC-004`
- **Area:** Security & File Upload / XSS Prevention
- **Requirement Statement:** The system must validate uploaded file magic bytes, reject SVG uploads on clinical photo endpoints, and serve streamed documents with strict security headers (`Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`).
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `S` (1.5 days)
- **Dependencies:** None
- **Owner Role:** Backend
- **Acceptance Criteria:**
  1. `POST /api/video/upload-triage-photo` (`backend/src/routes/video.ts:20-26, 101-168`) inspects buffer magic bytes and restricts uploads to `image/jpeg`, `image/png`, and `image/webp` (`image/svg+xml` is rejected with `400 Bad Request`).
  2. `GET /api/patients/documents/stream/*` (`backend/src/server.ts:130-145`) sets `Content-Disposition: attachment; filename="..."`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy: default-src 'none'; sandbox`.
- **Verification Method:** Automated test uploading an `.svg` payload disguised with `image/svg+xml` and `image/jpeg` headers and verifying rejection and response headers.

---

### Domain 2: Authentication, MFA & Session Lifecycle (`AUTH`)

#### `REQ-AUTH-001`
- **Area:** Authentication & Verification Integrity
- **Requirement Statement:** The system must eliminate the `"123456"` production email verification backdoor, remove all unguarded in-app role-switcher cards from mobile screens, and fix the post-registration auth layout redirect race condition.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `S` (2 days)
- **Dependencies:** None
- **Owner Role:** Frontend (Mobile)
- **Acceptance Criteria:**
  1. `pavdental/src/app/(auth)/verify-email.tsx:30-36` deletes the `.catch` block bypass (`code.trim() === "123456"`) and displays an error banner when `authApi.confirmEmailVerification` fails.
  2. The `"Switch App Role"` / `"Switch Mobile Portal"` sections in `pavdental/src/app/(patient)/(tabs)/profile/index.tsx:156-202`, `pavdental/src/app/(clinician)/schedule.tsx:153-187`, and `pavdental/src/app/(operator)/route.tsx:339-373` are deleted.
  3. `pavdental/src/app/(onboarding)/complete.tsx:13-29` removes the fake `"local-patient-session"` injection fallback.
  4. `pavdental/src/app/(auth)/_layout.tsx:13-21` allows newly registered users (`!user.emailVerified` or onboarding incomplete) to complete `/(auth)/verify-email`, `/(auth)/account-created`, and `/(onboarding)/*` before redirecting to `/(patient)/(tabs)/home`.
  5. `pavdental/src/app/(auth)/welcome.tsx:28-35` routes authenticated users via `getMobilePortalPath(user.role)` instead of hardcoding `/(patient)/(tabs)/home`.
- **Verification Method:** Playwright / Maestro E2E test covering new user registration -> invalid OTP `"123456"` rejected -> valid OTP accepted -> onboarding wizard completion, plus static grep confirming zero role-switcher blocks in `src/app/`.

#### `REQ-AUTH-002`
- **Area:** Multi-Factor Authentication & Lockout Enforcement
- **Requirement Statement:** The system must enforce mandatory MFA verification during login and route access for `clinician` and `admin` roles, enforce `lockedUntil` checks on SMS OTP login, and prevent user/role enumeration on public auth endpoints.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** None
- **Owner Role:** Backend / Full Stack
- **Acceptance Criteria:**
  1. `POST /api/auth/login` (`backend/src/routes/auth.ts:96-162`) checks `if (user.mfaEnabled || user.role === "clinician" || user.role === "admin")` and returns `{ mfaRequired: true, mfaSessionToken }` instead of issuing `accessToken`/`refreshToken` until MFA OTP is verified.
  2. `requireMFAForRoles(["clinician", "admin"])` (`backend/src/middleware/mfa.ts:139`) is mounted on `/api/patients`, `/api/prescriptions`, `/api/video`, `/api/admin`, `/api/audit`, and `/api/dspt`.
  3. `POST /api/auth/otp/verify` (`backend/src/routes/auth-otp.ts:85-87`) rejects logins with `423 Locked` when `user.lockedUntil && user.lockedUntil > new Date()`.
  4. `POST /api/auth/check-email` (`backend/src/routes/auth.ts:28`) omits `role` from its response, and `POST /api/auth/verify-email/request` (`auth.ts:277-279`) returns a uniform `200 OK` response when email is not found.
- **Verification Method:** Automated integration test suite verifying clinician login requires MFA challenge, locked accounts cannot sign in via SMS OTP, and unauthenticated email checks do not leak user roles.

#### `REQ-AUTH-003`
- **Area:** Session Security, Password Policy & Biometric Unification
- **Requirement Statement:** The system must unify password complexity validation across all auth flows, revoke compromised session families on refresh token replay, clear refresh tokens on account deletion, and unify mobile biometric lock state under a single SecureStore key.
- **Priority:** `P1` (High)
- **Effort:** `S` (2 days)
- **Dependencies:** `REQ-AUTH-001`
- **Owner Role:** Full Stack
- **Acceptance Criteria:**
  1. `POST /api/auth/account/change-password` (`backend/src/routes/auth-account.ts:177`), `POST /api/auth/password-reset/confirm` (`backend/src/routes/auth.ts:388`), and `pavdental/src/app/(auth)/reset.tsx:22-37` enforce the exact same Zod password schema as `registerSchema` (`schemas/auth.ts:7-11`), and `reset.tsx:37` rejects missing reset tokens instead of passing `"placeholder-token"`.
  2. `POST /api/auth/refresh` (`backend/src/routes/auth.ts:185-191`) rejects deactivated users (`!session.user.isActive`) and immediately sets `revokedAt = new Date()` on `session.id` when `!validHash` (refresh token replay).
  3. `useDeleteAccountMutation` (`pavdental/src/features/account/account-hooks.ts:26-28`) calls `await tokenStore.deleteRefreshToken()` in addition to `clearAuth()`.
  4. `token-store.ts`, `biometric-hooks.ts`, and `app-lock-store.ts` read and write a single SecureStore key (`"pavdental_biometric_app_lock_enabled"`), and dead `pavdental/src/app/(auth)/biometric-unlock.tsx` is deleted.
- **Verification Method:** Unit and integration tests for refresh token replay revocation, password reset symbol acceptance, account deletion token cleanup, and biometric toggle persistence across app restarts.

---

### Domain 3: Mock Eradication & Data Integrity (`DATA`)

#### `REQ-DATA-001`
- **Area:** Frontend Mock Eradication
- **Requirement Statement:** The system must remove all production imports of `@/__mocks__/*` and hardcoded fallback records across all patient and clinician screens, rendering explicit empty or error states when the backend returns zero items or an error.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** None
- **Owner Role:** Frontend (Mobile)
- **Acceptance Criteria:**
  1. Zero files under `pavdental/src/app/**` or `pavdental/src/features/**` import from `@/__mocks__/booking-mock-data`, `@/__mocks__/patient-mock-data`, or `@/__mocks__/records-mock-data`.
  2. `(tabs)/appointments.tsx`, `appointments/[id].tsx`, `check-in.tsx`, `records/plans.tsx`, `records/plans/[id].tsx`, `records/odontogram.tsx`, `records/vault.tsx`, `booking/clinic-picker.tsx`, `booking/clinician-picker.tsx`, `booking/provider-profile.tsx`, `booking/slot-picker.tsx`, `(tabs)/profile/sessions.tsx`, `van/live-track.tsx`, and `(clinician)/schedule.tsx` display `<EmptyState />` when the API returns `[]` and `<ErrorState />` when `isError` is true.
- **Verification Method:** Static CI check (`! grep -rn "@/__mocks__" pavdental/src/app pavdental/src/features`) and E2E test verifying a newly registered patient sees empty states (0 appointments, 0 plans, 0 documents).

#### `REQ-DATA-002`
- **Area:** Backend Auto-Seeded Demo Data Removal
- **Requirement Statement:** The system must remove automatic insertion of fabricated clinical message threads in `GET /api/messages` and fabricated oral health metrics in `GET /api/rewards`, and must enable clinicians to view and reply to patient message threads.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** None
- **Owner Role:** Backend / Full Stack
- **Acceptance Criteria:**
  1. `GET /api/messages` (`backend/src/routes/messages.ts:38-99`) returns `[]` when a patient has no message threads instead of inserting 3 demo threads from `"Dr. Tariq Pav"`, `"Elena Rostova"`, and `"Pav Dental Reception"`.
  2. `GET /api/messages` and `POST /api/messages/:id/reply` support both `patient` and `clinician` roles so clinicians can read and respond to patient threads.
  3. `getOrCreateMetrics` (`backend/src/routes/rewards.ts:70-88`) initializes new patient `OralHealthMetric` rows with `pointsBalance: 0`, `streakDays: 0`, and `plaqueIndexPercent: null` / `bleedingPercent: null` until recorded by a clinician.
  4. `POST /api/rewards/redeem` (`rewards.ts:120-143`) enforces an atomic conditional update (`where: { userId, pointsBalance: { gte: item.pointsCost } }`) inside the transaction, and `POST /api/rewards/brushing-log` (`rewards.ts:180-213`) deduplicates brushing logs per calendar window.
- **Verification Method:** Integration test verifying a newly created patient receives `threads: []` and `pointsBalance: 0`, and concurrent reward redemptions cannot produce a negative balance.

#### `REQ-DATA-003`
- **Area:** Database Schema Foreign Keys & Quadrant Normalization
- **Requirement Statement:** The system must add missing foreign key `@relation` constraints across 6 Prisma models (`OtpCode`, `SavedPaymentMethod`, `NotificationPreferences`, `WaitlistEntry`, `VanShift`, `VanServiceRequest`) and normalize odontogram quadrant enums between `seed.ts` and `schemas/patients.ts`.
- **Priority:** `P1` (High)
- **Effort:** `S` (2 days)
- **Dependencies:** Prisma migration
- **Owner Role:** Backend
- **Acceptance Criteria:**
  1. `backend/prisma/schema.prisma` defines foreign key `@relation` constraints for `OtpCode.userId` (`line 67`), `SavedPaymentMethod.userId` (`line 371`), `NotificationPreferences.userId` (`line 391`), `WaitlistEntry.serviceId` & `preferredClinicId` (`lines 442-443`), `VanShift.vanId` & `operatorId` (`lines 512-513`), and `VanServiceRequest.patientId`, `operatorId`, & `vanId` (`lines 544-547`).
  2. `backend/prisma/seed.ts:397-428` uses `"upper_right" | "upper_left" | "lower_left" | "lower_right"` matching `updateOdontogramSchema` (`backend/src/schemas/patients.ts:31`).
  3. `GET /api/admin/users` (`backend/src/routes/admin.ts:81-106`) joins `patientProfile`, `clinicianProfile`, and `operatorProfile` to return real user names instead of `"N/A"`.
- **Verification Method:** Run `npx prisma migrate deploy` and `npx prisma db seed` on a clean PostGIS database and verify `GET /api/admin/users` and `PUT /api/patients/:id/odontogram`.

---

### Domain 4: Booking, Payments & Financial Workflows (`BOOK` / `FIN`)

#### `REQ-BOOK-001`
- **Area:** Clinic Booking & Payment Verification
- **Requirement Statement:** The system must prevent double-booking on `POST /api/booking/appointments`, verify Stripe PaymentIntent status before confirming appointments on `PATCH /api/booking/appointments/:id/confirm`, fix the `result.httpStatus` 500 crash, and prevent `withIdempotency` from caching failed slot holds for 24 hours.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** Stripe API
- **Owner Role:** Backend
- **Acceptance Criteria:**
  1. `POST /api/booking/appointments` (`backend/src/routes/booking.ts:116-196`) verifies inside a serializable transaction that no active overlapping appointment exists for `clinicianId` over `[startTimeUtc, endTimeUtc)` and that any Redis `slot_lock:` key belongs to `patient.id` (returning `409 Conflict` if booked/held by another patient).
  2. `PATCH /api/booking/appointments/:id/confirm` (`booking.ts:265-329`) verifies via `stripe.paymentIntents.retrieve(stripePaymentId)` that `intent.status === "succeeded"` and `intent.metadata.appointmentId === appointment.id` before setting `status: "confirmed"`.
  3. Error returns in `booking.ts:279, 287, 302` use consistent property names (`status`) so `booking.ts:324` returns HTTP `404`/`403`/`400` instead of crashing with `TypeError` (HTTP 500).
  4. `POST /api/booking/hold-slot` (`booking.ts:86-93`) returns HTTP `409 Conflict` when a slot is already locked so `withIdempotency` (`idempotency.ts:39`) does not cache failed hold attempts for 24 hours.
  5. Duplicate mount `app.use("/api/booking/appointments", bookingRoutes)` in `backend/src/server.ts:183` is removed after aligning client paths to `/api/booking/*`.
- **Verification Method:** Automated concurrency test attempting simultaneous booking of the same clinician slot by two patients, plus negative test attempting `PATCH /:id/confirm` with a fake `stripePaymentId`.

#### `REQ-BOOK-002`
- **Area:** Frontend Service Catalog & Dynamic Slot Picker
- **Requirement Statement:** The mobile booking flow must render live services from `GET /api/services` with working category/search filters, generate dynamic upcoming dates in `slot-picker.tsx`, and wire calendar integration in `confirmed.tsx`.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (2.5 days)
- **Dependencies:** `REQ-DATA-001`
- **Owner Role:** Frontend (Mobile)
- **Acceptance Criteria:**
  1. `pavdental/src/app/(patient)/booking/service-catalog.tsx:34-182` and `pavdental/src/app/(patient)/(tabs)/home.tsx:42, 59-73, 138-177, 214-234` render live `Service` items from `useServices()`, pass real UUID `service.id` values into `useBookingStore`, and filter items by `selectedCategory` and `search`.
  2. `pavdental/src/app/(patient)/booking/slot-picker.tsx:17-31, 75-78` generates the next 14 days dynamically from the current date (`Europe/London`) instead of hardcoding September 2026 (`"2026-09-22"`..`"2026-09-25"`), and surfaces errors when `holdMutation` fails instead of starting a fake 10-minute timer.
  3. `pavdental/src/lib/stripe-web-shim.js:8-15` implements `confirmSetupIntent` (or disables unsupported web card setup gracefully) so `payment-methods.tsx:28, 41` does not throw `TypeError` on Web.
- **Verification Method:** End-to-end booking test selecting a real service from `/api/services`, picking a future slot date, holding the slot, and completing checkout.

#### `REQ-FIN-001`
- **Area:** Stripe Live Mode Enforcement & Third-Party Lending
- **Requirement Statement:** The system must eliminate `isMockStripe` bypasses in production builds and replace unconditional 0% financing pre-approval with real credit partner integration or manual underwriting queue status.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** Stripe account, Financing partner API (or manual underwriting workflow)
- **Owner Role:** Backend / Full Stack
- **Acceptance Criteria:**
  1. `backend/src/config/env.ts:181` requires a real `STRIPE_SECRET_KEY` (`sk_live_*` in production, `sk_test_*` in staging/CI) and removes `"sk_test_mock_stripe_key_pav_dental"` and all `isMockStripe` branches (`payments.ts:13`, `van.ts:38`, `cancellations.ts:11`, `van-payments.ts:15`).
  2. `POST /api/financing/apply` (`backend/src/routes/financing.ts:35-73`) creates applications with `status: "submitted_under_review"` (or calls an external lending API) instead of unconditionally returning `status: "pre_approved"`, and `pavdental/src/app/(patient)/records/financing.tsx:38-46` displays an error alert when the API call fails instead of showing the pre-approval modal in `catch`.
- **Verification Method:** Integration test verifying server boot fails in production mode without a real Stripe key and financing applications record accurate underwriting status.

---

### Domain 5: Telehealth Video, Odontogram Charting & Prescriptions (`CLIN`)

#### `REQ-CLIN-001`
- **Area:** Telehealth Video Consultation & Triage Flow
- **Requirement Statement:** The system must wire the mobile telehealth intake, photo capture, device check, live Daily.co WebRTC video call, and post-consultation summary screens end-to-end with the backend `/api/video/*` endpoints.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `L` (6 days)
- **Dependencies:** `@daily-co/react-native-daily-js`, `DAILY_API_KEY`
- **Owner Role:** Full Stack
- **Acceptance Criteria:**
  1. `pavdental/src/app/(patient)/video/intake.tsx:15-36` persists `symptomText`, `painLevel`, `hasSwelling`, `duration`, and `dualRecordingConsent` in a shared telehealth store along with the target `appointmentId`.
  2. `pavdental/src/app/(patient)/video/photos.tsx:18-51` and `photo-review.tsx:21-71` capture real camera/library images via `expo-image-picker`, upload each file via `POST /api/video/upload-triage-photo`, and submit the real triage payload via `POST /api/video/submit-triage`.
  3. `pavdental/src/app/(patient)/video/device-check.tsx:11-37` verifies actual camera and microphone permissions before enabling `"Enter Waiting Room"`.
  4. `pavdental/src/app/(patient)/video/waiting.tsx:14-124` transitions to `call.tsx` only when `GET /api/video/status/:appointmentId` returns `admittedByClinician: true` and a valid `roomUrl` (removing the `"Join Call Now ›"` bypass).
  5. `pavdental/src/app/(patient)/video/call.tsx:34-292` and `pavdental/src/app/(clinician)/consult-room.tsx:39-197` render a real Daily.co WebRTC session (removing static `doctor.jpg`/`avatar.jpg` images and hardcoded `"Dr. Emily Carter"`).
  6. `pavdental/src/app/(patient)/video/summary.tsx:23-55` loads real appointment clinical notes and prescriptions from the backend.
- **Verification Method:** Two-device E2E telehealth test: patient submits intake + photo -> enters waiting room -> clinician admits patient in `consult-room.tsx` -> real video room connects -> clinician records notes & Rx -> patient views summary.

#### `REQ-CLIN-002`
- **Area:** Clinician Odontogram Charting, Treatment Plan E-Sign & Prescriptions
- **Requirement Statement:** The system must wire the clinician consultation room to real patient triage and odontogram APIs, enforce real biometric authentication on treatment plan e-signatures, and prevent silent prescription dispatch failures and penicillin allergy conflicts.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (4 days)
- **Dependencies:** `REQ-DATA-001`, `REQ-SEC-003`
- **Owner Role:** Full Stack
- **Acceptance Criteria:**
  1. `pavdental/src/app/(clinician)/consult-room.tsx:210-342` fetches the patient's real `appointment.triageData` (including signed photo URLs) and `GET /api/patients/:id/odontogram`, and `"Save Clinical Record & Issue Rx"` (`line 332`) persists tooth changes via `PUT /api/patients/:id/odontogram` before navigating to `rx-dispense.tsx`.
  2. `pavdental/src/app/(clinician)/rx-dispense.tsx:19-79` loads patient name, address, and allergies dynamically from `usePatientProfile(patientId)`, blocks dispensing penicillin-class medications (`Amoxicillin`) when a Penicillin allergy is present on the patient's profile, and displays an explicit error alert if `POST /api/prescriptions` fails (`lines 52-54`).
  3. `pavdental/src/app/(patient)/records/plans.tsx:153-157` routes `"Digitally Accept Plan"` to `/(patient)/records/plans/[id]`, and `plans/[id].tsx:98-141, 447-465` invokes real `LocalAuthentication.authenticateAsync()` for biometric signing and surfaces API errors instead of faking local success in `catch`.
- **Verification Method:** Automated integration test covering clinician odontogram update -> treatment plan creation -> patient biometric e-signature -> prescription creation with allergy check.

---

### Domain 6: Mobile Van Operations & Offline Resilience (`VAN`)

#### `REQ-VAN-001`
- **Area:** Van Operator API De-Mocking & Durable Offline Queue
- **Requirement Statement:** The system must delete `mockShiftData` and all silent error fallbacks from `van-api.ts`, implement durable encrypted local SQLite storage (`expo-sqlite`) for offline clinical notes in `offline-capture.tsx`, and wire real GPS coordinates in `shift.tsx` and `use-operator-location.ts`.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `L` (5 days)
- **Dependencies:** `expo-sqlite`, `REQ-SEC-002`
- **Owner Role:** Frontend (Mobile)
- **Acceptance Criteria:**
  1. `pavdental/src/features/van/van-api.ts:144-500` deletes `mockShiftData` and throws structured errors on non-2xx responses or network failures across all 11 operator endpoints.
  2. `pavdental/src/app/(operator)/offline-capture.tsx:40-57` persists unsent clinical notes and phase transitions in an encrypted `expo-sqlite` queue when offline and flushes them automatically upon network recovery.
  3. `pavdental/src/app/(operator)/shift.tsx:49` passes the live GPS fix from `useOperatorLocation` to `startShift`, and `use-operator-location.ts:40-70` sets `gpsActive = false` and surfaces an error when location permission is denied.
  4. `pavdental/src/app/(patient)/van/complete.tsx:28-47` renders the actual completed service and clinical notes from `GET /api/van/requests/:id` instead of 3 hardcoded procedures.
- **Verification Method:** Airplane-mode test on van operator portal verifying shift errors surface clearly and offline treatment notes persist in SQLite across app restarts and sync upon reconnection.

---

### Domain 7: Object Storage, Audit Integrity, Observability & DevOps (`OPS` / `COMP`)

#### `REQ-OPS-001`
- **Area:** Object Storage & Backblaze B2 Signed URLs
- **Requirement Statement:** The system must generate valid S3 SigV4 presigned URLs (`@aws-sdk/s3-request-presigner`) or route document downloads through `/api/patients/documents/stream/*` so document vault and GDPR SAR links work reliably in staging and production.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `S` (2 days)
- **Dependencies:** Backblaze B2 / AWS S3 bucket
- **Owner Role:** Backend
- **Acceptance Criteria:**
  1. `backend/src/lib/object-storage.ts:212-222` either generates an AWS S3 SigV4 presigned `GetObjectCommand` URL when S3/Backblaze B2 is active OR always points HMAC-signed URLs to `${env.apiBaseUrl}/api/patients/documents/stream/${key}?expires=${expires}&sig=${signature}` (never appending internal HMAC params to `STORAGE_CDN_URL`).
  2. S3 storage is enabled whenever S3 credentials are configured (not restricted only to `env.isProduction` at `object-storage.ts:107, 152, 189, 244`).
- **Verification Method:** Automated test uploading a document to `objectStorage`, calling `GET /api/patients/:id/documents`, and executing an HTTP `GET` against the returned `downloadUrl` to verify `200 OK` binary retrieval.

#### `REQ-COMP-001`
- **Area:** Immutable Audit Log Hash Chain & GDPR Compliance Workflows
- **Requirement Statement:** The system must fix the timestamp millisecond mismatch in `audit-integrity.ts`, route all 16 direct `prisma.auditLog.create` calls through `createAuditLogWithIntegrity`, fix the `BigInt` crash in `GET /api/audit/logs`, and implement real GDPR marketing consent withdrawal and erasure tracking.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `M` (3 days)
- **Dependencies:** None
- **Owner Role:** Backend / Full Stack
- **Acceptance Criteria:**
  1. `createAuditLogWithIntegrity` (`backend/src/lib/audit-integrity.ts:24, 38-46`) passes `timestampUtc: new Date(nowIso)` explicitly to `prisma.auditLog.create` so `verifyAuditIntegrity` (`line 81`) computes the identical ISO timestamp and passes 100% of the time.
  2. All 16 direct `prisma.auditLog.create` calls (`auth-account.ts:148, 204`, `consents.ts:289, 341`, `financing.ts:57`, `messages.ts:209`, `patients.ts:278, 325`, `payments.ts:281, 315, 347, 391, 429`, `prescriptions.ts:71`, `rewards.ts:145`, `background-jobs.ts:55`, `van-payments.ts:138`) are replaced with `createAuditLogWithIntegrity`.
  3. `GET /api/audit/logs` (`backend/src/routes/audit.ts:49`) serializes `log.id.toString()` and validates `page`/`limit` via Zod.
  4. `POST /api/consents/data-access-request` (`backend/src/routes/consents.ts:268`) supports `format: "csv"` in addition to `"json"`, and `pavdental/src/app/(patient)/(tabs)/profile/consent.tsx:15-86` loads real consent history from `GET /api/consents/current` and wires a toggle calling `POST /api/consents/withdraw` for `direct_marketing`.
- **Verification Method:** Execute full E2E suite followed by `GET /api/audit/integrity` and `GET /api/audit/logs` as `admin`, asserting `200 OK` and `valid: true` with `totalLogsChecked > 0` and zero tampered/unhashed logs.

#### `REQ-OPS-002`
- **Area:** Distributed Rate Limiting, Query Optimization & Structured Logging
- **Requirement Statement:** The system must back `express-rate-limit` with Redis, eliminate the N+1 query in `GET /api/waitlist` and sequential Redis loop in `GET /api/booking/slots`, wire `StructuredLogger` across `backend/src/`, and integrate Sentry error tracking.
- **Priority:** `P1` (High)
- **Effort:** `M` (3 days)
- **Dependencies:** Redis, Sentry DSN
- **Owner Role:** Backend / DevOps
- **Acceptance Criteria:**
  1. `limiter` and `authLimiter` (`backend/src/server.ts:76-89`) use `rate-limit-redis`, and `RateLimiter.isRateLimited` (`backend/src/lib/otp-service.ts:205`) uses an in-memory fallback instead of returning `false` on Redis error.
  2. `GET /api/booking/slots` (`backend/src/routes/booking.ts:59-64`) checks interval overlap (`startTimeUtc < slotEnd && endTimeUtc > slotStart`) and batches slot lock lookups via `redis.mget`.
  3. `GET /api/waitlist` (`backend/src/routes/waitlist.ts:82-93`) computes queue positions without N+1 queries.
  4. `correlationIdMiddleware` and `log` from `backend/src/lib/structured-logging.ts` are wired into `server.ts`, replacing raw `console.log`/`error` calls, and `stopBackgroundJobs()` clears all `setInterval` timers during `SIGTERM`/`SIGINT` (`server.ts:206`).
- **Verification Method:** Load test `GET /api/booking/slots` and `GET /api/waitlist` at 100 RPS verifying single-roundtrip Redis/DB execution and JSON structured log output with correlation IDs.

#### `REQ-OPS-003`
- **Area:** CI/CD Pipeline, Package Versions, PostGIS Migrations & Honest Test Suites
- **Requirement Statement:** The system must normalize `pavdental/package.json` dependency versions, configure PostGIS and `prisma migrate deploy` in `.github/workflows/ci.yml`, add non-root user execution to `backend/Dockerfile`, and replace tautological unit tests with real route/component tests.
- **Priority:** `P0` (Launch Blocker)
- **Effort:** `L` (5 days)
- **Dependencies:** GitHub Actions, AWS ECS / EAS
- **Owner Role:** DevOps / QA
- **Acceptance Criteria:**
  1. `pavdental/package.json:18-51` specifies valid published npm versions matching `node_modules` / Expo SDK, and `pavdental/app.json:26-55` declares Android permissions (`CAMERA`, `RECORD_AUDIO`, `ACCESS_FINE_LOCATION`) and Expo config plugins.
  2. `.github/workflows/ci.yml:22, 72` uses `postgis/postgis:16-3.4-alpine` and runs `npx prisma migrate deploy` instead of `prisma db push --accept-data-loss`.
  3. `backend/Dockerfile:35` runs the application process as non-root `USER node`.
  4. `backend/src/__tests__/auth-integration.test.ts` and `background-jobs.test.ts` import and test actual Express routes (`supertest`) and `background-jobs.ts` functions with real `expect()` assertions; `e2e-suite.ts:248-252` authenticates as `admin` and asserts `res.status === 200` on `/api/dspt/dspt-report`.
  5. `pavdental/run-tests.ts` and `pavdental/src/__tests__/*` import and test real stores, schemas, and components rather than `src/__mocks__/*`.
- **Verification Method:** GitHub Actions CI run executing `prisma migrate deploy` on PostGIS, backend Jest suite (`>80%` coverage on real routes/libs), 33-step E2E suite, and mobile Jest + Playwright test suites with zero skipped PostGIS tests.

---

## 2. Production Definition of Done (DoD) Checklist

Prior to Go-Live approval, every item below must be verified and signed off by the Principal Engineer, Security Reviewer, and Clinical Safety Officer:

- [ ] **1. Zero Exposed Secrets or Tracked PII (`REQ-SEC-001`):** `backend/.env` keys rotated; `uploads/` and `testsprite_tests/tmp/` ignored and purged; `gitleaks` scan returns 0 findings.
- [ ] **2. Zero Auth/Role/Verification Bypasses (`REQ-AUTH-001`, `REQ-AUTH-002`):** `"123456"` catch bypass deleted from `verify-email.tsx`; role-switcher cards deleted from all 3 portals; clinician/admin MFA strictly enforced on login and protected routes; SMS OTP checks `lockedUntil`.
- [ ] **3. Zero Mock Fallbacks or Auto-Seeded Fake Clinical Data (`REQ-DATA-001`, `REQ-DATA-002`, `REQ-VAN-001`):** Zero imports of `@/__mocks__/*` in `pavdental/src/app/**`; `mockShiftData` deleted from `van-api.ts`; `GET /api/messages` and `GET /api/rewards` no longer insert fake clinical threads or metrics for new patients.
- [ ] **4. Payment & Booking Integrity (`REQ-BOOK-001`, `REQ-BOOK-002`, `REQ-FIN-001`):** `PATCH /api/booking/appointments/:id/confirm` verifies payment with Stripe and never crashes on error; `POST /api/booking/appointments` prevents double-booking; `service-catalog.tsx` and `slot-picker.tsx` use live services and dynamic dates; `isMockStripe` removed.
- [ ] **5. End-to-End Clinical & Telehealth Workflows (`REQ-CLIN-001`, `REQ-CLIN-002`):** Real Daily.co WebRTC video call, real triage photo capture/upload, real clinician odontogram save, allergy-checked prescription dispatch, and real biometric treatment plan e-signature verified end-to-end.
- [ ] **6. PHI Encryption at Rest & Valid Signed Document URLs (`REQ-SEC-002`, `REQ-SEC-004`, `REQ-OPS-001`):** Clinical fields encrypted via KMS-backed envelope encryption; accepted van operator queue decrypts `accessDetails`; document vault URLs resolve with HTTP 200 and `Content-Disposition: attachment`.
- [ ] **7. Tamper-Evident Audit Chain & Honest CI/Testing (`REQ-COMP-001`, `REQ-OPS-003`):** `GET /api/audit/integrity` returns `valid: true` across all audit events; `GET /api/audit/logs` serializes `BigInt` cleanly; CI runs `prisma migrate deploy` on `postgis/postgis:16-3.4-alpine` with >80% real code test coverage.
