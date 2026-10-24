import { cookies } from "next/headers";

import { verifyStaffToken } from "@/lib/auth/jwt";

export type SignedInStaff = { name: string; email: string };

/** The staff member signed in to the dashboard, from the session cookie. */
export async function signedInStaff(): Promise<SignedInStaff | null> {
  const token = (await cookies()).get("admin_token")?.value;
  const claims = token ? await verifyStaffToken(token) : null;
  if (!claims || typeof claims.email !== "string") return null;
  return { name: claims.email.split("@")[0] ?? claims.email, email: claims.email };
}
