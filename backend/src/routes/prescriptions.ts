import { Router, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { createPrescriptionSchema, userIdParamsSchema } from "../schemas/prescriptions";

const router = Router();

// ─── POST /api/prescriptions ──────────────────────────────────────────────────
// Issues an e-prescription - requires NHS EPS integration and authorized prescriber verification for production use
router.post("/", requireAuth, validateBody(createPrescriptionSchema), async (req: AuthRequest, res: Response) => {
  if (!["clinician", "admin"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Only clinicians can issue prescriptions" });
  }

  const { appointmentId, medicationName, dosageInstructions, dispensingPharmacy } = req.body;

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true, fullName: true, gdcNumber: true },
  });

  if (!clinician) {
    return res.status(403).json({ error: "Clinician profile not found" });
  }

  const epsRef = `NHS-EPS-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  const rx = await prisma.prescription.create({
    data: {
      appointmentId: appointmentId || null,
      clinicianId: clinician.id,
      medicationName,
      dosageInstructions,
      dispensingPharmacy,
      epsTransactionRef: epsRef,
    },
    include: {
      clinician: { select: { fullName: true, gdcNumber: true } },
    },
  });

  return res.status(201).json({
    id: rx.id,
    medicationName: rx.medicationName,
    dosageInstructions: rx.dosageInstructions,
    dispensingPharmacy: rx.dispensingPharmacy,
    epsTransactionRef: rx.epsTransactionRef,
    dispatchedAt: rx.dispatchedAt,
    prescriber: rx.clinician.fullName,
    gdcNumber: rx.clinician.gdcNumber,
    status: "DISPATCHED_TO_PHARMACY",
    qrBarcodeData: `NHS_EPS|${epsRef}|${rx.medicationName}|${rx.dispensingPharmacy}`,
  });
});

// ─── GET /api/prescriptions/patient/:userId ────────────────────────────────────
router.get("/patient/:userId", requireAuth, validateParams(userIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const requestedId = String(req.params.userId);

  if (req.user!.role === "patient" && req.user!.sub !== requestedId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: requestedId },
    select: { id: true },
  });

  if (!profile) return res.status(404).json({ error: "Patient profile not found" });

  const prescriptions = await prisma.prescription.findMany({
    where: {
      appointment: { patientId: profile.id },
    },
    include: {
      clinician: { select: { fullName: true, gdcNumber: true } },
    },
    orderBy: { dispatchedAt: "desc" },
  });

  return res.json(prescriptions);
});

export default router;

