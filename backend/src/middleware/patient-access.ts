import type { PatientProfile } from "@prisma/client";
import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "./auth";

/**
 * Patients access their own records. Clinicians require a recorded appointment
 * or treatment plan with the patient. Administrative and van operator roles do
 * not receive clinical-record access by default.
 */
// Decisions log #10: a clinician may read a patient's record while they have
// an upcoming or recent visit together, up to 12 months after the last one.
export const CLINICIAN_ACCESS_WINDOW_MONTHS = 12;
const CARE_STATUSES = ["confirmed", "in_progress", "completed", "no_show"] as const;

export function clinicianAccessWindowStart(now = new Date()): Date {
  const start = new Date(now);
  start.setMonth(start.getMonth() - CLINICIAN_ACCESS_WINDOW_MONTHS);
  return start;
}

/** True when the clinician has a booked or recent visit (or plan) with the patient. */
export async function hasCareRelationship(clinicianId: string, patientId: string, now = new Date()): Promise<boolean> {
  const since = clinicianAccessWindowStart(now);
  const appointment = await prisma.appointment.findFirst({
    where: { patientId, clinicianId, status: { in: [...CARE_STATUSES] }, startTimeUtc: { gte: since } },
    select: { id: true },
  });
  if (appointment) return true;
  const plan = await prisma.treatmentPlan.findFirst({
    where: { patientId, clinicianId, createdAt: { gte: since } },
    select: { id: true },
  });
  return plan !== null;
}

/** Patient profile ids the clinician may currently read. */
export async function patientsInClinicianCare(clinicianId: string, now = new Date()): Promise<string[]> {
  const since = clinicianAccessWindowStart(now);
  const [appointments, plans] = await Promise.all([
    prisma.appointment.findMany({
      where: { clinicianId, status: { in: [...CARE_STATUSES] }, startTimeUtc: { gte: since } },
      select: { patientId: true },
      distinct: ["patientId"],
    }),
    prisma.treatmentPlan.findMany({
      where: { clinicianId, createdAt: { gte: since } },
      select: { patientId: true },
      distinct: ["patientId"],
    }),
  ]);
  return [...new Set([...appointments, ...plans].map((r) => r.patientId))];
}

export async function requirePatientRecordAccess(
  req: AuthRequest,
  res: Response
): Promise<PatientProfile | null> {
  const requestedId = String(req.params.id);
  const actor = req.user!;

  const profile =
    (await prisma.patientProfile.findUnique({ where: { userId: requestedId } })) ??
    (await prisma.patientProfile.findUnique({ where: { id: requestedId } }));
  if (!profile) {
    res.status(404).json({ error: "Patient not found" });
    return null;
  }

  if (actor.role === "patient" && (actor.sub === profile.userId || actor.sub === requestedId)) return profile;

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

  if (!(await hasCareRelationship(clinician.id, profile.id))) {
    res.status(403).json({ error: "No current care relationship with this patient" });
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

  const profile =
    typeof prisma.patientProfile.findFirst === "function"
      ? await prisma.patientProfile.findFirst({
          where: { OR: [{ userId: requestedUserId }, { id: requestedUserId }] },
        })
      : (await prisma.patientProfile.findUnique({ where: { userId: requestedUserId } })) ??
        (await prisma.patientProfile.findUnique({ where: { id: requestedUserId } }));
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

  // Require an active appointment (in_progress, or confirmed within today's window)
  const now = new Date();
  const windowBeforeStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours before
  const windowAfterEnd = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours after

  const activeAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: profile.id,
      clinicianId: clinician.id,
      OR: [
        { status: "in_progress" },
        {
          status: "confirmed",
          startTimeUtc: { lte: windowBeforeStart },
          endTimeUtc: { gte: windowAfterEnd },
        },
      ],
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
