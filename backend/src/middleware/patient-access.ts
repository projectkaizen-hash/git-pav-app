import type { PatientProfile } from "@prisma/client";
import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "./auth";

/**
 * Patients access their own records. Clinicians require a recorded appointment
 * or treatment plan with the patient. Administrative and van operator roles do
 * not receive clinical-record access by default.
 */
export async function requirePatientRecordAccess(
  req: AuthRequest,
  res: Response
): Promise<PatientProfile | null> {
  const requestedUserId = String(req.params.id);
  const actor = req.user!;

  const profile = await prisma.patientProfile.findUnique({ where: { userId: requestedUserId } });
  if (!profile) {
    res.status(404).json({ error: "Patient not found" });
    return null;
  }

  if (actor.role === "patient" && actor.sub === requestedUserId) return profile;

  if (actor.role !== "clinician") {
    res.status(403).json({ error: "Clinical record access is not permitted for this role" });
    return null;
  }

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: actor.sub },
    select: { id: true },
  });
  if (!clinician) {
    res.status(403).json({ error: "Clinician profile required" });
    return null;
  }

  const careRelationship = await prisma.appointment.findFirst({
    where: { patientId: profile.id, clinicianId: clinician.id },
    select: { id: true },
  }) ?? await prisma.treatmentPlan.findFirst({
    where: { patientId: profile.id, clinicianId: clinician.id },
    select: { id: true },
  });

  if (!careRelationship) {
    res.status(403).json({ error: "No care relationship with this patient" });
    return null;
  }

  return profile;
}

/**
 * Requires clinicians to have an active appointment with the patient
 * before allowing clinical record changes (odontogram, treatment plans, etc.)
 * This ensures clinical changes are made in the context of a live consultation.
 */
export async function requireActiveAppointmentContext(
  req: AuthRequest,
  res: Response
): Promise<{ profile: PatientProfile; appointmentId: string } | null> {
  const requestedUserId = String(req.params.id);
  const actor = req.user!;

  // Only clinicians can make clinical record changes
  if (actor.role !== "clinician") {
    res.status(403).json({ error: "Only clinicians can modify clinical records" });
    return null;
  }

  const profile = await prisma.patientProfile.findUnique({ where: { userId: requestedUserId } });
  if (!profile) {
    res.status(404).json({ error: "Patient not found" });
    return null;
  }

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: actor.sub },
    select: { id: true },
  });
  if (!clinician) {
    res.status(403).json({ error: "Clinician profile required" });
    return null;
  }

  // Require an active appointment (confirmed or in_progress)
  // Note: checked_in status would be added in a future migration
  const activeAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: profile.id,
      clinicianId: clinician.id,
      status: { in: ['confirmed', 'in_progress'] },
    },
    select: { id: true },
  });

  if (!activeAppointment) {
    res.status(403).json({ 
      error: "Clinical record changes require an active appointment context",
      message: "Start or check in to an appointment before modifying clinical records"
    });
    return null;
  }

  return { profile, appointmentId: activeAppointment.id };
}
