// CS-46: Core Mobile Domain Integrity Test Suite
import { formatGbp } from "./src/features/booking/booking-api";
import { personalInfoSchema } from "./src/features/account/account-schemas";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n🏥 RUNNING PAV DENTAL CORE DOMAIN INTEGRITY SUITE...\n");

// 1. Currency & Pricing Integrity (real module)
assert(formatGbp(6500) === "£65.00", "Formats £65.00 examination price");
assert(formatGbp(2000) === "£20.00", "Formats £20.00 deposit amount");
assert(formatGbp(49500) === "£495.00", "Formats £495.00 whitening price");
assert(formatGbp(0) === "£0.00", "Formats £0.00 baseline");

// 2. Personal Info Schema Core Validation (real schema)
const validPatient = {
  firstName: "Jane",
  lastName: "Doe",
  dob: "1990-01-01",
  gender: "female" as const,
  addressLine1: "10 Downing Street",
  city: "London",
  postcode: "SW1A 2AA",
  phone: "+447911123456",
};
assert(personalInfoSchema.safeParse(validPatient).success, "Valid patient profile parses successfully");
assert(!personalInfoSchema.safeParse({ ...validPatient, postcode: "INVALID" }).success, "Rejects invalid UK postcode");
assert(!personalInfoSchema.safeParse({ ...validPatient, firstName: "" }).success, "Rejects empty first name");
assert(!personalInfoSchema.safeParse({ ...validPatient, phone: "123" }).success, "Rejects short phone number");

console.log("\n🎉 CORE DOMAIN INTEGRITY TESTS PASSED SUCCESSFULLY (0 FAILURES)!\n");
