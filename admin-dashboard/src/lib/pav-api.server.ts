import { cookies } from "next/headers";

// Talks to the Pav Dental app backend (git-pav-app/backend) on behalf of the
// signed-in staff member. Their own app session is kept in httpOnly cookies,
// so every change is made, and audited, as that person. The browser never
// sees the tokens.

export const ACCESS_COOKIE = "pav_app_access";
export const REFRESH_COOKIE = "pav_app_refresh";

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // matches the backend's 30-day refresh token
const ACCESS_MAX_AGE = 60 * 15;

export function pavApiUrl(): string | null {
  const url = process.env.PAV_API_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export async function storeAppSession(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearAppSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

async function refreshAppSession(base: string): Promise<string | null> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) {
    await clearAppSession();
    return null;
  }
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  await storeAppSession(body.accessToken, body.refreshToken);
  return body.accessToken;
}

/**
 * Calls the app backend as the signed-in staff member, refreshing their
 * session once if it has expired. Only for Route Handlers and Server
 * Functions, which may update the session cookies.
 */
export async function pavApi(path: string, init: RequestInit = {}): Promise<Response> {
  const base = pavApiUrl();
  if (!base) {
    return Response.json({ error: "The app backend isn't configured (PAV_API_URL)." }, { status: 503 });
  }
  const send = (token: string | undefined) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

  const store = await cookies();
  let res = await send(store.get(ACCESS_COOKIE)?.value);
  if (res.status === 401) {
    const fresh = await refreshAppSession(base);
    if (!fresh) return Response.json({ error: "Please sign in again." }, { status: 401 });
    res = await send(fresh);
  }
  return res;
}
