# 03: Completion plan (Phase 3)

**Status: draft for your approval. No code has been changed.**

Linear: project [Pav Dental: completion](https://linear.app/pavdental/project/pav-dental-completion-dd6261f921c6) in team ZIS. CS-NN maps to issue ZIS-(NN+4), for example CS-01 is ZIS-5 and CS-47 is ZIS-51.

The plan is in six tiers, in this order:
1. Blockers and security
2. Data integrity and payments
3. GDPR
4. Features
5. UX
6. Release

Each change set (CS) is meant to be one small, reviewable PR (or a short series where it says so). It lists the findings it closes, the files it touches, the skills to load, the tests to add, acceptance criteria, dependencies and size.

**Sizes:** S ≤ 1 day, M = 2–4 days, L = 1–2 weeks (split into PRs). **🛑** marks a change set that needs your decision or explicit approval before it starts. Those are listed again as numbered questions at the end.

**Ground rules for every change set:**
- The jest and e2e suites stay green, and no test is weakened or skipped.
- Stripe is test mode only.
- No real patient data in fixtures, logs or screenshots.
- `security-discipline` runs on every diff.
- `testing-with-discernment` applies whenever tests are written.

Every finding ID in `01-findings.md` maps to exactly one change set (see the coverage index at the end).

---

## Tier 1: Blockers and security (milestone **M1 Safe to test with real users**)

### CS-01 Make migrations produce the real schema
- **Closes:** P0-1, MG-1, MG-2, DB-7
- **Files:** `backend/prisma/schema.prisma` (declare `polygon Unsupported(...)`); a new additive migration (5 tables, 3 columns); `docs/completion/migrations.md` (conventions)
- **Skills:** `migration-safety`, `review-migration`, `data-modeling-discipline`
- **Tests:** a fresh DB built with `migrate deploy` runs the seed, jest and e2e; `prisma migrate diff --exit-code` is clean
- **Acceptance:** a clean checkout passes all suites without manual SQL. The new migration only creates objects (no drops, no rewrites).
- **Depends on:** none
- **Size:** M
- 🛑 This is a production migration, but additive only. Your OK covers running it in staging.

### CS-02 CI green and guarded
- **Closes:** P0-2, CI-1, GE-1, PR-1
- **Files:** `.github/workflows/ci.yml`; a test-only fetch stub for Daily and postcodes.io (`backend/test/stubs/external-fetch.mjs`); a `docker build` job; `backend/.dockerignore`
- **Skills:** `testing-with-discernment`
- **Tests:** CI itself; the drift check fails on a deliberately drifted schema (verified locally: exit 2)
- **Acceptance:** CI is green on the PR, and a drift or Docker failure turns it red
- **Note:** mobile jest wiring and the lint step moved to CS-46, because the 3 mobile test files test inline copies and need rewriting before they can gate CI
- **Depends on:** CS-01
- **Size:** M

### CS-03 Fail-closed configuration
- **Closes:** CF-1, VP-1, CN-2, JW-1
- **Files:** `config/env.ts`; `lib/van-payments.ts`, `cancellations.ts`, `payments.ts` (mock detection); `lib/jwt.ts`
- **Skills:** `security-discipline`, `error-handling-as-design`
- **Tests:** unit tests on the env matrix (unknown `NODE_ENV` throws; production rejects `sk_test_mock*`, `pk_test_placeholder` and dev secrets)
- **Acceptance:** dev defaults only apply with `NODE_ENV=development|test`, and mock Stripe is impossible outside test
- **Depends on:** none
- **Size:** S

### CS-04 Appointment confirm only after verified payment
- **Closes:** BK-5, CN-1, BK-4 (server-side price and duration)
- **Files:** `routes/booking.ts` (confirm checks the PaymentIntent with Stripe and records the amount from Stripe, never from the body); `pavdental/src/features/payment/payment-hooks.ts` (remove `useConfirmAppointment`)
- **Skills:** `idempotency-and-side-effects`, `security-discipline`; Stripe MCP (docs and planner only)
- **Tests:** regression test using the existing `probe-confirm` reproduction (no-id, `pi_mock_` and amount-tampering cases all fail); the e2e path uses Stripe test mode or the webhook stub
- **Acceptance:** an appointment becomes `confirmed` only from a verified `succeeded` (or `requires_capture`) intent whose amount matches the server price
- **Depends on:** CS-03
- **Size:** S
- 🛑 This doesn't change capture or refund semantics, it closes a bypass. I'll still show you the diff before merging, because it touches payment confirmation.

### CS-05 Remove fabricated data from the backend
- **Closes:** MS-1, RW-1, DB-5, FN-1 (interim)
- **Files:** `routes/messages.ts`, `rewards.ts`, `financing.ts`; schema defaults migration (defaults to 0 or null, nullable `dispatchedAt`)
- **Skills:** `data-modeling-discipline`, `migration-safety`
- **Tests:** a new user sees an empty inbox, zero metrics, no points and no financing offer
- **Acceptance:** no endpoint writes content the user or a clinician didn't create. Financing returns `503 feature_unavailable` behind a flag until you decide.
- **Depends on:** CS-01
- **Size:** M
- 🛑 Deleting the already-seeded fabricated rows in any real environment is a destructive data change, and switching off financing is removing a feature. Both need your OK.

### CS-06 Remove fabricated clinical content from the app
- **Closes:** MC-1, MC-2, MC-4, MC-5 (interim neutral wording), BK-7
- **Files:**
  - `(clinician)/rx-dispense.tsx` (load the patient and allergies, empty form)
  - `(operator)/check-in.tsx` (load the stop)
  - `records/prescriptions.tsx` (no fallbacks)
  - `home.tsx` (no fallback catalogue or points)
  - `odontogram.tsx`, `insights.tsx`, `waiting.tsx`, `waitlist.tsx`, profile copy
  - `booking.ts` check-in defaults
  - a CI grep guard (drug names, staff names, tooth numbers in `src/app`)
- **Skills:** `expo-data-fetching`, `expo-native-ui`
- **Tests:** component tests for rx-dispense (shows the real allergy, blocks submit without a patient); the CI guard
- **Acceptance:** every clinical value on screen comes from the API, and missing data shows "Not recorded"
- **Depends on:** CS-21 (API client), but it can start in parallel
- **Size:** M

### CS-07 Video: private rooms now, hide the mock call
- **Closes:** VD-1, AC-2, and the interim part of MC-3
- **Files:** `routes/video.ts` (`privacy: private`, owner/participant meeting tokens, room-per-appointment idempotency); `video/call.tsx` and `video/summary.tsx` (replace the mock with "Join consultation" opening the tokenised room, plus an honest summary)
- **Skills:** `security-discipline`, `expo-router`
- **Tests:** room creation is private, a patient token works only for their own appointment, and there's no room URL before admit
- **Acceptance:** nothing scripted is shown, and a stranger can't join a room
- **Depends on:** CS-09
- **Size:** M

### CS-08 Authentication hardening
- **Closes:** MF-1, AT-1, AT-2, AT-3, AT-5, AT-7, AT-8, AM-1, OT-1, OT-2, OT-3, CS-4
- **Files:** `routes/auth*.ts`, `middleware/auth.ts`, `middleware/mfa.ts`, `lib/otp-service.ts`
- **Skills:** `auth-and-authorization`, `security-discipline`
- **Tests:** a clinician needs MFA; phone OTP works for patients only; a duplicate phone is rejected; check-email no longer leaks the role; attempt limits; a refresh grace window for parallel refreshes; a revoked session is rejected immediately
- **Acceptance:** all of the above pass, and existing auth tests stay green
- **Depends on:** CS-01 (MFA tables)
- **Size:** M (2 PRs: MFA and OTP, then sessions)

### CS-09 Care-team authorisation and the IDOR test matrix
- **Closes:** PT-1, PT-2, PA-1, RX-2, RX-3, MS-2, NT-1, AR-1, PM-1, VR-4, VR-5
- **Files:** a new `lib/care-team.ts`, applied in `patients.ts`, `prescriptions.ts`, `messages.ts`, `video.ts`, `notifications.ts`, `audit.ts`, `payments.ts`, `van.ts`
- **Skills:** `auth-and-authorization`, `security-discipline`
- **Tests:** a cross-patient and cross-role matrix over every patient-scoped endpoint, asserting 403 (REQ-SEC-003)
- **Acceptance:** clinicians can't edit the login phone or sign plans, and access requires an active or recent care relationship
- **Depends on:** none
- **Size:** M
- 🛑 How long after the last appointment a clinician keeps access is a product and governance rule. I'll propose 12 months.

### CS-10 Stop claiming prescription dispatch (interim)
- **Closes:** RX-1 (interim)
- **Files:** `routes/prescriptions.ts` (status `issued`, no fake EPS reference or QR); patient prescription screens (wording)
- **Skills:** none specific
- **Tests:** the API response has no `DISPATCHED_TO_PHARMACY`
- **Acceptance:** no screen or email says a prescription was sent to a pharmacy
- **Depends on:** none
- **Size:** S
- 🛑 Clinical wording needs your sign-off.

### CS-11 No PII, PHI or secrets in logs
- **Closes:** P0-3, EH-1, CS-1, SL-1
- **Files:** `middleware/error-handler.ts`, `lib/communication-service.ts`, `lib/structured-logging.ts` (adopt everywhere)
- **Skills:** `observability-by-default`, `security-discipline`
- **Tests:** a log-capture test asserts that a name, a medical field, an OTP and a reset token never appear in output
- **Acceptance:** with no email or SMS provider, sends fail loudly in production and log metadata only in dev
- **Note:** delivered as error handler, communication service and a shared `lib/log-safety.ts`. Moving every `console.*` call onto one structured logger with request ids (the rest of SL-1) goes with error tracking in CS-44, where the transport is chosen.
- **Depends on:** none
- **Size:** S

### CS-12 Safe seed
- **Closes:** SD-1, SD-2
- **Files:** `prisma/seed.ts` (environment guard, env-supplied demo password, reference vs demo split); `tsconfig` build exclude
- **Skills:** none specific
- **Tests:** the seed refuses to run in production or staging without `ALLOW_SEED=demo`
- **Acceptance:** the compiled seed isn't in the image
- **Depends on:** none
- **Size:** S

### CS-13 Encryption key derivation and signing keys
- **Closes:** EN-1, EN-3, EN-2 (docs)
- **Files:** `lib/encryption.ts` (fixed salt, versioned key id, re-wrap migration script for existing ciphertext), `lib/object-storage.ts`, docs
- **Skills:** `security-discipline`, `migration-safety`
- **Tests:** round-trip across a key-id change; existing van `accessDetails` ciphertext still decrypts after re-wrap
- **Acceptance:** changing `AWS_REGION` no longer bricks data
- **Depends on:** CS-03
- **Size:** M
- 🛑 The re-wrap rewrites existing ciphertext in place (reversible from a backup). Real KMS would be a new paid service, so it's your decision.

### CS-14 Rate limiting that fits the app
- **Closes:** SV-1
- **Files:** `server.ts` (`trust proxy`, Redis store, per-user keys); polling intervals in operator and live-track screens
- **Skills:** `performance-and-scaling`
- **Tests:** a 15-minute operator polling simulation stays under the limit; the auth limiter is still per IP
- **Acceptance:** no 429s in a realistic operator or patient session behind a proxy
- **Depends on:** none
- **Size:** S

---

## Tier 2: Data integrity and payments (milestone **M2 Money and bookings are correct**)

### CS-15 Atomic van accept and one-active constraints
- **Closes:** VR-1, VR-6, DB-2 (van and shift part), VR-8, VR-11
- **Files:** `routes/van.ts` (compare-and-set accept, idempotent capture); migration (partial unique indexes)
- **Skills:** `idempotency-and-side-effects`, `migration-safety`
- **Tests:** concurrent accept creates one appointment and one capture; a retried accept after capture succeeds
- **Acceptance:** races are prevented by the DB, not by timing
- **Depends on:** CS-01
- **Size:** M
- 🛑 The migration needs any existing duplicates resolved first (none expected outside test).

### CS-16 No double booking, no past slots
- **Closes:** BK-2, BK-9, DB-2 (appointments part), ID-1, BK-3
- **Files:** migration (`btree_gist` exclusion constraint); `booking.ts` (bind the hold to times, drop past slots, client `Idempotency-Key`); `lib/idempotency.ts`
- **Skills:** `migration-safety`, `idempotency-and-side-effects`, `query-discipline`
- **Tests:** concurrent create on the same clinician and slot gives one booking; past slots aren't returned; rebooking after cancel works
- **Acceptance:** overlap is impossible at the DB level
- **Depends on:** CS-01, CS-04
- **Size:** M

### CS-17 Webhook completeness
- **Closes:** WH-1, WH-2, WH-3, VP-2, VP-3, VP-4, BJ-4
- **Files:** `routes/payments.ts`, `lib/van-payments.ts`, `lib/background-jobs.ts` (release-owed sweeper)
- **Skills:** `idempotency-and-side-effects`, `error-handling-as-design`; Stripe MCP (docs and planner)
- **Tests:**
  - a late-success deposit is refunded or released and the patient is told
  - a dispute or refund event updates state
  - a failed release is retried
  - webhook replay is a no-op
- **Acceptance:** no money is held without a matching live booking
- **Depends on:** CS-04
- **Size:** M
- 🛑 Automatically refunding a late deposit (instead of reviving the booking) is a change to refund semantics.

### CS-18 One cancellation path
- **Closes:** BK-6, VR-7 (after decision)
- **Files:** `booking.ts`, `cancellations.ts`, `van.ts`, app cancel calls
- **Skills:** `idempotency-and-side-effects`
- **Tests:** completed or in-progress appointments can't be cancelled; every cancel path applies the same refund policy
- **Acceptance:** there's one endpoint, and the policy is in one function
- **Depends on:** CS-17
- **Size:** S
- 🛑 Retiring the no-refund `PATCH /cancel` and the van cancel-after-accept refund amount are both refund-semantics decisions.

### CS-19 Reminders and push that behave
- **Closes:** DB-6 (dispatcher and FK indexes), BJ-1, BJ-2, BJ-3, BJ-5, PP-1, PP-2, PP-3, CS-2, CS-3, NT-2, EB-1, VS-1
- **Files:** `lib/background-jobs.ts` (claim step, Europe/London formatting, cancel the ladder), `lib/patient-push.ts`, `lib/communication-service.ts` (timeouts, chunking, receipts), `routes/van-stops.ts`
- **Skills:** `idempotency-and-side-effects`, `observability-by-default`
- **Tests:**
  - cancelling an appointment removes its reminders
  - BST formatting is correct
  - two dispatchers send once
  - a missing preferences row means push is on
  - `DeviceNotRegistered` deactivates the token
- **Acceptance:** each reminder is sent at most once, at the right local time, only for live bookings
- **Depends on:** CS-01
- **Size:** M

### CS-20 Audit chain that survives replicas and retention
- **Closes:** AU-1, AU-2, AU-3, AU-4, AU-5, AU-6, VC-1, VC-2, VC-3, VC-4
- **Files:** `lib/audit*.ts` (advisory-lock or DB-sequenced chain, covering metadata, verifying from the archive boundary, logging denials); `lib/van-coverage.ts` (DDL moved into a migration)
- **Skills:** `data-modeling-discipline`, `migration-safety`
- **Tests:** two concurrent writers keep one valid chain; verification passes after archiving; a 403 on patient data is audited
- **Acceptance:** the hourly verifier is quiet on a healthy system and fires on real tampering
- **Depends on:** CS-01
- **Size:** M

### CS-21 One mobile API client
- **Closes:** MA-1, MA-2, MA-5, VA-1 (field errors), EH-2
- **Files:**
  - `features/auth/auth-api.ts` (single refresh)
  - `features/payment|video|notifications/*` and 5 screens (use `authFetch`)
  - one `API_URL` constant
  - a `signOut()` that clears the query cache and stores
  - backend validation error details
- **Skills:** `expo-data-fetching`
- **Tests:** a 401 mid-flow refreshes and retries; sign out clears the cache
- **Acceptance:** no raw `fetch` to the API outside the client (lint rule)
- **Depends on:** none
- **Size:** M

### CS-22 Saved cards: use them or remove them
- **Closes:** PM-2
- **Files:** `payments.ts`, `van.ts` (attach `customer`, `setup_future_usage`) or remove the screen
- **Skills:** Stripe MCP (planner)
- **Tests:** a deposit made with a saved card
- **Acceptance:** the screen matches what actually happens
- **Depends on:** CS-04
- **Size:** S
- 🛑 Product decision.

---

## Tier 3: GDPR (milestone **M3 Lawful to hold patient data**)

### CS-23 Erasure pipeline
- **Closes:** CO-2, AT-6, DB-1
- **Files:**
  - migration: FKs with explicit `onDelete` on the newer tables, plus pseudonymisation columns
  - `lib/erasure.ts`: cancel future bookings, release holds, delete push tokens, pseudonymise the profile, keep the clinical records the law requires
  - a DPO queue API
  - delete-account screen wording
- **Skills:** `data-modeling-discipline`, `migration-safety`
- **Tests:** an erasure run on a seeded patient leaves no direct identifiers outside retained records, and the retained records are flagged
- **Acceptance:** an Art. 17 request completes end to end, and the deadline is visible in the queue
- **Depends on:** CS-01, CS-09
- **Size:** L
- 🛑 Retention periods are a legal decision. This change set also includes a destructive migration and deletes data.

### CS-24 A complete SAR, delivered in the app
- **Closes:** SAR-1, SAR-2, OS-3
- **Files:** `routes/consents.ts`, `lib/object-storage.ts`, an app download screen
- **Skills:** none specific
- **Tests:** a SAR bundle contains every entity type listed in SAR-1; the link requires authentication and isn't emailed as a bearer URL
- **Acceptance:** the bundle is complete and the patient can still download it after 15 minutes
- **Depends on:** CS-05
- **Size:** M

### CS-25 One source of truth for consent
- **Closes:** PT-4, CO-1, DB-3 (IP part), DP-1 (guardian consent record)
- **Files:** `consents.ts`, `patients.ts`, `patient-dependants.ts`, migration (drop the JSON column after backfill)
- **Skills:** `migration-safety`
- **Tests:** grant and withdraw are transactional and audited; the IP is server-observed and hashed
- **Acceptance:** the profile PUT can't change consents
- **Depends on:** CS-01
- **Size:** S
- 🛑 Dropping `patient_profiles.consents` after backfill is destructive (it's done in two steps, with the drop as a separate PR).

### CS-26 PHI at rest
- **Closes:** OS-1, OS-2, DB-3, REQ-SEC-002
- **Files:** `lib/object-storage.ts` (S3 in every deployed environment, server-side encryption verified at boot), field encryption for `medicalHistory`, `triageData`, `accessDetails`, `Message.body` and notes, plus a backfill script
- **Skills:** `migration-safety`, `security-discipline`
- **Tests:** a raw-column test shows ciphertext and reads round-trip
- **Acceptance:** staging never writes PHI to local disk
- **Depends on:** CS-13
- **Size:** L

---

## Tier 4: Features (milestone **M4 Feature complete**)

### CS-27 Real video consultations
- **Closes:** MC-3, VD-2, VD-3, VD-4, AC-1, AC-3
- **Files:** `@daily-co/react-native-daily-js` and its config plugin (needs a dev build), `video/call.tsx`, the clinician consult room in-app, an "end consult" endpoint, a summary built from real data, red flags run on triage
- **Skills:** `expo-dev-client`, `expo-module` (plugin config only), `expo-native-ui`, `expo-data-fetching`
- **Tests:** an API test for the admit → join → end lifecycle; a manual two-device test on the EAS simulator once there's a token
- **Acceptance:** a patient and clinician complete a consult in the app, and the summary shows only what the clinician recorded
- **Depends on:** CS-07, CS-28, CS-43
- **Size:** L
- 🛑 Triage wording (see CS-36).

### CS-28 Clinician portal
- **Closes:** gaps §2 (patient record, notes, odontogram editor, plan builder, complete / no-show), PT-3, MB-4
- **Files:** new clinician screens and an `AppointmentNote` model with append-only tooth history
- **Skills:** `expo-router`, `expo-native-ui`, `data-modeling-discipline`, `expo-design-system`
- **Tests:** API tests per endpoint; component tests for the editor
- **Acceptance:** a clinician can run a day from the app
- **Depends on:** CS-09
- **Size:** L (3 PRs)

### CS-29 Messaging that reaches people
- **Closes:** MS-3
- **Files:** recipient routing (care team plus a practice inbox), staff notifications, a clinician inbox screen
- **Skills:** `data-modeling-discipline`
- **Tests:** a patient message notifies the care team, and a staff reply shows the staff name
- **Acceptance:** no message goes unread by design
- **Depends on:** CS-05, CS-09
- **Size:** L
- 🛑 Whether to show an "out of hours, call 111" banner and what it says is clinical wording.

### CS-30 Real availability
- **Closes:** BK-1, BK-8, DB-4 (opening hours)
- **Files:** availability and rota model, Europe/London slot generation, a clinic closure calendar
- **Skills:** `data-modeling-discipline`, `query-discipline`
- **Tests:** a DST boundary test; closed days return no slots
- **Acceptance:** the slots match the rota
- **Depends on:** CS-16
- **Size:** L
- 🛑 Opening hours and rota model.

### CS-31 Back office
- **Closes:** AD-1, the admin part of gaps §2
- **Files:** admin API for clinicians, operators, clinics, vans, services, polygons and assignments, plus a UI
- **Skills:** `auth-and-authorization`
- **Tests:** an admin-only matrix
- **Acceptance:** onboarding a clinician needs no SQL
- **Depends on:** CS-08
- **Size:** L
- 🛑 Web dashboard vs. an admin section in the app.

### CS-32 Waitlist offers, or remove the waitlist
- **Closes:** WL-1
- **Files:** `waitlist.ts`, a cancellation hook, an offer push and claim screen
- **Skills:** `idempotency-and-side-effects`
- **Tests:** a cancellation offers the slot to the first person in the queue, and an expired offer moves on
- **Acceptance:** the feature does what the screen promises
- **Depends on:** CS-18, CS-19
- **Size:** M
- 🛑 Build or remove.

### CS-33 Rewards and financing per decision
- **Closes:** RW-2, FN-1
- **Files:** `rewards.ts` (rate limits, voucher validation) or removal; financing partner integration or removal
- **Skills:** none specific
- **Tests:** points can't be farmed; a voucher can be used once
- **Acceptance:** no unbounded value creation
- **Depends on:** CS-05
- **Size:** M
- 🛑 Rewards rules. For financing: an FCA-authorised partner (paid), or remove it.

### CS-34 Booking for dependants
- **Closes:** gaps §2 (dependants), DP-1 (validation and update)
- **Files:** `createAppointmentSchema` (`dependantId`), a booking picker, dependant DOB rules
- **Skills:** none specific
- **Tests:** a guardian books for a child, and another patient can't book for that child
- **Acceptance:** the dependant shows on the appointment and the clinician schedule
- **Depends on:** CS-25
- **Size:** M
- 🛑 Age limits and the guardian consent wording.

### CS-35 Prescriptions: the chosen route
- **Closes:** RX-1 (final)
- **Files:** depends on the decision: a signed PDF, a third-party service, or a separate NHS EPS programme
- **Skills:** none specific
- **Tests:** depend on the route
- **Acceptance:** the patient-facing state matches reality
- **Depends on:** CS-10
- **Size:** M to L
- 🛑 The EPS route.

### CS-36 Triage rules with clinical sign-off
- **Closes:** TE-1, VD-2 (wording)
- **Files:** `lib/triage-engine.ts`, the triage modal copy
- **Skills:** `testing-with-discernment`
- **Tests:** a table test per red-flag rule taken from the signed-off spec
- **Acceptance:** the rules match the signed document
- **Depends on:** none
- **Size:** S
- 🛑 Clinical sign-off.

---

## Tier 5: UX (milestone **M5 Polished and accessible**)

### CS-37 Loading, error, empty and offline states
- **Closes:** MA-4
- **Files:** NetInfo with `onlineManager`, an offline banner, a shared `QueryState` component, 22 screens
- **Skills:** `expo-data-fetching`, `expo-design-system`
- **Tests:** component tests for each state on 3 representative screens
- **Acceptance:** every query screen has all four states
- **Depends on:** CS-21
- **Size:** M

### CS-38 Accessibility pass
- **Closes:** MB-6, MB-7
- **Files:** shared components first, then icon buttons and toggles; a large-text check
- **Skills:** `expo-native-ui`, `expo-design-system`
- **Tests:** the web Playwright audit finds zero unlabelled controls; a VoiceOver/TalkBack smoke checklist
- **Acceptance:** zero unlabelled controls, and layout holds at 320 px and at the largest text size
- **Depends on:** none
- **Size:** M

### CS-39 Routes and deep links
- **Closes:** MB-1, AT-4, CG-3 (links part)
- **Files:** rename the colliding routes, a duplicate-URL routing test, universal and app links, a reset/verify deep-link screen
- **Skills:** `expo-router`
- **Tests:** a routing test that fails on duplicate URLs; deep-link tests
- **Acceptance:** an emailed link opens the right screen on the device
- **Depends on:** CS-43
- **Size:** M

### CS-40 Clinician and operator day-to-day
- **Closes:** MB-5, VE-1, VE-2, VE-3, VR-2, VR-3, VR-9, VR-10, PV-1
- **Files:** a date-scoped schedule, phase-transition validation, completion syncing the appointment, ETA caching and no negative overrun, background location (or "last seen" times), public-van geo reuse
- **Skills:** `performance-and-scaling`
- **Tests:** phase-transition table tests; a completing stop marks the appointment completed
- **Acceptance:** ETAs never go down because of an overrun
- **Depends on:** CS-15
- **Size:** M
- 🛑 Background location needs an app-store justification.

### CS-41 Biometric lock that locks
- **Closes:** MA-3
- **Files:** `_layout.tsx`, `app-lock-store.ts`, routing to `biometric-unlock`
- **Skills:** none specific
- **Tests:** a cold start with the lock enabled shows the lock screen
- **Acceptance:** there's no path into the portal without unlocking
- **Depends on:** none
- **Size:** S

### CS-42 Booking flow guards
- **Closes:** MB-2, MB-3
- **Files:** `booking/summary.tsx`, `slot-picker.tsx`
- **Skills:** `expo-data-fetching`
- **Tests:** an incomplete draft redirects; past slots are hidden
- **Acceptance:** nothing gets booked from fallback values
- **Depends on:** CS-16
- **Size:** S

---

## Tier 6: Release (milestone **M6 Ready to ship**)

### CS-43 Build configuration
- **Closes:** CG-1, CG-2, CG-4, the rest of CG-3 (runtime version, submit ids)
- **Files:** `app.json` (EAS projectId, `expo-notifications` and Stripe plugins, merchant id, `urlScheme`), `eas.json` (per-profile keys), `.env.example`
- **Skills:** `eas-app-stores`, `eas-update`
- **Tests:** a preview build registers for push and opens the PaymentSheet in test mode
- **Acceptance:** a preview build on a device can take a test deposit and receive a push
- **Depends on:** needs `EXPO_TOKEN`
- **Size:** S
- 🛑 Real Apple and Google ids from you.

### CS-44 Server operations
- **Closes:** SV-2, SV-3, SV-4, EH-3, plus error tracking
- **Files:** `server.ts` (shutdown, request id), the health endpoints, an error tracker
- **Skills:** `observability-by-default`
- **Tests:** SIGTERM drains in-flight requests; one id appears across logs, audit and response
- **Acceptance:** a request can be traced end to end
- **Depends on:** CS-11
- **Size:** M
- 🛑 Error tracking provider (Sentry is paid).

### CS-45 Image and deployment
- **Closes:** DK-1, DK-2, plus backups and hosting
- **Files:** `.dockerignore`, Dockerfile prune and healthcheck, a migrate release step, compose bound to localhost; deploy infrastructure once you've chosen hosting; backup and restore runbook
- **Skills:** `boring-by-default`, `migration-safety`
- **Tests:** a Docker build in CI; a restore drill
- **Acceptance:** staging deploys from CI with migrations, and a restore is tested
- **Depends on:** CS-02
- **Size:** M
- 🛑 Hosting target.

### CS-46 Code health
- **Closes:** baseline lint (208 problems), mobile tests that test inline copies, `run-tests` banner, AC-3, BJ-6
- **Files:** lint fixes in small batches, rewritten mobile tests wired to jest and run in CI (moved from CS-02), a lint step in CI, dead code removal
- **Skills:** `testing-with-discernment`
- **Tests:** the rewritten tests fail when the real module breaks
- **Acceptance:** lint is clean and moved to error level
- **Depends on:** CS-02
- **Size:** M

### CS-47 Release readiness (Phase 5)
- **Closes:** gaps §6 compliance rows
- **Files:** release checklist; DPIA, privacy notice and DPA tracker (drafts for your legal review); store listing; pen-test scope
- **Skills:** `eas-app-stores`
- **Tests:** none
- **Acceptance:** the go/no-go list is signed by you
- **Depends on:** all above
- **Size:** M
- 🛑 Legal sign-offs.

---

## Order of work

1. **Week 1:** CS-01, CS-02, CS-03, CS-04, CS-11, CS-12, CS-14 (small, unblock everything), then CS-06 and CS-05.
2. **Weeks 2–3:** CS-08, CS-09, CS-07, CS-10, CS-13, CS-21, then Tier 2 (CS-15 to CS-20).
3. **After that:** Tier 3, then Tier 4 in parallel tracks (video CS-27; clinician CS-28/29; back office CS-31), with Tier 5 alongside, and Tier 6 last.
4. **Decision-blocked change sets** wait without blocking the others: the EPS route, financing, retention, rota, waitlist and rewards.

**Rough total:** about 14 S, 22 M and 9 L, or roughly 10–12 engineer-weeks for one engineer before legal and clinical lead times. `MASTER_PLAN.md`'s 12 weeks for 6 engineers is generous for engineering but assumes the legal track runs in parallel.

## Coverage index (finding → change set)

| Change set | Findings |
|---|---|
| CS-01 | P0-1, MG-1, MG-2, DB-7 |
| CS-02 | P0-2, CI-1, GE-1, PR-1 |
| CS-03 | CF-1, VP-1, CN-2, JW-1 |
| CS-04 | BK-5, CN-1, BK-4 |
| CS-05 | MS-1, RW-1, DB-5 |
| CS-06 | MC-1, MC-2, MC-4, MC-5, BK-7 |
| CS-07 | VD-1, AC-2 |
| CS-08 | MF-1, AT-1, AT-2, AT-3, AT-5, AT-7, AT-8, AM-1, OT-1, OT-2, OT-3, CS-4 |
| CS-09 | PT-1, PT-2, PA-1, RX-2, RX-3, MS-2, NT-1, AR-1, PM-1, VR-4, VR-5 |
| CS-10 / CS-35 | RX-1 |
| CS-11 | P0-3, EH-1, CS-1, SL-1 |
| CS-12 | SD-1, SD-2 |
| CS-13 | EN-1, EN-2, EN-3 |
| CS-14 | SV-1 |
| CS-15 | VR-1, VR-6, VR-8, VR-11, DB-2 (van) |
| CS-16 | BK-2, BK-9, BK-3, ID-1, DB-2 (appointments) |
| CS-17 | WH-1, WH-2, WH-3, VP-2, VP-3, VP-4, BJ-4 |
| CS-18 | BK-6, VR-7 |
| CS-19 | DB-6, BJ-1, BJ-2, BJ-3, BJ-5, PP-1, PP-2, PP-3, CS-2, CS-3, NT-2, EB-1, VS-1 |
| CS-20 | AU-1, AU-2, AU-3, AU-4, AU-5, AU-6, VC-1, VC-2, VC-3, VC-4 |
| CS-21 | MA-1, MA-2, MA-5, VA-1, EH-2 |
| CS-22 | PM-2 |
| CS-23 | CO-2, AT-6, DB-1 |
| CS-24 | SAR-1, SAR-2, OS-3 |
| CS-25 | PT-4, CO-1, DP-1 (consent part) |
| CS-26 | OS-1, OS-2, DB-3 |
| CS-27 | MC-3, VD-2, VD-3, VD-4, AC-1 |
| CS-28 | PT-3, MB-4 |
| CS-29 | MS-3 |
| CS-30 | BK-1, BK-8, DB-4 |
| CS-31 | AD-1 |
| CS-32 | WL-1 |
| CS-33 | RW-2, FN-1 |
| CS-34 | DP-1 (validation) |
| CS-36 | TE-1 |
| CS-37 | MA-4 |
| CS-38 | MB-6, MB-7 |
| CS-39 | MB-1, AT-4 |
| CS-40 | MB-5, VE-1, VE-2, VE-3, VR-2, VR-3, VR-9, VR-10, PV-1 |
| CS-41 | MA-3 |
| CS-42 | MB-2, MB-3 |
| CS-43 | CG-1, CG-2, CG-3, CG-4 |
| CS-44 | SV-2, SV-3, SV-4, EH-3 |
| CS-45 | DK-1, DK-2 |
| CS-46 | AC-3, BJ-6, baseline lint and tests |
| No change | DS-1 (keep the report honest) |
