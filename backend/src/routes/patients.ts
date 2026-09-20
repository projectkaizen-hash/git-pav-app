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
} from "../schemas/patients";

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
    where: { id: requestedId },
    select: { email: true, phone: true },
  });

  return res.json({
    id: profile.id,
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dob: profile.dob,
    gender: profile.gender,
    email: user?.email,
    phone: user?.phone,
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
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const {
    firstName, lastName, dob, gender,
    addressLine1, addressLine2, city, postcode,
    emergencyContactName, emergencyContactPhone,
    medicalHistory, consents,
  } = req.body;

  const updated = await prisma.patientProfile.update({
    where: { id: profile.id },
    data: {
      firstName, lastName,
      dob: dob ? new Date(dob) : undefined,
      gender,
      addressLine1, addressLine2, city, postcode,
      emergencyContactName, emergencyContactPhone,
      medicalHistory: medicalHistory ?? undefined,
      consents: consents ?? undefined,
    },
  });

  return res.json({ id: updated.id, updatedAt: updated.updatedAt });
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
      clinician: { select: { fullName: true, roleTitle: true } },
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

// ─── GET /api/patients/:id/documents ─────────────────────────────────────────
router.get("/:id/documents", requireAuth, validateParams(patientIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const profile = await requirePatientRecordAccess(req, res);
  if (!profile) return;

  const docs = await prisma.documentVault.findMany({
    where: { patientId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const result = docs.map((d) => ({
    id: d.id,
    docType: d.docType,
    title: d.title,
    fileSizeBytes: d.fileSizeBytes,
    createdAt: d.createdAt,
    downloadUrl: `${process.env.STORAGE_CDN_URL ?? ""}/${d.fileKey}?token=presigned_placeholder`,
  }));

  return res.json(result);
});

export default router;
