import { verifyAuditIntegrity, applyAuditRetentionPolicy, checkAuditFailures } from "./audit-integrity";

// Audit monitoring configuration
const AUDIT_CONFIG = {
  integrityCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  retentionCheckIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  retentionDays: 365, // 1 year
  failureCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
};

let integrityCheckTimer: NodeJS.Timeout | null = null;
let retentionCheckTimer: NodeJS.Timeout | null = null;
let failureCheckTimer: NodeJS.Timeout | null = null;

// Schedule periodic integrity checks
export function startAuditMonitoring() {
  console.log("[AUDIT MONITORING] Starting audit monitoring services");

  // Integrity verification every hour
  integrityCheckTimer = setInterval(async () => {
    try {
      const result = await verifyAuditIntegrity(1000);
      if (!result.verified) {
        console.error("[AUDIT INTEGRITY] Integrity check failed:", result.issues);
        // TODO: Send alert to operations team
      } else {
        console.log(`[AUDIT INTEGRITY] Verified ${result.checkedCount} audit logs`);
      }
    } catch (error) {
      console.error("[AUDIT INTEGRITY] Integrity check error:", error);
    }
  }, AUDIT_CONFIG.integrityCheckIntervalMs);

  // Retention policy check daily
  retentionCheckTimer = setInterval(async () => {
    try {
      const result = await applyAuditRetentionPolicy(AUDIT_CONFIG.retentionDays);
      console.log(`[AUDIT RETENTION] ${result.message}`);
    } catch (error) {
      console.error("[AUDIT RETENTION] Retention policy error:", error);
    }
  }, AUDIT_CONFIG.retentionCheckIntervalMs);

  // Failure rate check every 5 minutes
  failureCheckTimer = setInterval(async () => {
    try {
      const result = await checkAuditFailures();
      if (result.thresholdExceeded) {
        console.error(`[AUDIT FAILURES] High failure rate detected: ${result.failureCount} failures in 24h`);
        // TODO: Send alert to operations team
      }
    } catch (error) {
      console.error("[AUDIT FAILURES] Failure check error:", error);
    }
  }, AUDIT_CONFIG.failureCheckIntervalMs);

  // Run initial checks
  runInitialChecks();
}

// Run initial checks on startup
async function runInitialChecks() {
  try {
    console.log("[AUDIT MONITORING] Running initial integrity check");
    const integrityResult = await verifyAuditIntegrity(1000);
    if (!integrityResult.verified) {
      console.error("[AUDIT MONITORING] Initial integrity check failed:", integrityResult.issues);
    } else {
      console.log(`[AUDIT MONITORING] Initial integrity check passed: ${integrityResult.checkedCount} logs verified`);
    }
  } catch (error) {
    console.error("[AUDIT MONITORING] Initial integrity check error:", error);
  }

  try {
    console.log("[AUDIT MONITORING] Running initial failure check");
    const failureResult = await checkAuditFailures();
    console.log(`[AUDIT MONITORING] Initial failure check: ${failureResult.failureCount} failures in 24h`);
  } catch (error) {
    console.error("[AUDIT MONITORING] Initial failure check error:", error);
  }
}

// Stop audit monitoring
export function stopAuditMonitoring() {
  console.log("[AUDIT MONITORING] Stopping audit monitoring services");

  if (integrityCheckTimer) {
    clearInterval(integrityCheckTimer);
    integrityCheckTimer = null;
  }

  if (retentionCheckTimer) {
    clearInterval(retentionCheckTimer);
    retentionCheckTimer = null;
  }

  if (failureCheckTimer) {
    clearInterval(failureCheckTimer);
    failureCheckTimer = null;
  }
}

// Manual trigger for integrity check (for health checks)
export async function manualIntegrityCheck() {
  return verifyAuditIntegrity(1000);
}

// Manual trigger for retention policy (for admin operations)
export async function manualRetentionCheck(retentionDays?: number) {
  return applyAuditRetentionPolicy(retentionDays || AUDIT_CONFIG.retentionDays);
}
