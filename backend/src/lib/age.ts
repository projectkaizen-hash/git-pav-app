// Ages for the dependants rules (decisions log #17): under-16s are added and
// booked by a parent or guardian, who must be an adult.
export const DEPENDANT_MAX_AGE = 16;
export const GUARDIAN_MIN_AGE = 18;

/** Parses YYYY-MM-DD as a real calendar date (rejects 2024-02-30). */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** Whole years between dob and now, counting a birthday on today's date. */
export function ageInYears(dob: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
