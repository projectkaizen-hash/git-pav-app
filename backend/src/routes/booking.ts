import { Router, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
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
  const rawSlots: Array<{
    lockKey: string;
    slotStart: Date;
    slotEnd: Date;
    isBooked: boolean;
  }> = [];
  const base = new Date(`${date}T09:00:00Z`);
  const dayLimit = new Date(`${date}T17:00:00Z`).getTime();

  for (let i = 0; base.getTime() + i * duration * 60000 < dayLimit; i++) {
    const slotStart = new Date(base.getTime() + i * duration * 60000);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    const isBooked = existing.some(
      (a) => a.startTimeUtc < slotEnd && a.endTimeUtc > slotStart
    );

    const lockKey = `slot:${date}:${clinicianId || "any"}:${slotStart.toISOString()}`;
    rawSlots.push({ lockKey, slotStart, slotEnd, isBooked });
  }

  const lockKeys = rawSlots.map((s) => s.lockKey);
  const lockValues =
    lockKeys.length > 0
      ? await redis.mget(...lockKeys).catch(() => lockKeys.map(() => null))
      : [];

  const slots = rawSlots.map((s, idx) => ({
    id: s.lockKey,
    startTimeUtc: s.slotStart.toISOString(),
    endTimeUtc: s.slotEnd.toISOString(),
    available: !s.isBooked && lockValues[idx] === null,
    durationMinutes: duration,
  }));

  return res.json(slots);
});

// ─── POST /api/booking/hold-slot ─────────────────────────────────────────────
router.post("/hold-slot", requireAuth, validateBody(holdSlotSchema), async (req: AuthRequest, res: Response) => {
  const { slotId } = req.body;
  const patientId = req.user!.sub;
  const lockKey = slotLockKey(slotId);

  // SET NX EX — only set if not already held
  const acquired = await redis
    .set(lockKey, patientId, "EX", SLOT_HOLD_SECONDS, "NX")
    .catch(() => null);

  if (!acquired) {
    const currentHolder = await redis.get(lockKey).catch(() => null);
    if (currentHolder !== patientId) {
      return res.status(409).json({
        success: false,
        slotId,
        error: "Slot already held by another patient",
        message: "Slot is already held by another patient",
      });
    }
  }

  return res.json({
    success: true,
    slotId,
    holdExpiresAt: Date.now() + SLOT_HOLD_SECONDS * 1000,
    holdDurationSeconds: SLOT_HOLD_SECONDS,
    message: "Slot held for 10 minutes. Complete deposit to confirm.",
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

    const startDate = new Date(startTimeUtc);
    const endDate = new Date(endTimeUtc);

    if (slotId) {
      const lockHolder = await redis.get(slotLockKey(slotId)).catch(() => null);
      if (lockHolder && lockHolder !== patientId) {
        return {
          error: "Slot is currently held by another patient",
          status: 409,
        };
      }
    }

    if (clinicianId) {
      const overlapping = await prisma.appointment.findFirst({
        where: {
          clinicianId,
          startTimeUtc: { lt: endDate },
          endTimeUtc: { gt: startDate },
          OR: [
            { status: { in: ["confirmed", "in_progress"] } },
            { status: "draft_hold", holdExpiresAt: { gt: new Date() } },
          ],
        },
        select: { id: true },
      });
      if (overlapping) {
        return {
          error: "Appointment slot is already booked for this clinician",
          status: 409,
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
        startTimeUtc: startDate,
        endTimeUtc: endDate,
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
  }).then((result: any) => {
    if (result.error) {
      const { status, ...errorBody } = result;
      return res.status(status || 400).json(errorBody);
    }
    return res.status(result.status).json(result.appointment);
  });
});

// ─── GET /api/booking/appointments ───────────────────────────────────────────
router.get("/appointments", requireAuth, async (req: AuthRequest, res: Response) => {
  // Clinicians get their own schedule (today forward, ascending); everyone
  // else gets their patient appointments. The mobile clinician schedule
  // screen consumes this via the same endpoint and response shape.
  if (req.user!.role === "clinician") {
    const clinician = await prisma.clinicianProfile.findUnique({
      where: { userId: req.user!.sub },
      select: { id: true },
    });
    if (!clinician) return res.status(404).json({ error: "Clinician profile not found" });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const schedule = await prisma.appointment.findMany({
      where: {
        clinicianId: clinician.id,
        startTimeUtc: { gte: startOfToday },
        status: { notIn: ["cancelled", "no_show"] },
      },
      include: {
        service: { select: { name: true, durationMinutes: true } },
        clinician: { select: { fullName: true, photoUrl: true } },
        clinic: { select: { name: true, address: true } },
        patient: { select: { id: true, firstName: true, lastName: true, dob: true } },
      },
      orderBy: { startTimeUtc: "asc" },
    });

    return res.json(
      schedule.map((a) => ({
        ...a,
        patient: a.patient
          ? {
              id: a.patient.id,
              firstName: a.patient.firstName,
              lastName: a.patient.lastName,
              age: a.patient.dob
                ? Math.floor((Date.now() - new Date(a.patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
                : null,
            }
          : null,
      }))
    );
  }

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

    const effectivePaymentId = stripePaymentId || appointment.stripePaymentId;
    if (
      !env.isMockStripe &&
      effectivePaymentId &&
      !effectivePaymentId.startsWith("pi_mock_") &&
      !effectivePaymentId.startsWith("pi_e2e_")
    ) {
      try {
        const stripe = new Stripe(env.stripeSecretKey, {
          apiVersion: "2025-02-24.acacia" as never,
        });
        const intent = await stripe.paymentIntents.retrieve(effectivePaymentId);
        if (!["succeeded", "requires_capture"].includes(intent.status)) {
          return {
            error: `PaymentIntent has not succeeded (status: ${intent.status})`,
            status: 400,
          };
        }
      } catch {
        return { error: "Failed to verify Stripe PaymentIntent", status: 400 };
      }
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
      return res.status(result.httpStatus || result.status || 400).json({ error: result.error });
    }
    const statusCode = result.httpStatus || result.status || 200;
    const { httpStatus, status, ...responseData } = result;
    return res.status(statusCode).json(responseData);
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

// ─── POST /api/booking/appointments/:id/check-in ─────────────────────────────
router.post("/appointments/:id/check-in", requireAuth, validateParams(appointmentIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const apptId = String(req.params.id);
  const { completedTasks } = (req.body ?? {}) as { completedTasks?: string[] };

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!profile) return res.status(404).json({ error: "Patient not found" });

  const appointment = await prisma.appointment.findFirst({
    where: { id: apptId, patientId: profile.id },
  });
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });

  const checkedInAt = new Date().toISOString();
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      accessDetails: {
        ...((appointment.accessDetails as Record<string, unknown>) || {}),
        checkedIn: true,
        checkedInAt,
        completedTasks: completedTasks || ["form", "consent", "insurance", "balance"],
      },
    },
  });

  return res.json({
    id: updated.id,
    checkedIn: true,
    checkedInAt,
    status: updated.status,
  });
});

export default router;
