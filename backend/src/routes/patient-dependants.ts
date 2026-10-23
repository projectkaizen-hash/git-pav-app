// backend/src/routes/patient-dependants.ts
// Dependants (family members under a responsible adult's account) CRUD.
// Mounted at /api/patients/dependants in server.ts.
//
// Contract (consumed by pavdental/src/features/account/account-api.ts):
// - GET    /api/patients/dependants        → DependantItem[]
// - POST   /api/patients/dependants        → DependantItem (201)
// - DELETE /api/patients/dependants/:id    → { success: true }
//
// A dependant's `consentSigned` mirrors whether a `guardian_consent`
// ConsentRecord exists for this dependant.

import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { ageInYears, DEPENDANT_MAX_AGE, GUARDIAN_MIN_AGE, parseIsoDate } from "../lib/age";

const router = Router();

const createDependantSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dob must be YYYY-MM-DD"),
    // Only a parent or guardian may add a child (decisions log #17).
    relationship: z.enum(["Son", "Daughter", "Ward"]),
    // The adult confirms they have parental responsibility for the child.
    consentSigned: z.literal(true, { errorMap: () => ({ message: "Confirm you are the child's parent or guardian" }) }),
  })
  .strict();

const dependantIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

async function getPatientProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// ─── GET /api/patients/dependants ────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const patientId = await getPatientProfileId(req.user.sub);
  if (!patientId) return res.status(403).json({ error: "Patient profile required" });

  const dependants = await prisma.dependant.findMany({
    where: { guardianId: patientId },
    orderBy: { createdAt: "asc" },
  });

  return res.json(
    dependants.map((d) => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      dob: d.dob,
      relationship: d.relationship,
      consentSigned: d.consentSigned,
    }))
  );
});

// ─── POST /api/patients/dependants ───────────────────────────────────────
router.post("/", requireAuth, validateBody(createDependantSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const guardian = await prisma.patientProfile.findUnique({
    where: { userId: req.user.sub },
    select: { id: true, dob: true },
  });
  if (!guardian) return res.status(403).json({ error: "Patient profile required" });
  const patientId = guardian.id;

  const { firstName, lastName, dob, relationship, consentSigned } = req.body;

  if (!guardian.dob) {
    return res.status(422).json({ error: "Add your date of birth to your profile before adding a child." });
  }
  if (ageInYears(guardian.dob) < GUARDIAN_MIN_AGE) {
    return res.status(403).json({ error: "Only a parent or guardian aged 18 or over can add a child." });
  }
  const childDob = parseIsoDate(dob);
  if (!childDob || childDob.getTime() > Date.now()) {
    return res.status(400).json({ error: "Enter a valid date of birth" });
  }
  if (ageInYears(childDob) >= DEPENDANT_MAX_AGE) {
    return res.status(422).json({
      error: "Only children under 16 can be added. Young people aged 16 or over can create their own account.",
    });
  }

  const dependant = await prisma.dependant.create({
    data: {
      guardianId: patientId,
      firstName,
      lastName,
      dob,
      relationship,
      consentSigned,
    },
  });

  return res.status(201).json({
    id: dependant.id,
    firstName: dependant.firstName,
    lastName: dependant.lastName,
    dob: dependant.dob,
    relationship: dependant.relationship,
    consentSigned: dependant.consentSigned,
  });
});

// ─── DELETE /api/patients/dependants/:id ─────────────────────────────────
router.delete("/:id", requireAuth, validateParams(dependantIdParamsSchema), async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const patientId = await getPatientProfileId(req.user.sub);
  if (!patientId) return res.status(403).json({ error: "Patient profile required" });

  const existing = await prisma.dependant.findUnique({ where: { id: String(req.params.id) } });
  if (!existing || existing.guardianId !== patientId) {
    return res.status(404).json({ error: "Dependant not found" });
  }

  await prisma.dependant.delete({ where: { id: existing.id } });
  return res.json({ success: true });
});

export default router;
