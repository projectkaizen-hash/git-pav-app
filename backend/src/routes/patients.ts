import crypto from "crypto";
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requirePatientRecordAccess, requireActiveAppointmentContext } from "../middleware/patient-access";
import { validateParams, validateBody } from "../middleware/validate";
import {
  patientIdParamsSchema,
  updatePatientProfileSchema,
  updateOdontogramSchema,
  createTreatmentPlanSchema,
  planActionParamsSchema,
  signTreatmentPlanSchema,
} from "../schemas/patients";
import { objectStorage } from "../lib/object-storage";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";

const router = Router();

function pid(req: AuthRequest) {
  return String(req.params.id);
}

// ─── GET /api/patients/:id/profile ───────────────────────────────────────────
router.get("/:id/profile", requireAuth, validateParams(patientIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const requestedId = pid(req);
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
    select: { email: true, phone: true },
  });

  return res.json({
    id: requestedId,
    profileId: profile.id,
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dob: profile.dob,
    gender: profile.gender,
    email: user?.email,
    phone: user?.phone,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    postcode: profile.postcode,
    address: {
      line1: profile.addressLine1,
      line2: profile.addressLine2,
      city: profile.city,
      postcode: profile.postcode,
    },
    emergencyContact: {
      name: profile.emergencyContactName,
      phone: profile.emergencyContactPhone,
    },
    medicalHistory: profile.medicalHistory,
    consents: profile.consents,
  });
});

// ─── PUT /api/patients/:id/profile ───────────────────────────────────────────
router.put("/:id/profile", requireAuth, validateParams(patientIdParamsSchema), validateBody(updatePatientProfileSchema), async (req: AuthRequest, res: Response) => {
  const requestedId = pid(req);
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const {
    firstName, lastName, dob, gender,
    addressLine1, addressLine2, city, postcode,
    phone,
    emergencyContactName, emergencyContactPhone,
    medicalHistory, consents,
  } = req.body;

  const [updated] = await prisma.$transaction([
    prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        firstName, lastName,
        dob: dob ? new Date(dob) : undefined,
        gender,
        addressLine1, addressLine2: addressLine2 ?? null, city, postcode,
        emergencyContactName, emergencyContactPhone,
        medicalHistory: medicalHistory ?? undefined,
        consents: consents ?? undefined,
      },
    }),
    ...(phone !== undefined ? [prisma.user.update({
      where: { id: profile.userId },
      data: { phone },
    })] : []),
  ]);

  return res.json({
    id: requestedId,
    profileId: updated.id,
    userId: updated.userId,
    firstName: updated.firstName,
    lastName: updated.lastName,
    dob: updated.dob,
    gender: updated.gender,
    addressLine1: updated.addressLine1,
    addressLine2: updated.addressLine2,
    city: updated.city,
    postcode: updated.postcode,
    address: {
      line1: updated.addressLine1,
      line2: updated.addressLine2,
      city: updated.city,
      postcode: updated.postcode,
    },
    emergencyContact: {
      name: updated.emergencyContactName,
      phone: updated.emergencyContactPhone,
    },
    updatedAt: updated.updatedAt,
  });
});

// ─── GET /api/patients/:id/odontogram ────────────────────────────────────────
router.get("/:id/odontogram", requireAuth, validateParams(patientIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const teeth = await prisma.toothRecord.findMany({
    where: { patientId: profile.id },
    orderBy: { toothNumber: "asc" },
  });

  return res.json(teeth);
});

// ─── PUT /api/patients/:id/odontogram ────────────────────────────────────────
router.put("/:id/odontogram", requireAuth, validateParams(patientIdParamsSchema), validateBody(updateOdontogramSchema), async (req: AuthRequest, res: Response) => {
  const context = await requireActiveAppointmentContext(req, res);
  if (!context) return;

  const { profile, appointmentId } = context;
  const { teeth } = req.body;

  const upserts = teeth.map((t: { toothNumber: number; arch: string; quadrant: string; condition: string; notes?: string }) =>
    prisma.toothRecord.upsert({
      where: { patientId_toothNumber: { patientId: profile.id, toothNumber: t.toothNumber } },
      update: { condition: t.condition as any, notes: t.notes },
      create: {
        patientId: profile.id,
        toothNumber: t.toothNumber,
        arch: t.arch,
        quadrant: t.quadrant,
        condition: t.condition as any,
        notes: t.notes,
      },
    })
  );

  await prisma.$transaction(upserts);
  return res.json({ message: "Odontogram updated", count: teeth.length, appointmentId });
});

// ─── GET /api/patients/:id/plans ──────────────────────────────────────────────
router.get("/:id/plans", requireAuth, validateParams(patientIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const plans = await prisma.treatmentPlan.findMany({
    where: { patientId: profile.id },
    include: {
      items: true,
      clinician: { select: { fullName: true, roleTitle: true, gdcNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(plans);
});

// ─── POST /api/patients/:id/plans ────────────────────────────────────────────
router.post("/:id/plans", requireAuth, validateParams(patientIdParamsSchema), validateBody(createTreatmentPlanSchema), async (req: AuthRequest, res: Response) => {
  const context = await requireActiveAppointmentContext(req, res);
  if (!context) return;

  const { profile, appointmentId } = context;
  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!clinician) return res.status(403).json({ error: "No clinician profile found" });

  const { title, items } = req.body;

  const totalCostPence = items.reduce((sum: number, i: { costPence: number }) => sum + i.costPence, 0);

  const plan = await prisma.treatmentPlan.create({
    data: {
      patientId: profile.id,
      clinicianId: clinician.id,
      title,
      totalCostPence,
      items: { create: items },
    },
    include: { items: true },
  });

  return res.status(201).json({ ...plan, appointmentId });
});

// ─── POST /api/patients/:id/plans/:planId/sign ──────────────────────────────
// Cryptographically signs & accepts a treatment plan (GDC Principle 2 compliance)
router.post(
  "/:id/plans/:planId/sign",
  requireAuth,
  validateParams(planActionParamsSchema),
  validateBody(signTreatmentPlanSchema),
  async (req: AuthRequest, res: Response) => {
    const profile = await requirePatientRecordAccess(req, res);
    if (!profile) return;

    const planId = String(req.params.planId);
    const { signerName, signatureData } = req.body;

    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, patientId: profile.id },
      include: { items: true, clinician: { select: { fullName: true, gdcNumber: true } } },
    });

    if (!plan) {
      return res.status(404).json({ error: "Treatment plan not found" });
    }

    const signedAt = new Date();
    const canonicalPayload = JSON.stringify({
      planId: plan.id,
      patientId: profile.id,
      signerName,
      totalCostPence: plan.totalCostPence,
      items: plan.items.map((it) => ({ code: it.code, costPence: it.costPence, toothNumber: it.toothNumber })),
      signedAtIso: signedAt.toISOString(),
    });

    const signatureHash = crypto.createHash("sha256").update(canonicalPayload).digest("hex");
    const storedSignature = JSON.stringify({
      signerName,
      signatureHash,
      signatureData: signatureData || `SIGNED:${signerName}`,
      signedAtIso: signedAt.toISOString(),
    });

    const updatedPlan = await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: {
        status: "accepted",
        patientSignature: storedSignature,
        patientSignedAt: signedAt,
      },
      include: { items: true, clinician: { select: { fullName: true, roleTitle: true, gdcNumber: true } } },
    });

    // Persist signed certificate in DocumentVault
    const certKey = `plans/${profile.id}/treatment-plan-${plan.id}-signed.json`;
    const uploadedCert = await objectStorage.upload(certKey, canonicalPayload, "application/json", {
      planId: plan.id,
      signatureHash,
    });

    await prisma.documentVault.create({
      data: {
        patientId: profile.id,
        docType: "treatment_plan_consent",
        title: `Signed Treatment Plan — ${plan.title}`,
        fileKey: uploadedCert.key,
        fileSizeBytes: String(uploadedCert.size),
      },
    });

    await createAuditLogWithIntegrity({
      action: "treatment_plan.signed",
      actorId: req.user!.sub,
      resourceId: plan.id,
      sessionId: req.user!.sessionId,
      ipHash: pseudonymiseIp(req.ip || ""),
      metadata: {
        signerName,
        signatureHash,
        totalCostPence: plan.totalCostPence,
      },
    });

    return res.json({
      ...updatedPlan,
      signatureHash: `SHA256:${signatureHash.slice(0, 16)}`,
      signerName,
      signedAt: signedAt.toISOString(),
    });
  }
);

// ─── POST /api/patients/:id/plans/:planId/decline ───────────────────────────
router.post(
  "/:id/plans/:planId/decline",
  requireAuth,
  validateParams(planActionParamsSchema),
  async (req: AuthRequest, res: Response) => {
    const profile = await requirePatientRecordAccess(req, res);
    if (!profile) return;

    const planId = String(req.params.planId);
    const plan = await prisma.treatmentPlan.findFirst({
      where: { id: planId, patientId: profile.id },
    });

    if (!plan) {
      return res.status(404).json({ error: "Treatment plan not found" });
    }

    const updatedPlan = await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: { status: "declined" },
      include: { items: true },
    });

    await createAuditLogWithIntegrity({
      action: "treatment_plan.declined",
      actorId: req.user!.sub,
      resourceId: plan.id,
      sessionId: req.user!.sessionId,
      ipHash: pseudonymiseIp(req.ip || ""),
      metadata: {},
    });

    return res.json(updatedPlan);
  }
);

// ─── GET /api/patients/:id/documents ─────────────────────────────────────────
router.get("/:id/documents", requireAuth, validateParams(patientIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const docs = await prisma.documentVault.findMany({
    where: { patientId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const result = await Promise.all(
    docs.map(async (d) => {
      const signed = await objectStorage.getSignedUrl(d.fileKey, 900); // 15-minute TTL
      return {
        id: d.id,
        docType: d.docType,
        title: d.title,
        fileSizeBytes: d.fileSizeBytes,
        createdAt: d.createdAt,
        downloadUrl: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
      };
    })
  );

  return res.json(result);
});

export default router;
