/**
 * Practice contact and operating configuration.
 * Central single source of truth for practice phone, email, and operating hours (TC-12).
 */
export const PRACTICE_CONFIG = {
  name: "Pav Dental",
  phone: process.env.EXPO_PUBLIC_PRACTICE_PHONE ?? "0800 1938 786",
  telUrl: "tel:08001938786",
  email: "hello@pavdental.com",
  emergencyTel: "tel:999",
  urgentTel: "tel:111",
  hoursText: "Mon–Fri 09:00–17:30 · Sat 09:00–13:00",
} as const;
