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

  // Check if any polygon GeoJSON contains this postcode area
  // In production, this would use PostGIS ST_Contains with geocoded coordinates
  // For now, we use a more sophisticated prefix matching system
  const UK_POSTCODE_PATTERNS = [
    // London areas (common van service areas)
    { prefix: "SW", areas: ["SW1", "SW3", "SW5", "SW6", "SW7", "SW10", "SW11", "SW15", "SW18", "SW19", "SW20"] },
    { prefix: "W", areas: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W14"] },
    { prefix: "EC", areas: ["EC1", "EC2", "EC3", "EC4"] },
    { prefix: "WC", areas: ["WC1", "WC2"] },
    { prefix: "SE", areas: ["SE1", "SE3", "SE5", "SE7", "SE8", "SE9", "SE10", "SE11", "SE14", "SE15", "SE16", "SE17", "SE18", "SE19", "SE20", "SE21", "SE22", "SE23", "SE24", "SE25", "SE26", "SE27", "SE28"] },
    { prefix: "NW", areas: ["NW1", "NW2", "NW3", "NW5", "NW6", "NW7", "NW8", "NW10", "NW11"] },
    { prefix: "E", areas: ["E1", "E2", "E3", "E5", "E7", "E8", "E9", "E10", "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18", "E20"] },
  ];

  // Find matching polygon based on postcode
  let match = null;
  for (const pattern of UK_POSTCODE_PATTERNS) {
    if (clean.startsWith(pattern.prefix)) {
      // Check if the specific area is in our covered areas
      const areaCode = clean.substring(0, 3); // e.g., "SW1"
      if (pattern.areas.includes(areaCode)) {
        match = polygons.find(p => p.sectorName.includes(pattern.prefix));
        break;
      }
    }
  }

  // If no specific match found, try broader prefix match
  if (!match && polygons.length > 0) {
    const mainPrefix = clean.substring(0, 2); // e.g., "SW"
    match = polygons.find(p => p.sectorName.includes(mainPrefix));
  }

  return res.json({
    postcode: clean,
    isCovered: !!match,
    assignedVan: match?.van.name ?? null,
    vehicleType: match?.van.vehicleModel ?? null,
    activeSector: match?.sectorName ?? null,
    message: match 
      ? "Your postcode is within our mobile van service area" 
      : "Your postcode is currently outside our mobile van service area. Please try our clinic services instead."
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
