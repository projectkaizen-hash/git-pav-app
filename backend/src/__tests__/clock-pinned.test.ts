import { isInQuietHours, getNextQuietHoursEnd } from "../lib/background-jobs";
import { dateOnly, londonDate, londonTimeToUtc, weekdayOf } from "../lib/availability";

/**
 * QA-06: Clock-pinned test suite for time-of-day and late-night clock stability.
 * Verifies that Jest fake timers and late-clock runs (23:30 London time, around midnight,
 * and across daylight saving changes) never cause flakiness, off-by-one day bugs,
 * or incorrect quiet hours deferrals.
 */
describe("QA-06: Clock-pinned late evening & daylight-saving time stability", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Quiet hours across late evening UK clock", () => {
    it("pins summer clock at 23:30 BST (22:30 UTC) and correctly identifies quiet hours", () => {
      // 23:30 BST = 22:30 UTC on 15 July 2026
      const lateEveningBST = new Date("2026-07-15T22:30:00.000Z");
      jest.setSystemTime(lateEveningBST);

      expect(isInQuietHours(lateEveningBST, "22:00", "08:00")).toBe(true);

      const nextEnd = getNextQuietHoursEnd(lateEveningBST, "08:00");
      // 08:00 BST = 07:00 UTC on 16 July 2026
      expect(nextEnd.toISOString()).toBe("2026-07-16T07:00:00.000Z");
    });

    it("pins winter clock at 23:30 GMT (23:30 UTC) and correctly identifies quiet hours", () => {
      // 23:30 GMT = 23:30 UTC on 15 Dec 2026
      const lateEveningGMT = new Date("2026-12-15T23:30:00.000Z");
      jest.setSystemTime(lateEveningGMT);

      expect(isInQuietHours(lateEveningGMT, "22:00", "08:00")).toBe(true);

      const nextEnd = getNextQuietHoursEnd(lateEveningGMT, "08:00");
      // 08:00 GMT = 08:00 UTC on 16 Dec 2026
      expect(nextEnd.toISOString()).toBe("2026-12-16T08:00:00.000Z");
    });

    it("identifies day hours correctly when clock advances past quiet hours", () => {
      // 12:00 London time in summer (11:00 UTC)
      const middayBST = new Date("2026-07-15T11:00:00.000Z");
      jest.setSystemTime(middayBST);
      expect(isInQuietHours(middayBST, "22:00", "08:00")).toBe(false);

      // 12:00 London time in winter (12:00 UTC)
      const middayGMT = new Date("2026-12-15T12:00:00.000Z");
      jest.setSystemTime(middayGMT);
      expect(isInQuietHours(middayGMT, "22:00", "08:00")).toBe(false);
    });
  });

  describe("Date boundary mapping around midnight", () => {
    it("assigns 23:30 UTC in summer (00:30 BST) to the next UK calendar day", () => {
      // 23:30 UTC on 15 July 2026 = 00:30 BST on 16 July 2026
      const lateUtc = new Date("2026-07-15T23:30:00.000Z");
      const ukDate = londonDate(lateUtc);
      expect(ukDate).toBe("2026-07-16");
      expect(weekdayOf(ukDate)).toBe(4); // Thursday
    });

    it("assigns 23:30 UTC in winter to the same calendar day", () => {
      // 23:30 UTC on 15 Dec 2026 = 23:30 GMT on 15 Dec 2026
      const lateUtc = new Date("2026-12-15T23:30:00.000Z");
      const ukDate = londonDate(lateUtc);
      expect(ukDate).toBe("2026-12-15");
      expect(weekdayOf(ukDate)).toBe(2); // Tuesday
    });

    it("converts London opening times to correct UTC timestamps without hour shifts", () => {
      // 09:00 London time on summer day (minute 540 -> 08:00 UTC)
      const summerMorning = londonTimeToUtc("2026-07-15", 540);
      expect(summerMorning.toISOString()).toBe("2026-07-15T08:00:00.000Z");

      // 09:00 London time on winter day (minute 540 -> 09:00 UTC)
      const winterMorning = londonTimeToUtc("2026-12-15", 540);
      expect(winterMorning.toISOString()).toBe("2026-12-15T09:00:00.000Z");
    });
  });

  describe("Daylight saving time transition boundary", () => {
    it("handles the autumn clock-change night (25 Oct 2026 clocks fall back)", () => {
      // Clocks fall back from 02:00 BST to 01:00 GMT on Sunday 25 Oct 2026
      // 00:30 UTC on 25 Oct 2026 is 01:30 BST (before fall back)
      const beforeFallBack = new Date("2026-10-25T00:30:00.000Z");
      expect(londonDate(beforeFallBack)).toBe("2026-10-25");

      // 08:00 UTC on 25 Oct 2026 is 08:00 GMT (after fall back)
      const afterFallBack = new Date("2026-10-25T08:00:00.000Z");
      expect(londonDate(afterFallBack)).toBe("2026-10-25");

      // 09:00 London time on transition day is 09:00 GMT (09:00 UTC)
      const morningSlot = londonTimeToUtc("2026-10-25", 540);
      expect(morningSlot.toISOString()).toBe("2026-10-25T09:00:00.000Z");
    });
  });
});
