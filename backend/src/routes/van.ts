import { Router, Response } from "express";
import crypto from "crypto";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { HttpError } from "../middleware/error-handler";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import {
  shiftStartSchema,
  locationPingSchema,
  phaseUpdateSchema,
  vanRequestIdParamsSchema,
  createVanRequestSchema,
  availabilityQuerySchema,
} from "../schemas/van-dispatch";
import {
  etaSecondsToNewPatient,
  formatEtaLabel,
  QueueStop,
  Point,
  MAX_QUEUE_DEPTH,
  REQUEST_TIMEOUT_MS,
  MAX_ETA_SECONDS,
} from "../lib/van-eta";
import { clinicalRecordEncryptionService } from "../lib/encryption";
import { haversineMetres, postcodeToCoordinates } from "../lib/geo";
import { getOnlineShiftsCoveringPoint } from "../lib/van-coverage";
import { broadcastEtaUpdates, isMaterialDrift } from "../lib/van-eta-broadcast";
import { env } from "../config/env";
import {
  releaseVanDeposit,
  isDepositAuthorized,
  VanDepositReleaseStatus,
} from "../lib/van-payments";
import { sendPatientNotification } from "../lib/patient-push";

const router = Router();
const isMockStripe = env.isMockStripe;
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as never,
});

// Max metres between the patient's GPS fix and the postcode centroid before
// the request is rejected as inconsistent (see create-request flow).
const POSTCODE_DISTANCE_TOLERANCE_M = parseInt(
  process.env.VAN_POSTCODE_TOLERANCE_M ?? "1000",
  10
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: Function) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    return next();
  };
}

/**
 * Sanitize request data for operator viewing before acceptance
 * Removes sensitive fields like full address, gate code, and notes
 */
function sanitizeIncomingRequest(request: any) {
  const { accessDetails, ...sanitized } = request;
  if (accessDetails) {
    sanitized.accessDetails = {
      parkingType: accessDetails.parkingType,
      // Only return area/sector info, not full address
      city: accessDetails.city,
      postcode: accessDetails.postcode,
    };
  }
  return sanitized;
}

/**
 * Decrypt sensitive fields in access details for authorized users
 */
async function decryptAccessDetails(accessDetails: any): Promise<any> {
  if (!accessDetails) return accessDetails;
  
  const decrypted = { ...accessDetails };
  
  if (accessDetails.gateCode && typeof accessDetails.gateCode === 'object') {
    try {
      decrypted.gateCode = await clinicalRecordEncryptionService.decryptField(accessDetails.gateCode);
    } catch (error) {
      console.error('Failed to decrypt gateCode:', error);
      decrypted.gateCode = '[ENCRYPTED]';
    }
  }
  
  if (accessDetails.accessNotes && typeof accessDetails.accessNotes === 'object') {
    try {
      decrypted.accessNotes = await clinicalRecordEncryptionService.decryptField(accessDetails.accessNotes);
    } catch (error) {
      console.error('Failed to decrypt accessNotes:', error);
      decrypted.accessNotes = '[ENCRYPTED]';
    }
  }
  
  return decrypted;
}

/** Get operator profile (no auto-creation) */
async function getOperatorProfile(userId: string) {
  const profile = await prisma.operatorProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new HttpError(403, "Operator profile not found. Please contact administrator to set up your operator profile.");
  }
  return profile;
}

/** Get operator's active van assignment (no auto-assignment) */
async function getAssignedVan(operatorId: string) {
  const now = new Date();
  const assignment = await prisma.vanOperatorAssignment.findFirst({
    where: {
      operatorId,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: { van: { include: { servicePolygons: true } } },
    orderBy: { startsAt: "desc" },
  });

  if (!assignment) {
    return null;
  }

  return assignment.van;
}

/** Get current active shift for operator */
async function getActiveShift(operatorId: string) {
  return prisma.vanShift.findFirst({
    where: { operatorId, status: { in: ["online", "paused"] }, endedAt: null },
  });
}

/** Build queue stops for ETA calculation (accepted/in_progress only) */
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

/** Get total queue count including pending requests for depth checking */
async function getTotalQueueCount(shiftId: string): Promise<number> {
  return prisma.vanServiceRequest.count({
    where: {
      shiftId,
      status: { in: ["pending", "accepted", "in_progress"] },
    },
  });
}

// Local pointInPolygon removed — unified coverage checking lives in
// lib/van-coverage.ts (PostGIS-first with JS fallback).

// ─── LEGACY routes removed for security reasons ─────────────────────────────
// These routes have been removed as they were superseded by the new dispatch system
// and had authorization vulnerabilities allowing any logged-in patient to access
// all van appointments and modify them. Use the new dispatch endpoints instead.

// ─── OPERATOR — Shift Management ──────────────────────────────────────────────

// POST /api/van/shift/start
router.post("/shift/start", requireAuth, requireRole("operator"), validateBody(shiftStartSchema), async (req: AuthRequest, res: Response) => {
  const operatorId = req.user!.sub;

  // Ensure operator profile exists (throws HttpError 403 when missing)
  const opProfile = await getOperatorProfile(operatorId);

  // Check no active shift exists
  const existing = await getActiveShift(opProfile.id);
  if (existing) {
    return res.status(409).json({ error: "Shift already active", shiftId: existing.id });
  }

  // Get assigned van
  const van = await getAssignedVan(opProfile.id);
  if (!van) {
    return res.status(403).json({ 
      error: "No van assigned to this operator", 
      message: "Please contact your administrator to assign you to a van before starting a shift." 
    });
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
  const opProfile = await getOperatorProfile(req.user!.sub);

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });
  if (shift.status === "paused") return res.json({ message: "Already paused", shift });

  const updated = await prisma.vanShift.update({ where: { id: shift.id }, data: { status: "paused" } });
  return res.json(updated);
});

// POST /api/van/shift/resume
router.post("/shift/resume", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const updated = await prisma.vanShift.update({ where: { id: shift.id }, data: { status: "online" } });
  return res.json(updated);
});

// POST /api/van/shift/end
router.post("/shift/end", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

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

  // Expire pending requests one by one so each deposit hold is released.
  // Failures are reported but never block ending the shift — the expiry
  // sweeper retries failed releases on its next pass.
  const pendingRequests = await prisma.vanServiceRequest.findMany({
    where: { shiftId: shift.id, status: "pending" },
    select: { id: true, patientId: true, paymentIntentId: true },
  });
  const failedReleases: string[] = [];
  for (const pending of pendingRequests) {
    if (pending.paymentIntentId) {
      const release = await releaseVanDeposit(pending.paymentIntentId, "shift_ended");
      if (release.status === "failed") failedReleases.push(pending.id);
    }
    await prisma.vanServiceRequest.update({
      where: { id: pending.id },
      data: { status: "expired" },
    });
    await sendPatientNotification(
      pending.patientId,
      "Van Went Offline",
      "The van has ended its shift before accepting your request. No deposit was taken — please try again later.",
      { requestId: pending.id, status: "expired" }
    );
  }
  if (failedReleases.length > 0) {
    console.error(`[VAN SHIFT END] Failed to release deposits for requests: ${failedReleases.join(", ")}`);
  }

  const updated = await prisma.vanShift.update({
    where: { id: shift.id },
    data: { status: "offline", endedAt: new Date() },
  });

  return res.json(updated);
});

// POST /api/van/shift/location — GPS ping
router.post("/shift/location", requireAuth, requireRole("operator"), validateBody(locationPingSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const { lat, lng, accuracyM } = req.body;

  const previousLat = shift.lastLat;
  const previousLng = shift.lastLng;

  await prisma.$transaction([
    prisma.vanLocationPing.create({
      data: { shiftId: shift.id, lat, lng, accuracyM: accuracyM ?? null },
    }),
    prisma.vanShift.update({
      where: { id: shift.id },
      data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
    }),
  ]);

  // Live ETA re-push: only when the van has materially moved (threshold
  // scales with queue length). Fire-and-forget — the ping response stays
  // instant and push/DB failures inside the broadcast are swallowed.
  const activeStopCount = await prisma.vanServiceRequest.count({
    where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
  });
  if (isMaterialDrift(previousLat, previousLng, lat, lng, activeStopCount)) {
    void broadcastEtaUpdates(shift.id).catch((err) =>
      console.error("[VAN ETA PUSH] broadcast failed:", err)
    );
  }

  return res.json({ ok: true });
});

// GET /api/van/shift/current — operator dashboard data
router.get("/shift/current", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

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

  const decryptedQueue = await Promise.all(
    queue.map(async (item) => ({
      ...item,
      accessDetails: item.accessDetails ? await decryptAccessDetails(item.accessDetails) : item.accessDetails,
    }))
  );

  // Sanitize incoming requests to remove sensitive data before acceptance
  const sanitizedIncoming = incoming.map(sanitizeIncomingRequest);

  return res.json({ shift, van, queue: decryptedQueue, incoming: sanitizedIncoming });
});

// ─── OPERATOR — Queue Management ──────────────────────────────────────────────

// GET /api/van/requests/incoming
router.get("/requests/incoming", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

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

  // Sanitize incoming requests to remove sensitive data before acceptance
  const sanitizedIncoming = incoming.map(sanitizeIncomingRequest);

  return res.json(sanitizedIncoming);
});

// GET /api/van/queue
router.get("/queue", requireAuth, requireRole("operator"), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

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

  const decryptedQueue = await Promise.all(
    queue.map(async (item) => ({
      ...item,
      accessDetails: item.accessDetails ? await decryptAccessDetails(item.accessDetails) : item.accessDetails,
    }))
  );

  return res.json(decryptedQueue);
});

// POST /api/van/requests/:id/accept
router.post("/requests/:id/accept", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });
  if (shift.status === "paused") return res.status(409).json({ error: "Shift is paused. Resume before accepting." });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.shiftId !== shift.id) return res.status(403).json({ error: "Request not on your shift" });
  if (request.status !== "pending") return res.status(409).json({ error: `Request is already ${request.status}` });
  
  // Check if request has expired
  if (request.expiresAt && new Date() > request.expiresAt) {
    return res.status(409).json({ error: "Request expired", message: "This request has expired. The patient may submit a new request." });
  }

  // Check queue depth (accepted/in_progress only)
  const acceptedCount = await prisma.vanServiceRequest.count({
    where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
  });
  if (acceptedCount >= MAX_QUEUE_DEPTH) {
    return res.status(409).json({ error: "Queue full", message: `Maximum ${MAX_QUEUE_DEPTH} stops allowed.` });
  }

  const nextPosition = acceptedCount + 1;

  // Capture payment if PaymentIntent exists
  if (request.paymentIntentId && !isMockStripe) {
    // The intent must be in the authorised (capturable) state before we can
    // capture — i.e. the patient completed PaymentSheet. A pre-capture check
    // gives the operator an actionable message instead of a raw Stripe error.
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.retrieve(request.paymentIntentId);
    } catch (error) {
      console.error("Failed to retrieve PaymentIntent for capture:", error);
      return res.status(502).json({
        error: "Payment service unavailable",
        message: "Could not verify the deposit before acceptance. Please try again.",
      });
    }

    if (intent.status !== "requires_capture") {
      return res.status(409).json({
        error: "Deposit not authorized",
        message:
          intent.status === "canceled"
            ? "The patient's deposit hold was released. Please decline this request."
            : `The patient has not completed deposit authorization (status: ${intent.status}). Ask them to authorize the deposit, then accept.`,
      });
    }

    try {
      // Keyed per request id: a retried accept (e.g. network drop after the
      // Stripe call) reuses the same key instead of re-capturing blind.
      const paymentIntent = await stripe.paymentIntents.capture(
        request.paymentIntentId,
        undefined,
        { idempotencyKey: `van-deposit-capture:${request.id}` }
      );
      if (paymentIntent.status !== "succeeded") {
        console.error(`Payment capture failed for intent ${request.paymentIntentId}: ${paymentIntent.status}`);
        return res.status(409).json({ 
          error: "Payment capture failed", 
          message: "The payment could not be captured. Please ask the patient to try again." 
        });
      }
    } catch (error) {
      console.error("Failed to capture payment:", error);
      return res.status(409).json({ 
        error: "Payment capture failed", 
        message: "The payment could not be captured. Please ask the patient to try again." 
      });
    }
  }

  // Create corresponding Appointment record
  const service = await prisma.service.findUnique({ where: { id: request.serviceId } });
  if (!service) return res.status(404).json({ error: "Service not found" });

  // Calculate appointment times based on ETA
  const now = new Date();
  const etaSeconds = request.etaSecondsSnapshot || 1800; // Default 30 min if no snapshot
  const startTime = new Date(now.getTime() + etaSeconds * 1000);
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

  const appointment = await prisma.appointment.create({
    data: {
      patientId: request.patientId,
      serviceId: request.serviceId,
      channel: "van",
      vanId: request.vanId,
      startTimeUtc: startTime,
      endTimeUtc: endTime,
      status: "confirmed",
      accessDetails: request.accessDetails as any,
      totalPricePence: service.pricePence,
      depositPaidPence: request.paymentIntentId ? service.depositPence : 0,
      stripePaymentId: request.paymentIntentId,
    },
  });

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: {
      status: "accepted",
      phase: "queued",
      queuePosition: nextPosition,
      acceptedAt: new Date(),
      appointmentId: appointment.id,
    },
  });

  // Renumber queue to ensure unique positions
  await prisma.$transaction(async (tx) => {
    const allAccepted = await tx.vanServiceRequest.findMany({
      where: { shiftId: shift.id, status: { in: ["accepted", "in_progress"] } },
      orderBy: { acceptedAt: "asc" },
    });
    
    for (let i = 0; i < allAccepted.length; i++) {
      await tx.vanServiceRequest.update({
        where: { id: allAccepted[i].id },
        data: { queuePosition: i + 1 },
      });
    }
  });

  // Send notification to patient
  await sendPatientNotification(
    request.patientId,
    "Van Request Accepted",
    "Your van visit request has been accepted. The van is on its way!",
    { requestId: request.id, status: "accepted" }
  );

  // Seed the patient's first live ETA immediately (bypasses drift/throttle
  // gates) so the acceptance notification carries a real arrival estimate.
  void broadcastEtaUpdates(shift.id, { force: true }).catch((err) =>
    console.error("[VAN ETA PUSH] post-accept broadcast failed:", err)
  );

  return res.json(updated);
});

// POST /api/van/requests/:id/decline
router.post("/requests/:id/decline", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

  const shift = await getActiveShift(opProfile.id);
  if (!shift) return res.status(404).json({ error: "No active shift" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({ where: { id: requestId } });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.shiftId !== shift.id) return res.status(403).json({ error: "Request not on your shift" });
  if (request.status !== "pending") return res.status(409).json({ error: `Request is already ${request.status}` });

  // Lift the patient's deposit hold (or invalidate the unconfirmed intent so
  // its client secret can no longer be used). Failure is non-blocking: the
  // request is still declined; the sweeper retries releases on its next pass.
  let releaseStatus: VanDepositReleaseStatus | null = null;
  if (request.paymentIntentId) {
    const release = await releaseVanDeposit(request.paymentIntentId, "operator_declined");
    releaseStatus = release.status;
  }

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: { status: "declined" },
  });

  // Send notification to patient
  await sendPatientNotification(
    request.patientId,
    "Van Request Declined",
    "Unfortunately, your van visit request could not be accommodated at this time. Please try again later.",
    { requestId: request.id, status: "declined" }
  );

  return res.json({ ...updated, releaseStatus });
});

// POST /api/van/requests/:id/phase
router.post("/requests/:id/phase", requireAuth, requireRole("operator"), validateParams(vanRequestIdParamsSchema), validateBody(phaseUpdateSchema), async (req: AuthRequest, res: Response) => {
  const opProfile = await getOperatorProfile(req.user!.sub);

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

  // Validate no_show can only be set from on_site phase
  if (phase === "no_show" && request.phase !== "on_site") {
    return res.status(409).json({ 
      error: "Cannot mark as no-show", 
      message: "No-show can only be recorded when van is on site" 
    });
  }

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

  // Send notifications based on phase changes
  if (phase === "en_route") {
    await sendPatientNotification(
      request.patientId,
      "Van is On the Way",
      "The dental van is now en route to your location.",
      { requestId: request.id, phase: "en_route" }
    );
  } else if (phase === "on_site") {
    await sendPatientNotification(
      request.patientId,
      "Van Has Arrived",
      "The dental van has arrived at your location. Please be ready for your appointment.",
      { requestId: request.id, phase: "on_site" }
    );
  } else if (phase === "completed") {
    await sendPatientNotification(
      request.patientId,
      "Visit Completed",
      "Your van visit has been completed. Thank you for choosing Pav Dental.",
      { requestId: request.id, phase: "completed" }
    );
  } else if (phase === "no_show") {
    await sendPatientNotification(
      request.patientId,
      "Missed Appointment",
      "Our van arrived but you were not available. Please contact us to reschedule.",
      { requestId: request.id, phase: "no_show" }
    );
  }

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

  // Queue shape changed (advance, completion, or no-show) — every remaining
  // patient's ETA may have shifted. Fire-and-forget, gated by drift/throttle.
  void broadcastEtaUpdates(shift.id).catch((err) =>
    console.error("[VAN ETA PUSH] post-phase broadcast failed:", err)
  );

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

  // Find online shifts whose van covers this point (PostGIS or JS fallback)
  const activeShifts = await getOnlineShiftsCoveringPoint(patientPoint);

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

  // Find the best shift by ETA
  let best: { etaSeconds: number; shift: typeof activeShifts[0]; queueLength: number } | null = null;

  for (const shift of activeShifts) {
    const queueStops = await buildQueueStops(shift.id);
    const queueCount = await getTotalQueueCount(shift.id);

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

  // Validate that the provided coordinates are reasonable for the given postcode
  if (accessDetails.postcode) {
    const postcodeCoords = await postcodeToCoordinates(accessDetails.postcode);
    if (postcodeCoords) {
      const distance = haversineMetres(patientPoint, postcodeCoords);
      // Tolerance for postcode-boundary cases. Postcode centroids can sit
      // well over 1 km from the actual door in rural districts, so the limit
      // is env-tunable (default 1000 m).
      if (distance > POSTCODE_DISTANCE_TOLERANCE_M) {
        return res.status(400).json({
          error: "Address coordinates too far from postcode",
          message: "The provided location coordinates are too far from the given postcode. Please check your location or postcode.",
        });
      }
    }
  }

  // Encrypt sensitive fields before storage
  let encryptedAccessDetails = { ...accessDetails };
  if (accessDetails.gateCode) {
    const encryptedGateCode = await clinicalRecordEncryptionService.encryptField(accessDetails.gateCode);
    encryptedAccessDetails.gateCode = encryptedGateCode;
  }
  if (accessDetails.accessNotes) {
    const encryptedNotes = await clinicalRecordEncryptionService.encryptField(accessDetails.accessNotes);
    encryptedAccessDetails.accessNotes = encryptedNotes;
  }

  // Find best shift (same logic as availability); coverage via lib/van-coverage
  const activeShifts = await getOnlineShiftsCoveringPoint(patientPoint);

  let bestShift: typeof activeShifts[0] | null = null;
  let bestEta = Infinity;

  for (const shift of activeShifts) {
    const queueStops = await buildQueueStops(shift.id);
    const queueCount = await getTotalQueueCount(shift.id);
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

  // Create Stripe PaymentIntent for deposit (manual capture)
  let paymentIntentId: string | null = null;
  let clientSecret: string | null = null;
  
  if (isMockStripe) {
    paymentIntentId = `pi_mock_van_${Date.now()}`;
    clientSecret = `${paymentIntentId}_secret_mock`;
  } else {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: service.depositPence,
        currency: "gbp",
        capture_method: "manual", // Capture when operator accepts
        metadata: {
          vanServiceRequestId: "pending", // Will be updated after request creation
          patientUserId: req.user!.sub,
          serviceName: service.name,
          channel: "van",
        },
        automatic_payment_methods: { enabled: true },
      },
        // Per-attempt UUID: prevents same-ms duplicate intents under
        // concurrency. Cross-retry protection comes from the duplicate-
        // active-request guard; a stable key here would be harmful because
        // Stripe replays the same (possibly released) intent for 24h.
        { idempotencyKey: `van-request-deposit:${crypto.randomUUID()}` }
      );
      
      paymentIntentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret;
    } catch (error) {
      console.error("Failed to create Stripe PaymentIntent:", error);
      return res.status(500).json({ error: "Failed to initialize payment" });
    }
  }

  const request = await prisma.vanServiceRequest.create({
    data: {
      shiftId: bestShift.id,
      vanId: bestShift.vanId,
      patientId: patientProfile.id,
      serviceId,
      patientLat: patientPoint.lat,
      patientLng: patientPoint.lng,
      accessDetails: encryptedAccessDetails,
      expiresAt: new Date(Date.now() + REQUEST_TIMEOUT_MS),
      etaSecondsSnapshot: Math.round(bestEta),
      paymentIntentId,
    },
  });

  // Update PaymentIntent metadata with the actual request ID
  if (!isMockStripe && paymentIntentId) {
    try {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: { vanServiceRequestId: request.id },
      });
    } catch (error) {
      console.error("Failed to update PaymentIntent metadata:", error);
    }
  }

  // Send notification to patient about request creation
  await sendPatientNotification(
    patientProfile.id,
    "Van Request Submitted",
    "Your van visit request has been submitted and is pending operator acceptance.",
    { requestId: request.id, status: "pending" }
  );

  return res.status(201).json({
    ...request,
    etaLabel: formatEtaLabel(Math.round(bestEta)),
    paymentRequired: true,
    depositAmount: service.depositPence,
    ...(clientSecret && { clientSecret }),
    ...(paymentIntentId && { paymentIntentId }),
    isMockPayment: isMockStripe,
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

  // Decrypt sensitive fields for the requesting patient
  if (request.accessDetails) {
    request.accessDetails = await decryptAccessDetails(request.accessDetails);
  }

  // Only return van coordinates if this patient is next in queue (queuePosition === 1)
  // For pending requests or when not next, hide van location for privacy
  if (request.queuePosition !== 1 && request.shift?.lastLat) {
    request.shift.lastLat = null;
    request.shift.lastLng = null;
    request.shift.lastLocationAt = null;
  }

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

  const depositAuthorized = await isDepositAuthorized(
    request.paymentIntentId,
    request.depositAuthorizedAt
  );

  return res.json({ ...request, etaSeconds, etaLabel, depositAuthorized });
});

// GET /api/van/requests/:id
router.get("/requests/:id", requireAuth, validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({
    where: { id: requestId },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      van: { select: { name: true, registrationPlate: true } },
      shift: { select: { id: true, operatorId: true, lastLat: true, lastLng: true, lastLocationAt: true, status: true } },
    },
  });

  if (!request) return res.status(404).json({ error: "Request not found" });

  if (req.user!.role === "operator") {
    const opProfile = await getOperatorProfile(req.user!.sub);
    if (request.shift?.operatorId !== opProfile.id) {
      return res.status(403).json({ error: "Request not on your shift" });
    }
    if (request.status === "pending") {
      return res.json(sanitizeIncomingRequest(request));
    }
    if (request.accessDetails && (request.status === "accepted" || request.status === "in_progress")) {
      request.accessDetails = await decryptAccessDetails(request.accessDetails);
    }
  } else {
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: req.user!.sub },
    });
    if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });
    if (request.patientId !== patientProfile.id) return res.status(403).json({ error: "Not your request" });

    // Decrypt sensitive fields for the requesting patient
    if (request.accessDetails) {
      request.accessDetails = await decryptAccessDetails(request.accessDetails);
    }

    // Only return van coordinates if this patient is next in queue (queuePosition === 1)
    // For pending requests or when not next, hide van location for privacy
    if (request.queuePosition !== 1 && request.shift?.lastLat) {
      request.shift.lastLat = null;
      request.shift.lastLng = null;
      request.shift.lastLocationAt = null;
    }
  }

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

  const depositAuthorized = await isDepositAuthorized(
    request.paymentIntentId,
    request.depositAuthorizedAt
  );

  return res.json({ ...request, etaSeconds, etaLabel, depositAuthorized });
});

// POST /api/van/requests/:id/payment-retry
// Returns the deposit PaymentIntent client secret so a patient who closed the
// app mid-PaymentSheet (or whose authorisation failed) can retry without
// creating a new request. Pending requests only.
router.post("/requests/:id/payment-retry", requireAuth, validateParams(vanRequestIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
  });
  if (!patientProfile) return res.status(403).json({ error: "Patient profile required" });

  const requestId = String(req.params.id);
  const request = await prisma.vanServiceRequest.findUnique({
    where: { id: requestId },
    include: { service: { select: { depositPence: true } } },
  });
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.patientId !== patientProfile.id) return res.status(403).json({ error: "Not your request" });
  if (request.status !== "pending") {
    return res.status(409).json({ error: `Deposit can only be authorized while the request is pending (current: ${request.status})` });
  }
  if (!request.paymentIntentId) {
    return res.status(409).json({ error: "No deposit payment attached to this request" });
  }

  if (isMockStripe) {
    return res.json({
      clientSecret: `${request.paymentIntentId}_secret_mock`,
      paymentIntentId: request.paymentIntentId,
      depositAmount: request.service.depositPence,
      alreadyAuthorized: false,
      isMockPayment: true,
    });
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(request.paymentIntentId);
  } catch (error) {
    console.error("payment-retry: failed to retrieve PaymentIntent:", error);
    return res.status(502).json({ error: "Payment service unavailable. Please try again." });
  }

  // Already authorised — nothing for the patient to do.
  if (intent.status === "requires_capture") {
    return res.json({
      clientSecret: null,
      paymentIntentId: request.paymentIntentId,
      depositAmount: request.service.depositPence,
      alreadyAuthorized: true,
      isMockPayment: false,
    });
  }

  if (intent.status !== "requires_payment_method") {
    return res.status(409).json({
      error: `Deposit is not awaiting authorization (status: ${intent.status})`,
    });
  }

  return res.json({
    clientSecret: intent.client_secret,
    paymentIntentId: request.paymentIntentId,
    depositAmount: request.service.depositPence,
    alreadyAuthorized: false,
    isMockPayment: false,
  });
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

  // Release the deposit BEFORE marking the request cancelled: if Stripe fails
  // we return an error and leave the request in its current state, so the
  // patient can retry the cancel (and so we never strand a hold on a request
  // we claim is already over). A captured deposit (cancel after accept) is
  // fully refunded — flagged as a tunable cancellation-fee policy.
  if (request.paymentIntentId) {
    const release = await releaseVanDeposit(request.paymentIntentId, "patient_cancelled");
    if (release.status === "failed") {
      return res.status(502).json({
        error: "Could not release deposit",
        message: "The payment hold could not be released right now. Please try cancelling again in a moment.",
      });
    }
  }

  const updated = await prisma.vanServiceRequest.update({
    where: { id: request.id },
    data: { status: "cancelled", phase: "cancelled" },
  });

  // Cancel linked appointment if it exists
  if (request.appointmentId) {
    await prisma.appointment.update({
      where: { id: request.appointmentId },
      data: { status: "cancelled" },
    });
  }

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

  // Cancellation shortens everyone else's chain — recompute their ETAs.
  void broadcastEtaUpdates(request.shiftId).catch((err) =>
    console.error("[VAN ETA PUSH] post-cancel broadcast failed:", err)
  );

  return res.json(updated);
});

export default router;
