# 01 — Findings (Phase 1, file-by-file review)

Status: **in progress**. Order follows the mission: backend `lib/` (van-payments,
van-coverage, van-eta*, background-jobs first) → `routes/` → `prisma/` → server/config/CI
→ mobile. Each finding has an ID, severity (blocker / high / medium / low), category,
evidence and a proposed fix. Line numbers refer to `main` @ 07e372e.

## ⚠️ Needs attention now

| ID | Sev | Summary |
|---|---|---|
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
