# Pav Dental (git-pav-app) — Complete App Delivery Plan

> **Goal:** Every feature in the app works end-to-end with real backend integration, no production mocks, correct configuration, and smooth screen-to-screen UX.  
> **Repo analysed:** https://github.com/projectkaizen-hash/git-pav-app (backend + Expo mobile client under `pavdental/`)  
> **Date of analysis:** 2026-09-20  
> **Status baseline:** Prototype / Staging — **not production-ready** with patient data.

This plan is structured as:

**Current state → Correct pattern → What to do**

It covers backend blockers, mobile screens, frontend↔backend contracts, hardcoded items, missing configuration, and screen-to-screen flows for patient, clinician, and operator portals.

---

## 0. Executive Summary — Critical Blockers First

| Priority | Issue | Impact | Fix first? |
|----------|-------|--------|------------|
| P0 | Secrets committed / weak defaults | JWT, Stripe, Daily keys exposed | Yes |
| P0 | Auth refresh returns incomplete user | Cold-start / role routing broken | Yes |
| P0 | Booking & catalogue fall back to `booking-mock-data.ts` | Real prices/slots never shown | Yes |
| P0 | Video uses painted UI / static rooms | No real WebRTC consult | Yes |
| P0 | Van coverage uses postcode-prefix simulation | Wrong service-area decisions | Yes |
| P0 | No real Stripe PaymentSheet + webhook confirmation | Payments not authoritative | Yes |
| P0 | Email / SMS / push delivery not wired | Verification, reset, MFA, reminders fail silently | Yes |
| P1 | Role-based portal guards incomplete | Clinician/operator land on patient UI | Yes |
| P1 | Object storage downloads stubbed | Document vault broken locally | Medium |
| P1 | CI / lint / Prisma generate gaps | Regressions undetected | Medium |

**Order of work (recommended):**  
1. Secrets + environments + Docker health  
2. Auth (login/register/refresh/MFA/verify/reset) end-to-end  
3. Shared types alignment + API client hardening  
4. Clinic booking + Stripe (one complete happy path)  
5. Video triage + Daily rooms  
6. Van coverage + dispatch  
7. Records / odontogram / treatment plans / vault  
8. Notifications + offline operator queue  
9. Role portals, app-lock, accessibility, E2E  
10. Hardening, DSPT evidence, staging deploy

---

## 1. Repository & Infrastructure

### 1.1 Current state
- `docker-compose.yml` only runs PostGIS (Postgres 16) + Redis 7. No API container.
- `backend/.env` (or history) has real-looking secrets; `.env.example` exists but is incomplete for all providers.
- Mobile has `.env.development`, `.env.production`, `.env.example` with `EXPO_PUBLIC_API_URL`, Stripe publishable key, Daily URL.
- `pavdental/` is present as real Expo source (Expo SDK ~57, Expo Router, Zustand, TanStack Query, Stripe RN, etc.). Architecture notes that once claimed it was a broken submodule are outdated for this tree.
- No Dockerfile for the API; no staging/production deployment target defined in-repo.
- CI (if present) historically failed on missing lint script / empty mobile folder.

### 1.2 Correct pattern
- Three environments: `development`, `staging`, `production`.
- Secrets only via env / secret manager; never committed.
- `docker compose up` brings Postgres + Redis; API started via `npm run dev` (or a compose service for staging parity).
- Mobile uses `EXPO_PUBLIC_*` only for non-secret values; API URL switches by build profile.
- Shared types (`shared-types/`) are the single source of truth for request/response shapes.

### 1.3 What to do
1. Rotate every secret that has ever been in git history (JWT access/refresh, audit HMAC, Stripe secret, Daily API key, DB password).
2. Ensure `backend/.env` is gitignored and not present in the tree. Copy from `.env.example` and fill real values.
3. Expand `.env.example` (backend) with every required key:
   - `DATABASE_URL`, `REDIS_URL`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_IP_HMAC_SECRET` (≥32 chars)
   - `ALLOWED_ORIGINS`, `APP_URL`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `DAILY_API_KEY`, `DAILY_DOMAIN`
   - Object storage (`S3_*` / R2), email/SMS provider keys, Expo push credentials
4. Mobile: keep `EXPO_PUBLIC_API_URL` pointing at reachable host (localhost / 10.0.2.2 / LAN IP / staging). Never ship localhost in production builds.
5. Add a simple `Dockerfile` + optional compose service for the API for staging parity.
6. Fix or add CI: backend `lint` script (or remove step), `prisma generate` before typecheck, mobile typecheck + lint.

**Acceptance:** `docker compose up -d` → healthy Postgres/Redis; `cd backend && npm i && npx prisma generate && npx prisma migrate deploy && npm run prisma:seed && npm run dev` → `GET /health` returns `{ status: "ok", checks: { database: "ok", redis: "ok" } }`.

---

## 2. Backend — Auth & Session

### 2.1 Current state
- Routes exist: register, login, refresh, logout, sessions, email verify request/confirm, password-reset request/confirm, MFA request/verify/verify-session.
- `otp-service.ts` exports `hashToken` as a free function and service classes that call it internally. Auth routes correctly use a local `hashToken` (or import). Earlier compile mismatch is largely resolved in current tree.
- Refresh response historically omitted full `AuthUser` → mobile `setAuth(accessToken, data.user)` breaks cold start.
- Role routing on mobile (`getMobilePortalPath`) exists but index / layout guards are incomplete for clinician/operator.
- MFA is flag + code path; not enforced as step-up on privileged routes consistently.
- No real email/SMS provider wired (communication service is called but delivery is missing or stubbed).

### 2.2 Correct pattern
- Login / register / refresh always return the same `AuthUser` shape (id, role, email, names, emailVerified, mfaEnabled, profileId, …).
- Refresh rotates tokens and returns user (or client immediately calls a `/me` endpoint).
- MFA required server-side for clinician/admin before privileged actions.
- Email verification and password reset deliver real tokens via transactional email; confirm endpoints consume hashed tokens correctly.
- Session list + revoke; audit every auth event.

### 2.3 What to do
1. Make `/api/auth/refresh` return `{ accessToken, refreshToken, user: AuthUser }` (or add `GET /api/auth/me` and call it after refresh).
2. Align mobile `auth-store` and login/register handlers with the exact response shape (use shared-types).
3. Wire a real transactional email provider (Postmark / SES / Resend) into `communicationService` for verify + reset + MFA fallback.
4. Enforce MFA step-up middleware on clinician/admin routes.
5. Add account lockout, password policy (already partially present), and session revoke-all.
6. Mobile screens: ensure verify-email, forgot-password, MFA screens call the real endpoints and handle errors/expiry.

**Screen flow (patient):**  
Welcome → Login / Register → (optional Verify Email) → (optional MFA) → role-based portal (`/(patient)/(tabs)`).  
Same for clinician → `/(clinician)/…`, operator → `/(operator)/…`.

**Acceptance:** Register → receive email → confirm → login → refresh on app restart still authenticated with correct role and portal.

---

## 3. Shared Types & API Client

### 3.1 Current state
- `shared-types/api-types.ts` and `uk-localization.ts` exist.
- Mobile has feature-level API modules (`booking-api.ts`, etc.) that call backend paths.
- Some responses are typed loosely (`any`); mock data still used as fallback.

### 3.2 Correct pattern
- All mobile API calls use typed helpers generated or manually kept in sync with `shared-types`.
- No silent fallback to mock data in production builds (`EXPO_PUBLIC_APP_ENV !== "development"` or explicit feature flag).
- Zod validation on both sides for critical payloads.

### 3.3 What to do
1. Diff every backend route response against `shared-types` and fix drift.
2. In mobile, replace `any` with shared types; add runtime Zod parse where clinical data is involved.
3. Centralise `authFetch` (token attach, 401 → refresh, error normalisation).
4. Remove or gate `booking-mock-data.ts` so production paths never import it.

---

## 4. Clinic Booking Journey (Patient)

### 4.1 Screens (Expo Router)
- `/(patient)/booking/service-catalog.tsx`
- `clinic-picker.tsx`
- `clinician-picker.tsx`
- `slot-picker.tsx`
- `summary.tsx`
- `confirmed.tsx`

### 4.2 Current state
- `booking-mock-data.ts` contains full mock services, clinics, clinicians, slots.
- `booking-api.ts` correctly calls:
  - `GET /api/services`, `/clinicians`, `/clinics`
  - `GET /api/booking/slots`
  - `POST /api/booking/hold-slot`
  - `POST /api/booking/appointments`
- Fallback to mocks still present on many screens when API fails or in early prototype paths.
- Hold uses Redis; appointment starts as `draft_hold`; confirmation should be payment-gated.
- Stripe PaymentIntent creation exists on backend; mobile has `@stripe/stripe-react-native` but PaymentSheet integration is incomplete / simulated on some paths.
- Cancellation / refund route exists (`/cancel-with-refund`).

### 4.3 Correct pattern
Catalogue → clinic/clinician → availability (server authoritative) → hold (Redis NX + TTL) → summary → native PaymentSheet → Stripe webhook confirms appointment → confirmed screen + calendar/notification.

Holds expire; payment failure releases hold; confirmation is idempotent.

### 4.4 What to do (screen-by-screen)

| Screen | Current | Correct | Action |
|--------|---------|---------|--------|
| Service catalog | Often mock | API `GET /api/services` | Remove mock fallback; show loading/error/empty; use pricePence → £ display via UK helpers |
| Clinic picker | Mock or partial | `GET /api/services/clinics` | Same; filter by service channel |
| Clinician picker | Mock | `GET /api/services/clinicians` | Same; respect channel + service |
| Slot picker | Mixed | `GET /api/booking/slots` + `POST hold-slot` | Display only available slots; start hold timer UI; on expiry release + toast |
| Summary | Hardcoded details possible | Pass held appointment + deposit | Call `POST /api/payments/create-intent` with appointmentId; present Stripe PaymentSheet |
| Confirmed | Timer / mock success | Webhook-driven status | Poll or deep-link on success; show real appointment ID, time, clinic; add-to-calendar |

**Backend checks:**
- Slot generation respects clinician schedule, service duration, buffers, clinic hours, BST.
- Hold linked to user + appointment; released on expiry / failed payment.
- Webhook verifies signature, is idempotent, moves status to confirmed, triggers notification.

**Screen-to-screen UX:**
- Progress indicator (1/5 … 5/5).
- Back navigation preserves selection where safe; clear hold on abandon.
- Network error → retry without losing form state.
- Deposit clearly labelled; full price and cancellation policy visible before pay.

**Acceptance:** End-to-end on device: pick service → clinic → clinician → slot → pay with test card → appointment appears as confirmed in “My Appointments” and in admin/clinician views.

---

## 5. Payments (Stripe)

### 5.1 Current state
- Backend: `POST /api/payments/create-intent`, webhook mounted with raw body.
- Mobile: Stripe RN dependency + publishable key in env; PaymentSheet not fully wired on every path; some screens simulate success with timers.

### 5.2 Correct pattern
Server creates PaymentIntent (amount from appointment deposit/price in pence). Client presents PaymentSheet. Only signed webhook confirms payment and appointment. Never trust client-side payment ID alone.

### 5.3 What to do
1. Implement / finish PaymentSheet flow in `summary.tsx` (or dedicated payment screen) using official Expo-compatible pattern.
2. Store PaymentIntent ID on appointment; webhook looks it up and confirms.
3. Idempotency keys on create-intent and webhook handling.
4. Refund path for cancellation (already partially present).
5. Test mode keys only in development/staging; live keys only in production with restricted access.

---

## 6. Video Consultation

### 6.1 Screens
- Patient: triage, photo upload, waiting room, consult room.
- Clinician: queue, admit.

### 6.2 Current state
- Backend routes: create room, upload triage photo, submit triage, clinician queue, admit patient.
- Mobile: `DailyVideoView` is largely a painted/simulated UI; static room URLs or mock tokens appear.
- Automatic “clinician joins in 3 seconds” simulation exists.
- Photo capture uses Expo ImagePicker but upload/encryption/virus-scan path incomplete.

### 6.3 Correct pattern
Server creates short-lived, role-scoped Daily room token bound to appointment. Real Daily React Native / WebRTC integration. Triage + photos stored encrypted; clinician admits from real queue. Recording off by default with explicit consent policy.

### 6.4 What to do
1. Replace simulated video component with supported Daily.co React Native integration (or official alternative).
2. Backend issues tokens via Daily REST API; never ship static room URLs.
3. Wire triage submit + photo upload to real endpoints; show queue position from server.
4. Remove auto-join timer; use presence / admit action.
5. Permissions flow (camera/mic) with clear denial recovery.
6. Post-call summary screen backed by server data.

**Screen flow:** Triage form → photo(s) → submit → waiting → admitted → call → summary → optional follow-up booking.

---

## 7. Mobile Dental Van

### 7.1 Screens
- Service-area check, address/access details, slot, confirmation, live tracking (patient).
- Operator: stops, check-in, complete, offline queue.

### 7.2 Current state
- Backend: coverage-check, fleet, stops, check-in, complete. PostGIS available; polygons stored as GeoJSON (app-side matching possible).
- Mobile: postcode-prefix simulation in service-area; hard-coded confirmation; timer-based “payment”; map/tracking mock.
- Operator offline queue not durable / encrypted.

### 7.3 Correct pattern
Server-side coverage (PostGIS or validated GeoJSON) + geocoding. Shared booking + payment flow. Live location only on booking day with consent. Operator offline queue with idempotency, conflict resolution, and sync status.

### 7.4 What to do
1. Replace postcode simulation with `POST /api/van/coverage-check`.
2. Re-use clinic booking hold + PaymentSheet for van slots.
3. Integrate real map provider for tracking; server ingests driver location.
4. Build operator offline mutation queue (local DB + retry + auth refresh handling).
5. Real check-in / complete flows writing clinical notes and status.

---

## 8. Records, Odontogram, Treatment Plans, Document Vault

### 8.1 Current state
- Backend: patient profile, odontogram, plans, documents.
- Mobile: mock odontogram fallback for signed-in users; treatment-plan and vault paths incomplete; object-storage download throws in development.

### 8.2 Correct pattern
Every clinical datum has provenance (author, timestamp, previous value). Clinician-only mutation with appointment context. Treatment plan versioning + patient signature with evidence. Documents via short-lived signed URLs, virus scan, encryption, access audit.

### 8.3 What to do
1. Remove mock odontogram for authenticated patients; show loading / empty / error.
2. Wire tooth chart CRUD to backend with amendment history.
3. Treatment plan lifecycle: draft → patient review → accept (signature) → immutable copy.
4. Implement document upload/download against object storage; fix local download stub.
5. Consent versioning and data-access / deletion request endpoints already sketched — complete UI + audit.

---

## 9. Notifications & Communications

### 9.1 Current state
- Backend notification routes (register token, preferences, send, schedule, history).
- Mobile: Expo Notifications dependency; token registration incomplete; in-memory / simulated delivery.

### 9.2 Correct pattern
Client obtains Expo push token → registers with backend → server sends via Expo / FCM / APNs. Scheduled jobs for 48h / 24h / 2h reminders, waitlist, van arrival, video, prescription. Content minimises health data on lock screen; deep links require auth.

### 9.3 What to do
1. Implement permission + token lifecycle on mobile.
2. Persist tokens server-side; process receipts and deactivate failures.
3. Wire reminder ladder to job queue (Redis-backed already present).
4. Add transactional email/SMS for critical paths not suitable for push.

---

## 10. Role Portals & Navigation

### 10.1 Current state
- `src/app/index.tsx` uses `getMobilePortalPath(user.role)`.
- Layouts exist for `(patient)`, `(clinician)`, `(operator)`, `(auth)`, `(onboarding)`.
- Guards incomplete: some paths still funnel everyone to patient home.

### 10.2 Correct pattern
Cold start and every protected layout check role. Admin never reaches patient/clinical routes. Deep links respect role.

### 10.3 What to do
1. Harden `_layout.tsx` for each portal with role guard + redirect.
2. Clinician: queue, appointments, records write, admit video.
3. Operator: van stops, offline queue, check-in/complete.
4. Test matrix: patient / clinician / operator / admin cold start and deep link.

---

## 11. Security, App Lock, Compliance (P0 items)

- App-lock / biometric re-entry before clinical screens after backgrounding.
- Certificate pinning / network security policy for production hosts.
- No localhost fallback in release builds.
- Audit: move capture after auth where needed; keyed HMAC for IP; redact clinical data from metadata; integrity hash already present — make it operational (monitoring, retention, export).
- Consent versioning, DPIA artefacts, DSPT evidence pack (treat planning markdown as backlog until code + process exist).
- Remove unsupported compliance claims until evidenced.

---

## 12. Screen-to-Screen Integration Checklist (Patient Happy Path)

1. **Launch** → index routes by auth + role.
2. **Auth** → welcome → login/register → verify/MFA if required → patient tabs.
3. **Book clinic** → catalog (API) → clinic → clinician → slots (hold) → summary → PaymentSheet → webhook confirm → confirmed.
4. **My appointments** → list from API → detail → cancel/reschedule (policy + refund).
5. **Video** → triage → photos → submit → wait → call (real Daily) → summary.
6. **Van** → coverage check (API) → access details → slot → pay → track on day.
7. **Records** → odontogram (API) → treatment plan accept → document vault upload/download.
8. **Profile / consents / notifications** → preferences, sessions, data requests.
9. **Background** → app-lock → biometric → resume same screen with data still valid.
10. **Offline / error** → actionable empty/error states; no silent mock data.

Repeat analogous flows for clinician (queue → admit → notes) and operator (stops → check-in → complete + offline sync).

---

## 13. Testing & Definition of Done

- Backend: `npm run test` (e2e-suite) + auth integration tests green after Prisma generate.
- Mobile: typecheck, lint, routing tests; device E2E for the clinic booking path on iOS + Android.
- Staging stack reachable from physical devices (API, Postgres, Redis, Stripe test, Daily test, object storage).
- No mock data on production paths.
- All P0 items in the remediation backlog closed with evidence.
- Secrets rotated; CI green; `/health` green.

---

## 14. Suggested Implementation Phases (Executable)

**Phase A — Foundation (1–3 days)**  
Secrets, env, Docker, Prisma generate/migrate/seed, auth refresh + user shape, role guards, remove mock fallbacks for services.

**Phase B — One complete clinic booking (3–5 days)**  
Slots + hold + PaymentSheet + webhook + confirmed + appointments list. E2E on device.

**Phase C — Video + Van core (4–7 days)**  
Real Daily tokens + UI; real coverage-check; shared payment path for van.

**Phase D — Records & notifications (3–5 days)**  
Odontogram, plans, vault, push + reminders.

**Phase E — Portals, offline, hardening (ongoing)**  
Clinician/operator UX, operator offline queue, app-lock, accessibility, DSPT evidence, staging deploy.

---

## 15. File-Level Hotspots (start here)

| Area | Key files |
|------|-----------|
| Auth | `backend/src/routes/auth.ts`, `lib/otp-service.ts`, mobile `features/auth/*`, `app/index.tsx` |
| Booking | `backend/src/routes/booking.ts`, `payments.ts`, mobile `features/booking/*`, `app/(patient)/booking/*` |
| Video | `backend/src/routes/video.ts`, mobile `features/video/*`, `app/(patient)/video/*` |
| Van | `backend/src/routes/van.ts`, mobile `app/(patient)/van/*` |
| Records | `backend/src/routes/patients.ts`, mobile `features/records/*`, `app/(patient)/records/*` |
| Config | `backend/.env.example`, `pavdental/.env.example`, `docker-compose.yml`, `shared-types/` |

---

## 16. Final Notes

- The backend is the most complete part of the product (16 route groups, 27 models, Redis locks, Stripe webhook, audit chain). The mobile app is a solid Expo Router shell with many screens that still lean on mocks or incomplete integrations.
- Treat every “prototype” progress percentage in older checklists as aspirational. This plan + the existing `MOBILE-APP-REMEDIATION-TODO.md` and `architecture.md` are the practical sources of truth.
- Do not claim production readiness or DSPT compliance until the P0 gates are demonstrated on a staging environment with real test accounts and no mock clinical data.

When each section above is completed and the acceptance criteria pass, the app will have every major feature working with real frontend–backend integration and a coherent patient / clinician / operator experience.