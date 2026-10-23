import { Router, Request, Response } from "express";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity, verifyAuditIntegrity, applyAuditRetentionPolicy, checkAuditFailures } from "../lib/audit-integrity";
import { prisma } from "../lib/prisma";

const router = Router();

// ─── POST /api/audit/log ──────────────────────────────────────────────────────
// Used by the mobile app DSPT audit logger for client-side events
router.post("/log", requireAuth, async (req: AuthRequest, res: Response) => {
  const { action, resourceId } = req.body;

  if (!action) return res.status(400).json({ error: "action required" });

  await createAuditLogWithIntegrity({
    action,
    actorId: req.user!.sub,
    resourceId: resourceId || null,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    // Client metadata is untrusted and can contain special-category health
    // data, so it is intentionally not retained in the audit record.
    metadata: { source: "mobile-client" },
  });

  return res.status(201).json({ status: "recorded" });
});

// ─── GET /api/audit/logs ──────────────────────────────────────────────────────
// Admin / DSPT officer access only
router.get("/logs", requireAuth, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  const { page: rawPage = "1", limit: rawLimit = "50", actorId } = req.query;
  const page = Math.max(1, parseInt(String(rawPage), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(rawLimit), 10) || 50));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: actorId ? { actorId: String(actorId) } : {},
      orderBy: { timestampUtc: "desc" },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({
      where: actorId ? { actorId: String(actorId) } : {},
    }),
  ]);

  return res.json({
    logs: logs.map((l) => ({ ...l, id: l.id.toString() })),
    total,
    page,
    limit,
  });
});

// ─── GET /api/audit/integrity ──────────────────────────────────────────────────
// Verify audit log integrity (admin only)
router.get("/integrity", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!["admin"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { limit = "1000" } = req.query;
  const parsedLimit = Math.min(10000, Math.max(1, parseInt(String(limit), 10) || 1000));
  const result = await verifyAuditIntegrity(parsedLimit);

  return res.json(result);
});

// ─── POST /api/audit/retention ────────────────────────────────────────────────
// Apply audit retention policy (admin only)
router.post("/retention", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!["admin"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { retentionDays = "365" } = req.body;
  const parsedDays = Math.max(1, parseInt(String(retentionDays), 10) || 365);
  const result = await applyAuditRetentionPolicy(parsedDays);

  return res.json(result);
});

// ─── GET /api/audit/failures ──────────────────────────────────────────────────
// Check for audit failures (admin only)
router.get("/failures", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!["admin"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const result = await checkAuditFailures();

  return res.json(result);
});

export default router;
