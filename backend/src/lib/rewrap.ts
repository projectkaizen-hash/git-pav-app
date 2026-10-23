import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { clinicalRecordEncryptionService, type EncryptedData } from "./encryption";

const ENCRYPTED_FIELDS = ["gateCode", "accessNotes"] as const;

export interface RewrapReport {
  scanned: number;
  needingRewrap: number;
  rewrapped: number;
  failed: number;
}

function isEncrypted(value: unknown): value is EncryptedData {
  return typeof value === "object" && value !== null && "ciphertext" in value && "keyId" in value;
}

/**
 * Moves encrypted van access details (gate codes, door notes) onto the current
 * key (EN-1). Without `apply` it only counts. Only the wrapped data key
 * changes, and a row is written only if nobody changed it since it was read.
 * Reports counts, never values.
 */
export async function rewrapVanAccessDetails({ apply, batchSize = 200 }: { apply: boolean; batchSize?: number }): Promise<RewrapReport> {
  const report: RewrapReport = { scanned: 0, needingRewrap: 0, rewrapped: 0, failed: 0 };
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.vanServiceRequest.findMany({
      select: { id: true, accessDetails: true },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      report.scanned++;
      const details = row.accessDetails as Record<string, unknown> | null;
      if (!details) continue;
      const stale = ENCRYPTED_FIELDS.filter((field) => {
        const value = details[field];
        return isEncrypted(value) && clinicalRecordEncryptionService.needsRewrap(value);
      });
      if (stale.length === 0) continue;
      report.needingRewrap++;
      if (!apply) continue;

      try {
        const updated = { ...details };
        for (const field of stale) {
          updated[field] = await clinicalRecordEncryptionService.rewrapField(details[field] as EncryptedData);
        }
        const { count } = await prisma.vanServiceRequest.updateMany({
          where: { id: row.id, accessDetails: { equals: details as Prisma.InputJsonValue } },
          data: { accessDetails: updated as Prisma.InputJsonValue },
        });
        if (count === 1) report.rewrapped++;
        else report.failed++;
      } catch {
        report.failed++;
      }
    }
  }
  return report;
}
