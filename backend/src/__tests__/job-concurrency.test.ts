import { prisma } from "../lib/prisma";
import {
  withJobAdvisoryLock,
  JOB_LOCK_IDS,
  runRetentionSweepWithLock,
  checkPushReceiptsWithLock,
  awardMissedVisitPointsWithLock,
  issueMissedReferralVouchersWithLock,
} from "../lib/background-jobs";

describe("BE-23 (AUD-13, ADR-0002): Background job leadership via Postgres advisory locks", () => {
  describe("withJobAdvisoryLock primitives", () => {
    it("acquires lock and executes runner when not locked", async () => {
      let executed = false;
      const res = await withJobAdvisoryLock(JOB_LOCK_IDS.SLOT_EXPIRY, async () => {
        executed = true;
        return "ok";
      });
      expect(res.acquired).toBe(true);
      expect(res.result).toBe("ok");
      expect(executed).toBe(true);
    });

    it("skips runner when another concurrent runner holds the lock", async () => {
      const lockId = 29999;
      let runner1Executed = false;
      let runner2Executed = false;

      // Runner 1 holds lock for 300ms
      const p1 = withJobAdvisoryLock(lockId, async () => {
        runner1Executed = true;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return "runner1-done";
      });

      // Small pause to guarantee runner 1 acquired lock first
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Runner 2 attempts to acquire the exact same lock while runner 1 is active
      const p2 = withJobAdvisoryLock(lockId, async () => {
        runner2Executed = true;
        return "runner2-done";
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1.acquired).toBe(true);
      expect(r1.result).toBe("runner1-done");
      expect(runner1Executed).toBe(true);

      // Runner 2 must have cleanly skipped
      expect(r2.acquired).toBe(false);
      expect(r2.result).toBeUndefined();
      expect(runner2Executed).toBe(false);
    });

    it("releases lock automatically on transaction commit", async () => {
      const lockId = 29998;
      // First run
      const r1 = await withJobAdvisoryLock(lockId, async () => 42);
      expect(r1.acquired).toBe(true);
      expect(r1.result).toBe(42);

      // Second run after commit
      const r2 = await withJobAdvisoryLock(lockId, async () => 99);
      expect(r2.acquired).toBe(true);
      expect(r2.result).toBe(99);
    });

    it("releases lock automatically on error rollback", async () => {
      const lockId = 29997;
      await expect(
        withJobAdvisoryLock(lockId, async () => {
          throw new Error("Job failed internally");
        })
      ).rejects.toThrow("Job failed internally");

      // Subsequent attempt acquires lock without being blocked by leaked locks
      const r2 = await withJobAdvisoryLock(lockId, async () => "recovered");
      expect(r2.acquired).toBe(true);
      expect(r2.result).toBe("recovered");
    });
  });

  describe("Concurrent runners for AUD-13 specified jobs", () => {
    it("coordinates retention sweep between two concurrent runners", async () => {
      const [r1, r2] = await Promise.all([
        runRetentionSweepWithLock(),
        runRetentionSweepWithLock(),
      ]);

      const acquiredCount = (r1.acquired ? 1 : 0) + (r2.acquired ? 1 : 0);
      expect(acquiredCount).toBe(1);
    });

    it("coordinates push receipts check between two concurrent runners", async () => {
      const [r1, r2] = await Promise.all([
        checkPushReceiptsWithLock(),
        checkPushReceiptsWithLock(),
      ]);

      const acquiredCount = (r1.acquired ? 1 : 0) + (r2.acquired ? 1 : 0);
      expect(acquiredCount).toBe(1);
    });

    it("coordinates rewards catch-up between two concurrent runners", async () => {
      const [r1, r2] = await Promise.all([
        awardMissedVisitPointsWithLock(),
        awardMissedVisitPointsWithLock(),
      ]);

      const acquiredCount = (r1.acquired ? 1 : 0) + (r2.acquired ? 1 : 0);
      expect(acquiredCount).toBe(1);
    });

    it("coordinates referral vouchers catch-up between two concurrent runners", async () => {
      const [r1, r2] = await Promise.all([
        issueMissedReferralVouchersWithLock(),
        issueMissedReferralVouchersWithLock(),
      ]);

      const acquiredCount = (r1.acquired ? 1 : 0) + (r2.acquired ? 1 : 0);
      expect(acquiredCount).toBe(1);
    });
  });
});
