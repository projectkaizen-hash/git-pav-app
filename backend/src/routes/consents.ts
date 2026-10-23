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
import { objectStorage } from "../lib/object-storage";
import { communicationService } from "../lib/communication-service";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";

const router = Router();

// ─── POST /api/consents/grant ──────────────────────────────────────────────
router.post("/grant", requireAuth, validateBody(grantConsentSchema), async (req: AuthRequest, res: Response) => {
  const { consentType, lawfulBasis, ipAddress, metadata } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const latestConsent = await prisma.consentRecord.findFirst({
    where: {
      patientProfileId: profile.id,
      consentType,
    },
    orderBy: { version: "desc" },
  });

  const newVersion = (latestConsent?.version || 0) + 1;

  if (latestConsent && latestConsent.isGranted) {
    await prisma.consentRecord.update({
      where: { id: latestConsent.id },
      data: {
        isGranted: false,
        withdrawnAt: new Date(),
      },
    });
  }

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
router.post("/withdraw", requireAuth, validateBody(withdrawConsentSchema), async (req: AuthRequest, res: Response) => {
  const { consentType, ipAddress } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

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

  const latestConsents = new Map<string, any>();
  for (const consent of consents) {
    if (!latestConsents.has(consent.consentType) || consent.version > latestConsents.get(consent.consentType).version) {
      latestConsents.set(consent.consentType, consent);
    }
  }

  return res.json(Array.from(latestConsents.values()));
});

// ─── POST /api/consents/data-access-request ────────────────────────────────
// Compiles complete GDPR Subject Access Request (SAR) bundle, stores in
// DocumentVault & ObjectStorage, and dispatches secure download link via email.
router.post("/data-access-request", requireAuth, validateBody(dataAccessRequestSchema), async (req: AuthRequest, res: Response) => {
  const { ipAddress, format = "json" } = req.body;
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
      odontogramTeeth: { orderBy: { toothNumber: "asc" } },
      treatmentPlans: { include: { items: true } },
    },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const [appointments, consents, prescriptions] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: profile.id },
      include: { service: { select: { name: true } } },
      orderBy: { startTimeUtc: "desc" },
    }),
    prisma.consentRecord.findMany({
      where: { patientProfileId: profile.id },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: { appointment: { patientId: profile.id } },
      orderBy: { dispatchedAt: "desc" },
    }),
  ]);

  const requestId = crypto.randomUUID();
  const dataExport = {
    requestId,
    standard: "UK GDPR Article 15 Subject Access Request (DSAR)",
    user: profile.user,
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob,
      gender: profile.gender,
      addressLine1: profile.addressLine1,
      city: profile.city,
      postcode: profile.postcode,
      medicalHistory: profile.medicalHistory,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    odontogram: profile.odontogramTeeth,
    treatmentPlans: profile.treatmentPlans,
    prescriptions,
    appointments: appointments.map((apt) => ({
      id: apt.id,
      serviceName: apt.service?.name,
      channel: apt.channel,
      startTimeUtc: apt.startTimeUtc,
      endTimeUtc: apt.endTimeUtc,
      status: apt.status,
      totalPricePence: apt.totalPricePence,
      depositPaidPence: apt.depositPaidPence,
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

  const isCsv = format === "csv";
  const fileKey = `gdpr-sar/${profile.id}/sar-export-${requestId}.${isCsv ? "csv" : "json"}`;
  const csvEscape = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const exportPayload = isCsv
    ? [
        "section,field,value",
        `meta,requestId,${csvEscape(requestId)}`,
        `meta,standard,${csvEscape(dataExport.standard)}`,
        `meta,requestedAt,${csvEscape(dataExport.requestedAt)}`,
        `user,id,${csvEscape(profile.user.id)}`,
        `user,email,${csvEscape(profile.user.email)}`,
        `user,phone,${csvEscape(profile.user.phone)}`,
        `profile,firstName,${csvEscape(profile.firstName)}`,
        `profile,lastName,${csvEscape(profile.lastName)}`,
        `profile,postcode,${csvEscape(profile.postcode)}`,
        ...appointments.map(
          (apt) => `appointment,${csvEscape(apt.id)},${csvEscape(`${apt.service?.name ?? ""} | ${apt.channel} | ${apt.status}`)}`
        ),
        ...consents.map(
          (c) => `consent,${csvEscape(c.consentType)},${csvEscape(`v${c.version} | ${c.lawfulBasis} | granted=${c.isGranted}`)}`
        ),
      ].join("\n")
    : JSON.stringify(dataExport, null, 2);

  const uploaded = await objectStorage.upload(
    fileKey,
    exportPayload,
    isCsv ? "text/csv" : "application/json",
    { requestId, userId, format: isCsv ? "csv" : "json" }
  );

  await prisma.documentVault.create({
    data: {
      patientId: profile.id,
      docType: "gdpr_sar_export",
      title: `GDPR Subject Access Bundle (${new Date().toLocaleDateString("en-GB")})`,
      fileKey: uploaded.key,
      fileSizeBytes: String(uploaded.size),
    },
  });

  await createAuditLogWithIntegrity({
    action: "gdpr.data_access_request.completed",
    actorId: userId,
    resourceId: profile.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(ipAddress || req.ip || ""),
    metadata: {
      requestId,
      fileKey: uploaded.key,
      sha256: uploaded.sha256,
      format: isCsv ? "csv" : "json",
    },
  });

  await communicationService.sendEmail({
    to: profile.user.email,
    subject: "Your Pav Dental GDPR Subject Access Request (SAR) Bundle",
    html: `<p>Dear ${profile.firstName},</p><p>Your UK GDPR Article 15 Subject Access Request bundle (Ref: <strong>${requestId}</strong>) has been generated and added to your encrypted Document Vault.</p><p>Download URL (expires in 15 minutes): <a href="${uploaded.url}">${uploaded.url}</a></p>`,
    text: `Your Pav Dental GDPR Subject Access Request bundle (Ref: ${requestId}) is ready: ${uploaded.url}`,
  });

  return res.status(202).json({
    message: "Data access request processed. Encrypted bundle added to your Document Vault and emailed.",
    requestId,
    downloadUrl: uploaded.url,
    sha256: uploaded.sha256,
    recordCounts: {
      appointments: appointments.length,
      treatmentPlans: profile.treatmentPlans.length,
      odontogramTeeth: profile.odontogramTeeth.length,
      consents: consents.length,
    },
  });
});

// ─── POST /api/consents/data-deletion-request ─────────────────────────────
// Request data deletion (GDPR right to erasure / statutory retention review)
router.post("/data-deletion-request", requireAuth, validateBody(dataDeletionRequestSchema), async (req: AuthRequest, res: Response) => {
  const { reason, ipAddress } = req.body;
  const userId = req.user!.sub;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });

  if (!profile) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const requestId = crypto.randomUUID();

  await createAuditLogWithIntegrity({
    action: "gdpr.data_deletion_requested",
    actorId: userId,
    resourceId: profile.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(ipAddress || req.ip || ""),
    metadata: { requestId, reason },
  });

  await communicationService.sendEmail({
    to: profile.user.email,
    subject: "Pav Dental GDPR Erasure Request Confirmation",
    html: `<p>Your GDPR Article 17 erasure request (Ref: <strong>${requestId}</strong>) has been logged with our Data Protection Officer.</p>`,
    text: `Your GDPR Article 17 erasure request (Ref: ${requestId}) has been logged with our Data Protection Officer.`,
  });

  return res.status(202).json({
    message: "Data deletion request received. This will be reviewed and processed in accordance with data protection regulations.",
    requestId,
    note: "Clinical and financial records may need to be retained for legal and regulatory purposes.",
  });
});

export default router;
