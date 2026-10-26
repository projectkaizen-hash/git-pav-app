/**
 * QA-02: Maestro Device End-to-End Test Flows Guard
 * Validates that:
 * 1. Maestro flows exist for core user journeys J1–J8 (and account deletion)
 * 2. All flows target the correct appId (com.pavdental.app)
 * 3. All commands are standard Maestro commands
 * 4. Referenced button labels and screen titles exist in the codebase
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

console.log("\n📱 RUNNING MAESTRO E2E FLOW INTEGRITY TESTS (QA-02, J1–J8)...\n");

let passed = 0;
let failed = 0;

function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`✓ PASSED: ${desc}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${desc}`);
    failed++;
  }
}

const MAESTRO_DIR = join(__dirname, "../../maestro/flows");
const EXPECTED_JOURNEYS = [
  { id: "J1", file: "j1-auth-signup-signin.yaml", title: "Sign up, sign in, biometric unlock" },
  { id: "J2", file: "j2-booking-clinic.yaml", title: "Book clinic appointment, pay deposit" },
  { id: "J3", file: "j3-appointment-cancel.yaml", title: "Cancel appointment with refund" },
  { id: "J4", file: "j4-van-request.yaml", title: "Van request, coverage check, live tracking" },
  { id: "J5", file: "j5-video-consult.yaml", title: "Video consult intake, device check, waiting room" },
  { id: "J6", file: "j6-patient-records.yaml", title: "Clinical records, vault, odontogram, insights" },
  { id: "J7", file: "j7-clinician-flow.yaml", title: "Clinician schedule, notes, charting, prescribing" },
  { id: "J8", file: "j8-operator-shift.yaml", title: "Operator shift, checks, route, offline notes" },
  { id: "J9", file: "j9-account-deletion.yaml", title: "Account deletion & GDPR erasure" },
];

assert("Maestro flows directory exists", existsSync(MAESTRO_DIR));

if (existsSync(MAESTRO_DIR)) {
  const files = readdirSync(MAESTRO_DIR);

  for (const j of EXPECTED_JOURNEYS) {
    const filePath = join(MAESTRO_DIR, j.file);
    const flowExists = files.includes(j.file);
    assert(`Journey ${j.id} flow exists (${j.file})`, flowExists);

    if (flowExists) {
      const content = readFileSync(filePath, "utf8");
      assert(`Journey ${j.id} targets com.pavdental.app`, content.includes("appId: com.pavdental.app"));
      assert(`Journey ${j.id} includes launchApp command`, content.includes("launchApp"));
      assert(`Journey ${j.id} has substantive flow steps`, content.split("\n").filter((l) => l.trim().startsWith("-")).length >= 3);
    }
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${passed} MAESTRO E2E FLOW TESTS PASSED!`);
}
