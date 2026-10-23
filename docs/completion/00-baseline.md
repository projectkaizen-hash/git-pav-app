# 00 — Baseline (Phase 0)

Recorded 2026-10-23 against `claude/project-thread-lxovuw` @ 07e372e (identical to `main`).
No code or config was changed to produce this baseline. Local environment: Node 22.22,
PostgreSQL 16 + PostGIS 3 (apt), Redis 7.0, all on localhost.

## 1. Suite results

The baseline quoted in the mission and in `architecture.md` (backend 42 jest + 24 e2e,
mobile 12, typechecks clean) **does not reproduce from a clean checkout.**

| Suite | Command | Result from clean checkout | Result after local schema patch (see 1.1) |
|---|---|---|---|
| Backend install | `npm ci` | ✅ ok | — |
| Backend typecheck | `npx tsc --noEmit` | ✅ clean | — |
| Backend migrations (CI step) | `echo … \| npx prisma db execute --stdin` | ❌ `Either --url or --schema must be provided` (this is why CI's "Apply migrations" step is red) | — |
| Backend migrations | `npx prisma migrate deploy` | ✅ 16 migrations applied | — |
| Backend seed | `npm run prisma:seed` | ❌ P2022 `users.failed_login_attempts` does not exist | ✅ |
| Backend jest | `npx jest` | ❌ 55 passed / 17 failed / 72 total (2 suites fail) | ✅ **72 / 72** (8 suites) |
| Backend e2e | `npm test` | ❌ fails at step 2 (register → same missing column) | ✅ **34 / 34** with two network stubs (see 1.2) |
| Mobile install | `npm ci` | ❌ lockfile out of sync (`@react-native/metro-config@0.86.3`, `metro-babel-transformer`, `babel-preset`, `hermes-parser@0.36.0` missing) | ran `npm install --no-save` (lockfile untouched) |
| Mobile typecheck | `npx tsc --noEmit` | ✅ clean | — |
| Mobile content tests | `npm test` (`run-tests.ts`) | ✅ 20 assertions pass (the banner hard-codes "12") | — |
| Mobile routing tests | `npm run test:routing` | ✅ 21 / 21 | — |
| Mobile jest files | `src/__tests__/{account,booking,odontogram}.test.ts` | ⚠️ **never run**: `jest`/`ts-jest` are not installed and no script runs them. They also test inline copies of schemas, not the real modules. | — |
| Mobile lint | `npm run lint` | ❌ 208 problems (32 errors, 176 warnings) | — |
| expo-doctor | `npx expo-doctor` | 19/21; the 2 failures need exp.host, which this sandbox can't reach | — |
| Web export | `npx expo export --platform web` | ✅ bundles (3.8 MB) | — |

### 1.1 Schema drift (blocker)

`prisma migrate diff --from-migrations … --to-schema-datamodel schema.prisma` shows that
`schema.prisma` is ahead of the migrations. **No migration creates:**

- tables `email_verification_tokens`, `password_reset_tokens`, `mfa_codes`, `mfa_verifications`, `saved_payment_methods`
- columns `users.failed_login_attempts`, `users.locked_until`, `patient_profiles.stripe_customer_id` (+ unique index)
- index `van_service_requests(shift_id, queue_position)`
- varchar length limits on `clinician_profiles` / `patient_profiles` text columns; id/updated_at default differences on the 20261023 tables

So a production database built with `migrate deploy` would crash on register/login. The
diff also wants to **drop `van_service_polygons.polygon` (the PostGIS geometry column) and
its GIST index**, because the schema doesn't declare it as `Unsupported("geometry")`. Anyone
running `prisma migrate dev` would generate a migration that destroys the spatial index.

To measure the code (rather than the migrations), I applied the drift SQL locally **minus the
two destructive polygon statements**. That is a local-DB patch only; nothing in the repo
changed. The fix (a proper additive migration + declaring the geometry column) is a Phase 3
item and needs review because it is a migration.

### 1.2 External-network dependencies in the e2e suite

The e2e suite is not hermetic:

- `lib/geo.ts` calls `https://api.postcodes.io` directly. Blocked by this sandbox's egress
  proxy; on GitHub runners it works but makes CI depend on a third party.
- `POST /api/video/rooms` returns 503 unless `DAILY_API_KEY` is set and Daily answers. CI
  does not set it, so **the e2e step would fail in CI even after the migration fix.**

For the baseline I ran the suite with a scratch preload (outside the repo) that stubs
postcodes.io (SW1A 1AA → Westminster, everything else 404) and Daily (`/rooms`,
`/meeting-tokens`). With that, all 34 steps pass, including Stripe in its built-in mock path.

### 1.3 Logging observation from the run (PHI/PII)

The error handler logs request bodies. Email, password and phone are redacted, but
`firstName` / `lastName` are logged in clear (seen in the e2e run log for
`POST /api/auth/register`). Prisma query logging (`prisma:query …`) is also on in
development. Flagged as **high** for Phase 1 (`middleware/error-handler.ts`).

## 2. Inventory

### 2.1 Backend route modules (25 files, ~95 endpoints)

Mounts are in `src/server.ts:165-202`. Webhook: `POST /api/payments/webhook` (raw body,
`server.ts:68`). Health: `/`, `/health`, `/healthz`, `/readyz` (DB + Redis), `/livez`,
`/health/audit-integrity` (admin). Signed document stream:
`GET /api/patients/documents/stream/*` (HMAC-signed URL, no auth).

| Module (mount) | Endpoints |
|---|---|
| admin (`/api/admin`) | GET /overview; GET /users; GET /appointments; PATCH /appointments/:id/status; GET /vans; GET /audit-logs |
| audit (`/api/audit`) | POST /log; GET /logs; GET /integrity; POST /retention; GET /failures |
| auth-account (`/api/auth/account`) | GET /; DELETE /; POST /change-password; POST /verify-email/resend |
| auth-otp (`/api/auth/otp`) | POST /request; POST /verify |
| auth (`/api/auth`) | POST /check-email; /register; /login; /refresh; /logout; GET /sessions; DELETE /sessions/:id; POST /verify-email/request; /verify-email/confirm; /password-reset/request; /password-reset/confirm; /mfa/request; /mfa/verify; /mfa/verify-session |
| booking (`/api/booking`) | GET /slots; POST /hold-slot; POST /appointments; GET /appointments; PATCH /appointments/:id/confirm; PATCH /appointments/:id/cancel; POST /appointments/:id/check-in |
| cancellations (`/api/booking/appointments`) | POST /:id/cancel-with-refund |
| consents (`/api/consents`) | POST /grant; /withdraw; GET /history; GET /current; POST /data-access-request; POST /data-deletion-request |
| dspt-audit (`/api/dspt`) | GET /dspt-report |
| financing (`/api/financing`) | GET /; POST /apply; DELETE /:id |
| messages (`/api/messages`) | GET /; POST /; PATCH /:id/read; DELETE /:id |
| notifications (`/api/notifications`) | POST /register-token; GET /preferences; PUT /preferences; POST /send; POST /schedule; GET /history; POST /send-receipt |
| patient-dependants (`/api/patients/dependants`) | GET /; POST /; DELETE /:id |
| patients (`/api/patients`) | GET/PUT /:id/profile; GET/PUT /:id/odontogram; GET/POST /:id/plans; GET /:id/documents |
| payments (`/api/payments`) | POST /create-intent; /setup-intent; /methods/attach; GET /methods; PATCH /methods/:id/default; DELETE /methods/:id; + webhook |
| prescriptions (`/api/prescriptions`) | POST /; GET /patient/:userId |
| public-van (`/api/public/van`) | POST /coverage-check |
| rewards (`/api/rewards`) | GET /; POST /redeem; GET /insights; POST /brushing-log |
| services (`/api/services`) | GET /; GET /clinicians; GET /clinics |
| triage (`/api/triage`) | POST /check; GET /emergency-info |
| van (`/api/van`) | POST /shift/{start,pause,resume,end,location}; GET /shift/current; GET /requests/incoming; GET /queue; POST /requests/:id/{accept,decline,phase}; GET /availability; POST /requests; GET /requests/mine/active; GET /requests/:id; POST /requests/:id/payment-retry; POST /requests/:id/cancel |
| van-queue (`/api/van/shift`) | POST /optimize; POST /queue/reorder |
| van-stops (`/api/van/stops`) | POST /:id/check-in |
| video (`/api/video`) | POST /rooms; POST /upload-triage-photo; POST /submit-triage; GET /status/:appointmentId; GET /clinician-queue; POST /admit-patient |
| waitlist (`/api/waitlist`) | POST /join; GET /; DELETE /:id |

### 2.2 Prisma models (36) and enums (8)

User, AuthSession, EmailVerificationToken, PasswordResetToken, MfaCode, MfaVerification,
PatientProfile, ClinicianProfile, Clinic, Van, VanServicePolygon, Service, Appointment,
ToothRecord, TreatmentPlan, TreatmentPlanItem, Prescription, DocumentVault, AuditLog,
PushToken, NotificationPreference, ConsentRecord, Dependant, WaitlistEntry,
ScheduledNotification, NotificationHistory, SavedPaymentMethod, OperatorProfile,
VanOperatorAssignment, VanShift, VanLocationPing, VanServiceRequest, MessageThread, Message,
FinancingApplication, RewardRedemption, OralHealthMetric.
Enums: UserRole, CareChannel, ServiceCategory, AppointmentStatus, ToothCondition,
VanShiftStatus, VanRequestStatus, VanStopPhase.

Migrations: **16** (20260918 → 20261023), not 20.

### 2.3 Background jobs (all in-process `setInterval`, started from `server.ts`)

| Job | File | Interval |
|---|---|---|
| Expired slot holds | `lib/background-jobs.ts` `processExpiredSlotHolds` | 60 s |
| Scheduled notification dispatch | `processDueScheduledNotifications` | 60 s |
| Van request expiry + deposit release | `processExpiredVanRequests` | 30 s |
| Appointment reminder ladder (scheduler, not a timer) | `scheduleAppointmentReminderLadder` | on booking |
| Audit integrity check / retention / failure check | `lib/audit-monitoring.ts` | timers |

No distributed lock, so every API replica runs every job (to review in Phase 1).
`lib/job-queue.ts` (Redis/SQS queue abstraction) **is not imported anywhere**: dead code.

### 2.4 Expo routes (85 screens + layouts)

auth 11 · onboarding 6 · patient 49 · clinician 3 · operator 5 · root (`index`, `+not-found`).

- **(auth):** welcome, sign-in, sign-up, otp, verify-email, forgot, reset, biometric-unlock, account-created, guest-limit, access-denied
- **(onboarding):** profile, address, medical-history, insurance, consents, complete
- **(patient) tabs:** home, appointments, messages, records, profile/{index, personal-info, medical-history, emergency-contact, dependants, consent, notifications, payment-methods, security, sessions, delete-account}
- **(patient) stacks:** appointments/{[id], cancelled}; booking/{service-catalog, clinic-picker, clinician-picker, provider-profile, slot-picker, insurance, summary, confirmed}; records/{odontogram, plans, plans/[id], prescriptions, prescriptions/[id], vault, financing, insights}; van/{service-area, not-covered, access-details, confirm, live-track, complete}; video/{device-check, intake, photos, photo-review, waiting, call, summary}; check-in, perks, waitlist
- **(clinician):** schedule, consult-room, rx-dispense
- **(operator):** shift, incoming, route, check-in, offline-capture

Every literal `router.push/replace` and `href` target (43) resolves to an existing route.

### 2.5 Environment variables read in code

**Backend (validated in `config/env.ts`):** PORT, NODE_ENV, ALLOWED_ORIGINS, DATABASE_URL,
REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, AUDIT_IP_HMAC_SECRET, ENCRYPTION_KEY,
KMS_KEY_ID, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY.
**Backend (read ad hoc via `process.env`, not validated):** APP_URL, API_BASE_URL,
API_PUBLIC_URL, LOG_LEVEL, DAILY_API_KEY, DAILY_DOMAIN, POSTMARK_SERVER_TOKEN, FROM_EMAIL,
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE, AWS_REGION, AWS_ACCESS_KEY_ID,
AWS_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_BUCKET_NAME, MAPBOX_TOKEN, OSRM_BASE_URL,
VAN_ROUTING_{TIMEOUT_MS,CACHE_TTL_MS,FAILURE_THRESHOLD,BREAKER_COOLDOWN_MS},
VAN_REQUEST_TIMEOUT_MINUTES, VAN_POSTCODE_TOLERANCE_M, VAN_MAX_QUEUE_DEPTH,
ETA_PUSH_DRIFT_MINUTES, ETA_PUSH_THROTTLE_MINUTES. (`.env.example` also lists
STORAGE_CDN_URL, which no code reads.)
**Mobile:** EXPO_PUBLIC_API_URL, EXPO_PUBLIC_ENABLE_ROLE_SWITCHER,
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY with fallback EXPO_PUBLIC_STRIPE_PK (two names for one
value). `.env.example` lists EXPO_PUBLIC_DAILY_URL, EXPO_PUBLIC_APP_ENV and
EXPO_PUBLIC_DSPT_MODE, which no code reads.

## 3. `architecture.md` claims

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | Suites green: 42 jest, 24 e2e, 12 mobile, typechecks clean | **Wrong** | 72 jest / 34 e2e exist; both fail from a clean checkout (§1.1); mobile is 20 + 21 assertions |
| 2 | 17 route modules | **Wrong** | 25 files in `src/routes` |
| 3 | CI runs typecheck + jest + e2e against PostGIS/Redis | **Partial** | Workflow exists; last run red in both jobs (lockfile; `db execute` flag; e2e also needs Daily) |
| 4 | Dockerfile ships | **Partial** | Exists; never runs migrations, `npm ci` keeps devDependencies in the runtime image, Node 20 vs CI's 20 / local 22 |
| 5 | 29 Prisma models | **Wrong** | 36 models |
| 6 | 20 migrations | **Wrong** | 16, and they don't match the schema |
| 7 | Polygon GeoJSON + derived PostGIS geometry, trigger, startup backfill | **Verified (with risk)** | `lib/van-coverage.ts`; the geometry column isn't declared in `schema.prisma`, so `migrate dev` would drop it |
| 8 | Dual-backend coverage (ST_Contains / JS ray casting, degrade mid-flight) | **Verified** | `van-coverage.test.ts`, `van-coverage-db.test.ts` pass |
| 9 | Money is integer pence everywhere | **Verified** | No Float/Decimal money columns; Floats are only lat/lng |
| 10 | Van deposit is a manual-capture PaymentIntent, captured on accept after an authorization check, 409 otherwise | **Verified** | `routes/van.ts:888`, `:499`; van-payments tests |
| 11 | `releaseVanDeposit` wired into patient cancel, operator decline, shift end, expiry sweeper | **Verified** | `van.ts:1180, :607, :288`; `background-jobs.ts:265` |
| 12 | Webhooks: amount_capturable_updated, canceled, payment_failed, succeeded | **Verified** | `routes/payments.ts:266, 341, 370, 412` (idempotency to review in Phase 1) |
| 13 | `POST /api/van/requests/:id/payment-retry` | **Verified** | `van.ts` |
| 14 | Van flow end-to-end on mobile with PaymentSheet | **Verified (code path)** | `van/confirm.tsx`, `live-track.tsx`, `van-api.ts`; not yet run on device |
| 15 | Phone-OTP login | **Verified** | `routes/auth-otp.ts`, `(auth)/otp.tsx` |
| 16 | "TOTP-style MFA" | **Wrong** | MFA is a one-time code stored in `mfa_codes` (delivery channel to confirm in Phase 1); `users.mfa_secret` exists but nothing reads it |
| 17 | Redis for slot holds and OTP rate limiting | **Verified** | `lib/otp-service.ts:250`; e2e step 5 |
| 18 | Operator `queue/reorder` + optimize, with UI | **Verified** | `routes/van-queue.ts:78, :137`; `(operator)/route.tsx` |
| 19 | Live ETA re-push with drift and throttle | **Verified (by tests)** | `van-eta-broadcast.test.ts` |
| 20 | Routing provider (Mapbox / OSRM) with cache + breaker + haversine fallback | **Verified** | `lib/van-eta.ts:31-32`; `van-eta.test.ts` |
| 21 | `van-stops.ts` handles operator check-in (`on_site`) | **Verified** | `van-stops.ts:22-62` |
| 22 | Account deletion is a soft delete | **Verified** | `auth-account.ts` DELETE sets `isActive: false` and revokes sessions; `data-deletion-request` only writes an audit log and sends an email |
| 23 | SAR export is UI-only, needs wiring | **Wrong (now wired)** | `profile/consent.tsx:71` → `records-api.ts:249` → `consents.ts` builds, stores and emails the bundle; e2e step "GDPR SAR Export Persisted & Signed" passes |
| 24 | E2E forces `sk_test_mock_e2e`, so it never depends on keys | **Partial** | True for Stripe; not for Daily or postcodes.io (§1.2) |
| 25 | `pavdental/.env.production` is untracked now, rotate history values | **Verified** | `.gitignore` covers it; history (511a38c, removed in 70d08c0) contains only `EXPO_PUBLIC_*` values incl. a `pk_live_` publishable key (public by design, low risk). History scan found no `sk_live_`, `whsec_` or AWS keys. |
| 26 | Background jobs: slot holds, notification dispatch, van expiry; audit monitoring on boot | **Verified** | §2.3 |
| 27 | Mobile: four portals, Zustand, React Query, `authFetch` refresh | **Verified (structure)** | Detailed review in Phase 1 |
| 28 | Local dev: "npx tsx run-tests.ts — 12 content tests" | **Partial** | It runs 20 assertions against mock data in `src/__mocks__`, not app code |

## 4. Expo MCP / device tooling

- **Remote Expo MCP** (`search_documentation`, `read_documentation`, `simulator_*`,
  `automation_*`, `build_*`, `workflow_*`): connected. Docs search works. The
  **`simulator_*` / `build_*` / `workflow_*` tools need an EAS project**, and `app.json` has
  no `extra.eas.projectId` or `owner`; there is no `EXPO_TOKEN` in this environment. So
  cloud simulators and builds are blocked until you run `eas init` (or give me an Expo
  token / project).
- **Expo plugin MCP** (`plugin:expo:expo`): failed to connect (proxy 403 on tunnel).
- **Local MCP** (`expo-mcp` dev dependency + `EXPO_UNSTABLE_MCP_SERVER=1 npx expo start`):
  not installed. Installing it changes `package.json`/lockfile, so I'm holding it for your
  OK. It also needs a local iOS simulator or Android emulator, and this Linux container has
  neither (no `xcrun`, `adb` or `emulator`).
- **Fallback that works now:** `npx expo export --platform web` bundles fine, so Phase 1
  screen checks can use Playwright screenshots of the web build. They are useful for states
  and layout but are not a substitute for native screenshots. Native verification moves to
  EAS Simulator once the project is linked.
- Also noted: `eas.json` `development` profile sets `developmentClient: true` but
  `expo-dev-client` is not a dependency, so that profile can't build.

## 5. Immediate-attention items found during Phase 0

1. **Schema/migration drift** (§1.1): production DB from `migrate deploy` breaks auth; `migrate dev` would drop the PostGIS column. Blocker.
2. **CI cannot go green as written**: mobile lockfile, `prisma db execute` missing `--schema`, e2e needs Daily + postcodes.io. Blocker.
3. **Patient names logged in clear** by the error handler (§1.3). High (PII).
4. **The SAR confirmation email interpolates `profile.firstName` into HTML unescaped** (`consents.ts`, `data-access-request`). Medium (HTML injection into our own email).
