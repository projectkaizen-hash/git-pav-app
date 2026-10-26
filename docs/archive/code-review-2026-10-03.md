# OpenCodeReview — delegated review report

- **Tool:** alibaba/open-code-review v1.12.11 (delegation mode: OCR file selection + rules, review executed by agent)
- **Scope:** workspace mode — 129 reviewable files, +8,618/−3,051 (van dispatch feature + Quiet Ink redesign)
- **Rule groups applied:** system/default, package.json, *.prisma, *.{ts,tsx}, yaml, json, GitHub workflows
- **Verification at review time:** backend `tsc` clean + 67/67 jest · mobile `tsc` clean + 12/12 — none of the bugs below are covered by the existing suites.

## Blocking (fix before ship)

**1. OTP login returns a user with no names / profileId** — `backend/src/routes/auth-otp.ts:84`
`prisma.user.findFirst` omits `include: { patientProfile: true, clinicianProfile: true }`, but `toAuthUser(user)` (line 133) reads only the included relations. Response has `firstName/lastName/profileId: undefined`. Mobile gate `user?.profileId` (`pavdental/src/app/(onboarding)/consents.tsx:40`) then misroutes returning onboarded patients back into onboarding. Every other login path in `auth.ts` includes the profiles before calling `toAuthUser`.

**2. Demo fallbacks can dispatch the van to "10 Downing Street"** — `pavdental/src/features/van/van-store.ts:98,101`
`getAccessDetailsPayload()` substitutes `"10 Downing Street"` / `"SW1A 2AA"` when addressLine1/postcode are blank. These pass backend zod validation (`accessDetailsSchema` min(1)) because they're valid values — a real dispatch would go to the wrong address. Send empty strings and let the API 400.

## Should fix

**3. Manual queue reorder 409s whenever a stop is in-progress** — `pavdental/src/app/(operator)/route.tsx:96`
`moveStop` sends `queue.map(s => s.id)` — the Live Queue includes `in_progress` stops — but `POST /api/van/shift/queue/reorder` (`backend/src/routes/van-queue.ts`) validates a permutation of `status: "accepted", phase: "queued"` only. Broken in exactly the pinning scenario it was built for. Fix: filter to `phase === "queued"` client-side before building/swapping ids.

**4. No timeout on postcodes.io in the create-request hot path** — `backend/src/lib/geo.ts:17`
`fetch` has no AbortSignal; a slow postcodes.io stalls `POST /api/van/requests`. Also the 1 km postcode-centroid tolerance (`van.ts` ~line 825) can reject legitimate rural addresses whose centroid is >1 km from the door.

**5. Ineffective Stripe idempotency keys** — `backend/src/routes/van.ts:868`
`idempotencyKey: van-request-deposit:${Date.now()}` never collides, so a client retry after a network failure can mint a second PaymentIntent (the duplicate-active-request guard has a TOCTOU window). `capture`/`cancel`/`refund` calls carry no keys either, so partial-failure retries aren't protected.

## Minor / hardening

- `backend/src/server.ts:128-136` — `/api/auth/account` and `/api/auth/otp` are mounted **after** `/api/auth`, so they still pass through the strict `authLimiter` (20/15 min) despite comments claiming the opposite. Works, but password change + OTP share the login bucket.
- `backend/src/routes/services.ts:15` — `channel` query param unvalidated; an unknown value becomes a Prisma enum error → 500 instead of 400.
- `backend/src/routes/van.ts` shift/start — dead `if (!opProfile)` guard (the helper now throws); missing operator profile surfaces as 500, not 403.
- `backend/src/routes/auth-otp.ts:58` — 404 body "No account found for this phone number" contradicts the header's "no enumeration" claim; and the verify transaction's `mfaCode.update` doesn't guard `usedAt: null` → theoretical concurrent double-verify.
- `.github/workflows/ci.yml` — no `permissions:` least-privilege block and no `timeout-minutes` on either job.
- `pavdental/package.json` — scripts call `tsx` but it isn't declared in devDependencies (backend declares it; npx resolves it ad hoc in CI).
- Style (OCR rule notes): `any` without justification comments in `van.ts` phase handler, `van-api.ts` stripe params; theme import inside the API layer.

## Verified clean

- Legacy `/api/van/fleet|/stops|/stops/:id/check-in|complete` routes **removed** — they let any authed user read/modify all van appointments (real security fix).
- Access details encrypted at rest (gateCode/accessNotes), sanitized before operator acceptance, decrypted only for the owning patient.
- Deposit lifecycle is coherent: authorize (webhook-stamped `depositAuthorizedAt`) → capture on accept with pre-check → release on decline/cancel/expiry/shift-end, with a retrying sweeper and idempotent re-checks; external Dashboard cancels cancel the pending request.
- `van-coverage.ts` PostGIS-first with JS fallback, self-healing geometry trigger (fixes the SRID-0 bug), parameterized raw SQL only.
- `prisma validate` passes; migration ledger sane (baseline owns CREATE TABLE users; dated migrations additive; `dependants`/`waitlist` hand-written with documented drift rationale).
- Webhook handlers idempotent + audit-logged; secrets only as placeholders in `.env.example`.
- Mobile: no leaked timers/subscriptions in changed files, no loose `==`, no inner-component declarations, Express covered by `express-async-errors`.

## Suggested order

1. auth-otp.ts include (one line) — unblocks OTP login.
2. van-store.ts fallbacks (delete two `|| "…"` fallbacks) — data integrity.
3. route.tsx reorder filter — restores operator feature.
4. geo.ts timeout + tolerance revisit — availability.
5. Stripe idempotency keys — money safety hardening.

---

## Fix status (2026-10-03, same day)

All findings implemented and verified (backend tsc clean + 67/67 jest · mobile tsc clean + 12/12):

- ✅ **1** auth-otp.ts — profile includes on verify; anti-enumeration (request always 200, verify generic 401); code consumption guarded on `usedAt IS NULL` via updateMany count check.
- ✅ **2** van-store.ts — demo fallbacks removed; blank required fields now reach zod validation empty.
- ✅ **3** route.tsx — reorder payload built from the queued-only subset.
- ✅ **4** geo.ts — 3s AbortSignal timeout; tolerance env-tunable via `VAN_POSTCODE_TOLERANCE_M` (default 1000).
- ✅ **5** Stripe idempotency keys — capture `van-deposit-capture:{requestId}`, refund `van-deposit-refund:{intentId}`, cancel `van-deposit-cancel:{intentId}`, per-attempt UUID for deposit create (stable key would replay stale intents); tests updated to assert the keyed signatures.
- ✅ **6** server.ts — `/api/auth/account` + `/api/auth/otp` mounted before `/api/auth` (OTP limiter runs once; account actions use the global limiter only, as documented).
- ✅ **7** services.ts — shared `parseChannelParam` validates both `/` and `/clinicians`; unknown → 400.
- ✅ **8** HttpError class in error-handler (respects `status`, safe message); `getOperatorProfile` throws HttpError(403); dead guard removed.
- ✅ **9** ci.yml — `permissions: contents: read`, `timeout-minutes` (20/10), `concurrency` cancel-in-progress.
- ✅ **10** pavdental — `tsx@^4.23.15` added to devDependencies (lockfile updated).
- ✅ **11** van-api.ts — `any` replaced with a structural PaymentSheet param type; unused deposit param dropped (3 call sites updated).

Not done (deliberate): request-side anti-enumeration for verify beyond the generic 401 (full 200-flow would change mobile UX), and a dedicated OTP double-verify unit test (needs transaction mocking) — both candidates for a follow-up.
