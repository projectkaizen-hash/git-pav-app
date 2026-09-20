import { getMobilePortalPath, isAllowedInPortal, mobilePortalPathByRole } from "../features/auth/auth-routing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n📱 RUNNING MOBILE ROUTING TESTS...\n");

// Mobile Routing Logic Tests
assert(getMobilePortalPath("patient") === "/(patient)/(tabs)/home", "routes patient accounts to patient portal");
assert(getMobilePortalPath("clinician") === "/(clinician)/schedule", "routes clinician accounts to clinician portal");
assert(getMobilePortalPath("operator") === "/(operator)/route", "routes operator accounts to operator portal");
assert(getMobilePortalPath("admin") === "/(auth)/access-denied", "routes admin accounts to access denied (web-dashboard only)");
assert(getMobilePortalPath(undefined as any) === "/(auth)/access-denied", "handles undefined role by returning access denied");

assert(isAllowedInPortal("patient", "patient") === true, "allows patient role in patient portal");
assert(isAllowedInPortal("patient", "clinician") === false, "denies patient role in clinician portal");
assert(isAllowedInPortal("patient", "operator") === false, "denies patient role in operator portal");
assert(isAllowedInPortal("clinician", "clinician") === true, "allows clinician role in clinician portal");
assert(isAllowedInPortal("clinician", "patient") === false, "denies clinician role in patient portal");
assert(isAllowedInPortal("operator", "operator") === true, "allows operator role in operator portal");
assert(isAllowedInPortal("operator", "patient") === false, "denies operator role in patient portal");
assert(isAllowedInPortal(undefined, "patient") === false, "denies undefined role in patient portal");
assert(isAllowedInPortal(undefined, "clinician") === false, "denies undefined role in clinician portal");
assert(isAllowedInPortal(undefined, "operator") === false, "denies undefined role in operator portal");

assert(mobilePortalPathByRole.patient === "/(patient)/(tabs)/home", "has correct path mapping for patient");
assert(mobilePortalPathByRole.clinician === "/(clinician)/schedule", "has correct path mapping for clinician");
assert(mobilePortalPathByRole.operator === "/(operator)/route", "has correct path mapping for operator");
assert(!("admin" in mobilePortalPathByRole), "does not include admin in mobile portal paths");

// Deep Link Security Tests
assert(isAllowedInPortal("patient", "clinician") === false, "prevents patients from accessing clinician portal");
assert(isAllowedInPortal("clinician", "patient") === false, "prevents clinicians from accessing patient portal");
assert(isAllowedInPortal("operator", "clinician") === false, "prevents operators from accessing clinician portal");
assert(isAllowedInPortal("clinician", "operator") === false, "prevents clinicians from accessing operator portal");

assert(getMobilePortalPath("admin") === "/(auth)/access-denied", "routes admin accounts to access denied page");
assert(isAllowedInPortal("admin", "patient") === false, "denies admin access to patient portal");
assert(isAllowedInPortal("admin", "clinician") === false, "denies admin access to clinician portal");
assert(isAllowedInPortal("admin", "operator") === false, "denies admin access to operator portal");

console.log("\n🎉 ALL 21 MOBILE ROUTING TESTS PASSED SUCCESSFULLY (0 FAILURES)!\n");
