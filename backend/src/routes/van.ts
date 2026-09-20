import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { vanCoverageCheckSchema, vanStopIdParamsSchema, completeVanStopSchema } from "../schemas/van";

const router = Router();

// ─── POST /api/van/coverage-check ────────────────────────────────────────────
router.post("/coverage-check", validateBody(vanCoverageCheckSchema), async (req: Request, res: Response) => {
  const { postcode } = req.body;

  const clean = String(postcode).toUpperCase().replace(/\s/g, "");

  // Fetch all active van polygons from DB
  const polygons = await prisma.vanServicePolygon.findMany({
    include: { van: { select: { name: true, registrationPlate: true, vehicleModel: true } } },
  });

  // Simple prefix-match fallback (real PostGIS ST_Contains query would replace this)
  const LONDON_PREFIXES = ["SW", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9",
    "EC", "WC", "SE", "NW", "E14", "E1W"];
  const match = polygons.find((p) =>
    LONDON_PREFIXES.some((pfx) => clean.startsWith(pfx))
  );

  return res.json({
    postcode: clean,
    isCovered: !!match,
    assignedVan: match?.van.name ?? null,
    vehicleType: match?.van.vehicleModel ?? null,
    activeSector: match?.sectorName ?? null,
  });
});

// ─── GET /api/van/fleet ───────────────────────────────────────────────────────
router.get("/fleet", requireAuth, async (_req: AuthRequest, res: Response) => {
  const vans = await prisma.van.findMany({
    where: { isActive: true },
    include: { servicePolygons: true },
  });
  return res.json(vans);
});

// ─── GET /api/van/stops ───────────────────────────────────────────────────────
// Returns scheduled van appointments for the mobile operator route
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
      service: {
        select: { name: true, durationMinutes: true },
      },
      van: {
        select: { name: true, registrationPlate: true },
      },
    },
    orderBy: { startTimeUtc: "asc" },
  });

  const stops = appointments.map((a, idx) => {
    const access = (a.accessDetails as any) || {};
    const startTime = new Date(a.startTimeUtc);
    const endTime = new Date(a.endTimeUtc);
    const timeStr = `${startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    const fullAddress = [
      access.address || a.patient.addressLine1,
      a.patient.city || "London",
      a.patient.postcode,
    ]
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

// ─── POST /api/van/stops/:id/check-in ─────────────────────────────────────────
router.post("/stops/:id/check-in", requireAuth, validateParams(vanStopIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.id);
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "in_progress" },
  });
  return res.json({ success: true, status: updated.status, id: updated.id });
});

// ─── POST /api/van/stops/:id/complete ─────────────────────────────────────────
router.post("/stops/:id/complete", requireAuth, validateParams(vanStopIdParamsSchema), validateBody(completeVanStopSchema), async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.id);
  const { notes } = req.body;
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "completed",
      accessDetails: {
        clinicalNotes: notes,
        completedAt: new Date().toISOString(),
      },
    },
  });
  return res.json({ success: true, status: updated.status, id: updated.id });
});

export default router;
