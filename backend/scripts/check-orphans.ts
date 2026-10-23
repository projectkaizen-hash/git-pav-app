// Counts rows whose user no longer exists, in the tables that gained a
// foreign key in 20261024010000_user_foreign_keys (CS-23, DB-1). Prints
// counts only. With --validate and no orphans, validates the keys.
// Orphans are left for a person to review: this never deletes anything.
import { PrismaClient } from "@prisma/client";

const CHECKS = [
  { table: "message_threads", column: "patient_user_id", constraint: "message_threads_patient_user_id_fkey" },
  { table: "financing_applications", column: "user_id", constraint: "financing_applications_user_id_fkey" },
  { table: "reward_redemptions", column: "user_id", constraint: "reward_redemptions_user_id_fkey" },
  { table: "reward_points_awards", column: "user_id", constraint: "reward_points_awards_user_id_fkey" },
  { table: "oral_health_metrics", column: "user_id", constraint: "oral_health_metrics_user_id_fkey" },
] as const;

async function main() {
  const prisma = new PrismaClient();
  try {
    let total = 0;
    for (const { table, column } of CHECKS) {
      // Table and column names come from the fixed list above, never from input.
      const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}" t WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t."${column}")`
      );
      total += Number(count);
      console.log(`${table}: ${count} orphaned row(s)`);
    }
    if (!process.argv.includes("--validate")) return;
    if (total > 0) {
      console.log("Not validating: resolve the orphaned rows first.");
      process.exitCode = 1;
      return;
    }
    for (const { table, constraint } of CHECKS) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${constraint}"`);
      console.log(`${constraint}: validated`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "check-orphans failed");
  process.exit(1);
});
