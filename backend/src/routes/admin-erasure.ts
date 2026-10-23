import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { idParamsSchema } from "../schemas/admin";
import { ErasureBlockedError, erasePatient, upcomingBookings } from "../lib/erasure";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { retentionReport } from "../lib/retention";

// The DPO's queue of erasure requests (CS-23). Admin only, audited. Erasing
// keeps the clinical record and removes everything else (lib/erasure.ts).
const router = Router();
router.use(requireRole("admin"));

const listQuerySchema = z.object({ status: z.enum(["pending", "completed", "rejected"]).optional() }).strict();
const rejectSchema = z.object({ note: z.string().trim().min(1).max(500) }).strict();

const DAY_MS = 24 * 60 * 60 * 1000;

router.get("/erasure-requests", validateQuery(listQuerySchema), async (req: AuthRequest, res: Response) => {
  const status = (req.query.status as "pending" | "completed" | "rejected" | undefined) ?? "pending";
  const requests = await prisma.erasureRequest.findMany({
    where: { status },
    orderBy: status === "pending" ? { dueAt: "asc" } : { completedAt: "desc" },
    take: 200,
    select: {
      id: true,
      source: true,
      status: true,
      reason: true,
      requestedAt: true,
      dueAt: true,
      completedAt: true,
      outcomeNote: true,
      user: {
        select: {
          id: true,
          email: true,
          erasedAt: true,
          patientProfile: { select: { id: true, firstName: true, lastName: true, retainUntil: true } },
        },
      },
    },
  });
  const now = Date.now();
  const rows = await Promise.all(
    requests.map(async (r) => {
      const profile = r.user.patientProfile;
      const blockers = status === "pending" && profile ? await upcomingBookings(profile.id) : [];
      return {
        id: r.id,
        source: r.source,
        status: r.status,
        reason: r.reason,
        requestedAt: r.requestedAt.toISOString(),
        dueAt: r.dueAt.toISOString(),
        daysLeft: Math.ceil((r.dueAt.getTime() - now) / DAY_MS),
        overdue: r.status === "pending" && r.dueAt.getTime() < now,
        completedAt: r.completedAt?.toISOString() ?? null,
        outcomeNote: r.outcomeNote,
        patient: {
          userId: r.user.id,
          name: profile ? `${profile.firstName} ${profile.lastName}` : null,
          email: r.user.erasedAt ? null : r.user.email,
          retainUntil: profile?.retainUntil?.toISOString().slice(0, 10) ?? null,
        },
        upcomingBookings: blockers.length,
      };
    })
  );
  return res.json(rows);
});

router.post("/erasure-requests/:id/complete", validateParams(idParamsSchema), async (req: AuthRequest, res: Response) => {
  const request = await prisma.erasureRequest.findUnique({ where: { id: String(req.params.id) } });
  if (!request) return res.status(404).json({ error: "Erasure request not found" });
  if (request.status !== "pending") return res.status(409).json({ error: `This request is already ${request.status}` });
  try {
    const result = await erasePatient(request.userId, { handledById: req.user!.sub, erasureRequestId: request.id });
    return res.json({ status: "completed", ...result });
  } catch (error) {
    if (error instanceof ErasureBlockedError) {
      return res.status(409).json({ error: error.message, code: "UPCOMING_BOOKINGS", upcoming: error.upcoming });
    }
    if (error instanceof Error && error.message === "Only patient accounts are erased this way") {
      return res.status(422).json({ error: error.message });
    }
    throw error;
  }
});

router.post(
  "/erasure-requests/:id/reject",
  validateParams(idParamsSchema),
  validateBody(rejectSchema),
  async (req: AuthRequest, res: Response) => {
    const { note } = req.body as { note: string };
    const updated = await prisma.erasureRequest.updateMany({
      where: { id: String(req.params.id), status: "pending" },
      data: { status: "rejected", completedAt: new Date(), handledById: req.user!.sub, outcomeNote: note },
    });
    if (updated.count === 0) return res.status(409).json({ error: "This request isn't pending" });
    await createAuditLogWithIntegrity({
      action: "gdpr.erasure_rejected",
      actorId: req.user!.sub,
      resourceId: String(req.params.id),
      metadata: {},
    });
    return res.json({ status: "rejected" });
  }
);

// What the retention sweep would delete or flag (counts only).
router.get("/retention", async (_req: AuthRequest, res: Response) => {
  return res.json(await retentionReport());
});

export default router;
