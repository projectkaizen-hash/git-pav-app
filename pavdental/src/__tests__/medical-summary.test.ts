// Runs with tsx (see package.json test:all). Imports the real module.
import { summariseMedicalHistory, describeList } from "../features/clinical/medical-summary";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`❌ FAILED: ${message}`);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n🏥 MEDICAL SUMMARY (what the prescriber sees)\n");

const missing = summariseMedicalHistory(null);
assert(missing.allergies === null, "No history means allergies are not recorded, not none");
assert(describeList(missing.allergies, "No known allergies") === "Not recorded", "Missing allergies render as Not recorded");

const profileForm = summariseMedicalHistory({
  hasAllergies: true,
  allergies: ["Latex"],
  allergyDetails: "Chlorhexidine; latex",
  isTakingMedications: true,
  medications: ["Warfarin"],
  conditions: ["Asthma"],
});
assert(
  JSON.stringify(profileForm.allergies) === JSON.stringify(["Latex", "Chlorhexidine"]),
  "Profile form allergies merge list and details, without duplicates"
);
assert(profileForm.medications?.[0] === "Warfarin", "Profile form medications are read");
assert(profileForm.conditions[0] === "Asthma", "Conditions are read");

const onboarding = summariseMedicalHistory({ hasAllergies: true, allergies: "Ibuprofen", isTakingMeds: false });
assert(onboarding.allergies?.[0] === "Ibuprofen", "Onboarding free-text allergy is read");
assert(JSON.stringify(onboarding.medications) === "[]", "Explicit no medications reads as none");
assert(describeList(onboarding.medications, "None") === "None", "Explicit none renders as None");

const flaggedOnly = summariseMedicalHistory({ hasAllergies: true });
assert(
  flaggedOnly.allergies !== null && flaggedOnly.allergies.length === 1,
  "A yes to allergies without detail is still shown as an allergy warning"
);

const declared = summariseMedicalHistory({ hasAllergies: false, allergies: [] });
assert(JSON.stringify(declared.allergies) === "[]", "Explicit no allergies reads as none");

const silent = summariseMedicalHistory({ gpSurgery: "Any" });
assert(silent.allergies === null && silent.medications === null, "Unanswered questions stay Not recorded");

if (failures > 0) process.exit(1);
