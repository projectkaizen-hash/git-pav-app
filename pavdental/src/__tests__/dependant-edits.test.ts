/**
 * Test: CS-34 editing a dependant sends only what the guardian changed.
 */
import { changedDependantFields } from "../features/account/dependant-edits";
import type { DependantItem } from "../features/account/account-api";

let passed = 0;
let failed = 0;

function assert(desc: string, condition: boolean) {
  if (condition) {
    console.log(`✓ PASSED: ${desc}`);
    passed++;
  } else {
    console.error(`✗ FAILED: ${desc}`);
    failed++;
  }
}

const original: DependantItem = {
  id: "dep_1",
  firstName: "Sam",
  lastName: "Example",
  dob: "2018-06-15T00:00:00.000Z",
  relationship: "Son",
  consentSigned: true,
};
const unchanged = { firstName: "Sam", lastName: "Example", dob: "2018-06-15", relationship: "Son" as const };

assert("No changes sends nothing", Object.keys(changedDependantFields(original, unchanged)).length === 0);
assert(
  "Whitespace around unchanged names isn't a change",
  Object.keys(changedDependantFields(original, { ...unchanged, firstName: " Sam ", lastName: "Example " })).length === 0
);

const renamed = changedDependantFields(original, { ...unchanged, firstName: "Samuel" });
assert("A changed first name is the only field sent", JSON.stringify(renamed) === JSON.stringify({ firstName: "Samuel" }));

const moved = changedDependantFields(original, { ...unchanged, dob: "2018-06-16", relationship: "Ward" });
assert("A changed date of birth is sent", moved.dob === "2018-06-16");
assert("A changed relationship is sent", moved.relationship === "Ward");

const legacy = changedDependantFields({ ...original, relationship: "Other" }, { ...unchanged, relationship: "Other" });
assert("A legacy 'Other' relationship is never sent back", !("relationship" in legacy));

console.log(`\n${failed === 0 ? "🎉 ALL" : "❌ SOME"} DEPENDANT EDIT TESTS ${failed === 0 ? "PASSED" : "FAILED"}: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
