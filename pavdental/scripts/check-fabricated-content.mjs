#!/usr/bin/env node
// Fails when screens or components hardcode clinical content that must come
// from a patient's record: named staff, GDC numbers, drugs, diagnoses on a
// specific tooth, or "AI" clinical claims (CS-06). Tests and fixtures are not
// scanned. Synthetic examples in placeholders should use neutral wording.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app", "src/components"];
const RULES = [
  { name: "named staff member", re: /\b(Tariq|Emily Carter|Alexander Wright)\b/ },
  { name: "hardcoded GDC number", re: /GDC\s*#?\s*\d{4,}/ },
  {
    name: "drug name",
    // Allergy pickers list common allergens for the patient to choose from.
    allow: ["src/components/forms/MedicalHistoryForm.tsx", "src/app/(onboarding)/medical-history.tsx"],
    re: /\b(amoxicillin|metronidazole|clindamycin|ibuprofen|paracetamol|co-codamol|chlorhexidine|fluconazole|penicillin|duraphat)\b/i,
  },
  { name: "tooth-specific finding", re: /\b(LR|LL|UR|UL)[1-8]\b|Tooth #\d+(?!\})/ },
  { name: "AI clinical claim", re: /24\/7 AI/i },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__") continue;
      yield* walk(path);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      yield path;
    }
  }
}

const failures = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.allow?.includes(relative(".", file))) continue;
          if (rule.re.test(line)) failures.push(`${relative(".", file)}:${i + 1} ${rule.name}: ${line.trim()}`);
        }
      });
  }
}

if (failures.length) {
  console.error("Hardcoded clinical content found. Load it from the patient's record instead:\n");
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("No hardcoded clinical content found.");
