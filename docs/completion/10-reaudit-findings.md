# Re-Audit Findings: CS-39 to CS-44, CS-53, CS-54, and CS-25 to CS-27 (BE-17)

This audit re-examines the 11 change sets previously marked "not re-audited" in [`docs/completion/03-plan.md`](./03-plan.md) (§ Where things stand) against `main` code in accordance with **BE-17** of [`06-completion-plan.md`](./06-completion-plan.md).

Re-checked against `main` @ `ff31b90` on 27 Oct 2026. Every path in sections 1–2 was opened and, where a claim rests on specific code, the file and line are named; a one-off script extracted the 49 path-like code spans in those sections and confirmed each resolves to a file or directory. The 26 Oct version cited several paths that do not exist; the corrections are listed in section 3 (its left-hand column is deliberately the old, wrong path, so those entries are expected not to exist). A claim that the code does not support is marked "Not verified" or "Partially verified" and says what is missing.

---

## 1. Summary of Findings

| Change Set | Description | Target Areas | Code & Test Evidence | Status |
|---|---|---|---|---|
| **CS-39** | Routes and deep links | `pavdental/app.json`, `pavdental/src/app`, `pavdental/src/__tests__/duplicate-routes.test.ts` | Zero duplicate route collisions across route groups; email links `/reset-password` and `/verify-email` asserted; scheme, associated domains, Android intent filters, AASA and assetlinks asserted. | **Verified Done** |
| **CS-40** | Clinician & operator day-to-day | `backend/src/routes/van.ts`, `backend/src/routes/van-stops.ts`, `backend/src/lib/van-eta.ts` | Explicit phase-transition table returns 409 on illegal transitions (`van.ts:770-784`); completing a visit syncs the linked appointment (`van.ts:801-807`); ETA tests cover queue order and overruns. | **Verified Done** |
| **CS-41** | Biometric lock | `pavdental/src/features/app-lock/app-lock-store.ts` | Background timeout and cold-start lock state are enforced and tested in `pavdental/src/__tests__/biometric-lock.test.ts`. | **Verified Done** |
| **CS-42** | Booking flow guards | `pavdental/src/app/(patient)/booking/summary.tsx`, `pavdental/src/app/(patient)/booking/slot-picker.tsx`, `pavdental/src/__tests__/booking-guards.test.ts` | Summary redirects when the draft is incomplete (`summary.tsx:32-36`) and on an expired hold (`summary.tsx:42-59`); past slots are filtered (`slot-picker.tsx:49-67`). The test covers the store, hold maths and slot filtering; the summary redirect itself is source-verified, not covered by that test. | **Verified Done** (coverage noted) |
| **CS-43** | Build configuration | `pavdental/app.json`, `pavdental/eas.json`, `pavdental/metro.config.js` | Bundle identifiers, scheme, Sentry Expo plugin and Metro config asserted in `pavdental/src/__tests__/build-config.test.ts`. | **Verified Done** |
| **CS-44** | Server operations | `backend/src/server.ts`, `backend/src/lib/error-tracking.ts` | `/livez` and `/readyz` implemented (`server.ts:109-144`), including Postgres and Redis checks; SIGTERM/SIGINT handlers (`server.ts:321-322`); Sentry `beforeSend` scrubs event text (`error-tracking.ts:21-60`). | **Verified Done** |
| **CS-53** | Truthful tests | All apps test suites | 21 app test runners in `test:all` on `main` (one per file in `pavdental/src/__tests__`), plus the content guard; 65 backend jest suites exist. The 27 Oct baseline run passed 64 of 65 suites and 495 of 502 tests; `sar-export.test.ts` failed only in the parallel run and passes 7/7 alone. | **Partially verified** (counts corrected; the "no mocked passes" claim was not re-proven suite by suite) |
| **CS-54** | Auth and session hardening | `backend/src/routes/auth.ts`, `backend/src/lib/session-revocation.ts` | Failed-attempt counter increments atomically (`auth.ts:151-155`); enforced lockout is per user+IP in Redis with exponential backoff (`auth.ts:159-167`); push tokens are deactivated for the user when sessions are revoked by `userId` (`session-revocation.ts:32-41`). Covered by `auth-session-hardening.test.ts` and `session-security.test.ts`. | **Verified Done** (wording corrected) |
| **CS-25** | Consents (app side) | `backend/src/routes/consents.ts`, `pavdental/src/app/onboarding/consents.tsx`, `pavdental/src/app/(patient)/(tabs)/profile/consent.tsx` | Transactional grant and withdraw with versioning (`consents.ts:37-177`); server-observed HMAC-SHA256 IP pseudonymisation (`lib/audit-security.ts:4-6`); hash-chained audit entries; `consent-integrity.test.ts`. | **Verified Done** |
| **CS-26** | PHI at rest & screen security (app side) | `pavdental/src/features/screen-security/`, `backend/src/lib/encryption.ts` | Screenshot and app-switcher blocking via `screen-guard.ts:21-35` and `screen-security.ts`; AES-256-GCM envelope encryption with a versioned key (`encryption.ts:4,84,170,185`). Covered by `screen-security.test.ts`, `phi-encryption.test.ts` and `encryption-keys.test.ts`. | **Verified Done** |
| **CS-27** | Video consultations (app side) | `pavdental/src/app/(patient)/video/`, `backend/src/routes/video.ts` | Patients cannot get a token before admission (`video.ts:102-105`); the token expiry is bounded by the appointment end plus grace (`video.ts:111-125`) and uses `eject_at_token_exp: true`; clinician admission route at `video.ts:407-452`. Covered by `video-rooms.test.ts`, `video-access.test.ts` and `video-consult-lifecycle.test.ts`. | **Verified Done** |

---

## 2. Detailed Technical Audit

### 2.1 CS-39: Routes and Deep Links

- **Route collisions**: `pavdental/src/__tests__/duplicate-routes.test.ts` walks `pavdental/src/app`, strips route groups such as `(patient)`, and asserts that no two files resolve to the same URL. It also pins `/check-in` to `(patient)/check-in.tsx` and `/van-check-in` to `(operator)/van-check-in.tsx`.
- **Deep links**: the same test pins `/reset-password` and `/verify-email` to their auth screens and checks `expo.scheme` (`pavdental/app.json:6`), iOS associated domains, Android `autoVerify` intent filters, and the website's `apple-app-site-association` and `assetlinks.json`.
- **Correction**: the earlier version claimed `/booking`, `/video` and `/prescriptions` were verified deep-link targets. No test asserts those paths, so the claim was removed. A Maestro flow opens `pavdental:///van/service-area` (batch 1), which is the only other path exercised end to end.

### 2.2 CS-40: Clinician and Operator Operations

- **Phase validation**: `backend/src/routes/van.ts:770-784` defines the allowed transitions (`queued → en_route → on_site → in_treatment → completed`, plus `no_show`) and returns HTTP 409 with the allowed next phases on an illegal move.
- **Completion sync**: `backend/src/routes/van.ts:801-807` moves an associated appointment to `completed` or `no_show`, and awards visit points on completion (line 808-814).
- **ETA**: `backend/src/lib/van-eta.ts` computes remaining treatment time and ETA labels; `van-eta.test.ts`, `van-eta-optimize.test.ts` and `van-eta-broadcast.test.ts` cover it.

### 2.3 CS-41: Biometric Lock

- **State machine**: `pavdental/src/features/app-lock/app-lock-store.ts:24,39` tracks `isLocked`, `requiresBiometric` and `lockTimeoutMs` (60 s default); `checkLockRequired` locks after the timeout (`:98-113`).
- **Cold start**: `biometric-lock.test.ts` asserts that the app starts locked when biometric lock is enabled (line 67) and that the background timeout triggers a lock (line 124).

### 2.4 CS-42: Booking Flow Guards

- **Incomplete draft**: `pavdental/src/app/(patient)/booking/summary.tsx:32-36` replaces the route with the service catalogue when the service or slot is missing.
- **Expired hold**: `summary.tsx:42-59` alerts and sends the user back to the slot picker when `holdExpiresAt` is missing or in the past.
- **Past slots**: `pavdental/src/app/(patient)/booking/slot-picker.tsx:49-67` filters slots whose `startTimeUtc` is at or before `Date.now()`.
- **Test coverage**: `booking-guards.test.ts` exercises the real booking store (initial state, hold maths) and the slot filtering rule. It does not mount the summary screen, so the redirect is verified by reading the code, not by that test.

### 2.5 CS-43: Build Configuration

- **Identifiers**: `pavdental/app.json` sets `com.pavdental.app` and the `pavdental` scheme; `eas.json` carries the build profiles.
- **Sentry**: `@sentry/react-native/expo` plugin in `app.json` and `getSentryExpoConfig` in `pavdental/metro.config.js` (added in PR #113).
- **Test**: `pavdental/src/__tests__/build-config.test.ts` fails on invented values and asserts the build channels and runtime policies.

### 2.6 CS-44: Server Operations

- **Health probes**: `backend/src/server.ts:109-144` implements `/livez` (liveness) and `/readyz` plus `/healthz` (readiness), which run `SELECT 1` and `redis.ping()` and return 503 when either fails.
- **Graceful termination**: `server.ts:251` defines the shutdown handler and `server.ts:321-322` wires `SIGTERM` and `SIGINT`.
- **Error tracking**: `backend/src/lib/error-tracking.ts:21-60` scrubs event messages and exception values through `scrubText` and installs `scrubEvent` as `beforeSend`.

### 2.7 CS-53: Truthful Tests

- **App**: `pavdental/package.json`'s `test:all` runs 21 `tsx` runners on `main`, one per file in `pavdental/src/__tests__`, then `check-fabricated-content.mjs`. Batch 1 adds a 22nd runner (`haptics-imports.test.ts`).
- **Backend**: 65 `*.test.ts` files exist under `backend/src`. The 27 Oct baseline run passed 64 of 65 suites and 495 of 502 tests; `sar-export.test.ts` failed in the parallel run (a pre-existing flake) and passed 7/7 when run alone.
- **Not verified**: the earlier assertion that no suite relies on synthetic mocks was spot-checked (for example, `booking-guards.test.ts` imports the real booking store) but not re-proven for every suite. The status is therefore Partially verified.

### 2.8 CS-54: Auth and Session Hardening

- **Atomic counter**: `backend/src/routes/auth.ts:151-155` increments `failedLoginAttempts` with Prisma's atomic `increment`.
- **Backoff**: `auth.ts:159-167` increments a per-user, per-IP Redis counter; from the fifth failure the lock lasts 60 s and doubles per further failure, capped at one hour. Note that `user.lockedUntil` is checked (`auth.ts:134`, `auth-otp.ts:55,95`) but no failure path writes it; the enforced lock is the Redis user+IP lock, and rotating IPs is caught by step-up MFA at five stored failures (`auth.ts:183-187`).
- **Push tokens**: `backend/src/lib/session-revocation.ts:32-41` deactivates every push token for the user when sessions are revoked with a `userId`. It is not scoped to one session, which matches the schema; the earlier "associated with the terminated session" wording was wrong.
- **Tests**: `auth-session-hardening.test.ts` and `session-security.test.ts`; the latter sets `lockedUntil` directly to exercise the locked-account path.

### 2.9 CS-25 to CS-27: Mobile Features & Clinical Safeguards

- **CS-25**: `backend/src/routes/consents.ts` grants (`:37-110`) and withdraws (`:114-177`) consent transactionally with versioning. IPs are pseudonymised with HMAC-SHA256 (`backend/src/lib/audit-security.ts:4-6`) and written to the hash-chained audit log via `createAuditLogWithIntegrity`. The app grants consent at `pavdental/src/app/onboarding/consents.tsx:80-94`, reads it at `pavdental/src/app/(patient)/(tabs)/profile/consent.tsx:17`, and toggles grant/withdraw at line 49. Covered by `backend/src/__tests__/consent-integrity.test.ts`.
- **CS-26**: `pavdental/src/features/screen-security/screen-guard.ts:21-35` blocks capture per screen and hides the app-switcher preview while any protected screen is open; `screen-security.ts` wires it to `expo-screen-capture` (no-op on web). Sensitive fields are encrypted with AES-256-GCM envelope encryption (`backend/src/lib/encryption.ts:4,84,170,185`).
- **CS-27**: `backend/src/routes/video.ts:102-105` refuses a patient token until the appointment is `in_progress`; the token is bounded by the appointment end plus the room grace (`:111-125`) with `eject_at_token_exp: true`. The admit endpoint is `POST /api/video/admit-patient` (`:407-452`). The app's video screens live under `pavdental/src/app/(patient)/video/`.

---

## 3. Corrections to the 26 Oct Version

| Previous claim | Reality on `main` @ `ff31b90` |
|---|---|
| `pavdental/src/stores/app-lock-store.ts` | `pavdental/src/features/app-lock/app-lock-store.ts` |
| `pavdental/src/lib/booking-guards.ts` | No such module. The guards live in `pavdental/src/app/(patient)/booking/summary.tsx` and `slot-picker.tsx`; the test is `pavdental/src/__tests__/booking-guards.test.ts`. |
| `pavdental/src/lib/screen-security.ts` | `pavdental/src/features/screen-security/screen-guard.ts` and `screen-security.ts` |
| `pavdental/src/app/consents/` | `pavdental/src/app/onboarding/consents.tsx` and `pavdental/src/app/(patient)/(tabs)/profile/consent.tsx`; the API is `backend/src/routes/consents.ts` |
| `pavdental/src/app/video/` | `pavdental/src/app/(patient)/video/` |
| `backend/src/routes/vans.ts` | `backend/src/routes/van.ts`, `van-stops.ts` and `van-queue.ts` |
| Deep links `/booking`, `/video`, `/prescriptions` verified | Not tested; the suite verifies `/reset-password` and `/verify-email` |
| 19 app suites; 64 backend jest suites | 21 app runners on `main`; 65 backend jest suites (64/65 pass in parallel; `sar-export.test.ts` passes 7/7 alone) |
| Push tokens deactivated "for the terminated session" | Deactivated for the user when sessions are revoked by `userId` |
| "Atomic lockout counters" without qualification | Counter is atomic; the enforced lock is the Redis per-user, per-IP lock with exponential backoff |
