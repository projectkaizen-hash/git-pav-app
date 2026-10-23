import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/services ────────────────────────────────────────────────────────
// Optional query: ?channel=van|clinic|video
// Validated against the CareChannel enum: an unknown value must 400 here
// rather than surface as a Prisma enum-cast 500.
const CARE_CHANNELS = ["clinic", "van", "video"] as const;
type CareChannelName = (typeof CARE_CHANNELS)[number];

function parseChannelParam(
  channel: unknown
): { ok: true; value: CareChannelName | null } | { ok: false } {
  if (typeof channel === "undefined") return { ok: true, value: null };
  if (typeof channel !== "string") return { ok: false };
  if (!CARE_CHANNELS.includes(channel as CareChannelName)) return { ok: false };
  return { ok: true, value: channel as CareChannelName };
}

router.get("/", async (req: Request, res: Response) => {
  const parsed = parseChannelParam(req.query.channel);
  if (!parsed.ok) {
    return res.status(400).json({ error: "Invalid channel — expected clinic, van, or video" });
  }

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...(parsed.value ? { supportedChannels: { has: parsed.value } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return res.json(services);
});

// ─── GET /api/clinicians ──────────────────────────────────────────────────────
// Optional query: ?channel=video|clinic|van (validated; unknown → 400)
router.get("/clinicians", async (req: Request, res: Response) => {
  const parsed = parseChannelParam(req.query.channel);
  if (!parsed.ok) {
    return res.status(400).json({ error: "Invalid channel — expected clinic, van, or video" });
  }

  const clinicians = await prisma.clinicianProfile.findMany({
    where: {
      ...(parsed.value === "video" ? { isTelehealthActive: true } : {}),
    },
    select: {
      id: true,
      fullName: true,
      gdcNumber: true,
      roleTitle: true,
      specialisms: true,
      bio: true,
      photoUrl: true,
      isTelehealthActive: true,
    },
    orderBy: { fullName: "asc" },
  });

  return res.json(clinicians);
});

// ─── GET /api/clinics ─────────────────────────────────────────────────────────
router.get("/clinics", async (_req: Request, res: Response) => {
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return res.json(clinics);
});

export default router;

