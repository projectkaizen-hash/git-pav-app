import { NextResponse } from "next/server";

import { signToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/v1/auth/firebase
 * Body: { idToken }
 * Verifies Firebase ID token, creates/updates a user record, then issues our own JWT.
 */
export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json({ error: "Firebase admin not configured" }, { status: 500 });
    }

    // Verify with Firebase Admin SDK
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email;
    const name = decoded.name ?? "";
    if (!email) {
      return NextResponse.json({ error: "Email not available from Firebase token" }, { status: 400 });
    }

    // Upsert user in our DB
    const rows = await query<any>("SELECT id FROM users WHERE email = $1", [email]);
    let userId: string;
    if (rows.length) {
      userId = rows[0].id;
    } else {
      const insert = await query<any>(
        `INSERT INTO users (email, name, email_verified, password_hash)
         VALUES ($1, $2, true, '') RETURNING id`,
        [email, name],
      );
      userId = insert[0].id;
    }

    // Issue our JWT (7 days)
    const token = await signToken({ userId, purpose: "auth" }, 60 * 60 * 24 * 7);
    const response = NextResponse.json({ message: "Logged in with Firebase", token }, { status: 200 });
    response.cookies.set("user_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("Firebase auth error", err);
    return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
  }
}
