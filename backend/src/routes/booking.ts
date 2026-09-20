import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import {
  appointmentIdParamsSchema,
  createAppointmentSchema,
  holdSlotSchema,
  slotsQuerySchema,
} from "../schemas/booking";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";
import { checkRedFlags, validateTriageData } from "../lib/triage-escalation";

const router = Router();

const SLOT_HOLD_SECONDS = 600; // 10 minutes

function slotLockKey(slotId: string): string {
  return slotId.startsWith("slot:") ? slotId : `slot:${slotId}`;
}

// ─── GET /api/booking/slots ───────────────────────────────────────────────────
// Query: ?clinicianId=<uuid>&serviceId=<id>&date=YYYY-MM-DD&channel=clinic|van|video
router.get("/slots", requireAuth, validateQuery(slotsQuerySchema), async (req: AuthRequest, res: Response) => {
  const { clinicianId, serviceId, date, channel } = req.query;

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  // Fetch existing confirmed appointments to block booked slots (only unexpired holds block)
  const existing = await prisma.appointment.findMany({
    where: {
      startTimeUtc: { gte: dayStart, lte: dayEnd },
      OR: [
        { status: { in: ["confirmed", "in_progress"] } },
        { status: "draft_hold", holdExpiresAt: { gt: new Date() } },
      ],
      ...(clinicianId ? { clinicianId: String(clinicianId) } : {}),
    },
    select: { startTimeUtc: true, endTimeUtc: true, clinicianId: true },
  });

  const service = serviceId
    ? await prisma.service.findUnique({ where: { id: String(serviceId) } })
    : null;

  const duration = service?.durationMinutes || 30;

  // Generate slots from 09:00–17:00 UTC in `duration`-minute increments
  const slots = [];
  const base = new Date(`${date}T09:00:00Z`);

  for (let i = 0; base.getTime() + i * duration * 60000 < new Date(`${date}T17:00:00Z`).getTime(); i++) {
    const slotStart = new Date(base.getTime() + i * duration * 60000);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    const isBooked = existing.some(
      (a) => a.startTimeUtc.getTime() === slotStart.getTime()
    );

    // Check Redis hold
    const lockKey = `slot:${date}:${clinicianId || "any"}:${slotStart.toISOString()}`;
    const held = await redis.exists(lockKey).catch(() => 0);

    slots.push({
      id: lockKey,
      startTimeUtc: slotStart.toISOString(),
      endTimeUtc: slotEnd.toISOString(),
      available: !isBooked && held === 0,
      durationMinutes: duration,
    });
  }

  return res.json(slots);
});

// ─── POST /api/booking/hold-slot ─────────────────────────────────────────────
router.post("/hold-slot", requireAuth, validateBody(holdSlotSchema), async (req: AuthRequest, res: Response) => {
  const { slotId } = req.body;
  const patientId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("hold-slot", { slotId, patientId });

  return withIdempotency(idempotencyKey, async () => {
    const lockKey = slotLockKey(slotId);

    // SET NX EX — only set if not already held
    const result = await redis
      .set(lockKey, patientId, "EX", SLOT_HOLD_SECONDS, "NX")
      .catch(() => null);

    if (!result) {
      return {
        success: false,
        slotId,
        error: "Slot already held by another patient",
      };
    }

    return {
      success: true,
      slotId,
      holdExpiresAt: Date.now() + SLOT_HOLD_SECONDS * 1000,
      holdDurationSeconds: SLOT_HOLD_SECONDS,
      message: "Slot held for 10 minutes. Complete deposit to confirm.",
    };
  }).then(result => {
    if (!result.success) {
      return res.status(409).json(result);
    }
    return res.json(result);
  });
});

// ─── POST /api/booking/appointments ──────────────────────────────────────────
router.post("/appointments", requireAuth, validateBody(createAppointmentSchema), async (req: AuthRequest, res: Response) => {
  const {
    serviceId, channel, clinicianId, clinicId, vanId,
    startTimeUtc, endTimeUtc, slotId, accessDetails, triageData,
  } = req.body;
  const patientId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("create-appointment", { 
    patientId, serviceId, startTimeUtc, endTimeUtc 
  });

  return withIdempotency(idempotencyKey, async () => {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { id: true },
    });
    if (!profile) {
      return { error: "Patient profile not found", status: 404 };
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return { error: "Service not found", status: 404 };
    }

    // Validate triage data if provided
    if (triageData) {
      const validation = validateTriageData(triageData);
      if (!validation.isValid) {
        return { error: "Invalid triage data", details: validation.errors, status: 400 };
      }

      // Check for red-flag symptoms
      const redFlagCheck = checkRedFlags(triageData);
      if (redFlagCheck.isRedFlag && redFlagCheck.shouldBlockBooking) {
        return {
          error: "Red-flag symptoms detected",
          message: redFlagCheck.emergencyInstructions,
          emergencyNumber: redFlagCheck.emergencyNumber,
          flagType: redFlagCheck.flagType,
          status: 403,
        };
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: profile.id,
        clinicianId: clinicianId || null,
        serviceId,
        channel,
        clinicId: clinicId || null,
        vanId: vanId || null,
        startTimeUtc: new Date(startTimeUtc),
        endTimeUtc: new Date(endTimeUtc),
        status: "draft_hold",
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        accessDetails: accessDetails || null,
        triageData: triageData || null,
        totalPricePence: service.pricePence,
        depositPaidPence: 0,
      },
      include: {
        service: true,
        clinician: { select: { fullName: true } },
        clinic: { select: { name: true, address: true } },
      },
    });

    // Release Redis hold now that it's in DB
    if (slotId) {
      await redis.del(slotLockKey(slotId)).catch(() => {});
    }

    return { appointment, status: 201 };
  }).then(result => {
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result.appointment);
  });
});

// ─── GET /api/booking/appointments ───────────────────────────────────────────
router.get("/appointments", requireAuth, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!profile) return res.status(404).json({ error: "Patient profile not found" });

  const appointments = await prisma.appointment.findMany({
    where: { patientId: profile.id },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      clinician: { select: { fullName: true, photoUrl: true } },
      clinic: { select: { name: true, address: true } },
    },
    orderBy: { startTimeUtc: "desc" },
  });

  return res.json(appointments);
});

// ─── PATCH /api/booking/appointments/:id/confirm ─────────────────────────────
router.patch("/appointments/:id/confirm", requireAuth, validateParams(appointmentIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const apptId = String(req.params.id);
  const { stripePaymentId, depositPaidPence } = req.body;
  const patientId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("confirm-appointment", { 
    appointmentId: apptId, stripePaymentId, patientId 
  });

  return withIdempotency(idempotencyKey, async () => {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { id: true },
    });
    if (!profile) {
      return { error: "Patient not found", status: 404 };
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: apptId, patientId: profile.id },
    });

    if (!appointment) {
      return { error: "Appointment not found", status: 404 };
    }

    if (appointment.status === "confirmed") {
      // Already confirmed - return existing data
      return {
        id: appointment.id,
        appointmentStatus: appointment.status,
        depositPaidPence: appointment.depositPaidPence,
        message: "Appointment already confirmed",
        httpStatus: 200,
      };
    }

    if (appointment.status !== "draft_hold") {
      return { error: "Cannot confirm appointment in current status", status: 400 };
    }

    const confirmed = await prisma.appointment.update({
      where: { id: apptId },
      data: {
        status: "confirmed",
        stripePaymentId: stripePaymentId || appointment.stripePaymentId,
        depositPaidPence: depositPaidPence || appointment.depositPaidPence,
        holdExpiresAt: null,
      },
    });

    return {
      id: confirmed.id,
      appointmentStatus: confirmed.status,
      depositPaidPence: confirmed.depositPaidPence,
      message: "Appointment confirmed successfully",
      httpStatus: 200,
    };
  }).then((result: any) => {
    if (result.error) {
      return res.status(result.httpStatus).json({ error: result.error });
    }
    const { httpStatus, ...responseData } = result;
    return res.status(httpStatus).json(responseData);
  });
});

// ─── PATCH /api/booking/appointments/:id/cancel ──────────────────────────────
router.patch("/appointments/:id/cancel", requireAuth, validateParams(appointmentIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const apptId = String(req.params.id);
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!profile) return res.status(404).json({ error: "Patient not found" });

  await prisma.appointment.updateMany({
    where: { id: apptId, patientId: profile.id },
    data: { status: "cancelled" },
  });

  return res.json({ message: "Appointment cancelled" });
});

export default router;
