# 07: Architecture and production-readiness audit (26 Oct 2026)

Audit of `main` @ `aa0133b`. It feeds the revised plan in [`06-completion-plan.md`](06-completion-plan.md) (which stays the single plan), the release gates in [`../release/release-checklist.md`](../release/release-checklist.md), the ADRs in [`../adr/`](../adr/) and the references in [`08-research-references.md`](08-research-references.md).

**How to read the evidence column.** *Verified* means I ran a command or read the code at the line quoted. *Observed* means I saw it on a live system on 26 Oct. *Inferred* means engineering judgement from the code without a test that proves it. Nothing here claims every defect was found; section 6 lists what was not covered.

---

## 1. Executive summary

The code is in better shape than most apps at this stage. Every suite passes locally against Postgres 16 + PostGIS and Redis (backend 63 suites / 485 jest tests and 34/34 e2e, app typecheck/lint/20 content tests, dashboard typecheck/lint/29 tests), and the security basics hold: pinned JWT algorithm with issuer and audience, refresh-token rotation, staff MFA (now including van operators), fail-closed configuration, Stripe webhook de-duplication, encrypted health fields, a hash-chained audit log, Redis-backed rate limits and log scrubbing.

**What stops a real launch is not the code but everything around it:**

1. **There is no production environment** (AUD-01). The only API is a free Render service that sleeps; I found it asleep (HTTP 503 "Application loading") on 26 Oct. While asleep, reminders, hold expiry, retention and push-receipt jobs don't run.
2. **The legal and clinical gates are open** (AUD-02, AUD-03). The privacy page the app links to is an unreviewed draft that says processors work "under strict data protection agreements", which the owner confirmed is not yet true (V-04), and it leaves out several processors. No clinician has signed off triage or prescribing (V-01).
3. **Shipping and recovering is manual** (AUD-04 to AUD-08). The backend runs on Node 20, which reached end of life on 30 April 2026; Render deploys `main` without waiting for CI; migrations are run by hand; several commits reached `main` without review on 26 Oct; restores have never been tested; error tracking is optional and the app has no source maps.

Two correctness bugs were found and are fixed in the follow-up PR: reminders can get stuck forever in a `sending` state (AUD-05), and two orphaned insurance screens with false claims are still reachable by deep link (AUD-09).

---

## 2. System as built (decomposed with the Review-with-Blocks lens)

| Block | What it is here | Notes |
|---|---|---|
| **Service** | One Express 4 API (`backend/src/server.ts`), 29 route modules, stateless apart from in-process timers | Monolith is the right shape for a single practice; see ADR-0001 |
| **Relational DB** | Postgres (Supabase in test) + PostGIS, Prisma 6, 49 models, 40 migrations, drift check in CI | Owner of all patient and clinical data |
| **Key-value store** | Redis (Upstash in test): rate-limit counters, slot-hold locks, refresh-grace cache, OTP throttles | Not a source of truth; rate limits fail open by design (`passOnStoreError`) |
| **File store** | S3-compatible bucket (`lib/object-storage.ts`); local disk refused in staging/production | Bucket backup/versioning not documented |
| **Worker** | `setInterval` jobs inside every API process (`lib/background-jobs.ts`): slot expiry, reminder dispatch, van-request expiry, deposit-release retries, retention sweep, push receipts | Claims rows with `FOR UPDATE SKIP LOCKED` / advisory locks |
| **Queue** | Postgres tables used as queues (`scheduled_notifications`, `push_tickets`) | No broker, correctly (ADR-0002) |
| **Vector DB** | none | not needed |
| **Force: User** | Patients, clinicians, van operators (Expo app); staff (Next.js dashboard on Vercel, calls `/api/admin/*` as the signed-in staff member) | |
| **Force: External service** | Stripe, Daily, Postmark, Twilio, Expo push (APNs/FCM), Mapbox/OSRM, postcodes.io, Sentry | Outbound calls have timeouts (`AbortSignal.timeout`) |
| **Force: Time** | Reminders, hold expiry, van request expiry, retention, push receipts, rewards catch-up | All depend on the API process being awake |

**Verdict (review-with-blocks):** the shape is right for one practice: a modular monolith, one relational database as the source of truth, Redis only for ephemeral state, and Postgres tables as job queues. Nothing needs adding for scale. The weak -ilities are *availability of the Time force* (the worker only runs while the web process is awake and healthy), *recoverability* (untested backups, no automated deploy/rollback) and *observability at the seams* (errors are optional to report).

### The -ilities that matter here

| -ility | Rating | Why | Block(s) carrying it | Trade-off |
|---|---|---|---|---|
| Security | **holds** (code) / **at-risk** (process) | Strong auth, encryption, audit chain; but unreviewed pushes to `main` and no pen test yet | Service, Relational DB | MFA and re-auth add friction for staff |
| Durability | **at-risk** | Committed rows are safe, but restore has never been tested and the bucket has no documented versioning | Relational DB, File store | PITR and versioning cost money (D-10 approved budget) |
| Reliability (Time force) | **gap** | Free tier sleeps; reminders can stick in `sending` (AUD-05) | Worker, Queue tables | Always-on instance costs a paid plan |
| Consistency (money, slots) | **holds** | Advisory locks, compare-and-set, Stripe event de-dup, booking race tests | Relational DB | Serialises some writes; fine at this load |
| Availability | **at-risk** | Single instance, no uptime alert, no tested rollback | Service | A second instance needs job leadership first (ADR-0002) |
| Observability | **gap** | Sentry optional in production, app has no source maps, dashboard strips server `console.error` in production builds | All seams | Sentry is a paid processor and needs a DPA (LG-02) |

Set aside as not load-bearing now: horizontal scalability and latency. A single practice with two clinicians and one van produces tens of requests per minute; one always-on instance with a correctly sized connection pool covers it (see AUD-10 for the one setting that matters).

### Questions a senior reviewer would ask

1. When Render restarts the API mid-way through sending reminders, which patients miss their reminder, and how would anyone find out? (Today: they miss it and nobody finds out. AUD-05, AUD-07.)
2. If the database were deleted at 14:00 today, how long until patients can book again, and how much data is lost? (Unknown: no restore drill. AUD-11.)
3. What stops an untested commit reaching patients? (Nothing on the API side: Render deploys `main` directly. AUD-06.)
4. Who is accountable for the words in triage and the privacy notice? (Nobody has signed them yet. AUD-02, AUD-03.)
5. What is the rollback for a bad app release? (Store resubmission only; there is no OTA update channel. AUD-12.)

---

## 3. Findings

Severity follows the plan's scale: **Critical** blocks release; **High** must be fixed before real patients; **Medium** before or soon after launch; **Low** hygiene. Likelihood and impact are H/M/L.

| ID | Sev | Component / file | Current behaviour and evidence | Expected | Root cause | L / I | Recommendation | Acceptance criteria | Plan item | Refs |
|---|---|---|---|---|---|---|---|---|---|---|
| **AUD-01** | Critical | Hosting (Render free, Supabase free, Upstash) | *Observed:* `GET https://pavdental-api.onrender.com/readyz` returned Render's 503 "Application loading" page on 26 Oct (service asleep). No production service exists (`docs/deploy/test-deployment-status.md`). | An always-on production API, separate from staging, with paid Postgres (PITR), persistent Redis and a versioned bucket | Free tier chosen for testing; D-10 budget approved but not yet provisioned | H / H | Provision per ADR-0003: Render paid instance (Frankfurt), Supabase Pro + PITR (London), Upstash paid, S3-compatible bucket with versioning; separate secrets | `/readyz` 200 from production for 7 days with an external uptime check; reminders observed firing overnight | RB-12, OPS-01 | R-07, R-08, R-09 |
| **AUD-02** | Critical | Legal pages the app links to (`pavdental/src/config/legal.ts` → `pavdental-website.vercel.app/privacy`) | *Observed:* page is live but says processors operate "under strict data protection agreements" (owner: none accepted, V-04) and lists "Frankfurt & London regions with automated backups". It omits Render, Supabase, Upstash, Vercel, Sentry, Expo/APNs/FCM, Mapbox and postcodes.io. No legal review. | Reviewed privacy notice and terms listing every processor; DPAs accepted; DPIA signed; ICO fee paid | Draft text published to unblock RB-06 | H / H | Keep the links (the stores need a URL) but correct the processor list, remove claims that aren't true yet, get legal sign-off, then accept each DPA | Solicitor/DPO sign-off recorded in `04-decisions.md`; every processor in `dpa-tracker.md` marked accepted with date | RB-06 (reopened), LG-01..04 | R-14, R-15 |
| **AUD-03** | Critical | Triage, prescribing, clinical wording (`backend/src/lib/triage-escalation.ts`, `pavdental/src/components/emergency-triage-modal.tsx`) | *Verified:* `04-decisions.md` V-01 says the earlier "signed off" notes were not a real review. D-18 medical-device question open. | Named clinician sign-off in writing; regulatory view on triage | Content drafted by tools | M / H | Clinical lead reviews the listed items; until then triage stays general safety advice (as built) | Written sign-off linked in `04-decisions.md` | LG-06, LG-07 | R-16 |
| **AUD-04** | High | `backend/Dockerfile` (`FROM node:20-alpine` ×2), `.github/workflows/ci.yml` backend job (`node-version: 20`) | *Verified* in files. Node 20 reached end of life on 30 Apr 2026, so the production image gets no security fixes. The app and dashboard CI already use Node 22. | A supported LTS runtime, same in CI and the image | Not revisited since the image was written | H / M | Move to Node 22 now (matches the rest of the repo; supported to 30 Apr 2027) and plan Node 24 before then (ADR-0004) | Image builds; jest + e2e green on Node 22 (done in the fixes PR) | new **OPS-09** | R-01 |
| **AUD-05** | High | `backend/src/lib/background-jobs.ts:159` `processDueScheduledNotifications` | *Verified:* rows are claimed by setting `status='sending'`; nothing ever moves a `sending` row back. If the process stops between the claim and the final update (deploy SIGTERM, crash, OOM, free-tier sleep) the reminder is never sent and never retried. `grep -rn "'sending'"` finds only the claim. | A claimed row whose worker died is retried after a lease timeout (at-least-once) | Claim step has no lease/visibility timeout | M / M | Add `claimed_at`; reclaim `sending` rows older than the 15-minute lease back to `pending` before each claim | Tests: a `sending` row claimed 16 min ago, or with no `claimed_at`, is sent; one claimed 1 min ago is left alone. Both fail on the old code and pass on the fix (26 Oct) | new **BE-22** | R-10 |
| **AUD-06** | High | Release process | *Verified:* no `render.yaml` or pre-deploy command in the repo; migrations are run from a laptop (`docs/deploy/free-test-setup.md:47`); Render auto-deploys `main` (`test-deployment-status.md`). Commits `67603a4`, `e67c78e`, `49b3ed9`, `aa0133b` went to `main` without a pull request on 26 Oct and changed plan statuses to "Done". | Deploys only after green CI; migrations run by the platform before the new version starts; every change to `main` reviewed | No branch protection; deploy hook not gated | H / H | Branch protection on `main` (owner setting); Render "auto-deploy after CI checks pass"; `render.yaml` with `preDeployCommand: npx prisma migrate deploy` (paid plans only) | A red CI run on `main` produces no deploy; a PR without passing checks can't merge | QA-05, OPS-07, new **OPS-10** | R-08, R-11 |
| **AUD-07** | High | Monitoring: `backend/src/config/env.ts` (`sentryDsn` optional), `pavdental/app.json` (no `@sentry/react-native/expo` plugin, no Metro serializer), `admin-dashboard/next.config.mjs` (`removeConsole: true` in production) | *Verified* in files. Backend boots in production without a DSN; app crash reports would have unreadable stacks; the dashboard's production build strips every `console.*`, including server-side `console.error`. No uptime check exists. | Errors from all three apps reach one place with readable stacks; an alert fires when `/readyz` fails | Monitoring treated as optional | M / H | Require `SENTRY_DSN` in production; add the Sentry Expo plugin and Metro config; keep `console.error`/`warn` in dashboard builds; external uptime check on `/readyz` | Forced test error visible in Sentry with source-mapped stack for app and API; uptime alert received | OPS-04, RB-08 (reopened) | R-12, R-13 |
| **AUD-08** | High | `pavdental/eas.json` | *Verified:* preview and production builds point at `staging-api.pavdental.co.uk` / `api.pavdental.co.uk`, but D-09 chose `pavdental.com` / `api.pavdental.com`, and the only running API is `pavdental-api.onrender.com`. A preview build today talks to a host that doesn't exist. | Preview → the test API; production → the decided domain | Values written before D-09 | H / M | Preview → `https://pavdental-api.onrender.com`, production → `https://api.pavdental.com` (done in the fixes PR); DNS when C-11 arrives | `build-config.test.ts` asserts no `.co.uk` API host | RB-05 | — |
| **AUD-09** | High | `pavdental/src/app/(patient)/booking/insurance.tsx`, `pavdental/src/app/onboarding/insurance.tsx` | *Verified:* nothing navigates to either screen, but Expo Router makes every file a deep-linkable route. The booking one says "Scan your policy so covered treatments are claimed automatically". D-02: insurance stays hidden. The content guard didn't catch the wording. | No reachable screen makes an untrue claim | Screens were unlinked, not removed | M / M (App Review 2.3.1) | Delete both screens and their stack entries; add the wording to the content guard (done in the fixes PR) | `check-fabricated-content.mjs` fails on the old wording; routes no longer exist | TC-03 (reopened) | R-17 |
| **AUD-10** | Medium | Database connection settings (`docs/deploy/free-test-setup.md:42`) | *Verified:* the API is told to use the transaction pooler with `connection_limit=1`, so each API instance runs one query at a time; 13 interactive `$transaction` blocks hold that connection while they run. *Verified:* the e2e suite still passes with `connection_limit=1` (run 26 Oct), so there is no self-deadlock in the tested paths. Concurrency was not load tested. | Pool sized for a long-running server: Prisma's guidance is `num_cpus*2+1` divided by instances | Serverless advice applied to a long-running server | M / M | Use `connection_limit=5` (≤ pooler size) on the always-on instance; keep `pgbouncer=true`; use the direct URL for migrations; load test (BE-19) | Load test: 20 concurrent bookings + 50 rps reads with p95 < 500 ms and no `P2024` pool timeouts | BE-19, OPS-01 | R-02, R-03 |
| **AUD-11** | Medium | Backups (`docs/deploy/backup-and-restore-runbook.md`) | *Verified:* the runbook describes AWS (Secrets Manager/ECS) that isn't used; no restore has ever been done; Supabase free tier has daily backups only; database backups don't include bucket objects. | A dated, timed restore drill; bucket versioning; RPO/RTO written down | Runbook written for an imagined stack | M / H | ADR-0003 targets: RPO ≤ 5 min (PITR), RTO ≤ 4 h. Rewrite the runbook for Supabase + bucket; drill into a scratch project; verify the audit chain after restore | Drill record with timings in the runbook; audit chain verifies on the restored copy | OPS-05 | R-09, R-18 |
| **AUD-12** | Medium | App updates | *Verified:* `expo-updates` is not a dependency, so the `channel` values in `eas.json` do nothing and the old release checklist's "EAS Update rollback" can't happen. A bad release can only be fixed by a new store build (often 1–3 days with review). | A documented rollback path for the app | Channels added without the library | M / M | ADR-0005: add `expo-updates` with `runtimeVersion.policy: appVersion` before the first store build, so JS-only fixes can ship and be rolled back; or accept store-only and say so | Decision recorded; if adopted, a preview build receives and rolls back an update | RB-13 (reopened), new **RB-20** | R-06 |
| **AUD-13** | Medium | `backend/src/lib/background-jobs.ts:581` | *Verified:* all jobs start in every API process. Reminder dispatch, van expiry and slot expiry claim rows safely; the retention sweep, push-receipt check and rewards/referral catch-up were *not verified* for two concurrent runners. | Safe if a second instance is ever added | Jobs designed for one instance | L / M | ADR-0002: one always-on instance for v1; before adding a second, put each job behind a Postgres advisory lock (`pg_try_advisory_xact_lock`) | Documented; test added when scaling | new **BE-23** | R-10 |
| **AUD-14** | Medium | Dependencies | *Verified:* audit gate passes with allow-listed highs: zod 3 (GHSA-mrhx-c7xc-m3w5) and deepmerge-ts via Prisma CLI in the backend; node-forge and zod in the Expo CLI. Lint budgets are exactly at cap: backend 585/585 warnings, app 219/220, dashboard 152 errors / 208 warnings. | Allow-list shrinks over time | Major upgrades deferred | M / L | Plan zod 4 migration with request-schema tests; ratchet lint caps down by 20 per PR touching a package | Allow-list without the zod entry | BE-12, BE-13, MF-09, DB-03 | R-04 |
| **AUD-15** | Medium | `admin-dashboard/next.config.mjs` | *Verified:* `/dashboard` redirects to the template "default" page with made-up metrics; template pages still routable (owner keeps them until pre-launch, D-17); the CORS header joins two origins with a comma, which browsers reject. | Real staff home; one allowed origin per response | Template origin | M / L | DB-04 and DB-06 as planned | `/dashboard` shows today's appointments; CORS test | DB-04, DB-06 | — |
| **AUD-16** | Low | `backend/src/server.ts` | *Verified:* `/api/waitlist` (decision #13 "remove", D-20) and `/api/dspt` (D-13 "private only") are still mounted. | Dead features removed | Removal not done | L / L | Remove the routes, then the table after a backup (D-20) | Routes return 404; e2e green | BE-11 | — |
| **AUD-17** | Low | `backend/src/server.ts` request-id middleware | *Verified:* any client-supplied `x-request-id` is echoed and logged with no length or character limit. | Bounded, safe id | Not validated | L / L | Accept only `[A-Za-z0-9._-]{1,128}`, otherwise generate one (done in the fixes PR) | Unit test | new **BE-24** | R-05 |
| **AUD-18** | Low | `pavdental/src/config/practice.ts` | *Verified:* opening hours are a hard-coded string while clinic hours live in the backend (`ClinicOpeningHours`). | One source of truth | Shortcut | L / L | Read hours from the clinics endpoint | Changing hours in the dashboard changes the app | new **MF-10** | — |
| **AUD-19** | Medium | Tests | *Verified:* no device end-to-end tests, no load test, no pen test, no VoiceOver/TalkBack run. | Core journeys run on real builds before each release | Not built yet | H / M | QA-02 (Maestro), BE-19, QA-08, QA-09 | See checklist gates G4–G6 | QA-02, QA-08, QA-09, BE-19 | R-19 |
| **AUD-20** | Low | Docs | *Verified:* `architecture.md` dated Sept; `release-checklist.md` named env vars that don't exist and promised "EAS Update rollback" and "zero-downtime rollback in under 60 seconds"; backup runbook describes AWS. | Docs match code | Written ahead of the code | M / L | Rewritten in this PR (architecture, checklist); runbook in OPS-05 | — | RH-01 | — |

### Verified strengths (must not regress)

These are covered by tests that ran green on 26 Oct; any change touching them needs those suites to stay green.

| Area | Evidence |
|---|---|
| Fail-closed config: unknown `NODE_ENV`, dev defaults, mock or placeholder Stripe keys and weak secrets refuse to boot in staging/production | `config/env.ts`, `config-env.test.ts` |
| Tokens: HS256 pinned, issuer + audience checked, 15 min access / 30 day refresh, rotation with a short race grace, session revocation | `lib/jwt.ts`, `routes/auth.ts:238-316`, `session-security.test.ts`, `auth-session-hardening.test.ts` |
| Staff MFA for clinicians, admins and operators | `routes/auth.ts:31`, `staff-mfa.test.ts` |
| Object-level access (BOLA) for patients, dependants and clinicians | `middleware/patient-access.ts`, `clinician-access.test.ts`, `dependants.test.ts` |
| Money: Stripe raw-body webhook, event de-duplication table, booking and van race tests | `server.ts:73`, `routes/payments.ts:325`, `booking-races.test.ts`, `van-races.test.ts`, `payment-integrity.test.ts` |
| Health data: field encryption, key rewrap, log scrubbing, error scrubbing | `phi-encryption.test.ts`, `encryption-keys.test.ts`, `log-hygiene.test.ts` |
| Audit log hash chain with concurrency test and tamper detection | `audit-chain-concurrency.test.ts`, `audit-retention-and-tampering.test.ts` |
| Outbound calls have timeouts | `lib/communication-service.ts:45,108,289,378` |
| Migrations can't drift from the schema | CI "Migration drift check" |
| Graceful shutdown drains HTTP and closes Redis/Prisma | `server.ts` `gracefulShutdown`, `server-operations.test.ts` |

---

## 4. Plan "Done" claims re-checked

The four direct-to-`main` commits of 26 Oct marked many items Done. Checked against the code:

| Item | Claim | Finding |
|---|---|---|
| RB-06 | Privacy/terms links | Links exist (`config/legal.ts`), but the linked text is an unreviewed draft with untrue statements → **Partially done** (AUD-02) |
| RB-07 | Mic permission removed | Holds: `microphonePermission: false` in the image-picker plugin |
| RB-08 | Config plugins | Image picker holds; Sentry plugin (part of the original item) missing → **Partially done** (AUD-07) |
| RB-13 | Release channels | Channels exist but `expo-updates` isn't installed, so they do nothing → **Partially done** (AUD-12) |
| RB-14 | Demo login gated | Holds: `auth-store.ts:45` |
| TC-01 | Referral programme | Built to the owner's D-03 rules (backend `routes/referrals.ts`, tests in `referrals.test.ts`) → holds |
| TC-03 | Fake insurance scan removed | Removed from the flows but two routable screens remain → **Partially done** (AUD-09, fixed) |
| TC-04, TC-05, TC-07, TC-09 | Claims removed | Hold: no matches for Tabeo/Chrysalis/0%, Secure Enclave/FaceID verified, AirFlow/low-dose. Remaining "NHS 111" mentions are safety signposting, which is correct for a private practice |
| TC-17 | Screen capture blocking | Holds: `features/screen-security/` uses `expo-screen-capture` |
| DB-01, DB-02 | Patients page; `ignoreBuildErrors` | Hold: `pavApi(...)` call; flag gone; typecheck runs in CI |
| BE-03 | Production boot requirements | Mostly holds: prescription key, Twilio, Postmark, Daily, S3 and an https `APP_URL` are required in production; staging also refuses local storage (`object-storage.ts:63`). Sentry and Mapbox are still optional → Sentry moved to OPS-04 |
| QA-03 | Build-config test | Holds |

---

## 5. How the skills were used

| Skill | Source and version | Used for |
|---|---|---|
| Anthropic **system-design** (`engineering:system-design`) | Already installed from `anthropics/knowledge-work-plugins` (Apache-2.0); identical to upstream commit `33d3dea` | Requirements → components → deep dive → scale/reliability → trade-offs structure of `architecture.md` |
| **review-with-blocks** (Systems Thinking Lab) | `kayashaolu/systemthinkinglab@0725e34` (Apache-2.0), markdown only | Section 2 above: block decomposition, -ility ratings, senior questions |
| **architecture-designer** (Jeffallan) | `jeffallan/claude-skills@190e05a`, v1.1.1 (MIT), markdown only | ADR template and NFR checklist used for `docs/adr/*` and the NFR targets in ADR-0003 |
| **design-with-blocks** | same repo as review-with-blocks | Installed but not run: it designs a new app from a paragraph through an interactive questionnaire, which doesn't fit an existing system. Its sister skill above uses the same block model |
| **system-design interview skill** (`ftvision/system-design-skill`) | Not installed | No licence file in the repo (all rights reserved by default), and it is an interview-practice tool (mock/learn/postmortem/generate) that writes state to `~/.system-design/` and ships a text-to-speech script that can call ElevenLabs. Its *postmortem* idea is applied manually in AUD-06 (the 26 Oct unreviewed pushes) |

---

## 6. Not covered, and residual uncertainty

- No code path was exercised on a real iOS or Android device or an EAS build (no Expo/Apple access from this environment). `expo-doctor` runs only in CI.
- No load or soak test; AUD-10 is a configuration finding, not a measured failure.
- The live test API could not be reached directly from this environment (proxy policy); one readiness probe went through a scraping service.
- The website was not audited (de-scoped, D-12 and the 26 Oct scope note) except for the legal pages the app links to.
- Third-party processors' own terms (Daily HIPAA/UK GDPR, Postmark US transfer) were not reviewed; that is LG-02.
- Retention sweep, push receipt and rewards catch-up jobs were not checked for two concurrent runners (AUD-13).
