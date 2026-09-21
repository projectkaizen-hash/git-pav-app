# Pav Dental — Dental Van Feature: Full Implementation Guideline

> **Primary model: live operator-controlled dispatch** (shift toggle → patient request → operator accept → dynamic queue ETA).  
> Verified against repo `projectkaizen-hash/git-pav-app` (Express/Prisma backend + Expo `pavdental`).  
> Scheduled “pick a date/slot” is **not** the primary path; it may remain a secondary mode later.

---

## 1. Product vision (primary dispatch model)

The operator has **full control**. A shift toggle puts the van online. While on shift:

1. Patients in coverage see the van as **available** with a **live ETA**.
2. ETA is based on **van GPS**, **queue ahead**, **treatment time**, **buffer**, and **travel between stops**.
3. Patient **requests** the van; operator **accepts or declines**.
4. Accepted requests form an ordered **live queue**.
5. ETAs **recalculate frequently** as the van moves and stops complete.

This is closer to a **clinical mobile unit with Uber-style dispatch** than a clinic appointment book.

### Fixed clinical constants (v1 defaults — configurable later)

| Constant | Default | Notes |
|----------|---------|--------|
| Treatment block | **45 min** | Or `Service.durationMinutes` when known |
| Site buffer | **10 min** | Clean-down / pack / leave |
| GPS ping interval | **15–30 s** while on shift | Battery vs accuracy tradeoff |
| ETA refresh (server) | On GPS ping, accept, complete, cancel | Push or poll 10–15 s on patient app |
| Request timeout | **3–5 min** | Auto-expire if operator does not accept |
| Max queue depth | **e.g. 4–6** pending accepted stops | Prevent infinite backlog |
| Max ETA shown for new requests | **e.g. 3–4 hours** | Beyond that: “Queue full / try later” |

### ETA formula (canonical)

Positions: van \(V\), ordered accepted queue \(P_1 \ldots P_n\), new or existing patient at position \(k\).

- \(T(A \to B)\) = driving time (routing API or Haversine fallback).
- Remaining to current stop: if `en_route` → \(T(V \to P_{\text{current}})\); if `on_site` / `in_treatment` → remaining treatment clock (or full 45 if not started).

**Empty queue (patient would be first):**

```text
ETA = T(V → patient)
```

**Patient would be #2 while van is going to or treating #1:**

```text
ETA_2 = T_remaining(V → P1)   // 0 if already on site
       + treatment_remaining_or_45
       + 10_min_buffer
       + T(P1 → P2)
```

**Patient #3 while still on #1:**

```text
ETA_3 = time_to_finish_P1
      + (45 + 10 + T(P1 → P2))
      + T(P2 → P3)
```

General: sum remaining work for all stops before \(k\), then travel into \(P_k\).

Recompute on every GPS update and every queue change.

---

## 2. Current codebase baseline (what exists today)

### Data
- `Van`, `VanServicePolygon` (GeoJSON Json)
- `Appointment.channel = "van"` + optional `vanId`
- `UserRole.operator` — no shift session, no live queue, no GPS table
- Seed: van `PV24 DEN`, London polygons, `van@pavdental.com`

### APIs today
| Path | Notes |
|------|--------|
| `POST /api/public/van/coverage-check` | Public coverage |
| `GET /api/van/fleet`, `/stops`, check-in, complete | Static stop list; not shift/queue based |
| `GET /api/booking/slots` | Clinic-style; **not** primary for van dispatch |

### Mobile today
- Patient van stack: coverage → access → mock slots → confirm → mock live-track
- Operator: route → check-in → notes — **no shift toggle, no accept-request UI**

**Gap:** almost everything in §3–§11 is net-new relative to “live dispatch,” while check-in/complete and coverage can be reused.

---

## 3. Target architecture

```text
OPERATOR                              PATIENT                           SYSTEM
────────                              ───────                           ──────
Shift ON + GPS pings                  Coverage OK?                      Match van in sector
Incoming request queue                See “Available · ETA ~X min”      Compute ETA chain
Accept / decline                      Request van + address             Hold request TTL
Navigate → arrive → treat → complete  Live track + updating ETA         Recalc on GPS/events
Shift OFF (drain or freeze queue)     Pay / consent as product requires Notify both sides
```

### Roles
| Role | Control |
|------|---------|
| **Operator** | Shift on/off, accept/decline, reorder (optional), check-in/complete, GPS source |
| **Patient** | Request only when van online; cancel own pending request; track after accept |
| **Admin** | Fleet, polygons, assign operator↔van, max queue, kill switch, audit |

### Product rules (primary model)
1. No live requests unless **shift is ON** and van is **active** and patient is **in coverage**.
2. Operator **must accept** before a stop is committed (no silent auto-assign in v1).
3. One van per request; queue is **FIFO** unless operator explicitly reorders.
4. Payment/deposit: either **after accept** (recommended) or **at request** with auto-refund on decline/timeout — pick one policy and stick to it.
5. Clinical safety: operator can **pause new requests** without ending shift (e.g. “busy treating”).
6. GPS privacy: location only while on shift; retain short TTL for ops; audit access.

---

## 4. Data model

### 4.1 Core new models

```prisma
enum VanShiftStatus {
  offline
  online
  paused      // shift on but not accepting new requests
}

enum VanRequestStatus {
  pending       // waiting for operator accept
  accepted      // in live queue
  declined
  expired       // timeout
  cancelled     // by patient or system
  in_progress   // current stop (en_route / on_site / treating)
  completed
  no_show
}

enum VanStopPhase {
  queued
  en_route
  on_site
  in_treatment
  completed
  cancelled
}

model OperatorProfile {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  fullName  String   @map("full_name") @db.VarChar(100)
  phone     String?  @db.VarChar(20)
  photoUrl  String?  @map("photo_url") @db.VarChar(500)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user         User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignments  VanOperatorAssignment[]
  shifts       VanShift[]

  @@map("operator_profiles")
}

model VanOperatorAssignment {
  id         String    @id @default(uuid()) @db.Uuid
  operatorId String    @map("operator_id") @db.Uuid
  vanId      String    @map("van_id") @db.Uuid
  startsAt   DateTime  @map("starts_at")
  endsAt     DateTime? @map("ends_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  operator OperatorProfile @relation(fields: [operatorId], references: [id], onDelete: Cascade)
  van      Van             @relation(fields: [vanId], references: [id], onDelete: Cascade)

  @@index([operatorId, startsAt])
  @@index([vanId, startsAt])
  @@map("van_operator_assignments")
}

/// One row per “shift on” session
model VanShift {
  id           String         @id @default(uuid()) @db.Uuid
  vanId        String         @map("van_id") @db.Uuid
  operatorId   String         @map("operator_id") @db.Uuid
  status       VanShiftStatus @default(online)
  startedAt    DateTime       @map("started_at") @default(now())
  endedAt      DateTime?      @map("ended_at")
  /// Last known position while on shift
  lastLat      Float?         @map("last_lat")
  lastLng      Float?         @map("last_lng")
  lastLocationAt DateTime?    @map("last_location_at")
  createdAt    DateTime       @default(now()) @map("created_at")

  van       Van             @relation(fields: [vanId], references: [id])
  operator  OperatorProfile @relation(fields: [operatorId], references: [id])
  requests  VanServiceRequest[]
  locations VanLocationPing[]

  @@index([vanId, status])
  @@index([operatorId, status])
  @@map("van_shifts")
}

model VanLocationPing {
  id        String   @id @default(uuid()) @db.Uuid
  shiftId   String   @map("shift_id") @db.Uuid
  lat       Float
  lng       Float
  accuracyM Float?   @map("accuracy_m")
  recordedAt DateTime @default(now()) @map("recorded_at")

  shift VanShift @relation(fields: [shiftId], references: [id], onDelete: Cascade)

  @@index([shiftId, recordedAt])
  @@map("van_location_pings")
}

/// Patient request + queue item (can link to Appointment after accept/pay)
model VanServiceRequest {
  id              String           @id @default(uuid()) @db.Uuid
  shiftId         String           @map("shift_id") @db.Uuid
  vanId           String           @map("van_id") @db.Uuid
  patientId       String           @map("patient_id") @db.Uuid
  serviceId       String           @map("service_id")
  status          VanRequestStatus @default(pending)
  phase           VanStopPhase     @default(queued)
  queuePosition   Int?             @map("queue_position")
  /// Patient location for routing
  patientLat      Float            @map("patient_lat")
  patientLng      Float            @map("patient_lng")
  accessDetails   Json             @map("access_details")
  requestedAt     DateTime         @default(now()) @map("requested_at")
  expiresAt       DateTime         @map("expires_at")
  acceptedAt      DateTime?        @map("accepted_at")
  treatmentStartedAt DateTime?     @map("treatment_started_at")
  completedAt     DateTime?        @map("completed_at")
  etaSecondsSnapshot Int?          @map("eta_seconds_snapshot")
  appointmentId   String?          @unique @map("appointment_id") @db.Uuid
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  shift       VanShift       @relation(fields: [shiftId], references: [id])
  van         Van            @relation(fields: [vanId], references: [id])
  patient     PatientProfile @relation(fields: [patientId], references: [id])
  service     Service        @relation(fields: [serviceId], references: [id])
  appointment Appointment?   @relation(fields: [appointmentId], references: [id])

  @@index([shiftId, status])
  @@index([vanId, status])
  @@index([patientId, status])
  @@map("van_service_requests")
}
```

Wire relations on `User`, `Van`, `PatientProfile`, `Service`, `Appointment` as needed.

### 4.2 Access details shape

```ts
export type VanAccessDetails = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  parkingType: "private_driveway" | "permit_bay" | "visitor" | "other";
  gateCode?: string;
  accessNotes?: string;
  clinicalNotes?: string;
  completedAt?: string;
};
```

### 4.3 Appointment linkage

After **accept** (and payment policy):

- Create or confirm `Appointment` with `channel: "van"`, `vanId`, times estimated from ETA + duration.
- Keep `VanServiceRequest.appointmentId` as source of truth for the live stop.
- Reuse existing check-in/complete **or** drive status only from `VanServiceRequest.phase` (prefer one source of truth — recommend **request/phase** for live mode, sync appointment status).

---

## 5. API surface (primary)

### Operator

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/van/shift/start` | Shift ON (van + operator assignment required) |
| POST | `/api/van/shift/pause` | Online but not accepting |
| POST | `/api/van/shift/resume` | Accepting again |
| POST | `/api/van/shift/end` | Shift OFF |
| POST | `/api/van/shift/location` | GPS ping `{ lat, lng, accuracyM? }` |
| GET | `/api/van/shift/current` | Status, queue, last location |
| GET | `/api/van/requests/incoming` | Pending requests for this shift |
| POST | `/api/van/requests/:id/accept` | Accept → queue |
| POST | `/api/van/requests/:id/decline` | Decline |
| POST | `/api/van/requests/:id/phase` | `en_route` \| `on_site` \| `in_treatment` \| `completed` |
| GET | `/api/van/queue` | Ordered accepted + in-progress stops |

### Patient

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/public/van/coverage-check` | Still required first |
| GET | `/api/van/availability` | Auth: online vans in coverage + ETA preview for coords |
| POST | `/api/van/requests` | Create request (address, service, lat/lng) |
| POST | `/api/van/requests/:id/cancel` | Cancel pending/accepted (rules apply) |
| GET | `/api/van/requests/:id` | Status + live ETA |
| GET | `/api/van/requests/mine/active` | Current open request |

### Public / shared

- Coverage schema must allow postcode **or** lat/lng; return `assignedVanId` when relevant.
- Availability may return multiple online vans; v1: pick nearest online van in covering polygon.

### Critical: shift start

```ts
// POST /api/van/shift/start
// requireRole("operator")
const van = await getAssignedVanForOperator(userId);
if (!van) return res.status(403).json({ error: "No van assigned" });

const existing = await prisma.vanShift.findFirst({
  where: { operatorId, status: { in: ["online", "paused"] }, endedAt: null },
});
if (existing) return res.status(409).json({ error: "Shift already active", shiftId: existing.id });

const shift = await prisma.vanShift.create({
  data: {
    vanId: van.id,
    operatorId,
    status: "online",
    lastLat: body.lat,
    lastLng: body.lng,
    lastLocationAt: new Date(),
  },
});
return res.status(201).json(shift);
```

### Critical: location ping + ETA invalidate

```ts
// POST /api/van/shift/location
await prisma.vanLocationPing.create({ data: { shiftId, lat, lng, accuracyM } });
await prisma.vanShift.update({
  where: { id: shiftId },
  data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
});
// Optionally publish to Redis pub/sub: eta:shift:{shiftId} for websocket fans
```

### Critical: availability + ETA preview

```ts
// GET /api/van/availability?lat=&lng=
// 1. Find active shifts online (not paused) whose van polygon covers point
// 2. For each, build queue chain ETA for a hypothetical new stop at lat/lng
// 3. Filter out if queue full or ETA > max
// 4. Return best: { vanId, shiftId, etaSeconds, queueLength, message }
```

### Critical: accept

```ts
// POST /api/van/requests/:id/accept
// - status pending → accepted
// - assign queuePosition = max(existing)+1
// - optional: create Appointment draft / require payment deep link
// - notify patient
```

---

## 6. ETA service (implementation plan)

```ts
// backend/src/lib/van-eta.ts

type QueueStop = {
  lat: number;
  lng: number;
  phase: VanStopPhase;
  treatmentStartedAt: Date | null;
  treatmentMinutes: number; // 45 or service duration
  bufferMinutes: number;    // 10
};

async function travelSeconds(from: Point, to: Point): Promise<number> {
  // Production: Mapbox / Google Distance Matrix / OSRM
  // Fallback: Haversine * average urban speed (e.g. 20 km/h London)
}

function remainingTreatmentSeconds(stop: QueueStop, now = new Date()): number {
  if (stop.phase === "queued" || stop.phase === "en_route" || stop.phase === "on_site") {
    return stop.treatmentMinutes * 60;
  }
  if (stop.phase === "in_treatment" && stop.treatmentStartedAt) {
    const elapsed = (now.getTime() - stop.treatmentStartedAt.getTime()) / 1000;
    return Math.max(0, stop.treatmentMinutes * 60 - elapsed);
  }
  return 0;
}

export async function etaSecondsToNewPatient(
  van: Point,
  queue: QueueStop[], // ordered accepted/in_progress only
  patient: Point,
): Promise<number> {
  let t = 0;
  let cursor = van;

  for (const stop of queue) {
    if (stop.phase === "en_route" || stop.phase === "queued") {
      t += await travelSeconds(cursor, { lat: stop.lat, lng: stop.lng });
    }
    // if already on_site / in_treatment, skip travel into this stop
    t += remainingTreatmentSeconds(stop);
    t += stop.bufferMinutes * 60;
    cursor = { lat: stop.lat, lng: stop.lng };
  }

  t += await travelSeconds(cursor, patient);
  return Math.round(t);
}
```

**Real-life accuracy tips**
- Prefer routing with traffic when available.
- Cap update rate; smooth ETA (don’t jump ±10 min every second).
- Show bands to patients: “~25–35 min” not “27 min”.
- If GPS stale (>2 min), show “ETA approximate · van signal weak.”

---

## 7. Operator UI flow

```text
Login (operator)
  → Shift screen: [ Shift OFF | Shift ON ]
  → ON: start GPS foreground tracking + home dashboard
       • Incoming requests (accept / decline)
       • Live queue (position, address, ETA to each)
       • Current stop actions: En route → On site → Start treatment → Complete + notes
       • Pause accepting (treat without new requests)
  → OFF: stop GPS; pending requests expire or auto-decline; warn if queue non-empty
```

### Screens (map to Expo)

| Screen | Responsibility |
|--------|----------------|
| `shift` | Toggle + status badge + pause |
| `incoming` | Pending cards with patient area, service, preview ETA impact |
| `queue` / `route` | Ordered stops (replaces static today’s appointments list) |
| `check-in` | On-site checklist → phase `on_site` / `in_treatment` |
| `offline-capture` | Notes → phase `completed` |

Reuse checklist UX; bind buttons to **phase** APIs, not only legacy appointment status.

### Shift end with open queue (policy)

**Recommended v1:** block shift end if any `accepted` / `in_progress` remain, OR force “complete or cancel remaining” confirmation.  
**Alternative:** allow end → all pending auto-expired; accepted get “van went offline” + rebook/clinic CTA.

---

## 8. Patient UI flow

```text
Book van
  → Coverage (postcode / GPS)
  → If no online shift in area: “No van on duty — try clinic, video, or later”
  → If online: show ETA band + “Request van”
  → Access details (address, parking, gate)
  → Confirm request → status Pending (timeout countdown)
  → Accepted → payment (if policy) → Live track (map + ETA)
  → Arrived / in treatment → Complete summary
```

**Do not** show date/slot picker as the primary path for this mode.

Live track:
- Poll or websocket `GET /api/van/requests/:id`
- Map: van last point + home pin (Uber-like)
- Status copy from `phase`

---

## 9. Real-life scenarios and how to handle them

### 9.1 Happy path
Operator on shift → patient sees ETA 18 min → request → accept → patient pays → operator drives → on site → treat 45 → complete → next in queue auto-promoted → ETAs refresh.

### 9.2 Operator offline / shift off
- Availability empty.
- Message: clinic / video / “notify me when van is nearby” (optional waitlist).

### 9.3 Operator paused (treating, break, traffic hold)
- Shift still `paused`: no new requests; existing queue continues.
- Patient UI: “Van temporarily not accepting new visits.”

### 9.4 Request timeout (no accept)
- Status `expired`; notify patient; release any payment auth.
- Operator card disappears.

### 9.5 Operator declines
- Status `declined`; patient offered retry or other channels.
- Do not burn the patient’s trust: short reason optional (“Too far from current route”).

### 9.6 Patient cancels
| State | Rule |
|-------|------|
| Pending | Always allow |
| Accepted, not en_route | Allow with soft cancel window |
| En route / on site | Allow with warning; optional fee policy later |
| In treatment | Block cancel in app; contact support |

### 9.7 Queue stacking (your #1 → #2 → #3 case)
While van is at P1, P2 and P3 already accepted:
- ETA for P3 includes remaining on P1 + full block for P2 + travel P2→P3.
- GPS movement toward P1 reduces only the “travel to P1” component.
- When P1 completes, queue positions renumber; phases update.

### 9.8 Long treatment overrun
- Treatment timer exceeded → ETA for everyone behind grows (use actual `treatmentStartedAt` + elapsed, not stuck 45).
- Optional: operator “add +15 min” button for honesty.

### 9.9 GPS loss / tunnel / phone dies
- Last known point + stale flag.
- Operator can set phase manually (`en_route` / `on_site`) so queue still advances.
- Patient: “Location updating slowly.”

### 9.10 Two patients request at once
- Both pending; operator accepts one first → second’s ETA preview jumps when recomputed.
- Prefer showing **impact**: “If accepted, you would be #2 · ~70 min.”

### 9.11 Patient outside coverage but near van
- v1: **strict polygon** wins (compliance / service area).
- Optional later: operator override “accept out of area.”

### 9.12 Van assigned to operator A, B tries shift
- Only assigned operator can start shift on that van.
- One active shift per van; one active shift per operator.

### 9.13 End of day / shift end with people waiting
- Pending: expire.
- Accepted not started: notify + cancel or transfer policy.
- In progress: must complete.

### 9.14 Emergency / red-flag symptoms
- Reuse triage rules: block inappropriate mobile procedures; steer to emergency services / video / clinic.

### 9.15 No-show
- Operator marks `no_show` after wait threshold (e.g. 15 min on site).
- Buffer still applies before next travel; optional patient strike policy later.

### 9.16 Payment failure after accept
- Drop from queue or hold at position until paid within N minutes.
- **Recommended:** authorize/pay **before** accept is confirmed to patient as “booked,” or accept → pay within 5 min or auto-cancel.

### 9.17 Multiple vans online in same polygon
- Availability returns nearest by ETA (not just crow-flies).
- Patient requests one van; no multi-van auction in v1.

### 9.18 Operator reordering queue
- v1: FIFO only (simpler, fairer).
- v2: drag reorder with patient ETA notifications (“Your visit was updated”).

### 9.19 App killed / background GPS (mobile OS)
- iOS/Android background location permissions; explain “used only during shift.”
- Fallback: coarser pings; phase buttons remain authoritative.

### 9.20 Network offline on van
- Queue and phases should queue locally and sync (operator is in the field).
- Patient ETA may freeze until sync — show last known.

---

## 10. Payment recommendation (real-life)

**Preferred v1 policy:**

1. Patient submits request (no charge).  
2. Operator accepts → patient has **5–10 min** to pay deposit.  
3. Unpaid → auto-cancel, next in line moves up.  

**Alternative:** pay at request, full refund on decline/timeout/operator cancel.

Stripe PaymentIntent + existing webhook patterns can attach to `VanServiceRequest` / `Appointment`.

---

## 11. Notifications

| Event | Patient | Operator |
|-------|---------|----------|
| Request created | — | Push: new request |
| Accepted | Push + ETA | — |
| Declined / expired | Push | — |
| En route | Push | — |
| Nearby (e.g. ETA < 10 min) | Push | — |
| Complete | Summary | — |
| Shift ended / cancelled stop | Push | — |

---

## 12. Security, privacy, compliance

- Location: only during active shift; purge or aggregate pings per retention policy (e.g. 30–90 days).
- Operator only sees patients for **accepted/pending on their shift**.
- Patient only sees **their** request + coarse van location when accepted (not other patients’ addresses).
- Audit log: shift start/end, accept/decline, phase changes, GPS access if admin views tracks.
- Clinical notes: same encryption/retention standards as clinic channel.
- GDC/CQC: mobile treatment still needs appropriate environment; app cannot replace clinical judgment — operator can decline unsuitable requests.

---

## 13. Coverage detection (still required)

Keep and harden existing public coverage:

- Schema: postcode **or** lat/lng.
- Response includes whether **any online shift** exists in that area (or split: geographic coverage vs live availability).
- Frontend must call `/api/public/van/coverage-check`, not the auth-only path.

```ts
// availability is separate from pure geography
// coverage = “we serve this area”
// availability = “a van is on shift here now + ETA”
```

---

## 14. Migration from current app

| Existing | Action |
|----------|--------|
| Fixed / mock van slots | Remove as primary; optional “schedule for later” phase 2 |
| `GET /api/van/stops` | Replace with queue for active shift |
| Check-in / complete | Keep UX; drive `VanStopPhase` + appointment sync |
| Live-track mock | Wire to request + GPS + ETA |
| Operator layout | Add shift toggle as home gate |
| Booking store | Store `requestId`, not only slotId |

### Implementation order
1. Models + migrations (shift, request, location ping, operator profile).  
2. Shift start/end/pause + location ping.  
3. ETA service (Haversine first, routing API next).  
4. Availability + create request + timeout job.  
5. Accept/decline + queue.  
6. Phase transitions + patient live track.  
7. Payment attachment.  
8. Hardening: queue limits, stale GPS, shift-end rules, offline operator sync.

---

## 15. Secondary mode (optional later)

**Scheduled van visits** (calendar / AM-PM sector days) can coexist:

- When shift off, show “Book a planned visit” if you still offer advance booking.
- When shift on, primary CTA is **Request van now**.

Do not confuse the two UIs on the same screen without clear tabs.

---

## 16. Code snippets (critical paths)

### Operator shift toggle (client)

```tsx
// conceptual
const { data: shift } = useQuery(["van-shift"]);
const start = useMutation(() => authFetch("/api/van/shift/start", { method: "POST", body: gpsJson }));
const end = useMutation(() => authFetch("/api/van/shift/end", { method: "POST" }));

// UI
<Switch
  value={shift?.status === "online" || shift?.status === "paused"}
  onValueChange={(on) => (on ? start.mutate() : end.mutate())}
/>
```

### GPS loop while on shift

```ts
// while shift online/paused
Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 25 },
  (pos) => {
    authFetch("/api/van/shift/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
      }),
    });
  }
);
```

### Patient availability

```ts
export async function fetchVanAvailability(lat: number, lng: number) {
  const res = await authFetch(`/api/van/availability?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Availability failed");
  return res.json() as Promise<{
    available: boolean;
    etaSeconds: number | null;
    etaLabel: string | null; // "25–35 min"
    queueLength: number;
    vanId: string | null;
    shiftId: string | null;
    message: string;
  }>;
}
```

---

## 17. Success metrics

- Accept rate and time-to-accept  
- Cancel/expire rate  
- Median ETA error (predicted vs actual arrival)  
- Stops completed per shift  
- Patient rating after mobile visit  
- GPS stale rate / shift minutes with weak signal  

---

## 18. Summary

| Topic | Decision |
|-------|----------|
| **Primary model** | Operator shift toggle + live request/accept queue + dynamic multi-stop ETA |
| **Not primary** | Fixed `VAN_WINDOWS` / pure calendar slot picking |
| **ETA** | Chain: remaining current work + 45 (+ service) + 10 buffer + travel hops; live GPS |
| **Control** | Operator accepts every stop; can pause or end shift |
| **Patient** | Sees availability + ETA only when shift on; request → wait → track |
| **Real life** | Timeouts, overruns, no-shows, GPS loss, payment, multi-request races, shift-end drain all specified above |

This document is the single reference for implementing **live dental van dispatch** on Pav Dental.
