import { Router, Request, Response } from "express";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity, verifyAuditIntegrity, applyAuditRetentionPolicy, checkAuditFailures } from "../lib/audit-integrity";
import { prisma } from "../lib/prisma";

const router = Router();

const MIN_ARCHIVE_DAYS = 365;

// ─── POST /api/audit/log ──────────────────────────────────────────────────────
// Used by the mobile app DSPT audit logger for client-side events
// Client events go into the chain under a "client." prefix, so the app can't
// write an entry that reads like a server event (for example a fake
// UNAUTHORIZED_ACCESS_ATTEMPT) (CS-09, AR-1).
const CLIENT_ACTION = /^[A-Za-z0-9_.-]{1,64}$/;

router.post("/log", requireAuth, async (req: AuthRequest, res: Response) => {
  const { action, resourceId } = req.body;

  if (typeof action !== "string" || !CLIENT_ACTION.test(action)) {
    return res.status(400).json({ error: "action must be 1-64 letters, digits, '.', '_' or '-'" });
  }
  if (resourceId !== undefined && resourceId !== null && (typeof resourceId !== "string" || resourceId.length > 128)) {
    return res.status(400).json({ error: "resourceId must be a string of up to 128 characters" });
  }

  await createAuditLogWithIntegrity({
    action: `client.${action}`,
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

  // Archiving moves entries out of the live chain, so it never reaches back
  // less than a year (AR-1). Deleting audit logs (8 years, decisions log #9)
  // isn't done from here.
  const { retentionDays = "365" } = req.body;
  const parsedDays = Math.max(MIN_ARCHIVE_DAYS, parseInt(String(retentionDays), 10) || MIN_ARCHIVE_DAYS);
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
