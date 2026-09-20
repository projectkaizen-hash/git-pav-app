# Pav Dental — Uber-style Mobile Van Service Plan

> **Goal:** Replace postcode-prefix simulation with GPS-first coverage, add a clear “Change location” path when outside service areas, and implement real dispatch that assigns visits based on active vans, schedules, proximity, travel time, and traffic (Uber-like matching).  
> **Baseline:** Backend has van routes (fleet, stops, check-in, complete), `Van` + `VanServicePolygon` models (GeoJSON), PostGIS available. Coverage-check is declared in schemas/architecture but not fully implemented. Mobile still uses postcode simulation.  
> **Date:** 2026-09-21

---

## 1. Product Vision & Core Flows

### Patient (happy path)
1. Open van booking → request location permission.
2. Capture GPS → reverse-geocode if needed → `POST /api/van/coverage-check` with `lat/lng` (preferred) or postcode.
3. **Covered** → show available vans / slots + estimated windows.
4. **Not covered** → clear message + **Change location** (map picker / address search / postcode fallback).
5. Select service → access details (parking, gate code, etc.) → pick slot → hold → Stripe PaymentSheet → confirmed.
6. On booking day (with consent) → live van tracking + ETA.

### Operator / driver
- Ordered stops for the day.
- Real-time location reporting while on shift.
- Check-in / complete with clinical notes.
- Offline-capable mutation queue with later sync.

### Dispatch (backend)
- Evaluate active vans against open requests.
- Rank by proximity + traffic-aware travel time + schedule fit + capacity.
- Assign best van (or present ranked options).

---

## 2. Current State vs Target

| Area | Current | Target |
|------|---------|--------|
| Availability | Mobile postcode-prefix simulation; schema expects postcode only | GPS-first (`lat/lng`) + PostGIS point-in-polygon; postcode fallback |
| Location UX | Manual postcode | Auto GPS + “Change location” map/address picker |
| Dispatch | Static stops list; no matching | Proximity + travel-time + traffic scoring; schedule-aware assignment |
| Van location | None | Live GPS from operator app → Redis / PostGIS |
| Tracking | Mock | Real map + ETA on booking day (consent-gated) |
| Data model | `Van` + `VanServicePolygon` (GeoJSON) | Live location, schedule windows, capacity, assignment records |

---

## 3. Architecture Changes

### Backend
- Real `POST /api/van/coverage-check` (public or lightly authenticated).
  - Accept `{ lat, lng }` **or** `{ postcode }`.
  - Prefer PostGIS spatial query (convert/store polygons as geometry).
  - Return: `{ covered, vans, nearestDistanceKm?, suggestedPostcode?, message }`.
- `POST /api/van/location` (operator) — periodic GPS pings.
- Dispatch candidates endpoint or internal service — ranked vans for a request location + time window.
- `GET /api/van/tracking/:appointmentId` (patient, day-of, consent-gated).
- Optional background/on-booking job that runs matching and writes `Appointment.vanId`.

### Mobile (Expo)
- Location permission + `expo-location`.
- Service-area screen: auto-check on mount; map fallback for “Change location”.
- Re-use existing booking hold + Stripe PaymentSheet for van slots.
- Operator: location reporting, stop list, check-in/complete.
- Patient tracking screen (map + ETA).

### Data / infra
- Keep PostGIS (already in `docker-compose.yml`).
- Redis for live van locations (GEO sets or hashes + TTL), slot holds, rate limits.
- Traffic/ETA provider: Google Maps Distance Matrix / Directions, Mapbox, or OpenRouteService (with straight-line + average-speed fallback).

---

## 4. Phased Implementation Plan

### Phase 0 — Foundations (1–2 days)
- Rotate any committed secrets; ensure `.env` is gitignored.
- Confirm PostGIS extension and that polygons are queryable.
- Geometry strategy:
  - **Preferred:** migrate `polygonGeoJson` → `geometry(Polygon, 4326)` + spatial index.
  - **Interim:** keep GeoJSON and do point-in-polygon in app code (e.g. Turf) while planning migration.
- Shared types for coverage request/response and dispatch candidates.
- Expand `vanCoverageCheckSchema` to accept either `lat/lng` **or** `postcode`.

**Acceptance:** Healthy Postgres/PostGIS + Redis; types and schema ready.

---

### Phase 1 — GPS-first coverage + Change location UX (2–3 days)

**Backend**
```ts
// POST /api/van/coverage-check
// Body: { lat?: number, lng?: number, postcode?: string }
```
- Validate one of the two input styles.
- If postcode only → geocode (Nominatim / Google / internal UK postcode service).
- Spatial check against active `VanServicePolygon`s (or polygons of active vans).
- Return covered status + covering vans (id, name, approximate distance if available).

**Mobile**
1. Request foreground location permission.
2. Get current position (`Accuracy.Balanced` or `High`).
3. Call coverage-check with `lat/lng`.
4. Success → proceed to service/slot selection.
5. Outside area / GPS denied → show map + “Change location” (search or long-press) + optional postcode field.
- Persist last successful location (with consent) for faster re-checks.
- Always offer postcode fallback and label it clearly.

**Acceptance**
- Known covered coordinate → `covered: true` + vans.
- Outside → clear message + change-location UI.
- Postcode fallback still works.

---

### Phase 2 — Live van location + proximity ranking (2–3 days)

**Data model** (Prisma migration as needed)
- Live location (Redis primary; optional durable `VanLocation` rows for audit):
  - `vanId`, `lat`, `lng`, `heading?`, `speed?`, `recordedAt`, `source`.
- Optional: `VanSchedule` (recurring windows or daily capacity).

**Operator app**
- Foreground/background location updates while “on shift”.
- `POST /api/van/location` every 15–30 s (or on significant movement).
- Store latest position in Redis (`GEOADD`) + optional durable row.

**Dispatch scoring (v1 — proximity)**
- Filter active vans that cover the point (reuse coverage logic).
- Filter vans with free capacity in the desired window.
- Rank by distance from current van location (Haversine / PostGIS).
- Return top N with simple ETA (distance / average urban speed).

**Acceptance:** Operator location updates appear; candidates ranked by proximity for a test request.

---

### Phase 3 — Traffic-aware ETA + full matching (3–5 days)

**ETA provider**
- Abstract `getTravelTime(origin, destination, departureTime)`.
- Primary: Google Distance Matrix / Directions or Mapbox Matrix (traffic-aware).
- Fallback: straight-line + configurable average speed + time-of-day factors.
- Aggressive Redis caching with short TTL.

**Matching algorithm**
1. Candidate set = active vans whose polygons cover the request **and** have open schedule slots.
2. For each candidate compute:
   - Distance / travel time from current (or planned) position.
   - Impact on existing stops (insertion cost — later multi-stop optimisation).
   - Soft constraints (equipment, clinician preference, priority).
3. Score = weighted sum (travel time dominant, then proximity, then schedule tightness).
4. Assign best van **or** present ranked list.
5. Write `Appointment.vanId` + assignment audit record.

**Later (Phase 3.5+)**
- Multi-stop route optimisation (OR-Tools / Google OR / nearest-neighbour + 2-opt).
- Dynamic re-assignment if a van falls behind.
- Capacity and buffer times between stops.

**Acceptance:** Booking assigns a van using traffic-aware (or fallback) travel time + schedule fit.

---

### Phase 4 — Patient tracking + operator polish (2–3 days)
- On appointment day only, after explicit consent: patient tracking screen.
- Backend polls/streams latest van location + ETA.
- Map (react-native-maps / Mapbox / Google) shows van + patient + route.
- Push notifications: “van is X minutes away”, “arrived”, etc. (reuse existing notification system).
- Operator: ordered stop list, one-tap check-in/complete, offline mutation queue (local DB + retry + idempotency keys).

**Acceptance:** Day-of tracking works end-to-end; operator can complete a stop offline and sync later.

---

### Phase 5 — Hardening, compliance, observability (ongoing)
- Location data minimisation and retention (NHS DSPT / GDPR aligned).
- Consent flags for live tracking.
- Rate-limit location updates and coverage checks.
- Audit every assignment and location access.
- Feature flags for gradual GPS-path rollout.
- E2E tests: GPS mock → coverage → booking → assignment → tracking.
- Monitoring: van location freshness, matching latency, coverage false-negative rate.
- No mock data on production paths for these flows.

---

## 5. Effort Summary

| Phase | Focus | Est. effort | Depends on |
|-------|--------|-------------|------------|
| 0 | Foundations + geometry decision | 1–2 d | — |
| 1 | GPS coverage + Change location UX | 2–3 d | Phase 0 |
| 2 | Live location + proximity ranking | 2–3 d | Phase 1 |
| 3 | Traffic ETA + full matching | 3–5 d | Phase 2 + maps API keys |
| 4 | Tracking + operator polish | 2–3 d | Phase 3 |
| 5 | Hardening & compliance | Ongoing | All |

**MVP slice (Phases 0–2 + basic tracking):** ~8–12 developer-days.

---

## 6. Key Files to Touch

### Backend
- `backend/src/routes/van.ts` — coverage-check, location ingest, candidates/dispatch, tracking
- `backend/src/schemas/van.ts` — expand schemas
- `backend/prisma/schema.prisma` — geometry / location models if needed
- New: `lib/geo.ts`, `lib/dispatch.ts`, `lib/eta-provider.ts`
- Seed data with realistic service polygons for the target city

### Mobile
- `pavdental/src/app/(patient)/van/*` — coverage screen, change-location map, tracking
- Location permission + `expo-location`
- Operator screens under `/(operator)/`
- API client modules for new van endpoints
- Shared-types alignment

### Infra
- `docker-compose.yml` — PostGIS health
- Env vars for maps / ETA provider keys
- Redis GEO support for live positions

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GPS accuracy / indoor users | Always offer postcode + map picker; show accuracy circle |
| Battery drain (operator) | Adaptive interval, significant-change only, graceful background handling |
| Traffic API cost / limits | Aggressive caching + distance-based fallback |
| Privacy | Location only while on shift / on booking day; clear consent; short retention; audit access |
| Polygon quality | Start with a few well-drawn areas; add admin editing UI later |
| Missing mobile history claims | Treat current `pavdental/` as source of truth; iterate from there |

---

## 8. Definition of Done (MVP)

- [ ] Patient opens van flow → GPS auto-check works.
- [ ] Outside area → “Change location” lets them pick a valid point/postcode and proceed.
- [ ] Coverage uses real spatial logic (PostGIS or equivalent), not postcode prefixes.
- [ ] On booking, a van is assigned using proximity + schedule + (at least approximate) travel time.
- [ ] Operator can report location and manage stops.
- [ ] Patient can see basic live tracking on the day of the visit (consent-gated).
- [ ] No mock data on the production path for these flows.
- [ ] End-to-end testable on a physical device against the existing backend.

---

## 9. Suggested Next Actions

1. Confirm geometry strategy (native PostGIS vs interim GeoJSON + Turf).
2. Implement and test `POST /api/van/coverage-check` with both `lat/lng` and postcode.
3. Wire mobile GPS + change-location UI and remove postcode-prefix simulation.
4. Add operator location reporting and Redis-backed latest position.
5. Ship proximity ranking; then layer traffic ETA and full matching.

When Phases 0–2 are complete and the MVP checklist passes, the app will have a real GPS-first, dispatch-capable mobile van service that matches the Uber-like behaviour requested while staying consistent with the existing Pav Dental architecture, stack, and compliance posture.
