// backend/scripts/backfill-consents.ts
// Migrates legacy patient_profiles.consents JSON into versioned consent_records (PT-4 / CO-1).
// Safe to re-run; skips profiles/consent types that already have a ConsentRecord.

import { prisma } from "../src/lib/prisma";

async function main() {
  const isApply = process.argv.includes("--apply");
  console.log(`[Backfill Consents] Mode: ${isApply ? "APPLY" : "DRY RUN (pass --apply to execute)"}`);

  const profilesWithConsents = await prisma.patientProfile.findMany({
    where: {
      consents: { not: null as any },
    },
    select: {
      id: true,
      consents: true,
    },
  });

  console.log(`Found ${profilesWithConsents.length} patient profiles with legacy consents JSON.`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const profile of profilesWithConsents) {
    if (!profile.consents || typeof profile.consents !== "object") continue;

    const consentsObj = profile.consents as Record<string, unknown>;
    for (const [rawType, rawValue] of Object.entries(consentsObj)) {
      const consentType = rawType.trim();
      const isGranted = Boolean(rawValue);

      // Check if consent record already exists
      const existing = await prisma.consentRecord.findFirst({
        where: {
          patientProfileId: profile.id,
          consentType,
        },
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      if (isApply) {
        await prisma.consentRecord.create({
          data: {
            patientProfileId: profile.id,
            consentType,
            version: 1,
            lawfulBasis: "consent",
            isGranted,
            ipAddress: null,
            metadata: { backfilledFrom: "patient_profiles.consents" },
          },
        });
      }

      totalMigrated++;
    }
  }

  console.log(`[Backfill Consents] Completed. Created: ${totalMigrated}, Skipped (already existed): ${totalSkipped}`);
}

main()
  .catch((err) => {
    console.error("Backfill error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
