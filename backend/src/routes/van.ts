import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import {
  shiftStartSchema,
  locationPingSchema,
  phaseUpdateSchema,
  vanRequestIdParamsSchema,
  createVanRequestSchema,
  availabilityQuerySchema,
} from "../schemas/van-dispatch";
import { vanCoverageCheckSchema, vanStopIdParamsSchema, completeVanStopSchema } from "../schemas/van";
import {
  etaSecondsToNewPatient,
  formatEtaLabel,
  QueueStop,
  Point,
  MAX_QUEUE_DEPTH,
  REQUEST_TIMEOUT_MS,
  MAX_ETA_SECONDS,
} from "../lib/van-eta";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: Function) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    return next();
  };
}

/** Ensure operator profile exists for an operator user */
async function getOrCreateOperatorProfile(userId: string) {
  let profile = await prisma.operatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "operator") return null;
    profile = await prisma.operatorProfile.create({
      data: {
        userId,
        fullName: "Pav Dental Van Operator",
        phone: user.phone || "+447700900003",
      },
    });
  }
  return profile;
}

/** Get operator's active van assignment (auto-assigns first active fleet van if none assigned) */
async function getAssignedVan(operatorId: string) {
  const now = new Date();
  let assignment = await prisma.vanOperatorAssignment.findFirst({
    where: {
      operatorId,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { van: { include: { servicePolygons: true } } },
    orderBy: { startsAt: "desc" },
  });

  if (!assignment) {
    const defaultVan = await prisma.van.findFirst({
      where: { isActive: true },
      include: { servicePolygons: true },
    });
    if (defaultVan) {
      assignment = await prisma.vanOperatorAssignment.create({
        data: {
          operatorId,
          vanId: defaultVan.id,
          startsAt: new Date(Date.now() - 24 * 3600 * 1000),
        },
        include: { van: { include: { servicePolygons: true } } },
      });
    }
  }

  return assignment?.van ?? null;
}

/** Get current active shift for operator */
async function getActiveShift(operatorId: string) {
  return prisma.vanShift.findFirst({
    where: { operatorId, status: { in: ["online", "paused"] }, endedAt: null },
  });
}

/** Build queue stops for ETA calculation */
async function buildQueueStops(shiftId: string): Promise<QueueStop[]> {
  const stops = await prisma.vanServiceRequest.findMany({
    where: {
      shiftId,
      status: { in: ["accepted", "in_progress"] },
    },
    include: { service: { select: { durationMinutes: true } } },
    orderBy: { queuePosition: "asc" },
  });

  return stops.map((s) => ({
    lat: s.patientLat,
    lng: s.patientLng,
    phase: s.phase,
    treatmentStartedAt: s.treatmentStartedAt,
    treatmentMinutes: s.service.durationMinutes || 45,
    bufferMinutes: 10,
  }));
}

/** Check if patient point is inside a GeoJSON polygon (ray casting) */
function pointInPolygon(point: Point, polygonGeoJson: any): boolean {
  try {
    const coords: [number, number][] =
      polygonGeoJson?.coordinates?.[0] ?? polygonGeoJson ?? [];
    let inside = false;
    const { lat: y, lng: x } = point;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [xi, yi] = coords[i];
      const [xj, yj] = coords[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  } catch {
    return false;
  }
}

// ─── LEGACY routes (kept intact) ──────────────────────────────────────────────

router.get("/fleet", requireAuth, async (_req: AuthRequest, res: Response) => {
  const vans = await prisma.van.findMany({
    where: { isActive: true },
    include: { servicePolygons: true },
  });
  return res.json(vans);
});

router.get("/stops", requireAuth, async (_req: AuthRequest, res: Response) => {
  const appointments = await prisma.appointment.findMany({
    where: { channel: "van" },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postcode: true,
          emergencyContactPhone: true,
        },
      },
      service: { select: { name: true, durationMinutes: true } },
      van: { select: { name: true, registrationPlate: true } },
    },
    orderBy: { startTimeUtc: "asc" },
  });

  const stops = appointments.map((a, idx) => {
    const access = (a.accessDetails as any) || {};
    const startTime = new Date(a.startTimeUtc);
    const endTime = new Date(a.endTimeUtc);
    const timeStr = `${startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    const fullAddress = [access.address || a.patient.addressLine1, a.patient.city || "London", a.patient.postcode]
      .filter(Boolean)
      .join(", ");
    return {
      id: a.id,
      stopNumber: idx + 1,
      time: timeStr,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      address: fullAddress,
      parkingType: access.parking || "Private Driveway / Kerbside Permit Bay",
      procedure: a.service.name,
      status: a.status === "in_progress" ? "next" : a.status === "confirmed" && idx === 0 ? "next" : a.status,
      vanName: a.van?.name || "Pav Dental Van #1",
    };
  });

  return res.json(stops);
});

router.post("/stops/:id/check-in", requireAuth, validateParams(vanStopIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const updated = await prisma.appointment.update({
    where: { id: String(req.params.id) },
    data: { status: "in_progress" },
  });
  return res.json({ success: true, status: updated.status, id: updated.id });
});

router.post("/stops/:id/complete", requireAuth, validateParams(vanStopIdParamsSchema), validateBody(completeVanStopSchema), async (req: AuthRequest, res: Response) => {
  const { notes } = req.body;
  const updated = await prisma.appointment.update({
    where: { id: String(req.params.id) },
    data: {
      status: "completed",
      accessDetails: { clinicalNotes: notes, completedAt: new Date().toISOString() },
    },
  });
  return res.json({ success: true, status: updated.status, id: updated.id });
});

// ─── OPERATOR — Shift Management ──────────────────────────────────────────────

// POST /api/van/shift/start
router.post("/shift/start", requireAuth, requireRole("operator"), validateBody(shiftStartSchema), async (req: AuthRequest, res: Response) => {
  const operatorId = req.user!.sub;

  // Ensure operator profile exists
  const opProfile = await getOrCreateOperatorProfile(operatorId);
  if (!opProfile) {
    return res.status(403).json({ error: "Operator profile not found. Contact admin." });
  }

  // Check no active shift exists
  const existing = await getActiveShift(opProfile.id);
  if (existing) {
    return res.status(409).json({ error: "Shift already active", shiftId: existing.id });
  }

  // Get assigned van
  const van = await getAssignedVan(opProfile.id);
  if (!van) {
    return res.status(403).json({ error: "No van assigned to this operator. Contact admin." });
  }

  // Check no other active shift on this van
  const vanActiveShift = await prisma.vanShift.findFirst({
    where: { vanId: van.id, status: { in: ["online", "paused"] }, endedAt: null },
  });
  if (vanActiveShift) {
    return res.status(409).json({ error: "Another operator already has an active shift on this van." });
  }

  const { lat, lng, accuracyM } = req.body;

  const shift = await prisma.vanShift.create({
    data: {
      vanId: van.id,
      operatorId: opProfile.id,
      status: "online",
      lastLat: lat ?? null,
      lastLng: lng ?? null,
      lastLocationAt: lat != null ? new Date() : null,
    },
  });

  if (lat != null && lng != null) {
    await prisma.vanLocationPing.create({
      data: { shiftId: shift.id, lat, lng, accuracyM: accuracyM ?? null },
    });
  }

  return res.status(201).json({ ...shift, van: { id: van.id, name: van.name, registrationPlate: van.registrationPlate } });
});

// POST /api/van/shift/pause
router.post("/shift/pause", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });
  if (shift.status === "paused") return res.json({ message: "Already paused", shift });

  const updated = await prisma.vanShift.update({ where: { id: shift.id }, data: { status: "paused" } });
  return res.json(updated);
});

// POST /api/van/shift/resume
router.post("/shift/resume", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const updated = await prisma.vanShift.update({ where: { id: shift.id }, data: { status: "online" } });
  return res.json(updated);
});

// POST /api/van/shift/end
router.post("/shift/end", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  // Block end if any accepted/in_progress stops remain
  const openStops = await prisma.vanServiceRequest.count({
    where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
  });
  if (openStops > 0) {
    return res.status(409).json({
      error: "Cannot end shift with open stops",
      message: `Complete or cancel all ${openStops} active stop(s) before ending your shift.`,
      openStops,
    });
  }

  // Expire any pending requests
  await prisma.vanServiceRequest.updateMany({
    where: { shiftId: shift.id, status: "pending" },
    data: { status: "expired" },
  });

  const updated = await prisma.vanShift.update({
    where: { id: shift.id },
    data: { status: "offline", endedAt: new Date() },
  });

  return res.json(updated);
});

// POST /api/van/shift/location — GPS ping
router.post("/shift/location", requireAuth, requireRole("operator"), validateBody(locationPingSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const { lat, lng, accuracyM } = req.body;

  await prisma.$transaction([
    prisma.vanLocationPing.create({
      data: { shiftId: shift.id, lat, lng, accuracyM: accuracyM ?? null },
    }),
    prisma.vanShift.update({
      where: { id: shift.id },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
    }),
  ]);

  return res.json({ ok: true });
});

// GET /api/van/shift/current — operator dashboard data
router.get("/shift/current", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.json({ shift: null });

  const [queue, incoming, van] = await Promise.all([
    prisma.vanServiceRequest.findMany({
      where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { queuePosition: "asc" },
    }),
    prisma.vanServiceRequest.findMany({
      where: { shiftId: shift.id, status: "pending" },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.van.findUnique({ where: { id: shift.vanId }, select: { name: true, registrationPlate: true } }),
  ]);

  return res.json({ shift, van, queue, incoming });
});

// ─── OPERATOR — Queue Management ──────────────────────────────────────────────

// GET /api/van/requests/incoming
router.get("/requests/incoming", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.json([]);

  const incoming = await prisma.vanServiceRequest.findMany({
    where: { shiftId: shift.id, status: "pending" },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, durationMinutes: true } },
    },
    orderBy: { requestedAt: "asc" },
  });

  return res.json(incoming);
});

// GET /api/van/queue
router.get("/queue", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.json([]);

  const queue = await prisma.vanServiceRequest.findMany({
    where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, durationMinutes: true } },
    },
    orderBy: { queuePosition: "asc" },
  });

  return res.json(queue);
});

// POST /api/van/requests/:id/accept
router.post("/requests/:id/accept", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });
  if (shift.status === "paused") return res.status(409).json({ error: "Shift is paused. Resume before accepting." });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.shiftId !== shift.id) return res.status(403).json({ error: "Request not on your shift" });
  if (request.status !== "pending") return res.status(409).json({ error: `Request is already ${request.status}` });

  // Check queue depth
  const queueCount = await prisma.vanServiceRequest.count({
    where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
  });
  if (queueCount >= MAX_QUEUE_DEPTH) {
    return res.status(409).json({ error: "Queue full", message: `Maximum ${MAX_QUEUE_DEPTH} stops allowed.` });
  }

  const nextPosition = queueCount + 1;

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: {
      status: "accepted",
      phase: "queued",
      queuePosition: nextPosition,
      acceptedAt: new Date(),
    },
  });

  return res.json(updated);
});

// POST /api/van/requests/:id/decline
router.post("/requests/:id/decline", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.shiftId !== shift.id) return res.status(403).json({ error: "Request not on your shift" });
  if (request.status !== "pending") return res.status(409).json({ error: `Request is already ${request.status}` });

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: { status: "declined" },
  });

  return res.json(updated);
});

// POST /api/van/requests/:id/phase
router.post("/requests/:id/phase", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), validateBody(phaseUpdateSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOrCreateOperatorProfile(req.user!.sub);
  if (!opProfile) return res.status(403).json({ error: "Operator profile not found" });

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.shiftId !== shift.id) return res.status(403).json({ error: "Request not on your shift" });
  if (!["accepted", "in_progress"].includes(request.status)) {
    return res.status(409).json({ error: `Cannot update phase for status: ${request.status}` });
  }

  const { phase, notes } = req.body;
  const now = new Date();

  const updateData: any = { phase, status: "in_progress" };
  if (phase === "in_treatment") updateData.treatmentStartedAt = now;
  if (phase === "completed" || phase === "no_show") {
    updateData.status = phase === "completed" ? "completed" : "no_show";
    updateData.completedAt = now;
    if (notes) updateData.notes = notes;
  }

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: updateData,
  });

  // Renumber queue after completion
  if (phase === "completed" || phase === "no_show") {
    const remaining = await prisma.vanServiceRequest.findMany({
      where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
      orderBy: { queuePosition: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.vanServiceRequest.update({
        where: { id: remaining[i].id },
        data: { queuePosition: i + 1 },
      });
    }
  }

  return res.json(updated);
});

// ─── PATIENT — Availability & Requests ────────────────────────────────────────

// GET /api/van/availability?lat=&lng=
router.get("/availability", requireAuth, async (req: AuthRequest, res: Response) => {
  const latNum = parseFloat(String(req.query.lat));
  const lngNum = parseFloat(String(req.query.lng));
  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ error: "Invalid lat or lng query parameter" });
  }
  const patientPoint: Point = { lat: latNum, lng: lngNum };

  // Find all online shifts with van polygons
  const activeShifts = await prisma.vanShift.findMany({
    where: { status: "online", endedAt: null },
    include: { van: { include: { servicePolygons: true } } },
  });

  if (activeShifts.length === 0) {
    return res.json({
      available: false,
      etaSeconds: null,
      etaLabel: null,
      queueLength: 0,
      vanId: null,
      shiftId: null,
      message: "No van on duty — try clinic, video, or check back later.",
    });
  }

  // Find shifts where the patient is inside a coverage polygon
  let best: { etaSeconds: number; shift: typeof activeShifts[0]; queueLength: number } | null = null;

  for (const shift of activeShifts) {
    const inCoverage = shift.van.servicePolygons.some((p) =>
      pointInPolygon(patientPoint, p.polygonGeoJson)
    );
    if (!inCoverage) continue;

    const queueStops = await buildQueueStops(shift.id);
    const queueCount = queueStops.filter(
      (s) => s.phase !== "completed" && s.phase !== "cancelled"
    ).length;

    if (queueCount >= MAX_QUEUE_DEPTH) continue;

    const vanPoint: Point = shift.lastLat != null && shift.lastLng != null
      ? { lat: shift.lastLat, lng: shift.lastLng }
      : { lat: 51.5074, lng: -0.1278 }; // London fallback

    const etaSeconds = await etaSecondsToNewPatient(vanPoint, queueStops, patientPoint);

    if (etaSeconds > MAX_ETA_SECONDS) continue;

    if (!best || etaSeconds < best.etaSeconds) {
      best = { etaSeconds, shift, queueLength: queueCount };
    }
  }

  if (!best) {
    return res.json({
      available: false,
      etaSeconds: null,
      etaLabel: null,
      queueLength: 0,
      vanId: null,
      shiftId: null,
      message: "Van is busy or queue is full in your area. Try again shortly.",
    });
  }

  return res.json({
    available: true,
    etaSeconds: best.etaSeconds,
    etaLabel: formatEtaLabel(best.etaSeconds),
    queueLength: best.queueLength,
    vanId: best.shift.vanId,
    shiftId: best.shift.id,
    message: `Van available · ${formatEtaLabel(best.etaSeconds)} estimated arrival`,
  });
});

// POST /api/van/requests — create request
router.post("/requests", requireAuth, validateBody(createVanRequestSchema), async (req: AuthRequest, res: Response) => {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
  });
  if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });

  // Check for an existing open request
  const existingRequest = await prisma.vanServiceRequest.findFirst({
    where: {
      patientId: patientProfile.id,
      status: { in: ["pending", "accepted", "in_progress"] },
    },
  });
  if (existingRequest) {
    return res.status(409).json({
      error: "You already have an active van request",
      requestId: existingRequest.id,
    });
  }

  const { serviceId, accessDetails } = req.body;
  const patientPoint: Point = { lat: accessDetails.lat, lng: accessDetails.lng };

  // Find best shift (same logic as availability)
  const activeShifts = await prisma.vanShift.findMany({
    where: { status: "online", endedAt: null },
    include: { van: { include: { servicePolygons: true } } },
  });

  let bestShift: typeof activeShifts[0] | null = null;
  let bestEta = Infinity;

  for (const shift of activeShifts) {
    const inCoverage = shift.van.servicePolygons.some((p) =>
      pointInPolygon(patientPoint, p.polygonGeoJson)
    );
    if (!inCoverage) continue;

    const queueStops = await buildQueueStops(shift.id);
    const queueCount = queueStops.length;
    if (queueCount >= MAX_QUEUE_DEPTH) continue;

    const vanPoint: Point = shift.lastLat != null && shift.lastLng != null
      ? { lat: shift.lastLat, lng: shift.lastLng }
      : { lat: 51.5074, lng: -0.1278 };

    const eta = await etaSecondsToNewPatient(vanPoint, queueStops, patientPoint);
    if (eta < bestEta && eta <= MAX_ETA_SECONDS) {
      bestEta = eta;
      bestShift = shift;
    }
  }

  if (!bestShift) {
    return res.status(409).json({
      error: "No van available in your area",
      message: "The van may be offline or queue is full. Try again shortly.",
    });
  }

  // Validate service exists
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: "Service not found" });

  const request = await prisma.vanServiceRequest.create({
    data: {
      shiftId: bestShift.id,
      vanId: bestShift.vanId,
      patientId: patientProfile.id,
      serviceId,
      patientLat: patientPoint.lat,
      patientLng: patientPoint.lng,
      accessDetails,
      expiresAt: new Date(Date.now() + REQUEST_TIMEOUT_MS),
      etaSecondsSnapshot: Math.round(bestEta),
    },
  });

  return res.status(201).json({
    ...request,
    etaLabel: formatEtaLabel(Math.round(bestEta)),
  });
});

// GET /api/van/requests/mine/active
router.get("/requests/mine/active", requireAuth, async (req: AuthRequest, res: Response) => {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
  });
  if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });

  const request = await prisma.vanServiceRequest.findFirst({
    where: {
      patientId: patientProfile.id,
      status: { in: ["pending", "accepted", "in_progress"] },
    },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      van: { select: { name: true, registrationPlate: true } },
      shift: { select: { lastLat: true, lastLng: true, lastLocationAt: true, status: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  if (!request) return res.json(null);

  // Compute live ETA
  let etaSeconds: number | null = null;
  let etaLabel: string | null = null;
  if (request.shift && request.shift.lastLat != null && request.shift.lastLng != null) {
    const vanPoint: Point = { lat: request.shift.lastLat, lng: request.shift.lastLng };
    const queueStops = await buildQueueStops(request.shiftId);
    // Only stops ahead of this patient
    const myPosition = request.queuePosition ?? 99;
    const stopsAhead = queueStops.slice(0, myPosition - 1);
    etaSeconds = await etaSecondsToNewPatient(vanPoint, stopsAhead, {
      lat: request.patientLat,
      lng: request.patientLng,
    });
    etaLabel = formatEtaLabel(etaSeconds);
  }

  return res.json({ ...request, etaSeconds, etaLabel });
});

// GET /api/van/requests/:id
router.get("/requests/:id", requireAuth, validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
  });
  if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({
    where: { id: requestId },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      van: { select: { name: true, registrationPlate: true } },
      shift: { select: { lastLat: true, lastLng: true, lastLocationAt: true, status: true } },
    },
  });

  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.patientId !== patientProfile.id) return res.status(403).json({ error: "Not your request" });

  let etaSeconds: number | null = null;
  let etaLabel: string | null = null;
  if (request.status === "accepted" || request.status === "in_progress") {
    if (request.shift?.lastLat != null && request.shift?.lastLng != null) {
      const vanPoint: Point = { lat: request.shift.lastLat, lng: request.shift.lastLng };
      const queueStops = await buildQueueStops(request.shiftId);
      const myPosition = request.queuePosition ?? 99;
      const stopsAhead = queueStops.slice(0, myPosition - 1);
      etaSeconds = await etaSecondsToNewPatient(vanPoint, stopsAhead, {
        lat: request.patientLat,
        lng: request.patientLng,
      });
      etaLabel = formatEtaLabel(etaSeconds);
    }
  }

  return res.json({ ...request, etaSeconds, etaLabel });
});

// POST /api/van/requests/:id/cancel
router.post("/requests/:id/cancel", requireAuth, validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
  });
  if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.patientId !== patientProfile.id) return res.status(403).json({ error: "Not your request" });

  if (request.phase === "in_treatment") {
    return res.status(409).json({ error: "Cannot cancel during treatment. Contact support." });
  }

  if (!["pending", "accepted", "in_progress"].includes(request.status)) {
    return res.status(409).json({ error: `Request is already ${request.status}` });
  }

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: { status: "cancelled", phase: "cancelled" },
  });

  // Renumber queue if this was an accepted stop
  if (request.status === "accepted" || request.status === "in_progress") {
    const remaining = await prisma.vanServiceRequest.findMany({
      where: { shiftId: request.shiftId, status: { in: ["accepted", "in_progress"] } },
      orderBy: { queuePosition: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.vanServiceRequest.update({
        where: { id: remaining[i].id },
        data: { queuePosition: i + 1 },
      });
    }
  }

  return res.json(updated);
});

export default router;
