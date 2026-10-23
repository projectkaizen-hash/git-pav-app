# 02: Gaps (Phase 2)

This document says what has to exist, beyond fixing the findings in `01-findings.md`, before Pav Dental can be called complete and shippable. IDs in brackets point to findings. The status words mean:

- **Works**: real end to end, with only minor findings.
- **Partial**: real, but a finding blocks real use.
- **Mock**: the screen or endpoint looks real but uses fixed or fabricated data.
- **Missing**: not built.

## 1. Summary

- **The patient app is the most complete part.** Account, onboarding, clinic booking with a deposit, van request and live tracking, records and settings all reach the real API. The things blocking release are payment integrity (BK-5), fabricated clinical content (MS-1, RW-1, MC-3, MC-4), and video consults, which don't exist in the app (MC-3).
- **The clinician portal is a thin shell.** It has 3 screens: schedule, consult room, and prescribe. It has no patient record view, notes, odontogram editing, plan authoring or inbox. The prescribe screen is unsafe (MC-1).
- **The operator portal is functionally real** (shift, incoming, accept, queue, check-in, complete), but check-in shows fabricated clinical flags (MC-2), location stops when the screen locks (MB-5), and polling exceeds the rate limit (SV-1).
- **No back office exists.** Nobody can onboard clinicians, operators, clinics, vans, services or service areas without SQL or the seed (AD-1). Nobody can work the GDPR erasure queue (CO-2), issue a manual refund, or see a message sent to the practice (MS-3).
- **It's not production-ready.** The migrations don't build the schema (P0-1), CI can't pass (P0-2/CI-1), config fails open (CF-1), push can't register (CG-1), and builds have no Stripe key (CG-2).

The repo's own `REQUIREMENTS.md` and `MASTER_PLAN.md` (same date as the audited commit, whose message is "complete production hardening, de-mocking, and audit remediation") describe most of this work as planned. §7 below shows which of those requirements the code meets today: most of the P0 items are **not done**, despite the commit message.

## 2. Feature matrix

### Patient

| Feature | Backend | Mobile | Status | Blocking findings |
|---|---|---|---|---|
| Sign up, sign in, sign out | ✓ | ✓ | Works | AT-3 (enumeration), MA-2 (cache not cleared) |
| Email verification | ✓ | ✓ (code entry) | Partial | AT-4 (email link opens a web URL that doesn't exist), CS-1 (codes logged when no provider) |
| Phone OTP sign-in | ✓ | ✓ | Partial | AT-1, AT-2, PT-1 (account-takeover paths), OT-1 (`Math.random`) |
| Password reset | ✓ | ✓ | Partial | AT-4 (link doesn't open the app), CG-3 |
| Biometric app lock | n/a | ✓ | Partial | MA-3 (bypassed on cold start) |
| Onboarding (profile, address, medical history, consents, insurance) | ✓ | ✓ | Works | Insurance answers aren't stored anywhere (no backend model) |
| Profile, emergency contact, medical history edit | ✓ | ✓ | Works | PT-4 (consents in two places), DB-3 (plaintext PHI) |
| Dependants | ✓ (add/list/delete) | ✓ | Partial | DP-1. **Can't book for a dependant**: `createAppointmentSchema` has no dependant field |
| Notification preferences | ✓ | ✓ | Partial | PP-1 (default treated as off), CG-1 (push never registers) |
| Active sessions | ✓ | ✓ | Works | (none) |
| Delete account | soft delete | ✓ | Partial | AT-6, CO-2, DB-1. The screen promises "will immediately cancel any pending appointments", which the backend doesn't do |
| SAR export | ✓ | ✓ | Partial | SAR-1 (incomplete), OS-3 (link expires in 15 min) |
| Service catalogue | ✓ | ✓ | Works | MC-4 (fake fallback catalogue on error) |
| Clinic booking: clinic, clinician, slot | synthetic slots | ✓ | Partial | BK-1 (no rota, UTC hours), BK-9/MB-3 (past slots), BK-2 (double booking) |
| Deposit payment (PaymentSheet) | ✓ | ✓ | Partial | **BK-5** (confirm without payment), WH-1, MB-2, CG-2, MA-1 |
| Saved cards | ✓ (save/list) | ✓ | Mock-ish | PM-2 (never used for a payment) |
| Cancel with refund | ✓ (48/24 h tiers) | ✓ | Partial | BK-6 (second cancel endpoint without refund), BK-3 |
| Appointments list and detail | ✓ | ✓ | Works | BK-8 (unbounded list) |
| Check-in (clinic) | ✓ | ✓ | Partial | BK-7 (fabricated completed tasks), MB-1 (route collision) |
| Waitlist | join only | ✓ | Mock | WL-1 (nothing ever reads the waitlist; the promise to the patient is false) |
| Van coverage check | ✓ | ✓ | Works | PV-1 |
| Van request, deposit hold, accept, live track, complete | ✓ | ✓ | Partial | VR-1, VR-7 (refund policy decision), VE-3, MB-5 |
| Video triage intake and photos | ✓ | ✓ | Partial | VD-2/TE-1 (red flags not run), VD-3, MA-1 |
| Video consult call | rooms ✓ | **mock** | Mock | **MC-3**, VD-1 (public rooms) |
| Consult summary | (none) | **mock** | Mock | MC-3 |
| Odontogram | ✓ (read) | ✓ | Partial | MC-4 (hardcoded tooth #31 copy), PT-3 (no history) |
| Treatment plans and e-sign | ✓ | ✓ | Partial | PT-2 (clinician can sign as the patient), MC-4 |
| Prescriptions | ✓ (list) | ✓ | Partial | RX-1 (fake EPS dispatch), MC-4 (Amoxicillin fallback) |
| Document vault | ✓ | ✓ | Partial | OS-1 (local disk outside production), OS-2 |
| Oral-health insights | fabricated | ✓ | Mock | RW-1, DB-5 |
| Messages | fabricated seed | ✓ | Mock | **MS-1**, MS-2, MS-3 (no one receives patient messages) |
| Rewards and perks | fabricated | ✓ | Mock | RW-1, RW-2 (unlimited points), home "1,450 pts" |
| Financing | fake pre-approval | ✓ | Mock | **FN-1** (legal decision) |
| Push notifications (reminders, van ETA) | ✓ | broken | Partial | CG-1, PP-1, BJ-1, BJ-2, BJ-3 |
| Emergency triage modal | ✓ rules | ✓ | Partial | TE-1, MC-5 ("24/7 AI" claim) |

### Clinician

| Feature | Backend | Mobile | Status | Blocking findings |
|---|---|---|---|---|
| Sign in with MFA | MFA built, not enforced | ✓ | Partial | MF-1, AT-1 |
| Daily schedule | ✓ (`GET /appointments`, clinician branch) | ✓ | Partial | MB-4 (future days mixed in as "today", fixed GDC number, wrong action for clinic visits), BK-8 |
| Video consult room | rooms ✓ | opens browser | Partial | MC-3, VD-1, VD-4 |
| Triage and photos view | ✓ | ✓ | Partial | VD-3 (photo URLs expire) |
| Prescribe (EPS) | fake dispatch | **unsafe** | Mock | **MC-1**, RX-1, RX-2 |
| Patient record view (history, allergies, past visits) | partly (`/patients/:id/*`) | **missing** | Missing | (none) |
| Clinical notes per appointment | **missing** | **missing** | Missing | (no model) |
| Odontogram editing | ✓ (`PUT`) | **missing** | Missing | PT-3 |
| Treatment plan authoring | ✓ (`POST`) | **missing** | Missing | (none) |
| Complete or no-show an appointment | partial (cancel/check-in only) | **missing** | Missing | VD-4 (no "end consult") |
| Messages inbox and reply | staff can reply (unscoped) | **missing** | Missing | MS-2, MS-3 |
| Availability and rota | **missing** | **missing** | Missing | BK-1 |

### Van operator

| Feature | Backend | Mobile | Status | Blocking findings |
|---|---|---|---|---|
| Shift on, pause, off | ✓ | ✓ | Works | (none) |
| Incoming requests, accept or decline | ✓ | ✓ | Partial | VR-1 (non-atomic accept), SV-1 (5 s polling) |
| Queue, optimise, reorder | ✓ | ✓ | Works | (none) |
| Live location | ✓ | foreground only | Partial | MB-5 |
| Phase advance (en route, on site, treatment, complete, no-show) | ✓ | ✓ | Works | VS-1 |
| Check-in | ✓ | ✓ | Partial | **MC-2** (fabricated clinical flags) |
| Clinical note and complete stop (offline queue) | ✓ | SecureStore queue | Partial | Notes go into `VanServiceRequest.notes` as plaintext (DB-3). The SecureStore value size limit makes it a poor queue (REQUIREMENTS asks for SQLite) |
| Navigation links | n/a | ✓ | Works | (none) |

### Admin and back office

| Feature | Status | Notes |
|---|---|---|
| Onboard clinicians, operators, clinics, vans, services, service polygons, van assignments | **Missing** | AD-1. Only the seed or SQL can do this today |
| Admin UI | **Missing** | The mobile app sends admins to "access denied" ("use the web dashboard"), but no web dashboard exists |
| GDPR erasure and SAR queue (DPO view) | **Missing** | CO-2, SAR-1 |
| Refunds and payment disputes | **Missing** | The only refund paths are the patient's own cancel and the van flows. There's no staff refund or dispute handling for `charge.dispute.*` webhooks |
| Audit log viewer and integrity report | API only | AU-1, AU-2, AR-1 |
| Practice inbox for patient messages | **Missing** | MS-3 |
| Reporting (bookings, revenue, no-shows, van utilisation) | **Missing** | (none) |
| DSPT report | API only, honestly labelled prototype | DS-1 |

## 3. Missing screens and states

**Screens to build:**
- Clinician: patient record, appointment detail with notes, odontogram editor, plan builder, inbox and thread, availability.
- Patient: a real video call (Daily SDK), a consult summary built from real data, dependant selection in booking, and the waitlist slot-offer screen (or remove the waitlist).
- Shared: an offline banner (component exists, never rendered), and a "deep link not found or expired" screen for reset and verify links.
- Admin: the whole back office (§2, decision needed on web dashboard vs. mobile).

**States to add (from the Playwright run, MA-4):** 22 data screens are missing a loading or error state. The ones that matter most clinically are the clinician schedule (failure looks like "0 patients"), the operator check-in, the rx-dispense patient load, and home (failure shows fake services). Every list needs an honest empty state in place of fabricated fallbacks (MC-4).

**Accessibility (MB-6):** roles and labels on the shared components, labels on icon-only buttons and toggles, and a large-text pass. **Small screens (MB-7):** layout holds at 320 px apart from three clipped elements.

## 4. Missing backend pieces

1. **Payment integrity:** server-side confirm only from webhook-verified state (BK-5). Refund the late-success deposit (WH-1). Handle disputes (`charge.dispute.created`). Use one cancel endpoint (BK-6). Use saved cards via `customer` (PM-2), or drop that screen.
2. **Clinical data model:** appointment notes, append-only odontogram and plan history (PT-3), clinician availability and rota (BK-1), real prescription state (`draft → signed → transmitted → dispensed`, RX-1), and complete / no-show transitions for clinic and video appointments.
3. **Care-team authorisation:** one `canAccessPatient(clinician, patient)` rule used by patients, prescriptions, messages and video (PT-1, RX-2, RX-3, MS-2, REQ-SEC-003).
4. **Messaging:** routing to a practice inbox and the care team, staff notifications, and no seeded content (MS-1..3).
5. **GDPR:** an erasure pipeline with retention rules (CO-2, DB-1, AT-6), a complete SAR (SAR-1), consent as a single source of truth (PT-4, CO-1), and PHI encryption at rest (DB-3, EN-1, REQ-SEC-002).
6. **Notifications:** reminder cancellation (BJ-1), Europe/London formatting (BJ-2), a multi-replica-safe dispatcher (BJ-3), and a waitlist offer job, or removal of the feature (WL-1).
7. **Ops:** a Redis-backed rate limit keyed by user (SV-1), graceful shutdown (SV-2), request ids (SV-3), fail-closed config (CF-1), a multi-replica-safe audit chain (AU-1, AU-2), and boot-time DDL moved into migrations (VC-1).
8. **Admin API** for the entities in §2 (AD-1).

## 5. ARCHITECTURE.md §7 known limitations: path to done

| Limitation (as written) | Reality | Path to done |
|---|---|---|
| ETAs default to haversine; Mapbox/OSRM optional | Accurate. Matrix calls aren't cached for live-track polling (VE-3) | Pick a provider (Mapbox is paid, so it's **your decision**; self-hosted OSRM is free but needs ops). Cache the multi-point matrix, then set the env var |
| Live ETA re-push | Code is real, but **no push reaches a device** (CG-1, PP-1) | Fix CG-1 and PP-1, then test on device |
| Queue ordering | Accurate and works | (none) |
| **NHS EPS not integrated** | Worse than stated: the API and UI tell patients a prescription was sent to a pharmacy (RX-1, MC-1, MC-3) | **Separate track, needs your decision** (see below) |
| Account deletion is a soft delete | Accurate. Nothing processes erasure requests (CO-2), and the DB can't hard-delete (DB-1) | Decide retention periods, then build the erasure job, the DPO queue and the FK changes |
| SAR export UI-only | Outdated: the button is wired, but the export is incomplete (SAR-1) and the emailed link expires (OS-3) | Complete the bundle and deliver it in the app |
| Third-party keys are test-shaped | Accurate. Production validation doesn't check them (CF-1, VP-1) | Fail-closed config, plus key-mode checks |
| `.env.production` removed from git; rotate | Can't verify rotation from here | You confirm that Stripe, Daily, B2/AWS and Postmark keys were rotated (REQ-SEC-001) |

**NHS EPS track (decision needed).** Direct dental prescribing through EPS needs NHS England onboarding: an assured EPS-capable system, an NHS Spine connection, smartcards or CIS2 for prescribers, DSPT "Standards Met" and a clinical safety case (DCB0129/0160). That's months of work, and it applies only to NHS prescribing. Realistic options:
- (a) Private paper or PDF prescriptions signed by the clinician and given to the patient, with the "EPS" wording removed.
- (b) A third-party private e-prescribing service. That's a paid service, so it's your decision.
- (c) Full EPS integration as a separate programme.

Until one is chosen, the safe change is to stop claiming dispatch and label prescriptions as "issued (not transmitted)".

## 6. Production readiness

| Area | State | What's needed |
|---|---|---|
| Schema and migrations | **Blocked** (P0-1, MG-2) | One reviewed additive migration, plus a drift check in CI |
| CI | **Red as written** (P0-2, CI-1) | Fix `db execute`, stub third parties in e2e, add drift, docker build and mobile jest |
| Secrets and config | Fails open (CF-1) | Fail closed, add key-mode checks, confirm rotation |
| Hosting | Undefined. There's a Dockerfile but no deploy target, IaC or managed Postgres/Redis | Decide hosting (likely AWS eu-west-2, per MASTER_PLAN), run migrations as a release step (DK-1), set `trust proxy` (SV-1) |
| Object storage | Local disk outside production (OS-1), not encrypted (OS-2) | S3 in every deployed environment with bucket encryption, and verify it at boot |
| Backups and restore | Not addressed anywhere | Managed Postgres PITR plus a tested restore runbook (health records need this) |
| Observability | Console logs, ids that don't line up, no error tracking (SV-3) | Structured logs, request ids, and error tracking (Sentry is paid, so **your decision**), plus alerting on webhook failures and the audit verifier |
| Rate limiting and scaling | In memory, below the app's own polling (SV-1) | Redis store, per-user keys, push or SSE for live views |
| Multi-replica safety | Audit chain (AU-1), reminder dispatcher (BJ-3) and boot DDL (VC-1) all assume one instance | Fix those, or run a single replica with that documented |
| Security testing | None | An IDOR test matrix (REQ-SEC-003), then an external pen test before launch |
| Compliance | DSPT report is a prototype (DS-1). No DPIA, records of processing, privacy notice or processor DPAs in the repo | **Legal and product work**: DPIA, privacy notice, DPAs with Stripe, Daily, Twilio, Postmark and AWS, CQC registration for the van service, ICO registration |
| Clinical safety | Fabricated clinical content in several places (MS-1, RW-1, MC-1..4). Triage rules not signed off (TE-1, VD-2) | Remove the fabrications (blocker). Get clinical sign-off on triage and wording. Name a clinical safety officer if DCB0129 applies |
| App store | No EAS project (CG-1), no Stripe key (CG-2), no deep links (CG-3), placeholder submit ids | `eas init`, configure keys and links, privacy nutrition labels, health-data declarations, a background-location justification if MB-5 goes that way |
| Accessibility | Weak (MB-6) | Shared-component pass plus a VoiceOver/TalkBack smoke test |

## 7. `REQUIREMENTS.md` items vs code today

| REQ | Priority | State today | Evidence |
|---|---|---|---|
| SEC-001 secrets purge and rotation | P0 | Partly done: `uploads/` ignored and untracked. Rotation not verifiable | `.gitignore` |
| SEC-002 PHI field encryption | P0 | **Not done** | DB-3 |
| SEC-003 IDOR/BOLA | P0 | **Not done** | PT-1, RX-2, RX-3, MS-2, VD-1 |
| SEC-004 upload validation | P0 | Partial: MIME allow-list and safe stream headers, no magic-byte check | `video.ts:23` |
| AUTH-001 OTP backdoor, role switcher | P0 | Done: no `123456` backdoor, and the switcher is gated by `__DEV__` plus a flag | grep |
| AUTH-002 MFA enforcement, OTP lockout, enumeration | P0 | **Not done** | MF-1, AT-1, AT-3 |
| AUTH-003 session and biometric | P1 | Partial: replay detection exists but logs out on parallel refresh (AT-5), and the biometric lock is bypassed (MA-3) | (none) |
| DATA-001 mobile mock eradication | P0 | **Not done**: no `__mocks__` imports, but hardcoded fallbacks throughout | MC-1..4 |
| DATA-002 backend seeded demo data | P0 | **Not done** | MS-1, RW-1 |
| DATA-003 missing FKs | P1 | Partial | DB-1 |
| BOOK-001 double booking, confirm verification | P0 | **Not done** | BK-2, BK-5 |
| BOOK-002 live catalogue, dynamic dates | P1 | Mostly done: past slots and the fake fallback remain | BK-9, MC-4 |
| FIN-001 mock-Stripe bypass, financing | P0 | **Not done** | VP-1, BK-5, FN-1 |
| CLIN-001 telehealth end to end | P0 | **Not done** | MC-3 |
| CLIN-002 consult room, e-sign, penicillin conflicts | P0 | **Not done** (the penicillin problem is worse, see MC-1) | MC-1, PT-2 |
| VAN-001 van mocks, offline SQLite | P1 | Partial: `mockShiftData` gone, no SQLite | MB-5 |
| OPS-001 document links | P1 | Partial: the stream route exists, the emailed links expire | OS-3 |
| COMP-001 audit fixes | P1 | Partial: 1 direct `auditLog.create` left, chain unsafe across replicas | AU-1, AU-2 |
| OPS-002 Redis rate limit, logging, Sentry | P1 | **Not done** | SV-1, SV-3 |
| OPS-003 deps, CI, Dockerfile | P1 | Partial: non-root Docker done, CI still red | CI-1, DK-1 |

## 8. Decisions this creates (detailed in Phase 3)

These questions come up again as the numbered list at the end of the plan:
- NHS EPS route
- financing (keep, partner or remove)
- the van cancel-after-accept refund policy
- GDPR retention periods
- triage and clinical wording sign-off
- opening hours and rota model
- waitlist (build or remove)
- rewards rules
- saved cards (use or remove)
- whether the back office is a web dashboard
- error tracking and routing provider (both paid)
- hosting target
- dependants booking rules
