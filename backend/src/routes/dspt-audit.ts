import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/audit/dspt-report ───────────────────────────────────────────────
// Provides DSPT self-assessment status - NOT for production compliance claims
// This is a prototype/development system; independent assessment required before use with patient data
router.get("/dspt-report", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!["admin"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Admin access required for DSPT Audit Report" });
  }

  const [auditCount, userCount, activeSessionCount] = await Promise.all([
    prisma.auditLog.count(),
    prisma.user.count(),
    prisma.authSession.count({ where: { revokedAt: null } }),
  ]);

  const standards = [
    {
      standard: "Standard 1: Personal Confidential Data",
      status: "ASSESSMENT_REQUIRED",
      evidence: `${userCount} user profiles registered. Consent versioning and lawful basis records require independent review.`,
    },
    {
      standard: "Standard 4: Managing Access & Audit Logs",
      status: "PARTIALLY_IMPLEMENTED",
      evidence: `Audit trail active with ${auditCount} events recorded. HMAC IP pseudonymization implemented. Immutable storage and independent review pending.`,
    },
    {
      standard: "Standard 7: Password Hashing & Authentication",
      status: "PARTIALLY_IMPLEMENTED",
      evidence: `Argon2id hashing active. ${activeSessionCount} active sessions. MFA enforcement, account lockout, and breached-password screening require implementation.`,
    },
    {
      standard: "Standard 9: Cyber Security & Encryption",
      status: "ASSESSMENT_REQUIRED",
      evidence: `HTTPS enforced with security headers. Clinical records encryption at rest requires managed key service implementation. Independent security review required.`,
    },
  ];

  return res.json({
    reportTitle: "NHS Data Security and Protection Toolkit (DSPT) Development Status",
    generatedAt: new Date().toISOString(),
    overallComplianceStatus: "PROTOTYPE - NOT FOR PRODUCTION USE WITH PATIENT DATA",
    disclaimer: "This is a development system. Independent DSPT assessment, penetration testing, and compliance approvals are required before production use.",
    standards,
  });
});

export default router;

