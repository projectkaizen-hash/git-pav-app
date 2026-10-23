# 01 — Findings (Phase 1, file-by-file review)

Status: **review complete (Phase 1)**. Order follows the mission: backend `lib/` (van-payments,
van-coverage, van-eta*, background-jobs first) → `routes/` → `prisma/` → server/config/CI
→ mobile. Each finding has an ID, severity (blocker / high / medium / low), category,
evidence and a proposed fix. Line numbers refer to `main` @ 07e372e.

## ⚠️ Needs attention now

| ID | Sev | Summary |
|---|---|---|
| MC-1 | **blocker** | The clinician e-prescription screen shows **"Known allergy: Penicillin" for every patient** and pre-fills **Amoxicillin 500 mg**. Real allergies are never shown |
| MC-2 | **blocker** | The operator check-in screen shows a fixed "Penicillin allergy" flag and chief complaint for every patient, and defaults to a fixed patient and address |
| MC-3 | **blocker** | The patient video consult is a mock-up (stock photo and a scripted chat where the "dentist" prescribes antibiotics). No video SDK is installed, and the consult summary is fixed text |
| MA-1 | high | Payment, video and notification calls skip token refresh, so they fail after 15 minutes, and they default to the wrong API port |
| CG-1 / CG-2 | high | Push can't register in any build (no EAS projectId), and builds have no Stripe publishable key |
| BK-5 | **blocker** | `PATCH /api/booking/appointments/:id/confirm` confirms an appointment **without payment**: no payment id → no check at all; any client-sent id starting `pi_e2e_` / `pi_mock_` skips Stripe even with live keys; any succeeded intent (any amount, any appointment) is accepted; `depositPaidPence` is taken from the request body. **Reproduced locally** with a non-mock `sk_test_` key: a new patient confirmed a clinic appointment with an empty payment and `depositPaidPence: 999999` → 200 `confirmed` |
| WH-1 | high | A clinic deposit that succeeds after the 10-minute hold has expired is kept: the webhook matches 0 rows, the appointment stays cancelled, and nothing refunds or alerts |
| MF-1 | high | MFA is never enforced: `requireMFA` exists but no route uses it, and phone-OTP login lets clinicians/admins in with an SMS code alone |
| MS-1 | **blocker** | `GET /api/messages` writes three **fabricated clinical messages** (from "Dr. Tariq Pav", about a treatment plan for tooth #31 and a £25 deposit) into the database for every user with an empty inbox; `GET /api/rewards*` creates **fabricated oral-health metrics and practitioner advice** for every user |
| FN-1 | **blocker** (legal decision) | `/api/financing` "pre-approves" every user for £4,000 at 0% APR with no lender, credit check or FCA authorisation |
| MS-2 | high | Any clinician or admin can read every patient's message threads (no care-relationship check) |
| PT-1 | high | Clinicians can edit a patient's profile including the **login phone number**, then sign in as that patient via phone OTP; clinicians can also "sign" a treatment plan on the patient's behalf |
| RX-1 | high | Prescriptions are shown as "DISPATCHED_TO_PHARMACY" with a made-up NHS EPS reference, but nothing is sent anywhere; any clinician can issue for any patient and read any patient's prescriptions |
| VD-1 | high | Daily rooms are created public (no `privacy: private`, no meeting tokens), any logged-in user can create rooms, and patients get the room URL before being admitted |
| P0-1 | blocker | Schema/migration drift: `migrate deploy` produces a DB the code can't run against; `migrate dev` would drop the PostGIS column (see 00-baseline §1.1) |
| P0-2 | blocker | CI can't go green as written (lockfile fixed in ea0a067; `db execute` flag and e2e's live Daily/postcodes.io calls remain) |
| P0-3 | high | Error handler logs patient first/last name in clear (PII) |
| BJ-1 | high | Appointment reminders are never cancelled when an appointment is cancelled, so patients get "see you in 2 hours" pushes for cancelled visits |
| BJ-2 | high | Reminder times are formatted in the server's time zone (UTC), so during BST every reminder shows the wrong time (1 hour early) |
| PP-1 | high | Patients who never opened notification settings get **no** van/ETA push notifications (missing preferences row is treated as "push disabled", while the API reports the default as enabled) |
| VR-1 | high | Van accept is not atomic: double-tap/concurrent accept creates two appointments; a retried accept after a successful capture is rejected as "deposit not authorised", and the request later expires and is refunded |
| CF-1 | high | If `NODE_ENV` is anything other than exactly `production`/`staging`, the API silently runs with **public default JWT secrets** (forgeable tokens for any role) and mock Stripe |
| SD-1 | high | The seed has no environment guard, creates an admin with the published password `Password123!`, and ships in the production image |
| SV-1 | high | The production rate limit (200 requests / 15 min / IP) is lower than the app's own polling, and with no `trust proxy` setting every user behind a load balancer shares one bucket |
| DB-1 / DB-2 | high | Erasure can't work at DB level (Restrict FKs, new tables with no FK), and there are no DB constraints against double-booking or duplicate shifts and requests |

---

## Backend — `lib/`

### `backend/src/lib/van-payments.ts`

Audit: outbound integration (Stripe). Every release outcome is audit-logged; refunds and
cancels use per-intent idempotency keys. Tests: `__tests__/van-payments.test.ts` (21).

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| VP-1 | medium | security / payments | Mock mode is selected purely by the key prefix `sk_test_mock`. `config/env.ts` only checks that `STRIPE_SECRET_KEY` is present in production, and the dev default is `sk_test_mock_stripe_key_pav_dental`. A mis-set production key silently disables all deposits (requests get `pi_mock_*` ids and are treated as authorised). | `van-payments.ts:16`, `:167`; `routes/van.ts:38`; `config/env.ts:181` | In production/staging, refuse to boot unless the key starts with `sk_live_` (prod) or `sk_test_` but not `sk_test_mock` (staging). One `isMockStripe` export instead of the duplicate in `van.ts:38`. |
| VP-2 | medium | payments / data integrity | A release that fails is only audit-logged. Nothing records "release owed" on the request, and two callers mark the request terminal regardless (shift end `van.ts:291`, decline `van.ts:611`), so there is no retry. The comments in both places claim "the sweeper retries", but the sweeper only selects `status = 'pending'`. Patient keeps a card hold until Stripe's 7-day auth expiry and is told "No deposit was taken". | `van.ts:278-304`, `:602-614`; `background-jobs.ts:247-251` | Add `depositReleaseStatus` / `depositReleasedAt` to `VanServiceRequest`; sweeper also retries terminal requests with an outstanding release. Only send "no deposit taken" when the release succeeded. |
| VP-3 | low | payments | `processing` intents return `nothing_to_release` and are never revisited; if the intent later reaches `requires_capture`, the hold stays. | `van-payments.ts:110-113` | Covered by VP-2's "release owed" flag; also handle `payment_intent.amount_capturable_updated` for already-terminal requests in the webhook by cancelling. |
| VP-4 | low | observability | Audit-write failure is swallowed to `console.error`. | `van-payments.ts:154` | Structured log + metric once observability is wired (see server findings). |

### `backend/src/routes/van.ts` (read with van-payments because it owns the money flow)

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| VR-1 | high | data integrity / payments | Accept = read status → capture → create appointment → update request, with no compare-and-set. Two concurrent accepts both pass the `pending` check: Stripe's idempotency key prevents a double capture, but two `Appointment` rows are created. If capture succeeds and the response is lost, the retry sees `status: succeeded` (≠ `requires_capture`) and returns 409 "Deposit not authorized"; the request then expires and the sweeper refunds the captured money. | `van.ts:449-555` | Claim the request first with `updateMany({where:{id,status:'pending'}, data:{status:'accepting'}})` (or a transaction with row lock); treat `succeeded` as already captured; create appointment + update request in one transaction. Tests: concurrent accept, retry-after-capture. |
| VR-2 | medium | data integrity | Completing a van stop (`phase = completed / no_show`) never updates the linked `Appointment`, which stays `confirmed` forever. | `van.ts:653-664`; no `appointment.update` in the phase handler | Update the appointment status in the same transaction. |
| VR-3 | medium | bug | Phase transitions aren't validated (only `no_show` requires `on_site`). Operator can go `on_site → en_route`, or `queued → completed` without treatment. | `van.ts:642-664` | Explicit transition table; 409 on illegal moves. |
| VR-4 | medium | UX bug | `GET /requests/mine/active` hides the van's coordinates for anyone not first in the queue **before** computing the ETA, so patients at position 2+ always get `etaSeconds: null` from this endpoint (live-track relies on it). `GET /requests/:id` has the same ordering. | `van.ts:986-1006`, `:1053-1076` | Compute the ETA from the unredacted shift position, then redact the coordinates in the response. |
| VR-5 | medium | privacy | "Sanitised" incoming requests still include `patientLat` / `patientLng` (exact location) before the operator accepts. The comment says only area/sector is shown. | `van.ts:65-76` | Strip or round the coordinates (e.g. to ~1 km) until accepted. |
| VR-6 | medium | data integrity | Check-then-create races: one active shift per operator/van (`:192-216`), one open request per patient (`:799-810`), queue depth (`:461-468`). None are backed by a DB constraint. | as cited | Partial unique indexes (`WHERE ended_at IS NULL`, `WHERE status IN (...)`) + handle P2002. |
| VR-7 | medium | product decision | Patient cancel after accept (even `en_route` / `on_site`) refunds the full deposit; `no_show` keeps it. The code flags this as "tunable cancellation-fee policy". | `van.ts:1174-1187`, `:653-658` | **Needs your decision** (payment semantics). |
| VR-8 | low | performance | Queue renumbering runs N separate updates, outside a transaction, after phase change and cancel. | `van.ts:698-709`, `:1203-1214` | One transaction, or a single `UPDATE … FROM (SELECT row_number() …)`. |
| VR-9 | low | bug | A shift with no GPS fix uses a hard-coded London point for ETAs, so availability shows confident but wrong ETAs. | `van.ts:755-757`, `:854-856` | Treat no-fix shifts as unavailable, or label the ETA "unknown". |
| VR-10 | low | data hygiene | Create-request response spreads the whole row, including encrypted `accessDetails` ciphertext. | `van.ts:946-954` | Return an explicit DTO. |
| VR-11 | low | observability | PaymentIntent metadata update failure leaves `vanServiceRequestId: "pending"` on the intent, so dashboard reconciliation can't map it. | `van.ts:928-936` | Create the request row first (with intent id null), then create the intent with the real id in metadata. |

### `backend/src/lib/background-jobs.ts`

Audit: in-process `setInterval` workers, started on every API process.

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| BJ-1 | high | bug / UX | Reminder ladder rows are never cancelled when an appointment is cancelled, rescheduled or expires. Nothing in the codebase updates or deletes `ScheduledNotification` except the dispatcher. | `background-jobs.ts:166-234`; grep `scheduledNotification.update` → only `:109`, `:144` | Cancel pending rows by `data.appointmentId` on every cancel path, and have the dispatcher re-check the appointment status before sending. |
| BJ-2 | high | bug | Reminder text uses `toLocaleTimeString("en-GB")` with no `timeZone`, so it renders in the server's time zone (UTC in Docker). Every reminder is an hour early during BST. | `background-jobs.ts:184-185` | `timeZone: "Europe/London"`; test with a BST date. |
| BJ-3 | medium | idempotency | Dispatcher selects then sends then marks sent, with no claim step. With 2+ API replicas every reminder goes out N times. A push failure throws out of the loop (outer catch), so the batch is retried every minute with no attempt cap; earlier items in the batch may already have been sent → duplicates. | `background-jobs.ts:81-150` | Claim rows atomically (`UPDATE … SET status='sending' … RETURNING` / `FOR UPDATE SKIP LOCKED`); per-item try/catch with `attempts` + `lastError`; give up after N. |
| BJ-4 | medium | idempotency | Webhook redelivery can schedule the ladder twice unless guarded upstream (to verify in `payments.ts`). | `payments.ts:272-286` | Unique `(appointmentId, hoursBefore)` or check-before-insert. |
| BJ-5 | low | observability | All jobs swallow errors into `console.error` and return 0; no metric for lag or failures. Hold-expiry audit rows are written for ids that `updateMany` may not have changed. | `:63`, `:68-71`, `:157-160` | Structured logs + counters; audit only the rows that changed (`updateMany … RETURNING` via raw SQL). |
| BJ-6 | low | dead code | `lib/job-queue.ts` (Redis/SQS queue abstraction, 279 lines) is never imported. | grep | Delete, or adopt it for BJ-3. |

### `backend/src/lib/van-coverage.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| VC-1 | medium | data integrity | The app runs DDL at boot (`CREATE FUNCTION`, `DROP/CREATE TRIGGER`). With several replicas booting together, a concurrent `CREATE TRIGGER` can fail; the catch then switches to JS mode **and drops the trigger**, so later polygon edits never update the geometry column. It also requires the runtime DB user to have DDL rights. | `van-coverage.ts:59-92`, `:120-139` | Move the corrected trigger + backfill into a migration; make the startup probe read-only. |
| VC-2 | low | performance | After one PostGIS query error the process stays in JS mode until restart. | `:163`, `:243` | Re-probe after a cooldown. |
| VC-3 | low | bug | PostGIS mode orders by distance to the polygon (always 0 for a containing polygon), while JS mode orders by distance to the centroid, so the two backends can return different "nearest" vans. | `:182-190` vs `:218` | Use `ST_Centroid` in the PostGIS query. |
| VC-4 | low | bug | JS fallback ignores interior rings and MultiPolygons. | `geo.ts` `pointInPolygon` uses ring 0 only | Document the limitation or support holes. |

### `backend/src/lib/van-eta.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| VE-1 | medium | bug | Treatment overrun is allowed to go negative, which **reduces** the ETA of every patient behind an overrunning stop. | `van-eta.ts:197-206`, used at `:257` | Clamp to a small positive minimum (e.g. 5 min) when overrunning. Test. |
| VE-2 | medium | performance | When the matrix call fails, each leg falls back to `travelSeconds`, which calls the provider **again** per leg (each with a 4 s timeout) until the breaker opens. A provider outage can add 10 s+ to availability/create-request. | `:237-245`, `:164-174` | If the matrix call returned null, use haversine for all legs in that computation. |
| VE-3 | medium | cost / performance | Live-track polls every 5 s and each poll makes a fresh billed matrix request (the multi-point matrix isn't cached). Each GPS-triggered broadcast makes one matrix call per stop. | `:236-237`; `van-eta-broadcast.ts:85-106`; live-track interval (mobile, to confirm) | Cache the per-shift matrix keyed by rounded van position for ~30–60 s; poll less often. |

### `backend/src/lib/van-eta-broadcast.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| EB-1 | low | UX | Patients whose stop is `on_site` or `in_treatment` still get "van is less than 5 minutes away" pushes. `force: true` after one accept re-pushes every patient on the shift. | `:85-143`; `van.ts:582` | Skip stops in `on_site` / `in_treatment`; force only for the accepted request. |

### `backend/src/lib/patient-push.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| PP-1 | high | bug | `if (!preferences?.pushEnabled) return;` treats "no preferences row" as push disabled. Rows are only created by `PUT /api/notifications/preferences`, while `GET` reports `pushEnabled: true` as the default and the schema default is `true`. So most patients never receive van accepted / en route / arrived / ETA pushes. | `patient-push.ts:27-31`; `notifications.ts:72-90`, `:108` | Treat a missing row as defaults (`pushEnabled ?? true`), or create the row at registration. Test. |
| PP-2 | medium | privacy | Push tokens are never deactivated (no logout hook, no handling of `DeviceNotRegistered`), so a logged-out device keeps receiving that patient's notifications. | grep `active: false` → none | Deactivate on logout/session revoke; handle Expo receipts. |
| PP-3 | low | UX | Quiet hours are stored but never applied when sending. | grep `quietHours` → only `notifications.ts` | Apply in the dispatcher or remove the setting. |

### Small modules

| ID | Sev | File | Finding | Proposed fix |
|---|---|---|---|---|
| ID-1 | medium | `lib/idempotency.ts:30-44` | `withIdempotency` is check-then-run (not atomic), and it caches the *result* for 24 h. In `register-token` that means a token re-registered within 24 h returns the cached response without touching the DB. | `SET NX` a "pending" marker; don't wrap operations that must re-run (register-token is naturally idempotent via upsert). |
| JW-1 | low | `lib/jwt.ts:28-34` | `jwt.verify` doesn't pin `algorithms: ["HS256"]` or set issuer/audience. | Pin the algorithm, add `iss`/`aud`. |
| PR-1 | low | `lib/prisma.ts:4-9` | Query logging is on in `development`, which is also what CI runs in. | Opt in with `PRISMA_LOG_QUERIES=1`. |

### `backend/src/lib/encryption.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| EN-1 | high | data integrity | The KEK is derived with HKDF using **`AWS_REGION` as the salt** and the current `KMS_KEY_ID` as info. `.env.example` tells operators to change `AWS_REGION` when switching S3 provider (`global`, `auto`, …). Changing either value makes every encrypted gate code, access note and clinical field permanently undecryptable, and the van routes silently replace them with `"[ENCRYPTED]"`. | `encryption.ts:117-133`, `:198-202`; `van.ts:86-101`; `.env.example` §7 | Fixed salt constant; derive from the record's stored `keyId`, not the current config; add a key-version field and a rotation path. Test that changing `AWS_REGION` doesn't break decrypt. |
| EN-2 | medium | security (claim) | The docs and `.env.example` say "AWS KMS"; no KMS call exists. The master key is a plain env var, and `KMS_KEY_ID` is only a label (dev default is a fake ARN). | `encryption.ts:118`; `config/env.ts:180` | Either integrate KMS for wrapping, or document "local master key" honestly in the DPIA/DSPT evidence. |
| EN-3 | low | security | The same `ENCRYPTION_KEY` is also the HMAC key for signed download URLs. | `object-storage.ts:207-209` | Separate `SIGNED_URL_SECRET` (or HKDF-derive a sub-key). |

### `backend/src/lib/object-storage.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| OS-1 | high | security / PHI | S3 is used **only when `NODE_ENV=production`**. Staging, and production with any S3 variable missing, silently writes triage photos, signed plans and SAR bundles to the container's local `./uploads` (unencrypted, lost on redeploy). | `object-storage.ts:101`, `:145`, `:184`, `:244`, `:268` | In production/staging, refuse to boot without storage config; decide provider by config, not `NODE_ENV`. |
| OS-2 | high | security / PHI | Files are stored as plaintext; at-rest encryption depends entirely on the bucket's settings, which nothing checks. The SAR email calls the bundle "encrypted". | `object-storage.ts:102-109` | Set `ServerSideEncryption` on `PutObject` (or envelope-encrypt with `encryption.ts`); fix the wording. |
| OS-3 | medium | UX | Signed URLs expire after 15 min but are emailed (SAR), so the link is usually dead by the time the patient opens it. | `object-storage.ts:110`, `:129`; `consents.ts:330` | Email a link into the app (authenticated download) instead of a bearer URL. |

### `backend/src/lib/communication-service.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| CS-1 | high | security | With no Postmark/Twilio token, `sendEmail` and `sendSms` log the full message body to stdout and report success. That includes password-reset tokens, email-verification tokens, MFA/OTP codes and SAR download URLs. Production doesn't require these tokens (`env.ts` doesn't check them), so a missing secret in prod both breaks delivery silently and writes credentials to logs. | `communication-service.ts:72-75`, `:114-116`; `config/env.ts:64-74` | Require the tokens in production/staging; never log bodies (log template name + masked recipient). |
| CS-2 | medium | reliability | No timeout on Postmark, Twilio or Expo calls; handlers that `await` them can hang. | `:41`, `:88`, `:222` | `AbortSignal.timeout(5000)`. |
| CS-3 | medium | reliability | Expo push: no chunking (100-message limit), no receipt check, `DeviceNotRegistered` never deactivates tokens. | `:212-250` | Chunk, store ticket ids, poll receipts, deactivate dead tokens (ties to PP-2). |
| CS-4 | low | privacy | The MFA code is in the email subject (shows on lock screens). Push bodies include service names (e.g. treatment type) on lock screens. | `:197`; `background-jobs.ts:191-201` | Generic subject; consider neutral push text (product decision). |

### `backend/src/lib/otp-service.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| OT-1 | high | security | One-time codes use `Math.random()`, not a CSPRNG. | `otp-service.ts:65-72` | `crypto.randomInt(0, 10)` per digit (or `randomInt(0, 1e6)` padded). |
| OT-2 | high | security | `verifyOTP` has no per-code attempt counter (`maxAttempts` config is unused) and ignores `purpose`. The only brake is the per-IP route limiter, so a distributed guess of a 6-digit code within 5 minutes isn't prevented, and a code issued for one purpose verifies another. | `otp-service.ts:343-362`, `:47-52` | Store `purpose` + `attempts` on `mfa_codes`; invalidate after 3–5 wrong tries; per-user rate limit (Redis). Tests. |
| OT-3 | low | reliability | `INCR` then `EXPIRE` isn't atomic; if `EXPIRE` fails the key never expires (permanent lockout). In-memory fallback is per process. | `:250-255` | `SET key 0 EX n NX` + `INCR`, or a Lua script. |

### `backend/src/lib/api-client.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| AC-1 | medium | reliability | One `AbortController`/timer is shared across all retry attempts. After a timeout, every retry aborts instantly; after a non-timeout failure, the timer is cleared and retries have **no** timeout. | `api-client.ts:60-114` | New controller + timer per attempt. |
| AC-2 | low | idempotency | `POST /rooms` to Daily is retried on 5xx/timeouts, which can create duplicate rooms. | `api-client.ts:91-113`; `video.ts:73` | Don't retry non-idempotent POSTs, or use a deterministic room name. |
| AC-3 | low | dead code | `stripeApiClient` and `expoApiClient` are never used. | grep | Delete. |

### `backend/src/lib/audit-integrity.ts`, `audit-monitoring.ts`, `middleware/audit.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| AU-1 | high | data integrity | The hash chain is serialised with an **in-process** promise queue. With 2+ API replicas, concurrent writes read the same "last" hash and fork the chain, so the hourly verifier reports tampering (and emails ops) under normal operation. | `audit-integrity.ts:5`, `:17-64` | Serialise in the DB (advisory lock or a single-row chain head updated in the same transaction), or chain per-writer. |
| AU-2 | medium | bug | After the daily retention job archives the oldest rows, verification starts from `previousHash = ""` but the first non-archived row was chained to an archived one, so **every** hourly check fails once retention has run (after 365 days). Verification also only ever checks the oldest 1000 rows. | `audit-integrity.ts:68-110`, `:121-147`; `audit-monitoring.ts:23` | Seed `previousHash` from the last archived row (or store a checkpoint); verify the newest window, incrementally. |
| AU-3 | medium | security (claim) | The chain covers only action/actor/resource/timestamp (not metadata, ipHash, sessionId) and uses unkeyed SHA-256, so anyone with DB write access can rewrite metadata or recompute the whole chain. | `audit-integrity.ts:35-45` | HMAC with a key outside the DB; include all fields. |
| AU-4 | medium | compliance | Middleware audits only 2xx responses, so denied/failed access attempts (401/403/404 on patient records) are never recorded. `resourceId` is always null, and `action` uses `req.path`, which is relative to the router mount (e.g. `GET /` for many modules), so the log can't answer "who accessed which patient record". | `middleware/audit.ts:82-105` | Log all outcomes; use `req.baseUrl + req.route.path` as action and the patient/resource id as `resourceId`. |
| AU-5 | medium | performance | Every authenticated request does a SELECT + INSERT through one serialised queue per process; audit throughput caps API throughput. | as AU-1 | Resolved by AU-1's design (batch or DB-side chaining). |
| AU-6 | low | dead code | `isCriticalAuditEvent` can never match middleware actions (`"GET /..."`); alerts go to a hard-coded `ops@pavdental.com`. | `audit-integrity.ts:158-170`; `middleware/audit.ts:108` | Emit critical events explicitly; make the alert address config. |

### `backend/src/lib/structured-logging.ts`, `geo.ts`, `triage-escalation.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| SL-1 | medium | observability | The structured JSON logger (with redaction + correlation ids) exists but only `booking.ts` and `triage.ts` use it; everything else uses `console.*`. The `x-request-id` header is generated in `server.ts:70-73` but not attached to logs. | grep | Adopt one logger (pino) with redaction + request id everywhere; this is the base for Sentry. |
| GE-1 | low | privacy / reliability | Patient postcodes are sent to the public postcodes.io API with no fallback; e2e depends on it. | `geo.ts:21-40` | Note in DPIA; stub in tests (P0-2). |
| TE-1 | high | clinical safety (**needs clinical sign-off**) | Red-flag rules never use `difficultySwallowing` (swelling + difficulty swallowing is a classic emergency) and ignore the free-text `symptoms` keywords listed per rule; swelling only escalates with pain ≥ 7. | `triage-escalation.ts:45-98` | Clinical owner to confirm the rule set and wording; then encode + test each rule. |

---

## Backend — `middleware/`

| ID | Sev | File | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| EH-1 | high | `error-handler.ts` | Logged request bodies redact only credentials and contact fields. Names (P0-3), medical history, allergies, medications, triage complaints and clinical notes are logged in full on any 500. | `error-handler.ts:4-24`, `:75-82` | Don't log bodies at all in production (log route + request id + error); if needed, allow-list fields. |
| EH-2 | medium | `error-handler.ts` | Errors that carry a status (body-parser 400/413, multer `LIMIT_FILE_SIZE`, the multer `fileFilter` error) all become 500 "Internal server error" and are logged as server errors. | `:86-87` | Honour `err.status`/`err.statusCode` for 4xx; map multer errors to 400/413. |
| EH-3 | medium | `error-handler.ts`, `server.ts` | `server.ts:70-73` puts a fresh `x-request-id` on the *response*; the error handler and `standardResponse` read it from the *request* headers (client-controlled) or mint another one. So the id the client sees, the id in the JSON body and the id in the log are three different values. | `server.ts:70-73`; `error-handler.ts:71`, `:114` | Set `req.id` once (honour an inbound id only from the trusted proxy), reuse everywhere. |
| AM-1 | medium | `auth.ts` | Access tokens are trusted for their full 15 min after logout, session revoke, password change or account deactivation (no session/isActive check). | `auth.ts:12-45` | Acceptable with 15 min TTL if documented; otherwise cache-backed revocation check on sensitive routes. |
| MF-1 | high | `mfa.ts` | `requireMFA` / `requireMFAForRoles` are not applied to any route, so clinicians and admins reach patient records, prescriptions and admin endpoints without MFA. The promise chains also have no `.catch`, so a DB error leaves the request hanging. | grep `requireMFA` → only the import in `auth.ts:11` | Apply to clinician/admin routers; convert to async/await with error propagation; tests. |
| PA-1 | medium | `patient-access.ts` | A clinician's "care relationship" is *any* appointment ever created with the patient (including expired holds and cancellations) or any plan, so access never lapses. | `patient-access.ts:42-48` | Limit to confirmed/completed appointments within a retention window, or an explicit care-team record. |
| VA-1 | low | `validate.ts` | Validation errors return only `"Invalid request body"` with no field details, so the app can't show which field is wrong. | `validate.ts:16-19` | Return `issues` (path + message) for 400s. |

## Backend — `routes/` (in progress)

### `routes/auth.ts`, `auth-account.ts`, `auth-otp.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| AT-1 | high | security | Phone-OTP login works for **every role** and skips both password and MFA, so clinician/admin/operator accounts are reachable with an SMS code alone. | `auth-otp.ts:336-410` | Restrict OTP login to patients, or require MFA for staff after OTP. |
| AT-2 | medium | security | `user.phone` isn't unique or verified at registration, and OTP looks it up with `findFirst`, so two accounts can share a number and a patient can be signed into someone else's account. | `auth-otp.ts:306-308`, `:349-352`; `auth.ts:47-50` | Unique index on verified phone; only verified numbers can log in. |
| AT-3 | medium | security | `POST /api/auth/check-email` is an enumeration oracle that also returns the account's **role**, which lets an attacker find staff accounts. No schema validation. | `auth.ts:16-29` | Return only what onboarding needs (exists: bool, behind rate limit) or drop it; never return role. |
| AT-4 | medium | bug | Email links point at `${APP_URL}/reset-password?token=…` and `/verify-email?token=…`, but the app's routes are `(auth)/reset` and `(auth)/verify-email`; no universal/app link config exists to open them in the app. | `communication-service.ts:121`, `:151`; `pavdental/src/app/(auth)/reset.tsx` | Align paths, configure the app scheme / associated domains, test the deep link. |
| AT-5 | medium | reliability | Concurrent refreshes with the same refresh token (two parallel 401s on the device) look like token reuse: the second one revokes the session and logs the user out. | `auth.ts:224-231` | Single-flight refresh in `authFetch` (to verify in mobile review) and/or a short grace window for the previous hash. |
| AT-6 | medium | GDPR | Account deletion only sets `isActive = false` and revokes sessions. It doesn't cancel future appointments, van requests, card holds, reminders or push tokens, doesn't detach saved cards, and the email stays reserved forever. | `auth-account.ts:124-163` | Part of the Art. 17 pipeline (Phase 2). |
| AT-7 | low | security | Lockout is per account (anyone can lock a victim out); lockout/423 responses on OTP and login reveal that an account exists; session `ipAddressHash` is unsalted SHA-256 (reversible for IPv4). | `auth.ts:109-115`; `auth-otp.ts:315-318`; `auth.ts:616-618` | Combine with per-IP limits; same generic error; HMAC like `pseudonymiseIp`. |
| AT-8 | low | code health | `toAuthUser` and `hashToken` are duplicated in `auth-account.ts` (comment says "kept in sync deliberately") although `auth.ts` already exports them. | `auth-account.ts:31-76` | Import the exported helpers. |

### `routes/booking.ts`, `cancellations.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| BK-5 | **blocker** | payments / security | `PATCH /appointments/:id/confirm` (see top). Separately, the webhook path already confirms paid appointments, so this endpoint only needs to report status. | `booking.ts:308-396` | Remove client confirmation: confirm only from the webhook (or a server-side retrieve that checks `metadata.appointmentId`, amount and currency); never accept `depositPaidPence` from the client; delete the `pi_e2e_` / `pi_mock_` bypass. Tests: confirm without payment → 402/409; foreign intent → 409. |
| BK-1 | high | missing feature / bug | Slots are synthetic: every clinician, every day (including weekends), 09:00–17:00 **UTC** (10:00–18:00 in BST). There's no rota, opening hours or clinic closure model. | `booking.ts:52-72` | Clinician availability model + Europe/London times. Needs product input on opening hours. |
| BK-2 | high | data integrity | Double-booking is prevented only by a read-then-insert overlap check; the Redis slot lock isn't bound to the requested times (client sends any `slotId`) and is optional. Two concurrent bookings for the same clinician and time both succeed. | `booking.ts:171-224` | Postgres exclusion constraint on `(clinician_id, tstzrange(start,end))` for active statuses, or `SELECT … FOR UPDATE`; derive the lock key server-side. |
| BK-3 | medium | bug | `withIdempotency` caches create/confirm/cancel results for 24 h by patient/service/time, so rebooking the same slot after cancelling returns the old cancelled appointment. | `booking.ts:130-134`, `cancellations.ts:20-22` | Use a client-supplied `Idempotency-Key` header, not a business-field hash. |
| BK-4 | medium | bug | The client chooses `startTimeUtc`/`endTimeUtc` freely (past dates, any length) and the price is fixed per service. Appointments without `clinicianId` skip the overlap check entirely. | `schemas/booking.ts:29-41`; `booking.ts:181` | Server derives end time from service duration; reject past/too-far-future; require a clinician or clinic resource. |
| BK-6 | high | data integrity | There are two cancel endpoints. `PATCH /appointments/:id/cancel` cancels any status (including completed or in progress), never refunds, and doesn't touch reminders or the waitlist. `cancel-with-refund` also accepts past/completed appointments (0 % refund, status overwritten to cancelled). | `booking.ts:399-413`; `cancellations.ts:32-95` | One cancel path with a status allow-list; cancel reminders; notify waitlist. Which one the app uses: see mobile review. |
| BK-7 | low | data model | Check-in is stored inside `accessDetails` JSON with no time-window or status check; the default `completedTasks` claims form/consent/insurance/balance were done. | `booking.ts:416-450` | Real columns (`checkedInAt`), window check, no fabricated defaults. |
| BK-8 | low | performance | Patient appointment list is unbounded; clinician "today" uses server-local midnight. | `booking.ts:253-254`, `:294-302` | Paginate; Europe/London day. |
| BK-9 | medium | bug | `GET /slots` for today returns slots that have already passed as `available: true` (checked at 17:01 UTC: 09:00–16:30 were all offered). The client then books them (see MB-3). | `booking.ts:52-72`; live call to `/api/booking/slots?date=2026-10-23` | Filter out `start <= now + lead time` (fix together with BK-1's Europe/London rework). |
| CN-1 | medium | payments | Refund amount is a percentage of `depositPaidPence`, which `confirm` lets the client set (BK-5). | `cancellations.ts:55` | Base refunds on Stripe's `amount_received`. |
| CN-2 | low | payments | With no Stripe payment id, a fake `re_mock_…` refund id is returned in production. | `cancellations.ts:73-89` | Return `stripeRefundId: null` and say nothing was charged. |

### `routes/payments.ts` (incl. webhook)

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| WH-1 | high | payments | A clinic deposit that succeeds after the hold expired (`processExpiredSlotHolds` has already cancelled it) matches nothing (`status: draft_hold`), so the patient is charged for a cancelled appointment with no refund or alert. | `payments.ts:272-298`; `background-jobs.ts:44-52` | On `applied: false`, refund automatically (or re-confirm if the slot is still free) and alert; extend the hold while PaymentSheet is open. Test. |
| WH-2 | medium | payments | `amount_capturable_updated` for a van request that is no longer pending (cancelled/expired while the patient was still in PaymentSheet) only logs, so the new hold is never released. | `payments.ts:341-368` | If the request is terminal, call `releaseVanDeposit`. |
| WH-3 | medium | payments | No handling of `charge.refunded`, `charge.dispute.created` or clinic-side `payment_failed`/`canceled`; no processed-event table (audit rows duplicate on redelivery). | `payments.ts:266-446` | Add a `stripe_events` dedupe table; handle disputes/refunds for reconciliation. |
| PM-1 | medium | security | `methods/attach` only checks ownership when *both* the PaymentMethod and the profile have a customer. A user without a Stripe customer can attach someone else's `pm_…` id, and `DELETE /methods/:id` then detaches it from the real owner. | `payments.ts:139-148`, `:226-229` | Require `pm.customer === profile.stripeCustomerId` (create the customer first); never detach a PM whose customer isn't the caller's. |
| PM-2 | medium | missing feature | Saved cards are never used: deposit PaymentIntents are created without `customer`, so "Payment methods" is display-only. | `payments.ts:55-64`; `van.ts:885-896` | Pass `customer` + `setup_future_usage` (or remove the screen). Product decision. |

### `routes/patients.ts`, `patient-dependants.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| PT-1 | high | security | `requirePatientRecordAccess` admits clinicians, and `PUT /:id/profile` lets them change the patient's name, medical history, consents **and `user.phone`**. Phone-OTP login uses that phone, so a clinician with any past appointment can take over the account. | `patients.ts:66-96`; `patient-access.ts:11-55`; `auth-otp.ts:349` | Patient-only for demographics/phone; clinician edits to medical history go through an audited clinical endpoint; phone change requires OTP to the new number. |
| PT-2 | high | consent integrity | `POST /:id/plans/:planId/sign` and `/decline` also admit clinicians, so a clinician can sign a plan as the patient. Status isn't checked, so a declined plan can be signed and an accepted one declined; `signerName` is free text. | `patients.ts:213-336` | Patient-only; allow only `proposed → accepted/declined`; bind signer to the authenticated patient. |
| PT-3 | medium | compliance | Odontogram updates overwrite the tooth row with no history and no audit entry; plan creation isn't audited. Clinical records need a change history. | `patients.ts:138-162`, `:182-209` | Append-only tooth-record history (or audit with before/after); audit plan creation. |
| PT-4 | medium | data model | Consents live in two places: `PatientProfile.consents` JSON (writable via profile PUT) and the versioned `ConsentRecord` table. Medical history is unencrypted JSON. | `patients.ts:76-89`; `consents.ts` | One source (`ConsentRecord`); drop the JSON; decide on field encryption for medical history. |
| DP-1 | medium | missing feature / data | `consentSigned` comes from the client (the comment says it mirrors a `guardian_consent` ConsentRecord; none is created). DOB isn't validated (future, adult). No update endpoint, and appointments have no dependant link, so a guardian can't book for a dependant. | `patient-dependants.ts:10-11`, `:21-29`, `:74-83` | Create the ConsentRecord server-side; validate age; add `dependantId` to bookings. Needs product input on who can be a dependant. |

### `routes/consents.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| SAR-1 | high | GDPR | The SAR export omits messages, documents/photos, triage data, van requests (locations), dependants, financing, rewards, waitlist, notification history, payment methods and consent metadata. The CSV variant has no clinical data at all. | `consents.ts:192-294` | Build the export from a per-model registry with a test that fails when a model holding personal data isn't covered. |
| SAR-2 | medium | security | The confirmation email interpolates `firstName` into HTML unescaped and contains a 15-minute bearer URL (OS-3). | `consents.ts:330` | Escape; link into the app. |
| CO-1 | medium | compliance | Grant/withdraw aren't transactional (version race) and aren't audit-logged; the client can supply the IP recorded as consent evidence. | `consents.ts:21-117` | Transaction + unique `(profile, type, version)`; audit; server-side IP only. |
| CO-2 | high | GDPR | `data-deletion-request` only writes an audit row and emails the patient; there is no queue, DPO view or erasure job (known limitation, now confirmed). | `consents.ts:350-388` | Erasure pipeline (Phase 2/3). Retention periods need your decision. |

### `routes/video.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| VD-1 | high | security / PHI | Rooms are created without `privacy: "private"` and without meeting tokens (`roomData.config?.token` is always null for `/rooms`), so anyone with the URL can join a consult. Any authenticated user can create rooms with no appointment (cost abuse). `GET /status` returns the room URL before the clinician admits the patient, so the waiting room can be skipped. | `video.ts:33-119`, `:288-300` | Private rooms + per-participant meeting tokens issued only after admission; require an appointment the caller belongs to. |
| VD-2 | high | clinical safety (**needs clinical sign-off**) | `submit-triage` stores pain/symptoms but never runs the red-flag check that booking uses. | `video.ts:221-261` | Run `checkRedFlags` and surface emergency guidance. |
| VD-3 | medium | bug | `submit-triage` replaces `triageData` wholesale (drops uploaded photos and `admittedAt`); photo URLs stored in `triageData.photos` are 15-minute signed URLs that are dead later; each `/rooms` call makes a new room and overwrites the old one. | `video.ts:192-204`, `:240-252`, `:92-104` | Merge; store keys not URLs; reuse one room per appointment. |
| VD-4 | medium | bug | Clinician queue filters `startTimeUtc >= now`, so a consult disappears from the queue the minute it is due. `admit-patient` doesn't check status (can admit a cancelled appointment). There's no "end consult / complete" endpoint, so video appointments never complete. | `video.ts:318-324`, `:357-379` | Window (e.g. start − 15 min to end + 30 min); status checks; complete endpoint. |

### `routes/prescriptions.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| RX-1 | high | clinical safety (**NHS EPS decision**) | The response claims `DISPATCHED_TO_PHARMACY` with a fabricated `NHS-EPS-…` reference and QR payload; nothing is transmitted. A patient would expect to collect medication that was never sent. | `prescriptions.ts:55-103` | Until EPS exists: label as "private prescription — print/hand to patient" (wording needs clinical sign-off). EPS integration is the separate track you asked to decide. |
| RX-2 | high | security | Any clinician can issue for any patient: `appointmentId` isn't checked against the clinician or patient, and the fallback links to the latest appointment regardless of status. If none is found the prescription is orphaned (no `patientId` column) and invisible to the patient. | `prescriptions.ts:21-53`, `:65-73` | Require an appointment owned by this clinician; add `patientId` FK. |
| RX-3 | medium | security | `GET /patient/:userId` lets any clinician or admin read any patient's prescriptions (no care relationship). | `prescriptions.ts:107-136` | Reuse `requirePatientRecordAccess`. |

### `routes/notifications.ts`, `waitlist.ts`, `messages.ts`, `financing.ts`, `rewards.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| MS-1 | **blocker** | clinical safety | Inbox seeding writes fabricated clinician messages (named clinician, specific tooth, plan to e-sign, "£25 deposit applied") into production data on first load, for any role. | `messages.ts:40-111` | Delete the seeding; show an empty state. Data migration to remove seeded rows where they exist. |
| MS-2 | high | security / PHI | `isStaff` → `where: {}`: every clinician/admin sees every patient's threads and can reply to any, unpaginated. | `messages.ts:28-38`, `:181-185` | Scope to care team; paginate. |
| MS-3 | high | missing feature / clinical safety | There's no recipient routing or staff inbox: patient messages go nowhere, nobody is notified, staff replies show as "You". A patient could report something urgent and get no response. | `messages.ts:134-169` | Route to clinic/clinician, notify, SLA + "not for emergencies" banner (wording: clinical sign-off). |
| FN-1 | **blocker** | legal (**needs your decision**) | Financing returns `pre_approved` for everyone with a fixed £4,000 limit and 0 % APR, labelled "FCA-compliant", with no lender or credit check. Offering consumer credit needs FCA permission or a regulated partner. | `financing.ts:19-75` | Hide the feature for launch, or integrate a regulated provider. |
| RW-1 | **blocker** | clinical safety | New users get fabricated plaque index, bleeding %, recall date, 14-day streak, 1,450 points and "practitioner advice" about tooth #31. | `rewards.ts:71-89` | Start from real (empty) data; advice only from a clinician. |
| RW-2 | high | abuse / money | `POST /brushing-log` grants +25 points per call with no limit; points redeem for a "£25 treatment credit" and physical products. Vouchers are never validated anywhere. | `rewards.ts:207-240`, `:22-59` | Cap per day/session; server-side voucher redemption; decide if rewards ship at all. |
| WL-1 | high | missing feature | Joining the waitlist promises "a 30-min priority alert when a slot opens", but nothing ever reads the waitlist; cancellations don't notify it. `serviceId` and past dates aren't validated. | `waitlist.ts:58-64` | Hook cancellations → notify first N in queue (needs product rules), or change the copy. |
| NT-1 | medium | security | `POST /send`, `/schedule` and `/send-receipt` are client-callable. `send-receipt` emails a "Payment of £X received" receipt with a client-chosen amount and payment method; `/send` echoes `messages` back. | `notifications.ts:137-329` | Remove client-callable send/schedule; generate receipts server-side from Stripe events. |
| NT-2 | low | bug | Quiet hours compare against server time (UTC), only on `/send`. | `notifications.ts:160-173` | Europe/London; apply in dispatcher (PP-3). |

### `routes/admin.ts`, `audit.ts`, `dspt-audit.ts`, `services.ts`, `triage.ts`, `public-van.ts`, `van-queue.ts`, `van-stops.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| AD-1 | high | missing feature | There's no way to onboard clinicians, operators, clinics, services, vans, van assignments or service polygons except the seed script or direct SQL, and no admin UI in the app. Admin status override has no side effects (refunds, reminders, van request). | `admin.ts` (read-only apart from status override) | Minimal admin endpoints/console (or documented ops runbook) — scope needs your input. |
| AR-1 | medium | integrity | `POST /api/audit/log` lets any user write arbitrary `action` strings into the tamper-evident chain (e.g. fake `UNAUTHORIZED_ACCESS_ATTEMPT`). `POST /retention` accepts `retentionDays=1`. | `audit.ts:11-28`, `:74-84` | Allow-list client actions with a `client.` prefix; bound retention (≥ policy minimum) + MFA. |
| PV-1 | low | reliability | `public-van.ts` has its own `postcodeToCoordinates` with no timeout; an outage reports "outside our service area". | `public-van.ts:76-93` | Use `lib/geo.ts`; return "couldn't check" on failure. |
| VS-1 | low | consistency | `POST /api/van/stops/:id/check-in` sets `on_site` without the "Van has arrived" push or ETA re-broadcast that the phase endpoint sends. | `van-stops.ts:60-66` vs `van.ts:674-680` | Share one transition function. |
| DS-1 | ok | — | DSPT report is honest ("PROTOTYPE — NOT FOR PRODUCTION USE WITH PATIENT DATA"). Keep it that way until the assessment is done. | `dspt-audit.ts:44-50` | — |

---

## Backend: `prisma/`

### `prisma/schema.prisma`

Audit: data model. Good: verification, reset and MFA tokens are stored hashed (`auth.ts:69`, `:409`, `otp-service.ts:324`). Most foreign keys are indexed. Money is integer pence.

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| DB-1 | high | GDPR / data model | Erasure can't work at the database level. `Appointment`, `TreatmentPlan`, `VanServiceRequest` and `Prescription` reference the patient or clinician with the default `Restrict`, so deleting a `User` fails once they have any booking. The newer tables (`MessageThread`, `FinancingApplication`, `RewardRedemption`, `OralHealthMetric`, `WaitlistEntry`) have **no foreign key** to `users`, so a deleted or erased user leaves orphaned PHI behind. | `schema.prisma:236-262`, `:289-304`, `:565-596`, `:606-678`; `:439-450` | Decide on an erasure model with the retention decision (CO-2/AT-6): pseudonymise the profile, keep the clinical records you're legally required to retain, and add FKs with explicit `onDelete` to the new tables. This is a migration, so it needs review before it runs. |
| DB-2 | high | data integrity | No database-level guard against the races found in the routes. Nothing stops overlapping appointments for a clinician or van (BK-2), two open shifts per operator or van, or two active van requests per patient (VR-1). Every guard is a read-then-write check in the application. | `schema.prisma:236-272`, `:530-548`, `:565-603` | Use `btree_gist` with an `EXCLUDE USING gist (clinician_id WITH =, tstzrange(start,end) WITH &&) WHERE status IN ('draft_hold','confirmed','in_progress')` (and the same for `van_id`). Add a partial unique index on `van_shifts(operator_id) WHERE ended_at IS NULL`, and another on `van_service_requests(patient_id) WHERE status IN ('pending','accepted','in_progress')`. Clean up existing duplicates first. |
| DB-3 | medium | PHI at rest | `medicalHistory`, `triageData`, `accessDetails` (key-safe codes, door notes), `Message.body` and van `notes` are stored as plaintext. The envelope-encryption library exists, but only `routes/van.ts` uses it. `ConsentRecord.ipAddress` stores a raw IP, and `consents.ts:60,106,269` lets the **client choose** that IP (`ipAddress \|\| req.ip`), which weakens the consent evidence. | `schema.prisma:131`, `:248-249`, `:577`, `:627`; `consents.ts:22,60` | Encrypt the clinical free-text fields at the application layer (after EN-1 is fixed), or document that you rely on disk encryption. Always record the server-observed IP, hashed (HMAC) like the audit log. |
| DB-4 | medium | data model | There are untyped strings where the code relies on fixed values. `TreatmentPlan.status`, `ScheduledNotification.status`, `NotificationHistory.status`, `FinancingApplication.status`, `ConsentRecord.consentType`/`lawfulBasis` and `Dependant.relationship` are free text. `Dependant.dob` and `WaitlistEntry.preferredDate` are `VarChar(10)` instead of `Date`. `DocumentVault.fileSizeBytes` is a `String`. `Clinic.operatingHours` is a string, so it can't drive slots (BK-1). | `schema.prisma:294`, `:343`, `:404-405`, `:428-429`, `:443`, `:459`, `:476`, `:643` | Use enums or CHECK constraints for status and type fields, and `@db.Date` for dates. Use a structured opening-hours table (see the BK-1 decision). |
| DB-5 | medium | clinical safety | The fabricated defaults are in the schema too. `OralHealthMetric` defaults to 1,450 points, a 14-day streak, a 12 % plaque index, 4 % bleeding and 42 days to recall. `FinancingApplication` defaults to `status = 'pre_approved'` and a £4,000 limit. `Prescription.dispatchedAt` defaults to `now()`, so every row claims it was sent. | `schema.prisma:666-678`, `:636-644`, `:326` | Remove the defaults (0 or null) as part of the RW-1, FN-1 and RX-1 fixes, and add a nullable `dispatchedAt` set only after a real transmission. |
| DB-6 | low | performance | Some indexes are missing for hot queries: the dispatcher polls `scheduled_notifications` by `(status, scheduled_for)` every minute, and `push_tokens(user_id)`, `auth_sessions(user_id)` and `notification_history(user_id)` aren't indexed. Some indexes are redundant because they duplicate unique ones: `patient_profiles(user_id)`, `clinician_profiles(gdc_number)` and `vans(registration_plate)`. | `background-jobs.ts:81-85`; `schema.prisma:144`, `:167`, `:201`, `:372-383` | Add the composite or FK indexes and drop the duplicates in a single additive migration. |
| DB-7 | low | data model | The PostGIS `polygon` column and its trigger exist only in SQL, so Prisma doesn't know about them, which is why `migrate dev` wants to drop them (P0-1). | `20260921030000_add_postgis_geometry`, `20260926130000_add_polygon_geometry_column` | Declare `polygon Unsupported("geometry(Polygon,4326)")?` in `VanServicePolygon` so the diff is clean. |

### `prisma/migrations/` (16)

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| MG-1 | blocker | data integrity | This is P0-1. The migration history doesn't produce the schema the code uses (5 tables and 3 columns missing). It needs one new additive migration generated with `migrate diff` against a shadow DB, plus a CI check (CI-1). | 00-baseline §1.1 | Covered by P0-1. |
| MG-2 | medium | process | The newest migration (`20261023000000_add_messages_financing_rewards`) uses `CREATE TABLE/INDEX IF NOT EXISTS` throughout, and `20260921030000` wrapped its DDL in a conditional `DO` block that silently did nothing on fresh databases. Idempotent DDL hides drift: a migration "succeeds" against a database whose tables have a different shape. `fix_notification_relations` drops `audit_logs.integrity_hash`, which the next migration adds back, so any environment that ran the first without the second lost hashes. | migration files listed | Generate migrations with `prisma migrate dev --create-only`, review them with the migration-safety checklist, and don't use `IF NOT EXISTS` except for extensions. Add the drift check (CI-1). Leave the history as it is: those migrations are already applied wherever they ran. |

### `prisma/seed.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| SD-1 | high | security | The seed has no environment guard. It creates **admin, clinician and operator accounts with the published password `Password123!`**, prints them, and runs `deleteMany` on the seeded patient's plans and documents. `tsconfig` includes `prisma/**`, so the compiled seed ships in the production image (`dist/prisma/seed.js`). One mistaken run against production creates a known-password admin. | `seed.ts:17`, `:247-372`, `:440`, `:469`, `:568-572`; `tsconfig.json:15` | Refuse to run when `NODE_ENV` is `production` or `staging` unless an explicit `ALLOW_SEED=demo` is set. Read demo passwords from env, or generate and print them once. Exclude `prisma/seed.ts` from the production build. Split reference data (services, vans) from demo users. |
| SD-2 | low | data hygiene | The seeded GDC numbers (`248912`, `281034`) are realistic and may belong to real registrants. The phone numbers are correctly taken from Ofcom's drama ranges. | `seed.ts:310`, `:385` | Use numbers outside the issued range, or prefix them so they're obviously fake, and note this in the seed. |

---

## Backend: server, config, Docker, CI

### `src/server.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| SV-1 | high | reliability | Rate limiting will lock out real users in production. The global limiter allows **200 requests per 15 minutes per IP**, but the app's own polling exceeds that. The operator app polls incoming requests every 5 s, the shift every 10 s and the route every 10 s, which is about 360 requests per 15 minutes before location pings. The patient's live-track screen (5 s) plus home (10 s) is about 270. In addition, `trust proxy` is never set, so behind a load balancer **every user shares the LB's IP** and the whole app gets 200 requests per 15 minutes, and 20 auth attempts, in total. The limiter's in-memory store also isn't shared across instances. | `server.ts:75-88`; no `trust proxy` anywhere; `(operator)/incoming.tsx:16`, `shift.tsx:24`, `route.tsx:20`, `(patient)/van/live-track.tsx:28`, `(tabs)/home.tsx:92` | Set `app.set("trust proxy", <hop count>)` for the real deployment. Key the limiters by user id when authenticated, and keep IP keys for auth endpoints. Use a Redis store (`rate-limit-redis`, since Redis is already a dependency). Size limits from measured polling, or move live updates to push or SSE. |
| SV-2 | medium | reliability | There's no graceful shutdown. On SIGTERM (every deploy), the process doesn't stop accepting connections, drain in-flight requests (some of them in the middle of a Stripe capture), stop the background-job intervals, or disconnect Prisma and Redis. `unhandledRejection` is logged and swallowed. | `server.ts:216-249` | Add a SIGTERM handler: `server.close()`, then stop the jobs, then `prisma.$disconnect()` and `redis.quit()`, with a timeout. Treat unhandled rejections as errors to report. |
| SV-3 | medium | observability | Request IDs don't line up. `server.ts` sets a random `x-request-id` on the **response**, the error handler reads the **request** header (or makes another random one), and the audit middleware reads the response header. One failing request produces two unrelated ids. `structured-logging.ts` expects `req.id`, which is never set. There is no error tracking (Sentry etc.). | `server.ts:70-73`; `error-handler.ts:71,99,114`; `audit.ts:90`; `structured-logging.ts:210` | Set one id per request (honour an inbound header from a trusted proxy), store it on `req`, echo it, and use it everywhere. Error tracking is a new third-party service, so that's your decision (Sentry is a paid service). |
| SV-4 | low | correctness | All of `/`, `/health`, `/healthz` and `/readyz` are the same readiness check, and they return `dsptMode: "active"`, which overstates compliance (DS-1 says the opposite). `/livez` is correct. | `server.ts:96-124` | Keep `/livez` and `/readyz`, and drop the `dsptMode` field. |

### `src/config/env.ts`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| CF-1 | high | security | Config fails open. Secret validation only runs when `NODE_ENV` is exactly `production` or `staging`. Any other value (unset, `prod`, `Production`, `test`) silently uses **public default secrets**: `dev_access_secret_change_me` for JWTs (so anyone can forge tokens for any role), the dev encryption key, and the mock Stripe key (which turns off payment checks, see VP-1 and BK-5). It also relaxes CORS. The docker-compose `api` service runs with `NODE_ENV: development`. | `env.ts:7-10`, `:63`, `:172-178`; `docker-compose.yml` | Fail closed. Only use defaults when `NODE_ENV` is `development` or `test` **and** an explicit `ALLOW_DEV_DEFAULTS=1` is set, and reject unknown `NODE_ENV` values. In production, reject `sk_test_mock*` and `pk_test_placeholder`, and require Daily, Postmark/Twilio, S3 and `APP_URL` too (today they're unchecked and degrade silently, see OS-1). |

### `backend/Dockerfile`, `docker-compose.yml`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| DK-1 | medium | security / ops | There's no `.dockerignore`, so `COPY . .` sends `backend/.env` (real secrets) and `backend/uploads/` (patient files in dev) into the build stage and its layer cache. The runtime image copies the full `node_modules` (including dev dependencies) and the seed (SD-1). There's no `HEALTHCHECK`, no migration step or documented release command, and uploads go to a container-local directory (OS-1). | `Dockerfile:10-24` | Add a `.dockerignore` (`.env*`, `uploads`, `node_modules`, `testsprite_tests`) and `npm prune --omit=dev`. Make `prisma` a runtime dependency or add a separate migrate image, and document `prisma migrate deploy` as the release step. Add `HEALTHCHECK` on `/livez`. |
| DK-2 | low | security | Compose publishes Postgres and Redis on all host interfaces (`5432`, `6379`), with a password-less Redis and a committed DB password. That's fine for local dev, but it shouldn't be the template for any shared host. | `docker-compose.yml` | Bind to `127.0.0.1:` and add a comment that compose is dev-only. |

### `.github/workflows/ci.yml`

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| CI-1 | high | process | This is P0-2, plus coverage gaps. `prisma db execute --stdin` without `--schema`/`--url` fails, and the e2e suite calls Daily and postcodes.io live. There is no **drift check**, which is how P0-1 got in. CI doesn't run lint, the Docker build, `expo-doctor`, or the three mobile jest files (see baseline §2: jest isn't installed and they test inline copies). | `ci.yml` "Apply migrations", "E2E suite"; 00-baseline | Add `--schema prisma/schema.prisma` to `db execute`. Add `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url … --exit-code`. Stub Daily and postcodes in e2e (a test-only fetch preload, like the one used for the baseline). Add a `docker build` job, and make lint warn-only until the 208 problems are fixed. |

---

## Mobile (`pavdental/`)

Method: `expo export --platform web` against a local API with seeded demo accounts. Playwright opened **every route** as guest, patient, clinician and operator, taking screenshots at 375×812 and 320×568. It recorded failed API calls, console errors, unlabelled interactive elements and elements overflowing at 320 px (report in the session scratchpad, not committed because it contains seeded demo data only). Native-only behaviour (PaymentSheet, camera, push, biometrics, location) was checked by reading the code, because the EAS simulator isn't available in this environment. All 75 routes render without a crash; the only failed API calls are a guest-side 401 and one on the clinician consult room.

### Clinical safety: fabricated content in screens (the most important mobile finding)

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| MC-1 | **blocker** | clinical safety | **The clinician e-prescription screen tells the clinician that every patient is allergic to penicillin, and pre-fills Amoxicillin 500 mg (a penicillin)**, "1 capsule three times daily for 5 days" and "Boots Pharmacy (Harley Street)". The patient's real allergies (stored in `medicalHistory`) are never shown. The patient name and address default to "Alexander Wright, 14 Harley Street" when no params are passed. One tap on "Sign & send" issues the default drug. | `(clinician)/rx-dispense.tsx:19-27`, `:80` | Load the patient and their medical history from the API and refuse to render without them. Start with an empty drug form, show the real allergy list, and warn on conflicts. Decide the clinical wording with RX-1. |
| MC-2 | **blocker** | clinical safety | **The operator's check-in screen shows "Penicillin allergy noted on file" and "Chief complaint: occlusal sensitivity on LR7" for every patient**, and defaults to "Alexander Wright, 14 Harley Street" when it's opened without params. An operator could seat the wrong patient or act on a fake allergy flag. | `(operator)/check-in.tsx:17-19`, `:92-103`; screenshot `operator_check_in.png` | Fetch the stop (patient, address, real flags) by `stopId`, and show an error state when it's missing. |
| MC-3 | **blocker** | clinical safety / missing feature | **The patient video consult is a mock-up.** `video/call` shows a stock photo of a doctor ("Dr. Emily Carter") and a scripted chat in which the "dentist" prescribes Amoxicillin 500 mg and ibuprofen. `video/summary` shows a fixed diagnosis ("reversible pulpitis on LR7"), a "Sent to Pharmacy" prescription and a date of 19 Sep. `components/daily-video-view.tsx` is labelled "Simulated WebRTC". **No video SDK is installed** (no `@daily-co/react-native-daily-js`). The clinician side opens the Daily URL in the browser. | `(patient)/video/call.tsx:81-266`; `video/summary.tsx:24-60`; `daily-video-view.tsx:32-40`; `package.json`; screenshot `patient_video_call.png` | Integrate the Daily RN SDK (needs a dev build) and join with a meeting token (VD-1). Build the summary from the real appointment, its notes and prescriptions, and show an honest empty state until then. Hide video booking until this works. |
| MC-4 | high | clinical safety | Fabricated clinical defaults appear across patient records. `normalizePrescription` fills in missing fields with "Amoxicillin", "1 capsule 3 times daily", "Dr. Tariq Pav (GDC #284910)" and a 5-day course. The odontogram, insights, plans, waiting room, waitlist, messages and profile screens hardcode "Dr. Tariq Pav", tooth #31 or LR7 findings. Home always shows **"1,450 pts"**, and if the services API fails or returns nothing it shows a hardcoded catalogue with prices (implants £1,250). | `records/prescriptions.tsx:25-55`; `(tabs)/home.tsx:42-110`, `:161`; `records/insights.tsx:154-157`; `records/odontogram.tsx:36`, `:255`, `:512`; `video/waiting.tsx:54-104` | Remove every clinical fallback. Missing data should show "not recorded", and API failure should show an error state. Add a lint rule or CI grep that blocks names, drug names and tooth numbers in `src/app`. |
| MC-5 | medium | clinical wording (**needs your decision**) | The messages tab advertises "Dental Emergency? **24/7 AI** – instant triage advice". The consult room claims "HD 1080p · Daily.co WebRTC Encrypted". Offline capture claims "Notes encrypted locally". The welcome screen markets "Veneers Installation". | `(tabs)/messages.tsx`; `consult-room.tsx:150`; `offline-capture.tsx`; screenshots | Agree the clinical and marketing wording with you (and TE-1's triage rules). Don't claim encryption or AI that doesn't exist. |

### Shared state, networking and auth (`features/`, `lib/`)

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| MA-1 | high | bug | Payments, video, triage-photo upload and notification hooks (and 5 screens) **don't use `authFetch`**. They call `fetch` with whatever access token was in memory, so after the 15-minute token lifetime they get a 401 with no refresh. That breaks the deposit flow, the triage upload and the clinician video queue partway through. Their default base URL is **`localhost:3002`** while the rest of the app uses `:3000`. `useConfirmAppointment` sends a client-chosen `depositPaidPence`, which mirrors BK-5. `useAppointmentStatus` downloads the whole appointment list every 3 s to find one item. | `features/payment/payment-hooks.ts:5-120`; `video/video-hooks.ts:7`, `:139-314`; `notifications/notification-hooks.ts:121-269`; `records/vault.tsx`, `records/plans.tsx`, `booking/clinic-picker.tsx`, `(tabs)/appointments.tsx`, `profile/sessions.tsx` | Use one API client (`authFetch` plus a single `API_URL` constant) everywhere. Delete `useConfirmAppointment`, since the webhook confirms. Poll `GET /appointments/:id`. |
| MA-2 | medium | PHI / privacy | Signing out doesn't clear the React Query cache or the booking, van and onboarding stores (no `queryClient.clear()` anywhere). The next person to sign in on the same device can briefly see the previous patient's appointments, records and medical-history draft. On web, the refresh token is stored in `localStorage`. | `features/auth/auth-api.ts:132-139`; `auth-store.ts:49-55`; `lib/token-store.ts:13-40` | Use a single `signOut()` that clears the query cache and resets all stores. If web is a real target, use an httpOnly cookie for refresh there. |
| MA-3 | medium | security | **The biometric app lock is bypassed on cold start.** The lock only engages when the app comes back to the foreground after more than 60 s. A fresh launch silently refreshes and opens the portal. `(auth)/biometric-unlock` is never routed to, and `biometricUnlocked` is never read. `unlock()` also unlocks automatically when the device has no biometrics enrolled. | `_layout.tsx:52-75`; `app/index.tsx`; `app-lock-store.ts:39-48` | When biometric lock is enabled, start locked on hydrate. Fall back to the device passcode instead of auto-unlocking. |
| MA-4 | medium | reliability | There is no offline handling. `NetworkOffline` exists but nothing renders it, NetInfo isn't installed, and React Query's `onlineManager` isn't wired. 22 data screens lack a loading or error state (for example, the clinician schedule shows "0 patients" when the API fails, and home falls back to fake services). | `components/network-offline.tsx`; screen list in this section's Method run | Add `@react-native-community/netinfo` with `onlineManager`, a global offline banner, and a loading/error/empty template for every query screen. |
| MA-5 | low | code health | There are two refresh implementations (`authFetch`'s single-flight one and `authApi.refresh` used on hydrate). The guest screens call the notification preference and history endpoints and get 401s on every page. | `auth-api.ts:47-80`, `:225-243`; Method run | Use one refresh path, and gate notification queries on `isAuthenticated`. |

### Screens by portal

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| MB-1 | high | navigation | Route collisions: `(patient)/check-in` and `(operator)/check-in` both resolve to `/check-in`, and `(onboarding)/profile` and `(patient)/(tabs)/profile/index` both resolve to `/profile`. Opening `/check-in` as a patient lands on home. Deep links and push `data.url` for these paths are ambiguous. | Route table in this section's Method run | Rename (`/van-check-in`, `/onboarding/profile`) and add a routing test that fails on duplicate URLs. |
| MB-2 | high | payments | `booking/summary` books with fallbacks when the draft is missing or partial (deep link, app restart): service `srv_checkup`, start **now**, 30 minutes. The PaymentSheet hardcodes `googlePay.testEnv: true` and `allowsDelayedPaymentMethods: true`, so a delayed method can't settle inside the 10-minute hold (see WH-1). The hold timer shows 10:00 and never counts when `holdExpiresAt` is missing. | `booking/summary.tsx:16`, `:50-63`, `:74-92` | Redirect to the catalogue if the draft is incomplete. Read `testEnv` from config, and turn off delayed methods for deposits. |
| MB-3 | medium | bug | The slot picker offers times that have already passed today (from BK-9). Times are shown in the device time zone but generated in UTC (BK-1). | screenshot `patient_booking_slot_picker__320.png` | Fixed server-side by BK-1 and BK-9. Also hide past slots client-side. |
| MB-4 | medium | clinician portal | The clinician schedule says "Today's consultations" but lists **all** of the clinician's appointments, including past and completed ones, with only the time shown. "Open Video Consult Room" appears on in-clinic visits. Every clinician is labelled "GDC #248912 · Principal Dental Surgeon". The name shows as "Dr. Dr. Tariq Pav". The status badge is clipped at 375 px. There's no loading or error state. The clinician portal has 3 screens: no patient record, notes, odontogram editing or plan creation (Phase 2 gap). | `(clinician)/schedule.tsx:14-60`, `:105-120`; screenshot `clinician_schedule.png` | Add a date-scoped query with a date header. Choose the action by channel, read GDC and title from the profile, and add states. |
| MB-5 | medium | operator portal | Location runs in the foreground only (`watchPositionAsync` and `requestForegroundPermissionsAsync`). When the operator's screen locks, pings stop, and the patient ETA freezes, then goes stale. The operator polls three endpoints every 5–10 s (SV-1). | `features/van/use-operator-location.ts:56-90` | Use background location with a foreground service on Android (needs store justification), or accept and show "last seen" times. Move to push or SSE for the queue. |
| MB-6 | medium | accessibility | 335 `onPress` handlers in screens, but only 48 `accessibilityLabel`s and 59 `accessibilityRole`s. 51 of the 75 screens have none. Toggles on notifications (6), consents (3), medical history (3), intake (2), security and shift have no accessible name in the web run. Nothing sets `maxFontSizeMultiplier`, and fixed-height pills clip at large Dynamic Type sizes. | Method run; `grep` counts | Add roles and labels to shared `Button`, `Card` and `Toggle` components first (most screens use them), then fix icon-only buttons. Run a large-text pass. |
| MB-7 | low | layout | At 320 px, nothing overflows horizontally (scrollWidth = 320 on every screen). The reported "overflow" elements are horizontal chip scrollers, which is expected. Exceptions: the clinician status badge (MB-4), `records/insights` chart labels and `video/call` controls clip. | screenshots `*__320.png` | Small style fixes. |

### Config: `app.json`, `eas.json`, env

| ID | Sev | Category | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| CG-1 | high | release | **Push notifications can't register in a build.** `getExpoPushTokenAsync()` is called without a `projectId`, there's no `extra.eas.projectId`, no `expo-notifications` plugin, and no Android FCM config, so every ETA, reminder and van push (PP-1) is dead on device. | `notification-hooks.ts:319`; `app.json` | Run `eas init` (you approved this, but it needs an `EXPO_TOKEN` this environment doesn't have), pass `projectId`, add the plugin, `google-services.json` and an icon. |
| CG-2 | high | release / payments | The Stripe publishable key isn't set in any EAS profile, so production builds get `""` and the PaymentSheet fails. The `@stripe/stripe-react-native` config plugin, the Apple Pay `merchantIdentifier` and the `urlScheme` for 3-D Secure returns are missing. | `eas.json`; `app.json`; `_layout.tsx:18` | Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` per profile (test key for preview), the Stripe plugin with merchant id, and `urlScheme: "pavdental"`. |
| CG-3 | medium | release | There are no universal or app links (`associatedDomains`, `intentFilters`), so password-reset and verify links (AT-4) can't open the app. There's no `runtimeVersion` or `updates` config. `extra.stage` is hardcoded to `"production"`. The submit block has placeholder-looking values (an Apple Team ID `PAV889921` is 9 characters, but real ones are 10). | `app.json`, `eas.json` | Add links and the AASA/assetlinks files on the web domain, set a `runtimeVersion` policy, and confirm the real submit ids with you. |
| CG-4 | low | config | `.env.example` lists `EXPO_PUBLIC_DAILY_URL`, `EXPO_PUBLIC_APP_ENV` and `EXPO_PUBLIC_DSPT_MODE`, which no code reads. The development profile points physical devices at `localhost`. | `.env.example`; `eas.json` | Trim the file and document the LAN IP for dev builds. |
