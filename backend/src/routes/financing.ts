import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { env } from "../config/env";

const router = Router();

const financingIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

// ─── GET /api/financing ───────────────────────────────────────────────────────
// Payment plans are arranged through the practice's finance provider. This
// returns where to find them, plus any records from the old in-app flow so a
// patient can still see and remove them.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;

  const applications = await prisma.financingApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ financeInfoUrl: env.financeInfoUrl, applications });
});

// ─── POST /api/financing/apply ────────────────────────────────────────────────
// Retired: it recorded an instant "pre-approval" with no lender or credit
// check behind it (CS-05). Older app builds get a pointer to the finance page.
router.post("/apply", requireAuth, (_req: AuthRequest, res: Response) => {
  return res.status(410).json({
    error: "Payment plans are arranged through our finance partner. See the finance page for options.",
    financeInfoUrl: env.financeInfoUrl,
  });
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
