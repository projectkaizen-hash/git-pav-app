// Runs with tsx (see package.json test:clinical). Imports the real module.
import { normalizePrescription, NOT_RECORDED } from "../features/records/prescription-normalize";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`❌ FAILED: ${message}`);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n💊 PRESCRIPTION DISPLAY (no invented clinical values)\n");

const empty = normalizePrescription({ id: "rx-1" });
assert(empty.drugName === NOT_RECORDED, "Missing drug shows Not recorded, not a default medicine");
assert(empty.dosage === NOT_RECORDED, "Missing dose shows Not recorded");
assert(empty.course === NOT_RECORDED, "Missing course length shows Not recorded");
assert(empty.prescriber === NOT_RECORDED, "Missing prescriber shows Not recorded, not a named dentist");
assert(empty.pharmacy === NOT_RECORDED, "Missing pharmacy shows Not recorded");
assert(empty.issuedIso === null, "Missing issue date stays missing instead of today");
assert(empty.status === "active", "Without dates a prescription is not guessed to be finished");

const real = normalizePrescription({
  id: "rx-2",
  medicationName: "Test-drug 100mg",
  dosageInstructions: "Once daily",
  dispensingPharmacy: "Example Pharmacy",
  dispatchedAt: "2020-01-01T00:00:00.000Z",
  durationDays: 7,
  clinician: { fullName: "Test Clinician", gdcNumber: "999991" },
});
assert(real.drugName === "Test-drug 100mg", "Uses the recorded medicine");
assert(real.prescriber === "Test Clinician (GDC 999991)", "Uses the recorded prescriber and their own GDC number");
assert(real.course === "7 days", "Course comes from the recorded duration");
assert(real.status === "completed", "A course past its recorded length is completed");

const noGdc = normalizePrescription({ id: "rx-3", clinician: { fullName: "Test Clinician" } });
assert(noGdc.prescriber === "Test Clinician", "No invented GDC number when none is recorded");

if (failures > 0) process.exit(1);
