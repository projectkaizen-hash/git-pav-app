import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/services ────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return res.json(services);
});

// ─── GET /api/clinicians ──────────────────────────────────────────────────────
// Optional query: ?channel=video|clinic|van
router.get("/clinicians", async (req: Request, res: Response) => {
  const { channel } = req.query;

  const clinicians = await prisma.clinicianProfile.findMany({
    where: {
      ...(channel === "video" ? { isTelehealthActive: true } : {}),
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

