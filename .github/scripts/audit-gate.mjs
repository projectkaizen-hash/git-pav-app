// CI dependency gate, run from inside one app folder:
//   node ../.github/scripts/audit-gate.mjs
// Fails on any high or critical advisory in the app's production dependencies,
// unless the app's audit-allowlist.json lists it with a reason (for example a
// fix that needs a major upgrade, or code the app never loads). Each entry has
// a review date; past it the gate warns, so someone looks again.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);

let report;
try {
  report = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = error.stdout;
}
const parsed = JSON.parse(report || "{}");
if (parsed.error) {
  console.error(`npm audit failed: ${parsed.error.summary ?? JSON.stringify(parsed.error)}`);
  process.exit(1);
}

const allowlist = existsSync("audit-allowlist.json") ? JSON.parse(readFileSync("audit-allowlist.json", "utf8")) : [];
const allowed = new Map(allowlist.map((entry) => [entry.advisory, entry]));

const found = new Map();
for (const vuln of Object.values(parsed.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
    const id = via.url?.split("/").pop() ?? `${via.name}:${via.source}`;
    found.set(id, via);
  }
}

const today = new Date().toISOString().slice(0, 10);
let blocked = 0;
for (const [id, via] of found) {
  const entry = allowed.get(id);
  if (!entry) {
    blocked += 1;
    console.error(`BLOCKED ${via.severity} ${id} ${via.name} ${via.range}: ${via.title}`);
    continue;
  }
  console.log(`allowed ${via.severity} ${id} ${via.name}: ${entry.reason}`);
  if (entry.reviewBy && entry.reviewBy < today) console.warn(`  review date ${entry.reviewBy} has passed; check for a fix`);
}
for (const id of allowed.keys()) {
  if (!found.has(id)) console.warn(`allowlist entry ${id} no longer matches anything; remove it`);
}

if (blocked > 0) {
  console.error(`${blocked} high or critical advisories. Update the dependency, or add it to audit-allowlist.json with a reason.`);
  process.exit(1);
}
console.log(`No unreviewed high or critical advisories (${found.size} allowlisted).`);
