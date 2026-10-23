"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Root route – always redirect to the login page unless a valid admin
 * session cookie (`admin_token`) is present. The admin dashboard UI is
 * protected by `requireAdmin` middleware, but we also want the base URL
 * (`/`) to land on the login screen for a friendly entry point.
 */
export default async function Root() {
  const token = (await cookies()).get("admin_token")?.value;

  // In development we allow unauthenticated access to /dashboard after login,
  // but the root should always point to the login page.
  if (token) {
    // If a token exists we assume the user is already authenticated and
    // forward them to the dashboard home.
    redirect("/dashboard");
  }

  // No token – send to the login page.
  redirect("/auth/v1/login");
}
