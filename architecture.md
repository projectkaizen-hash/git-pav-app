# Pav Dental — Architecture

> Verified against the codebase on 2026-09-26. This replaces the earlier audit
> (which described the mobile app as missing and auth as broken — both long
> since fixed). Every claim below is backed by code and by the automated
> suites: backend 42/42 jest, 24/24 e2e, mobile 12/12 tests, typechecks clean.

## 1. What exists

**Backend** (`backend/`): Express 4 + TypeScript + Prisma 6 on PostgreSQL 16
with PostGIS, Redis for locks/queues, JWT auth (argon2 hashing), Stripe
deposits (manual capture), Daily.co telehealth, audit hash-chaining, and 17
route modules. Ships with a Dockerfile; CI runs typecheck + jest + the e2e
suite against real PostGIS/Redis service containers.

**Mobile** (`pavdental/`): Expo SDK app with four portals — patient
(tabs, booking, records, video consults, van dispatch), clinician (schedule,
consult room, prescriptions), operator (shift console, incoming queue, route,
check-in, offline capture), and auth/onboarding (including phone-OTP login).
State via Zustand, data via TanStack Query + `authFetch` (transparent token
refresh), payments via Stripe PaymentSheet.

**Mobile van flow end-to-end:** coverage check → live availability/ETA →
access details → deposit authorization (PaymentSheet, manual-capture intent) →
operator accept (captures deposit, links appointment) → phase ladder
(en_route → on_site → in_treatment → completed) → patient cancel releases or
refunds via webhook-aware payment service.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict), both apps |
| API | Express 4, zod validation, helmet, rate limiting |
| ORM / DB | Prisma 6 / PostgreSQL 16 + PostGIS 3.4 (spatial coverage) |
| Cache | Redis 7 (slot holds, OTP rate limiting) |
| Auth | JWT access/refresh, argon2, phone-OTP login, TOTP-style MFA |
| Payments | Stripe PaymentIntents (manual capture for van deposits), webhooks raw-body |
| Video | Daily.co REST |
| Storage | S3-compatible object storage |
| Mobile | Expo / React Native, expo-router, Zustand, React Query, Stripe RN |
| CI | GitHub Actions — backend (PG+PostGIS+Redis services) & mobile jobs |

## 3. Data model highlights

29 Prisma models. Notable:

- `VanShift`, `VanLocationPing`, `VanServiceRequest` — live dispatch
- `VanServicePolygon` — GeoJSON (source of truth) + derived PostGIS geometry
  (GIST-indexed, trigger-maintained; backfilled on startup when PostGIS is
  available — see `lib/van-coverage.ts`)
- `Dependant` — family members under a guardian's patient account
- `WaitlistEntry` — persistent waitlist (replaced the old in-memory queue)
- `AuditLog` — hash-chained, tamper-evident
- Money is integer pence everywhere

## 4. Van coverage checking (dual-backend)

`backend/src/lib/van-coverage.ts` is the single source of truth:

- **PostGIS mode**: `ST_Contains` + spheroid `ST_Distance` over the indexed
  geometry column. Startup backfills NULL geometry and (re)installs the sync
  trigger with corrected `ST_SetSRID(…, 4326)` (the original migration's
  trigger left SRID unset, which silently broke matching).
- **JS mode**: ray-casting fallback for environments without the extension.
  Also defuses the dead trigger, which would otherwise break polygon inserts.
- Mid-flight PostGIS failures degrade to JS rather than erroring.

Route consumers: `routes/public-van.ts` (coverage check), `routes/van.ts`
(availability, request creation). `routes/van-stops.ts` handles operator
check-in (`on_site`).

## 5. Money flow (van deposits)

`lib/van-payments.ts` — `releaseVanDeposit()` cancels uncaptured holds,
refunds captured ones, and is idempotent; every outcome audit-logged. Wired
into patient cancel (blocking), operator decline, shift end, and the expiry
sweeper. Webhooks (`payments.ts`): `amount_capturable_updated` stamps
`depositAuthorizedAt`; `canceled` self-heals orphaned pending requests;
`payment_failed` notifies; van `succeeded` syncs the captured amount onto the
appointment. Accept-time capture verifies authorization first and returns an
actionable 409 otherwise. `POST /api/van/requests/:id/payment-retry` re-presents
PaymentSheet with a fresh secret.

## 6. Background jobs

`lib/background-jobs.ts` + `van-expiry` sweeper: expired slot holds, scheduled
notification dispatch, van request expiry (with deposit release). Audit
integrity monitoring runs from `server.ts` on boot.

## 7. Known limitations (honest list)

- **ETAs default to a haversine × urban-speed model.** Set `MAPBOX_TOKEN`
  (Directions Matrix) or `OSRM_BASE_URL` (Table service) in `backend/.env` and
  `lib/van-eta.ts` switches to real road-network travel times automatically —
  with per-leg caching, a failure circuit breaker, and graceful fallback to
  the built-in model if the provider errors or is unconfigured.
- **Live ETA re-push** (`lib/van-eta-broadcast.ts`): patients get a push
  notification when their ETA materially changes (≥ `ETA_PUSH_DRIFT_MINUTES`,
  default 5) — triggered by material GPS drift (200 m+, scaling with queue
  length) and queue changes (accept seeds a forced first ETA; phase advance,
  completion, and cancellation recompute for everyone remaining). Per-patient
  throttle (`ETA_PUSH_THROTTLE_MINUTES`, default 10) prevents spam; polling in
  live-track.tsx still updates the UI continuously regardless.
- **Queue ordering** (`routes/van-queue.ts`): `POST /api/van/shift/optimize`
  sequences the operator's queued stops for minimum driving time via
  `optimizeStopOrder` — exact permutation search over the routing matrix
  (queue is capped at 5; haversine fallback without a provider), with
  in-progress stops pinned. `POST /api/van/shift/queue/reorder` applies
  manual operator ordering, validated as a strict permutation of the current
  queue (409 on mismatch). The operator route screen exposes both: an
  ⚡ Optimize button and ▲/▼ arrows per movable stop.
- **NHS EPS** is not integrated; prescriptions store the EPS ref as a string.
- **Account deletion is a soft delete** (GDPR Art. 17 needs the erasure
  pipeline completed by an operator).
- **SAR export** in the consent screen is currently UI-only (the backend has
  `/api/consents/data-access-request` — wire the button to it).
- Stripe/Daily/Twilio/Postmark keys in `backend/.env` are test-shaped;
  the e2e suite forces `sk_test_mock_e2e` so it never depends on them.
- `pavdental/.env.production` is untracked now (rotate any values that were
  in git history before it was removed).

## 8. Local development

```bash
docker compose up -d        # Postgres (PostGIS) + Redis + API image
cd backend
npm install && npx prisma generate
npx prisma migrate deploy   # 20 migrations
npm run prisma:seed         # clinics, clinicians, services, van + polygons
npm run dev                 # or: docker compose up api
npm test                    # 24-step e2e (mock Stripe, deterministic)
npx jest                    # 42 unit/integration tests

cd ../pavdental
npm install
npx tsx run-tests.ts        # 12 content tests
npx tsc --noEmit            # typecheck
```

If the local Postgres lacks PostGIS (e.g. Homebrew `postgresql@14`), the app
still works — coverage falls back to JS ray-casting automatically, and the
startup probe logs which mode is active.
