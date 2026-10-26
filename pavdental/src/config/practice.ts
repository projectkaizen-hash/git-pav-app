/**
 * Practice contact and operating configuration.
 * Central single source of truth for practice phone, email, and fallback operating hours (TC-12, MF-10).
 * Dynamic clinic hours are read from the clinics API via usePracticeHours / resolvePracticeHours.
 */
export const PRACTICE_CONFIG = {
  name: "Pav Dental",
  phone: process.env.EXPO_PUBLIC_PRACTICE_PHONE ?? "0800 1938 786",
  telUrl: "tel:08001938786",
  email: "hello@pavdental.com",
  emergencyTel: "tel:999",
  urgentTel: "tel:111",
  /** Baseline fallback hours when offline or before clinic data resolves */
  hoursText: "Mon–Fri 09:00–17:30 · Sat 09:00–13:00",
} as const;
