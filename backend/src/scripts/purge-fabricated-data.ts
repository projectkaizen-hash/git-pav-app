// One-off cleanup of data the API used to invent (CS-05, decisions log #3).
//
//   node dist/src/scripts/purge-fabricated-data.js           # dry run, prints counts
//   node dist/src/scripts/purge-fabricated-data.js --apply   # deletes and clears
//
// Take a database backup first: deleted rows cannot be restored by this script.
import { prisma } from "../lib/prisma";
import { purgeFabricatedData } from "../lib/purge-fabricated-data";

async function main() {
  const apply = process.argv.includes("--apply");
  const report = await purgeFabricatedData(prisma, { apply });
  console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", ...report }, null, 2));
}

main()
  .catch((err) => {
    console.error("Purge failed:", err instanceof Error ? err.name : "unknown error");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
