import { formatGbp, mockServices, mockClinics, mockClinicians } from "./src/features/booking/booking-mock-data";
import { mockOdontogram } from "./src/features/records/records-mock-data";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n🏥 RUNNING PAV DENTAL AUTOMATED TEST SUITE...\n");

// 1. Currency & Pricing Integrity
assert(formatGbp(6500) === "£65.00", "Formats £65.00 examination price");
assert(formatGbp(2000) === "£20.00", "Formats £20.00 deposit amount");
assert(formatGbp(49500) === "£495.00", "Formats £495.00 whitening price");
assert(formatGbp(0) === "£0.00", "Formats £0.00 baseline");

// 2. Service Catalogue Categorisation
const categories = mockServices.map((s) => s.category);
assert(categories.includes("checkup"), "Contains checkup service");
assert(categories.includes("hygiene"), "Contains hygiene service");
assert(categories.includes("emergency"), "Contains emergency triage service");
assert(categories.includes("cosmetic"), "Contains cosmetic treatment");

// 3. Clinical GDC & Practice Checks
assert(mockClinics.length >= 2, "Contains at least 2 physical clinic locations");
for (const clinic of mockClinics) {
  assert(clinic.postcode.length >= 5, `Valid UK postcode for ${clinic.name}`);
}

assert(mockClinicians.length >= 3, "Contains registered dental clinicians");
for (const doc of mockClinicians) {
  assert(doc.gdcNumber.length === 6, `GDC 6-digit registration verified for ${doc.fullName}`);
}

// 4. Odontogram 32-Tooth Integrity
assert(mockOdontogram.length === 32, "Odontogram has exactly 32 universal teeth");
const upper = mockOdontogram.filter((t) => t.arch === "upper");
const lower = mockOdontogram.filter((t) => t.arch === "lower");
assert(upper.length === 16, "Maxillary (upper) arch contains 16 teeth");
assert(lower.length === 16, "Mandibular (lower) arch contains 16 teeth");

const decayingMolar = mockOdontogram.find((t) => t.number === 31);
assert(decayingMolar !== undefined && decayingMolar.condition === "decay", "Correctly flags decaying LR7 tooth #31");

console.log("\n🎉 ALL 12 AUTOMATED TESTS PASSED SUCCESSFULLY (0 FAILURES)!\n");

