# Pav Dental — Plan 2: Next-Step Delivery Guide

> **Repo:** https://github.com/projectkaizen-hash/git-pav-app  
> **Baseline:** After commits `511a38c` (mobile app added) + `8bd23e9` (implement plan)  
> **Date:** 2026-09-20  
> **Goal:** Take the app from “partially wired prototype” to every core feature working end-to-end with real backend integration and no silent mocks.

This document is the **actionable next-step plan**.  
Format for every item: **Current state → Correct pattern → Exact steps**.

---

## 0. Progress Snapshot (What Is Already Done)

| Area | Status | Notes |
|------|--------|-------|
| Mobile app source | ✅ Present | Full Expo SDK 57 app under `pavdental/` |
| Service catalogue | ✅ API-backed | `useServices()` → `GET /api/services` |
| Clinic booking summary | ✅ Stripe PaymentSheet | Real `initPaymentSheet` + `presentPaymentSheet` |
| Payments backend | ✅ Solid | Server-authoritative amount, webhook confirms appointment |
| Van service-area screen | ✅ Calls real API | `POST /api/van/coverage-check` |
| Odontogram | ✅ API + states | Loading / error / empty handled |
| Auth store + authFetch | ✅ Improved | Phone field, transparent refresh |
| Video room creation | ✅ Strict | No more fake rooms when Daily key missing |
| Operator offline capture | ✅ Better | Validation + `authFetch` |

---

## 1. Phase 1 — Make Clinic Booking Fully Reliable (Highest Priority)

**Goal:** One complete, trustworthy patient journey: catalogue → hold → pay → confirmed appointment appears in “My Appointments”.

### 1.1 Auth Refresh Must Return Full User

**Current state**  
Mobile `auth-api.ts` does:
```ts
useAuthStore.getState().setAuth(data.accessToken, data.user);
```
If `/api/auth/refresh` omits `user`, cold-start / token refresh breaks role routing.

**Correct pattern**  
Every auth response (login, register, refresh) returns the same `AuthUser` shape.

**Exact steps**
1. Open `backend/src/routes/auth.ts`.
2. Locate the `/refresh` handler.
3. Ensure it loads the full user (with patient/clinician profile) and returns:
   ```json
   {
     "accessToken": "...",
     "refreshToken": "...",
     "user": { /* full AuthUser including role, firstName, lastName, emailVerified, mfaEnabled, profileId, phone */ }
   }
   ```
4. Optionally add `GET /api/auth/me` as a safety net and call it after refresh if `user` is missing.
5. Test: login → kill app → reopen → user still authenticated with correct role.

### 1.2 Confirmed Screen Must Wait for Webhook

**Current state**  
`summary.tsx` navigates to `/(patient)/booking/confirmed` immediately after `presentPaymentSheet` succeeds. The webhook may not have run yet.

**Correct pattern**  
Only show “You’re booked” after the appointment status is actually `confirmed`.

**Exact steps**
1. Open `pavdental/src/app/(patient)/booking/confirmed.tsx`.
2. Accept `appointmentId` via route params or booking store.
3. On mount, poll `GET /api/booking/appointments` (or a single-appointment endpoint) every 2–3 seconds.
4. Show a “Confirming payment…” state while status is still `draft_hold`.
5. When status becomes `confirmed`, show success UI + appointment details.
6. On timeout (e.g. 30 s) show “Payment received — confirmation pending. Check My Appointments shortly.”
7. Never navigate to confirmed until the PaymentSheet has succeeded **and** you have an `appointmentId`.

### 1.3 Hold Expiry Behaviour

**Current state**  
Timer on summary counts down but does nothing useful when it hits zero.

**Correct pattern**  
Expired hold is released; user is forced back to slot selection with a clear message.

**Exact steps**
1. In `summary.tsx`, when `secondsRemaining === 0`:
   - Call cancel/release endpoint if one exists, or simply clear the booking store.
   - Show an Alert: “Your slot reservation has expired.”
   - Navigate back to `/(patient)/booking/slot-picker`.
2. Disable the Pay button when timer is 0.

### 1.4 Eliminate Mock Data Risk

**Current state**  
`pavdental/src/features/booking/booking-mock-data.ts` still exists.

**Correct pattern**  
Production paths never import mocks.

**Exact steps**
1. Search the entire `pavdental/` tree for imports of `booking-mock-data`.
2. Remove every production import.
3. Either delete the file or move it under `__mocks__` / a `dev-only` folder and guard with `if (__DEV__)`.
4. Same check for `records-mock-data.ts` if it still exists.

### 1.5 Acceptance Criteria for Phase 1

- [ ] Register / login / refresh all return complete `AuthUser`.
- [ ] Cold start restores session with correct role portal.
- [ ] Full flow on device: service → clinic → clinician → slot → PaymentSheet (test card) → confirmed screen shows real confirmed appointment.
- [ ] Appointment appears in “My Appointments” with status `confirmed`.
- [ ] No mock data used on any booking screen.
- [ ] Hold expiry returns user to slot picker cleanly.

---

## 2. Phase 2 — Real Video Consultation

**Goal:** Replace the painted `DailyVideoView` with actual Daily.co WebRTC.

### 2.1 Current state
`pavdental/src/components/daily-video-view.tsx` is a simulated UI (emoji avatar + timer). No real media streams.

Backend already correctly refuses to create rooms when `DAILY_API_KEY` is missing/placeholder.

### 2.2 Correct pattern
- Server creates short-lived, role-scoped Daily room + token bound to an appointment.
- Mobile joins with the official Daily React Native / Expo-compatible SDK.
- Clinician admits from a real queue.

### 2.3 Exact steps

1. **Choose & install SDK**
   - Use the current recommended Daily package for Expo / React Native (check Daily docs for Expo SDK 57 compatibility).
   - Add to `pavdental/package.json` and run install.

2. **Replace component**
   - Rewrite `daily-video-view.tsx` to accept `roomUrl` + `token` and render the real Daily call UI.
   - Handle permissions (camera / microphone) with clear denial recovery.
   - Wire mute / video-off / leave-call to the real Daily participant controls.

3. **Patient flow wiring**
   - Triage → photos → call backend `POST /api/video/rooms` → receive real `url` + `token`.
   - Waiting room shows queue position from server (remove any 3-second auto-join timers).
   - On admit, navigate to call screen with the real room credentials.

4. **Clinician side**
   - Queue screen lists waiting patients from `GET /api/video/clinician-queue`.
   - Admit action calls backend and joins the same room.

5. **Environment**
   - Set a real `DAILY_API_KEY` in backend `.env`.
   - Set `EXPO_PUBLIC_DAILY_URL` (or equivalent) in mobile env.

### 2.4 Acceptance Criteria for Phase 2

- [ ] Two devices can join the same room and see/hear each other.
- [ ] No simulated video UI remains in the call path.
- [ ] Missing Daily key returns a clear error, never a fake room.

---

## 3. Phase 3 — Van Coverage & Operator Offline

### 3.1 Van Coverage

**Current state**  
Backend still uses structured UK postcode-prefix matching (not PostGIS).

**Correct pattern**  
Either real PostGIS `ST_Contains` after geocoding, or a clearly documented interim GeoJSON lookup.

**Exact steps**
1. Decide: implement proper PostGIS now, or keep improved prefix matching as explicit interim.
2. If PostGIS:
   - Geocode postcode → lat/lng (use a geocoding service or free UK postcode API).
   - Store polygons as proper PostGIS geometry (or convert GeoJSON on the fly).
   - Query with `ST_Contains`.
3. If keeping prefix for now:
   - Document in code comment and architecture that this is interim.
   - Ensure the mobile screen already calls the real endpoint (it does).

### 3.2 Operator Offline Queue

**Current state**  
Offline capture is improved but local persistence is not yet durable.

**Exact steps**
1. Persist pending notes / completions in a local store (MMKV or SQLite).
2. On reconnect, flush the queue with idempotency keys.
3. Show sync status on the operator route screen.
4. Handle auth expiry during offline period gracefully.

### 3.3 Acceptance Criteria for Phase 3

- [ ] Coverage check returns accurate results for the seeded van polygons.
- [ ] Operator can capture notes offline and they sync when back online.
- [ ] Van booking re-uses the same hold + PaymentSheet path as clinic.

---

## 4. Phase 4 — Auth Completeness & Communications

### 4.1 Email / SMS Delivery

**Current state**  
Backend calls `communicationService` but no real provider is configured. Verification, reset and MFA codes never arrive.

**Exact steps**
1. Choose a provider (Resend, Postmark, or AWS SES recommended).
2. Add API key to backend `.env`.
3. Implement real send methods in `backend/src/lib/communication-service.ts` (or equivalent).
4. Wire:
   - Email verification
   - Password reset
   - MFA code (email or SMS fallback)
5. Mobile screens already exist — just ensure they call the correct endpoints and surface errors.

### 4.2 Role Guards

**Exact steps**
1. Open each portal layout:
   - `pavdental/src/app/(patient)/_layout.tsx`
   - `pavdental/src/app/(clinician)/_layout.tsx`
   - `pavdental/src/app/(operator)/_layout.tsx`
2. Add a guard that redirects any wrong role to the correct portal (or access-denied).
3. Test cold-start for patient, clinician and operator accounts.

### 4.3 Acceptance Criteria for Phase 4

- [ ] User receives real verification / reset emails.
- [ ] MFA code can be completed.
- [ ] Wrong-role users cannot reach patient clinical screens.

---

## 5. Phase 5 — Notifications, Safety & Housekeeping

### 5.1 Push Notifications
1. Request permission on mobile.
2. Obtain Expo push token and register with `POST /api/notifications/register-token`.
3. Backend already has scheduling hooks — wire the 48 h / 24 h / 2 h reminder ladder to the job queue.
4. Deep links must require authentication.

### 5.2 App Lock / Biometric
- Enforce biometric / passcode re-entry before showing clinical data after the app has been backgrounded.
- The existing `app-lock` feature folder should be made mandatory on clinical screens.

### 5.3 Secrets & Configuration
1. Rotate every secret that has ever been in git history (JWT, Stripe, Daily, DB password, audit HMAC).
2. Ensure `backend/.env` is never committed.
3. Expand both `.env.example` files so a new developer can start without guessing.

### 5.4 Documentation
- Update `architecture.md` — it still claims the mobile app is missing.
- Keep this `plan2.md` as the living next-step source of truth until Phase 5 is complete.

---

## 6. Recommended Execution Order (This Week)

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Phase 1.1 + 1.2 + 1.3 | Refresh returns user, confirmed screen waits for webhook, hold expiry works |
| 1–2 | Phase 1.4 + full device test | Mock data gone, end-to-end clinic booking green |
| 2–4 | Phase 2 | Real Daily video call between two devices |
| 4–5 | Phase 3 + 4 (partial) | Better van coverage decision + email provider wired |
| Ongoing | Phase 5 | Notifications, app-lock, secrets rotation, docs |

---

## 7. File Hotspots for Phase 1 (Start Here)

| Task | Files |
|------|-------|
| Refresh user shape | `backend/src/routes/auth.ts` |
| Confirmed screen polling | `pavdental/src/app/(patient)/booking/confirmed.tsx` |
| Hold expiry | `pavdental/src/app/(patient)/booking/summary.tsx` |
| Mock cleanup | `pavdental/src/features/booking/booking-mock-data.ts` + all importers |
| Booking API | `pavdental/src/features/booking/booking-api.ts` |
| Auth client | `pavdental/src/features/auth/auth-api.ts`, `auth-store.ts` |

---

## 8. Definition of “Next Milestone Complete”

When all of the following are true, the app has a solid, demo-able core:

- [ ] Patient can register, verify (or skip in dev), login, and stay logged in across restarts.
- [ ] Full clinic booking path works with real Stripe test cards and ends with a confirmed appointment.
- [ ] “My Appointments” shows the confirmed booking.
- [ ] No mock clinical or catalogue data appears in the main flows.
- [ ] Video call uses real Daily rooms (even if only between two test devices).
- [ ] Van coverage check calls the real endpoint and returns sensible results for seeded data.
- [ ] Architecture and env documentation match the actual code.

---

## 9. Out of Scope for This Plan (Later)

- Full DSPT evidence pack and independent audit
- Production deployment / IaC
- Advanced offline conflict resolution for multi-operator fleets
- E-prescribing partner integration
- Admin web dashboard
- Full WCAG 2.2 AA remediation pass

These remain important but should not block the core patient journeys above.

---

**Start with Phase 1 today.**  
Once the clinic booking path is solid and the confirmed screen waits for the webhook, the rest of the product becomes dramatically easier to finish.