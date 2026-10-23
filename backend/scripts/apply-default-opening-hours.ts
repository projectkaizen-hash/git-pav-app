// One-off after deploying CS-30: gives existing clinics the default opening
// hours and existing clinicians the default rota, so they stay bookable until
// their real rota is entered. Safe to run more than once.
//   npm run hours:defaults
import { PrismaClient } from "@prisma/client";
import { applyDefaultHours } from "../src/lib/default-hours";

const prisma = new PrismaClient();

applyDefaultHours(prisma)
  .then((result) => {
    console.log(`Default hours: ${result.clinics} clinic(s), ${result.clinicians} clinician(s), ${result.rows} row(s) added.`);
  })
  .catch((err) => {
    console.error("Default hours failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
