import { cookies } from "next/headers";

import { verifyToken } from "@/lib/auth/jwt";

export type SignedInStaff = { name: string; email: string };

/** The staff member signed in to the dashboard, from the session cookie. */
export async function signedInStaff(): Promise<SignedInStaff | null> {
  const token = (await cookies()).get("admin_token")?.value;
  // verifyToken throws when ADMIN_JWT_SECRET isn't set; show no one then.
  const claims = token ? await verifyToken(token).catch(() => null) : null;
  if (!claims || typeof claims.email !== "string") return null;
  return { name: claims.email.split("@")[0] ?? claims.email, email: claims.email };
}
