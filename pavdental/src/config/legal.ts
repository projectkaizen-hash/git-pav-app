/**
 * Legal and compliance URLs for Pav Dental.
 * Points to the hosted policy pages for terms, privacy notice, cookies, and complaints.
 */
const BASE_URL =
  process.env.EXPO_PUBLIC_WEBSITE_URL ?? "https://pavdental-website.vercel.app";

export const LEGAL_URLS = {
  privacy: `${BASE_URL}/privacy`,
  terms: `${BASE_URL}/terms`,
  cookies: `${BASE_URL}/cookies`,
  complaints: `${BASE_URL}/complaints`,
} as const;
