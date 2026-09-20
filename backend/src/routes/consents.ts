import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  grantConsentSchema,
  withdrawConsentSchema,
  consentHistoryQuerySchema,
  dataAccessRequestSchema,
  dataDeletionRequestSchema,
} from "../schemas/consents";

const router = Router();

// ─── POST /api/consents/grant ──────────────────────────────────────────────
// Grant consent for a specific consent type
router.post("/grant", requireAuth, validateBody(grantConsentSchema), async (req: AuthRequest, res: Response) => {
  const { consentType, lawfulBasis, ipAddress, metadata } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  // Get current version for this consent type
  const latestConsent = await prisma.consentRecord.findFirst({
    where: {
      patientProfileId: profile.id,
      consentType,
    },
    orderBy: { version: "desc" },
  });

  const newVersion = (latestConsent?.version || 0) + 1;

  // Withdraw any existing consent of this type
  if (latestConsent && latestConsent.isGranted) {
    await prisma.consentRecord.update({
      where: { id: latestConsent.id },
      data: {
        isGranted: false,
        withdrawnAt: new Date(),
      },
    });
  }

  // Create new consent record
  const consent = await prisma.consentRecord.create({
    data: {
      patientProfileId: profile.id,
      consentType,
      version: newVersion,
      lawfulBasis,
      isGranted: true,
      ipAddress: ipAddress || req.ip,
      metadata: metadata || {},
    },
  });

  return res.status(201).json({
    id: consent.id,
    consentType: consent.consentType,
    version: consent.version,
    lawfulBasis: consent.lawfulBasis,
    isGranted: consent.isGranted,
    grantedAt: consent.grantedAt,
  });
});

// ─── POST /api/consents/withdraw ────────────────────────────────────────────
// Withdraw consent for a specific consent type
router.post("/withdraw", requireAuth, validateBody(withdrawConsentSchema), async (req: AuthRequest, res: Response) => {
  const { consentType, ipAddress } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  // Find latest active consent
  const consent = await prisma.consentRecord.findFirst({
    where: {
      patientProfileId: profile.id,
      consentType,
      isGranted: true,
    },
    orderBy: { version: "desc" },
  });

  if (!consent) {
    return res.status(404).json({ error: "No active consent found for this type" });
  }

  // Withdraw consent
  const updated = await prisma.consentRecord.update({
    where: { id: consent.id },
    data: {
      isGranted: false,
      withdrawnAt: new Date(),
      ipAddress: ipAddress || req.ip,
    },
  });

  return res.json({
    id: updated.id,
    consentType: updated.consentType,
    version: updated.version,
    isGranted: updated.isGranted,
    withdrawnAt: updated.withdrawnAt,
  });
});

// ─── GET /api/consents/history ───────────────────────────────────────────────
// Get consent history for the patient
router.get("/history", requireAuth, validateQuery(consentHistoryQuerySchema), async (req: AuthRequest, res: Response) => {
  const { consentType, includeWithdrawn } = req.query as unknown as {
    consentType?: string;
    includeWithdrawn?: boolean;
  };
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const whereClause: any = {
    patientProfileId: profile.id,
  };

  if (consentType) {
    whereClause.consentType = consentType;
  }

  if (!includeWithdrawn) {
    whereClause.isGranted = true;
  }

  const consents = await prisma.consentRecord.findMany({
    where: whereClause,
    orderBy: [{ consentType: "asc" }, { version: "desc" }],
  });

  return res.json(consents);
});

// ─── GET /api/consents/current ────────────────────────────────────────────────
// Get current active consents
router.get("/current", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const consents = await prisma.consentRecord.findMany({
    where: {
      patientProfileId: profile.id,
      isGranted: true,
    },
    orderBy: [{ consentType: "asc" }, { version: "desc" }],
  });

  // Group by consent type, keeping only the latest version
  const latestConsents = new Map<string, any>();
  for (const consent of consents) {
    if (!latestConsents.has(consent.consentType) || consent.version > latestConsents.get(consent.consentType).version) {
      latestConsents.set(consent.consentType, consent);
    }
  }

  return res.json(Array.from(latestConsents.values()));
});

// ─── POST /api/consents/data-access-request ────────────────────────────────
// Request data access (GDPR DSAR)
router.post("/data-access-request", requireAuth, validateBody(dataAccessRequestSchema), async (req: AuthRequest, res: Response) => {
  const { ipAddress } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  // Get all user data (for export)
  const appointments = await prisma.appointment.findMany({
    where: { patientId: profile.id },
    orderBy: { startTimeUtc: "desc" },
  });

  const consents = await prisma.consentRecord.findMany({
    where: { patientProfileId: profile.id },
    orderBy: { grantedAt: "desc" },
  });

  const dataExport = {
    user: profile.user,
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob,
      gender: profile.gender,
      city: profile.city,
      postcode: profile.postcode,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    appointments: appointments.map((apt) => ({
      id: apt.id,
      startTimeUtc: apt.startTimeUtc,
      endTimeUtc: apt.endTimeUtc,
      status: apt.status,
      totalPricePence: apt.totalPricePence,
    })),
    consents: consents.map((consent) => ({
      consentType: consent.consentType,
      version: consent.version,
      lawfulBasis: consent.lawfulBasis,
      isGranted: consent.isGranted,
      grantedAt: consent.grantedAt,
      withdrawnAt: consent.withdrawnAt,
    })),
    requestedAt: new Date().toISOString(),
    ipAddress: ipAddress || req.ip,
  };

  // In production, this would trigger an async export job and email delivery
  console.log("[DATA ACCESS REQUEST] Data export requested for user:", userId);

  return res.status(202).json({
    message: "Data access request received. Export will be processed and sent via email.",
    requestId: crypto.randomUUID(),
  });
});

// ─── POST /api/consents/data-deletion-request ─────────────────────────────
// Request data deletion (GDPR right to be forgotten)
router.post("/data-deletion-request", requireAuth, validateBody(dataDeletionRequestSchema), async (req: AuthRequest, res: Response) => {
  const { reason, ipAddress } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  // In production, this would:
  // 1. Verify identity through additional confirmation
  // 2. Check for legal holds (e.g., outstanding appointments, payment disputes)
  // 3. Schedule deletion job
  // 4. Send confirmation email
  console.log("[DATA DELETION REQUEST] Deletion requested for user:", userId, "Reason:", reason);

  return res.status(202).json({
    message: "Data deletion request received. This will be reviewed and processed in accordance with data protection regulations.",
    requestId: crypto.randomUUID(),
    note: "Clinical and financial records may need to be retained for legal and regulatory purposes.",
  });
});

export default router;
