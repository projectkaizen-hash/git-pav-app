export const ALLOWED_ORIGINS = [process.env.WEBSITE_ORIGIN ?? "http://localhost:8080", "http://localhost:3001"];

/**
 * Returns CORS headers with exactly one allowed origin per response (DB-06).
 * Browsers reject multiple comma-separated origins when credentials are included.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    // Non-browser or same-origin requests fallback to primary allowed origin
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
  }

  return headers;
}
