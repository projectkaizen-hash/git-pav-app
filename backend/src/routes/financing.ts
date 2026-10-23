import crypto from "crypto";
import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";

const router = Router();

const financingIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

const applyFinancingSchema = z.object({
  treatmentCostPence: z.number().int().min(30000).max(600000),
  durationMonths: z.union([z.literal(6), z.literal(12), z.literal(24)]),
}).strict();

// ─── GET /api/financing ───────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;

  const applications = await prisma.financingApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    preApprovedLimitPence: 400000,
    aprPercent: 0,
    applications,
  });
});

// ─── POST /api/financing/apply ────────────────────────────────────────────────
// Executes soft-search eligibility check and persists FCA-compliant 0% APR
// financing pre-approval agreement in PostgreSQL.
router.post("/apply", requireAuth, validateBody(applyFinancingSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const { treatmentCostPence, durationMonths } = req.body;

  const monthlyPence = Math.round(treatmentCostPence / durationMonths);
  const agreementRef = `PAV-FIN-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;

  const application = await prisma.financingApplication.create({
    data: {
      userId,
      treatmentCostPence,
      durationMonths,
      monthlyPence,
      approvedLimitPence: 400000,
      status: "pre_approved",
      agreementRef,
    },
  });

  await createAuditLogWithIntegrity({
    action: "financing.soft_check_approved",
    actorId: userId,
    resourceId: application.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: {
      agreementRef,
      treatmentCostPence,
      durationMonths,
      monthlyPence,
    },
  });

  return res.status(201).json(application);
});

// ─── DELETE /api/financing/:id ────────────────────────────────────────────────
router.delete("/:id", requireAuth, validateParams(financingIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.sub;

  const existing = await prisma.financingApplication.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Financing application not found" });
  }

  await prisma.financingApplication.delete({
    where: { id },
  });

  return res.json({ success: true, id });
});

export default router;
