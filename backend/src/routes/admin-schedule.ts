import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { appointmentsOutsideHours, dateOnly, londonDate } from "../lib/availability";
import {
  clinicClosureSchema,
  clinicHoursSchema,
  clinicianRotaSchema,
  dateRangeQuerySchema,
  idDateParamsSchema,
  idParamsSchema,
  rotaOverrideSchema,
} from "../schemas/admin";

// Back office for opening hours and the rota (CS-31). Admin only; every
// change goes through the audit middleware. A change never cancels a
// booking: it reports the upcoming visits that no longer fit so staff can
// rearrange them with the patient.
const router = Router();
router.use(requireRole("admin"));

const outsideHoursSummary = async (where: { clinicianId?: string; clinicId?: string }) =>
  (await appointmentsOutsideHours(where)).map((a) => ({
    id: a.id,
    clinicianId: a.clinicianId,
    clinicId: a.clinicId,
    channel: a.channel,
    startTimeUtc: a.startTimeUtc.toISOString(),
  }));

// ─── Clinics ──────────────────────────────────────────────────────────────────
router.get("/clinics", async (_req: AuthRequest, res: Response) => {
  const clinics = await prisma.clinic.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      postcode: true,
      city: true,
      phone: true,
      isActive: true,
      openingHours: { select: { weekday: true, opensMinute: true, closesMinute: true }, orderBy: { weekday: "asc" } },
      closures: {
        where: { date: { gte: dateOnly(londonDate(new Date())) } },
        select: { date: true, reason: true },
        orderBy: { date: "asc" },
        take: 100,
      },
    },
  });
  return res.json(
    clinics.map((c) => ({ ...c, closures: c.closures.map((x) => ({ date: x.date.toISOString().slice(0, 10), reason: x.reason })) }))
  );
});

// Replaces the clinic's weekly hours. A weekday left out is a closed day.
router.put("/clinics/:id/hours", validateParams(idParamsSchema), validateBody(clinicHoursSchema), async (req: AuthRequest, res: Response) => {
  const clinicId = String(req.params.id);
  const { hours } = req.body as { hours: { weekday: number; opensMinute: number; closesMinute: number }[] };
  if (!(await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } }))) {
    return res.status(404).json({ error: "Clinic not found" });
  }
  await prisma.$transaction([
    prisma.clinicOpeningHours.deleteMany({ where: { clinicId } }),
    prisma.clinicOpeningHours.createMany({ data: hours.map((h) => ({ clinicId, ...h })) }),
  ]);
  return res.json({ hours, outsideHours: await outsideHoursSummary({ clinicId }) });
});

router.post("/clinics/:id/closures", validateParams(idParamsSchema), validateBody(clinicClosureSchema), async (req: AuthRequest, res: Response) => {
  const clinicId = String(req.params.id);
  const { date, reason } = req.body as { date: string; reason?: string };
  if (!(await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } }))) {
    return res.status(404).json({ error: "Clinic not found" });
  }
  await prisma.clinicClosure.upsert({
    where: { clinicId_date: { clinicId, date: dateOnly(date) } },
    create: { clinicId, date: dateOnly(date), reason: reason ?? null },
    update: { reason: reason ?? null },
  });
  return res.status(201).json({ date, reason: reason ?? null, outsideHours: await outsideHoursSummary({ clinicId }) });
});

router.delete("/clinics/:id/closures/:date", validateParams(idDateParamsSchema), async (req: AuthRequest, res: Response) => {
  const { count } = await prisma.clinicClosure.deleteMany({
    where: { clinicId: String(req.params.id), date: dateOnly(String(req.params.date)) },
  });
  if (count === 0) return res.status(404).json({ error: "Closure not found" });
  return res.status(204).end();
});

// ─── Clinicians ───────────────────────────────────────────────────────────────
router.get("/clinicians", async (_req: AuthRequest, res: Response) => {
  const clinicians = await prisma.clinicianProfile.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      roleTitle: true,
      isTelehealthActive: true,
      rota: {
        select: { weekday: true, startMinute: true, endMinute: true, clinicId: true },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
      },
    },
  });
  return res.json(clinicians);
});

// Replaces the clinician's weekly rota.
router.put("/clinicians/:id/rota", validateParams(idParamsSchema), validateBody(clinicianRotaSchema), async (req: AuthRequest, res: Response) => {
  const clinicianId = String(req.params.id);
  const { blocks } = req.body as { blocks: { weekday: number; startMinute: number; endMinute: number; clinicId?: string | null }[] };
  if (!(await prisma.clinicianProfile.findUnique({ where: { id: clinicianId }, select: { id: true } }))) {
    return res.status(404).json({ error: "Clinician not found" });
  }
  const clinicIds = [...new Set(blocks.map((b) => b.clinicId).filter((id): id is string => !!id))];
  if (clinicIds.length > 0 && (await prisma.clinic.count({ where: { id: { in: clinicIds } } })) !== clinicIds.length) {
    return res.status(422).json({ error: "A rota block names a clinic that doesn't exist" });
  }
  await prisma.$transaction([
    prisma.clinicianRotaBlock.deleteMany({ where: { clinicianId } }),
    prisma.clinicianRotaBlock.createMany({ data: blocks.map((b) => ({ clinicianId, ...b, clinicId: b.clinicId ?? null })) }),
  ]);
  return res.json({ blocks, outsideHours: await outsideHoursSummary({ clinicianId }) });
});

router.get("/clinicians/:id/overrides", validateParams(idParamsSchema), validateQuery(dateRangeQuerySchema), async (req: AuthRequest, res: Response) => {
  const from = (req.query.from as string | undefined) ?? londonDate(new Date());
  const to = req.query.to as string | undefined;
  const overrides = await prisma.clinicianRotaOverride.findMany({
    where: { clinicianId: String(req.params.id), date: { gte: dateOnly(from), ...(to ? { lte: dateOnly(to) } : {}) } },
    select: { date: true, startMinute: true, endMinute: true, clinicId: true, reason: true },
    orderBy: { date: "asc" },
    take: 366,
  });
  return res.json(
    overrides.map((o) => ({ ...o, date: o.date.toISOString().slice(0, 10), working: o.startMinute !== null }))
  );
});

// Sets one date: a day off, or different hours from the weekly rota.
router.put("/clinicians/:id/overrides/:date", validateParams(idDateParamsSchema), validateBody(rotaOverrideSchema), async (req: AuthRequest, res: Response) => {
  const clinicianId = String(req.params.id);
  const date = String(req.params.date);
  const body = req.body as
    | { working: false; reason?: string }
    | { working: true; startMinute: number; endMinute: number; clinicId?: string | null; reason?: string };
  if (!(await prisma.clinicianProfile.findUnique({ where: { id: clinicianId }, select: { id: true } }))) {
    return res.status(404).json({ error: "Clinician not found" });
  }
  if (body.working && body.clinicId && !(await prisma.clinic.findUnique({ where: { id: body.clinicId }, select: { id: true } }))) {
    return res.status(422).json({ error: "That clinic doesn't exist" });
  }
  const data = body.working
    ? { startMinute: body.startMinute, endMinute: body.endMinute, clinicId: body.clinicId ?? null, reason: body.reason ?? null }
    : { startMinute: null, endMinute: null, clinicId: null, reason: body.reason ?? null };
  await prisma.clinicianRotaOverride.upsert({
    where: { clinicianId_date: { clinicianId, date: dateOnly(date) } },
    create: { clinicianId, date: dateOnly(date), ...data },
    update: data,
  });
  return res.json({ date, ...data, working: body.working, outsideHours: await outsideHoursSummary({ clinicianId }) });
});

router.delete("/clinicians/:id/overrides/:date", validateParams(idDateParamsSchema), async (req: AuthRequest, res: Response) => {
  const { count } = await prisma.clinicianRotaOverride.deleteMany({
    where: { clinicianId: String(req.params.id), date: dateOnly(String(req.params.date)) },
  });
  if (count === 0) return res.status(404).json({ error: "No change set for that date" });
  return res.status(204).end();
});

export default router;
