import crypto from "crypto";
import { prisma } from "../lib/prisma";

describe("CS-05: Schema defaults without fabricated clinical or financial values (DB-5)", () => {
  const tag = crypto.randomUUID().slice(0, 8);
  let userId: string;
  let clinicianId: string;
  let serviceId: string;
  let appointmentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `schema-defaults-${tag}@example.test`,
        passwordHash: "x",
        role: "patient",
      },
    });
    userId = user.id;

    const clinicianUser = await prisma.user.create({
      data: {
        email: `schema-clinician-${tag}@example.test`,
        passwordHash: "x",
        role: "clinician",
      },
    });

    const clinician = await prisma.clinicianProfile.create({
      data: {
        userId: clinicianUser.id,
        fullName: "Dr Schema Default",
        gdcNumber: "123456",
        roleTitle: "Dentist",
      },
    });
    clinicianId = clinician.id;

    const patientProfile = await prisma.patientProfile.create({
      data: {
        userId,
        firstName: "Test",
        lastName: "Defaults",
      },
    });

    const service = await prisma.service.findFirstOrThrow();
    serviceId = service.id;

    const appt = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        clinicianId,
        serviceId,
        channel: "clinic",
        startTimeUtc: new Date(),
        endTimeUtc: new Date(Date.now() + 1800000),
        status: "confirmed",
        totalPricePence: 5000,
      },
    });
    appointmentId = appt.id;
  });

  afterAll(async () => {
    await prisma.financingApplication.deleteMany({ where: { userId } });
    await prisma.prescription.deleteMany({ where: { appointmentId } });
    await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    await prisma.patientProfile.deleteMany({ where: { userId } });
    await prisma.clinicianProfile.deleteMany({ where: { id: clinicianId } });
    await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  });

  it("FinancingApplication defaults to £0 limit and 'pending' status", async () => {
    const application = await prisma.financingApplication.create({
      data: {
        userId,
        treatmentCostPence: 50000,
        durationMonths: 12,
        monthlyPence: 4166,
        agreementRef: `AGREE-TEST-${tag}`,
      },
    });

    expect(application.approvedLimitPence).toBe(0);
    expect(application.status).toBe("pending");
  });

  it("Prescription dispatchedAt defaults to null and createdAt is set", async () => {
    const rx = await prisma.prescription.create({
      data: {
        appointmentId,
        clinicianId,
        medicationName: "Amoxicillin 500mg",
        dosageInstructions: "Take 1 three times daily",
        dispensingPharmacy: "Boots Pharmacy",
      },
    });

    expect(rx.dispatchedAt).toBeNull();
    expect(rx.createdAt).toBeInstanceOf(Date);
  });
});
