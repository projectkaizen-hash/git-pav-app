// Moves encrypted van access details (gate codes, door notes) onto the
// current encryption key (CS-13, EN-1). Run it after deploying CS-13, and
// again after changing KMS_KEY_ID. Old records keep decrypting without it;
// this just stops relying on the legacy derivation.
//
//   npm run rewrap:encrypted            # counts only, changes nothing
//   npm run rewrap:encrypted -- --apply # rewrites the wrapped keys
//
// Take a database backup before --apply on real data. It prints counts only.
import { rewrapVanAccessDetails } from "../src/lib/rewrap";
import { prisma } from "../src/lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");
  const report = await rewrapVanAccessDetails({ apply });
  console.log(JSON.stringify({ apply, ...report }));
  if (report.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Re-wrap failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
