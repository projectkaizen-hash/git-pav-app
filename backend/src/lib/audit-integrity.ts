import crypto from "crypto";
import { prisma } from "./prisma";

// Audit log integrity using hash chains
// Each log entry contains a hash of the previous entry to detect tampering
export async function createAuditLogWithIntegrity(data: {
  action: string;
  actorId: string | null;
  resourceId: string | null;
  sessionId: string | null;
  ipHash: string;
  metadata: any;
}) {
  // Get the most recent non-archived audit log for hash chaining
  const lastLog = await prisma.auditLog.findFirst({
    where: { archived: false },
    orderBy: { timestampUtc: "desc" },
    select: { integrityHash: true, id: true },
  });

  // Create hash chain: hash(previousHash + currentData)
  const dataString = JSON.stringify({
    action: data.action,
    actorId: data.actorId,
    resourceId: data.resourceId,
    timestamp: new Date().toISOString(),
  });

  const integrityHash = crypto
    .createHash("sha256")
    .update((lastLog?.integrityHash || "") + dataString)
    .digest("hex");

  return prisma.auditLog.create({
    data: {
      action: data.action,
      actorId: data.actorId,
      resourceId: data.resourceId,
      sessionId: data.sessionId,
      ipHash: data.ipHash,
      metadata: data.metadata,
      integrityHash,
      archived: false,
    },
  });
}

// Verify audit log integrity by checking hash chain
export async function verifyAuditIntegrity(limit: number = 1000) {
  const logs = await prisma.auditLog.findMany({
    where: { archived: false },
    orderBy: { timestampUtc: "asc" },
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
  // In production, this would integrate with alerting systems (PagerDuty, Slack, etc.)
  console.error(`[CRITICAL AUDIT ALERT] ${log.action}`, {
    actorId: log.actorId,
    resourceId: log.resourceId,
    timestamp: log.timestampUtc,
    ipHash: log.ipHash,
  });

  // TODO: Integrate with actual alerting system
  // await alertingService.send({
  //   severity: "critical",
  //   title: `Critical Audit Event: ${log.action}`,
  //   details: log,
  // });
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
    // TODO: Send alert to operations team
  }

  return {
    failureCount: recentFailures.length,
    thresholdExceeded: recentFailures.length > 10,
  };
}
