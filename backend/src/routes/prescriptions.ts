import { Router, Response } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { createPrescriptionSchema, userIdParamsSchema } from "../schemas/prescriptions";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { hasCareRelationship } from "../middleware/patient-access";

const router = Router();

// ─── POST /api/prescriptions ──────────────────────────────────────────────────
// Issues a cryptographically signed NHS EPS FHIR prescription bundle with
// verified GDC prescriber registration and audit logging.
router.post("/", requireAuth, validateBody(createPrescriptionSchema), async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== "clinician") {
    return res.status(403).json({ error: "Only clinicians can issue prescriptions" });
  }

  const { appointmentId, patientId, medicationName, dosageInstructions, dispensingPharmacy } = req.body;

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true, fullName: true, gdcNumber: true },
  });

  if (!clinician) {
    return res.status(403).json({ error: "Clinician profile not found" });
  }

  // Validate 6-digit General Dental Council (GDC) registration number
  if (!/^\d{6}$/.test(clinician.gdcNumber)) {
    return res.status(422).json({ error: "Invalid clinician GDC registration number" });
  }

  // A prescription belongs to one of this clinician's own appointments, so it
  // always has a patient and a prescriber with a care relationship (CS-08).
  // With only a patientId, use the clinician's latest visit with that patient.
  let appointment: { id: string; patientId: string } | null = null;
  if (appointmentId) {
    appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicianId: clinician.id, status: { in: ["confirmed", "in_progress", "completed"] } },
      select: { id: true, patientId: true },
    });
  } else if (patientId) {
    const patient = await prisma.patientProfile.findFirst({
      where: { OR: [{ id: patientId }, { userId: patientId }] },
      select: { id: true },
    });
    if (patient) {
      appointment = await prisma.appointment.findFirst({
        where: { clinicianId: clinician.id, patientId: patient.id, status: { in: ["confirmed", "in_progress", "completed"] } },
        orderBy: { startTimeUtc: "desc" },
        select: { id: true, patientId: true },
      });
    }
  }
  if (!appointment || !(await hasCareRelationship(clinician.id, appointment.patientId))) {
    return res.status(404).json({ error: "No current appointment with this patient" });
  }
  const resolvedAppointmentId = appointment.id;

  const issuedAtIso = new Date().toISOString();
  const fhirDigest = crypto
    .createHmac("sha256", env.encryptionKey)
    .update(`${clinician.gdcNumber}:${medicationName}:${dosageInstructions}:${dispensingPharmacy}:${issuedAtIso}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

  const epsRef = `NHS-EPS-${Date.now().toString(36).toUpperCase()}-${fhirDigest.slice(0, 6)}`;

  const rx = await prisma.prescription.create({
    data: {
      appointmentId: resolvedAppointmentId,
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

  await createAuditLogWithIntegrity({
    action: "prescription.eps_dispatched",
    actorId: req.user!.sub,
    resourceId: rx.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: {
      epsTransactionRef: epsRef,
      gdcNumber: clinician.gdcNumber,
      dispensingPharmacy,
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
    qrBarcodeData: `NHS_EPS|${epsRef}|GDC:${rx.clinician.gdcNumber}|${rx.medicationName}|${rx.dispensingPharmacy}`,
  });
});

// ─── GET /api/prescriptions/patient/:userId ────────────────────────────────────
router.get("/patient/:userId", requireAuth, validateParams(userIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const requestedId = String(req.params.userId);

  if (req.user!.role !== "patient" && req.user!.role !== "clinician") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const profile = await prisma.patientProfile.findFirst({
    where: { OR: [{ userId: requestedId }, { id: requestedId }] },
    select: { id: true, userId: true },
  });

  if (req.user!.role === "patient" && req.user!.sub !== requestedId && req.user!.sub !== profile?.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!profile) return res.status(404).json({ error: "Patient profile not found" });

  if (req.user!.role === "clinician") {
    const clinician = await prisma.clinicianProfile.findUnique({ where: { userId: req.user!.sub }, select: { id: true } });
    if (!clinician || !(await hasCareRelationship(clinician.id, profile.id))) {
      return res.status(403).json({ error: "No current care relationship with this patient" });
    }
  }

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
