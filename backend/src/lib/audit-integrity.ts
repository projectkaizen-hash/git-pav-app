import crypto from "crypto";
import { prisma } from "./prisma";
import { communicationService } from "./communication-service";

let auditWriteQueue: Promise<unknown> = Promise.resolve();

// Audit log integrity using hash chains
// Each log entry contains a hash of the previous entry to detect tampering
export async function createAuditLogWithIntegrity(data: {
  action: string;
  actorId?: string | null;
  resourceId?: string | null;
  sessionId?: string | null;
  ipHash?: string | null;
  metadata?: any;
}) {
  const run = async () => {
    // Get the most recent non-archived audit log for hash chaining
    const lastLog =
      typeof prisma.auditLog?.findFirst === "function"
        ? await prisma.auditLog.findFirst({
            where: { archived: false },
            orderBy: [{ timestampUtc: "desc" }, { id: "desc" }],
            select: { integrityHash: true, id: true, timestampUtc: true },
          })
        : null;

    let now = new Date();
    if (lastLog?.timestampUtc && now.getTime() < lastLog.timestampUtc.getTime()) {
      now = new Date(lastLog.timestampUtc.getTime());
    }
    const nowIso = now.toISOString();

    // Create hash chain: hash(previousHash + currentData)
    const dataString = JSON.stringify({
      action: data.action,
      actorId: data.actorId ?? null,
      resourceId: data.resourceId ?? null,
      timestamp: nowIso,
    });

    const integrityHash = crypto
      .createHash("sha256")
      .update((lastLog?.integrityHash || "") + dataString)
      .digest("hex");

    return prisma.auditLog.create({
      data: {
        action: data.action,
        actorId: data.actorId ?? null,
        resourceId: data.resourceId ?? null,
        sessionId: data.sessionId ?? null,
        ipHash: data.ipHash ?? null,
        metadata: data.metadata ?? {},
        integrityHash,
        timestampUtc: now,
        archived: false,
      },
    });
  };

  const resultPromise = auditWriteQueue.then(run, run);
  auditWriteQueue = resultPromise.catch(() => {});
  return resultPromise;
}

// Verify audit log integrity by checking hash chain
export async function verifyAuditIntegrity(limit: number = 1000) {
  await auditWriteQueue.catch(() => {});
  const logs = await prisma.auditLog.findMany({
    where: { archived: false },
    orderBy: [{ timestampUtc: "asc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      action: true,
      actorId: true,
      resourceId: true,
      timestampUtc: true,
      integrityHash: true,
    },
  });

  let previousHash = "";
  const issues: string[] = [];

  for (const log of logs) {
    if (!log.integrityHash) {
      issues.push(`Missing integrity hash - possible tampering for log ${log.id} at ${log.timestampUtc.toISOString()}`);
      continue;
    }

    const dataString = JSON.stringify({
      action: log.action,
      actorId: log.actorId,
      resourceId: log.resourceId,
      timestamp: log.timestampUtc.toISOString(),
    });

    const expectedHash = crypto
      .createHash("sha256")
      .update(previousHash + dataString)
      .digest("hex");

    if (log.integrityHash !== expectedHash) {
      issues.push(`Integrity check failed for log ${log.id} at ${log.timestampUtc.toISOString()}`);
    }

    previousHash = log.integrityHash || "";
  }

  return {
    valid: issues.length === 0,
    verified: issues.length === 0,
    checkedCount: logs.length,
    issues,
  };
}

// Audit retention policy - logs older than retention period are archived
export async function applyAuditRetentionPolicy(retentionDays: number = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Count logs to be archived
  const countResult = await prisma.auditLog.count({
    where: {
      timestampUtc: { lt: cutoffDate },
      archived: false,
    },
  });

  if (countResult === 0) {
    return { archived: 0, message: "No logs to archive" };
  }

  // Mark logs as archived with timestamp
  const result = await prisma.auditLog.updateMany({
    where: {
      timestampUtc: { lt: cutoffDate },
      archived: false,
    },
    data: {
      archived: true,
      archivedAt: new Date(),
    },
  });

  console.log(`[AUDIT ARCHIVE] Archived ${result.count} audit logs older than ${retentionDays} days`);

  return {
    archived: result.count,
    message: `Archived ${result.count} audit logs older than ${retentionDays} days`,
  };
}

// Critical audit event detection for alerting
const CRITICAL_ACTIONS = [
  "UNAUTHORIZED_ACCESS_ATTEMPT",
  "PRIVILEGE_ESCALATION",
  "DATA_BREACH_ATTEMPT",
  "MASS_DATA_EXPORT",
  "ADMIN_ACCOUNT_MODIFIED",
  "SECURITY_POLICY_VIOLATION",
  "AUDIT_INTEGRITY_FAILURE",
];

export function isCriticalAuditEvent(action: string): boolean {
  return CRITICAL_ACTIONS.includes(action);
}

// Send alert for critical audit events
export async function sendCriticalAuditAlert(log: any) {
  console.error(`[CRITICAL AUDIT ALERT] ${log.action}`, {
    actorId: log.actorId,
    resourceId: log.resourceId,
    timestamp: log.timestampUtc,
    ipHash: log.ipHash,
  });

  await communicationService.sendEmail({
    to: "ops@pavdental.com",
    subject: `[CRITICAL AUDIT ALERT] ${log.action}`,
    html: `<p>A critical security audit event occurred:</p><pre>${JSON.stringify(
      {
        action: log.action,
        actorId: log.actorId,
        resourceId: log.resourceId,
        timestamp: log.timestampUtc,
        ipHash: log.ipHash,
      },
      null,
      2
    )}</pre>`,
    text: `Critical security audit event: ${log.action} (actorId: ${log.actorId}, resourceId: ${log.resourceId})`,
  }).catch((err) => console.error("[AUDIT ALERT] Failed to send email alert:", err));
}

// Audit failure detection and alerting
export async function checkAuditFailures() {
  const recentFailures = await prisma.auditLog.findMany({
    where: {
      action: { contains: "FAILURE" },
      timestampUtc: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    take: 100,
  });

  if (recentFailures.length > 10) {
    // High failure rate - send alert
    console.error(`[AUDIT FAILURE ALERT] High failure rate: ${recentFailures.length} failures in 24h`);
    await communicationService.sendEmail({
      to: "ops@pavdental.com",
      subject: `[AUDIT FAILURE ALERT] ${recentFailures.length} failures in 24h`,
      html: `<p>High failure rate detected in the last 24 hours (${recentFailures.length} events).</p>`,
      text: `High failure rate detected in the last 24 hours (${recentFailures.length} events).`,
    }).catch((err) => console.error("[AUDIT FAILURE ALERT] Failed to send email:", err));
  }

  return {
    failureCount: recentFailures.length,
    thresholdExceeded: recentFailures.length > 10,
  };
}
