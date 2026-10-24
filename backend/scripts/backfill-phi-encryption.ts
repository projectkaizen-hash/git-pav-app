/**
 * Backfill script for PHI encryption at rest.
 * Idempotently scans patient profiles, appointments, messages, and van requests,
 * encrypting unencrypted sensitive data in place.
 */

import { prisma } from "../src/lib/prisma";
import { encryptField, isEncryptedEnvelope } from "../src/lib/encryption";

async function backfillPatientProfiles() {
  console.log("Backfilling patient_profiles.medical_history...");
  const profiles = await prisma.patientProfile.findMany({
    where: { medicalHistory: { not: null as any } },
    select: { id: true, medicalHistory: true },
  });

  let count = 0;
  for (const profile of profiles) {
    if (profile.medicalHistory && !isEncryptedEnvelope(profile.medicalHistory)) {
      const encrypted = await encryptField(profile.medicalHistory);
      await prisma.patientProfile.update({
        where: { id: profile.id },
        data: { medicalHistory: encrypted as any },
      });
      count++;
    }
  }
  console.log(`Updated ${count} patient profile(s).`);
}

async function backfillAppointments() {
  console.log("Backfilling appointments (triage_data, access_details)...");
  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [
        { triageData: { not: null as any } },
        { accessDetails: { not: null as any } },
      ],
    },
    select: { id: true, triageData: true, accessDetails: true },
  });

  let count = 0;
  for (const appt of appointments) {
    const updateData: any = {};
    if (appt.triageData && !isEncryptedEnvelope(appt.triageData)) {
      updateData.triageData = await encryptField(appt.triageData);
    }
    if (appt.accessDetails && !isEncryptedEnvelope(appt.accessDetails)) {
      updateData.accessDetails = await encryptField(appt.accessDetails);
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: updateData,
      });
      count++;
    }
  }
  console.log(`Updated ${count} appointment(s).`);
}

async function backfillMessages() {
  console.log("Backfilling messages.body...");
  const messages = await prisma.message.findMany({
    select: { id: true, body: true },
  });

  let count = 0;
  for (const msg of messages) {
    if (msg.body && !msg.body.startsWith('{"ciphertext":') && !msg.body.includes('"algorithm":')) {
      const encrypted = await encryptField(msg.body);
      await prisma.message.update({
        where: { id: msg.id },
        data: { body: JSON.stringify(encrypted) },
      });
      count++;
    }
  }
  console.log(`Updated ${count} message(s).`);
}

async function backfillVanRequests() {
  console.log("Backfilling van_service_requests (notes, access_details)...");
  const requests = await prisma.vanServiceRequest.findMany({
    select: { id: true, notes: true, accessDetails: true },
  });

  let count = 0;
  for (const req of requests) {
    const updateData: any = {};
    if (req.notes && !req.notes.startsWith('{"ciphertext":') && !req.notes.includes('"algorithm":')) {
      const encrypted = await encryptField(req.notes);
      updateData.notes = JSON.stringify(encrypted);
    }
    if (req.accessDetails && !isEncryptedEnvelope(req.accessDetails)) {
      // If accessDetails has subfields (like gateCode / accessNotes), check and encrypt
      const accessObj = req.accessDetails as any;
      if (typeof accessObj === "object" && accessObj !== null) {
        let changed = false;
        const newAccess = { ...accessObj };
        if (newAccess.gateCode && !isEncryptedEnvelope(newAccess.gateCode)) {
          newAccess.gateCode = await encryptField(newAccess.gateCode);
          changed = true;
        }
        if (newAccess.accessNotes && !isEncryptedEnvelope(newAccess.accessNotes)) {
          newAccess.accessNotes = await encryptField(newAccess.accessNotes);
          changed = true;
        }
        if (changed) {
          updateData.accessDetails = newAccess;
        }
      }
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.vanServiceRequest.update({
        where: { id: req.id },
        data: updateData,
      });
      count++;
    }
  }
  console.log(`Updated ${count} van request(s).`);
}

async function main() {
  try {
    await backfillPatientProfiles();
    await backfillAppointments();
    await backfillMessages();
    await backfillVanRequests();
    console.log("PHI backfill completed successfully.");
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
