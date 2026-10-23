// Runs with tsx (see package.json test:booking). Imports the real module.
import { formatOpeningHours, ukDate, ukDayLabel, ukTime, upcomingUkDates } from "../features/booking/uk-time";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`❌ FAILED: ${message}`);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("\n🕘 BOOKING TIMES IN UK TIME\n");

// 09:00 UK is 08:00 UTC in summer and 09:00 UTC in winter (clocks go back 25 Oct 2026).
assert(ukTime(new Date("2026-10-24T08:00:00Z")) === "09:00", "A summer slot shows in BST");
assert(ukTime(new Date("2026-10-26T09:00:00Z")) === "09:00", "A winter slot shows in GMT");
assert(ukDate(new Date("2026-07-01T23:30:00Z")) === "2026-07-02", "Late evening UTC in summer is the next UK day");
assert(ukDayLabel("2026-10-26") === "Mon 26 Oct", "Day labels name the UK date");
const days = upcomingUkDates(3, new Date("2026-10-24T23:30:00Z"));
assert(days.join(",") === "2026-10-25,2026-10-26,2026-10-27", "The day list starts on today's UK date");

assert(
  formatOpeningHours([1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensMinute: 540, closesMinute: 1050 })).concat({ weekday: 6, opensMinute: 540, closesMinute: 780 })) ===
    "Mon–Fri 09:00–17:30 · Sat 09:00–13:00",
  "Default hours read Mon–Fri 09:00–17:30 · Sat 09:00–13:00"
);
assert(
  formatOpeningHours([{ weekday: 1, opensMinute: 540, closesMinute: 1050 }, { weekday: 3, opensMinute: 540, closesMinute: 1050 }]) ===
    "Mon 09:00–17:30 · Wed 09:00–17:30",
  "Days that aren't next to each other aren't joined"
);
assert(formatOpeningHours([]) === "Opening hours not set", "No hours says so instead of inventing them");

if (failures > 0) process.exit(1);
