# 01 — Findings (Phase 1, file-by-file review)

Status: **in progress**. Order follows the mission: backend `lib/` (van-payments,
van-coverage, van-eta*, background-jobs first) → `routes/` → `prisma/` → server/config/CI
→ mobile. Each finding has an ID, severity (blocker / high / medium / low), category,
evidence and a proposed fix. Line numbers refer to `main` @ 07e372e.

## ⚠️ Needs attention now

| ID | Sev | Summary |
|---|---|---|
| BK-5 | **blocker** | `PATCH /api/booking/appointments/:id/confirm` confirms an appointment **without payment**: no payment id → no check at all; any client-sent id starting `pi_e2e_` / `pi_mock_` skips Stripe even with live keys; any succeeded intent (any amount, any appointment) is accepted; `depositPaidPence` is taken from the request body. **Reproduced locally** with a non-mock `sk_test_` key: a new patient confirmed a clinic appointment with an empty payment and `depositPaidPence: 999999` → 200 `confirmed` |
| WH-1 | high | A clinic deposit that succeeds after the 10-minute hold has expired is kept: the webhook matches 0 rows, the appointment stays cancelled, and nothing refunds or alerts |
| MF-1 | high | MFA is never enforced: `requireMFA` exists but no route uses it, and phone-OTP login lets clinicians/admins in with an SMS code alone |
| P0-1 | blocker | Schema/migration drift: `migrate deploy` produces a DB the code can't run against; `migrate dev` would drop the PostGIS column (see 00-baseline §1.1) |
| P0-2 | blocker | CI can't go green as written (lockfile fixed in ea0a067; `db execute` flag and e2e's live Daily/postcodes.io calls remain) |
| P0-3 | high | Error handler logs patient first/last name in clear (PII) |
| BJ-1 | high | Appointment reminders are never cancelled when an appointment is cancelled, so patients get "see you in 2 hours" pushes for cancelled visits |
| BJ-2 | high | Reminder times are formatted in the server's time zone (UTC), so during BST every reminder shows the wrong time (1 hour early) |
| PP-1 | high | Patients who never opened notification settings get **no** van/ETA push notifications (missing preferences row is treated as "push disabled", while the API reports the default as enabled) |
| VR-1 | high | Van accept is not atomic: double-tap/concurrent accept creates two appointments; a retried accept after a successful capture is rejected as "deposit not authorised", and the request later expires and is refunded |

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
